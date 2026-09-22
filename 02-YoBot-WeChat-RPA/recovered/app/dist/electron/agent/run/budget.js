export const EXPERT_AGENT_RUN_DEFAULT_MAX_TURNS = 12;
export const EXPERT_AGENT_RUN_DEFAULT_MAX_TOOL_CALLS = 20;
/**
 * 跑飞护栏，不是长度上限。
 *
 * 它以前被当成「这一档该回多长」用（consult 档 2048），而 estimateAgentRunTokens 对中文
 * 按每字 1 token 计，于是 2048 实际≈2048 个汉字——正好落在一份中文咨询回答的长度区间里：
 * 2026-09-13 线上，2364 字的回答过了，2732 字的被拦腰截断，用户拿到半句话。
 *
 * 模型从来不知道这个数（它不会作为 max_tokens 发出去，提示词里也没有长度要求），所以它
 * 只会在写到一半时被本地掐断。真正该约束 worker 的是轮数 / 工具调用数 / 时限——这也是
 * 业界（OpenAI Agents SDK 的 max_turns、LangGraph 的 recursion_limit）的做法；输出长度
 * 交给模型自己的上限，截断了由 output_truncation.ts 统一提示，那条路对所有模型一致，
 * 不需要我们逐个模型配。
 *
 * 所以这里只保留一个足够高的天花板，用来兜住「模型停不下来」这种病态情况。
 */
export const EXPERT_AGENT_RUN_DEFAULT_MAX_OUTPUT_TOKENS = 16_384;
export const EXPERT_WORKER_MAX_INPUT_TOKENS = 32_000;
export const EXPERT_DIRECT_MAX_INPUT_TOKENS = 24_000;
/**
 * A deterministic runtime failure used at model/tool boundaries. It is intentionally
 * non-retryable: retrying the same immutable AgentRun cannot make its budget larger.
 */
export class AgentRunBudgetExceededError extends Error {
    code;
    limit;
    observed;
    retryable = false;
    constructor(code, limit, observed) {
        super(`AgentRun budget ${code} (limit=${limit}, observed=${observed}).`);
        this.code = code;
        this.limit = limit;
        this.observed = observed;
        this.name = "AgentRunBudgetExceededError";
    }
}
export function createAgentRunRuntimeBudget(limits) {
    return {
        maxTurns: limits.maxTurns,
        maxToolCalls: limits.maxToolCalls,
        maxOutputTokens: limits.maxOutputTokens,
        turns: 0,
        toolCalls: 0,
        outputText: "",
    };
}
/** Conservative tokenizer used only for hard safety ceilings and usage estimates. */
export function estimateAgentRunTokens(value) {
    if (value === undefined || value === null)
        return 0;
    if (typeof value === "string") {
        const nonAscii = (value.match(/[^\x00-\x7F]/g) || []).length;
        return Math.max(value.length > 0 ? 1 : 0, nonAscii + Math.ceil((value.length - nonAscii) / 4));
    }
    if (Array.isArray(value)) {
        return value.reduce((sum, item) => sum + estimateAgentRunTokens(item), 0);
    }
    if (typeof value === "object") {
        const object = value;
        // Data URIs are transport bytes, not prompt text. Charge a conservative fixed vision
        // allowance without treating base64 expansion as millions of text tokens.
        if (object.type === "image" || object.type === "image_url")
            return 1_024;
        if ("content" in object)
            return estimateAgentRunTokens(object.content) + 4;
        try {
            return estimateAgentRunTokens(JSON.stringify(object));
        }
        catch {
            return 1;
        }
    }
    return estimateAgentRunTokens(String(value));
}
export function estimateAgentRunInputTokens(userMessage, history) {
    return estimateAgentRunTokens(userMessage)
        + history.reduce((sum, message) => sum + estimateAgentRunTokens(message), 0);
}
export function assertAgentRunInputBudget(userMessage, history, maxInputTokens) {
    const observed = estimateAgentRunInputTokens(userMessage, history);
    if (maxInputTokens !== undefined && observed > maxInputTokens) {
        throw new AgentRunBudgetExceededError("max_input_tokens_exceeded", maxInputTokens, observed);
    }
    return observed;
}
export function consumeAgentRunTurn(budget) {
    if (!budget)
        return;
    budget.turns++;
    if (budget.maxTurns !== undefined && budget.turns > budget.maxTurns) {
        throw new AgentRunBudgetExceededError("max_turns_exceeded", budget.maxTurns, budget.turns);
    }
}
export function consumeAgentRunToolCall(budget) {
    if (!budget)
        return;
    budget.toolCalls++;
    if (budget.maxToolCalls !== undefined && budget.toolCalls > budget.maxToolCalls) {
        throw new AgentRunBudgetExceededError("max_tool_calls_exceeded", budget.maxToolCalls, budget.toolCalls);
    }
}
export function consumeAgentRunOutputText(budget, delta) {
    if (!budget || !delta)
        return;
    budget.outputText += delta;
    const observed = estimateAgentRunTokens(budget.outputText);
    if (budget.maxOutputTokens !== undefined && observed > budget.maxOutputTokens) {
        throw new AgentRunBudgetExceededError("max_output_tokens_exceeded", budget.maxOutputTokens, observed);
    }
}
