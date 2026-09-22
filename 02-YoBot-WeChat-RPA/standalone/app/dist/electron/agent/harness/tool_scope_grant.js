function normalizeScopes(scopes) {
    if (!Array.isArray(scopes))
        return [];
    return [...new Set(scopes
            .filter((scope) => typeof scope === "string")
            .map((scope) => scope.trim().toLowerCase())
            .filter(Boolean))].sort().slice(0, 50);
}
export function validateToolPolicyScopeGrant(grant, binding, now = Date.now()) {
    if (!grant)
        return undefined;
    const scopes = normalizeScopes(grant.scopes);
    if (!scopes.length)
        return undefined;
    if (!grant.subjectId || grant.subjectId !== (binding.userId || "anonymous"))
        return undefined;
    if (!grant.channel || grant.channel !== binding.channel)
        return undefined;
    if ((grant.tenantId || "") !== (binding.tenantId || ""))
        return undefined;
    if (!Number.isFinite(grant.issuedAt) || !Number.isFinite(grant.expiresAt))
        return undefined;
    if (grant.issuedAt > now + 30_000 || grant.expiresAt <= now || grant.expiresAt - grant.issuedAt > 60 * 60_000) {
        return undefined;
    }
    return { ...grant, scopes };
}
/**
 * Explicit single-user compatibility only. Process scopes are never issued to remote/chat channels.
 * Multi-tenant deployments must inject an authenticated ToolPolicyScopeResolver into Gateway.
 */
export const legacyLocalScopeResolver = (binding) => {
    if (String(process.env.YOKO_ALLOW_LEGACY_PROCESS_SCOPES || "").trim().toLowerCase() !== "true") {
        return undefined;
    }
    if (!new Set(["websocket", "cli"]).has(binding.channel))
        return undefined;
    const scopes = normalizeScopes(String(process.env.YOKO_TOOL_POLICY_SCOPES || "")
        .split(","));
    if (!scopes.length)
        return undefined;
    const issuedAt = Date.now();
    return {
        source: "legacy_process_env",
        subjectId: binding.userId || "anonymous",
        channel: binding.channel,
        ...(binding.tenantId ? { tenantId: binding.tenantId } : {}),
        scopes,
        issuedAt,
        expiresAt: issuedAt + 10 * 60_000,
    };
};
export async function resolveToolPolicyScopeGrant(resolver, binding) {
    try {
        return validateToolPolicyScopeGrant(await resolver(binding), binding);
    }
    catch {
        return undefined;
    }
}
