/**
 * Turn-level background memory extraction (MEMORY_INJECTION_V2 step 5).
 *
 * After a top-level run finishes, extract durable user facts from the session's
 * recent USER messages and store them as CANDIDATE memories:
 * - fires every MIN_NEW_USER_TURNS new user turns per session, fire-and-forget
 *   from kernel.run()'s finally block (never inside agent.subscribe — pi awaits
 *   listeners and would block run settlement);
 * - reads ONLY role === "user" messages. Injected context lives in custom
 *   messages after the channel migration, so user turns are pure user speech
 *   and the extractor cannot re-harvest injected memory (no self-reinforcement);
 * - writes to memory/users/<uid>/observations.md with confidence 0.35, BELOW
 *   the injection gate (INJECT_MIN_CONFIDENCE): visible in the Memory UI and
 *   knowledge_search, but never injected until promoted;
 * - a fact re-observed in a later extraction bumps confidence +0.2
 *   (0.35 → 0.55 crosses the gate: "second independent observation promotes"),
 *   or the user confirms it in the UI (0.95).
 */
import * as fs from "fs";
import * as path from "path";
import { LLMManager } from "../agent/llm/manager.js";
import { isMemoryWriteAllowed } from "../agent/profile/resolver.js";
import { FileMemoryManager } from "./file_memory.js";
import { config } from "../config/index.js";
import { CANDIDATE_CONFIDENCE } from "./injection_gate.js";
const MIN_NEW_USER_TURNS = 3;
const MAX_TEXTS_PER_EXTRACTION = 6;
const MAX_CHARS_PER_TEXT = 300;
const MAX_FACTS_PER_EXTRACTION = 3;
const MAX_FACT_CHARS = 200;
const REOBSERVATION_BONUS = 0.2;
const MAX_TRACKED_SESSIONS = 200;
const EXTRACTION_SYSTEM_PROMPT = [
    "你是记忆提取器。从用户消息中提取值得长期记住的事实。",
    "只提取用户明确陈述、对未来对话有复用价值的信息：",
    "- 身份/背景（职业、公司、角色）",
    "- 长期偏好（沟通风格、输出格式、工具/模型偏好）",
    "- 持续性业务事实：在做的产品、进行中的项目/客户及其关键背景、目标客户、长期目标",
    "（正在服务的客户和进行中的项目算持续性事实，值得记住；但项目内某一次交付物的具体要求不算。）",
    "不要提取：一次性任务细节、问题本身的内容、临时状态、代码或文案正文、以及你推断但用户未明说的特质。",
    '输出严格 JSON 数组（可为空）：[{"text":"完整、独立可复用的事实陈述","type":"preference|entity|insight"}]',
    `最多 ${MAX_FACTS_PER_EXTRACTION} 条。没有值得记住的内容就输出 []。只输出 JSON，不要任何其他文字。`,
].join("\n");
/** Extract plain text from a pi user message content (string or content-part array). */
export function extractUserText(content) {
    if (typeof content === "string")
        return content;
    if (Array.isArray(content)) {
        return content
            .filter((p) => p?.type === "text" && typeof p.text === "string")
            .map((p) => p.text)
            .join("\n");
    }
    return "";
}
/**
 * Pick the user texts that arrived after `processedUserCount` user turns.
 * Only role === "user" — custom/assistant/tool content must never reach the extractor.
 */
export function selectNewUserTexts(messages, processedUserCount, maxTexts = MAX_TEXTS_PER_EXTRACTION, maxChars = MAX_CHARS_PER_TEXT) {
    const userTexts = [];
    for (const m of Array.isArray(messages) ? messages : []) {
        if (m?.role !== "user")
            continue;
        const text = extractUserText(m.content).trim();
        userTexts.push(text);
    }
    const fresh = userTexts
        .slice(Math.max(0, processedUserCount))
        .filter((t) => t.length > 0)
        .slice(-maxTexts)
        .map((t) => (t.length > maxChars ? `${t.slice(0, maxChars)}…` : t));
    return { texts: fresh, totalUserCount: userTexts.length };
}
/** Parse the LLM extraction response into validated facts (empty array on any problem). */
export function parseExtractionResponse(raw) {
    if (!raw || typeof raw !== "string")
        return [];
    let text = raw.trim();
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence)
        text = fence[1].trim();
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start < 0 || end <= start)
        return [];
    let parsed;
    try {
        parsed = JSON.parse(text.slice(start, end + 1));
    }
    catch {
        return [];
    }
    if (!Array.isArray(parsed))
        return [];
    const allowedTypes = new Set(["preference", "entity", "insight"]);
    const facts = [];
    for (const item of parsed) {
        if (!item || typeof item !== "object")
            continue;
        const t = item.text;
        if (typeof t !== "string" || t.trim().length < 4)
            continue;
        const type = allowedTypes.has(item.type) ? item.type : "insight";
        facts.push({ text: t.trim().slice(0, MAX_FACT_CHARS), type });
        if (facts.length >= MAX_FACTS_PER_EXTRACTION)
            break;
    }
    return facts;
}
/** Normalize for duplicate detection across observations / core memories. */
export function normalizeFactText(text) {
    return (text || "")
        .replace(/^-?\s*\[\d{4}-\d{2}-\d{2}T[^\]]*\]\s*/, "") // strip entry timestamp prefix
        .toLowerCase()
        .replace(/[\s，。；：、,.!?:;"'`()（）\-]+/g, "")
        .slice(0, 300);
}
function charBigrams(text) {
    const grams = new Set();
    for (let i = 0; i < text.length - 1; i++)
        grams.add(text.slice(i, i + 2));
    return grams;
}
/**
 * True when `candidate` duplicates an existing memory text.
 * Containment OR bigram overlap-coefficient >= 0.7 (the shorter fact being
 * mostly covered by the longer one, tolerant to inserted words like
 * "用户是OPC创业者" vs "用户是基于AI的OPC创业者").
 */
export function matchesExistingFact(candidate, existing) {
    const a = normalizeFactText(candidate);
    const b = normalizeFactText(existing);
    if (a.length < 6 || b.length < 6)
        return a === b;
    if (a.includes(b) || b.includes(a))
        return true;
    const ga = charBigrams(a);
    const gb = charBigrams(b);
    if (ga.size === 0 || gb.size === 0)
        return false;
    let shared = 0;
    for (const g of ga)
        if (gb.has(g))
            shared++;
    return shared / Math.min(ga.size, gb.size) >= 0.7;
}
export class TurnMemoryExtractor {
    static instance;
    statePath;
    state = null;
    inFlight = new Set();
    constructor() {
        const dataRoot = process.env.USER_DATA_PATH || process.cwd();
        this.statePath = path.join(dataRoot, "data", "signals", "turn_extractor_state.json");
    }
    static getInstance() {
        if (!TurnMemoryExtractor.instance) {
            TurnMemoryExtractor.instance = new TurnMemoryExtractor();
        }
        return TurnMemoryExtractor.instance;
    }
    isEnabled() {
        return process.env.YOKO_TURN_EXTRACTOR_ENABLED !== "false";
    }
    /**
     * Fire-and-forget entry point (call from kernel.run() finally, do NOT await).
     * Swallows all errors — extraction must never affect the chat turn.
     * The optional trace hook appends 'memory_extract' events to the run's trace
     * file so extraction outcomes are diagnosable from traces alone.
     */
    maybeExtract(params) {
        if (!this.isEnabled())
            return;
        const { sessionId } = params;
        // 写端隔离由 profile 声明(memoryNamespace.write === null → 不抽取)。
        // 迁移前是 sessionId.includes("sub_") || includes("mcpext"),语义等价;
        // 新 profile(如 rpa-reply)因此无需依赖 sessionId 的命名巧合就能关掉写入——
        // RPA 会话里的 user role 是陌生客户,抽取会把客户的话写进用户画像。
        if (!isMemoryWriteAllowed(sessionId))
            return;
        if (this.inFlight.has(sessionId))
            return;
        this.inFlight.add(sessionId);
        this.runExtraction(params)
            .catch((e) => {
            console.warn("[TurnExtractor] extraction failed (non-fatal):", e?.message || e);
            try {
                params.trace?.({ stage: "error", error: String(e?.message || e) });
            }
            catch { /* ignore */ }
        })
            .finally(() => this.inFlight.delete(sessionId));
    }
    loadState() {
        if (this.state)
            return this.state;
        try {
            if (fs.existsSync(this.statePath)) {
                const parsed = JSON.parse(fs.readFileSync(this.statePath, "utf-8"));
                this.state = { sessions: parsed?.sessions && typeof parsed.sessions === "object" ? parsed.sessions : {} };
                return this.state;
            }
        }
        catch { /* start fresh */ }
        this.state = { sessions: {} };
        return this.state;
    }
    saveState() {
        if (!this.state)
            return;
        try {
            const entries = Object.entries(this.state.sessions);
            if (entries.length > MAX_TRACKED_SESSIONS) {
                entries.sort((a, b) => (b[1].lastRunAt || 0) - (a[1].lastRunAt || 0));
                this.state.sessions = Object.fromEntries(entries.slice(0, MAX_TRACKED_SESSIONS));
            }
            fs.mkdirSync(path.dirname(this.statePath), { recursive: true });
            fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2), "utf-8");
        }
        catch (e) {
            console.warn("[TurnExtractor] failed to save state:", e);
        }
    }
    async runExtraction(params) {
        const { sessionId, messages, trace } = params;
        const userId = params.userId || "user_default";
        const state = this.loadState();
        const sessionState = state.sessions[sessionId] || { processedUserCount: 0, lastRunAt: 0 };
        // Compaction can shrink state.messages below a previously recorded
        // watermark; clamp so extraction doesn't silently stall until the
        // count climbs back past the stale high-water mark. (Worst case a
        // kept recent turn is re-extracted; persistFacts de-dup absorbs it.)
        const currentUserCount = (Array.isArray(messages) ? messages : [])
            .filter((m) => m?.role === "user").length;
        const processedCount = Math.min(sessionState.processedUserCount, currentUserCount);
        const { texts, totalUserCount } = selectNewUserTexts(messages, processedCount);
        if (totalUserCount - processedCount < MIN_NEW_USER_TURNS) {
            trace?.({
                stage: "skipped",
                reason: "not_enough_new_user_turns",
                newTurns: totalUserCount - processedCount,
                needed: MIN_NEW_USER_TURNS,
            });
            return;
        }
        if (texts.length === 0) {
            state.sessions[sessionId] = { processedUserCount: totalUserCount, lastRunAt: Date.now() };
            this.saveState();
            trace?.({ stage: "skipped", reason: "no_extractable_texts" });
            return;
        }
        const { facts, rawPreview } = await this.callLLM(texts);
        // Mark processed BEFORE writing so a write failure can't cause repeated extraction loops.
        state.sessions[sessionId] = { processedUserCount: totalUserCount, lastRunAt: Date.now() };
        this.saveState();
        if (facts.length === 0) {
            console.log(`[TurnExtractor] session=${sessionId} LLM returned no durable facts. Raw: ${rawPreview}`);
            trace?.({ stage: "empty", inputTurns: texts.length, rawPreview });
            return;
        }
        const outcome = await this.persistFacts(facts, userId);
        console.log(`[TurnExtractor] session=${sessionId} extracted ${facts.length} candidate fact(s): +${outcome.appended} appended, ${outcome.promoted} promoted, ${outcome.skippedCore} already in core`);
        trace?.({
            stage: "persisted",
            inputTurns: texts.length,
            facts: facts.map((f) => ({ type: f.type, preview: f.text.slice(0, 80) })),
            ...outcome,
        });
    }
    async callLLM(texts) {
        const llmManager = LLMManager.getInstance();
        if (!llmManager.getAuthToken())
            return { facts: [], rawPreview: "(no auth token)" };
        const client = llmManager.getClient();
        const model = llmManager.getModelName();
        const userContent = texts.map((t, i) => `${i + 1}. ${t}`).join("\n");
        const response = await client.chat.completions.create({
            model,
            messages: [
                { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
                { role: "user", content: userContent },
            ],
            max_tokens: 400,
            temperature: 0,
        });
        const raw = response.choices?.[0]?.message?.content || "";
        return { facts: parseExtractionResponse(raw), rawPreview: raw.slice(0, 200) };
    }
    async persistFacts(facts, userId) {
        const fileMemory = FileMemoryManager.getInstance();
        const store = fileMemory.getStore();
        const metaStore = store.getMetaStore();
        const relPath = `memory/users/${userId}/observations.md`;
        // Existing memories for de-dup / re-observation: observations + explicit core memories.
        const existingObservations = await store.getChunksByPath(relPath);
        const existingCore = await store.getChunksByPath(`memory/users/${userId}/core.md`);
        const knownIdsBefore = new Set(existingObservations.map((c) => c.id));
        const toAppend = [];
        let promoted = 0;
        let skippedCore = 0;
        for (const fact of facts) {
            // Already explicitly saved by the user → skip entirely (core wins).
            if (existingCore.some((c) => matchesExistingFact(fact.text, c.text))) {
                skippedCore++;
                continue;
            }
            const dup = existingObservations.find((c) => matchesExistingFact(fact.text, c.text));
            if (dup) {
                // Second independent observation → promote toward the injection gate.
                metaStore.updateConfidence(dup.id, REOBSERVATION_BONUS);
                promoted++;
                continue;
            }
            toAppend.push(fact);
        }
        if (toAppend.length === 0) {
            metaStore.flush();
            return { appended: 0, promoted, skippedCore };
        }
        const absPath = path.join(config.workspaceDir, relPath);
        fs.mkdirSync(path.dirname(absPath), { recursive: true });
        const now = new Date().toISOString();
        const entries = toAppend.map((f) => `\n- [${now}] ${f.text}`).join("");
        fs.appendFileSync(absPath, entries, "utf-8");
        await fileMemory.syncFile(relPath);
        // Initialize candidate metadata for the newly indexed chunks.
        const after = await store.getChunksByPath(relPath);
        for (const chunk of after) {
            if (knownIdsBefore.has(chunk.id))
                continue;
            const fact = toAppend.find((f) => matchesExistingFact(f.text, chunk.text));
            metaStore.setMeta(chunk.id, {
                confidence: CANDIDATE_CONFIDENCE,
                memoryType: fact?.type || "insight",
            });
        }
        metaStore.flush();
        return { appended: toAppend.length, promoted, skippedCore };
    }
}
