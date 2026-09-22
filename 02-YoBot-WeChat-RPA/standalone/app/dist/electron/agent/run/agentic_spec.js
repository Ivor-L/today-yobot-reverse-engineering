import * as crypto from "node:crypto";
import { AGENTIC_CONTEXT_DEFAULT_MAX_TOKENS, AGENTIC_CONTEXT_DEFAULT_MAX_TURNS, } from "../agentic/context.js";
import { AGENT_RUN_SCHEMA_VERSION, } from "./contract.js";
/** Keep the APP-side deadline below the RPA client's 300 second request timeout. */
export const AGENTIC_RUN_DEFAULT_TIMEOUT_MS = 270 * 1_000;
export function agentProfilePolicyDigest(profile) {
    const value = JSON.stringify({
        profile: { name: profile.name, version: profile.version, scope: profile.scope },
        allowedSkills: profile.allowedSkills === undefined ? null : [...profile.allowedSkills].sort(),
        deniedSkills: [...(profile.deniedSkills ?? [])].sort(),
        shellAllowed: profile.shellAllowed === true,
        memoryNamespace: profile.memoryNamespace,
        sessionPolicy: profile.sessionPolicy,
        runtime: profile.runtime,
    });
    return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
}
function conversationKey(req) {
    return {
        source: req.conversation.source?.trim() || "agentic",
        scopeId: req.conversation.scopeId?.trim() || req.conversation.accountId,
        profileId: req.profileId,
        conversationId: req.conversation.sessionId,
    };
}
export function buildAgenticRunSpec(input) {
    const { runId, profile, request, phase, usesConversationContext, deadlineAt } = input;
    return {
        schemaVersion: AGENT_RUN_SCHEMA_VERSION,
        runId,
        conversationKey: conversationKey(request),
        profile: { id: profile.name, version: profile.version },
        invocationRole: "primary",
        // This builder is owned by the APP/RPA ingress. Conversation source is a logical
        // namespace and must not be reused as the execution-security classification.
        source: "rpa",
        context: {
            mode: usesConversationContext ? "conversation" : "none",
            ...(usesConversationContext ? {
                maxTurns: AGENTIC_CONTEXT_DEFAULT_MAX_TURNS,
                maxTokens: AGENTIC_CONTEXT_DEFAULT_MAX_TOKENS,
            } : {}),
        },
        capabilities: {
            allowedSkills: profile.allowedSkills === undefined ? null : [...profile.allowedSkills].sort(),
            deniedTools: [],
            resourceScopes: [],
        },
        limits: { deadlineAt },
        contract: {
            objective: `Complete agentic ${request.scene} phase ${phase}.`,
            successCriteria: [
                "Return a valid APP response.",
                "Do not send through RPA tools from inside an RPA-originated run.",
                "Do not duplicate a prior customer-facing delivery.",
            ],
        },
        harness: {
            version: "enterprise-harness-v1",
            policyDigest: agentProfilePolicyDigest(profile),
            agenticInbound: true,
        },
        delivery: {
            mode: "channel",
            channel: request.conversation.source?.trim() || "agentic",
            idempotencyKey: request.idempotencyKey
                ? `${request.idempotencyKey}:phase-${phase}`
                : undefined,
        },
    };
}
