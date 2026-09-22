import * as fs from 'fs';
import * as path from 'path';
import { LLMManager } from '../agent/llm/manager.js';
import { FileMemoryManager } from './file_memory.js';
const TRIGGER_INTERVAL_MS = 24 * 60 * 60 * 1000;
const START_DELAY_MS = 3 * 60 * 1000;
const MIN_NEW_TRACES = 3;
const USER_ID = 'user_default';
export class LLMExtractor {
    dataRoot;
    tracesDir;
    statePath;
    entitiesPath;
    workspaceDir;
    state = { lastExtractedAt: 0, processedTraceIds: [] };
    constructor() {
        this.dataRoot = process.env.USER_DATA_PATH || process.cwd();
        this.tracesDir = path.join(this.dataRoot, 'data', 'traces');
        this.statePath = path.join(this.dataRoot, 'data', 'signals', 'llm_extractor_state.json');
        this.workspaceDir = process.env.WORKSPACE_DIR || path.join(this.dataRoot, 'workspace');
        this.entitiesPath = path.join(this.workspaceDir, 'memory', 'users', USER_ID, 'entities.md');
    }
    loadState() {
        try {
            if (fs.existsSync(this.statePath)) {
                this.state = JSON.parse(fs.readFileSync(this.statePath, 'utf-8'));
            }
        }
        catch {
            this.state = { lastExtractedAt: 0, processedTraceIds: [] };
        }
    }
    saveState() {
        try {
            const dir = path.dirname(this.statePath);
            if (!fs.existsSync(dir))
                fs.mkdirSync(dir, { recursive: true });
            // Keep only last 2000 trace IDs to prevent unbounded growth
            const ids = this.state.processedTraceIds.slice(-2000);
            fs.writeFileSync(this.statePath, JSON.stringify({ ...this.state, processedTraceIds: ids }, null, 2));
        }
        catch (e) {
            console.warn('[LLMExtractor] Failed to save state:', e);
        }
    }
    getNewTraceFiles() {
        if (!fs.existsSync(this.tracesDir))
            return [];
        const processedSet = new Set(this.state.processedTraceIds);
        const newFiles = [];
        try {
            const dateDirs = fs.readdirSync(this.tracesDir, { withFileTypes: true })
                .filter(d => d.isDirectory())
                .map(d => path.join(this.tracesDir, d.name));
            for (const dateDir of dateDirs) {
                try {
                    const files = fs.readdirSync(dateDir)
                        .filter(f => f.endsWith('.jsonl'))
                        .map(f => path.join(dateDir, f));
                    for (const file of files) {
                        const traceId = path.basename(file, '.jsonl');
                        if (!processedSet.has(traceId)) {
                            newFiles.push(file);
                        }
                    }
                }
                catch { /* skip unreadable dir */ }
            }
        }
        catch { /* skip if traces dir unreadable */ }
        return newFiles;
    }
    parseTraceFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n').filter(l => l.trim());
            let input = '';
            let response = '';
            for (const line of lines) {
                try {
                    const event = JSON.parse(line);
                    if (event.type === 'run_start' && event.payload?.inputPreview) {
                        input = String(event.payload.inputPreview).slice(0, 500);
                    }
                    if (event.type === 'final_response' && event.payload?.preview) {
                        response = String(event.payload.preview).slice(0, 800);
                    }
                }
                catch { /* skip malformed line */ }
            }
            if (!input)
                return null;
            return { input, response };
        }
        catch {
            return null;
        }
    }
    readExistingEntities() {
        try {
            if (fs.existsSync(this.entitiesPath)) {
                return fs.readFileSync(this.entitiesPath, 'utf-8');
            }
        }
        catch { /* ignore */ }
        return '';
    }
    async callServer(traces, existingEntities) {
        const llmManager = LLMManager.getInstance();
        const authToken = llmManager.getAuthToken();
        if (!authToken)
            return null;
        const channelId = llmManager.getChannelId();
        const port = process.env.PORT || 3000;
        const url = `http://localhost:${port}/v1/memory/extract`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
        };
        if (channelId)
            headers['X-Channel-ID'] = channelId;
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ traces, existingEntities }),
        });
        if (!response.ok) {
            const text = await response.text().catch(() => '');
            console.warn(`[LLMExtractor] Server returned ${response.status}: ${text.slice(0, 200)}`);
            return null;
        }
        const data = await response.json();
        return typeof data.entities === 'string' ? data.entities : null;
    }
    writeEntities(content) {
        try {
            const dir = path.dirname(this.entitiesPath);
            if (!fs.existsSync(dir))
                fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(this.entitiesPath, content, 'utf-8');
        }
        catch (e) {
            throw new Error(`Failed to write entities: ${e}`);
        }
    }
    async runOnce() {
        this.loadState();
        const now = Date.now();
        if (now - this.state.lastExtractedAt < TRIGGER_INTERVAL_MS)
            return;
        const newFiles = this.getNewTraceFiles();
        if (newFiles.length < MIN_NEW_TRACES) {
            console.log(`[LLMExtractor] Skipping: only ${newFiles.length} new traces (need ${MIN_NEW_TRACES})`);
            return;
        }
        console.log(`[LLMExtractor] Running extraction on ${newFiles.length} new traces...`);
        // Parse trace files into conversation pairs
        const tracePairs = [];
        const processedIds = [];
        for (const file of newFiles) {
            const pair = this.parseTraceFile(file);
            if (pair)
                tracePairs.push(pair);
            processedIds.push(path.basename(file, '.jsonl'));
        }
        if (tracePairs.length < MIN_NEW_TRACES) {
            console.log(`[LLMExtractor] Skipping: only ${tracePairs.length} parseable traces`);
            // Mark as processed anyway to avoid reprocessing empty traces
            this.state.processedTraceIds.push(...processedIds);
            this.saveState();
            return;
        }
        const traces = tracePairs.map(p => `用户: ${p.input}${p.response ? `\n助手: ${p.response}` : ''}`);
        const existingEntities = this.readExistingEntities();
        const newContent = await this.callServer(traces, existingEntities);
        if (!newContent) {
            // console.warn('[LLMExtractor] No valid content returned from server');
            return;
        }
        this.writeEntities(newContent);
        console.log(`[LLMExtractor] Entities updated (${newContent.length} chars)`);
        // Trigger sync into vector store
        try {
            const fileMemory = FileMemoryManager.getInstance();
            await fileMemory.syncFile(`memory/users/${USER_ID}/entities.md`);
        }
        catch (e) {
            console.warn('[LLMExtractor] Sync failed (non-critical):', e);
        }
        // Update state
        this.state.lastExtractedAt = now;
        this.state.processedTraceIds.push(...processedIds);
        this.saveState();
    }
    startPeriodicRun() {
        setTimeout(() => {
            this.runOnce().catch(e => console.warn('[LLMExtractor] Error:', e));
            setInterval(() => {
                this.runOnce().catch(e => console.warn('[LLMExtractor] Error:', e));
            }, TRIGGER_INTERVAL_MS);
        }, START_DELAY_MS);
    }
}
