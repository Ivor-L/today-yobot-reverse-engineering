import fs from "node:fs/promises";
import path from "node:path";
import * as crypto from "node:crypto";
function safeId(id) {
    return id.replace(/[^a-zA-Z0-9_-]/g, "_");
}
/**
 * JSONL append-only 事件存储。
 * 每个 group 一个文件,每行一条事件。
 * 内存中只保留尾部 N 条用于 UI 订阅快速回放。
 */
export class TaskEventStore {
    baseDir;
    inMemoryLimit;
    memCache = new Map();
    subscribers = new Set();
    constructor(options) {
        this.baseDir = options.baseDir;
        this.inMemoryLimit = options.inMemoryLimit ?? 200;
    }
    getPath(groupId) {
        return path.join(this.baseDir, `${safeId(groupId)}.jsonl`);
    }
    async ensureDir() {
        await fs.mkdir(this.baseDir, { recursive: true });
    }
    static newEventId() {
        return `ev_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    }
    async append(input) {
        await this.ensureDir();
        const event = {
            id: TaskEventStore.newEventId(),
            groupId: input.groupId,
            taskId: input.taskId,
            type: input.type,
            message: input.message,
            metadata: input.metadata,
            createdAt: Date.now(),
        };
        const line = JSON.stringify(event) + "\n";
        await fs.appendFile(this.getPath(input.groupId), line, "utf-8");
        this.pushMem(event);
        this.broadcast(event);
        return event;
    }
    pushMem(event) {
        const list = this.memCache.get(event.groupId) ?? [];
        list.push(event);
        if (list.length > this.inMemoryLimit) {
            list.splice(0, list.length - this.inMemoryLimit);
        }
        this.memCache.set(event.groupId, list);
    }
    broadcast(event) {
        for (const sub of this.subscribers) {
            try {
                sub(event);
            }
            catch (err) {
                console.error("[TaskEventStore] subscriber error", err);
            }
        }
    }
    subscribe(handler) {
        this.subscribers.add(handler);
        return () => {
            this.subscribers.delete(handler);
        };
    }
    /**
     * 读取一个 group 的事件流。fromIndex 用于分页。
     * 内存中有则直接返回,否则从磁盘解析(不缓存全量,只缓存尾部)。
     */
    async read(groupId, options = {}) {
        const fromIndex = options.fromIndex ?? 0;
        const limit = options.limit ?? this.inMemoryLimit;
        const cached = this.memCache.get(groupId);
        if (cached && fromIndex >= 0 && cached.length > 0) {
            // 简化:如果请求范围在 memCache 中就直接返回。否则回退到全量读取。
        }
        let lines = [];
        try {
            const raw = await fs.readFile(this.getPath(groupId), "utf-8");
            lines = raw.split("\n").filter((l) => l.length > 0);
        }
        catch (err) {
            if (err.code === "ENOENT")
                return [];
            throw err;
        }
        const start = Math.max(0, fromIndex);
        const slice = lines.slice(start, start + limit);
        const events = [];
        for (const line of slice) {
            try {
                events.push(JSON.parse(line));
            }
            catch {
                // 跳过损坏行
            }
        }
        return events;
    }
    async tail(groupId, limit = 50) {
        const cached = this.memCache.get(groupId);
        if (cached) {
            return cached.slice(-limit);
        }
        const all = await this.read(groupId, { fromIndex: 0, limit: 100000 });
        return all.slice(-limit);
    }
}
