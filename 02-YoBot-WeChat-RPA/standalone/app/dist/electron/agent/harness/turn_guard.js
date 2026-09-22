import { redactTrace } from "../../utils/trace_redact.js";
import { stableTraceHash } from "./context_projection_trace.js";
import { claimsCompletedSideEffect } from "./outcome_consistency.js";
function normalizeApprovalOutcome(outcome) {
    return typeof outcome === "string" ? { decision: outcome } : outcome;
}
function boundedValue(value, maxLength = 240) {
    if (typeof value !== "string" || !value.trim())
        return undefined;
    const redacted = redactTrace(value.trim()).replace(/\s+/g, " ");
    return redacted.length > maxLength ? `${redacted.slice(0, maxLength)}…` : redacted;
}
function summarizeApprovalTarget(args) {
    if (!args || typeof args !== "object" || Array.isArray(args))
        return undefined;
    const record = args;
    const fields = [
        ["file_path", "文件"], ["filename", "文件"], ["path", "路径"],
        ["source_path", "源路径"], ["target_path", "目标路径"],
        ["cwd", "位置"],
    ];
    const parts = [];
    const seen = new Set();
    for (const [key, label] of fields) {
        const value = boundedValue(record[key], 200);
        if (value && !seen.has(value)) {
            seen.add(value);
            parts.push(`${label}：${value}`);
        }
    }
    // Shell/CLI parameters may carry the target only inside a command. Extract a path-like file
    // name, but never render the command itself or unrelated arguments/secrets.
    if (typeof record.command === "string") {
        const commandFile = record.command.match(/(?:[a-z]:[\\/][^'"`\r\n]{1,240}?\.[a-z0-9]{1,12}\b|\/[^'"`\r\n]{1,240}?\.[a-z0-9]{1,12}\b)/i)?.[0];
        const value = boundedValue(commandFile, 200);
        if (value && !seen.has(value))
            parts.push(`文件：${value}`);
    }
    return parts.length > 0 ? parts.join("；") : undefined;
}
function summarizeApprovalAction(request) {
    if (request.approvalCategory === "task_scope")
        return "调整任务权限范围";
    const operation = `${request.toolName} ${request.capability}`.toLowerCase();
    if (/(delete|remove)/.test(operation))
        return "删除文件";
    if (/(move|rename)/.test(operation))
        return "移动文件";
    if (/(create|write|save|export|update|modify)/.test(operation))
        return "创建或修改文件";
    return request.approvalCategory === "file_mutation" ? "修改本机文件" : "执行当前操作";
}
/**
 * Captures approval challenges as first-class Gateway state. Only one distinct challenge may be
 * issued in a model turn, preventing a model from flooding the user with unrelated tokens.
 */
export function createTurnApprovalCoordinator(baseHandler) {
    const notices = [];
    const handler = async (request, signal) => {
        const argsHash = stableTraceHash(request.args);
        const active = notices.at(-1);
        if (active) {
            if (active.toolName === request.toolName && active.argsHash === argsHash) {
                return {
                    decision: "pending",
                    code: "approval_pending",
                    challengeToken: active.challengeToken,
                    expiresAt: active.expiresAt,
                    message: "The same exact operation is already waiting for user approval.",
                };
            }
            return {
                decision: "pending",
                code: "approval_queue_waiting",
                message: "Another protected operation is already waiting for approval in this turn.",
            };
        }
        const outcome = normalizeApprovalOutcome(await baseHandler(request, signal));
        if (outcome.decision === "pending" && outcome.challengeToken) {
            notices.push({
                toolName: request.toolName,
                capability: request.capability,
                risk: request.risk,
                category: request.approvalCategory || "protected_operation",
                actionSummary: summarizeApprovalAction(request),
                challengeToken: outcome.challengeToken,
                confirmationCommand: "确认",
                expiresAt: outcome.expiresAt,
                targetSummary: summarizeApprovalTarget(request.args),
                argsHash,
            });
        }
        return outcome;
    };
    return { handler, pending: () => notices.map((notice) => ({ ...notice })) };
}
export const HARNESS_FILE_CORRECTION_MARKER = "Harness 权威更正";
function renderApproval(notice) {
    const expiry = notice.expiresAt
        ? `请在 ${new Date(notice.expiresAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} 前回复。`
        : "本次确认仅在当前会话中有效。";
    const modeDescription = notice.category === "file_mutation"
        ? "当前为“修改前询问”模式，文件变更需要二次确认。"
        : notice.category === "task_scope"
            ? "这次任务权限调整需要二次确认。"
            : "当前操作受到权限保护，需要二次确认。";
    return [
        `🔒 ${modeDescription}`,
        "",
        `Agent 准备${notice.actionSummary}，但还没有执行。`,
        ...(notice.targetSummary ? [`影响位置：${notice.targetSummary}`] : []),
        "",
        "回复“确认”继续，或回复“取消”放弃。",
        "",
        `${expiry} 本次确认只对当前会话中的这一次操作有效。`,
    ].join("\n");
}
function fileMutationExecutions(events) {
    return events.filter((event) => (event.type === "tool_execution_record"
        && Array.isArray(event.payload.securityEffects)
        && event.payload.securityEffects.includes("local_file_mutation"))).map((event) => event.payload);
}
/** Makes approval and deterministic file failures authoritative over a model-authored final reply. */
export function guardTurnResponse(originalContent, approvals, events) {
    const pending = approvals[0];
    if (pending) {
        const { argsHash: _argsHash, ...approval } = pending;
        return { content: renderApproval(pending), approval, correctedFalseSuccess: false };
    }
    const mutations = fileMutationExecutions(events);
    const latestFailure = [...mutations].reverse().find((event) => (event.status !== "ok" || event.verificationStatus === "failed"));
    const hasSuccessfulMutation = mutations.some((event) => (event.status === "ok" && event.verificationStatus !== "failed"));
    // Without a raw target path in the privacy-safe event projection, a mixed A-success/B-failure
    // turn cannot be attributed safely. Prefer no rewrite over invalidating a truthful success (and,
    // for cron, incorrectly discarding nextState). The model-facing tool error still remains intact.
    if (latestFailure && !hasSuccessfulMutation && claimsCompletedSideEffect(originalContent)) {
        if (originalContent.includes(HARNESS_FILE_CORRECTION_MARKER)) {
            return { content: originalContent, correctedFalseSuccess: false };
        }
        const toolName = typeof latestFailure.toolName === "string" ? latestFailure.toolName : "文件工具";
        const code = typeof latestFailure.code === "string" ? latestFailure.code : "operation_failed";
        const correction = `⚠️ ${HARNESS_FILE_CORRECTION_MARKER}：文件操作未完成。Harness 检测到 ${toolName} 失败（${code}）；上文中关于该文件操作成功的表述无效。请根据错误修正参数或重新发起任务。`;
        return {
            content: originalContent.trim()
                ? `${originalContent.trimEnd()}\n\n${correction}`
                : correction,
            correctedFalseSuccess: true,
        };
    }
    return { content: originalContent, correctedFalseSuccess: false };
}
