import fs from "node:fs/promises";
import path from "node:path";
import * as crypto from "node:crypto";
function safeId(id) {
    return id.replace(/[^a-zA-Z0-9_-]/g, "_");
}
/**
 * JSONL append-only 审计日志。与 TaskEventStore 区分:
 * - TaskEventStore: 给 UI 用,信号噪声比高,会被裁剪。
 * - TaskAuditStore: 给合规/审计用,记录所有需要追溯的动作,不裁剪。
 */
export class TaskAuditStore {
    baseDir;
    constructor(options) {
        this.baseDir = options.baseDir;
    }
    getPath(groupId) {
        return path.join(this.baseDir, `${safeId(groupId)}.jsonl`);
    }
    async ensureDir() {
        await fs.mkdir(this.baseDir, { recursive: true });
    }
    async append(input) {
        await this.ensureDir();
        const event = {
            id: `au_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
            groupId: input.groupId,
            taskId: input.taskId,
            approvalId: input.approvalId,
            type: input.type,
            actor: input.actor,
            payload: input.payload,
            createdAt: Date.now(),
        };
        await fs.appendFile(this.getPath(input.groupId), JSON.stringify(event) + "\n", "utf-8");
        return event;
    }
    async readAll(groupId) {
        try {
            const raw = await fs.readFile(this.getPath(groupId), "utf-8");
            return raw
                .split("\n")
                .filter((l) => l.length > 0)
                .map((l) => {
                try {
                    return JSON.parse(l);
                }
                catch {
                    return null;
                }
            })
                .filter((x) => x !== null);
        }
        catch (err) {
            if (err.code === "ENOENT")
                return [];
            throw err;
        }
    }
}
