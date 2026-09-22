export class SSETransport {
    options;
    controller = null;
    messageHandler = null;
    endpoint = null; // The POST endpoint for sending messages
    constructor(options) {
        this.options = options;
    }
    async start() {
        this.controller = new AbortController();
        console.log(`[MCP] Connecting to SSE: ${this.options.url}`);
        try {
            const response = await fetch(this.options.url, {
                headers: {
                    'Accept': 'text/event-stream',
                    ...this.options.headers
                },
                signal: this.controller.signal
            });
            if (!response.ok) {
                throw new Error(`Failed to connect to SSE: ${response.status} ${response.statusText}`);
            }
            if (!response.body) {
                throw new Error("No response body");
            }
            // Start reading the stream without awaiting, so start() returns immediately after connection
            this.readStream(response.body);
        }
        catch (error) {
            console.error("[MCP] SSE Connection error:", error);
            throw error;
        }
    }
    async readStream(body) {
        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                // Keep the last part as buffer if it doesn't end with newline
                // But buffer handling with split is tricky.
                // If the chunk ends with \n, lines will have an empty string at the end.
                // If not, the last element is the incomplete line.
                if (buffer.endsWith("\n")) {
                    buffer = "";
                }
                else {
                    buffer = lines.pop() || "";
                }
                for (const line of lines) {
                    this.parseSSELine(line);
                }
            }
        }
        catch (error) {
            if (error.name === 'AbortError')
                return;
            console.error("[MCP] SSE Read error:", error);
        }
    }
    currentEvent = null;
    parseSSELine(line) {
        line = line.trim();
        if (!line) {
            // Empty line indicates end of event
            this.currentEvent = null;
            return;
        }
        if (line.startsWith("event:")) {
            this.currentEvent = line.substring(6).trim();
        }
        else if (line.startsWith("data:")) {
            const data = line.substring(5).trim();
            if (this.currentEvent === "endpoint") {
                // This is the POST endpoint
                try {
                    // Resolve relative URLs against the SSE URL
                    const url = new URL(data, this.options.url);
                    this.endpoint = url.toString();
                    console.log(`[MCP] Received POST endpoint: ${this.endpoint}`);
                }
                catch {
                    this.endpoint = data;
                }
            }
            else if (this.currentEvent === "message" || !this.currentEvent) {
                // Standard message
                try {
                    const msg = JSON.parse(data);
                    if (this.messageHandler) {
                        this.messageHandler(msg);
                    }
                }
                catch (e) {
                    console.error(`[MCP] Failed to parse SSE message: ${data}`, e);
                }
            }
        }
    }
    async stop() {
        this.controller?.abort();
        this.controller = null;
        this.endpoint = null;
    }
    async send(message) {
        if (!this.endpoint) {
            throw new Error("MCP Endpoint not yet received from server. Wait for initialization.");
        }
        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...this.options.headers
            },
            body: JSON.stringify(message)
        });
        if (!response.ok) {
            throw new Error(`Failed to send message: ${response.statusText}`);
        }
    }
    onMessage(handler) {
        this.messageHandler = handler;
    }
}
