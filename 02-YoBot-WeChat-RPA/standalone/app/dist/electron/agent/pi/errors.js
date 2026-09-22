export class AgentError extends Error {
    code;
    retryable;
    constructor(message, code, retryable = false) {
        super(message);
        this.code = code;
        this.retryable = retryable;
        this.name = "AgentError";
    }
}
export class ContextOverflowError extends AgentError {
    constructor(message) {
        super(message, "CONTEXT_OVERFLOW", false);
    }
}
export class RateLimitError extends AgentError {
    constructor(message) {
        super(message, "RATE_LIMIT", true);
    }
}
export class BillingError extends AgentError {
    constructor(message) {
        super(message, "BILLING_ERROR", false);
    }
}
export function normalizeError(error) {
    const msg = error?.message || String(error);
    const msgLower = msg.toLowerCase();
    // Context Overflow
    if (msgLower.includes("context length") || msgLower.includes("token limit") || msgLower.includes("too long")) {
        return new ContextOverflowError(msg);
    }
    // Rate Limit
    if (msgLower.includes("rate limit") || msgLower.includes("429") || msgLower.includes("too many requests")) {
        return new RateLimitError(msg);
    }
    // Billing
    if (msgLower.includes("quota") || msgLower.includes("billing") || msgLower.includes("insufficient funds")) {
        return new BillingError(msg);
    }
    return error instanceof Error ? error : new Error(msg);
}
