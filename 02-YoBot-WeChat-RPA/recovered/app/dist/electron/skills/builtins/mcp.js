import { randomUUID } from "crypto";
import { ConfigManager } from "../../core/config/manager.js";
import { persistRuntimeConfig, runtimeConfigIsExternallyOwned } from "../../core/config/process_bridge.js";
import { MCPManager } from "../mcp/manager.js";
/**
 * 外部 MCP 接入的 agent 工具(替代过去用 shell 手搓 JSON-RPC 的脆弱路径)。
 *
 * scope='main':装 MCP = 引入可执行代码(stdio 更是本机 RCE 面),属设备主人动作,
 * 子 agent 不得调用。故本技能名 'mcp' 已列入 profile 的内建禁用集与对外网关 NEVER_EXPOSE。
 *
 * 落地流程(mcp_add):先 connectServer 验证+注册,失败即返回不落盘(不留坏配置);
 * 成功才写 config 并通知 main 进程 reload,保证两进程配置一致(见 config:reload-from-disk)。
 */
/** 通知 main 进程从磁盘重载配置,消除 server 写盘后 main 内存态陈旧。best-effort。 */
function syncMainConfig() {
    if (runtimeConfigIsExternallyOwned())
        return;
    try {
        process.send?.({ type: "config:reload-from-disk" });
    }
    catch { /* 非 forked 或通道不可用时忽略 */ }
}
/** 把一个 server upsert 进持久化配置(按 id 覆盖),写盘 + 更新 server 内存态。 */
async function persistServer(config) {
    const cm = ConfigManager.getInstance();
    const full = cm.getConfig();
    await persistRuntimeConfig({
        ...full,
        mcpServers: [...(full.mcpServers || []).filter(s => s.id !== config.id), config],
    });
    syncMainConfig();
}
const addTool = {
    definition: {
        name: "mcp_add",
        description: "Connect and install an external MCP server; its tools become usable and the config persists. Validates the connection first—on failure nothing is saved.",
        parameters: {
            type: "object",
            properties: {
                name: { type: "string", description: "Display name; re-using a name updates that server." },
                transport: { type: "string", enum: ["http", "stdio"], description: "http = Streamable HTTP URL; stdio = local command." },
                url: { type: "string", description: "http only. e.g. http://127.0.0.1:5031/mcp" },
                command: { type: "string", description: "stdio only. e.g. npx" },
                args: { type: "array", items: { type: "string" }, description: "stdio command args." },
                headers: { type: "object", description: "http only. Optional request headers." },
                env: { type: "object", description: "stdio only. Optional env vars." },
            },
            required: ["name", "transport"],
        },
        enterprise: {
            namespace: "mcp",
            capability: "install_server",
            sideEffect: "local",
            risk: "critical",
            reversible: true,
            idempotent: false,
            approval: "always",
            securityEffects: ["local_file_mutation"],
            requiredScopes: ["tool:mcp-admin"],
            executionMode: "sequential",
        },
    },
    execute: async (args) => {
        const { name, transport, url, command, args: cmdArgs, headers, env } = args || {};
        if (!name || !transport)
            return "缺少参数:name 和 transport 必填。";
        if (transport === "http" && !url)
            return "http 传输需要 url。";
        if (transport === "stdio" && !command)
            return "stdio 传输需要 command。";
        const mgr = MCPManager.getInstance();
        // 同名视为更新:复用旧 id,先断开旧连接再重连。
        const existing = (ConfigManager.getInstance().getConfig().mcpServers || []).find(s => s.name === name);
        const id = existing?.id || randomUUID();
        const config = {
            id, name, transport,
            ...(transport === "http" ? { url, headers } : { command, args: cmdArgs, env }),
            enabled: true,
        };
        if (mgr.isConnected(id))
            await mgr.removeServer(id);
        let toolNames;
        try {
            toolNames = await mgr.connectServer(config);
        }
        catch (e) {
            return `连接失败,未安装:${e?.message || String(e)}`;
        }
        try {
            await persistServer(config);
        }
        catch (error) {
            await mgr.removeServer(id).catch(() => undefined);
            return `连接成功但配置保存失败，已回滚连接:${error?.message || String(error)}`;
        }
        return `已安装 MCP「${name}」,新增 ${toolNames.length} 个工具:${toolNames.join(", ") || "(无)"}。可直接调用。`;
    },
};
const listTool = {
    definition: {
        name: "mcp_list",
        description: "List connected MCP servers and their tools.",
        parameters: { type: "object", properties: {} },
        enterprise: {
            namespace: "mcp",
            capability: "list_servers",
            sideEffect: "none",
            risk: "low",
            reversible: true,
            idempotent: true,
            approval: "never",
            executionMode: "parallel",
        },
    },
    execute: async () => {
        const list = MCPManager.getInstance().listConnected();
        if (list.length === 0)
            return "当前没有已连接的 MCP 服务器。";
        return list.map(s => `- ${s.name} (id: ${s.id}): ${s.toolNames.join(", ") || "无工具"}`).join("\n");
    },
};
const removeTool = {
    definition: {
        name: "mcp_remove",
        description: "Disconnect and uninstall an MCP server by id (from mcp_list).",
        parameters: {
            type: "object",
            properties: { id: { type: "string", description: "Server id from mcp_list." } },
            required: ["id"],
        },
        enterprise: {
            namespace: "mcp",
            capability: "remove_server",
            sideEffect: "local",
            risk: "critical",
            reversible: true,
            idempotent: true,
            approval: "always",
            securityEffects: ["local_file_mutation"],
            requiredScopes: ["tool:mcp-admin"],
            executionMode: "sequential",
        },
    },
    execute: async (args) => {
        const { id } = args || {};
        if (!id)
            return "缺少参数:id。";
        const mgr = MCPManager.getInstance();
        const cm = ConfigManager.getInstance();
        const full = cm.getConfig();
        const before = (full.mcpServers || []).length;
        const nextServers = (full.mcpServers || []).filter(s => s.id !== id);
        if (nextServers.length !== before) {
            await persistRuntimeConfig({ ...full, mcpServers: nextServers });
            syncMainConfig();
        }
        const hit = await mgr.removeServer(id);
        return hit || before !== nextServers.length ? `已卸载 MCP 服务器 ${id}。` : `未找到 id 为 ${id} 的 MCP 服务器。`;
    },
};
export const mcpSkill = {
    name: "mcp",
    description: "Install/connect external MCP servers so their tools become available to you.",
    scope: "main",
    tools: [addTool, listTool, removeTool],
};
