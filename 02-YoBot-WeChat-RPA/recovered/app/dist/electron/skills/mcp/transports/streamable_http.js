/**
 * MCP Streamable HTTP 传输(协议 2025-03-26,取代已废弃的 HTTP+SSE)。
 *
 * 与 SSETransport 的本质区别:单端点、无预备 GET。每条消息都 POST 到同一个 url,
 * 响应**内联**回来——可能是 `application/json`(单条),也可能是 `text/event-stream`
 * (SSE 内联多条,服务端发完即关流)。这正是 `curl -X POST` 能拿到、而老的
 * `SSETransport.start()` 先发 GET 会吃 405 的那类服务器。
 *
 * 会话:initialize 响应头若带 `Mcp-Session-Id`,后续请求须回传(服务端据此认会话)。
 */
export class StreamableHttpTransport {
    options;
    controller = null;
    messageHandler = null;
    sessionId = null;
    constructor(options) {
        this.options = options;
    }
    async start() {
        // Streamable HTTP 无握手前置动作,连通性在首个 initialize POST 时才验证。
        this.controller = new AbortController();
    }
    async stop() {
        this.controller?.abort();
        this.controller = null;
        this.sessionId = null;
    }
    onMessage(handler) {
        this.messageHandler = handler;
    }
    async send(message) {
        const headers = {
            "Content-Type": "application/json",
            // 必须同时接受两种类型,否则符合规范的服务器回 406 Not Acceptable。
            "Accept": "application/json, text/event-stream",
            ...(this.sessionId ? { "Mcp-Session-Id": this.sessionId } : {}),
            ...this.options.headers,
        };
        const resp = await fetch(this.options.url, {
            method: "POST",
            headers,
            body: JSON.stringify(message),
            signal: this.controller?.signal,
        });
        // 会话 id 只在 initialize 响应里出现一次,抓到就一直带着。
        const sid = resp.headers.get("mcp-session-id");
        if (sid)
            this.sessionId = sid;
        if (!resp.ok) {
            const detail = await resp.text().catch(() => "");
            throw new Error(`MCP HTTP ${resp.status} ${resp.statusText}: ${detail.slice(0, 300)}`);
        }
        // 通知(无 id)通常回 202 且无 body;有 body 也一并解析,无害。
        const text = await resp.text();
        if (!text)
            return;
        const ct = resp.headers.get("content-type") || "";
        if (ct.includes("text/event-stream")) {
            // 逐行取 `data:`,拼 JSON。服务端发完响应即关流,故 text() 能读到 EOF,不会挂。
            for (const line of text.split(/\r?\n/)) {
                const l = line.trim();
                if (!l.startsWith("data:"))
                    continue;
                const d = l.slice(5).trim();
                if (!d || d === "[DONE]")
                    continue;
                this.dispatch(d);
            }
        }
        else {
            this.dispatch(text);
        }
    }
    dispatch(raw) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                for (const m of parsed)
                    this.messageHandler?.(m);
            }
            else {
                this.messageHandler?.(parsed);
            }
        }
        catch (e) {
            console.error(`[MCP] StreamableHTTP failed to parse message: ${raw.slice(0, 200)}`, e);
        }
    }
}
