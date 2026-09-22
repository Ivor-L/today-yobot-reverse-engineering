import { LLMManager } from "../llm/manager.js";
import { getContext, getRunTermination } from "../../utils/context.js";
import { SkillNotesStore } from "../../memory/skill_notes.js";
import { markToolEnd, markToolStart } from "./active_tool.js";
import { FALLBACK_CONTEXT_WINDOW } from "./context_window.js";
import { buildToolExecutionRecord, resolveEnterpriseToolMetadata, toolExecutionRecordTrace, } from "../harness/tool_execution.js";
import { authorizeToolCall, executionModeForTool, toolPolicyDecisionTrace, } from "../harness/tool_policy_gateway.js";
import { resolveVerifierMode, verificationResultTrace, verifyToolExecution, } from "../harness/verifier.js";
import { AgentRunBudgetExceededError, consumeAgentRunToolCall, } from "../run/budget.js";
/**
 * 工具调用被用户主动中止（/stop 或 UI 的停止按钮）。
 *
 * pi 只把 AbortSignal 交给工具，自己是裸 await（agent-loop.js:366
 * `await prepared.tool.execute(...)`），完全依赖工具自觉响应。而相当多工具拿到
 * signal 后并不使用（例如 wechat_rpa 的 handler 签名是 `_signal`，api_client 的
 * fetch 也没接 signal），于是 abort() 对它们毫无作用 —— 队列会一直堵在这一轮上，
 * 用户发了 /stop 却什么也不会发生。
 *
 * 这里在工具边界统一补一次竞速，让 abort 至少能把控制权还给 agent 循环：
 * runLoop 下一次调模型时 signal 已 aborted → stopReason "aborted" → 循环退出
 * （agent-loop.js:105），turn 结束，队列解除阻塞。
 *
 * 只在 signal 真的 abort 时触发，不含任何时间阈值，因此不会误伤正常的长任务。
 */
class ToolAbortedError extends Error {
    constructor(toolName) {
        super(`Tool ${toolName} aborted by user`);
        this.name = "ToolAbortedError";
    }
}
/**
 * 让 work 与 signal 的 abort 竞速。
 *
 * 注意 work 被抛弃后仍在后台跑（我们无法真正取消一个不接 signal 的调用），
 * 但它的结果已被 then 消费，不会产生 unhandled rejection。真正的 socket 级
 * 取消需要把 signal 一路接到 fetch，那是独立的一步。
 */
function raceAbort(signal, toolName, work) {
    if (!signal)
        return work;
    if (signal.aborted)
        return Promise.reject(new ToolAbortedError(toolName));
    return new Promise((resolve, reject) => {
        const onAbort = () => reject(new ToolAbortedError(toolName));
        signal.addEventListener("abort", onAbort, { once: true });
        work.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
    });
}
function pruneTextHeadTail(text, limit) {
    if (!text || text.length <= limit)
        return text;
    const headSize = Math.floor(limit * 0.45);
    const tailSize = Math.floor(limit * 0.35);
    const removedChars = text.length - headSize - tailSize;
    const head = text.slice(0, headSize);
    const tail = text.slice(-tailSize);
    return `${head}\n\n... [Output Truncated: Removed ${removedChars} characters] ...\n\n${tail}`;
}
function rankBrowserLines(body, url, maxItems) {
    const lines = body.split("\n");
    const isDouyinPage = /douyin\.com/i.test(url);
    const isSearchPage = /\/search\/|type=general/i.test(url);
    const isModalPage = /modal_id=/i.test(url);
    const ranked = lines
        .map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed || /<InlineTextBox\b/i.test(trimmed))
            return null;
        let score = 0;
        if (/<(textbox|searchbox|button|link|combobox|dialog|menuitem|tab|listitem|checkbox|radio|switch|textarea|input)\b/i.test(trimmed))
            score += 80;
        if (/name="/i.test(trimmed))
            score += 12;
        if (/value="[^"]+"/i.test(trimmed))
            score += 16;
        if (/url="[^"]+"/i.test(trimmed))
            score += 10;
        if (/name="[^"]*(评论|发送|搜索|留下你的精彩评论吧|feed-comment-icon|openclaw|教程|发布)[^"]*"/i.test(trimmed))
            score += 70;
        if (isDouyinPage && /评论|发送|搜索|openclaw|留下你的精彩评论吧/i.test(trimmed))
            score += 30;
        if (isSearchPage && /openclaw|教程|视频|url="/i.test(trimmed))
            score += 25;
        if (isModalPage && /评论|发送|input|textbox|发布/i.test(trimmed))
            score += 60;
        if (isModalPage)
            score += Math.floor((idx / Math.max(lines.length, 1)) * 24);
        if (score <= 0)
            return null;
        return { trimmed, score, idx };
    })
        .filter((item) => !!item)
        .sort((a, b) => b.score - a.score || b.idx - a.idx);
    const unique = [];
    const seen = new Set();
    for (const item of ranked) {
        if (seen.has(item.trimmed))
            continue;
        seen.add(item.trimmed);
        unique.push(item.trimmed);
        if (unique.length >= maxItems)
            break;
    }
    return unique;
}
function parseBrowserSnapshot(text) {
    const title = text.match(/\*\*Title\*\*:\s*(.+)/)?.[1]?.trim() || "";
    const url = text.match(/\*\*URL\*\*:\s*(.+)/)?.[1]?.trim() || "";
    const action = text.match(/Action '([^']+)' performed successfully\./)?.[1]?.trim() || "";
    const tabs = Array.from(text.matchAll(/^- \[([^\]]+)\]\s+(.+)$/gm)).slice(0, 6).map(m => `[${m[1]}] ${m[2]}`);
    const hasLoginSignal = /Login Page Detected\s*\(/i.test(text) ||
        /Please log in manually/i.test(text) ||
        /UserInteractionRequiredError/i.test(text) ||
        /type="password"|inputtype="password"/i.test(text);
    const marker = "### Interactive Elements:\n";
    const markerIndex = text.indexOf(marker);
    const body = markerIndex >= 0 ? text.slice(markerIndex + marker.length) : text;
    const elements = rankBrowserLines(body, url, 80);
    return { title, url, action, tabs, hasLoginSignal, markerIndex, body, elements };
}
function compactBrowserSnapshotOutput(text, limit, summaryOnly) {
    if (!text)
        return text;
    const parsed = parseBrowserSnapshot(text);
    const summaryLines = [
        "## Browser Snapshot Summary",
        `- Action: ${parsed.action || "unknown"}`,
        `- Title: ${parsed.title || "unknown"}`,
        `- URL: ${parsed.url || "unknown"}`,
        `- LoginSignal: ${parsed.hasLoginSignal ? "yes" : "no"}`,
        `- Tabs: ${parsed.tabs.length > 0 ? parsed.tabs.join(" | ") : "none"}`,
        `- KeyElementsCount: ${parsed.elements.length}`
    ];
    const keyElements = parsed.elements.slice(0, summaryOnly ? 18 : 40);
    const summary = `${summaryLines.join("\n")}\n${keyElements.map((line, idx) => `${idx + 1}. ${line}`).join("\n")}`;
    if (summaryOnly) {
        return pruneTextHeadTail(summary, limit);
    }
    if (parsed.markerIndex < 0) {
        return pruneTextHeadTail(summary + "\n\n" + text, limit);
    }
    if (text.length <= limit) {
        return text;
    }
    const isModalPage = /modal_id=/i.test(parsed.url);
    const isSearchPage = /\/search\/|type=general/i.test(parsed.url);
    const focused = rankBrowserLines(parsed.body, parsed.url, isModalPage ? 160 : (isSearchPage ? 150 : 120));
    const focusedBlock = focused.length > 0 ? focused.join("\n") : parsed.body.slice(0, Math.min(4500, parsed.body.length));
    let compacted = `${summary}\n\n### Interactive Elements (Compacted)\n${focusedBlock}\n\n... [Browser Snapshot Compacted: original ${text.length} chars] ...`;
    if (compacted.length > limit) {
        compacted = pruneTextHeadTail(compacted, limit);
    }
    return compacted;
}
function normalizeToolResultText(toolName, text) {
    if (!text)
        return text;
    if (toolName === "browser_action") {
        return compactBrowserSnapshotOutput(text, 20000, false);
    }
    return pruneTextHeadTail(text, 8000);
}
function normalizeHistoryToolResultText(toolName, text) {
    if (!text)
        return text;
    if (toolName === "browser_action") {
        return compactBrowserSnapshotOutput(text, 5000, true);
    }
    return pruneTextHeadTail(text, 8000);
}
function findFailureReason(value) {
    if (!value || typeof value !== "object")
        return undefined;
    if (Array.isArray(value)) {
        for (const item of value) {
            const reason = findFailureReason(item);
            if (reason)
                return reason;
        }
        return undefined;
    }
    const obj = value;
    if (obj.success === false || obj.ok === false) {
        return typeof obj.error === "string"
            ? obj.error
            : typeof obj.message === "string"
                ? obj.message
                : "Tool returned success=false.";
    }
    if (typeof obj.status === "string" && /^(error|failed|failure)$/i.test(obj.status)) {
        return typeof obj.error === "string"
            ? obj.error
            : typeof obj.message === "string"
                ? obj.message
                : `Tool returned status=${obj.status}.`;
    }
    if (typeof obj.error === "string" && obj.error.trim()) {
        return obj.error.trim();
    }
    for (const item of Object.values(obj)) {
        const reason = findFailureReason(item);
        if (reason)
            return reason;
    }
    return undefined;
}
function detectToolFailure(text) {
    const trimmed = (text || "").trim();
    if (!trimmed)
        return undefined;
    try {
        const parsed = JSON.parse(trimmed);
        const reason = findFailureReason(parsed);
        if (reason)
            return reason;
    }
    catch {
        // Non-JSON tool results are common.
    }
    const firstLine = trimmed.split(/\r?\n/, 1)[0] || trimmed;
    if (/^(error:|failed to |error executing tool\b|tool error:)/i.test(firstLine)) {
        return firstLine.slice(0, 500);
    }
    if (/\b(insufficient balance|unauthorized|forbidden|permission denied|not authenticated)\b/i.test(firstLine)) {
        return firstLine.slice(0, 500);
    }
    return undefined;
}
/**
 * 将 YokoAgent 的 SkillRegistry 转换为 pi-agent-core 的 AgentTool 列表
 *
 * ## 设计说明
 *
 * 1. **单一注册**: 每个工具只注册一次，避免token浪费
 * 2. **命名适配**: 通过 tool_interceptor.ts 的模糊匹配处理不同模型的命名习惯
 * 3. **性能优化**: 使用 registry.execute 直接执行，无需额外的名称映射
 *
 * @param registry YokoAgent的技能注册表
 * @param logger 调试日志记录器
 * @returns Pi Agent Core兼容的工具列表
 */
/** 把抛出来的东西变成一句模型读得懂的话；空 message 不能变成一句空白报错。 */
function describeThrown(error) {
    const raw = typeof error?.message === "string" ? error.message : String(error ?? "");
    const trimmed = raw.trim();
    if (trimmed && trimmed !== "[object Object]")
        return trimmed;
    if (error && typeof error === "object") {
        try {
            const serialized = JSON.stringify(error);
            if (serialized && serialized !== "{}")
                return serialized.slice(0, 500);
        }
        catch {
            // 循环引用等，继续走兜底文案。
        }
    }
    return `${error?.name || "Error"}（未附带错误信息）`;
}
/**
 * 执行前的参数体检。
 *
 * 线上遇到过并行工具调用"串味"：模型同一条消息里发了 task_contract_set 和
 * fs_write_file，后者拿到的 arguments 却是前者的负载 + 一个被拼坏的 file_path，
 * 既没有 content、又多出 deliverables/successCriteria 等本工具根本没有的字段。
 * 当时它照样执行了，然后回了一个空报错——模型只能瞎猜，用户看到的是任务莫名跑偏。
 *
 * 不合法的调用应该在执行前就被挡下，并且把"缺了什么、多了什么"讲清楚，让模型能
 * 自己改对重发，而不是让副作用先落地。
 */
function validateToolParams(fnDef, params) {
    const schema = fnDef.parameters;
    if (!schema || schema.type !== "object")
        return undefined;
    const required = schema.required;
    if (!Array.isArray(required) || required.length === 0)
        return undefined;
    if (!params || typeof params !== "object" || Array.isArray(params)) {
        return `${fnDef.name} 需要一个参数对象，收到的是 ${params === null ? "null" : typeof params}。`;
    }
    const provided = params;
    const has = (key) => provided[key] !== undefined && provided[key] !== null;
    const missing = required.filter((name) => {
        if (has(name))
            return false;
        return !(fnDef.paramAliases?.[name] || []).some(has);
    });
    if (missing.length === 0)
        return undefined;
    const declared = new Set([
        ...Object.keys(schema.properties || {}),
        ...Object.values(fnDef.paramAliases || {}).flat(),
    ]);
    const unexpected = Object.keys(provided).filter((key) => !declared.has(key));
    const hint = unexpected.length > 0
        ? `另外这些字段不属于 ${fnDef.name}，看起来是别的工具的参数混进来了：${unexpected.join("、")}。`
        : "";
    return `${fnDef.name} 缺少必填参数：${missing.join("、")}。${hint}请只按 ${fnDef.name} 的参数表重新发起这次调用。`;
}
export function convertTools(registry, logger, agentScope = 'main', allowedSkills, runToolPolicy) {
    const tools = [];
    const allowedTools = runToolPolicy?.allowedTools
        ? new Set([...runToolPolicy.allowedTools].map((name) => name.trim().toLowerCase()).filter(Boolean))
        : undefined;
    const deniedTools = new Set([...(runToolPolicy?.deniedTools ?? [])].map((name) => name.trim().toLowerCase()).filter(Boolean));
    const defs = registry.getToolDefinitions(agentScope, allowedSkills).filter((definition) => {
        const name = String(definition.function?.name || "").trim().toLowerCase();
        if (deniedTools.has(name))
            return false;
        return allowedTools === undefined || allowedTools.has(name);
    });
    console.log(`[convertTools] Converting ${defs.length} tool definitions (scope=${agentScope})`);
    for (const def of defs) {
        const fnDef = def.function;
        const enterpriseMetadata = resolveEnterpriseToolMetadata(fnDef);
        // 创建工具执行函数
        const executeFunction = async (toolCallId, params, signal, onUpdate) => {
            // 处理参数位移（Pi Agent可能以不同方式传参）
            let actualParams = params;
            let actualSignal = signal;
            let actualToolCallId = typeof toolCallId === "string" ? toolCallId : undefined;
            const executionStartedAt = Date.now();
            let registryExecutionStarted = false;
            if (typeof toolCallId === 'object' && toolCallId !== null) {
                actualParams = toolCallId;
                actualSignal = params;
                actualToolCallId = undefined;
            }
            let executionParams = actualParams;
            const attachRecord = (record) => {
                const projection = toolExecutionRecordTrace(record);
                try {
                    getContext()?.traceEventSink?.("tool_execution_record", projection);
                }
                catch {
                    // Tool execution and its model-facing result must not depend on diagnostics.
                }
                try {
                    getContext()?.harnessEventSink?.("tool_execution_record", projection);
                }
                catch {
                    // Gateway outcome guards must not affect tool execution.
                }
                return record;
            };
            try {
                const requestContext = getContext();
                const toolContext = {
                    sessionId: requestContext?.sessionId || "unknown",
                    toolCallId: actualToolCallId,
                    agentRunId: requestContext?.agentRunId,
                    channel: requestContext?.channel,
                    userId: requestContext?.userId,
                    userText: requestContext?.userText,
                    traceId: requestContext?.traceId,
                    logger: logger,
                    // 注意：pi 传给工具的第 4 个参数 `onUpdate` 是它自己的 partialResult 回调
                    // （见 pi-agent-core/agent-loop.js，它会把入参包进 tool_execution_update 事件），
                    // 不是 AgentEvent 通道。工具发的 AgentEvent 必须走请求上下文里的汇聚点，
                    // 否则会被 kernel 静默丢弃。
                    onEvent: requestContext?.onEvent
                };
                // Count attempted calls before authorization/execution. This is the single concrete
                // side-effect boundary shared by every Pi tool, so parallel batches cannot race past it.
                consumeAgentRunToolCall(requestContext?.agentRunBudget);
                const authorizationInput = {
                    toolName: fnDef.name,
                    params: actualParams,
                    metadata: enterpriseMetadata,
                    channel: requestContext?.channel,
                    scopes: requestContext?.toolPolicyScopes,
                    scopeSource: requestContext?.toolPolicyScopeSource,
                    mode: requestContext?.toolPolicyMode,
                    resourcePolicy: requestContext?.resourcePolicy,
                    fileMutationPolicyMode: requestContext?.fileMutationPolicyMode,
                    signal: actualSignal,
                    approvalHandler: requestContext?.toolApprovalHandler,
                    sessionId: toolContext.sessionId,
                };
                const authorization = await authorizeToolCall(authorizationInput);
                try {
                    const projection = toolPolicyDecisionTrace(authorizationInput, authorization);
                    requestContext?.traceEventSink?.("tool_policy_decision", projection);
                    requestContext?.harnessEventSink?.("tool_policy_decision", projection);
                }
                catch {
                    // Policy decisions must not depend on diagnostics.
                }
                if (!authorization.allowed) {
                    const aborted = authorization.decision === "aborted";
                    const executionRecord = attachRecord(buildToolExecutionRecord({
                        toolName: fnDef.name,
                        toolCallId: actualToolCallId,
                        params: actualParams,
                        status: aborted ? "aborted" : "error",
                        code: authorization.code,
                        message: authorization.reason,
                        retryable: false,
                        metadata: enterpriseMetadata,
                        startedAt: executionStartedAt,
                    }));
                    return {
                        content: [{
                                type: "text",
                                text: JSON.stringify({
                                    error: {
                                        code: authorization.code,
                                        message: authorization.reason,
                                    },
                                }),
                            }],
                        isError: true,
                        details: {
                            error: authorization.code,
                            policy: authorization,
                            ...(aborted ? { aborted: true } : {}),
                            executionRecord,
                        },
                    };
                }
                if (authorization.approvedParams !== undefined) {
                    // A cross-turn receipt approves the original exact call, not the model's regenerated
                    // approximation. The raw payload is process-local and never enters trace/history.
                    executionParams = authorization.approvedParams;
                }
                if (actualSignal?.aborted)
                    throw new ToolAbortedError(fnDef.name);
                const paramError = validateToolParams(fnDef, executionParams);
                if (paramError) {
                    const executionRecord = attachRecord(buildToolExecutionRecord({
                        toolName: fnDef.name,
                        toolCallId: actualToolCallId,
                        params: executionParams,
                        status: "error",
                        code: "invalid_tool_params",
                        message: paramError,
                        retryable: true,
                        metadata: enterpriseMetadata,
                        startedAt: executionStartedAt,
                    }));
                    return {
                        content: [{ type: "text", text: `Error executing tool ${fnDef.name}: ${paramError}` }],
                        isError: true,
                        details: {
                            error: "invalid_tool_params",
                            originalLength: paramError.length,
                            normalizedLength: paramError.length,
                            snippet: paramError.slice(0, 200),
                            executionRecord,
                        },
                    };
                }
                // 登记"正在执行哪个工具、跑了多久"，供 /queue 与诊断读取；必须配 finally 注销。
                const activeEntry = markToolStart(toolContext.sessionId, fnDef.name);
                let resultText;
                try {
                    registryExecutionStarted = true;
                    resultText = await raceAbort(actualSignal, fnDef.name, registry.execute(fnDef.name, executionParams, actualSignal, toolContext));
                }
                finally {
                    markToolEnd(toolContext.sessionId, activeEntry);
                }
                let normalizedResultText = normalizeToolResultText(fnDef.name, resultText);
                let historyResultText = normalizeHistoryToolResultText(fnDef.name, resultText);
                // Failure detection MUST run on the raw result — the notes block below
                // may contain error-like wording from past lessons.
                const failureReason = detectToolFailure(resultText);
                // Skill notes injection (docs/TASK_MEMORY_DESIGN.md §3): on the FIRST
                // use of a skill in this session, prepend its accumulated lessons into
                // the tool result at creation time. History stays append-only (cache
                // safe) and the block arrives exactly when the skill is being used —
                // even a failed first call carries the remedy for the retry.
                try {
                    const ownerSkill = registry.getToolOwner(fnDef.name);
                    const notesBlock = ownerSkill
                        ? SkillNotesStore.getInstance().readInjectionBlock(toolContext.sessionId, ownerSkill)
                        : null;
                    if (notesBlock) {
                        normalizedResultText = `${notesBlock}\n\n${normalizedResultText}`;
                        historyResultText = `${notesBlock}\n\n${historyResultText}`;
                        logger?.writeEvent('skill_notes_inject', {
                            skillId: ownerSkill,
                            toolName: fnDef.name,
                            bytes: Buffer.byteLength(notesBlock, "utf-8"),
                        });
                    }
                }
                catch (e) {
                    console.warn(`[SkillNotes] injection failed (non-fatal) for ${fnDef.name}:`, e);
                }
                const executionRecord = buildToolExecutionRecord({
                    toolName: fnDef.name,
                    toolCallId: actualToolCallId,
                    params: executionParams,
                    rawResult: resultText,
                    status: failureReason ? "error" : "ok",
                    code: failureReason ? "tool_reported_error" : "ok",
                    ...(failureReason ? { message: failureReason } : {}),
                    metadata: enterpriseMetadata,
                    startedAt: executionStartedAt,
                });
                const verification = await verifyToolExecution(executionRecord, {
                    sessionId: toolContext.sessionId,
                    toolName: fnDef.name,
                    params: executionParams,
                    rawResult: resultText,
                    metadata: enterpriseMetadata.metadata,
                    signal: actualSignal,
                });
                if (verification) {
                    executionRecord.verification = verification;
                    if (resolveVerifierMode() === "enforce" && verification.status === "failed") {
                        executionRecord.status = "error";
                        executionRecord.code = "verification_failed";
                        executionRecord.message = "The tool result failed deterministic verification.";
                        const failedCriteria = verification.criterionResults
                            .filter((criterion) => criterion.status === "failed")
                            .slice(0, 5)
                            .map((criterion) => ({
                            criterionId: criterion.criterionId,
                            ...(criterion.message
                                ? { message: criterion.message.slice(0, 500) }
                                : {}),
                        }));
                        const verificationFailureText = JSON.stringify({
                            error: {
                                code: "verification_failed",
                                message: executionRecord.message,
                                verifierId: verification.verifierId,
                                failedCriteria,
                                ...(verification.suggestedRepair
                                    ? { suggestedRepair: verification.suggestedRepair.slice(0, 500) }
                                    : {}),
                            },
                        });
                        // The model-facing result must agree with the authoritative execution record. Keeping
                        // the executor's success text here invites a false report or an identical blind retry.
                        normalizedResultText = verificationFailureText;
                        historyResultText = verificationFailureText;
                    }
                    try {
                        const projection = verificationResultTrace(verification);
                        requestContext?.traceEventSink?.("verification_result", projection);
                        requestContext?.harnessEventSink?.("verification_result", {
                            ...projection,
                            toolName: fnDef.name,
                        });
                    }
                    catch {
                        // Verification results do not depend on diagnostics.
                    }
                }
                attachRecord(executionRecord);
                const resultIsError = executionRecord.status !== "ok";
                const resultError = resultIsError
                    ? executionRecord.code || executionRecord.message || failureReason || "tool_execution_failed"
                    : failureReason;
                // 「调用成功即终局」的工具（如 cron_run_complete）在这里把请求翻译成 pi 的
                // 提前终止：pi 只在**整批**工具结果都 terminate 时才提前结束，所以与其它工具
                // 并列调用会自动退化为不终止。失败结果一律不终止——模型必须还能拿到更正机会。
                const termination = getRunTermination(requestContext);
                const terminatesRun = !resultIsError
                    && !failureReason
                    && termination?.toolName === fnDef.name;
                if (terminatesRun) {
                    logger?.writeEvent('run_termination_by_tool', {
                        toolName: fnDef.name,
                        reason: termination.reason,
                    });
                }
                return {
                    content: [{ type: "text", text: normalizedResultText }],
                    isError: resultIsError || !!failureReason,
                    ...(terminatesRun ? { terminate: true } : {}),
                    details: {
                        result: historyResultText,
                        ...(resultError ? { error: resultError } : {}),
                        originalLength: resultText.length,
                        normalizedLength: normalizedResultText.length,
                        snippet: normalizedResultText.length > 200 ? normalizedResultText.slice(0, 200) + "..." : normalizedResultText,
                        executionRecord,
                    }
                };
            }
            catch (error) {
                if (error instanceof AgentRunBudgetExceededError)
                    throw error;
                if (error instanceof ToolAbortedError) {
                    // 用户主动中止不是故障，不要记成 Tool Execution Error 污染日志与技能笔记。
                    const uncertainAfterAbort = registryExecutionStarted
                        && enterpriseMetadata.metadata?.sideEffect !== "none";
                    const executionRecord = attachRecord(buildToolExecutionRecord({
                        toolName: fnDef.name,
                        toolCallId: actualToolCallId,
                        params: executionParams,
                        status: "aborted",
                        code: uncertainAfterAbort ? "uncertain_after_abort" : "aborted_by_user",
                        retryable: false,
                        metadata: enterpriseMetadata,
                        startedAt: executionStartedAt,
                    }));
                    return {
                        content: [{ type: "text", text: `工具 ${fnDef.name} 已被用户中止。` }],
                        isError: true,
                        details: {
                            error: "aborted_by_user",
                            aborted: true,
                            ...(uncertainAfterAbort ? { sideEffectState: "uncertain_after_abort" } : {}),
                            executionRecord,
                        }
                    };
                }
                logger?.logError(`Tool Execution Error: ${fnDef.name}`, error);
                // `error.message` 可能是空串（底层抛了个没消息的对象）。此前直接拼进去，
                // 模型收到的就是 "Error executing tool X: "，等于什么都没说。
                const failureDetail = describeThrown(error);
                const executionRecord = attachRecord(buildToolExecutionRecord({
                    toolName: fnDef.name,
                    toolCallId: actualToolCallId,
                    params: executionParams,
                    status: "error",
                    code: "tool_execution_exception",
                    message: failureDetail,
                    metadata: enterpriseMetadata,
                    startedAt: executionStartedAt,
                }));
                const failureText = `Error executing tool ${fnDef.name}: ${failureDetail}`;
                return {
                    content: [{ type: "text", text: failureText }],
                    isError: true,
                    details: {
                        error: failureDetail,
                        // 异常路径此前不填这三个字段，于是 trace 里所有工具异常都长成
                        // `resultLength: 0, snippet: ""`——事后完全看不出报的是什么。
                        originalLength: failureText.length,
                        normalizedLength: failureText.length,
                        snippet: failureText.slice(0, 200),
                        executionRecord,
                    }
                };
            }
        };
        // 单一注册：每个工具只注册一次
        const executionMode = executionModeForTool(fnDef.name, enterpriseMetadata);
        // 工具自带的参数规整在 pi 的 schema 校验之前执行；规整自身出错时交回原参数，
        // 让校验照常给出错误，而不是吞掉这次调用。
        const argumentPreparer = registry.getToolArgumentPreparer?.(fnDef.name);
        const tool = {
            name: fnDef.name,
            label: fnDef.name,
            description: fnDef.description || "",
            parameters: fnDef.parameters,
            execute: executeFunction,
            ...(argumentPreparer
                ? {
                    prepareArguments: (args) => {
                        try {
                            return argumentPreparer(args);
                        }
                        catch {
                            return args;
                        }
                    },
                }
                : {}),
            ...(executionMode
                ? { executionMode }
                : {}),
        };
        tools.push(tool);
        // console.log(`[convertTools]   ✓ ${fnDef.name}`);
    }
    console.log(`[convertTools] ✓ Converted ${tools.length} tools (single registration, ` +
        `fuzzy matching will be applied via interceptor)`);
    return tools;
}
/**
 * 创建 pi-ai 兼容的模型实例
 */
/**
 * @param modelOverride P2-a: AgentProfile 指定的模型。沿用当前 provider 的
 *   endpoint/鉴权，只替换 chatModel —— RPA 回复要快且便宜，不该被主 agent 的
 *   模型选择绑死。省略时行为与迁移前完全一致。
 */
export function createPiModel(modelOverride) {
    const llmManager = LLMManager.getInstance();
    const config = llmManager.getConfig();
    const providerId = config.activeProviderId;
    const provider = config.providers.find(p => p.id === providerId);
    const withOverride = (p) => modelOverride ? { ...p, chatModel: modelOverride } : p;
    if (!provider) {
        console.warn(`[Adapter] Active provider ${providerId} not found, falling back to first available.`);
        if (config.providers.length > 0) {
            // Fallback logic
            const fallback = config.providers[0];
            return createModelFromProvider(withOverride(fallback));
        }
        throw new Error(`No LLM providers configured.`);
    }
    return createModelFromProvider(withOverride(provider));
}
function createModelFromProvider(provider) {
    const modelId = provider.chatModel;
    const llmManager = LLMManager.getInstance();
    const authToken = llmManager.getAuthToken();
    const shouldRequireGatewayAuth = !!process.env.REMOTE_SERVER_URL;
    if (shouldRequireGatewayAuth && !authToken) {
        throw new Error("登录状态到期，请重启客户端并重新登录");
    }
    let apiKey = provider.apiKey;
    let baseUrl = provider.baseURL || "https://api.openai.com/v1";
    // Commercial Architecture Override
    if (authToken) {
        apiKey = authToken;
        const port = process.env.PORT || 3000; // Fixed from 4000 to 3000 to match server/proxy
        baseUrl = `http://127.0.0.1:${port}/v1`;
        console.log(`[Adapter] Using Commercial Gateway: ${baseUrl}`);
    }
    // 设置环境变量，这是 pi-ai 获取 API Key 的主要方式
    if (apiKey) {
        process.env.OPENAI_API_KEY = apiKey;
    }
    // Fix for DeepSeek: Ensure /v1 is present for openai-responses compatibility
    if (baseUrl.includes("deepseek.com") && !baseUrl.endsWith("/v1")) {
        baseUrl += "/v1";
    }
    // Get Channel ID for headers
    const channelId = llmManager.getChannelId();
    const headers = {};
    if (channelId) {
        headers['x-channel-id'] = channelId;
    }
    // Add Trace ID from Context (for usage tracking grouping)
    const context = getContext();
    if (context?.traceId) {
        headers['x-yoko-trace-id'] = context.traceId;
        // console.log(`[Adapter] Attaching Trace ID: ${context.traceId}`);
    }
    // 模型特性检测
    const isO1Model = modelId.includes("o1-");
    const isKimiModel = modelId.includes("kimi") || modelId.includes("moonshot");
    const isKimiK25 = modelId.includes("kimi-k2.5") || modelId.includes("kimi-k2-5");
    const isClaudeModel = modelId.toLowerCase().includes("claude");
    const isGpt5ReasoningModel = /^gpt-5\./.test(modelId); // gpt-5.4 / gpt-5.5 等经由 Responses API 返回 reasoning
    // Claude 模型走 Anthropic 原生格式（触发 BLT prompt cache）
    if (isClaudeModel) {
        // Pi 通过 provider="anthropic" 读取 ANTHROPIC_API_KEY 环境变量
        process.env.ANTHROPIC_API_KEY = apiKey;
        // Anthropic SDK 会自动在 baseUrl 后追加 /v1/messages
        // 统一去掉末尾的 /v1，让 SDK 正确拼出 .../v1/messages
        // 商业模式：baseUrl = http://127.0.0.1:{port}/v1 → http://127.0.0.1:{port}
        // 直连模式：baseUrl = https://api.bltcy.ai（无 /v1，去掉也无影响）
        const anthropicBaseUrl = baseUrl.replace(/\/v1\/?$/, "");
        if (authToken) {
            // 代理模式：给 Authorization 头，让服务端 authMiddleware 能通过验证
            // （Anthropic SDK 发 x-api-key，而服务端只认 Authorization: Bearer）
            headers["Authorization"] = `Bearer ${apiKey}`;
        }
        const model = {
            id: modelId,
            name: modelId,
            provider: "anthropic",
            api: "anthropic-messages",
            baseUrl: anthropicBaseUrl,
            reasoning: false, // 不注入 thinking 参数，BLT 模型自行处理
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            // 物理窗口来自服务端 /v1/models，客户端不写死（见 context_window.ts）。
            // 这里是**同步**构造点，只能读已有缓存；缓存冷时先用保守默认，
            // 由 kernel 每轮开始前的 checkContextWindow 校准成真值。
            contextWindow: llmManager.getCachedModelContextInfo(modelId).physical ?? FALLBACK_CONTEXT_WINDOW,
            maxTokens: 8192,
            // @ts-ignore
            headers,
        };
        console.log(`[Adapter] Created Anthropic PiModel: ${model.id} ` +
            `(BaseURL: ${model.baseUrl}, ChannelID: ${channelId})`);
        return model;
    }
    // Kimi K2.5 thinking模式兼容方案（双保险）：
    //
    // 问题：Kimi K2.5默认开启thinking模式，要求多轮对话中的assistant消息包含reasoning_content。
    //
    // 修复1（核心）：reasoning=true 让pi-ai从流式响应中捕获reasoning_content为thinking block，
    //   kernel.ts的streamWithAdapter保留带thinkingSignature的thinking block，
    //   pi-ai的convertMessages在后续请求中自动回填reasoning_content字段。
    //
    // 修复2（辅助）：thinkingFormat="zai" 尝试注入thinking:{type:"disabled"}来关闭思考模式，
    //   减少token消耗。但商业网关可能过滤此参数，故修复1是必须的。
    //
    // 约束：supportsDeveloperRole=false 防止pi-ai将system角色改为developer（Kimi不支持）。
    const model = {
        id: modelId,
        name: modelId,
        provider: "openai",
        api: "openai-completions",
        baseUrl: baseUrl,
        reasoning: isO1Model || isKimiK25 || isGpt5ReasoningModel, // reasoning=true 让 pi-ai 捕获 delta.reasoning_content 为思考块
        input: ["text", "image"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        // 报**物理**窗口，不是我们愿意喂的量。这个字段在 pi 里只有一个下游读者会伤人：
        // `isContextOverflow` 拿它判断"请求是不是溢出了"——写小了会把成功的请求
        // 判成溢出，触发压缩+重试，进而卡死（详见 context_window.ts 的复盘）。
        //
        // 真值来自服务端 /v1/models，客户端不再自带模型表。这里是**同步**构造点，
        // 只能读已有缓存；缓存冷时先用保守默认，由 kernel 每轮开始前的
        // checkContextWindow 校准成真值。压缩时机始终由质量预算单独控制。
        contextWindow: llmManager.getCachedModelContextInfo(modelId).physical ?? FALLBACK_CONTEXT_WINDOW,
        maxTokens: 8192,
        // @ts-ignore
        headers: headers,
        compat: {
            supportsUsageInStreaming: true,
            // Kimi K2.5：使用"zai"格式注入 thinking:{type:"disabled"}
            // 这是pi-ai原生支持的机制，确保参数到达API请求体
            ...(isKimiK25 && {
                thinkingFormat: "zai",
                supportsDeveloperRole: false, // Kimi不支持developer角色
            }),
        }
    };
    console.log(`[Adapter] Created PiModel: ${model.id} ` +
        `(BaseURL: ${model.baseUrl}, ChannelID: ${channelId}, ` +
        `Reasoning: ${model.reasoning}` +
        `${isKimiK25 ? ', ThinkingFormat: zai (will inject thinking:disabled)' : ''}` +
        `${isGpt5ReasoningModel ? ', via BLT Responses API' : ''})`);
    return model;
}
