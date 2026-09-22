import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
const MAX_TRACKED_SESSIONS = 512;
const projectionStates = new Map();
const MESSAGE_TOP_LEVEL_KEYS = [
    "role",
    "content",
    "toolCallId",
    "tool_call_id",
    "toolName",
    "name",
    "isError",
];
const OMITTED_NESTED_KEYS = new Set([
    // Transport-only marker: Pi intentionally moves it to the newest cache breakpoint.
    "cache_control",
    // These fields are diagnostics/session metadata and are not part of the provider prompt.
    "timestamp",
    "usage",
    "details",
]);
function normalizeScalar(value) {
    if (typeof value === "bigint")
        return value.toString();
    if (typeof value === "number" && !Number.isFinite(value))
        return String(value);
    return value;
}
function canonicalize(value, seen) {
    const scalar = normalizeScalar(value);
    if (scalar === null || typeof scalar !== "object") {
        if (typeof scalar === "function" || typeof scalar === "symbol" || scalar === undefined)
            return null;
        return scalar;
    }
    if (seen.has(scalar))
        return "[Circular]";
    seen.add(scalar);
    try {
        if (Array.isArray(scalar)) {
            return scalar.map((item) => canonicalize(item, seen));
        }
        const input = scalar;
        const output = {};
        for (const key of Object.keys(input).sort()) {
            if (OMITTED_NESTED_KEYS.has(key))
                continue;
            const item = input[key];
            if (typeof item === "function" || typeof item === "symbol" || item === undefined)
                continue;
            output[key] = canonicalize(item, seen);
        }
        return output;
    }
    finally {
        seen.delete(scalar);
    }
}
export function stableTraceHash(value) {
    const canonical = canonicalize(value, new WeakSet());
    return createHash("sha256").update(JSON.stringify(canonical)).digest("hex").slice(0, 32);
}
function projectMessage(message) {
    if (!message || typeof message !== "object")
        return { value: message };
    const input = message;
    const projected = {};
    for (const key of MESSAGE_TOP_LEVEL_KEYS) {
        if (input[key] !== undefined)
            projected[key] = input[key];
    }
    return projected;
}
function projectTool(tool) {
    if (!tool || typeof tool !== "object")
        return { value: tool };
    const input = tool;
    return {
        name: input.name,
        description: input.description,
        parameters: input.parameters,
        deferLoading: input.deferLoading,
    };
}
function routeClass(baseUrl) {
    const normalized = baseUrl.toLowerCase();
    if (!normalized)
        return "unknown";
    if (normalized.includes("127.0.0.1") || normalized.includes("localhost"))
        return "local_gateway";
    if (normalized.includes("api.openai.com")
        || normalized.includes("api.anthropic.com")
        || normalized.includes("api.deepseek.com")
        || normalized.includes("api.moonshot.cn"))
        return "official_provider";
    return "remote_proxy";
}
function isPrefix(previous, current) {
    if (previous.length > current.length)
        return false;
    for (let index = 0; index < previous.length; index += 1) {
        if (previous[index] !== current[index])
            return false;
    }
    return true;
}
function touchState(key, state) {
    projectionStates.delete(key);
    projectionStates.set(key, state);
    while (projectionStates.size > MAX_TRACKED_SESSIONS) {
        const oldest = projectionStates.keys().next().value;
        if (!oldest)
            break;
        projectionStates.delete(oldest);
    }
}
function isHash(value) {
    return typeof value === "string" && /^[a-f0-9]{32}$/.test(value);
}
function isProjectionState(value) {
    if (!value || typeof value !== "object")
        return false;
    const state = value;
    return Number.isInteger(state.epoch)
        && Number(state.epoch) >= 0
        && isHash(state.providerPathHash)
        && isHash(state.systemHash)
        && isHash(state.toolsetHash)
        && Array.isArray(state.messageSegmentHashes)
        && state.messageSegmentHashes.every(isHash)
        && (state.candidateMessageSegmentHashes === undefined
            || (Array.isArray(state.candidateMessageSegmentHashes) && state.candidateMessageSegmentHashes.every(isHash)))
        && Number.isInteger(state.sourceMessageCount)
        && Number(state.sourceMessageCount) >= 0
        && typeof state.observedAt === "number"
        && Number.isFinite(state.observedAt);
}
function persistentStatePath(input) {
    if (!input.persistState || !input.sessionId || input.sessionId === "unknown")
        return undefined;
    const root = input.stateDir
        || path.join(process.env.USER_DATA_PATH || process.cwd(), "data", "context-projections");
    return path.join(root, `${stableTraceHash(input.sessionId)}.json`);
}
function loadPersistentState(filePath) {
    try {
        const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
        return parsed.schemaVersion === 1 && isProjectionState(parsed.state) ? parsed.state : undefined;
    }
    catch {
        return undefined;
    }
}
function persistProjectionState(filePath, state) {
    const temporaryPath = `${filePath}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`;
    try {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(temporaryPath, JSON.stringify({ schemaVersion: 1, state }), { encoding: "utf8", mode: 0o600 });
        fs.renameSync(temporaryPath, filePath);
    }
    catch {
        // Projection diagnostics are fail-open. A future observation can recreate the sidecar.
        try {
            if (fs.existsSync(temporaryPath))
                fs.unlinkSync(temporaryPath);
        }
        catch {
            // Best-effort cleanup only.
        }
    }
}
function ttlHint(api, retention, supportsLongCacheRetention) {
    if (retention !== "long" || supportsLongCacheRetention === false)
        return undefined;
    return api === "anthropic-messages" ? "1h" : "provider_specific_long";
}
/**
 * Build a content-free trace record for one model request.
 *
 * Hashes are for local regression/attribution. The payload intentionally contains no prompt,
 * tool arguments, image bytes, result text, URLs, or host names.
 */
export function observeContextProjection(input) {
    const provider = String(input.model.provider || "unknown");
    const api = String(input.model.api || "unknown");
    const model = String(input.model.id || "unknown");
    const baseUrl = String(input.model.baseUrl || "");
    const providerPathHash = stableTraceHash({ provider, api, model, baseUrl });
    const systemHash = stableTraceHash(String(input.sendContext.systemPrompt || ""));
    const toolsetHash = stableTraceHash((input.sendContext.tools || []).map(projectTool));
    const messageSegmentHashes = (input.sendContext.messages || [])
        .map((message) => stableTraceHash(projectMessage(message)));
    const candidateMessageSegmentHashes = input.candidateContext
        ? (input.candidateContext.messages || []).map((message) => stableTraceHash(projectMessage(message)))
        : undefined;
    const stateKey = input.sessionId;
    const statePath = persistentStatePath(input);
    const previous = projectionStates.get(stateKey)
        || (statePath ? loadPersistentState(statePath) : undefined);
    if (previous && !projectionStates.has(stateKey))
        touchState(stateKey, previous);
    const observedAt = input.now ?? Date.now();
    let projectionEpoch = previous?.epoch ?? 0;
    let epochReason;
    let comparison = previous ? "compared" : "first_observation";
    let cacheMaterialPrefixStable;
    let prefixViolationReason;
    let candidateCacheMaterialPrefixStable;
    let candidatePrefixViolationReason;
    if (input.summarizing) {
        comparison = "skipped_summarization";
        epochReason = "summarization_request";
    }
    else if (!previous) {
        epochReason = "first_observation";
    }
    else if (previous.providerPathHash !== providerPathHash) {
        projectionEpoch += 1;
        comparison = "new_epoch";
        epochReason = "provider_path_changed";
    }
    else if (previous.systemHash !== systemHash) {
        projectionEpoch += 1;
        comparison = "new_epoch";
        epochReason = "system_prompt_changed";
    }
    else if (previous.toolsetHash !== toolsetHash) {
        projectionEpoch += 1;
        comparison = "new_epoch";
        epochReason = "toolset_changed";
    }
    else {
        cacheMaterialPrefixStable = isPrefix(previous.messageSegmentHashes, messageSegmentHashes);
        if (previous.candidateMessageSegmentHashes && candidateMessageSegmentHashes) {
            candidateCacheMaterialPrefixStable = isPrefix(previous.candidateMessageSegmentHashes, candidateMessageSegmentHashes);
            if (!candidateCacheMaterialPrefixStable) {
                candidatePrefixViolationReason = "history_rewrite_or_sliding_window";
            }
        }
        if (!cacheMaterialPrefixStable) {
            if ((input.sourceContext.messages?.length || 0) < previous.sourceMessageCount) {
                projectionEpoch += 1;
                comparison = "new_epoch";
                epochReason = "history_boundary_advanced_detected";
                cacheMaterialPrefixStable = undefined;
                candidateCacheMaterialPrefixStable = undefined;
                candidatePrefixViolationReason = undefined;
            }
            else {
                prefixViolationReason = "history_rewrite_or_sliding_window";
            }
        }
    }
    if (!input.summarizing) {
        const nextState = {
            epoch: projectionEpoch,
            providerPathHash,
            systemHash,
            toolsetHash,
            messageSegmentHashes,
            ...(candidateMessageSegmentHashes ? { candidateMessageSegmentHashes } : {}),
            sourceMessageCount: input.sourceContext.messages?.length || 0,
            observedAt,
        };
        touchState(stateKey, nextState);
        if (statePath)
            persistProjectionState(statePath, nextState);
    }
    return {
        schemaVersion: 1,
        sessionIdHash: stableTraceHash(input.sessionId),
        projectionEpoch,
        ...(epochReason ? { epochReason } : {}),
        comparison,
        ...(cacheMaterialPrefixStable !== undefined ? { cacheMaterialPrefixStable } : {}),
        ...(prefixViolationReason ? { prefixViolationReason } : {}),
        provider,
        api,
        model,
        routeClass: routeClass(baseUrl),
        providerPathHash,
        systemHash,
        toolsetHash,
        messageSegmentHashes,
        sourceMessageCount: input.sourceContext.messages?.length || 0,
        projectionMode: input.projectionMode || "legacy",
        ...(input.projectionFallbackReason ? { projectionFallbackReason: input.projectionFallbackReason } : {}),
        ...(input.candidateContext && candidateMessageSegmentHashes
            ? {
                candidate: {
                    messageCount: input.candidateContext.messages?.length || 0,
                    estimatedTokens: input.candidateEstimatedTokens ?? 0,
                    deltaEstimatedTokens: (input.candidateEstimatedTokens ?? 0) - input.transformStats.outputEstimatedTokens,
                    ...(input.physicalWindow !== undefined ? { physicalWindow: input.physicalWindow } : {}),
                    ...(input.qualityBudget !== undefined ? { qualityBudget: input.qualityBudget } : {}),
                    ...(input.physicalWindow !== undefined
                        ? { withinPhysicalWindow: (input.candidateEstimatedTokens ?? 0) <= input.physicalWindow }
                        : {}),
                    ...(input.qualityBudget !== undefined
                        ? { withinQualityBudget: (input.candidateEstimatedTokens ?? 0) <= input.qualityBudget }
                        : {}),
                    ...(candidateCacheMaterialPrefixStable !== undefined
                        ? { cacheMaterialPrefixStable: candidateCacheMaterialPrefixStable }
                        : {}),
                    ...(candidatePrefixViolationReason ? { prefixViolationReason: candidatePrefixViolationReason } : {}),
                    messageSegmentHashes: candidateMessageSegmentHashes,
                },
            }
            : {}),
        cache: {
            ...(input.cacheRetention ? { requestedRetention: input.cacheRetention } : {}),
            ...(ttlHint(api, input.cacheRetention, input.model.compat?.supportsLongCacheRetention)
                ? { requestedTtlHint: ttlHint(api, input.cacheRetention, input.model.compat?.supportsLongCacheRetention) }
                : {}),
        },
        transformStats: { ...input.transformStats },
    };
}
export function countChangedBrowserResults(before, after) {
    const length = Math.min(before.length, after.length);
    let changed = 0;
    for (let index = 0; index < length; index += 1) {
        const prior = before[index];
        const next = after[index];
        const role = prior?.role;
        if (role !== "tool" && role !== "toolResult")
            continue;
        const text = Array.isArray(prior?.content)
            ? prior.content.filter((part) => part?.type === "text").map((part) => part.text || "").join("\n")
            : String(prior?.content || "");
        const isBrowser = prior?.toolName === "browser_action"
            || prior?.name === "browser_action"
            || text.includes("## Browser Snapshot")
            || text.includes("### Interactive Elements:");
        if (isBrowser && stableTraceHash(projectMessage(prior)) !== stableTraceHash(projectMessage(next)))
            changed += 1;
    }
    return changed;
}
export function __resetContextProjectionTraceForTests() {
    projectionStates.clear();
}
