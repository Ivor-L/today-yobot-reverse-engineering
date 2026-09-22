import { ConfigManager } from "../../../core/config/manager.js";
import { randomUUID } from "node:crypto";
const RPA_MCP_CONTROL_URL = process.env.YOKO_RPA_MCP_CONTROL_URL?.trim()
    || "http://127.0.0.1:9922/api/mcp/control";
const RPA_MCP_CONTROL_TIMEOUT_MS = 2_000;
async function postNativeControlThroughMain(body) {
    if (process.platform !== "darwin" || typeof process.send !== "function") {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), RPA_MCP_CONTROL_TIMEOUT_MS);
        try {
            const response = await fetch(RPA_MCP_CONTROL_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": process.env.WEBOT_API_KEY || "yoko_test",
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            });
            return {
                ok: response.ok,
                status: response.status,
                payload: await response.json().catch(() => ({})),
            };
        }
        finally {
            clearTimeout(timer);
        }
    }
    const requestId = randomUUID();
    return new Promise((resolve, reject) => {
        const finish = (error, result) => {
            clearTimeout(timer);
            process.off("message", onMessage);
            if (error)
                reject(error);
            else
                resolve(result);
        };
        const onMessage = (message) => {
            if (message?.type !== "rpa:mcp-control-request:done" || message.requestId !== requestId)
                return;
            const transport = message.result || {};
            const status = Number(transport.status) || 503;
            let payload = {};
            try {
                payload = JSON.parse(String(transport.bodyText || "{}"));
            }
            catch { /* invalid body handled below */ }
            finish(undefined, {
                ok: transport.success === true && status >= 200 && status < 300,
                status,
                payload,
            });
        };
        const timer = setTimeout(() => finish(Object.assign(new Error("RPA MCP main-process bridge timed out"), { name: "AbortError" })), RPA_MCP_CONTROL_TIMEOUT_MS);
        process.on("message", onMessage);
        try {
            process.send({ type: "rpa:mcp-control-request", requestId, body });
        }
        catch (error) {
            finish(error instanceof Error ? error : new Error(String(error)));
        }
    });
}
function inferNativeEndpoint() {
    try {
        const url = new URL(RPA_MCP_CONTROL_URL);
        url.pathname = "/mcp";
        url.search = "";
        url.hash = "";
        return url.toString();
    }
    catch {
        return "http://127.0.0.1:9922/mcp";
    }
}
const RPA_MCP_ENDPOINT = inferNativeEndpoint();
/**
 * 跨平台对外 MCP 控制面。
 *
 * RPA 的原生 /mcp 是唯一数据面；YokoAgent 只保存用户的期望开关、调用 RPA
 * 控制接口并展示接入信息。RPA 尚未启动、正在更新或 Worker 重启时持续协调，
 * 不再启动 Agent 9933 legacy 网关，也不会复制维护 RPA 的工具定义或会话。
 */
export class McpGatewayServer {
    nativeRpa;
    nativeHealthy = false;
    nativeErrorCode = "";
    reconcileTimer;
    configRevision = 0;
    retryIndex = 0;
    pendingTokenRotation = false;
    // Initial recovery is fast; once stable (or after the fast window is exhausted),
    // a low-frequency localhost reconciliation keeps the desired state converged.
    nativeRetryDelaysMs = [1_000, 2_000, 4_000, 8_000];
    nativeSteadyRefreshMs = 15_000;
    // Keep the constructor shape stable for server.ts without retaining a runtime
    // dependency on Agent Core/session management.
    constructor(_legacyDeps) { }
    get url() {
        return this.nativeRpa?.endpoint || RPA_MCP_ENDPOINT;
    }
    get running() {
        return !!this.nativeRpa && this.nativeHealthy;
    }
    clearReconcileTimer() {
        if (this.reconcileTimer)
            clearTimeout(this.reconcileTimer);
        this.reconcileTimer = undefined;
    }
    isMcpRequested() {
        const cfg = ConfigManager.getInstance().getMcpGatewayConfig();
        return cfg.enabled || process.env.YOKO_MCP_ENABLED === "1";
    }
    nextRetryDelay() {
        const index = Math.min(this.retryIndex, this.nativeRetryDelaysMs.length - 1);
        const delay = this.nativeRetryDelaysMs[index] ?? this.nativeSteadyRefreshMs;
        this.retryIndex += 1;
        return this.retryIndex > this.nativeRetryDelaysMs.length
            ? this.nativeSteadyRefreshMs
            : delay;
    }
    scheduleReconcile(revision, delayMs) {
        this.clearReconcileTimer();
        if (revision !== this.configRevision || !this.isMcpRequested())
            return;
        this.reconcileTimer = setTimeout(() => {
            this.reconcileTimer = undefined;
            void this.reconcileNativeRpa(revision).catch((error) => {
                console.error("[McpGateway] native RPA MCP reconciliation failed:", error);
                if (revision === this.configRevision && this.isMcpRequested()) {
                    this.scheduleReconcile(revision, this.nextRetryDelay());
                }
            });
        }, delayMs);
        this.reconcileTimer.unref();
    }
    async updateNativeRpa(enabled, regenerateToken = false, expectedRevision) {
        try {
            const response = await postNativeControlThroughMain({
                enabled,
                regenerate_token: regenerateToken,
            });
            const payload = response.payload;
            // An enable request may finish after the user has turned exposure off.
            // Reassert the newer desired state so a late response cannot reopen MCP.
            if (enabled && expectedRevision !== undefined
                && expectedRevision !== this.configRevision && !this.isMcpRequested()) {
                await this.updateNativeRpa(false);
                return null;
            }
            if (!response.ok || payload.success !== true) {
                this.nativeErrorCode = payload.code || `HTTP_${response.status}`;
                this.nativeHealthy = false;
                return null;
            }
            if (!enabled) {
                this.nativeRpa = undefined;
                this.nativeHealthy = false;
                this.nativeErrorCode = "";
                return null;
            }
            if (!payload.endpoint || !payload.token || payload.mounted !== true) {
                this.nativeErrorCode = "INVALID_NATIVE_MCP_INFO";
                this.nativeHealthy = false;
                return null;
            }
            this.nativeRpa = payload;
            this.nativeHealthy = true;
            this.nativeErrorCode = "";
            return this.nativeRpa;
        }
        catch (error) {
            if (enabled && expectedRevision !== undefined
                && expectedRevision !== this.configRevision && !this.isMcpRequested()) {
                await this.updateNativeRpa(false);
                return null;
            }
            this.nativeErrorCode = error instanceof Error && error.name === "AbortError"
                ? "RPA_MCP_TIMEOUT"
                : "RPA_MCP_UNAVAILABLE";
            this.nativeHealthy = false;
            return null;
        }
    }
    async reconcileNativeRpa(revision) {
        if (revision !== this.configRevision || !this.isMcpRequested())
            return;
        const wasHealthy = this.nativeHealthy;
        const rotateToken = this.pendingTokenRotation;
        const native = await this.updateNativeRpa(true, rotateToken, revision);
        if (revision !== this.configRevision || !this.isMcpRequested())
            return;
        if (native) {
            this.pendingTokenRotation = false;
            this.retryIndex = 0;
            if (!wasHealthy) {
                console.log(`[McpGateway] using native RPA MCP at ${native.endpoint} (profile=${native.profile}, tools=${native.tool_count})`);
            }
            this.scheduleReconcile(revision, this.nativeSteadyRefreshMs);
            return;
        }
        const delayMs = this.nextRetryDelay();
        console.log(`[McpGateway] native RPA MCP is not ready (${this.nativeErrorCode}); retrying in ${delayMs}ms`);
        this.scheduleReconcile(revision, delayMs);
    }
    /** Apply the persisted desired state without ever opening a legacy MCP listener. */
    async applyConfig(options = {}) {
        const revision = ++this.configRevision;
        const enabled = this.isMcpRequested();
        this.clearReconcileTimer();
        if (!enabled) {
            this.pendingTokenRotation = false;
            await this.updateNativeRpa(false).catch(() => null);
            if (revision !== this.configRevision)
                return;
            this.nativeRpa = undefined;
            this.nativeHealthy = false;
            this.nativeErrorCode = "";
            this.retryIndex = 0;
            return;
        }
        if (options.regenerateToken === true)
            this.pendingTokenRotation = true;
        this.retryIndex = 0;
        await this.reconcileNativeRpa(revision);
    }
    async stop() {
        this.configRevision += 1;
        this.clearReconcileTimer();
        this.pendingTokenRotation = false;
        this.nativeRpa = undefined;
        this.nativeHealthy = false;
        this.nativeErrorCode = "";
        this.retryIndex = 0;
    }
    connectionState(enabled) {
        if (!enabled)
            return "off";
        if (this.running)
            return "ready";
        if (this.nativeErrorCode === "MCP_CONTROL_UNAVAILABLE" || this.nativeErrorCode === "HTTP_404") {
            return "update-required";
        }
        if (this.nativeErrorCode === "INVALID_NATIVE_MCP_INFO"
            || (this.nativeErrorCode.startsWith("HTTP_") && this.nativeErrorCode !== "HTTP_503")) {
            return "error";
        }
        return "connecting";
    }
    /** Snapshot consumed by the local settings page. */
    status() {
        const enabled = this.isMcpRequested() || !!this.nativeRpa;
        let nativePort = 9922;
        try {
            nativePort = Number(new URL(this.url).port) || 9922;
        }
        catch { /* fixed fallback */ }
        return {
            enabled,
            running: this.running,
            mode: enabled ? "native-rpa" : "off",
            connectionState: this.connectionState(enabled),
            errorCode: enabled && !this.running ? this.nativeErrorCode || undefined : undefined,
            url: this.url,
            port: nativePort,
            token: this.nativeRpa?.token || "",
            exposedSkills: ["wechat-rpa"],
            activeSessions: undefined,
            lastCalledAt: this.nativeRpa?.last_called_at ?? undefined,
            lastTool: this.nativeRpa?.last_tool ?? undefined,
            profile: this.nativeRpa?.profile,
            toolsetVersion: this.nativeRpa?.toolset_version,
            toolCount: this.nativeRpa?.tool_count,
            capabilities: this.nativeRpa?.capabilities || [],
        };
    }
}
let instance = null;
export function registerMcpGateway(gateway) {
    instance = gateway;
}
export function getMcpGatewayInstance() {
    return instance;
}
