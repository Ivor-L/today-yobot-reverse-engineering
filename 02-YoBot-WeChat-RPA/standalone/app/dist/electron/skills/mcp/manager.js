import { ConfigManager } from "../../core/config/manager.js";
import { MCPClient } from "./client.js";
export class MCPManager {
    static instance;
    clients = new Map(); // serverId -> client
    // serverId -> 连接态元信息,供 mcp_list 展示(不必反查 config/client 内部)。
    meta = new Map();
    registry = null;
    constructor() { }
    static getInstance() {
        if (!MCPManager.instance) {
            MCPManager.instance = new MCPManager();
        }
        return MCPManager.instance;
    }
    setRegistry(registry) {
        this.registry = registry;
    }
    async loadFromConfig() {
        const config = ConfigManager.getInstance().getConfig();
        const servers = config.mcpServers || [];
        console.log(`[MCPManager] Loading ${servers.length} MCP servers...`);
        // Disconnect existing clients that are not in the new config or changed
        // For simplicity, we can disconnect all and reconnect active ones.
        // But to be more robust, we should diff.
        // For now, let's just connect new ones. 
        // Ideally, we should handle reload properly.
        // Let's implement a simple full reload for now (disconnect all, connect all enabled)
        await this.disconnectAll();
        for (const serverConfig of servers) {
            if (serverConfig.enabled) {
                try {
                    await this.connectServer(serverConfig);
                }
                catch (error) {
                    console.error(`[MCPManager] Failed to connect to server ${serverConfig.name}:`, error);
                }
            }
        }
    }
    /** 连接一个 MCP 服务器,注册其工具,返回工具名列表(供调用方回报)。 */
    async connectServer(config) {
        if (this.clients.has(config.id)) {
            console.warn(`[MCPManager] Server ${config.id} already connected.`);
            return this.meta.get(config.id)?.toolNames ?? [];
        }
        console.log(`[MCPManager] Connecting to ${config.name} (${config.transport})...`);
        const client = new MCPClient(config);
        try {
            await client.connect();
            this.clients.set(config.id, client);
            const tools = await client.listTools();
            console.log(`[MCPManager] Server ${config.name} provides ${tools.length} tools.`);
            if (this.registry) {
                const skill = this.createSkillFromClient(config, client, tools);
                await this.registry.registerSkill(skill);
            }
            const toolNames = tools.map(t => t.name);
            this.meta.set(config.id, { name: config.name, toolNames });
            return toolNames;
        }
        catch (error) {
            // Cleanup if connection failed
            try {
                await client.disconnect();
            }
            catch (cleanupError) {
                console.warn(`[MCPManager] Failed to clean up rejected server ${config.name}:`, cleanupError);
            }
            this.clients.delete(config.id);
            this.meta.delete(config.id);
            throw error;
        }
    }
    /** 是否已连接该服务器。 */
    isConnected(id) {
        return this.clients.has(id);
    }
    /** 断开并注销一个服务器(其技能与工具一并从 registry 移除)。返回是否命中。 */
    async removeServer(id) {
        const client = this.clients.get(id);
        if (!client)
            return false;
        try {
            await client.disconnect();
        }
        catch (e) {
            console.error(`[MCPManager] Error disconnecting ${id}:`, e);
        }
        this.clients.delete(id);
        this.meta.delete(id);
        this.registry?.unregisterSkill(`mcp-${id}`);
        return true;
    }
    /** 当前已连接服务器的概览,供 mcp_list。 */
    listConnected() {
        return [...this.meta.entries()].map(([id, m]) => ({ id, name: m.name, toolNames: m.toolNames }));
    }
    createSkillFromClient(config, client, mcpTools) {
        const tools = mcpTools.map(t => ({
            definition: {
                name: t.name,
                description: t.description || "",
                parameters: t.inputSchema || { type: "object", properties: {} },
                // Remote MCP annotations are untrusted hints. Until a server is explicitly
                // attested, every dynamic MCP tool is conservatively treated as a critical write.
                enterprise: {
                    namespace: `mcp.${config.id}`,
                    capability: t.name,
                    sideEffect: "external",
                    risk: "critical",
                    reversible: false,
                    idempotent: false,
                    approval: "always",
                    // A stdio MCP server is a local child process and may mutate device files.
                    // HTTP MCP stays outside this local-file security domain unless attested later.
                    ...(config.transport === "stdio"
                        ? { securityEffects: ["local_file_mutation"] }
                        : {}),
                    requiredScopes: [`mcp:${config.id}`],
                    executionMode: "sequential",
                },
            },
            execute: async (args) => {
                return await client.callTool(t.name, args);
            }
        }));
        return {
            name: `mcp-${config.id}`, // Unique internal name. 
            // Note: Skill names usually should be human readable for LLM? 
            // Actually, the LLM sees the tool names. Skill name is for system organization.
            // But we should probably use a cleaner name if possible, or just the ID is fine.
            description: `MCP Server: ${config.name}`,
            tools: tools,
            onDisable: async () => {
                await client.disconnect();
                this.clients.delete(config.id);
            }
        };
    }
    async disconnectAll() {
        for (const [id, client] of this.clients.entries()) {
            try {
                await client.disconnect();
            }
            catch (e) {
                console.error(`[MCPManager] Error disconnecting server ${id}:`, e);
            }
        }
        this.clients.clear();
        this.meta.clear();
    }
}
