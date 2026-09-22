import { WebSocketServer, WebSocket } from 'ws';
import { registerAgenticApi } from '../agent/agentic/router.js';
import { registerAgentPreviewApi } from '../agent/preview/router.js';
import { registerExpertDirectApi } from '../agent/expert/direct_router.js';
import { registerOfficialExpertCatalogApi } from '../agent/expert/official_catalog_router.js';
import * as crypto from 'crypto';
import { LLMManager } from '../agent/llm/manager.js';
import express from 'express';
import cors from 'cors';
import http from 'http';
import axios from 'axios';
import { ConfigManager } from '../core/config/manager.js';
import { persistRuntimeConfig } from '../core/config/process_bridge.js';
import { getMcpGatewayInstance } from '../skills/mcp/server/index.js';
import { DocConverter } from '../skills/tools/doc_converter.js';
import { NotificationManager } from '../core/notification/manager.js';
import { FileMemoryManager } from '../memory/file_memory.js';
import { stripMemoryMeta } from '../memory/evolution.js';
import * as path from 'path';
import * as fs from 'fs';
import { config } from '../config/index.js';
import { saveUploadedFile, saveUploadedImage } from '../utils/image_bytes.js';
import { fitImageForContext } from '../utils/image_context.js';
import { buildDocumentContext, visibleTextFromContent } from '../shared/model_only_context.js';
import { getInteractionStore } from '../agent/interaction/store.js';
/** 完成态的 job 保留多久供轮询取结果。 */
const REINDEX_JOB_TTL_MS = 5 * 60 * 1000;
/**
 * 单个 reindex 任务最多扫几轮。
 *
 * 收敛循环需要一个上限：若有别的进程在持续往知识库目录写文件，dirty 会一直被置上，
 * 任务就永远结束不了、UI 也永远转圈。停下来是安全的 —— chokidar 仍在监听，
 * 后续变更由 watcher 兜底。
 */
const REINDEX_MAX_PASSES = 5;
export function isLocalTokenValid(configured, provided) {
    if (!configured)
        return false; // 未配置 → 拒绝，绝不放行
    if (typeof provided !== 'string' || !provided)
        return false;
    if (provided.length !== configured.length)
        return false;
    let diff = 0;
    for (let i = 0; i < configured.length; i++) {
        diff |= configured.charCodeAt(i) ^ provided.charCodeAt(i);
    }
    return diff === 0;
}
export class WebSocketAdapter {
    name = "websocket";
    wss = null;
    httpServer = null;
    clients = new Map(); // sessionId -> WebSocket
    messageHandler = null;
    requestHandler = null;
    unsubscribeInteractions = null;
    port;
    onAuth;
    // Task framework refs (PR4a wiring)
    taskGroupManager = null;
    taskStore = null;
    taskEventStore = null;
    taskAuditStore = null;
    expressApp = null;
    taskApiRegistered = false;
    // Agentic Provider Protocol (P2-b)
    agenticService = null;
    agenticApiRegistered = false;
    agentPreviewService = null;
    agentPreviewApiRegistered = false;
    expertDirectService = null;
    expertDirectApiRegistered = false;
    officialExpertCatalogService = null;
    officialExpertCatalogApiRegistered = false;
    // 知识库确定性重索引/清除：UI 增删本地库文档后主动触发，不依赖 chokidar(跨进程复制+旧 mtime 会漏事件)
    fileMemory = null;
    knowledgeApiRegistered = false;
    /** 按目录维度的重索引任务。同一目录同时只允许一个，避免隐藏的重叠执行。 */
    reindexJobs = new Map();
    /**
     * 按 jobId 索引的同一批任务。
     *
     * 状态查询必须能按 **jobId** 查：只按 dir 查的话，调用方拿到的是「该目录当前那个
     * 任务」的状态，而不是它自己提交的那个。上一轮任务刚结束、下一轮还没开始时，
     * 调用方会读到别人的完成态并据此宣布自己成功。
     */
    reindexJobsById = new Map();
    constructor(port = 3000) {
        this.port = port;
    }
    async start(onMessage, onRequest) {
        this.messageHandler = onMessage;
        this.requestHandler = onRequest || null;
        this.unsubscribeInteractions = getInteractionStore().subscribe((interaction) => {
            this.pushInteraction(interaction);
        });
        console.log(`[WebSocket] Starting HTTP & WebSocket server on port ${this.port}...`);
        // Subscribe to NotificationManager updates and broadcast to all connected clients
        NotificationManager.getInstance().subscribe((notifications) => {
            const payload = JSON.stringify({ type: 'notifications_update', notifications });
            this.wss?.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(payload);
                }
            });
        });
        // Setup Express App for HTTP API
        const app = express();
        this.expressApp = app;
        app.use(cors());
        // APP/RPA carries local file paths rather than file bytes. Parse its untrusted envelope
        // under a narrow cap before the compatibility-wide 100 MB parser handles other APIs.
        //
        // ⚠️ 必须是**精确路径**匹配，绝不能写成 `app.use('/v1/chat', ...)`。
        // `app.use` 是前缀匹配，会把 `/v1/chat/completions` 一起罩住——而登录态下 Agent 自己的
        // 模型请求正是打到本机 `http://127.0.0.1:{PORT}/v1/chat/completions`
        // （见 agent/pi/adapter.ts 的商业网关改写 + 本文件下方的 REMOTE_SERVER_URL 代理）。
        // 于是任何超过 1MB 的模型请求——一张手机照片进历史就够——会被本机 body-parser
        // 用 `413 Payload Too Large` 顶回，`usage` 全 0、整轮零输出，且图片留在历史里导致
        // 此后**每一轮**都 413。线上真实事故：2026-08-26 某会话连续 13.5 小时每轮 413，
        // 含纯文本「你好」。回归测试见 chat_body_limit.smoke.ts。
        app.post('/v1/chat', express.json({ limit: '1mb' }));
        app.use(express.json({ limit: '100mb' }));
        // 如果 task framework 已通过 setTaskFramework 注入,立即挂载其路由
        if (this.taskGroupManager && !this.taskApiRegistered) {
            this.registerTaskApi(app);
        }
        // 同理:agentic provider 若已注入,立即挂载 /v1/*
        if (this.agenticService && !this.agenticApiRegistered) {
            registerAgenticApi(app, this.agenticService);
            this.agenticApiRegistered = true;
        }
        if (this.agentPreviewService && !this.agentPreviewApiRegistered) {
            registerAgentPreviewApi(app, this.agentPreviewService);
            this.agentPreviewApiRegistered = true;
        }
        if (this.expertDirectService && !this.expertDirectApiRegistered) {
            registerExpertDirectApi(app, this.expertDirectService);
            this.expertDirectApiRegistered = true;
        }
        if (this.officialExpertCatalogService && !this.officialExpertCatalogApiRegistered) {
            registerOfficialExpertCatalogApi(app, this.officialExpertCatalogService);
            this.officialExpertCatalogApiRegistered = true;
        }
        // 同理:file memory 若已注入,挂载知识库重索引 endpoint
        if (this.fileMemory && !this.knowledgeApiRegistered) {
            this.registerKnowledgeApi(app);
        }
        // HTTP Config API
        app.get('/health', (req, res) => res.status(200).send('ok'));
        app.get('/api/config', (req, res) => {
            try {
                const config = ConfigManager.getInstance().getSafeConfig();
                res.json(config);
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        app.post('/api/config', async (req, res) => {
            try {
                const config = req.body;
                console.log("[API] Saving config via HTTP:", JSON.stringify(config.channels));
                await persistRuntimeConfig(config);
                // 配置可能改了 mcpGateway(启停/白名单),按新配置应用
                getMcpGatewayInstance()?.applyConfig().catch(e => console.error('[API] applyConfig failed:', e));
                res.json({ success: true });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        // --- MCP Gateway 运行时控制(对外暴露开关 / token / 白名单) ---
        app.get('/api/mcp-gateway/status', (req, res) => {
            try {
                const inst = getMcpGatewayInstance();
                const cm = ConfigManager.getInstance();
                const cfg = cm.getMcpGatewayConfig();
                res.json(inst ? inst.status() : {
                    enabled: cfg.enabled,
                    running: false,
                    mode: cfg.enabled ? 'native-rpa' : 'off',
                    connectionState: cfg.enabled ? 'connecting' : 'off',
                    url: 'http://127.0.0.1:9922/mcp',
                    port: 9922,
                    token: '',
                    exposedSkills: ['wechat-rpa'],
                });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        // body: { enabled?: boolean, port?: number, exposedSkills?: string[], regenerateToken?: boolean }
        app.post('/api/mcp-gateway', async (req, res) => {
            try {
                const { enabled, port, exposedSkills, regenerateToken } = req.body || {};
                const cm = ConfigManager.getInstance();
                const current = cm.getConfig();
                const nextGateway = { ...cm.getMcpGatewayConfig() };
                if (typeof enabled === 'boolean')
                    nextGateway.enabled = enabled;
                if (typeof port === 'number')
                    nextGateway.port = port;
                if (Array.isArray(exposedSkills))
                    nextGateway.exposedSkills = exposedSkills;
                await persistRuntimeConfig({
                    ...current,
                    mcpGateway: nextGateway,
                });
                const inst = getMcpGatewayInstance();
                if (inst)
                    await inst.applyConfig({ regenerateToken: regenerateToken === true });
                res.json(inst ? inst.status() : { ...cm.getMcpGatewayConfig(), running: false });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        // Memory API
        app.get('/api/memory/list', (req, res) => {
            try {
                const store = FileMemoryManager.getInstance().getStore();
                const userId = req.query.userId;
                const allChunks = store.listAll(userId);
                const now = Date.now();
                const sevenDaysMs = 7 * 86400000;
                const core = [];
                const session = [];
                const insight = [];
                const inactive = [];
                for (const chunk of allChunks) {
                    const text = stripMemoryMeta(chunk.text).trim();
                    if (text.length < 10)
                        continue;
                    // Skip auto-generated file headers with no real body content
                    const lines = text.split('\n').filter((l) => l.trim());
                    if (lines.length === 1 && /^#+\s/.test(lines[0]))
                        continue;
                    const item = {
                        id: chunk.id,
                        text,
                        source: chunk.source,
                        path: chunk.path,
                        createdAt: chunk.createdAt,
                        confidence: chunk.meta.confidence,
                        hitCount: chunk.meta.hitCount,
                        usedCount: chunk.meta.usedCount,
                        injectedCount: chunk.meta.injectedCount || 0,
                        groundedCount: chunk.meta.groundedCount || 0,
                        lastHitAt: chunk.meta.lastHitAt,
                        lastUsedAt: chunk.meta.lastUsedAt,
                        lastInjectedAt: chunk.meta.lastInjectedAt,
                        lastGroundedAt: chunk.meta.lastGroundedAt,
                        recallPolicy: chunk.meta.recallPolicy || 'relevant',
                        memoryType: chunk.meta.memoryType,
                        confirmedByUser: chunk.meta.confirmedByUser
                    };
                    const p = chunk.path || '';
                    const isKnowledge = p.startsWith('knowledge/') || p.startsWith('knowledge\\');
                    // Knowledge base files are background context, not user memories — skip them
                    if (isKnowledge)
                        continue;
                    // entities.md is a structured profile file displayed separately in 系统洞察
                    const isEntities = p.endsWith('/entities.md') || p === 'entities.md';
                    if (isEntities)
                        continue;
                    // "从未被用过" must not be inferred from groundedCount alone:
                    // grounding is deliberately conservative (it only fires when the
                    // answer echoes memory-specific terms absent from the question),
                    // so a memory can be injected on every turn and still score 0.
                    // Treating those as clutter would push the UI to recommend
                    // deleting the memories that are actually working.
                    const neverUsed = (chunk.meta.groundedCount || 0) === 0
                        && (chunk.meta.injectedCount || chunk.meta.usedCount || 0) === 0;
                    const isInactive = neverUsed
                        && !chunk.meta.confirmedByUser
                        && chunk.meta.recallPolicy !== 'always'
                        && (now - chunk.createdAt) > sevenDaysMs;
                    if (p.endsWith('/observations.md')) {
                        // Auto-extracted candidates are checked BEFORE the inactive
                        // rule on purpose: they are never auto-injected, so they can
                        // never accumulate usage, and the 7-day rule would bury the
                        // confirmation flow that is their only route to becoming
                        // injectable at all.
                        session.push(item);
                    }
                    else if (isInactive) {
                        inactive.push(item);
                    }
                    else if (/(^|[\\/])daily[\\/]/.test(p)) {
                        // 按天的工作日志（memory_append type='daily'）落在
                        // memory/users/<uid>/daily/<date>.md，同样命中下面的
                        // `memory/users/` 前缀，必须先判掉：它记的是当天做过什么，
                        // 属于会话沉淀，不是"关于你的长期稳定认知"。
                        session.push(item);
                    }
                    else if (p === 'MEMORY.md' || p.startsWith('memory/users/')) {
                        core.push(item);
                    }
                    else if (p.startsWith('memory/')) {
                        session.push(item);
                    }
                    else if (chunk.source === 'chat' || ['insight', 'pattern', 'failure'].includes(chunk.meta.memoryType)) {
                        insight.push(item);
                    }
                    else {
                        session.push(item);
                    }
                }
                const byUtilityDesc = (a, b) => (b.groundedCount - a.groundedCount)
                    || (Number(b.confirmedByUser) - Number(a.confirmedByUser))
                    || (b.confidence - a.confidence)
                    || (b.createdAt - a.createdAt);
                res.json({
                    core: core.sort(byUtilityDesc),
                    session: session.sort((a, b) => b.createdAt - a.createdAt),
                    insight: insight.sort(byUtilityDesc),
                    inactive: inactive.sort((a, b) => a.createdAt - b.createdAt)
                });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        app.get('/api/memory/entities', (req, res) => {
            try {
                const workspaceDir = process.env.WORKSPACE_DIR
                    || path.join(process.env.USER_DATA_PATH || process.cwd(), 'workspace');
                const entitiesPath = path.join(workspaceDir, 'memory', 'users', 'user_default', 'entities.md');
                if (!fs.existsSync(entitiesPath)) {
                    return res.json({ sections: [] });
                }
                const content = fs.readFileSync(entitiesPath, 'utf-8');
                const sections = [];
                let currentTitle = '';
                let currentTags = [];
                for (const line of content.split('\n')) {
                    const h2 = line.match(/^##\s+(.+)/);
                    const bullet = line.match(/^-\s+(.+)/);
                    if (h2) {
                        if (currentTitle && currentTags.length > 0) {
                            sections.push({ title: currentTitle, tags: currentTags });
                        }
                        currentTitle = h2[1].trim();
                        currentTags = [];
                    }
                    else if (bullet && currentTitle) {
                        const tag = bullet[1].trim();
                        if (tag)
                            currentTags.push(tag);
                    }
                }
                if (currentTitle && currentTags.length > 0) {
                    sections.push({ title: currentTitle, tags: currentTags });
                }
                res.json({ sections });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        app.delete('/api/memory/entities/tag', (req, res) => {
            try {
                const { section, tag } = req.body;
                if (!section || !tag)
                    return res.status(400).json({ error: 'missing section or tag' });
                const workspaceDir = process.env.WORKSPACE_DIR
                    || path.join(process.env.USER_DATA_PATH || process.cwd(), 'workspace');
                const entitiesPath = path.join(workspaceDir, 'memory', 'users', 'user_default', 'entities.md');
                if (!fs.existsSync(entitiesPath))
                    return res.json({ success: true });
                const lines = fs.readFileSync(entitiesPath, 'utf-8').split('\n');
                let inSection = false;
                const result = [];
                for (const line of lines) {
                    const h2 = line.match(/^##\s+(.+)/);
                    if (h2) {
                        inSection = h2[1].trim() === section;
                        result.push(line);
                        continue;
                    }
                    // Skip the matching bullet line inside the target section
                    if (inSection) {
                        const bullet = line.match(/^-\s+(.+)/);
                        if (bullet && bullet[1].trim() === tag)
                            continue;
                    }
                    result.push(line);
                }
                // Remove sections that have no bullet points left
                const cleaned = [];
                for (let i = 0; i < result.length; i++) {
                    const isH2 = /^##\s+/.test(result[i]);
                    if (isH2) {
                        // Check if next non-empty line is another header or EOF
                        let j = i + 1;
                        while (j < result.length && result[j].trim() === '')
                            j++;
                        const nextIsHeader = j >= result.length || /^#/.test(result[j]);
                        if (nextIsHeader)
                            continue; // drop this empty section header
                    }
                    cleaned.push(result[i]);
                }
                fs.writeFileSync(entitiesPath, cleaned.join('\n'), 'utf-8');
                res.json({ success: true });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        app.delete('/api/memory/chunks/:id', async (req, res) => {
            try {
                const store = FileMemoryManager.getInstance().getStore();
                const chunkId = req.params.id;
                // Find the chunk to get its source file path and raw text
                const allChunks = store.listAll();
                const chunk = allChunks.find(c => c.id === chunkId);
                // 1. Remove from source markdown file so it doesn't resurrect on next sync
                if (chunk?.path && chunk.text) {
                    const workspaceDir = process.env.WORKSPACE_DIR
                        || path.join(process.env.USER_DATA_PATH || process.cwd(), 'workspace');
                    const filePath = path.join(workspaceDir, chunk.path.replace(/\\/g, '/'));
                    if (fs.existsSync(filePath)) {
                        try {
                            const fileContent = fs.readFileSync(filePath, 'utf-8');
                            const chunkLines = chunk.text.trim().split('\n');
                            const fileLines = fileContent.split('\n');
                            let removed = false;
                            for (let i = 0; i < fileLines.length && !removed; i++) {
                                if (fileLines[i].trim() !== chunkLines[0].trim())
                                    continue;
                                // Verify all lines of the chunk match
                                const allMatch = chunkLines.every((cl, j) => (fileLines[i + j] || '').trim() === cl.trim());
                                if (allMatch) {
                                    fileLines.splice(i, chunkLines.length);
                                    removed = true;
                                }
                            }
                            if (removed) {
                                // Collapse multiple blank lines into one
                                const cleaned = fileLines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
                                fs.writeFileSync(filePath, cleaned, 'utf-8');
                                console.log(`[MemoryDelete] Removed chunk from ${chunk.path}`);
                            }
                            else {
                                console.warn(`[MemoryDelete] Chunk text not found in ${chunk.path}, deleting from store only`);
                            }
                        }
                        catch (fileErr) {
                            console.warn('[MemoryDelete] Failed to modify source file:', fileErr);
                        }
                    }
                }
                // 2. Delete from vector store
                await store.deleteByIds([chunkId]);
                res.json({ success: true });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        app.post('/api/memory/chunks/:id/confirm', (req, res) => {
            try {
                const store = FileMemoryManager.getInstance().getStore();
                store.getMetaStore().confirmChunk(req.params.id);
                res.json({ success: true });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        app.post('/api/memory/chunks/:id/recall-policy', (req, res) => {
            try {
                const recallPolicy = req.body?.recallPolicy;
                if (!['always', 'relevant', 'search_only'].includes(recallPolicy)) {
                    return res.status(400).json({ error: 'invalid recallPolicy' });
                }
                const store = FileMemoryManager.getInstance().getStore();
                const chunk = store.listAll().find((item) => item.id === req.params.id);
                if (!chunk)
                    return res.status(404).json({ error: 'memory chunk not found' });
                store.getMetaStore().setMeta(req.params.id, { recallPolicy });
                // Choosing "always" in the Memory UI is an explicit user
                // confirmation, so inferred low-confidence candidates may be pinned.
                if (recallPolicy === 'always')
                    store.getMetaStore().confirmChunk(req.params.id);
                res.json({ success: true, recallPolicy });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        // Proxy for Remote Server
        const REMOTE_SERVER_URL = process.env.REMOTE_SERVER_URL;
        if (REMOTE_SERVER_URL) {
            console.log(`[WebSocket] Remote proxy configured`);
            // Proxy handler for /v1/*
            const proxyHandler = async (req, res) => {
                try {
                    const cleanUrl = req.originalUrl.replace('//', '/');
                    const targetUrl = `${REMOTE_SERVER_URL}${cleanUrl}`;
                    const headers = { ...req.headers };
                    delete headers['host'];
                    delete headers['content-length'];
                    // Inject Authorization header if missing and available in LLMManager
                    if (!headers['authorization']) {
                        const token = LLMManager.getInstance().getAuthToken();
                        if (token) {
                            headers['authorization'] = `Bearer ${token}`;
                        }
                    }
                    // Inject X-Channel-ID header if missing
                    if (!headers['x-channel-id']) {
                        const channelId = LLMManager.getInstance().getChannelId();
                        if (channelId)
                            headers['x-channel-id'] = channelId;
                    }
                    const acceptHeader = String(headers['accept'] || '').toLowerCase();
                    const isSseRequest = acceptHeader.includes('text/event-stream') || req.body?.stream === true;
                    const requestConfig = {
                        method: req.method,
                        url: targetUrl,
                        headers: headers,
                        data: req.method === 'GET' ? undefined : req.body,
                        validateStatus: () => true,
                        responseType: isSseRequest ? 'stream' : 'json'
                    };
                    let response;
                    try {
                        response = await axios(requestConfig);
                    }
                    catch (initialError) {
                        if (initialError.code === 'ECONNREFUSED' || initialError.message?.includes('proxy') || initialError.code === 'ETIMEDOUT') {
                            console.warn(`[Proxy] Connection failed (${initialError.message}). Retrying without proxy...`);
                            try {
                                response = await axios({
                                    ...requestConfig,
                                    proxy: false
                                });
                            }
                            catch (retryError) {
                                console.error(`[Proxy] Retry failed: ${retryError.message}`);
                                throw retryError;
                            }
                        }
                        else {
                            throw initialError;
                        }
                    }
                    if (response.status === 401) {
                        // Send auth expired notification via WebSocket
                        const expiredMsg = {
                            id: crypto.randomUUID(),
                            role: "system",
                            content: "登录状态已过期，请重新登录。",
                            senderId: "system",
                            source: "system",
                            metadata: {
                                errorType: 'auth_expired',
                                errorCode: 401
                            },
                            timestamp: Date.now()
                        };
                        this.wss?.clients.forEach(client => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify(expiredMsg));
                            }
                        });
                    }
                    if (isSseRequest && response.data && typeof response.data.on === 'function') {
                        Object.keys(response.headers).forEach(key => {
                            const lowerKey = key.toLowerCase();
                            if (['content-length', 'content-encoding', 'transfer-encoding', 'connection'].includes(lowerKey)) {
                                return;
                            }
                            if (lowerKey.startsWith('access-control-')) {
                                return;
                            }
                            res.setHeader(key, response.headers[key]);
                        });
                        res.setHeader('X-Accel-Buffering', 'no');
                        res.status(response.status);
                        res.flushHeaders();
                        const upstreamStream = response.data;
                        req.on('close', () => {
                            if (upstreamStream.destroy) {
                                upstreamStream.destroy();
                            }
                        });
                        upstreamStream.on('data', (chunk) => {
                            if (!res.writableEnded) {
                                res.write(chunk);
                            }
                        });
                        upstreamStream.on('end', () => {
                            if (!res.writableEnded) {
                                res.end();
                            }
                        });
                        upstreamStream.on('error', (err) => {
                            console.error(`[Proxy] SSE stream error for ${req.originalUrl}:`, err.message);
                            if (!res.writableEnded) {
                                res.end();
                            }
                        });
                        return;
                    }
                    // Handle 304 Not Modified specially
                    if (response.status === 304) {
                        Object.keys(response.headers).forEach(key => {
                            const lowerKey = key.toLowerCase();
                            if (['content-length', 'content-encoding', 'transfer-encoding', 'connection'].includes(lowerKey))
                                return;
                            if (lowerKey.startsWith('access-control-'))
                                return;
                            res.setHeader(key, response.headers[key]);
                        });
                        res.status(304).end();
                        return;
                    }
                    Object.keys(response.headers).forEach(key => {
                        const lowerKey = key.toLowerCase();
                        if (['content-length', 'content-encoding', 'transfer-encoding', 'connection'].includes(lowerKey)) {
                            return;
                        }
                        if (lowerKey.startsWith('access-control-')) {
                            return;
                        }
                        res.setHeader(key, response.headers[key]);
                    });
                    if (typeof response.data === 'object') {
                        res.status(response.status).json(response.data);
                    }
                    else {
                        res.status(response.status).send(response.data);
                    }
                }
                catch (e) {
                    console.error(`[Proxy] Error forwarding ${req.originalUrl}:`, e.message);
                    res.status(502).json({ error: 'Bad Gateway', message: e.message });
                }
            };
            app.use('/v1', proxyHandler);
            // Also support /api/v1 just in case UI uses it
            app.use('/api/v1', proxyHandler);
        }
        else {
            console.log('[WebSocket] No REMOTE_SERVER_URL configured. Proxy disabled.');
        }
        // Create HTTP Server
        this.httpServer = http.createServer(app);
        // Attach WebSocket Server
        this.wss = new WebSocketServer({ server: this.httpServer });
        // Start listening
        //
        // ⚠️ 必须显式绑 127.0.0.1。不指定 host 时 Node 绑 0.0.0.0 —— 这个 app 挂着
        // /api/config（可写）、/api/memory/*（可读可删）、/v1 代理等敏感接口，
        // 绑全网卡等于把它们暴露给同网段的任何设备（公共 WiFi 下尤其危险）。
        // 渲染进程与主进程都走 localhost，绑回环不影响任何既有调用方。
        this.httpServer.listen(this.port, '127.0.0.1', () => {
            console.log(`[WebSocket] Server listening on http://127.0.0.1:${this.port}`);
        });
        this.wss.on('connection', (ws) => {
            // console.log('[WebSocket] New client connected');
            ws.on('message', async (data) => {
                const rawData = data.toString();
                // console.log(`[WebSocket] Received raw data: ${rawData}`);
                let payload = {};
                let sessionId = '';
                try {
                    payload = JSON.parse(rawData);
                    if (payload.type === 'ping') {
                        ws.send(JSON.stringify({ type: 'pong' }));
                        return;
                    }
                    if (payload.type === 'auth') {
                        const token = typeof payload.token === 'string' ? payload.token.trim() : '';
                        const channelId = payload.channelId;
                        console.log(`[WebSocket] Received Auth. ChannelId: ${channelId}, TokenLength: ${token?.length}`);
                        if (channelId) {
                            console.log(`[WebSocket] Setting LLMManager ChannelId to: ${channelId}`);
                            LLMManager.getInstance().setChannelId(channelId);
                        }
                        else {
                            console.warn('[WebSocket] Auth payload missing channelId');
                        }
                        LLMManager.getInstance().setAuthToken(token || undefined);
                        if (token && this.onAuth) {
                            await this.onAuth(token);
                        }
                        return;
                    }
                    if (payload.type === 'history') {
                        const sessionId = payload.sessionId;
                        // Always update client registration for this session
                        if (sessionId) {
                            this.clients.set(sessionId, ws);
                        }
                        if (this.requestHandler) {
                            const result = await this.requestHandler('history', { sessionId });
                            if (result && !Array.isArray(result) && 'messages' in result) {
                                ws.send(JSON.stringify({ type: 'history_result', session: result }));
                            }
                            else {
                                ws.send(JSON.stringify({ type: 'history_result', sessionId, messages: result }));
                            }
                        }
                        return;
                    }
                    if (payload.type === 'delete_session') {
                        const sessionId = payload.sessionId;
                        if (this.requestHandler && sessionId) {
                            const result = await this.requestHandler('delete_session', { sessionId });
                            ws.send(JSON.stringify({ type: 'delete_session_result', sessionId, ...result }));
                            if (result?.success) {
                                this.clients.delete(sessionId);
                            }
                        }
                        return;
                    }
                    if (payload.type === 'get_latest_session') {
                        if (this.requestHandler) {
                            const result = await this.requestHandler('get_latest_session', {});
                            ws.send(JSON.stringify({ type: 'latest_session_result', ...result }));
                        }
                        return;
                    }
                    if (payload.type === 'get_sessions_list') {
                        if (this.requestHandler) {
                            const sessions = await this.requestHandler('get_sessions_list', {});
                            ws.send(JSON.stringify({ type: 'sessions_list_result', sessions }));
                        }
                        return;
                    }
                    if (payload.type === 'get_notifications') {
                        const notifications = NotificationManager.getInstance().getNotifications();
                        ws.send(JSON.stringify({ type: 'notifications_list', notifications }));
                        return;
                    }
                    if (payload.type === 'mark_notification_read') {
                        const { notificationId } = payload;
                        if (notificationId) {
                            NotificationManager.getInstance().markAsRead(notificationId);
                        }
                        return;
                    }
                    if (payload.type === 'mark_all_notifications_read') {
                        NotificationManager.getInstance().markAllAsRead();
                        return;
                    }
                    if (payload.type === 'delete_notification') {
                        const { notificationId } = payload;
                        if (notificationId) {
                            NotificationManager.getInstance().deleteNotification(notificationId);
                        }
                        return;
                    }
                    if (payload.type === 'clear_notifications') {
                        NotificationManager.getInstance().clearAll();
                        return;
                    }
                    if (payload.type === 'create_notification') {
                        const { notification } = payload;
                        if (notification) {
                            NotificationManager.getInstance().addNotification({
                                ...notification,
                                type: notification.type || 'message',
                                title: notification.title || (typeof notification.content === 'string' && notification.content ? notification.content.slice(0, 20) + (notification.content.length > 20 ? '...' : '') : '系统通知'),
                                content: typeof notification.content === 'string' ? notification.content : JSON.stringify(notification.content || ''),
                                sessionId: notification.sessionId
                            });
                        }
                        return;
                    }
                    // LLM Config Handlers
                    if (payload.type === 'get_llm_config') {
                        if (this.requestHandler) {
                            const config = await this.requestHandler('get_llm_config', {});
                            ws.send(JSON.stringify({ type: 'llm_config_result', config }));
                        }
                        return;
                    }
                    if (payload.type === 'set_llm_config') {
                        if (this.requestHandler) {
                            try {
                                await this.requestHandler('set_llm_config', payload.config);
                                ws.send(JSON.stringify({ type: 'set_llm_config_success' }));
                            }
                            catch (e) {
                                ws.send(JSON.stringify({ type: 'error', message: e.message }));
                            }
                        }
                        return;
                    }
                    if (payload.type === 'set_model') {
                        if (this.requestHandler) {
                            try {
                                await this.requestHandler('set_model', { modelId: payload.modelId });
                                ws.send(JSON.stringify({ type: 'set_model_success' }));
                            }
                            catch (e) {
                                ws.send(JSON.stringify({ type: 'error', message: e.message }));
                            }
                        }
                        return;
                    }
                    if (payload.type === 'stop') {
                        const sessionId = payload.sessionId;
                        console.log(`[WebSocket] Received stop command for session ${sessionId}`);
                        if (this.requestHandler) {
                            const result = await this.requestHandler('stop_generation', { sessionId });
                            if (result?.snapshot) {
                                ws.send(JSON.stringify({
                                    type: 'queue_snapshot_result',
                                    sessionId,
                                    snapshot: result.snapshot
                                }));
                            }
                        }
                        return;
                    }
                    if (payload.type === 'queue_get'
                        || payload.type === 'queue_cancel'
                        || payload.type === 'queue_clear'
                        || payload.type === 'queue_resume') {
                        const sessionId = payload.sessionId;
                        if (this.requestHandler && sessionId) {
                            const snapshot = await this.requestHandler(payload.type, {
                                sessionId,
                                turnId: payload.turnId,
                            });
                            ws.send(JSON.stringify({
                                type: 'queue_snapshot_result',
                                sessionId,
                                snapshot,
                            }));
                        }
                        return;
                    }
                    if (payload.type === 'official_expert_mode_set') {
                        const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId.trim() : '';
                        const requestId = typeof payload.requestId === 'string' ? payload.requestId.trim() : '';
                        if (!sessionId || !requestId || !this.requestHandler)
                            return;
                        this.clients.set(sessionId, ws);
                        try {
                            const result = await this.requestHandler('official_expert_mode_set', {
                                sessionId,
                                ...(Object.prototype.hasOwnProperty.call(payload, 'selectedExpertRef')
                                    ? { selectedExpertRef: payload.selectedExpertRef }
                                    : {}),
                            });
                            ws.send(JSON.stringify({
                                type: 'official_expert_mode_result',
                                sessionId,
                                requestId,
                                ...result,
                            }));
                        }
                        catch (error) {
                            ws.send(JSON.stringify({
                                type: 'official_expert_mode_result',
                                sessionId,
                                requestId,
                                success: false,
                                error: 'EXPERT_MODE_UPDATE_FAILED',
                                message: String(error?.message || '专家模式切换失败。'),
                            }));
                        }
                        return;
                    }
                    if (payload.type === 'interaction_get' || payload.type === 'interaction_resolve') {
                        const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId.trim() : '';
                        if (!sessionId || !this.requestHandler)
                            return;
                        this.clients.set(sessionId, ws);
                        try {
                            const result = await this.requestHandler(payload.type, payload);
                            ws.send(JSON.stringify({
                                type: payload.type === 'interaction_get'
                                    ? 'interaction_snapshot'
                                    : 'interaction_resolve_result',
                                sessionId,
                                ...result,
                            }));
                        }
                        catch (error) {
                            ws.send(JSON.stringify({
                                type: 'interaction_error',
                                sessionId,
                                interactionId: payload.interactionId,
                                code: String(error?.message || 'INTERACTION_FAILED'),
                            }));
                        }
                        return;
                    }
                    if (payload.type === 'retry_stopped') {
                        const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId.trim() : '';
                        if (this.requestHandler && sessionId) {
                            this.clients.set(sessionId, ws);
                            const result = await this.requestHandler('retry_stopped', {
                                sessionId,
                                turnId: payload.turnId,
                                retryOfTurnId: payload.retryOfTurnId,
                                displayText: payload.displayText,
                                ...(Object.prototype.hasOwnProperty.call(payload, 'selectedExpertRef')
                                    ? { selectedExpertRef: payload.selectedExpertRef }
                                    : {}),
                            });
                            ws.send(JSON.stringify({
                                type: 'retry_stopped_result',
                                sessionId,
                                turnId: payload.turnId,
                                ...result,
                            }));
                        }
                        return;
                    }
                    if (payload.type === 'register') {
                        const sessionId = payload.sessionId;
                        if (sessionId) {
                            this.clients.set(sessionId, ws);
                            console.log(`[WebSocket] Client registered for session ${sessionId}`);
                        }
                        return;
                    }
                    if (payload.type !== 'message' && !payload.content) {
                        // console.log(`[WebSocket] Ignored non-message payload: ${JSON.stringify(payload)}`);
                        return;
                    }
                    sessionId = typeof payload.sessionId === 'string' ? payload.sessionId.trim() : '';
                    if (!sessionId || this.isReservedSystemSessionId(sessionId)) {
                        sessionId = crypto.randomUUID();
                        console.warn(`[WebSocket] Replaced invalid sessionId with new id: ${sessionId}`);
                    }
                    // Update client map for this session
                    this.clients.set(sessionId, ws);
                    console.log(`[WebSocket] Processing message from session ${sessionId}: ${JSON.stringify(payload.content).slice(0, 100)}...`);
                    let content = payload.content || '';
                    // Capture original user input for clean UI display
                    // Note: We need to exclude image data from display_text to avoid huge logs
                    const displayText = visibleTextFromContent(content);
                    // 客户端把图片作为 image_url 直接放进 content（不走 attachments）。
                    // 落盘一份并把路径以文本形式告诉模型：模型能"看见"内联图片，但要交给
                    // 命令行技能就必须有真实路径，否则它会自己伪造一个文件。
                    if (Array.isArray(content)) {
                        const savedPaths = [];
                        for (const part of content) {
                            if (part?.type !== 'image_url' || part.image_url?.path)
                                continue;
                            const url = part.image_url?.url || '';
                            if (!url.startsWith('data:'))
                                continue; // 远端 URL 无需落盘
                            try {
                                const raw = Buffer.from(url.replace(/^data:.*?;base64,/, ''), 'base64');
                                // 原图始终落盘：命令行技能要的是真实路径，缩放只影响进上下文的那一份。
                                const saved = saveUploadedImage(config.workspaceDir, raw, 'pasted_image');
                                if (saved) {
                                    part.image_url.path = saved.path;
                                    savedPaths.push(saved.path);
                                }
                                else {
                                    console.warn('[WebSocket] Inline image is not a recognizable image; not persisted.');
                                }
                                const fitted = await fitImageForContext(raw, saved?.path);
                                if (fitted.dataUrl) {
                                    part.image_url.url = fitted.dataUrl;
                                }
                                else if (fitted.dropped) {
                                    // 缩不下来：把图块换成纯文本说明。留着原图 = 这个会话之后每一轮都 400。
                                    part.type = 'text';
                                    part.text = fitted.note;
                                    delete part.image_url;
                                }
                            }
                            catch (e) {
                                console.error('[WebSocket] Failed to persist inline image:', e);
                            }
                        }
                        // 路径必须作为文本出现：下游会把 image_url 归一化成纯图片块，
                        // 结构化字段在那一步就被丢弃了（同理，任何自定义 ContentPart 字段都活不到持久化）。
                        // 用 <attached_file> 标签承载，UI 渲染时按既有约定剥离（见 stripInjectedContext.ts）。
                        for (const p of savedPaths) {
                            content.push({ type: 'text', text: `<attached_file path="${p}" />` });
                        }
                        if (savedPaths.length > 0) {
                            console.log(`[WebSocket] Persisted ${savedPaths.length} inline image(s): ${savedPaths.join(', ')}`);
                        }
                    }
                    // Handle Attachments (Docs) -> Convert to Markdown and append to content
                    if (payload.attachments && Array.isArray(payload.attachments)) {
                        console.log(`[WebSocket] Processing ${payload.attachments.length} attachments...`);
                        for (const attachment of payload.attachments) {
                            let savedDocumentPath;
                            try {
                                if (!attachment.content || !attachment.name)
                                    continue;
                                // Check for image attachment
                                const isImage = (attachment.type && attachment.type.startsWith('image/')) ||
                                    /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment.name);
                                if (isImage) {
                                    // Ensure data URL format
                                    let dataUrl = attachment.content;
                                    // If raw base64 without prefix
                                    if (!dataUrl.startsWith('data:')) {
                                        const mime = attachment.type || 'image/jpeg';
                                        dataUrl = `data:${mime};base64,${attachment.content}`;
                                    }
                                    // 落盘一份。模型能"看见"内联图片，但要把它交给命令行技能（改图、
                                    // OCR 等）就必须有真实路径。没有路径时模型会自己编一个文件出来。
                                    let saved = null;
                                    try {
                                        const raw = Buffer.from(dataUrl.replace(/^data:.*?;base64,/, ''), 'base64');
                                        saved = saveUploadedImage(config.workspaceDir, raw, attachment.name);
                                        if (!saved) {
                                            console.warn(`[WebSocket] Attachment ${attachment.name} is not a recognizable image; not persisted.`);
                                        }
                                    }
                                    catch (e) {
                                        console.error(`[WebSocket] Failed to persist image attachment ${attachment.name}:`, e);
                                    }
                                    // Convert content to array if it's currently a string
                                    if (typeof content === 'string') {
                                        content = content ? [{ type: 'text', text: content }] : [];
                                    }
                                    if (Array.isArray(content)) {
                                        const rawBytes = Buffer.from(dataUrl.replace(/^data:.*?;base64,/, ''), 'base64');
                                        const fitted = await fitImageForContext(rawBytes, saved?.path);
                                        if (fitted.dropped) {
                                            // 缩不下来就不内联，只留说明文本 —— 见 fitImageForContext 的注释。
                                            content.push({ type: 'text', text: fitted.note });
                                        }
                                        else {
                                            content.push({
                                                type: 'image_url',
                                                image_url: {
                                                    url: fitted.dataUrl || dataUrl,
                                                    detail: "auto",
                                                    path: saved?.path
                                                }
                                            });
                                        }
                                        // 路径必须以文本形式出现，否则模型看不到它：下游会把 image_url
                                        // 归一化成纯图片块，`path` 字段在那一步被丢弃。
                                        if (saved) {
                                            content.push({
                                                type: 'text',
                                                text: `<attached_file path="${saved.path}" />`
                                            });
                                        }
                                    }
                                    console.log(`[WebSocket] Processed image attachment: ${attachment.name}${saved ? ` -> ${saved.path}` : ''}`);
                                    continue;
                                }
                                // Extract Base64 (remove data:xxx;base64, prefix if present)
                                const base64Data = attachment.content.replace(/^data:.*?;base64,/, "");
                                const buffer = Buffer.from(base64Data, 'base64');
                                const saved = saveUploadedFile(config.workspaceDir, buffer, attachment.name);
                                savedDocumentPath = saved.path;
                                const converted = await DocConverter.convertToMarkdown(buffer, attachment.name, attachment.type);
                                if (typeof content === 'string') {
                                    content = content ? [{ type: 'text', text: content }] : [];
                                }
                                if (Array.isArray(content)) {
                                    content.push({
                                        type: 'text',
                                        text: `<attached_file path=${JSON.stringify(saved.path)} />`
                                    });
                                    content.push({
                                        type: 'text',
                                        text: buildDocumentContext(attachment.name, converted.content)
                                    });
                                }
                                console.log(`[WebSocket] Converted ${attachment.name} (${converted.type}) -> ${saved.path}`);
                            }
                            catch (err) {
                                console.error(`[WebSocket] Failed to convert attachment ${attachment.name}:`, err);
                                // Optional: Append error to content so user knows
                                const errorMsg = `\n[System Error: Failed to process document ${attachment.name}: ${err}]\n`;
                                if (typeof content === 'string') {
                                    content = content ? [{ type: 'text', text: content }] : [];
                                }
                                if (Array.isArray(content)) {
                                    if (savedDocumentPath) {
                                        content.push({
                                            type: 'text',
                                            text: `<attached_file path=${JSON.stringify(savedDocumentPath)} />`
                                        });
                                    }
                                    content.push({ type: 'text', text: errorMsg });
                                }
                            }
                        }
                    }
                    const message = {
                        id: typeof payload.turnId === 'string' && payload.turnId.trim()
                            ? payload.turnId.trim()
                            : crypto.randomUUID(),
                        role: 'user',
                        content: content,
                        senderId: sessionId,
                        source: 'websocket',
                        metadata: {
                            chat_id: sessionId,
                            user_id: 'user_default',
                            display_text: displayText, // Store clean text for UI
                            traceId: payload.traceId || `${sessionId}::${Date.now()}`,
                            turnId: typeof payload.turnId === 'string' ? payload.turnId : undefined,
                            intent: typeof payload.intent === 'string' ? payload.intent : undefined,
                            attachedSkill: typeof payload.attachedSkillId === 'string' && payload.attachedSkillId.trim()
                                ? { id: payload.attachedSkillId.trim().slice(0, 160) }
                                : undefined,
                            // Additive P1c contract. Do not merge arbitrary client metadata: the
                            // Gateway owns strict parsing/version pinning and fails closed when a
                            // caller explicitly supplies a malformed Expert reference.
                            ...(Object.prototype.hasOwnProperty.call(payload, 'selectedExpertRef')
                                ? { selectedExpertRef: payload.selectedExpertRef }
                                : {}),
                        }
                    };
                    if (this.messageHandler) {
                        console.log(`[WebSocket] Dispatching message to handler...`);
                        await this.messageHandler(message);
                    }
                    else {
                        console.error('[WebSocket] No message handler registered!');
                    }
                }
                catch (e) {
                    console.error('[WebSocket] Error processing message:', e);
                    // Prevent frontend crash by sending error back
                    try {
                        // Send system error message
                        const errorMsg = {
                            id: crypto.randomUUID(),
                            role: 'system',
                            content: `[System Error] ${e.message || 'Unknown error occurred while processing your request.'}`,
                            senderId: 'system',
                            source: 'system',
                            metadata: {
                                chat_id: sessionId || 'unknown',
                                error: true,
                                errorType: 'network_or_internal'
                            },
                            timestamp: Date.now()
                        };
                        ws.send(JSON.stringify(errorMsg));
                        // Send run_completed or run_failed event to unblock frontend loading state
                        ws.send(JSON.stringify({
                            type: 'agent_event',
                            event: {
                                type: 'run_failed',
                                traceId: payload?.traceId || `${sessionId || 'unknown'}::${Date.now()}`,
                                error: e.message
                            },
                            sessionId: sessionId || 'unknown'
                        }));
                    }
                    catch (sendErr) {
                        console.error('[WebSocket] Failed to send error back to client:', sendErr);
                    }
                }
            });
            ws.on('close', () => {
                // console.log('[WebSocket] Client disconnected');
                // Optional: remove from clients map, but user might reconnect with same sessionId
            });
            ws.on('error', (err) => {
                console.error('[WebSocket] Client error:', err);
            });
        });
    }
    broadcastYokowebotAlert(alert) {
        const payload = JSON.stringify(alert);
        this.wss?.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(payload);
            }
        });
    }
    // ===================== Task Framework (PR4a) =====================
    /**
     * 注入 task framework 依赖。如果在 start() 之后调用,会即时挂载 HTTP API。
     * server.ts 必须在 gateway.start() 之前(或之后)调用本方法。
     */
    setTaskFramework(deps) {
        this.taskGroupManager = deps.manager;
        this.taskStore = deps.taskStore;
        this.taskEventStore = deps.eventStore;
        this.taskAuditStore = deps.auditStore;
        // 订阅 TaskEvent 流 → 路由到对应 chat 的 WebSocket
        this.taskEventStore.subscribe(async (event) => {
            try {
                await this.routeTaskEvent(event);
            }
            catch (err) {
                console.error('[WebSocket] routeTaskEvent error', err);
            }
        });
        // 如果 start 已经发生,即时挂载 task API endpoint
        if (this.expressApp && !this.taskApiRegistered) {
            this.registerTaskApi(this.expressApp);
        }
    }
    /**
     * 注入 Agentic Provider(P2-b)。与 setTaskFramework 同构:
     * start() 之前调用则由 start() 挂载,之后调用则即时挂载。
     */
    setAgenticProvider(service) {
        this.agenticService = service;
        if (this.expressApp && !this.agenticApiRegistered) {
            registerAgenticApi(this.expressApp, service);
            this.agenticApiRegistered = true;
        }
    }
    setAgentPreviewProvider(service) {
        this.agentPreviewService = service;
        if (this.expressApp && !this.agentPreviewApiRegistered) {
            registerAgentPreviewApi(this.expressApp, service);
            this.agentPreviewApiRegistered = true;
        }
    }
    setExpertDirectProvider(service) {
        this.expertDirectService = service;
        if (this.expressApp && !this.expertDirectApiRegistered) {
            registerExpertDirectApi(this.expressApp, service);
            this.expertDirectApiRegistered = true;
        }
    }
    setOfficialExpertCatalogProvider(service) {
        this.officialExpertCatalogService = service;
        if (this.expressApp && !this.officialExpertCatalogApiRegistered) {
            registerOfficialExpertCatalogApi(this.expressApp, service);
            this.officialExpertCatalogApiRegistered = true;
        }
    }
    /**
     * 注入 FileMemory，用于 UI 上传本地知识库后**确定性**重索引。
     * 为什么不靠 chokidar：跨进程复制的文件会带源文件旧 mtime、且新建子目录+写文件有竞态，
     * Windows 上实测会漏 add 事件（本地库文档上传后检索不到）。上传后由 UI 主动打这个 endpoint。
     */
    setFileMemory(fm) {
        this.fileMemory = fm;
        if (this.expressApp && !this.knowledgeApiRegistered) {
            this.registerKnowledgeApi(this.expressApp);
        }
    }
    registerKnowledgeApi(app) {
        if (this.knowledgeApiRegistered)
            return;
        this.knowledgeApiRegistered = true;
        /**
         * `/api/knowledge/*` 的鉴权闸。
         *
         * 为什么必须有：这个 express app 挂着 `cors()`（放行任意 Origin），所以
         * **用户访问的任意网页都能 fetch 本机这些接口并读到响应**。
         * knowledge 这三个接口只有 Electron 主进程会调，主进程 fork server 时通过
         * env 传入一个每进程随机的密钥，网页拿不到它。
         *
         * 密钥缺失时**拒绝服务而不是放行**：宁可功能不可用，也不能留一个无鉴权的口子。
         * （开发态 tsx 直跑 server 时同样会拒绝——那说明确实没配，应显式设环境变量。）
         */
        const localToken = process.env.YOKO_LOCAL_API_TOKEN || '';
        const requireLocalToken = (req, res, next) => {
            if (!localToken) {
                console.error('[WebSocket] YOKO_LOCAL_API_TOKEN 未配置，/api/knowledge/* 已拒绝服务');
                return res.status(503).json({ success: false, error: 'local api token not configured' });
            }
            if (!isLocalTokenValid(localToken, req.headers['x-yoko-local-token'])) {
                return res.status(401).json({ success: false, error: 'unauthorized' });
            }
            next();
        };
        app.use('/api/knowledge', requireLocalToken);
        // syncDirectory 会重扫该目录并按内容 hash 跳过未变文件，只对新增/改动文件做 embedding，重复调用安全。
        /**
         * 重索引 —— **异步 job 模式**。
         *
         * 为什么不能同步等：调用方（Electron 主进程）有 60s 超时，而一篇大文档的
         * 索引会超过它。超时后 HTTP 连接断掉，但**服务端任务照跑**；主进程随即
         * 释放并发槽、UI 显示「已导入」—— 于是出现「看不见的任务在后台重叠跑」，
         * 并发闸形同虚设，用户也不知道索引其实还没完。
         *
         * 现在立即返回 jobId，由调用方轮询 /api/knowledge/reindex/status。
         * 同一目录已有任务在跑时**复用那个 job**，从根上不产生重叠。
         */
        app.post('/api/knowledge/reindex', async (req, res) => {
            try {
                const dir = req.body?.dir === 'agents' ? 'agents' : 'knowledge';
                const running = this.reindexJobs.get(dir);
                if (running && running.state === 'running') {
                    // 复用当前这轮，但**必须置脏**：这次提交多半是因为刚落盘了新文档，
                    // 而当前这轮的文件清单是它开始时列的，看不到新文档。
                    // 不置脏就会出现「报告完成、新文档没索引」——正是本条要修的 bug。
                    running.dirty = true;
                    return res.json({ success: true, jobId: running.id, dir, state: 'running', reused: true });
                }
                const jobId = `rix-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
                const job = {
                    id: jobId, dir, state: 'running', startedAt: Date.now(),
                    synced: 0, failed: [], blocked: [], dirty: false,
                };
                this.reindexJobs.set(dir, job);
                this.reindexJobsById.set(jobId, job);
                // 不 await：立即回 jobId
                void (async () => {
                    try {
                        // 扫到目录稳定为止。每一轮都是全量扫描，未变的文件会被 hash
                        // 增量判断直接跳过（返回 SKIPPED 且仍计入 synced），
                        // 所以**最后一轮的结果就是完整结果**，不需要跨轮累加。
                        let passes = 0;
                        do {
                            job.dirty = false;
                            const r = await this.fileMemory?.syncDirectory(dir);
                            job.synced = r?.synced ?? 0;
                            job.failed = r?.failed ?? [];
                            job.blocked = r?.blocked ?? [];
                            passes++;
                            // 兜底上限：万一有进程持续写入该目录，别让这个任务永远跑下去。
                            if (passes >= REINDEX_MAX_PASSES) {
                                if (job.dirty) {
                                    console.warn(`[WebSocket] reindex ${dir} 连续 ${passes} 轮仍有新提交，停止收敛；` +
                                        'watcher 会继续兜底处理后续变更');
                                }
                                break;
                            }
                        } while (job.dirty);
                        job.state = 'done';
                    }
                    catch (e) {
                        job.state = 'error';
                        job.error = e?.message || String(e);
                        console.error('[WebSocket] reindex job failed', e);
                    }
                    finally {
                        job.finishedAt = Date.now();
                        // 完成态保留一段时间供轮询取结果，之后清理避免无限增长
                        setTimeout(() => {
                            if (this.reindexJobs.get(dir)?.id === jobId)
                                this.reindexJobs.delete(dir);
                            this.reindexJobsById.delete(jobId);
                        }, REINDEX_JOB_TTL_MS).unref?.();
                    }
                })();
                res.json({ success: true, jobId, dir, state: 'running' });
            }
            catch (e) {
                console.error('[WebSocket] knowledge reindex failed', e);
                res.status(500).json({ success: false, error: e?.message || String(e) });
            }
        });
        /**
         * 文件字节 → 规范化 markdown。
         *
         * ⚠️ **接收字节，绝不接收路径。**
         * 早期版本收 `{ path }` 然后 readFile —— 那是一个任意本地文件读取原语：
         * 配上 `cors()` 放行任意 Origin，用户访问的恶意网页就能读走
         * userData 下的 `auth.json`（含平台 JWT）造成账号接管。
         * 收字节的话，未授权调用方最多只能转换它自己已经持有的数据，无从窃取。
         * 读文件这一步留在主进程 —— 那里的路径来自用户刚在系统对话框里选中的文件，是可信的。
         *
         * 放在 server 子进程而不是主进程解析：pdf-parse / mammoth / xlsx 都很重，
         * 主进程已经因为 NODE_PATH 的事踩过坑（见 main.ts 里那段注释），
         * 而这里本来就 bundle 了 doc_converter（技能在用）。
         *
         * 用 `mode: 'ingest'` —— 默认的 context 模式是给 Agent 上下文用的**有界预览**，
         * 拿来做摄取会把大表格静默截断。
         */
        app.post('/api/knowledge/convert', 
        // 只对本路由用 raw body（全局是 express.json）。64MB = 付费档单文件上限 50MB
        // 留出余量；超限由 express 直接 413，不进业务代码。
        express.raw({ type: '*/*', limit: '64mb' }), async (req, res) => {
            try {
                const buffer = req.body;
                if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
                    return res.status(400).json({ success: false, error: 'empty body' });
                }
                // 文件名只用于后缀判断（决定走哪个解析器），不参与任何文件系统操作。
                const rawName = req.headers['x-filename'];
                const filename = typeof rawName === 'string' && rawName
                    ? decodeURIComponent(rawName)
                    : 'upload.txt';
                const converted = await DocConverter.convertToMarkdown(buffer, filename, undefined, { mode: 'ingest' });
                res.json({
                    success: true,
                    content: converted.content,
                    // boundedPreview / truncatedByCharacterLimit 透传给调用方：
                    // 内容被截断过就必须让用户知道，不能默默入库一份不全的文档。
                    metadata: converted.metadata ?? {},
                    bytes: buffer.length,
                });
            }
            catch (e) {
                console.error('[WebSocket] knowledge convert failed', e);
                res.status(500).json({ success: false, error: e?.message || String(e) });
            }
        });
        /** 轮询重索引进度。done/error 时带上明细。 */
        app.get('/api/knowledge/reindex/status', (req, res) => {
            // 优先按 jobId 查：这才是「我提交的那个任务」的状态。
            // 按 dir 查只作为老调用方的兼容路径 —— 它可能读到别人的任务。
            const jobId = typeof req.query?.jobId === 'string' ? req.query.jobId : '';
            if (jobId) {
                const byId = this.reindexJobsById.get(jobId);
                // 查不到 = 任务已过期被清理。它一定已经结束（TTL 从完成时才开始算），
                // 所以回 done 而不是 idle，避免调用方一直轮询到超时。
                if (!byId)
                    return res.json({ success: true, jobId, state: 'done', expired: true, synced: 0, failed: [], blocked: [] });
                return res.json({
                    success: true,
                    jobId: byId.id,
                    state: byId.state,
                    synced: byId.synced,
                    failed: byId.failed,
                    blocked: byId.blocked,
                    error: byId.error,
                    elapsedMs: (byId.finishedAt ?? Date.now()) - byId.startedAt,
                });
            }
            const dir = req.query?.dir === 'agents' ? 'agents' : 'knowledge';
            const job = this.reindexJobs.get(dir);
            if (!job)
                return res.json({ success: true, state: 'idle' });
            res.json({
                success: true,
                jobId: job.id,
                state: job.state,
                synced: job.synced,
                failed: job.failed,
                blocked: job.blocked,
                error: job.error,
                elapsedMs: (job.finishedAt ?? Date.now()) - job.startedAt,
            });
        });
        // 删除文档时确定性清向量库（syncDirectory 只增改不删，删除必须显式 purge）。
        // ns 形如 "knowledge/<docId>"；deleteByNamespace 内部过白名单防注入。
        app.post('/api/knowledge/purge', async (req, res) => {
            try {
                const ns = String(req.body?.ns || '').trim();
                if (!ns)
                    return res.status(400).json({ success: false, error: 'missing ns' });
                await this.fileMemory?.getStore().deleteByNamespace(ns);
                res.json({ success: true });
            }
            catch (e) {
                console.error('[WebSocket] knowledge purge failed', e);
                res.status(500).json({ success: false, error: e?.message || String(e) });
            }
        });
    }
    /**
     * 把 task event 路由到 group.parentSessionId 对应的 WebSocket 客户端。
     */
    async routeTaskEvent(event) {
        if (!this.taskStore)
            return;
        const group = await this.taskStore.load(event.groupId);
        if (!group)
            return;
        // parentSessionId 新数据形如 "websocket__<chatId>"。
        // 兼容早期 task 数据: 曾保存为裸 chatId,这里按 websocket 处理。
        const hasCompositeParent = group.parentSessionId.includes('__');
        const parts = hasCompositeParent ? group.parentSessionId.split('__') : ['websocket', group.parentSessionId];
        const channel = parts[0];
        const chatId = parts.slice(1).join('__');
        if (channel !== 'websocket' || !chatId)
            return; // 阶段一只推 websocket 客户端
        // 推送 task_event(主消息)+ task_group_update(顺带带最新 status snapshot 给前端)
        const eventPayload = JSON.stringify({
            type: 'task_event',
            sessionId: chatId,
            event,
        });
        const status = await this.taskGroupManager?.getStatus(event.groupId).catch(() => null);
        const updatePayload = status
            ? JSON.stringify({
                type: 'task_group_update',
                sessionId: chatId,
                groupStatus: status,
            })
            : null;
        const client = this.clients.get(chatId);
        if (client && client.readyState === WebSocket.OPEN) {
            client.send(eventPayload);
            if (updatePayload)
                client.send(updatePayload);
        }
        // 审批事件额外推一个高优先级 approval_request 消息(方便 UI 弹层)
        if (event.type === 'approval_requested' && status) {
            const ap = status.pendingApprovals.find(a => a.id === event.metadata?.approvalId);
            if (ap) {
                const ar = JSON.stringify({
                    type: 'approval_request',
                    sessionId: chatId,
                    groupId: event.groupId,
                    approval: ap,
                });
                if (client && client.readyState === WebSocket.OPEN) {
                    client.send(ar);
                }
            }
        }
    }
    /**
     * 注册 task framework HTTP API。
     */
    registerTaskApi(app) {
        if (this.taskApiRegistered)
            return;
        const manager = this.taskGroupManager;
        const taskStore = this.taskStore;
        const eventStore = this.taskEventStore;
        if (!manager || !taskStore || !eventStore)
            return;
        // 列出某个 chat session 下的任务组
        app.get('/api/task-groups', async (req, res) => {
            try {
                const sessionId = req.query.sessionId;
                if (!sessionId) {
                    return res.status(400).json({ error: 'sessionId required' });
                }
                const parentSessionId = sessionId.includes('__') ? sessionId : `websocket__${sessionId}`;
                const groups = await taskStore.listByParentSession(parentSessionId);
                // 精简返回字段,UI 不需要完整 subTasks
                res.json(groups.map(g => ({
                    id: g.id,
                    goal: g.goal,
                    status: g.status,
                    silentMode: g.silentMode,
                    createdAt: g.createdAt,
                    updatedAt: g.updatedAt,
                    completedAt: g.completedAt,
                    taskCount: g.subTasks.length,
                    finalSummary: g.finalSummary,
                })));
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        // 获取某个任务组的实时状态(精简视图)
        app.get('/api/task-groups/:groupId', async (req, res) => {
            try {
                const status = await manager.getStatus(req.params.groupId);
                if (!status)
                    return res.status(404).json({ error: 'not found' });
                res.json(status);
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        // 获取任务组的事件流(按 fromIndex/limit 分页)
        app.get('/api/task-groups/:groupId/events', async (req, res) => {
            try {
                const fromIndex = parseInt(String(req.query.fromIndex ?? '0'), 10);
                const limit = parseInt(String(req.query.limit ?? '100'), 10);
                const events = await eventStore.read(req.params.groupId, { fromIndex, limit });
                res.json({ events });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        // 启动任务组(用户点 UI"开始执行")
        app.post('/api/task-groups/:groupId/start', async (req, res) => {
            try {
                await manager.startGroup(req.params.groupId);
                const status = await manager.getStatus(req.params.groupId);
                res.json({ success: true, status });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        // 取消整组 或 单个子任务
        app.post('/api/task-groups/:groupId/cancel', async (req, res) => {
            try {
                const taskId = req.body?.taskId;
                await manager.cancelGroup(req.params.groupId, taskId);
                const status = await manager.getStatus(req.params.groupId);
                res.json({ success: true, status });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        // 重试单个子任务
        app.post('/api/task-groups/:groupId/retry', async (req, res) => {
            try {
                const taskId = req.body?.taskId;
                if (!taskId)
                    return res.status(400).json({ error: 'taskId required' });
                await manager.retryTask(req.params.groupId, taskId);
                const status = await manager.getStatus(req.params.groupId);
                res.json({ success: true, status });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        // 处理审批(approve/deny + scope)
        app.post('/api/task-groups/:groupId/approvals/:approvalId', async (req, res) => {
            try {
                const decision = req.body?.decision === 'denied' ? 'denied' : 'approved';
                const scope = req.body?.scope; // "once" | "session" | "task_group"
                await manager.resolveApproval(req.params.groupId, req.params.approvalId, decision, scope);
                const status = await manager.getStatus(req.params.groupId);
                res.json({ success: true, status });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        this.taskApiRegistered = true;
        console.log('[WebSocket] Task framework HTTP API registered');
    }
    async stop() {
        this.unsubscribeInteractions?.();
        this.unsubscribeInteractions = null;
        this.wss?.close();
        this.httpServer?.close();
    }
    pushInteraction(interaction) {
        const clientSessionId = interaction.sessionId.startsWith('websocket__')
            ? interaction.sessionId.slice('websocket__'.length)
            : interaction.sessionId;
        const client = this.clients.get(clientSessionId) || this.clients.get(interaction.sessionId);
        if (!client || client.readyState !== WebSocket.OPEN)
            return;
        client.send(JSON.stringify({
            type: interaction.status === 'pending' ? 'interaction_request' : 'interaction_resolved',
            sessionId: clientSessionId,
            interaction,
        }));
    }
    async send(message) {
        const chatId = message.metadata?.chat_id;
        if (!chatId) {
            console.warn('[WebSocket] Cannot send message: missing chat_id in metadata');
            return;
        }
        const client = this.clients.get(chatId);
        let sent = false;
        if (client && client.readyState === WebSocket.OPEN) {
            try {
                client.send(JSON.stringify(message));
                sent = true;
            }
            catch (error) {
                console.error(`[WebSocket] Failed to send message to client ${chatId}:`, error);
            }
        }
        if (!sent) {
            console.warn(`[WebSocket] Client not found or not connected for chat_id: ${chatId}. Saving as notification.`);
            // Extract content preview for notification
            let content = '';
            if (typeof message.content === 'string') {
                content = message.content;
            }
            else if (Array.isArray(message.content)) {
                // Filter out thoughts and system details, focus on user-facing text
                content = message.content
                    .filter(c => c.type === 'text')
                    .map(c => c.text)
                    .join(' ');
                if (!content) {
                    // If no text, check for images or other types
                    const hasImage = message.content.some(c => c.type === 'image_url');
                    if (hasImage)
                        content = '[图片]';
                    else
                        content = '[新消息]';
                }
            }
            // Truncate content if too long
            if (content.length > 100) {
                content = content.substring(0, 100) + '...';
            }
            // The title describes the source; the preview belongs in content. Using
            // the first line as both title and content made every notification look
            // duplicated and obscured the actual information hierarchy.
            const cronRun = message.metadata?.cronRun;
            const title = typeof message.metadata?.notificationTitle === 'string'
                ? message.metadata.notificationTitle
                : cronRun?.jobName
                    ? `定时任务「${cronRun.jobName}」有新结果`
                    : message.metadata?.isSubAgent
                        ? '子 Agent 任务有新结果'
                        : message.metadata?.taskGroupId
                            ? 'Agent 任务有新结果'
                            : '新消息';
            const notificationKey = typeof message.metadata?.notificationKey === 'string'
                ? message.metadata.notificationKey
                : `message:${message.id}`;
            NotificationManager.getInstance().addNotification({
                type: 'message',
                title: title,
                content: content || '您有一条新消息',
                sessionId: chatId,
                dedupeKey: notificationKey,
                metadata: {
                    originalMessageId: message.id,
                    role: message.role,
                    kind: message.metadata?.kind || (cronRun ? 'cron_run' : 'message'),
                    notificationKey,
                }
            });
        }
    }
    async sendEvent(event, metadata) {
        const chatId = metadata?.chat_id;
        if (!chatId) {
            console.warn('[WebSocket] Cannot send event: missing chat_id in metadata');
            return;
        }
        const client = this.clients.get(chatId);
        if (client && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'agent_event',
                event,
                sessionId: chatId
            }));
        }
        else {
            // For events, we generally don't notify unless it's a critical error or completion
            // But if it's a sub-agent completion, maybe?
            // For now, let's skip events to avoid spamming notifications
        }
    }
    isReservedSystemSessionId(sessionId) {
        return /^system(?:[_:]{1,2})?heartbeat$/i.test(sessionId);
    }
}
