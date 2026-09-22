// TaskRunner: 单子任务执行器
// 负责: 创建 sub-session,启动 background run,接管事件流,处理终态。
import { buildProgressFromTool, buildProgressFromToolError } from "./progress_mapper.js";
import { buildSubAgentSystemPrompt } from "./subagent_prompt.js";
import { isTerminal } from "./dependency_graph.js";
export class TaskRunner {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    /**
     * 启动单个子任务。Promise 在子任务进入终态时 resolve(不抛出),由 TaskGroupManager 链接调度。
     */
    async run(group, task) {
        const { gateway, sessionManager, taskStore, eventStore, auditStore } = this.deps;
        // 1. 创建 sub-session,metadata 注入 task binding
        const sub = await sessionManager.createSubSession(group.parentSessionId, {
            groupId: group.id,
            taskId: task.id,
            originalTask: task.objective,
            role: "subtask",
            agentRole: task.assignedAgentRole,
            riskLevel: task.riskLevel,
        }, 
        // 阶段一不在 Runner 强制 timeout,留给 TaskGroupManager 统一
        undefined);
        // 2. 标记 task 为 running 并保存 subSessionId
        await taskStore.updateSubTask(group.id, task.id, {
            status: "running",
            subSessionId: sub.id,
            startedAt: Date.now(),
        });
        await eventStore.append({
            groupId: group.id,
            taskId: task.id,
            type: "task_started",
            message: `任务开始: ${task.title}`,
            metadata: { subSessionId: sub.id },
        });
        await auditStore.append({
            groupId: group.id,
            taskId: task.id,
            type: "status_change",
            actor: "runner",
            payload: { from: "pending", to: "running" },
        });
        // 3. 构造任务输入: 注入系统提示 + objective + context
        const systemPrompt = buildSubAgentSystemPrompt(task);
        const taskInput = `[子任务系统指令]\n${systemPrompt}\n\n` +
            (task.context ? `[上下文]\n${task.context}\n\n` : "") +
            `[执行目标]\n${task.objective}\n\n` +
            `请按指令执行,完成后调用 task_submit_result。`;
        // 4. 通过 Gateway 启动 background session,使用 taskBinding 接管事件流
        return new Promise((resolve) => {
            const handleEvent = async (event) => {
                try {
                    await this.onAgentEvent(group.id, task.id, event);
                }
                catch (e) {
                    console.error(`[TaskRunner] onAgentEvent error`, e);
                }
            };
            const binding = {
                groupId: group.id,
                taskId: task.id,
                onEvent: handleEvent,
                onComplete: async (_responseText) => {
                    try {
                        const result = await this.finalizeOnComplete(group.id, task.id);
                        resolve(result);
                    }
                    catch (e) {
                        console.error(`[TaskRunner] onComplete handler error`, e);
                        resolve({ taskId: task.id, status: "failed", errorCode: "tool_error", error: String(e) });
                    }
                },
                onError: async (err) => {
                    try {
                        await this.markFailed(group.id, task.id, "tool_error", err.message || String(err));
                        resolve({ taskId: task.id, status: "failed", errorCode: "tool_error", error: err.message });
                    }
                    catch (e) {
                        console.error(`[TaskRunner] onError handler error`, e);
                        resolve({ taskId: task.id, status: "failed", errorCode: "tool_error", error: err.message });
                    }
                },
                onTimeout: async () => {
                    try {
                        await this.markFailed(group.id, task.id, "timeout", "执行超时");
                        resolve({ taskId: task.id, status: "timed_out", errorCode: "timeout", error: "执行超时" });
                    }
                    catch (e) {
                        console.error(`[TaskRunner] onTimeout handler error`, e);
                        resolve({ taskId: task.id, status: "timed_out", errorCode: "timeout" });
                    }
                },
            };
            // fire-and-forget,所有终态通过 binding 回调
            gateway.runBackgroundSession(sub.id, taskInput, group.parentSessionId, [], undefined, binding);
        });
    }
    /**
     * 主动取消一个 running 任务。会通过 gateway.stopSession 终止 sub-session。
     * 实际状态置 cancelled 由 manager 协调,这里只发停止信号。
     */
    cancel(task) {
        if (!task.subSessionId)
            return;
        try {
            this.deps.gateway.stopSession(task.subSessionId);
        }
        catch (e) {
            console.warn(`[TaskRunner] stopSession failed for ${task.subSessionId}`, e);
        }
    }
    // ============================================================
    // 内部: 事件归一化 → TaskEvent + 审计 + token 累加 + progressText
    // ============================================================
    async onAgentEvent(groupId, taskId, event) {
        const { taskStore, eventStore, auditStore } = this.deps;
        const current = await this.getTaskSnapshot(groupId, taskId);
        if (!current)
            return;
        const { group, task } = current;
        const isInactive = group.status !== "running" || isTerminal(task.status);
        switch (event.type) {
            case "think": {
                // 仅写审计,不上面板(避免噪音)
                if (event.description) {
                    await auditStore.append({
                        groupId,
                        taskId,
                        type: "tool_start",
                        actor: "sub_agent",
                        payload: { kind: "think", description: event.description.slice(0, 500) },
                    });
                }
                break;
            }
            case "tool_start": {
                const tool = event.toolName ?? "unknown";
                if (isInactive) {
                    await auditStore.append({
                        groupId,
                        taskId,
                        type: "tool_start",
                        actor: "sub_agent",
                        payload: { tool, args: safePreview(event.toolArgs), callId: event.callId, ignoredAfterTerminal: true },
                    });
                    break;
                }
                const progress = buildProgressFromTool(tool, event.toolArgs);
                // task_progress_update / task_request_approval / task_submit_result 三个工具不写 progressText(它们自己有处理)
                const isInternal = tool === "task_progress_update" ||
                    tool === "task_request_approval" ||
                    tool === "task_submit_result";
                if (!isInternal) {
                    await taskStore.updateSubTask(groupId, taskId, { progressText: progress });
                }
                await eventStore.append({
                    groupId,
                    taskId,
                    type: "tool_start",
                    message: progress,
                    metadata: { toolName: tool, callId: event.callId },
                });
                await auditStore.append({
                    groupId,
                    taskId,
                    type: "tool_start",
                    actor: "sub_agent",
                    payload: { tool, args: safePreview(event.toolArgs), callId: event.callId },
                });
                break;
            }
            case "tool_result": {
                const tool = event.toolName ?? "unknown";
                if (isInactive) {
                    await auditStore.append({
                        groupId,
                        taskId,
                        type: "tool_result",
                        actor: "sub_agent",
                        payload: {
                            tool,
                            isError: !!event.isError,
                            resultPreview: safePreview(event.toolResult),
                            callId: event.callId,
                            ignoredAfterTerminal: true,
                        },
                    });
                    break;
                }
                if (event.isError) {
                    const errMsg = typeof event.toolResult === "string"
                        ? event.toolResult
                        : JSON.stringify(event.toolResult ?? "");
                    const short = buildProgressFromToolError(tool, errMsg);
                    await eventStore.append({
                        groupId,
                        taskId,
                        type: "tool_result",
                        message: short,
                        metadata: { toolName: tool, isError: true, callId: event.callId },
                    });
                }
                else {
                    await eventStore.append({
                        groupId,
                        taskId,
                        type: "tool_result",
                        message: `${tool} 完成`,
                        metadata: { toolName: tool, callId: event.callId },
                    });
                }
                await auditStore.append({
                    groupId,
                    taskId,
                    type: "tool_result",
                    actor: "sub_agent",
                    payload: {
                        tool,
                        isError: !!event.isError,
                        resultPreview: safePreview(event.toolResult),
                        callId: event.callId,
                    },
                });
                break;
            }
            case "run_payload": {
                // 阶段一: 暂不累 token,等 PiKernel 接口确认后在 budget_monitor 中处理
                break;
            }
            default:
                break;
        }
    }
    // ============================================================
    // 内部: 终态处理
    // ============================================================
    async finalizeOnComplete(groupId, taskId) {
        // 子 agent 自然 finished。检查 task.result 是否已被 task_submit_result 工具填充
        const group = await this.deps.taskStore.load(groupId);
        if (!group) {
            return { taskId, status: "failed", errorCode: "tool_error", error: "group missing" };
        }
        const task = group.subTasks.find((t) => t.id === taskId);
        if (!task) {
            return { taskId, status: "failed", errorCode: "tool_error", error: "task missing" };
        }
        if (isTerminal(task.status)) {
            return {
                taskId,
                status: task.status === "completed"
                    ? "completed"
                    : task.status === "timed_out"
                        ? "timed_out"
                        : task.status === "cancelled"
                            ? "cancelled"
                            : "failed",
                errorCode: task.errorCode,
                error: task.error,
            };
        }
        if (group.status !== "running") {
            return {
                taskId,
                status: "cancelled",
                errorCode: "user_cancelled",
                error: "task group is no longer running",
            };
        }
        if (task.result && task.result.status === "completed") {
            await this.deps.taskStore.updateSubTask(groupId, taskId, {
                status: "completed",
                completedAt: Date.now(),
            });
            await this.deps.eventStore.append({
                groupId,
                taskId,
                type: "task_completed",
                message: `任务完成: ${task.title}`,
            });
            await this.deps.auditStore.append({
                groupId,
                taskId,
                type: "status_change",
                actor: "runner",
                payload: { from: "running", to: "completed" },
            });
            return { taskId, status: "completed" };
        }
        if (task.result && task.result.status === "failed") {
            await this.markFailed(groupId, taskId, "tool_error", task.result.summary || "子 agent 标记失败");
            return {
                taskId,
                status: "failed",
                errorCode: "tool_error",
                error: task.result.summary,
            };
        }
        // 没有调 task_submit_result 就 final response 退出
        await this.markFailed(groupId, taskId, "missing_result", "子 agent 未提交结构化结果");
        return {
            taskId,
            status: "failed",
            errorCode: "missing_result",
            error: "子 agent 未提交结构化结果",
        };
    }
    async markFailed(groupId, taskId, errorCode, errMsg) {
        const current = await this.getTaskSnapshot(groupId, taskId);
        if (!current || isTerminal(current.task.status) || current.group.status !== "running") {
            return;
        }
        await this.deps.taskStore.updateSubTask(groupId, taskId, {
            status: errorCode === "timeout" ? "timed_out" : "failed",
            errorCode,
            error: errMsg,
            completedAt: Date.now(),
        });
        await this.deps.eventStore.append({
            groupId,
            taskId,
            type: "task_failed",
            message: errMsg,
            metadata: { errorCode },
        });
        await this.deps.auditStore.append({
            groupId,
            taskId,
            type: "status_change",
            actor: "runner",
            payload: { to: errorCode === "timeout" ? "timed_out" : "failed", errorCode, error: errMsg },
        });
    }
    async getTaskSnapshot(groupId, taskId) {
        const group = await this.deps.taskStore.load(groupId);
        if (!group)
            return null;
        const task = group.subTasks.find((t) => t.id === taskId);
        if (!task)
            return null;
        return { group, task };
    }
}
function safePreview(value) {
    if (value === null || value === undefined)
        return "";
    try {
        const s = typeof value === "string" ? value : JSON.stringify(value);
        return s.length > 500 ? s.slice(0, 500) + "...(truncated)" : s;
    }
    catch {
        return String(value).slice(0, 500);
    }
}
