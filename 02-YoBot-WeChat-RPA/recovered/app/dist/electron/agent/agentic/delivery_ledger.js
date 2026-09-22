import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
const DELIVERY_SCHEMA_VERSION = 1;
const DEFAULT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export class AgenticDeliveryLedgerError extends Error {
    filePath;
    constructor(message, filePath) {
        super(message);
        this.filePath = filePath;
        this.name = "AgenticDeliveryLedgerError";
    }
}
function itemId(deliveryId, kind, index) {
    return crypto.createHash("sha256").update(`${deliveryId}:${kind}:${index}`).digest("hex");
}
function eventItems(event) {
    return [
        ...event.segments.map((_segment, index) => ({
            id: itemId(event.deliveryId, "segment", index),
            kind: "segment",
            index,
        })),
        ...(event.attachments ?? []).map((_attachment, index) => ({
            id: itemId(event.deliveryId, "attachment", index),
            kind: "attachment",
            index,
        })),
    ];
}
function eventPayloadDigest(event) {
    return crypto.createHash("sha256").update(JSON.stringify({
        action: event.action,
        segments: event.segments,
        attachments: event.attachments ?? [],
        reason: event.reason,
        phase: event.phase,
    })).digest("hex");
}
/** Provider-side acknowledgement ledger. It stores delivery coordinates only, never message data. */
export class AgenticDeliveryLedger {
    baseDir;
    retentionMs;
    now;
    operations = 0;
    constructor(baseDir = path.join(process.env.USER_DATA_PATH || process.cwd(), "data", "agentic_deliveries"), options = {}) {
        this.baseDir = baseDir;
        this.retentionMs = options.retentionMs ?? DEFAULT_RETENTION_MS;
        this.now = options.now ?? Date.now;
    }
    validId(value) {
        return /^[a-f0-9]{64}$/.test(value);
    }
    filePath(deliveryId) {
        return path.join(this.baseDir, `${deliveryId}.json`);
    }
    read(deliveryId) {
        if (!this.validId(deliveryId))
            return undefined;
        const file = this.filePath(deliveryId);
        if (!fs.existsSync(file))
            return undefined;
        let value;
        try {
            value = JSON.parse(fs.readFileSync(file, "utf8"));
        }
        catch (error) {
            throw new AgenticDeliveryLedgerError(`RPA 投递确认账本损坏，已保留原文件：${error instanceof Error ? error.message : String(error)}`, file);
        }
        if (value.version !== DELIVERY_SCHEMA_VERSION
            || value.deliveryId !== deliveryId
            || typeof value.payloadDigest !== "string"
            || !["pending", "delivered", "failed"].includes(String(value.status))
            || !Array.isArray(value.items)
            || !value.items.every((item) => (item
                && this.validId(item.id)
                && (item.kind === "segment" || item.kind === "attachment")
                && Number.isInteger(item.index)
                && item.index >= 0
                && ["pending", "delivered", "failed"].includes(String(item.status))))
            || !Number.isFinite(value.expiresAt)) {
            throw new AgenticDeliveryLedgerError("RPA 投递确认账本结构无效，已保留原文件。", file);
        }
        if (Number(value.expiresAt) <= this.now()) {
            try {
                fs.unlinkSync(file);
            }
            catch { /* best effort */ }
            return undefined;
        }
        return value;
    }
    write(entry, exclusive = false) {
        fs.mkdirSync(this.baseDir, { recursive: true });
        const target = this.filePath(entry.deliveryId);
        if (exclusive) {
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
                throw new AgenticDeliveryLedgerError(`无法建立 RPA 投递确认记录：${error instanceof Error ? error.message : String(error)}`, target);
            }
        }
        const temporary = path.join(this.baseDir, `.${path.basename(target)}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`);
        let descriptor;
        try {
            descriptor = fs.openSync(temporary, "wx");
            fs.writeFileSync(descriptor, JSON.stringify(entry, null, 2), "utf8");
            fs.fsyncSync(descriptor);
            fs.closeSync(descriptor);
            descriptor = undefined;
            fs.renameSync(temporary, target);
            return true;
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
            throw new AgenticDeliveryLedgerError(`无法持久化 RPA 投递确认记录：${error instanceof Error ? error.message : String(error)}`, target);
        }
    }
    prepare(event) {
        this.maybeSweepExpired();
        if (!event.deliveryId)
            return event;
        if (!this.validId(event.deliveryId)) {
            throw new AgenticDeliveryLedgerError("无效的 RPA deliveryId。", this.filePath("invalid"));
        }
        const items = eventItems(event);
        const payloadDigest = eventPayloadDigest(event);
        let entry = this.read(event.deliveryId);
        if (!entry) {
            const now = this.now();
            const created = {
                version: DELIVERY_SCHEMA_VERSION,
                deliveryId: event.deliveryId,
                payloadDigest,
                status: items.length ? "pending" : "delivered",
                items: items.map((item) => ({ ...item, status: "pending" })),
                createdAt: now,
                updatedAt: now,
                expiresAt: now + this.retentionMs,
            };
            if (this.write(created, true))
                entry = created;
            else
                entry = this.read(event.deliveryId);
        }
        if (!entry)
            throw new AgenticDeliveryLedgerError("RPA 投递确认记录竞争后不可读。", this.filePath(event.deliveryId));
        if (entry.payloadDigest !== payloadDigest) {
            throw new AgenticDeliveryLedgerError("相同 deliveryId 对应的投递内容发生变化，已拒绝投递。", this.filePath(event.deliveryId));
        }
        const expected = items.map((item) => `${item.kind}:${item.index}:${item.id}`);
        const actual = entry.items.map((item) => `${item.kind}:${item.index}:${item.id}`);
        if (JSON.stringify(expected) !== JSON.stringify(actual)) {
            throw new AgenticDeliveryLedgerError("相同 deliveryId 对应的投递结构发生变化，已拒绝投递。", this.filePath(event.deliveryId));
        }
        return { ...event, deliveryItems: items };
    }
    pendingForReplay(event) {
        this.maybeSweepExpired();
        if (event.deliveryId) {
            if (!this.validId(event.deliveryId)) {
                throw new AgenticDeliveryLedgerError("无效的 RPA deliveryId。", this.filePath("invalid"));
            }
            if (!this.read(event.deliveryId)) {
                throw new AgenticDeliveryLedgerError("RPA 投递确认记录丢失；为避免重复发送，已拒绝自动重放。", this.filePath(event.deliveryId));
            }
        }
        const prepared = this.prepare(event);
        if (!prepared.deliveryId)
            return prepared;
        const entry = this.read(prepared.deliveryId);
        if (!entry)
            throw new AgenticDeliveryLedgerError("RPA 投递确认记录丢失。", this.filePath(prepared.deliveryId));
        if (entry.status === "delivered")
            return undefined;
        const pendingIds = new Set(entry.items.filter((item) => item.status !== "delivered").map((item) => item.id));
        const pendingSegments = (prepared.deliveryItems ?? [])
            .filter((item) => item.kind === "segment" && pendingIds.has(item.id));
        const pendingAttachments = (prepared.deliveryItems ?? [])
            .filter((item) => item.kind === "attachment" && pendingIds.has(item.id));
        return {
            ...prepared,
            segments: pendingSegments.map((item) => prepared.segments[item.index]),
            ...(prepared.attachments === undefined
                ? {}
                : { attachments: pendingAttachments.map((item) => prepared.attachments[item.index]) }),
            // index always points into the arrays in this concrete response. IDs stay stable
            // across partial replays and are the acknowledgement identity.
            deliveryItems: [
                ...pendingSegments.map((item, index) => ({ ...item, index })),
                ...pendingAttachments.map((item, index) => ({ ...item, index })),
            ],
        };
    }
    acknowledge(deliveryId, request) {
        const entry = this.read(deliveryId);
        if (!entry)
            return undefined;
        const requested = request.itemIds?.length ? new Set(request.itemIds) : undefined;
        if (requested) {
            const known = new Set(entry.items.map((item) => item.id));
            if ([...requested].some((id) => !known.has(id))) {
                throw new AgenticDeliveryLedgerError("确认请求包含不属于该 deliveryId 的投递项。", this.filePath(deliveryId));
            }
        }
        if (entry.status === "delivered") {
            return { deliveryId, status: "delivered", acknowledgedItems: entry.items.map((item) => item.id) };
        }
        const nextStatus = request.status;
        for (const item of entry.items) {
            if (!requested || requested.has(item.id))
                item.status = nextStatus;
        }
        entry.status = entry.items.length === 0 || entry.items.every((item) => item.status === "delivered")
            ? "delivered"
            : entry.items.some((item) => item.status === "failed") ? "failed" : "pending";
        entry.updatedAt = this.now();
        // Do not extend this ledger independently from the idempotency record. Both are created
        // for the same response and must age out as one replay window.
        this.write(entry);
        return {
            deliveryId,
            status: entry.status,
            acknowledgedItems: entry.items.filter((item) => item.status === "delivered").map((item) => item.id),
        };
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
                if (Number(entry.expiresAt) <= this.now())
                    fs.unlinkSync(file);
            }
            catch { /* corrupt records are preserved for diagnosis */ }
        }
    }
}
