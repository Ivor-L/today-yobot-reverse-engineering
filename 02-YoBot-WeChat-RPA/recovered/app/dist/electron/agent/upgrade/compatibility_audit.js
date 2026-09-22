import * as crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { parseExpertDeploymentBinding } from "../expert/deployment_types.js";
export const AGENT_UPGRADE_SNAPSHOT_VERSION = 1;
function portable(relativePath) {
    return relativePath.split(path.sep).join("/");
}
function sha256(bytes) {
    return crypto.createHash("sha256").update(bytes).digest("hex");
}
function contextKeyId(value) {
    const key = value;
    if (!key
        || typeof key.source !== "string"
        || typeof key.scopeId !== "string"
        || typeof key.profileId !== "string"
        || typeof key.conversationId !== "string") {
        return undefined;
    }
    return crypto.createHash("sha256").update(JSON.stringify({
        source: key.source,
        scopeId: key.scopeId,
        profileId: key.profileId,
        conversationId: key.conversationId,
    })).digest("hex");
}
async function walkFiles(root) {
    const files = [];
    const visit = async (directory) => {
        let entries;
        try {
            entries = await fs.readdir(directory, { withFileTypes: true });
        }
        catch (error) {
            if (error.code === "ENOENT")
                return;
            throw error;
        }
        for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
            const target = path.join(directory, entry.name);
            if (entry.isDirectory())
                await visit(target);
            else if (entry.isFile())
                files.push(target);
        }
    };
    await visit(root);
    return files;
}
async function captureTree(root, kind, issues, contextKeys) {
    const assets = [];
    for (const file of await walkFiles(root)) {
        const bytes = await fs.readFile(file);
        const relativePath = portable(path.relative(root, file));
        assets.push({ kind, relativePath, size: bytes.byteLength, sha256: sha256(bytes) });
        if (kind !== "context" || !relativePath.toLowerCase().endsWith(".json"))
            continue;
        try {
            const parsed = JSON.parse(bytes.toString("utf8"));
            if (parsed.version !== 1) {
                issues.push({ kind, relativePath, code: "unsupported_context_version" });
                continue;
            }
            const keyId = contextKeyId(parsed.key);
            if (!keyId || !Array.isArray(parsed.messages)) {
                issues.push({ kind, relativePath, code: "invalid_context_shape" });
                continue;
            }
            contextKeys.add(keyId);
        }
        catch {
            issues.push({ kind, relativePath, code: "invalid_json" });
        }
    }
    return assets;
}
async function captureTaskGroups(root, issues, taskGroupIds) {
    if (!root)
        return [];
    const assets = [];
    for (const file of await walkFiles(root)) {
        const relativePath = portable(path.relative(root, file));
        if (!relativePath.toLowerCase().endsWith(".json"))
            continue;
        const bytes = await fs.readFile(file);
        assets.push({
            kind: "task_group",
            relativePath,
            size: bytes.byteLength,
            sha256: sha256(bytes),
        });
        try {
            const parsed = JSON.parse(bytes.toString("utf8"));
            if (typeof parsed?.id !== "string" || !parsed.id.trim() || !Array.isArray(parsed.subTasks)) {
                issues.push({ kind: "task_group", relativePath, code: "invalid_task_group_shape" });
                continue;
            }
            if (taskGroupIds.has(parsed.id)) {
                issues.push({ kind: "task_group", relativePath, code: "invalid_task_group_shape" });
                continue;
            }
            taskGroupIds.add(parsed.id);
        }
        catch {
            issues.push({ kind: "task_group", relativePath, code: "invalid_json" });
        }
    }
    return assets;
}
async function captureCronStore(file, issues, cronJobIds) {
    if (!file)
        return [];
    let bytes;
    try {
        bytes = await fs.readFile(file);
    }
    catch (error) {
        if (error.code === "ENOENT")
            return [];
        throw error;
    }
    const relativePath = path.basename(file);
    const assets = [{
            kind: "cron_store",
            relativePath,
            size: bytes.byteLength,
            sha256: sha256(bytes),
        }];
    try {
        const parsed = JSON.parse(bytes.toString("utf8"));
        if (!Array.isArray(parsed?.jobs)) {
            issues.push({ kind: "cron_store", relativePath, code: "invalid_cron_store_shape" });
            return assets;
        }
        let valid = true;
        for (const item of parsed.jobs) {
            const job = item;
            const id = typeof job?.id === "string" ? job.id.trim() : "";
            if (!id || cronJobIds.has(id)) {
                valid = false;
                continue;
            }
            cronJobIds.add(id);
        }
        if (!valid)
            issues.push({ kind: "cron_store", relativePath, code: "invalid_cron_store_shape" });
    }
    catch {
        issues.push({ kind: "cron_store", relativePath, code: "invalid_json" });
    }
    return assets;
}
async function captureExpertDeployments(root, issues, deployments) {
    if (!root)
        return [];
    const assets = [];
    const seen = new Set();
    for (const file of await walkFiles(root)) {
        const relativePath = portable(path.relative(root, file));
        const bytes = await fs.readFile(file);
        assets.push({
            kind: "expert_deployment",
            relativePath,
            size: bytes.byteLength,
            sha256: sha256(bytes),
        });
        if (!relativePath.toLowerCase().endsWith(".json"))
            continue;
        try {
            const binding = parseExpertDeploymentBinding(JSON.parse(bytes.toString("utf8")));
            const parts = relativePath.split("/");
            const area = parts[0] === "staged"
                ? "staged"
                : parts[0] === "history"
                    ? "history"
                    : "current";
            const validPath = area === "current"
                ? parts.length === 1 && parts[0] === `${binding.bindingId}.json`
                : area === "staged"
                    ? parts.length === 2 && parts[1] === `${binding.bindingId}.json`
                    : parts.length === 3
                        && parts[1] === binding.bindingId
                        && parts[2] === `revision-${binding.revision}.json`;
            const stableKey = `${area}:${binding.bindingId}@${binding.revision}`;
            if (!validPath || seen.has(stableKey)) {
                issues.push({
                    kind: "expert_deployment",
                    relativePath,
                    code: "invalid_expert_deployment_shape",
                });
                continue;
            }
            seen.add(stableKey);
            deployments.push({
                area,
                bindingId: binding.bindingId,
                revision: binding.revision,
                status: binding.status,
                policyDigest: binding.policyDigest,
                packageDigest: binding.expertRef.packageDigest,
            });
        }
        catch {
            issues.push({
                kind: "expert_deployment",
                relativePath,
                code: "invalid_expert_deployment_shape",
            });
        }
    }
    return assets;
}
const SHA256_DIGEST = /^sha256:[a-f0-9]{64}$/;
async function captureExpertRouteGuard(file, issues, routeDigests) {
    if (!file)
        return [];
    let bytes;
    try {
        bytes = await fs.readFile(file);
    }
    catch (error) {
        if (error.code === "ENOENT")
            return [];
        throw error;
    }
    const relativePath = path.basename(file);
    const assets = [{
            kind: "expert_route_guard",
            relativePath,
            size: bytes.byteLength,
            sha256: sha256(bytes),
        }];
    try {
        const parsed = JSON.parse(bytes.toString("utf8"));
        if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.records))
            throw new Error("invalid guard root");
        for (const value of parsed.records) {
            const record = value;
            const routeDigest = typeof record?.routeDigest === "string" ? record.routeDigest : "";
            const valid = Boolean(record
                && SHA256_DIGEST.test(routeDigest)
                && typeof record.bindingIdDigest === "string"
                && SHA256_DIGEST.test(record.bindingIdDigest)
                && ["active", "fail_closed", "rollback_legacy", "retired", "blocked"].includes(String(record.state))
                && Number.isInteger(record.bindingRevision)
                && Number(record.bindingRevision) >= 1
                && Number.isInteger(record.updatedAt)
                && Number(record.updatedAt) >= 1
                && !routeDigests.has(routeDigest));
            if (!valid)
                throw new Error("invalid guard record");
            routeDigests.add(routeDigest);
        }
    }
    catch {
        issues.push({ kind: "expert_route_guard", relativePath, code: "invalid_expert_route_guard_shape" });
    }
    return assets;
}
function bindingId(value, index) {
    const binding = value;
    const id = String(binding?.id ?? binding?.botId ?? binding?.profileId ?? "").trim();
    const platform = String(binding?.platform ?? "unknown").trim().toLowerCase();
    return id ? `${platform}:${id}` : `invalid:${index}`;
}
/**
 * Capture only hashes, sizes and stable identifiers. Prompts, conversation text, API tokens and
 * absolute user paths are deliberately excluded from the report.
 */
export async function captureAgentUpgradeSnapshot(layout, now = new Date()) {
    const issues = [];
    const contextKeys = new Set();
    const taskGroupIds = new Set();
    const cronJobIds = new Set();
    const expertDeployments = [];
    const expertRouteDigests = new Set();
    const agentAssets = await captureTree(layout.agentsDir, "agent", issues, contextKeys);
    const contextAssets = await captureTree(layout.contextsDir, "context", issues, contextKeys);
    const taskGroupAssets = await captureTaskGroups(layout.taskGroupsDir, issues, taskGroupIds);
    const cronAssets = await captureCronStore(layout.cronStoreFile, issues, cronJobIds);
    const expertDeploymentAssets = await captureExpertDeployments(layout.expertDeploymentsDir, issues, expertDeployments);
    const expertRouteGuardAssets = await captureExpertRouteGuard(layout.expertRouteGuardFile, issues, expertRouteDigests);
    const rpaAssets = [];
    const rpaBindingIds = new Set();
    try {
        const bytes = await fs.readFile(layout.rpaBindingsFile);
        rpaAssets.push({
            kind: "rpa_binding",
            relativePath: "agents.json",
            size: bytes.byteLength,
            sha256: sha256(bytes),
        });
        try {
            const parsed = JSON.parse(bytes.toString("utf8"));
            if (!Array.isArray(parsed.agents)) {
                issues.push({ kind: "rpa_binding", relativePath: "agents.json", code: "invalid_binding_shape" });
            }
            else {
                parsed.agents.forEach((entry, index) => rpaBindingIds.add(bindingId(entry, index)));
            }
        }
        catch {
            issues.push({ kind: "rpa_binding", relativePath: "agents.json", code: "invalid_json" });
        }
    }
    catch (error) {
        if (error.code !== "ENOENT")
            throw error;
    }
    const agentIds = [...new Set(agentAssets
            .map((asset) => asset.relativePath.split("/")[0])
            .filter(Boolean))].sort();
    const assets = [
        ...agentAssets,
        ...contextAssets,
        ...rpaAssets,
        ...taskGroupAssets,
        ...cronAssets,
        ...expertDeploymentAssets,
        ...expertRouteGuardAssets,
    ]
        .sort((a, b) => `${a.kind}:${a.relativePath}`.localeCompare(`${b.kind}:${b.relativePath}`));
    return {
        schemaVersion: AGENT_UPGRADE_SNAPSHOT_VERSION,
        capturedAt: now.toISOString(),
        assets,
        agentIds,
        contextKeys: [...contextKeys].sort(),
        rpaBindingIds: [...rpaBindingIds].sort(),
        taskGroupIds: [...taskGroupIds].sort(),
        cronJobIds: [...cronJobIds].sort(),
        expertDeployments: expertDeployments.sort((left, right) => (`${left.area}:${left.bindingId}:${left.revision}`
            .localeCompare(`${right.area}:${right.bindingId}:${right.revision}`))),
        expertRouteDigests: [...expertRouteDigests].sort(),
        issues: issues.sort((a, b) => `${a.kind}:${a.relativePath}`.localeCompare(`${b.kind}:${b.relativePath}`)),
        summary: {
            agents: agentIds.length,
            agentFiles: agentAssets.length,
            contexts: contextAssets.length,
            rpaBindings: rpaBindingIds.size,
            taskGroups: taskGroupIds.size,
            cronJobs: cronJobIds.size,
            expertDeployments: expertDeployments.length,
            expertRoutes: expertRouteDigests.size,
            totalBytes: assets.reduce((sum, asset) => sum + asset.size, 0),
        },
    };
}
function assetId(asset) {
    return `${asset.kind}:${asset.relativePath}`;
}
function issueId(issue) {
    return `${issue.kind}:${issue.relativePath}:${issue.code}`;
}
function expertDeploymentId(deployment) {
    return [
        deployment.area,
        `${deployment.bindingId}@${deployment.revision}`,
        deployment.status,
        deployment.policyDigest,
        deployment.packageDigest,
    ].join(":");
}
function missing(before, after) {
    const afterSet = new Set(after);
    return before.filter((value) => !afterSet.has(value));
}
export function compareAgentUpgradeSnapshots(before, after, now = new Date()) {
    if (before.schemaVersion !== AGENT_UPGRADE_SNAPSHOT_VERSION || after.schemaVersion !== AGENT_UPGRADE_SNAPSHOT_VERSION) {
        throw new Error("Unsupported Agent upgrade snapshot version.");
    }
    const beforeAssets = new Map(before.assets.map((asset) => [assetId(asset), asset]));
    const afterAssets = new Map(after.assets.map((asset) => [assetId(asset), asset]));
    const added = after.assets.filter((asset) => !beforeAssets.has(assetId(asset)));
    const removed = before.assets.filter((asset) => !afterAssets.has(assetId(asset)));
    const changed = before.assets.flatMap((asset) => {
        const current = afterAssets.get(assetId(asset));
        return current && (current.sha256 !== asset.sha256 || current.size !== asset.size)
            ? [{ before: asset, after: current }]
            : [];
    });
    const unchanged = before.assets.length - removed.length - changed.length;
    const missingAgentIds = missing(before.agentIds, after.agentIds);
    const missingContextKeys = missing(before.contextKeys, after.contextKeys);
    const missingRpaBindingIds = missing(before.rpaBindingIds, after.rpaBindingIds);
    // Old snapshot files do not have these arrays. Treat them as an empty baseline so adding the
    // new audit coverage is non-breaking, while a later loss from a new snapshot still fails.
    const missingTaskGroupIds = missing(before.taskGroupIds ?? [], after.taskGroupIds ?? []);
    const missingCronJobIds = missing(before.cronJobIds ?? [], after.cronJobIds ?? []);
    const missingExpertDeployments = missing((before.expertDeployments ?? []).map(expertDeploymentId), (after.expertDeployments ?? []).map(expertDeploymentId));
    const missingExpertRouteDigests = missing(before.expertRouteDigests ?? [], after.expertRouteDigests ?? []);
    const previousIssues = new Set(before.issues.map(issueId));
    const newIssues = after.issues.filter((issue) => !previousIssues.has(issueId(issue)));
    // Agent definitions and conversation contexts must remain byte-stable across an upgrade.
    // RPA bindings, TaskGroups and Cron stores are live state: preserving their stable IDs and
    // valid shapes is the loss boundary, while normal progress/revision changes require review.
    const protectedAssetChanged = changed.some(({ before: asset }) => (asset.kind === "agent" || asset.kind === "context"));
    const hasLoss = removed.length > 0
        || protectedAssetChanged
        || missingAgentIds.length > 0
        || missingContextKeys.length > 0
        || missingRpaBindingIds.length > 0
        || missingTaskGroupIds.length > 0
        || missingCronJobIds.length > 0
        || missingExpertDeployments.length > 0
        || missingExpertRouteDigests.length > 0
        || newIssues.length > 0;
    const reviewAddition = added.some((asset) => (asset.kind === "agent"
        || asset.kind === "expert_deployment"
        || asset.kind === "expert_route_guard"));
    const verdict = hasLoss
        ? "fail"
        : changed.length > 0 || reviewAddition
            ? "review"
            : "pass";
    return {
        schemaVersion: AGENT_UPGRADE_SNAPSHOT_VERSION,
        comparedAt: now.toISOString(),
        verdict,
        summary: {
            unchanged,
            added: added.length,
            changed: changed.length,
            removed: removed.length,
            missingAgentIds: missingAgentIds.length,
            missingContextKeys: missingContextKeys.length,
            missingRpaBindingIds: missingRpaBindingIds.length,
            missingTaskGroupIds: missingTaskGroupIds.length,
            missingCronJobIds: missingCronJobIds.length,
            missingExpertDeployments: missingExpertDeployments.length,
            missingExpertRouteDigests: missingExpertRouteDigests.length,
            newIssues: newIssues.length,
        },
        added,
        changed,
        removed,
        missingAgentIds,
        missingContextKeys,
        missingRpaBindingIds,
        missingTaskGroupIds,
        missingCronJobIds,
        missingExpertDeployments,
        missingExpertRouteDigests,
        newIssues,
    };
}
export async function writeAgentUpgradeReport(filePath, value) {
    const directory = path.dirname(path.resolve(filePath));
    await fs.mkdir(directory, { recursive: true });
    const target = path.resolve(filePath);
    const temporary = path.join(directory, `.${path.basename(target)}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`);
    let handle;
    try {
        handle = await fs.open(temporary, "wx");
        await handle.writeFile(JSON.stringify(value, null, 2), "utf8");
        await handle.sync();
        await handle.close();
        handle = undefined;
        await fs.rename(temporary, target);
    }
    catch (error) {
        if (handle) {
            try {
                await handle.close();
            }
            catch { /* best effort */ }
        }
        try {
            await fs.rm(temporary, { force: true });
        }
        catch { /* best effort */ }
        throw error;
    }
}
