import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';
function toEpoch(value) {
    if (typeof value !== 'string' || !value.trim())
        return null;
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? null : ms;
}
/**
 * @param lastUpdated 落盘文件的 last_updated —— 语义是**采集时刻**（RPA 侧写的是 `datetime.now()`），
 *                    不是最后一条消息的时间。两者在 RPA 里共用一个字段，这里按前者解释。
 * @param sinceMs     调用方要的起始时间；没传则不做判定（保持既有行为）。
 */
export function assessHistoryCoverage(lastUpdated, sinceMs, returned, now = Date.now()) {
    // 没指定范围 = 调用方没有时间要求，不替它臆断。
    if (sinceMs === null)
        return { status: 'ok' };
    const capturedMs = toEpoch(lastUpdated);
    // 拿不到采集时间就不下结论：宁可不提示，也不能给出错误的"数据是新的"暗示。
    if (capturedMs === null)
        return { status: 'ok' };
    if (capturedMs < sinceMs) {
        return {
            status: 'range_not_covered',
            lastCapturedAt: lastUpdated,
            // 向上取整：宁可高估间隔，也不能低估。
            // 46.9 小时用 floor 会报成"1 天"，读起来像"才隔了一天，问题不大"——
            // 低估会让模型倾向于继续用这份数据。
            daysSinceLastCapture: Math.max(1, Math.ceil((now - capturedMs) / 86_400_000)),
        };
    }
    if (returned === 0) {
        return { status: 'no_messages_in_range', lastCapturedAt: lastUpdated };
    }
    return { status: 'ok' };
}
/**
 * 给模型看的处置说明。
 *
 * 两条底线，都是踩过的坑：
 *   1) **不要用没覆盖到的数据生成该区间的总结**——旧数据非空，"无内容不总结"的护栏拦不住它；
 *   2) **不要替用户判定成因**。早先这里把"采集中断"写成了肯定句，agent 就原样转述给用户，
 *      而真实原因可能只是微信没开、或那几个群从来没配过监听。工具知道的只有
 *      "数据没覆盖到"这一个事实，成因得靠核实。
 */
export function coverageAdvice(coverage) {
    if (coverage.status === 'range_not_covered') {
        return `本地历史最后更新于 ${coverage.lastCapturedAt}（约 ${coverage.daysSinceLastCapture} 天前）；`
            + `晚于该时刻的消息没有落盘，因此**无法判断**你请求的区间内是否有过消息。`
            + `
· 不要用更早的消息代替该区间生成总结。`
            + `
· 落盘为何停在该时刻属于未知——微信未运行、账号未登录、该会话未配置监听、采集异常都可能，`
            + `需要核实后才能下结论。**不要直接给用户一个成因**（"采集中断了""群里没人说话"都是未经证实的推断）；`
            + `如实说明"本地没有该区间的记录"，需要时再用诊断类工具去查。`;
    }
    if (coverage.status === 'no_messages_in_range') {
        return `本地历史已更新至 ${coverage.lastCapturedAt}，覆盖了你请求的区间，且区间内没有消息。`
            + `可据此说明该时段无内容——不要硬凑，也不要发空总结。`;
    }
    return undefined;
}
export class LocalDataManager {
    dataRoot;
    taskLogRoot;
    constructor() {
        // Chat history (and other RPA data) is written by the RPA backend (WeRobotCore
        // DataManager) to ~/.webot/data UNCONDITIONALLY — see WeRobotCore/utils/data_manager.py
        // (global_data_dir = Path.home()/".webot"/"data"). It is home-relative, independent of
        // dev/prod or where the RPA binary lives, so we must read from the exact same place.
        // NOTE: the previous ~/.yokoagent/bin/... (prod) and cwd/services/... (dev) roots were
        // stale/never-written copies and caused the Agent to read months-old history.
        this.dataRoot = process.env.WEBOT_DATA_DIR || path.join(os.homedir(), '.webot', 'data');
        this.taskLogRoot = path.join(os.homedir(), '.yokowebot', 'task_logs');
    }
    getChatHistoryPath(wechatId) {
        return path.join(this.dataRoot, 'chat_history', wechatId);
    }
    getChatHistoryRoot() {
        return path.join(this.dataRoot, 'chat_history');
    }
    /**
     * List the WeChat account ids (directories) that actually have a saved
     * sessions index, i.e. accounts whose chats have been recorded to disk by a
     * monitor-mode assistant. This is the authoritative source for "which account
     * has history", more reliable than scanning the config dir.
     */
    async listWeChatIds() {
        const root = this.getChatHistoryRoot();
        if (!fs.existsSync(root))
            return [];
        const entries = await fs.promises.readdir(root, { withFileTypes: true });
        return entries
            .filter(d => d.isDirectory() && fs.existsSync(path.join(root, d.name, 'sessions_index.json')))
            .map(d => d.name);
    }
    /**
     * Resolve which wechatId to read history from.
     * - Provided id → used as-is.
     * - Omitted + exactly one account has history → that account (the common case).
     * - Omitted + zero/multiple accounts → throws a descriptive error so the
     *   caller (Agent) can either set up monitoring or pick an account.
     */
    async resolveWeChatId(wechatId) {
        if (wechatId && wechatId.trim())
            return wechatId.trim();
        const ids = await this.listWeChatIds();
        if (ids.length === 0) {
            throw new Error('NO_LOCAL_HISTORY: 未找到任何本地聊天历史。请先创建一个“仅监控”模式的 AI 助手并让它记录群聊后再试。');
        }
        if (ids.length > 1) {
            throw new Error(`MULTIPLE_ACCOUNTS: 检测到多个微信账号存在本地历史 [${ids.join(', ')}]，请在 wechatId 参数中指定要查询的账号。`);
        }
        return ids[0];
    }
    async getSessionsIndex(wechatId) {
        const filePath = path.join(this.getChatHistoryPath(wechatId), 'sessions_index.json');
        if (!fs.existsSync(filePath)) {
            throw new Error(`Sessions index not found for wechatId: ${wechatId}`);
        }
        const content = await fs.promises.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    }
    async getChatSession(wechatId, sessionName) {
        const index = await this.getSessionsIndex(wechatId);
        const session = index.sessions.find(s => s.name === sessionName || s.id === sessionName);
        if (!session) {
            return null;
        }
        const filePath = path.join(this.getChatHistoryPath(wechatId), session.file_name);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const content = await fs.promises.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    }
    async listSessions(wechatId) {
        const index = await this.getSessionsIndex(wechatId);
        return index.sessions;
    }
    /**
     * Read one session's saved history with optional time-range / count trimming.
     * Built for the 群聊总结 (chat-summary) flow: returns accumulated history
     * (up to ~100 msgs the monitor persisted), not just the current window.
     *
     * Messages are stored old→new. The `since` filter carries forward the last
     * known time so messages between time-markers (which have no own timestamp)
     * are still attributed to the right moment.
     */
    async getSessionMessages(wechatId, sessionName, opts = {}) {
        const file = await this.getChatSession(wechatId, sessionName);
        if (!file)
            return { found: false };
        const all = Array.isArray(file.messages) ? file.messages : [];
        const totalAvailable = all.length;
        const sinceMs = opts.since ? parseSinceToEpochMs(opts.since) : null;
        let filtered = all;
        if (sinceMs !== null) {
            const kept = [];
            let lastEpoch = null;
            for (const msg of all) {
                const e = messageEpochMs(msg);
                if (e !== null)
                    lastEpoch = e;
                const eff = e !== null ? e : lastEpoch;
                if (eff === null || eff < sinceMs)
                    continue;
                kept.push(msg);
            }
            filtered = kept;
        }
        const matchedInRange = filtered.length;
        if (typeof opts.limit === 'number' && opts.limit > 0 && filtered.length > opts.limit) {
            filtered = filtered.slice(-opts.limit);
        }
        // Drop the internal de-dup fingerprint; it is noise for summarization.
        const messages = filtered.map(({ fingerprint, ...rest }) => rest);
        const coverage = assessHistoryCoverage(file.last_updated, sinceMs, messages.length);
        return {
            found: true,
            sessionName: file.session_name ?? sessionName,
            isGroup: file.is_group,
            lastUpdated: file.last_updated,
            totalAvailable,
            matchedInRange,
            returned: messages.length,
            messages,
            coverage: coverage.status,
            coverageNotice: coverageAdvice(coverage),
        };
    }
    async getTaskLogs(taskType, limit = 100) {
        const logPath = path.join(this.taskLogRoot, `${taskType}.jsonl`);
        if (!fs.existsSync(logPath)) {
            return [];
        }
        const results = [];
        try {
            const fileStream = fs.createReadStream(logPath);
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });
            for await (const line of rl) {
                if (line.trim()) {
                    try {
                        results.push(JSON.parse(line));
                    }
                    catch (e) {
                        // Ignore parse error for single line
                    }
                }
            }
            // Return the most recent logs up to the limit
            return results.slice(-limit);
        }
        catch (e) {
            console.error(`Failed to read task logs for ${taskType}:`, e);
            return [];
        }
    }
}
/**
 * Parse a `since` filter into a LOCAL-time epoch (ms).
 * - "YYYY-MM-DD"        → local midnight of that day
 * - "YYYY-MM-DD HH:MM"  → that local time
 * Avoids the UTC-midnight pitfall of bare Date.parse("YYYY-MM-DD").
 */
export function parseSinceToEpochMs(input) {
    let norm = input.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(norm)) {
        norm += 'T00:00:00';
    }
    else {
        norm = norm.replace(' ', 'T');
    }
    const t = Date.parse(norm);
    if (Number.isNaN(t)) {
        throw new Error(`INVALID_SINCE: 无法解析 since="${input}"，请使用 "YYYY-MM-DD" 或 "YYYY-MM-DD HH:MM" 格式。`);
    }
    return t;
}
/** Best-effort epoch (ms) for a saved message; null when it carries no time. */
function messageEpochMs(msg) {
    // `timestamp` is stored in seconds (Python datetime.fromtimestamp).
    if (typeof msg?.timestamp === 'number' && msg.timestamp > 0) {
        return msg.timestamp * 1000;
    }
    // `time` is a "YYYY-MM-DD HH:MM" local-time string.
    if (typeof msg?.time === 'string' && msg.time.trim()) {
        const t = Date.parse(msg.time.trim().replace(' ', 'T'));
        if (!Number.isNaN(t))
            return t;
    }
    return null;
}
