import fs from "fs-extra";
import * as path from "path";
import { Cron } from "croner";
import { isHeartbeatContentEffectivelyEmpty, resolveHeartbeatPrompt } from "./utils.js";
import { HEARTBEAT_FILE_NAME } from "./constants.js";
const USER_DATA_PATH = process.env.USER_DATA_PATH || process.cwd();
const WORKSPACE_ROOT = path.resolve(USER_DATA_PATH, "workspace");
const HEARTBEAT_PATH = path.join(WORKSPACE_ROOT, HEARTBEAT_FILE_NAME);
export class HeartbeatManager {
    agent;
    job = null;
    running = false;
    wakeTimer = null;
    pendingReason = null;
    constructor(agent) {
        this.agent = agent;
    }
    start(cronExpr = "0 */30 * * * *") {
        if (this.job)
            this.job.stop();
        console.log(`[Heartbeat] Starting with schedule: ${cronExpr}`);
        this.job = new Cron(cronExpr, {
            name: "system-heartbeat",
            protect: true // Prevent overlapping executions
        }, async () => {
            await this.tick("interval");
        });
    }
    stop() {
        if (this.job) {
            this.job.stop();
            this.job = null;
            console.log("[Heartbeat] Stopped.");
        }
        if (this.wakeTimer) {
            clearTimeout(this.wakeTimer);
            this.wakeTimer = null;
        }
        this.pendingReason = null;
    }
    requestNow(reason = "wake", coalesceMs = 250) {
        const normalizedReason = this.normalizeReason(reason);
        this.mergePendingReason(normalizedReason);
        const delay = Number.isFinite(coalesceMs) ? Math.max(0, coalesceMs) : 0;
        if (this.wakeTimer) {
            return;
        }
        this.wakeTimer = setTimeout(async () => {
            this.wakeTimer = null;
            const pendingReason = this.pendingReason ?? "wake";
            this.pendingReason = null;
            await this.tick(pendingReason);
        }, delay);
        this.wakeTimer.unref?.();
    }
    async tick(reason = "interval") {
        const normalizedReason = this.normalizeReason(reason);
        if (this.running) {
            this.mergePendingReason(normalizedReason);
            return;
        }
        this.running = true;
        try {
            const shouldBypassFileGate = this.shouldBypassFileGate(normalizedReason);
            if (!shouldBypassFileGate) {
                const exists = await fs.pathExists(HEARTBEAT_PATH);
                if (!exists) {
                    return;
                }
                const content = await fs.readFile(HEARTBEAT_PATH, "utf-8");
                if (isHeartbeatContentEffectivelyEmpty(content)) {
                    return;
                }
            }
            console.log(`[Heartbeat] Triggering agent... (reason: ${normalizedReason})`);
            const sessionId = "system__heartbeat";
            const response = await this.agent.run(resolveHeartbeatPrompt(), [], sessionId);
            console.log(`[Heartbeat] Agent Response: ${response.slice(0, 100)}...`);
        }
        catch (error) {
            console.error("[Heartbeat] Error during tick:", error);
        }
        finally {
            this.running = false;
            if (this.pendingReason && !this.wakeTimer) {
                this.requestNow(this.pendingReason, 0);
            }
        }
    }
    normalizeReason(reason) {
        const normalized = typeof reason === "string" ? reason.trim() : "";
        return normalized || "wake";
    }
    mergePendingReason(reason) {
        if (!this.pendingReason) {
            this.pendingReason = reason;
            return;
        }
        if (this.pendingReason === "interval" && reason !== "interval") {
            this.pendingReason = reason;
        }
    }
    shouldBypassFileGate(reason) {
        if (reason.startsWith("cron:"))
            return true;
        if (reason.startsWith("exec"))
            return true;
        if (reason.startsWith("hook"))
            return true;
        if (reason === "wake")
            return true;
        return false;
    }
}
