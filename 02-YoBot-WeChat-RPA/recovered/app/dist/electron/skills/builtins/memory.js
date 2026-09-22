import fs from "fs-extra";
import * as path from "path";
import { randomUUID } from "crypto";
import { config } from "../../config/index.js";
import { MemoryStore } from "../../memory/vector.js";
import { FileMemoryManager } from "../../memory/file_memory.js";
import { embedMemoryMeta, filterAndSanitizeMemoryChunks, isStandingPreference, registerMemoryPreference, } from "../../memory/evolution.js";
import { selectMemoriesForContext } from "../../memory/recall.js";
import { INJECT_MIN_CONFIDENCE } from "../../memory/injection_gate.js";
import { judgeAmbiguousMemoriesWithLlm } from "../../memory/recall_judge.js";
import { getContext } from "../../utils/context.js";
const MEMORY_FILE = "MEMORY.md";
// Singleton MemoryStore instance
let memoryStore = null;
async function getMemoryStore() {
    try {
        return FileMemoryManager.getInstance().getStore();
    }
    catch { }
    if (!memoryStore) {
        memoryStore = new MemoryStore();
        await memoryStore.init();
    }
    return memoryStore;
}
const memoryAppendTool = {
    definition: {
        name: "memory_append",
        description: "Append important information to memory files. Use 'core' ONLY for enduring facts/preferences/rules (NOT for one-off task details like image prompts), and 'daily' for temporary logs/events/reminders specific to today. When the user states who they are or how they want you to behave from now on (identity, role, tone, language, output/coding style), pass memory_key with memory_scope='stable' — that makes it standing context applied to every later turn, which is what the user expects from \"记住…\"/\"以后都…\". Leave recall_policy unset so it is derived; set it only to override.",
        parameters: {
            type: "object",
            properties: {
                content: { type: "string", description: "The content to append to memory" },
                type: { type: "string", enum: ["core", "daily"], default: "core", description: "Memory type: 'core' (default) for long-term knowledge, 'daily' for daily logs." },
                memory_scope: { type: "string", enum: ["stable", "volatile"], default: "stable", description: "Scope: 'stable' for durable preferences, 'volatile' for fast-changing preferences." },
                memory_key: { type: "string", description: "Preference key used for overwrite semantics, e.g. 'video_generation_model'." },
                recall_policy: { type: "string", enum: ["always", "relevant", "search_only"], description: "Override the derived recall policy. Omit by default: a keyed stable preference becomes 'always' (standing context), everything else 'relevant'. Use 'search_only' for archival detail that should only surface on explicit search." },
                ttl_days: { type: "number", description: "Optional validity window in days. Useful for volatile preferences." },
                supersede_previous: { type: "boolean", default: true, description: "Whether this memory should supersede the previous active record with the same memory_key." }
            },
            required: ["content"],
        },
        enterprise: {
            namespace: "memory",
            capability: "append",
            sideEffect: "local",
            risk: "medium",
            reversible: false,
            idempotent: false,
            approval: "policy",
            executionMode: "sequential",
        },
    },
    execute: async ({ content, type = "core", memory_scope = "stable", memory_key, recall_policy, ttl_days, supersede_previous = true }, _signal, context) => {
        let memoryPath;
        let successMsg;
        const userId = context?.userId;
        if (type === "daily") {
            const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
            if (userId) {
                memoryPath = path.join(config.workspaceDir, "memory", "users", userId, "daily", `${today}.md`);
            }
            else {
                memoryPath = path.join(config.workspaceDir, "memory", `${today}.md`);
            }
            successMsg = `Successfully appended to Daily Log (${today}): ${content}`;
        }
        else {
            if (userId) {
                memoryPath = path.join(config.workspaceDir, "memory", "users", userId, "core.md");
            }
            else {
                memoryPath = path.join(config.workspaceDir, MEMORY_FILE);
            }
            successMsg = `Successfully appended to Core Memory: ${content}`;
        }
        // Ensure file exists (including parent dir for daily logs)
        await fs.ensureFile(memoryPath);
        if (typeof content !== "string" || !content.trim()) {
            return "Memory append failed: content must be a non-empty string.";
        }
        let finalContent = content.trim();
        let entryMeta;
        if (type === "core" && (memory_scope === "volatile" || memory_key)) {
            if (!memory_key || typeof memory_key !== "string" || !memory_key.trim()) {
                return "Memory append failed: memory_key is required when memory_scope is volatile.";
            }
            entryMeta = await registerMemoryPreference({
                entryId: randomUUID(),
                key: memory_key.trim(),
                scope: memory_scope,
                userId,
                ttlDays: typeof ttl_days === "number" ? ttl_days : undefined,
                supersedePrevious: supersede_previous !== false,
            });
            finalContent = embedMemoryMeta(finalContent, entryMeta);
            successMsg = `${successMsg} (key=${entryMeta.key}, scope=${entryMeta.scope})`;
        }
        // A keyed stable preference is standing context, so it defaults to `always`.
        // "记住我的回复风格是 X" is not a fact to be retrieved when it happens to
        // match the wording of a question — it governs every answer. An explicit
        // recall_policy argument still wins.
        const explicitPolicy = ["always", "relevant", "search_only"].includes(recall_policy)
            ? recall_policy
            : undefined;
        const recallPolicy = explicitPolicy
            ?? (isStandingPreference(entryMeta ?? null) ? "always" : "relevant");
        const store = await getMemoryStore();
        const relativePath = path.relative(config.workspaceDir, memoryPath).replace(/\\/g, "/");
        const existingIds = new Set(store.listAll(userId)
            .filter((chunk) => chunk.path === relativePath)
            .map((chunk) => chunk.id)
            .filter((id) => !!id));
        const timestamp = new Date().toISOString();
        const entry = `\n- [${timestamp}] ${finalContent}`;
        await fs.appendFile(memoryPath, entry);
        await FileMemoryManager.getInstance().syncFile(relativePath);
        for (const chunk of store.listAll(userId)) {
            if (!chunk.id || chunk.path !== relativePath || existingIds.has(chunk.id))
                continue;
            store.getMetaStore().setMeta(chunk.id, {
                recallPolicy,
                memoryType: type === "daily" ? "session_summary" : "preference",
            });
        }
        console.log(`[Memory] Triggered immediate sync for ${relativePath}`);
        return successMsg;
    },
};
const knowledgeSearchTool = {
    definition: {
        name: "knowledge_search",
        description: "Search the long-term memory (user info, past conversations) AND internal knowledge base (docs, business rules). Use this to recall user preferences or domain knowledge.",
        parameters: {
            type: "object",
            properties: {
                query: { type: "string", description: "The search query (e.g. 'user identity', 'deployment process')" },
                limit: { type: "number", description: "Max number of results (default: 5)" }
            },
            required: ["query"],
        },
        enterprise: {
            namespace: "memory",
            capability: "search",
            sideEffect: "none",
            risk: "medium",
            reversible: true,
            idempotent: true,
            approval: "never",
            executionMode: "parallel",
        },
    },
    execute: async ({ query, limit = 5 }, _signal, context) => {
        try {
            const store = await getMemoryStore();
            // A resolved Expert resource policy is authoritative: search only its exact knowledge
            // path prefixes and never fall back to the legacy user/global-memory filter.
            const requestContext = getContext();
            const resourcePolicy = requestContext?.resourcePolicy;
            const namespaces = resourcePolicy?.knowledgeNamespaces
                .map((namespace) => namespace.trim())
                .filter(Boolean) ?? [];
            if (resourcePolicy && namespaces.length === 0) {
                return "No knowledge namespace is granted to this run.";
            }
            const userId = context?.userId;
            const requestedLimit = Math.max(1, Math.min(10, Number(limit) || 5));
            const candidates = await store.searchCandidates(query, Math.max(20, requestedLimit * 4), resourcePolicy ? { namespaces } : { userId });
            const filteredCandidates = await filterAndSanitizeMemoryChunks(candidates);
            store.recordRetrieved(filteredCandidates.map((candidate) => candidate.id).filter((id) => !!id));
            const selection = await selectMemoriesForContext(query, filteredCandidates, {
                mode: "explicit",
                maxRelevantMemories: requestedLimit,
                maxAlwaysMemories: requestedLimit,
                maxInjectedChars: 8000,
                judge: judgeAmbiguousMemoriesWithLlm,
            });
            if (selection.admitted.length === 0)
                return "No sufficiently relevant memory or knowledge found.";
            const injectedIds = selection.admitted
                .map((candidate) => candidate.id)
                .filter((id) => !!id);
            store.recordInjected(injectedIds);
            if (requestContext) {
                const existing = Array.isArray(requestContext.memoryGroundingCandidates)
                    ? requestContext.memoryGroundingCandidates
                    : [];
                requestContext.memoryGroundingCandidates = [...existing, ...selection.admitted];
            }
            // Explicit search deliberately looks below the confidence gate (design
            // §3.1), but this result becomes permanent session context — the very
            // channel the gate protects. Unconfirmed candidates must therefore stay
            // labelled, or an auto-extracted guess reads as established fact.
            return selection.admitted
                .map((result) => {
                const unconfirmed = !result.meta.confirmedByUser
                    && result.meta.confidence < INJECT_MIN_CONFIDENCE;
                const prefix = unconfirmed
                    ? "[候选记忆·未经用户确认，仅供参考，不要当作已确认事实] "
                    : "";
                return `${prefix}[Source: ${result.path}]\n${result.text}`;
            })
                .join("\n\n---\n\n");
        }
        catch (e) {
            return `Search failed: ${e.message}`;
        }
    },
};
const readCachedDetailTool = {
    definition: {
        name: "read_cached_detail",
        description: "Read the complete, raw content of a large output (e.g. log, file, browser snapshot) that was intercepted and cached by the Context Pruner to save tokens. Use this when the L1 summary indicates you need more specific details.",
        parameters: {
            type: "object",
            properties: {
                id: { type: "string", description: "The cache ID provided in the system prompt or L1 summary (e.g., 'cache_123456_abcde')." }
            },
            required: ["id"]
        },
        enterprise: {
            namespace: "memory",
            capability: "read_cached_detail",
            sideEffect: "none",
            risk: "medium",
            reversible: true,
            idempotent: true,
            approval: "never",
            estimatedCostClass: "free",
            executionMode: "parallel",
        },
    },
    execute: async ({ id }) => {
        try {
            if (!id || typeof id !== "string")
                return "Error: Invalid cache ID.";
            const cacheDir = path.resolve(process.env.USER_DATA_PATH || process.cwd(), "data", "context_cache");
            const cachePath = path.join(cacheDir, `${id}.txt`);
            if (!fs.existsSync(cachePath)) {
                return `Error: Cache file not found for ID: ${id}. It may have expired or been deleted.`;
            }
            const content = await fs.readFile(cachePath, "utf-8");
            return `=== RAW CACHED CONTENT [ID: ${id}] ===\n${content}`;
        }
        catch (e) {
            return `Error reading cache: ${e.message}`;
        }
    }
};
export const memorySkill = {
    name: "memory",
    description: "Long-term memory management tools",
    tools: [memoryAppendTool, knowledgeSearchTool, readCachedDetailTool],
};
