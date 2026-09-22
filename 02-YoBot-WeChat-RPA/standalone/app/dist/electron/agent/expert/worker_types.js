import { extractText } from "../../utils/content.js";
export const EXPERT_WORKER_CONTEXT_MAX_MESSAGES = 4;
export const EXPERT_WORKER_CONTEXT_MAX_CHARS = 6_000;
export const EXPERT_WORKER_CONTEXT_MAX_BYTES = 24_000;
export const EXPERT_WORKER_OBJECTIVE_MAX_CHARS = 20_000;
export const EXPERT_WORKER_OBJECTIVE_MAX_BYTES = 64_000;
export const EXPERT_WORKER_CONTINUATION_TTL_MS = 10 * 60_000;
export const EXPERT_WORKER_MAX_CLARIFICATION_ROUNDS = 1;
const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;
const VERSION_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9.+_-]{0,63}$/;
function cleanRefPart(value, pattern) {
    if (typeof value !== "string")
        return undefined;
    const clean = value.trim();
    return pattern.test(clean) ? clean : undefined;
}
/** Strict parser for the additive Message.metadata.selectedExpertRef contract. */
export function parseSelectedExpertRef(metadata) {
    if (!metadata || typeof metadata !== "object"
        || !Object.prototype.hasOwnProperty.call(metadata, "selectedExpertRef"))
        return { present: false };
    const raw = metadata.selectedExpertRef;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return { present: true, error: "invalid_selected_expert_ref" };
    }
    const value = raw;
    const definitionId = cleanRefPart(value.definitionId, ID_PATTERN);
    const definitionVersion = cleanRefPart(value.definitionVersion, VERSION_PATTERN);
    const jobId = value.jobId === undefined ? undefined : cleanRefPart(value.jobId, ID_PATTERN);
    if (!definitionId || !definitionVersion || (value.jobId !== undefined && !jobId)) {
        return { present: true, error: "invalid_selected_expert_ref" };
    }
    return {
        present: true,
        ref: { definitionId, definitionVersion, ...(jobId ? { jobId } : {}) },
    };
}
/**
 * Deterministic projection for explicit Expert routing. System/tool messages and the full main
 * history never cross the boundary. The current user request is supplied separately as objective.
 */
export function projectExpertWorkerContext(history, limits = {}) {
    const maxMessages = Math.max(0, limits.maxMessages ?? EXPERT_WORKER_CONTEXT_MAX_MESSAGES);
    const maxChars = Math.max(0, limits.maxChars ?? EXPERT_WORKER_CONTEXT_MAX_CHARS);
    if (maxMessages === 0 || maxChars === 0)
        return undefined;
    const candidates = history
        .filter((message) => message.role === "user" || message.role === "assistant")
        .map((message) => ({ role: message.role, content: extractText(message.content).trim() }))
        .filter((message) => message.content.length > 0)
        .slice(-maxMessages);
    const selected = [];
    let remaining = maxChars;
    for (let index = candidates.length - 1; index >= 0 && remaining > 0; index--) {
        const candidate = candidates[index];
        const content = candidate.content.slice(-remaining);
        if (!content)
            continue;
        selected.unshift({ ...candidate, content });
        remaining -= content.length;
    }
    return selected.length > 0 ? JSON.stringify(selected) : undefined;
}
export function expertWorkerDisplayText(result) {
    if (result.status === "completed")
        return result.text;
    if (result.status === "partial") {
        // 「回复"继续完成"」曾经写在这里，但 continuation 只对 needs_input 生效
        // （worker_service 只在澄清提问时返回 continuation），partial 并不会真的接着写。
        // 承诺一个不存在的机制，比不提更糟。
        const limit = result.code === "max_output_tokens_exceeded" ? "单次输出上限" : "执行时限";
        return `${result.text.trim()}\n\n> 本次专家已达到${limit}，以上为已生成的部分内容，可能不完整。需要的话可以让我接着往下写。`;
    }
    if (result.status === "needs_input") {
        const questions = result.questions?.length ? result.questions.join("\n") : result.message;
        return `专家需要补充信息：\n${questions}`;
    }
    if (result.status === "blocked")
        return `专家暂时无法执行：${result.message}`;
    return `专家执行失败：${result.message}`;
}
/** Privacy-safe metadata projection for the main chat record/tool result. */
export function expertWorkerResultMetadata(result) {
    return {
        status: result.status,
        definitionId: result.definitionId,
        definitionVersion: result.definitionVersion,
        ...(result.jobId ? { jobId: result.jobId } : {}),
        ...(result.runId ? { runId: result.runId } : {}),
        ...(result.policyDigest ? { policyDigest: result.policyDigest } : {}),
        ...(result.turnMode ? { turnMode: result.turnMode } : {}),
        ...(result.status !== "completed" ? { code: result.code } : {}),
    };
}
