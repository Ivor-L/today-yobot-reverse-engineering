import * as crypto from "node:crypto";
import { expertPackageDigest } from "./package_digest.js";
import { compileExpertInvocationPolicy, } from "./invocation_policy.js";
/** Resolves a candidate beside RPA's current execution path; it never activates the result. */
export class ExpertDeploymentResolver {
    deployments;
    experts;
    tools;
    constructor(deployments, experts, tools) {
        this.deployments = deployments;
        this.experts = experts;
        this.tools = tools;
    }
    resolveRpa(input) {
        const lookup = this.deployments.resolveRpa({
            accountId: input.accountId,
            profileId: input.profile.name,
            upstreamBindingId: input.upstreamBindingId,
        });
        if (lookup.kind === "missing")
            return { route: "legacy", reason: "binding_missing" };
        if (lookup.kind === "ambiguous")
            return { route: "blocked", reason: "binding_ambiguous" };
        if (lookup.kind === "unavailable")
            return { route: "blocked", reason: "deployment_store_unavailable" };
        if (lookup.kind === "guarded")
            return { route: "blocked", reason: "route_guard_blocked" };
        return this.inspectRpaBinding({ binding: lookup.binding, profile: input.profile });
    }
    /** Inspect one exact binding for preflight/test without weakening the live active-status gate. */
    inspectRpaBinding(input) {
        const binding = input.binding;
        if (binding.status !== "active" && input.allowInactive !== true) {
            return { route: "blocked", reason: "binding_not_active", binding };
        }
        const expert = this.experts.getByDefinitionId(binding.expertRef.definitionId);
        if (!expert)
            return { route: "blocked", reason: "definition_missing", binding };
        if (!expert.enabled)
            return { route: "blocked", reason: "definition_disabled", binding, expert };
        if (expert.definition.capabilityRequest.mode !== "semantic" || expert.source === "legacy_adapter") {
            return { route: "blocked", reason: "definition_not_semantic", binding, expert };
        }
        if (expert.definition.definitionVersion !== binding.expertRef.definitionVersion) {
            return { route: "blocked", reason: "definition_version_mismatch", binding, expert };
        }
        if (expert.profile.name !== binding.expertRef.profileId || input.profile.name !== binding.expertRef.profileId) {
            return { route: "blocked", reason: "profile_mismatch", binding, expert };
        }
        if (expertPackageDigest(expert) !== binding.expertRef.packageDigest) {
            return { route: "blocked", reason: "package_digest_mismatch", binding, expert };
        }
        const declaredKnowledge = new Set(expert.profile.knowledge ?? []);
        if (binding.capabilityGrant.knowledgeNamespaces.some((namespace) => !declaredKnowledge.has(namespace))) {
            return { route: "blocked", reason: "knowledge_namespace_mismatch", binding, expert };
        }
        const compilation = compileExpertInvocationPolicy({
            kind: "rpa",
            definition: expert.definition,
            deploymentBinding: binding,
            toolDefinitions: this.tools.getToolCapabilityDefinitions(expert.profile.scope),
            allowInactiveDeployment: input.allowInactive,
        });
        if (compilation.readiness === "blocked") {
            return { route: "blocked", reason: "policy_blocked", binding, expert, compilation };
        }
        return { route: "expert_v2", reason: "candidate_ready", binding, expert, compilation };
    }
}
function values(input) {
    const raw = Array.isArray(input) ? input : String(input || "").split(",");
    return [...new Set(raw.map((item) => item.trim()).filter(Boolean))].sort();
}
function hashId(value) {
    return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
}
export function resolveExpertDeploymentShadowMode(value) {
    const mode = String(value || "off").trim().toLowerCase();
    return mode === "shadow" || mode === "active" ? mode : "off";
}
export function resolveExpertDeploymentShadowOptions(env = process.env) {
    return {
        mode: env.YOKO_EXPERT_DEPLOYMENT_MODE,
        profiles: env.YOKO_EXPERT_DEPLOYMENT_SHADOW_PROFILES,
        accounts: env.YOKO_EXPERT_DEPLOYMENT_SHADOW_ACCOUNTS,
    };
}
/**
 * Produces one privacy-safe split-decision trace for an RPA business request. Even when the
 * candidate is ready, liveRoute is structurally fixed to legacy in P1b.
 */
export class ExpertDeploymentShadowService {
    resolver;
    deployments;
    mode;
    profiles;
    accountHashes;
    constructor(resolver, deployments, options = {}) {
        this.resolver = resolver;
        this.deployments = deployments;
        this.mode = resolveExpertDeploymentShadowMode(options.mode);
        this.profiles = new Set(values(options.profiles));
        this.accountHashes = new Set(values(options.accounts).map(hashId));
    }
    get enabled() {
        return this.mode === "shadow";
    }
    evaluateRpa(input) {
        if (!this.enabled)
            return undefined;
        if (this.profiles.size > 0 && !this.profiles.has(input.profile.name))
            return undefined;
        if (this.accountHashes.size > 0 && !this.accountHashes.has(hashId(input.accountId)))
            return undefined;
        const candidate = this.resolver.resolveRpa(input);
        const binding = candidate.binding;
        const compilation = candidate.compilation;
        const resolution = compilation?.capabilityResolution;
        return {
            schemaVersion: 1,
            observationMode: "shadow",
            liveRoute: "legacy",
            candidateRoute: candidate.route,
            reason: candidate.reason,
            profileId: input.profile.name,
            ...(binding ? {
                bindingIdHash: hashId(binding.bindingId),
                definitionId: binding.expertRef.definitionId,
                definitionVersion: binding.expertRef.definitionVersion,
                trustZone: binding.trustZone,
                context: {
                    owner: "channel",
                    mode: "conversation",
                    persist: true,
                    maxTurns: binding.contextPolicy.maxTurns,
                    maxTokens: binding.contextPolicy.maxTokens,
                    memoryRead: false,
                    memoryWrite: false,
                },
                deploymentPolicyDigest: binding.policyDigest,
            } : {}),
            ...(compilation ? {
                readiness: compilation.readiness,
                grantedCapabilities: [...(resolution?.grantedCapabilities ?? [])],
                candidatePolicyDigest: compilation.invocation.policyDigest,
                missingRequiredCount: resolution?.missingRequired.length ?? 0,
                missingRequiredProviderCount: resolution?.missingRequiredProviders.length ?? 0,
                blockedOptionalCount: (resolution?.blockedOptional.length ?? 0)
                    + (resolution?.blockedOptionalProviders.length ?? 0),
            } : {}),
            storeIssueCount: this.deployments.snapshot().issues.length,
        };
    }
}
