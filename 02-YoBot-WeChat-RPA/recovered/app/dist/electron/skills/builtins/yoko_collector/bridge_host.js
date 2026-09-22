// 抖音线索采集 —— 本地 WS 桥宿主（懒启动）
//
// 角色对调说明：浏览器扩展是 WS *客户端*，主动拨向 ws://127.0.0.1:9920；
// 本模块是 WS *服务端*，接收扩展连接，复用扩展 background.js 里的 dispatch()。
// 协议（见 yoko-collector/protocol/protocol.d.ts）：
//   - 扩展连上后推送 { event:'hello', data:YOKO_API }
//   - 宿主下发 { __yokoApi:true, reqId, cmd, args } → 扩展回 { reqId, ok, data|error }
//   - 扩展任务状态变化主动推 { event:'status', data }，并定时 { event:'ping' }
//
// 懒启动：WS 服务端只在 yoko_collect 工具首次被调用时才监听端口，
// 不在客户端启动时占用资源（符合 bridge 启动时机约束）。
import { WebSocketServer, WebSocket } from "ws";
const HOST = "127.0.0.1";
const PORT = 9920;
export class YokoBridgeHost {
    static instance;
    wss = null;
    starting = null;
    client = null; // 最近连上的扩展
    pending = new Map();
    lastStatus = null;
    lastHello = null;
    static getInstance() {
        if (!this.instance)
            this.instance = new YokoBridgeHost();
        return this.instance;
    }
    /** 懒启动 WS 服务端。返回是否成功监听。失败（如端口占用）时返回 false，可重试。 */
    async ensureServer() {
        if (this.wss)
            return true;
        if (!this.starting) {
            this.starting = new Promise((resolve) => {
                let wss;
                try {
                    wss = new WebSocketServer({ host: HOST, port: PORT });
                }
                catch (e) {
                    console.error("[collector-bridge] failed to create server:", e);
                    resolve(false);
                    return;
                }
                wss.on("connection", (ws) => this.onConnection(ws));
                wss.on("listening", () => {
                    this.wss = wss;
                    console.log(`[collector-bridge] listening on ws://${HOST}:${PORT}`);
                    resolve(true);
                });
                wss.on("error", (err) => {
                    // 监听阶段失败（端口占用等）：不缓存 wss，允许后续重试
                    if (!this.wss) {
                        console.warn(`[collector-bridge] server error (${err && err.code || err}); bridge unavailable`);
                        resolve(false);
                    }
                });
            });
        }
        const ok = await this.starting;
        this.starting = null;
        return ok;
    }
    onConnection(ws) {
        // 只保留最近一个扩展连接（单机单浏览器场景）
        this.client = ws;
        console.log("[collector-bridge] extension connected");
        ws.on("message", (data) => {
            let msg;
            try {
                msg = JSON.parse(data.toString());
            }
            catch {
                return;
            }
            if (!msg)
                return;
            if (msg.event === "hello") {
                this.lastHello = msg.data;
                return;
            }
            if (msg.event === "status") {
                this.lastStatus = msg.data;
                return;
            }
            if (msg.event === "ping") {
                return;
            }
            if (msg.reqId && this.pending.has(msg.reqId)) {
                const p = this.pending.get(msg.reqId);
                clearTimeout(p.timer);
                this.pending.delete(msg.reqId);
                p.resolve(msg);
            }
        });
        ws.on("close", () => {
            if (this.client === ws)
                this.client = null;
            console.log("[collector-bridge] extension disconnected");
        });
        ws.on("error", () => { });
    }
    isConnected() {
        return !!(this.client && this.client.readyState === WebSocket.OPEN);
    }
    /** 等待扩展连入（扩展每 ~3s 拨号一次，首次调用可能要等一下） */
    async waitForClient(ms) {
        if (this.isConnected())
            return true;
        const start = Date.now();
        return new Promise((resolve) => {
            const iv = setInterval(() => {
                if (this.isConnected()) {
                    clearInterval(iv);
                    resolve(true);
                }
                else if (Date.now() - start > ms) {
                    clearInterval(iv);
                    resolve(false);
                }
            }, 200);
        });
    }
    /** 向扩展下发一条命令并等待回包。无连接/超时返回结构化 error。 */
    async request(cmd, args = {}, timeoutMs = 20000) {
        const ok = await this.ensureServer();
        if (!ok) {
            return {
                ok: false,
                error: {
                    code: "BRIDGE_UNAVAILABLE",
                    message: "本地采集桥端口启动失败（可能被占用）。",
                    remediation: "确认没有其它程序占用 127.0.0.1:9920，然后重试。",
                    agent_hint: "稍后重试 action=check；若持续失败，建议用户重启客户端。",
                    retryable: true,
                },
            };
        }
        if (!this.isConnected())
            await this.waitForClient(4000);
        if (!this.isConnected()) {
            return {
                ok: false,
                error: {
                    code: "EXTENSION_NOT_CONNECTED",
                    message: "未检测到采集扩展连接。",
                    remediation: "在 Chrome/Edge 加载并启用扩展，且保持该浏览器开启。",
                    agent_hint: "引导用户安装/启用扩展（见 SKILL.md 路径），装好后无需任何点击，几秒内会自动连上；随后重试。",
                    retryable: true,
                },
            };
        }
        const reqId = `${cmd}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                this.pending.delete(reqId);
                resolve({
                    ok: false,
                    error: { code: "BRIDGE_TIMEOUT", message: `命令 ${cmd} 超时未响应`, retryable: true },
                });
            }, timeoutMs);
            this.pending.set(reqId, { resolve, timer });
            try {
                this.client.send(JSON.stringify({ __yokoApi: true, reqId, cmd, args }));
            }
            catch (e) {
                clearTimeout(timer);
                this.pending.delete(reqId);
                resolve({ ok: false, error: { code: "BRIDGE_SEND_FAILED", message: String(e), retryable: true } });
            }
        });
    }
    getLastStatus() { return this.lastStatus; }
    /** 开新任务前清掉上一次的状态，避免 wait 立刻命中陈旧的 done。 */
    resetStatus() { this.lastStatus = null; }
    /**
     * 阻塞直到任务进入终止态（done/stopped/paused_risk/failed）或超时。
     * 取代 Agent 的高频轮询：一次调用挂起 ~timeoutMs，期间扩展通过 status 事件持续更新进度。
     * 返回 { timedOut, status }，status 为扩展推送的最新进度（含关键词进度）。
     */
    async waitForTerminal(timeoutMs = 30000, signal) {
        const isTerminal = (s) => s && (s.state === "done" || s.state === "stopped" || s.state === "paused_risk" || s.state === "failed");
        if (isTerminal(this.lastStatus))
            return { timedOut: false, status: this.lastStatus };
        if (signal?.aborted)
            return { timedOut: true, status: this.lastStatus, aborted: true };
        return new Promise((resolve) => {
            const start = Date.now();
            let onAbort = null;
            const finish = (r) => {
                clearInterval(iv);
                if (signal && onAbort)
                    signal.removeEventListener("abort", onAbort);
                resolve(r);
            };
            const iv = setInterval(() => {
                if (isTerminal(this.lastStatus))
                    finish({ timedOut: false, status: this.lastStatus });
                else if (Date.now() - start > timeoutMs)
                    finish({ timedOut: true, status: this.lastStatus });
            }, 500);
            if (signal) {
                onAbort = () => finish({ timedOut: true, status: this.lastStatus, aborted: true });
                signal.addEventListener("abort", onAbort, { once: true });
            }
        });
    }
}
