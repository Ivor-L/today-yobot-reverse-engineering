import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
/**
 * 持久化数据不可安全读取或写入时抛出的显式错误。
 *
 * 尤其是读取损坏文件时，调用方必须看到失败；绝不能把它当成空会话继续写，
 * 否则一次普通对话就可能覆盖客户的历史上下文。
 */
export class AgenticContextStoreError extends Error {
    diagnostic;
    constructor(diagnostic) {
        super(diagnostic.message);
        this.diagnostic = diagnostic;
        this.name = "AgenticContextStoreError";
    }
}
const DEFAULT_MAX_STORED_MESSAGES = 500;
const MAX_RESET_BLOCKED_MESSAGE_IDS = 1_000;
export const AGENTIC_CONTEXT_DEFAULT_MAX_TURNS = 30;
export const AGENTIC_CONTEXT_DEFAULT_MAX_TOKENS = 12_000;
const LEGACY_DEDUP_WINDOW_MS = 5 * 60 * 1000;
function cleanKeyPart(value) {
    return String(value || "").trim();
}
function normalizeTimestamp(value, fallback) {
    if (!Number.isFinite(value) || Number(value) <= 0)
        return fallback;
    const n = Number(value);
    return n < 10_000_000_000 ? Math.round(n * 1000) : Math.round(n);
}
function normalizeContent(content) {
    return String(content || "").replace(/\s+/g, " ").trim();
}
function fallbackMessageId(role, content) {
    return "h:" + crypto
        .createHash("sha256")
        .update(role + "\0" + normalizeContent(content))
        .digest("hex");
}
function messageId(message) {
    const explicit = String(message.id || "").trim();
    return explicit ? `x:${explicit}` : fallbackMessageId(message.role, message.content);
}
function isProvisionalId(id) {
    // h: 是无上游 ID 时的内容摘要；x:run: 是 provider 在发出回复时生成的本地 ID。
    // 上游下一轮通常会带回它自己的稳定 fingerprint，需要把两者认作同一条消息。
    return id.startsWith("h:") || id.startsWith("x:run:");
}
function isLegacyOrProvisionalId(id) {
    return isProvisionalId(id)
        || id.startsWith("x:fingerprint:")
        // 首版 APP 直接把 32 位 RPA fingerprint 当 id，保留迁移兼容。
        || /^x:[a-f0-9]{32}$/i.test(id);
}
function isStableWechatId(id) {
    return id.startsWith("x:wechat:");
}
function sameMessageContent(a, b) {
    return a.role === b.role
        && normalizeContent(a.content) === normalizeContent(b.content);
}
function attachmentMarkerKind(content) {
    const normalized = String(content || "").trim();
    if (/^\[已发送图片\]\s+.+$/u.test(normalized))
        return "image";
    if (/^\[已发送文件\]\s+.+$/u.test(normalized))
        return "file";
    return null;
}
function hasInboundDocumentContext(content) {
    return String(content || "").includes("<yoko-rpa-document-context ");
}
function reconciliationContent(content) {
    const kind = attachmentMarkerKind(content);
    if (kind === "image")
        return "[图片]";
    if (kind === "file")
        return "[文件]";
    return normalizeContent(content);
}
function sameReconciledContent(a, b) {
    return a.role === b.role
        && reconciliationContent(a.content) === reconciliationContent(b.content);
}
/**
 * 首版 RPA fingerprint 把“前置消息窗口”算进摘要，同一微信气泡重扫后会换 ID。
 * 仅对 legacy/provisional ID 做短时间精确文本折叠；两个稳定 wechat ID 即使同文
 * 也保留，避免吞掉用户真实连续发送的“好的”“收到”等消息。
 */
function compareStoredMessages(a, b) {
    const timestampDelta = a.timestamp - b.timestamp;
    if (Math.abs(timestampDelta) <= 1_000) {
        return a.seq - b.seq || timestampDelta;
    }
    return timestampDelta || a.seq - b.seq;
}
function compactLegacyDuplicates(messages) {
    const sorted = [...messages].sort(compareStoredMessages);
    const out = [];
    for (const message of sorted) {
        const duplicate = [...out].reverse().find((candidate) => sameMessageContent(candidate, message)
            && Math.abs(candidate.timestamp - message.timestamp) <= LEGACY_DEDUP_WINDOW_MS
            && (isLegacyOrProvisionalId(candidate.id) || isLegacyOrProvisionalId(message.id)));
        if (!duplicate) {
            out.push({ ...message });
            continue;
        }
        // 稳定微信 ID 优先接管；时间取较晚者，避免 RPA 分钟级时间把本地精确时间拉回去。
        if (isStableWechatId(message.id) || !isStableWechatId(duplicate.id)) {
            duplicate.id = message.id;
        }
        duplicate.content = message.content;
        duplicate.timestamp = Math.max(duplicate.timestamp, message.timestamp);
        duplicate.seq = Math.min(duplicate.seq, message.seq);
    }
    return out.sort(compareStoredMessages);
}
function estimateTokens(content) {
    // 不引入 tokenizer 依赖：中文等非 ASCII 约 1 字/token，英文约 4 字符/token。
    const nonAscii = (content.match(/[^\x00-\x7F]/g) || []).length;
    const ascii = content.length - nonAscii;
    return Math.max(1, nonAscii + Math.ceil(ascii / 4));
}
function sameConversation(a, b) {
    return a.source === b.source
        && a.scopeId === b.scopeId
        && a.profileId === b.profileId
        && a.conversationId === b.conversationId;
}
function mergeAdjacentRoles(messages) {
    const out = [];
    for (const message of messages) {
        const previous = out[out.length - 1];
        if (previous?.role === message.role) {
            previous.content = [previous.content, message.content].filter(Boolean).join("\n");
            previous.timestamp = Math.max(previous.timestamp, message.timestamp);
            continue;
        }
        out.push({ ...message });
    }
    return out;
}
/**
 * 子 Agent 专属的轻量会话存储。
 *
 * 它不复用主 Agent 的 SessionManager、ledger 或 memory。磁盘只保存规范化的
 * user/assistant 消息；kernel 仍然使用每轮唯一的 runSessionId。
 */
export class AgenticContextStore {
    baseDir;
    maxStoredMessages;
    onDiagnostic;
    constructor(baseDir, options = {}) {
        this.baseDir = baseDir
            ?? path.join(process.env.USER_DATA_PATH || process.cwd(), "data", "agentic_contexts");
        this.maxStoredMessages = options.maxStoredMessages ?? DEFAULT_MAX_STORED_MESSAGES;
        this.onDiagnostic = options.onDiagnostic;
    }
    normalizedKey(key) {
        return {
            source: cleanKeyPart(key.source) || "agentic",
            scopeId: cleanKeyPart(key.scopeId) || "default",
            profileId: cleanKeyPart(key.profileId) || "default",
            conversationId: cleanKeyPart(key.conversationId) || "default",
        };
    }
    filePath(key) {
        const normalized = this.normalizedKey(key);
        const digest = crypto
            .createHash("sha256")
            .update(JSON.stringify(normalized))
            .digest("hex");
        return path.join(this.baseDir, `${digest}.json`);
    }
    empty(key) {
        return { version: 1, key: this.normalizedKey(key), nextSeq: 1, messages: [] };
    }
    storeError(code, filePath, message) {
        const diagnostic = {
            code,
            filePath,
            message,
            observedAt: Date.now(),
        };
        console.error(`[AgenticContext] ${code}: ${message} (${filePath})`);
        try {
            this.onDiagnostic?.(diagnostic);
        }
        catch (error) {
            console.error("[AgenticContext] Diagnostic callback failed:", error);
        }
        return new AgenticContextStoreError(diagnostic);
    }
    parseStoredFile(file, expectedKey) {
        let raw;
        try {
            raw = fs.readFileSync(file, "utf8");
        }
        catch (error) {
            throw this.storeError("read_failed", file, `无法读取子 Agent 上下文文件：${error instanceof Error ? error.message : String(error)}`);
        }
        let parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch (error) {
            throw this.storeError("invalid_json", file, `子 Agent 上下文文件不是有效 JSON，原文件已保留且不会被覆盖：${error instanceof Error ? error.message : String(error)}`);
        }
        if (parsed.version !== 1) {
            throw this.storeError("unsupported_version", file, `不支持的子 Agent 上下文版本 ${String(parsed.version)}，原文件已保留且不会被覆盖。`);
        }
        if (!parsed.key
            || typeof parsed.key.source !== "string"
            || typeof parsed.key.scopeId !== "string"
            || typeof parsed.key.profileId !== "string"
            || typeof parsed.key.conversationId !== "string"
            || !Array.isArray(parsed.messages)) {
            throw this.storeError("invalid_shape", file, "子 Agent 上下文结构不完整，原文件已保留且不会被覆盖。");
        }
        const normalizedStoredKey = this.normalizedKey(parsed.key);
        if (expectedKey && !sameConversation(normalizedStoredKey, this.normalizedKey(expectedKey))) {
            throw this.storeError("key_mismatch", file, "子 Agent 上下文 key 与目标会话不匹配，原文件已保留且不会被覆盖。");
        }
        const messages = parsed.messages.map((message, index) => {
            if (!message
                || (message.role !== "user" && message.role !== "assistant")
                || typeof message.content !== "string"
                || typeof message.id !== "string") {
                throw this.storeError("invalid_shape", file, `子 Agent 上下文第 ${index + 1} 条消息结构无效，原文件已保留且不会被覆盖。`);
            }
            return {
                id: message.id,
                role: message.role,
                content: message.content,
                timestamp: Number.isFinite(message.timestamp) ? Number(message.timestamp) : index + 1,
                seq: Number.isFinite(message.seq) ? Number(message.seq) : index + 1,
            };
        });
        const compacted = compactLegacyDuplicates(messages);
        const maxSeq = compacted.reduce((max, message) => Math.max(max, message.seq || 0), 0);
        const rawBoundary = parsed.resetBoundary;
        const resetBoundary = rawBoundary
            && Number.isFinite(rawBoundary.at)
            && Array.isArray(rawBoundary.blockedMessageIds)
            ? {
                at: Number(rawBoundary.at),
                blockedMessageIds: rawBoundary.blockedMessageIds
                    .filter((id) => typeof id === "string" && id.length > 0)
                    .slice(-MAX_RESET_BLOCKED_MESSAGE_IDS),
            }
            : undefined;
        return {
            version: 1,
            key: normalizedStoredKey,
            nextSeq: Math.max(Number(parsed.nextSeq) || 1, maxSeq + 1),
            messages: compacted,
            resetBoundary,
        };
    }
    readFile(key) {
        const normalized = this.normalizedKey(key);
        const file = this.filePath(normalized);
        if (!fs.existsSync(file))
            return this.empty(normalized);
        return this.parseStoredFile(file, normalized);
    }
    writeFile(key, conversation) {
        fs.mkdirSync(this.baseDir, { recursive: true });
        const target = this.filePath(key);
        const temporary = path.join(this.baseDir, `.${path.basename(target)}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`);
        let descriptor;
        try {
            descriptor = fs.openSync(temporary, "wx");
            fs.writeFileSync(descriptor, JSON.stringify(conversation, null, 2), "utf8");
            fs.fsyncSync(descriptor);
            fs.closeSync(descriptor);
            descriptor = undefined;
            fs.renameSync(temporary, target);
        }
        catch (error) {
            if (descriptor !== undefined) {
                try {
                    fs.closeSync(descriptor);
                }
                catch { /* best effort */ }
            }
            try {
                if (fs.existsSync(temporary))
                    fs.unlinkSync(temporary);
            }
            catch { /* best effort */ }
            throw this.storeError("write_failed", target, `无法持久化子 Agent 上下文：${error instanceof Error ? error.message : String(error)}`);
        }
    }
    upsert(key, incoming) {
        const conversation = this.readFile(key);
        const byId = new Map(conversation.messages.map((message) => [message.id, message]));
        const blockedMessageIds = new Set(conversation.resetBoundary?.blockedMessageIds || []);
        const now = Date.now();
        let discardTurn = false;
        incoming.forEach((message, index) => {
            const content = String(message.content || "").trim();
            if (!content)
                return;
            const id = messageId(message);
            const incomingTimestamp = normalizeTimestamp(message.timestamp, now + index);
            const blockedByReset = Boolean(conversation.resetBoundary
                && (blockedMessageIds.has(id)
                    || (Number.isFinite(message.timestamp) && incomingTimestamp <= conversation.resetBoundary.at)));
            // recordTurn 和 RPA 同步都按 user 开始一个轮次。若该 user 属于清空前，
            // 与它成对、但稍后才生成的 assistant 也必须一起丢弃，避免并发回复写回。
            if (message.role === "user")
                discardTurn = blockedByReset;
            else if (discardTurn)
                return;
            // 清空只作用于智能体侧，RPA 自己的聊天记录仍会继续上送。拦住清空前的
            // 时间戳和已知消息 ID，避免旧上下文在下一轮被重新灌回。
            if (blockedByReset)
                return;
            const existing = byId.get(id);
            if (existing) {
                // 保留首次出现的时序，避免每轮同步同一屏历史时把旧消息不断推到窗口末尾。
                // 本地附件标记比微信回读的泛化占位符信息更完整，应保留真实路径。
                // 同理，provider 已解析的入站文档正文比 RPA 下轮回读的“[文件] 文件名”更完整；
                // 同一稳定消息 ID 回灌原始占位符时不能覆盖它，否则追问会丢失文件上下文。
                const preserveRicherLocalContent = Boolean(attachmentMarkerKind(existing.content)
                    && reconciliationContent(content) === reconciliationContent(existing.content)) || (hasInboundDocumentContext(existing.content) && !hasInboundDocumentContext(content));
                if (!preserveRicherLocalContent) {
                    existing.content = content;
                }
                return;
            }
            const provisional = conversation.messages.find((candidate) => (isLegacyOrProvisionalId(candidate.id)
                // One-to-one upgrade only when an observed minute and content
                // agree. Never globally fold same-text occurrence UUIDs.
                || ((key.source === "rpa" || key.source === "wechat-rpa")
                    && id.startsWith("x:rpa-message-v2:")
                    && candidate.id.startsWith("x:wechat:")
                    && Number.isFinite(message.timestamp)
                    && Math.floor(candidate.timestamp / 60_000) === Math.floor(incomingTimestamp / 60_000)))
                && sameReconciledContent(candidate, { role: message.role, content })
                && Math.abs(candidate.timestamp - incomingTimestamp) <= LEGACY_DEDUP_WINDOW_MS);
            if (!isLegacyOrProvisionalId(id) && provisional) {
                // 用上游稳定 ID 接管本地临时记录，避免“刚发送的回复”在下一轮被
                // RPA 历史再次同步后出现两遍。两个都来自上游且 ID 不同的同文消息
                // 仍会保留，代表用户/助手确实重复发送。
                byId.delete(provisional.id);
                provisional.id = id;
                if (!attachmentMarkerKind(provisional.content))
                    provisional.content = content;
                provisional.timestamp = Math.max(provisional.timestamp, incomingTimestamp);
                byId.set(id, provisional);
                return;
            }
            const stored = {
                id,
                role: message.role,
                content,
                timestamp: incomingTimestamp,
                seq: conversation.nextSeq++,
            };
            conversation.messages.push(stored);
            byId.set(id, stored);
        });
        conversation.messages = compactLegacyDuplicates(conversation.messages);
        if (conversation.messages.length > this.maxStoredMessages) {
            conversation.messages = conversation.messages.slice(-this.maxStoredMessages);
        }
        this.writeFile(key, conversation);
        return conversation.messages.map((message) => ({ ...message }));
    }
    read(key) {
        return this.readFile(key).messages
            .sort(compareStoredMessages)
            .map((message) => ({ ...message }));
    }
    /**
     * 只读完整性扫描，供升级前检查、诊断页和迁移验收使用。
     * 不修复、不移动、更不会重写任何客户文件。
     */
    integrityReport() {
        const scannedAt = Date.now();
        let files = [];
        try {
            if (fs.existsSync(this.baseDir)) {
                files = fs.readdirSync(this.baseDir).filter((file) => file.endsWith(".json"));
            }
        }
        catch (error) {
            const diagnostic = this.storeError("read_failed", this.baseDir, `无法扫描子 Agent 上下文目录：${error instanceof Error ? error.message : String(error)}`).diagnostic;
            return { scannedAt, totalFiles: 0, validFiles: 0, invalidFiles: 1, issues: [diagnostic] };
        }
        const issues = [];
        let validFiles = 0;
        for (const name of files) {
            const file = path.join(this.baseDir, name);
            try {
                this.parseStoredFile(file);
                validFiles++;
            }
            catch (error) {
                if (error instanceof AgenticContextStoreError) {
                    issues.push(error.diagnostic);
                }
                else {
                    issues.push({
                        code: "read_failed",
                        filePath: file,
                        message: error instanceof Error ? error.message : String(error),
                        observedAt: Date.now(),
                    });
                }
            }
        }
        return {
            scannedAt,
            totalFiles: files.length,
            validFiles,
            invalidFiles: issues.length,
            issues,
        };
    }
    /**
     * 枚举已落盘的会话。
     *
     * 文件名是 key 的 sha256，肉眼认不出是谁，所以必须把 key、消息量、时间跨度和一段
     * 摘要一起带出来——用户是靠"最近一条说了什么"来指认"就是这个客户"的。
     * 没有它，清空功能就只能让用户去手删一堆 64 位十六进制文件名。
     */
    list(filter) {
        let files = [];
        try {
            if (!fs.existsSync(this.baseDir))
                return [];
            files = fs.readdirSync(this.baseDir).filter((f) => f.endsWith(".json"));
        }
        catch {
            return [];
        }
        const out = [];
        for (const file of files) {
            try {
                const parsed = this.parseStoredFile(path.join(this.baseDir, file));
                if (filter?.source && parsed.key.source !== filter.source)
                    continue;
                if (filter?.profileId && parsed.key.profileId !== filter.profileId)
                    continue;
                const messages = parsed.messages.sort(compareStoredMessages);
                // 清空屏障需要留在磁盘上防止 RPA 回灌，但它不是一段可注入的上下文。
                if (messages.length === 0)
                    continue;
                const last = messages[messages.length - 1];
                out.push({
                    key: parsed.key,
                    messageCount: messages.length,
                    firstAt: messages[0]?.timestamp,
                    lastAt: last?.timestamp,
                    preview: last ? `${last.role === "user" ? "客户" : "AI"}：${normalizeContent(last.content).slice(0, 40)}` : "",
                });
            }
            catch { /* 已在 parseStoredFile 中报告；单个坏文件不影响枚举其余会话 */ }
        }
        return out.sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));
    }
    /**
     * 清空智能体侧上下文，同时保留一个同步屏障。不会读写 RPA 的聊天记录目录。
     */
    clear(key) {
        const conversation = this.readFile(key);
        const clearedAt = Date.now();
        const blockedMessageIds = [...new Set([
                ...(conversation.resetBoundary?.blockedMessageIds || []),
                ...conversation.messages.map((message) => message.id),
            ])].slice(-MAX_RESET_BLOCKED_MESSAGE_IDS);
        const clearedMessages = conversation.messages.length;
        this.writeFile(key, {
            version: 1,
            key: this.normalizedKey(key),
            nextSeq: 1,
            messages: [],
            resetBoundary: { at: clearedAt, blockedMessageIds },
        });
        return { clearedMessages, clearedAt };
    }
    delete(key) {
        try {
            const file = this.filePath(this.normalizedKey(key));
            if (fs.existsSync(file))
                fs.unlinkSync(file);
        }
        catch (error) {
            console.error("[AgenticContext] Failed to delete conversation:", error);
        }
    }
}
/**
 * 调用方历史只负责同步；同步后统一从本地 store 选取窗口，杜绝“两份历史直接拼接”
 * 导致的重复和时间倒置。
 */
export class AgenticContextManager {
    store;
    maxTurns;
    maxTokens;
    constructor(store, options = {}) {
        this.store = store;
        this.maxTurns = options.maxTurns ?? AGENTIC_CONTEXT_DEFAULT_MAX_TURNS;
        this.maxTokens = options.maxTokens ?? AGENTIC_CONTEXT_DEFAULT_MAX_TOKENS;
    }
    syncAndBuild(key, incomingHistory, limits) {
        const now = Date.now();
        const ordered = incomingHistory.map((message, index) => ({
            ...message,
            timestamp: normalizeTimestamp(message.timestamp, now - Math.max(1, incomingHistory.length - index) * 1000),
        }));
        // External callers may replay an arbitrarily large history envelope. For bounded
        // Expert routes, admit only complete turns that fit before touching persistent state.
        const admitted = limits ? this.window(ordered, limits) : ordered;
        this.store.upsert(key, admitted);
        return this.window(this.store.read(key), limits);
    }
    recordTurn(key, user, assistant) {
        const userTimestamp = normalizeTimestamp(user.timestamp, Date.now());
        const normalizedUser = { ...user, timestamp: userTimestamp };
        if (!assistant) {
            this.store.upsert(key, [normalizedUser]);
            return;
        }
        const assistantTimestamp = Math.max(normalizeTimestamp(assistant.timestamp, userTimestamp + 1), userTimestamp + 1);
        this.store.upsert(key, [
            normalizedUser,
            { ...assistant, timestamp: assistantTimestamp },
        ]);
    }
    recordMessages(key, messages) {
        this.store.upsert(key, messages);
    }
    window(messages, limits = {}) {
        const maxTurns = limits.maxTurns ?? this.maxTurns;
        const maxTokens = limits.maxTokens ?? this.maxTokens;
        // 先按 user 起点组成完整轮次，再从尾部取窗口。直接逐消息倒扫会在恰好
        // 命中 turn/token 边界时留下“孤立的旧 assistant”，造成语义错位。
        const turns = [];
        for (const message of messages) {
            if (message.role === "user") {
                turns.push([message]);
            }
            else if (turns.length > 0) {
                turns[turns.length - 1].push(message);
            }
        }
        const selectedTurns = [];
        let tokens = 0;
        for (let index = turns.length - 1; index >= 0; index--) {
            const turn = turns[index];
            const turnTokens = turn.reduce((sum, message) => sum + estimateTokens(message.content), 0);
            if (selectedTurns.length >= maxTurns || tokens + turnTokens > maxTokens) {
                break;
            }
            selectedTurns.unshift(turn);
            tokens += turnTokens;
        }
        return mergeAdjacentRoles(selectedTurns.flat()).map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            timestamp: message.timestamp,
        }));
    }
}
