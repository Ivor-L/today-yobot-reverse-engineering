import * as crypto from "node:crypto";
import { AgentRunService } from "./service.js";
export function resolveAgentRunRolloutMode(value = process.env.YOKO_AGENT_RUN_MODE) {
    const normalized = String(value || "off").trim().toLowerCase();
    if (normalized === "shadow" || normalized === "active")
        return normalized;
    return "off";
}
class DisabledShadowHandle {
    complete() { }
    fail() { }
    async settled() { }
}
class StoreShadowHandle {
    store;
    spec;
    owner;
    onSettled;
    tail;
    closed = false;
    available = true;
    constructor(store, spec, owner, onSettled) {
        this.store = store;
        this.spec = spec;
        this.owner = owner;
        this.onSettled = onSettled;
        this.tail = this.step(async () => {
            await this.store.create(this.spec, Date.now(), this.owner);
            await this.store.transition(this.spec.runId, "running", {
                payload: { observationMode: "shadow" },
                ownerRuntimeId: this.owner.runtimeId,
            });
        });
    }
    step(operation) {
        return Promise.resolve().then(async () => {
            if (!this.available)
                return;
            try {
                await operation();
            }
            catch (error) {
                this.available = false;
                console.error(`[AgentRunShadow] ${this.spec.runId} observation failed:`, error);
            }
        });
    }
    close(operation) {
        if (this.closed)
            return;
        this.closed = true;
        this.tail = this.tail.then(() => this.step(operation));
        void this.tail.finally(() => this.onSettled(this));
    }
    complete(outcome = {}) {
        this.close(async () => {
            await this.store.transition(this.spec.runId, "verifying", {
                payload: { observationMode: "shadow", verifierExecuted: false },
                ownerRuntimeId: this.owner.runtimeId,
            });
            await this.store.transition(this.spec.runId, "completed", {
                outcome: { ...outcome, output: undefined },
                payload: { observationMode: "shadow" },
                ownerRuntimeId: this.owner.runtimeId,
            });
        });
    }
    fail(error, failure = {}) {
        const message = error instanceof Error ? error.message : String(error);
        this.close(async () => {
            await this.store.transition(this.spec.runId, "failed", {
                error: {
                    code: failure.code || "observed_execution_failed",
                    message,
                    retryable: failure.retryable ?? true,
                },
                payload: { observationMode: "shadow" },
                ownerRuntimeId: this.owner.runtimeId,
            });
        });
    }
    async settled() {
        await this.tail;
    }
}
/** Best-effort lifecycle observer. It never invokes a model or tool and never blocks the live reply. */
export class AgentRunShadowRecorder {
    store;
    mode;
    active = new Set();
    runtimeId = crypto.randomUUID();
    constructor(store, mode = resolveAgentRunRolloutMode()) {
        this.store = store;
        this.mode = mode;
    }
    get enabled() {
        return this.mode === "shadow";
    }
    begin(spec) {
        if (this.mode !== "shadow")
            return new DisabledShadowHandle();
        const handle = new StoreShadowHandle(this.store, spec, { runtimeId: this.runtimeId, pid: process.pid, leaseExpiresAt: Number.MAX_SAFE_INTEGER }, (finished) => this.active.delete(finished));
        this.active.add(handle);
        return handle;
    }
    async reconcileInterruptedRuns() {
        if (this.mode !== "shadow")
            return [];
        try {
            return await new AgentRunService(this.store).reconcileInterruptedRuns();
        }
        catch (error) {
            console.error("[AgentRunShadow] Startup reconciliation failed:", error);
            return [];
        }
    }
    async flush() {
        await Promise.all([...this.active].map((handle) => handle.settled()));
    }
}
