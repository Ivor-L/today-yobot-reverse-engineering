import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
const IDEMPOTENCY_SCHEMA_VERSION = 1;
const DEFAULT_LEASE_MS = 5 * 60 * 1000;
const DEFAULT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export class AgenticIdempotencyStoreError extends Error {
    filePath;
    constructor(message, filePath) {
        super(message);
        this.filePath = filePath;
        this.name = "AgenticIdempotencyStoreError";
    }
}
function cloneEvents(events) {
    return structuredClone(events);
}
export class AgenticIdempotencyStore {
    baseDir;
    leaseMs;
    retentionMs;
    now;
    operations = 0;
    constructor(baseDir = path.join(process.env.USER_DATA_PATH || process.cwd(), "data", "agentic_idempotency"), options = {}) {
        this.baseDir = baseDir;
        this.leaseMs = options.leaseMs ?? options.ttlMs ?? DEFAULT_LEASE_MS;
        this.retentionMs = options.retentionMs ?? options.ttlMs ?? DEFAULT_RETENTION_MS;
        this.now = options.now ?? Date.now;
    }
    digest(key) {
        return crypto.createHash("sha256").update(key).digest("hex");
    }
    filePathForDigest(digest) {
        return path.join(this.baseDir, `${digest}.json`);
    }
    read(key) {
        const digest = this.digest(key);
        const file = this.filePathForDigest(digest);
        if (!fs.existsSync(file))
            return undefined;
        let parsed;
        try {
            parsed = JSON.parse(fs.readFileSync(file, "utf8"));
        }
        catch (error) {
            throw new AgenticIdempotencyStoreError(`幂等状态损坏，已保留原文件并拒绝重复执行：${error instanceof Error ? error.message : String(error)}`, file);
        }
        if (parsed.version !== IDEMPOTENCY_SCHEMA_VERSION
            || parsed.keyDigest !== digest
            || !["in_progress", "completed", "uncertain"].includes(String(parsed.status))
            || !Array.isArray(parsed.events)
            || !Number.isFinite(parsed.expiresAt)) {
            throw new AgenticIdempotencyStoreError("幂等状态结构无效，已保留原文件并拒绝重复执行。", file);
        }
        const entry = parsed;
        if (entry.expiresAt <= this.now()) {
            if (entry.status === "in_progress") {
                // A crashed process may already have invoked tools. Lease expiry is not proof
                // that execution was side-effect free, so convert to a durable uncertain state.
                entry.status = "uncertain";
                entry.updatedAt = this.now();
                entry.expiresAt = entry.updatedAt + this.retentionMs;
                this.write(entry);
                return entry;
            }
            try {
                fs.unlinkSync(file);
            }
            catch { /* expiry cleanup is best effort */ }
            return undefined;
        }
        return entry;
    }
    write(entry) {
        fs.mkdirSync(this.baseDir, { recursive: true });
        const target = this.filePathForDigest(entry.keyDigest);
        const temporary = path.join(this.baseDir, `.${path.basename(target)}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`);
        let descriptor;
        try {
            descriptor = fs.openSync(temporary, "wx");
            fs.writeFileSync(descriptor, JSON.stringify(entry, null, 2), "utf8");
            fs.fsyncSync(descriptor);
            fs.closeSync(descriptor);
            descriptor = undefined;
            fs.renameSync(temporary, target);
        }
        catch (error) {
            if (descriptor !== undefined) {
                try {
                    fs.closeSync(descriptor);
                }
                catch { /* best effort */ }
            }
            try {
                if (fs.existsSync(temporary))
                    fs.unlinkSync(temporary);
            }
            catch { /* best effort */ }
            throw new AgenticIdempotencyStoreError(`无法持久化幂等状态：${error instanceof Error ? error.message : String(error)}`, target);
        }
    }
    /**
     * Atomically publishes the first in-progress claim. `wx` is intentional: during a
     * rolling restart an old and a new process may see the key at the same time, but
     * only one process is allowed to create the durable claim file.
     */
    createClaim(entry) {
        fs.mkdirSync(this.baseDir, { recursive: true });
        const target = this.filePathForDigest(entry.keyDigest);
        let descriptor;
        try {
            descriptor = fs.openSync(target, "wx");
            fs.writeFileSync(descriptor, JSON.stringify(entry, null, 2), "utf8");
            fs.fsyncSync(descriptor);
            fs.closeSync(descriptor);
            return true;
        }
        catch (error) {
            if (descriptor !== undefined) {
                try {
                    fs.closeSync(descriptor);
                }
                catch { /* best effort */ }
            }
            if (error.code === "EEXIST")
                return false;
            // A partial claim is deliberately preserved. Retrying it as a missing key
            // could duplicate a model/tool side effect; read() will fail closed instead.
            throw new AgenticIdempotencyStoreError(`无法建立排他幂等状态：${error instanceof Error ? error.message : String(error)}`, target);
        }
    }
    lookup(key) {
        const entry = this.read(key);
        if (!entry)
            return { state: "missing" };
        if (entry.status === "completed") {
            return { state: "completed", events: cloneEvents(entry.events) };
        }
        return { state: "busy", status: entry.status, expiresAt: entry.expiresAt };
    }
    claim(key) {
        const existing = this.lookup(key);
        if (existing.state !== "missing")
            return existing;
        const now = this.now();
        const entry = {
            version: IDEMPOTENCY_SCHEMA_VERSION,
            keyDigest: this.digest(key),
            status: "in_progress",
            createdAt: now,
            updatedAt: now,
            expiresAt: now + this.leaseMs,
            events: [],
        };
        if (!this.createClaim(entry))
            return this.lookup(key);
        this.maybeSweepExpired();
        return { state: "missing" };
    }
    append(key, event) {
        const entry = this.read(key);
        if (!entry || entry.status !== "in_progress") {
            throw new AgenticIdempotencyStoreError("幂等请求未处于可追加状态，拒绝产生无法去重的回复。", this.filePathForDigest(this.digest(key)));
        }
        const deliveryId = event.deliveryId || crypto.createHash("sha256")
            .update(`${entry.keyDigest}:${entry.events.length + 1}`)
            .digest("hex");
        const durableEvent = { ...event, deliveryId };
        entry.events.push(durableEvent);
        entry.updatedAt = this.now();
        entry.expiresAt = entry.updatedAt + this.leaseMs;
        this.write(entry);
        return structuredClone(durableEvent);
    }
    complete(key) {
        const entry = this.read(key);
        if (!entry || entry.status !== "in_progress")
            return;
        entry.status = "completed";
        entry.updatedAt = this.now();
        entry.expiresAt = entry.updatedAt + this.retentionMs;
        this.write(entry);
    }
    fail(key, uncertainTtlMs = this.retentionMs) {
        const entry = this.read(key);
        if (!entry)
            return;
        // The model/tool execution may already have produced an external side effect even when no
        // response event was emitted. Preserve uncertainty and reject retries until expiry.
        entry.status = "uncertain";
        entry.updatedAt = this.now();
        const boundedTtl = Number.isFinite(uncertainTtlMs) && uncertainTtlMs > 0
            ? uncertainTtlMs
            : this.retentionMs;
        entry.expiresAt = entry.updatedAt + boundedTtl;
        this.write(entry);
    }
    /** Release a claim only when model/tool execution has definitely not started. */
    release(key) {
        const entry = this.read(key);
        if (!entry || entry.status !== "in_progress" || entry.events.length > 0)
            return;
        try {
            fs.unlinkSync(this.filePathForDigest(entry.keyDigest));
        }
        catch { /* best effort */ }
    }
    maybeSweepExpired() {
        this.operations++;
        if (this.operations % 100 !== 0)
            return;
        let names;
        try {
            names = fs.readdirSync(this.baseDir).filter((name) => name.endsWith(".json"));
        }
        catch {
            return;
        }
        for (const name of names) {
            const file = path.join(this.baseDir, name);
            try {
                const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
                if (Number(parsed.expiresAt) <= this.now()) {
                    if (parsed.status === "in_progress") {
                        const entry = parsed;
                        entry.status = "uncertain";
                        entry.updatedAt = this.now();
                        entry.expiresAt = entry.updatedAt + this.retentionMs;
                        this.write(entry);
                    }
                    else {
                        fs.unlinkSync(file);
                    }
                }
            }
            catch { /* corrupt state must be preserved for diagnosis */ }
        }
    }
}
