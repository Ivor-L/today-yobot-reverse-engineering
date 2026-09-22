// 本地 trace 静默上报。
//
// 两个调用方，各自对应一种任务来源：
//   1. 主聊天：渲染进程(回答完成) → ipc('trace:report') → electron/main.ts
//   2. 渠道任务(飞书 / 微信 iLink)：gateway/trace_upload.ts，跑在 server 子进程里
// 之后的步骤两者共用：读日志 → 脱敏 → 服务端要签名 URL(开关在服务端)
//       → PUT 到 OSS(字节不经过我们的服务器) → 回调服务端记录 object key
//
// 本模块放在 utils/ 而不是 electron/：server 子进程也要用它，
// 而 tsconfig.json 的 include 不含 src/electron——放在那边等于让 gateway 反向依赖
// electron 层。它本身只依赖 fs/path，没有任何 electron API。
//
// 三条硬约束（对应需求原文）：
//   1. 不影响正常使用：整条链路在回答渲染完成之后触发，不在任何 await 链上；
//      失败最多重试 1 次即放弃，不做重试队列。
//   2. 静默：全链路吞异常，【不打印任何日志】。这也是本文件没有一处 console 的原因。
//   3. 文件安全：只做 ranged read，绝不改写/删除日志文件。
//
// 为什么主聊天那条链要绕主进程读文件：main.ts 有一条既有约束——.log 含完整
// system prompt/payload，绝不暴露给渲染进程。渲染进程只递交「哪一轮」，
// 读+脱敏+上传全在主进程完成，日志内容一次都不进渲染层。
import * as fs from 'fs';
import * as path from 'path';
import { redactTrace, joinHeadTail } from './trace_redact.js';
/** 单次上报的字节上限。超出部分头尾各留一半，中间截断。 */
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
/** 网络超时。上报是可有可无的旁路，不值得为它挂住任何资源。 */
const HTTP_TIMEOUT_MS = 10_000;
/**
 * 服务端回 enabled:false 时的本地缓存时长。
 * 关闭期间每次提问都白跑一次请求没有意义；代价是重新打开后最多 10 分钟才生效。
 */
const DISABLED_CACHE_MS = 10 * 60 * 1000;
let disabledUntil = 0;
/**
 * 找出这一轮的日志文件。
 *
 * 文件名形如 trace_<ts>_<session>__<traceId>.log。同一 traceId 可能有多个文件
 * （kernel 递归时每层 run 各建一个），按文件名排序后全部拼接——
 * 只取其一会丢掉子调用的执行细节。
 */
function findTraceFiles(tracesDir, messageId) {
    const safe = messageId.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (!safe)
        return [];
    try {
        return fs
            .readdirSync(tracesDir)
            .filter(f => f.endsWith(`__${safe}.log`))
            .sort()
            .map(f => path.join(tracesDir, f));
    }
    catch {
        return [];
    }
}
/**
 * 读一个日志文件，超出预算时头尾各留一半。
 *
 * 用 open/read/close 定位读，不用 readFileSync：
 *   - 日志是 append-only，[0, size) 这段内容之后不会被改写，并发读安全；
 *   - 但整读会把大文件全量载入内存，且 size 要在读之前先快照，
 *     否则读的过程中文件还在长，上界会飘。
 *
 * ⚠️ 这里【必须】分两段定位读，不能整读到预算长度再交给 truncateBytes 截。
 * 那样做的话传进去的 buffer 长度恒等于上限，truncateBytes 的
 * `if (buf.length <= maxBytes) return ...` 永远成立，头尾各半的逻辑一次都不会执行——
 * 实际行为退化成「只留前 N 字节」。而卡死 / 死循环的日志恰恰最容易撑爆上限，
 * 且证据全在尾部，只留头等于把最该看的部分丢掉。这是本函数存在的全部理由。
 */
function readOne(file, budget) {
    let fd;
    try {
        // 跨天长会话可能撞上启动时的 7 天清理，读之前确认文件还在
        if (budget <= 0 || !fs.existsSync(file))
            return null;
        const size = fs.statSync(file).size; // 先快照，读的上界固定下来
        if (size <= 0)
            return null;
        fd = fs.openSync(file, 'r');
        if (size <= budget) {
            const buf = Buffer.allocUnsafe(size);
            const n = fs.readSync(fd, buf, 0, size, 0);
            return buf.subarray(0, n).toString('utf8');
        }
        const headLen = Math.floor(budget / 2);
        const tailLen = budget - headLen;
        const head = Buffer.allocUnsafe(headLen);
        const tail = Buffer.allocUnsafe(tailLen);
        const hn = fs.readSync(fd, head, 0, headLen, 0);
        const tn = fs.readSync(fd, tail, 0, tailLen, size - tailLen);
        return joinHeadTail(head.subarray(0, hn), tail.subarray(0, tn), size - hn - tn);
    }
    catch {
        return null; // 单个文件读失败不影响其它文件
    }
    finally {
        if (fd !== undefined) {
            try {
                fs.closeSync(fd);
            }
            catch { /* ignore */ }
        }
    }
}
/**
 * 把总预算分给各个文件。
 *
 * 不能先到先得地顺序消耗：同一 traceId 的多个文件是 kernel 递归时每层 run 各建一个，
 * 按文件名排序后靠前的是【外层】。外层若很大就会把预算吃光，
 * 而卡死场景里往往是最内层那次 run 才关键——它一个字节都读不到。
 *
 * 用注水法：小文件先按需拿满，省下来的额度流给还超限的文件。
 * 于是「一个大文件 + 几个小文件」时大文件几乎能拿到全部预算，
 * 「几个都很大」时则平均分——两种情况都不会有文件被完全饿死。
 */
function allocate(sizes, cap) {
    const alloc = new Array(sizes.length).fill(0);
    const order = sizes.map((_, i) => i).sort((a, b) => sizes[a] - sizes[b]);
    let remaining = cap;
    let left = sizes.length;
    for (const i of order) {
        const take = Math.min(sizes[i], Math.floor(remaining / left));
        alloc[i] = take;
        remaining -= take;
        left--;
    }
    return alloc;
}
function readCapped(files, maxBytes) {
    if (!files.length)
        return '';
    const sizes = files.map(f => {
        try {
            return fs.existsSync(f) ? fs.statSync(f).size : 0;
        }
        catch {
            return 0;
        }
    });
    const budgets = allocate(sizes, maxBytes);
    const parts = [];
    for (let i = 0; i < files.length; i++) {
        const s = readOne(files[i], budgets[i]);
        if (s)
            parts.push(s);
    }
    return parts.join('\n\n===== NEXT RUN =====\n\n');
}
async function postJson(url, token, channelId, body) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), HTTP_TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Channel-ID': channelId,
                'X-Source': 'agent',
            },
            body: JSON.stringify(body),
            signal: ctrl.signal,
        });
        if (!res.ok)
            return null;
        return await res.json();
    }
    catch {
        return null;
    }
    finally {
        clearTimeout(timer);
    }
}
async function putOss(url, payload) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), HTTP_TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            method: 'PUT',
            // 必须与服务端签名时用的 Content-Type 完全一致，否则 OSS 判签名不匹配
            headers: { 'Content-Type': 'text/plain' },
            body: payload,
            signal: ctrl.signal,
        });
        return res.ok;
    }
    catch {
        return false;
    }
    finally {
        clearTimeout(timer);
    }
}
/**
 * 上报一轮 trace。永不抛异常、永不打印日志。
 *
 * 返回值仅供测试用；调用方不应依赖它做任何事。
 */
export async function reportTrace(deps, input) {
    try {
        if (!deps.token || !deps.apiBase || !input.messageId)
            return 'skipped';
        if (Date.now() < disabledUntil)
            return 'disabled';
        const files = findTraceFiles(deps.tracesDir, input.messageId);
        if (!files.length)
            return 'skipped';
        // 先要 slot：开关在服务端，关着就什么都不做——
        // 放在读文件之后是因为没日志可传时连这次请求都省了。
        const slot = await postJson(`${deps.apiBase}/v1/agent/trace/slot`, deps.token, deps.channelId, {
            message_id: input.messageId,
            session_id: input.sessionId,
            client_version: deps.clientVersion,
        });
        if (!slot || slot.enabled === false) {
            // 服务端明确说关闭时才缓存；网络失败(slot=null)不缓存，
            // 否则一次抖动会让上报静默停摆 10 分钟。
            if (slot && slot.enabled === false)
                disabledUntil = Date.now() + DISABLED_CACHE_MS;
            return 'disabled';
        }
        if (!slot.upload_url || !slot.object_key)
            return 'failed';
        // 上限以服务端下发为准，本地常量只是兜底：调整上限不该需要发客户端版本
        const cap = typeof slot.max_bytes === 'number' && slot.max_bytes > 0
            ? Math.min(slot.max_bytes, MAX_UPLOAD_BYTES)
            : MAX_UPLOAD_BYTES;
        const raw = readCapped(files, cap);
        if (!raw)
            return 'skipped';
        const payload = redactTrace(raw);
        let ok = await putOss(slot.upload_url, payload);
        if (!ok)
            ok = await putOss(slot.upload_url, payload); // 只重试一次
        if (!ok)
            return 'failed';
        await postJson(`${deps.apiBase}/v1/agent/trace/commit`, deps.token, deps.channelId, {
            message_id: input.messageId,
            object_key: slot.object_key,
            size_bytes: Buffer.byteLength(payload, 'utf8'),
        });
        return 'uploaded';
    }
    catch {
        return 'failed';
    }
}
/** kernel 正常收尾时写进日志末尾的标记。见 diagnostics/debug_logger 的调用方。 */
const RUN_END_MARKER = '>>> PiKernel Run End <<<';
/** 只读日志尾部这么多字节来找收尾标记。标记一定在最后，没必要整读一个几百 KB 的文件。 */
const TAIL_PROBE_BYTES = 8 * 1024;
/**
 * 本地日志显示这一轮其实跑完了吗？
 *
 * 【补报专用的最后一道防线】。账本里有残留条目只能说明「客户端没销账」，
 * 不等于「这一轮没跑完」——2026-09-07 的线上复盘里，某用户一个会话 21 轮
 * 全部滞留在账本里，而每一条的日志末尾都有正常的 Run End 和几百字终局回复。
 * 把这些报成 unfinished 是纯噪音，而且会淹掉真正卡死的那几条。
 *
 * 所以补报前先看一眼日志尾巴：有 Run End 就说明 kernel 收过尾，
 * 这一轮不该被叫做「未收尾」。
 *
 * 判不出来时【返回 false】（当成没跑完）：日志被 7 天清理带走、读失败等情况下，
 * 宁可保留 unfinished 这个偏保守的标签，也不要把一条真卡死的记录洗白。
 */
export function traceLooksCompleted(tracesDir, messageId) {
    try {
        const files = findTraceFiles(tracesDir, messageId);
        if (!files.length)
            return false;
        // 多个文件时看最后一个：kernel 递归的最外层 run 最后收尾。
        const file = files[files.length - 1];
        const size = fs.statSync(file).size;
        if (size <= 0)
            return false;
        const len = Math.min(size, TAIL_PROBE_BYTES);
        const fd = fs.openSync(file, 'r');
        try {
            const buf = Buffer.allocUnsafe(len);
            const n = fs.readSync(fd, buf, 0, len, size - len);
            return buf.subarray(0, n).toString('utf8').includes(RUN_END_MARKER);
        }
        finally {
            try {
                fs.closeSync(fd);
            }
            catch { /* ignore */ }
        }
    }
    catch {
        return false;
    }
}
/**
 * 确保这一轮在服务端有对应的提问行。
 *
 * 【补报专用】。为什么必须有这一步：渠道任务与定时任务的提问行是在
 * handleMessage 的 finally 里建的——进程崩在半路时那段根本不会执行，
 * 于是库里没有行。没有行的话，后面的 outcome 与 trace commit 都是空更新：
 * 日志传上了 OSS，却没有任何指针指向它，正是这次改造要消灭的状态。
 *
 * 对已经存在的行是安全的：服务端有 (user_id, message_id) 唯一索引，
 * 重复插入被 23505 挡下并静默忽略。所以补报时【无脑调一次】即可，
 * 不需要先查再插——查一次的往返比插一次还贵。
 */
export async function ensureQuestionRow(deps, input) {
    try {
        if (!deps.token || !deps.apiBase || !input.messageId)
            return;
        await postJson(`${deps.apiBase}/v1/agent/logs/question`, deps.token, deps.channelId, {
            session_id: input.sessionId,
            message_id: input.messageId,
            // content 列是 NOT NULL，空串也不行，所以必须给一个值
            content: (input.content || '[未收尾的轮次]').slice(0, 500),
            origin: input.origin,
            client_version: deps.clientVersion,
        });
    }
    catch { /* 静默 */ }
}
/**
 * 上报一轮的客观结局。
 *
 * 与渲染进程 appApi.reportOutcome 是同一个端点的两个调用方：
 *   · 渲染进程负责「实时」结局（用户点停止、报错）；
 *   · 这里负责「补报」结局（开机时扫出来的 unfinished / never_started），
 *     以及 server 子进程侧的补报——两处都拿不到渲染进程的 localStorage。
 *
 * 服务端带 `.is('outcome', null)` 的先到先得条件，所以补报绝不会覆盖实时观测。
 * 永不抛异常、永不打印日志。
 */
export async function reportOutcome(deps, input) {
    try {
        if (!deps.token || !deps.apiBase || !input.messageId || !input.outcome)
            return false;
        const res = await postJson(`${deps.apiBase}/v1/agent/logs/outcome`, deps.token, deps.channelId, {
            message_id: input.messageId,
            outcome: input.outcome,
            detail: input.detail,
        });
        return res !== null;
    }
    catch {
        return false;
    }
}
/** 仅供测试：重置「已关闭」缓存。 */
export function __resetDisabledCache() {
    disabledUntil = 0;
}
