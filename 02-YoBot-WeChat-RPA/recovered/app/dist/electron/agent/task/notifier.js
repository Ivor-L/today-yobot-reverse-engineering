// 任务框架通知接口
// 解耦 NotificationManager / 飞书 / 微信,让 TaskGroupManager 不直接依赖具体通道,
// 也便于测试时注入 stub。
/** 空实现 - 用于测试或 SDK 默认 */
export class NoopTaskNotifier {
    notifyApprovalRequested() { }
    notifyGroupFinalized() { }
    notifyBudgetEvent() { }
}
/**
 * 默认实现: 桌面通知走 NotificationManager,飞书/微信先 stub 写日志(阶段一),
 * 阶段二再接通真实推送。
 */
export class DefaultTaskNotifier {
    opts;
    constructor(opts) {
        this.opts = opts;
    }
    notifyApprovalRequested(group, approval) {
        const sessionId = this.extractChatId(group.parentSessionId);
        const riskLabel = approval.riskLevel === "high" ? "[高风险]" : "[中风险]";
        const notificationKey = `delegate-approval:${approval.id}`;
        this.opts.addNotification({
            type: "task",
            title: `任务授权请求 ${riskLabel}`,
            content: approval.actionSummary,
            sessionId,
            dedupeKey: notificationKey,
            metadata: {
                groupId: group.id,
                taskId: approval.taskId,
                approvalId: approval.id,
                toolName: approval.toolName,
                kind: "approval_request",
                notificationKey,
                notificationAuthoritative: true,
            },
        });
        if (this.opts.enableFeishu) {
            console.log(`[TaskNotifier:Feishu] (stub) approval ${approval.id} - ${approval.actionSummary}`);
        }
        if (this.opts.enableWechat) {
            console.log(`[TaskNotifier:Wechat] (stub) approval ${approval.id} - ${approval.actionSummary}`);
        }
    }
    notifyGroupFinalized(group) {
        const sessionId = this.extractChatId(group.parentSessionId);
        const isOk = group.status === "completed";
        const notificationKey = `delegate-group:${group.id}:final`;
        const title = isOk
            ? `任务组完成`
            : group.status === "completed_with_errors"
                ? `任务组完成(含失败)`
                : group.status === "cancelled"
                    ? `任务组已取消`
                    : `任务组失败`;
        const content = group.finalSummary
            ? group.finalSummary.slice(0, 200)
            : group.goal;
        this.opts.addNotification({
            type: "message",
            title,
            content,
            sessionId,
            dedupeKey: notificationKey,
            metadata: {
                groupId: group.id,
                status: group.status,
                kind: "group_finalized",
                notificationKey,
                notificationAuthoritative: true,
            },
        });
    }
    notifyBudgetEvent(group, kind) {
        const sessionId = this.extractChatId(group.parentSessionId);
        const title = kind === "warning" ? `任务组 token 预警` : `任务组 token 超额`;
        const total = group.tokenUsage.input + group.tokenUsage.output;
        const budget = group.tokenBudget
            ? group.tokenBudget.maxInputTokens + group.tokenBudget.maxOutputTokens
            : 0;
        const content = budget > 0
            ? `${group.goal} - ${total}/${budget} tokens`
            : `${group.goal} - ${total} tokens`;
        const notificationKey = `delegate-group:${group.id}:budget:${kind}`;
        this.opts.addNotification({
            type: "task",
            title,
            content,
            sessionId,
            dedupeKey: notificationKey,
            metadata: {
                groupId: group.id,
                usage: group.tokenUsage,
                budget: group.tokenBudget,
                kind,
                notificationKey,
                notificationAuthoritative: true,
            },
        });
    }
    extractChatId(parentSessionId) {
        if (!parentSessionId)
            return undefined;
        const parts = parentSessionId.split("__");
        return parts.length > 1 ? parts.slice(1).join("__") : parentSessionId;
    }
}
