import fs from "node:fs/promises";
import path from "node:path";
function finiteNonNegative(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
}
function percentile(values, quantile) {
    if (values.length === 0)
        return 0;
    const sorted = [...values].sort((left, right) => left - right);
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * quantile) - 1));
    return sorted[index];
}
function projectionFromVersion(value) {
    const suffix = String(value || "").split(":").at(-1);
    return suffix === "legacy" || suffix === "shadow" || suffix === "stable" ? suffix : "unknown";
}
export function summarizeTraceEvents(events, fallbackTraceId = "unknown") {
    if (events.length === 0)
        return undefined;
    const first = events[0] || {};
    const manifest = events.find((event) => event?.type === "harness_manifest")?.payload || {};
    const projections = events.filter((event) => event?.type === "context_projection");
    const llmTurns = events.filter((event) => event?.type === "llm_turn");
    if (llmTurns.length === 0 && projections.length === 0)
        return undefined;
    const requestedProjection = projectionFromVersion(manifest.projectionVersion);
    const lastProjectionMode = projections.at(-1)?.payload?.projectionMode;
    const projectionMode = ["legacy", "shadow", "stable"].includes(lastProjectionMode)
        ? lastProjectionMode
        : requestedProjection;
    const totals = llmTurns.reduce((result, event) => {
        result.inputTokens += finiteNonNegative(event?.payload?.inputTokens);
        result.outputTokens += finiteNonNegative(event?.payload?.outputTokens);
        result.cacheReadTokens += finiteNonNegative(event?.payload?.cacheReadTokens);
        result.cacheWriteTokens += finiteNonNegative(event?.payload?.cacheWriteTokens);
        return result;
    }, { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 });
    let prefixViolations = 0;
    let stableLimitedTurns = 0;
    let sanitizationFallbacks = 0;
    let projectionFallbacks = 0;
    for (const event of projections) {
        const payload = event?.payload || {};
        const eventMode = payload.projectionMode;
        const actualViolation = eventMode === "stable" && payload.cacheMaterialPrefixStable === false;
        const candidateViolation = eventMode !== "stable" && payload.candidate?.cacheMaterialPrefixStable === false;
        if (actualViolation || candidateViolation)
            prefixViolations += 1;
        if (eventMode === "stable" && finiteNonNegative(payload.transformStats?.limitedUserTurns) > 0) {
            stableLimitedTurns += 1;
        }
        if (payload.transformStats?.sanitizationFallback === true)
            sanitizationFallbacks += 1;
        if (payload.projectionFallbackReason)
            projectionFallbacks += 1;
    }
    return {
        traceId: String(first.traceId || fallbackTraceId),
        sessionId: String(first.sessionId || "unknown"),
        model: String(manifest.model || llmTurns.at(-1)?.payload?.model || "unknown"),
        projectionMode,
        requestedProjection,
        llmTurns: llmTurns.length,
        ...totals,
        durationMs: finiteNonNegative([...events].reverse().find((event) => event?.type === "run_end")?.payload?.durationMs),
        prefixViolations,
        stableLimitedTurns,
        sanitizationFallbacks,
        projectionFallbacks,
        missingProjection: llmTurns.length > 0
            && projections.length === 0
            && requestedProjection !== "unknown",
        toolFailures: events.filter((event) => (event?.type === "tool_execution_record"
            && !["ok", "passed"].includes(String(event?.payload?.status || "")))).length,
        verificationFailures: events.filter((event) => (event?.type === "verification_result"
            && ["failed", "inconclusive", "timed_out"].includes(String(event?.payload?.status || "")))).length,
    };
}
function aggregateRuns(mode, runs) {
    const llmTurns = runs.reduce((sum, run) => sum + run.llmTurns, 0);
    const inputTokens = runs.reduce((sum, run) => sum + run.inputTokens, 0);
    const cacheReadTokens = runs.reduce((sum, run) => sum + run.cacheReadTokens, 0);
    const promptTokens = inputTokens + cacheReadTokens;
    return {
        projectionMode: mode,
        runs: runs.length,
        llmTurns,
        inputTokens,
        outputTokens: runs.reduce((sum, run) => sum + run.outputTokens, 0),
        cacheReadTokens,
        cacheWriteTokens: runs.reduce((sum, run) => sum + run.cacheWriteTokens, 0),
        cacheReadRatio: promptTokens > 0 ? cacheReadTokens / promptTokens : 0,
        averageRegularInputTokens: llmTurns > 0 ? inputTokens / llmTurns : 0,
        p50DurationMs: percentile(runs.map((run) => run.durationMs), 0.5),
        p95DurationMs: percentile(runs.map((run) => run.durationMs), 0.95),
        prefixViolations: runs.reduce((sum, run) => sum + run.prefixViolations, 0),
        stableLimitedTurns: runs.reduce((sum, run) => sum + run.stableLimitedTurns, 0),
        sanitizationFallbacks: runs.reduce((sum, run) => sum + run.sanitizationFallbacks, 0),
        projectionFallbacks: runs.reduce((sum, run) => sum + run.projectionFallbacks, 0),
        missingProjectionRuns: runs.filter((run) => run.missingProjection).length,
        toolFailures: runs.reduce((sum, run) => sum + run.toolFailures, 0),
        verificationFailures: runs.reduce((sum, run) => sum + run.verificationFailures, 0),
    };
}
async function traceFiles(traceRoot, sinceMs) {
    const files = [];
    let entries;
    try {
        entries = await fs.readdir(traceRoot, { withFileTypes: true });
    }
    catch {
        return files;
    }
    for (const entry of entries) {
        const target = path.join(traceRoot, entry.name);
        if (entry.isFile() && entry.name.endsWith(".jsonl"))
            files.push(target);
        if (!entry.isDirectory())
            continue;
        let children;
        try {
            children = await fs.readdir(target, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const child of children) {
            if (child.isFile() && child.name.endsWith(".jsonl"))
                files.push(path.join(target, child.name));
        }
    }
    if (sinceMs === undefined)
        return files;
    const filtered = [];
    for (const file of files) {
        try {
            const stat = await fs.stat(file);
            if (stat.mtimeMs >= sinceMs)
                filtered.push(file);
        }
        catch { /* file disappeared during scan */ }
    }
    return filtered;
}
export async function analyzeLocalStructuredTraces(traceRoot, options = {}) {
    const files = await traceFiles(traceRoot, options.sinceMs);
    const runs = [];
    for (const file of files) {
        let raw;
        try {
            raw = await fs.readFile(file, "utf8");
        }
        catch {
            continue;
        }
        const events = [];
        for (const line of raw.split(/\r?\n/)) {
            if (!line.trim())
                continue;
            try {
                events.push(JSON.parse(line));
            }
            catch { /* one malformed line must not hide the run */ }
        }
        const run = summarizeTraceEvents(events, path.basename(file, ".jsonl"));
        if (!run)
            continue;
        if (options.sessionIncludes && !run.sessionId.includes(options.sessionIncludes))
            continue;
        runs.push(run);
    }
    runs.sort((left, right) => left.traceId.localeCompare(right.traceId));
    const modes = ["legacy", "shadow", "stable", "unknown"];
    const aggregates = modes
        .map((mode) => aggregateRuns(mode, runs.filter((run) => run.projectionMode === mode)))
        .filter((aggregate) => aggregate.runs > 0);
    const invariantViolations = runs.reduce((sum, run) => (sum
        + run.prefixViolations
        + run.stableLimitedTurns
        + run.sanitizationFallbacks
        + (run.missingProjection ? 1 : 0)), 0);
    return {
        schemaVersion: 1,
        traceRoot: path.resolve(traceRoot),
        ...(options.sinceMs !== undefined ? { sinceMs: options.sinceMs } : {}),
        ...(options.sessionIncludes ? { sessionIncludes: options.sessionIncludes } : {}),
        scannedFiles: files.length,
        matchedRuns: runs.length,
        invariantViolations,
        passed: runs.length > 0 && invariantViolations === 0,
        aggregates,
        runs,
    };
}
function number(value) {
    return Math.round(value).toLocaleString("en-US");
}
export function localTraceReportMarkdown(report) {
    const lines = [
        "# Harness Local Trace Report",
        "",
        `- Result: ${report.passed ? "PASS" : "REVIEW"}`,
        `- Matched runs: ${report.matchedRuns} / scanned files: ${report.scannedFiles}`,
        `- Invariant violations: ${report.invariantViolations}`,
        ...(report.sessionIncludes ? [`- Session filter: ${report.sessionIncludes}`] : []),
        "",
        "| Projection | Runs | LLM turns | Cache read ratio | Avg regular input | p50 / p95 | Prefix violations | Stable 30-turn limits | Fallbacks |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|",
    ];
    for (const item of report.aggregates) {
        lines.push(`| ${item.projectionMode} | ${item.runs} | ${item.llmTurns} | ${(item.cacheReadRatio * 100).toFixed(2)}% | ${number(item.averageRegularInputTokens)} | ${number(item.p50DurationMs)} / ${number(item.p95DurationMs)} ms | ${item.prefixViolations} | ${item.stableLimitedTurns} | ${item.projectionFallbacks} |`);
    }
    if (report.runs.length <= 20) {
        lines.push("", "| Trace | Model | Projection | Regular input | Cache read | Cache ratio | Duration |", "|---|---|---|---:|---:|---:|---:|");
        for (const run of report.runs) {
            const promptTokens = run.inputTokens + run.cacheReadTokens;
            const ratio = promptTokens > 0 ? run.cacheReadTokens / promptTokens : 0;
            lines.push(`| ${run.traceId} | ${run.model} | ${run.projectionMode} | ${number(run.inputTokens)} | ${number(run.cacheReadTokens)} | ${(ratio * 100).toFixed(2)}% | ${number(run.durationMs)} ms |`);
        }
    }
    lines.push("", "Gate only covers structured invariants. Cache/cost comparisons across different task mixes are observational, not an A/B accuracy claim.", "");
    return lines.join("\n");
}
