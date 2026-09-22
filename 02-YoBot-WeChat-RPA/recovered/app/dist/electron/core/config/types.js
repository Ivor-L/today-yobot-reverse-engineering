export const DEFAULT_MCP_GATEWAY_CONFIG = {
    enabled: false,
    port: 9922,
    token: "",
    exposedSkills: ["wechat-rpa"],
};
export const DEFAULT_SYSTEM_CONFIG = {
    // Preserve the established desktop experience: local work is automatic,
    // while remote channels still require an explicit approval.
    shellSafetyLevel: "loose",
    filePermissionMode: "local_solo",
    fileMutationPolicy: "shadow",
    remoteFileMutationPolicy: "enforce",
    language: "zh-CN",
    theme: "system",
    closeToTray: true
};
export function normalizeFileMutationPolicy(value, fallback) {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (["deny", "read_only", "readonly", "read-only"].includes(normalized))
        return "deny";
    if (["enforce", "ask", "approval"].includes(normalized))
        return "enforce";
    if (["shadow", "auto", "solo"].includes(normalized))
        return "shadow";
    return fallback;
}
export function normalizeShellSafetyLevel(value) {
    if (value === undefined || value === null || String(value).trim() === "") {
        return DEFAULT_SYSTEM_CONFIG.shellSafetyLevel;
    }
    const normalized = String(value).trim().toLowerCase();
    if (normalized === "loose")
        return "loose";
    if (normalized === "strict")
        return "strict";
    // An explicit but invalid operator value must not silently disable the filesystem sandbox.
    return "strict";
}
export function inferFilePermissionMode(system) {
    if (system.fileMutationPolicy === "deny"
        && system.remoteFileMutationPolicy === "deny")
        return "read_only";
    if (system.fileMutationPolicy === "enforce"
        && system.remoteFileMutationPolicy === "enforce")
        return "ask";
    if (system.fileMutationPolicy === "shadow"
        && system.remoteFileMutationPolicy === "enforce")
        return "local_solo";
    return "custom";
}
export function applyFilePermissionMode(system, mode) {
    if (mode === "read_only") {
        return {
            ...system,
            filePermissionMode: mode,
            fileMutationPolicy: "deny",
            remoteFileMutationPolicy: "deny",
        };
    }
    if (mode === "ask") {
        return {
            ...system,
            filePermissionMode: mode,
            fileMutationPolicy: "enforce",
            remoteFileMutationPolicy: "enforce",
        };
    }
    return {
        ...system,
        filePermissionMode: mode,
        fileMutationPolicy: "shadow",
        remoteFileMutationPolicy: "enforce",
    };
}
export function normalizeSystemConfig(input) {
    const base = {
        ...DEFAULT_SYSTEM_CONFIG,
        ...(input || {}),
        shellSafetyLevel: normalizeShellSafetyLevel(input?.shellSafetyLevel),
        filePermissionMode: "custom",
        fileMutationPolicy: normalizeFileMutationPolicy(input?.fileMutationPolicy, DEFAULT_SYSTEM_CONFIG.fileMutationPolicy),
        remoteFileMutationPolicy: normalizeFileMutationPolicy(input?.remoteFileMutationPolicy, DEFAULT_SYSTEM_CONFIG.remoteFileMutationPolicy),
        closeToTray: input?.closeToTray ?? DEFAULT_SYSTEM_CONFIG.closeToTray,
    };
    const requested = input?.filePermissionMode;
    const hasExplicitMutationPolicy = input != null && (Object.prototype.hasOwnProperty.call(input, "fileMutationPolicy")
        || Object.prototype.hasOwnProperty.call(input, "remoteFileMutationPolicy"));
    // The two permission axes are independent. Persisted low-level policies are the source of
    // truth; the aggregate mode is only a convenient mutation-policy preset/display value.
    // Older configs that contain only the aggregate mode are still migrated through the preset.
    if (!hasExplicitMutationPolicy
        && (requested === "read_only" || requested === "ask" || requested === "local_solo")) {
        return applyFilePermissionMode(base, requested);
    }
    return { ...base, filePermissionMode: inferFilePermissionMode(base) };
}
