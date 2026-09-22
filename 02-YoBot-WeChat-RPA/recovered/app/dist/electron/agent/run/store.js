import * as crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { AGENT_RUN_PRIVACY_VERSION, AGENT_RUN_SCHEMA_VERSION, assertResolvedAgentRunSpec, canTransitionAgentRun, isTerminalAgentRunStatus, } from "./contract.js";
const DEFAULT_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;
const DIGEST_PREFIX = "sha256:";
const RUN_LOCK_STALE_MS = 2 * 60 * 1_000;
const RUN_LOCK_UNINITIALIZED_STALE_MS = 10_000;
const RUN_LOCK_WAIT_MS = 10_000;
const MIN_AUTOMATIC_SWEEP_INTERVAL_MS = 60 * 1_000;
const MAX_AUTOMATIC_SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1_000;
function clone(value) {
    return structuredClone(value);
}
function digestIdentifier(value) {
    if (!value || value.startsWith(DIGEST_PREFIX))
        return value;
    return `${DIGEST_PREFIX}${crypto.createHash("sha256").update(value).digest("hex")}`;
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
/** Runtime specs may contain routing identifiers; durable records retain only stable digests. */
export function durableAgentRunSpec(spec) {
    const projected = clone(spec);
    if (projected.parentSessionId)
        projected.parentSessionId = digestIdentifier(projected.parentSessionId);
    if (projected.conversationKey) {
        projected.conversationKey.scopeId = digestIdentifier(projected.conversationKey.scopeId);
        projected.conversationKey.conversationId = digestIdentifier(projected.conversationKey.conversationId);
    }
    projected.capabilities.resourceScopes = projected.capabilities.resourceScopes
        .map((scope) => digestIdentifier(scope))
        .sort();
    if (projected.delivery.idempotencyKey) {
        projected.delivery.idempotencyKey = digestIdentifier(projected.delivery.idempotencyKey);
    }
    return projected;
}
function assertStoredRun(value, expectedRunId) {
    const stored = value;
    if (!stored
        || stored.schemaVersion !== AGENT_RUN_SCHEMA_VERSION
        || stored.record?.schemaVersion !== AGENT_RUN_SCHEMA_VERSION
        || stored.record.spec?.runId !== expectedRunId
        || !Array.isArray(stored.events)) {
        throw new Error(`Invalid or unsupported AgentRun record: ${expectedRunId}`);
    }
    // Early v1 records predate the explicit inbound marker. Upgrade them in memory before
    // validating and let readFile() persist the normalized, privacy-scrubbed representation.
    const legacyHarness = stored.record.spec.harness;
    if (legacyHarness && legacyHarness.agenticInbound === undefined) {
        legacyHarness.agenticInbound = stored.record.spec.source === "rpa"
            || stored.record.spec.source === "preview";
    }
    assertResolvedAgentRunSpec(stored.record.spec);
}
function eventTypeFor(status) {
    switch (status) {
        case "completed": return "run_completed";
        case "failed": return "run_failed";
        case "timed_out": return "run_timed_out";
        case "cancelled": return "run_cancelled";
        case "interrupted": return "run_interrupted";
        default: return "status_changed";
    }
}
/**
 * Versioned AgentRun state + append-only event trail.
 *
 * Active and terminal records are physically separated so startup recovery never scans the
 * complete history. Early v1 root-level files remain readable and are lazily privacy-scrubbed.
 */
export class AgentRunStore {
    baseDir;
    activeDir;
    terminalDir;
    lockDir;
    retentionMs;
    now;
    queues = new Map();
    terminalWritesSinceSweep = 0;
    sweepInFlight = false;
    nextAutomaticSweepAt = 0;
    constructor(options = {}) {
        this.baseDir = options.baseDir
            ?? path.join(process.env.USER_DATA_PATH || process.cwd(), "data", "agent_runs");
        this.activeDir = path.join(this.baseDir, "active");
        this.terminalDir = path.join(this.baseDir, "terminal");
        this.lockDir = path.join(this.baseDir, "locks");
        this.retentionMs = options.retentionMs ?? DEFAULT_RETENTION_MS;
        this.now = options.now ?? Date.now;
    }
    static newRunId() {
        return `run_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
    }
    validateRunId(runId) {
        if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(runId)) {
            throw new Error(`Invalid AgentRun id: ${runId}`);
        }
    }
    activePath(runId) {
        this.validateRunId(runId);
        return path.join(this.activeDir, `${runId}.json`);
    }
    terminalPath(runId) {
        this.validateRunId(runId);
        return path.join(this.terminalDir, `${runId}.json`);
    }
    legacyPath(runId) {
        this.validateRunId(runId);
        return path.join(this.baseDir, `${runId}.json`);
    }
    async withRunLock(runId, operation) {
        const previous = this.queues.get(runId) ?? Promise.resolve();
        let release;
        const gate = new Promise((resolve) => { release = resolve; });
        const tail = previous.then(() => gate, () => gate);
        this.queues.set(runId, tail);
        await previous.catch(() => undefined);
        let lock;
        try {
            lock = await this.acquireCrossProcessLock(runId);
            return await operation();
        }
        finally {
            if (lock) {
                try {
                    await lock.handle.close();
                }
                catch { /* best effort */ }
                try {
                    const owner = JSON.parse(await fs.readFile(lock.file, "utf8"));
                    if (owner.token === lock.token)
                        await fs.rm(lock.file, { force: true });
                }
                catch (error) {
                    if (error.code !== "ENOENT") {
                        console.error(`[AgentRunStore] Failed to release run lock ${runId}:`, error);
                    }
                }
            }
            release();
            if (this.queues.get(runId) === tail)
                this.queues.delete(runId);
        }
    }
    async acquireCrossProcessLock(runId) {
        this.validateRunId(runId);
        await fs.mkdir(this.lockDir, { recursive: true });
        const file = path.join(this.lockDir, `${runId}.lock`);
        const deadline = Date.now() + RUN_LOCK_WAIT_MS;
        for (;;) {
            try {
                const handle = await fs.open(file, "wx");
                const token = crypto.randomUUID();
                try {
                    await handle.writeFile(JSON.stringify({ pid: process.pid, createdAt: Date.now(), token }), "utf8");
                    await handle.sync();
                    return { file, handle, token };
                }
                catch (error) {
                    try {
                        await handle.close();
                    }
                    catch { /* best effort */ }
                    try {
                        await fs.rm(file, { force: true });
                    }
                    catch { /* best effort */ }
                    throw error;
                }
            }
            catch (error) {
                if (error.code !== "EEXIST")
                    throw error;
                try {
                    let ownerPid;
                    try {
                        const owner = JSON.parse(await fs.readFile(file, "utf8"));
                        if (typeof owner.pid === "number")
                            ownerPid = owner.pid;
                    }
                    catch {
                        // The owner can crash between exclusive create and writing its metadata.
                    }
                    const stat = await fs.stat(file);
                    const age = Date.now() - stat.mtimeMs;
                    if ((ownerPid !== undefined && !processIsAlive(ownerPid))
                        || age > RUN_LOCK_STALE_MS
                        || (ownerPid === undefined && age > RUN_LOCK_UNINITIALIZED_STALE_MS)) {
                        await fs.rm(file, { force: true });
                        continue;
                    }
                }
                catch (statError) {
                    if (statError.code === "ENOENT")
                        continue;
                }
                if (Date.now() >= deadline)
                    throw new Error(`Timed out acquiring AgentRun lock: ${runId}`);
                await new Promise((resolve) => setTimeout(resolve, 25));
            }
        }
    }
    async atomicWrite(target, stored) {
        const directory = path.dirname(target);
        await fs.mkdir(directory, { recursive: true });
        const temporary = path.join(directory, `.${path.basename(target)}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`);
        let handle;
        try {
            handle = await fs.open(temporary, "wx");
            await handle.writeFile(JSON.stringify(stored, null, 2), "utf8");
            await handle.sync();
            await handle.close();
            handle = undefined;
            await fs.rename(temporary, target);
        }
        catch (error) {
            if (handle) {
                try {
                    await handle.close();
                }
                catch { /* best effort */ }
            }
            try {
                await fs.rm(temporary, { force: true });
            }
            catch { /* best effort */ }
            throw error;
        }
    }
    async readFile(file, runId, persistPrivacyUpgrade = false) {
        try {
            const raw = await fs.readFile(file, "utf8");
            const parsed = JSON.parse(raw);
            assertStoredRun(parsed, runId);
            const stored = parsed;
            if (stored.privacyVersion !== AGENT_RUN_PRIVACY_VERSION) {
                stored.record.spec = durableAgentRunSpec(stored.record.spec);
                stored.privacyVersion = AGENT_RUN_PRIVACY_VERSION;
                if (persistPrivacyUpgrade)
                    await this.atomicWrite(file, stored);
            }
            return { file, stored };
        }
        catch (error) {
            if (error.code === "ENOENT")
                return null;
            throw error;
        }
    }
    async locateUnlocked(runId, persistPrivacyUpgrade = false) {
        for (const file of [this.activePath(runId), this.terminalPath(runId), this.legacyPath(runId)]) {
            const located = await this.readFile(file, runId, persistPrivacyUpgrade);
            if (located)
                return located;
        }
        return null;
    }
    async archiveTerminal(located) {
        if (!isTerminalAgentRunStatus(located.stored.record.status))
            return;
        const runId = located.stored.record.spec.runId;
        const target = this.terminalPath(runId);
        if (path.resolve(located.file) === path.resolve(target))
            return;
        await fs.mkdir(this.terminalDir, { recursive: true });
        const existing = await this.readFile(target, runId);
        if (existing) {
            if (existing.stored.record.revision >= located.stored.record.revision) {
                await fs.rm(located.file, { force: true });
                return;
            }
            // Windows rename replaces an existing target, so conflict arbitration must happen
            // before moving the file. Persist the newer revision explicitly on every platform.
            await this.atomicWrite(target, located.stored);
            await fs.rm(located.file, { force: true });
            this.maybeSweepExpired();
            return;
        }
        try {
            await fs.rename(located.file, target);
        }
        catch (error) {
            if (error.code !== "EEXIST")
                throw error;
            const raced = await this.readFile(target, runId);
            if (!raced || raced.stored.record.revision < located.stored.record.revision)
                throw error;
            await fs.rm(located.file, { force: true });
        }
        this.maybeSweepExpired();
    }
    maybeSweepExpired() {
        this.terminalWritesSinceSweep++;
        if (this.terminalWritesSinceSweep < 256 || this.sweepInFlight)
            return;
        const now = this.now();
        if (now < this.nextAutomaticSweepAt)
            return;
        this.terminalWritesSinceSweep = 0;
        // Retention is measured in days in production. At most one complete directory scan per
        // day avoids turning every 256 completions into O(history) stat churn on low-end Windows
        // machines, while manual/startup maintenance can still invoke pruneExpired directly.
        const sweepInterval = Math.min(MAX_AUTOMATIC_SWEEP_INTERVAL_MS, Math.max(MIN_AUTOMATIC_SWEEP_INTERVAL_MS, this.retentionMs / 30));
        this.nextAutomaticSweepAt = now + sweepInterval;
        this.sweepInFlight = true;
        void this.pruneExpired().catch((error) => {
            console.error("[AgentRunStore] Background retention sweep failed:", error);
        }).finally(() => {
            this.sweepInFlight = false;
        });
    }
    async create(spec, at = this.now(), owner) {
        assertResolvedAgentRunSpec(spec);
        return this.withRunLock(spec.runId, async () => {
            if (await this.locateUnlocked(spec.runId)) {
                throw new Error(`AgentRun already exists: ${spec.runId}`);
            }
            const immutableSpec = durableAgentRunSpec(spec);
            const record = {
                schemaVersion: AGENT_RUN_SCHEMA_VERSION,
                spec: immutableSpec,
                status: "queued",
                revision: 1,
                createdAt: at,
                updatedAt: at,
                owner: owner ? clone(owner) : undefined,
            };
            const created = {
                schemaVersion: AGENT_RUN_SCHEMA_VERSION,
                id: `${spec.runId}:1`,
                runId: spec.runId,
                seq: 1,
                type: "run_created",
                toStatus: "queued",
                createdAt: at,
            };
            await this.atomicWrite(this.activePath(spec.runId), {
                schemaVersion: AGENT_RUN_SCHEMA_VERSION,
                privacyVersion: AGENT_RUN_PRIVACY_VERSION,
                record,
                events: [created],
            });
            return clone(record);
        });
    }
    async load(runId) {
        return this.withRunLock(runId, async () => {
            const located = await this.locateUnlocked(runId, true);
            return located ? clone(located.stored.record) : null;
        });
    }
    async events(runId) {
        return this.withRunLock(runId, async () => {
            const located = await this.locateUnlocked(runId, true);
            return located ? clone(located.stored.events) : [];
        });
    }
    async jsonFiles(directory) {
        try {
            return (await fs.readdir(directory))
                .filter((name) => name.endsWith(".json"))
                .map((name) => path.join(directory, name));
        }
        catch (error) {
            if (error.code === "ENOENT")
                return [];
            throw error;
        }
    }
    async recordsFrom(files) {
        const records = [];
        for (const file of files) {
            const runId = path.basename(file, ".json");
            try {
                const located = await this.readFile(file, runId);
                if (located)
                    records.push(clone(located.stored.record));
            }
            catch (error) {
                console.error(`[AgentRunStore] Failed to read ${file}:`, error);
            }
        }
        return records;
    }
    /** Full history for diagnostics only. Startup recovery must use listNonTerminal(). */
    async list() {
        const files = [
            ...await this.jsonFiles(this.activeDir),
            ...await this.jsonFiles(this.terminalDir),
            ...await this.jsonFiles(this.baseDir),
        ];
        const byId = new Map();
        for (const record of await this.recordsFrom(files)) {
            const previous = byId.get(record.spec.runId);
            if (!previous || record.revision > previous.revision)
                byId.set(record.spec.runId, record);
        }
        return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
    }
    /** Bounded startup path: terminal history is never enumerated. */
    async listNonTerminal() {
        const files = [
            ...await this.jsonFiles(this.activeDir),
            ...await this.jsonFiles(this.baseDir),
        ];
        const records = [];
        for (const file of files) {
            const runId = path.basename(file, ".json");
            try {
                await this.withRunLock(runId, async () => {
                    const located = await this.readFile(file, runId, true);
                    if (!located)
                        return;
                    if (isTerminalAgentRunStatus(located.stored.record.status)) {
                        await this.archiveTerminal(located);
                        return;
                    }
                    records.push(clone(located.stored.record));
                });
            }
            catch (error) {
                console.error(`[AgentRunStore] Failed to inspect active run ${file}:`, error);
            }
        }
        return records.sort((a, b) => b.createdAt - a.createdAt);
    }
    async pruneExpired(at = this.now()) {
        if (!Number.isFinite(this.retentionMs) || this.retentionMs < 0)
            return 0;
        const cutoff = at - this.retentionMs;
        let removed = 0;
        for (const file of await this.jsonFiles(this.terminalDir)) {
            try {
                // Terminal files are immutable after archive, so mtime is their durable finish
                // time. Retention never needs to parse the complete historical JSON corpus.
                if ((await fs.stat(file)).mtimeMs <= cutoff) {
                    await fs.rm(file, { force: true });
                    removed++;
                }
            }
            catch (error) {
                console.error(`[AgentRunStore] Failed to prune ${file}:`, error);
            }
        }
        return removed;
    }
    async heartbeat(runId, owner, at = this.now()) {
        return this.withRunLock(runId, async () => {
            const located = await this.locateUnlocked(runId, true);
            if (!located || isTerminalAgentRunStatus(located.stored.record.status))
                return false;
            if (located.stored.record.owner?.runtimeId !== owner.runtimeId)
                return false;
            located.stored.record.owner = clone(owner);
            located.stored.record.revision++;
            located.stored.record.updatedAt = at;
            await this.atomicWrite(located.file, located.stored);
            return true;
        });
    }
    async transition(runId, toStatus, options = {}) {
        return this.withRunLock(runId, async () => {
            const located = await this.locateUnlocked(runId, true);
            if (!located)
                throw new Error(`AgentRun not found: ${runId}`);
            const stored = located.stored;
            if (options.ownerRuntimeId !== undefined
                && stored.record.owner?.runtimeId !== options.ownerRuntimeId) {
                throw new Error(`AgentRun owner changed: ${runId}`);
            }
            const fromStatus = stored.record.status;
            if (!canTransitionAgentRun(fromStatus, toStatus)) {
                throw new Error(`Invalid AgentRun transition: ${fromStatus} -> ${toStatus}`);
            }
            const at = options.at ?? this.now();
            stored.record.status = toStatus;
            stored.record.revision++;
            stored.record.updatedAt = at;
            if (toStatus === "running" && stored.record.startedAt === undefined)
                stored.record.startedAt = at;
            if (isTerminalAgentRunStatus(toStatus))
                stored.record.finishedAt = at;
            if (options.outcome !== undefined)
                stored.record.outcome = clone(options.outcome);
            if (options.error !== undefined)
                stored.record.error = clone(options.error);
            const seq = (stored.events[stored.events.length - 1]?.seq ?? 0) + 1;
            stored.events.push({
                schemaVersion: AGENT_RUN_SCHEMA_VERSION,
                id: `${runId}:${seq}`,
                runId,
                seq,
                type: options.eventType ?? eventTypeFor(toStatus),
                fromStatus,
                toStatus,
                createdAt: at,
                payload: options.payload ? clone(options.payload) : undefined,
            });
            stored.privacyVersion = AGENT_RUN_PRIVACY_VERSION;
            await this.atomicWrite(located.file, stored);
            if (isTerminalAgentRunStatus(toStatus)) {
                try {
                    await this.archiveTerminal({ file: located.file, stored });
                }
                catch (error) {
                    // The terminal state is already durable. Archival failure must not change the
                    // execution outcome; the next startup will move this file out of active/.
                    console.error(`[AgentRunStore] Failed to archive terminal run ${runId}:`, error);
                }
            }
            return clone(stored.record);
        });
    }
}
