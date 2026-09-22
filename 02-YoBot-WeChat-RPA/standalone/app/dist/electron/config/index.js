import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH, quiet: true });
export const config = {
    // App
    env: process.env.NODE_ENV || "development",
    workspaceDir: process.env.WORKSPACE_DIR || path.join(process.env.USER_DATA_PATH || process.cwd(), "workspace"),
    channelId: process.env.VITE_CHANNEL_ID || 'agent_generic',
    // LLM Config - Deprecated: Use ConfigManager
    llm: {
        apiKey: "", // Managed by ConfigManager/Gateway
        baseURL: "",
        model: "",
    },
    // Embedding - Deprecated: Use Gateway
    embedding: {
        apiKey: "",
        baseURL: "",
        model: process.env.EMBEDDING_MODEL || "doubao-embedding-vision", // Only model name might be useful locally
        dim: parseInt(process.env.EMBEDDING_DIM || "2048"),
    },
    // Feishu (Still required locally for now) - Deprecated: Use ConfigManager
    feishu: {
        appId: "",
        appSecret: "",
        encryptKey: "",
        wsEndpoint: "https://www.feishu.cn/v1/ws",
    },
    // Search - Deprecated: Use Gateway
    search: {
        provider: process.env.SEARCH_PROVIDER,
        apiKey: "", // Managed by Gateway
        maxResults: parseInt(process.env.SEARCH_MAX_RESULTS || "5"),
        volcengine: {
            apiKey: "",
            model: "",
        }
    }
};
