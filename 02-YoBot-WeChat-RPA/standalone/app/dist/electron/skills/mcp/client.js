import { StdioTransport } from "./transports/stdio.js";
import { SSETransport } from "./transports/sse.js";
import { StreamableHttpTransport } from "./transports/streamable_http.js";
export class MCPClient {
    config;
    transport;
    messageId = 0;
    pendingRequests = new Map();
    constructor(config) {
        this.config = config;
        if (config.transport === 'stdio') {
            this.transport = new StdioTransport({
                command: config.command,
                args: config.args,
                env: config.env,
                cwd: config.cwd || process.cwd()
            });
        }
        else if (config.transport === 'http') {
            // 'http' = 现代 Streamable HTTP(2025-03-26),绝大多数 MCP 服务器的默认形态。
            this.transport = new StreamableHttpTransport({
                url: config.url,
                headers: config.headers
            });
        }
        else if (config.transport === 'sse') {
            // 'sse' = 已废弃的 HTTP+SSE 老传输,仅为兼容存量配置保留。
            this.transport = new SSETransport({
                url: config.url,
                headers: config.headers
            });
        }
        else {
            throw new Error(`Unsupported transport: ${config.transport}`);
        }
        this.transport.onMessage((msg) => this.handleMessage(msg));
    }
    async connect() {
        await this.transport.start();
        // Initialize MCP Handshake
        // According to MCP Spec:
        // Client sends "initialize" request with capabilities.
        const initResult = await this.request("initialize", {
            protocolVersion: "2024-11-05", // Latest Protocol Version
            capabilities: {
                roots: { listChanged: false },
                sampling: {}
            },
            clientInfo: {
                name: "yoko-agent",
                version: "1.0.0"
            }
        });
        // Notify initialized
        await this.notify("notifications/initialized", {});
        console.log(`[MCP] Connected to ${this.config.name}`);
        return initResult;
    }
    async disconnect() {
        await this.transport.stop();
    }
    async listTools() {
        const response = await this.request("tools/list", {});
        return response.tools || [];
    }
    async callTool(name, args) {
        const result = await this.request("tools/call", {
            name,
            arguments: args,
        });
        // MCP Tool Call Result Structure:
        // { content: [{ type: "text", text: "..." }, { type: "image", ... }], isError: boolean }
        if (result.isError) {
            throw new Error(`MCP Tool Error: ${JSON.stringify(result.content)}`);
        }
        // Combine text content
        if (result.content && Array.isArray(result.content)) {
            return result.content
                .filter((c) => c.type === 'text')
                .map((c) => c.text)
                .join('\n');
        }
        return JSON.stringify(result);
    }
    // --- JSON-RPC Implementation ---
    handleMessage(msg) {
        // Response
        if ('id' in msg && msg.id !== undefined && msg.id !== null) {
            if (this.pendingRequests.has(msg.id)) {
                const [resolve, reject] = this.pendingRequests.get(msg.id);
                this.pendingRequests.delete(msg.id);
                const response = msg;
                if (response.error) {
                    reject(new Error(`MCP Error ${response.error.code}: ${response.error.message}`));
                }
                else {
                    resolve(response.result);
                }
            }
        }
        else {
            // Notification or Request from Server (e.g. logging)
            // Currently we ignore server requests, but we could handle logging
            // console.log("[MCP] Notification:", msg);
        }
    }
    async request(method, params) {
        return new Promise((resolve, reject) => {
            const id = this.messageId++;
            // Set timeout for requests
            const timeout = setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error(`MCP Request Timeout: ${method}`));
                }
            }, 30000); // 30s timeout
            this.pendingRequests.set(id, [(res) => {
                    clearTimeout(timeout);
                    resolve(res);
                }, (err) => {
                    clearTimeout(timeout);
                    reject(err);
                }]);
            const req = { jsonrpc: "2.0", id, method, params };
            this.transport.send(req).catch(err => {
                clearTimeout(timeout);
                this.pendingRequests.delete(id);
                reject(err);
            });
        });
    }
    async notify(method, params) {
        // Notifications have no ID
        const req = { jsonrpc: "2.0", id: null, method, params }; // cast null to any to satisfy type if needed, or update type
        // Actually JSON-RPC 2.0 says omit ID for notifications.
        // My type definition has id: number | string. Let's make it optional in types or handle it here.
        // Let's modify the type definition in types.ts later if needed, but for now `null` is often accepted or undefined.
        // In my types.ts: id: number | string. It doesn't allow undefined/null? 
        // Wait, let's check types.ts
        // export interface JsonRpcRequest { ... id: number | string; ... }
        // It is mandatory. But strict JSON-RPC says omit it.
        // I should update types.ts to allow optional id.
        // For now, I will use a dummy ID or cast.
        // But MCP spec says: "Notifications are requests without an ID."
        // Let's fix types.ts first.
        // For now, I'll just send it.
        // @ts-ignore
        delete req.id;
        await this.transport.send(req);
    }
}
