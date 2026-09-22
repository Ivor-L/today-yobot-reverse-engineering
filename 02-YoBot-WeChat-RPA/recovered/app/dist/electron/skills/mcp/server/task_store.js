import { randomUUID } from "node:crypto";
/**
 * 异步 run_task 的内存任务表(P2)。
 * 追踪 TS 侧 agent 会话任务的状态/结果,支撑 get_task_status 与取消。
 * 注意:这是"agent 会话任务"层;若任务最终落成 yokowebot 后端定时任务(群发等),
 * 那是另一层,后续由代理 get_task_info 处理。
 */
class TaskStore {
    tasks = new Map();
    MAX = 200;
    create(goal, sessionId) {
        const task = {
            id: `mcptask_${randomUUID().slice(0, 8)}`,
            status: "running",
            goal,
            sessionId,
            startedAt: Date.now(),
        };
        this.tasks.set(task.id, task);
        this.prune();
        return task;
    }
    get(id) {
        return this.tasks.get(id);
    }
    complete(id, result) {
        const t = this.tasks.get(id);
        if (!t || t.status !== "running")
            return;
        t.status = "completed";
        t.result = result;
        t.finishedAt = Date.now();
    }
    fail(id, error) {
        const t = this.tasks.get(id);
        if (!t || t.status !== "running")
            return;
        t.status = "failed";
        t.error = error;
        t.finishedAt = Date.now();
    }
    cancel(id) {
        const t = this.tasks.get(id);
        if (t && t.status === "running") {
            t.status = "cancelled";
            t.finishedAt = Date.now();
        }
        return t;
    }
    // 简单 LRU 式清理:超出上限时删掉最旧的已结束任务。
    prune() {
        if (this.tasks.size <= this.MAX)
            return;
        const finished = [...this.tasks.values()]
            .filter((t) => t.status !== "running")
            .sort((a, b) => (a.finishedAt || 0) - (b.finishedAt || 0));
        while (this.tasks.size > this.MAX && finished.length) {
            this.tasks.delete(finished.shift().id);
        }
    }
}
export const taskStore = new TaskStore();
