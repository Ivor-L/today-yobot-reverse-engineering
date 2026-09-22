// 渠道任务的 trace 上报触发器。
//
// 为什么需要单独一处触发：主聊天的上报由渲染进程发起
// （Chat.tsx rememberTurn → ChatContext reportTurn → ipc('trace:report')），
// 而飞书 / 微信 iLink 这类远程下发的任务全程跑在 server 子进程里，
// 一次都不经过渲染层——那条链对它们来说等于不存在，日志只落地、永不上报。
//
// 沿用渲染侧完全相同的三条约束：
//   1. 不在任何 await 链上——回复已经发出去之后才触发；
//   2. 全程静默，不打印任何日志，不抛异常；
//   3. 只对日志文件做 ranged read，绝不改写。
import * as path from 'path';
import { LLMManager } from '../agent/llm/manager.js';
import { reportTrace, reportOutcome, ensureQuestionRow, traceLooksCompleted } from '../utils/trace_reporter.js';
import { markTurnOpen, markTurnClosed, claimStaleTurns, releaseClaim, outcomeForRecord, detailForRecord, defaultRoot, } from '../utils/open_turns.js';
import { isSafeTraceId } from '../utils/trace_id.js';
import { resolveRuntimeAgentLogsDirectory } from '../core/platform/file_layout.js';
/**
 * 日志根目录必须与 DebugLogger 的算法逐字一致（见 diagnostics/debug_logger.ts）。
 *
 * 主进程一次决定 userData/cache/logs 并通过运行时环境契约注入；这里与
 * DebugLogger 共用同一解析器，避免写在 A 目录、去 B 目录查找。
 */
function tracesDir() {
    return path.join(resolveRuntimeAgentLogsDirectory(), 'traces');
}
/** HTTP 超时。与 trace_reporter 保持一致：旁路请求不值得为它挂住任何资源。 */
const HTTP_TIMEOUT_MS = 10_000;
/** 提问内容的发送上限。服务端还会再截一次（500 字），这里只是不做无谓的大包传输。 */
const MAX_CONTENT_CHARS = 500;
/**
 * 非文本消息（图片 / 文件 / 语音）的占位内容。
 *
 * 不能因为 extractText 取不到文字就跳过登记：那样 trace 照传，
 * 而表里没有对应行 → commit 匹配 0 行 → OSS 里留下一个没有任何指针指向它的
 * 孤儿对象，正是本次改造要消灭的状态。
 * content 列是 NOT NULL，所以必须给一个值而不是空串。
 */
const NON_TEXT_PLACEHOLDER = '[非文本消息]';
/**
 * 把这一轮渠道任务写进 agent_user_questions。
 *
 * 为什么必须有这一步：trace 的 commit 是 `update ... where message_id=?`，
 * 表里没有对应行就是一次空更新——日志传上了 OSS，却没有任何指针指向它，
 * 事后按用户/提问去查会完全落空。先有行，才谈得上关联。
 *
 * origin 让服务端把它排除在大盘的「提问数/提问人数」之外：
 * 渠道是机器触发、量级远大于真人打字，混进去会把口径冲垮。
 */
async function logChannelQuestion(apiBase, token, channelId, traceId, sessionId, content, origin, outcome) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), HTTP_TIMEOUT_MS);
    try {
        await fetch(`${apiBase}/v1/agent/logs/question`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Channel-ID': channelId,
                // x-source 判的是「请求方是不是 agent 客户端」——渠道任务同样由
                // agent 客户端的 server 子进程发出，所以这里仍是 agent。
                // 「任务从哪个入口进来」由 body 里的 origin 表达，两者不是一回事。
                'X-Source': 'agent',
            },
            body: JSON.stringify({
                session_id: sessionId,
                // 必须与 trace 用的是同一个 id，否则 commit 依旧对不上——
                // 这是整条链的接缝，最容易各写各的地方。
                message_id: traceId,
                content: content.slice(0, MAX_CONTENT_CHARS),
                client_version: process.env.APP_VERSION,
                origin,
                // 结局在建行时就已经知道了（调用点在 handleMessage 的 finally 里），
                // 直接搭这次 POST 的顺风车，不再单独打一次 /logs/outcome。
                // 渠道任务量级远大于真人提问，省下的是成千上万次请求。
                ...(outcome ? { outcome } : {}),
            }),
            signal: ctrl.signal,
        });
    }
    catch {
        // 静默。写不进去只会退化成「trace 传上了但关联不上」，
        // 也就是这次改动之前的状态，不影响任何用户可见行为。
    }
    finally {
        clearTimeout(timer);
    }
}
/**
 * 上报一轮渠道任务：先登记提问，再上传 trace。
 *
 * 同步返回、不抛异常、不返回 Promise——调用方没有任何理由等它。
 *
 * 两步的先后有意义但不必强串行：commit 内部本来就有「匹配 0 行则等 2 秒重试一次」
 * 的逻辑，而 trace 那条链要走 slot → PUT → commit 三次往返，天然比一次 POST 慢得多，
 * 竞态覆盖得住。真串起来反而会让 trace 白等一次网络往返。
 *
 * @param traceId  这一轮的 traceId，必须是 makeTraceId 产出的安全字符串。
 *                 它同时是日志文件名后缀、OSS 对象名和 message_id，三者靠它对齐。
 * @param origin   任务入口，取 gateway 的 adapter.name。
 * @param content  用户原文，用于在大盘里看清「渠道那边到底在问什么」。
 * @param outcome  本轮结局（error / aborted_by_user / timeout …）。
 *                 正常收尾传 undefined——库里 NULL 即表示正常，不写省一半写入量。
 */
export function reportChannelTurn(traceId, sessionId, origin, content, outcome) {
    try {
        // 不安全的 id 一律不报：它会被客户端和服务端按各自的规则清洗成两个不同的值，
        // 传上去也是查不到的孤儿文件。宁可不报，不制造垃圾。
        if (!isSafeTraceId(traceId))
            return;
        const apiBase = process.env.REMOTE_SERVER_URL;
        if (!apiBase)
            return; // 纯本地部署，没有可上报的服务端
        const llm = LLMManager.getInstance();
        const token = llm.getAuthToken?.();
        if (!token)
            return; // 未登录不上报，与渲染侧一致
        const channelId = llm.getChannelId?.() || process.env.CHANNEL_ID || 'official';
        // 丢到下一个 tick：调用点紧挨着 adapter.send，同步执行会把
        // 读文件+脱敏+几次网络往返算进这条消息的处理时间里。
        setTimeout(() => {
            // 空文本也要登记（用占位符），否则 trace 会变成 OSS 里的孤儿对象
            const text = content && content.trim() ? content : NON_TEXT_PLACEHOLDER;
            void logChannelQuestion(apiBase, token, channelId, traceId, sessionId, text, origin, outcome);
            // reportTrace 内部保证永不 reject，这里的 catch 只是兜最后一层
            void reportTrace({
                tracesDir: tracesDir(),
                apiBase,
                token,
                channelId,
                clientVersion: process.env.APP_VERSION,
            }, { messageId: traceId, sessionId }).catch(() => { });
        }, 0);
    }
    catch { /* 静默 */ }
}
/**
 * 登记一轮渠道 / 定时任务开始执行。
 *
 * 与渲染进程侧的 rememberTurn 对应，但这边跑在 server 子进程里：
 * 渠道任务与定时任务全程不经过渲染层，那条链对它们等于不存在。
 *
 * 渠道任务的「提交」与「开始执行」几乎同一时刻，两个时间戳都给同一个值——
 * 它们没有客户端那样的排队阶段，never_started 对它们没有意义。
 *
 * ⚠️ 根目录必须与 tracesDir() 使用同一份运行时路径契约。
 * 用别的口径会变成「写在 A 目录、主进程去 B 目录找」，全程静默、一条都补报不上。
 */
export function openChannelTurn(traceId, sessionId, origin, label) {
    try {
        if (!isSafeTraceId(traceId))
            return;
        const now = Date.now();
        markTurnOpen(defaultRoot(), {
            traceId: traceId,
            sessionId,
            origin,
            submittedAt: now,
            startedAt: now,
            clientVersion: process.env.APP_VERSION,
            ...(label ? { label } : {}),
        });
    }
    catch { /* 静默 */ }
}
/** 这一轮收尾了（无论成败），销账。 */
export function closeChannelTurn(traceId) {
    try {
        if (!isSafeTraceId(traceId))
            return;
        markTurnClosed(defaultRoot(), traceId);
    }
    catch { /* 静默 */ }
}
/**
 * 补报 server 子进程自己写的、上次没收尾的轮次。
 *
 * 为什么子进程要单独扫一遍：它有 supervisor，会被独立重启。
 * 只靠主进程在应用启动时扫的话，子进程崩一次留下的账要等到用户下次
 * 完整重启应用才被处理——可能是一天以后。
 *
 * 只认领非 agent 的那部分：agent 那些属于渲染进程那条链，由主进程处理。
 * 两边同时扫到同一个文件时，claimStaleTurns 内部的 rename 认领保证只有一个赢家
 * （保证来自源文件被移走，不是目标冲突——细节见那个函数的注释）。
 *
 * 同步返回、不抛异常：调用方在启动路径上，没有理由等它。
 */
export function sweepChannelOrphans(delayMs = 30_000) {
    try {
        setTimeout(() => {
            void (async () => {
                try {
                    const apiBase = process.env.REMOTE_SERVER_URL;
                    if (!apiBase)
                        return;
                    const llm = LLMManager.getInstance();
                    const token = llm.getAuthToken?.();
                    if (!token)
                        return;
                    const channelId = llm.getChannelId?.() || process.env.CHANNEL_ID || 'official';
                    const root = defaultRoot();
                    const claimed = claimStaleTurns(root, {
                        olderThanMs: 5 * 60 * 1000,
                        limit: 20,
                        origins: ['feishu', 'wechat-ilink', 'wechat', 'cron'],
                    });
                    for (const c of claimed) {
                        try {
                            // 先确保有行。渠道 / cron 的提问行建在 finally 里，
                            // 崩在半路时那段没执行过——库里没有行，下面两步都是空更新。
                            await ensureQuestionRow(
                            // 用账本里记的版本，不是当前版本——理由同主进程那处
                            { apiBase, token, channelId, clientVersion: c.record.clientVersion }, {
                                messageId: c.record.traceId,
                                sessionId: c.record.sessionId,
                                origin: c.record.origin,
                                content: c.record.label || '',
                            });
                            // 同主进程：日志尾部有 Run End 就只补传，不打 unfinished
                            if (!traceLooksCompleted(tracesDir(), c.record.traceId)) {
                                await reportOutcome({ apiBase, token, channelId }, {
                                    messageId: c.record.traceId,
                                    outcome: outcomeForRecord(c.record),
                                    detail: detailForRecord(c.record),
                                });
                            }
                            await reportTrace({
                                tracesDir: tracesDir(),
                                apiBase,
                                token,
                                channelId,
                                clientVersion: process.env.APP_VERSION,
                            }, { messageId: c.record.traceId, sessionId: c.record.sessionId });
                        }
                        catch { /* 静默 */ }
                        finally {
                            releaseClaim(c.claimPath);
                        }
                    }
                }
                catch { /* 静默 */ }
            })();
        }, delayMs);
    }
    catch { /* 静默 */ }
}
/** 定时任务上报时写进 content 的长度上限。服务端还会再截一次（500 字）。 */
const MAX_CRON_CONTENT_CHARS = 400;
/**
 * 合成定时任务在后台列表里显示的那一行。
 *
 * cron 没有"用户原文"，但排查时第一眼要看的正是「这是哪个任务、它被要求做什么、成没成」。
 * 失败最需要被翻出来，而表里没有状态列——把结局做成前缀是最小代价的做法：
 * 列表里一眼可见，也能直接搜。
 *
 * 单独导出是为了可测：网络那段没法在冒烟里跑，但这行文案的口径必须钉住。
 */
export function formatCronQuestionContent(jobName, payload, status, details) {
    const mark = status === 'ok' ? '' : `[${status}] `;
    const name = (jobName || '').replace(/\s+/g, ' ').trim() || '(未命名任务)';
    const instruction = (payload || '').replace(/\s+/g, ' ').trim();
    const audit = details
        ? [
            details.outcomeStatus ? `outcome=${details.outcomeStatus}` : '',
            details.contractMode ? `contract=${details.contractMode}` : '',
            details.validationAttempts !== undefined ? `checks=${details.validationAttempts}` : '',
            details.deliveryStatus ? `delivery=${details.deliveryStatus}` : '',
            details.executionPreset ? `exec=${details.executionPreset}` : '',
        ].filter(Boolean).join(' ')
        : '';
    return `${mark}【定时任务】${name}${audit ? ` | ${audit}` : ''}${instruction ? ` | ${instruction}` : ''}`
        .slice(0, MAX_CRON_CONTENT_CHARS);
}
/**
 * 上报一次定时任务执行。
 *
 * 为什么单独有这一处：cron 的执行链是 `server.ts` 里独立的 `agent.run`，
 * **完全不经过 gateway 的 executeMessage**——而 `reportChannelTurn` 的唯一调用点
 * 就在那里。于是 cron 一直处于「本地 trace 文件照写、线上一条都没有」的状态：
 * `agent_user_questions` 里没有它的行，OSS 里没有它的日志。
 *
 * 后果在一次线上投诉里付了学费：用户 34 个群总结任务连续两天发出错误内容，
 * 我们手上**没有任何一条**它实际发了什么的记录，只能靠用户的转述反推。
 * 定时任务恰恰是最需要留痕的一类——它无人值守、失败没人看见、还会直接对外发消息。
 *
 * 与 `reportChannelTurn` 的差异只有两处：
 *   · origin 固定 `cron`，让后台把它与真人提问、渠道下发分开（大盘只统计 agent）；
 *   · content 由「任务名 + 指令摘要」合成——cron 没有"用户原文"，
 *     但排查时第一眼要看的正是"这是哪个任务、它被要求做什么"。
 *
 * 同步返回、不抛异常、不返回 Promise：调用方在 finally 里，没有任何理由等它。
 *
 * @param traceId  本次执行的 runId，同时是日志文件名后缀、OSS 对象名与 message_id。
 * @param sessionId 定时任务会话 id（`system__sub_scheduler_<jobId>`）。
 *                  用它而不是创建任务的聊天会话：同一个任务的历次执行会因此聚成一组，
 *                  「这个任务每天到底发了什么」正是排查时要问的问题。
 * @param status   本次结局，只用来给 content 加一个显眼的前缀。
 */
export function reportCronRun(traceId, sessionId, jobName, payload, status, details) {
    try {
        // 定时任务的结局本来就是入参，直接映射成 outcome 列。
        // content 里那个 [error] 前缀是给人看的，outcome 是给查询用的——
        // 前者要 like '%[error]%' 才筛得出来，后者能命中部分索引。
        const outcome = status === 'timeout' ? 'timeout'
            : status === 'error' ? 'error'
                : undefined; // ok / skipped 都算正常收尾
        reportChannelTurn(traceId, sessionId, 'cron', formatCronQuestionContent(jobName, payload, status, details), outcome);
    }
    catch { /* 静默：留痕失败不能影响任务本身 */ }
}
