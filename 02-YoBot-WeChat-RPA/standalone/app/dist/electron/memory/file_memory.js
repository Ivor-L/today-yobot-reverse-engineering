import * as fs from "fs/promises";
import * as path from "path";
import { watch } from "chokidar";
import { config } from "../config/index.js";
import * as crypto from "crypto";
import { getKbEntitlement } from "../knowledge/limits.js";
import { KbQuotaLedger, checkDailyIncrement, checkFileSize, checkTotalCapacity, measureKnowledgeBytes } from "../knowledge/quota.js";
/**
 * 知识库文档里存放**上传原件**的子目录名。
 *
 * 摄取时会把原始 pdf/docx/xlsx 存进 `knowledge/<docId>/raw/`，规范化后的 markdown
 * 才是被索引的那份（`knowledge/<docId>/doc.md`）。保留原件的目的是：换切块策略
 * 或换解析器时可以从原件重跑，不必让用户重新上传（「文件即真相」）。
 */
export const KB_RAW_SUBDIR = 'raw';
/**
 * 该路径是否落在「上传原件」目录里 —— 这些文件**绝不能进索引**。
 *
 * ⚠️ 必须显式排除，因为 getAllFiles 是递归的、isIndexable 只看后缀：
 * 用户传一个 .txt 时原件会落成 `knowledge/<docId>/raw/xxx.txt`，
 * 不排除的话同一份内容会被索引两遍 —— 检索时重复命中、白占候选位、
 * 白烧一倍 embedding，而且**不会报任何错**，只能靠肉眼看检索结果才发现。
 */
export function isKbRawPath(relativePath) {
    const p = relativePath.replace(/\\/g, '/');
    return new RegExp(`(^|/)${KB_RAW_SUBDIR}/`).test(p)
        && (p.startsWith('knowledge/') || /^agents\/[^/]+\/knowledge\//.test(p));
}
/**
 * 该路径是否属于**知识库文档**（而非个人记忆）。
 *
 * ⚠️ 这个判定存在的唯一目的：**把切块策略的变更限制在知识库范围内。**
 *
 * 为什么这条边界是硬约束 —— 三件事叠起来：
 *   1. `MemoryMetadataStore` 的元数据是**按 chunk id** 存的（`setMeta(id, …)`）；
 *   2. `syncFile` 的增量同步**只在文本 hash 相同时**保留 chunk id；
 *   3. `splitMarkdown` 覆盖的不只是知识库 —— `isUserMemoryFile` 只匹配
 *      `memory/users/<id>/`，所以 `MEMORY.md` 和 `memory/*.md`（每日日志）
 *      也走 `splitMarkdown`。
 *
 * 于是「改切块」= 文本变 = hash 变 = 删旧建新 =
 * **几个月积累的 confidence / hitCount / usedCount / grounding 全部孤儿化**，
 * 外加老用户升级后首次启动的一次全量重嵌入。
 * （`splitFn` 那里的注释也写着 per-entry 切分的目的正是 preserve chunk IDs
 *   and their metadata —— 这个代价是前人刻意规避过的。）
 *
 * 所以任何新切块器只能走这个判定为 true 的路径；记忆文件继续用原有切分。
 */
/**
 * 单文件同步结果。
 *
 * `ok: false` 的语义是「本次没有完整落盘，状态未提交，会自动重试」——
 * 不是「文件坏了」。调用方据此向用户提示，并且**不要**把它当成致命错误中断整轮同步。
 */
/** 守卫跳过（不是失败，也没有需要重试的东西）。 */
const SKIPPED = { ok: true, failedChunks: 0, addedChunks: 0 };
/**
 * 被配额闸拦下。
 *
 * **不能复用 SKIPPED。** 两者对调用方的含义完全相反：
 *   - SKIPPED = 这个文件本来就不该索引（entities.md、非知识库路径），没人需要知道
 *   - BLOCKED = 用户的内容**没进索引**，而且不会自动好转（除非他清理容量或升级）
 *
 * 曾经两者都返回 `{ ok: true }`，于是 syncDirectory 把超限文件计进 `synced`、
 * `failed` 为空 —— 任务报「成功」，UI 显示导入完成，文档却搜不到。
 * Agent 直接往 workspace/knowledge/ 写超限文件时更彻底：用户**全程零提示**。
 */
const blockedResult = (reason) => ({ ok: true, failedChunks: 0, addedChunks: 0, blocked: reason });
export function isKnowledgeDocPath(relativePath) {
    const p = relativePath.replace(/\\/g, '/');
    return p.startsWith('knowledge/') || /^agents\/[^/]+\/knowledge\//.test(p);
}
export class FileMemoryManager {
    static instance;
    memoryStore;
    workspaceDir;
    watcher = null;
    stateFile;
    state = {};
    purgedPaths = new Set();
    /**
     * 同路径同步的单飞闸。
     *
     * 上传路径必然产生两次触发：主进程写完文件后立刻显式 reindex，chokidar 又在
     * `awaitWriteFinish` 的 2 秒后补一次 'add'。两次若并发跑，它们读到的是**同一份
     * 旧 state**，于是都把全部 chunk 当成新增、各自生成一套 UUID 写进向量库：
     *   - embedding 成本翻倍
     *   - 同一段内容被召回两次
     *   - 先写的那套 UUID 不在 state 里，**再也删不掉**（永久孤儿）
     *
     * 所以同一路径必须串行。串行而非「合并成一次」是因为第二次触发可能带来更新的
     * 内容 —— 排队重跑会重新读盘、重新算 hash；内容没变时 chunksToAdd 为空，
     * 重跑几乎零成本。队列深度压到 1：连续 N 次事件只需「当前这轮 + 收尾一轮」。
     */
    syncInFlight = new Map();
    syncQueued = new Map();
    constructor(memoryStore) {
        this.memoryStore = memoryStore;
        this.workspaceDir = config.workspaceDir;
        this.stateFile = path.join(process.env.USER_DATA_PATH || process.cwd(), "data", "file_memory_state.json");
        FileMemoryManager.instance = this;
    }
    static getInstance() {
        if (!FileMemoryManager.instance) {
            throw new Error("FileMemoryManager not initialized");
        }
        return FileMemoryManager.instance;
    }
    getStore() {
        return this.memoryStore;
    }
    async init() {
        // Ensure workspace and memory/knowledge directory exist
        const memoryDir = path.join(this.workspaceDir, "memory");
        const knowledgeDir = path.join(this.workspaceDir, "knowledge");
        await fs.mkdir(memoryDir, { recursive: true });
        await fs.mkdir(knowledgeDir, { recursive: true });
        // Load state
        await this.loadState();
        // DEFERRED: Do NOT sync immediately on init.
        // Wait for explicit syncAll() call after Auth Token is set.
        // This prevents 401 errors during startup before user login.
        console.log("[FileMemory] Initialized. Waiting for Auth Token to start sync...");
        // Start Watching
        const watchPaths = [
            path.join(this.workspaceDir, "knowledge"),
            // §13.1: agent 私有知识库 agents/<name>/knowledge/。AGENT.md 由 syncFile 守卫排除。
            path.join(this.workspaceDir, "agents"),
            path.join(this.workspaceDir, "memory"),
            path.join(this.workspaceDir, "MEMORY.md")
        ];
        this.startWatching(watchPaths);
    }
    async syncAll() {
        console.log("[FileMemory] Starting full sync...");
        // Sync Global Memory（不存在则跳过，不再代建）
        await this.syncFile("MEMORY.md");
        // 这里原本有一句「ensure today's memory exists」，它是空壳 chunk 的来源：
        // 启动即建文件、建完即入库，而当天大概率什么都没写。今天的日志文件由
        // memory_append 在真正写入时创建，启动阶段不需要预先存在。
        // Sync Knowledge Base（全局共享）
        await this.syncDirectory("knowledge");
        // §13.1: agent 私有知识库。syncDirectory 会遍历 agents/ 下所有 .md，
        // syncFile 的守卫只放行 agents/<name>/knowledge/ 下的文件，AGENT.md 被排除。
        await this.syncDirectory("agents");
        // Sync User Memories
        await this.syncDirectory("memory/users");
        // Both run after indexing so every chunk (and its embedded entry meta) exists.
        await this.memoryStore.purgeContentlessChunks();
        await this.memoryStore.backfillStandingRecallPolicy();
    }
    /**
     * 索引入口的知识库配额校验。
     *
     * 只查两道与「单个文件」有关的闸：单文件大小、总容量。
     * 日增量与并发不在这里查 —— 它们是**上传动作**的闸门（在 IPC 层按批次判定），
     * 而 syncFile 也会被启动全量同步和 watcher 触发，在那里扣日增量会把
     * 「重启客户端」算成一次新增，用户的额度会被凭空吃掉。
     *
     * 已入库文档不受影响：这里只拦「即将写入索引」的内容，
     * 与设计稿 §2 的铁律一致（超额只影响写，不影响读）。
     */
    async checkKnowledgeQuota(relativePath, absPath) {
        try {
            const { limits } = await getKbEntitlement();
            const size = await fs.stat(absPath).then((st) => st.size).catch(() => 0);
            const sizeGate = checkFileSize(size, limits);
            if (!sizeGate.allowed)
                return sizeGate;
            // 总容量按「已入库的其它文档」算：当前这份还没算进去，所以要减掉它自己
            // （文件已经落盘了，measureKnowledgeBytes 会把它数进来），否则一份接近
            // 上限的文档每次重启都会被判超限。
            // 传 workspace 根：measureKnowledgeBytes 会同时统计全局 knowledge/ 与
            // 所有 agents/<name>/knowledge/，口径与 isKnowledgeDocPath 一致。
            const currentTotal = await measureKnowledgeBytes(this.workspaceDir);
            const others = Math.max(0, currentTotal - size);
            return checkTotalCapacity(others, size, limits);
        }
        catch (e) {
            // 配额读取本身失败绝不能拦住索引 —— 那会让一次 Bundle 读盘抖动
            // 变成「知识库整体不可用」。放行并留痕。
            console.warn('[FileMemory] 配额校验异常，本次放行:', e?.message || e);
            return { allowed: true };
        }
    }
    /** 日增量闸。账本与 Electron 上传 IPC 共用同一个文件（见 kbLedgerPath）。 */
    async checkDailyQuota(addBytes) {
        try {
            const { limits } = await getKbEntitlement();
            const today = await new KbQuotaLedger().todayBytes();
            return checkDailyIncrement(today, addBytes, limits);
        }
        catch (e) {
            // 与 checkKnowledgeQuota 同口径：配额读取本身失败时放行并留痕，
            // 不能让一次读盘抖动把知识库整体拦下。
            console.warn('[FileMemory] 日增量校验异常，本次放行:', e?.message || e);
            return { allowed: true };
        }
    }
    async loadState() {
        try {
            const content = await fs.readFile(this.stateFile, "utf-8");
            const parsed = JSON.parse(content);
            this.state = {};
            for (const [key, value] of Object.entries(parsed)) {
                this.state[this.normalizeRelativePath(key)] = value;
            }
        }
        catch {
            this.state = {};
        }
    }
    async saveState() {
        try {
            await fs.mkdir(path.dirname(this.stateFile), { recursive: true });
            await fs.writeFile(this.stateFile, JSON.stringify(this.state, null, 2));
        }
        catch (e) {
            console.error(`[FileMemory] Failed to save state:`, e);
        }
    }
    calculateHash(content) {
        return crypto.createHash('md5').update(content).digest('hex');
    }
    normalizeRelativePath(relativePath) {
        return relativePath.replace(/\\/g, "/");
    }
    // 可索引的知识/记忆文件后缀。历来只吃 .md;本地知识库上传放开到 .txt(同为 UTF-8 纯文本,
    // syncFile 一律按 utf-8 读 + markdown 切块,.txt 走同一条路无需特殊处理)。
    isIndexable(filePath) {
        return filePath.endsWith(".md") || filePath.endsWith(".txt");
    }
    startWatching(paths) {
        if (this.watcher) {
            this.watcher.close();
        }
        console.log('[FileMemory] Starting memory watch');
        this.watcher = watch(paths, {
            ignored: /(^|[\/\\])\../, // ignore dotfiles
            persistent: true,
            ignoreInitial: true, // We already synced in init()
            awaitWriteFinish: {
                stabilityThreshold: 2000,
                pollInterval: 100
            }
        });
        this.watcher
            .on('add', (filePath) => {
            console.log(`[FileMemory] File added: ${filePath}`);
            this.handleFileChange(filePath);
        })
            .on('change', (filePath) => {
            console.log(`[FileMemory] File changed: ${filePath}`);
            this.handleFileChange(filePath);
        })
            .on('unlink', (filePath) => {
            console.log(`[FileMemory] File removed: ${filePath}`);
            this.handleFileRemoval(filePath);
        });
    }
    async handleFileChange(filePath) {
        if (!this.isIndexable(filePath))
            return;
        const relativePath = this.normalizeRelativePath(path.relative(this.workspaceDir, filePath));
        await this.syncFile(relativePath);
    }
    async handleFileRemoval(filePath) {
        if (!this.isIndexable(filePath))
            return;
        const relativePath = this.normalizeRelativePath(path.relative(this.workspaceDir, filePath));
        // Clean up state
        if (this.state[relativePath]) {
            delete this.state[relativePath];
            await this.saveState();
        }
        await this.memoryStore.deleteByPath(relativePath);
    }
    /**
     * 目录同步。汇总每个文件的结果 —— 单个文件失败**不中断**其余文件，
     * 但要把失败清单交给调用方，否则用户会以为全都索引好了。
     */
    async syncDirectory(dirName) {
        const dirPath = path.join(this.workspaceDir, dirName);
        const failed = [];
        const blocked = [];
        let synced = 0;
        try {
            const files = await this.getAllFiles(dirPath);
            for (const file of files) {
                if (this.isIndexable(file)) {
                    const relativePath = this.normalizeRelativePath(path.relative(this.workspaceDir, file));
                    const r = await this.syncFile(relativePath);
                    // 顺序要紧：blocked 先判。它的 ok 也是 true（不是故障），
                    // 先判 ok 会把「内容没进索引」的文件计进 synced，正是本条要修的 bug。
                    if (r.blocked)
                        blocked.push({ path: relativePath, reason: r.blocked });
                    else if (r.ok)
                        synced++;
                    else
                        failed.push({ path: relativePath, failedChunks: r.failedChunks, error: r.error });
                }
            }
        }
        catch (e) {
            console.warn(`[FileMemory] Failed to sync directory ${dirName}:`, e);
            return { ok: false, synced, failed, blocked, error: e instanceof Error ? e.message : String(e) };
        }
        // blocked 不进 ok 的判定：整轮同步本身没出故障，只是有文件被配额挡了。
        // 但清单必须交给调用方，由它决定怎么告诉用户。
        return { ok: failed.length === 0, synced, failed, blocked };
    }
    async getAllFiles(dirPath) {
        let results = [];
        try {
            const list = await fs.readdir(dirPath);
            for (const file of list) {
                const filePath = path.join(dirPath, file);
                const stat = await fs.stat(filePath);
                if (stat && stat.isDirectory()) {
                    results = results.concat(await this.getAllFiles(filePath));
                }
                else {
                    results.push(filePath);
                }
            }
        }
        catch (e) {
            // Ignore if directory doesn't exist
        }
        return results;
    }
    /**
     * Reads a markdown file, splits it into chunks, and updates the vector store.
     */
    async syncFile(relativePath) {
        const key = this.normalizeRelativePath(relativePath);
        const running = this.syncInFlight.get(key);
        if (!running)
            return this.startSync(key);
        // 已经有一轮在跑：最多再排一轮，多余的调用都并到那一轮上。
        const queued = this.syncQueued.get(key);
        if (queued)
            return queued;
        const follow = (async () => {
            // 前一轮失败与否都不影响这一轮：它会重新读盘、重新判断。
            try {
                await running;
            }
            catch { /* 忽略 */ }
            const next = this.startSync(key);
            // 必须**先起新一轮再摘牌**：反过来的话，两者之间到达的调用会看到
            // 「既无 inFlight 也无 queued」，于是自己又起一轮，单飞就漏了。
            this.syncQueued.delete(key);
            return next;
        })();
        this.syncQueued.set(key, follow);
        return follow;
    }
    /**
     * 起一轮同步并登记到 inFlight。
     *
     * `syncFileExclusive` 是 async，调用它至少要让出一次微任务才可能走到 finally，
     * 所以下面这行 `set` 一定先于 `delete` 执行 —— 不存在「登记前就被摘牌」。
     */
    startSync(key) {
        const p = (async () => {
            try {
                return await this.syncFileExclusive(key);
            }
            finally {
                this.syncInFlight.delete(key);
            }
        })();
        this.syncInFlight.set(key, p);
        return p;
    }
    /** 真正的同步实现。**只能由 startSync 调用** —— 直接调会绕过单飞闸。 */
    async syncFileExclusive(relativePath) {
        const normalizedRelativePath = this.normalizeRelativePath(relativePath);
        /**
         * 本轮待记入日增量的字节数（全部 chunk 成功后才落账）。
         *
         * **必须是局部变量。** 曾经是实例字段，于是并发同步不同文件时后一个会覆盖前一个：
         * A 设成 100KB、B 覆盖成 5KB、A 提交时记了 B 的数 —— 日增量账本长期少记。
         * 单飞闸只保证「同一路径」串行，不同路径本来就是并发的。
         */
        let pendingDailyBytes = 0;
        const filePath = path.join(this.workspaceDir, normalizedRelativePath);
        // entities.md is a structured profile file — not indexed for RAG retrieval.
        // Also purge chunks indexed before this exclusion existed: stale profile
        // chunks were still being retrieved and injected (seen in 2026-07-02 traces).
        // Once per process is enough — deleteByPath does a full MiniSearch scan and
        // this fires on every watcher event for the file.
        if (normalizedRelativePath.endsWith('/entities.md') || normalizedRelativePath === 'entities.md') {
            if (!this.purgedPaths.has(normalizedRelativePath)) {
                this.purgedPaths.add(normalizedRelativePath);
                try {
                    await this.memoryStore.deleteByPath(normalizedRelativePath);
                }
                catch { /* best-effort cleanup */ }
            }
            return SKIPPED;
        }
        // 上传原件目录（knowledge/<docId>/raw/）绝不进索引：被索引的是规范化后的
        // doc.md，原件只用于日后重跑解析/切块。不排除的话同一份内容会被索引两遍
        // （见 isKbRawPath 的注释）。
        //
        // 直接 return 而不 purge：这条守卫与 raw/ 目录同版本引入，历史上不存在
        // 已被索引的 raw/ 文件，没有需要清理的东西。
        if (isKbRawPath(normalizedRelativePath)) {
            return SKIPPED;
        }
        // 配额校验下沉到**索引入口**。
        //
        // 为什么不能只在 IPC 层（electron/main.ts 的 knowledge:* ）拦：Agent 的文件工具
        // 可以直接往 workspace/knowledge/ 写文件，chokidar 一样会触发同步 —— IPC 那层
        // 配额是绕得过去的。索引入口是本进程内所有写入路径的唯一汇合点。
        //
        // 只对**知识库文档**生效：记忆文件（MEMORY.md / memory/**）不受知识库配额约束，
        // 它们是产品自己写的，不是用户灌进来的。
        if (isKnowledgeDocPath(normalizedRelativePath)) {
            const gate = await this.checkKnowledgeQuota(normalizedRelativePath, filePath);
            if (!gate.allowed) {
                // 只警告不抛：抛出去会让 syncAll / watcher 整个中断，把一份超限文档
                // 变成"整个知识库都不同步"。跳过这一个文件、其余照常，才是正确的降级。
                // 但**必须回报 blocked** —— 静默跳过会让用户以为导入成功了。
                console.warn(`[FileMemory] 知识库配额拦截，跳过索引 ${normalizedRelativePath}：${gate.reason}`);
                return blockedResult(gate.reason || '超出知识库配额');
            }
        }
        // §13.1: agents/ 下**只索引 agents/<name>/knowledge/** 的知识库文件。
        // AGENT.md 是子 agent 的 system prompt(人设/指令),绝不能进 RAG —— 否则客户
        // 的一句无关问题可能把"你是客服，不要输出 markdown"这类指令片段召回进上下文。
        // 直接 return(不 purge):这些文件从未被索引，无需清理。
        if (normalizedRelativePath.startsWith('agents/') &&
            !/^agents\/[^/]+\/knowledge\//.test(normalizedRelativePath)) {
            return SKIPPED;
        }
        // Skill notes (memory/skills/<id>/notes.md) are operational memory recalled
        // deterministically at skill dispatch (skill_notes.ts) — never via RAG, so
        // an unrelated query can't mis-hit a lesson. Keep them out of the index.
        if (normalizedRelativePath.startsWith('memory/skills/')) {
            if (!this.purgedPaths.has(normalizedRelativePath)) {
                this.purgedPaths.add(normalizedRelativePath);
                try {
                    await this.memoryStore.deleteByPath(normalizedRelativePath);
                }
                catch { /* best-effort cleanup */ }
            }
            return SKIPPED;
        }
        try {
            // Check if file exists
            try {
                await fs.access(filePath);
            }
            catch {
                // 不存在就不同步，绝不在这里造文件。
                //
                // 原先这里会写一个只有标题的 `# Daily Log <date>.md`，而 syncAll 每次启动
                // 都会为"今天"调一次 —— 于是每开一天客户端就往索引里永久塞一条没有任何内容
                // 的 chunk。四个月攒下来，本地索引 130 条里有 118 条是这种空壳。
                //
                // 文件该在**写入时**创建，不是启动时：memory_append 已经 ensureFile，
                // 是那条路径唯一需要文件存在的地方。
                return SKIPPED;
            }
            const content = await fs.readFile(filePath, "utf-8");
            if (!content.trim())
                return SKIPPED;
            // Incremental Sync Check
            const currentHash = this.calculateHash(content);
            const lastState = this.state[normalizedRelativePath];
            const userIdMatch = normalizedRelativePath.match(/memory\/users\/([^/]+)\//);
            const userId = userIdMatch ? userIdMatch[1] : undefined;
            const isUserMemoryFile = Boolean(userId);
            // Check if file exists in Vector Store
            // This handles cases where state says "synced" but DB was cleared/corrupted
            const existsInStore = await this.memoryStore.hasPath(normalizedRelativePath);
            if (!isUserMemoryFile && lastState && lastState.hash === currentHash && existsInStore) {
                // console.log(`[FileMemory] Skipping unchanged file: ${relativePath}`);
                return SKIPPED;
            }
            console.log(`[FileMemory] Syncing file: ${normalizedRelativePath} (HashMatch: ${lastState?.hash === currentHash}, InStore: ${existsInStore})`);
            // DO NOT DELETE old vectors immediately.
            // Use Incremental Sync to save tokens.
            // 1. Get existing chunks from DB
            const existingChunks = await this.memoryStore.getChunksByPath(normalizedRelativePath);
            const existingMap = new Map(); // hash(text) -> id
            const existingIds = existingChunks.map(chunk => chunk.id);
            const shouldReindexUserFile = isUserMemoryFile && existingChunks.some(chunk => (chunk.userId || "") !== userId);
            // User memory files use per-entry splitting so appending a new entry
            // preserves existing chunk IDs (and their retrieval/injection/grounding metadata).
            const splitFn = isUserMemoryFile
                ? (c) => this.splitMemoryEntries(c)
                : (c) => this.splitMarkdown(c);
            for (const chunk of existingChunks) {
                existingMap.set(this.calculateHash(chunk.text), chunk.id);
            }
            if (shouldReindexUserFile) {
                const chunks = splitFn(content);
                const rs = await this.memoryStore.addBatch(chunks
                    .filter((c) => c.text.trim())
                    .map((c) => ({
                    text: c.text,
                    source: "file",
                    path: normalizedRelativePath,
                    startLine: c.startLine,
                    userId: userId,
                })));
                const failed = rs.filter((r) => r.indexed && !r.vectorStored).length;
                // 有向量没落盘 → 既不删旧 chunk、也不提交状态（理由见下方主分支的长注释）
                if (failed > 0) {
                    console.warn(`[FileMemory] ${normalizedRelativePath}: ${failed} 个 chunk 向量未落盘，保留旧索引并等待重试`);
                    return { ok: false, failedChunks: failed, addedChunks: chunks.length - failed };
                }
                if (existingIds.length > 0) {
                    await this.memoryStore.deleteByIds(existingIds);
                }
                this.state[normalizedRelativePath] = {
                    hash: currentHash,
                    lastModified: Date.now()
                };
                await this.saveState();
                return { ok: true, failedChunks: 0, addedChunks: chunks.length };
            }
            // 2. Split new content into chunks
            const newChunks = splitFn(content);
            const chunksToAdd = [];
            const idsToDelete = [];
            // 3. Identify new vs old
            for (const chunk of newChunks) {
                const chunkHash = this.calculateHash(chunk.text);
                if (existingMap.has(chunkHash)) {
                    // Exists, keep it (remove from map so we know what's left is stale)
                    existingMap.delete(chunkHash);
                }
                else {
                    // New chunk
                    chunksToAdd.push(chunk);
                }
            }
            // 4. Identify stale chunks (remaining in map)
            for (const id of existingMap.values()) {
                idsToDelete.push(id);
            }
            console.log(`[FileMemory] Incremental Sync for ${normalizedRelativePath}: +${chunksToAdd.length} / -${idsToDelete.length} (Unchanged: ${newChunks.length - chunksToAdd.length})`);
            // 日增量闸收口到索引入口。
            //
            // 关键在于**按真正新增的 chunk 字节计**，而不是按整个文件大小：
            // syncFile 也会被启动全量同步和 watcher 触发，按文件大小计的话
            // 「重启客户端」会被算成一次新增，用户额度被凭空吃掉。
            // chunksToAdd 只含内容真的变了的部分 —— 重扫未变文件时它是空的，增量为 0。
            //
            // 只对知识库路径生效（记忆文件不受知识库配额约束），且放在 add 之前：
            // 超限时一条都不写，避免「写了一半算不算数」的模糊状态。
            if (isKnowledgeDocPath(normalizedRelativePath) && chunksToAdd.length > 0) {
                const addBytes = chunksToAdd.reduce((n, c) => n + Buffer.byteLength(c.text, 'utf-8'), 0);
                const daily = await this.checkDailyQuota(addBytes);
                if (!daily.allowed) {
                    // 归 blocked 而不是 ok:false：ok:false 的语义是「本次没落盘，会自动重试」，
                    // 而日增量用尽要等到明天，重试多少次都一样。混在 failed 里会让 UI
                    // 提示「稍后自动重试」——那是骗人的。
                    console.warn(`[FileMemory] 日增量闸拦截，跳过索引 ${normalizedRelativePath}：${daily.reason}`);
                    return blockedResult(daily.reason || '已达今日新增上限');
                }
                pendingDailyBytes = addBytes; // 全部成功后才真正记账
            }
            // 5. Execute Updates
            // Add first, then delete stale chunks.
            // This avoids data loss when embedding/indexing fails during add.
            // 批量入库：一次 HTTP 拿回最多 64 个向量 + 一次 LanceDB 批量写。
            // 旧实现逐条 await，2000 chunk 的文档就是 2000 次串行往返 ——
            // 服务端的批量接口早就打通了，但一直没有调用者。
            const results = await this.memoryStore.addBatch(chunksToAdd
                .filter((c) => c.text.trim())
                .map((c) => ({
                text: c.text,
                source: "file",
                path: normalizedRelativePath,
                startLine: c.startLine,
                userId: userId,
            })));
            // indexed=false 是空壳闸的正常跳过，不算失败；
            // indexed 但 vectorStored=false 才是「只进了内存、重启即失」。
            const failedChunks = results.filter((r) => r.indexed && !r.vectorStored).length;
            // ⚠️ 任一 chunk 的向量没落盘 → **既不删旧 chunk，也不提交同步状态**。
            //
            // 为什么这两件事必须一起跳过：
            //   不提交状态 → 下次 syncAll/watcher 会重新处理该文件，失败的 chunk 得到重试。
            //     （旧行为是无条件提交，于是重启后 MiniSearch 只从 LanceDB 重建，
            //       失败的 chunk 两边都没有，而状态说「已同步」→ 内容永久不可检索、零报错。）
            //   不删旧 chunk → 新内容还没索引成功时，用户至少还能检索到**旧版本**，
            //     而不是新旧都搜不到。符合「读永远不受影响」。
            //
            // 重试时会自然收敛：已成功的 chunk 文本 hash 不变会被保留，失败的重新 add，
            // 旧的仍留在 existingMap 里，等全部成功那一次才被删。
            if (failedChunks > 0) {
                console.warn(`[FileMemory] ${normalizedRelativePath}: ${failedChunks}/${chunksToAdd.length} 个 chunk 向量未落盘，` +
                    `保留旧索引、不提交同步状态，下次启动或文件变更时自动重试`);
                return { ok: false, failedChunks, addedChunks: chunksToAdd.length - failedChunks };
            }
            if (idsToDelete.length > 0) {
                await this.memoryStore.deleteByIds(idsToDelete);
            }
            // Update state
            this.state[normalizedRelativePath] = {
                hash: currentHash,
                lastModified: Date.now()
            };
            await this.saveState();
            // 记账放在**全部成功之后**：失败路径上面已经提前 return，
            // 所以不会出现「向量没落盘却扣了日增量」。
            if (pendingDailyBytes > 0) {
                await new KbQuotaLedger().add(pendingDailyBytes);
            }
            return { ok: true, failedChunks: 0, addedChunks: chunksToAdd.length };
        }
        catch (e) {
            console.error(`[FileMemory] Failed to sync ${normalizedRelativePath}:`, e);
            // 异常同样不提交状态（上面的 state 赋值没执行到），报失败让调用方可见
            return { ok: false, failedChunks: -1, addedChunks: 0, error: e instanceof Error ? e.message : String(e) };
        }
    }
    // Split user memory files on per-entry boundaries ("- [YYYY-MM-DDTHH:...")
    // so that appending a new entry does not change existing chunks' hashes,
    // preserving their chunk IDs and associated lifecycle metadata.
    splitMemoryEntries(content) {
        const lines = content.split('\n');
        const chunks = [];
        let currentLines = [];
        let currentStart = 1;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const isEntryStart = /^- \[\d{4}-\d{2}-\d{2}T/.test(line);
            if (isEntryStart && currentLines.length > 0) {
                const text = currentLines.join('\n').trim();
                if (text)
                    chunks.push({ text, startLine: currentStart });
                currentLines = [];
                currentStart = i + 1;
            }
            currentLines.push(line);
        }
        if (currentLines.length > 0) {
            const text = currentLines.join('\n').trim();
            if (text)
                chunks.push({ text, startLine: currentStart });
        }
        // Fall back to splitMarkdown if no entry boundaries found (e.g. plain prose notes)
        if (chunks.length === 0)
            return this.splitMarkdown(content);
        return chunks;
    }
    splitMarkdown(content) {
        const lines = content.split("\n");
        const chunks = [];
        let currentChunk = [];
        let currentStartLine = 1;
        let currentLength = 0;
        const MAX_CHUNK_SIZE = 1000;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const isHeader = /^#+\s/.test(line);
            const lineLength = line.length + 1; // +1 for newline
            // If it's a header or we exceeded max size (and current chunk is not empty)
            if ((isHeader || currentLength + lineLength > MAX_CHUNK_SIZE) && currentChunk.length > 0) {
                chunks.push({
                    text: currentChunk.join("\n"),
                    startLine: currentStartLine
                });
                currentChunk = [];
                currentLength = 0;
                currentStartLine = i + 1;
            }
            if (currentChunk.length === 0) {
                currentStartLine = i + 1;
            }
            currentChunk.push(line);
            currentLength += lineLength;
        }
        if (currentChunk.length > 0) {
            chunks.push({
                text: currentChunk.join("\n"),
                startLine: currentStartLine
            });
        }
        return chunks;
    }
}
