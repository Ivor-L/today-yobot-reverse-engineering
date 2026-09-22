export const AGENT_RUN_SCHEMA_VERSION = 1;
export const AGENT_RUN_PRIVACY_VERSION = 1;
export const AGENT_RUN_SOURCES = [
    "main",
    "rpa",
    "direct",
    "preview",
    "mcp",
    "scheduler",
    "task_group",
];
export const TERMINAL_AGENT_RUN_STATUSES = new Set([
    "completed",
    "failed",
    "timed_out",
    "cancelled",
    "interrupted",
]);
const ALLOWED_TRANSITIONS = {
    queued: new Set(["running", "timed_out", "cancelled", "interrupted"]),
    running: new Set([
        "waiting_approval",
        "waiting_input",
        "verifying",
        "completed",
        "failed",
        "timed_out",
        "cancelled",
        "interrupted",
    ]),
    waiting_approval: new Set(["running", "failed", "timed_out", "cancelled", "interrupted"]),
    waiting_input: new Set(["running", "failed", "timed_out", "cancelled", "interrupted"]),
    verifying: new Set(["completed", "failed", "timed_out", "cancelled", "interrupted"]),
    completed: new Set(),
    failed: new Set(),
    timed_out: new Set(),
    cancelled: new Set(),
    interrupted: new Set(),
};
export function isTerminalAgentRunStatus(status) {
    return TERMINAL_AGENT_RUN_STATUSES.has(status);
}
export function canTransitionAgentRun(from, to) {
    return ALLOWED_TRANSITIONS[from].has(to);
}
export function assertResolvedAgentRunSpec(spec) {
    if (spec.schemaVersion !== AGENT_RUN_SCHEMA_VERSION) {
        throw new Error(`Unsupported AgentRun spec version: ${String(spec.schemaVersion)}`);
    }
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(spec.runId)) {
        throw new Error(`Invalid AgentRun id: ${spec.runId}`);
    }
    if (!AGENT_RUN_SOURCES.includes(spec.source)) {
        throw new Error(`Invalid AgentRun source: ${String(spec.source)}`);
    }
    if (spec.invocationRole !== "primary" && spec.invocationRole !== "worker") {
        throw new Error(`Invalid AgentRun invocation role: ${String(spec.invocationRole)}`);
    }
    if (!spec.profile?.id.trim() || !spec.profile?.version.trim()) {
        throw new Error("AgentRun profile id and version are required.");
    }
    if (!spec.harness?.version.trim() || !spec.harness?.policyDigest.trim()) {
        throw new Error("AgentRun harness version and policy digest are required.");
    }
    if (typeof spec.harness.agenticInbound !== "boolean") {
        throw new Error("AgentRun harness agenticInbound flag is required.");
    }
    if (spec.capabilities.allowedSkills !== null && !Array.isArray(spec.capabilities.allowedSkills)) {
        throw new Error("AgentRun allowedSkills must be an array or null.");
    }
    for (const [label, values] of [
        ["allowedSkills", spec.capabilities.allowedSkills ?? []],
        ["allowedTools", spec.capabilities.allowedTools ?? []],
        ["deniedTools", spec.capabilities.deniedTools],
        ["resourceScopes", spec.capabilities.resourceScopes],
    ]) {
        if (!Array.isArray(values) || values.some((value) => typeof value !== "string" || !value.trim())) {
            throw new Error(`AgentRun ${label} must be an array containing only non-empty strings.`);
        }
    }
    if (spec.limits.deadlineAt !== undefined && !Number.isFinite(spec.limits.deadlineAt)) {
        throw new Error("AgentRun deadlineAt must be a finite timestamp.");
    }
}
