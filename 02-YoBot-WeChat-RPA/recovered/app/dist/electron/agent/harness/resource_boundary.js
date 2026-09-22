import fs from "node:fs/promises";
import path from "node:path";
function record(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : {};
}
async function canonicalizeWithExistingAncestor(value) {
    const resolved = path.resolve(value);
    let cursor = resolved;
    const suffix = [];
    while (true) {
        try {
            const canonical = await fs.realpath(cursor);
            return path.resolve(canonical, ...suffix);
        }
        catch (error) {
            if (error.code !== "ENOENT")
                throw error;
            const parent = path.dirname(cursor);
            if (parent === cursor)
                return resolved;
            suffix.unshift(path.basename(cursor));
            cursor = parent;
        }
    }
}
function inside(root, target) {
    const relative = path.relative(root, target);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
function configuredNames(value) {
    return Array.isArray(value)
        ? value.filter((item) => typeof item === "string" && !!item.trim())
        : [];
}
/**
 * Enforce argument-level workspace boundaries for a resolved expert run. Undefined policy keeps
 * every legacy call byte-for-byte compatible. When a policy exists, filesystem tools must declare
 * their path-bearing parameters and every supplied path must remain under a concrete granted root.
 */
export async function evaluateToolResourceBoundary(input) {
    if (!input.policy) {
        return { allowed: true, code: "resource_scope_allowed", reason: "No run-local resource boundary is installed." };
    }
    const metadata = input.metadata.metadata;
    const namespace = metadata?.namespace?.trim().toLowerCase() || "unknown";
    const scalarNames = configuredNames(metadata?.workspacePathParams);
    const arrayNames = configuredNames(metadata?.workspacePathArrayParams);
    const isFilesystem = namespace === "filesystem";
    if (isFilesystem && (!input.metadata.declared || scalarNames.length + arrayNames.length === 0)) {
        return {
            allowed: false,
            code: "workspace_path_metadata_missing",
            reason: "Filesystem tool metadata does not declare its workspace path arguments.",
        };
    }
    if (!isFilesystem && scalarNames.length + arrayNames.length === 0) {
        return { allowed: true, code: "resource_scope_allowed", reason: "This tool has no declared workspace path arguments." };
    }
    const params = record(input.params);
    const targets = [];
    for (const name of scalarNames) {
        const value = params[name];
        if (value === undefined || value === null || value === "")
            continue;
        if (typeof value !== "string" || !value.trim()) {
            return { allowed: false, code: "workspace_path_invalid", reason: `Workspace path argument ${name} is invalid.` };
        }
        targets.push(value.trim());
    }
    for (const name of arrayNames) {
        const value = params[name];
        if (value === undefined || value === null)
            continue;
        if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
            return { allowed: false, code: "workspace_path_invalid", reason: `Workspace path array ${name} is invalid.` };
        }
        targets.push(...value.map((item) => String(item).trim()));
    }
    if (isFilesystem && targets.length === 0) {
        return {
            allowed: false,
            code: "workspace_path_required",
            reason: "An explicit workspace path is required for an expert filesystem call.",
        };
    }
    if (targets.length === 0) {
        return { allowed: true, code: "resource_scope_allowed", reason: "No workspace path is used by this call." };
    }
    const configuredRoots = input.policy.workspaceRoots.map((root) => root.trim()).filter(Boolean);
    if (configuredRoots.length === 0) {
        return { allowed: false, code: "workspace_scope_missing", reason: "No concrete workspace root is granted to this run." };
    }
    const roots = await Promise.all(configuredRoots.map((root) => canonicalizeWithExistingAncestor(root)));
    for (const target of targets) {
        const canonicalTarget = await canonicalizeWithExistingAncestor(path.resolve(process.cwd(), target));
        if (!roots.some((root) => inside(root, canonicalTarget))) {
            return {
                allowed: false,
                code: "workspace_path_out_of_scope",
                reason: "A workspace path is outside the concrete roots granted to this run.",
            };
        }
    }
    return { allowed: true, code: "resource_scope_allowed", reason: "Workspace arguments are inside the granted roots." };
}
