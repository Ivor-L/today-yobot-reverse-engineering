// 主 agent 工具集: task_group_plan / task_group_start / task_group_status /
// task_group_cancel / task_group_approval_reply
//
// 这些工具仅供主 agent 调用,子任务调用时返回错误(并要求改用 task_submit_result)。
function isSubAgentSession(sessionId) {
    if (!sessionId)
        return false;
    return sessionId.includes("sub_");
}
function normalizeParentSessionId(context) {
    const sessionId = context?.sessionId;
    if (!sessionId || sessionId === "unknown")
        return "unknown_parent";
    if (sessionId.includes("__"))
        return sessionId;
    const channel = context?.channel || "websocket";
    return `${channel}__${sessionId}`;
}
export class TaskGroupSkill {
    manager;
    name = "task_group";
    description = "把耗时/可并行的活拆成后台子任务、让主 agent 腾出手并行干别的的工具集。";
    scope = "main";
    instructions = `把某块耗时/会阻塞的活丢到后台子任务跑,好让你腾出手同时干别的独立活——这是拆子任务的唯一意义。**默认不拆、自己做**;仅当"拆出去后你确实还有别的、跟它互不依赖的活能并行推进"才拆。拆完只剩干等、或本质一件事/强串行/规划分析写作/单技能几步能做完 → 都别拆。

流程:
1. task_group_plan 提交子任务:每个含 title/objective/successCriteria(可验证的完成标准);有先后用 dependsOn 引用同组 id;riskLevel 默认 low(medium/high 执行时会向用户要授权)。通常 1-8 个。
2. 收到 groupId 后:silentMode 且全 low risk 可直接 task_group_start;否则等用户在面板点"开始"。
3. 用户问进度但你不确定 groupId → 先 task_group_list_current_session,别猜。
4. 整组完成后系统注入结构化结果,你据此汇总回复用户。`;
    constructor(manager) {
        this.manager = manager;
    }
    get tools() {
        return [
            {
                definition: {
                    name: "task_group_plan",
                    description: "提交并行子任务计划交后台执行,返回 groupId。仅当拆出去后你还有别的独立活能并行干时用,否则直接自己做。",
                    parameters: {
                        type: "object",
                        properties: {
                            goal: { type: "string", description: "用户的原始目标描述" },
                            silentMode: {
                                type: "boolean",
                                description: "true 时若全部子任务为 low risk 可跳过用户计划确认直接执行。默认 false。",
                            },
                            tokenBudget: {
                                type: "object",
                                description: "可选 token 预算。超过 80% 弹预警,超过 100% 暂停。",
                                properties: {
                                    maxInputTokens: { type: "number" },
                                    maxOutputTokens: { type: "number" },
                                },
                            },
                            tasks: {
                                type: "array",
                                description: "子任务列表",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string", description: "在 plan 内唯一的逻辑 id,用于 dependsOn 引用" },
                                        title: { type: "string" },
                                        objective: { type: "string", description: "明确的子任务目标" },
                                        context: { type: "string", description: "可选: 给子 agent 的额外上下文" },
                                        successCriteria: { type: "string", description: "可验证的完成标准" },
                                        dependsOn: {
                                            type: "array",
                                            items: { type: "string" },
                                            description: "依赖的同组子任务逻辑 id 列表",
                                        },
                                        assignedAgentRole: {
                                            type: "string",
                                            enum: ["researcher", "operator", "writer", "reviewer", "custom"],
                                        },
                                        allowedToolsets: {
                                            type: "array",
                                            items: { type: "string" },
                                            description: "可选: 限制子 agent 可用的工具集白名单",
                                        },
                                        riskLevel: { type: "string", enum: ["low", "medium", "high"] },
                                    },
                                    required: ["id", "title", "objective"],
                                },
                            },
                        },
                        required: ["goal", "tasks"],
                    },
                },
                execute: async (args, _signal, context) => {
                    if (isSubAgentSession(context?.sessionId)) {
                        return "Error: 子 agent 不允许创建任务组,请使用 task_submit_result 提交当前任务的结构化结果。";
                    }
                    const parentSessionId = normalizeParentSessionId(context);
                    const plan = {
                        goal: String(args.goal ?? ""),
                        silentMode: !!args.silentMode,
                        tokenBudget: args.tokenBudget,
                        tasks: Array.isArray(args.tasks)
                            ? args.tasks.map((t) => ({
                                id: String(t.id),
                                title: String(t.title ?? t.id),
                                objective: String(t.objective ?? ""),
                                context: t.context,
                                successCriteria: t.successCriteria,
                                dependsOn: Array.isArray(t.dependsOn) ? t.dependsOn.map(String) : [],
                                assignedAgentRole: t.assignedAgentRole ?? "custom",
                                allowedToolsets: Array.isArray(t.allowedToolsets) ? t.allowedToolsets : ["read"],
                                riskLevel: t.riskLevel ?? "low",
                            }))
                            : [],
                    };
                    try {
                        const group = await this.manager.createGroup(plan, parentSessionId);
                        const lines = [
                            `已创建任务组: ${group.id}`,
                            group.planSummary,
                            group.silentMode ? "[silentMode] 已开启,可直接调用 task_group_start。" : "[等待用户确认] 用户在面板上点击\"开始执行\"后,任务会自动开始。",
                        ];
                        return lines.join("\n");
                    }
                    catch (e) {
                        return `Error: 任务计划创建失败: ${e.message || String(e)}`;
                    }
                },
            },
            {
                definition: {
                    name: "task_group_list_current_session",
                    description: "列出当前会话下最近创建的任务组。用户询问任务进度但你不确定 groupId 时,先调用本工具,再按返回的真实 groupId 查询或汇报。",
                    parameters: {
                        type: "object",
                        properties: {
                            limit: { type: "number", description: "最多返回多少个任务组,默认 5" },
                        },
                    },
                },
                execute: async (args, _signal, context) => {
                    if (isSubAgentSession(context?.sessionId)) {
                        return "Error: 子 agent 不允许查询父会话任务组。";
                    }
                    const parentSessionId = normalizeParentSessionId(context);
                    const limit = Math.max(1, Math.min(20, Number(args?.limit ?? 5) || 5));
                    const groups = (await this.manager.listByParentSession(parentSessionId)).slice(0, limit);
                    if (groups.length === 0) {
                        return `当前会话没有任务组。`;
                    }
                    const lines = groups.map((g, idx) => {
                        const done = g.tasks.filter(t => t.status === "completed").length;
                        const total = g.tasks.length;
                        const failed = g.tasks.filter(t => t.status === "failed" || t.status === "timed_out" || t.status === "cancelled").length;
                        return `${idx + 1}. ${g.id} [${g.status}] ${g.goal} (${done}/${total} 完成${failed > 0 ? `, ${failed} 异常/取消` : ""})`;
                    });
                    return `当前会话任务组:\n${lines.join("\n")}`;
                },
            },
            {
                definition: {
                    name: "task_group_start",
                    description: "用户确认或 silentMode 下,启动一个 draft 状态的任务组。",
                    parameters: {
                        type: "object",
                        properties: {
                            groupId: { type: "string" },
                        },
                        required: ["groupId"],
                    },
                },
                execute: async (args, _signal, context) => {
                    if (isSubAgentSession(context?.sessionId)) {
                        return "Error: 子 agent 不允许启动任务组。";
                    }
                    await this.manager.startGroup(String(args.groupId));
                    return `任务组 ${args.groupId} 已启动。可调用 task_group_status 查看当前进度。`;
                },
            },
            {
                definition: {
                    name: "task_group_status",
                    description: "查询任务组的当前状态(精简视图,适合作为对话回复)。",
                    parameters: {
                        type: "object",
                        properties: {
                            groupId: { type: "string" },
                        },
                        required: ["groupId"],
                    },
                },
                execute: async (args) => {
                    const status = await this.manager.getStatus(String(args.groupId));
                    if (!status)
                        return `任务组 ${args.groupId} 不存在。`;
                    const lines = [
                        `[${status.status}] ${status.goal}`,
                        `Token 用量: input=${status.tokenUsage.input} / output=${status.tokenUsage.output}`,
                    ];
                    for (const t of status.tasks) {
                        const depLabel = t.dependsOn.length > 0 ? ` (依赖: ${t.dependsOn.join(", ")})` : "";
                        const detail = t.errorCode ? ` [${t.errorCode}: ${t.error ?? ""}]` : t.progressText ? ` - ${t.progressText}` : "";
                        lines.push(`  - ${t.title} [${t.status}]${depLabel}${detail}`);
                    }
                    if (status.pendingApprovals.length > 0) {
                        lines.push(`[待审批 ${status.pendingApprovals.length}]`);
                        for (const a of status.pendingApprovals) {
                            lines.push(`  - approvalId=${a.id} | tool=${a.toolName} | ${a.actionSummary}`);
                        }
                    }
                    if (status.finalSummary) {
                        lines.push("[最终汇总]");
                        lines.push(status.finalSummary);
                    }
                    return lines.join("\n");
                },
            },
            {
                definition: {
                    name: "task_group_cancel",
                    description: "取消整个任务组,或仅取消其中一个子任务。",
                    parameters: {
                        type: "object",
                        properties: {
                            groupId: { type: "string" },
                            taskId: { type: "string", description: "可选,只取消该子任务" },
                        },
                        required: ["groupId"],
                    },
                },
                execute: async (args, _signal, context) => {
                    if (isSubAgentSession(context?.sessionId)) {
                        return "Error: 子 agent 不允许取消任务组。";
                    }
                    await this.manager.cancelGroup(String(args.groupId), args.taskId ? String(args.taskId) : undefined);
                    return args.taskId
                        ? `子任务 ${args.taskId} 已取消。`
                        : `任务组 ${args.groupId} 已取消。`;
                },
            },
            {
                definition: {
                    name: "task_group_approval_reply",
                    description: "对子 agent 的授权请求作答(主要用于自动审批策略;一般情况由用户在 UI 上操作)。",
                    parameters: {
                        type: "object",
                        properties: {
                            groupId: { type: "string" },
                            approvalId: { type: "string" },
                            decision: { type: "string", enum: ["approved", "denied"] },
                            scope: { type: "string", enum: ["once", "session", "task_group"], description: "授权范围" },
                        },
                        required: ["groupId", "approvalId", "decision"],
                    },
                },
                execute: async (args) => {
                    await this.manager.resolveApproval(String(args.groupId), String(args.approvalId), args.decision === "approved" ? "approved" : "denied", args.scope);
                    return `审批 ${args.approvalId} 已记为 ${args.decision}${args.scope ? ` (scope=${args.scope})` : ""}。`;
                },
            },
        ];
    }
}
