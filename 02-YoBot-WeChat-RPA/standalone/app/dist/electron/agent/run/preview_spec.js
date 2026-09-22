import { AGENTIC_CONTEXT_DEFAULT_MAX_TOKENS, AGENTIC_CONTEXT_DEFAULT_MAX_TURNS, } from "../agentic/context.js";
import { agentProfilePolicyDigest } from "./agentic_spec.js";
import { AGENT_RUN_SCHEMA_VERSION } from "./contract.js";
export function buildPreviewRunSpec(input) {
    const { runId, profile, request } = input;
    return {
        schemaVersion: AGENT_RUN_SCHEMA_VERSION,
        runId,
        conversationKey: {
            source: "desktop-agent-preview",
            scopeId: "user_default",
            profileId: request.profileId,
            conversationId: request.conversationId,
        },
        profile: { id: profile.name, version: profile.version },
        invocationRole: "primary",
        source: "preview",
        context: {
            mode: "conversation",
            maxTurns: AGENTIC_CONTEXT_DEFAULT_MAX_TURNS,
            maxTokens: AGENTIC_CONTEXT_DEFAULT_MAX_TOKENS,
        },
        capabilities: {
            allowedSkills: profile.allowedSkills === undefined ? null : [...profile.allowedSkills].sort(),
            deniedTools: [],
            resourceScopes: [],
        },
        limits: {},
        contract: {
            objective: "Complete one local desktop Agent preview turn.",
            successCriteria: [
                "Return one complete preview response.",
                "Do not invoke RPA delivery tools.",
                "Persist preview conversation context only after successful completion.",
            ],
        },
        harness: {
            version: "enterprise-harness-v1",
            policyDigest: agentProfilePolicyDigest(profile),
            agenticInbound: true,
        },
        delivery: { mode: "none", idempotencyKey: request.turnId },
    };
}
