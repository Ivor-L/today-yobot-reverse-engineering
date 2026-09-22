import { buildCapabilityManifest } from "../harness/capability_manifest.js";
import { EXPERT_CAPABILITY_IDS, } from "./types.js";
import { resolveExpertCapabilities, } from "./capability_resolver.js";
function values(input) {
    const raw = Array.isArray(input) ? input : String(input || "").split(",");
    return [...new Set(raw.map((item) => item.trim()).filter(Boolean))].sort();
}
export function resolveExpertCapabilityShadowMode(value) {
    return String(value || "off").trim().toLowerCase() === "shadow" ? "shadow" : "off";
}
export function resolveExpertCapabilityShadowOptions(env = process.env) {
    return {
        mode: env.YOKO_EXPERT_CAPABILITY_MODE,
        grantedCapabilities: env.YOKO_EXPERT_SHADOW_GRANTS,
        resourceScopes: env.YOKO_EXPERT_SHADOW_RESOURCE_SCOPES,
        profiles: env.YOKO_EXPERT_SHADOW_PROFILES,
        sources: env.YOKO_EXPERT_SHADOW_SOURCES,
    };
}
function difference(left, right) {
    return [...left].filter((item) => !right.has(item)).sort();
}
function clipDiff(values, max) {
    return values.slice(0, max);
}
/**
 * Computes a candidate policy beside the live profile. It never mutates AgentProfile, AgentRun,
 * RequestContext tool ceilings or the SkillRegistry, so enabling shadow mode cannot grant tools.
 */
export class ExpertCapabilityShadowService {
    experts;
    tools;
    mode;
    grant;
    configurationIssues;
    maxDiffTools;
    profiles;
    sources;
    workspaceRoots;
    constructor(experts, tools, options = {}) {
        this.experts = experts;
        this.tools = tools;
        this.mode = resolveExpertCapabilityShadowMode(options.mode);
        const known = new Set(EXPERT_CAPABILITY_IDS);
        const requestedGrants = values(options.grantedCapabilities);
        const unknownGrantCount = requestedGrants.filter((item) => !known.has(item)).length;
        this.configurationIssues = unknownGrantCount > 0
            ? [`unknown_grant_count:${unknownGrantCount}`]
            : [];
        this.grant = {
            capabilities: requestedGrants.filter((item) => known.has(item)),
            resourceScopes: values(options.resourceScopes),
            workspaceRoots: [],
            knowledgeNamespaces: [],
        };
        this.maxDiffTools = Number.isInteger(options.maxDiffTools) && Number(options.maxDiffTools) > 0
            ? Number(options.maxDiffTools)
            : 100;
        this.profiles = new Set(values(options.profiles));
        this.sources = new Set(values(options.sources).map((item) => item.toLowerCase()));
        this.workspaceRoots = values(options.workspaceRoots);
    }
    get enabled() {
        return this.mode === "shadow";
    }
    evaluate(input) {
        if (!this.enabled)
            return undefined;
        if (this.profiles.size > 0 && !this.profiles.has(input.profile.name))
            return undefined;
        if (this.sources.size > 0 && !this.sources.has(input.source.toLowerCase()))
            return undefined;
        const expert = this.experts.getByProfileId(input.profile.name);
        if (!expert || expert.source !== "sidecar" || expert.definition.capabilityRequest.mode !== "semantic") {
            return undefined;
        }
        const definitions = this.tools.getToolCapabilityDefinitions(input.profile.scope, input.profile.allowedSkills);
        const actual = buildCapabilityManifest(definitions, input.profile.scope);
        const knowledgeNamespaces = [
            ...(input.profile.knowledge ?? []),
            ...(input.profile.memoryNamespace.read ? [input.profile.memoryNamespace.read] : []),
        ];
        const hasWorkspaceGrant = this.grant.resourceScopes.some((scope) => scope.startsWith("workspace:"));
        const resolution = resolveExpertCapabilities({
            definition: expert.definition,
            toolDefinitions: this.tools.getToolCapabilityDefinitions(input.profile.scope),
            channel: input.channel,
            invocationRole: input.invocationRole,
            grant: {
                capabilities: this.grant.capabilities,
                resourceScopes: this.grant.resourceScopes,
                workspaceRoots: hasWorkspaceGrant ? this.workspaceRoots : [],
                knowledgeNamespaces,
                approvalAvailable: input.source.toLowerCase() === "direct" && input.channel === "direct",
                ...(input.invocationRole === "worker"
                    ? { parentCapabilities: this.grant.capabilities }
                    : {}),
            },
        });
        if (!resolution)
            return undefined;
        const actualTools = new Set(actual.tools.map((tool) => tool.name));
        const potentialTools = new Set(resolution.potentialTools);
        const effectiveTools = new Set(resolution.effectiveTools);
        const wouldAdd = difference(effectiveTools, actualTools);
        const wouldRemove = difference(actualTools, effectiveTools);
        const potentialAdd = difference(potentialTools, actualTools);
        const unchanged = [...actualTools].filter((item) => effectiveTools.has(item)).length;
        const truncated = [wouldAdd, wouldRemove, potentialAdd]
            .some((items) => items.length > this.maxDiffTools);
        const hasReviewDiff = wouldAdd.length > 0 || wouldRemove.length > 0 || potentialAdd.length > 0
            || resolution.blockedOptional.length > 0
            || resolution.blockedOptionalProviders.length > 0
            || resolution.policyBlockedTools.length > 0
            || resolution.approvalRequiredTools.length > 0
            || this.configurationIssues.length > 0;
        const activationReadiness = resolution.missingRequired.length > 0
            || resolution.missingRequiredProviders.length > 0
            ? "blocked"
            : hasReviewDiff
                ? "review"
                : "compatible";
        return {
            schemaVersion: 1,
            observationMode: "shadow",
            definitionId: expert.definition.definitionId,
            definitionVersion: expert.definition.definitionVersion,
            profileId: input.profile.name,
            source: input.source,
            channel: input.channel,
            invocationRole: input.invocationRole,
            evaluationScope: "request_profile",
            actualManifestHash: actual.manifestHash,
            candidatePolicyDigest: resolution.policyDigest,
            actualToolCount: actualTools.size,
            potentialToolCount: potentialTools.size,
            effectiveToolCount: effectiveTools.size,
            grantedCapabilities: resolution.grantedCapabilities,
            requestedCapabilities: [...new Set([
                    ...resolution.requested.required,
                    ...resolution.requested.optional,
                ])].sort(),
            missingRequired: resolution.missingRequired,
            blockedOptional: resolution.blockedOptional,
            missingRequiredProviders: resolution.missingRequiredProviders,
            blockedOptionalProviders: resolution.blockedOptionalProviders,
            allowedSkillCount: resolution.executionPolicy.allowedSkills.length,
            policyBlockedToolCount: resolution.policyBlockedTools.length,
            approvalRequiredToolCount: resolution.approvalRequiredTools.length,
            diff: {
                wouldAdd: clipDiff(wouldAdd, this.maxDiffTools),
                wouldRemove: clipDiff(wouldRemove, this.maxDiffTools),
                unchanged,
                potentialAdd: clipDiff(potentialAdd, this.maxDiffTools),
                wouldAddCount: wouldAdd.length,
                wouldRemoveCount: wouldRemove.length,
                potentialAddCount: potentialAdd.length,
                truncated,
            },
            resourceScopeCount: resolution.resourceScopeCount,
            workspaceRootCount: resolution.workspaceRootCount,
            knowledgeNamespaceCount: resolution.knowledgeNamespaceCount,
            configurationIssues: [...this.configurationIssues],
            activationReadiness,
        };
    }
}
