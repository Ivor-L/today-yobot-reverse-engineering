import * as crypto from "node:crypto";
import { DEFAULT_CRITICAL_DENY_TOOLS } from "../harness/capability_manifest.js";
import { preflightToolPolicy, resolveToolPolicyVersionCoordinate } from "../harness/tool_policy_gateway.js";
import { resolveEnterpriseToolMetadata } from "../harness/tool_execution.js";
import { EXPERT_CAPABILITY_IDS, } from "./types.js";
export const EXPERT_CAPABILITY_RESOLVER_VERSION = "expert-capability-resolver-v3";
export function projectExpertExecutionPolicy(policy) {
    return {
        runSpecCapabilities: {
            allowedSkills: [...policy.allowedSkills],
            allowedTools: [...policy.allowedTools],
            deniedTools: [...policy.deniedTools],
            resourceScopes: [...policy.toolPolicyScopes],
        },
        transientRequestContext: {
            toolPolicyMode: policy.toolPolicyMode,
            toolPolicyScopes: [...policy.toolPolicyScopes],
            toolPolicyScopeSource: "expert-capability-resolver",
            resourcePolicy: {
                workspaceRoots: [...policy.resourcePolicy.workspaceRoots],
                knowledgeNamespaces: [...policy.resourcePolicy.knowledgeNamespaces],
            },
        },
    };
}
const CRITICAL_DENY = new Set(DEFAULT_CRITICAL_DENY_TOOLS.map((name) => name.toLowerCase()));
const CAPABILITY_SET = new Set(EXPERT_CAPABILITY_IDS);
function uniqueSorted(values) {
    return [...new Set(values)].sort();
}
function stableDigest(value) {
    return `sha256:${crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}
/** Translate enforceable tool metadata into the small, stable product taxonomy. */
export function semanticCapabilitiesForTool(definition) {
    const name = definition.definition.name.toLowerCase();
    if (CRITICAL_DENY.has(name))
        return [];
    const resolved = resolveEnterpriseToolMetadata(definition.definition);
    if (!resolved.declared || !resolved.metadata)
        return [];
    const metadata = resolved.metadata;
    const namespace = metadata.namespace.trim().toLowerCase();
    const capability = metadata.capability.trim().toLowerCase();
    if (namespace === "network" && metadata.sideEffect === "none"
        && (capability === "web_search" || capability === "web_fetch"))
        return ["web.public.read"];
    if (namespace === "filesystem" && metadata.sideEffect === "none"
        && (capability === "read_file" || capability === "list_directory"))
        return ["workspace.read"];
    if (namespace === "filesystem" && metadata.sideEffect === "local"
        && metadata.securityEffects?.includes("local_file_mutation"))
        return ["workspace.write"];
    // Context-cache detail reads are process-global and are not a knowledge-namespace operation.
    // Only the namespace-aware search tool may satisfy an external Expert knowledge grant.
    if (namespace === "memory" && metadata.sideEffect === "none" && capability === "search") {
        return ["knowledge.read"];
    }
    const browserProvider = namespace === "browser"
        || namespace.startsWith("browser.")
        || namespace === "mcp.browser"
        || namespace.startsWith("mcp.browser.");
    if (browserProvider)
        return ["browser.interact"];
    if (metadata.sideEffect === "external")
        return ["external.action"];
    return [];
}
function isProviderBootstrapTool(definition) {
    const resolved = resolveEnterpriseToolMetadata(definition.definition);
    return resolved.declared
        && resolved.metadata?.namespace.trim().toLowerCase() === "skill"
        && resolved.metadata.capability.trim().toLowerCase() === "read_instructions"
        && resolved.metadata.sideEffect === "none";
}
function capabilityAllowed(capability, channel, invocationRole) {
    if (invocationRole === "worker"
        && (capability === "external.action" || capability === "browser.interact"))
        return false;
    if (channel === "rpa" && capability === "external.action")
        return false;
    return true;
}
function capabilityScopeSatisfied(capability, grant) {
    if (capability === "workspace.read" || capability === "workspace.write") {
        return (grant.workspaceRoots?.length ?? 0) > 0;
    }
    if (capability === "knowledge.read")
        return (grant.knowledgeNamespaces?.length ?? 0) > 0;
    if (capability === "browser.interact") {
        return (grant.resourceScopes ?? []).some((scope) => scope.startsWith("browser:"));
    }
    return true;
}
function providerScopesSatisfied(definition, scopes) {
    const resolved = resolveEnterpriseToolMetadata(definition.definition);
    const required = resolved.metadata?.requiredScopes ?? [];
    return required.every((scope) => scopes.has(scope));
}
export function resolveExpertCapabilities(input) {
    const policy = input.definition.capabilityRequest;
    if (policy.mode !== "semantic")
        return undefined;
    const required = uniqueSorted(policy.required);
    const optional = uniqueSorted(policy.optional);
    const forbidden = uniqueSorted(policy.forbidden);
    const requested = new Set([...required, ...optional]);
    const forbiddenSet = new Set(forbidden);
    const granted = new Set((input.grant?.capabilities ?? []).filter((item) => CAPABILITY_SET.has(item)));
    const parentCapabilities = new Set((input.grant?.parentCapabilities ?? []).filter((item) => CAPABILITY_SET.has(item)));
    const resourceScopes = new Set((input.grant?.resourceScopes ?? []).map((scope) => scope.trim()).filter(Boolean));
    const workspaceRoots = uniqueSorted((input.grant?.workspaceRoots ?? []).map((root) => root.trim()).filter(Boolean));
    const knowledgeNamespaces = uniqueSorted((input.grant?.knowledgeNamespaces ?? []).map((namespace) => namespace.trim()).filter(Boolean));
    const dynamicDenied = new Set((input.grant?.deniedTools ?? []).map((name) => name.trim().toLowerCase()).filter(Boolean));
    const channelDeclared = input.definition.channels.includes(input.channel);
    const requiredProviders = uniqueSorted(input.definition.providerBindings.required);
    const optionalProviders = uniqueSorted(input.definition.providerBindings.optional);
    const boundProviders = new Set([...requiredProviders, ...optionalProviders]);
    const inventoryProviders = new Set(input.toolDefinitions.map((item) => item.owner));
    const missingRequiredProviders = requiredProviders.filter((provider) => !inventoryProviders.has(provider));
    const blockedOptionalProviders = optionalProviders.filter((provider) => !inventoryProviders.has(provider));
    const availableProviders = uniqueSorted([...boundProviders].filter((provider) => inventoryProviders.has(provider)));
    const boundDefinitions = input.toolDefinitions.filter((definition) => boundProviders.has(definition.owner));
    const providerContractDigest = stableDigest(boundDefinitions
        .map((item) => ({
        owner: item.owner,
        name: item.definition.name,
        parameters: item.definition.parameters,
        enterprise: resolveEnterpriseToolMetadata(item.definition),
    }))
        .sort((left, right) => left.owner.localeCompare(right.owner) || left.name.localeCompare(right.name)));
    const providers = new Map();
    for (const capability of EXPERT_CAPABILITY_IDS)
        providers.set(capability, []);
    for (const definition of boundDefinitions) {
        for (const capability of semanticCapabilitiesForTool(definition))
            providers.get(capability)?.push(definition);
    }
    for (const definitions of providers.values()) {
        definitions.sort((left, right) => left.definition.name.localeCompare(right.definition.name));
    }
    const policyResults = new Map();
    const policyFor = (definition) => {
        const key = definition.definition.name;
        let result = policyResults.get(key);
        if (!result) {
            result = preflightToolPolicy({
                toolName: definition.definition.name,
                metadata: resolveEnterpriseToolMetadata(definition.definition),
                scopes: [...resourceScopes],
                approvalAvailable: input.grant?.approvalAvailable,
            });
            policyResults.set(key, result);
        }
        return result;
    };
    const potentialTools = new Set();
    const effectiveTools = new Set();
    const deniedTools = new Set(dynamicDenied);
    const effectiveOwners = new Set();
    const approvalRequiredTools = new Set();
    const providerCandidates = {};
    if (channelDeclared) {
        for (const definition of boundDefinitions.filter(isProviderBootstrapTool)) {
            const name = definition.definition.name;
            potentialTools.add(name);
            const preflight = policyFor(definition);
            if (preflight.admitted && !deniedTools.has(name.toLowerCase())) {
                effectiveTools.add(name);
                effectiveOwners.add(definition.owner);
            }
        }
    }
    for (const capability of EXPERT_CAPABILITY_IDS) {
        const definitions = providers.get(capability) ?? [];
        if (definitions.length)
            providerCandidates[capability] = uniqueSorted(definitions.map((item) => item.definition.name));
        if (forbiddenSet.has(capability)) {
            for (const definition of definitions)
                deniedTools.add(definition.definition.name);
            continue;
        }
        if (!requested.has(capability) || !channelDeclared
            || !capabilityAllowed(capability, input.channel, input.invocationRole))
            continue;
        if (input.invocationRole === "worker" && !parentCapabilities.has(capability))
            continue;
        for (const definition of definitions)
            potentialTools.add(definition.definition.name);
        if (!granted.has(capability) || !capabilityScopeSatisfied(capability, input.grant ?? {}))
            continue;
        for (const definition of definitions) {
            const name = definition.definition.name;
            if (deniedTools.has(name.toLowerCase()) || !providerScopesSatisfied(definition, resourceScopes))
                continue;
            const preflight = policyFor(definition);
            if (!preflight.admitted)
                continue;
            effectiveTools.add(name);
            effectiveOwners.add(definition.owner);
            if (preflight.decision === "approval_required")
                approvalRequiredTools.add(name);
        }
    }
    const reasonsFor = (capability) => {
        const reasons = [];
        const definitions = providers.get(capability) ?? [];
        if (forbiddenSet.has(capability))
            return ["forbidden"];
        if (!channelDeclared)
            return ["channel_not_declared"];
        if (!capabilityAllowed(capability, input.channel, input.invocationRole))
            return ["invocation_ceiling"];
        if (input.invocationRole === "worker" && !parentCapabilities.has(capability)) {
            return ["parent_capability_missing"];
        }
        if (!definitions.length)
            reasons.push("provider_unavailable");
        if (!granted.has(capability))
            reasons.push("grant_missing");
        if (!capabilityScopeSatisfied(capability, input.grant ?? {})
            || (definitions.length > 0 && !definitions.some((item) => providerScopesSatisfied(item, resourceScopes)))) {
            reasons.push("resource_scope_missing");
        }
        const scopeEligible = definitions.filter((item) => providerScopesSatisfied(item, resourceScopes));
        if (scopeEligible.length > 0 && !scopeEligible.some((item) => policyFor(item).admitted)) {
            if (scopeEligible.some((item) => policyFor(item).code === "approval_unavailable")) {
                reasons.push("approval_unavailable");
            }
            else {
                reasons.push("policy_denied");
            }
        }
        if (granted.has(capability)
            && capabilityScopeSatisfied(capability, input.grant ?? {})
            && scopeEligible.some((item) => policyFor(item).admitted)
            && !scopeEligible.some((item) => effectiveTools.has(item.definition.name))) {
            reasons.push("dynamic_deny");
        }
        return uniqueSorted(reasons);
    };
    const missingRequired = required
        .map((capability) => ({ capability, reasons: reasonsFor(capability) }))
        .filter((item) => item.reasons.length > 0);
    const blockedOptional = optional
        .map((capability) => ({ capability, reasons: reasonsFor(capability) }))
        .filter((item) => item.reasons.length > 0);
    const effective = uniqueSorted(effectiveTools);
    const denied = uniqueSorted(deniedTools);
    const executionPolicy = {
        toolPolicyMode: "enforce",
        allowedSkills: uniqueSorted(effectiveOwners),
        allowedTools: effective,
        deniedTools: denied,
        toolPolicyScopes: uniqueSorted(resourceScopes),
        resourcePolicy: { workspaceRoots, knowledgeNamespaces },
    };
    const policyBlockedTools = [...policyResults.entries()]
        .filter(([, result]) => !result.admitted)
        .map(([name, result]) => ({ name, code: result.code }))
        .sort((left, right) => left.name.localeCompare(right.name) || left.code.localeCompare(right.code));
    const resourcePolicyDigest = stableDigest({
        resourceScopes: uniqueSorted(resourceScopes),
        workspaceRoots,
        knowledgeNamespaces,
    });
    const digestProjection = {
        resolverVersion: EXPERT_CAPABILITY_RESOLVER_VERSION,
        toolPolicyVersion: resolveToolPolicyVersionCoordinate(),
        definitionId: input.definition.definitionId,
        definitionVersion: input.definition.definitionVersion,
        channel: input.channel,
        invocationRole: input.invocationRole,
        requested: { required, optional, forbidden },
        requestedProviders: { required: requiredProviders, optional: optionalProviders },
        grantedCapabilities: uniqueSorted(granted),
        parentCapabilities: uniqueSorted(parentCapabilities),
        potentialTools: uniqueSorted(potentialTools),
        providerContractDigest,
        executionPolicy: {
            toolPolicyMode: executionPolicy.toolPolicyMode,
            allowedSkills: executionPolicy.allowedSkills,
            allowedTools: executionPolicy.allowedTools,
            deniedTools: executionPolicy.deniedTools,
            resourcePolicyDigest,
        },
    };
    return {
        schemaVersion: 1,
        resolverVersion: EXPERT_CAPABILITY_RESOLVER_VERSION,
        definitionId: input.definition.definitionId,
        definitionVersion: input.definition.definitionVersion,
        channel: input.channel,
        invocationRole: input.invocationRole,
        requested: { required, optional, forbidden },
        requestedProviders: { required: requiredProviders, optional: optionalProviders },
        availableProviders,
        missingRequiredProviders,
        blockedOptionalProviders,
        grantedCapabilities: uniqueSorted(granted),
        providerCandidates,
        potentialTools: uniqueSorted(potentialTools),
        effectiveTools: effective,
        deniedTools: denied,
        policyBlockedTools,
        approvalRequiredTools: uniqueSorted(approvalRequiredTools),
        missingRequired,
        blockedOptional,
        resourceScopeCount: resourceScopes.size,
        workspaceRootCount: workspaceRoots.length,
        knowledgeNamespaceCount: knowledgeNamespaces.length,
        executionPolicy,
        providerContractDigest,
        policyDigest: stableDigest(digestProjection),
    };
}
