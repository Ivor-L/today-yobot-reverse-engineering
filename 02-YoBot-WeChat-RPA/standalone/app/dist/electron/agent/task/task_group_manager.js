// TaskGroupManager: 任务组生命周期 + 调度核心
// 创建/启动/取消/审批/重试。事件驱动调度,不轮询。
import { DEFAULT_ENTERPRISE_POLICY, } from "./task_types.js";
import { TaskStore } from "./task_store.js";
import { hasCycle, findMissingDeps, findReadyTasks, findCascadeCancelTargets, isAllTerminal, hasAnyFailure, } from "./dependency_graph.js";
import { NoopTaskNotifier } from "./notifier.js";
import { summarizeGroup } from "./group_summarizer.js";
export class TaskGroupManager {
    deps;
    policy;
    notifier;
    approvalWaiters = new Map();
    expiryTimers = new Map();
    constructor(deps) {
        this.deps = deps;
        this.policy = deps.policy ?? DEFAULT_ENTERPRISE_POLICY;
        this.notifier = deps.notifier ?? new NoopTaskNotifier();
    }
    // ============================================================
    // 计划创建 / 启动
    // ============================================================
    /**
     * 校验 plan 并创建 TaskGroup。
     * 默认 status = 'draft'(未启动); silentMode && 全部 low risk 时由调用方决定是否立即 start。
     */
    async createGroup(plan, parentSessionId) {
        // 1. 校验依赖
        const nodes = plan.tasks.map((t) => ({ id: t.id, dependsOn: t.dependsOn ?? [] }));
        const missing = findMissingDeps(nodes);
        if (missing.length > 0) {
            throw new Error(`任务计划引用了不存在的依赖: ${missing.join(", ")}`);
        }
        if (hasCycle(nodes)) {
            throw new Error("任务计划存在循环依赖,拒绝创建。");
        }
        if (plan.tasks.length === 0) {
            throw new Error("任务计划必须包含至少 1 个子任务。");
        }
        // 2. 构造 group
        const groupId = TaskStore.newGroupId();
        const now = Date.now();
        const subTasks = plan.tasks.map((t) => ({
            id: TaskStore.newSubTaskId(groupId, t.id),
            // 临时存 logical id 在 metadata,供 dependsOn 解析
            groupId,
            parentSessionId,
            title: t.title,
            objective: t.objective,
            successCriteria: t.successCriteria,
            context: t.context ?? "",
            dependsOn: [], // 稍后解析
            status: "pending",
            progressText: "",
            assignedAgentRole: t.assignedAgentRole ?? "custom",
            allowedToolsets: t.allowedToolsets ?? ["read"],
            riskLevel: t.riskLevel ?? "low",
            retryCount: 0,
        }));
        // 把 logical id → 实际 subTask id 做映射,解析 dependsOn
        const idMap = new Map();
        plan.tasks.forEach((t, idx) => idMap.set(t.id, subTasks[idx].id));
        plan.tasks.forEach((t, idx) => {
            const deps = (t.dependsOn ?? []).map((d) => idMap.get(d)).filter((x) => !!x);
            subTasks[idx].dependsOn = deps;
        });
        const group = {
            id: groupId,
            parentSessionId,
            goal: plan.goal,
            status: "draft",
            planSummary: this.summarizePlan(plan),
            silentMode: !!plan.silentMode,
            tokenBudget: plan.tokenBudget,
            tokenUsage: { input: 0, output: 0 },
            createdAt: now,
            updatedAt: now,
            subTasks,
            approvals: [],
        };
        await this.deps.taskStore.save(group);
        await this.deps.eventStore.append({
            groupId,
            type: "group_created",
            message: `任务组创建: ${plan.goal}`,
            metadata: { taskCount: subTasks.length, silentMode: group.silentMode },
        });
        await this.deps.auditStore.append({
            groupId,
            type: "group_created",
            actor: "main_agent",
            payload: {
                goal: plan.goal,
                taskCount: subTasks.length,
                silentMode: group.silentMode,
            },
        });
        return group;
    }
    /**
     * 启动 group(从 draft / waiting_approval 进入 running)。
     * 触发首轮调度。
     */
    async startGroup(groupId) {
        const group = await this.deps.taskStore.setGroupStatus(groupId, "running", {
            startedAt: Date.now(),
        });
        if (!group)
            return;
        await this.deps.eventStore.append({
            groupId,
            type: "group_started",
            message: `任务组开始执行`,
        });
        await this.deps.auditStore.append({
            groupId,
            type: "group_started",
            actor: "main_agent",
            payload: {},
        });
        await this.scheduleNext(groupId);
    }
    /**
     * 取消整个 group 或单个子任务。
     */
    async cancelGroup(groupId, taskId) {
        const group = await this.deps.taskStore.load(groupId);
        if (!group)
            return;
        if (taskId) {
            const task = group.subTasks.find((t) => t.id === taskId);
            if (!task)
                return;
            if (task.status === "running")
                this.deps.runner.cancel(task);
            await this.deps.taskStore.updateSubTask(groupId, taskId, {
                status: "cancelled",
                errorCode: "user_cancelled",
                completedAt: Date.now(),
            });
            await this.deps.eventStore.append({
                groupId,
                taskId,
                type: "task_cancelled",
                message: `任务取消: ${task.title}`,
            });
            await this.deps.auditStore.append({
                groupId,
                taskId,
                type: "task_cancelled",
                actor: "user",
                payload: { from: task.status },
            });
            // 触发下游级联取消 + 重新调度
            await this.handleTerminalTask(groupId, taskId);
            return;
        }
        // 整组取消
        for (const t of group.subTasks) {
            if (t.status === "running")
                this.deps.runner.cancel(t);
            if (t.status === "pending" || t.status === "running" || t.status === "waiting_approval") {
                await this.deps.taskStore.updateSubTask(groupId, t.id, {
                    status: "cancelled",
                    errorCode: "user_cancelled",
                    completedAt: Date.now(),
                });
            }
        }
        await this.deps.taskStore.setGroupStatus(groupId, "cancelled", {
            completedAt: Date.now(),
        });
        await this.deps.eventStore.append({
            groupId,
            type: "group_cancelled",
            message: `任务组已取消`,
        });
        await this.deps.auditStore.append({
            groupId,
            type: "task_cancelled",
            actor: "user",
            payload: { scope: "group" },
        });
    }
    /**
     * 重置某个 task 重新运行(从头开始,不支持断点)。
     * 仅当 task 处于 failed / cancelled / timed_out 时允许。
     */
    async retryTask(groupId, taskId) {
        const group = await this.deps.taskStore.load(groupId);
        if (!group)
            return;
        const task = group.subTasks.find((t) => t.id === taskId);
        if (!task)
            return;
        if (!["failed", "cancelled", "timed_out"].includes(task.status)) {
            throw new Error(`仅可重试已失败/取消/超时的任务,当前状态: ${task.status}`);
        }
        await this.deps.taskStore.updateSubTask(groupId, taskId, {
            status: "pending",
            result: undefined,
            error: undefined,
            errorCode: undefined,
            progressText: "",
            startedAt: undefined,
            completedAt: undefined,
            retryCount: task.retryCount + 1,
        });
        await this.deps.auditStore.append({
            groupId,
            taskId,
            type: "task_retried",
            actor: "user",
            payload: { retryCount: task.retryCount + 1 },
        });
        // group 可能在 completed_with_errors,重启
        const cur = await this.deps.taskStore.load(groupId);
        if (cur && (cur.status === "completed_with_errors" || cur.status === "failed")) {
            await this.deps.taskStore.setGroupStatus(groupId, "running");
        }
        await this.scheduleNext(groupId);
    }
    // ============================================================
    // 子 agent 工具入口(被 PR3 的工具实现调用)
    // ============================================================
    /**
     * 子 agent 调 task_progress_update 时调用。
     */
    async handleProgressUpdate(groupId, taskId, progressText) {
        await this.deps.taskStore.updateSubTask(groupId, taskId, { progressText });
        await this.deps.eventStore.append({
            groupId,
            taskId,
            type: "task_progress",
            message: progressText,
        });
    }
    /**
     * 子 agent 调 task_submit_result 时调用。
     */
    async handleSubmitResult(groupId, taskId, result) {
        await this.deps.taskStore.updateSubTask(groupId, taskId, { result });
        await this.deps.auditStore.append({
            groupId,
            taskId,
            type: "status_change",
            actor: "sub_agent",
            payload: { kind: "submit_result", status: result.status },
        });
        // 不直接置 completed,等 Gateway 的 onComplete 回调来 finalize
    }
    /**
     * 子 agent 调 task_request_approval 时调用。返回 Promise 等待解析。
     */
    async handleRequestApproval(groupId, taskId, input) {
        const approvalId = TaskStore.newApprovalId();
        const now = Date.now();
        const approval = {
            id: approvalId,
            groupId,
            taskId,
            toolName: input.toolName,
            actionSummary: input.actionSummary,
            argsPreview: input.argsPreview,
            riskLevel: input.riskLevel,
            status: "pending",
            createdAt: now,
            expiresAt: now + this.policy.defaultApprovalTimeoutMs,
            notifyChannels: ["desktop"],
        };
        await this.deps.taskStore.addApproval(groupId, approval);
        await this.deps.taskStore.updateSubTask(groupId, taskId, { status: "waiting_approval" });
        await this.deps.eventStore.append({
            groupId,
            taskId,
            type: "approval_requested",
            message: input.actionSummary,
            metadata: { approvalId, toolName: input.toolName, riskLevel: input.riskLevel },
        });
        await this.deps.auditStore.append({
            groupId,
            taskId,
            approvalId,
            type: "approval_requested",
            actor: "sub_agent",
            payload: { ...input, expiresAt: approval.expiresAt },
        });
        // 通知用户(桌面/飞书/微信). 错误不影响主流程。
        try {
            const fullGroup = await this.deps.taskStore.load(groupId);
            if (fullGroup) {
                await this.notifier.notifyApprovalRequested(fullGroup, approval);
            }
        }
        catch (e) {
            console.error("[TaskGroupManager] notifyApprovalRequested failed", e);
        }
        return new Promise((resolve) => {
            this.approvalWaiters.set(approvalId, resolve);
            const timer = setTimeout(async () => {
                const stillPending = await this.deps.taskStore.findApproval(groupId, approvalId);
                if (stillPending && stillPending.status === "pending") {
                    await this.deps.taskStore.updateApproval(groupId, approvalId, {
                        status: "waiting_user",
                    });
                    // 不强 expire,只把 UI 状态变为 waiting_user,继续等
                }
            }, this.policy.defaultApprovalTimeoutMs);
            this.expiryTimers.set(approvalId, timer);
        });
    }
    /**
     * 主 agent 或用户解析审批。
     */
    async resolveApproval(groupId, approvalId, decision, scope) {
        const approval = await this.deps.taskStore.findApproval(groupId, approvalId);
        if (!approval)
            return;
        if (approval.status === "approved" || approval.status === "denied" || approval.status === "expired") {
            return;
        }
        await this.deps.taskStore.updateApproval(groupId, approvalId, {
            status: decision,
            scope,
            resolvedAt: Date.now(),
        });
        if (decision === "approved") {
            await this.deps.taskStore.updateSubTask(groupId, approval.taskId, { status: "running" });
        }
        await this.deps.eventStore.append({
            groupId,
            taskId: approval.taskId,
            type: "approval_resolved",
            message: `授权 ${decision === "approved" ? "已批准" : "已拒绝"}: ${approval.actionSummary}`,
            metadata: { approvalId, decision, scope },
        });
        await this.deps.auditStore.append({
            groupId,
            taskId: approval.taskId,
            approvalId,
            type: "approval_resolved",
            actor: "user",
            payload: { decision, scope },
        });
        const waiter = this.approvalWaiters.get(approvalId);
        if (waiter) {
            this.approvalWaiters.delete(approvalId);
            const timer = this.expiryTimers.get(approvalId);
            if (timer) {
                clearTimeout(timer);
                this.expiryTimers.delete(approvalId);
            }
            waiter(decision);
        }
    }
    // ============================================================
    // 调度
    // ============================================================
    /**
     * 计算可启动的任务,在并发上限内启动。
     * 由 startGroup / 子任务终态变化 / approval resolve 触发。
     *
     * 关键: 决策(load + 计算 ready) + 标记(把入选 task 设为 running) 必须在同一个 transaction 内,
     * 否则多个并发 scheduleNext 会各自看到旧的 pending 状态,重复启动同一批任务,
     * 实际并发数超过 maxParallelTasks。Runner 启动是 fire-and-forget,在 transaction 之后做。
     */
    async scheduleNext(groupId) {
        let needFinalize = false;
        const toLaunch = [];
        let groupSnapshot = null;
        await this.deps.taskStore.transaction(groupId, (group) => {
            groupSnapshot = group;
            if (group.status !== "running")
                return;
            const runningCount = group.subTasks.filter((t) => t.status === "running").length;
            const slots = Math.max(0, this.policy.maxParallelTasks - runningCount);
            if (slots === 0)
                return;
            const ready = findReadyTasks(group.subTasks).slice(0, slots);
            if (ready.length === 0) {
                if (isAllTerminal(group.subTasks)) {
                    needFinalize = true;
                }
                return;
            }
            // 在 transaction 内立即把入选 task 状态置 running,后续 scheduleNext load 时就不会重复入选
            const startedAt = Date.now();
            for (const t of ready) {
                const idx = group.subTasks.findIndex((x) => x.id === t.id);
                if (idx < 0)
                    continue;
                group.subTasks[idx] = {
                    ...group.subTasks[idx],
                    status: "running",
                    startedAt,
                };
                toLaunch.push(group.subTasks[idx]);
            }
        });
        if (needFinalize) {
            await this.finalizeGroup(groupId);
            return;
        }
        if (!groupSnapshot || toLaunch.length === 0)
            return;
        // Fire-and-forget 启动 runner。Runner 内自身会再写一次 status=running + startedAt + subSessionId,
        // 与本次 scheduleNext 内的写入兼容(同字段同值或更精细的字段)。
        for (const task of toLaunch) {
            this.deps.runner.run(groupSnapshot, task).then((result) => this.handleTerminalTask(groupId, result.taskId), (err) => {
                console.error(`[TaskGroupManager] runner unexpected throw`, err);
                this.handleTerminalTask(groupId, task.id);
            });
        }
    }
    /**
     * 子任务进入终态后触发: 级联取消 + 重新调度 + 可能 finalize。
     *
     * 关键: 把 load + 级联取消放进同一 transaction,避免 store.load 读到 stale 状态。
     * scheduleNext 自身已经是 transaction-protected,串行化由 TaskStore 的 per-groupId queue 保证。
     */
    async handleTerminalTask(groupId, taskId) {
        const cascadeEvents = [];
        const result = await this.deps.taskStore.transaction(groupId, (group) => {
            const task = group.subTasks.find((t) => t.id === taskId);
            if (!task)
                return null;
            // 若该任务进入失败终态,级联取消下游
            if (task.status === "failed" || task.status === "cancelled" || task.status === "timed_out") {
                const downstream = findCascadeCancelTargets(group.subTasks, taskId);
                const errMsg = `上游任务 ${task.title} 失败,自动取消`;
                for (const d of downstream) {
                    const idx = group.subTasks.findIndex((x) => x.id === d.id);
                    if (idx < 0)
                        continue;
                    group.subTasks[idx] = {
                        ...group.subTasks[idx],
                        status: "cancelled",
                        errorCode: "upstream_failed",
                        completedAt: Date.now(),
                        error: errMsg,
                    };
                    cascadeEvents.push({ taskId: d.id, title: d.title });
                }
            }
            return task.title;
        });
        if (result === null)
            return;
        // 在 transaction 外写 event/audit (这些 JSONL 是 append-only,不需要严格事务)
        for (const c of cascadeEvents) {
            await this.deps.eventStore.append({
                groupId,
                taskId: c.taskId,
                type: "task_cancelled",
                message: `上游失败自动取消: ${c.title}`,
                metadata: { triggerTaskId: taskId },
            });
            await this.deps.auditStore.append({
                groupId,
                taskId: c.taskId,
                type: "task_cancelled",
                actor: "system",
                payload: { reason: "upstream_failed", triggerTaskId: taskId },
            });
        }
        // 触发下一波 / 收尾
        await this.scheduleNext(groupId);
    }
    async finalizeGroup(groupId) {
        // 整个 finalize 必须在 transaction 内完成,确保并发的 finalizeGroup 调用只有一次会执行实际写入。
        // 单写者也保证 finalSummary / status / completedAt 三个字段原子可见。
        let finalizedSnapshot = null;
        let finalStatusUsed = null;
        await this.deps.taskStore.transaction(groupId, (group) => {
            if (group.status !== "running")
                return; // 已经被另一并发分支 finalize 过
            const finalStatus = hasAnyFailure(group.subTasks) ? "completed_with_errors" : "completed";
            const finalSummary = summarizeGroup({ ...group, status: finalStatus });
            group.status = finalStatus;
            group.completedAt = Date.now();
            group.finalSummary = finalSummary;
            finalizedSnapshot = group;
            finalStatusUsed = finalStatus;
        });
        if (!finalizedSnapshot || !finalStatusUsed)
            return; // 守卫触发,本调用 no-op
        await this.deps.eventStore.append({
            groupId,
            type: "group_completed",
            message: finalStatusUsed === "completed" ? `任务组全部完成` : `任务组完成(含失败子任务)`,
            metadata: { finalStatus: finalStatusUsed },
        });
        await this.deps.auditStore.append({
            groupId,
            type: "group_completed",
            actor: "system",
            payload: { finalStatus: finalStatusUsed },
        });
        // 通知用户. 错误不影响主流程。
        try {
            await this.notifier.notifyGroupFinalized(finalizedSnapshot);
        }
        catch (e) {
            console.error("[TaskGroupManager] notifyGroupFinalized failed", e);
        }
        try {
            await this.deps.onGroupFinalized?.(finalizedSnapshot);
        }
        catch (e) {
            console.error("[TaskGroupManager] onGroupFinalized failed", e);
        }
    }
    // ============================================================
    // 查询
    // ============================================================
    async getStatus(groupId) {
        const g = await this.deps.taskStore.load(groupId);
        if (!g)
            return null;
        return {
            id: g.id,
            goal: g.goal,
            status: g.status,
            silentMode: g.silentMode,
            tokenUsage: g.tokenUsage,
            tokenBudget: g.tokenBudget,
            finalSummary: g.finalSummary,
            tasks: g.subTasks.map((t) => ({
                id: t.id,
                title: t.title,
                status: t.status,
                progressText: t.progressText,
                riskLevel: t.riskLevel,
                dependsOn: t.dependsOn,
                errorCode: t.errorCode,
                error: t.error,
                hasResult: !!t.result,
            })),
            pendingApprovals: g.approvals
                .filter((a) => a.status === "pending" || a.status === "waiting_user")
                .map((a) => ({
                id: a.id,
                taskId: a.taskId,
                toolName: a.toolName,
                actionSummary: a.actionSummary,
                riskLevel: a.riskLevel,
                expiresAt: a.expiresAt,
            })),
        };
    }
    async listByParentSession(parentSessionId) {
        const groups = await this.deps.taskStore.listByParentSession(parentSessionId);
        const views = [];
        for (const g of groups) {
            const view = await this.getStatus(g.id);
            if (view)
                views.push(view);
        }
        return views;
    }
    async findBindingBySubSessionId(subSessionId) {
        if (!subSessionId)
            return null;
        const normalized = subSessionId.startsWith("system__")
            ? subSessionId.replace(/^system__/, "")
            : subSessionId;
        const groups = await this.deps.taskStore.list();
        for (const group of groups) {
            const task = group.subTasks.find((t) => t.subSessionId === subSessionId ||
                t.subSessionId === normalized ||
                (t.subSessionId ? `system__${t.subSessionId}` : "") === subSessionId);
            if (task) {
                return { groupId: group.id, taskId: task.id };
            }
        }
        return null;
    }
    summarizePlan(plan) {
        return `拆解为 ${plan.tasks.length} 个子任务:\n` +
            plan.tasks
                .map((t, i) => `${i + 1}. ${t.title}${(t.dependsOn ?? []).length > 0 ? ` (依赖: ${(t.dependsOn ?? []).join(", ")})` : ""}`)
                .join("\n");
    }
}
