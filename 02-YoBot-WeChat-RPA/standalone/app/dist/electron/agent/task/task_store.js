import fs from "node:fs/promises";
import path from "node:path";
import * as crypto from "node:crypto";
import { acquireSessionWriteLock } from "../session/lock.js";
function safeId(id) {
    return id.replace(/[^a-zA-Z0-9_-]/g, "_");
}
export class TaskStore {
    baseDir;
    // 严格串行化同一 group 的 transaction。
    // session/lock.ts 的文件锁是 reentrant 的(同进程内同文件 → count++),
    // 不能保证并发 transaction 互斥,因此在 store 层加 in-memory promise queue。
    transactionQueues = new Map();
    constructor(options) {
        this.baseDir = options.baseDir;
    }
    getGroupPath(groupId) {
        return path.join(this.baseDir, `${safeId(groupId)}.json`);
    }
    async ensureDir() {
        await fs.mkdir(this.baseDir, { recursive: true });
    }
    static newGroupId() {
        return `tg_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    }
    static newSubTaskId(groupId, logicalId) {
        return `st_${safeId(logicalId)}_${crypto.randomBytes(2).toString("hex")}`;
    }
    static newApprovalId() {
        return `ap_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    }
    async load(groupId) {
        const filePath = this.getGroupPath(groupId);
        // 容错: 并发场景下偶尔会读到 atomic write 窗口期:
        //   - 文件被临时 rm 走 (ENOENT) 但即将被 rename 替换
        //   - 文件刚被 rename 完但还在 flush 中 (空文件 / 半截 JSON)
        // 这些情况都重试一次,真正不存在的 group 会在 3 次重试后稳定返回 null。
        let lastErr = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                const raw = await fs.readFile(filePath, "utf-8");
                if (!raw || raw.trim().length === 0) {
                    lastErr = new Error("empty file");
                    await new Promise((r) => setTimeout(r, 10));
                    continue;
                }
                return JSON.parse(raw);
            }
            catch (err) {
                lastErr = err;
                if (attempt === 2) {
                    if (err.code === "ENOENT")
                        return null;
                    throw err;
                }
                await new Promise((r) => setTimeout(r, 10));
            }
        }
        if (lastErr?.code === "ENOENT")
            return null;
        return null;
    }
    async save(group) {
        await this.ensureDir();
        const filePath = this.getGroupPath(group.id);
        group.updatedAt = Date.now();
        // 直接覆盖写: writeFile 内部先 truncate 再写,中间窗口是"空文件"而非 ENOENT,
        // load 的 retry 能够稳定区分(空文件重试一次即可,ENOENT 才返回 null)。
        // 注: 所有 save 都被 transaction 的文件锁串行化,不会并发自相覆盖。
        await fs.writeFile(filePath, JSON.stringify(group, null, 2), "utf-8");
    }
    async list() {
        try {
            const files = await fs.readdir(this.baseDir);
            const results = [];
            for (const f of files) {
                if (!f.endsWith(".json"))
                    continue;
                try {
                    const raw = await fs.readFile(path.join(this.baseDir, f), "utf-8");
                    results.push(JSON.parse(raw));
                }
                catch {
                    // 跳过损坏的文件
                }
            }
            return results.sort((a, b) => b.createdAt - a.createdAt);
        }
        catch (err) {
            if (err.code === "ENOENT")
                return [];
            throw err;
        }
    }
    async listByParentSession(parentSessionId) {
        const all = await this.list();
        const aliases = parentSessionAliases(parentSessionId);
        return all.filter((g) => aliases.has(g.parentSessionId));
    }
    /**
     * 在文件锁 + in-memory queue 双保护下读-改-写。callback 内对 group 的修改会被持久化。
     * 如果 group 不存在,返回 null,callback 不会执行。
     * 同一 groupId 上的多个并发 transaction 会被严格串行,跨 groupId 不阻塞。
     */
    async transaction(groupId, callback) {
        await this.ensureDir();
        const prev = this.transactionQueues.get(groupId) ?? Promise.resolve();
        let release;
        const ticket = new Promise((r) => { release = r; });
        this.transactionQueues.set(groupId, prev.then(() => ticket));
        await prev;
        try {
            const filePath = this.getGroupPath(groupId);
            const lock = await acquireSessionWriteLock({ sessionFile: filePath });
            try {
                const group = await this.load(groupId);
                if (!group)
                    return null;
                const result = await callback(group);
                await this.save(group);
                return result;
            }
            finally {
                await lock.release();
            }
        }
        finally {
            release();
            // 清理已结束的尾部 queue,防止 Map 长期累积
            if (this.transactionQueues.get(groupId) === prev.then(() => ticket)) {
                // 不能拿到精确的 reference,简单退而求其次: 用尾随 setTimeout 清理
                setTimeout(() => {
                    const cur = this.transactionQueues.get(groupId);
                    if (cur) {
                        cur.then(() => {
                            if (this.transactionQueues.get(groupId) === cur) {
                                this.transactionQueues.delete(groupId);
                            }
                        }, () => { });
                    }
                }, 0);
            }
        }
    }
    async delete(groupId) {
        const filePath = this.getGroupPath(groupId);
        try {
            await fs.rm(filePath, { force: true });
        }
        catch {
            // 忽略不存在
        }
    }
    // ============================================================
    // SubTask 便捷方法
    // ============================================================
    async updateSubTask(groupId, taskId, patch) {
        return this.transaction(groupId, (group) => {
            const idx = group.subTasks.findIndex((t) => t.id === taskId);
            if (idx < 0)
                return null;
            group.subTasks[idx] = { ...group.subTasks[idx], ...patch };
            return group.subTasks[idx];
        });
    }
    async setSubTaskStatus(groupId, taskId, status, extra) {
        return this.updateSubTask(groupId, taskId, { status, ...(extra || {}) });
    }
    async setGroupStatus(groupId, status, extra) {
        return this.transaction(groupId, (group) => {
            group.status = status;
            if (extra)
                Object.assign(group, extra);
            return group;
        });
    }
    // ============================================================
    // Approval 便捷方法
    // ============================================================
    async addApproval(groupId, approval) {
        return this.transaction(groupId, (group) => {
            group.approvals.push(approval);
            return approval;
        });
    }
    async updateApproval(groupId, approvalId, patch) {
        return this.transaction(groupId, (group) => {
            const idx = group.approvals.findIndex((a) => a.id === approvalId);
            if (idx < 0)
                return null;
            group.approvals[idx] = { ...group.approvals[idx], ...patch };
            return group.approvals[idx];
        });
    }
    async findApproval(groupId, approvalId) {
        const group = await this.load(groupId);
        if (!group)
            return null;
        return group.approvals.find((a) => a.id === approvalId) ?? null;
    }
    // ============================================================
    // Token 累加(无锁版本,Runner 单写者场景)
    // ============================================================
    async addTokenUsage(groupId, delta) {
        await this.transaction(groupId, (group) => {
            group.tokenUsage.input += delta.input;
            group.tokenUsage.output += delta.output;
        });
    }
}
function parentSessionAliases(parentSessionId) {
    const aliases = new Set();
    if (!parentSessionId)
        return aliases;
    aliases.add(parentSessionId);
    if (parentSessionId.includes("__")) {
        const parts = parentSessionId.split("__");
        aliases.add(parts.slice(1).join("__"));
    }
    else {
        aliases.add(`websocket__${parentSessionId}`);
    }
    return aliases;
}
