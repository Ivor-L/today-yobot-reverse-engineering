import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';
import { normalizeSystemConfig, DEFAULT_MCP_GATEWAY_CONFIG } from './types.js';
import { resolveBootstrapAgentFileLayout } from '../platform/file_layout.js';
import { maskConfigSecrets } from './secret_projection.js';
const CONFIG_FILENAME = 'config.json';
// Default Models Mapping
const DEFAULT_MODELS = {
    "deepseek": ["deepseek-chat", "deepseek-coder"],
    "doubao": ["doubao-pro-4k", "doubao-pro-32k", "doubao-lite-4k", "doubao-lite-32k"],
    "moonshot": ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
    "openrouter": ["anthropic/claude-3-opus", "anthropic/claude-3-sonnet", "openai/gpt-4-turbo"],
    "openai": ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"]
};
const MANAGED_PROVIDERS = ['deepseek', 'doubao', 'moonshot', 'openrouter', 'volcengine', 'kimi'];
export class ConfigManager {
    static instance;
    configPath;
    config;
    systemDefaults = [];
    externalPersistence = false;
    externalDocument = undefined;
    constructor() {
        this.configPath = path.join(this.getUserDataPath(), CONFIG_FILENAME);
        this.loadSystemDefaults();
        this.config = this.loadConfig();
    }
    static getInstance() {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }
    loadSystemDefaults() {
        // Load defaults from .env or hardcoded values
        const envPath = path.join(process.cwd(), '.env');
        let envConfig = {};
        if (fs.existsSync(envPath)) {
            try {
                envConfig = dotenv.parse(fs.readFileSync(envPath));
            }
            catch (e) {
                console.warn("Failed to parse .env", e);
            }
        }
        // Initialize Defaults
        const defaultChannelId = envConfig.CHANNEL_ID || envConfig.VITE_CHANNEL_ID || "official";
        this.systemDefaults = [
            {
                id: "deepseek",
                name: "DeepSeek V3",
                baseURL: envConfig.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
                apiKey: envConfig.DEEPSEEK_API_KEY || "",
                chatModel: envConfig.DEEPSEEK_MODEL || "deepseek-chat",
                capabilities: { vision: false, functionCalling: true, jsonMode: true },
                availableModels: DEFAULT_MODELS['deepseek'] || [],
                customModels: []
            },
            {
                id: "doubao",
                name: "Doubao Pro",
                baseURL: "https://ark.cn-beijing.volces.com/api/v3",
                apiKey: envConfig.VOLC_API_KEY || "",
                chatModel: envConfig.VOLC_MODEL || "doubao-pro-4k",
                capabilities: { vision: true, functionCalling: true, jsonMode: true },
                availableModels: DEFAULT_MODELS['doubao'] || [],
                customModels: []
            },
            {
                id: "moonshot",
                name: "Kimi",
                baseURL: "https://api.moonshot.cn/v1",
                apiKey: envConfig.MOONSHOT_API_KEY || "",
                chatModel: "moonshot-v1-8k",
                capabilities: { vision: false, functionCalling: true, jsonMode: true },
                availableModels: DEFAULT_MODELS['moonshot'] || [],
                customModels: []
            },
            {
                id: "openrouter",
                name: "OpenRouter",
                baseURL: "https://openrouter.ai/api/v1",
                apiKey: envConfig.OPENROUTER_API_KEY || "",
                chatModel: "anthropic/claude-3-sonnet",
                capabilities: { vision: true, functionCalling: true, jsonMode: true },
                availableModels: DEFAULT_MODELS['openrouter'] || [],
                customModels: []
            }
        ];
    }
    getUserDataPath() {
        // Electron main injects its single bootstrap decision into USER_DATA_PATH.
        // Standalone/server mode defaults to the legacy root until migration activates
        // the platform layout, so Windows and current macOS development data stay intact.
        const appDir = resolveBootstrapAgentFileLayout({
            userDataRoot: process.env.USER_DATA_PATH?.trim() || undefined,
        }).userData;
        if (!fs.existsSync(appDir)) {
            try {
                fs.mkdirSync(appDir, { recursive: true });
            }
            catch (e) {
                console.error("Failed to create config directory:", e);
                // Fallback to local data dir if home is not writable (rare)
                return path.join(process.env.USER_DATA_PATH || process.cwd(), 'data');
            }
        }
        return appDir;
    }
    loadConfig() {
        let loaded = {};
        const hadPersistedConfig = this.externalPersistence
            ? this.externalDocument !== undefined
            : fs.existsSync(this.configPath);
        if (this.externalPersistence) {
            loaded = this.externalDocument === undefined
                ? {}
                : JSON.parse(JSON.stringify(this.externalDocument));
        }
        else if (hadPersistedConfig) {
            try {
                const raw = fs.readFileSync(this.configPath, 'utf-8');
                loaded = JSON.parse(raw);
            }
            catch (e) {
                console.error("Failed to load config, resetting:", e);
            }
        }
        else {
            // Fallback migration logic if needed, but for now just empty
            // this.migrateOrInit(); // Can keep logic if desired, but simplified here
        }
        // Merge Logic: System Defaults -> User Overrides
        const config = {
            // Force VITE_CHANNEL_ID from env if present (e.g. dev:agent mode), otherwise use config file or .env
            channelId: process.env.VITE_CHANNEL_ID || loaded.channelId || this.getEnvChannelId(),
            // Legacy strict/loose + shadow/enforce combinations are inferred into a user mode.
            // Missing fields use the local-Solo default; explicit old choices remain intact.
            system: normalizeSystemConfig(loaded.system),
            channels: loaded.channels || {}, // Load channels from user config or default empty
            llm: {
                activeProviderId: loaded.llm?.activeProviderId || "doubao",
                providers: [],
                strategy: loaded.llm?.strategy || { mode: "manual" }
            },
            disabledSkills: loaded.disabledSkills || [],
            mcpServers: loaded.mcpServers || [],
            models: loaded.models,
            mcpGateway: { ...DEFAULT_MCP_GATEWAY_CONFIG, ...(loaded.mcpGateway || {}) }
        };
        // Merge Providers
        // 1. Start with System Defaults
        const providersMap = new Map();
        this.systemDefaults.forEach(p => providersMap.set(p.id, { ...p }));
        // 2. Apply User Overrides (from config.json)
        // Note: User config might only contain partial data
        if (loaded.llm && Array.isArray(loaded.llm.providers)) {
            loaded.llm.providers.forEach((userP) => {
                if (providersMap.has(userP.id)) {
                    // It's a managed provider, only override allowable fields
                    const base = providersMap.get(userP.id);
                    providersMap.set(userP.id, {
                        ...base,
                        chatModel: userP.chatModel || base.chatModel, // User selection
                        // Do NOT override apiKey, baseURL, capabilities from user config for managed providers
                        // UNLESS we want to allow user to override them locally? 
                        // User requirement: "server-side apikey", implying user config shouldn't have it.
                        // However, if user ADDED a custom key in UI, we might want to support it?
                        // For now, strict adherence to requirement: don't trust local keys for managed providers if system has one?
                        // Actually, let's allow override if system key is empty.
                        apiKey: base.apiKey || userP.apiKey || "",
                        customModels: userP.customModels || []
                    });
                }
                else {
                    // Custom Provider (User added) -> Load fully
                    providersMap.set(userP.id, {
                        ...userP,
                        availableModels: userP.availableModels || [],
                        customModels: userP.customModels || [],
                        capabilities: userP.capabilities || { vision: false, functionCalling: false, jsonMode: false }
                    });
                }
            });
        }
        config.llm.providers = Array.from(providersMap.values());
        return config;
    }
    getEnvChannelId() {
        // Priority: Process Env (Runtime) > .env File > Default
        if (process.env.VITE_CHANNEL_ID)
            return process.env.VITE_CHANNEL_ID;
        if (process.env.CHANNEL_ID)
            return process.env.CHANNEL_ID;
        const envPath = path.join(process.cwd(), '.env');
        let envConfig = {};
        if (fs.existsSync(envPath)) {
            try {
                envConfig = dotenv.parse(fs.readFileSync(envPath));
            }
            catch (e) { }
        }
        return envConfig.CHANNEL_ID || envConfig.VITE_CHANNEL_ID || "official";
    }
    getPersistableConfig(config = this.config) {
        const normalizedConfig = {
            ...config,
            system: normalizeSystemConfig(config.system),
        };
        return {
            system: normalizedConfig.system,
            // Save Channels
            channels: normalizedConfig.channels || {},
            disabledSkills: normalizedConfig.disabledSkills || [],
            mcpServers: normalizedConfig.mcpServers || [],
            mcpGateway: normalizedConfig.mcpGateway || { ...DEFAULT_MCP_GATEWAY_CONFIG },
            // 落盘是白名单的：不列在这里的字段保存后就没了，重启即丢。
            // 省略而不是补默认值——`models` 缺省的语义就是「全部按默认（思考开启）」。
            ...(normalizedConfig.models ? { models: normalizedConfig.models } : {}),
            llm: {
                activeProviderId: normalizedConfig.llm.activeProviderId,
                strategy: normalizedConfig.llm.strategy,
                providers: normalizedConfig.llm.providers.map(p => {
                    if (MANAGED_PROVIDERS.includes(p.id)) {
                        // Managed: Only save user choices
                        return {
                            id: p.id,
                            name: p.name,
                            chatModel: p.chatModel,
                            customModels: p.customModels
                            // Exclude: apiKey, baseURL, capabilities, availableModels
                        };
                    }
                    // Custom: Save everything
                    return p;
                })
            }
        };
    }
    useExternalPersistence(document) {
        if (document !== null && (!document || typeof document !== 'object' || Array.isArray(document))) {
            throw new Error('External config document must be a JSON object or null');
        }
        this.externalPersistence = true;
        this.externalDocument = document === null ? undefined : JSON.parse(JSON.stringify(document));
        this.reloadConfig();
    }
    isUsingExternalPersistence() {
        return this.externalPersistence;
    }
    saveConfig(config) {
        if (this.externalPersistence) {
            throw new Error('External config persistence must be committed by its owner');
        }
        try {
            const normalizedConfig = {
                ...config,
                system: normalizeSystemConfig(config.system),
            };
            const dir = path.dirname(this.configPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const persistConfig = this.getPersistableConfig(normalizedConfig);
            fs.writeFileSync(this.configPath, JSON.stringify(persistConfig, null, 2));
            // Update internal state (full config)
            this.config = normalizedConfig;
        }
        catch (e) {
            console.error("[ConfigManager] Failed to save config:", e);
            // Callers such as Electron IPC and the HTTP config API must be able
            // to report a failed commit. Swallowing this error makes the UI say
            // "saved" even though disk and the in-memory snapshot stayed old.
            throw e;
        }
    }
    getConfig() {
        return this.config;
    }
    reloadConfig() {
        console.log("[ConfigManager] Reloading configuration...");
        this.loadSystemDefaults(); // Refresh defaults (e.g. from env changes)
        this.config = this.loadConfig(); // Re-read file and merge
    }
    getSafeConfig() {
        // Return sanitized config for UI (mask keys)
        return maskConfigSecrets({
            ...this.config,
            // Explicitly include channels
            channels: this.config.channels,
            disabledSkills: this.config.disabledSkills || [],
            mcpServers: this.config.mcpServers || [],
            mcpGateway: this.config.mcpGateway || { ...DEFAULT_MCP_GATEWAY_CONFIG },
            runtime: {
                permissionEnvironmentOverrides: [
                    'YOKO_FILE_MUTATION_POLICY',
                    'YOKO_TOOL_POLICY',
                    'YOKO_TOOL_POLICY_ENFORCE_TOOLS',
                    'YOKO_TOOL_POLICY_ENFORCE_EFFECTS',
                    'YOKO_TOOL_POLICY_CRITICAL_ALLOW',
                    'YOKO_TOOL_POLICY_SCOPES',
                    'YOKO_ALLOW_LEGACY_PROCESS_SCOPES',
                    'YOKO_TASK_CONTRACT',
                    'YOKO_VERIFIER',
                    'YOKO_AGENT_RUN_MODE',
                    'YOKO_AGENT_RUN_PROFILES',
                    'YOKO_AGENT_RUN_ACCOUNTS',
                ].filter(name => process.env[name] !== undefined),
            },
        });
    }
    getLLMConfig() {
        return this.config.llm;
    }
    getSystemConfig() {
        return this.config.system;
    }
    updateConfig(partial) {
        this.saveConfig({ ...this.config, ...partial });
    }
    // --- MCP Gateway (对外暴露) ---
    getMcpGatewayConfig() {
        return this.config.mcpGateway || { ...DEFAULT_MCP_GATEWAY_CONFIG };
    }
    updateMcpGateway(partial) {
        this.saveConfig({
            ...this.config,
            mcpGateway: { ...this.getMcpGatewayConfig(), ...partial },
        });
    }
    // 开启时若无 token 则生成并持久化;返回当前 token。
    ensureMcpGatewayToken() {
        const gw = this.getMcpGatewayConfig();
        if (!gw.token) {
            const token = randomUUID().replace(/-/g, '');
            this.saveConfig({ ...this.config, mcpGateway: { ...gw, token } });
            return token;
        }
        return gw.token;
    }
    // 强制重置 token(旧 token 立即失效)。
    regenerateMcpGatewayToken() {
        const token = randomUUID().replace(/-/g, '');
        this.saveConfig({
            ...this.config,
            mcpGateway: { ...this.getMcpGatewayConfig(), token },
        });
        return token;
    }
}
