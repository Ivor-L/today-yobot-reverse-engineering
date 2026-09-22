import { extractText } from "../utils/content.js";
import { selectActiveSessionBranch } from "../shared/session_tree.js";
import { titleTextFromContent, visibleTextFromContent } from "../shared/model_only_context.js";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
const DATA_DIR = path.join(process.env.USER_DATA_PATH || process.cwd(), "data", "sessions");
const ISOLATED_DIR = path.join(process.env.USER_DATA_PATH || process.cwd(), "data", "session_isolated");
const META_DIR = path.join(process.env.USER_DATA_PATH || process.cwd(), "data", "session_meta");
const SESSION_CONTEXT_CUSTOM_TYPE = "yoko-session-context";
export const PENDING_OFFICIAL_EXPERT_CONTINUATION_META_KEY = "pendingOfficialExpertContinuation";
export class SessionPersistenceError extends Error {
    code;
    quarantinePath;
    constructor(code, message, quarantinePath, cause) {
        super(message);
        this.code = code;
        this.quarantinePath = quarantinePath;
        this.name = "SessionPersistenceError";
        if (cause !== undefined)
            this.cause = cause;
    }
}
export class SessionManager {
    processedMessageIds = new Set();
    reservedSystemSessionPattern = /^system(?:[_:]{1,2})?heartbeat$/i;
    constructor() {
        this.ensureDataDir();
    }
    ensureDataDir() {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        if (!fs.existsSync(ISOLATED_DIR)) {
            fs.mkdirSync(ISOLATED_DIR, { recursive: true });
        }
        if (!fs.existsSync(META_DIR)) {
            fs.mkdirSync(META_DIR, { recursive: true });
        }
    }
    getFilePath(channel, sessionId) {
        const safeChannel = channel.replace(/[^a-zA-Z0-9_-]/g, '_');
        let safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_');
        // Check if sessionId already starts with channel prefix
        if (safeSessionId.startsWith(safeChannel + '__')) {
            return path.join(DATA_DIR, `${safeSessionId}.json`);
        }
        return path.join(DATA_DIR, `${safeChannel}__${safeSessionId}.json`);
    }
    getIsolatedFilePath(channel, sessionId) {
        const safeChannel = channel.replace(/[^a-zA-Z0-9_-]/g, '_');
        let safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_');
        if (safeSessionId.startsWith(safeChannel + '__')) {
            return path.join(ISOLATED_DIR, `${safeSessionId}.json`);
        }
        return path.join(ISOLATED_DIR, `${safeChannel}__${safeSessionId}.json`);
    }
    getMetaFilePath(channel, sessionId) {
        const safeChannel = channel.replace(/[^a-zA-Z0-9_-]/g, '_');
        let safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_');
        if (safeSessionId.startsWith(safeChannel + '__')) {
            return path.join(META_DIR, `${safeSessionId}.meta.json`);
        }
        return path.join(META_DIR, `${safeChannel}__${safeSessionId}.meta.json`);
    }
    parseFileInfoFromPath(filePath) {
        const base = path.basename(filePath, ".json");
        const idx = base.indexOf("__");
        if (idx === -1)
            return null;
        return { channel: base.slice(0, idx), sessionId: base.slice(idx + 2) };
    }
    readSessionMeta(channel, sessionId) {
        try {
            const metaPath = this.getMetaFilePath(channel, sessionId);
            if (!fs.existsSync(metaPath))
                return null;
            const raw = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
            if (!raw || typeof raw !== "object")
                return null;
            return raw;
        }
        catch {
            return null;
        }
    }
    writeSessionMeta(channel, sessionId, data) {
        try {
            this.ensureDataDir();
            const metaPath = this.getMetaFilePath(channel, sessionId);
            const existing = this.readSessionMeta(channel, sessionId) || {};
            const payload = {
                ...existing,
                id: data.id || existing.id || sessionId,
                type: data.type || existing.type,
                parentId: data.parentId || existing.parentId,
                status: data.status || existing.status,
                createdAt: data.createdAt || existing.createdAt,
                updatedAt: Date.now(),
                metadata: {
                    ...(existing.metadata || {}),
                    ...(data.metadata || {}),
                },
                timeoutMs: data.timeoutMs ?? existing.timeoutMs,
                depth: data.depth ?? existing.depth,
            };
            this.atomicReplace(metaPath, JSON.stringify(payload, null, 2));
            return true;
        }
        catch (e) {
            console.error(`[SessionManager] Failed to write session meta ${channel}:${sessionId}`, e);
            return false;
        }
    }
    /**
     * Persist additive session metadata without rewriting the primary session file.
     * Pi sessions may be JSONL trees, so UI/runtime coordination state belongs in session_meta.
     */
    updateSessionMetadata(channel, sessionId, metadata) {
        const persisted = this.writeSessionMeta(channel, sessionId, {
            id: sessionId,
            metadata,
        });
        if (!persisted) {
            throw new SessionPersistenceError("write_failed", `Failed to durably update session metadata ${channel}:${sessionId}.`);
        }
    }
    /** Server-only metadata accessor. Callers must never forward this object to a client. */
    getPrivateSessionMetadata(channel, sessionId) {
        const metadata = this.readSessionMeta(channel, sessionId)?.metadata;
        return metadata && typeof metadata === "object"
            ? structuredClone(metadata)
            : {};
    }
    publicSessionMetadata(metadata) {
        const visible = { ...(metadata || {}) };
        delete visible[PENDING_OFFICIAL_EXPERT_CONTINUATION_META_KEY];
        return visible;
    }
    mergeSessionMeta(sessionData, filePath) {
        const fileInfo = this.parseFileInfoFromPath(filePath);
        if (!fileInfo)
            return sessionData;
        const meta = this.readSessionMeta(fileInfo.channel, fileInfo.sessionId);
        if (!meta)
            return sessionData;
        if (!sessionData) {
            return {
                id: meta.id || fileInfo.sessionId,
                type: meta.type || "main",
                parentId: meta.parentId,
                status: meta.status || "idle",
                messages: [],
                createdAt: meta.createdAt || 0,
                updatedAt: meta.updatedAt || 0,
                metadata: this.publicSessionMetadata(meta.metadata),
                timeoutMs: meta.timeoutMs,
                depth: meta.depth,
            };
        }
        const mergedMetadata = {
            ...this.publicSessionMetadata(meta.metadata),
            ...this.publicSessionMetadata(sessionData.metadata),
        };
        // The mode is owned by session_meta. A primary file may contain a stale copied value.
        if (Object.prototype.hasOwnProperty.call(meta.metadata || {}, "activeOfficialExpert")) {
            mergedMetadata.activeOfficialExpert = meta.metadata?.activeOfficialExpert;
        }
        return {
            ...sessionData,
            id: sessionData.id || meta.id || fileInfo.sessionId,
            type: sessionData.type === "main" && meta.type ? meta.type : (sessionData.type || meta.type),
            parentId: sessionData.parentId || meta.parentId,
            status: sessionData.status || meta.status,
            createdAt: sessionData.createdAt || meta.createdAt || 0,
            updatedAt: Math.max(sessionData.updatedAt || 0, meta.updatedAt || 0),
            metadata: mergedMetadata,
            timeoutMs: sessionData.timeoutMs ?? meta.timeoutMs,
            depth: sessionData.depth ?? meta.depth,
        };
    }
    normalizeStructuredContent(content) {
        if (Array.isArray(content)) {
            return content;
        }
        if (typeof content === "string") {
            return [{ type: "text", text: content }];
        }
        if (content && typeof content === "object") {
            return [content];
        }
        return [];
    }
    normalizeMessageForStorage(message) {
        const role = message.role;
        if (role !== "assistant" && role !== "tool" && role !== "toolResult") {
            return message;
        }
        if (Array.isArray(message.content)) {
            return message;
        }
        return {
            ...message,
            content: this.normalizeStructuredContent(message.content)
        };
    }
    isProcessed(messageId) {
        return this.processedMessageIds.has(messageId);
    }
    markProcessed(messageId) {
        this.processedMessageIds.add(messageId);
        // Prevent memory leak
        if (this.processedMessageIds.size > 1000) {
            const it = this.processedMessageIds.values();
            const first = it.next().value;
            if (first !== undefined) {
                this.processedMessageIds.delete(first);
            }
        }
    }
    /**
     * 会话里用户提出过多少个问题（配额用，见 `session_quota.ts`）。
     *
     * 存在 session_meta 里而不是每次去数会话文件：500 条提问的会话文件是几十兆，
     * 压在每轮的入口路径上会拖慢每一次提问。
     *
     * 但**存量会话没有这个字段**，直接当 0 会让老会话凭空多出 500 条额度。
     * 所以首次访问时从会话文件回填一次，之后都是 O(1) 自增。
     *
     * 只数 `role === "user"` 的消息：工具结果是 toolResult、注入的上下文是 custom、
     * 定时任务产出是 assistant，都不算用户提问。
     */
    getQuestionCount(channel, sessionId) {
        const meta = this.readSessionMeta(channel, sessionId);
        const stored = meta?.metadata?.questionCount;
        if (typeof stored === "number" && Number.isFinite(stored) && stored >= 0) {
            return stored;
        }
        // 回填：只读会话文件本体，不 merge 隔离存储（那里全是卡片，没有用户提问）。
        let derived = 0;
        try {
            const data = this.readSessionData(this.getFilePath(channel, sessionId));
            for (const msg of data?.messages || []) {
                if (msg?.role === "user")
                    derived += 1;
            }
        }
        catch {
            // 数不出来就当 0：宁可放行，也不能因为一次读失败把用户锁在门外。
            derived = 0;
        }
        this.setQuestionCount(channel, sessionId, derived);
        return derived;
    }
    /** 自增并返回新值（含本次）。 */
    incrementQuestionCount(channel, sessionId) {
        const next = this.getQuestionCount(channel, sessionId) + 1;
        this.setQuestionCount(channel, sessionId, next);
        return next;
    }
    setQuestionCount(channel, sessionId, count) {
        try {
            const meta = this.readSessionMeta(channel, sessionId) || {};
            this.writeSessionMeta(channel, sessionId, {
                ...meta,
                id: meta.id || sessionId,
                metadata: { ...(meta.metadata || {}), questionCount: count },
            });
        }
        catch (e) {
            console.error(`[SessionManager] Failed to persist question count ${channel}:${sessionId}`, e);
        }
    }
    getSession(channel, sessionId) {
        const sessionData = this.getSessionData(channel, sessionId);
        return sessionData ? sessionData.messages : [];
    }
    /**
     * Return only the durable conversation stream used by the model.
     * Unlike getSession(), this intentionally excludes UI-only isolated cards.
     */
    getPrimarySession(channel, sessionId) {
        const sessionData = this.getPrimarySessionData(channel, sessionId);
        return sessionData ? sessionData.messages : [];
    }
    getPrimarySessionData(channel, sessionId) {
        return this.readSessionData(this.getFilePath(channel, sessionId));
    }
    getSessionData(channel, sessionId) {
        const base = this.getPrimarySessionData(channel, sessionId);
        return this.withIsolatedMessages(channel, sessionId, base);
    }
    addIsolatedMessage(channel, sessionId, message) {
        this.ensureDataDir();
        const filePath = this.getIsolatedFilePath(channel, sessionId);
        const history = this.readIsolatedMessages(filePath);
        const normalized = this.markIsolatedMessage(message);
        const merged = this.mergeMessages(history, [normalized]);
        fs.writeFileSync(filePath, JSON.stringify({ messages: merged, updatedAt: Date.now() }, null, 2), "utf-8");
    }
    saveSession(channel, sessionId, messages) {
        const filePath = this.getFilePath(channel, sessionId);
        const normalizedMessages = (messages || []).map(msg => this.normalizeMessageForStorage(msg));
        try {
            this.ensureDataDir();
            // Try to preserve existing metadata if file exists and is an object
            let sessionData = {
                id: sessionId,
                messages: normalizedMessages,
                updatedAt: Date.now()
            };
            if (fs.existsSync(filePath)) {
                try {
                    const existingData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                    if (!Array.isArray(existingData) && existingData.id) {
                        sessionData = {
                            ...existingData,
                            messages: normalizedMessages,
                            updatedAt: Date.now()
                        };
                    }
                }
                catch (e) {
                    // ignore read error, overwrite
                }
            }
            fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2));
        }
        catch (error) {
            console.error(`[SessionManager] Failed to save session ${channel}:${sessionId}`, error);
        }
    }
    addMessage(channel, sessionId, message) {
        const normalizedMessage = this.normalizeMessageForStorage({
            ...message,
            timestamp: message.timestamp || Date.now()
        });
        const filePath = this.getFilePath(channel, sessionId);
        if (fs.existsSync(filePath)) {
            try {
                const content = fs.readFileSync(filePath, "utf-8");
                if (this.shouldAppendAsJsonl(content)) {
                    this.appendJsonlMessage(filePath, normalizedMessage);
                    return;
                }
            }
            catch (e) {
                console.error(`[SessionManager] Failed to detect session file format for ${channel}:${sessionId}`, e);
            }
        }
        // Never merge presentation-only storage back into the primary stream.
        const history = this.getPrimarySession(channel, sessionId);
        history.push(normalizedMessage);
        // Limit history length to last 100 messages
        if (history.length > 100) {
            history.shift();
        }
        this.saveSession(channel, sessionId, history);
    }
    /**
     * Commit one externally executed turn without routing it through PiKernel.
     *
     * Selected Expert is the only current caller. Existing JSON sessions are replaced through a
     * synced temporary file; Pi JSONL receives two consecutive tree nodes in the same atomic
     * replacement. Unknown/corrupt input is copied aside and never interpreted as an empty session.
     */
    appendTurnAtomically(channel, sessionId, user, assistant) {
        this.ensureDataDir();
        const filePath = this.getFilePath(channel, sessionId);
        const normalizedUser = this.normalizeMessageForStorage({
            ...user,
            timestamp: user.timestamp || Date.now(),
        });
        const normalizedAssistant = this.normalizeMessageForStorage({
            ...assistant,
            timestamp: assistant.timestamp || Math.max(Date.now(), (normalizedUser.timestamp || 0) + 1),
        });
        let nextContent;
        if (!fs.existsSync(filePath)) {
            nextContent = JSON.stringify({
                id: sessionId,
                messages: [normalizedUser, normalizedAssistant],
                updatedAt: normalizedAssistant.timestamp || Date.now(),
            }, null, 2);
        }
        else {
            let content;
            try {
                content = fs.readFileSync(filePath, "utf8");
            }
            catch (error) {
                throw new SessionPersistenceError("write_failed", `Unable to read the existing session before committing Expert turn ${channel}:${sessionId}.`, undefined, error);
            }
            if (!content.trim()) {
                const quarantinePath = this.quarantineCorruptSession(filePath, content);
                throw new SessionPersistenceError("corrupt_session", `Refusing to overwrite an empty/corrupt session ${channel}:${sessionId}.`, quarantinePath);
            }
            nextContent = this.buildAtomicTurnContent(filePath, content, normalizedUser, normalizedAssistant, channel, sessionId);
        }
        try {
            this.atomicReplace(filePath, nextContent);
        }
        catch (error) {
            if (error instanceof SessionPersistenceError)
                throw error;
            throw new SessionPersistenceError("write_failed", `Failed to durably commit Expert turn ${channel}:${sessionId}.`, undefined, error);
        }
    }
    buildAtomicTurnContent(filePath, content, user, assistant, channel, sessionId) {
        try {
            const raw = JSON.parse(content);
            if (Array.isArray(raw)) {
                return JSON.stringify([...raw, user, assistant], null, 2);
            }
            if (raw && typeof raw === "object" && Array.isArray(raw.messages)) {
                const object = raw;
                return JSON.stringify({
                    ...object,
                    messages: [...object.messages, user, assistant],
                    updatedAt: assistant.timestamp || Date.now(),
                }, null, 2);
            }
            const quarantinePath = this.quarantineCorruptSession(filePath, content);
            throw new SessionPersistenceError("unsupported_session_format", `Existing session ${channel}:${sessionId} is not a supported JSON session object.`, quarantinePath);
        }
        catch (error) {
            if (error instanceof SessionPersistenceError)
                throw error;
        }
        const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
        const entries = [];
        const ids = new Set();
        let leafId = null;
        try {
            for (const line of lines) {
                const entry = JSON.parse(line.trim());
                if (!entry || typeof entry !== "object" || Array.isArray(entry) || typeof entry.type !== "string") {
                    throw new Error("invalid JSONL entry");
                }
                if (entry.type === "session") {
                    entries.push(entry);
                    continue;
                }
                if (entry.id !== undefined) {
                    if (typeof entry.id !== "string" || !entry.id || ids.has(entry.id)) {
                        throw new Error("invalid or duplicate JSONL id");
                    }
                    ids.add(entry.id);
                }
                if (entry.type === "leaf") {
                    if (entry.targetId !== null && (typeof entry.targetId !== "string" || !entry.targetId)) {
                        throw new Error("invalid JSONL leaf target");
                    }
                    leafId = entry.targetId;
                }
                else if (typeof entry.id === "string") {
                    leafId = entry.id;
                }
                entries.push(entry);
            }
            if (entries.length === 0 || !entries.some((entry) => (entry.type === "session" || entry.type === "message" || entry.type === "custom_message"))) {
                throw new Error("unrecognized JSONL session");
            }
            if (leafId !== null && !ids.has(leafId))
                throw new Error("JSONL leaf target is missing");
        }
        catch (error) {
            const quarantinePath = this.quarantineCorruptSession(filePath, content);
            throw new SessionPersistenceError("corrupt_session", `Existing session ${channel}:${sessionId} is corrupt; Expert result was not committed.`, quarantinePath, error);
        }
        const userId = crypto.randomUUID();
        const assistantId = crypto.randomUUID();
        const userEntry = {
            type: "message",
            id: userId,
            parentId: leafId,
            timestamp: new Date(user.timestamp || Date.now()).toISOString(),
            message: user,
        };
        const assistantEntry = {
            type: "message",
            id: assistantId,
            parentId: userId,
            timestamp: new Date(assistant.timestamp || Date.now()).toISOString(),
            message: assistant,
        };
        const prefix = content.endsWith("\n") ? content : `${content}\n`;
        return `${prefix}${JSON.stringify(userEntry)}\n${JSON.stringify(assistantEntry)}\n`;
    }
    quarantineCorruptSession(filePath, content) {
        const quarantinePath = `${filePath}.corrupt-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.bak`;
        try {
            const descriptor = fs.openSync(quarantinePath, "wx");
            try {
                fs.writeFileSync(descriptor, content, "utf8");
                fs.fsyncSync(descriptor);
            }
            finally {
                fs.closeSync(descriptor);
            }
            return quarantinePath;
        }
        catch (error) {
            console.error(`[SessionManager] Failed to quarantine corrupt session ${filePath}:`, error);
            return undefined;
        }
    }
    atomicReplace(filePath, content) {
        const directory = path.dirname(filePath);
        fs.mkdirSync(directory, { recursive: true });
        const temporary = path.join(directory, `.${path.basename(filePath)}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`);
        let descriptor;
        try {
            descriptor = fs.openSync(temporary, "wx");
            fs.writeFileSync(descriptor, content, "utf8");
            fs.fsyncSync(descriptor);
            fs.closeSync(descriptor);
            descriptor = undefined;
            fs.renameSync(temporary, filePath);
            try {
                const directoryDescriptor = fs.openSync(directory, "r");
                try {
                    fs.fsyncSync(directoryDescriptor);
                }
                finally {
                    fs.closeSync(directoryDescriptor);
                }
            }
            catch {
                // Directory fsync is unavailable on some Windows filesystems; the file itself is synced.
            }
        }
        finally {
            if (descriptor !== undefined) {
                try {
                    fs.closeSync(descriptor);
                }
                catch { /* best effort */ }
            }
            if (fs.existsSync(temporary)) {
                try {
                    fs.unlinkSync(temporary);
                }
                catch { /* best effort */ }
            }
        }
    }
    readSessionData(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                return this.mergeSessionMeta(null, filePath);
            }
            const content = fs.readFileSync(filePath, "utf-8");
            // 先把三个解析器跑完，**再**合并 meta。
            //
            // 这个顺序不是风格问题。此前是逐个解析器 `mergeSessionMeta(parseX(...))`
            // 后取第一个非 null —— 而 `mergeSessionMeta(null, ...)` 在**存在 meta 文件**时
            // 会凭空造一个 `messages: []` 的会话对象返回。于是 JSONL 会话（pi 的原生格式）
            // 走到第一个解析器 `parseAsJsonObject` 返回 null，被 meta 兜成一个"空会话"，
            // 直接 return —— 后面两个 JSONL 解析器永远不执行，整段聊天记录读回来是空的。
            //
            // 以前没炸是因为主会话几乎不写 meta（只有子会话和带 metadata 的才写）。
            // 提问配额要给每个会话存计数，一写 meta 就会踩中，等于全量历史"消失"。
            //
            // meta 只该做两件事：给解析出来的会话补字段，以及在**所有解析器都失败时**
            // 兜一个壳。它没有资格越过解析器。
            const parsed = this.parseAsJsonObject(content, filePath)
                ?? this.parseMixedObjectAndJsonl(content, filePath)
                ?? this.parseAsJsonl(content, filePath);
            if (parsed) {
                return this.mergeSessionMeta(parsed, filePath);
            }
            console.warn(`[SessionManager] Failed to parse session file ${filePath}: unsupported or corrupted format.`);
            return this.mergeSessionMeta(null, filePath);
        }
        catch (e) {
            console.error(`[SessionManager] Error reading session file ${filePath}:`, e);
            return this.mergeSessionMeta(null, filePath);
        }
    }
    shouldAppendAsJsonl(content) {
        const trimmed = content.trim();
        if (!trimmed)
            return false;
        const parsedAsObject = this.parseAsJsonObject(content, "unknown");
        if (parsedAsObject) {
            return false;
        }
        return (trimmed.includes('"type":"session"') ||
            trimmed.includes('"type": "session"') ||
            trimmed.includes('"type":"message"') ||
            trimmed.includes('"type": "message"'));
    }
    /**
     * 追加一条 JSONL 记录到会话文件。
     *
     * ⚠️ 这个文件是 **PiKernel 和 gateway 共用**的：pi 的 SessionManager 把它当成
     * 一棵 append-only 的树读——每条记录靠 `id` / `parentId` 串起来，
     * `buildSessionContext()` 从叶子沿 parentId 往上走，走出来的那条路径才是模型上下文。
     *
     * 此前这里写出的记录**没有 id、没有 parentId**。后果不是"多了一条"，而是整棵树断掉：
     *   · `_buildIndex()` 无脑 `leafId = entry.id` → 叶子指针变成 undefined；
     *   · `buildSessionContext()` 取最后一条当叶子，它没有 parentId → 路径长度 1；
     *   · 上下文塌成一条消息 → 撞上 kernel.ts 的 `loadedCount <= 1` 兜底，
     *     改用线性扫描重灌最近 80 条（线性扫描恰恰**保留**无 id 的记录）。
     * 于是每次重开会话都要整树重建一次，且把历史定时任务产出一并灌回上下文。
     *
     * 补上 id / parentId 后，这类记录成为树上的正常节点；顺带地，历史遗留的无 id
     * 记录会自动掉出 parentId 路径 —— 因为新节点挂在**最近一个有 id 的记录**上。
     */
    appendJsonlMessage(filePath, message) {
        const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "";
        const entry = {
            type: "message",
            id: crypto.randomUUID(),
            parentId: this.lastTreeEntryId(content),
            timestamp: new Date().toISOString(),
            message
        };
        const prefix = content.endsWith("\n") || content.length === 0 ? "" : "\n";
        fs.appendFileSync(filePath, `${prefix}${JSON.stringify(entry)}\n`, "utf-8");
    }
    /**
     * 从后往前找最近一个带 id 的记录，作为新节点的父节点。
     * 找到 session 头部(它不参与树)或找不到任何 id → 返回 null，即新建一个根。
     */
    lastTreeEntryId(content) {
        const lines = content.split(/\r?\n/);
        for (let i = lines.length - 1; i >= 0; i--) {
            const clean = lines[i].trim();
            if (!clean)
                continue;
            try {
                const obj = JSON.parse(clean);
                if (obj?.type === "session")
                    return null;
                if (typeof obj?.id === "string" && obj.id)
                    return obj.id;
            }
            catch {
                continue;
            }
        }
        return null;
    }
    parseAsJsonObject(content, filePath) {
        try {
            const raw = JSON.parse(content);
            let msgs = [];
            if (Array.isArray(raw))
                msgs = raw;
            else if (raw && Array.isArray(raw.messages))
                msgs = raw.messages;
            else
                return null;
            msgs = msgs.map(msg => this.normalizeMessageForStorage(msg));
            return {
                id: raw.id || path.basename(filePath, ".json"),
                messages: msgs,
                updatedAt: raw.updatedAt || (msgs.length > 0 ? msgs[msgs.length - 1].timestamp : 0) || 0,
                type: raw.type,
                parentId: raw.parentId,
                status: raw.status,
                createdAt: raw.createdAt || 0,
                metadata: raw.metadata || {}
            };
        }
        catch {
            return null;
        }
    }
    parseAsJsonl(content, filePath) {
        const lines = content.split(/\r?\n/).filter(l => l.trim());
        const entries = [];
        const messages = [];
        const seen = new Set();
        let id = path.basename(filePath, ".json");
        let updatedAt = 0;
        for (const line of lines) {
            const cleaned = this.normalizePossibleJsonlLine(line);
            if (!cleaned)
                continue;
            try {
                const obj = JSON.parse(cleaned);
                if (obj.type === "session" && obj.id) {
                    id = obj.id;
                    continue;
                }
                entries.push(obj);
            }
            catch { /* ignore line */ }
        }
        let pendingAttachedSkill;
        for (const obj of selectActiveSessionBranch(entries)) {
            if (obj.type === "custom_message" && obj.customType === SESSION_CONTEXT_CUSTOM_TYPE) {
                const reference = obj.details?.attachedSkill;
                pendingAttachedSkill = reference?.id ? {
                    id: String(reference.id),
                    name: typeof reference.name === "string" ? reference.name : undefined,
                    version: typeof reference.version === "string" ? reference.version : undefined,
                } : undefined;
                continue;
            }
            if (obj.type === "message" && obj.message) {
                let msg = this.normalizeMessageForStorage(obj.message);
                if (msg.role === "user" && pendingAttachedSkill) {
                    msg = {
                        ...msg,
                        metadata: {
                            ...(msg.metadata || {}),
                            attachedSkill: pendingAttachedSkill,
                        },
                    };
                }
                // The hidden context entry is expected to sit directly before its
                // user turn. Do not let malformed/legacy branches leak a selection
                // onto a later, unrelated user message.
                pendingAttachedSkill = undefined;
                const dedupeKey = msg.id || `${msg.role}:${extractText(msg.content)}:${msg.timestamp || ""}`;
                if (!seen.has(dedupeKey)) {
                    seen.add(dedupeKey);
                    messages.push(msg);
                }
                if (obj.timestamp) {
                    const ts = new Date(obj.timestamp).getTime();
                    if (!Number.isNaN(ts) && ts > updatedAt)
                        updatedAt = ts;
                }
            }
        }
        if (messages.length === 0 && lines.length === 0) {
            return null;
        }
        return {
            id,
            messages,
            updatedAt: updatedAt || (messages.length > 0 ? messages[messages.length - 1].timestamp || 0 : 0),
            type: "main",
            status: "idle",
            createdAt: 0,
            metadata: {}
        };
    }
    parseMixedObjectAndJsonl(content, filePath) {
        const marker = content.match(/\{\s*"type"\s*:\s*"message"/);
        if (!marker || marker.index === undefined || marker.index <= 0) {
            return null;
        }
        const prefix = content.slice(0, marker.index).trim();
        const suffix = content.slice(marker.index);
        const parsedPrefix = this.parseAsJsonObject(prefix, filePath);
        // A regular JSONL session may contain session/custom entries before its
        // first message. That is not the legacy "JSON object + JSONL" format.
        // Requiring a valid object prefix prevents those hidden context entries
        // from being discarded by the mixed-format fallback.
        if (!parsedPrefix) {
            return null;
        }
        const parsedSuffix = this.parseAsJsonl(suffix, filePath);
        if (!parsedSuffix) {
            return null;
        }
        const merged = [];
        const seen = new Set();
        let updatedAt = 0;
        const pushMessage = (msg) => {
            const dedupeKey = msg.id || `${msg.role}:${extractText(msg.content)}:${msg.timestamp || ""}`;
            if (seen.has(dedupeKey))
                return;
            seen.add(dedupeKey);
            merged.push(msg);
            if (msg.timestamp && msg.timestamp > updatedAt) {
                updatedAt = msg.timestamp;
            }
        };
        for (const msg of parsedPrefix?.messages || [])
            pushMessage(msg);
        for (const msg of parsedSuffix?.messages || [])
            pushMessage(msg);
        return {
            id: parsedPrefix?.id || parsedSuffix?.id || path.basename(filePath, ".json"),
            messages: merged,
            updatedAt: Math.max(updatedAt, parsedPrefix?.updatedAt || 0, parsedSuffix?.updatedAt || 0),
            type: parsedPrefix?.type || parsedSuffix?.type || "main",
            parentId: parsedPrefix?.parentId || parsedSuffix?.parentId,
            status: parsedPrefix?.status || parsedSuffix?.status || "idle",
            createdAt: parsedPrefix?.createdAt || parsedSuffix?.createdAt || 0,
            metadata: parsedPrefix?.metadata || parsedSuffix?.metadata || {}
        };
    }
    normalizePossibleJsonlLine(line) {
        const trimmed = line.trim();
        if (!trimmed)
            return null;
        if (trimmed.startsWith("{"))
            return trimmed;
        const idx = trimmed.indexOf("{");
        if (idx === -1)
            return null;
        return trimmed.slice(idx);
    }
    readIsolatedMessages(filePath) {
        try {
            if (!fs.existsSync(filePath))
                return [];
            const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
            if (Array.isArray(raw))
                return raw.map(msg => this.markIsolatedMessage(msg));
            if (raw && Array.isArray(raw.messages))
                return raw.messages.map(msg => this.markIsolatedMessage(msg));
            return [];
        }
        catch {
            return [];
        }
    }
    markIsolatedMessage(message) {
        return this.normalizeMessageForStorage({
            ...message,
            metadata: {
                ...(message.metadata || {}),
                isolated: true,
            },
            timestamp: message.timestamp || Date.now(),
        });
    }
    withIsolatedMessages(channel, sessionId, sessionData) {
        const isolatedFilePath = this.getIsolatedFilePath(channel, sessionId);
        const isolatedMessages = this.readIsolatedMessages(isolatedFilePath);
        if (!sessionData && isolatedMessages.length === 0) {
            return null;
        }
        if (!sessionData) {
            const updatedAt = isolatedMessages.length > 0 ? (isolatedMessages[isolatedMessages.length - 1].timestamp || Date.now()) : Date.now();
            return {
                id: sessionId,
                messages: isolatedMessages,
                updatedAt,
                type: "main",
                status: "idle",
                createdAt: 0,
                metadata: {}
            };
        }
        if (isolatedMessages.length === 0) {
            return sessionData;
        }
        const mergedMessages = this.mergeMessages(sessionData.messages, isolatedMessages);
        const isolatedUpdatedAt = isolatedMessages.length > 0 ? (isolatedMessages[isolatedMessages.length - 1].timestamp || 0) : 0;
        return {
            ...sessionData,
            messages: mergedMessages,
            updatedAt: Math.max(sessionData.updatedAt || 0, isolatedUpdatedAt)
        };
    }
    mergeMessages(primary, secondary) {
        const merged = [];
        const seen = new Set();
        const push = (msg) => {
            const normalized = this.normalizeMessageForStorage({
                ...msg,
                timestamp: msg.timestamp || Date.now()
            });
            const key = normalized.id || `${normalized.role}:${extractText(normalized.content)}:${normalized.timestamp || ""}`;
            if (seen.has(key))
                return;
            seen.add(key);
            merged.push(normalized);
        };
        for (const msg of primary || [])
            push(msg);
        for (const msg of secondary || [])
            push(msg);
        merged.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        return merged;
    }
    async createSubSession(parentSessionId, metadata = {}, timeoutMs) {
        // Use random suffix to ensure uniqueness even if called rapidly
        const uniqueSuffix = Math.random().toString(36).substring(2, 9);
        const subSessionId = `sub_${parentSessionId}_${Date.now()}_${uniqueSuffix}`;
        const newSession = {
            id: subSessionId,
            type: 'sub',
            parentId: parentSessionId,
            status: 'idle',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            metadata: { ...metadata },
            timeoutMs: timeoutMs,
            depth: 1 // Hardcoded to 1 as we only allow spawning from main (depth 0) currently
        };
        // We store sub-sessions under 'system' channel for now, as they are internal
        const filePath = this.getFilePath('system', subSessionId);
        this.saveSessionToFile(filePath, newSession);
        this.writeSessionMeta('system', subSessionId, newSession);
        return newSession;
    }
    saveSessionToFile(filePath, data) {
        try {
            const fileInfo = this.parseFileInfoFromPath(filePath);
            if (fileInfo) {
                const meta = this.readSessionMeta(fileInfo.channel, fileInfo.sessionId);
                if (meta) {
                    data = {
                        ...data,
                        type: data.type === "main" && meta.type ? meta.type : (data.type || meta.type),
                        parentId: data.parentId || meta.parentId,
                        metadata: { ...(meta.metadata || {}), ...(data.metadata || {}) },
                        timeoutMs: data.timeoutMs ?? meta.timeoutMs,
                        depth: data.depth ?? meta.depth,
                    };
                }
                if (data.type === "sub" || data.parentId || Object.keys(data.metadata || {}).length > 0) {
                    this.writeSessionMeta(fileInfo.channel, fileInfo.sessionId, data);
                }
            }
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        }
        catch (e) {
            console.error(`[SessionManager] Failed to save session file ${filePath}`, e);
        }
    }
    async updateSessionStatus(sessionId, status) {
        let channel = 'system';
        let id = sessionId;
        // Try to parse composite ID
        if (sessionId.includes('__')) {
            const parts = sessionId.split('__');
            channel = parts[0];
            id = parts.slice(1).join('__');
        }
        else if (!sessionId.startsWith('sub_')) {
            // If it's not a sub-session and has no prefix, it might be ambiguous.
            // But usually Gateway handles prefixing.
            // If passed raw ID here, we might fail to find it if it's not system.
            // Let's assume system if sub_, else we need to know channel.
            // But for now, sub-sessions are our main concern for status updates.
        }
        const filePath = this.getFilePath(channel, id);
        // We use synchronous read here as SessionManager is currently sync-based for file I/O (mostly)
        // But the method is async to support future DB
        const session = this.readSessionData(filePath);
        if (session) {
            session.status = status;
            session.updatedAt = Date.now();
            this.saveSessionToFile(filePath, session);
        }
        else {
            console.warn(`[SessionManager] updateSessionStatus: Session not found: ${sessionId} (path: ${filePath})`);
        }
    }
    getSubSessions(parentSessionId) {
        const subSessions = [];
        try {
            if (!fs.existsSync(DATA_DIR))
                return [];
            const files = fs.readdirSync(DATA_DIR);
            // Sub-sessions are stored under 'system' channel, so filename starts with 'system__sub_'
            const prefix = "system__sub_";
            for (const file of files) {
                if (file.startsWith(prefix) && file.endsWith(".json")) {
                    const filePath = path.join(DATA_DIR, file);
                    const session = this.readSessionData(filePath);
                    if (session) {
                        // Fallback: If parentId is missing (e.g. wiped by PiKernel), extract from filename
                        let effectiveParentId = session.parentId;
                        if (!effectiveParentId) {
                            // Filename format: system__sub_${parentSessionId}_${timestamp}_${random}.json
                            // Regex to match: system__sub_(.+)_(\d+)_([a-z0-9]+)\.json
                            // Note: We need to be careful with underscores in parentSessionId.
                            // We match from the end: _timestamp_random.json
                            const match = file.match(/^system__sub_(.+)_(\d+)_[a-z0-9]+\.json$/);
                            if (match) {
                                effectiveParentId = match[1];
                            }
                        }
                        // console.log(`[SessionManager] Checking sub-session ${session.id}, parentId: ${effectiveParentId}, expected: ${parentSessionId}`);
                        if (effectiveParentId === parentSessionId) {
                            subSessions.push(session);
                        }
                    }
                }
            }
        }
        catch (e) {
            console.error("[SessionManager] Failed to get sub-sessions", e);
        }
        return subSessions.sort((a, b) => b.createdAt - a.createdAt);
    }
    getLatestSessionId(channel) {
        try {
            const files = fs.readdirSync(DATA_DIR);
            let latestTime = 0;
            let latestSessionId = null;
            const prefix = `${channel.replace(/[^a-zA-Z0-9_-]/g, '_')}__`;
            for (const file of files) {
                if (file.startsWith(prefix) && file.endsWith(".json")) {
                    const extractedId = file.slice(prefix.length, -5);
                    if (this.isReservedSystemSessionId(extractedId)) {
                        continue;
                    }
                    const filePath = path.join(DATA_DIR, file);
                    try {
                        const stats = fs.statSync(filePath);
                        if (stats.mtimeMs > latestTime) {
                            latestTime = stats.mtimeMs;
                            // Extract sessionId from filename: channel__sessionId.json
                            latestSessionId = extractedId;
                        }
                    }
                    catch (e) {
                        // ignore
                    }
                }
            }
            return latestSessionId;
        }
        catch (e) {
            console.error("[SessionManager] Failed to list sessions", e);
            return null;
        }
    }
    getSessionsList(channel) {
        const list = [];
        try {
            if (!fs.existsSync(DATA_DIR)) {
                return [];
            }
            const files = fs.readdirSync(DATA_DIR);
            const prefix = `${channel.replace(/[^a-zA-Z0-9_-]/g, '_')}__`;
            for (const file of files) {
                if (file.startsWith(prefix) && file.endsWith(".json")) {
                    try {
                        const filePath = path.join(DATA_DIR, file);
                        const id = file.slice(prefix.length, -5);
                        const sessionData = this.getSessionData(channel, id);
                        if (sessionData) {
                            // Filter out sub-sessions from the main list
                            // Check both explicit type and filename convention (for legacy data)
                            if (sessionData.type === 'sub' || file.includes('__sub_')) {
                                continue;
                            }
                            const { messages, updatedAt } = sessionData;
                            if (this.isReservedSystemSessionId(id)) {
                                continue;
                            }
                            const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
                            const firstMsg = messages.find(m => m.role === 'user');
                            const contentText = firstMsg ? titleTextFromContent(firstMsg.content) : '';
                            const lastMsgText = lastMsg ? visibleTextFromContent(lastMsg.content) : '';
                            const title = contentText ? (contentText.length > 30 ? contentText.slice(0, 30) + '...' : contentText) : `Chat ${id.slice(0, 4)}`;
                            list.push({
                                id,
                                title,
                                lastMessage: lastMsgText,
                                updatedAt: updatedAt || 0
                            });
                        }
                    }
                    catch (e) {
                        console.error(`[SessionManager] Error reading file ${file}`, e);
                    }
                }
            }
        }
        catch (e) {
            console.error("[SessionManager] Failed to get session list", e);
        }
        return list.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    isReservedSystemSessionId(sessionId) {
        if (!sessionId)
            return false;
        return this.reservedSystemSessionPattern.test(sessionId);
    }
    getAllSessions() {
        const list = [];
        try {
            if (!fs.existsSync(DATA_DIR)) {
                return [];
            }
            const files = fs.readdirSync(DATA_DIR);
            for (const file of files) {
                if (file.endsWith(".json")) {
                    try {
                        const fileInfo = this.parseSessionFileName(file);
                        const sessionData = fileInfo ? this.getSessionData(fileInfo.channel, fileInfo.sessionId) : this.readSessionData(path.join(DATA_DIR, file));
                        if (sessionData) {
                            // Filter out sub-sessions from the main list
                            // Check both explicit type and filename convention (for legacy data)
                            if (sessionData.type === 'sub' || file.includes('__sub_')) {
                                continue;
                            }
                            const { messages, updatedAt } = sessionData;
                            const id = file.slice(0, -5);
                            const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
                            const firstMsg = messages.find(m => m.role === 'user');
                            const contentText = firstMsg ? titleTextFromContent(firstMsg.content) : '';
                            const lastMsgText = lastMsg ? visibleTextFromContent(lastMsg.content) : '';
                            const title = contentText ? (contentText.length > 30 ? contentText.slice(0, 30) + '...' : contentText) : `Chat ${id.slice(0, 8)}`;
                            list.push({
                                id,
                                title,
                                lastMessage: lastMsgText,
                                updatedAt: updatedAt || 0
                            });
                        }
                    }
                    catch (e) {
                        console.error(`[SessionManager] Error reading file ${file}`, e);
                    }
                }
            }
        }
        catch (e) {
            console.error("[SessionManager] Failed to get all sessions", e);
        }
        return list.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    getSessionByCompositeId(compositeId) {
        const parts = compositeId.split('__');
        if (parts.length >= 2) {
            const channel = parts[0];
            const sessionId = parts.slice(1).join('__');
            return this.getSessionData(channel, sessionId);
        }
        return null;
    }
    findSessionById(partialId) {
        try {
            if (!fs.existsSync(DATA_DIR))
                return null;
            const files = fs.readdirSync(DATA_DIR);
            // 1. Try exact match on filename (with known prefixes)
            // 2. Try partial match
            for (const file of files) {
                if (file.endsWith('.json')) {
                    // Check if filename contains the ID
                    // e.g. websocket__uuid.json contains uuid
                    if (file.includes(partialId)) {
                        const fileInfo = this.parseSessionFileName(file);
                        const session = fileInfo ? this.getSessionData(fileInfo.channel, fileInfo.sessionId) : this.readSessionData(path.join(DATA_DIR, file));
                        if (session) {
                            return session;
                        }
                    }
                }
            }
        }
        catch (e) {
            console.error(`[SessionManager] Failed to find session by partial ID ${partialId}`, e);
        }
        return null;
    }
    deleteSessionByCompositeId(compositeId) {
        const parts = compositeId.split('__');
        if (parts.length >= 2) {
            const channel = parts[0];
            const sessionId = parts.slice(1).join('__');
            this.deleteSession(channel, sessionId);
        }
    }
    deleteSession(channel, sessionId) {
        const filePath = this.getFilePath(channel, sessionId);
        const isolatedPath = this.getIsolatedFilePath(channel, sessionId);
        const metaPath = this.getMetaFilePath(channel, sessionId);
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            if (fs.existsSync(isolatedPath)) {
                fs.unlinkSync(isolatedPath);
            }
            if (fs.existsSync(metaPath)) {
                fs.unlinkSync(metaPath);
            }
            // Cascading delete: Delete associated sub-sessions
            if (fs.existsSync(DATA_DIR)) {
                const files = fs.readdirSync(DATA_DIR);
                // Sub-session filename format: system__sub_${parentSessionId}_${timestamp}_${random}.json
                // parentSessionId could be the raw sessionId or channel__sessionId depending on how it was created
                const subSessionPrefix1 = `system__sub_${sessionId}_`;
                const subSessionPrefix2 = `system__sub_${channel}__${sessionId}_`;
                for (const file of files) {
                    if (file.startsWith(subSessionPrefix1) || file.startsWith(subSessionPrefix2)) {
                        try {
                            const subPath = path.join(DATA_DIR, file);
                            if (fs.existsSync(subPath)) {
                                fs.unlinkSync(subPath);
                                console.log(`[SessionManager] Cascading delete: Deleted sub-session file: ${file}`);
                            }
                            const isolatedSubPath = path.join(ISOLATED_DIR, file);
                            if (fs.existsSync(isolatedSubPath)) {
                                fs.unlinkSync(isolatedSubPath);
                            }
                            const subFileInfo = this.parseSessionFileName(file);
                            if (subFileInfo) {
                                const subMetaPath = this.getMetaFilePath(subFileInfo.channel, subFileInfo.sessionId);
                                if (fs.existsSync(subMetaPath)) {
                                    fs.unlinkSync(subMetaPath);
                                }
                            }
                        }
                        catch (e) {
                            console.error(`[SessionManager] Failed to delete sub-session ${file}`, e);
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error(`[SessionManager] Failed to delete session ${channel}:${sessionId}`, error);
        }
    }
    parseSessionFileName(file) {
        if (!file.endsWith(".json"))
            return null;
        const basename = file.slice(0, -5);
        const idx = basename.indexOf("__");
        if (idx === -1)
            return null;
        return {
            channel: basename.slice(0, idx),
            sessionId: basename.slice(idx + 2)
        };
    }
}
