// 子 agent 工具集: task_progress_update / task_request_approval / task_submit_result
//
// 这三个工具只对子 agent 有意义。主 agent 调用时返回明确错误,提醒它去用 task_group_plan。
/**
 * 通过 toolContext.sessionId 反查 sub-session metadata,拿 groupId/taskId。
 * 若不是合法子 agent session,返回 null。
 */
async function resolveSubAgentBinding(sessionId, sessionManager, manager) {
    if (!sessionId || !sessionId.includes("sub_"))
        return null;
    let channel = "system";
    let id = sessionId;
    if (sessionId.includes("__")) {
        const parts = sessionId.split("__");
        channel = parts[0];
        id = parts.slice(1).join("__");
    }
    const data = sessionManager.getSessionData(channel, id);
    if (data) {
        const groupId = data.metadata?.groupId;
        const taskId = data.metadata?.taskId;
        if (typeof groupId === "string" && typeof taskId === "string") {
            return { groupId, taskId };
        }
    }
    return manager.findBindingBySubSessionId(sessionId) ?? manager.findBindingBySubSessionId(id);
}
const NOT_SUB_AGENT_ERR = "Error: 该工具仅供子 agent 调用。如果你是主 agent 想拆解任务,请使用 task_group_plan。";
export class TaskSubAgentSkill {
    manager;
    sessionManager;
    name = "task_subagent";
    description = "子 agent 任务通讯工具集(进度上报 / 请求授权 / 提交结构化结果)。";
    scope = "subagent";
    instructions = `[仅供子 agent] 子 agent 必须遵循以下约束:

═══ 角色边界 ═══
- 你只负责完成被分配的当前子任务,不要扩展任务范围。
- 不要尝试调用 task_group_plan / task_group_start 创建新任务或子任务,这些都会被拒绝。
- 不要直接向用户输出 final message 作为任务结束 — 必须通过 task_submit_result 提交结构化结果。

═══ 必须遵守 ═══
1. 进度可见: 阶段性进展或开始较长操作前,调 task_progress_update(progressText) 写一句用户可见的进度短句(30 字内)。不需要每个工具调用前都写,避免噪音。
2. 授权机制: 遇到外部副作用动作(写企业系统、发外部消息、修改/删除文件、写长期记忆、登录验证码、读取凭证)前,先调 task_request_approval。该工具会同步阻塞至用户响应。返回 "approved" 才能继续,"denied" 或 "expired" 时切换方案或调 task_submit_result 标 blockers。
3. 完成契约: 任务结束前必须调 task_submit_result 提交结构化结果。这是任务终止的唯一合法出口。未调用直接退出会被标记为 failed (missing_result)。

═══ 结果质量 ═══
- summary 写一段话总结实际产出,不要空话。
- findings 把过程中的关键发现列出来(数据要点、异常、注意事项)。
- artifacts 把所有产物(文件路径/链接/草稿)显式列出。
- blockers 把未解决的阻塞项列出来,以便主 agent 在汇总时提示用户。
- nextActions 建议下一步可执行的动作。`;
    constructor(manager, sessionManager) {
        this.manager = manager;
        this.sessionManager = sessionManager;
    }
    get tools() {
        return [
            {
                definition: {
                    name: "task_progress_update",
                    description: "[仅子 agent] 写一句用户可见的进度短句,在 UI 任务面板上覆盖显示。",
                    parameters: {
                        type: "object",
                        properties: {
                            progressText: { type: "string", description: "一句话进度,建议 30 字以内" },
                        },
                        required: ["progressText"],
                    },
                },
                execute: async (args, _signal, context) => {
                    const binding = await resolveSubAgentBinding(context?.sessionId, this.sessionManager, this.manager);
                    if (!binding)
                        return NOT_SUB_AGENT_ERR;
                    const text = String(args.progressText ?? "").slice(0, 200);
                    if (!text.trim())
                        return "Error: progressText 不能为空。";
                    await this.manager.handleProgressUpdate(binding.groupId, binding.taskId, text);
                    return "OK";
                },
            },
            {
                definition: {
                    name: "task_request_approval",
                    description: "[仅子 agent] 在执行高风险动作前请求用户授权。同步阻塞调用,直到用户批准/拒绝或超时。" +
                        "返回字符串: 'approved' 表示可继续, 'denied' 表示拒绝, 'expired' 表示超时(按 denied 处理)。",
                    parameters: {
                        type: "object",
                        properties: {
                            toolName: { type: "string", description: "即将调用的真实工具名(如 feishu_write_sheet)" },
                            actionSummary: { type: "string", description: "给用户看的一句话动作说明" },
                            argsPreview: { type: "string", description: "即将执行的参数预览(不超过 200 字符)" },
                            riskLevel: { type: "string", enum: ["medium", "high"] },
                        },
                        required: ["toolName", "actionSummary", "argsPreview", "riskLevel"],
                    },
                },
                execute: async (args, _signal, context) => {
                    const binding = await resolveSubAgentBinding(context?.sessionId, this.sessionManager, this.manager);
                    if (!binding)
                        return NOT_SUB_AGENT_ERR;
                    const decision = await this.manager.handleRequestApproval(binding.groupId, binding.taskId, {
                        toolName: String(args.toolName ?? "unknown"),
                        actionSummary: String(args.actionSummary ?? ""),
                        argsPreview: String(args.argsPreview ?? "").slice(0, 200),
                        riskLevel: args.riskLevel === "high" ? "high" : "medium",
                    });
                    return decision;
                },
            },
            {
                definition: {
                    name: "task_submit_result",
                    description: "[仅子 agent] 提交本任务的结构化结果。这是子任务终止的唯一合法出口,调完该工具就可以结束本轮对话。",
                    parameters: {
                        type: "object",
                        properties: {
                            status: { type: "string", enum: ["completed", "failed"] },
                            summary: { type: "string", description: "一段话总结本任务实际产出与发现" },
                            findings: {
                                type: "array",
                                items: { type: "string" },
                                description: "关键发现列表,每条一句话",
                            },
                            artifacts: {
                                type: "array",
                                description: "产物列表(文件路径/链接/草稿)",
                                items: {
                                    type: "object",
                                    properties: {
                                        type: { type: "string", enum: ["file", "url", "table", "message_draft"] },
                                        title: { type: "string" },
                                        uri: { type: "string" },
                                    },
                                    required: ["type", "title"],
                                },
                            },
                            blockers: {
                                type: "array",
                                items: { type: "string" },
                                description: "未解决的阻塞项",
                            },
                            nextActions: {
                                type: "array",
                                items: { type: "string" },
                                description: "建议的下一步动作",
                            },
                        },
                        required: ["status", "summary"],
                    },
                },
                execute: async (args, _signal, context) => {
                    const binding = await resolveSubAgentBinding(context?.sessionId, this.sessionManager, this.manager);
                    if (!binding)
                        return NOT_SUB_AGENT_ERR;
                    const result = {
                        status: args.status === "failed" ? "failed" : "completed",
                        summary: String(args.summary ?? ""),
                        findings: Array.isArray(args.findings) ? args.findings.map(String) : [],
                        artifacts: Array.isArray(args.artifacts)
                            ? args.artifacts
                                .map((a) => a && typeof a === "object"
                                ? {
                                    type: a.type,
                                    title: String(a.title ?? ""),
                                    uri: a.uri ? String(a.uri) : undefined,
                                }
                                : null)
                                .filter((a) => a !== null)
                            : [],
                        blockers: Array.isArray(args.blockers) ? args.blockers.map(String) : [],
                        nextActions: Array.isArray(args.nextActions) ? args.nextActions.map(String) : [],
                    };
                    await this.manager.handleSubmitResult(binding.groupId, binding.taskId, result);
                    return "OK";
                },
            },
        ];
    }
}
