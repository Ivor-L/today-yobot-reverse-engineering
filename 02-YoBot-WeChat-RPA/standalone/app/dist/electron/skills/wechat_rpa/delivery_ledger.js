import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
const DELIVERY_LEDGER_VERSION = 1;
const DEFAULT_LEASE_MS = 10 * 60 * 1000;
const DEFAULT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export class RpaDeliveryLedgerError extends Error {
    filePath;
    constructor(message, filePath) {
        super(message);
        this.filePath = filePath;
        this.name = "RpaDeliveryLedgerError";
    }
}
function digest(value) {
    return crypto.createHash("sha256").update(value).digest("hex");
}
function descriptorDigest(descriptor) {
    return digest(JSON.stringify({
        channel: descriptor.channel || "wechat-rpa",
        accountId: descriptor.accountId || "",
        target: descriptor.target,
        text: descriptor.text,
    }));
}
/**
 * Durable, privacy-minimal outbox ledger for direct WeChat RPA sends.
 * Raw idempotency keys, recipients and message bodies are never persisted.
 */
export class RpaDeliveryLedger {
    baseDir;
    leaseMs;
    retentionMs;
    now;
    operations = 0;
    constructor(baseDir = path.join(process.env.USER_DATA_PATH || process.cwd(), "data", "rpa_delivery_ledger"), options = {}) {
        this.baseDir = baseDir;
        this.leaseMs = options.leaseMs ?? DEFAULT_LEASE_MS;
        this.retentionMs = options.retentionMs ?? DEFAULT_RETENTION_MS;
        this.now = options.now ?? Date.now;
    }
    filePath(keyDigest) {
        return path.join(this.baseDir, `${keyDigest}.json`);
    }
    readDigest(keyDigest) {
        const file = this.filePath(keyDigest);
        if (!fs.existsSync(file))
            return undefined;
        let value;
        try {
            value = JSON.parse(fs.readFileSync(file, "utf8"));
        }
        catch (error) {
            throw new RpaDeliveryLedgerError(`微信投递账本损坏，已保留原文件并拒绝重复发送：${error instanceof Error ? error.message : String(error)}`, file);
        }
        if (value.version !== DELIVERY_LEDGER_VERSION
            || value.keyDigest !== keyDigest
            || typeof value.payloadDigest !== "string"
            || !["in_progress", "completed", "uncertain"].includes(String(value.status))
            || !Number.isFinite(value.expiresAt)
            || !Number.isFinite(value.attempts)) {
            throw new RpaDeliveryLedgerError("微信投递账本结构无效，已保留原文件并拒绝重复发送。", file);
        }
        const entry = value;
        const now = this.now();
        if (entry.status !== "in_progress" && entry.expiresAt <= now) {
            try {
                fs.unlinkSync(file);
            }
            catch { /* best effort */ }
            return undefined;
        }
        if (entry.status === "in_progress" && entry.expiresAt <= now) {
            entry.status = "uncertain";
            entry.updatedAt = now;
            entry.expiresAt = now + this.retentionMs;
            entry.errorDigest = digest("lease_expired");
            this.write(entry);
        }
        return entry;
    }
    write(entry) {
        fs.mkdirSync(this.baseDir, { recursive: true });
        const target = this.filePath(entry.keyDigest);
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
            throw new RpaDeliveryLedgerError(`无法持久化微信投递账本：${error instanceof Error ? error.message : String(error)}`, target);
        }
    }
    create(entry) {
        fs.mkdirSync(this.baseDir, { recursive: true });
        const target = this.filePath(entry.keyDigest);
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
            throw new RpaDeliveryLedgerError(`无法建立排他微信投递记录：${error instanceof Error ? error.message : String(error)}`, target);
        }
    }
    claim(idempotencyKey, descriptor) {
        this.maybeSweepExpired();
        const keyDigest = digest(idempotencyKey);
        const payloadDigest = descriptorDigest(descriptor);
        const existing = this.readDigest(keyDigest);
        if (existing)
            return this.toClaim(existing, payloadDigest);
        const now = this.now();
        const entry = {
            version: DELIVERY_LEDGER_VERSION,
            keyDigest,
            payloadDigest,
            status: "in_progress",
            createdAt: now,
            updatedAt: now,
            expiresAt: now + this.leaseMs,
            attempts: 0,
        };
        if (!this.create(entry)) {
            const raced = this.readDigest(keyDigest);
            if (!raced)
                throw new RpaDeliveryLedgerError("微信投递排他记录竞争后不可读，已拒绝发送。", this.filePath(keyDigest));
            return this.toClaim(raced, payloadDigest);
        }
        return { state: "claimed", deliveryId: keyDigest };
    }
    toClaim(entry, payloadDigest) {
        const deliveryId = entry.keyDigest;
        if (entry.payloadDigest !== payloadDigest)
            return { state: "conflict", deliveryId };
        if (entry.status === "completed")
            return { state: "completed", deliveryId };
        return { state: "busy", deliveryId, status: entry.status, expiresAt: entry.expiresAt };
    }
    noteAttempt(idempotencyKey) {
        const keyDigest = digest(idempotencyKey);
        const entry = this.readDigest(keyDigest);
        if (!entry || entry.status !== "in_progress") {
            throw new RpaDeliveryLedgerError("微信投递记录不在可发送状态。", this.filePath(keyDigest));
        }
        entry.attempts += 1;
        entry.updatedAt = this.now();
        entry.expiresAt = entry.updatedAt + this.leaseMs;
        this.write(entry);
    }
    complete(idempotencyKey) {
        const keyDigest = digest(idempotencyKey);
        const entry = this.readDigest(keyDigest);
        if (!entry || entry.status !== "in_progress") {
            throw new RpaDeliveryLedgerError("微信投递完成状态无法确认，已拒绝假定成功。", this.filePath(keyDigest));
        }
        entry.status = "completed";
        entry.updatedAt = this.now();
        entry.expiresAt = entry.updatedAt + this.retentionMs;
        delete entry.errorDigest;
        this.write(entry);
    }
    markUncertain(idempotencyKey, error) {
        const keyDigest = digest(idempotencyKey);
        const entry = this.readDigest(keyDigest);
        if (!entry || entry.status === "completed")
            return;
        entry.status = "uncertain";
        entry.updatedAt = this.now();
        entry.expiresAt = entry.updatedAt + this.retentionMs;
        entry.errorDigest = digest(error instanceof Error ? error.message : String(error));
        this.write(entry);
    }
    /** Release only after the sender has positively established that no message was sent. */
    releaseSafeFailure(idempotencyKey) {
        const keyDigest = digest(idempotencyKey);
        const entry = this.readDigest(keyDigest);
        if (!entry || entry.status !== "in_progress")
            return;
        try {
            fs.unlinkSync(this.filePath(keyDigest));
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
                const entry = JSON.parse(fs.readFileSync(file, "utf8"));
                if (entry.expiresAt > this.now())
                    continue;
                if (entry.status === "in_progress") {
                    entry.status = "uncertain";
                    entry.updatedAt = this.now();
                    entry.expiresAt = entry.updatedAt + this.retentionMs;
                    entry.errorDigest = digest("lease_expired");
                    this.write(entry);
                }
                else {
                    fs.unlinkSync(file);
                }
            }
            catch { /* corrupt records are preserved for diagnosis */ }
        }
    }
}
