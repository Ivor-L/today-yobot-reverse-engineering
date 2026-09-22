// 子任务依赖图工具(纯函数,无副作用)
// 用于环检测、就绪计算、上游级联取消。
/**
 * 检测有向图是否有环。
 * 返回 true 表示有环(plan 应被拒绝)。
 */
export function hasCycle(nodes) {
    const ids = new Set(nodes.map((n) => n.id));
    const adj = new Map();
    for (const n of nodes) {
        adj.set(n.id, n.dependsOn.filter((d) => ids.has(d)));
    }
    const WHITE = 0;
    const GRAY = 1;
    const BLACK = 2;
    const color = new Map();
    for (const id of ids)
        color.set(id, WHITE);
    const visit = (u) => {
        color.set(u, GRAY);
        for (const v of adj.get(u) ?? []) {
            const c = color.get(v) ?? WHITE;
            if (c === GRAY)
                return true;
            if (c === WHITE && visit(v))
                return true;
        }
        color.set(u, BLACK);
        return false;
    };
    for (const id of ids) {
        if (color.get(id) === WHITE && visit(id))
            return true;
    }
    return false;
}
/**
 * 检测依赖图中是否引用了不存在的节点。返回缺失的 id 列表。
 */
export function findMissingDeps(nodes) {
    const ids = new Set(nodes.map((n) => n.id));
    const missing = new Set();
    for (const n of nodes) {
        for (const d of n.dependsOn) {
            if (!ids.has(d))
                missing.add(d);
        }
    }
    return [...missing];
}
/**
 * 计算当前可以启动的子任务。
 * 条件:
 *   - 自身 status === "pending"
 *   - 所有 dependsOn 子任务 status === "completed"
 */
export function findReadyTasks(tasks) {
    const byId = new Map(tasks.map((t) => [t.id, t]));
    return tasks.filter((t) => {
        if (t.status !== "pending")
            return false;
        for (const dep of t.dependsOn) {
            const upstream = byId.get(dep);
            if (!upstream || upstream.status !== "completed")
                return false;
        }
        return true;
    });
}
/**
 * 当 trigger 子任务进入失败终态时,计算需要级联取消的下游(直接 + 间接)。
 * "失败终态" 包含: failed / cancelled / timed_out
 * 仅返回当前仍 pending 的下游(running 的不级联,由 runner 自己处理)。
 */
export function findCascadeCancelTargets(tasks, triggerId) {
    const result = [];
    const visited = new Set([triggerId]);
    const queue = [triggerId];
    while (queue.length > 0) {
        const cur = queue.shift();
        for (const t of tasks) {
            if (visited.has(t.id))
                continue;
            if (!t.dependsOn.includes(cur))
                continue;
            visited.add(t.id);
            queue.push(t.id);
            if (t.status === "pending")
                result.push(t);
        }
    }
    return result;
}
const TERMINAL_STATUSES = [
    "completed",
    "failed",
    "cancelled",
    "timed_out",
];
export function isTerminal(status) {
    return TERMINAL_STATUSES.includes(status);
}
/**
 * 所有任务都进入终态时返回 true。
 */
export function isAllTerminal(tasks) {
    return tasks.every((t) => isTerminal(t.status));
}
/**
 * 是否存在任何失败的任务,用于区分 completed vs completed_with_errors。
 */
export function hasAnyFailure(tasks) {
    return tasks.some((t) => t.status !== "completed");
}
