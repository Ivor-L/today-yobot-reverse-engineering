import OpenAI from "openai";
import { ConfigManager } from "../../core/config/manager.js";
import { persistRuntimeConfig } from "../../core/config/process_bridge.js";
const MODEL_CACHE_TTL_MS = 300_000;
export const MODEL_FAILURE_BACKOFF_MS = 120_000;
const MIN_CONTEXT_WINDOW_CONTRACT_VERSION = 1;
export class LLMManager {
    static instance;
    clientCache = new Map();
    authToken;
    channelId;
    _visionCache;
    _modelCacheGeneration = 0;
    _modelCacheRefresh;
    constructor() {
        // Config is now managed by ConfigManager
    }
    static getInstance() {
        if (!LLMManager.instance) {
            LLMManager.instance = new LLMManager();
        }
        return LLMManager.instance;
    }
    setAuthToken(token) {
        if (this.authToken === token)
            return;
        this.authToken = token;
        this.clientCache.clear(); // Force recreation of clients with new token
        this._visionCache = undefined;
        this._modelCacheGeneration += 1;
        this._modelCacheRefresh = undefined;
        // 登录后立刻预热模型列表。`createPiModel` 是同步的，只能读已有缓存，
        // 冷启动第一轮会拿到保守默认窗口；提前拉一次让它直接拿到真值。
        // 失败无所谓：每轮开始前的 checkContextWindow 会异步补正。
        if (token)
            void this.warmModelCache();
    }
    setChannelId(channelId) {
        if (this.channelId === channelId)
            return;
        console.log(`[LLMManager] setChannelId called with: ${channelId}`);
        this.channelId = channelId;
        this.clientCache.clear(); // Force recreation of clients with new channel ID
        this._visionCache = undefined;
        this._modelCacheGeneration += 1;
        this._modelCacheRefresh = undefined;
        if (this.authToken)
            void this.warmModelCache();
    }
    getAuthToken() {
        return this.authToken;
    }
    getChannelId() {
        // Priority: Runtime set > Configured > Default
        if (this.channelId)
            return this.channelId;
        // Fallback to ConfigManager (Environment/File)
        const config = this.getConfig();
        // Use type assertion as channelId is optional in AppConfig interface but loaded by manager
        return config.channelId;
    }
    async fetchRemoteModels(signal) {
        if (!this.authToken)
            return { models: [] };
        if (signal?.aborted) {
            throw signal.reason instanceof Error ? signal.reason : new Error("Remote model list request cancelled");
        }
        // 模型元数据位于每轮 run 的预检查路径上。这里如果无限等待，会让 Pi 的
        // 会话锁在真正 prompt 之前就永久占住；同时 stop() 也必须能取消它。
        const requestController = new AbortController();
        const relayAbort = () => requestController.abort(signal?.reason);
        signal?.addEventListener("abort", relayAbort, { once: true });
        const timeout = setTimeout(() => {
            requestController.abort(new Error("Remote model list request timed out"));
        }, 10_000);
        try {
            const headers = {
                'Authorization': `Bearer ${this.authToken}`
            };
            const channelId = this.getChannelId();
            if (channelId) {
                headers['X-Channel-ID'] = channelId;
            }
            const port = process.env.PORT || 3000;
            const response = await fetch(`http://localhost:${port}/v1/models`, {
                headers,
                signal: requestController.signal,
            });
            if (!response.ok) {
                throw new Error(`Remote model list request failed: HTTP ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            const contractVersion = Number(data?.meta?.context_window_contract_version);
            return {
                models: Array.isArray(data?.data) ? data.data : [],
                contextWindowContractVersion: Number.isFinite(contractVersion) && contractVersion > 0 ? contractVersion : undefined,
            };
        }
        catch (e) {
            // 用户停止必须一路冒泡到 PiKernel，不能被“取不到模型就回退”吞掉。
            if (signal?.aborted) {
                throw signal.reason instanceof Error ? signal.reason : e;
            }
            console.error("Failed to fetch remote models", e);
            return { models: [] };
        }
        finally {
            clearTimeout(timeout);
            signal?.removeEventListener("abort", relayAbort);
        }
    }
    emptyModelCache(at) {
        return {
            at,
            byId: new Map(),
            contextById: new Map(),
            recommendedById: new Map(),
            models: [],
        };
    }
    async waitForModelCache(promise, signal) {
        if (!signal)
            return promise;
        if (signal.aborted) {
            throw signal.reason instanceof Error ? signal.reason : new Error("Remote model cache wait cancelled");
        }
        return new Promise((resolve, reject) => {
            const onAbort = () => {
                cleanup();
                reject(signal.reason instanceof Error ? signal.reason : new Error("Remote model cache wait cancelled"));
            };
            const cleanup = () => signal.removeEventListener("abort", onAbort);
            signal.addEventListener("abort", onAbort, { once: true });
            promise.then(value => { cleanup(); resolve(value); }, error => { cleanup(); reject(error); });
        });
    }
    async refreshModelCache(generation) {
        const now = Date.now();
        const previous = this._visionCache;
        const payload = await this.fetchRemoteModels();
        const models = payload.models;
        // 登录 token / channel 在请求途中变化：旧响应绝不能覆盖新身份的模型列表。
        if (generation !== this._modelCacheGeneration) {
            return this._visionCache ?? this.emptyModelCache(now);
        }
        if (models.length === 0) {
            if (previous?.models.length) {
                // 保留上一次好数据，但按失败退避窗口重试；网络抖动不能把物理窗口随机打回默认值。
                this._visionCache = { ...previous, at: now - (MODEL_CACHE_TTL_MS - MODEL_FAILURE_BACKOFF_MS) };
            }
            else {
                // 冷启动失败不能让每一轮都再卡 10 秒；两分钟负缓存限制故障放大。
                this._visionCache = this.emptyModelCache(now);
            }
            return this._visionCache;
        }
        const next = this.emptyModelCache(now);
        next.models = models;
        const trustedContextContract = (payload.contextWindowContractVersion || 0) >= MIN_CONTEXT_WINDOW_CONTRACT_VERSION;
        for (const model of models) {
            if (!model?.id)
                continue;
            const id = String(model.id);
            next.byId.set(id, model?.capabilities?.vision === true);
            // An old server may still expose legacy context values (for example Doubao 32K). Treating
            // those as a physical boundary recreates false-overflow behavior. The top-level contract
            // marker distinguishes a newly deployed catalog, while the per-model flag prevents an
            // unverified transit cap (BLT) from being promoted to a hard boundary.
            if (trustedContextContract && model?.context_window_verified !== false) {
                const win = Number(model?.context_window);
                if (Number.isFinite(win) && win > 0)
                    next.contextById.set(id, win);
                const rec = Number(model?.recommended_context_window);
                if (Number.isFinite(rec) && rec > 0)
                    next.recommendedById.set(id, rec);
            }
        }
        this._visionCache = next;
        return next;
    }
    // 远程模型列表缓存(含 capabilities.vision 与 context_window)。成功缓存 5 分钟，失败退避 2 分钟。
    async getVisionModelCache(signal) {
        const now = Date.now();
        const ttl = this._visionCache?.models.length ? MODEL_CACHE_TTL_MS : MODEL_FAILURE_BACKOFF_MS;
        if (this._visionCache && now - this._visionCache.at <= ttl)
            return this._visionCache;
        const generation = this._modelCacheGeneration;
        if (!this._modelCacheRefresh || this._modelCacheRefresh.generation !== generation) {
            const promise = this.refreshModelCache(generation).finally(() => {
                if (this._modelCacheRefresh?.promise === promise)
                    this._modelCacheRefresh = undefined;
            });
            this._modelCacheRefresh = { generation, promise };
        }
        // 多个会话共享同一次 /v1/models 请求；某个会话 stop 只取消自己的等待，
        // 不会把其它会话和登录预热一并 abort。底层请求本身仍有 10 秒硬超时。
        return this.waitForModelCache(this._modelCacheRefresh.promise, signal);
    }
    /**
     * 模型的上下文口径，来源全部是服务端 `/v1/models`：
     *   · `physical`    = `context_window`             —— 模型能收多少（判断是否溢出）
     *   · `recommended` = `recommended_context_window` —— 我们愿意喂多少（决定何时压缩）
     *
     * 客户端不再自带任何"某某模型是多少 K"的表——那种耦合正是这次事故的起点：
     * 客户端写死 128K、服务端声明 1M，于是成功返回的请求被判成静默溢出。
     * 服务端是唯一真源，调模型窗口和压缩阈值都不需要发客户端版本。
     *
     * 取不到（未登录 / 本地直连 / 网络失败）返回 undefined，由调用方决定保守默认值。
     */
    async getModelContextInfo(modelId, signal) {
        if (!modelId)
            return {};
        try {
            const cache = await this.getVisionModelCache(signal);
            return {
                physical: cache.contextById.get(modelId),
                recommended: cache.recommendedById.get(modelId),
            };
        }
        catch (error) {
            if (signal?.aborted) {
                throw signal.reason instanceof Error ? signal.reason : error;
            }
            return {};
        }
    }
    /**
     * 同步版：只读已有缓存，**不发起请求**。
     * 给 `createPiModel` 这类同步构造点用；缓存冷时返回空，
     * 由每轮开始前的异步校准（kernel 的 checkContextWindow）补正。
     */
    getCachedModelContextInfo(modelId) {
        if (!modelId)
            return {};
        return {
            physical: this._visionCache?.contextById.get(modelId),
            recommended: this._visionCache?.recommendedById.get(modelId),
        };
    }
    /** 预热模型列表缓存。登录后调一次，让同步取用点尽早拿到真值。 */
    async warmModelCache() {
        try {
            await this.getVisionModelCache();
        }
        catch {
            // 预热失败无所谓：后续异步取用点会自己重试。
        }
    }
    /** 供单次多模态预处理选择模型；不会修改当前 provider 或会话模型。 */
    async getVisionCapableRemoteModels(signal) {
        const cache = await this.getVisionModelCache(signal);
        return cache.models.filter((model) => model?.id && model?.capabilities?.vision === true);
    }
    /**
     * 指定模型是否支持视觉(图像输入)。数据源与聊天页一致:`/v1/models` 的 capabilities.vision。
     * 用于 agentic 图片场景的**能力门**:支持才把图片喂模型,不支持(如 deepseek)降级为文本占位。
     * 未知/取不到一律返回 false(保守:宁可降级也不把图片送进不支持的模型触发报错)。
     */
    async modelSupportsVision(modelId) {
        if (!modelId)
            return false;
        try {
            const cache = await this.getVisionModelCache();
            if (cache.byId.has(modelId))
                return cache.byId.get(modelId) === true;
            // 本地直连模式没有 /v1/models，回退到 provider 的显式能力声明。
            const provider = this.getConfig().providers.find((item) => item.chatModel === modelId);
            return provider?.capabilities?.vision === true;
        }
        catch {
            return false;
        }
    }
    // Helper to get config from ConfigManager
    getConfig() {
        return ConfigManager.getInstance().getLLMConfig();
    }
    async setConfig(newConfig) {
        const appConfig = ConfigManager.getInstance().getConfig();
        await persistRuntimeConfig({
            ...appConfig,
            llm: newConfig
        });
        this.clientCache.clear();
        this._visionCache = undefined;
    }
    async updateProvider(provider) {
        const config = JSON.parse(JSON.stringify(this.getConfig()));
        const idx = config.providers.findIndex(p => p.id === provider.id);
        if (idx >= 0) {
            config.providers[idx] = provider;
        }
        else {
            config.providers.push(provider);
        }
        await this.setConfig(config);
        this.clientCache.delete(provider.id);
    }
    async setActiveProvider(providerId) {
        const config = JSON.parse(JSON.stringify(this.getConfig()));
        if (!config.providers.find(p => p.id === providerId)) {
            throw new Error(`Provider ${providerId} not found`);
        }
        config.activeProviderId = providerId;
        await this.setConfig(config);
    }
    async setModel(modelId) {
        const config = JSON.parse(JSON.stringify(this.getConfig()));
        // In Proxy mode, the gateway server routes by model name; the kernel just needs
        // chatModel updated on whichever real provider is active.
        let activeProvider = config.providers.find(p => p.id === config.activeProviderId);
        if (!activeProvider && config.providers.length > 0) {
            // activeProviderId may point to a non-existent gateway-side provider (e.g. 'blt-responses').
            // Fall back to the first real provider so the model name still reaches the gateway.
            activeProvider = config.providers[0];
            config.activeProviderId = activeProvider.id;
        }
        if (activeProvider) {
            activeProvider.chatModel = modelId;
            await this.updateProvider(activeProvider);
        }
        else {
            console.warn(`[LLMManager] No active provider found to update model to ${modelId}`);
        }
    }
    getClient(providerId) {
        const config = this.getConfig();
        const pid = providerId || config.activeProviderId;
        // Always recreate client if channelId is set to ensure headers are fresh
        // Or we can just use the cache key logic including channelId
        const cacheKey = this.channelId ? `${pid}:${this.channelId}` : pid;
        if (this.clientCache.has(cacheKey)) {
            console.log(`[LLMManager] Returning cached client for key: ${cacheKey}`);
            return this.clientCache.get(cacheKey);
        }
        const provider = config.providers.find(p => p.id === pid);
        if (!provider) {
            if (config.providers.length > 0) {
                console.warn(`Provider ${pid} not found, falling back to ${config.providers[0].id}`);
                return this.getClient(config.providers[0].id);
            }
            throw new Error(`LLM Provider ${pid} not found and no fallback available`);
        }
        console.log(`[LLMManager] Creating new client for ${pid}. ChannelID: ${this.channelId}`);
        const port = process.env.PORT || 3000;
        const client = new OpenAI({
            baseURL: this.authToken ? `http://localhost:${port}/v1` : provider.baseURL,
            apiKey: this.authToken || provider.apiKey,
            dangerouslyAllowBrowser: true,
            defaultHeaders: this.channelId ? { 'X-Channel-ID': this.channelId } : undefined
        });
        this.clientCache.set(cacheKey, client);
        return client;
    }
    getModelName(providerId) {
        const config = this.getConfig();
        const pid = providerId || config.activeProviderId;
        const provider = config.providers.find(p => p.id === pid);
        return provider?.chatModel || "gpt-3.5-turbo";
    }
    getCapabilities(providerId) {
        const config = this.getConfig();
        const pid = providerId || config.activeProviderId;
        const provider = config.providers.find(p => p.id === pid);
        return provider?.capabilities || { vision: false, functionCalling: false, jsonMode: false };
    }
    async uploadFile(buffer, purpose = "user_data", filename = "image.png") {
        const client = this.getClient();
        try {
            const fileObj = await OpenAI.toFile(buffer, filename);
            const response = await client.files.create({
                file: fileObj,
                purpose: purpose
            });
            console.log(`[LLMManager] File uploaded successfully. ID: ${response.id}`);
            return response.id;
        }
        catch (e) {
            console.error("[LLMManager] File upload failed:", e);
            throw e;
        }
    }
}
