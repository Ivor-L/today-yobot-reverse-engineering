import * as fs from 'fs';
import * as path from 'path';
import { replaceTextFileAtomic } from './store_file.js';
/**
 * 定时任务执行记录的落盘层。
 *
 * ⚠️ **这个目录不参与任何上下文加载**，是本次重构的核心约束：
 * cron 产出从"被动灌进聊天会话"改为"落在这里、由 agent 按需检索"。
 * 任何让它重新流回 `data/sessions/` 的改动都会让 18 万 token 的事故重演。
 *
 * 一 job 一个 JSONL 文件：
 *   · append 是 O(1)，定时任务写多读少，天然合适；
 *   · 单个任务的记录天然聚在一起，读"某任务最近 N 次"不用扫全量；
 *   · 单行损坏只影响一条记录，解析时跳过即可（见 `readRuns`）。
 */
const RUNS_DIR = path.join(process.env.USER_DATA_PATH || process.cwd(), 'data', 'cron_runs');
const ARCHIVE_DIR = path.join(process.env.USER_DATA_PATH || process.cwd(), 'data', 'cron_runs_archive');
/** Deleted jobs may still finish an in-flight handler; route those late records to the archive too. */
const archivedJobIds = new Set();
/** 单条输出上限。超出截断——记录是为了排查，不是为了归档全文。 */
export const MAX_OUTPUT_CHARS = 32 * 1024;
/**
 * 交接状态上限。刻意远小于输出：它会进下一次的上下文，必须严格有界。
 * 从 outcome 复用同一个常量——这里再写一个字面量会变成"提交时按 A 截、落盘时按 B 再截"，
 * 调高上限时后者会把前者的结果悄悄砍回去。
 */
export { MAX_CRON_NEXT_STATE_CHARS as MAX_NEXT_STATE_CHARS } from './outcome.js';
import { MAX_CRON_NEXT_STATE_CHARS as MAX_NEXT_STATE_CHARS } from './outcome.js';
/** 每个 job 保留的记录条数。 */
const MAX_RUNS_PER_JOB = 50;
/** 超过这个天数的记录在压缩时丢弃。 */
const MAX_AGE_DAYS = 30;
/** 触发一次重写压缩的行数阈值（避免每写一条都重写整个文件）。 */
const COMPACT_AT_LINES = MAX_RUNS_PER_JOB * 2;
function ensureDir() {
    if (!fs.existsSync(RUNS_DIR)) {
        fs.mkdirSync(RUNS_DIR, { recursive: true });
    }
    if (!fs.existsSync(ARCHIVE_DIR)) {
        fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    }
}
/** jobId 来自 uuid，但仍然过一遍白名单——它会拼进文件路径。 */
function safeId(jobId) {
    return String(jobId).replace(/[^a-zA-Z0-9_-]/g, '_');
}
function fileFor(jobId) {
    return path.join(RUNS_DIR, `${safeId(jobId)}.jsonl`);
}
function archiveFileFor(jobId) {
    return path.join(ARCHIVE_DIR, `${safeId(jobId)}.jsonl`);
}
export function truncate(text, limit) {
    if (text === undefined || text === null)
        return undefined;
    const s = String(text);
    if (s.length <= limit)
        return s;
    // 保留头部：定时任务的关键信息（做了什么、结论）通常在前面，
    // 尾部多是明细。截断必须**留下痕迹**，否则读的人会以为这就是全部。
    return `${s.slice(0, limit)}\n…[已截断，原长 ${s.length} 字符]`;
}
/**
 * 追加一条执行记录。
 *
 * 写记录**永远不允许影响任务本身**：任何异常只记日志，不外抛。
 * 定时任务已经跑完了，不能因为记不下来就把它判成失败。
 */
export function appendRun(run) {
    try {
        ensureDir();
        const record = {
            ...run,
            output: truncate(run.output, MAX_OUTPUT_CHARS),
            error: truncate(run.error, MAX_OUTPUT_CHARS),
            nextState: truncate(run.nextState, MAX_NEXT_STATE_CHARS),
        };
        const file = archivedJobIds.has(run.jobId) ? archiveFileFor(run.jobId) : fileFor(run.jobId);
        fs.appendFileSync(file, `${JSON.stringify(record)}\n`, 'utf-8');
        compactIfNeeded(file);
    }
    catch (e) {
        console.error(`[CronRuns] Failed to append run for job ${run.jobId}:`, e);
    }
}
/** 匹配 agent 产出的交接状态块。宽松匹配大小写与空白，标签写歪了也能捞回来。 */
const NEXT_STATE_RE = /<next_state>([\s\S]*?)<\/next_state>/gi;
const UNCLOSED_NEXT_STATE_RE = /<next_state>[\s\S]*$/i;
/**
 * 从本次输出里抽出「交接给下次执行的状态」，并返回剥掉该标签后的正文。
 *
 * 为什么是显式标签、而不是"截取输出最后 2000 字"：
 * **半截上下文比没有上下文更容易致幻**——被随机切开的历史会让模型以为
 * 那就是全貌，从而基于残缺信息推断；而明确知道"本次独立执行、无历史"的
 * 模型会老老实实去现拉数据。标签里的内容是任务自己认定的关键事实，
 * 有界、语义明确，且不会被误当成对话历史。
 */
export function extractNextState(text) {
    const raw = String(text ?? '');
    const matches = [...raw.matchAll(NEXT_STATE_RE)];
    const nextState = matches.length > 0 ? matches[matches.length - 1][1].trim() : '';
    // 所有完整标签都摘掉；若模型在标签中途被截断，未闭合的尾巴也不能泄漏给用户。
    const output = raw.replace(NEXT_STATE_RE, '').replace(UNCLOSED_NEXT_STATE_RE, '').trim();
    return { output, nextState: nextState || undefined };
}
const TASK_FAILED_RE = /<task_failed>([\s\S]*?)<\/task_failed>/gi;
const UNCLOSED_TASK_FAILED_RE = /<task_failed>([\s\S]*)$/i;
/** 失败原因太长会把记录列表撑爆，也没人读完；够定位就行。 */
export const MAX_FAILURE_REASON_CHARS = 500;
/**
 * 从本次输出里抽出 agent 自述的「任务未达成」，并返回剥掉该标签后的正文。
 *
 * 为什么需要它
 * ------------
 * 此前 `status` 反映的是"这一轮有没有跑完且没抛异常"，而不是"任务有没有达成"。
 * 于是出现过：微信没发出去、记录却是成功，聊天窗口还显示 ✅ 已发送。
 * 触发 ≠ 达成，用前者冒充后者，等于把排查依据变成噪音。
 *
 * 判定分两层，各管各的：
 *   · **框架能自己验证的**（投递结果、执行是否抛异常）由框架判定，不问 agent —— 确定性最高。
 *   · **只有 agent 知道的**（工具报错、数据拿不到、前置条件不满足、结果明显不符合要求）
 *     由 agent 在末尾显式声明。
 *
 * 为什么只要求"失败时"输出标签：成功是常态，每次都要求写状态标签纯属浪费 token；
 * 而"沉默 = 成功"的漏报风险由上面第一层的确定性检查兜住。
 */
export function extractTaskFailure(text) {
    const raw = String(text ?? '');
    const complete = [...raw.matchAll(TASK_FAILED_RE)].map(match => match[1].trim());
    const withoutComplete = raw.replace(TASK_FAILED_RE, '');
    const unclosed = UNCLOSED_TASK_FAILED_RE.exec(withoutComplete);
    const reasons = [...complete, ...(unclosed ? [unclosed[1].trim()] : [])].filter(Boolean);
    const hadFailureTag = complete.length > 0 || !!unclosed;
    if (!hadFailureTag)
        return { output: raw };
    const reason = truncate([...new Set(reasons)].join('；'), MAX_FAILURE_REASON_CHARS);
    // 与 next_state 同理：完整与未闭合标签都是系统字段，不该出现在投递正文里。
    const output = withoutComplete.replace(UNCLOSED_TASK_FAILED_RE, '').trim();
    // 标签在但内容为空 → 仍然算失败，只是原因不明；绝不能因为没写原因就当成功。
    return { output, failure: reason || '任务未达成（agent 未说明原因）' };
}
/** 行数超阈值时重写文件，只留最近 MAX_RUNS_PER_JOB 条且未过期的。 */
function compactIfNeeded(file) {
    try {
        const lines = fs.readFileSync(file, 'utf-8').split('\n').filter(Boolean);
        if (lines.length <= COMPACT_AT_LINES)
            return;
        const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
        const kept = lines
            .slice(-MAX_RUNS_PER_JOB)
            .filter((line) => {
            try {
                return JSON.parse(line).startedAt >= cutoff;
            }
            catch {
                return false; // 坏行顺手丢掉
            }
        });
        // Compaction is the only destructive rewrite in this append-only store. A
        // crash during a direct write used to be able to erase the whole history;
        // same-directory temp + fsync + rename keeps either snapshot complete.
        replaceTextFileAtomic(file, kept.length ? `${kept.join('\n')}\n` : '');
    }
    catch (e) {
        console.error(`[CronRuns] Compaction failed for ${file}:`, e);
    }
}
function readRunsFile(file) {
    if (!fs.existsSync(file))
        return [];
    const runs = [];
    for (const line of fs.readFileSync(file, 'utf-8').split('\n')) {
        if (!line.trim())
            continue;
        try {
            runs.push(JSON.parse(line));
        }
        catch {
            // 单行损坏不该让整个查询失败——排查场景下"读到大部分"远好过"什么都读不到"
        }
    }
    return runs;
}
/** 读某个 job 的记录，包含已归档记录，**时间倒序**（最近的在前）。 */
export function readRuns(jobId, limit = 20) {
    try {
        const byRunId = new Map();
        for (const run of [...readRunsFile(fileFor(jobId)), ...readRunsFile(archiveFileFor(jobId))]) {
            byRunId.set(run.runId || `${run.startedAt}:${run.finishedAt}`, run);
        }
        const runs = [...byRunId.values()];
        runs.sort((a, b) => b.startedAt - a.startedAt);
        return runs.slice(0, Math.max(1, limit));
    }
    catch (e) {
        console.error(`[CronRuns] Failed to read runs for job ${jobId}:`, e);
        return [];
    }
}
/** 跨所有 job 读记录（用于"只看失败"这类全局视图）。 */
export function readAllRuns(limit = 20, filter) {
    try {
        ensureDir();
        const runs = [];
        for (const name of fs.readdirSync(RUNS_DIR)) {
            if (!name.endsWith('.jsonl'))
                continue;
            // 每个 job 先各取一批再全局排序：避免把所有历史全读进内存。
            // 这里只能读 active 文件，不能调用会合并归档的 readRuns；否则已删任务
            // 会在同名残留/恢复场景下重新污染全局失败视图。
            const activeRuns = readRunsFile(path.join(RUNS_DIR, name))
                .sort((a, b) => b.startedAt - a.startedAt)
                .slice(0, MAX_RUNS_PER_JOB);
            for (const run of activeRuns) {
                if (!filter || filter(run))
                    runs.push(run);
            }
        }
        runs.sort((a, b) => b.startedAt - a.startedAt);
        return runs.slice(0, Math.max(1, limit));
    }
    catch (e) {
        console.error('[CronRuns] Failed to read all runs:', e);
        return [];
    }
}
export function findRun(runId) {
    try {
        ensureDir();
        const jobIds = new Set();
        for (const dir of [RUNS_DIR, ARCHIVE_DIR]) {
            for (const name of fs.readdirSync(dir)) {
                if (name.endsWith('.jsonl'))
                    jobIds.add(name.slice(0, -'.jsonl'.length));
            }
        }
        for (const jobId of jobIds) {
            const hit = readRuns(jobId, MAX_RUNS_PER_JOB).find((r) => r.runId === runId);
            if (hit)
                return hit;
        }
    }
    catch (e) {
        console.error(`[CronRuns] Failed to find run ${runId}:`, e);
    }
    return undefined;
}
/**
 * 最近一次执行留下的交接状态。没有则返回 undefined = 本次按无状态执行。
 *
 * 一并返回它**当时有没有被截断**：截断会静默丢掉清单尾部的待办项，而下一轮如果不知情，
 * 就会把手里这份残缺清单当成完整的，那些事项从此再没人想起。宁可让它知道"这里可能缺了东西"
 * ——已知的未知比假装完整安全得多（同 coverage=range_not_covered 的处理口径）。
 */
export function getLastNextState(jobId) {
    // 失败/超时不能推进 checkpoint，但也不该抹掉上一次成功状态。
    // 找“最近一次成功执行”后取它的状态：该成功记录没写状态 = 明确清空旧状态。
    const lastSuccessful = readRuns(jobId, MAX_RUNS_PER_JOB).find(run => run.status === 'ok');
    const state = lastSuccessful?.nextState;
    if (!state)
        return undefined;
    const truncated = (lastSuccessful?.outcome?.normalizations || []).some(n => n.includes('next_state'));
    return { state, truncated };
}
/**
 * Move a deleted job's records out of the active/global view while retaining
 * bounded audit history for explicit job_id/run_id lookups.
 */
export function archiveRuns(jobId) {
    archivedJobIds.add(jobId);
    try {
        ensureDir();
        const activeFile = fileFor(jobId);
        const archivedFile = archiveFileFor(jobId);
        if (!fs.existsSync(activeFile))
            return;
        const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
        const byRunId = new Map();
        for (const run of [...readRunsFile(archivedFile), ...readRunsFile(activeFile)]) {
            if (run.startedAt >= cutoff)
                byRunId.set(run.runId || `${run.startedAt}:${run.finishedAt}`, run);
        }
        const kept = [...byRunId.values()]
            .sort((a, b) => a.startedAt - b.startedAt)
            .slice(-MAX_RUNS_PER_JOB);
        if (kept.length > 0) {
            replaceTextFileAtomic(archivedFile, `${kept.map(run => JSON.stringify(run)).join('\n')}\n`);
        }
        else if (fs.existsSync(archivedFile)) {
            fs.unlinkSync(archivedFile);
        }
        fs.unlinkSync(activeFile);
    }
    catch (e) {
        console.error(`[CronRuns] Failed to archive runs for job ${jobId}:`, e);
    }
}
/** Remove expired archived histories; called during scheduler initialization. */
export function pruneArchivedRuns() {
    try {
        ensureDir();
        const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
        for (const name of fs.readdirSync(ARCHIVE_DIR)) {
            if (!name.endsWith('.jsonl'))
                continue;
            const file = path.join(ARCHIVE_DIR, name);
            const kept = readRunsFile(file)
                .filter(run => run.startedAt >= cutoff)
                .sort((a, b) => a.startedAt - b.startedAt)
                .slice(-MAX_RUNS_PER_JOB);
            if (kept.length === 0) {
                fs.unlinkSync(file);
            }
            else {
                replaceTextFileAtomic(file, `${kept.map(run => JSON.stringify(run)).join('\n')}\n`);
            }
        }
    }
    catch (e) {
        console.error('[CronRuns] Failed to prune archived runs:', e);
    }
}
/** Permanently delete both active and archived records (maintenance/tests only). */
export function deleteRuns(jobId) {
    try {
        archivedJobIds.delete(jobId);
        for (const file of [fileFor(jobId), archiveFileFor(jobId)]) {
            if (fs.existsSync(file))
                fs.unlinkSync(file);
        }
    }
    catch (e) {
        console.error(`[CronRuns] Failed to delete runs for job ${jobId}:`, e);
    }
}
/** 近 N 天的消耗合计，用于 UI 上暴露"哪个任务在烧钱"。 */
export function usageSince(jobId, sinceMs) {
    let tokens = 0;
    let points = 0;
    let runs = 0;
    for (const run of readRuns(jobId, MAX_RUNS_PER_JOB)) {
        if (run.startedAt < sinceMs)
            continue;
        runs += 1;
        tokens += run.usage?.tokens || 0;
        points += run.usage?.points || 0;
    }
    return { tokens, points, runs };
}
