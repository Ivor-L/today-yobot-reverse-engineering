/**
 * Pi session-file (JSONL) parsing helpers.
 *
 * Extracted from kernel.ts so the linear-scan fallback loader can be smoke-tested
 * in isolation (kernel.ts pulls in config/LLM deps that a test must not need).
 *
 * The linear loader honors `compaction` entries (summary replaces everything before
 * `firstKeptEntryId`) and restores `custom_message` entries (injected session context).
 * Dropping either would rebuild a context that diverges from what was already sent
 * pre-restart — losing injected memory AND busting the prompt cache for the session.
 */
import fs from "fs";
import crypto from "node:crypto";
import path from "node:path";
import { selectActiveSessionBranch } from "../../shared/session_tree.js";
/** Remove only exact duplicate JSONL session headers, preserving differing records. */
export function deduplicateSessionHeaders(sessionFile) {
    if (!fs.existsSync(sessionFile)) {
        return { removed: 0, hasAssistant: false, validJsonl: false };
    }
    const raw = fs.readFileSync(sessionFile, "utf-8");
    const lines = raw.split(/\r?\n/);
    const keptLines = [];
    let firstHeaderSignature;
    let removed = 0;
    let hasAssistant = false;
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed)
            continue;
        let entry;
        try {
            entry = JSON.parse(trimmed);
        }
        catch {
            return { removed: 0, hasAssistant: false, validJsonl: false };
        }
        if (entry?.type === "message" && entry.message?.role === "assistant") {
            hasAssistant = true;
        }
        if (entry?.type === "session") {
            const signature = JSON.stringify(entry);
            if (firstHeaderSignature === undefined) {
                firstHeaderSignature = signature;
            }
            else if (signature === firstHeaderSignature) {
                removed++;
                continue;
            }
        }
        keptLines.push(line);
    }
    if (removed > 0) {
        fs.writeFileSync(sessionFile, `${keptLines.join("\n")}\n`, "utf-8");
    }
    return { removed, hasAssistant, validJsonl: true };
}
export function normalizeStructuredPiContent(content) {
    if (Array.isArray(content))
        return content;
    if (typeof content === "string")
        return [{ type: "text", text: content }];
    if (content && typeof content === "object")
        return [content];
    return [];
}
function timestampIso(value, fallback) {
    const candidate = typeof value === "number" || typeof value === "string" ? value : fallback;
    const date = new Date(candidate);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}
/**
 * Convert the legacy application JSON object into Pi's append-only JSONL tree.
 *
 * Deterministic Expert turns bypass Pi. Before this migration existed, the first
 * Expert turn in a brand-new chat therefore created `{ id, messages: [...] }`.
 * If the user later switched that chat back to the main Agent, Pi tried to open
 * the same file as a native session and rejected it before it could answer.
 *
 * The conversion is lossless for conversation messages and uses an atomic rename,
 * so an interrupted upgrade cannot leave half a Pi tree behind.
 */
export function migrateLegacyJsonSessionToPiJsonl(sessionFile) {
    if (!fs.existsSync(sessionFile))
        return false;
    const raw = fs.readFileSync(sessionFile, "utf-8");
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        return false;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !Array.isArray(parsed.messages)) {
        return false;
    }
    const sessionId = typeof parsed.id === "string" && parsed.id.trim()
        ? parsed.id.trim()
        : path.basename(sessionFile, path.extname(sessionFile));
    const fallbackTimestamp = parsed.updatedAt ?? parsed.createdAt ?? Date.now();
    const entries = [{
            type: "session",
            id: sessionId,
            timestamp: timestampIso(parsed.createdAt, fallbackTimestamp),
            cwd: process.cwd(),
        }];
    let parentId = null;
    for (const sourceMessage of parsed.messages) {
        if (!sourceMessage || typeof sourceMessage !== "object")
            continue;
        const message = normalizeMessageEntryContent({ message: sourceMessage }).message;
        const entryId = crypto.randomUUID();
        entries.push({
            type: "message",
            id: entryId,
            parentId,
            timestamp: timestampIso(sourceMessage.timestamp, fallbackTimestamp),
            message,
        });
        parentId = entryId;
    }
    const nextContent = `${entries.map(entry => JSON.stringify(entry)).join("\n")}\n`;
    const temporaryFile = path.join(path.dirname(sessionFile), `.${path.basename(sessionFile)}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.migration.tmp`);
    let descriptor;
    try {
        descriptor = fs.openSync(temporaryFile, "wx");
        fs.writeFileSync(descriptor, nextContent, "utf-8");
        fs.fsyncSync(descriptor);
        fs.closeSync(descriptor);
        descriptor = undefined;
        fs.renameSync(temporaryFile, sessionFile);
    }
    finally {
        if (descriptor !== undefined) {
            try {
                fs.closeSync(descriptor);
            }
            catch { /* best effort */ }
        }
        if (fs.existsSync(temporaryFile)) {
            try {
                fs.unlinkSync(temporaryFile);
            }
            catch { /* best effort */ }
        }
    }
    return true;
}
function normalizeMessageEntryContent(entry) {
    const msg = entry?.message;
    if (!msg || typeof msg !== "object")
        return entry;
    const role = msg.role;
    if (role !== "assistant" && role !== "tool" && role !== "toolResult")
        return entry;
    if (Array.isArray(msg.content))
        return entry;
    return {
        ...entry,
        message: {
            ...msg,
            content: normalizeStructuredPiContent(msg.content)
        }
    };
}
export function migrateSessionFileIfNeeded(sessionFile) {
    if (!fs.existsSync(sessionFile))
        return;
    if (migrateLegacyJsonSessionToPiJsonl(sessionFile))
        return;
    deduplicateSessionHeaders(sessionFile);
    const raw = fs.readFileSync(sessionFile, "utf-8");
    const trimmed = raw.trim();
    if (!trimmed)
        return;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.messages)) {
            return;
        }
        const normalizedMessages = parsed.messages.map((msg) => {
            if (!msg || typeof msg !== "object")
                return msg;
            const role = msg.role;
            if (role !== "assistant" && role !== "tool" && role !== "toolResult")
                return msg;
            if (Array.isArray(msg.content))
                return msg;
            return { ...msg, content: normalizeStructuredPiContent(msg.content) };
        });
        const changed = normalizedMessages.some((msg, idx) => msg !== parsed.messages[idx]);
        if (!changed)
            return;
        fs.writeFileSync(sessionFile, JSON.stringify({ ...parsed, messages: normalizedMessages }, null, 2), "utf-8");
        return;
    }
    catch {
    }
    const lines = raw.split(/\r?\n/);
    const normalizedLines = [];
    let changed = false;
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) {
            normalizedLines.push(line);
            continue;
        }
        try {
            const parsedLine = JSON.parse(trimmedLine);
            const normalizedLineObj = normalizeMessageEntryContent(parsedLine);
            if (normalizedLineObj !== parsedLine)
                changed = true;
            normalizedLines.push(JSON.stringify(normalizedLineObj));
        }
        catch {
            return;
        }
    }
    if (changed) {
        fs.writeFileSync(sessionFile, `${normalizedLines.join("\n")}\n`, "utf-8");
    }
}
export function parseTimestampToMs(value) {
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    if (typeof value !== "string")
        return Date.now();
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? Date.now() : ms;
}
export function loadLinearMessagesFromSessionFile(sessionFile, maxMessages = 80) {
    if (!fs.existsSync(sessionFile))
        return [];
    const raw = fs.readFileSync(sessionFile, "utf-8");
    const trimmed = raw.trim();
    if (!trimmed)
        return [];
    const messages = [];
    const allowedRoles = new Set(["user", "assistant", "tool", "toolResult"]);
    try {
        const parsed = JSON.parse(raw);
        const arrayMessages = Array.isArray(parsed?.messages) ? parsed.messages : [];
        for (const msg of arrayMessages) {
            if (!msg || typeof msg !== "object" || !allowedRoles.has(msg.role))
                continue;
            const normalizedContent = msg.role === "assistant" || msg.role === "tool" || msg.role === "toolResult"
                ? normalizeStructuredPiContent(msg.content)
                : msg.content;
            const normalizedMsg = {
                ...msg,
                content: normalizedContent,
                timestamp: typeof msg.timestamp === "number" ? msg.timestamp : Date.now()
            };
            messages.push(normalizedMsg);
        }
    }
    catch {
        // JSONL scan. Track entry ids so compaction entries can be honored:
        // resurrecting summarized-away history would both blow the context and
        // change the sent prefix vs. pre-restart requests (full cache miss).
        const parsedEntries = [];
        const lines = raw.split(/\r?\n/);
        for (const line of lines) {
            const clean = line.trim();
            if (!clean)
                continue;
            try {
                const obj = JSON.parse(clean);
                if (obj?.type !== "session")
                    parsedEntries.push(obj);
            }
            catch {
                continue;
            }
        }
        const collected = [];
        for (const obj of selectActiveSessionBranch(parsedEntries)) {
            try {
                if (obj?.type === "message" && obj.message && allowedRoles.has(obj.message.role)) {
                    const msg = obj.message;
                    const normalizedContent = msg.role === "assistant" || msg.role === "tool" || msg.role === "toolResult"
                        ? normalizeStructuredPiContent(msg.content)
                        : msg.content;
                    collected.push({
                        id: typeof obj.id === "string" ? obj.id : undefined,
                        msg: {
                            ...msg,
                            content: normalizedContent,
                            timestamp: typeof msg.timestamp === "number" ? msg.timestamp : parseTimestampToMs(obj.timestamp)
                        }
                    });
                }
                else if (obj?.type === "custom_message" && typeof obj.customType === "string") {
                    // Injected context (e.g. yoko-session-context) must survive restarts,
                    // otherwise the rebuilt prefix diverges from what was already sent.
                    collected.push({
                        id: typeof obj.id === "string" ? obj.id : undefined,
                        msg: {
                            role: "custom",
                            customType: obj.customType,
                            content: obj.content,
                            display: obj.display === true,
                            details: obj.details,
                            timestamp: parseTimestampToMs(obj.timestamp)
                        }
                    });
                }
                else if (obj?.type === "compaction" && typeof obj.summary === "string") {
                    // Mirror pi's buildSessionContext: summary replaces everything
                    // before firstKeptEntryId; entries from there on are kept.
                    const keptIdx = typeof obj.firstKeptEntryId === "string"
                        ? collected.findIndex((e) => e.id === obj.firstKeptEntryId)
                        : -1;
                    const kept = keptIdx >= 0 ? collected.slice(keptIdx) : [];
                    collected.length = 0;
                    collected.push({
                        id: typeof obj.id === "string" ? obj.id : undefined,
                        msg: {
                            role: "compactionSummary",
                            summary: obj.summary,
                            tokensBefore: typeof obj.tokensBefore === "number" ? obj.tokensBefore : 0,
                            timestamp: parseTimestampToMs(obj.timestamp)
                        }
                    });
                    collected.push(...kept);
                }
                else if (obj?.type === "branch_summary" && typeof obj.summary === "string") {
                    collected.push({
                        id: typeof obj.id === "string" ? obj.id : undefined,
                        msg: {
                            role: "branchSummary",
                            summary: obj.summary,
                            fromId: typeof obj.fromId === "string" ? obj.fromId : "",
                            timestamp: parseTimestampToMs(obj.timestamp)
                        }
                    });
                }
            }
            catch {
                continue;
            }
        }
        messages.push(...collected.map((e) => e.msg));
    }
    if (messages.length <= maxMessages)
        return messages;
    return messages.slice(-maxMessages);
}
