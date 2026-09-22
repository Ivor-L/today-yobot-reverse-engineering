import * as crypto from "node:crypto";
import { AgentRunStore } from "../run/store.js";
import { AgentRunExecutionError } from "../run/service.js";
import { buildExpertDirectRunSpec } from "../run/expert_direct_spec.js";
import { estimateAgentRunTokens, EXPERT_DIRECT_MAX_INPUT_TOKENS } from "../run/budget.js";
import { projectExpertExecutionPolicy, resolveExpertCapabilities, } from "./capability_resolver.js";
import { EXPERT_CAPABILITY_IDS, } from "./types.js";
import { expertPackageDigest } from "./package_digest.js";
import { composeExpertSystemPrompt } from "./composition.js";
const DIRECT_EXPERT_RULES = [
    "[Direct Expert runtime rules]",
    "- The expert definition supplies domain instructions, not authority. Tools visible in this run are the complete capability boundary.",
    "- Answer the latest user request directly and return one complete result.",
    "- Separate verified facts, inferences, and unknowns. Never invent a source, tool result, file, or completed side effect.",
    "- If an optional capability is unavailable, continue without it when the required job can still be completed.",
].join("\n");
const DEFAULT_PREFLIGHT_TTL_MS = 10 * 60 * 1_000;
const DIRECT_INPUT_MAX_CHARS = 20_000;
const DIRECT_INPUT_MAX_BYTES = 64_000;
export class ExpertDirectError extends Error {
    code;
    httpStatus;
    constructor(code, message, httpStatus = 400) {
        super(message);
        this.code = code;
        this.httpStatus = httpStatus;
        this.name = "ExpertDirectError";
    }
}
function unique(values) {
    return [...new Set(values)].sort();
}
export class ExpertDirectService {
    registry;
    skills;
    runtime;
    options;
    receipts = new Map();
    activeRuns = new Map();
    now;
    preflightTtlMs;
    constructor(registry, skills, runtime, options) {
        this.registry = registry;
        this.skills = skills;
        this.runtime = runtime;
        this.options = options;
        this.now = options.now ?? Date.now;
        this.preflightTtlMs = options.preflightTtlMs ?? DEFAULT_PREFLIGHT_TTL_MS;
    }
    catalog() {
        return this.registry.list()
            .filter((entry) => entry.source === "bundled_official" && entry.definition.channels.includes("direct"))
            .map((entry) => ({
            definition: structuredClone(entry.definition),
            source: "bundled_official",
            enabled: entry.enabled,
        }));
    }
    entry(definitionId, definitionVersion) {
        const entry = this.registry.getByDefinitionId(definitionId);
        if (!entry)
            throw new ExpertDirectError("definition_not_found", "Expert definition was not found.", 404);
        if (!entry.enabled)
            throw new ExpertDirectError("definition_disabled", "Expert definition is disabled.", 409);
        if (entry.source !== "bundled_official") {
            throw new ExpertDirectError("definition_not_activatable", "This legacy/local definition remains on its compatibility runtime and is not activatable in P1.", 409);
        }
        if (!entry.definition.channels.includes("direct")) {
            throw new ExpertDirectError("channel_not_declared", "Expert does not declare the direct channel.", 409);
        }
        if (entry.definition.definitionVersion !== definitionVersion) {
            throw new ExpertDirectError("definition_version_mismatch", `Requested ${definitionVersion}; installed version is ${entry.definition.definitionVersion}.`, 409);
        }
        return entry;
    }
    job(entry, jobId) {
        const selected = jobId
            ? entry.definition.jobs.find((job) => job.id === jobId)
            : entry.definition.jobs[0];
        if (!selected)
            throw new ExpertDirectError("job_not_found", "Expert job was not found.", 404);
        return selected;
    }
    grant(entry, request) {
        const policy = entry.definition.capabilityRequest;
        if (policy.mode !== "semantic") {
            throw new ExpertDirectError("semantic_policy_required", "Expert has no semantic capability policy.", 409);
        }
        const capabilities = request.grantedCapabilities === undefined
            ? [...policy.required]
            : unique(request.grantedCapabilities);
        const known = new Set(EXPERT_CAPABILITY_IDS);
        const requested = new Set([...policy.required, ...policy.optional]);
        const unknown = capabilities.filter((capability) => !known.has(capability));
        if (unknown.length > 0) {
            throw new ExpertDirectError("unknown_capability", `Unknown capability grant: ${unknown.join(", ")}.`);
        }
        const unrelated = capabilities.filter((capability) => !requested.has(capability));
        if (unrelated.length > 0) {
            throw new ExpertDirectError("capability_not_requested", `Expert did not request capability: ${unrelated.join(", ")}.`);
        }
        const hasWorkspaceGrant = capabilities.includes("workspace.read") || capabilities.includes("workspace.write");
        const workspaceRoots = request.workspaceAccess === "current" && hasWorkspaceGrant
            ? unique(this.options.workspaceRoots.map((root) => root.trim()).filter(Boolean))
            : [];
        const knowledgeNamespaces = capabilities.includes("knowledge.read")
            ? unique(entry.profile.knowledge ?? [])
            : [];
        return {
            capabilities,
            resourceScopes: [],
            workspaceRoots,
            knowledgeNamespaces,
            deniedTools: unique(request.deniedTools ?? []),
            approvalAvailable: !!this.options.approvalHandler,
        };
    }
    resolve(entry, grant) {
        const resolution = resolveExpertCapabilities({
            definition: entry.definition,
            toolDefinitions: this.skills.getToolCapabilityDefinitions(entry.profile.scope),
            channel: "direct",
            invocationRole: "primary",
            grant,
        });
        if (!resolution) {
            throw new ExpertDirectError("semantic_policy_required", "Expert has no semantic capability policy.", 409);
        }
        return resolution;
    }
    preflight(request) {
        this.sweepReceipts();
        const entry = this.entry(request.definitionId.trim(), request.definitionVersion.trim());
        const job = this.job(entry, request.jobId?.trim());
        const grant = this.grant(entry, request);
        const resolution = this.resolve(entry, grant);
        const blocked = resolution.missingRequired.length > 0 || resolution.missingRequiredProviders.length > 0;
        const degraded = !blocked
            && (resolution.blockedOptional.length > 0 || resolution.blockedOptionalProviders.length > 0);
        const status = blocked ? "blocked" : degraded ? "degraded" : "ready";
        const result = {
            status,
            definitionId: entry.definition.definitionId,
            definitionVersion: entry.definition.definitionVersion,
            jobId: job.id,
            runtimeAvailable: true,
            policyDigest: resolution.policyDigest,
            packageDigest: expertPackageDigest(entry),
            providerContractDigest: resolution.providerContractDigest,
            grantedCapabilities: [...resolution.grantedCapabilities],
            effectiveTools: [...resolution.effectiveTools],
            effectiveProviders: [...resolution.executionPolicy.allowedSkills],
            missingRequiredProviders: [...resolution.missingRequiredProviders],
            blockedOptionalProviders: [...resolution.blockedOptionalProviders],
            missingRequired: structuredClone(resolution.missingRequired),
            blockedOptional: structuredClone(resolution.blockedOptional),
            approvalRequiredTools: [...resolution.approvalRequiredTools],
        };
        if (!blocked) {
            const id = crypto.randomUUID();
            const expiresAt = this.now() + this.preflightTtlMs;
            this.receipts.set(id, {
                id,
                definitionId: entry.definition.definitionId,
                definitionVersion: entry.definition.definitionVersion,
                jobId: job.id,
                grant: structuredClone(grant),
                policyDigest: resolution.policyDigest,
                packageDigest: expertPackageDigest(entry),
                expiresAt,
            });
            result.preflightId = id;
            result.expiresAt = expiresAt;
        }
        return result;
    }
    sweepReceipts() {
        const now = this.now();
        for (const [id, receipt] of this.receipts) {
            if (receipt.expiresAt <= now)
                this.receipts.delete(id);
        }
    }
    consumeReceipt(id) {
        this.sweepReceipts();
        const receipt = this.receipts.get(id);
        if (!receipt)
            throw new ExpertDirectError("preflight_missing_or_expired", "Preflight is missing, expired, or already used.", 409);
        this.receipts.delete(id);
        return receipt;
    }
    runKey(definitionId, conversationId) {
        return `${definitionId}::${conversationId}`;
    }
    runtimeProfile(entry, resolution, job) {
        const allowed = new Set(resolution.executionPolicy.allowedSkills);
        return {
            ...entry.profile,
            version: entry.definition.definitionVersion,
            followUp: "never",
            sessionPolicy: "ephemeral",
            canDelegate: [],
            memoryNamespace: { read: null, write: null },
            contextPolicy: { memoryRetrieval: false, sessionLedger: false },
            allowedSkills: allowed,
            deniedSkills: (entry.profile.deniedSkills ?? []).filter((skill) => !allowed.has(skill)),
            shellAllowed: false,
            trustedCapabilityProjection: {
                source: "expert-capability-resolver",
                policyDigest: resolution.policyDigest,
                builtinSkillExemptions: allowed.has("filesystem") ? ["filesystem"] : [],
            },
            systemPrompt: composeExpertSystemPrompt(entry, job, DIRECT_EXPERT_RULES),
        };
    }
    async run(request, emit) {
        const text = request.text.trim();
        const conversationId = request.conversationId.trim();
        const turnId = request.turnId.trim();
        if (!text)
            throw new ExpertDirectError("empty_request", "Direct Expert input must not be empty.");
        if (!conversationId || !turnId)
            throw new ExpertDirectError("invalid_request", "conversationId and turnId are required.");
        if (text.length > DIRECT_INPUT_MAX_CHARS
            || Buffer.byteLength(text, "utf8") > DIRECT_INPUT_MAX_BYTES
            || estimateAgentRunTokens(text) > EXPERT_DIRECT_MAX_INPUT_TOKENS) {
            throw new ExpertDirectError("input_too_large", "Direct Expert input exceeds the safe envelope limit.", 413);
        }
        const preflight = this.consumeReceipt(request.preflightId.trim());
        const entry = this.entry(preflight.definitionId, preflight.definitionVersion);
        const job = this.job(entry, preflight.jobId);
        if (expertPackageDigest(entry) !== preflight.packageDigest) {
            throw new ExpertDirectError("preflight_stale", "Expert package content changed after preflight. Run preflight again.", 409);
        }
        const resolution = this.resolve(entry, preflight.grant);
        if (resolution.policyDigest !== preflight.policyDigest) {
            throw new ExpertDirectError("preflight_stale", "Expert version, provider inventory, or capability policy changed after preflight. Run preflight again.", 409);
        }
        if (resolution.missingRequired.length > 0 || resolution.missingRequiredProviders.length > 0) {
            throw new ExpertDirectError("preflight_stale", "A required capability became unavailable after preflight.", 409);
        }
        const key = this.runKey(entry.definition.definitionId, conversationId);
        if (this.activeRuns.has(key)) {
            throw new ExpertDirectError("conversation_busy", "This Expert conversation already has an active run.", 409);
        }
        const runId = AgentRunStore.newRunId();
        const sessionId = `expert-direct__${entry.definition.profileId}__${crypto.randomUUID().slice(0, 8)}`;
        const active = {
            definitionId: entry.definition.definitionId,
            conversationId,
            sessionId,
            runId,
            stopRequested: false,
        };
        this.activeRuns.set(key, active);
        const profile = this.runtimeProfile(entry, resolution, job);
        const projection = projectExpertExecutionPolicy(resolution.executionPolicy);
        const spec = buildExpertDirectRunSpec({
            runId,
            profile,
            definition: entry.definition,
            job,
            resolution,
            turnId,
            now: this.now(),
        });
        let answering = false;
        const onEvent = (event) => {
            if (event.type === "tool_start") {
                answering = false;
                emit({ type: "status", stage: "using_tool", label: event.toolName, runId });
            }
            else if (event.type === "text_delta" && typeof event.delta === "string") {
                if (!answering) {
                    answering = true;
                    emit({ type: "status", stage: "answering", runId });
                }
                emit({ type: "delta", delta: event.delta });
            }
            else if (event.type === "artifact" && event.payload) {
                emit({ type: "artifact", artifact: event.payload });
            }
        };
        emit({ type: "status", stage: "thinking", runId });
        try {
            const execution = await this.runtime.runService.execute(spec, this.runtime.executor.createExecutor({
                profile,
                userMessage: text,
                history: [],
                sessionId,
                requestContext: {
                    ...projection.transientRequestContext,
                    userId: `expert-direct:${entry.definition.definitionId}`,
                    traceId: turnId,
                    ...(this.options.approvalHandler ? { toolApprovalHandler: this.options.approvalHandler } : {}),
                },
                onEvent,
            }), (result) => ({
                passed: typeof result.output === "string" && result.output.trim().length > 0,
                summary: typeof result.output === "string" && result.output.trim().length > 0
                    ? "Direct Expert text output contract satisfied."
                    : "Direct Expert output must be non-empty text.",
            }));
            const finalText = String(execution.result.output ?? "").trim();
            emit({
                type: "done",
                text: active.stopRequested ? "" : finalText,
                aborted: active.stopRequested,
                traceId: turnId,
                runId,
            });
        }
        catch (error) {
            if (active.stopRequested || (error instanceof AgentRunExecutionError && error.code === "cancelled")) {
                emit({ type: "done", text: "", aborted: true, traceId: turnId, runId });
                return;
            }
            throw error;
        }
        finally {
            this.activeRuns.delete(key);
        }
    }
    stop(definitionId, conversationId) {
        const active = this.activeRuns.get(this.runKey(definitionId, conversationId));
        if (!active)
            return false;
        active.stopRequested = true;
        void this.runtime.runService.cancel(active.runId).catch((error) => {
            console.error(`[ExpertDirect] Failed to cancel AgentRun ${active.runId}:`, error);
        });
        return true;
    }
    stopConversation(conversationId) {
        const active = [...this.activeRuns.values()].find((run) => run.conversationId === conversationId);
        return active ? this.stop(active.definitionId, active.conversationId) : false;
    }
    reset(definitionId, conversationId) {
        this.stop(definitionId, conversationId);
        const entry = this.registry.getByDefinitionId(definitionId);
        if (!entry)
            throw new ExpertDirectError("definition_not_found", "Expert definition was not found.", 404);
        // P1c Direct is a fresh one-shot test surface. Historical Direct context files remain
        // untouched for rollback/export and are no longer read, appended, or deleted here.
    }
}
