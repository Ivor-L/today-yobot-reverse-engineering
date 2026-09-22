/**
 * Skill-scoped operational notes (task memory design, docs/TASK_MEMORY_DESIGN.md §2.3/§3).
 *
 * One file per skill: memory/skills/<skillId>/notes.md, entries `- [key] lesson`.
 * Lessons are "actions that must be redone on every execution" (runtime env vars,
 * required flags) — NOT one-time environment changes. Same key overwrites
 * (supersede), the file is hard-capped so a skill's notes can never grow past
 * MAX_NOTES_BYTES, and the whole directory is EXCLUDED from the vector index
 * (file_memory.ts): recall is deterministic at skill dispatch, never via RAG,
 * so a lesson can't be mis-hit by an unrelated query.
 */
import * as fs from "fs";
import * as path from "path";
import { config } from "../config/index.js";
export const MAX_NOTES_BYTES = 2048;
export const MAX_LESSON_CHARS = 300;
export const MAX_KEY_CHARS = 40;
const MAX_TRACKED_SESSIONS = 200;
/**
 * Sanitize a skill id into a safe directory name (path traversal / separator
 * characters stripped). Returns null when nothing usable remains.
 */
export function sanitizeSkillId(skillId) {
    if (typeof skillId !== "string")
        return null;
    const cleaned = skillId.trim().replace(/[^\w.-]+/g, "_").replace(/^[._]+|[._]+$/g, "");
    if (!cleaned || cleaned.length > 64)
        return null;
    return cleaned;
}
/** Sanitize a lesson key: word chars and dashes only, bounded length. */
export function sanitizeNoteKey(key) {
    if (typeof key !== "string")
        return null;
    const cleaned = key.trim().replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "");
    if (!cleaned)
        return null;
    return cleaned.slice(0, MAX_KEY_CHARS);
}
/** Parse `- [key] lesson` lines; unknown lines are ignored (header, blanks). */
export function parseNotes(content) {
    const entries = [];
    for (const line of (content || "").split("\n")) {
        const m = line.match(/^-\s*\[([^\]]+)\]\s*(.+)$/);
        if (!m)
            continue;
        const key = sanitizeNoteKey(m[1]);
        const lesson = m[2].trim();
        if (key && lesson)
            entries.push({ key, lesson });
    }
    return entries;
}
export function serializeNotes(skillId, entries) {
    const lines = entries.map((e) => `- [${e.key}] ${e.lesson}`);
    return `# Skill Notes: ${skillId}\n\n${lines.join("\n")}\n`;
}
/**
 * Upsert a lesson into the entry list with supersede semantics (same key
 * replaces in place, preserving age order) and evict oldest entries while the
 * serialized size exceeds maxBytes. The just-written key is never evicted.
 */
export function upsertNote(entries, key, lesson, maxBytes = MAX_NOTES_BYTES) {
    const trimmed = lesson.trim().replace(/\s+/g, " ").slice(0, MAX_LESSON_CHARS);
    const next = entries.filter((e) => e.key); // defensive copy
    const idx = next.findIndex((e) => e.key === key);
    if (idx >= 0)
        next[idx] = { key, lesson: trimmed };
    else
        next.push({ key, lesson: trimmed });
    const size = (list) => Buffer.byteLength(list.map((e) => `- [${e.key}] ${e.lesson}`).join("\n"), "utf-8");
    while (next.length > 1 && size(next) > maxBytes) {
        const evictIdx = next.findIndex((e) => e.key !== key);
        if (evictIdx < 0)
            break;
        next.splice(evictIdx, 1);
    }
    return next;
}
/** Format entries as the block prepended into a tool result at injection time. */
export function buildNotesBlock(skillId, entries) {
    if (entries.length === 0)
        return "";
    const lines = entries.map((e) => `- ${e.lesson}`);
    return `[技能备忘 ${skillId}]（此前执行该技能沉淀的注意事项，请在后续步骤中遵循）\n${lines.join("\n")}`;
}
export class SkillNotesStore {
    static instance;
    rootDir;
    /** sessionId -> skillIds already injected this session (insertion-ordered for pruning). */
    injected = new Map();
    constructor(rootDir) {
        this.rootDir = rootDir || config.workspaceDir;
    }
    static getInstance() {
        if (!SkillNotesStore.instance) {
            SkillNotesStore.instance = new SkillNotesStore();
        }
        return SkillNotesStore.instance;
    }
    isEnabled() {
        return process.env.YOKO_SKILL_NOTES_ENABLED !== "false";
    }
    notesPath(safeSkillId) {
        return path.join(this.rootDir, "memory", "skills", safeSkillId, "notes.md");
    }
    getEntries(skillId) {
        const safe = sanitizeSkillId(skillId);
        if (!safe)
            return [];
        try {
            const p = this.notesPath(safe);
            if (!fs.existsSync(p))
                return [];
            return parseNotes(fs.readFileSync(p, "utf-8"));
        }
        catch {
            return [];
        }
    }
    /** Supersede-write a lesson. Returns false when ids/keys are unusable. */
    upsertLesson(skillId, key, lesson) {
        const safe = sanitizeSkillId(skillId);
        const safeKey = sanitizeNoteKey(key);
        if (!safe || !safeKey || !lesson || !lesson.trim())
            return false;
        try {
            const p = this.notesPath(safe);
            const existing = fs.existsSync(p) ? parseNotes(fs.readFileSync(p, "utf-8")) : [];
            const next = upsertNote(existing, safeKey, lesson);
            fs.mkdirSync(path.dirname(p), { recursive: true });
            fs.writeFileSync(p, serializeNotes(safe, next), "utf-8");
            return true;
        }
        catch (e) {
            console.warn(`[SkillNotes] failed to upsert lesson for ${skillId}:`, e);
            return false;
        }
    }
    /**
     * Injection read with once-per-session-per-skill de-dup: returns the notes
     * block on the FIRST call for a (session, skill) pair that has notes, and
     * null on every later call. Kernel prepends the block into the tool result
     * at creation time (append-only history, cache-safe).
     */
    readInjectionBlock(sessionId, skillId) {
        if (!this.isEnabled())
            return null;
        const safe = sanitizeSkillId(skillId);
        if (!safe || !sessionId)
            return null;
        const seen = this.injected.get(sessionId);
        if (seen?.has(safe))
            return null;
        const entries = this.getEntries(safe);
        if (entries.length === 0)
            return null;
        if (seen)
            seen.add(safe);
        else {
            this.injected.set(sessionId, new Set([safe]));
            // Bound the tracker: drop the oldest session entries.
            while (this.injected.size > MAX_TRACKED_SESSIONS) {
                const oldest = this.injected.keys().next().value;
                if (oldest === undefined)
                    break;
                this.injected.delete(oldest);
            }
        }
        return buildNotesBlock(safe, entries);
    }
}
