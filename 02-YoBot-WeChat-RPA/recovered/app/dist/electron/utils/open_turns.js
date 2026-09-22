// 「未收尾轮次」的本地账本。
//
// 解决的问题：agent 卡死或崩溃时，进程已经死了，【没有任何网络机会】上报。
// 主聊天那条上报链的触发点是「渲染进程收到终局消息」，而卡死永远等不到那条消息；
// 待上报队列又只存在于渲染进程的一个内存 Map 里，进程一死即消失。
// 结果是：本地日志写了、线上一条记录都没有，事后查完全落空。
//
// 唯一可行的办法是本地落盘 + 下次启动补报。这个文件就是那个账本。
//
// 一轮一个文件而不是一个 jsonl：
//   · 删除 = unlink，天然并发安全，不需要读改写整个文件；
//   · 崩溃时最多损坏一个文件，不会把整个账本写坏；
//   · 目录列表本身就是「当前未收尾的轮次」，不需要任何索引。
//
// 硬约束（与 trace_reporter 一致）：不抛异常、不打印日志、失败静默降级。
// 这是一条旁路，它的任何问题都不该被用户感知到。
import * as fs from 'fs';
import * as path from 'path';
/** label 的存储上限。够认出是哪个任务即可，完整原文在 trace 日志里。 */
const MAX_LABEL_CHARS = 200;
/** 认领后的后缀。认领的原子性来自「源文件被移走」，见 claimStaleTurns 的说明。 */
const CLAIM_SUFFIX = '.claimed';
/** 一次扫描最多读多少个条目。防御异常目录，不让补报把启动拖住。 */
const MAX_SCAN = 500;
/** 遗留认领文件的回收阈值：上一次扫描死在半路留下的，超过这个时长直接删。 */
const STALE_CLAIM_MS = 60 * 60 * 1000;
/**
 * 账本目录。
 *
 * ⚠️ 必须与 DebugLogger / trace_upload 的 tracesDir 落在同一个 userData 根下，
 * 否则会变成「写在 A 目录、去 B 目录找」——全程静默，不会有任何迹象告诉你
 * 为什么一条都补报不上去。主进程传 app.getPath('userData')，
 * server 子进程传 process.env.USER_DATA_PATH || process.cwd()。
 */
export function openTurnsDir(root) {
    return path.join(root, 'logs', 'open_turns');
}
/** 与 DebugLogger 逐字一致的根目录算法，供 server 子进程使用。 */
export function defaultRoot() {
    return process.env.USER_DATA_PATH || process.cwd();
}
/** traceId 直接进文件名，必须约束字符集：未经校验的输入拼进路径等于允许任意位置写文件。 */
function safeId(traceId) {
    return String(traceId || '').replace(/[^a-zA-Z0-9_-]/g, '');
}
/**
 * 登记一轮开始。
 *
 * 幂等且可增量：同一 traceId 再次调用会与已有记录合并（turn_started 补 startedAt
 * 时正是这个路径），不会把 submittedAt 冲掉。
 */
export function markTurnOpen(root, rec) {
    try {
        const id = safeId(rec.traceId);
        if (!id)
            return;
        const dir = openTurnsDir(root);
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `${id}.json`);
        let prev = {};
        try {
            prev = JSON.parse(fs.readFileSync(file, 'utf8'));
        }
        catch { /* 不存在或读坏了，当成新记录 */ }
        const merged = {
            origin: 'agent',
            submittedAt: Date.now(),
            ...prev,
            ...rec,
            traceId: id,
            sessionId: rec.sessionId ?? prev.sessionId ?? '',
        };
        if (merged.label)
            merged.label = String(merged.label).slice(0, MAX_LABEL_CHARS);
        fs.writeFileSync(file, JSON.stringify(merged), 'utf8');
    }
    catch { /* 静默 */ }
}
/** 这一轮正常收尾，销账。 */
export function markTurnClosed(root, traceId) {
    try {
        const id = safeId(traceId);
        if (!id)
            return;
        fs.rmSync(path.join(openTurnsDir(root), `${id}.json`), { force: true });
    }
    catch { /* 静默 */ }
}
/**
 * 退出前给所有未收尾的轮次盖上 closedReason。
 *
 * 【必须同步执行】：调用点在 before-quit，异步的话进程可能先退出。
 * 每个文件只是几十字节的读改写，限量 MAX_SCAN 个，代价可忽略；
 * 但仍全程吞异常——绝不能因为这件旁路的事挡住用户退出应用。
 */
export function stampClosedReason(root, reason) {
    let stamped = 0;
    try {
        const dir = openTurnsDir(root);
        if (!fs.existsSync(dir))
            return 0;
        for (const name of fs.readdirSync(dir).slice(0, MAX_SCAN)) {
            if (!name.endsWith('.json'))
                continue;
            const file = path.join(dir, name);
            try {
                const rec = JSON.parse(fs.readFileSync(file, 'utf8'));
                rec.closedReason = reason;
                fs.writeFileSync(file, JSON.stringify(rec), 'utf8');
                stamped++;
            }
            catch { /* 单个文件坏了不影响其它 */ }
        }
    }
    catch { /* 静默 */ }
    return stamped;
}
/**
 * 认领一批未收尾的轮次。
 *
 * 用 rename 做原子认领而不是「先读后删」：主进程与 server 子进程都会扫这个目录
 * （子进程可能被 supervisor 单独重启，那时它得自己收拾自己写的那些），
 * 两边同时扫到同一个文件时必须只有一个赢家。
 *
 * 保证来自【源文件消失】，不是目标文件冲突：先 rename 的那个把源移走，
 * 后到的那个 rename 拿到 ENOENT。
 * （注意别写成「Windows 上 rename 到已存在的目标会失败」——不成立：
 *  Node 的 fs.rename 在 Windows 上走 MoveFileExW + MOVEFILE_REPLACE_EXISTING，
 *  语义与 POSIX 一致，是会覆盖的。所以绝不能反过来靠「目标已存在」来判重。）
 *
 * 按 submittedAt 倒序取最近的：用户长期离线后开机可能攒下几十条，
 * 最近的样本价值最高，而且这批的本地日志也最可能还没被 7 天清理带走。
 */
export function claimStaleTurns(root, opts) {
    const out = [];
    try {
        const dir = openTurnsDir(root);
        if (!fs.existsSync(dir))
            return out;
        const now = Date.now();
        const names = fs.readdirSync(dir).slice(0, MAX_SCAN);
        const candidates = [];
        for (const name of names) {
            const file = path.join(dir, name);
            // 上一次扫描死在半路留下的认领文件：超时即回收，不做重试队列。
            if (name.endsWith(CLAIM_SUFFIX)) {
                try {
                    if (now - fs.statSync(file).mtimeMs > STALE_CLAIM_MS)
                        fs.rmSync(file, { force: true });
                }
                catch { /* 静默 */ }
                continue;
            }
            if (!name.endsWith('.json'))
                continue;
            let rec;
            try {
                rec = JSON.parse(fs.readFileSync(file, 'utf8'));
            }
            catch {
                // 解析不了的（写到一半断电）直接删：留着每次开机都白读一遍
                try {
                    fs.rmSync(file, { force: true });
                }
                catch { /* 静默 */ }
                continue;
            }
            if (!rec?.traceId) {
                try {
                    fs.rmSync(file, { force: true });
                }
                catch { /* 静默 */ }
                continue;
            }
            if (!(now - (rec.submittedAt || 0) > opts.olderThanMs))
                continue;
            if (opts.origins && !opts.origins.includes(rec.origin))
                continue;
            candidates.push(rec);
        }
        candidates.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
        for (const rec of candidates) {
            if (out.length >= opts.limit)
                break;
            const src = path.join(dir, `${safeId(rec.traceId)}.json`);
            const claimPath = `${src}${CLAIM_SUFFIX}`;
            try {
                fs.renameSync(src, claimPath); // 认领成功者独占
            }
            catch {
                continue; // 已被另一个进程拿走
            }
            out.push({ record: rec, claimPath });
        }
    }
    catch { /* 静默 */ }
    return out;
}
/** 处理完毕（无论成败）都要销账：这条链不做重试队列。 */
export function releaseClaim(claimPath) {
    try {
        fs.rmSync(claimPath, { force: true });
    }
    catch { /* 静默 */ }
}
/**
 * 清理超期的账本文件。
 *
 * 必须跟着 trace 日志的 7 天清理一起做：日志被清掉之后，账本里的那条记录
 * 永远补报不出内容，只会让每次开机白跑一遍。
 */
export function pruneOpenTurns(root, keepDays = 7) {
    try {
        const dir = openTurnsDir(root);
        if (!fs.existsSync(dir))
            return;
        const cutoff = Date.now() - keepDays * 86400000;
        for (const name of fs.readdirSync(dir).slice(0, MAX_SCAN)) {
            const file = path.join(dir, name);
            try {
                if (fs.statSync(file).mtimeMs < cutoff)
                    fs.rmSync(file, { force: true });
            }
            catch { /* 静默 */ }
        }
    }
    catch { /* 静默 */ }
}
/**
 * 把一条账本记录翻译成 outcome 取值。
 *
 * 只有两种：开始执行过 → unfinished；从未开始 → never_started。
 * 【不再细分】卡死 / 崩溃 / 关窗口 / 断电——客户端侧无法区分这四者，
 * 硬分就是把推测伪装成事实。线索只放进 detail.closed_reason，且同样只是旁证。
 */
export function outcomeForRecord(rec) {
    return rec.startedAt ? 'unfinished' : 'never_started';
}
/**
 * 补报时随 outcome 一起上送的细节。只有数字与固定枚举，绝不含任何自由文本。
 *
 * ⚠️ 【故意不带 elapsed_ms】。补报发生在下一次启动，`Date.now() - startedAt`
 * 量的是「这条记录在账本里躺了多久」，不是「这一轮跑了多久」——用户隔三天才开机，
 * 它就是三天。挂上一个叫 elapsed_ms 的字段几乎必然被当成轮次耗时读，
 * 那比没有这个字段更糟。这一轮到底跑了多久，客户端事后无从得知，
 * 真需要就去 trace 日志里看最后一条事件的时间戳。
 *
 * queue_wait_ms 不同：它是两个已记录时刻的差，任何时候算都一样准。
 */
export function detailForRecord(rec) {
    const detail = {
        closed_reason: rec.closedReason === 'app_quit' ? 'app_quit' : 'unknown',
    };
    if (rec.startedAt && rec.submittedAt) {
        detail.queue_wait_ms = Math.max(0, rec.startedAt - rec.submittedAt);
    }
    return detail;
}
