import * as crypto from "crypto";
import { isKnowledgePath } from "../../memory/vector.js";
import { resolveProfile } from "../profile/resolver.js";
import { SessionCache } from "./session_cache.js";
import { convertTools, createPiModel } from "./adapter.js";
import { buildYokoSystemPrompt } from "./system-prompt.js";
import { extractText } from "../../utils/content.js";
import { DebugLogger } from "../diagnostics/debug_logger.js";
import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";
import { patchToolArrayWithFuzzyMatching } from "./tool_interceptor.js";
import { createAssistantMessageEventStream } from "@earendil-works/pi-ai";
// pi 0.81 起 streamSimple 移出根导出。根包只保留 provider 无关的类型与工具，
// 真正会把所有内置 provider 拉进包的实现挪到了 /compat。
import { streamSimple } from "@earendil-works/pi-ai/compat";
import { createYokoResourceLoader, bindPromptHolder, setTurnSystemPrompt, syncStateSystemPrompt, installTurnPromptGuard, installToolResultErrorGuard, looksLikePiBuiltinPrompt, } from "./session_runtime.js";
import { isSummarizationRequest, stripEmptyTextParts } from "./summarization_request.js";
import { validateAnthropicTurns, detectRepetitiveLoop, normalizeMessageContents, pruneAssistantThinkingContent } from "./sanitization.js";
import { shouldPruneReplayedReasoning } from "./reasoning_replay.js";
import { applyInTurnCompactionGuard, readBaseReserveTokens } from "./inturn_compaction.js";
import { clearCompactionTimeout, markCompactionTimedOut, resolveFallbackTurnLimit, shouldSkipCompaction, } from "./compaction_fallback.js";
import { THINKING_HEADER, THINKING_OFF, isDeepSeekThinkingDisabled } from "./deepseek_thinking.js";
import { ragFactKey, extractInjectedContextIds, buildSessionContextBlock, createRuntimeTimeSnapshot, buildRuntimeTimeContextBlock, SESSION_CONTEXT_CUSTOM_TYPE, SEND_HISTORY_TURN_LIMIT, } from "./session-context.js";
import { deduplicateSessionHeaders, normalizeStructuredPiContent, migrateSessionFileIfNeeded, loadLinearMessagesFromSessionFile } from "./session-file.js";
import { canCompactHistoryWithinWindow, qualityBudgetFor, FALLBACK_CONTEXT_WINDOW } from "./context_window.js";
import { isAutomaticCompactionReason, isRunCancelledError, isSuccessfulSettledAssistant, isSuccessfulToolTermination, PiPhaseTimeoutError, PiRunCancelledError, StreamIdleTimeoutError, throwIfRunCancelled, waitForPiPhase, withStreamIdleTimeout, } from "./run_lifecycle.js";
import path from "path";
import fs from "fs";
import { adapterManager } from "./adapters/manager.js";
import { normalizeError } from "./errors.js";
import { getContext, getRunTermination } from "../../utils/context.js";
import { config } from "../../config/index.js";
import { BillingManager } from "../../commercial/billing.js";
import { filterAndSanitizeMemoryChunks } from "../../memory/evolution.js";
import { createPolicyCandidate, detectGroundedMemoryIds, selectMemoriesForContext, } from "../../memory/recall.js";
import { judgeAmbiguousMemoriesWithLlm } from "../../memory/recall_judge.js";
import { searchWorkflowKnowledge } from "../../memory/workflow_rag.js";
import { mainScopeNamespaces } from "../../knowledge/registry.js";
import { attachImageTokensToFacts, IMAGE_TOKENS_CTX_KEY } from "../../memory/image_tokens.js";
import { TurnMemoryExtractor } from "../../memory/turn_extractor.js";
import { isPresentationOnlyMessage } from "../../gateway/model_history.js";
import { resolvePiRuntimeLimits } from "./runtime_limits.js";
import { TaskOutcomeExtractor } from "../../memory/task_outcome_extractor.js";
import { SessionLedgerManager } from "./session-ledger.js";
import { friendlyModelError } from "./model_error.js";
import { isAgenticRun } from "../profile/agentic_guard.js";
import { LLMManager } from "../llm/manager.js";
import { consumeAgentRunOutputText, consumeAgentRunTurn } from "../run/budget.js";
import { estimateContextMessageTokens, estimateContextStringTokens } from "./context_estimator.js";
import { appendOutputTruncationNotice, isLengthStopReason, OUTPUT_TRUNCATION_NOTICE } from "./output_truncation.js";
import { observeContextProjection, } from "../harness/context_projection_trace.js";
import { buildContextProjectionMessages, resolveContextProjectionMode, } from "./context_projection.js";
import { buildHarnessManifest } from "../harness/manifest.js";
import { buildCapabilityManifest, capabilityManifestTrace } from "../harness/capability_manifest.js";
import { resolveToolPolicyVersionCoordinate } from "../harness/tool_policy_gateway.js";
import { resolveTaskContractMode } from "../harness/task_contract.js";
import { resolveVerifierMode } from "../harness/verifier.js";
// Helper to convert MessageContent to pi-ai compatible content
/**
 * 把 pi 的多模态 content 数组拆成 `AgentSession.prompt(text, { images })` 需要的两半。
 *
 * 多个文本块用换行拼接：pi 只接受单个 text 参数，丢掉任何一段都会丢内容。
 * 纯图片输入时 text 为空串 —— pi 仍会产出一个空 text 块，由送前消毒的
 * `stripEmptyTextParts` 清掉（Anthropic 拒绝空文本块）。
 */
function splitPiContentForPrompt(content) {
    if (!Array.isArray(content))
        return { text: String(content ?? ""), images: [] };
    const texts = [];
    const images = [];
    for (const part of content) {
        if (part?.type === "text") {
            const t = part.text;
            if (typeof t === "string" && t.length > 0)
                texts.push(t);
        }
        else if (part?.type === "image") {
            images.push(part);
        }
    }
    return { text: texts.join("\n"), images };
}
function convertToPiContent(content) {
    if (typeof content === "string")
        return content;
    return content.map((part) => {
        if (part.type === "text") {
            return { type: "text", text: part.text || "" };
        }
        else if (part.type === "image" && part.data) {
            return {
                type: "image",
                mimeType: part.mimeType || "image/jpeg",
                data: part.data
            };
        }
        else if (part.type === "image_url" && part.image_url) {
            const url = part.image_url.url;
            // Check for Data URI
            const match = url.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
                return {
                    type: "image",
                    mimeType: match[1],
                    data: match[2]
                };
            }
            // Fallback for regular URLs (Note: pi-ai ImageContent strictly expects data/base64, 
            // but we map url to data as a best-effort. Adapters might need to handle this or it might fail)
            return {
                type: "image",
                mimeType: "image/jpeg", // Default fallback
                data: url
            };
        }
        return { type: "text", text: "" };
    });
}
function summarizeMessages(messages) {
    const byRole = {};
    for (const msg of messages) {
        const role = typeof msg?.role === "string" ? msg.role : "unknown";
        byRole[role] = (byRole[role] || 0) + 1;
    }
    const lastRoles = messages.slice(-6).map((msg) => String(msg?.role || "unknown"));
    const lastUser = [...messages].reverse().find((msg) => msg?.role === "user");
    const lastAssistant = [...messages].reverse().find((msg) => msg?.role === "assistant");
    return {
        total: messages.length,
        byRole,
        lastRoles,
        lastUserPreview: extractText(lastUser?.content || "").slice(0, 120),
        lastAssistantPreview: extractText(lastAssistant?.content || "").slice(0, 120)
    };
}
const TRACE_HISTORY_MESSAGES = 8;
const TRACE_HISTORY_CHARS = 400;
const TRACE_EVIDENCE_CHARS = 500;
const SAFE_TRACE_ID_RE = /^[a-zA-Z0-9_-]+$/;
function sourceTraceIdFromHistoryMessage(message) {
    const direct = message?.traceId ?? message?.metadata?.traceId;
    if (typeof direct === "string" && SAFE_TRACE_ID_RE.test(direct))
        return direct;
    const id = typeof message?.id === "string" ? message.id : "";
    const preview = id.match(/(?:^|:)preview:([a-zA-Z0-9_-]+)/);
    if (preview?.[1] && SAFE_TRACE_ID_RE.test(preview[1]))
        return preview[1];
    const run = id.match(/(?:^|:)run:([a-zA-Z0-9_-]+):(?:phase|attachment):/);
    if (run?.[1] && SAFE_TRACE_ID_RE.test(run[1]))
        return run[1];
    return undefined;
}
function buildTraceHistoryPreview(history) {
    return (history || [])
        .filter((message) => message?.role === "user" || message?.role === "assistant")
        .slice(-TRACE_HISTORY_MESSAGES)
        .map((message) => {
        const content = extractText(message.content || "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, TRACE_HISTORY_CHARS);
        const sourceTraceId = sourceTraceIdFromHistoryMessage(message);
        return {
            role: message.role,
            content,
            ...(sourceTraceId ? { sourceTraceId } : {}),
        };
    })
        .filter((message) => message.content);
}
function buildTraceKnowledgeEvidence(facts) {
    return facts.slice(0, 5).map((fact) => ({
        id: fact.id,
        source: fact.source,
        path: fact.path,
        relevance: typeof fact.relevance === "number" ? fact.relevance : undefined,
        snippet: String(fact.text || "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, TRACE_EVIDENCE_CHARS),
        hasImage: !!fact.imageUrl,
    }));
}
export function convertGatewayHistoryToAgentMessages(history, maxMessages = 80) {
    const converted = [];
    for (const item of history || []) {
        // Gateway should already pass the primary stream only. Keep this guard
        // for legacy primary files and future callers that provide merged UI data.
        if (isPresentationOnlyMessage(item)) {
            continue;
        }
        const role = item?.role;
        if (role !== "user" && role !== "assistant" && role !== "tool" && role !== "toolResult") {
            continue;
        }
        if (role === "user") {
            converted.push({
                role: "user",
                content: convertToPiContent(item.content),
                timestamp: item.timestamp || Date.now()
            });
            continue;
        }
        const itemAny = item;
        converted.push({
            ...itemAny,
            role: role === "tool" ? "toolResult" : role,
            content: normalizeStructuredPiContent(item.content),
            timestamp: item.timestamp || Date.now(),
            ...(role === "tool" || role === "toolResult"
                ? {
                    toolCallId: itemAny.toolCallId || itemAny.tool_call_id,
                    toolName: itemAny.toolName || itemAny.name || "unknown",
                    isError: itemAny.isError === true,
                }
                : {})
        });
    }
    const limited = converted.length <= maxMessages ? converted : converted.slice(-maxMessages);
    // External channel/preview history is intentionally lightweight and older
    // records may not carry Pi's required assistant usage metadata. Normalize at
    // the ingress boundary so ephemeral sessions never receive invalid history.
    return normalizeMessageContents(limited).messages;
}
function detectOutcomeSignal(currentInput, history) {
    if (!currentInput || !history || history.length === 0) {
        return { type: 'none', confidence: 0 };
    }
    if (!history.some(m => m.role === 'assistant')) {
        return { type: 'none', confidence: 0 };
    }
    const correctionPatterns = [
        /不对|不是这个意思|你理解错了|重新来|不是这样/,
        /再试一次|重新生成|这个不对|错了|不行/,
        /我说的是.{0,30}不是/,
    ];
    const continuationPatterns = [
        /继续|那么|然后|接下来|基于此|在这个基础上/,
        /刚才说的|你刚才|上面那个|刚才那个/,
    ];
    for (const p of correctionPatterns) {
        if (p.test(currentInput))
            return { type: 'correction', confidence: 0.8 };
    }
    for (const p of continuationPatterns) {
        if (p.test(currentInput))
            return { type: 'continuation', confidence: 0.7 };
    }
    return { type: 'topic_shift', confidence: 0.5 };
}
function outcomeSignalTraceType(signal) {
    if (signal.type === "correction")
        return "correction_signal";
    if (signal.type === "continuation")
        return "continuation_signal";
    if (signal.type === "topic_shift")
        return "topic_shift";
    return undefined;
}
// Cache for active sessions (LRU + TTL; 运行中的会话永不淘汰)
const sessionCache = new SessionCache();
export function clearSessionCache() {
    sessionCache.clear();
    console.log("[PiKernel] Session cache cleared.");
}
function parsePromptCacheRetention(value) {
    if (typeof value !== "string")
        return undefined;
    const normalized = value.trim().toLowerCase();
    if (normalized === "none" || normalized === "short" || normalized === "long") {
        return normalized;
    }
    return undefined;
}
function parsePositiveInt(value, fallback) {
    if (typeof value !== "string" || !value.trim())
        return fallback;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function countUserTurns(context) {
    const messages = Array.isArray(context.messages) ? context.messages : [];
    return messages.filter((message) => message?.role === "user").length;
}
function estimateRequestTokens(context) {
    const messages = Array.isArray(context.messages) ? context.messages : [];
    const messageTokens = messages.reduce((sum, message) => sum + estimateContextMessageTokens(message), 0);
    let toolTokens = 0;
    try {
        const tools = Array.isArray(context.tools) ? context.tools : [];
        const providerTools = tools.map((tool) => ({
            name: tool?.name,
            description: tool?.description,
            parameters: tool?.parameters,
            deferLoading: tool?.deferLoading,
        }));
        toolTokens = estimateContextStringTokens(JSON.stringify(providerTools));
    }
    catch { /* diagnostics must never affect the request */ }
    return estimateContextStringTokens(String(context.systemPrompt || "")) + messageTokens + toolTokens;
}
function isLongPromptCacheSafe(model) {
    const provider = String(model.provider || "").toLowerCase();
    const api = String(model.api || "").toLowerCase();
    const baseUrl = String(model.baseUrl || "").toLowerCase();
    if (provider === "anthropic" || api === "anthropic-messages")
        return true;
    if (baseUrl.includes("api.openai.com"))
        return true;
    return process.env.YOKO_ALLOW_LONG_CACHE_ON_PROXY === "true";
}
function resolveRuntimeContextProjectionMode() {
    return resolveContextProjectionMode({
        requested: process.env.YOKO_PREFIX_MONOTONIC,
    });
}
function resolvePromptCacheRetention(model, context, options) {
    const existing = parsePromptCacheRetention(options?.cacheRetention);
    if (existing)
        return existing;
    const override = parsePromptCacheRetention(process.env.YOKO_PROMPT_CACHE_RETENTION);
    if (override)
        return override;
    if (process.env.YOKO_AUTO_LONG_PROMPT_CACHE === "false") {
        return undefined;
    }
    const minUserTurns = parsePositiveInt(process.env.YOKO_LONG_CACHE_MIN_USER_TURNS, 12);
    if (countUserTurns(context) < minUserTurns) {
        return undefined;
    }
    return isLongPromptCacheSafe(model) ? "long" : undefined;
}
/**
 * Custom stream wrapper that uses AdapterManager to process thinking tags
 * BEFORE they reach the agent's memory or the UI.
 */
export function streamWithAdapter(model, contextOrMessages, options, rawStreamFactory = streamSimple) {
    // Handle mismatch where pi-agent-core might pass AgentMessage[] instead of Context
    const context = Array.isArray(contextOrMessages)
        ? { messages: contextOrMessages }
        : contextOrMessages;
    const stream = createAssistantMessageEventStream();
    // 只有 done / error 事件会让 stream.result() settle（见下方 finally 的说明）。
    // 记录是否见过终态，缺失时在 finally 里补发，保证调用方一定能等到结果。
    let sawTerminalEvent = false;
    let streamFailure;
    const pushEvent = (event) => {
        if (event?.type === "done" || event?.type === "error")
            sawTerminalEvent = true;
        stream.push(event);
    };
    // 提到 try 之外：catch 要靠这两个值区分"我们发起的超时 abort"和"用户按了停止"。
    let idleTimedOut = false;
    let callerSignal;
    (async () => {
        try {
            // 1. Get appropriate adapter
            const adapter = adapterManager.getAdapter(model.provider, model.id);
            // console.log(`[StreamAdapter] Using adapter ${adapter.id} for ${model.id}`);
            // 2. Initialize state
            let adapterState = {
                isThinking: false,
                buffer: ""
            };
            // Track clean text for each content index to patch partials
            const cleanTextMap = new Map();
            // Helper to patch partial message with clean text
            const patchPartial = (partial) => {
                if (!partial || !partial.content)
                    return partial;
                const newPartial = { ...partial };
                newPartial.content = [...partial.content];
                cleanTextMap.forEach((text, index) => {
                    if (newPartial.content[index] && newPartial.content[index].type === "text") {
                        newPartial.content[index] = { ...newPartial.content[index], text };
                    }
                });
                return newPartial;
            };
            // --- SEND-TIME SANITIZATION (transient; never persisted) ---
            // The canonical session history (session.agent.state.messages) stays
            // structured: past tool calls/results remain native function-call
            // protocol messages, so the model always sees real tool-call examples.
            // All lossy/limiting/adapter shaping happens HERE, on a copy used only
            // for this single API request. Nothing computed here is written back,
            // so it can never poison the persisted session or compound across turns.
            //
            // Regression context: previously these transforms ran in run() and were
            // written back to state.messages, and pruneToolProtocolArtifacts rewrote
            // every historical tool call/result into "[Historical tool observation]"
            // plain text. In long sessions the model imitated that text instead of
            // emitting real tool calls (stopReason:"stop", no tool executed), and the
            // damage was persisted — only a brand-new session recovered.
            let sendContext = context;
            // PR-1 shadow projection: protocol-safe and append-oriented, but never sent.
            // It lets us measure the cache/cost impact before changing production behavior.
            let candidateContext = context;
            let legacyContext = context;
            const projectionDecision = resolveRuntimeContextProjectionMode();
            let projectionMode = projectionDecision.mode;
            let projectionFallbackReason = projectionDecision.fallbackReason;
            const sourceMessagesForTrace = Array.isArray(context.messages) ? context.messages : [];
            const projectionTransformStats = {
                inputMessages: sourceMessagesForTrace.length,
                outputMessages: sourceMessagesForTrace.length,
                inputEstimatedTokens: estimateRequestTokens(context),
                outputEstimatedTokens: estimateRequestTokens(context),
                limitedUserTurns: 0,
                browserSnapshotsRewritten: 0,
                orphanToolMessagesRemoved: 0,
                sanitizationFallback: false,
            };
            // pi 0.83 起 compact() 也经由本函数发请求。摘要请求不是对话轮，
            // 套用下面这套聊天消毒会把正要被摘要的历史裁掉（详见
            // summarization_request.ts 的说明），必须分流。
            const summarizing = isSummarizationRequest(context);
            // ── 发车前哨兵：系统提示词必须是 YokoAgent 自己的 ──
            //
            // 工具清单是写在系统提示词里的。提示词一旦被 pi 换成它自带的
            // coding-agent 人设，模型就看不见任何本产品的工具——表现为"agent 突然
            // 变傻"，但不报错、不掉测试、日志里也没有任何异常。这类静默故障只能
            // 在发车的最后一刻拦。摘要请求用 pi 自己的提示词是正常的，跳过。
            if (!summarizing && looksLikePiBuiltinPrompt(context?.systemPrompt)) {
                console.error("[StreamAdapter] 严重：本轮系统提示词疑似被 pi 内置人设覆盖，" +
                    "模型将看不到 YokoAgent 的工具。请检查 ResourceLoader / before_agent_start 接线。");
            }
            try {
                const srcMessages = Array.isArray(context.messages) ? context.messages : [];
                if (summarizing) {
                    // 摘要请求只做与协议合法性有关的最小处理，不动历史窗口和轮次配对。
                    sendContext = { ...context, messages: stripEmptyTextParts(srcMessages) };
                    candidateContext = sendContext;
                    legacyContext = sendContext;
                }
                else {
                    const normalized = normalizeMessageContents(srcMessages);
                    // 只裁**发送侧**这一份投影：落盘、trace 与 UI 的「展开思考过程」都要留着，
                    // 否则一旦怀疑质量退化，连当时模型想了什么都查不到。
                    const pruneReplayedReasoning = shouldPruneReplayedReasoning({
                        modelId: model?.id,
                        sessionId: getContext()?.sessionId ?? options?.sessionId,
                    });
                    const thinkingPruned = pruneAssistantThinkingContent(normalized.messages, {
                        pruneReplayedReasoning,
                    });
                    projectionTransformStats.replayedReasoningPruned = pruneReplayedReasoning;
                    const validated = validateAnthropicTurns(thinkingPruned.messages);
                    const adapterSanitized = adapter.sanitizeMessages(validated);
                    // 压缩超时过的会话走硬裁：只留最近几轮，把上下文压回质量预算以内。
                    // 这是"压缩挂了 → 会话彻底不能用"的唯一出路——压缩是优化，不该是可用性的
                    // 必要条件。宁可丢一段旧上下文，也不能让用户每发一条消息就黑屏五分钟。
                    const trimSessionId = getContext()?.sessionId ?? options?.sessionId;
                    let sendTurnLimit = SEND_HISTORY_TURN_LIMIT;
                    if (trimSessionId && shouldSkipCompaction(trimSessionId)) {
                        const budget = qualityBudgetFor(Number(model?.contextWindow) || undefined, LLMManager.getInstance().getCachedModelContextInfo(model?.id)?.recommended);
                        sendTurnLimit = resolveFallbackTurnLimit((turnLimit) => estimateRequestTokens({
                            ...context,
                            messages: buildContextProjectionMessages(adapterSanitized, turnLimit).legacyMessages,
                        }), budget);
                        projectionTransformStats.compactionFallbackTurnLimit = sendTurnLimit;
                    }
                    const projections = buildContextProjectionMessages(adapterSanitized, sendTurnLimit);
                    candidateContext = { ...context, messages: projections.stableMessages };
                    legacyContext = { ...context, messages: projections.legacyMessages };
                    // 硬裁只有 legacy 投影会按轮次收窄（stable 不做窗口裁剪），
                    // 所以这一轮必须走 legacy，否则裁了等于没裁。
                    if (sendTurnLimit !== SEND_HISTORY_TURN_LIMIT) {
                        projectionMode = "legacy";
                        projectionFallbackReason = "compaction_timeout_hard_trim";
                    }
                    if (projectionMode === "stable") {
                        sendContext = candidateContext;
                        projectionTransformStats.orphanToolMessagesRemoved = projections.stable.orphanToolMessagesRemoved;
                    }
                    else {
                        sendContext = legacyContext;
                        projectionTransformStats.limitedUserTurns = projections.legacy.limitedUserTurns;
                        projectionTransformStats.browserSnapshotsRewritten = projections.legacy.browserSnapshotsRewritten;
                        projectionTransformStats.orphanToolMessagesRemoved = projections.legacy.orphanToolMessagesRemoved;
                    }
                }
            }
            catch (e) {
                console.error("[StreamAdapter] Send-time sanitization failed; sending raw context:", e);
                sendContext = context;
                candidateContext = context;
                legacyContext = context;
                projectionMode = "legacy";
                projectionFallbackReason = "sanitization_failure";
                projectionTransformStats.sanitizationFallback = true;
            }
            const physicalWindow = Number(model.contextWindow) > 0
                ? Number(model.contextWindow)
                : FALLBACK_CONTEXT_WINDOW;
            const candidateEstimatedTokens = estimateRequestTokens(candidateContext);
            if (!summarizing && projectionMode === "stable" && candidateEstimatedTokens > physicalWindow) {
                sendContext = legacyContext;
                projectionMode = "shadow";
                projectionFallbackReason = "candidate_exceeds_physical_window";
            }
            projectionTransformStats.outputMessages = Array.isArray(sendContext.messages) ? sendContext.messages.length : 0;
            projectionTransformStats.outputEstimatedTokens = estimateRequestTokens(sendContext);
            // 3. Consume raw stream
            const requestContext = getContext();
            const streamOptions = { ...(options || {}) };
            const cacheRetention = resolvePromptCacheRetention(model, sendContext, streamOptions);
            if (cacheRetention && !streamOptions.cacheRetention) {
                streamOptions.cacheRetention = cacheRetention;
            }
            try {
                const tracePayload = observeContextProjection({
                    sessionId: String(streamOptions.sessionId || requestContext?.sessionId || "unknown"),
                    model: model,
                    sourceContext: context,
                    sendContext: sendContext,
                    candidateContext: candidateContext,
                    candidateEstimatedTokens,
                    physicalWindow,
                    qualityBudget: qualityBudgetFor(physicalWindow),
                    projectionMode,
                    projectionFallbackReason,
                    summarizing,
                    cacheRetention: parsePromptCacheRetention(streamOptions.cacheRetention),
                    transformStats: projectionTransformStats,
                    persistState: true,
                });
                requestContext?.traceEventSink?.("context_projection", tracePayload);
            }
            catch {
                // Projection observability is fail-open by design.
            }
            if (requestContext?.traceId) {
                // Inject traceId into headers for billing/tracking
                streamOptions.headers = {
                    ...streamOptions.headers,
                    "x-yoko-trace-id": requestContext.traceId
                };
                // OpenAI SDK specific
                streamOptions.extraHeaders = {
                    ...streamOptions.extraHeaders,
                    "x-yoko-trace-id": requestContext.traceId
                };
            }
            // 配置页「关闭 DeepSeek 深度思考」。每轮现读配置，用户改完立刻生效，
            // 不用重启客户端、也不用等会话缓存过期。
            //
            // 走请求头而不是请求体：网关按白名单重建 body，客户端塞在 body 里的字段
            // 到不了上游；`x-yoko-trace-id` 这条头是跑通的现成通道。翻译成上游的
            // `thinking:{type:"disabled"}` 由网关完成，并且只对 deepseek 生效。
            if (isDeepSeekThinkingDisabled()) {
                streamOptions.headers = { ...streamOptions.headers, [THINKING_HEADER]: THINKING_OFF };
                streamOptions.extraHeaders = { ...streamOptions.extraHeaders, [THINKING_HEADER]: THINKING_OFF };
            }
            // ── 传输层空闲超时：把"连着但不再吐字节"变成一个有界、可自愈的错误 ──
            //
            // 用自己的 controller 转发调用方的 signal，而不是直接复用它：超时时
            // 必须能单独 abort 掉这一条请求，又不能影响调用方的取消语义。
            // 忘记转发 = 用户的停止按钮失效，所以下面的 forwardAbort 是必需的。
            const idleController = new AbortController();
            callerSignal = streamOptions.signal;
            const forwardAbort = () => idleController.abort(callerSignal?.reason);
            if (callerSignal) {
                if (callerSignal.aborted)
                    forwardAbort();
                else
                    callerSignal.addEventListener("abort", forwardAbort, { once: true });
            }
            streamOptions.signal = idleController.signal;
            // 诊断开关：把**真正送出去的那一份**上下文里还剩多少思考链打出来。
            // 加它的原因：裁剪在离线管线、估算器、线上标记三处都显示生效，但计费上下文
            // 没有任何变化——三者必有一处在说谎，只有真实载荷能仲裁。默认关闭。
            if (process.env.YOKO_DEBUG_SEND_CONTEXT === "1") {
                try {
                    const msgs = Array.isArray(sendContext.messages) ? sendContext.messages : [];
                    let thinkBlocks = 0, thinkChars = 0;
                    for (const m of msgs) {
                        if (!Array.isArray(m?.content))
                            continue;
                        for (const c of m.content) {
                            if (c?.type === "thinking") {
                                thinkBlocks++;
                                thinkChars += String(c.thinking || "").length;
                            }
                        }
                    }
                    // 只数 thinking 块是不够的：如果思考链在到这里之前已经被转成 text 块，
                    // 计数会是 0，看起来像“裁干净了”，实际原样送出去了。所以把每条消息的
                    // 块类型与体积都打出来，让“它到底以什么形态存在”无处可藏。
                    const shape = msgs.map((m, i) => {
                        const blocks = Array.isArray(m?.content)
                            ? m.content.map((c) => `${c?.type}:${String(c?.text ?? c?.thinking ?? JSON.stringify(c?.arguments ?? "")).length}`).join("|")
                            : `raw:${String(m?.content ?? "").length}`;
                        return `#${i}${m?.role}[${blocks}]`;
                    }).join(" ");
                    console.log(`[SendCtx] model=${model?.id} msgs=${msgs.length} thinkingBlocks=${thinkBlocks} thinkingChars=${thinkChars} ` +
                        `pruneFlag=${projectionTransformStats.replayedReasoningPruned} bytes=${JSON.stringify(msgs).length}\n` +
                        `[SendCtx]   shape= ${shape}`);
                }
                catch { /* 诊断不能影响请求 */ }
            }
            const rawStream = rawStreamFactory(model, sendContext, streamOptions);
            // 这层 try 只为在任何出口都摘掉 forwardAbort 监听（调用方的 signal 可能
            // 比单条请求活得久，不摘会累积监听器）。循环体保持原样不缩进，避免
            // 无关的空白改动淹没这次的实质变更。
            try {
                for await (const event of withStreamIdleTimeout(rawStream, {
                    idleMs: LLM_STREAM_IDLE_MS,
                    onIdle: () => {
                        // 标记必须先于 abort：abort 会让底层抛 APIUserAbortError，
                        // 不打标记的话下面的 catch 会把它当成"用户主动停止"处理。
                        idleTimedOut = true;
                        idleController.abort();
                    },
                })) {
                    if (event.type === "text_delta") {
                        // Process chunk
                        const { thinkingDelta, contentDelta, toolDelta, newState } = adapter.processThinkingChunk(event.delta, adapterState);
                        adapterState = newState;
                        // Update clean text
                        const currentIndex = event.contentIndex;
                        const currentClean = cleanTextMap.get(currentIndex) || "";
                        // Update clean text map
                        // We ONLY include contentDelta (text) in the clean text map for partial patching
                        // This ensures that the 'text' part of the partial message doesn't contain the JSON/tool block
                        const newClean = currentClean + (contentDelta || "");
                        cleanTextMap.set(currentIndex, newClean);
                        // Yield events
                        // 1. Text Delta (Reasoning)
                        if (contentDelta) {
                            pushEvent({
                                ...event,
                                delta: contentDelta,
                                partial: patchPartial(event.partial)
                            });
                        }
                        // 2. Tool Delta (JSON/Code) -> Yield as Thinking Delta
                        // This moves the raw JSON block into the thinking bubble (collapsed) during streaming
                        if (toolDelta) {
                            pushEvent({
                                type: "thinking_delta",
                                delta: toolDelta,
                                partial: patchPartial(event.partial)
                            });
                        }
                        // 3. Thinking Delta (Native Thinking)
                        if (thinkingDelta) {
                            pushEvent({
                                type: "thinking_delta",
                                delta: thinkingDelta,
                                partial: patchPartial(event.partial)
                            });
                        }
                    }
                    else if (event.type === "text_end") {
                        const currentIndex = event.contentIndex;
                        const cleanText = cleanTextMap.get(currentIndex) || "";
                        pushEvent({
                            ...event,
                            content: cleanText,
                            partial: patchPartial(event.partial)
                        });
                    }
                    else if (event.type === "done") {
                        // Intercept done event to clean up message and inject tools
                        const message = event.message;
                        // 1. Remove custom thinking content (prevent leakage to history)
                        // BUT preserve native API reasoning blocks (those with thinkingSignature like "reasoning_content")
                        // Kimi K2.5 and similar models require reasoning_content in assistant message history;
                        // pi-ai's convertMessages uses thinkingSignature to re-inject it into subsequent API calls.
                        if (message.content) {
                            message.content = message.content.filter((c) => {
                                if (c.type !== "thinking")
                                    return true;
                                if (c.thinkingSignature)
                                    return true;
                                return false;
                            });
                        }
                        // 2. Parse Pseudo Tool Calls (for Kimi/OpenAI compat)
                        // Only if no native tool calls exist
                        // Check if there are any toolCall content parts (support both snake_case and camelCase)
                        const existingToolCalls = message.content.filter((c) => c.type === "toolCall" || c.type === "tool_call");
                        if (existingToolCalls.length === 0 && adapter.parsePseudoToolCalls) {
                            // Aggregate text content
                            let textContent = "";
                            for (const c of message.content) {
                                if (c.type === "text") {
                                    textContent += c.text;
                                }
                            }
                            let pseudoTools = adapter.parsePseudoToolCalls(textContent);
                            // 工具调用漏进思考链的情况（doubao-seed）：那条消息里
                            // **一个 text 块都没有**，只有 thinking，所以上面按 text 聚合必然为空。
                            // 线上后果是工具没执行、正文为空，用户收到「任务已完成，但LLM未生成文本回答」。
                            // 只在正文没解析出调用时才看思考链，且只认显式标记（见 seed_tool_call.ts）。
                            if ((!pseudoTools || pseudoTools.length === 0) && adapter.parseLeakedToolCalls) {
                                for (const c of message.content) {
                                    if (c.type !== "thinking" || typeof c.thinking !== "string")
                                        continue;
                                    const leaked = adapter.parseLeakedToolCalls(c.thinking);
                                    if (leaked && leaked.length > 0) {
                                        console.warn(`[StreamAdapter] Recovered ${leaked.length} tool call(s) leaked into the thinking channel for ${model.id}`);
                                        // 剥掉标记：否则它随 reasoning_content 回灌进后续请求，
                                        // 模型会照着这个"先例"继续用文本格式发调用。
                                        if (adapter.stripLeakedToolCalls) {
                                            c.thinking = adapter.stripLeakedToolCalls(c.thinking);
                                        }
                                        pseudoTools = [...(pseudoTools || []), ...leaked];
                                    }
                                }
                            }
                            if (pseudoTools && pseudoTools.length > 0) {
                                console.log(`[StreamAdapter] Detected ${pseudoTools.length} pseudo tools for ${model.id}`);
                                pseudoTools.forEach((pt, idx) => {
                                    console.log(`[StreamAdapter]   Tool ${idx + 1}: ${pt.name}(${JSON.stringify(pt.parameters).substring(0, 100)}${JSON.stringify(pt.parameters).length > 100 ? '...' : ''})`);
                                });
                                // Convert original text content to thinking content to prevent leakage
                                // ... existing logic ...
                                for (const c of message.content) {
                                    if (c.type === "text") {
                                        c.type = "thinking";
                                        c.thinking = c.text;
                                        c.thinkingSignature = "reasoning_content";
                                        delete c.text;
                                    }
                                }
                                // Create toolCall content parts
                                // IMPORTANT: Use camelCase "toolCall" to match Pi AI/Agent Core expectations
                                const newToolCalls = pseudoTools.map(pt => ({
                                    type: "toolCall", // MUST be camelCase for Pi Agent Core to recognize it
                                    id: pt.id || `call_${Math.random().toString(36).substring(2, 10)}`,
                                    name: pt.name,
                                    arguments: pt.parameters
                                }));
                                console.log(`[StreamAdapter] Converted to ${newToolCalls.length} toolCall content parts (camelCase type)`);
                                // Append to message content
                                message.content.push(...newToolCalls);
                            }
                            else {
                                // No tools found, but we might still have <thinking> tags leaking in the text
                                // e.g. <thinking>...</thinking> Answer...
                                // We should strip them from the text content to keep the bubble clean
                                const thinkingRegex = /<thinking>[\s\S]*?<\/thinking>/gi;
                                let hasChanges = false;
                                for (const c of message.content) {
                                    if (c.type === "text" && c.text && thinkingRegex.test(c.text)) {
                                        c.text = c.text.replace(thinkingRegex, "").trim();
                                        hasChanges = true;
                                    }
                                }
                                if (hasChanges) {
                                    // Filter out empty text parts that might remain
                                    message.content = message.content.filter((c) => c.type !== "text" || c.text.length > 0);
                                }
                            }
                        }
                        pushEvent(event);
                    }
                    else {
                        // For other events, just patch the partial to ensure consistency
                        if ('partial' in event) {
                            pushEvent({
                                ...event,
                                partial: patchPartial(event.partial)
                            });
                        }
                        else {
                            pushEvent(event);
                        }
                    }
                }
            }
            finally {
                if (callerSignal)
                    callerSignal.removeEventListener("abort", forwardAbort);
            }
        }
        catch (error) {
            // 我们自己发起的超时 abort 会以 APIUserAbortError 的形态冒上来；
            // 原样上报会被判成"用户停止"（不重试、UI 显示已终止），
            // 必须换回超时语义，才能命中 pi 的自动重试和超时话术。
            //
            // 反向也要守住：用户**确实**按了停止时绝不能改写成超时——超时是可重试
            // 语义，一旦相遇就又是一次"已取消之后仍然发请求"的幽灵重试。
            const reported = idleTimedOut && !callerSignal?.aborted && isRunCancelledError(error)
                ? new StreamIdleTimeoutError(LLM_STREAM_IDLE_MS)
                : error;
            console.error("[StreamAdapter] Error:", reported);
            streamFailure = reported;
        }
        finally {
            // ── 必须产出终态事件，否则 result() 永远 pending ──
            //
            // AssistantMessageEventStream 只有在收到 `done` 或 `error` 事件时才 resolve
            // finalResultPromise；`end()` 不带参数**不会** resolve 它（pi-ai 的
            // EventStream.end 里 `if (result !== undefined)` 那一行）。
            //
            // 而消费侧两条路径都在等这个 promise：
            //   - 普通轮次：agent-loop 的 `await response.result()`
            //   - 自动压缩：compaction 的 `(await streamFn(...)).result()`
            //
            // 所以只要 adapter 抛异常、上游迭代器抛错、或流结束却没产生 done/error，
            // 整轮就会静默永久挂起。这个缺陷在 0.70.6 就存在（两版 end() 语义相同），
            // 只是当时压缩在 prompt() 之外跑、有 5 分钟 overdue 兜底；0.83 把压缩搬进
            // prompt() 之后就再没有出口了。
            if (!sawTerminalEvent) {
                const reason = streamFailure instanceof Error
                    ? streamFailure.message
                    : (streamFailure !== undefined ? String(streamFailure) : "stream ended without a terminal event");
                console.error(`[StreamAdapter] 流未产生终态事件，补发 error 终态以免调用方永久等待：${reason}`);
                const errorMessage = {
                    role: "assistant",
                    content: [],
                    stopReason: "error",
                    errorMessage: reason,
                    provider: model?.provider,
                    model: model?.id,
                    timestamp: Date.now(),
                    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0,
                        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
                };
                try {
                    stream.push({ type: "error", reason: "error", error: errorMessage });
                }
                catch (pushError) {
                    console.error("[StreamAdapter] 补发终态事件失败:", pushError);
                }
            }
            stream.end();
        }
    })();
    return stream;
}
function messageForDebugLog(message) {
    if (!message || typeof message !== "object")
        return message;
    // tool_execution_end already records bounded diagnostics for this result.
    // Avoid persisting the complete tool payload a second time in the readable log.
    if (message.role === "toolResult")
        return null;
    if (message.role === "custom") {
        const serializedContent = typeof message.content === "string"
            ? message.content
            : JSON.stringify(message.content ?? "");
        return {
            role: message.role,
            customType: message.customType,
            display: message.display,
            contentLength: serializedContent.length,
            contentHash: crypto.createHash("sha256").update(serializedContent).digest("hex").slice(0, 16),
            details: message.details,
            timestamp: message.timestamp,
        };
    }
    return message;
}
const { preflightCompactionTimeoutMs: PREFLIGHT_COMPACTION_TIMEOUT_MS, automaticCompactionOverdueMs: AUTOMATIC_COMPACTION_OVERDUE_MS, llmStreamIdleMs: LLM_STREAM_IDLE_MS, } = resolvePiRuntimeLimits();
/** prompt() 返回后给异步事件落地的有界排空窗口。 */
const POST_PROMPT_DRAIN_MS = 3_000;
export class PiKernel {
    memory;
    tools;
    stateProvider;
    sessionLedger;
    sessionLocks = new Map();
    activeRuns = new Map();
    normalizedSessionHeaderFiles = new Set();
    constructor(memory, tools, stateProvider) {
        this.memory = memory;
        this.tools = tools;
        this.stateProvider = stateProvider;
        this.sessionLedger = new SessionLedgerManager();
    }
    async getOrCreateSession(sessionId, logger) {
        let session = sessionCache.get(sessionId);
        if (session) {
            logger?.logEvent("Session Cache Hit", { sessionId });
            console.log(`[PiKernel] Using cached session. Tool count: ${session.agent.state.tools.length}`);
            return session;
        }
        logger?.logEvent("Initializing Session", { sessionId });
        console.log(`[PiKernel] Initializing session: ${sessionId}`);
        // We map YokoAgent Session ID to a file path
        if (typeof sessionId !== "string") {
            console.warn(`[PiKernel] Warning: sessionId is not a string: ${typeof sessionId}`);
            sessionId = String(sessionId);
        }
        // Agent 身份(scope / 技能白名单 / prompt / 模型 / 会话策略)由 profile 决定,
        // 不再从 sessionId 子串猜。
        const profile = resolveProfile(sessionId);
        const { scope: agentScope, allowedSkills } = profile;
        const ephemeral = profile.sessionPolicy === "ephemeral";
        let sessionManager;
        let sessionFile = "";
        if (ephemeral) {
            // 跑完即弃:不落盘、不回读历史。上下文完全由调用方在本次请求中提供。
            // 避免"一个客户一条无限长时间线"在 append-only + 30 轮滑窗下永久失配缓存。
            sessionManager = SessionManager.inMemory(process.cwd());
        }
        else {
            // Ensure session directory exists
            // Use USER_DATA_PATH if available (Electron packaged app), otherwise fallback to CWD
            const baseDir = process.env.USER_DATA_PATH || process.cwd();
            const sessionDir = path.join(baseDir, "data", "sessions");
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true });
            }
            // Sanitize sessionId to be safe for filenames
            const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");
            sessionFile = path.join(sessionDir, `${safeSessionId}.json`);
            migrateSessionFileIfNeeded(sessionFile);
            if (fs.existsSync(sessionFile)) {
                sessionManager = SessionManager.open(sessionFile);
            }
            else {
                // Create a new session file with our desired ID
                const initialContent = JSON.stringify({
                    type: "session",
                    id: sessionId,
                    timestamp: new Date().toISOString(),
                    cwd: process.cwd()
                }) + "\n";
                fs.writeFileSync(sessionFile, initialContent, "utf-8");
                sessionManager = SessionManager.open(sessionFile);
            }
        }
        const fileLines = sessionFile && fs.existsSync(sessionFile)
            ? fs.readFileSync(sessionFile, "utf-8").split(/\r?\n/).filter((line) => line.trim().length > 0).length
            : 0;
        const runContext = getContext();
        const piTools = convertTools(this.tools, logger, agentScope, allowedSkills, {
            allowedTools: runContext?.agentRunAllowedTools === undefined
                ? undefined
                : new Set(runContext.agentRunAllowedTools),
            deniedTools: new Set(runContext?.agentRunDeniedTools ?? []),
        });
        console.log(`[PiKernel] Created ${piTools.length} piTools for new session (profile=${profile.name}, scope=${agentScope}${allowedSkills ? `, allowlist=[${[...allowedSkills].join(',')}]` : ''})`);
        // 🔧 增强工具数组，添加模糊匹配能力（处理不同模型的命名习惯差异）
        patchToolArrayWithFuzzyMatching(piTools);
        // 系统提示词必须先算出来：它要作为 ResourceLoader 的基线传进
        // createAgentSession，否则 pi 会在建会话时先用自带人设建一遍。
        const runtimeState = this.stateProvider ? await this.stateProvider.getState() : undefined;
        const systemPrompt = buildYokoSystemPrompt({
            tools: this.tools,
            workspaceDir: config.workspaceDir,
            state: runtimeState,
            agentScope, // PR5.5
            allowedSkills, // P1-1
            profileSystemPrompt: profile.systemPrompt, // P2-a
        });
        // pi 0.83 起 state.systemPrompt 直写会被 session.prompt() 覆盖，
        // 提示词改由 holder + ResourceLoader/before_agent_start 契约接管。
        const promptHolder = { systemPrompt };
        const resourceLoader = await createYokoResourceLoader(promptHolder, systemPrompt);
        const result = await createAgentSession({
            sessionManager,
            model: createPiModel(profile.model),
            cwd: process.cwd(),
            thinkingLevel: "low",
            resourceLoader,
            // 屏蔽 pi 自带的 read/bash/edit/write：本产品的工具全部由
            // convertTools 提供，下面直接写进 state.tools（公开 setter，
            // 每轮可刷新，customTools 是建会话时固定的，不适用）。
            noTools: "all",
        });
        session = result.session;
        bindPromptHolder(session, promptHolder);
        // 接管工具循环第 2 轮起的系统提示词（pi 会在那里把它重置成陈旧值）。
        installTurnPromptGuard(session);
        installToolResultErrorGuard(session);
        // Inject tools directly onto agent state (bypasses extension tool registry)
        session.agent.state.tools = piTools;
        patchToolArrayWithFuzzyMatching(session.agent.state.tools);
        // Use our custom stream wrapper.
        // 0.81 起字段从 streamFn 改名为 streamFunction；同时 0.83 起 compact()
        // 也会经由它发摘要请求（见 streamWithAdapter 里的压缩请求分支）。
        session.agent.streamFunction = streamWithAdapter;
        // ephemeral 会话没有历史文件,也不该"恢复上下文"——上下文由调用方全量提供。
        if (!ephemeral) {
            const linearMessages = loadLinearMessagesFromSessionFile(sessionFile, 80);
            const loadedCount = Array.isArray(session.agent.state.messages) ? session.agent.state.messages.length : 0;
            logger?.logEvent("Session Load Snapshot", {
                sessionId,
                sessionFile,
                fileSizeBytes: fs.existsSync(sessionFile) ? fs.statSync(sessionFile).size : 0,
                fileLines,
                loadedByPi: summarizeMessages(session.agent.state.messages || []),
                linearScan: summarizeMessages(linearMessages)
            });
            if (loadedCount <= 1 && linearMessages.length > loadedCount + 4) {
                session.agent.state.messages = linearMessages;
                logger?.logEvent("Session Context Recovered", {
                    reason: "pi_context_too_small",
                    before: loadedCount,
                    after: linearMessages.length
                });
            }
        }
        // logger?.logPrompt(systemPrompt, "System Prompt"); // Optional: Log system prompt
        sessionCache.set(sessionId, session);
        return session;
    }
    /**
     * Stop the running agent for a specific session
     */
    stop(sessionId, reason) {
        const activeRun = this.activeRuns.get(sessionId);
        if (activeRun && !activeRun.abortController.signal.aborted) {
            const detail = reason instanceof Error && reason.message
                ? reason.message
                : undefined;
            activeRun.abortController.abort(new PiRunCancelledError(detail ? `Session ${sessionId} stopped: ${detail}` : `Session ${sessionId} stopped by user`));
        }
        const session = activeRun?.session ?? sessionCache.get(sessionId);
        if (session) {
            console.log(`[PiKernel] Stopping session ${sessionId}...`);
            // Pi 的 agent.abort() 只管普通生成；手动/自动压缩各有独立的
            // AbortController，必须显式 abortCompaction()，否则停止按钮在
            // “上下文压缩中”阶段完全无效。
            try {
                session.abortCompaction();
            }
            catch { /* best effort */ }
            // 自动重试的退避 sleep 是**第三个**独立的 AbortController
            // （AgentSession._retryAbortController），agent.abort() 同样管不着。
            //
            // 更要命的是退避期间 agent.activeRun 已经被 finishRun() 置空，
            // 此刻 agent.abort() 是**空操作**：不补这一刀，用户停止之后退避照常
            // 走完，agent.continue() 会真的再发一次请求、真的执行模型返回的工具、
            // 真的往同一个会话文件追加消息——即"已取消"之后仍然把事做了。
            try {
                session.abortRetry();
            }
            catch { /* best effort */ }
            try {
                session.agent.abort();
            }
            catch { /* best effort */ }
        }
        else {
            console.warn(`[PiKernel] Cannot stop session ${sessionId}: Not found in cache.`);
        }
    }
    /**
     * Evict an idle session after its persisted conversation is deleted.
     * Running sessions are never evicted because stop() must retain access to
     * the live AgentSession until its abort has settled.
     */
    evict(sessionId) {
        if (this.sessionLocks.has(sessionId)) {
            console.warn(`[PiKernel] Cannot evict busy session ${sessionId}.`);
            return false;
        }
        sessionCache.delete(sessionId);
        return true;
    }
    async rewindLastStoppedTurn(sessionId) {
        if (this.sessionLocks.has(sessionId)) {
            return { success: false, error: "SESSION_BUSY" };
        }
        let resolveLock;
        const lockPromise = new Promise(resolve => { resolveLock = resolve; });
        this.sessionLocks.set(sessionId, lockPromise);
        try {
            const session = await this.getOrCreateSession(sessionId);
            const manager = session.sessionManager;
            const branch = manager.getBranch();
            let assistantIndex = -1;
            for (let index = branch.length - 1; index >= 0; index--) {
                const entry = branch[index];
                if (entry?.type !== "message")
                    continue;
                assistantIndex = index;
                break;
            }
            const assistantEntry = assistantIndex >= 0 ? branch[assistantIndex] : undefined;
            if (assistantEntry?.message?.role !== "assistant"
                || assistantEntry.message.stopReason !== "aborted") {
                return { success: false, error: "LAST_TURN_NOT_STOPPED" };
            }
            let userIndex = -1;
            for (let index = assistantIndex - 1; index >= 0; index--) {
                if (branch[index]?.type === "message" && branch[index]?.message?.role === "user") {
                    userIndex = index;
                    break;
                }
            }
            if (userIndex < 0) {
                return { success: false, error: "STOPPED_TURN_USER_NOT_FOUND" };
            }
            const originalUserMessage = branch[userIndex].message;
            let targetIndex = userIndex - 1;
            let attachedSkill;
            while (targetIndex >= 0
                && branch[targetIndex]?.type === "custom_message"
                && branch[targetIndex]?.customType === SESSION_CONTEXT_CUSTOM_TYPE) {
                const reference = branch[targetIndex]?.details?.attachedSkill;
                if (reference?.id && !attachedSkill) {
                    attachedSkill = {
                        id: String(reference.id),
                        name: typeof reference.name === "string" ? reference.name : undefined,
                        version: typeof reference.version === "string" ? reference.version : undefined,
                    };
                }
                targetIndex -= 1;
            }
            if (targetIndex >= 0 && branch[targetIndex]?.id) {
                manager.branch(branch[targetIndex].id);
            }
            else {
                manager.resetLeaf();
            }
            session.agent.clearAllQueues();
            session.agent.state.messages = manager.buildSessionContext().messages;
            return {
                success: true,
                content: JSON.parse(JSON.stringify(originalUserMessage.content)),
                displayText: extractText(originalUserMessage.content),
                attachedSkill,
            };
        }
        catch (error) {
            console.error(`[PiKernel] Failed to rewind stopped turn for ${sessionId}:`, error);
            return { success: false, error: error?.message || "REWIND_FAILED" };
        }
        finally {
            resolveLock();
            if (this.sessionLocks.get(sessionId) === lockPromise) {
                this.sessionLocks.delete(sessionId);
            }
        }
    }
    /**
     * Check context window usage and warn/block if necessary.
     * Simple implementation inspired by OpenClaw.
     */
    async checkContextWindow(session, input, logger, signal) {
        const contextMessages = Array.isArray(session.agent?.state?.messages) ? session.agent.state.messages : [];
        const model = session.model;
        if (!model)
            return null;
        let totalTokens = 0;
        for (const msg of contextMessages) {
            totalTokens += estimateContextMessageTokens(msg);
        }
        totalTokens += estimateContextStringTokens(session.agent?.state?.systemPrompt || "");
        try {
            totalTokens += estimateContextStringTokens(JSON.stringify(session.agent?.state?.tools || []));
        }
        catch {
            // Tool schema estimation is best-effort only.
        }
        // 当前输入尚未进入 session state，需单独估算；MessageContent 先转成 Pi 的
        // 多模态形状，确保本轮新上传的图片也被计入。
        const inputMsg = input && typeof input === "object" && !Array.isArray(input) && "role" in input
            ? input
            : {
                role: "user",
                content: convertToPiContent(input),
                timestamp: Date.now(),
            };
        totalTokens += estimateContextMessageTokens(inputMsg);
        // 物理窗口以**服务端**为准，并在这里就地校准 `model.contextWindow`。
        //
        // 为什么要校准：`createPiModel` 是同步构造点，只能读已有缓存，冷启动第一轮
        // 拿到的是保守默认值。而这里是异步的、每轮开始前必跑，是把真值灌回去的
        // 唯一可靠时机——`model` 是 session 上的同一个对象，改它等于改 pi 用于
        // `isContextOverflow` 的那个数。
        const remote = await LLMManager.getInstance().getModelContextInfo(model.id, signal);
        if (remote.physical && model.contextWindow !== remote.physical) {
            logger?.logEvent("Context Window Calibrated", { model: model.id, from: model.contextWindow, to: remote.physical });
            model.contextWindow = remote.physical;
        }
        const physicalLimit = model.contextWindow || FALLBACK_CONTEXT_WINDOW;
        // 压缩时机看**质量预算**，不看物理窗口。
        //
        // 这两个数字此前是同一个 `model.contextWindow`，于是"模型能收多少"和
        // "我们愿意喂多少"被绑死：想修溢出误判就得放开物理窗口，一放开压缩就不触发了，
        // 上下文一路涨到模型开始幻觉、账单跟着爆。拆开之后，物理窗口只服务溢出判断，
        // 喂多少由 `qualityBudgetFor` 封顶（128K），所以服务端把窗口填成官方真值
        // （Claude 1M、GPT-5.6 1.05M）既修好了误判，又不会放大上下文和成本。
        //
        // 另外：正因为主动压缩在这里、每轮开始前就做了，pi 自己的 shouldCompact
        // 事实上不再是上下文的守门人，把 contextWindow 报成物理真值才是安全的。
        // 服务端下发了 `recommended_context_window` 就听它的——压缩阈值因此是一个
        // **可远程调节的旋钮**：模型长上下文能力变强后在服务端调大即可放宽，
        // 不用发客户端版本。没下发则回落到默认策略 min(物理窗口, 128K)。
        const limit = qualityBudgetFor(physicalLimit, remote.recommended);
        const reserveTokens = readBaseReserveTokens(session);
        const compactionTrigger = Math.max(limit * 0.5, limit - reserveTokens);
        const warningThreshold = limit * 0.8;
        // 预压缩只管本轮开始那一刻。轮内（上百个工具调用）的守门人是 pi 的
        // `_checkCompaction`，但它比的是物理窗口，对 1M 窗口永远不触发——线上因此出现过
        // 一轮从 12 万涨到 30 万、最后被网关 413 顶回来、整轮零输出。
        // 这里把 pi 看到的 reserve 抬到与预压缩同一个阈值，物理窗口保持真值不动。
        const inTurnGuard = applyInTurnCompactionGuard(session, physicalLimit, compactionTrigger);
        logger?.logEvent("Context Window Check", {
            totalTokens,
            limit,
            physicalLimit,
            // 记下预算是服务端给的还是本地默认：排查"为什么这个模型压得这么早/这么晚"时，
            // 第一个要确认的就是它，否则得去猜服务端配置。
            limitSource: remote.recommended ? "server_recommended" : "client_default",
            reserveTokens,
            compactionTrigger,
            inTurnGuard: inTurnGuard
                ? { applied: inTurnGuard.applied, effectiveTrigger: inTurnGuard.effectiveTrigger }
                : null,
        });
        if (totalTokens > physicalLimit) {
            // 真溢出：超过模型能收的量，这次请求大概率会被网关拒。
            console.warn(`[PiKernel] Context overflow: ${totalTokens}/${physicalLimit} (physical)`);
            logger?.logEvent("Context Overflow", { totalTokens, physicalLimit });
        }
        else if (totalTokens > limit) {
            // 超出质量预算但物理上装得下：本轮开始前的主动压缩会把它压回去。
            console.log(`[PiKernel] Context over quality budget: ${totalTokens}/${limit}; preflight compaction scheduled.`);
        }
        else if (totalTokens > compactionTrigger) {
            // 正常的压缩调度信号不应走 stderr；Electron 会把子进程 stderr 统一标成 Server Error。
            console.log(`[PiKernel] Context compaction threshold reached: ${totalTokens}/${compactionTrigger}.`);
        }
        else if (totalTokens > warningThreshold) {
            console.log(`[PiKernel] Context approaching compaction threshold: ${totalTokens}/${compactionTrigger}.`);
        }
        return {
            totalTokens,
            limit,
            physicalLimit,
            warningThreshold,
            compactionTrigger
        };
    }
    async run(userMessage, history, sessionId = "default", onEvent, recursionDepth = 0, lastPseudoToolHash, recentHashes = [], recentInputs = []) {
        // 0. Concurrency Lock (Wait Lock Implementation)
        let releaseLock = () => { };
        let lockReleased = false;
        try {
            // Wait for existing lock
            while (this.sessionLocks.has(sessionId)) {
                console.log(`[PiKernel] Session ${sessionId} is busy. Waiting for lock...`);
                await this.sessionLocks.get(sessionId);
            }
            let resolveLock;
            const lockPromise = new Promise((resolve) => {
                resolveLock = resolve;
            });
            // Acquire lock
            this.sessionLocks.set(sessionId, lockPromise);
            releaseLock = () => {
                if (lockReleased)
                    return;
                lockReleased = true;
                if (resolveLock)
                    resolveLock();
                if (this.sessionLocks.get(sessionId) === lockPromise) {
                    this.sessionLocks.delete(sessionId);
                }
            };
        }
        catch (e) {
            console.error(`[PiKernel] Error acquiring lock for session ${sessionId}:`, e);
            throw e;
        }
        const activeRun = {
            abortController: new AbortController(),
            poisoned: false,
            ephemeral: false,
        };
        this.activeRuns.set(sessionId, activeRun);
        const requestContext = getContext();
        const previousTraceEventSink = requestContext?.traceEventSink;
        let installedTraceEventSink;
        // 从拿到会话锁后的第一行开始建立最外层 finally。此前只有真正进入
        // agent.prompt() 后才有 finally；预处理阶段的 return / throw / compact
        // 全都能把锁永久留在 Map 里。
        try {
            // 复用调用方(agentic runCtx / 主聊天)已生成的 traceId,使业务记录(ConversationTurn.traceId)
            // 能反查到本次的结构化 trace 文件;无上下文 traceId 时回落随机,主聊天行为不变。
            //
            // 必须在 new DebugLogger 之前取:日志文件名要带 traceId,而文件在构造函数里就建好了。
            const traceId = getContext()?.traceId ?? crypto.randomUUID();
            // Initialize Debug Logger
            const logger = new DebugLogger(sessionId, traceId);
            logger.writeRaw(`\n\n>>> PiKernel Run Start (Depth: ${recursionDepth}) <<<\n`);
            // Soft Limit: Limit recursion depth to prevent infinite loops.
            // Instead of a hard error, we pause and ask for user confirmation.
            if (recursionDepth > 50) {
                const pauseMsg = "[System] Execution limit (50 steps) reached. Pausing to verify task status. Please reply 'continue' to resume execution.";
                logger.logEvent("Recursion Soft Limit", { depth: recursionDepth });
                console.warn(`[PiKernel] Max recursion depth reached (${recursionDepth}). Pausing for user confirmation.`);
                return pauseMsg;
            }
            const runStartMs = Date.now();
            logger.startTrace(traceId);
            if (requestContext) {
                installedTraceEventSink = (type, payload) => logger.writeEvent(type, payload);
                requestContext.traceEventSink = installedTraceEventSink;
            }
            let textContent = "";
            if (typeof userMessage === 'object' && !Array.isArray(userMessage) && 'content' in userMessage) {
                // It's a Message object
                textContent = extractText(userMessage.content);
            }
            else {
                // It's MessageContent
                textContent = extractText(userMessage);
            }
            logger.logEvent("User Input", { text: textContent, depth: recursionDepth });
            console.log(`[PiKernel] Run request (depth=${recursionDepth}): "${textContent}" (Session: ${sessionId})`);
            // onEvent?.({ type: 'think', description: `Agent Received: "${textContent}"` }); // Removed to prevent user input echo in UI
            const traceHistoryPreview = buildTraceHistoryPreview(history);
            const previousTraceIds = [...new Set(traceHistoryPreview
                    .map((message) => message.sourceTraceId)
                    .filter((id) => !!id && id !== traceId))].slice(-3);
            logger.writeEvent('run_start', {
                inputPreview: textContent.slice(0, 200),
                recursionDepth,
                historyLength: history.length,
                historyPreview: traceHistoryPreview,
                previousTraceIds,
            });
            // --- Semantic Loop Detection ---
            if (recentInputs.length > 0 && recursionDepth > 0) {
                // Check for identical consecutive inputs (often system error feedback loops)
                const occurrences = recentInputs.filter(t => t === textContent).length;
                if (occurrences >= 4) {
                    const errorMsg = "[System] Error: Detected semantic loop (identical inputs). Stopping execution to prevent infinite loop.";
                    logger.logError("Semantic Loop", new Error(errorMsg));
                    console.warn("[PiKernel] " + errorMsg);
                    return errorMsg;
                }
            }
            const newRecentInputs = [...recentInputs, textContent].slice(-5);
            // -------------------------------
            // Outcome signal: compare current input against last assistant turn
            let outcomeSignal = { type: 'none', confidence: 0 };
            if (recursionDepth === 0 && history.length > 0) {
                outcomeSignal = detectOutcomeSignal(textContent, history);
                const traceType = outcomeSignalTraceType(outcomeSignal);
                if (traceType) {
                    logger.writeEvent(traceType, {
                        confidence: outcomeSignal.confidence,
                        inputPreview: textContent.slice(0, 100)
                    });
                }
            }
            // Agent 身份。RAG 检索发生在 getOrCreateSession 之前,所以必须在此处先解析
            // ——resolveProfile 是纯函数,重复调用只有可忽略的开销。
            const cachedProfile = resolveProfile(sessionId);
            activeRun.ephemeral = cachedProfile.sessionPolicy === "ephemeral";
            const memoryRetrievalEnabled = cachedProfile.contextPolicy?.memoryRetrieval !== false;
            const sessionLedgerEnabled = cachedProfile.contextPolicy?.sessionLedger !== false;
            const isAgentTuningRequest = cachedProfile.scope === "main"
                && getContext()?.intent === "agent_tune";
            // 1. RAG Retrieval
            onEvent?.({ type: 'think', description: "检索相关记忆..." });
            let contextFacts = [];
            let admittedLocalFacts = [];
            let recallSelection = {
                admitted: [], ambiguous: [], rejected: [], decisions: [],
            };
            try {
                // P2-a/P3: profile 可把记忆检索钉到独立命名空间。
                // - knowledge 非空 → 严格只查这些知识库(不带全局记忆兜底)
                // - 否则沿用 memoryNamespace.read,再回落到请求上下文的 userId
                const userId = cachedProfile.memoryNamespace.read ?? getContext()?.userId;
                // Profile thresholds are an optional policy override. Candidate
                // retrieval remains broad; relevance admission happens afterwards.
                const minRelevance = cachedProfile.knowledgeMinScore;
                // §17 知识库引用分流:`wf:<kbId>` → fireflow 线上 RAG;其余是本地路径前缀。
                const allKnowledge = cachedProfile.knowledge ?? [];
                const wfKbIds = allKnowledge.filter(k => k.startsWith("wf:")).map(k => k.slice(3)).filter(Boolean);
                const localNamespaces = allKnowledge.filter(k => !k.startsWith("wf:"));
                // 本地检索:有本地知识库 → 严格 namespace;完全没声明知识库 → 常规 userId 读通;
                // **只声明了线上(无本地) → 跳过本地检索** —— 否则 namespaces 为空会回落 userId 过滤,
                // 把主人的全局记忆泄露给陌生客户(安全红线)。
                //
                // ⚠️ 安全红线(§review):agentic(RPA 客服)通道**绝不做 userId 读通兜底**。
                // 即便一个客服子 Agent 没挂任何知识库,也不能落到 `memory.search({userId})` —— 该查询
                // 的 SQL 过滤带 `OR userId='' OR userId IS NULL` 兜底(vector.ts:563),而主人的全局
                // 笔记与知识库 userId 恰好都为空,陌生客户一句话就能召回主人的私人笔记。没挂库的客服
                // 子 Agent 就该"无记忆",而不是回落到全局记忆。main / task 子会话不受影响(读通保留)。
                const isAgenticRequest = isAgenticRun();
                const candidateLimit = 24;
                let localCandidates = [];
                if (!memoryRetrievalEnabled) {
                    localCandidates = [];
                }
                else if (isAgentTuningRequest) {
                    // 子 Agent 调优只信任 agent_get / agent_reply_trace 提供的目标证据。
                    // 不召回主 Agent 的个人记忆和通用知识库，避免不同业务之间串知识。
                    localCandidates = [];
                }
                else if (isAgenticRequest) {
                    // 子 Agent(RPA 客服)：严格只查自己挂的本地命名空间；个人记忆绝不兜底(安全红线,见上)。
                    if (localNamespaces.length > 0) {
                        localCandidates = await this.memory.searchCandidates(textContent, candidateLimit, { userId, namespaces: localNamespaces });
                    }
                }
                else {
                    // 主 Agent / task 子会话：个人记忆候选 + 按 scope 的知识库候选。
                    // Phase 2 真隔离:知识库不再靠 userId='' 兜底混进广播,改由 scope∈{main,all} 的命名空间
                    // 显式注入 —— 标记为"仅子智能体"的库因此不会漏进主 Agent。
                    const memoryCandidates = await this.memory.searchCandidates(textContent, candidateLimit, { userId, excludeKnowledge: true });
                    // profile 显式挂了本地库(如 task 子会话继承) → 用它;否则主 Agent 取注册表里 main/all 的库。
                    const kbNamespaces = localNamespaces.length > 0
                        ? localNamespaces
                        : await mainScopeNamespaces(path.join(config.workspaceDir, "knowledge"));
                    let knowledgeCandidates = [];
                    if (kbNamespaces.length > 0) {
                        knowledgeCandidates = await this.memory.searchCandidates(textContent, candidateLimit, { userId, namespaces: kbNamespaces });
                    }
                    const pinned = this.memory.listAlwaysRecall(userId)
                        .map((chunk) => createPolicyCandidate(textContent, chunk));
                    localCandidates = [...memoryCandidates, ...knowledgeCandidates, ...pinned];
                }
                // Canonical de-dup is independent of source/channel. The last item
                // wins so an explicit `always` policy can replace its retrieved copy.
                const uniqueCandidates = new Map();
                for (const candidate of localCandidates) {
                    const key = candidate.id || ragFactKey(candidate);
                    uniqueCandidates.set(key, candidate);
                }
                localCandidates = (await filterAndSanitizeMemoryChunks([...uniqueCandidates.values()]));
                const retrievedIds = localCandidates
                    .filter((candidate) => candidate.recall.rrfScore > 0)
                    .map((candidate) => candidate.id)
                    .filter((id) => !!id);
                this.memory.recordRetrieved(retrievedIds);
                recallSelection = await selectMemoriesForContext(textContent, localCandidates, {
                    mode: "automatic",
                    minVectorRelevance: minRelevance,
                    // Knowledge chunks are budgeted apart from personal memory: for a
                    // sub-agent they are the entire answer, and for the main agent they
                    // must not lose their slots to profile facts.
                    isKnowledgeCandidate: (candidate) => isKnowledgePath(candidate.path),
                    judge: judgeAmbiguousMemoriesWithLlm,
                });
                admittedLocalFacts = recallSelection.admitted;
                // 线上检索:fireflow 已在服务端过 scoreThreshold + rerank,直接注入(不进本地候选门);
                // 失败/超时降级为空,绝不阻塞回复。
                let wfFacts = [];
                if (memoryRetrievalEnabled && !isAgentTuningRequest && wfKbIds.length > 0) {
                    wfFacts = await searchWorkflowKnowledge(wfKbIds, textContent, { topK: 5, scoreThreshold: minRelevance });
                }
                contextFacts = [...wfFacts, ...admittedLocalFacts];
                const traceEvidence = buildTraceKnowledgeEvidence(contextFacts);
                // 图片令牌通道(§图片支持):带图知识(付款码等)分配短令牌,注入"输出令牌即发图"
                // 的指令;令牌→URL 映射写入本次请求上下文,由 agentic 出口确定性展开成图片消息。
                // agentic 服务调用（RPA 与桌面试聊）启用；主 agent 走 markdown 图片让 UI 直接渲染。
                const reqCtx = getContext();
                const withImages = contextFacts.filter((f) => f.imageUrl);
                if (withImages.length > 0) {
                    if (isAgenticRun()) {
                        const imgTokens = attachImageTokensToFacts(contextFacts);
                        if (imgTokens.length > 0 && reqCtx)
                            reqCtx[IMAGE_TOKENS_CTX_KEY] = imgTokens;
                    }
                    else {
                        // 非 agentic:把图片以 markdown 形式并入文本,聊天 UI 可直接渲染。
                        for (const f of withImages) {
                            f.text = `${f.text}\n\n![图片](${f.imageUrl})`;
                        }
                    }
                }
                logger.logMemory(contextFacts);
                logger.writeEvent('rag_retrieval', {
                    query: textContent.slice(0, 100),
                    hitCount: contextFacts.length,
                    chunkIds: contextFacts.map(f => f.id),
                    sources: contextFacts.map(f => ({ path: f.path, source: f.source })),
                    evidence: traceEvidence,
                    candidateCount: localCandidates.length,
                    admittedCount: recallSelection.admitted.length,
                    ambiguousCount: recallSelection.ambiguous.length,
                    rejectedCount: recallSelection.rejected.length,
                    // Gray-zone judge accounting. It sits between the user's message
                    // and the first token, so its cost has to be visible next to what
                    // it actually decided.
                    judge: recallSelection.judge,
                    admissionDecisions: recallSelection.decisions.map((decision) => ({
                        id: decision.candidate.id,
                        verdict: decision.verdict,
                        score: Number(decision.score.toFixed(3)),
                        reason: decision.reason,
                        decidedBy: decision.decidedBy,
                        vectorRelevance: decision.candidate.recall.vectorRelevance,
                        lexicalCoverage: Number(decision.candidate.recall.lexical.coverage.toFixed(3)),
                        // Body-only coverage: `lexicalCoverage` includes path overlap, which
                        // ranks but never admits. Keep both so thresholds stay calibratable.
                        textCoverage: Number(decision.candidate.recall.lexical.textCoverage.toFixed(3)),
                    })),
                    suppressedForAgentTuning: isAgentTuningRequest,
                });
            }
            catch (e) {
                logger.logError("Memory Retrieval", e);
                console.error("[PiKernel] Memory retrieval failed:", e);
            }
            // rag_citation is emitted only for facts newly appended to model context.
            // Candidate retrieval is recorded separately above; evidence-backed use
            // is recorded as memory_grounded after the answer is complete.
            // 2. Get Session
            throwIfRunCancelled(activeRun.abortController.signal);
            const session = await this.getOrCreateSession(sessionId, logger);
            activeRun.session = session;
            throwIfRunCancelled(activeRun.abortController.signal);
            // 钉住:运行中的会话不可被 LRU/TTL 淘汰,否则 stop() 找不到实例、abort 失效
            sessionCache.markBusy(sessionId);
            const gatewayHistory = convertGatewayHistoryToAgentMessages(history || [], 80);
            const loadedCountBeforeFallback = Array.isArray(session.agent.state.messages) ? session.agent.state.messages.length : 0;
            // ephemeral 会话没有历史文件,调用方传来的上下文是**唯一**的上下文,必须无条件注入。
            // 否则会命中下面那条 `> loadedCount + 2` 的启发式:少于 4 条上下文被静默丢弃。
            const seedEphemeralContext = cachedProfile.sessionPolicy === "ephemeral" && gatewayHistory.length > 0 && loadedCountBeforeFallback <= 1;
            if (seedEphemeralContext || (loadedCountBeforeFallback <= 1 && gatewayHistory.length > loadedCountBeforeFallback + 2)) {
                session.agent.state.messages = gatewayHistory;
                logger.logEvent("Session Context Recovered", {
                    reason: seedEphemeralContext ? "ephemeral_seed" : "gateway_history_fallback",
                    before: loadedCountBeforeFallback,
                    after: gatewayHistory.length
                });
            }
            // 🔧 强制更新工具列表（修复工具找不到的问题）
            // 即使是缓存的 session，也要确保使用最新的工具列表
            const { scope: cachedAgentScope, allowedSkills: cachedAllowedSkills } = cachedProfile;
            const latestRunContext = getContext();
            const latestTools = convertTools(this.tools, logger, cachedAgentScope, cachedAllowedSkills, {
                allowedTools: latestRunContext?.agentRunAllowedTools === undefined
                    ? undefined
                    : new Set(latestRunContext.agentRunAllowedTools),
                deniedTools: new Set(latestRunContext?.agentRunDeniedTools ?? []),
            });
            session.agent.state.tools = latestTools;
            patchToolArrayWithFuzzyMatching(session.agent.state.tools); // patch 内部引用，setter 会 slice
            console.log(`[PiKernel] Updated session tools: ${latestTools.length} tools (scope=${cachedAgentScope}${cachedAllowedSkills ? `, allowlist=[${[...cachedAllowedSkills].join(',')}]` : ''}, with fuzzy matching)`);
            logger.writeEvent('agent_runtime', {
                profileId: cachedProfile.name,
                profileVersion: cachedProfile.version,
                channel: getContext()?.channel || "unknown",
                scope: cachedAgentScope,
                sessionPolicy: cachedProfile.sessionPolicy,
                skillModuleEnabled: cachedProfile.shellAllowed === true,
                allowedSkills: cachedAllowedSkills ? [...cachedAllowedSkills] : null,
                effectiveToolCount: latestTools.length,
                effectiveTools: latestTools
                    .map((tool) => tool?.name || tool?.definition?.name)
                    .filter((name) => typeof name === "string")
                    .slice(0, 30),
            });
            // --- MODEL SYNC CHECK ---
            // Ensure session uses the latest model from LLMManager config
            // This fixes the issue where model switching in UI doesn't reflect in cached sessions
            // P2-a: 带 profile.model 的会话必须沿用自己的模型,否则会被 UI 的全局模型切换覆盖回去。
            const currentModel = createPiModel(cachedProfile.model);
            if (session.model?.id !== currentModel.id) {
                const previousModel = session.model;
                const remoteTarget = await LLMManager.getInstance().getModelContextInfo(currentModel.id, activeRun.abortController.signal);
                if (remoteTarget.physical && currentModel.contextWindow !== remoteTarget.physical) {
                    currentModel.contextWindow = remoteTarget.physical;
                }
                const sourcePhysicalLimit = previousModel?.contextWindow || FALLBACK_CONTEXT_WINDOW;
                const targetPhysicalLimit = currentModel.contextWindow || FALLBACK_CONTEXT_WINDOW;
                // 必须读基准值：轮内守卫把 pi 看到的 reserve 抬高了，用那个值算
                // canCompactHistoryWithinWindow 会把安全上限算成负数，正常切模型也会被拦。
                const reserveTokens = readBaseReserveTokens(session);
                const historyTokens = (session.agent?.state?.messages || []).reduce((sum, message) => sum + estimateContextMessageTokens(message), 0);
                // A quality-budget downgrade is safe as long as the target model can
                // still run Pi's compaction request. Only block a true physical-window
                // downgrade whose summary request would itself overflow. This keeps
                // DeepSeek -> Kimi/Doubao working while protecting DeepSeek -> 128K.
                if (targetPhysicalLimit < sourcePhysicalLimit
                    && !canCompactHistoryWithinWindow(historyTokens, targetPhysicalLimit, reserveTokens)) {
                    const targetHistoryLimit = Math.max(0, targetPhysicalLimit - reserveTokens);
                    logger.logEvent("Model Switch Blocked", {
                        fromModel: previousModel?.id,
                        toModel: currentModel.id,
                        historyTokens,
                        sourcePhysicalLimit,
                        targetPhysicalLimit,
                        targetHistoryLimit,
                        reserveTokens,
                    });
                    const error = new Error(`当前会话历史约 ${historyTokens} token，目标模型 ${currentModel.id} 无法安全完成上下文压缩` +
                        `（安全上限约 ${targetHistoryLimit} token）。请切回 ${previousModel?.id || "原模型"} 继续，或新建会话后切换。`);
                    error.code = "MODEL_SWITCH_CONTEXT_TOO_LARGE";
                    throw error;
                }
                console.log(`[PiKernel] Updating session model from ${previousModel?.id} to ${currentModel.id}`);
                // Force update the model in the session agent using updateState method if available
                // or creating a new property descriptor if it's read-only
                try {
                    if ('setModel' in session.agent && typeof session.agent.setModel === 'function') {
                        session.agent.setModel(currentModel);
                    }
                    else {
                        // Fallback: update via state property if possible
                        session.agent.state.model = currentModel;
                    }
                }
                catch (e) {
                    console.warn("[PiKernel] Failed to update session model:", e);
                }
            }
            // ------------------------
            // --- STABLE SYSTEM PROMPT (prompt-cache critical) ---
            // RAG memory + Session Ledger are intentionally NOT injected into the system prompt.
            // Rewriting the system prefix every turn busts the Anthropic prompt cache for the
            // entire conversation history. They are injected APPEND-ONLY onto the user turn below
            // (delta only). The approximate clock also uses that append-only channel, so stable
            // system sections remain byte-identical across hour changes. See
            // docs/CONTEXT_COMPRESSION_OPTIMIZATION_PLAN.
            const runtimeState = this.stateProvider ? await this.stateProvider.getState() : undefined;
            const dynamicSystemPrompt = buildYokoSystemPrompt({
                tools: this.tools,
                workspaceDir: config.workspaceDir,
                state: runtimeState,
                agentScope: cachedAgentScope, // PR5.5
                allowedSkills: cachedAllowedSkills, // P1-1
                profileSystemPrompt: cachedProfile.systemPrompt, // P2-a：必须带上，否则会覆盖掉
                // getOrCreateSession（583 行）里已注入的人设，agent 回落到默认 YokoAgent 身份。
            });
            // pi 0.83：直写 state.systemPrompt 会被 session.prompt() 覆盖成 pi 自己的
            // 人设（实测），必须写进 holder，由 before_agent_start 钩子在本轮交给 pi。
            if (!setTurnSystemPrompt(session, dynamicSystemPrompt)) {
                // 兜底：会话没绑定槽位说明它不是本模块建的（理论上不会发生）。
                // 直写至少在压缩摘要等不过 prompt() 的路径上仍有意义。
                console.warn("[PiKernel] 会话未绑定提示词槽位，回落到直写 state.systemPrompt");
                session.agent.state.systemPrompt = dynamicSystemPrompt;
            }
            const visibleSkills = this.tools.listSkillCatalog(cachedAgentScope)
                .filter((skill) => !cachedAllowedSkills || cachedAllowedSkills.has(skill.name));
            logger.writeEvent('harness_manifest', buildHarnessManifest({
                model: currentModel,
                systemPrompt: dynamicSystemPrompt,
                profile: { id: cachedProfile.name, version: cachedProfile.version },
                tools: latestTools,
                skills: visibleSkills,
                modes: {
                    toolPolicy: resolveToolPolicyVersionCoordinate(),
                    projection: resolveRuntimeContextProjectionMode().mode,
                    verifier: resolveVerifierMode(),
                    taskContract: resolveTaskContractMode(),
                },
            }));
            logger.writeEvent('capability_manifest', capabilityManifestTrace(buildCapabilityManifest(this.tools.getToolCapabilityDefinitions(cachedAgentScope, cachedAllowedSkills), cachedAgentScope)));
            const expertCapabilityShadow = latestRunContext?.expertCapabilityShadow;
            if (expertCapabilityShadow && typeof expertCapabilityShadow === "object" && !Array.isArray(expertCapabilityShadow)) {
                // Observation only: the candidate was computed beside the exact legacy tool manifest
                // above. No field from this trace projection is read by convertTools or execution.
                logger.writeEvent('expert_capability_shadow', expertCapabilityShadow);
            }
            const expertDeploymentShadow = latestRunContext?.expertDeploymentShadow;
            if (expertDeploymentShadow && typeof expertDeploymentShadow === "object" && !Array.isArray(expertDeploymentShadow)) {
                // Split-decision observation only. P1b hard-codes the live route to legacy; no value
                // from this event participates in profile selection, context loading or tool policy.
                logger.writeEvent('expert_deployment_shadow', expertDeploymentShadow);
            }
            // --- APPEND-ONLY SESSION CONTEXT (time snapshot + RAG/Ledger delta) ---
            // Only on a fresh top-level user turn (skip tool-loop re-entries / recursion / raw
            // Message objects like tool results). Injected as a pi custom message placed BEFORE
            // the user message: the user turn stays pure user speech (extraction pipelines must
            // never re-harvest injected memory as if the user said it), de-dup ids ride in
            // `details`, and the cache breakpoint still lands on the real user message.
            // De-dup reads the exact same canonical boundary as the active projection. In stable
            // mode that boundary is Pi's persisted compaction entry; in legacy mode it remains
            // the last-30-user-turn compatibility window.
            let sessionContextBlock = "";
            let sessionContextIds = { rag: [], ledger: [] };
            const isFreshUserTurn = recursionDepth === 0 &&
                !(userMessage && typeof userMessage === 'object' && !Array.isArray(userMessage) && userMessage.role);
            if (isFreshUserTurn) {
                try {
                    const sessionProjectionMode = resolveRuntimeContextProjectionMode().mode;
                    const injected = extractInjectedContextIds(session.agent.state.messages, sessionProjectionMode === "stable" ? 0 : SEND_HISTORY_TURN_LIMIT);
                    // Hour-granular clock update. Only compare against the latest visible
                    // snapshot: if the OS clock moves backwards, appending the current bucket
                    // must supersede a later-looking historical one instead of being de-duped.
                    // Keep this failure-isolated from the pre-existing RAG/ledger path: an ICU
                    // formatting problem must never suppress otherwise valid session context.
                    let runtimeTimeBlock = "";
                    let runtimeTimeBucket;
                    try {
                        const runtimeTimeSnapshot = createRuntimeTimeSnapshot();
                        if (injected.latestRuntimeTimeBucket !== runtimeTimeSnapshot.bucket) {
                            runtimeTimeBlock = buildRuntimeTimeContextBlock(runtimeTimeSnapshot);
                            runtimeTimeBucket = runtimeTimeSnapshot.bucket;
                        }
                    }
                    catch (e) {
                        logger.logError("Runtime Time Snapshot", e);
                    }
                    // RAG delta: facts retrieved this turn that were never injected before.
                    const newRagFacts = contextFacts
                        .map((f) => ({ key: ragFactKey(f), text: f.text, source: f.source, path: f.path }))
                        .filter((f) => !injected.rag.has(f.key));
                    // Ledger delta: active items not yet injected this session.
                    let newLedgerItems = [];
                    if (sessionLedgerEnabled && !isAgenticRun() && !isAgentTuningRequest) {
                        try {
                            newLedgerItems = this.sessionLedger
                                .getInjectableItems(sessionId)
                                .filter((i) => !injected.ledger.has(i.id));
                        }
                        catch (e) {
                            logger.logError("Session Ledger Inject", e);
                        }
                    }
                    const durableContextBlock = buildSessionContextBlock(newRagFacts, newLedgerItems, false);
                    sessionContextBlock = [runtimeTimeBlock, durableContextBlock].filter(Boolean).join("\n\n");
                    sessionContextIds = {
                        rag: newRagFacts.map((f) => f.key).filter(Boolean),
                        ledger: newLedgerItems.map((i) => i.id),
                        ...(runtimeTimeBucket ? { runtimeTimeBucket } : {}),
                    };
                    if (sessionContextBlock) {
                        logger.writeEvent('session_context_inject', {
                            runtimeTimeNew: Boolean(runtimeTimeBlock),
                            ragNew: newRagFacts.length,
                            ledgerNew: newLedgerItems.length,
                            chars: sessionContextBlock.length,
                            estimatedTokens: estimateContextStringTokens(sessionContextBlock),
                        });
                        // Citation is retained as the UI-compatible injection event.
                        // It is deliberately separate from post-answer grounding.
                        if (newRagFacts.length > 0) {
                            const localFactsByKey = new Map(admittedLocalFacts.map((fact) => [ragFactKey(fact), fact]));
                            const injectedChunkIds = newRagFacts
                                .map((f) => f.key)
                                .filter((key) => localFactsByKey.has(key))
                                .map((key) => localFactsByKey.get(key)?.id)
                                .filter((id) => !!id);
                            logger.writeEvent('rag_citation', {
                                citedCount: newRagFacts.length,
                                citedChunkIds: injectedChunkIds,
                                stage: 'injected'
                            });
                            this.memory.recordInjected(injectedChunkIds);
                            onEvent?.({ type: 'rag_citation', payload: { citedCount: newRagFacts.length, citedIds: injectedChunkIds } });
                        }
                    }
                }
                catch (e) {
                    logger.logError("Session Context Inject", e);
                    console.error("[PiKernel] Session context inject failed:", e);
                }
            }
            // 用户从聊天输入框显式附加的技能：由 Gateway 在执行当刻从 userData/skills
            // 重新校验并读取全文。手动挂载是明确的用户意图，默认按技能流程执行；只有技能
            // 确实覆盖不到时才允许改道，且必须先向用户说明。措辞刻意压到最短：这段每轮都
            // 随技能全文一起进 prompt，冗余句式会按 token 计费。
            //
            // 放宽会退化成"参考"语义：曾出现记忆里的本地文件路径命中提问、模型据此绕开
            // 挂载的 ima-knowledge 直接读本地 docx 的情况。
            if (isFreshUserTurn) {
                const attached = getContext()?.attachedSkill;
                if (attached?.id) {
                    let skillBlock = "";
                    if (attached.unavailable || typeof attached.content !== "string") {
                        skillBlock = [
                            "# Attached skill unavailable",
                            `\`${attached.name || attached.id}\` failed to load: ${attached.unavailableReason || "unavailable"}. Tell the user, never claim you used it, and fall back only to a tool that genuinely fits.`,
                        ].join("\n");
                        logger.writeEvent("skill_context_attached", {
                            skillId: attached.id,
                            skillName: attached.name || attached.id,
                            status: "unavailable",
                            reason: attached.unavailableReason || "unavailable",
                        });
                    }
                    else {
                        const baseDir = typeof attached.baseDir === "string" && attached.baseDir ? attached.baseDir : "";
                        skillBlock = [
                            "# Attached skill — user-selected, authoritative this turn",
                            `The user picked \`${attached.name || attached.id}\`. Follow its workflow for the parts it covers; do not substitute memory, local files or other tools there.`,
                            "Skip it only if it genuinely cannot serve the request, and say so in one sentence first.",
                            `Never claim you used it if you did not.${baseDir ? " Use base_dir as given; do not scan the skills directory." : ""}`,
                            "",
                            `<attached_skill id=${JSON.stringify(attached.id)}${baseDir ? ` base_dir=${JSON.stringify(baseDir)}` : ""}>`,
                            attached.content,
                            "</attached_skill>",
                        ].join("\n");
                        const contentHash = crypto.createHash("sha256").update(attached.content).digest("hex").slice(0, 16);
                        logger.writeEvent("skill_context_attached", {
                            skillId: attached.id,
                            skillName: attached.name || attached.id,
                            version: attached.version || null,
                            status: "loaded",
                            chars: attached.content.length,
                            contentHash,
                        });
                        onEvent?.({ type: "think", description: `已读取「${attached.name || attached.id}」技能` });
                    }
                    sessionContextBlock = [skillBlock, sessionContextBlock].filter(Boolean).join("\n\n");
                    sessionContextIds.attachedSkill = {
                        id: attached.id,
                        name: attached.name || attached.id,
                        version: attached.version,
                    };
                }
            }
            // ----------------------------------------------------
            // [Debug] Verify User Message Content
            if (textContent.includes("Context from Memory")) {
                console.warn("[PiKernel] WARNING: User message contains 'Context from Memory'. This should not happen with System Prompt injection!");
                // Optional: Strip it out if it exists?
            }
            // Resolve Adapter
            // If session.model is missing, fallback to defaults
            const providerName = session.model?.provider || "openai";
            const modelId = session.model?.id || "gpt-3.5-turbo";
            const adapter = adapterManager.getAdapter(providerName, modelId);
            logger.logEvent("Adapter Selected", { id: adapter.id, provider: providerName, model: modelId });
            // --- Sanitization & Limit (OpenClaw-style) ---
            // 1. Repair orphaned trailing user messages (prevents User-User sequence)
            const leafEntry = session.sessionManager.getLeafEntry();
            logger.logEvent("Session Context Snapshot", {
                leafType: leafEntry?.type || null,
                leafRole: leafEntry?.message?.role || null,
                leafId: leafEntry?.id || null,
                leafParentId: leafEntry?.parentId || null,
                loaded: summarizeMessages(session.agent.state.messages || [])
            });
            if (leafEntry?.type === "message" && leafEntry.message.role === "user") {
                logger.logEvent("Sanitization", "Removing orphaned user message");
                console.warn(`[PiKernel] Removing orphaned user message to prevent consecutive user turns.`);
                if (leafEntry.parentId) {
                    session.sessionManager.branch(leafEntry.parentId);
                }
                else {
                    session.sessionManager.resetLeaf();
                }
                const sessionContext = session.sessionManager.buildSessionContext();
                session.agent.state.messages = sessionContext.messages;
            }
            // 2. Normalize message content shape only (lossless & idempotent).
            //    All lossy/limiting/adapter shaping now happens transiently at send
            //    time inside streamWithAdapter() (see "SEND-TIME SANITIZATION"), so
            //    the persisted history stays canonical & structured: historical tool
            //    calls/results remain native protocol messages and are never rewritten
            //    to "[Historical tool observation]" text. That rewrite-then-persist was
            //    the root cause of the model imitating tool calls as plain text in long
            //    sessions and silently never executing any tool.
            const normalized = normalizeMessageContents(session.agent.state.messages);
            if (normalized.changed) {
                logger.logEvent("History Normalized", { count: normalized.messages.length });
                session.agent.state.messages = normalized.messages;
            }
            // ---------------------------------------------
            // 3. Context Check
            // Check using pure text content since we moved memory to system prompt
            // Also check if context window is exceeded
            let preflightCompactionMetrics = null;
            const compactBeforePrompt = async (description) => {
                throwIfRunCancelled(activeRun.abortController.signal);
                onEvent?.({ type: 'think', description });
                const startedAt = Date.now();
                logger.logEvent("Preflight Compaction Start", {
                    reason: "quality_budget",
                    timeoutMs: PREFLIGHT_COMPACTION_TIMEOUT_MS,
                    ...preflightCompactionMetrics,
                    messagesBefore: session.agent.state.messages.length,
                    leafIdBefore: session.sessionManager.getLeafEntry()?.id || null,
                });
                try {
                    const operation = session.compact();
                    const result = await waitForPiPhase(operation, {
                        phase: "Preflight context compaction",
                        signal: activeRun.abortController.signal,
                        timeoutMs: PREFLIGHT_COMPACTION_TIMEOUT_MS,
                        onCancel: () => {
                            session.abortCompaction();
                            session.agent.abort();
                        },
                        // 超时说明这一个 AgentSession 的压缩生命周期已经不可信；即使
                        // abort 后很快结束，也不让下一轮复用它，重新从持久会话构建最稳妥。
                        onTimeout: () => { activeRun.poisoned = true; },
                        onUnsettled: () => { activeRun.poisoned = true; },
                    });
                    logger.logEvent("Preflight Compaction End", {
                        durationMs: Date.now() - startedAt,
                        tokensBefore: result.tokensBefore,
                        estimatedTokensAfter: result.estimatedTokensAfter,
                        firstKeptEntryId: result.firstKeptEntryId,
                        summaryLength: result.summary.length,
                        messagesAfter: session.agent.state.messages.length,
                        leafIdAfter: session.sessionManager.getLeafEntry()?.id || null,
                    });
                }
                catch (error) {
                    const normalized = normalizeError(error);
                    logger.logEvent("Preflight Compaction Failed", {
                        durationMs: Date.now() - startedAt,
                        errorName: normalized.name,
                        errorMessage: normalized.message,
                        poisoned: activeRun.poisoned,
                    });
                    throw error;
                }
            };
            let forceCompaction = false;
            try {
                const metrics = await this.checkContextWindow(session, userMessage, logger, activeRun.abortController.signal);
                if (metrics && metrics.totalTokens > metrics.compactionTrigger) {
                    forceCompaction = true;
                    preflightCompactionMetrics = metrics;
                }
                else if (metrics) {
                    // 上下文已经回到阈值以下（用户新开了分支、或历史被别的路径裁过），
                    // 说明不再需要硬裁兜底。不清这个标记的话，即便会话已经健康，
                    // 也会白白按硬裁跑满整个冷却期。
                    clearCompactionTimeout(sessionId);
                }
            }
            catch (e) {
                throwIfRunCancelled(activeRun.abortController.signal);
                if (isRunCancelledError(e) || e instanceof PiPhaseTimeoutError)
                    throw e;
                // Context estimation itself failing should not brick chat. The historical
                // "exceed" fallback is retained, but compaction is executed outside this
                // catch so its own cancellation/timeout cannot be swallowed here.
                console.error("[PiKernel] Context check failed:", e);
                forceCompaction = !!(e?.message && e.message.includes("exceed"));
            }
            // 这个会话已经证明过自己压不动？别再花五分钟撞同一堵墙。
            // 线上实测连续四轮每轮恰好挂满 300s，而 messagesBefore/leafId 一模一样——压缩一次都
            // 没成功，上下文永远降不到阈值以下，于是每一条新消息都重复同样的死循环。
            // 跳过压缩，改由发送侧硬裁（见 buildContextProjectionMessages 调用处）把上下文压下去。
            if (forceCompaction && shouldSkipCompaction(sessionId)) {
                forceCompaction = false;
                logger.logEvent("Preflight Compaction Skipped", {
                    reason: "previous_timeout",
                    ...preflightCompactionMetrics,
                    fallback: "hard_trim_send_projection",
                });
                onEvent?.({ type: 'think', description: "上下文压缩此前超时，本轮改用精简上下文继续..." });
            }
            if (forceCompaction) {
                try {
                    await compactBeforePrompt("上下文压缩中...");
                    // 压缩成功说明这个会话又能压了，撤掉硬裁标记，恢复正常路径。
                    clearCompactionTimeout(sessionId);
                    onEvent?.({ type: 'think', description: "上下文压缩完成，继续处理..." });
                }
                catch (e) {
                    throwIfRunCancelled(activeRun.abortController.signal);
                    if (e instanceof PiPhaseTimeoutError) {
                        // 记下来：**下一轮**不再压缩，直接硬裁。本轮仍然要抛——onCancel 已经调过
                        // session.agent.abort()，在同一个被 abort 的 agent 上继续 prompt 不安全。
                        // 代价是一轮，而不是这个会话此后的每一轮。
                        markCompactionTimedOut(sessionId);
                        console.error(`[PiKernel] Preflight compaction timed out for ${sessionId}; `
                            + "next turn will skip compaction and hard-trim instead.");
                        throw e;
                    }
                    if (isRunCancelledError(e))
                        throw e;
                    // 与旧行为兼容：例如 Pi 判断 Nothing to compact 时仍允许本轮继续。
                    // 真正的挂起已经被上面的 timeout/abort 边界截断，不会再锁死会话。
                    console.error("[PiKernel] Preflight compaction failed:", e);
                }
            }
            throwIfRunCancelled(activeRun.abortController.signal);
            // 4. Subscribe & Execute
            let finalResponse = "";
            // Compaction Retry State
            let compactionRetryPromise = null;
            let compactionRetryResolve;
            let pendingCompactionRetry = 0;
            let compactionInFlight = false;
            let compactionStartedAt;
            // Error State Capture
            let runError = null;
            // 通过函数读取，避免 TS 把它按"从未在同一控制流里赋值"窄化成 null。
            // （赋值发生在 subscribe 回调里，控制流分析看不见。）
            const readRunError = () => runError;
            let wasAborted = false;
            let wasOutputTruncated = false;
            const ensureCompactionPromise = () => {
                if (!compactionRetryPromise) {
                    compactionRetryPromise = new Promise((resolve) => {
                        compactionRetryResolve = resolve;
                    });
                }
            };
            const finishCompactionWaitIfIdle = () => {
                if (pendingCompactionRetry === 0 && !compactionInFlight) {
                    compactionRetryResolve?.();
                    compactionRetryPromise = null;
                    compactionRetryResolve = undefined;
                }
            };
            const completeOneCompactionRetry = () => {
                // 初始 agent_end 可能先于 AgentSession 的 compaction_start 到达。
                // 没有 pending retry 时它不属于“压缩后的那一轮”，不能提前 resolve。
                if (pendingCompactionRetry <= 0)
                    return;
                pendingCompactionRetry--;
                finishCompactionWaitIfIdle();
            };
            const forceFinishCompactionWait = () => {
                pendingCompactionRetry = 0;
                compactionInFlight = false;
                compactionRetryResolve?.();
                compactionRetryPromise = null;
                compactionRetryResolve = undefined;
            };
            const unsubscribe = session.subscribe((event) => {
                if (event.type === "turn_start") {
                    consumeAgentRunTurn(getContext()?.agentRunBudget);
                }
                // Debug: Log raw events from Pi (excluding verbose updates to reduce log size)
                if (event.type !== "message_update") {
                    logger.writeRaw(`[PiEvent] ${event.type}\n`);
                }
                // Map Pi events to YokoAgent events
                if (event.type === "message_update") {
                    const msgEvent = event.assistantMessageEvent;
                    if (msgEvent.type === "text_delta") {
                        const delta = msgEvent.delta;
                        consumeAgentRunOutputText(getContext()?.agentRunBudget, delta);
                        // Note: We now handle thinking tags in streamWithAdapter, so raw delta here 
                        // should be cleaner. However, we still receive text_delta from the stream.
                        // If streamWithAdapter yields 'thinking_delta', we handle it below.
                        // We simply pass through the text_delta to UI
                        // Loop detection is still relevant
                        onEvent?.({ type: 'text_delta', delta });
                        finalResponse += delta;
                        // Loop Detection: Check if the model is outputting repetitive text
                        if (detectRepetitiveLoop(finalResponse)) {
                            const msg = "Repetitive text loop detected in model output. Aborting stream.";
                            console.warn(`[PiKernel] ${msg}`);
                            logger.logError("Loop Detection", new Error(msg));
                            // Attempt to force-stop the agent if possible
                            try {
                                if (typeof session.agent.stop === 'function') {
                                    session.agent.stop();
                                }
                            }
                            catch (e) { /* ignore */ }
                            // Notify UI about the error
                            onEvent?.({ type: 'think', description: `[Error] ${msg}` });
                            // Append error to final response instead of throwing to avoid crashing the process
                            finalResponse += `\n\n[System Error] ${msg}`;
                            return; // Exit callback
                        }
                    }
                    else if (msgEvent.type === "thinking_delta") {
                        // Handle our custom thinking delta
                        onEvent?.({ type: 'think', delta: msgEvent.delta });
                    }
                    else if (msgEvent.type === "thinking_delta") {
                        // Handle native thinking delta (if supported by pi-ai)
                        onEvent?.({ type: 'think', delta: msgEvent.delta });
                    }
                    else if (msgEvent.type === "thinking_start") {
                        onEvent?.({ type: 'think', description: "Thinking..." });
                    }
                    else if (msgEvent.type === "thinking_end") {
                        // Some models might send an end event
                        // onEvent?.({ type: 'think', description: "Thinking Complete" });
                    }
                }
                else if (event.type === "tool_execution_start") {
                    logger.logToolStart(event.toolName, event.args);
                    logger.writeEvent('tool_call', {
                        toolName: event.toolName,
                        argsPreview: JSON.stringify(event.args).slice(0, 200)
                    });
                    onEvent?.({
                        type: 'tool_start',
                        toolName: event.toolName,
                        toolArgs: event.args
                    });
                }
                else if (event.type === "tool_execution_end") {
                    const result = event.result;
                    const d = result?.details;
                    const toolIsError = event.isError === true || !!d?.error || result?.isError === true;
                    logger.logToolResult(event.toolName, {
                        resultLength: d?.originalLength ?? 0,
                        normalizedLength: d?.normalizedLength ?? 0,
                        snippet: d?.snippet ?? "",
                        isError: toolIsError,
                    });
                    logger.writeEvent('tool_result', {
                        toolName: event.toolName,
                        isError: toolIsError,
                        resultLength: d?.originalLength ?? 0,
                        snippet: (d?.snippet ?? "").slice(0, 200)
                    });
                    onEvent?.({
                        type: 'tool_result',
                        toolName: event.toolName,
                        toolResult: result?.content,
                        isError: !!(result?.isError || result?.details?.error)
                    });
                }
                else if (event.type === "message_end") {
                    // Record Billing Usage
                    const msg = event.message;
                    if (msg.usage) {
                        try {
                            BillingManager.getInstance().recordUsage(msg.model || "default", msg.usage.input || 0, msg.usage.output || 0, sessionId);
                        }
                        catch (e) {
                            console.error("[PiKernel] Failed to record billing usage:", e);
                        }
                        logger.writeEvent('llm_turn', {
                            model: msg.model || "default",
                            provider: msg.provider || "unknown",
                            api: msg.api || "unknown",
                            inputTokens: msg.usage.input || 0,
                            outputTokens: msg.usage.output || 0,
                            cacheReadTokens: msg.usage.cacheRead || 0,
                            cacheWriteTokens: msg.usage.cacheWrite || 0,
                            totalTokens: msg.usage.totalTokens || 0,
                            rawUsage: {
                                input: msg.usage.input || 0,
                                output: msg.usage.output || 0,
                                cacheRead: msg.usage.cacheRead || 0,
                                cacheWrite: msg.usage.cacheWrite || 0,
                                totalTokens: msg.usage.totalTokens || 0,
                                cost: {
                                    input: msg.usage.cost?.input || 0,
                                    output: msg.usage.cost?.output || 0,
                                    cacheRead: msg.usage.cost?.cacheRead || 0,
                                    cacheWrite: msg.usage.cost?.cacheWrite || 0,
                                    total: msg.usage.cost?.total || 0,
                                },
                            },
                            stopReason: msg.stopReason || "unknown"
                        });
                    }
                    const debugMessage = messageForDebugLog(event.message);
                    if (debugMessage)
                        logger.logEvent("Message End", debugMessage);
                    // Track abort state so fallback text can be appropriately worded
                    if (event.message.stopReason === "aborted") {
                        wasAborted = true;
                    }
                    // Check for Error Stop Reason (e.g. 402 Insufficient Balance)
                    if (event.message.stopReason === "error" && event.message.errorMessage) {
                        const errorMsg = event.message.errorMessage;
                        console.warn(`[PiKernel] Agent stopped with error: ${errorMsg}`);
                        runError = new Error(errorMsg);
                    }
                    // Intermediate turn: LLM called tools and will be prompted again.
                    // Reset finalResponse so we only capture the FINAL turn's text.
                    // Without this, text_delta from all turns accumulates, causing a mismatch
                    // with the persisted session (which stores only the final turn's text) and
                    // producing a duplicate assistant bubble in the UI.
                    if (event.message.role === "assistant" && event.message.stopReason === "toolUse") {
                        finalResponse = "";
                    }
                    else if (event.message.role === "assistant") {
                        // Fallback: Ensure finalResponse captures the full content from message_end.
                        // This handles cases where streaming buffer wasn't fully flushed or toolDelta was used.
                        let fullContent = "";
                        const content = event.message.content;
                        if (typeof content === "string") {
                            fullContent = content;
                        }
                        else if (Array.isArray(content)) {
                            fullContent = content
                                .filter((c) => c.type === "text")
                                .map((c) => c.text || "")
                                .join("");
                        }
                        if (fullContent.length > finalResponse.length) {
                            logger.logEvent("FinalResponse Update", { oldLen: finalResponse.length, newLen: fullContent.length });
                            finalResponse = fullContent;
                        }
                    }
                }
                else if (event.type === "agent_end") {
                    logger.logEvent("Agent End", { finalResponseLength: finalResponse.length });
                    // Agent turn fully completed (includes any auto-continue)
                    completeOneCompactionRetry();
                }
                else if (event.type === "compaction_start") {
                    const reason = event.reason;
                    compactionInFlight = true;
                    // Manual/preflight compaction has its own PREFLIGHT_COMPACTION_TIMEOUT_MS.
                    // The automatic watchdog must not apply its independently configured limit
                    // to that path, otherwise the two timeout controls silently interfere.
                    compactionStartedAt = isAutomaticCompactionReason(reason) ? Date.now() : undefined;
                    ensureCompactionPromise();
                    // 与预压缩用同一句中文：轮内守卫上线后这条会频繁出现在用户眼前，
                    // 不能一个路径说中文、另一个路径蹦出英文。
                    onEvent?.({ type: 'think', description: "上下文压缩中..." });
                }
                else if (event.type === "compaction_end") {
                    compactionInFlight = false;
                    compactionStartedAt = undefined;
                    // 压缩要几十秒（线上实测 40~73s），只报开始不报结束，用户会以为卡死了。
                    if (event.aborted !== true) {
                        onEvent?.({ type: 'think', description: "上下文压缩完成，继续处理..." });
                    }
                    // 0.83 起重试就在 prompt() 的 await 链里，不需要再判"这次重试到底
                    // 做不做得到"（旧的 piRetryFeasibility）。这里只记录，供排查用。
                    logger.logEvent("Compaction End", {
                        reason: event.reason,
                        willRetry: event.willRetry === true,
                        aborted: event.aborted === true,
                        errorMessage: event.errorMessage ?? null,
                    });
                    finishCompactionWaitIfIdle();
                }
                else if (event.type === "auto_retry_start") {
                    // ── 让自动重试**可见** ──
                    //
                    // pi 会对传输类错误自动重试（2s/4s/8s 退避，默认 3 次）。这件事
                    // 以前对用户和日志都完全不可见：前端停在"思考中"一动不动，控制台
                    // 也没有任何一行——线上表现为"agent 卡死了"，实际上它正在自愈。
                    const attempt = event.attempt;
                    const maxAttempts = event.maxAttempts;
                    const delayMs = event.delayMs;
                    const errorMessage = event.errorMessage;
                    console.warn(`[PiKernel] 模型调用失败，${delayMs}ms 后自动重试 (${attempt}/${maxAttempts})：${errorMessage}`);
                    logger.logEvent("Auto Retry Start", { attempt, maxAttempts, delayMs, errorMessage });
                    onEvent?.({
                        type: 'think',
                        description: `网络异常，正在自动重试（第 ${attempt}/${maxAttempts} 次）…`,
                    });
                    // 竞态补刀：stop() 可能恰好落在"流已失败、_prepareRetry 还没建好
                    // _retryAbortController"的空档里，那一刻的 abortRetry() 是空操作。
                    // pi 的 _emit 是同步的，本回调返回后它才创建控制器并进入 sleep，
                    // 所以这里用宏任务补一刀，确保停止不会被一次重试绕过。
                    if (activeRun.abortController.signal.aborted) {
                        setTimeout(() => {
                            try {
                                session.abortRetry();
                            }
                            catch { /* best effort */ }
                        }, 0);
                    }
                }
                else if (event.type === "auto_retry_end") {
                    const success = event.success === true;
                    const attempt = event.attempt;
                    const finalError = event.finalError;
                    logger.logEvent("Auto Retry End", { success, attempt, finalError: finalError ?? null });
                    if (success) {
                        console.log(`[PiKernel] 自动重试成功（第 ${attempt} 次）`);
                        onEvent?.({ type: 'think', description: "重试成功，继续生成…" });
                    }
                    else {
                        console.warn(`[PiKernel] 自动重试失败（已重试 ${attempt} 次）：${finalError}`);
                    }
                }
            });
            // ── 自动压缩看门狗 ──
            //
            // 0.83 把自动压缩搬进了 AgentSession.prompt() 的 await 链，于是 prompt() 之后的
            // 那段排空逻辑**够不到**正在挂起的压缩——必须等 prompt() 返回它才会跑。
            // 升级前这件事由 for(;;) 循环里的 isCompactionOverdue() 兜底，那条路已经删了，
            // AUTOMATIC_COMPACTION_OVERDUE_MS 也因此变成了只产出、无人消费的死配置。
            //
            // 这里把它接回来。注意**不能**给整个 prompt 阶段设绝对超时：正常的长工具链、
            // 长 LLM 请求都可能跑很久，一刀切会误杀。只在"压缩确实在飞行中且已超时"时动手。
            let compactionWatchdog;
            const stopCompactionWatchdog = () => {
                if (compactionWatchdog) {
                    clearInterval(compactionWatchdog);
                    compactionWatchdog = undefined;
                }
            };
            compactionWatchdog = setInterval(() => {
                if (!compactionInFlight || !compactionStartedAt)
                    return;
                const stuckFor = Date.now() - compactionStartedAt;
                if (stuckFor <= AUTOMATIC_COMPACTION_OVERDUE_MS)
                    return;
                if (activeRun.abortController.signal.aborted)
                    return;
                console.error(`[PiKernel] 自动压缩已挂起 ${stuckFor}ms，超过 ${AUTOMATIC_COMPACTION_OVERDUE_MS}ms，强制终止本轮。`);
                logger.logEvent("Automatic Compaction Stuck", {
                    stuckForMs: stuckFor,
                    thresholdMs: AUTOMATIC_COMPACTION_OVERDUE_MS,
                    finalResponseLength: finalResponse.length,
                });
                // 这个 AgentSession 的压缩生命周期已不可信，绝不能让下一轮复用。
                activeRun.poisoned = true;
                compactionInFlight = false;
                compactionStartedAt = undefined;
                try {
                    session.abortCompaction();
                }
                catch { /* best effort */ }
                // 用非取消类错误中止：waitForPiPhase 会把 signal.reason 原样抛出，
                // isRunCancelledError 对它返回 false，因此会作为真实错误上报给用户，
                // 而不是被当成"用户主动停止"静默咽掉。
                activeRun.abortController.abort(new Error("上下文自动压缩超时，本轮已安全终止。请重试；若仍出现请新建会话。"));
                stopCompactionWatchdog();
            }, 1_000);
            // 5. Run Loop
            //
            // pi 0.83 起自动压缩与自动重试全部搬进了 AgentSession.prompt() 的 await 链
            // （_runAgentPrompt: `await agent.prompt()` → `while (await _handlePostAgentRun())
            // await agent.continue()`）。继续调用底层的 agent.prompt() 会**静默失去**
            // 自动压缩和溢出重试——事件处理器里已经不再触发它们了。
            const waitPiPhase = (operation, phase) => waitForPiPhase(operation, {
                phase,
                signal: activeRun.abortController.signal,
                // 普通 agent run 不设武断的绝对时限；用户 stop 必须能在底层工具
                // 不合作时仍退出等待。超过 drain 窗口就隔离旧 AgentSession。
                onCancel: () => {
                    session.abortCompaction();
                    // 与 stop() 同因：退避中的自动重试只认 _retryAbortController。
                    session.abortRetry();
                    session.agent.abort();
                },
                onUnsettled: () => { activeRun.poisoned = true; },
            });
            const runSessionPrompt = async (text, images) => {
                await waitPiPhase(session.prompt(text, {
                    // 用户输入可能以 "/" 开头，绝不能被当成 pi 的扩展命令/模板去展开。
                    expandPromptTemplates: false,
                    // InputSource 只有 interactive | rpc | extension；本产品是
                    // 程序化嵌入调用，"rpc" 是语义最接近的一个。
                    source: "rpc",
                    ...(images && images.length > 0 ? { images } : {}),
                }), "Agent prompt");
            };
            // 低层入口：工具结果这类结构化消息 AgentSession.prompt() 收不了（它只收
            // string + images）。这条路径没有自动压缩，但它只在工具回灌/重试时走，
            // 上下文增量极小，且前面的 preflight 压缩已经把窗口压过一遍。
            const runRawAgentPrompt = async (input) => {
                // 这条路不经过 AgentSession.prompt()，before_agent_start 不会触发，
                // state.systemPrompt 还停在**上一轮**的值。工具清单写在系统提示词里、
                // 且每轮按 profile/scope 重算，滞后一轮就等于把旧工具集告诉模型。
                if (!syncStateSystemPrompt(session)) {
                    console.warn("[PiKernel] 底层 prompt 路径无法同步本轮系统提示词（会话未绑定槽位）");
                }
                await waitPiPhase(session.agent.prompt(input), "Agent prompt (raw)");
            };
            try {
                // 会话上下文块必须排在用户消息**之前**。
                //
                // 不能用 `deliverAs: "nextTurn"`：pi 的 prompt() 是先 push 用户消息、
                // 再 push pending 的 nextTurn 消息（agent-session 里 messages.push(user)
                // 紧接着 for (pendingNextTurnMessages) push），顺序正好是反的。
                //
                // 顺序反了有三处实际损害：
                //  1. RAG/ledger 落在用户请求之后，模型的近因偏好会削弱"当前请求优先"；
                //  2. Anthropic 的缓存断点会落在每轮都变的上下文块上，而不是真实用户消息；
                //  3. 停止后恢复是从用户消息**向前**扫 SESSION_CONTEXT_CUSTOM_TYPE 的
                //     （见本文件 recoverStoppedTurn），顺序反转会静默丢掉 attached skill 引用。
                //
                // 不带 deliverAs 时，非 streaming 状态下 pi 会立即把 custom 消息追加进
                // agent.state.messages 并落盘为 custom_message 条目，随后 prompt() 再追加
                // 用户消息——顺序即为 [context, user]，与升级前一致。
                if (sessionContextBlock) {
                    await session.sendCustomMessage({
                        customType: SESSION_CONTEXT_CUSTOM_TYPE,
                        content: sessionContextBlock.trim(),
                        display: false,
                        details: sessionContextIds,
                    });
                }
                // Check if userMessage is a special Message object (e.g. tool result)
                if (userMessage && typeof userMessage === 'object' && !Array.isArray(userMessage) && userMessage.role) {
                    await runRawAgentPrompt(userMessage);
                }
                else {
                    // Convert to Pi-compatible content (preserving images)
                    const promptContent = convertToPiContent(userMessage);
                    const userContent = typeof promptContent === 'string'
                        ? [{ type: 'text', text: promptContent }]
                        : promptContent;
                    const { text, images } = splitPiContentForPrompt(userContent);
                    await runSessionPrompt(text, images);
                }
                // ── 压缩等待：pi 0.83 之后这里不再需要自研的"孤儿重试"检测 ──
                //
                // 0.70.6 的压缩后重试是 `setTimeout(() => agent.continue().catch(() => {}))`
                // 发出去的，脱离 agent.prompt() 的 promise、异常还被吞掉。调用方 await
                // 的那个 promise 早已 resolve，重试却在后台永远不结算——这就是"agent 卡在
                // 思考中"的根因，也是 waitForRetrySettlement / piRetryFeasibility 那一整套
                // 补丁存在的唯一理由。
                //
                // 0.83 把压缩和重试搬进了 AgentSession.prompt() 的 await 链
                // （_runAgentPrompt 的 `while (await _handlePostAgentRun()) await agent.continue()`），
                // 上面的 runSessionPrompt 返回时压缩与重试**已经结算完毕**（回归测试
                // pi_session_prompt.smoke.ts 的"prompt() 在重试完成后才 resolve"断言）。
                //
                // 只保留一个有界排空：事件是异步派发的，agent_settled 可能比 prompt()
                // 的 resolve 晚一拍；这里给它一个短窗口落地，绝不再做无界等待。
                const drainDeadline = Date.now() + POST_PROMPT_DRAIN_MS;
                while ((session.isStreaming || session.isCompacting || compactionInFlight)
                    && Date.now() < drainDeadline
                    && !activeRun.abortController.signal.aborted) {
                    await new Promise((resolve) => setTimeout(resolve, 20));
                }
                if (session.isStreaming || session.isCompacting) {
                    // 超出排空窗口仍在跑：不阻塞本轮收尾，但这个 AgentSession 的
                    // 生命周期已不可信，不让下一轮复用它。
                    activeRun.poisoned = true;
                    logger.logEvent("Post-Prompt Drain Timeout", {
                        isStreaming: session.isStreaming,
                        isCompacting: session.isCompacting,
                        finalResponseLength: finalResponse.length,
                    });
                }
                forceFinishCompactionWait();
                throwIfRunCancelled(activeRun.abortController.signal);
                // 必须等所有 compaction/retry 都结算后再判断 length：第一次 length 可能是
                // 真上下文溢出，Pi 随后会压缩并成功重试；过早提示会把最终成功误报成截断。
                const settledMessages = session.agent.state.messages;
                const lastSettledMessage = settledMessages?.[settledMessages.length - 1];
                // ── 本轮成败以**结算后的末态**为准，而不是中途出现过的错误 ──
                //
                // pi 0.83 把重试和压缩恢复搬进了 AgentSession.prompt() 的 await 生命周期：
                // 首次失败 → 自动压缩/退避 → agent.continue() → 最终成功 → prompt() 才返回。
                // 中间那次失败会发出一条 stopReason="error" 的 message_end，把 runError 置上。
                //
                // 如果照旧无条件抛 runError，用户就会看到：答案其实已经成功生成、也已经落盘，
                // 但 UI/RPC 收到失败。0.70.6 时代重试多半是挂死的，走不到这一步；0.83 把重试
                // 修好之后，**每一次成功的溢出恢复都会踩到**。
                //
                // 所以只有当末态本身也不成功时，才把中途错误作为本轮结论抛出。
                // 由工具终止的 run（cron_run_complete 提交成功）末条是 toolResult，同样是成功末态。
                const settledSuccessfully = isSuccessfulSettledAssistant(lastSettledMessage)
                    || isSuccessfulToolTermination(lastSettledMessage, getRunTermination(requestContext));
                const capturedRunError = readRunError();
                if (capturedRunError && !settledSuccessfully) {
                    throw capturedRunError;
                }
                if (capturedRunError) {
                    // 记下来：这是"中途失败但最终恢复成功"的现场，排查重试链路时要看它。
                    logger.logEvent("Run Error Recovered", {
                        error: capturedRunError.message,
                        finalStopReason: lastSettledMessage?.stopReason ?? null,
                        finalRole: lastSettledMessage?.role ?? null,
                        finalResponseLength: finalResponse.length,
                    });
                    console.log(`[PiKernel] 中途出错但已自动恢复，按最终成功处理：${capturedRunError.message}`);
                    runError = null;
                }
                if (lastSettledMessage?.role === "assistant" && isLengthStopReason(lastSettledMessage.stopReason)) {
                    wasOutputTruncated = true;
                    const before = finalResponse;
                    finalResponse = appendOutputTruncationNotice(finalResponse);
                    const noticeDelta = finalResponse.slice(before.length);
                    if (noticeDelta)
                        onEvent?.({ type: 'text_delta', delta: noticeDelta });
                    const content = lastSettledMessage.content;
                    const markedContent = Array.isArray(content)
                        ? [
                            ...content,
                            ...(content.some((block) => block?.type === "text" && String(block.text || "").includes(OUTPUT_TRUNCATION_NOTICE))
                                ? []
                                : [{ type: "text", text: `\n\n${OUTPUT_TRUNCATION_NOTICE}` }]),
                        ]
                        : appendOutputTruncationNotice(typeof content === "string" ? content : "");
                    const markedMessage = { ...lastSettledMessage, content: markedContent };
                    // message_end 已按 append-only 方式落盘，不能原地改 JSONL。把 leaf 回到
                    // 父节点后追加“带警告的替代 assistant”形成新分支：旧条目可审计，
                    // 当前分支与内存都只看到替代条目，刷新后警告仍在且不会出现 assistant-assistant。
                    const leaf = session.sessionManager.getLeafEntry();
                    let persistedAsReplacementBranch = false;
                    if (leaf?.type === "message" && leaf?.message?.role === "assistant") {
                        try {
                            if (leaf.parentId)
                                session.sessionManager.branch(leaf.parentId);
                            else
                                session.sessionManager.resetLeaf();
                            session.sessionManager.appendMessage(markedMessage);
                            session.agent.state.messages = session.sessionManager.buildSessionContext().messages;
                            persistedAsReplacementBranch = true;
                        }
                        catch (error) {
                            // 分支替换只是持久化增强，失败不能把已经生成的正文也变成报错。
                            // 若 branch 已成功但 append 失败，尽力回到原 leaf，避免截断回答从
                            // 当前分支上消失。
                            try {
                                if (leaf.id)
                                    session.sessionManager.branch(leaf.id);
                            }
                            catch { /* best effort */ }
                            settledMessages[settledMessages.length - 1] = markedMessage;
                            session.agent.state.messages = settledMessages;
                            logger.logError("Persist Output Truncation Notice", error);
                        }
                    }
                    else {
                        // 极端扩展场景下 leaf 可能不是消息；至少保证本次内存与用户响应不静默。
                        settledMessages[settledMessages.length - 1] = markedMessage;
                        session.agent.state.messages = settledMessages;
                    }
                    logger.logEvent("Model Output Truncated", {
                        stopReason: lastSettledMessage.stopReason,
                        responseLength: before.length,
                        persistedAsReplacementBranch,
                    });
                }
                // 工具请求终止时，"没有最终自然语言回复"是**预期结果**，不是故障。
                //
                // 这一支必须排在下面的空回复兜底之前：终止后 state.messages 的末条是工具结果
                // 而不是 assistant，兜底里的 `!hasText` 分支会把它当成"模型调用彻底失败"，
                // 给调用方塞一条 friendlyModelError —— 把一次正常收口伪装成模型报错，
                // 既污染 trace 也会让排查时找错方向。
                const runTermination = getRunTermination(requestContext);
                if (runTermination && (!finalResponse || finalResponse.trim().length === 0)) {
                    logger.logEvent("Run Terminated By Tool", {
                        toolName: runTermination.toolName,
                        reason: runTermination.reason,
                    });
                }
                else if (!finalResponse || finalResponse.trim().length === 0) {
                    // [Bugfix] Handle empty final response (e.g. DeepSeek Reasoner returning only a thinking block and no text)
                    // If we don't inject text, the message will be treated as an intermediate message and the UI will hide the final answer bubble.
                    const msgs = session.agent.state.messages;
                    const lastMsg = msgs && msgs.length > 0 ? msgs[msgs.length - 1] : null;
                    const isAssistant = !!lastMsg && lastMsg.role === "assistant";
                    const hasThinking = isAssistant && Array.isArray(lastMsg.content)
                        && lastMsg.content.some((c) => c.type === 'thinking');
                    const hasText = isAssistant && Array.isArray(lastMsg.content)
                        && lastMsg.content.some((c) => c.type === 'text' && c.text.trim() !== '');
                    let fallbackText = null;
                    if (wasAborted) {
                        fallbackText = "（已取消）";
                    }
                    else if (hasThinking && !hasText) {
                        // 模型只吐了思考块没吐正文（DeepSeek Reasoner 常见）——内容其实在思考里
                        console.warn("[PiKernel] Agent generated thinking block but no text. Injecting fallback text.");
                        fallbackText = "（任务已完成，但LLM未生成文本回答。请展开上方思考过程查看详细内容。）";
                    }
                    else if (!hasText) {
                        // 彻底空：调用压根没成功（content 为 []，stopReason=error，usage 全 0）。
                        //
                        // 这一支以前【不存在】：旧条件是 hasThinking && !hasText，
                        // 连接失败时 content 是空数组，hasThinking 为 false，兜底不触发，
                        // finalResponse 保持空串，UI 收到空消息——用户界面上什么都看不到，
                        // 只能反复重问。线上真实发生过（见 model_error.ts 的背景说明）。
                        const stopReason = lastMsg?.stopReason;
                        // 只取消息自带的 errorMessage：走到这里要么 runError 本就为空，
                        // 要么它已被判定为"中途失败但最终恢复成功"并清空，不该再对外冒泡。
                        const errMsg = lastMsg?.errorMessage;
                        console.warn(`[PiKernel] Empty assistant message (stopReason=${stopReason}). Injecting user-facing error.`);
                        fallbackText = friendlyModelError(errMsg, stopReason);
                    }
                    if (fallbackText) {
                        if (isAssistant) {
                            if (Array.isArray(lastMsg.content)) {
                                lastMsg.content.push({ type: 'text', text: fallbackText });
                            }
                            else {
                                lastMsg.content = [{ type: 'text', text: fallbackText }];
                            }
                            // Save updated session to disk to ensure frontend gets it upon history reload
                            try {
                                session.agent.state.messages = msgs;
                            }
                            catch (e) {
                                console.error("[PiKernel] Failed to save fallback text:", e);
                            }
                        }
                        // 即使没有可挂载的 assistant 消息，也必须返回文案：
                        // 调用方拿到空串就等于「静默失败」，那正是要消灭的现象。
                        finalResponse = fallbackText;
                    }
                }
                // Gateway-owned deterministic guards are authoritative over model-authored success
                // claims and approval wording. Persist a replacement branch so refresh/restart cannot
                // resurrect the unguarded assistant text from the append-only session file.
                if (requestContext?.finalResponseGuard) {
                    try {
                        const guardedResponse = requestContext.finalResponseGuard(finalResponse);
                        if (typeof guardedResponse === "string" && guardedResponse !== finalResponse) {
                            const beforeLength = finalResponse.length;
                            const messages = session.agent.state.messages;
                            const lastMessage = messages?.[messages.length - 1];
                            if (lastMessage?.role === "assistant") {
                                const preservedBlocks = Array.isArray(lastMessage.content)
                                    ? lastMessage.content.filter((block) => (block?.type === "thinking" || block?.type === "redacted_thinking"))
                                    : [];
                                const replacement = {
                                    ...lastMessage,
                                    content: [...preservedBlocks, { type: "text", text: guardedResponse }],
                                };
                                const leaf = session.sessionManager.getLeafEntry();
                                if (leaf?.type === "message" && leaf?.message?.role === "assistant") {
                                    try {
                                        if (leaf.parentId)
                                            session.sessionManager.branch(leaf.parentId);
                                        else
                                            session.sessionManager.resetLeaf();
                                        session.sessionManager.appendMessage(replacement);
                                        session.agent.state.messages = session.sessionManager.buildSessionContext().messages;
                                    }
                                    catch (persistError) {
                                        try {
                                            if (leaf.id)
                                                session.sessionManager.branch(leaf.id);
                                        }
                                        catch { /* best effort */ }
                                        messages[messages.length - 1] = replacement;
                                        session.agent.state.messages = messages;
                                        logger.logError("Persist Harness Response Guard", persistError);
                                    }
                                }
                                else {
                                    messages[messages.length - 1] = replacement;
                                    session.agent.state.messages = messages;
                                }
                            }
                            finalResponse = guardedResponse;
                            logger.writeEvent("final_response_guard", {
                                beforeLength,
                                afterLength: finalResponse.length,
                            });
                        }
                    }
                    catch (guardError) {
                        logger.logError("Harness Response Guard", guardError);
                    }
                }
                // Grounding is conservative and answer-based: only memory-derived
                // evidence absent from the user's request receives lifecycle credit.
                // Admitted facts already present in the session remain eligible even
                // when the append-only context block de-duplicates their reinjection.
                const explicitSearchFacts = Array.isArray(getContext()?.memoryGroundingCandidates)
                    ? getContext().memoryGroundingCandidates
                    : [];
                const groundingFactsById = new Map();
                for (const fact of [...admittedLocalFacts, ...explicitSearchFacts]) {
                    if (fact.id)
                        groundingFactsById.set(fact.id, fact);
                }
                const groundedChunkIds = detectGroundedMemoryIds(textContent, finalResponse, [...groundingFactsById.values()]);
                if (groundedChunkIds.length > 0) {
                    this.memory.recordGrounded(groundedChunkIds);
                    logger.writeEvent('memory_grounded', {
                        groundedCount: groundedChunkIds.length,
                        groundedChunkIds,
                    });
                }
                logger.writeEvent('final_response', {
                    responseLength: finalResponse.length,
                    preview: finalResponse.slice(0, 200)
                });
            }
            catch (error) {
                logger.logError("Run Error", error);
                console.error("[PiKernel] Run error:", error);
                onEvent?.({ type: 'think', description: `[Error] ${error.message}` });
                throw error;
            }
            finally {
                const userMessageRole = userMessage && typeof userMessage === 'object' && !Array.isArray(userMessage)
                    ? userMessage.role
                    : undefined;
                const shouldUpdateLedger = recursionDepth === 0
                    && (!userMessageRole || userMessageRole === "user")
                    && !wasAborted
                    && !wasOutputTruncated
                    && !isAgenticRun()
                    && !isAgentTuningRequest
                    && sessionLedgerEnabled;
                if (shouldUpdateLedger) {
                    try {
                        const ledgerUpdate = this.sessionLedger.updateFromTurn({
                            sessionId,
                            userText: textContent,
                            history: history || [],
                            assistantText: finalResponse,
                            outcomeSignal,
                        });
                        if (ledgerUpdate.changed) {
                            logger.writeEvent('session_ledger_update', { ...ledgerUpdate });
                        }
                    }
                    catch (e) {
                        logger.logError("Session Ledger Update", e);
                        console.error("[PiKernel] Session ledger update failed:", e);
                    }
                    // Background candidate-memory extraction. Fire-and-forget: pi awaits
                    // subscribe listeners, and run settlement must never wait on an LLM
                    // extraction call. Reads only role==="user" messages (pure user speech
                    // after the custom-message channel migration).
                    try {
                        TurnMemoryExtractor.getInstance().maybeExtract({
                            sessionId,
                            userId: getContext()?.userId,
                            messages: session.agent.state.messages || [],
                            trace: (payload) => {
                                try {
                                    logger.writeEvent('memory_extract', payload);
                                }
                                catch { /* trace only */ }
                            }
                        });
                    }
                    catch (e) {
                        logger.logError("Turn Memory Extract", e);
                    }
                    // Task-outcome extraction (docs/TASK_MEMORY_DESIGN.md). Same
                    // fire-and-forget contract. Deterministic signal gate inside:
                    // a run without fail→success or artifact signals costs nothing.
                    try {
                        TaskOutcomeExtractor.getInstance().maybeExtract({
                            sessionId,
                            userId: getContext()?.userId,
                            messages: session.agent.state.messages || [],
                            skills: this.tools.listSkillCatalog(resolveProfile(sessionId).scope),
                            trace: (payload) => {
                                try {
                                    logger.writeEvent('task_memory_extract', payload);
                                }
                                catch { /* trace only */ }
                            }
                        });
                    }
                    catch (e) {
                        logger.logError("Task Outcome Extract", e);
                    }
                }
                sessionCache.markIdle(sessionId);
                // ephemeral: 跑完即弃。run id 唯一,留在缓存里只会无界增长。
                if (cachedProfile.sessionPolicy === "ephemeral") {
                    sessionCache.delete(sessionId);
                }
                else {
                    const persistedSessionFile = session.sessionManager.getSessionFile();
                    if (persistedSessionFile && !this.normalizedSessionHeaderFiles.has(persistedSessionFile)) {
                        const normalized = deduplicateSessionHeaders(persistedSessionFile);
                        if (normalized.removed > 0) {
                            console.log(`[PiKernel] Removed ${normalized.removed} duplicate session header(s): ${path.basename(persistedSessionFile)}`);
                        }
                        if (normalized.validJsonl && normalized.hasAssistant) {
                            this.normalizedSessionHeaderFiles.add(persistedSessionFile);
                        }
                    }
                }
                stopCompactionWatchdog();
                releaseLock();
                unsubscribe();
                logger.writeEvent('run_end', {
                    durationMs: Date.now() - runStartMs,
                    finalResponseLength: finalResponse.length
                });
                logger.writeRaw("\n>>> PiKernel Run End <<<\n");
            }
            return finalResponse;
        }
        catch (error) {
            // 停止发生在 prompt 之前时，不会有 Pi message_end 帮我们生成“已取消”。
            // 在生命周期边界统一转成正常取消结果，同时仍会进入 finally 释放锁。
            if (isRunCancelledError(error)) {
                console.log(`[PiKernel] Session ${sessionId} cancelled before run settlement.`);
                return "（已取消）";
            }
            throw error;
        }
        finally {
            // inner run-loop finally 会做完整的日志/订阅清理；这里是覆盖所有预处理
            // 路径的最后保险。两处都调用也安全：releaseLock 本身是幂等的。
            sessionCache.markIdle(sessionId);
            if (activeRun.poisoned || activeRun.ephemeral) {
                sessionCache.delete(sessionId);
            }
            if (requestContext && requestContext.traceEventSink === installedTraceEventSink) {
                if (previousTraceEventSink)
                    requestContext.traceEventSink = previousTraceEventSink;
                else
                    delete requestContext.traceEventSink;
            }
            if (this.activeRuns.get(sessionId) === activeRun) {
                this.activeRuns.delete(sessionId);
            }
            releaseLock();
        }
    }
}
