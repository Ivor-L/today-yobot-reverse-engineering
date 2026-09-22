/**
 * Task-outcome memory extraction (docs/TASK_MEMORY_DESIGN.md §2).
 *
 * After a top-level run finishes, look at THIS run's tool activity (messages
 * after the last user turn) and decide whether the task left anything worth
 * remembering. Admission is gated by deterministic trace signals — no signal,
 * no write, no LLM call:
 * - S1 fail→success: a tool errored and a later call of the same tool
 *   succeeded (trial-and-error cost was paid; the lesson has reuse value);
 * - S2 artifact: a file path was produced (retrieval anchor for later runs);
 * - S3 env change: install/config commands — annotation only, helps the
 *   distiller separate one-time changes from actions needed on every run.
 *
 * On signal, ONE distillation LLM call produces at most one daily entry
 * (episodic, stored as CANDIDATE below the injection gate → knowledge_search
 * only, never regular RAG) plus skill lessons ("actions that must be redone
 * every execution") written to skill_notes with supersede semantics.
 *
 * Same operational constraints as turn_extractor.ts: fire-and-forget from
 * kernel.run()'s finally block, never blocks run settlement, swallows errors,
 * traceable via the run's trace file.
 */
import * as fs from "fs";
import * as path from "path";
import { LLMManager } from "../agent/llm/manager.js";
import { isMemoryWriteAllowed } from "../agent/profile/resolver.js";
import { FileMemoryManager } from "./file_memory.js";
import { config } from "../config/index.js";
import { CANDIDATE_CONFIDENCE } from "./injection_gate.js";
import { matchesExistingFact, extractUserText } from "./turn_extractor.js";
import { SkillNotesStore, sanitizeSkillId, sanitizeNoteKey, MAX_LESSON_CHARS } from "./skill_notes.js";
export const MAX_DAILY_ENTRY_CHARS = 300;
export const MAX_LESSONS_PER_TASK = 3;
const MAX_TRACE_RUNS = 20;
const MAX_RESULT_CHARS = 300;
const MAX_ARGS_CHARS = 200;
const MAX_ARTIFACTS = 5;
/** Messages belonging to the current run: everything after the last user turn. */
export function sliceCurrentRun(messages) {
    if (!Array.isArray(messages))
        return [];
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i]?.role === "user")
            return messages.slice(i + 1);
    }
    return [];
}
/** The user intent driving the current run (text of the last user message). */
export function lastUserIntent(messages, maxChars = 200) {
    if (!Array.isArray(messages))
        return "";
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i]?.role === "user") {
            const text = extractUserText(messages[i].content).trim();
            return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
        }
    }
    return "";
}
function textOfContent(content, maxChars) {
    let text = "";
    if (typeof content === "string")
        text = content;
    else if (Array.isArray(content)) {
        text = content
            .filter((p) => p?.type === "text" && typeof p.text === "string")
            .map((p) => p.text)
            .join("\n");
    }
    text = text.trim();
    return text.length > maxChars ? text.slice(0, maxChars) : text;
}
/**
 * Join assistant toolCall parts with their toolResult messages, in execution
 * order. Error detection prefers the explicit isError flag set by the adapter
 * (adapter.ts convertTools) and falls back to details.error / the adapter's
 * own error-text prefix, never on loose keyword matching over result text.
 */
export function collectToolRuns(messages) {
    const nameById = new Map();
    const argsById = new Map();
    const runs = [];
    for (const m of Array.isArray(messages) ? messages : []) {
        if (!m)
            continue;
        if (m.role === "assistant" && Array.isArray(m.content)) {
            for (const part of m.content) {
                if (part?.type !== "toolCall" && part?.type !== "tool_call")
                    continue;
                const id = part.id || part.toolCallId || part.tool_call_id;
                if (!id)
                    continue;
                nameById.set(id, part.name || "unknown");
                try {
                    argsById.set(id, JSON.stringify(part.arguments ?? part.args ?? {}).slice(0, MAX_ARGS_CHARS));
                }
                catch {
                    argsById.set(id, "");
                }
            }
        }
        else if (m.role === "toolResult" || m.role === "tool") {
            const id = m.toolCallId || m.tool_call_id;
            const text = textOfContent(m.content, MAX_RESULT_CHARS);
            const isError = m.isError === true
                || !!m.details?.error
                || /^Error executing tool /.test(text);
            runs.push({
                name: (id && nameById.get(id)) || m.toolName || "unknown",
                isError,
                text,
                argsText: (id && argsById.get(id)) || "",
            });
        }
    }
    return runs;
}
const ARTIFACT_PATH_RE = /[^\s"'`<>|*?，。；：]+\.(?:pptx?|docx?|xlsx?|pdf|html?|png|jpe?g|gif|csv|md|mp4|mp3|zip|txt)\b/gi;
const ENV_CHANGE_RE = /\b(?:pip3?|npm|pnpm|yarn|apt(?:-get)?|brew|choco|winget)\s+(?:install|add)\b|\bsetx\s+\w+|\bexport\s+\w+=|\$env:\w+\s*=/gi;
export function detectSignals(runs) {
    // S1: same tool errored, then succeeded later.
    const retried = new Set();
    const errored = new Set();
    for (const run of runs) {
        if (run.isError)
            errored.add(run.name);
        else if (errored.has(run.name))
            retried.add(run.name);
    }
    // S2: path-like tokens with artifact extensions in successful results/args.
    const artifacts = [];
    const seenArtifacts = new Set();
    for (const run of runs) {
        if (run.isError)
            continue;
        for (const source of [run.text, run.argsText]) {
            for (const m of source.matchAll(ARTIFACT_PATH_RE)) {
                const token = m[0].replace(/[),.，。]+$/, "");
                // Require a path separator so bare filenames in prose don't count.
                if (!/[\\/]/.test(token))
                    continue;
                const norm = token.toLowerCase();
                if (seenArtifacts.has(norm))
                    continue;
                seenArtifacts.add(norm);
                artifacts.push(token);
                if (artifacts.length >= MAX_ARTIFACTS)
                    break;
            }
            if (artifacts.length >= MAX_ARTIFACTS)
                break;
        }
        if (artifacts.length >= MAX_ARTIFACTS)
            break;
    }
    // S3: install/config command snippets (annotation for the distiller).
    const envChanges = [];
    const seenEnv = new Set();
    for (const run of runs) {
        for (const source of [run.argsText, run.text]) {
            for (const m of source.matchAll(ENV_CHANGE_RE)) {
                const snippet = m[0].trim();
                if (seenEnv.has(snippet))
                    continue;
                seenEnv.add(snippet);
                envChanges.push(snippet);
            }
        }
    }
    return { retriedTools: [...retried], artifacts, envChanges };
}
/** Compact trace text for the distiller: all error runs + the tail of the run list. */
export function buildTraceSummary(runs, maxRuns = MAX_TRACE_RUNS) {
    let selected = runs;
    if (runs.length > maxRuns) {
        const errors = runs.filter((r) => r.isError);
        const tail = runs.slice(-Math.max(1, maxRuns - errors.length));
        const picked = new Set([...errors.slice(0, maxRuns), ...tail]);
        selected = runs.filter((r) => picked.has(r));
        selected = selected.slice(0, maxRuns);
    }
    return selected
        .map((r, i) => {
        const status = r.isError ? "ERROR" : "ok";
        const args = r.argsText ? ` args=${r.argsText}` : "";
        return `${i + 1}. [${status}] ${r.name}${args} => ${r.text.replace(/\s+/g, " ")}`;
    })
        .join("\n");
}
const DISTILL_SYSTEM_PROMPT = [
    "你是任务记忆蒸馏器。输入是一次 Agent 任务的用户意图、可用技能列表和工具执行轨迹摘要。",
    '输出严格 JSON 对象：{"daily_entry": string|null, "skill_lessons": [{"skill_id": string, "key": string, "lesson": string}]}',
    `- daily_entry：一句话工作日志，必须包含做了什么、产物文件路径（若有）、使用的技能（若能确定），≤${MAX_DAILY_ENTRY_CHARS}字符。既无产物也无试错教训时输出 null。`,
    "- skill_lessons：只收录\"下次执行该技能时每次都需要重做的动作\"（如运行时环境变量、必须的参数、必要的前置步骤）。",
    "  一次性环境变更（安装依赖、创建目录）明确排除——它们已经生效，下次不会再错。",
    "  skill_id 必须从提供的技能列表中选择；无法归属到某个技能的教训不要输出。",
    "  key 用简短英文蛇形命名（如 runtime_env）；同类教训合并为一条。",
    `- 最多 ${MAX_LESSONS_PER_TASK} 条教训。没有值得记录的内容输出 {"daily_entry": null, "skill_lessons": []}。`,
    "只输出 JSON，不要任何其他文字。",
].join("\n");
/** Parse the distiller response; invalid parts degrade to empty, never throw. */
export function parseDistillResponse(raw, knownSkillIds) {
    const empty = { dailyEntry: null, lessons: [] };
    if (!raw || typeof raw !== "string")
        return empty;
    let text = raw.trim();
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence)
        text = fence[1].trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start)
        return empty;
    let parsed;
    try {
        parsed = JSON.parse(text.slice(start, end + 1));
    }
    catch {
        return empty;
    }
    if (!parsed || typeof parsed !== "object")
        return empty;
    let dailyEntry = null;
    if (typeof parsed.daily_entry === "string" && parsed.daily_entry.trim().length >= 8) {
        dailyEntry = parsed.daily_entry.trim().replace(/\s+/g, " ").slice(0, MAX_DAILY_ENTRY_CHARS);
    }
    const lessons = [];
    if (Array.isArray(parsed.skill_lessons)) {
        for (const item of parsed.skill_lessons) {
            if (!item || typeof item !== "object")
                continue;
            const skillId = sanitizeSkillId(String(item.skill_id ?? ""));
            const key = sanitizeNoteKey(String(item.key ?? ""));
            const lesson = typeof item.lesson === "string" ? item.lesson.trim() : "";
            if (!skillId || !key || lesson.length < 4)
                continue;
            if (!knownSkillIds.has(skillId))
                continue; // unattributable → drop
            lessons.push({ skillId, key, lesson: lesson.slice(0, MAX_LESSON_CHARS) });
            if (lessons.length >= MAX_LESSONS_PER_TASK)
                break;
        }
    }
    return { dailyEntry, lessons };
}
export class TaskOutcomeExtractor {
    static instance;
    inFlight = new Set();
    static getInstance() {
        if (!TaskOutcomeExtractor.instance) {
            TaskOutcomeExtractor.instance = new TaskOutcomeExtractor();
        }
        return TaskOutcomeExtractor.instance;
    }
    isEnabled() {
        return process.env.YOKO_TASK_EXTRACTOR_ENABLED !== "false";
    }
    /**
     * Fire-and-forget entry point (call from kernel.run() finally, do NOT await).
     * `skills` is the enabled-skill catalog used for lesson attribution; ids not
     * in it are dropped at parse time.
     */
    maybeExtract(params) {
        if (!this.isEnabled())
            return;
        const { sessionId } = params;
        // 与 turn_extractor 同源:写端隔离由 profile.memoryNamespace.write 声明。
        if (!isMemoryWriteAllowed(sessionId))
            return;
        if (this.inFlight.has(sessionId))
            return;
        this.inFlight.add(sessionId);
        this.runExtraction(params)
            .catch((e) => {
            console.warn("[TaskExtractor] extraction failed (non-fatal):", e?.message || e);
            try {
                params.trace?.({ stage: "error", error: String(e?.message || e) });
            }
            catch { /* ignore */ }
        })
            .finally(() => this.inFlight.delete(sessionId));
    }
    async runExtraction(params) {
        const { sessionId, messages, trace } = params;
        const userId = params.userId || "user_default";
        const skills = params.skills || [];
        const runSlice = sliceCurrentRun(messages);
        const runs = collectToolRuns(runSlice);
        if (runs.length === 0) {
            trace?.({ stage: "skipped", reason: "no_tool_activity" });
            return;
        }
        const signals = detectSignals(runs);
        // Admission gate: S1 or S2 required. No signal → zero writes, zero LLM cost.
        if (signals.retriedTools.length === 0 && signals.artifacts.length === 0) {
            trace?.({ stage: "skipped", reason: "no_signals", toolRuns: runs.length });
            return;
        }
        trace?.({
            stage: "signals",
            retriedTools: signals.retriedTools,
            artifacts: signals.artifacts,
            envChanges: signals.envChanges.slice(0, 5),
            toolRuns: runs.length,
        });
        const intent = lastUserIntent(messages);
        const { outcome, rawPreview } = await this.callLLM(intent, runs, signals, skills);
        if (!outcome.dailyEntry && outcome.lessons.length === 0) {
            console.log(`[TaskExtractor] session=${sessionId} distiller returned nothing. Raw: ${rawPreview}`);
            trace?.({ stage: "empty", rawPreview });
            return;
        }
        const persisted = await this.persist(outcome, userId);
        console.log(`[TaskExtractor] session=${sessionId} persisted daily=${persisted.dailyWritten} lessons=${persisted.lessonsWritten}`);
        trace?.({
            stage: "persisted",
            dailyWritten: persisted.dailyWritten,
            dailySkippedDup: persisted.dailySkippedDup,
            lessonsWritten: persisted.lessonsWritten,
            dailyPreview: outcome.dailyEntry?.slice(0, 80),
            lessons: outcome.lessons.map((l) => ({ skillId: l.skillId, key: l.key })),
        });
    }
    async callLLM(intent, runs, signals, skills) {
        const emptyOutcome = { dailyEntry: null, lessons: [] };
        const llmManager = LLMManager.getInstance();
        if (!llmManager.getAuthToken())
            return { outcome: emptyOutcome, rawPreview: "(no auth token)" };
        const client = llmManager.getClient();
        const model = llmManager.getModelName();
        const knownSkillIds = new Set();
        for (const s of skills) {
            const safe = sanitizeSkillId(s.name);
            if (safe)
                knownSkillIds.add(safe);
        }
        const sections = [
            `用户意图：${intent || "（未知）"}`,
            `可用技能列表：${skills.map((s) => s.name).join(", ") || "（无）"}`,
            signals.envChanges.length > 0
                ? `检测到的一次性环境变更（不要写入教训）：${signals.envChanges.slice(0, 5).join("; ")}`
                : "",
            "工具执行轨迹：",
            buildTraceSummary(runs),
        ].filter(Boolean);
        const response = await client.chat.completions.create({
            model,
            messages: [
                { role: "system", content: DISTILL_SYSTEM_PROMPT },
                { role: "user", content: sections.join("\n\n") },
            ],
            max_tokens: 500,
            temperature: 0,
        });
        const raw = response.choices?.[0]?.message?.content || "";
        return { outcome: parseDistillResponse(raw, knownSkillIds), rawPreview: raw.slice(0, 200) };
    }
    async persist(outcome, userId) {
        let dailyWritten = false;
        let dailySkippedDup = false;
        if (outcome.dailyEntry) {
            const fileMemory = FileMemoryManager.getInstance();
            const store = fileMemory.getStore();
            const metaStore = store.getMetaStore();
            const today = new Date().toISOString().split("T")[0];
            const relPath = `memory/users/${userId}/daily/${today}.md`;
            const existing = await store.getChunksByPath(relPath);
            if (existing.some((c) => matchesExistingFact(outcome.dailyEntry, c.text))) {
                dailySkippedDup = true;
            }
            else {
                const knownIdsBefore = new Set(existing.map((c) => c.id));
                const absPath = path.join(config.workspaceDir, relPath);
                fs.mkdirSync(path.dirname(absPath), { recursive: true });
                fs.appendFileSync(absPath, `\n- [${new Date().toISOString()}] ${outcome.dailyEntry}`, "utf-8");
                await fileMemory.syncFile(relPath);
                // Candidate confidence: below the injection gate — visible to
                // knowledge_search / Memory UI, never regular RAG injection.
                const after = await store.getChunksByPath(relPath);
                for (const chunk of after) {
                    if (knownIdsBefore.has(chunk.id))
                        continue;
                    metaStore.setMeta(chunk.id, {
                        confidence: CANDIDATE_CONFIDENCE,
                        memoryType: "session_summary",
                    });
                }
                metaStore.flush();
                dailyWritten = true;
            }
        }
        let lessonsWritten = 0;
        const notesStore = SkillNotesStore.getInstance();
        for (const lesson of outcome.lessons) {
            if (notesStore.upsertLesson(lesson.skillId, lesson.key, lesson.lesson))
                lessonsWritten++;
        }
        return { dailyWritten, dailySkippedDup, lessonsWritten };
    }
}
