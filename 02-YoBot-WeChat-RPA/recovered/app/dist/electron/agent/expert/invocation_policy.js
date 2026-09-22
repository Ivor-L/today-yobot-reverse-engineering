import * as crypto from "node:crypto";
import { resolveExpertCapabilities, } from "./capability_resolver.js";
function stableDigest(value) {
    return `sha256:${crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}
function unique(values) {
    return [...new Set(values)].sort();
}
function invocationShape(kind, binding) {
    if (kind === "main_worker") {
        return {
            schemaVersion: 1,
            source: "main",
            channel: "worker",
            invocationRole: "worker",
            trustZone: "parent_agent",
            context: {
                owner: "parent",
                mode: "projected",
                persist: false,
                memoryRead: null,
                memoryWrite: null,
            },
            approval: { available: false, onBlocked: "fail" },
            delivery: { owner: "parent" },
        };
    }
    if (kind === "direct_preview") {
        return {
            schemaVersion: 1,
            source: "direct",
            channel: "direct",
            invocationRole: "primary",
            trustZone: "local_owner",
            context: {
                owner: "run",
                mode: "fresh",
                persist: false,
                memoryRead: null,
                memoryWrite: null,
            },
            approval: { available: true, onBlocked: "fail" },
            delivery: { owner: "none" },
        };
    }
    if (!binding)
        throw new Error("RPA Expert invocation requires a deployment binding.");
    return {
        schemaVersion: 1,
        source: "rpa",
        channel: "rpa",
        invocationRole: "primary",
        trustZone: binding.trustZone,
        context: {
            owner: binding.contextPolicy.owner,
            mode: binding.contextPolicy.mode,
            persist: true,
            maxTurns: binding.contextPolicy.maxTurns,
            maxTokens: binding.contextPolicy.maxTokens,
            memoryRead: binding.contextPolicy.memoryRead,
            memoryWrite: binding.contextPolicy.memoryWrite,
        },
        approval: {
            available: false,
            onBlocked: binding.approvalPolicy.onBlocked,
        },
        delivery: { owner: binding.deliveryPolicy.owner },
    };
}
/**
 * Compiles one Expert definition into an invocation-specific, fail-closed policy. The definition
 * describes desired capabilities; the invocation grant and trust zone remain the authority.
 */
export function compileExpertInvocationPolicy(input) {
    const shape = invocationShape(input.kind, input.deploymentBinding);
    const binding = input.deploymentBinding;
    const grant = input.kind === "rpa"
        ? {
            capabilities: [...(binding?.capabilityGrant.capabilities ?? [])],
            resourceScopes: [...(binding?.capabilityGrant.resourceScopes ?? [])],
            workspaceRoots: [],
            knowledgeNamespaces: [...(binding?.capabilityGrant.knowledgeNamespaces ?? [])],
            deniedTools: [...(binding?.capabilityGrant.deniedTools ?? [])],
            approvalAvailable: false,
        }
        : {
            ...input.grant,
            capabilities: unique(input.grant?.capabilities ?? []),
            resourceScopes: unique(input.grant?.resourceScopes ?? []),
            workspaceRoots: unique(input.grant?.workspaceRoots ?? []),
            knowledgeNamespaces: unique(input.grant?.knowledgeNamespaces ?? []),
            deniedTools: unique(input.grant?.deniedTools ?? []),
            approvalAvailable: shape.approval.available && input.grant?.approvalAvailable !== false,
            ...(shape.invocationRole === "worker"
                ? { parentCapabilities: unique(input.grant?.parentCapabilities ?? []) }
                : {}),
        };
    const capabilityResolution = resolveExpertCapabilities({
        definition: input.definition,
        toolDefinitions: input.toolDefinitions,
        channel: shape.channel,
        invocationRole: shape.invocationRole,
        grant,
    });
    const issues = [];
    if (!capabilityResolution)
        issues.push("semantic_policy_required");
    if (binding && binding.status !== "active" && input.allowInactiveDeployment !== true) {
        issues.push(`binding_not_active:${binding.status}`);
    }
    if (capabilityResolution?.missingRequiredProviders.length)
        issues.push("required_provider_unavailable");
    if (capabilityResolution?.missingRequired.length)
        issues.push("required_capability_blocked");
    const blocked = issues.length > 0;
    const degraded = !blocked && Boolean(capabilityResolution?.blockedOptionalProviders.length
        || capabilityResolution?.blockedOptional.length
        || capabilityResolution?.policyBlockedTools.length);
    const policyDigest = stableDigest({
        compilerVersion: "expert-invocation-policy-v1",
        definition: {
            id: input.definition.definitionId,
            version: input.definition.definitionVersion,
        },
        invocation: shape,
        deploymentPolicyDigest: binding?.policyDigest ?? null,
        capabilityPolicyDigest: capabilityResolution?.policyDigest ?? null,
    });
    const invocation = { ...shape, policyDigest };
    const securityContext = {
        ...(binding ? { deploymentBindingId: binding.bindingId } : {}),
        trustZone: shape.trustZone,
        inputPrincipal: shape.trustZone === "local_owner"
            ? "device_owner"
            : shape.trustZone === "parent_agent"
                ? "parent_agent"
                : shape.trustZone === "external_customer"
                    ? "external_contact"
                    : "system",
        unattended: shape.trustZone === "unattended",
        approvalAvailable: shape.approval.available,
        policyDigest,
    };
    return {
        invocation,
        securityContext,
        capabilityResolution,
        readiness: blocked ? "blocked" : degraded ? "degraded" : "ready",
        issues,
    };
}
