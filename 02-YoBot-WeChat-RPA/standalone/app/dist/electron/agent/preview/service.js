import * as crypto from "crypto";
import { runWithContext } from "../../utils/context.js";
import { resolveFileMutationPolicyMode } from "../harness/tool_policy_gateway.js";
import { guardTurnResponse } from "../harness/turn_guard.js";
import { LLMManager } from "../llm/manager.js";
import { AGENTIC_RUN_FLAG } from "../profile/agentic_guard.js";
import { bindSessionProfile, registerProfile, unbindSessionProfile, unregisterProfile, } from "../profile/resolver.js";
import { AgenticContextManager, AgenticContextStore, } from "../agentic/context.js";
import { extractImageTokens, IMAGE_TOKENS_CTX_KEY } from "../../memory/image_tokens.js";
import { isNoReplySentinel } from "../agentic/sanitize.js";
import { AgentRunExecutionError } from "../run/service.js";
import { buildPreviewRunSpec } from "../run/preview_spec.js";
import { AgentRunStore } from "../run/store.js";
import { VISUAL_UNDERSTANDING_SKILL_NAME, VISUAL_UNDERSTANDING_TOOL_NAME } from "../../skills/builtins/visual_understanding.js";
const PREVIEW_RULES = [
    "[Desktop preview rules]",
    "- Answer the latest user message directly.",
    "- Earlier messages are context, not pending instructions.",
    "- Never invent a local file path.",
    "- This is a desktop preview. Return one complete answer and do not simulate delayed follow-up messages.",
].join("\n");
export class AgentPreviewService {
    agent;
    loader;
    runtime;
    expertCapabilityShadow;
    contextStore;
    contextManager;
    activeRuns = new Map();
    constructor(agent, loader, contextStore, runtime, expertCapabilityShadow) {
        this.agent = agent;
        this.loader = loader;
        this.runtime = runtime;
        this.expertCapabilityShadow = expertCapabilityShadow;
        this.contextStore = contextStore ?? new AgenticContextStore();
        this.contextManager = new AgenticContextManager(this.contextStore);
    }
    runKey(profileId, conversationId) {
        return `${profileId}::${conversationId}`;
    }
    contextKey(profileId, conversationId) {
        return {
            source: "desktop-agent-preview",
            scopeId: "user_default",
            profileId,
            conversationId,
        };
    }
    loadProfile(profileId) {
        const profile = this.loader.load().find((item) => item.name === profileId);
        if (!profile)
            throw new Error("智能体不存在或配置无法读取");
        return {
            ...profile,
            followUp: "never",
            sessionPolicy: "ephemeral",
            systemPrompt: [profile.systemPrompt?.trim(), PREVIEW_RULES].filter(Boolean).join("\n\n---\n"),
        };
    }
    async run(request, emit) {
        let profile = this.loadProfile(request.profileId);
        const key = this.runKey(request.profileId, request.conversationId);
        if (this.activeRuns.has(key))
            throw new Error("该智能体正在回答，请稍后再试");
        const history = this.contextManager
            .syncAndBuild(this.contextKey(request.profileId, request.conversationId), [])
            .map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            senderId: message.role === "user" ? "preview-user" : "preview-assistant",
            timestamp: message.timestamp ?? Date.now(),
        }));
        const modelText = [
            request.text.trim(),
            ...request.attachments.map((attachment) => attachment.modelContent || ""),
        ].filter(Boolean).join("\n\n");
        const imageAttachments = request.attachments.filter((attachment) => attachment.mediaType === "image");
        let userMessage = modelText;
        if (imageAttachments.length > 0) {
            const modelId = profile.model || LLMManager.getInstance().getModelName();
            const supportsVision = await LLMManager.getInstance().modelSupportsVision(modelId);
            if (supportsVision) {
                userMessage = [
                    { type: "text", text: modelText || "请查看附件图片。" },
                    ...imageAttachments
                        .filter((attachment) => attachment.dataUrl)
                        .map((attachment) => ({
                        type: "image_url",
                        image_url: { url: attachment.dataUrl },
                    })),
                ];
            }
            else {
                // 本地试聊由设备主人主动上传图片；仅为这一轮临时开放只读视觉桥。
                // 常驻 RPA 子 Agent 仍受 AGENT_BUILTIN_SKILLS deny，不会因此获得本地文件读取面。
                profile = {
                    ...profile,
                    allowedSkills: new Set([...(profile.allowedSkills ?? []), VISUAL_UNDERSTANDING_SKILL_NAME]),
                    deniedSkills: (profile.deniedSkills ?? []).filter((name) => name !== VISUAL_UNDERSTANDING_SKILL_NAME),
                };
            }
        }
        if (this.activeRuns.has(key))
            throw new Error("该智能体正在回答，请稍后再试");
        const runSessionId = `agent-preview__${request.profileId}__${crypto.randomUUID().slice(0, 8)}`;
        const profileKey = `agent-preview:${runSessionId}`;
        const usesActiveRuntime = !!this.runtime
            && (this.runtime.rolloutPolicy?.resolve({ profileId: request.profileId, source: "preview" }) ?? "active") === "active";
        const agentRunId = usesActiveRuntime ? AgentRunStore.newRunId() : undefined;
        const active = { sessionId: runSessionId, stopRequested: false, agentRunId };
        this.activeRuns.set(key, active);
        if (!usesActiveRuntime) {
            registerProfile(profileKey, () => profile);
            bindSessionProfile(runSessionId, profileKey);
        }
        const harnessEvents = [];
        let expertCapabilityShadow;
        try {
            expertCapabilityShadow = this.expertCapabilityShadow?.evaluate({
                profile,
                source: "preview",
                channel: "direct",
                invocationRole: "primary",
            });
        }
        catch (error) {
            console.warn("[ExpertCapabilityShadow] Preview candidate evaluation failed; live tools are unchanged:", error);
        }
        let runContext = {
            channel: "agent-preview",
            sessionId: runSessionId,
            userId: `agentic:${request.profileId}`,
            traceId: request.turnId,
            // Preview is launched by the local configuration UI, so it follows the local file
            // permission. Treating its internal channel name as remote made default Solo unusable.
            fileMutationPolicyMode: resolveFileMutationPolicyMode(),
            harnessEventSink: (type, payload) => harnessEvents.push({ type, payload }),
            finalResponseGuard: (content) => guardTurnResponse(content, [], harnessEvents).content,
            ...(expertCapabilityShadow ? { expertCapabilityShadow } : {}),
            [AGENTIC_RUN_FLAG]: true,
        };
        emit({ type: "status", stage: "thinking" });
        let answering = false;
        const handleAgentEvent = (event) => {
            if (event?.type === "tool_start") {
                answering = false;
                emit({ type: "reset_output" });
                emit({
                    type: "status",
                    stage: event.toolName === VISUAL_UNDERSTANDING_TOOL_NAME ? "visual_understanding" : "using_tool",
                    label: typeof event.toolName === "string" ? event.toolName : undefined,
                });
                return;
            }
            if (event?.type === "text_delta" && typeof event.delta === "string") {
                if (!answering) {
                    answering = true;
                    emit({ type: "status", stage: "answering" });
                }
                emit({ type: "delta", delta: event.delta });
                return;
            }
            if (event?.type === "artifact" && event.payload) {
                emit({ type: "artifact", artifact: event.payload });
            }
        };
        try {
            const rawText = usesActiveRuntime && this.runtime && agentRunId
                ? (await this.runtime.runService.execute(buildPreviewRunSpec({ runId: agentRunId, profile, request }), this.runtime.executor.createExecutor({
                    profile,
                    userMessage,
                    history,
                    sessionId: runSessionId,
                    requestContext: runContext,
                    onContextReady: (context) => { runContext = context; },
                    onEvent: handleAgentEvent,
                }), (result) => ({
                    passed: typeof result.output === "string",
                    summary: typeof result.output === "string"
                        ? "Preview output contract satisfied."
                        : "Preview output must be text.",
                }))).result.output
                : await runWithContext(runContext, () => this.agent.run(userMessage, history, runSessionId, handleAgentEvent));
            const imageTokens = runContext[IMAGE_TOKENS_CTX_KEY] ?? [];
            const expanded = extractImageTokens(rawText ?? "", imageTokens);
            const finalText = [expanded.text, ...expanded.urls].filter(Boolean).join("\n\n").trim();
            const aborted = active.stopRequested;
            const action = !finalText || isNoReplySentinel(finalText) ? "no_reply" : "reply";
            if (!aborted) {
                this.contextManager.recordTurn(this.contextKey(request.profileId, request.conversationId), {
                    id: request.turnId,
                    role: "user",
                    content: modelText || "请查看附件。",
                    timestamp: Date.now(),
                }, action === "reply"
                    ? {
                        id: `preview:${request.turnId}`,
                        role: "assistant",
                        content: finalText,
                        timestamp: Date.now() + 1,
                    }
                    : undefined);
            }
            emit({
                type: "done",
                text: action === "reply" ? finalText : "",
                aborted,
                action,
                traceId: request.turnId,
            });
        }
        catch (error) {
            if (active.stopRequested
                || (error instanceof AgentRunExecutionError && error.code === "cancelled")) {
                emit({
                    type: "done",
                    text: "",
                    aborted: true,
                    action: "no_reply",
                    traceId: request.turnId,
                });
                return;
            }
            throw error;
        }
        finally {
            this.activeRuns.delete(key);
            if (!usesActiveRuntime) {
                unbindSessionProfile(runSessionId);
                unregisterProfile(profileKey);
                this.agent.evictSession?.(runSessionId);
            }
        }
    }
    stop(profileId, conversationId) {
        const active = this.activeRuns.get(this.runKey(profileId, conversationId));
        if (!active)
            return false;
        active.stopRequested = true;
        this.agent.stop?.(active.sessionId);
        if (active.agentRunId && this.runtime) {
            void this.runtime.runService.cancel(active.agentRunId).catch((error) => {
                console.error(`[AgentPreview] Failed to cancel AgentRun ${active.agentRunId}:`, error);
            });
        }
        return true;
    }
    reset(profileId, conversationId) {
        this.stop(profileId, conversationId);
        this.contextStore.delete(this.contextKey(profileId, conversationId));
    }
}
