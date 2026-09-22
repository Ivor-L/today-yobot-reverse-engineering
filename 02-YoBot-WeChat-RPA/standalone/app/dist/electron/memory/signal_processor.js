import * as fs from 'fs';
import * as path from 'path';
export class SignalProcessor {
    metaStore;
    tracesBaseDir;
    processedPath;
    toolStatsPath;
    processedTraceIds = new Set();
    constructor(metaStore) {
        this.metaStore = metaStore;
        const dataRoot = process.env.USER_DATA_PATH || process.cwd();
        this.tracesBaseDir = path.join(dataRoot, 'data', 'traces');
        const signalsDir = path.join(dataRoot, 'data', 'signals');
        this.processedPath = path.join(signalsDir, 'processed.json');
        this.toolStatsPath = path.join(signalsDir, 'tool-stats.json');
    }
    async init() {
        try {
            if (fs.existsSync(this.processedPath)) {
                const ids = JSON.parse(fs.readFileSync(this.processedPath, 'utf-8'));
                this.processedTraceIds = new Set(ids);
                console.log(`[SignalProcessor] Loaded ${this.processedTraceIds.size} processed trace IDs`);
            }
        }
        catch (e) {
            console.warn('[SignalProcessor] Failed to load processed traces, starting fresh:', e);
        }
    }
    async runOnce() {
        if (!fs.existsSync(this.tracesBaseDir))
            return;
        let processedCount = 0;
        const dateDirs = fs.readdirSync(this.tracesBaseDir, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => path.join(this.tracesBaseDir, d.name));
        for (const dateDir of dateDirs) {
            let files;
            try {
                files = fs.readdirSync(dateDir)
                    .filter(f => f.endsWith('.jsonl'))
                    .map(f => path.join(dateDir, f));
            }
            catch {
                continue;
            }
            for (const filePath of files) {
                const traceId = path.basename(filePath, '.jsonl');
                if (this.processedTraceIds.has(traceId))
                    continue;
                this.processTraceFile(traceId, filePath);
                this.processedTraceIds.add(traceId);
                processedCount++;
            }
        }
        if (processedCount > 0) {
            this.metaStore.flush();
            this.flushProcessed();
            console.log(`[SignalProcessor] Processed ${processedCount} new trace(s)`);
        }
    }
    processTraceFile(traceId, filePath) {
        const events = this.readEvents(filePath);
        if (events.length === 0)
            return;
        const toolCallEvents = events.filter(e => e.type === 'tool_call');
        const toolResultEvents = events.filter(e => e.type === 'tool_result');
        // rag_citation means "injected", not "used". A correction/continuation
        // signal at the start of this trace describes the previous answer, while
        // citations in this trace belong to the next answer. Joining them would
        // credit or punish unrelated memories. Grounding is therefore attributed
        // synchronously by the kernel against the response that actually used it;
        // cross-turn feedback requires explicit response provenance.
        // ToolPatternAnalyzer: accumulate per-tool success/failure counts
        if (toolCallEvents.length > 0) {
            this.updateToolStats(toolCallEvents, toolResultEvents);
        }
    }
    readEvents(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            return content
                .split('\n')
                .filter(l => l.trim())
                .map(l => JSON.parse(l));
        }
        catch {
            return [];
        }
    }
    updateToolStats(calls, results) {
        // callId -> result event
        const resultMap = new Map();
        for (const r of results) {
            const callId = r.payload.callId;
            if (callId)
                resultMap.set(callId, r);
        }
        let stats = {};
        try {
            if (fs.existsSync(this.toolStatsPath)) {
                stats = JSON.parse(fs.readFileSync(this.toolStatsPath, 'utf-8'));
            }
        }
        catch { /* start fresh */ }
        const now = Date.now();
        for (const call of calls) {
            const toolName = call.payload.toolName;
            if (!toolName)
                continue;
            const callId = call.payload.callId;
            const result = callId ? resultMap.get(callId) : undefined;
            if (!stats[toolName]) {
                stats[toolName] = { successCount: 0, failureCount: 0, lastUpdatedAt: now };
            }
            if (result) {
                const isError = result.payload.isError;
                if (isError) {
                    stats[toolName].failureCount += 1;
                }
                else {
                    stats[toolName].successCount += 1;
                }
                stats[toolName].lastUpdatedAt = now;
            }
        }
        try {
            const dir = path.dirname(this.toolStatsPath);
            if (!fs.existsSync(dir))
                fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(this.toolStatsPath, JSON.stringify(stats, null, 2));
        }
        catch (e) {
            console.warn('[SignalProcessor] Failed to save tool stats:', e);
        }
    }
    flushProcessed() {
        try {
            const dir = path.dirname(this.processedPath);
            if (!fs.existsSync(dir))
                fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(this.processedPath, JSON.stringify([...this.processedTraceIds], null, 2));
        }
        catch (e) {
            console.warn('[SignalProcessor] Failed to save processed trace IDs:', e);
        }
    }
    startPeriodicRun(intervalMs = 60 * 60 * 1000, // default: 60 min
    startDelayMs = 60 * 1000 // default: 60s, let RPA/plugins finish init
    ) {
        setTimeout(() => {
            this.runOnce().catch(e => console.warn('[SignalProcessor] Error:', e));
            setInterval(() => {
                this.runOnce().catch(e => console.warn('[SignalProcessor] Error:', e));
            }, intervalMs);
        }, startDelayMs);
    }
}
