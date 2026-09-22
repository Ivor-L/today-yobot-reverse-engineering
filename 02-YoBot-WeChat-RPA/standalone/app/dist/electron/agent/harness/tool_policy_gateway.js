import { randomUUID } from "node:crypto";
import { stableTraceHash } from "./context_projection_trace.js";
import { resolveTaskContractMode, taskContractRequiredForTool, TaskContractStore, } from "./task_contract.js";
import { DEFAULT_CRITICAL_DENY_TOOLS } from "./capability_manifest.js";
import { ConfigManager } from "../../core/config/manager.js";
import { evaluateToolResourceBoundary, } from "./resource_boundary.js";
export function resolveToolPolicyMode(value = process.env.YOKO_TOOL_POLICY) {
    const normalized = String(value ?? "shadow").trim().toLowerCase();
    if (["off", "false", "0", "legacy"].includes(normalized))
        return "off";
    if (["enforce", "true", "1", "on"].includes(normalized))
        return "enforce";
    return "shadow";
}
function envToolSet(value) {
    return new Set(String(value || "").split(",").map((name) => name.trim().toLowerCase()).filter(Boolean));
}
function rawSecurityEffects(metadata) {
    const effects = metadata?.metadata?.securityEffects;
    return Array.isArray(effects)
        ? effects.filter((effect) => typeof effect === "string")
        : [];
}
export const LOCAL_FILE_MUTATION_EFFECT = "local_file_mutation";
/**
 * Backward-compatible triggers: staging one of these direct filesystem mutators means staging the
 * whole local-file-mutation effect, including ambient executors such as shell_exec.
 */
const FILE_MUTATION_STAGE_TRIGGERS = new Set([
    "fs_write_file",
    "fs_delete_file",
    "fs_remove_file",
    "fs_move_file",
    "fs_rename_file",
    "fs_patch_file",
    "fs_append_file",
]);
export function resolveFileMutationPolicyMode(value = process.env.YOKO_FILE_MUTATION_POLICY
    ?? ConfigManager.getInstance().getSystemConfig().fileMutationPolicy) {
    const normalized = String(value || "shadow").trim().toLowerCase();
    if (["deny", "read_only", "readonly", "read-only"].includes(normalized))
        return "deny";
    if (["enforce", "ask", "approval"].includes(normalized))
        return "enforce";
    if (["shadow", "auto", "solo", "off"].includes(normalized))
        return "shadow";
    // A misspelled operator override must not silently turn approval/read-only into auto mode.
    return "enforce";
}
export function resolveFileMutationPolicyModeForChannel(channel, system = ConfigManager.getInstance().getSystemConfig()) {
    if (process.env.YOKO_FILE_MUTATION_POLICY !== undefined) {
        return resolveFileMutationPolicyMode(process.env.YOKO_FILE_MUTATION_POLICY);
    }
    return new Set(["websocket", "cli"]).has(String(channel || "").trim().toLowerCase())
        ? resolveFileMutationPolicyMode(system.fileMutationPolicy)
        : resolveFileMutationPolicyMode(system.remoteFileMutationPolicy);
}
function stagedSecurityEffects(stagedToolsValue, effectsValue, fileMutationPolicyValue) {
    const effects = envToolSet(effectsValue);
    const stagedTools = envToolSet(stagedToolsValue);
    if ([...stagedTools].some((tool) => FILE_MUTATION_STAGE_TRIGGERS.has(tool))) {
        effects.add(LOCAL_FILE_MUTATION_EFFECT);
    }
    if (resolveFileMutationPolicyMode(fileMutationPolicyValue) === "enforce") {
        effects.add(LOCAL_FILE_MUTATION_EFFECT);
    }
    return effects;
}
function explicitlyStagedSecurityEffects(stagedToolsValue, effectsValue) {
    const effects = envToolSet(effectsValue);
    const stagedTools = envToolSet(stagedToolsValue);
    if ([...stagedTools].some((tool) => FILE_MUTATION_STAGE_TRIGGERS.has(tool))) {
        effects.add(LOCAL_FILE_MUTATION_EFFECT);
    }
    return effects;
}
export function resolveToolPolicyModeForTool(toolName, baseValue = process.env.YOKO_TOOL_POLICY, stagedValue = process.env.YOKO_TOOL_POLICY_ENFORCE_TOOLS, metadata, stagedEffectsValue = process.env.YOKO_TOOL_POLICY_ENFORCE_EFFECTS, fileMutationPolicyValue) {
    const base = resolveToolPolicyMode(baseValue);
    if (base === "off")
        return "off";
    const staged = envToolSet(stagedValue);
    const effects = stagedSecurityEffects(stagedValue, stagedEffectsValue, fileMutationPolicyValue);
    if (staged.size === 0 && effects.size === 0)
        return base;
    if (staged.has(toolName.trim().toLowerCase()))
        return "enforce";
    // Security effects remain authoritative even when another metadata field is malformed. Using
    // `declared` here would let an incompletely declared mutator fall back to shadow and bypass the
    // very policy that is meant to contain it.
    const toolEffects = rawSecurityEffects(metadata);
    // Staging is monotonic: it may upgrade a subset from shadow to enforce, but it must never
    // weaken an operator-selected enforce policy for tools outside that subset.
    return toolEffects.some((effect) => effects.has(effect)) ? "enforce" : base;
}
function enterprisePolicyIsExplicitlyEnforced(input) {
    if (input.mode !== undefined)
        return resolveToolPolicyMode(input.mode) === "enforce";
    if (resolveToolPolicyMode() === "enforce")
        return true;
    const normalizedToolName = input.toolName.trim().toLowerCase();
    if (envToolSet(process.env.YOKO_TOOL_POLICY_ENFORCE_TOOLS).has(normalizedToolName))
        return true;
    const stagedEffects = explicitlyStagedSecurityEffects(process.env.YOKO_TOOL_POLICY_ENFORCE_TOOLS, process.env.YOKO_TOOL_POLICY_ENFORCE_EFFECTS);
    return rawSecurityEffects(input.metadata).some((effect) => stagedEffects.has(effect));
}
export function resolveToolPolicyVersionCoordinate() {
    const staged = [...envToolSet(process.env.YOKO_TOOL_POLICY_ENFORCE_TOOLS)].sort();
    const effects = [...stagedSecurityEffects(process.env.YOKO_TOOL_POLICY_ENFORCE_TOOLS, process.env.YOKO_TOOL_POLICY_ENFORCE_EFFECTS, undefined)].sort();
    const criticalAllow = [...envToolSet(process.env.YOKO_TOOL_POLICY_CRITICAL_ALLOW)].sort();
    return `${resolveToolPolicyMode()}:fileMutation=${resolveFileMutationPolicyMode()}:staged=${stableTraceHash(staged)}:effects=${stableTraceHash(effects)}:critical=${stableTraceHash(criticalAllow)}`;
}
function desiredDecision(toolName, metadata, scopes) {
    if (!metadata.declared || !metadata.metadata) {
        return {
            decision: "deny",
            code: "tool_metadata_missing",
            reason: "Enterprise tool metadata is incomplete.",
        };
    }
    const criticalDeny = new Set(DEFAULT_CRITICAL_DENY_TOOLS.map((name) => name.toLowerCase()));
    const criticalAllow = envToolSet(process.env.YOKO_TOOL_POLICY_CRITICAL_ALLOW);
    if ((metadata.metadata.risk === "critical" || criticalDeny.has(toolName.toLowerCase()))
        && !criticalAllow.has(toolName.toLowerCase())) {
        return {
            decision: "deny",
            code: "critical_tool_not_enabled",
            reason: "This critical tool requires an explicit administrator allowlist entry.",
        };
    }
    const requiredScopes = metadata.metadata.requiredScopes || [];
    const missingScope = requiredScopes.find((scope) => !scopes.includes(scope));
    if (missingScope) {
        return {
            decision: "deny",
            code: "required_scope_missing",
            reason: `Required scope is missing: ${missingScope}`,
        };
    }
    const approvalRequired = metadata.metadata.approval === "always"
        || (metadata.metadata.approval === "policy"
            && (metadata.metadata.sideEffect !== "none"
                || metadata.metadata.risk === "high"
                || metadata.metadata.risk === "critical"));
    if (approvalRequired) {
        return {
            decision: "approval_required",
            code: "approval_required",
            reason: "Tool policy requires user approval.",
        };
    }
    return { decision: "allow", code: "allowed", reason: "Tool policy allowed execution." };
}
/**
 * Shared, side-effect-free policy preflight used by both the runtime Gateway and Expert Resolver.
 * Approval-required tools remain selectable only when the caller declares an approval channel.
 */
export function preflightToolPolicy(input) {
    const desired = desiredDecision(input.toolName, input.metadata, input.scopes ?? []);
    if (desired.decision === "deny")
        return { admitted: false, ...desired };
    if (desired.decision === "approval_required" && input.approvalAvailable !== true) {
        return {
            admitted: false,
            decision: "approval_required",
            code: "approval_unavailable",
            reason: "Tool approval is required but this invocation has no approval channel.",
        };
    }
    return { admitted: true, ...desired };
}
function fileMutationDecision() {
    return {
        decision: "approval_required",
        code: "approval_required",
        reason: "The user's file permission requires approval before this file-changing operation.",
    };
}
function abortableApproval(handler, request, signal) {
    if (signal?.aborted)
        return Promise.reject(signal.reason ?? new Error("aborted_by_user"));
    return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (callback) => {
            if (settled)
                return;
            settled = true;
            signal?.removeEventListener("abort", onAbort);
            callback();
        };
        const onAbort = () => finish(() => reject(signal?.reason ?? new Error("aborted_by_user")));
        signal?.addEventListener("abort", onAbort, { once: true });
        Promise.resolve(handler(request, signal)).then((decision) => finish(() => resolve(typeof decision === "string" ? { decision } : decision)), (error) => finish(() => reject(error)));
    });
}
export async function authorizeToolCall(input) {
    // Some non-interactive entry points historically omitted this field. Resolve it centrally so
    // read-only/approval policy cannot silently disappear merely because a caller forgot to copy
    // request context. Unknown channels use the remote policy, which is the safer fallback.
    const fileMutationPolicyMode = input.fileMutationPolicyMode
        ?? resolveFileMutationPolicyModeForChannel(input.channel || "unknown");
    const mode = input.mode !== undefined
        ? resolveToolPolicyMode(input.mode)
        : resolveToolPolicyModeForTool(input.toolName, undefined, undefined, input.metadata, undefined, fileMutationPolicyMode);
    const enterpriseEnforced = enterprisePolicyIsExplicitlyEnforced(input);
    const fileMutationEffect = rawSecurityEffects(input.metadata).includes(LOCAL_FILE_MUTATION_EFFECT);
    // The user-facing file permission is a separate policy axis from the enterprise capability
    // allowlist/scope rollout. Asking before a file change must not accidentally activate unfinished
    // critical/scope gates for every shell, CLI or stdio MCP tool. Explicit global/staged enterprise
    // enforcement still retains those stronger gates.
    const fileMutationOnlyEnforcement = mode === "enforce"
        && fileMutationPolicyMode === "enforce"
        && fileMutationEffect
        && !enterpriseEnforced;
    const desired = fileMutationOnlyEnforcement
        ? fileMutationDecision()
        : desiredDecision(input.toolName, input.metadata, input.scopes || []);
    const contractMode = input.contractMode ?? resolveTaskContractMode();
    const sideEffect = input.metadata.metadata?.sideEffect ?? "unknown";
    const contractRequired = taskContractRequiredForTool(input.toolName, sideEffect);
    const activeContract = contractRequired && input.sessionId
        ? TaskContractStore.getInstance().active(input.sessionId)
        : undefined;
    const includedScope = new Set((activeContract?.contract.scope.included || []).map((item) => item.trim().toLowerCase()));
    const toolScopeAllowed = !activeContract || [
        "*",
        input.toolName.toLowerCase(),
        `tool:${input.toolName.toLowerCase()}`,
        `capability:${input.metadata.metadata?.capability || "unknown"}`.toLowerCase(),
        `namespace:${input.metadata.metadata?.namespace || "unknown"}`.toLowerCase(),
    ].some((scope) => includedScope.has(scope));
    const contractState = contractRequired
        ? (!activeContract ? "missing" : toolScopeAllowed ? "active" : "scope_mismatch")
        : "not_required";
    const contractFields = { contractMode, contractRequired, contractState };
    // Preserve the legacy function's synchronous progress-to-approval behavior when no expert
    // resource policy is installed; several cancellation paths intentionally rely on it.
    if (input.resourcePolicy) {
        const resourceBoundary = await evaluateToolResourceBoundary({
            params: input.params,
            metadata: input.metadata,
            policy: input.resourcePolicy,
        });
        if (!resourceBoundary.allowed) {
            return {
                allowed: false,
                mode,
                decision: "deny",
                wouldDecision: "deny",
                code: resourceBoundary.code,
                reason: resourceBoundary.reason,
                ...contractFields,
            };
        }
    }
    const fileMutationDenied = fileMutationPolicyMode === "deny" && fileMutationEffect;
    if (fileMutationDenied) {
        return {
            allowed: false,
            mode,
            decision: "deny",
            wouldDecision: "deny",
            code: "file_mutation_read_only",
            reason: "File changes are disabled by the user's read-only permission mode.",
            ...contractFields,
        };
    }
    if (contractMode === "enforce" && contractState !== "active" && contractState !== "not_required") {
        return {
            allowed: false,
            mode,
            decision: "deny",
            wouldDecision: "deny",
            code: contractState === "scope_mismatch" ? "task_contract_scope_mismatch" : "task_contract_required",
            reason: contractState === "scope_mismatch"
                ? "The active task contract does not include this tool or capability in scope."
                : "Set an active task contract before executing a write or unknown-side-effect tool.",
            ...contractFields,
        };
    }
    if (mode === "off") {
        return {
            allowed: true,
            mode,
            decision: "allow",
            wouldDecision: desired.decision,
            code: "gateway_off",
            reason: "Incremental Tool Policy Gateway is disabled.",
            ...contractFields,
        };
    }
    if (mode === "shadow") {
        // Contract state is already emitted as an orthogonal trace field. It must not overwrite the
        // tool-policy wouldDecision, otherwise shadow telemetry cannot predict approval/deny volume.
        return {
            allowed: true,
            mode,
            decision: "allow",
            wouldDecision: desired.decision,
            code: `shadow_${desired.code}`,
            reason: desired.reason,
            ...contractFields,
        };
    }
    if (input.signal?.aborted) {
        return {
            allowed: false,
            mode,
            decision: "aborted",
            wouldDecision: "aborted",
            code: "aborted_by_user",
            reason: "Operation was aborted before authorization.",
            ...contractFields,
        };
    }
    if (desired.decision === "deny") {
        return {
            allowed: false,
            mode,
            decision: "deny",
            wouldDecision: "deny",
            code: desired.code,
            reason: desired.reason,
            ...contractFields,
        };
    }
    if (desired.decision === "allow") {
        return {
            allowed: true,
            mode,
            decision: "allow",
            wouldDecision: "allow",
            code: desired.code,
            reason: desired.reason,
            ...contractFields,
        };
    }
    if (!input.approvalHandler) {
        return {
            allowed: false,
            mode,
            decision: "deny",
            wouldDecision: "approval_required",
            code: "approval_unavailable",
            reason: "Approval is required but no approval channel is available.",
            ...contractFields,
        };
    }
    const approvalRequestId = randomUUID();
    try {
        const decision = await abortableApproval(input.approvalHandler, {
            id: approvalRequestId,
            toolName: input.toolName,
            risk: input.metadata.metadata?.risk || "critical",
            sideEffect: input.metadata.metadata?.sideEffect || "external",
            capability: input.metadata.metadata?.capability || "unknown",
            args: input.params,
            createdAt: Date.now(),
            approvalCategory: fileMutationEffect ? "file_mutation" : "protected_operation",
        }, input.signal);
        if (input.signal?.aborted) {
            return {
                allowed: false,
                mode,
                decision: "aborted",
                wouldDecision: "approval_required",
                code: "aborted_by_user",
                reason: "Operation was aborted after approval and before execution.",
                approvalRequestId,
                ...contractFields,
            };
        }
        if (decision.decision === "pending") {
            const token = decision.challengeToken;
            return {
                allowed: false,
                mode,
                decision: "deny",
                wouldDecision: "approval_required",
                code: decision.code || "approval_pending",
                reason: decision.message || (token
                    ? `User approval is required. Ask the user to reply exactly: 确认执行 ${token}`
                    : "User approval is required before this exact tool call can execute."),
                approvalRequestId,
                ...(decision.expiresAt ? { approvalExpiresAt: decision.expiresAt } : {}),
                ...contractFields,
            };
        }
        return decision.decision === "approved"
            ? {
                allowed: true,
                mode,
                decision: "allow",
                wouldDecision: "approval_required",
                code: "approval_granted",
                reason: "User approved the tool call.",
                approvalRequestId,
                ...(decision.approvedArgs !== undefined ? { approvedParams: decision.approvedArgs } : {}),
                ...contractFields,
            }
            : {
                allowed: false,
                mode,
                decision: "deny",
                wouldDecision: "approval_required",
                code: decision.code || "approval_denied",
                reason: decision.message || "User denied the tool call.",
                approvalRequestId,
                ...contractFields,
            };
    }
    catch {
        return {
            allowed: false,
            mode,
            decision: input.signal?.aborted ? "aborted" : "deny",
            wouldDecision: "approval_required",
            code: input.signal?.aborted ? "aborted_by_user" : "approval_error",
            reason: input.signal?.aborted
                ? "Operation was aborted while waiting for approval."
                : "Approval service failed.",
            approvalRequestId,
            ...contractFields,
        };
    }
}
export function toolPolicyDecisionTrace(input, result) {
    const fileMutationPolicyMode = input.fileMutationPolicyMode
        ?? resolveFileMutationPolicyModeForChannel(input.channel || "unknown");
    const enforcementBasis = result.mode !== "enforce"
        ? result.mode
        : enterprisePolicyIsExplicitlyEnforced(input)
            ? "enterprise"
            : fileMutationPolicyMode === "enforce"
                && rawSecurityEffects(input.metadata).includes(LOCAL_FILE_MUTATION_EFFECT)
                ? "file_mutation"
                : "policy";
    return {
        schemaVersion: 1,
        toolName: input.toolName,
        argsHash: stableTraceHash(input.params),
        mode: result.mode,
        enforcementBasis,
        fileMutationPolicyMode,
        decision: result.decision,
        wouldDecision: result.wouldDecision,
        code: result.code,
        ...(result.approvalRequestId ? { approvalRequestId: result.approvalRequestId } : {}),
        ...(result.approvalExpiresAt ? { approvalExpiresAt: result.approvalExpiresAt } : {}),
        metadataDeclared: input.metadata.declared,
        sideEffect: input.metadata.metadata?.sideEffect ?? "unknown",
        risk: input.metadata.metadata?.risk ?? "unknown",
        securityEffects: input.metadata.metadata?.securityEffects ?? [],
        scopeSource: input.scopeSource || "none",
        scopeCount: (input.scopes || []).length,
        scopeSetHash: stableTraceHash([...(input.scopes || [])].sort()),
        resourceBoundaryInstalled: input.resourcePolicy !== undefined,
        workspaceRootCount: input.resourcePolicy?.workspaceRoots.length ?? 0,
        knowledgeNamespaceCount: input.resourcePolicy?.knowledgeNamespaces.length ?? 0,
        contractMode: result.contractMode,
        contractRequired: result.contractRequired,
        contractState: result.contractState,
    };
}
export function executionModeForTool(toolName, metadata, mode = resolveToolPolicyModeForTool(toolName, undefined, undefined, metadata)) {
    // Execution mode is a tool safety property, not a process-global policy setting. Respect the
    // declared mode in every request so config-driven file approval cannot run mutators in parallel.
    if (metadata.declared && metadata.metadata?.executionMode) {
        return metadata.metadata.executionMode;
    }
    if (mode !== "enforce")
        return undefined;
    return "sequential";
}
