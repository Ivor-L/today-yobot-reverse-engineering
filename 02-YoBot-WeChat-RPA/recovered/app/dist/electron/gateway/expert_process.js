const MAX_STEPS = 64;
const MAX_THOUGHT_CHARS = 24_000;
const MAX_TOOL_VALUE_CHARS = 8_000;
function limitedText(value, maxChars) {
    let text;
    if (typeof value === "string") {
        text = value;
    }
    else {
        try {
            const serialized = JSON.stringify(value);
            text = typeof serialized === "string" ? serialized : String(value ?? "");
        }
        catch {
            text = String(value ?? "");
        }
    }
    if (text.length <= maxChars)
        return text;
    return `${text.slice(0, maxChars)}\n…（内容已截断）`;
}
function safeArgs(value) {
    if (value === undefined)
        return {};
    const serialized = limitedText(value, MAX_TOOL_VALUE_CHARS);
    try {
        return JSON.parse(serialized);
    }
    catch {
        return serialized;
    }
}
/**
 * Builds the bounded, user-visible process summary persisted with a main-chat Expert response.
 * The Worker session remains isolated; only the same think/tool events already streamed to the
 * user are projected into durable main-session metadata.
 */
export class ExpertProcessRecorder {
    steps = [];
    serial = 0;
    thoughtChars = 0;
    record(event) {
        if (event.type === "think") {
            const raw = event.delta || event.description || "";
            if (!raw || this.thoughtChars >= MAX_THOUGHT_CHARS)
                return;
            const text = raw.slice(0, MAX_THOUGHT_CHARS - this.thoughtChars);
            this.thoughtChars += text.length;
            const last = this.steps.at(-1);
            if (event.delta && last?.type === "message") {
                last.content += text;
                return;
            }
            if (this.steps.length >= MAX_STEPS)
                return;
            this.steps.push({
                id: `expert-thought-${++this.serial}`,
                type: "message",
                role: "thought",
                content: text,
                timestamp: Date.now(),
            });
            return;
        }
        if (event.type === "tool_start") {
            if (this.steps.length >= MAX_STEPS)
                return;
            this.steps.push({
                id: event.callId || `expert-tool-${++this.serial}`,
                type: "tool",
                name: event.toolName || "Unknown Tool",
                args: safeArgs(event.toolArgs),
                status: "running",
                timestamp: Date.now(),
            });
            return;
        }
        if (event.type !== "tool_result")
            return;
        const matching = [...this.steps].reverse().find((step) => (step.type === "tool"
            && step.status === "running"
            && (event.callId ? step.id === event.callId : step.name === (event.toolName || "Unknown Tool"))));
        const result = limitedText(event.toolResult, MAX_TOOL_VALUE_CHARS);
        if (matching?.type === "tool") {
            matching.status = event.isError ? "failed" : "success";
            if (result)
                matching.result = result;
            return;
        }
        if (this.steps.length >= MAX_STEPS)
            return;
        this.steps.push({
            id: event.callId || `expert-tool-${++this.serial}`,
            type: "tool",
            name: event.toolName || "Unknown Tool",
            args: {},
            status: event.isError ? "failed" : "success",
            ...(result ? { result } : {}),
            timestamp: Date.now(),
        });
    }
    snapshot() {
        if (this.steps.length === 0)
            return undefined;
        return {
            schemaVersion: 1,
            steps: this.steps.map((step) => ({ ...step })),
            isComplete: true,
        };
    }
}
