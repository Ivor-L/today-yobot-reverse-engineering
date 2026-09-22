// 多 Agent 任务协作框架 - 数据模型 v2
// 对应文档: docs/multi-agent-task-framework-product-plan.md 第 23 节
export const DEFAULT_ENTERPRISE_POLICY = {
    maxParallelTasks: 3,
    allowSilentMode: true,
    allowAutoWriteSpreadsheet: false,
    requireApprovalForExternalMessage: true,
    requireApprovalForMemoryWrite: true,
    blockedTools: [],
    defaultApprovalTimeoutMs: 30 * 60 * 1000,
};
