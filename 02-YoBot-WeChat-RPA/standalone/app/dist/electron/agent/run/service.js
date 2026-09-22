import * as crypto from "node:crypto";
import { isTerminalAgentRunStatus, } from "./contract.js";
import { AgentRunBudgetExceededError } from "./budget.js";
export class AgentRunExecutionError extends Error {
    runId;
    code;
    retryable;
    executionStarted;
    constructor(runId, code, message, retryable, cause, executionStarted = true) {
        super(message);
        this.runId = runId;
        this.code = code;
        this.retryable = retryable;
        this.executionStarted = executionStarted;
        this.name = "AgentRunExecutionError";
        if (cause !== undefined)
            this.cause = cause;
    }
}
class RunTimeoutSignal extends Error {
}
class RunCancelledSignal extends Error {
}
class RunVerificationSignal extends Error {
}
const DEFAULT_OWNER_LEASE_MS = 5 * 60 * 1_000;
const DEFAULT_OWNER_HEARTBEAT_MS = 60 * 1_000;
function immutableClone(value) {
    const cloned = structuredClone(value);
    const freeze = (item) => {
        if (!item || typeof item !== "object" || Object.isFrozen(item))
            return;
        Object.freeze(item);
        for (const child of Object.values(item))
            freeze(child);
    };
    freeze(cloned);
    return cloned;
}
function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
}
function processIsAlive(pid) {
    if (!Number.isInteger(pid) || pid <= 0)
        return false;
    try {
        process.kill(pid, 0);
        return true;
    }
    catch (error) {
        return error.code === "EPERM";
    }
}
/**
 * Shared lifecycle boundary for every future entry point (RPA/direct/preview/task worker).
 * Phase 1 intentionally leaves existing traffic untouched; adapters can migrate one by one.
 */
export class AgentRunService {
    store;
    active = new Map();
    persistOutput;
    onDurabilityDegraded;
    runtimeId;
    ownerLeaseMs;
    ownerHeartbeatMs;
    constructor(store, options = {}) {
        this.store = store;
        this.persistOutput = options.persistOutput === true;
        this.onDurabilityDegraded = options.onDurabilityDegraded;
        this.runtimeId = options.runtimeId ?? crypto.randomUUID();
        this.ownerLeaseMs = options.ownerLeaseMs ?? DEFAULT_OWNER_LEASE_MS;
        this.ownerHeartbeatMs = options.ownerHeartbeatMs ?? DEFAULT_OWNER_HEARTBEAT_MS;
    }
    owner(at = Date.now()) {
        return { runtimeId: this.runtimeId, pid: process.pid, leaseExpiresAt: at + this.ownerLeaseMs };
    }
    durabilityDegraded(runId, stage, error) {
        console.error(`[AgentRun] ${runId} ${stage} state could not be persisted after execution:`, error);
        try {
            this.onDurabilityDegraded?.({ runId, stage, error });
        }
        catch { /* diagnostics only */ }
    }
    async execute(spec, executor, verifier) {
        const immutableSpec = immutableClone(spec);
        try {
            await this.store.create(spec, Date.now(), this.owner());
        }
        catch (error) {
            throw new AgentRunExecutionError(spec.runId, "run_state_unavailable", messageOf(error), true, error, false);
        }
        const controller = new AbortController();
        let rejectCancellation;
        const cancellation = new Promise((_resolve, reject) => {
            rejectCancellation = reject;
        });
        // A cancellation can arrive while the first durable transition is in progress.
        cancellation.catch(() => undefined);
        let markSettled;
        const settled = new Promise((resolve) => { markSettled = resolve; });
        const activeRun = {
            controller,
            cancel: () => {
                const reason = new RunCancelledSignal("AgentRun cancelled.");
                rejectCancellation(reason);
                controller.abort(reason);
            },
            settled,
            markSettled,
        };
        this.active.set(spec.runId, activeRun);
        activeRun.heartbeat = setInterval(() => {
            void this.store.heartbeat(spec.runId, this.owner()).then((owned) => {
                if (!owned && this.active.get(spec.runId) === activeRun)
                    activeRun.cancel();
            }).catch((error) => {
                console.error(`[AgentRun] Failed to renew owner lease for ${spec.runId}:`, error);
            });
        }, this.ownerHeartbeatMs);
        activeRun.heartbeat.unref?.();
        let timeoutHandle;
        let deadline;
        if (spec.limits.deadlineAt !== undefined) {
            const remaining = Math.max(0, spec.limits.deadlineAt - Date.now());
            deadline = new Promise((_resolve, reject) => {
                timeoutHandle = setTimeout(() => {
                    const reason = new RunTimeoutSignal("AgentRun deadline exceeded.");
                    reject(reason);
                    controller.abort(reason);
                }, Math.min(remaining, 2_147_483_647));
            });
            deadline.catch(() => undefined);
        }
        const interruptible = (operation) => Promise.race([
            operation,
            cancellation,
            ...(deadline ? [deadline] : []),
        ]);
        let executorStarted = false;
        try {
            if (spec.limits.deadlineAt !== undefined && spec.limits.deadlineAt <= Date.now()) {
                throw new RunTimeoutSignal("AgentRun deadline exceeded before execution.");
            }
            let lastDurableRecord = await this.store.transition(spec.runId, "running", {
                ownerRuntimeId: this.runtimeId,
            });
            const context = {
                spec: immutableSpec,
                signal: controller.signal,
                setWaitingStatus: async (status) => {
                    await this.store.transition(spec.runId, status, { ownerRuntimeId: this.runtimeId });
                },
                resume: async () => {
                    const current = await this.store.load(spec.runId);
                    if (!current)
                        throw new Error(`AgentRun not found: ${spec.runId}`);
                    if (current.status !== "waiting_approval" && current.status !== "waiting_input") {
                        throw new Error(`AgentRun cannot resume from ${current.status}`);
                    }
                    await this.store.transition(spec.runId, "running", { ownerRuntimeId: this.runtimeId });
                },
            };
            executorStarted = true;
            const result = await interruptible(Promise.resolve().then(() => executor(context)));
            let durability = "durable";
            try {
                lastDurableRecord = await this.store.transition(spec.runId, "verifying", {
                    ownerRuntimeId: this.runtimeId,
                });
            }
            catch (error) {
                // The executor may already have invoked external tools. Losing an audit transition
                // cannot turn that successful execution into a retryable execution failure.
                durability = "degraded";
                this.durabilityDegraded(spec.runId, "verifying", error);
            }
            let verification;
            if (verifier) {
                verification = await interruptible(Promise.resolve(verifier(result, {
                    spec: immutableSpec,
                    signal: controller.signal,
                })));
                if (!verification.passed) {
                    throw new RunVerificationSignal(verification.summary || "AgentRun verification failed.");
                }
            }
            const { output, ...durableResult } = result;
            const outcome = {
                ...durableResult,
                ...(this.persistOutput ? { output } : {}),
                verification,
            };
            try {
                const record = await this.store.transition(spec.runId, "completed", {
                    outcome,
                    ownerRuntimeId: this.runtimeId,
                });
                return { record, result, durability };
            }
            catch (error) {
                durability = "degraded";
                this.durabilityDegraded(spec.runId, "completed", error);
                const at = Date.now();
                const record = {
                    ...lastDurableRecord,
                    status: "completed",
                    revision: lastDurableRecord.revision + 1,
                    updatedAt: at,
                    finishedAt: at,
                    outcome,
                    error: undefined,
                };
                return { record, result, durability };
            }
        }
        catch (error) {
            let status = "failed";
            let code = "executor_failed";
            let retryable = true;
            if (error instanceof RunTimeoutSignal) {
                status = "timed_out";
                code = "deadline_exceeded";
            }
            else if (error instanceof RunCancelledSignal) {
                status = "cancelled";
                code = "cancelled";
                retryable = false;
            }
            else if (error instanceof RunVerificationSignal) {
                code = "verification_failed";
                retryable = false;
            }
            else if (error instanceof AgentRunBudgetExceededError) {
                code = error.code;
                retryable = false;
            }
            else if (!executorStarted) {
                status = "interrupted";
                code = "run_state_unavailable";
            }
            try {
                const current = await this.store.load(spec.runId);
                if (current && !isTerminalAgentRunStatus(current.status)) {
                    await this.store.transition(spec.runId, status, {
                        error: { code, message: messageOf(error), retryable },
                        ownerRuntimeId: this.runtimeId,
                    });
                }
            }
            catch (persistenceError) {
                console.error(`[AgentRun] Failed to persist ${status} for ${spec.runId}:`, persistenceError);
            }
            throw new AgentRunExecutionError(spec.runId, code, messageOf(error), retryable, error, executorStarted);
        }
        finally {
            if (timeoutHandle)
                clearTimeout(timeoutHandle);
            if (activeRun.heartbeat)
                clearInterval(activeRun.heartbeat);
            if (this.active.get(spec.runId) === activeRun)
                this.active.delete(spec.runId);
            activeRun.markSettled();
        }
    }
    async cancel(runId) {
        const active = this.active.get(runId);
        if (active) {
            active.cancel();
            // Do not await settlement here. A cancellation request can originate from the
            // running executor itself; waiting for execute() to settle would then self-deadlock.
            return true;
        }
        const record = await this.store.load(runId);
        if (!record || isTerminalAgentRunStatus(record.status))
            return false;
        if (record.owner
            && record.owner.runtimeId !== this.runtimeId
            && record.owner.leaseExpiresAt > Date.now()
            && processIsAlive(record.owner.pid))
            return false;
        await this.store.transition(runId, "cancelled", {
            error: { code: "cancelled", message: "AgentRun cancelled.", retryable: false },
            ownerRuntimeId: record.owner?.runtimeId,
        });
        return true;
    }
    /** Marks runs left non-terminal by a previous process as interrupted on startup. */
    async reconcileInterruptedRuns(at = Date.now()) {
        const interrupted = [];
        for (const record of await this.store.listNonTerminal()) {
            if (record.owner
                && record.owner.runtimeId !== this.runtimeId
                && record.owner.leaseExpiresAt > at
                && processIsAlive(record.owner.pid))
                continue;
            await this.store.transition(record.spec.runId, "interrupted", {
                at,
                error: {
                    code: "process_restarted",
                    message: "AgentRun was interrupted by process restart.",
                    retryable: true,
                },
                ownerRuntimeId: record.owner?.runtimeId,
            });
            interrupted.push(record.spec.runId);
        }
        // Retention is maintenance, not a startup dependency. Recovery only waits for active
        // records; terminal history is swept without delaying the service becoming available.
        void this.store.pruneExpired(at).catch((error) => {
            console.error("[AgentRun] Background retention sweep failed:", error);
        });
        return interrupted;
    }
}
