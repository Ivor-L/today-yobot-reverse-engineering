import * as crypto from "crypto";
import fs from "fs";
import path from "path";
import { extractText } from "../../utils/content.js";
const CATEGORIES = ["corrections", "invalidatedAssumptions", "confirmedFacts"];
const MAX_ITEMS_PER_CATEGORY = 24;
const MAX_ITEM_CHARS = 360;
// Backstop only; the primary budget below is token-based.
const MAX_PROMPT_CHARS = 4000;
const DEFAULT_MAX_TOKENS = 1200;
// Items below this confidence are stored but NOT injected (status="candidate").
const INJECT_CONFIDENCE_THRESHOLD = 0.5;
const CATEGORY_BASE_WEIGHT = {
    corrections: 3.0,
    invalidatedAssumptions: 2.5,
    confirmedFacts: 1.5,
};
const CATEGORY_COUNT_CAP = {
    corrections: 8,
    invalidatedAssumptions: 8,
    confirmedFacts: 10,
};
const CATEGORY_TITLE = {
    corrections: "Corrections to preserve:",
    invalidatedAssumptions: "Invalidated assumptions:",
    confirmedFacts: "Confirmed facts / decisions:",
};
const EMPTY_COUNTS = {
    corrections: 0,
    invalidatedAssumptions: 0,
    confirmedFacts: 0,
};
function cloneCounts() {
    return { ...EMPTY_COUNTS };
}
// Monotonic clock: guarantees strictly increasing timestamps within a process so that
// items created in the same millisecond still have a deterministic creation order
// (the earliest-correction pin depends on this).
let lastTs = 0;
function nowMs() {
    const t = Date.now();
    lastTs = t > lastTs ? t : lastTs + 1;
    return lastTs;
}
function parsePositiveIntEnv(value, fallback) {
    if (typeof value !== "string" || !value.trim())
        return fallback;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function clamp01(value) {
    if (!Number.isFinite(value))
        return 0;
    return Math.max(0, Math.min(1, value));
}
// Rough token estimate that accounts for CJK density (~1 token/char) vs latin (~4 chars/token).
function estimateTokens(text) {
    if (!text)
        return 0;
    const cjk = (text.match(/[぀-ヿ㐀-鿿가-힯豈-﫿]/g) || []).length;
    const rest = text.length - cjk;
    return Math.ceil(cjk + rest / 4);
}
function safeSessionId(sessionId) {
    return String(sessionId || "default").replace(/[^a-zA-Z0-9_-]/g, "_");
}
function normalizeForDedupe(text) {
    return text
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[，。；：、,.!?:;"'`]+/g, "")
        .slice(0, 500);
}
function itemId(category, text) {
    return crypto.createHash("sha1").update(`${category}:${normalizeForDedupe(text)}`).digest("hex").slice(0, 16);
}
function cleanText(text, maxChars = MAX_ITEM_CHARS) {
    return text
        .replace(/\s+/g, " ")
        .replace(/[\x00-\x1f\x7f]/g, " ")
        .trim()
        .slice(0, maxChars)
        .trim();
}
// Remove fenced/inline code so pasted logs or snippets don't trigger durable-fact extraction.
function stripCodeBlocks(text) {
    return text
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`[^`]*`/g, " ");
}
function extractLastAssistantPreview(history) {
    for (let i = history.length - 1; i >= 0; i--) {
        const message = history[i];
        if (message?.role !== "assistant")
            continue;
        return cleanText(extractText(message.content), 180);
    }
    return "";
}
function isQuestionOnly(text) {
    const trimmed = text.trim();
    if (!/[？?]\s*$/.test(trimmed))
        return false;
    // Only a STRONG trailing assertion (explicit decision/rule) overrides question detection.
    // Weak markers like 以后/默认 in a "…吗？" sentence are genuine questions.
    return !/(确认|确定|决定|结论是|原则是|规则是|不是.{0,40}而是)/.test(trimmed);
}
function isCorrectionLike(text, signal) {
    if (signal?.type === "correction" && signal.confidence >= 0.6)
        return true;
    return [
        /不对|错了|错误|不是这个意思|你理解错了|理解有误|重新来|这个不对|不行/,
        /纠正一下|更正一下|修正一下|不是这样|不是.{0,30}而是/,
        /\b(wrong|incorrect|not what i mean|you misunderstood|correction|correcting|fix that)\b/i,
        /\bnot\b.{1,80}\bbut\b/i,
    ].some((pattern) => pattern.test(text));
}
// Only explicit goal markers — avoids overwriting the goal with every "帮我…" request.
function extractCurrentGoal(text) {
    const patterns = [
        /(?:本次目标是|当前目标是|我们的目标是|目标是)[:：]?\s*([^。；;\n]{4,160})/,
        /\b(?:the goal is|our goal is|the objective is)\b[:：]?\s*(.{4,180})/i,
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match?.[1])
            return cleanText(match[1], 220);
    }
    return undefined;
}
function extractNotButPairs(text) {
    const pairs = [];
    // Lazy group so "不是 MySQL 而是 Postgres" yields wrong="MySQL" (not "MySQL 而" via the bare 是 branch).
    const zhPattern = /不是([^，。；;\n]{1,90}?)[，,；;\s]*(?:而是|是)([^。；;\n]{1,140})/g;
    let zh;
    while ((zh = zhPattern.exec(text)) !== null) {
        const wrong = cleanText(zh[1], 120);
        const right = cleanText(zh[2], 180);
        if (wrong && right)
            pairs.push({ wrong, right });
    }
    const enPattern = /\bnot\b(.{1,90}?)\bbut\b(.{1,140})(?:[.;\n]|$)/gi;
    let en;
    while ((en = enPattern.exec(text)) !== null) {
        const wrong = cleanText(en[1], 120);
        const right = cleanText(en[2], 180);
        if (wrong && right)
            pairs.push({ wrong, right });
    }
    return pairs;
}
// Strong-signal durable fact extraction: requires an explicit marker AND captures the span
// (not the whole user message). Standalone modal words (必须/不要) no longer trigger.
function extractConfirmedFactSpan(text) {
    const patterns = [
        /(?:确认|确定|结论是|结论为|决定|原则是|规则是|事实是|实际是|最终方案是?|当前方案是?)[:：]?\s*([^。；;\n]{4,180})/,
        /(?:以后|今后|后续|默认|始终|一律)(?:都)?\s*([^。；;\n]{4,160})/,
        /\b(?:from now on|always|never|the rule is|we decided|the decision is|remember to)\b[:：]?\s*(.{4,180})/i,
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match?.[1]) {
            const span = cleanText(match[1], 200);
            if (span)
                return { text: `User-stated durable fact/decision: ${span}`, confidence: 0.6 };
        }
    }
    return undefined;
}
function keepScore(item) {
    const statusBonus = item.status === "active" ? 1 : item.status === "candidate" ? 0.3 : 0;
    return item.occurrences + item.confidence + statusBonus;
}
function earliestActiveCorrectionId(ledger) {
    let earliest;
    for (const item of ledger.corrections) {
        if (item.status !== "active")
            continue;
        if (!earliest || item.createdAt < earliest.createdAt)
            earliest = item;
    }
    return earliest?.id;
}
function enforceCap(list, category) {
    if (list.length <= MAX_ITEMS_PER_CATEGORY)
        return;
    // Protect the earliest active correction so the prompt pin survives eviction.
    const earliestId = category === "corrections" ? earliestActiveCorrectionId({ corrections: list }) : undefined;
    list.sort((a, b) => {
        if (a.id === earliestId)
            return -1;
        if (b.id === earliestId)
            return 1;
        return keepScore(b) - keepScore(a);
    });
    list.splice(MAX_ITEMS_PER_CATEGORY);
}
function updateCategory(ledger, category, text, confidence, source, result) {
    const cleaned = cleanText(text);
    if (!cleaned)
        return undefined;
    const id = itemId(category, cleaned);
    const list = ledger[category];
    const existing = list.find((item) => item.id === id || normalizeForDedupe(item.text) === normalizeForDedupe(cleaned));
    const timestamp = nowMs();
    if (existing) {
        existing.lastSeenAt = timestamp;
        existing.occurrences += 1;
        existing.confidence = Math.max(existing.confidence, clamp01(confidence));
        if (existing.status === "candidate" && existing.confidence >= INJECT_CONFIDENCE_THRESHOLD) {
            existing.status = "active";
        }
        result.updated[category] += 1;
        result.changed = true;
        return existing.id;
    }
    const status = confidence >= INJECT_CONFIDENCE_THRESHOLD ? "active" : "candidate";
    list.unshift({
        id,
        text: cleaned,
        status,
        confidence: clamp01(confidence),
        createdAt: timestamp,
        lastSeenAt: timestamp,
        occurrences: 1,
        source,
    });
    enforceCap(list, category);
    result.added[category] += 1;
    result.changed = true;
    return id;
}
// Mark active items in `category` that match the now-invalidated `matchText` as superseded.
function markSuperseded(ledger, category, matchText, bySupersedingId, result) {
    const norm = normalizeForDedupe(matchText);
    if (norm.length < 3)
        return;
    for (const item of ledger[category]) {
        if (item.status !== "active")
            continue;
        const itemNorm = normalizeForDedupe(item.text);
        if (!itemNorm)
            continue;
        if (itemNorm.includes(norm) || norm.includes(itemNorm)) {
            item.status = "superseded";
            item.supersededBy = bySupersedingId;
            item.lastSeenAt = nowMs();
            result.superseded[category] += 1;
            result.changed = true;
        }
    }
}
function scoreItem(item, category, earliestId) {
    let score = CATEGORY_BASE_WEIGHT[category]
        + 0.5 * Math.log2(1 + item.occurrences)
        + 0.3 * item.confidence;
    if (earliestId && item.id === earliestId)
        score += 100; // pin earliest correction
    return score;
}
function selectForPrompt(ledger, budgetTokens) {
    const earliestId = earliestActiveCorrectionId(ledger);
    const goalTokens = ledger.currentGoal ? estimateTokens(`- ${ledger.currentGoal}`) + 2 : 0;
    const headerReserve = 40;
    let remaining = Math.max(120, budgetTokens - goalTokens - headerReserve);
    const pool = [];
    for (const category of CATEGORIES) {
        for (const item of ledger[category]) {
            if (item.status !== "active")
                continue;
            pool.push({ item, category, score: scoreItem(item, category, earliestId) });
        }
    }
    pool.sort((a, b) => b.score - a.score || b.item.lastSeenAt - a.item.lastSeenAt);
    const out = {
        corrections: [],
        invalidatedAssumptions: [],
        confirmedFacts: [],
    };
    const counts = cloneCounts();
    for (const entry of pool) {
        if (counts[entry.category] >= CATEGORY_COUNT_CAP[entry.category])
            continue;
        const lineTokens = estimateTokens(`- ${entry.item.text}`) + 1;
        const isPinned = !!earliestId && entry.item.id === earliestId;
        if (lineTokens > remaining && !isPinned)
            continue;
        out[entry.category].push(entry.item);
        counts[entry.category] += 1;
        remaining -= lineTokens;
    }
    return out;
}
function createEmptyLedger(sessionId) {
    return {
        version: 1,
        sessionId,
        updatedAt: nowMs(),
        corrections: [],
        invalidatedAssumptions: [],
        confirmedFacts: [],
    };
}
function coerceStatus(value) {
    return value === "candidate" || value === "superseded" || value === "rejected" ? value : "active";
}
function coerceSource(value) {
    return value === "heuristic_span" ? "heuristic_span" : "heuristic";
}
function coerceItems(value) {
    if (!Array.isArray(value))
        return [];
    const items = value
        .filter((item) => {
        return !!item && typeof item === "object" && typeof item.text === "string";
    })
        .map((item) => ({
        id: typeof item.id === "string" ? item.id : itemId("confirmedFacts", item.text),
        text: cleanText(item.text),
        status: coerceStatus(item.status),
        confidence: typeof item.confidence === "number" ? clamp01(item.confidence) : 0.5,
        createdAt: typeof item.createdAt === "number" ? item.createdAt : nowMs(),
        lastSeenAt: typeof item.lastSeenAt === "number" ? item.lastSeenAt : nowMs(),
        occurrences: typeof item.occurrences === "number" && item.occurrences > 0 ? item.occurrences : 1,
        source: coerceSource(item.source),
        supersededBy: typeof item.supersededBy === "string" ? item.supersededBy : undefined,
    }))
        .filter((item) => item.text.length > 0);
    return items.slice(0, MAX_ITEMS_PER_CATEGORY);
}
function trimPromptBlock(block) {
    if (block.length <= MAX_PROMPT_CHARS)
        return block;
    const lines = block.split("\n");
    const kept = [];
    let total = 0;
    for (const line of lines) {
        if (total + line.length + 1 > MAX_PROMPT_CHARS)
            break;
        kept.push(line);
        total += line.length + 1;
    }
    kept.push("- Additional ledger entries omitted to stay within the prompt budget.");
    return kept.join("\n");
}
function pushSection(lines, category, items) {
    if (items.length === 0)
        return;
    lines.push("", CATEGORY_TITLE[category]);
    for (const item of items)
        lines.push(`- ${item.text}`);
}
export class SessionLedgerManager {
    baseDir;
    constructor(baseDir = process.env.USER_DATA_PATH || process.cwd()) {
        this.baseDir = baseDir;
    }
    isEnabled() {
        return process.env.YOKO_SESSION_LEDGER_ENABLED !== "false";
    }
    // Shadow mode: keep extracting/persisting, but do NOT inject into the prompt.
    isShadowMode() {
        return process.env.YOKO_SESSION_LEDGER_SHADOW === "true";
    }
    getLedgerPath(sessionId) {
        return path.join(this.baseDir, "data", "session_ledger", `${safeSessionId(sessionId)}.json`);
    }
    load(sessionId) {
        const filePath = this.getLedgerPath(sessionId);
        if (!fs.existsSync(filePath)) {
            return createEmptyLedger(sessionId);
        }
        try {
            const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
            return {
                version: 1,
                sessionId,
                updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : nowMs(),
                currentGoal: typeof parsed.currentGoal === "string" ? cleanText(parsed.currentGoal, 220) : undefined,
                corrections: coerceItems(parsed.corrections),
                invalidatedAssumptions: coerceItems(parsed.invalidatedAssumptions),
                confirmedFacts: coerceItems(parsed.confirmedFacts),
            };
        }
        catch (e) {
            // Don't silently nuke the ledger: back up the corrupt file so it stays recoverable.
            try {
                const backup = `${filePath}.corrupt-${Date.now()}`;
                fs.renameSync(filePath, backup);
                console.error(`[SessionLedger] Corrupt ledger backed up to ${backup}:`, e);
            }
            catch (backupErr) {
                console.error("[SessionLedger] Failed to back up corrupt ledger:", backupErr);
            }
            return createEmptyLedger(sessionId);
        }
    }
    save(ledger) {
        const filePath = this.getLedgerPath(ledger.sessionId);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        // Atomic write: write to a temp file then rename, so a crash mid-write can't corrupt the ledger.
        const tmpPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
        try {
            fs.writeFileSync(tmpPath, JSON.stringify({ ...ledger, updatedAt: nowMs() }, null, 2), "utf-8");
            fs.renameSync(tmpPath, filePath);
        }
        catch (e) {
            try {
                if (fs.existsSync(tmpPath))
                    fs.unlinkSync(tmpPath);
            }
            catch {
                /* ignore cleanup failure */
            }
            throw e;
        }
    }
    reset(sessionId, scope = "all") {
        if (scope === "all") {
            this.save(createEmptyLedger(sessionId));
            return;
        }
        const ledger = this.load(sessionId);
        ledger[scope] = [];
        this.save(ledger);
    }
    // Items eligible for APPEND-ONLY injection onto the user turn (prompt-cache friendly).
    // Returns active items (with stable ids) selected within the same token budget as
    // formatForPrompt. The caller is responsible for de-duplicating against items already
    // injected into the conversation history, so each item is injected at most once.
    getInjectableItems(sessionId) {
        if (!this.isEnabled() || this.isShadowMode())
            return [];
        const ledger = this.load(sessionId);
        const budget = parsePositiveIntEnv(process.env.YOKO_SESSION_LEDGER_MAX_TOKENS, DEFAULT_MAX_TOKENS);
        const selection = selectForPrompt(ledger, budget);
        const out = [];
        for (const category of CATEGORIES) {
            for (const item of selection[category]) {
                out.push({ id: item.id, text: item.text, category });
            }
        }
        return out;
    }
    formatForPrompt(sessionId) {
        if (!this.isEnabled())
            return "";
        const ledger = this.load(sessionId);
        const budget = parsePositiveIntEnv(process.env.YOKO_SESSION_LEDGER_MAX_TOKENS, DEFAULT_MAX_TOKENS);
        const selection = selectForPrompt(ledger, budget);
        const hasContent = !!ledger.currentGoal ||
            selection.corrections.length > 0 ||
            selection.invalidatedAssumptions.length > 0 ||
            selection.confirmedFacts.length > 0;
        if (!hasContent)
            return "";
        const lines = [
            "### Session Ledger",
            "High-priority durable context for this conversation only. The current user message always overrides this ledger. Corrections and invalidated assumptions override older summaries and RAG memory.",
        ];
        if (ledger.currentGoal) {
            lines.push("", "Current goal:", `- ${ledger.currentGoal}`);
        }
        pushSection(lines, "corrections", selection.corrections);
        pushSection(lines, "invalidatedAssumptions", selection.invalidatedAssumptions);
        pushSection(lines, "confirmedFacts", selection.confirmedFacts);
        const block = lines.join("\n");
        return block.length > MAX_PROMPT_CHARS ? trimPromptBlock(block) : block;
    }
    updateFromTurn(params) {
        const result = {
            changed: false,
            added: cloneCounts(),
            updated: cloneCounts(),
            superseded: cloneCounts(),
        };
        if (!this.isEnabled())
            return result;
        const stripped = stripCodeBlocks(params.userText);
        const text = cleanText(stripped, 1500);
        if (!text)
            return result;
        const ledger = this.load(params.sessionId);
        const explicitGoal = extractCurrentGoal(text);
        if (explicitGoal && explicitGoal !== ledger.currentGoal) {
            ledger.currentGoal = explicitGoal;
            result.changed = true;
        }
        const pairs = extractNotButPairs(text);
        for (const pair of pairs) {
            updateCategory(ledger, "invalidatedAssumptions", `Do not assume "${pair.wrong}". Correct framing: "${pair.right}".`, 0.75, "heuristic_span", result);
            const correctionId = updateCategory(ledger, "corrections", `Correction: "${pair.right}" replaces prior framing "${pair.wrong}".`, 0.75, "heuristic_span", result);
            // The previously-stated fact is now invalidated.
            markSuperseded(ledger, "confirmedFacts", pair.wrong, correctionId, result);
        }
        // Generic correction only when no structured pair was captured, to avoid duplicate entries.
        if (pairs.length === 0 && isCorrectionLike(text, params.outcomeSignal)) {
            const assistantPreview = extractLastAssistantPreview(params.history);
            const correction = assistantPreview
                ? `User corrected prior assistant behavior: ${text} | Previous assistant preview: ${assistantPreview}`
                : `User correction: ${text}`;
            updateCategory(ledger, "corrections", correction, 0.5, "heuristic", result);
        }
        if (!isQuestionOnly(text)) {
            const factSpan = extractConfirmedFactSpan(text);
            if (factSpan) {
                updateCategory(ledger, "confirmedFacts", factSpan.text, factSpan.confidence, "heuristic_span", result);
            }
        }
        if (result.changed) {
            this.save(ledger);
        }
        return result;
    }
}
