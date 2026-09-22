import OpenAI from "openai";
import { randomUUID } from "crypto";
import MiniSearch from 'minisearch';
import { config } from "../config/index.js";
import { LLMManager } from "../agent/llm/manager.js";
import * as fs from 'fs';
import * as path from 'path';
/**
 * 知识库 namespace 校验。namespace 来自用户创建的目录名，会被拼进 LanceDB 的
 * filter 表达式 —— 不做白名单就是一个注入面。
 * 只允许目录名的安全子集；不合法的直接抛出，宁可检索失败也不放行。
 */
const NAMESPACE_PATTERN = /^[A-Za-z0-9_-]+$/;
export function escapeNamespace(ns) {
    if (!NAMESPACE_PATTERN.test(ns)) {
        throw new Error(`非法的知识库名称: ${JSON.stringify(ns)}（只允许字母、数字、下划线、连字符）`);
    }
    return ns;
}
/**
 * §13.1 知识库**路径前缀**校验。前缀有两种形态：
 *   全局共享  `knowledge/<ns>`
 *   agent 私有 `agents/<name>/knowledge/<kb>`
 *
 * 前缀会被拼进 LanceDB 的 LIKE 表达式 —— 逐段过 NAMESPACE_PATTERN 白名单后再拼回，
 * 任何一段非法(含 `..`、空格、引号)直接抛出。斜杠只作为段分隔符，不来自用户单段输入。
 */
export function escapeNamespacePrefix(prefix) {
    const segs = (prefix || "").replace(/\\/g, '/').split('/').filter(Boolean);
    if (segs.length === 0)
        throw new Error(`空的知识库路径前缀`);
    for (const s of segs)
        escapeNamespace(s); // 复用单段白名单；非法即抛
    return segs.join('/');
}
/**
 * 转义要拼进 LanceDB SQL 单引号字面量的值。userId 来自渠道(微信 openid、飞书 open_id
 * 等)，不走 NAMESPACE_PATTERN 白名单，单引号会截断表达式。
 */
export function escapeSqlLiteral(value) {
    return String(value ?? "").replace(/'/g, "''");
}
/** chunk 是否落在某知识库前缀下(全局或 agent 私有)。入库时已归一正斜杠，仍兼容反斜杠。 */
export function isInNamespacePrefix(chunkPath, prefix) {
    if (!chunkPath)
        return false;
    const normalized = chunkPath.replace(/\\/g, '/');
    return normalized.startsWith(`${prefix}/`);
}
/**
 * chunk 是否有可检索的实质内容。
 *
 * 只有标题的 chunk（`# Daily Log 2026-07-21.md`、`# Core Memory`）是纯噪声：
 * 它占据候选位、占用 embedding 配额、进 BM25 倒排，却不可能对任何回答有帮助。
 * 实测线上 38% 的注入个人记忆、本地索引 91% 的 chunk 都是这种空壳，把宽召回的
 * 候选池整个稀释掉了 —— 这不是靠调相关性阈值能解决的，得从入库口拦住。
 */
export function hasIndexableContent(text) {
    const body = String(text || "")
        .replace(/<!--[\s\S]*?-->/g, " ") // 元数据注释不是内容
        .split("\n")
        .filter((line) => !/^\s*#{1,6}\s/.test(line)) // markdown 标题行不是内容
        .join("")
        .replace(/\s+/g, "");
    return body.length > 0;
}
/** 是否为知识库文件(全局 `knowledge/…` 或 agent 私有 `agents/<name>/knowledge/…`)。 */
export function isKnowledgePath(chunkPath) {
    if (!chunkPath)
        return false;
    const p = chunkPath.replace(/\\/g, '/');
    return p.startsWith('knowledge/') || /^agents\/[^/]+\/knowledge\//.test(p);
}
/**
 * 旧口径:仅全局 `knowledge/<ns>/`。保留给只认全局命名空间的调用方与既有测试。
 * 新代码请用 `isInNamespacePrefix`(接受 agent 私有前缀)。
 */
export function isInKnowledgeNamespace(chunkPath, ns) {
    return isInNamespacePrefix(chunkPath, `knowledge/${ns}`);
}
/**
 * LanceDB 的 `_distance` → 余弦相似度。
 *
 * 建表时未指定 metric，用的是默认的**平方 L2**；embedding 已归一化
 * （实测：用某 chunk 自身的向量检索，`_distance` 恰为 0）。
 * 对单位向量有 d² = 2 - 2cos，故 cos = 1 - d/2。
 *
 * 实测参考（2048 维模型）：完全相同 = 1.0；无关的同语言文本 ≈ 0.44~0.48。
 */
export function distanceToCosine(distance) {
    if (typeof distance !== 'number' || !Number.isFinite(distance))
        return undefined;
    const cos = 1 - distance / 2;
    return Math.max(0, Math.min(1, cos));
}
import { MemoryMetadataStore } from "./metadata_store.js";
import { CANDIDATE_CONFIDENCE, isCandidateMemoryPath } from "./injection_gate.js";
import { analyzeLexicalEvidence, } from "./recall.js";
import { isActiveStandingPreference, parseMemoryMeta } from "./evolution.js";
/**
 * 客户端单批 embedding 条数。服务端上限是 128（MAX_EMBEDDING_BATCH），
 * 这里取 64：留超时余量，且失败重试的工作量更小（一批失败只需重来 64 条）。
 */
const CLIENT_EMBED_BATCH = 64;
export class MemoryStore {
    db;
    table;
    lancedb;
    vectorDim = config.embedding.dim;
    miniSearch;
    hasData = false;
    hasKnowledge = false;
    metaStore = new MemoryMetadataStore();
    // LanceDB cannot handle non-ASCII paths (like Chinese usernames). 
    // We force VectorDB to a global, safe path on Windows.
    dbPath = process.platform === 'win32'
        ? path.join(process.env.ProgramData || 'C:\\ProgramData', 'YokoAgent', 'VectorDB', 'memory-db')
        : path.join(process.env.USER_DATA_PATH || process.cwd(), "data", "memory-db");
    metaPath = process.platform === 'win32'
        ? path.join(process.env.ProgramData || 'C:\\ProgramData', 'YokoAgent', 'VectorDB', 'memory-db-meta.json')
        : path.join(process.env.USER_DATA_PATH || process.cwd(), "data", "memory-db-meta.json");
    tokenizeText(text) {
        const input = (text || "").toLowerCase();
        const tokens = [];
        const flushAscii = (buffer) => {
            const parts = buffer.split(/[^a-z0-9]+/i).filter(Boolean);
            for (const p of parts)
                tokens.push(p);
        };
        const flushCjk = (buffer) => {
            if (!buffer)
                return;
            if (buffer.length === 1) {
                tokens.push(buffer);
                return;
            }
            for (let i = 0; i < buffer.length; i++)
                tokens.push(buffer[i]);
            for (let i = 0; i < buffer.length - 1; i++)
                tokens.push(buffer.slice(i, i + 2));
        };
        let asciiBuf = "";
        let cjkBuf = "";
        for (const ch of input) {
            const code = ch.charCodeAt(0);
            const isCjk = code >= 0x4e00 && code <= 0x9fff;
            if (isCjk) {
                if (asciiBuf) {
                    flushAscii(asciiBuf);
                    asciiBuf = "";
                }
                cjkBuf += ch;
                continue;
            }
            if (cjkBuf) {
                flushCjk(cjkBuf);
                cjkBuf = "";
            }
            if (/[a-z0-9]/i.test(ch)) {
                asciiBuf += ch;
            }
            else {
                if (asciiBuf) {
                    flushAscii(asciiBuf);
                    asciiBuf = "";
                }
            }
        }
        if (asciiBuf)
            flushAscii(asciiBuf);
        if (cjkBuf)
            flushCjk(cjkBuf);
        return tokens;
    }
    normalizePath(value) {
        if (!value)
            return "";
        return value.replace(/\\/g, "/");
    }
    async init() {
        await this.metaStore.init();
        // 0. Check Metadata Compatibility
        await this.checkModelCompatibility();
        // Try to load LanceDB dynamically
        try {
            // Dynamic import to handle native module loading failures (e.g. on non-ASCII paths)
            this.lancedb = await import("@lancedb/lancedb");
        }
        catch (e) {
            console.warn(`[Memory] Failed to load LanceDB (Vector Store): ${e.message}. Running in Keyword-Only mode.`);
            this.lancedb = null;
        }
        if (this.lancedb) {
            // Initialize LanceDB (Vector Store)
            try {
                this.db = await this.lancedb.connect(this.dbPath);
                this.table = await this.db.openTable("memories");
            }
            catch {
                console.log(`[Memory] 初始化向量表 (维度: ${this.vectorDim})...`);
                try {
                    this.table = await this.db.createTable("memories", [
                        {
                            vector: Array(this.vectorDim).fill(0.1),
                            id: "init_id",
                            text: "init",
                            source: "system",
                            path: "",
                            startLine: 0,
                            createdAt: Date.now(),
                            userId: "system" // Added userId field
                        }
                    ]);
                    await this.table.delete('id = "init_id"');
                    // Save Metadata on new creation
                    await this.saveMetadata();
                }
                catch (createErr) {
                    console.error(`[Memory] Failed to create LanceDB table: ${createErr.message}`);
                    this.table = null;
                }
            }
            if (this.table) {
                const count = await this.table.countRows();
                this.hasData = count > 0;
                // Check if any knowledge files exist (全局 knowledge/ 或 agent 私有 agents/*/knowledge/)
                try {
                    const knowledgeCheck = await this.table.query()
                        .filter("path LIKE 'knowledge%' OR path LIKE 'agents/%/knowledge/%'")
                        .limit(1)
                        .toArray();
                    this.hasKnowledge = knowledgeCheck.length > 0;
                }
                catch (e) {
                    console.warn("[Memory] Failed to check knowledge existence, defaulting to true:", e);
                    this.hasKnowledge = true;
                }
                console.log(`[Memory] Vector store loaded with ${count} records. (hasData: ${this.hasData}, hasKnowledge: ${this.hasKnowledge})`);
            }
        }
        else {
            console.warn("[Memory] LanceDB unavailable. Vector search disabled.");
        }
        // Initialize MiniSearch (Keyword Store)
        this.miniSearch = new MiniSearch({
            tokenize: (string) => this.tokenizeText(string),
            fields: ['text', 'path'], // fields to index for full-text search
            storeFields: ['text', 'source', 'path', 'startLine', 'createdAt', 'userId'], // fields to return with search results
            searchOptions: {
                boost: { text: 2 },
                fuzzy: 0.2
            }
        });
        console.log("[Memory] 初始化关键词索引 (MiniSearch)...");
        if (this.hasData && this.table) {
            const allData = await this.table.query().toArray();
            this.miniSearch.addAll(allData.map((d) => ({
                id: d.id,
                text: d.text,
                source: d.source,
                path: d.path,
                startLine: d.startLine,
                createdAt: d.createdAt,
                userId: d.userId
            })));
        }
    }
    async checkModelCompatibility() {
        if (fs.existsSync(this.metaPath)) {
            try {
                const meta = JSON.parse(fs.readFileSync(this.metaPath, 'utf-8'));
                if (meta.dim !== this.vectorDim) {
                    throw new Error(`Vector Dimension Mismatch! DB: ${meta.dim}, Config: ${this.vectorDim}. Please delete '${this.dbPath}' to rebuild index.`);
                }
                // Optional: Check model name if strictly required
                // if (meta.model !== config.embedding.model) { ... }
            }
            catch (e) {
                console.warn(`[Memory] Metadata check failed: ${e.message}`);
                if (e.message.includes("Dimension Mismatch")) {
                    throw e; // Stop startup to prevent corruption
                }
            }
        }
        else {
            // If DB exists but meta doesn't (legacy), we might assume it's compatible or warn
            if (fs.existsSync(this.dbPath) && fs.existsSync(path.join(this.dbPath, "memories.lance"))) {
                console.warn("[Memory] Legacy DB detected without metadata. Assuming compatibility. If errors occur, delete data/memory-db.");
            }
        }
    }
    async saveMetadata() {
        const meta = {
            model: config.embedding.model,
            dim: this.vectorDim,
            createdAt: Date.now()
        };
        fs.writeFileSync(this.metaPath, JSON.stringify(meta, null, 2));
    }
    /**
     * @param purpose 交给服务端选限流桶。检索与索引是**两个独立额度**——
     *   一次大文件索引不该把已有知识库的检索一起打成 429
     *   （见 server/src/modules/proxy/embedding_rate_limit.ts）。
     *   服务端会用请求形状纠正谎报，所以这里只需老实标注。
     */
    /** 构造指向本地 proxy 的 OpenAI client。单条与批量共用，避免两处配置漂移。 */
    buildEmbeddingClient(purpose) {
        const llmManager = LLMManager.getInstance();
        const authToken = llmManager.getAuthToken();
        const channelId = llmManager.getChannelId();
        if (!authToken) {
            throw new Error("登录状态到期，请重启客户端并重新登录");
        }
        const port = process.env.PORT || 3000;
        return new OpenAI({
            apiKey: authToken,
            baseURL: `http://localhost:${port}/v1`,
            dangerouslyAllowBrowser: true,
            // 批量 64 条 / 服务端并发 5 ≈ 13 轮，单轮约 1s → 约 13s，60s 留足余量
            timeout: 60000,
            defaultHeaders: {
                ...(channelId ? { 'X-Channel-ID': channelId } : {}),
                'X-Embedding-Purpose': purpose,
            },
        });
    }
    /**
     * 批量取向量。一次 HTTP 拿回 N 个向量。
     *
     * 为什么必须有：服务端的批量接口早就打通了，但客户端一直逐条 `getEmbedding`
     * 加逐条 `await` —— 批量能力**没有任何调用者**。索引一篇 2000 chunk 的文档
     * 就是 2000 次串行 HTTP 往返，「20MB PDF 分钟级完成」根本达不到。
     *
     * 全成功或全失败：服务端任一条失败即整批上抛（刻意如此，静默丢一条 chunk
     * 事后极难发现）。所以这里不处理「部分成功」，调用方按整批失败处理。
     */
    async getEmbeddings(texts, purpose = 'index') {
        if (texts.length === 0)
            return [];
        const client = this.buildEmbeddingClient(purpose);
        const response = await client.embeddings.create({
            model: config.embedding.model,
            input: texts,
            encoding_format: "float",
        });
        const data = response.data;
        if (!Array.isArray(data) || data.length !== texts.length) {
            throw new Error(`Embedding API 返回条数不符: 期望 ${texts.length}，实际 ${data?.length ?? 0}`);
        }
        // ⚠️ 必须按 index 归位，不能依赖数组顺序。错位不会报错，
        // 只会让每条内容都带上别人的向量 —— 检索结果全乱且无从察觉。
        const vectors = new Array(texts.length);
        for (const item of data) {
            const i = typeof item.index === 'number' ? item.index : -1;
            if (i < 0 || i >= texts.length)
                throw new Error(`Embedding API 返回了非法 index: ${item.index}`);
            vectors[i] = item.embedding;
        }
        for (let i = 0; i < vectors.length; i++) {
            if (!Array.isArray(vectors[i]))
                throw new Error(`Embedding API 缺少 index=${i} 的向量`);
            if (vectors[i].length !== this.vectorDim) {
                console.warn(`[Warning] 向量维度不匹配! 数据库: ${this.vectorDim}, 模型返回: ${vectors[i].length}`);
            }
        }
        return vectors;
    }
    async getEmbedding(text, purpose = 'index') {
        try {
            const llmManager = LLMManager.getInstance();
            const authToken = llmManager.getAuthToken();
            const channelId = llmManager.getChannelId();
            if (!authToken) {
                throw new Error("登录状态到期，请重启客户端并重新登录");
            }
            // ALWAYS use the Local Proxy Server
            // Even if authToken is missing, we point to the proxy.
            // If the proxy requires auth, it will fail with 401, which is expected behavior until login.
            const port = process.env.PORT || 3000;
            const baseURL = `http://localhost:${port}/v1`;
            const apiKey = authToken;
            const client = this.buildEmbeddingClient(purpose);
            void baseURL;
            void apiKey; // 保留上面的日志/诊断变量，实际配置由 buildEmbeddingClient 统一给出
            // We rely on the Server to handle the actual model logic (including Volcengine adaptation)
            // The client just sends a standard OpenAI-compatible request.
            const response = await client.embeddings.create({
                model: config.embedding.model, // This model name might be ignored by Server if it overrides it
                input: text,
                encoding_format: "float",
            });
            if (!response.data || !response.data[0]) {
                throw new Error("Embedding API returned no data");
            }
            const vector = response.data[0].embedding;
            // 简单的维度检查，防止配置错误导致报错
            if (vector.length !== this.vectorDim) {
                console.warn(`[Warning] 向量维度不匹配! 数据库: ${this.vectorDim}, 模型返回: ${vector.length}。请修改 .env 或重新生成数据库。`);
            }
            return vector;
        }
        catch (e) {
            console.error("[Memory] Embedding API 调用失败:", e.message);
            // 可以在这里加重试逻辑
            throw e;
        }
    }
    /**
     * 批量入库。相比逐条 `add()` 的两个收益：
     *   - embedding 从 N 次 HTTP 降到 ceil(N/64) 次
     *   - LanceDB 从 N 次 `table.add` 降到同样次数（批量写）
     */
    async addBatch(chunks) {
        const results = new Array(chunks.length);
        // 空壳闸先过一遍：这些 chunk 不该占用 embedding 配额，也不进批次。
        const pending = [];
        chunks.forEach((c, i) => {
            if (!hasIndexableContent(c.text)) {
                results[i] = { indexed: false, vectorStored: false };
            }
            else {
                pending.push({ idx: i, chunk: c });
            }
        });
        for (let off = 0; off < pending.length; off += CLIENT_EMBED_BATCH) {
            const slice = pending.slice(off, off + CLIENT_EMBED_BATCH);
            const ids = slice.map(() => randomUUID());
            const now = Date.now();
            let vectors = null;
            let batchError;
            try {
                vectors = await this.getEmbeddings(slice.map((x) => x.chunk.text), 'index');
            }
            catch (e) {
                batchError = e?.message || String(e);
                console.warn(`[Memory] 批量向量失败（${slice.length} 条），本批降级为关键词索引: ${batchError}`);
            }
            let vectorStored = false;
            if (vectors && this.table) {
                try {
                    await this.table.add(slice.map((x, k) => ({
                        id: ids[k],
                        vector: vectors[k],
                        text: x.chunk.text,
                        source: x.chunk.source,
                        path: this.normalizePath(x.chunk.path),
                        startLine: x.chunk.startLine || 0,
                        createdAt: now,
                        userId: x.chunk.userId || "",
                    })));
                    vectorStored = true;
                }
                catch (e) {
                    batchError = e?.message || String(e);
                    console.warn(`[Memory] 批量写入 LanceDB 失败: ${batchError}`);
                }
            }
            else if (!this.table) {
                batchError = batchError ?? 'vector store unavailable';
            }
            // MiniSearch 与 metaStore 逐条维护（与 add() 同语义）：向量没落盘时本次会话内
            // 仍可关键词检索到，但 vectorStored=false 会让 syncFile 不提交同步状态、
            // 下次自动重试（见 sync_failure.smoke.ts 锁的那三条不变量）。
            slice.forEach((x, k) => {
                const normalizedPath = this.normalizePath(x.chunk.path);
                this.hasData = true;
                if (isKnowledgePath(normalizedPath))
                    this.hasKnowledge = true;
                this.miniSearch.add({
                    id: ids[k],
                    text: x.chunk.text,
                    source: x.chunk.source,
                    path: normalizedPath,
                    startLine: x.chunk.startLine || 0,
                    createdAt: now,
                    userId: x.chunk.userId || "",
                });
                this.metaStore.initChunk(ids[k]);
                if (isCandidateMemoryPath(normalizedPath)) {
                    this.metaStore.setMeta(ids[k], { confidence: CANDIDATE_CONFIDENCE });
                }
                results[x.idx] = { indexed: true, id: ids[k], vectorStored, error: batchError };
            });
            console.log(`[Memory] 批量入库 ${slice.length} 条 (Vector: ${vectorStored ? 'yes' : 'no'})`);
        }
        return results;
    }
    async add(chunk) {
        // 入库总闸。放在 add() 而不是调用方，是因为 file_memory、知识库同步、
        // turn_extractor 等都会写，逐个加判断迟早漏一个。
        if (!hasIndexableContent(chunk.text)) {
            return { indexed: false, vectorStored: false };
        }
        const id = randomUUID();
        const now = Date.now();
        const normalizedPath = this.normalizePath(chunk.path);
        let vectorStored = false;
        let vectorError;
        if (this.table) {
            try {
                const vector = await this.getEmbedding(chunk.text);
                const record = {
                    id: id,
                    vector: vector,
                    text: chunk.text,
                    source: chunk.source,
                    path: normalizedPath,
                    startLine: chunk.startLine || 0,
                    createdAt: now,
                    userId: chunk.userId || ""
                };
                await this.table.add([record]);
                vectorStored = true;
            }
            catch (e) {
                vectorError = e?.message || String(e);
                // 这里仍然会继续写 MiniSearch —— 本次会话内内容至少还能被关键词检索到。
                // 但**重启后就没了**（MiniSearch 只从 LanceDB 重建），所以必须把失败
                // 通过返回值告诉调用方，让它不要提交「已同步」状态、下次启动重试。
                console.warn(`[Memory] 向量写入失败，本次会话降级为关键词索引: ${vectorError}`);
            }
        }
        else {
            vectorError = 'vector store unavailable';
        }
        this.hasData = true;
        if (isKnowledgePath(normalizedPath)) {
            this.hasKnowledge = true;
        }
        // 2. Add to MiniSearch
        this.miniSearch.add({
            id: id,
            text: chunk.text,
            source: chunk.source,
            path: normalizedPath,
            startLine: chunk.startLine || 0,
            createdAt: now,
            userId: chunk.userId || ""
        });
        this.metaStore.initChunk(id);
        // Candidate memories must never be injectable-by-default: set the
        // sub-gate confidence in the same tick as indexing (a later downgrade
        // would leave a race window where the chunk is searchable at 0.6).
        if (isCandidateMemoryPath(normalizedPath)) {
            this.metaStore.setMeta(id, { confidence: CANDIDATE_CONFIDENCE });
        }
        console.log(`[Memory] 已存储: "${chunk.text.slice(0, 15)}..." (来源: ${chunk.source}, User: ${chunk.userId || 'Global'}, Vector: ${vectorStored ? 'yes' : 'no'})`);
        return { indexed: true, id, vectorStored, error: vectorError };
    }
    async deleteByPath(path) {
        const normalizedPath = this.normalizePath(path);
        // 1. Delete from LanceDB
        if (this.table) {
            try {
                await this.table.delete(`path = '${normalizedPath}'`);
            }
            catch (e) {
                // console.warn(`[Memory] LanceDB 清除旧记忆失败 (可能不存在): ${e}`);
            }
        }
        // 2. Delete from MiniSearch
        try {
            // Fix: Use wildcard search with filter to find exact path matches
            // Direct search(path) is unreliable due to tokenization
            const results = this.miniSearch.search(MiniSearch.wildcard, {
                filter: (result) => this.normalizePath(result.path) === normalizedPath
            });
            const idsToDelete = results.map(r => r.id);
            if (idsToDelete.length > 0) {
                this.miniSearch.removeAll(idsToDelete.map(id => ({ id })));
                this.metaStore.deleteMany(idsToDelete);
            }
        }
        catch (e) {
            console.warn(`[Memory] MiniSearch 清除旧记忆失败: ${e}`);
        }
        // console.log(`[Memory] 已清除旧记忆索引: ${path}`);
    }
    async hasPath(path) {
        const normalizedPath = this.normalizePath(path);
        if (!this.table)
            return false;
        try {
            const result = await this.table.query()
                .filter(`path = '${normalizedPath}'`)
                .limit(1)
                .toArray();
            return result.length > 0;
        }
        catch (e) {
            return false;
        }
    }
    async getChunksByPath(path) {
        const normalizedPath = this.normalizePath(path);
        if (!this.table)
            return [];
        try {
            const results = await this.table.query()
                .filter(`path = '${normalizedPath}'`)
                .limit(10000) // Reasonable limit for a single file
                .toArray();
            return results.map((r) => ({ id: r.id, text: r.text, userId: r.userId }));
        }
        catch (e) {
            console.warn(`[Memory] Failed to get chunks for path ${path}:`, e);
            return [];
        }
    }
    /**
     * 按命名空间前缀清除该知识库下的**所有** chunk（删文档时用）。
     * prefix 形如 `knowledge/<docId>`；逐段过白名单后拼进 LanceDB 的 LIKE，防注入。
     * syncDirectory 只增改不删，删除必须显式走这里，否则残留陈旧 chunk 仍会被召回。
     */
    async deleteByNamespace(prefix) {
        const safe = escapeNamespacePrefix(prefix); // 非法即抛，宁可不删也不放行注入
        // 1. LanceDB
        if (this.table) {
            try {
                await this.table.delete(`path LIKE '${safe}/%'`);
            }
            catch (e) {
                console.warn(`[Memory] LanceDB 按命名空间清除失败 (${safe}): ${e}`);
            }
        }
        // 2. MiniSearch
        try {
            const results = this.miniSearch.search(MiniSearch.wildcard, {
                filter: (r) => isInNamespacePrefix(r.path, safe),
            });
            const ids = results.map(r => r.id);
            if (ids.length > 0) {
                this.miniSearch.removeAll(ids.map(id => ({ id })));
                this.metaStore.deleteMany(ids);
            }
        }
        catch (e) {
            console.warn(`[Memory] MiniSearch 按命名空间清除失败 (${safe}): ${e}`);
        }
    }
    async deleteByIds(ids) {
        if (ids.length === 0)
            return;
        // 1. Delete from LanceDB
        if (this.table) {
            try {
                // LanceDB SQL-like filter for IN clause
                // construct: id IN ('id1', 'id2', ...)
                const idList = ids.map(id => `'${id}'`).join(", ");
                await this.table.delete(`id IN (${idList})`);
            }
            catch (e) {
                console.warn(`[Memory] LanceDB batch delete failed: ${e}`);
            }
        }
        // 2. Delete from MiniSearch
        try {
            this.miniSearch.removeAll(ids.map(id => ({ id })));
        }
        catch (e) {
            console.warn(`[Memory] MiniSearch batch delete failed: ${e}`);
        }
        this.metaStore.deleteMany(ids);
    }
    recordRetrieved(ids) {
        this.metaStore.incrementRetrieved([...new Set(ids.filter(Boolean))]);
    }
    recordInjected(ids) {
        this.metaStore.incrementInjected([...new Set(ids.filter(Boolean))]);
    }
    recordGrounded(ids) {
        this.metaStore.incrementGrounded([...new Set(ids.filter(Boolean))]);
    }
    /** @deprecated Use recordInjected; prompt injection is not answer use. */
    incrementUsed(ids) {
        this.recordInjected(ids);
    }
    getMetaStore() {
        return this.metaStore;
    }
    listAll(userId) {
        if (!this.hasData)
            return [];
        try {
            const results = this.miniSearch.search(MiniSearch.wildcard, {
                filter: userId
                    ? (result) => result.userId === userId || !result.userId
                    : undefined
            });
            return results.map((r) => ({
                id: r.id,
                text: r.text,
                source: r.source,
                path: r.path,
                startLine: r.startLine,
                createdAt: r.createdAt,
                userId: r.userId,
                meta: this.metaStore.getOrDefault(r.id)
            }));
        }
        catch {
            return [];
        }
    }
    listAlwaysRecall(userId) {
        // listAll() is a full wildcard scan that materialises every chunk in the
        // index (knowledge bases included). Pinning is rare, so skip the scan
        // entirely when nothing is pinned — this runs on every single turn.
        if (this.metaStore.countByRecallPolicy('always') === 0)
            return [];
        return this.listAll(userId).filter((chunk) => chunk.meta.recallPolicy === 'always'
            && !isKnowledgePath(chunk.path)
            && (!userId || chunk.userId === userId || !chunk.userId));
    }
    /**
     * One-time cleanup of chunks that carry no retrievable content.
     *
     * These are the accumulated `# Daily Log <date>.md` / `# Core Memory` shells
     * created by the old startup path. They can never help an answer, but they do
     * occupy candidate slots in a broad recall that only fetches 24 — so the real
     * memories were being crowded out before admission ever ran.
     *
     * Index entries only: the files themselves are user data and stay on disk. If
     * one later gets real content appended, the watcher indexes it normally.
     */
    async purgeContentlessChunks() {
        const MIGRATION_ID = 'purge-contentless-chunks-v1';
        if (this.metaStore.hasRunMigration(MIGRATION_ID))
            return 0;
        // An empty store is indistinguishable from a store that failed to load
        // (LanceDB unavailable → keyword-only mode → listAll() is empty). Marking
        // the migration done here would burn it permanently against nothing.
        if (!this.hasData)
            return 0;
        try {
            const stale = this.listAll()
                .filter((chunk) => chunk.id && !hasIndexableContent(chunk.text))
                .map((chunk) => chunk.id)
                .filter(Boolean);
            if (stale.length > 0) {
                await this.deleteByIds(stale);
                console.log(`[Memory] 已清理 ${stale.length} 条无内容 chunk(仅索引，源文件保留)。`);
            }
            this.metaStore.markMigrationDone(MIGRATION_ID);
            return stale.length;
        }
        catch (e) {
            // 标记只在成功后写，失败下次启动重试。
            console.warn('[Memory] 无内容 chunk 清理失败，下次启动重试:', e);
            return 0;
        }
    }
    /**
     * One-time backfill: promote existing keyed stable preferences to standing
     * context.
     *
     * Before recall policies existed every retrieved memory was injected, so an
     * identity or style rule reached the model on every turn and — bugs aside —
     * was net positive. Upgrading users to a relevance-gated tier without this
     * pass silently drops exactly those rules: "记住我的回复风格是 X" would be
     * stored, never superseded, and never applied again. Their recall policy
     * defaults to 'relevant', which for query-independent rules is the wrong
     * question to ask.
     *
     * Runs once (marker sidecar) so a later manual downgrade sticks.
     */
    async backfillStandingRecallPolicy() {
        const MIGRATION_ID = 'standing-recall-policy-v1';
        if (this.metaStore.hasRunMigration(MIGRATION_ID))
            return 0;
        // See purgeContentlessChunks: never burn the one-shot marker against a
        // store that merely failed to load.
        if (!this.hasData)
            return 0;
        let promoted = 0;
        try {
            for (const chunk of this.listAll()) {
                if (!chunk.id || isKnowledgePath(chunk.path))
                    continue;
                if ((chunk.meta.recallPolicy || 'relevant') !== 'relevant')
                    continue;
                const entryMeta = parseMemoryMeta(chunk.text);
                if (!(await isActiveStandingPreference(entryMeta)))
                    continue;
                this.metaStore.setMeta(chunk.id, { recallPolicy: 'always' });
                promoted++;
            }
            this.metaStore.flush();
            this.metaStore.markMigrationDone(MIGRATION_ID);
            if (promoted > 0) {
                console.log(`[Memory] 已将 ${promoted} 条具名长期偏好升级为常驻记忆(始终生效)。`);
            }
        }
        catch (e) {
            // Never block startup on a backfill; it retries on the next launch
            // because the marker is only written on success.
            console.warn('[Memory] 常驻记忆回填失败，下次启动重试:', e);
        }
        return promoted;
    }
    /**
     * Hybrid Search using RRF (Reciprocal Rank Fusion) + MESA confidence re-ranking
     */
    /**
     * @param filters.namespaces P3: 严格知识库命名空间。给定非空数组时，**只**返回
     *   `knowledge/<ns>/…` 下的 chunk —— 不回落到 userId 匹配，也不带 `userId=''`
     *   的全局记忆。
     *
     *   这条严格性是必须的：`userId` 过滤本身带 `OR userId = '' OR userId IS NULL`
     *   兜底（见下），而知识库与全局笔记的 userId 恰好都是空。子 agent 若沿用
     *   userId 过滤，陌生客户的一句话就能召回主人写的私人笔记。
     *
     *   未给定（或空数组）时行为与迁移前逐位一致，`main` 不受影响。
     *
     * @param filters.minRelevance L1 相关性门控（余弦相似度下限）。给定时丢弃低于阈值
     *   以及没有相似度（纯关键词命中）的 chunk。省略时不过滤，行为与迁移前一致。
     */
    async searchCandidates(query, limit = 24, filters) {
        if (!this.hasData) {
            console.log(`[Memory] Store empty, skipping search for: "${query}"`);
            return [];
        }
        if (filters?.type === 'knowledge' && !this.hasKnowledge) {
            console.log(`[Memory] Knowledge base empty, skipping search for: "${query}"`);
            return [];
        }
        const namespaces = (filters?.namespaces || []).filter(ns => typeof ns === 'string' && ns.trim());
        if (namespaces.length > 0 && !this.hasKnowledge) {
            console.log(`[Memory] Knowledge base empty, namespaces=[${namespaces.join(',')}] yields nothing.`);
            return [];
        }
        console.log(`[Memory] Hybrid Search for: "${query}" (filters: ${JSON.stringify(filters)})`);
        // 1. Vector Search (LanceDB)
        const vectorPromise = (async () => {
            if (!this.table)
                return [];
            try {
                const vector = await this.getEmbedding(query, 'query');
                let queryBuilder = this.table.search(vector);
                if (namespaces.length > 0) {
                    // 严格 namespace：只看这些**路径前缀**下的内容(全局或 agent 私有)。不带 userId 兜底。
                    const clause = namespaces
                        .map(ns => `path LIKE '${escapeNamespacePrefix(ns)}/%'`)
                        .join(" OR ");
                    queryBuilder = queryBuilder.filter(clause);
                }
                else if (filters?.type === 'knowledge') {
                    queryBuilder = queryBuilder.filter("path LIKE 'knowledge%'");
                }
                else if (filters?.userId) {
                    // 列名必须用反引号。LanceDB 的 SQL 方言把 "userId" 解析成**字符串字面量**
                    // 而不是标识符,`"userId" = 'u1'` 会被折叠成常量 false —— 整个 prefilter
                    // 恒假,向量臂对所有带 userId 的检索稳定返回 0 行(个人记忆语义召回全灭,
                    // 只剩 BM25)。这条静默失败很难发现:不抛异常、不打日志,表里 130 条数据
                    // 照样"检索成功"。改动前后可用 `userId = ''` 直接在表上验证行数差异。
                    let clause = `(\`userId\` = '${escapeSqlLiteral(filters.userId)}' OR \`userId\` = '' OR \`userId\` IS NULL)`;
                    // excludeKnowledge：主 Agent 广播检索个人记忆时排除知识库 chunk —— 知识库改由
                    // scope 命名空间严格注入(见 kernel 分流),不再靠 userId='' 兜底混入。
                    if (filters.excludeKnowledge) {
                        clause += ` AND NOT (path LIKE 'knowledge%' OR path LIKE 'agents/%/knowledge/%')`;
                    }
                    queryBuilder = queryBuilder.filter(clause);
                }
                const results = await queryBuilder.limit(limit * 2).toArray();
                return results.map((r) => ({
                    id: r.id,
                    text: r.text,
                    source: r.source,
                    path: r.path,
                    startLine: r.startLine,
                    createdAt: r.createdAt,
                    userId: r.userId,
                    relevance: distanceToCosine(r._distance)
                }));
            }
            catch (e) {
                console.warn(`[Memory] 向量检索失败，降级为关键词检索: ${e?.message || e}`);
                return [];
            }
        })();
        // 2. Keyword Search (MiniSearch)
        const keywordResults = this.miniSearch.search(query, {
            boost: { text: 2 },
            fuzzy: 0.2,
            prefix: true,
            filter: (result) => {
                if (namespaces.length > 0) {
                    return !!result.path && namespaces.some(ns => isInNamespacePrefix(result.path, ns));
                }
                if (filters?.type === 'knowledge') {
                    return result.path && (result.path.startsWith('knowledge/') || result.path.startsWith('knowledge\\'));
                }
                if (filters?.userId) {
                    // Match User ID OR Global (empty/undefined)
                    const userMatch = result.userId === filters.userId || !result.userId;
                    if (!userMatch)
                        return false;
                    // excludeKnowledge：排除知识库路径(全局 + agent 私有)，只留个人记忆
                    if (filters.excludeKnowledge && isKnowledgePath(result.path))
                        return false;
                    return true;
                }
                return true;
            }
        }).slice(0, limit * 2);
        const [vectorResults, bm25Results] = await Promise.all([vectorPromise, Promise.resolve(keywordResults)]);
        // 向量臂空转是静默故障:准入层的主信号是余弦相似度,拿不到就只剩词法证据,
        // 相关记忆会被整体判成 insufficient_query_relation。这里显式报警,避免再次
        // 出现"检索看起来正常、记忆实际全灭"却只能靠翻 trace 才发现的情况。
        if (this.table && this.hasData && vectorResults.length === 0) {
            console.warn(`[Memory] 向量臂返回 0 条(关键词 ${bm25Results.length} 条),本轮准入将只有词法证据。`
                + ` filters=${JSON.stringify(filters || {})}`);
        }
        // 3. RRF Fusion
        const k = 60; // RRF constant
        const scores = new Map();
        const docMap = new Map();
        const vectorRanks = new Map();
        const keywordRanks = new Map();
        const keywordScores = new Map();
        const maxKeywordScore = bm25Results.reduce((max, result) => Math.max(max, typeof result.score === 'number' ? result.score : 0), 0);
        // Process Vector Results
        vectorResults.forEach((doc, rank) => {
            scores.set(doc.id, (scores.get(doc.id) || 0) + 1 / (k + rank + 1));
            docMap.set(doc.id, doc);
            vectorRanks.set(doc.id, rank);
        });
        // Process Keyword Results
        bm25Results.forEach((doc, rank) => {
            scores.set(doc.id, (scores.get(doc.id) || 0) + 1 / (k + rank + 1));
            keywordRanks.set(doc.id, rank);
            if (typeof doc.score === 'number')
                keywordScores.set(doc.id, doc.score);
            if (!docMap.has(doc.id)) {
                docMap.set(doc.id, {
                    id: doc.id,
                    text: doc.text,
                    source: doc.source,
                    path: doc.path,
                    startLine: doc.startLine,
                    createdAt: doc.createdAt,
                    userId: doc.userId,
                });
            }
        });
        // RRF-dominant ordering with bounded quality/grounding tie-breakers.
        const ranked = Array.from(scores.entries())
            .map(([id, rrfScore]) => ({
            chunk: docMap.get(id),
            rrfScore,
            rankScore: this.metaStore.computeRankScore(id, rrfScore)
        }))
            .sort((a, b) => b.rankScore - a.rankScore)
            .slice(0, limit);
        // RRF is a candidate-ordering signal, not proof of query relevance. Keep
        // the retrieval evidence here and let the independent admission layer make
        // the prompt-injection decision.
        const fusedResults = ranked.map(({ chunk, rrfScore, rankScore }) => ({
            ...chunk,
            meta: this.metaStore.getOrDefault(chunk.id),
            recall: {
                vectorRank: vectorRanks.get(chunk.id),
                vectorRelevance: chunk.relevance,
                keywordRank: keywordRanks.get(chunk.id),
                keywordScore: keywordScores.get(chunk.id),
                keywordRelativeScore: maxKeywordScore > 0
                    ? (keywordScores.get(chunk.id) || 0) / maxKeywordScore
                    : undefined,
                rrfScore,
                candidateRankScore: rankScore,
                lexical: analyzeLexicalEvidence(query, chunk.text, chunk.path),
            },
        }));
        console.log(`[Memory] Candidate Search fused ${vectorResults.length} vector + ${bm25Results.length} keyword results -> ${fusedResults.length} candidates`);
        return fusedResults;
    }
    /**
     * Compatibility API for explicit callers. Automatic prompt injection must
     * call searchCandidates() followed by the independent admission layer.
     */
    async search(query, limit = 5, filters) {
        let candidates = await this.searchCandidates(query, Math.max(limit * 2, limit), filters);
        const minRelevance = filters?.minRelevance;
        if (typeof minRelevance === 'number') {
            candidates = candidates.filter((candidate) => typeof candidate.recall.vectorRelevance === 'number'
                && candidate.recall.vectorRelevance >= minRelevance);
        }
        const returned = candidates.slice(0, limit);
        this.recordRetrieved(returned.map((candidate) => candidate.id).filter((id) => !!id));
        return returned;
    }
}
