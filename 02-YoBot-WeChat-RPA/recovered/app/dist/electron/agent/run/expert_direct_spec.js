import { projectExpertExecutionPolicy } from "../expert/capability_resolver.js";
import { AGENT_RUN_SCHEMA_VERSION } from "./contract.js";
import { EXPERT_AGENT_RUN_DEFAULT_MAX_OUTPUT_TOKENS, EXPERT_AGENT_RUN_DEFAULT_MAX_TOOL_CALLS, EXPERT_AGENT_RUN_DEFAULT_MAX_TURNS, EXPERT_DIRECT_MAX_INPUT_TOKENS, } from "./budget.js";
export const EXPERT_DIRECT_RUN_DEFAULT_TIMEOUT_MS = 270 * 1_000;
export function buildExpertDirectRunSpec(input) {
    const projected = projectExpertExecutionPolicy(input.resolution.executionPolicy);
    const now = input.now ?? Date.now();
    const deliverables = input.job.deliverables?.length
        ? input.job.deliverables.map((item) => `Deliver ${item}.`)
        : ["Return one complete, useful response for the selected job."];
    return {
        schemaVersion: AGENT_RUN_SCHEMA_VERSION,
        runId: input.runId,
        profile: { id: input.profile.name, version: input.profile.version },
        invocationRole: "primary",
        source: "direct",
        context: { mode: "fresh" },
        capabilities: projected.runSpecCapabilities,
        limits: {
            deadlineAt: now + EXPERT_DIRECT_RUN_DEFAULT_TIMEOUT_MS,
            maxInputTokens: EXPERT_DIRECT_MAX_INPUT_TOKENS,
            maxOutputTokens: EXPERT_AGENT_RUN_DEFAULT_MAX_OUTPUT_TOKENS,
            maxTurns: input.definition.defaults?.maxTurns ?? EXPERT_AGENT_RUN_DEFAULT_MAX_TURNS,
            maxToolCalls: input.definition.defaults?.maxToolCalls ?? EXPERT_AGENT_RUN_DEFAULT_MAX_TOOL_CALLS,
        },
        contract: {
            // User text is deliberately excluded from durable AgentRun metadata.
            objective: `Complete job ${input.job.id} for ${input.definition.definitionId}.`,
            successCriteria: [
                ...deliverables,
                "Use only the capabilities admitted by the immutable preflight policy.",
                "Do not claim a tool action completed unless the corresponding tool result confirms it.",
            ],
        },
        harness: {
            version: "enterprise-harness-v1",
            policyDigest: input.resolution.policyDigest,
            agenticInbound: false,
        },
        delivery: { mode: "none", idempotencyKey: input.turnId },
    };
}
