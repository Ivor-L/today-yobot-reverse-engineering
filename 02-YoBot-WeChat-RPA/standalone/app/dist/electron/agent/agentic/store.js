import * as fs from "fs";
import * as path from "path";
const MAX_FIELD_CHARS = 2000;
function truncate(s) {
    return s.length > MAX_FIELD_CHARS ? s.slice(0, MAX_FIELD_CHARS) + "…" : s;
}
/** 从历史逻辑键 `rpa__accountId__sessionId` 中提取真正的上游会话 ID。 */
function sessionIdOf(runId) {
    const prefix = "rpa__";
    if (!runId.startsWith(prefix))
        return runId;
    const separator = runId.indexOf("__", prefix.length);
    return separator >= 0 ? runId.slice(separator + 2) : runId;
}
export class ConversationStore {
    baseDir;
    constructor(baseDir) {
        this.baseDir = baseDir
            ?? path.join(process.env.USER_DATA_PATH || process.cwd(), "data", "rpa_conversations");
    }
    /** 供同一服务下的旁路存储选择隔离目录；不暴露任何会话内容。 */
    get directory() {
        return this.baseDir;
    }
    /** 文件名只用 accountId + sessionId 的安全化形式,不含 runId —— 逻辑会话是长期实体。 */
    filePath(accountId, sessionId) {
        const safe = `${accountId}__${sessionId}`.replace(/[^a-zA-Z0-9_-]/g, "_");
        return path.join(this.baseDir, `${safe}.jsonl`);
    }
    append(accountId, sessionId, turn) {
        try {
            fs.mkdirSync(this.baseDir, { recursive: true });
            const record = {
                ...turn,
                input: truncate(turn.input),
                segments: turn.segments.map(truncate),
            };
            fs.appendFileSync(this.filePath(accountId, sessionId), JSON.stringify(record) + "\n", "utf-8");
        }
        catch (e) {
            // 记录失败不能影响回复。业务日志不是关键路径。
            console.error("[Agentic] Failed to append conversation record:", e);
        }
    }
    read(accountId, sessionId, limit = 50) {
        try {
            const p = this.filePath(accountId, sessionId);
            if (!fs.existsSync(p))
                return [];
            const lines = fs.readFileSync(p, "utf-8").split(/\r?\n/).filter(Boolean);
            return lines
                .slice(-limit)
                .map((l) => {
                try {
                    return JSON.parse(l);
                }
                catch {
                    return null;
                }
            })
                .filter((t) => t !== null);
        }
        catch {
            return [];
        }
    }
    // ------------------------------------------------------------------
    // 跨会话聚合读取(供主 agent 的 agent_records 技能 / UI 回复记录用)
    //
    // 文件名把 accountId/sessionId 做了不可逆安全化,无法从文件名反推;好在每条 turn
    // 自带 profileId / sessionName / userName,聚合完全从记录内容来,不依赖文件名。
    // ------------------------------------------------------------------
    listFiles() {
        try {
            if (!fs.existsSync(this.baseDir))
                return [];
            return fs.readdirSync(this.baseDir)
                .filter((f) => f.endsWith(".jsonl"))
                .map((f) => path.join(this.baseDir, f));
        }
        catch {
            return [];
        }
    }
    parseFile(p) {
        try {
            return fs.readFileSync(p, "utf-8").split(/\r?\n/).filter(Boolean)
                .map((l) => { try {
                return JSON.parse(l);
            }
            catch {
                return null;
            } })
                .filter((t) => t !== null);
        }
        catch {
            return [];
        }
    }
    /** 跨所有会话文件读取,按条件过滤,时间倒序返回(最近的在前)。 */
    queryTurns(q = {}) {
        const out = [];
        for (const f of this.listFiles()) {
            for (const t of this.parseFile(f)) {
                if (q.profileId && t.profileId !== q.profileId)
                    continue;
                if (q.sessionId && sessionIdOf(t.runId) !== q.sessionId)
                    continue;
                if (q.action && t.action !== q.action)
                    continue;
                if (q.sinceMs && t.ts < q.sinceMs)
                    continue;
                out.push(t);
            }
        }
        out.sort((a, b) => b.ts - a.ts);
        return out.slice(0, q.limit ?? 30);
    }
    /**
     * 枚举某个子 Agent 的全部已知客户会话，供 UI 构造筛选项。
     * 不复用 queryTurns 的 limit，避免近期不活跃的会话从下拉框消失。
     */
    listConversations(profileId) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const todayMs = startOfDay.getTime();
        const map = new Map();
        for (const f of this.listFiles()) {
            for (const t of this.parseFile(f)) {
                if (profileId && t.profileId !== profileId)
                    continue;
                if (!t.runId)
                    continue;
                const sessionId = sessionIdOf(t.runId);
                let row = map.get(sessionId);
                if (!row) {
                    row = { sessionId, total: 0, today: 0, lastTs: 0 };
                    map.set(sessionId, row);
                }
                row.total++;
                if (t.ts >= todayMs)
                    row.today++;
                const sessionName = t.sessionName?.trim();
                if (t.ts >= row.lastTs) {
                    row.lastTs = t.ts;
                    if (sessionName)
                        row.sessionName = sessionName;
                    if (typeof t.isGroup === "boolean")
                        row.isGroup = t.isGroup;
                }
                else if (!row.sessionName && sessionName) {
                    row.sessionName = sessionName;
                }
            }
        }
        return [...map.values()].sort((a, b) => b.lastTs - a.lastTs);
    }
    /** 按子 Agent 聚合概览。sinceMs 限定统计窗口;today 恒按自然日切分。 */
    overview(sinceMs) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const todayMs = startOfDay.getTime();
        const map = new Map();
        for (const f of this.listFiles()) {
            for (const t of this.parseFile(f)) {
                if (sinceMs && t.ts < sinceMs)
                    continue;
                let o = map.get(t.profileId);
                if (!o) {
                    o = { profileId: t.profileId, total: 0, today: 0, replies: 0, deferrals: 0, conversations: 0, lastTs: 0, sessions: new Set() };
                    map.set(t.profileId, o);
                }
                o.total++;
                if (t.ts >= todayMs)
                    o.today++;
                if (t.action === "reply")
                    o.replies++;
                if (t.action === "defer")
                    o.deferrals++;
                if (t.ts > o.lastTs)
                    o.lastTs = t.ts;
                o.sessions.add(sessionIdOf(t.runId));
            }
        }
        return [...map.values()]
            .map(({ sessions, ...o }) => ({ ...o, conversations: sessions.size }))
            .sort((a, b) => b.lastTs - a.lastTs);
    }
}
