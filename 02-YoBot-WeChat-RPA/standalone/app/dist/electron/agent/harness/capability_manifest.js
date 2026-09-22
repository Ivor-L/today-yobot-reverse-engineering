import { stableTraceHash } from "./context_projection_trace.js";
import { resolveEnterpriseToolMetadata } from "./tool_execution.js";
export const CAPABILITY_MANIFEST_VERSION = "tool-capability-manifest-v3";
/** These tools never become implicitly executable merely because metadata is later added. */
export const DEFAULT_CRITICAL_DENY_TOOLS = Object.freeze([
    "agent_create",
    "agent_update",
    "mcp_add",
    "mcp_remove",
    "shell_exec",
    "xhs_publish",
]);
const KNOWN_FILE_MUTATION_TOOLS = new Set([
    "fs_write_file", "fs_delete_file", "fs_move_file",
    "shell_exec", "mcp_add", "mcp_remove",
    "agent_create", "agent_update",
    "wechat_get_contacts", "wechat_create_moment_plan",
]);
const FILE_MUTATION_VERIFIER_REQUIRED = new Set([
    "fs_write_file", "fs_delete_file", "fs_move_file",
]);
function auditFileMutationAdmission(tools) {
    const violations = [];
    const members = tools.filter((tool) => tool.securityEffects.includes("local_file_mutation"))
        .map((tool) => tool.name).sort();
    for (const tool of tools) {
        const isMember = tool.securityEffects.includes("local_file_mutation");
        const nameSuggestsFileMutation = /(?:^|_)(?:write|delete|remove|move|rename|append|patch)(?:_|$)/i.test(tool.name)
            && /(?:file|filesystem|path)/i.test(`${tool.name}:${tool.namespace}:${tool.capability}`);
        // A Standard Skill wrapper describes a workflow but does not itself mutate files, while an
        // HTTP MCP tool executes outside this device's local-filesystem trust boundary. Name matching
        // remains useful for native tools, but must not turn either abstraction into a false admission
        // failure. Stdio MCP tools are still explicitly tagged by MCPManager and remain protected.
        const nameHeuristicExempt = tool.namespace === "skill"
            || (tool.namespace.startsWith("mcp.") && tool.sideEffect === "external");
        const requiresEffect = KNOWN_FILE_MUTATION_TOOLS.has(tool.name)
            || (tool.namespace === "filesystem" && tool.sideEffect !== "none")
            || tool.namespace === "cli"
            || tool.capability === "shell_execute"
            || (nameSuggestsFileMutation && !nameHeuristicExempt);
        if (requiresEffect && !isMember)
            violations.push({ name: tool.name, code: "local_file_mutation_effect_missing" });
        if (isMember && !tool.declared)
            violations.push({ name: tool.name, code: "effect_metadata_not_enforceable" });
        if (FILE_MUTATION_VERIFIER_REQUIRED.has(tool.name)) {
            const definition = tool;
            if (!definition.verifierId)
                violations.push({ name: tool.name, code: "file_mutation_verifier_missing" });
        }
    }
    return {
        ok: violations.length === 0,
        members,
        violations: violations.sort((left, right) => left.name.localeCompare(right.name) || left.code.localeCompare(right.code)),
    };
}
export function buildCapabilityManifest(definitions, scope = "main", criticalDenyTools = DEFAULT_CRITICAL_DENY_TOOLS) {
    const deny = new Set(criticalDenyTools.map((name) => name.toLowerCase()));
    const tools = definitions.map(({ owner, definition }) => {
        const resolution = resolveEnterpriseToolMetadata(definition);
        const metadata = resolution.metadata;
        return {
            owner,
            name: definition.name,
            declared: resolution.declared,
            missingFields: [...resolution.missingFields].sort(),
            validationIssues: [...resolution.validationIssues].sort(),
            namespace: metadata?.namespace ?? "unknown",
            capability: metadata?.capability ?? "unknown",
            sideEffect: metadata?.sideEffect ?? "unknown",
            risk: metadata?.risk ?? "unknown",
            approval: metadata?.approval ?? "unknown",
            securityEffects: [...(metadata?.securityEffects || [])].sort(),
            verifierId: metadata?.verifierId,
            criticalDeny: deny.has(definition.name.toLowerCase()),
        };
    }).sort((left, right) => left.name.localeCompare(right.name) || left.owner.localeCompare(right.owner));
    const byRisk = {};
    const bySideEffect = {};
    const bySecurityEffect = {};
    for (const tool of tools) {
        byRisk[tool.risk] = (byRisk[tool.risk] || 0) + 1;
        bySideEffect[tool.sideEffect] = (bySideEffect[tool.sideEffect] || 0) + 1;
        for (const effect of tool.securityEffects) {
            bySecurityEffect[effect] = (bySecurityEffect[effect] || 0) + 1;
        }
    }
    const missing = tools.filter((tool) => tool.missingFields.length > 0).length;
    const invalid = tools.filter((tool) => tool.missingFields.length === 0 && tool.validationIssues.length > 0).length;
    const projection = { scope, tools };
    const fileMutationAdmission = auditFileMutationAdmission(tools);
    return {
        schemaVersion: 1,
        manifestVersion: CAPABILITY_MANIFEST_VERSION,
        scope,
        manifestHash: `sha256:${stableTraceHash(projection)}`,
        counts: {
            total: tools.length,
            valid: tools.filter((tool) => tool.declared).length,
            invalid,
            missing,
            criticalDeny: tools.filter((tool) => tool.criticalDeny).length,
            byRisk,
            bySideEffect,
            bySecurityEffect,
            fileMutationAdmissionViolations: fileMutationAdmission.violations.length,
        },
        fileMutationAdmission,
        tools,
    };
}
/** Trace projection deliberately omits descriptions, schemas, scopes, and arguments. */
export function capabilityManifestTrace(manifest) {
    return {
        schemaVersion: manifest.schemaVersion,
        manifestVersion: manifest.manifestVersion,
        scope: manifest.scope,
        manifestHash: manifest.manifestHash,
        counts: manifest.counts,
        fileMutationAdmission: manifest.fileMutationAdmission,
        tools: manifest.tools.map((tool) => ({
            owner: tool.owner,
            name: tool.name,
            declared: tool.declared,
            missingFields: tool.missingFields,
            validationIssues: tool.validationIssues,
            namespace: tool.namespace,
            capability: tool.capability,
            sideEffect: tool.sideEffect,
            risk: tool.risk,
            approval: tool.approval,
            securityEffects: tool.securityEffects,
            criticalDeny: tool.criticalDeny,
        })),
    };
}
