import { IMAServiceManager } from './service_manager.js';
import { MCPClient } from '../mcp/client.js';
export class IMASkill {
    name = 'ima_copilot';
    description = 'Tencent IMA Copilot Knowledge Base. Use this skill to query the external knowledge base via MCP.';
    mcpClient = null;
    serviceManager;
    constructor() {
        this.serviceManager = IMAServiceManager.getInstance();
    }
    async ensureClient() {
        if (this.mcpClient)
            return this.mcpClient;
        try {
            const { command, args, cwd } = await this.serviceManager.prepareService();
            console.log(`[IMA] Starting MCP Client: ${command} ${args.join(' ')} in ${cwd}`);
            // Use cwd for execution
            this.mcpClient = new MCPClient({
                id: "ima-copilot",
                name: "IMA Copilot",
                transport: "stdio",
                command,
                args,
                cwd,
                enabled: true
            });
            await this.mcpClient.connect();
            return this.mcpClient;
        }
        catch (error) {
            console.error('[IMA] Failed to start service:', error);
            throw error;
        }
    }
    // Static tool definitions that delegate to the dynamic service
    // This allows the agent to see the tools immediately without waiting for the service to start
    tools = [
        {
            definition: {
                name: 'ima_ask',
                description: 'Ask a general question to the IMA Copilot.',
                parameters: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'The question to ask.' }
                    },
                    required: ['query']
                }
            },
            execute: async ({ query }) => {
                const client = await this.ensureClient();
                // Map 'ima_ask' to 'ask' on the MCP server
                return await client.callTool('ask', { query });
            }
        },
        {
            definition: {
                name: 'ima_ask_with_kb',
                description: 'Ask a question using the Knowledge Base (RAG).',
                parameters: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'The question to ask.' }
                    },
                    required: ['query']
                }
            },
            execute: async ({ query }) => {
                const client = await this.ensureClient();
                // Map 'ima_ask_with_kb' to 'ask_with_kb' on the MCP server
                return await client.callTool('ask_with_kb', { query });
            }
        }
    ];
}
