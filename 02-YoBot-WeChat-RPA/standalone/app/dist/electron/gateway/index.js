import { PENDING_OFFICIAL_EXPERT_CONTINUATION_META_KEY, SessionManager, } from "./session.js";
import { ExpertProcessRecorder } from "./expert_process.js";
import { getContext, runWithContext } from "../utils/context.js";
import { inheritAgenticFlag } from "../agent/profile/agentic_guard.js";
import { LLMManager } from "../agent/llm/manager.js";
import * as crypto from "crypto";
import { extractText } from "../utils/content.js";
import { reportChannelTurn, openChannelTurn, closeChannelTurn } from "./trace_upload.js";
import { resolveMessageSession, resolveRequestedSession } from "./session_key.js";
import { evaluateQuestionQuota, stashReminder, takeReminder, blockMessage } from "./session_quota.js";
import { isSchedulerSession } from "../scheduler/types.js";
import { TurnQueueCoordinator, describeQueuePause, } from "./turn_queue.js";
import { countActiveTools, getOldestActiveTool } from "../agent/pi/active_tool.js";
import { ConfigManager } from "../core/config/manager.js";
import { loadUserInstalledSkill } from "../skills/user_installed_catalog.js";
import { buildModelHistory } from "./model_history.js";
import { createTurnBoundApprovalHandler, getApprovalChallengeStore } from "../agent/harness/approval_receipt.js";
import { legacyLocalScopeResolver, resolveToolPolicyScopeGrant, } from "../agent/harness/tool_scope_grant.js";
import { TaskContractStore } from "../agent/harness/task_contract.js";
import { createTurnApprovalCoordinator, guardTurnResponse, } from "../agent/harness/turn_guard.js";
import { resolveFileMutationPolicyModeForChannel } from "../agent/harness/tool_policy_gateway.js";
import { getInteractionStore } from "../agent/interaction/store.js";
import { toPublicInteraction, } from "../agent/interaction/types.js";
import { EXPERT_WORKER_MAX_CLARIFICATION_ROUNDS, EXPERT_WORKER_CONTINUATION_TTL_MS, expertWorkerDisplayText, expertWorkerResultMetadata, parseSelectedExpertRef, projectExpertWorkerContext, } from "../agent/expert/worker_types.js";
import { EXPERT_TURN_MODES, shouldConsumeExpertClarification, } from "../agent/expert/turn_intent.js";
const MAX_IN_MEMORY_PENDING_EXPERT_TURNS = 256;
function pendingExpertKey(sessionId, subjectId, tenantId) {
    return JSON.stringify([sessionId, subjectId || "anonymous", tenantId || ""]);
}
function pendingExpertSubjectBindingHash(subjectId, tenantId) {
    return crypto.createHash("sha256")
        .update(JSON.stringify([subjectId || "anonymous", tenantId || ""]))
        .digest("hex");
}
function parsePersistedPendingExpertTurn(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return undefined;
    const raw = value;
    const parsedRef = parseSelectedExpertRef({ selectedExpertRef: raw.expertRef });
    const questions = Array.isArray(raw.questions)
        && raw.questions.length === 1
        && typeof raw.questions[0] === "string"
        ? [raw.questions[0]]
        : [];
    const turnMode = typeof raw.turnMode === "string"
        && EXPERT_TURN_MODES.includes(raw.turnMode)
        ? raw.turnMode
        : undefined;
    if (raw.schemaVersion !== 1
        || !parsedRef.present
        || !("ref" in parsedRef)
        || typeof raw.subjectBindingHash !== "string"
        || !/^[a-f0-9]{64}$/.test(raw.subjectBindingHash)
        || typeof raw.objective !== "string"
        || !raw.objective.trim()
        || raw.objective.length > 20_000
        || questions.length !== 1
        || questions[0].length > 1_500
        || !Number.isInteger(raw.expiresAt)
        || Number(raw.expiresAt) <= 0
        || !Number.isInteger(raw.round)
        || Number(raw.round) < 1
        || Number(raw.round) > EXPERT_WORKER_MAX_CLARIFICATION_ROUNDS)
        return undefined;
    return {
        schemaVersion: 1,
        subjectBindingHash: raw.subjectBindingHash,
        expertRef: parsedRef.ref,
        objective: raw.objective,
        questions,
        expiresAt: Number(raw.expiresAt),
        round: Number(raw.round),
        ...(turnMode ? { turnMode } : {}),
    };
}
function buildExpertContinuationObjective(pending, answer) {
    return [
        "[Original objective]",
        pending.objective.slice(0, 6_000),
        "",
        "[Expert clarification questions]",
        pending.questions.join("\n").slice(0, 1_500),
        "",
        "[User clarification]",
        answer.trim().slice(0, 6_000),
        "",
        "Complete the original objective using the clarification above.",
    ].join("\n");
}
export class Gateway {
    adapters = [];
    sessionManager;
    agent;
    turnQueue;
    interactionStore = getInteractionStore();
    unsubscribeInteractionStore;
    sessionMutationTails = new Map();
    toolPolicyScopeResolver;
    expertWorkerProvider;
    pendingExpertTurns = new Map();
    constructor(agent, sessionManager, options = {}) {
        this.agent = agent;
        this.sessionManager = sessionManager || new SessionManager();
        this.toolPolicyScopeResolver = options.toolPolicyScopeResolver || legacyLocalScopeResolver;
        this.turnQueue = new TurnQueueCoordinator({
            execute: (turn, adapter) => this.executeMessage(adapter, turn.message, turn.session),
            resolveAdapter: name => this.adapters.find(adapter => adapter.name === name),
            stopAgent: unifiedSessionId => {
                this.agent.stop(unifiedSessionId);
                this.expertWorkerProvider?.stopByParentSession?.(unifiedSessionId);
            },
            emit: async (adapter, turn, event) => {
                if (!turn || !adapter.sendEvent)
                    return;
                await adapter.sendEvent(event, turn.message.metadata);
            },
        });
        this.unsubscribeInteractionStore = this.interactionStore.subscribe((request) => {
            const needsAutomaticRelease = request.status === "expired"
                || (request.status === "cancelled" && !request.resolution?.clientRequestId);
            if (!needsAutomaticRelease)
                return;
            void this.turnQueue.snapshot(request.sessionId).then((snapshot) => {
                if (snapshot.paused?.reason === "awaiting_interaction" || snapshot.paused?.reason === "recovery_required") {
                    return this.turnQueue.resumeAfterInteraction(request.sessionId, request.turnId);
                }
            }).catch(error => console.error("[Gateway] Failed to release expired interaction", error));
        });
    }
    registerAdapter(adapter) {
        this.adapters.push(adapter);
    }
    /** P1c late binding keeps Gateway construction and all legacy startup ordering unchanged. */
    setExpertWorkerProvider(provider) {
        this.expertWorkerProvider = provider;
    }
    async start() {
        console.log("[Gateway] Starting all adapters...");
        for (const adapter of this.adapters) {
            await adapter.start(async (msg) => {
                await this.handleMessage(adapter, msg);
            }, async (type, payload) => {
                if (type === 'history') {
                    if (adapter.name === 'websocket') {
                        let session = this.sessionManager.getSessionByCompositeId(payload.sessionId);
                        // Fallback: If composite lookup fails and ID looks like a raw UUID (no prefix),
                        // try looking it up under the websocket channel directly.
                        if (!session && payload.sessionId && !payload.sessionId.includes('__')) {
                            // console.log(`[Gateway] Raw UUID detected ${payload.sessionId}, using websocket fallback`);
                            session = this.sessionManager.getSessionData('websocket', payload.sessionId);
                            // Ultimate Fallback: Try fuzzy search if file not found or corrupt
                            if (!session) {
                                console.log(`[Gateway] Raw lookup failed for ${payload.sessionId}, trying fuzzy search in session directory...`);
                                // @ts-ignore - method recently added
                                if (typeof this.sessionManager.findSessionById === 'function') {
                                    // @ts-ignore
                                    session = this.sessionManager.findSessionById(payload.sessionId);
                                }
                            }
                        }
                        if (session) {
                            const firstUserMsg = session.messages.find(m => m.role === 'user');
                            const title = session.metadata?.title ||
                                (firstUserMsg ? extractText(firstUserMsg.content).slice(0, 50) : 'New Chat');
                            console.log(`[Gateway] History loaded: sessionId=${session.id}, messages=${session.messages.length}`);
                            // Normalize ID for websocket adapter to match get_sessions_list behavior
                            const normalizedSession = { ...session, title };
                            if (normalizedSession.id.startsWith('websocket__')) {
                                normalizedSession.id = normalizedSession.id.replace('websocket__', '');
                            }
                            return normalizedSession;
                        }
                        else {
                            console.warn(`[Gateway] History not found: sessionId=${payload.sessionId}`);
                        }
                        return null;
                    }
                    return this.sessionManager.getSession(adapter.name, payload.sessionId);
                }
                if (type === 'get_latest_session') {
                    const sessionId = this.sessionManager.getLatestSessionId(adapter.name);
                    if (sessionId) {
                        return {
                            sessionId,
                            messages: this.sessionManager.getSession(adapter.name, sessionId)
                        };
                    }
                    return { sessionId: null, messages: [] };
                }
                if (type === 'get_sessions_list') {
                    if (adapter.name === 'websocket') {
                        return this.sessionManager.getSessionsList('websocket');
                    }
                    return this.sessionManager.getSessionsList(adapter.name);
                }
                if (type === 'delete_session') {
                    const requested = resolveRequestedSession(adapter.name, payload.sessionId);
                    if (await this.turnQueue.hasWork(requested.unifiedSessionId)) {
                        return {
                            success: false,
                            error: 'SESSION_BUSY',
                            message: '当前会话仍有正在执行或等待的任务，请先停止并清空队列。',
                        };
                    }
                    await this.turnQueue.delete(requested.unifiedSessionId);
                    await this.interactionStore.delete(requested.unifiedSessionId);
                    if (!this.agent.evictSession(requested.unifiedSessionId)) {
                        return {
                            success: false,
                            error: 'SESSION_BUSY',
                            message: '当前会话仍在结束处理中，请稍后重试。',
                        };
                    }
                    this.clearPendingExpertTurnsForSession(requested.unifiedSessionId);
                    if (adapter.name === 'websocket') {
                        if (!payload.sessionId.includes('__')) {
                            this.sessionManager.deleteSession('websocket', payload.sessionId);
                        }
                        else {
                            this.sessionManager.deleteSessionByCompositeId(payload.sessionId);
                        }
                        return { success: true };
                    }
                    this.sessionManager.deleteSession(adapter.name, payload.sessionId);
                    return { success: true };
                }
                if (type === 'get_llm_config') {
                    return LLMManager.getInstance().getConfig();
                }
                if (type === 'set_llm_config') {
                    await LLMManager.getInstance().setConfig(payload);
                    return { success: true };
                }
                if (type === 'set_model') {
                    await LLMManager.getInstance().setModel(payload.modelId);
                    return { success: true };
                }
                if (type === 'stop_generation') {
                    const sessionId = payload.sessionId;
                    console.log(`[Gateway] Received stop_generation request for session ${sessionId}`);
                    // Construct Unified Session ID to match handleMessage logic
                    // PiKernel keys sessions by "channel__id"
                    let targetSessionId = sessionId;
                    // If it's a raw ID (no prefix), prefix with adapter name (e.g. "websocket__uuid")
                    if (targetSessionId && !targetSessionId.includes('__')) {
                        targetSessionId = `${adapter.name}__${targetSessionId}`;
                    }
                    // If it already has a prefix (e.g. "feishu__uuid" sent via websocket masquerading),
                    // use it as is, because that's how it was started.
                    console.log(`[Gateway] Stopping session: ${targetSessionId} (Original: ${sessionId})`);
                    const snapshot = await this.turnQueue.stop(targetSessionId);
                    return { success: true, snapshot };
                }
                if (type === 'queue_get') {
                    const requested = resolveRequestedSession(adapter.name, payload.sessionId);
                    return this.snapshotWithActiveTool(requested.unifiedSessionId);
                }
                if (type === 'queue_cancel') {
                    const requested = resolveRequestedSession(adapter.name, payload.sessionId);
                    return this.turnQueue.cancel(requested.unifiedSessionId, payload.turnId);
                }
                if (type === 'queue_clear') {
                    const requested = resolveRequestedSession(adapter.name, payload.sessionId);
                    return this.turnQueue.clear(requested.unifiedSessionId);
                }
                if (type === 'queue_resume') {
                    const requested = resolveRequestedSession(adapter.name, payload.sessionId);
                    return this.turnQueue.resume(requested.unifiedSessionId);
                }
                if (type === 'official_expert_mode_set') {
                    if (adapter.name !== 'websocket') {
                        return {
                            success: false,
                            error: 'EXPERT_CHANNEL_NOT_ALLOWED',
                            message: '官方专家模式仅支持在主对话中切换。',
                            activeOfficialExpert: undefined,
                        };
                    }
                    const requested = resolveRequestedSession(adapter.name, payload.sessionId);
                    return this.withSessionMutationLock(requested.unifiedSessionId, async () => {
                        const snapshot = await this.turnQueue.snapshot(requested.unifiedSessionId);
                        if (snapshot.active || snapshot.pending.length > 0 || snapshot.paused) {
                            return {
                                success: false,
                                error: 'SESSION_BUSY',
                                message: '当前会话仍有正在执行、排队或暂停的任务，请在任务结束后切换专家。',
                                activeOfficialExpert: undefined,
                            };
                        }
                        const hasSelection = Object.prototype.hasOwnProperty.call(payload, 'selectedExpertRef');
                        if (!hasSelection) {
                            return {
                                success: false,
                                error: 'EXPERT_MODE_SELECTION_REQUIRED',
                                message: '缺少专家模式选择。',
                                activeOfficialExpert: undefined,
                            };
                        }
                        let activeOfficialExpert = null;
                        if (payload.selectedExpertRef !== null) {
                            const selectedMode = parseSelectedExpertRef({
                                selectedExpertRef: payload.selectedExpertRef,
                            });
                            if (!selectedMode.present || 'error' in selectedMode) {
                                return {
                                    success: false,
                                    error: selectedMode.present ? selectedMode.error : 'invalid_selected_expert_ref',
                                    message: '所选专家引用无效，请刷新专家列表后重试。',
                                    activeOfficialExpert: undefined,
                                };
                            }
                            const available = this.expertWorkerProvider?.listAvailable?.().find(candidate => (candidate.definitionId === selectedMode.ref.definitionId
                                && candidate.definitionVersion === selectedMode.ref.definitionVersion
                                && candidate.jobs.some(job => job.id === selectedMode.ref.jobId)));
                            if (!available) {
                                return {
                                    success: false,
                                    error: 'EXPERT_NOT_AVAILABLE',
                                    message: '该专家当前不可用，请刷新专家列表后重试。',
                                    activeOfficialExpert: undefined,
                                };
                            }
                            activeOfficialExpert = {
                                ref: selectedMode.ref,
                                name: available.name,
                            };
                        }
                        try {
                            this.sessionManager.updateSessionMetadata(requested.storageChannel, requested.storageId, {
                                activeOfficialExpert,
                                [PENDING_OFFICIAL_EXPERT_CONTINUATION_META_KEY]: null,
                            });
                        }
                        catch (error) {
                            console.error("[Gateway] Failed to persist Official Expert mode:", error);
                            return {
                                success: false,
                                error: 'SESSION_PERSISTENCE_FAILED',
                                message: '专家模式未能安全保存，请检查磁盘状态后重试。',
                                activeOfficialExpert: undefined,
                            };
                        }
                        const cancelledContinuations = this.clearPendingExpertTurnsForSession(requested.unifiedSessionId);
                        return {
                            success: true,
                            activeOfficialExpert,
                            cancelledContinuations,
                        };
                    });
                }
                if (type === 'interaction_get') {
                    const requested = resolveRequestedSession(adapter.name, payload.sessionId);
                    const interaction = await this.interactionStore.getPending(requested.unifiedSessionId);
                    if (!interaction) {
                        const snapshot = await this.turnQueue.snapshot(requested.unifiedSessionId);
                        if (snapshot.paused?.reason === "awaiting_interaction") {
                            await this.turnQueue.resumeAfterInteraction(requested.unifiedSessionId, snapshot.paused.turnId);
                        }
                    }
                    return { interaction: interaction ? toPublicInteraction(interaction) : null };
                }
                if (type === 'interaction_resolve') {
                    const requested = resolveRequestedSession(adapter.name, payload.sessionId);
                    const result = await this.interactionStore.resolve({
                        sessionId: requested.unifiedSessionId,
                        interactionId: payload.interactionId,
                        version: payload.version,
                        outcome: payload.outcome,
                        selectedOptionIds: payload.selectedOptionIds,
                        customText: payload.customText,
                        clientRequestId: payload.clientRequestId,
                    });
                    if (result.changed) {
                        const continuation = result.request.continuation;
                        const shouldCancelApproval = continuation?.mode === "harness_approval"
                            && (result.request.status !== "submitted"
                                || !result.request.resolution?.selectedOptionIds?.includes("approve"));
                        if (result.request.status === "submitted" || shouldCancelApproval) {
                            const message = this.interactionResponseMessage(result.request, requested.deliveryTarget, adapter.name);
                            await this.withSessionMutationLock(requested.unifiedSessionId, () => this.turnQueue.submit(adapter, message, requested));
                        }
                        await this.turnQueue.resumeAfterInteraction(requested.unifiedSessionId, result.request.turnId);
                    }
                    return { interaction: toPublicInteraction(result.request), changed: result.changed };
                }
                if (type === 'retry_stopped') {
                    const requested = resolveRequestedSession(adapter.name, payload.sessionId);
                    return this.withSessionMutationLock(requested.unifiedSessionId, async () => {
                        const snapshot = await this.turnQueue.snapshot(requested.unifiedSessionId);
                        if (snapshot.active || snapshot.pending.length > 0 || snapshot.paused) {
                            return { success: false, error: 'SESSION_BUSY', snapshot };
                        }
                        const selectedRetry = parseSelectedExpertRef(Object.prototype.hasOwnProperty.call(payload, 'selectedExpertRef')
                            ? { selectedExpertRef: payload.selectedExpertRef }
                            : undefined);
                        if (selectedRetry.present) {
                            if ('error' in selectedRetry) {
                                return { success: false, error: selectedRetry.error, snapshot };
                            }
                            const retryOfTurnId = typeof payload.retryOfTurnId === 'string'
                                ? payload.retryOfTurnId.trim()
                                : '';
                            const original = [...this.sessionManager.getPrimarySession(requested.storageChannel, requested.storageId)].reverse().find(message => (message.role === 'user'
                                && (message.id === retryOfTurnId || message.metadata?.turnId === retryOfTurnId)));
                            const originalRef = parseSelectedExpertRef(original?.metadata);
                            if (!original || !retryOfTurnId || !originalRef.present || 'error' in originalRef
                                || originalRef.ref.definitionId !== selectedRetry.ref.definitionId
                                || originalRef.ref.definitionVersion !== selectedRetry.ref.definitionVersion
                                || originalRef.ref.jobId !== selectedRetry.ref.jobId) {
                                return { success: false, error: 'EXPERT_RETRY_SOURCE_MISSING', snapshot };
                            }
                            const turnId = typeof payload.turnId === 'string' && payload.turnId.trim()
                                ? payload.turnId.trim()
                                : crypto.randomUUID();
                            const retryMessage = {
                                id: turnId,
                                role: 'user',
                                content: original.content,
                                senderId: payload.sessionId,
                                source: adapter.name,
                                metadata: {
                                    chat_id: payload.sessionId,
                                    user_id: 'user_default',
                                    display_text: typeof payload.displayText === 'string'
                                        ? payload.displayText.trim()
                                        : '',
                                    traceId: turnId,
                                    turnId,
                                    retryOfTurnId,
                                    selectedExpertRef: selectedRetry.ref,
                                },
                                timestamp: Date.now(),
                            };
                            const result = await this.turnQueue.submit(adapter, retryMessage, requested);
                            return {
                                success: result.accepted && !result.duplicate,
                                turnId,
                                snapshot: result.snapshot,
                            };
                        }
                        const rewind = await this.agent.rewindLastStoppedTurn(requested.unifiedSessionId);
                        if (!rewind.success || rewind.content === undefined) {
                            return {
                                success: false,
                                error: rewind.error || 'REWIND_FAILED',
                                snapshot,
                            };
                        }
                        await getApprovalChallengeStore().invalidateSessionBranch(requested.localSessionId);
                        TaskContractStore.getInstance().invalidateSessionBranch(requested.localSessionId);
                        const turnId = typeof payload.turnId === 'string' && payload.turnId.trim()
                            ? payload.turnId.trim()
                            : crypto.randomUUID();
                        const displayText = typeof payload.displayText === 'string' && payload.displayText.trim()
                            ? payload.displayText.trim()
                            : rewind.displayText || '';
                        const retryMessage = {
                            id: turnId,
                            role: 'user',
                            content: rewind.content,
                            senderId: payload.sessionId,
                            source: adapter.name,
                            metadata: {
                                chat_id: payload.sessionId,
                                user_id: 'user_default',
                                display_text: displayText,
                                traceId: turnId,
                                turnId,
                                retryOfTurnId: payload.retryOfTurnId,
                                attachedSkill: rewind.attachedSkill,
                            },
                            timestamp: Date.now(),
                        };
                        const result = await this.turnQueue.submit(adapter, retryMessage, requested);
                        return {
                            success: result.accepted && !result.duplicate,
                            turnId,
                            snapshot: result.snapshot,
                        };
                    });
                }
                return null;
            });
        }
        const recovered = await this.turnQueue.recover();
        if (recovered.length > 0) {
            console.warn(`[Gateway] Recovered ${recovered.length} paused turn queue(s).`);
        }
    }
    async stop() {
        this.unsubscribeInteractionStore();
        this.pendingExpertTurns.clear();
        for (const adapter of this.adapters) {
            await adapter.stop();
        }
    }
    sweepPendingExpertTurns(now = Date.now()) {
        for (const [key, pending] of this.pendingExpertTurns) {
            if (pending.expiresAt <= now)
                this.pendingExpertTurns.delete(key);
        }
        while (this.pendingExpertTurns.size > MAX_IN_MEMORY_PENDING_EXPERT_TURNS) {
            const oldest = this.pendingExpertTurns.keys().next().value;
            if (oldest === undefined)
                break;
            this.pendingExpertTurns.delete(oldest);
        }
    }
    rememberPendingExpertTurn(key, pending) {
        this.sweepPendingExpertTurns();
        this.pendingExpertTurns.delete(key);
        this.pendingExpertTurns.set(key, pending);
        this.sweepPendingExpertTurns();
    }
    persistPendingExpertTurn(storageChannel, storageId, key, subjectId, tenantId, pending) {
        const persisted = {
            schemaVersion: 1,
            subjectBindingHash: pendingExpertSubjectBindingHash(subjectId, tenantId),
            ...pending,
        };
        this.sessionManager.updateSessionMetadata(storageChannel, storageId, {
            [PENDING_OFFICIAL_EXPERT_CONTINUATION_META_KEY]: persisted,
        });
        this.rememberPendingExpertTurn(key, pending);
    }
    clearPendingExpertTurn(storageChannel, storageId, key) {
        this.sessionManager.updateSessionMetadata(storageChannel, storageId, {
            [PENDING_OFFICIAL_EXPERT_CONTINUATION_META_KEY]: null,
        });
        this.pendingExpertTurns.delete(key);
    }
    peekPendingExpertTurn(storageChannel, storageId, sessionId, subjectId, tenantId) {
        this.sweepPendingExpertTurns();
        const key = pendingExpertKey(sessionId, subjectId, tenantId);
        const inMemory = this.pendingExpertTurns.get(key);
        if (inMemory && inMemory.expiresAt > Date.now())
            return inMemory;
        this.pendingExpertTurns.delete(key);
        // Some embedded/legacy Gateway hosts provide the pre-Expert SessionManager surface.
        // Missing private coordination storage must degrade to "no continuation" and must
        // never break an ordinary main-Agent turn.
        const privateMetadata = this.sessionManager.getPrivateSessionMetadata?.(storageChannel, storageId) ?? {};
        const raw = privateMetadata[PENDING_OFFICIAL_EXPERT_CONTINUATION_META_KEY];
        if (raw === undefined || raw === null)
            return undefined;
        const pending = parsePersistedPendingExpertTurn(raw);
        if (!pending || pending.expiresAt <= Date.now()) {
            this.clearPendingExpertTurn(storageChannel, storageId, key);
            return undefined;
        }
        if (pending.subjectBindingHash !== pendingExpertSubjectBindingHash(subjectId, tenantId)) {
            return undefined;
        }
        const transient = {
            expertRef: pending.expertRef,
            objective: pending.objective,
            questions: pending.questions,
            expiresAt: pending.expiresAt,
            round: pending.round,
            ...(pending.turnMode ? { turnMode: pending.turnMode } : {}),
        };
        this.rememberPendingExpertTurn(key, transient);
        return transient;
    }
    clearPendingExpertTurnsForSession(sessionId) {
        let cleared = 0;
        for (const key of this.pendingExpertTurns.keys()) {
            try {
                const parsed = JSON.parse(key);
                if (Array.isArray(parsed) && parsed[0] === sessionId) {
                    this.pendingExpertTurns.delete(key);
                    cleared += 1;
                }
            }
            catch {
                // Ignore malformed legacy keys; only pendingExpertKey() output is expected here.
            }
        }
        return cleared;
    }
    interactionResponseMessage(request, deliveryTarget, source = "websocket") {
        const selectedIds = request.resolution?.selectedOptionIds || [];
        const selectedOptions = request.question.options.filter(option => selectedIds.includes(option.id));
        const continuation = request.continuation;
        const isApproval = continuation?.mode === "harness_approval";
        const approved = request.status === "submitted" && selectedIds.includes("approve");
        const customText = request.resolution?.customText?.trim();
        const displayParts = selectedOptions.map(option => option.label);
        if (customText)
            displayParts.push(customText);
        const displayText = isApproval
            ? (approved ? "已确认继续" : "已取消操作")
            : `已选择：${displayParts.join("；")}`;
        const content = isApproval
            ? (approved ? "确认" : "取消")
            : [
                `<interaction_response id=${JSON.stringify(request.id)}>`,
                `问题：${request.question.prompt}`,
                ...(selectedOptions.length > 0
                    ? [`选择：${selectedOptions.map(option => `${option.label} (${option.value})`).join("；")}`]
                    : []),
                ...(customText ? [`补充：${customText}`] : []),
                "请基于以上用户确认继续之前暂停的工作。",
                "</interaction_response>",
            ].join("\n");
        const turnId = request.resolution?.clientRequestId || crypto.randomUUID();
        return {
            id: turnId,
            role: "user",
            content,
            senderId: continuation?.userId || "user_default",
            source,
            metadata: {
                chat_id: deliveryTarget,
                user_id: continuation?.userId || "user_default",
                display_text: displayText,
                traceId: turnId,
                turnId,
                interactionResponse: {
                    interactionId: request.id,
                    outcome: request.status,
                    selectedOptionIds: selectedIds,
                },
            },
            timestamp: Date.now(),
        };
    }
    interactionResolutionFromText(request, rawText) {
        const text = rawText.trim();
        if (!text)
            return undefined;
        if (/^(取消|放弃|cancel)$/i.test(text))
            return { outcome: "cancelled" };
        if (request.kind === "approval") {
            if (/^(确认|继续|同意|approve)$/i.test(text)) {
                return { outcome: "submitted", selectedOptionIds: ["approve"] };
            }
            return undefined;
        }
        const tokens = request.question.selection === "multiple"
            ? text.split(/[\s,，、]+/).filter(Boolean)
            : [text];
        const selectedOptionIds = [];
        for (const token of tokens) {
            const numericIndex = /^\d+$/.test(token) ? Number(token) - 1 : -1;
            const option = numericIndex >= 0
                ? request.question.options[numericIndex]
                : request.question.options.find(item => (item.id.toLowerCase() === token.toLowerCase()
                    || item.value.toLowerCase() === token.toLowerCase()
                    || item.label === token));
            if (option)
                selectedOptionIds.push(option.id);
        }
        if (selectedOptionIds.length > 0) {
            return { outcome: "submitted", selectedOptionIds: [...new Set(selectedOptionIds)] };
        }
        if (request.question.customInput?.enabled) {
            return { outcome: "submitted", customText: text };
        }
        return undefined;
    }
    interactionFallbackText(request) {
        const options = request.question.options.map((option, index) => `${index + 1}. ${option.label}`);
        const custom = request.question.customInput?.enabled ? ["也可以直接回复补充内容。"] : [];
        return [
            request.question.prompt,
            ...options,
            ...custom,
            "回复序号或选项文字；回复“取消”可退出。",
        ].join("\n");
    }
    /**
     * TaskGroup/AgentRun 必须提供 lifecycle binding；Gateway 不直接向父聊天交付结果。
     */
    isTaskBound(b) {
        return !!b;
    }
    buildBackgroundTaskInput(task, contextMessages) {
        if (!Array.isArray(contextMessages) || contextMessages.length === 0) {
            return task;
        }
        const normalizedContext = contextMessages
            .map((message, index) => {
            const role = message?.role || "user";
            const text = extractText(message?.content || "");
            if (!text || !text.trim()) {
                return null;
            }
            const snippet = text.trim().slice(0, 800);
            return `[${index + 1}] ${role}: ${snippet}`;
        })
            .filter((line) => Boolean(line));
        if (normalizedContext.length === 0) {
            return task;
        }
        return `父会话上下文（按时间顺序）：\n${normalizedContext.join("\n\n")}\n\n当前任务：\n${task}`;
    }
    /**
     * Executes one TaskGroup-bound background session independently of a channel adapter.
     */
    async runBackgroundSession(sessionId, task, parentSessionId, contextMessages = [], timeoutMs, taskBinding) {
        const parentContext = getContext();
        // Sub-sessions are stored under 'system' channel by default in SessionManager
        // So we need to ensure the ID passed to Agent (PiKernel) matches the filename (system__sub_...)
        const unifiedSessionId = sessionId.startsWith('system__') ? sessionId : `system__${sessionId}`;
        const taskBound = this.isTaskBound(taskBinding);
        if (!taskBound) {
            throw new Error("Background sessions must be owned by TaskGroup/AgentRun lifecycle binding.");
        }
        console.log(`[Gateway] Starting background session: ${unifiedSessionId} (Parent: ${parentSessionId}, Timeout: ${timeoutMs}ms, TaskBound: ${taskBound})`);
        // Update status to running
        await this.sessionManager.updateSessionStatus(unifiedSessionId, 'running');
        // Setup timeout handler
        let timeoutTimer = null;
        if (timeoutMs && timeoutMs > 0) {
            timeoutTimer = setTimeout(async () => {
                console.warn(`[Gateway] Session ${unifiedSessionId} timed out after ${timeoutMs}ms`);
                this.agent.stop(unifiedSessionId);
                await this.sessionManager.updateSessionStatus(unifiedSessionId, 'timed_out');
                try {
                    await taskBinding.onTimeout?.();
                }
                catch (e) {
                    console.error('[Gateway] taskBinding.onTimeout error', e);
                }
            }, timeoutMs);
        }
        // Execute in background (fire and forget from caller's perspective, but we log errors)
        (async () => {
            try {
                // We use a mock "system" channel context
                // agenticRun 必须透传:后台子会话的 profile 是 allowedSkills=undefined 的
                // subagent(白名单不继承),运行时守卫是它唯一的 RPA 递归防线。
                const harnessEvents = [];
                const context = inheritAgenticFlag({
                    channel: 'system',
                    sessionId: unifiedSessionId,
                    userId: parentContext?.userId || 'system',
                    traceId: crypto.randomUUID(),
                    sourceChannel: parentContext?.channel,
                    sourceSessionId: parentContext?.sessionId,
                    toolPolicyScopes: parentContext?.toolPolicyScopes,
                    toolPolicyScopeSource: parentContext?.toolPolicyScopeSource,
                    fileMutationPolicyMode: parentContext?.fileMutationPolicyMode
                        ?? resolveFileMutationPolicyModeForChannel(parentContext?.channel || 'system'),
                    harnessEventSink: (type, payload) => {
                        harnessEvents.push({ type, payload });
                    },
                    finalResponseGuard: (content) => guardTurnResponse(content, [], harnessEvents).content,
                });
                await runWithContext(context, async () => {
                    const runInput = this.buildBackgroundTaskInput(task, contextMessages);
                    const responseText = await this.agent.run(runInput, contextMessages, // Inject context messages as history
                    unifiedSessionId, async (event) => {
                        if (taskBinding.onEvent) {
                            try {
                                await taskBinding.onEvent(event);
                            }
                            catch (e) {
                                console.error('[Gateway] taskBinding.onEvent error', e);
                            }
                            return;
                        }
                        // A binding may omit event streaming; retain compact operational logs.
                        if (event.type === 'think') {
                            if (event.description) {
                                console.log(`[Background ${unifiedSessionId}] Think: ${event.description}`);
                            }
                        }
                        else if (event.type === 'tool_start') {
                            console.log(`[Background ${unifiedSessionId}] Tool: ${event.toolName}`);
                        }
                    });
                    // Clear timeout if completed successfully
                    if (timeoutTimer)
                        clearTimeout(timeoutTimer);
                    console.log(`[Gateway] Background session finished. Response: ${responseText.slice(0, 50)}...`);
                    await this.sessionManager.updateSessionStatus(unifiedSessionId, 'completed');
                    try {
                        await taskBinding.onComplete?.(responseText);
                    }
                    catch (e) {
                        console.error('[Gateway] taskBinding.onComplete error', e);
                    }
                });
            }
            catch (error) {
                // Clear timeout if failed
                if (timeoutTimer)
                    clearTimeout(timeoutTimer);
                console.error(`[Gateway] Background session failed:`, error);
                // If not aborted (timeout), report error
                if (!String(error).includes('AbortError')) {
                    await this.sessionManager.updateSessionStatus(unifiedSessionId, 'failed');
                    try {
                        await taskBinding.onError?.(error);
                    }
                    catch (e) {
                        console.error('[Gateway] taskBinding.onError error', e);
                    }
                }
            }
        })();
    }
    /**
     * Stops a running TaskGroup/AgentRun execution session.
     */
    stopSession(sessionId) {
        // Ensure unified ID
        const unifiedSessionId = sessionId.startsWith('system__') ? sessionId : `system__${sessionId}`;
        console.log(`[Gateway] Stopping session via API: ${unifiedSessionId}`);
        this.agent.stop(unifiedSessionId);
        // Update status
        // We use fire-and-forget for status update
        this.sessionManager.updateSessionStatus(unifiedSessionId, 'stopped').catch(err => {
            console.error(`[Gateway] Failed to update session status to stopped: ${err}`);
        });
    }
    async handleMessage(adapter, msg) {
        const attachedSkillId = typeof msg.metadata?.attachedSkill?.id === "string"
            ? msg.metadata.attachedSkill.id.trim()
            : "";
        if (attachedSkillId) {
            const disabled = ConfigManager.getInstance().getConfig().disabledSkills || [];
            const installed = loadUserInstalledSkill(attachedSkillId, process.env.USER_DATA_PATH, disabled);
            msg.metadata = {
                ...(msg.metadata || {}),
                attachedSkill: installed
                    ? {
                        id: installed.id,
                        name: installed.name,
                        version: installed.version,
                        unavailable: installed.disabled,
                        unavailableReason: installed.disabled ? "技能已停用" : undefined,
                    }
                    : {
                        id: attachedSkillId,
                        name: attachedSkillId,
                        unavailable: true,
                        unavailableReason: "技能未安装或文件不可读取",
                    },
            };
        }
        const session = resolveMessageSession(adapter.name, msg);
        // A pending interaction owns the next input in this session. Rich clients render it as a
        // composer card; text-only channels can answer with a number/label or cancel explicitly.
        const pendingInteraction = await this.interactionStore.getPending(session.unifiedSessionId);
        if (pendingInteraction) {
            const parsedResolution = this.interactionResolutionFromText(pendingInteraction, extractText(msg.content));
            if (!parsedResolution) {
                await adapter.send({
                    id: crypto.randomUUID(),
                    role: "system",
                    content: this.interactionFallbackText(pendingInteraction),
                    senderId: "system",
                    source: msg.source,
                    metadata: { ...msg.metadata, chat_id: session.deliveryTarget },
                    timestamp: Date.now(),
                });
                return;
            }
            const resolvedInteraction = await this.interactionStore.resolve({
                sessionId: session.unifiedSessionId,
                interactionId: pendingInteraction.id,
                version: pendingInteraction.version,
                clientRequestId: String(msg.id),
                ...parsedResolution,
            });
            if (parsedResolution.outcome === "submitted" || pendingInteraction.kind === "approval") {
                const resumedMessage = this.interactionResponseMessage(resolvedInteraction.request, session.deliveryTarget, msg.source);
                resumedMessage.id = msg.id;
                resumedMessage.timestamp = msg.timestamp;
                resumedMessage.metadata = {
                    ...resumedMessage.metadata,
                    traceId: msg.metadata?.traceId || msg.id,
                    turnId: msg.metadata?.turnId || msg.id,
                    display_text: extractText(msg.content),
                };
                await this.withSessionMutationLock(session.unifiedSessionId, () => this.turnQueue.submit(adapter, resumedMessage, session));
            }
            else {
                await adapter.send({
                    id: crypto.randomUUID(),
                    role: "system",
                    content: "已取消当前操作。",
                    senderId: "system",
                    source: msg.source,
                    metadata: { ...msg.metadata, chat_id: session.deliveryTarget },
                    timestamp: Date.now(),
                });
            }
            await this.turnQueue.resumeAfterInteraction(session.unifiedSessionId, resolvedInteraction.request.turnId);
            return;
        }
        // 提问配额：每 100 个问题提醒一次、500 个封顶（见 session_quota.ts 的取舍说明）。
        //
        // 只对桌面聊天生效。飞书 / 微信 iLink 的"会话"就是那个聊天窗口，用户没有
        // "新建会话"这个动作，把他挡在门外等于让 agent 在那个群里彻底失联。
        const quotaApplies = adapter.name === "websocket" && !isSchedulerSession(session.unifiedSessionId);
        if (quotaApplies) {
            // 先判定再落盘：被拒的提问不该计数，否则用户每撞一次墙计数就虚高一次。
            const count = this.sessionManager.getQuestionCount(session.storageChannel, session.storageId) + 1;
            const decision = evaluateQuestionQuota(count);
            if (decision.action === "block") {
                await this.emitSessionQuotaCard(adapter, msg, session, {
                    kind: "blocked",
                    count: decision.count,
                    limit: decision.limit,
                });
                return;
            }
            this.sessionManager.incrementQuestionCount(session.storageChannel, session.storageId);
            if (decision.action === "allow_with_reminder") {
                // 现在就插卡片会夹在提问和回答中间，像打断了对话。
                // 存下来，等这一轮答完再插（见 executeMessage 收尾处）。
                stashReminder(session.unifiedSessionId, decision.reminder);
            }
        }
        const result = await this.withSessionMutationLock(session.unifiedSessionId, () => this.turnQueue.submit(adapter, msg, session));
        // 只有依赖文本反馈的渠道才需要这条提示。桌面 UI 走 TurnQueuePanel，
        // notifyQueued 的有无正好是"该渠道是否只能靠文字感知队列"的现成判据。
        const pauseNotice = adapter.notifyQueued ? describeQueuePause(result.snapshot) : "";
        const sendSystemNotice = (content) => adapter.send({
            id: crypto.randomUUID(),
            role: "system",
            content,
            senderId: "system",
            source: msg.source,
            metadata: msg.metadata,
            timestamp: Date.now(),
        });
        if (!result.accepted) {
            // 队列满 + 已暂停时，"请等待部分任务完成"是死路：没有任务会完成。
            await sendSystemNotice(pauseNotice
                ? `等待队列已满，且${pauseNotice}`
                : "等待队列已满，请等待部分任务完成或先清理队列。");
            return;
        }
        if (pauseNotice && !result.duplicate) {
            // 暂停态下绝不能发 notifyQueued 的"前面还有 N 项"：pump 不会启动，
            // 那个位次永远不会前进。恢复态（上次进程被强杀）下 state.active 是
            // 一个不属于任何活进程的僵尸 turn，用户会一直看到"正在执行"。
            await sendSystemNotice(`消息已收下，但${pauseNotice}`);
            return;
        }
        if (!result.duplicate && result.queuePosition > 0 && adapter.notifyQueued) {
            await adapter.notifyQueued(msg, result.queuePosition);
        }
    }
    /**
     * 往会话里插一张「提问配额」卡片。
     *
     * 落**隔离存储**：这是给用户看的 UI 提示，不该进模型的对话上下文——
     * 让模型看见"你已经问了 100 个问题"只会平添噪音，甚至让它自己开始
     * 劝用户换会话。同样的理由，定时任务产出也走这条路（见 server.ts）。
     */
    async emitSessionQuotaCard(adapter, msg, session, quota) {
        const card = {
            id: crypto.randomUUID(),
            role: "system",
            content: quota.kind === "blocked" ? blockMessage(quota.limit) : "",
            senderId: "system",
            source: msg.source,
            metadata: {
                chat_id: session.deliveryTarget,
                // 前端据此渲染成提示控件而不是普通气泡。
                sessionQuota: quota,
            },
            timestamp: Date.now(),
        };
        try {
            this.sessionManager.addIsolatedMessage(session.storageChannel, session.storageId, card);
        }
        catch (e) {
            console.error(`[Gateway] Failed to persist quota card for ${session.unifiedSessionId}`, e);
        }
        try {
            await adapter.send(card);
        }
        catch (e) {
            console.error(`[Gateway] Failed to deliver quota card for ${session.unifiedSessionId}`, e);
        }
        // 拦下的提问不会进队列，也就不会有 turn_started / turn_completed。
        // 而前端的"正在输入"是**跟着队列快照走**的：发出提问时它已经转起来了，
        // 没有终结事件就会一直转下去——用户会以为 agent 卡死了，
        // 这恰恰是我们这轮在修的那个体感问题。补一次快照把它关掉。
        if (quota.kind === "blocked" && adapter.sendEvent) {
            try {
                await adapter.sendEvent({ type: "queue_snapshot", payload: { snapshot: await this.turnQueue.snapshot(session.unifiedSessionId) } }, msg.metadata);
            }
            catch (e) {
                console.error(`[Gateway] Failed to sync queue snapshot after quota block for ${session.unifiedSessionId}`, e);
            }
        }
    }
    /**
     * 队列快照 + "当前卡在哪个工具上"。
     *
     * 队列层不感知工具，工具层不感知队列，两边在这里合流。这是回答"到底是什么在
     * 长时间阻塞"的唯一数据源 —— 尤其对渠道用户：ilink adapter 没实现 sendEvent，
     * agent 事件流到不了他们手里，只能靠 /queue 主动拉。
     */
    async snapshotWithActiveTool(unifiedSessionId) {
        const snapshot = await this.turnQueue.snapshot(unifiedSessionId);
        const oldest = getOldestActiveTool(unifiedSessionId);
        if (!oldest)
            return snapshot;
        return {
            ...snapshot,
            activeTool: {
                name: oldest.name,
                startedAt: oldest.startedAt,
                concurrent: countActiveTools(unifiedSessionId),
            },
        };
    }
    async withSessionMutationLock(sessionId, operation) {
        const previous = this.sessionMutationTails.get(sessionId) || Promise.resolve();
        let release;
        const current = new Promise(resolve => { release = resolve; });
        const tail = previous.catch(() => undefined).then(() => current);
        this.sessionMutationTails.set(sessionId, tail);
        await previous.catch(() => undefined);
        try {
            return await operation();
        }
        finally {
            release();
            if (this.sessionMutationTails.get(sessionId) === tail) {
                this.sessionMutationTails.delete(sessionId);
            }
        }
    }
    async executeMessage(adapter, msg, resolved) {
        const { channel, localSessionId: sessionId, storageChannel, storageId, unifiedSessionId, } = resolved;
        // 本轮工具产出的产物。挂到回复消息上随会话持久化，历史回看时仍能渲染。
        const runArtifacts = [];
        const expertProcessRecorder = new ExpertProcessRecorder();
        // 工具通过 ToolContext.onEvent 上报事件（如 artifact）。放进请求上下文，
        // 让 pi adapter 能取到真正的事件汇聚点 —— pi 内核给工具的第 4 个参数是它自己的
        // partialResult 回调，不是这条通道。
        const emitAgentEvent = async (event) => {
            expertProcessRecorder.record(event);
            const correlatedEvent = {
                ...event,
                turnId: msg.metadata?.turnId || event.turnId,
            };
            if (event.type === 'artifact' && event.payload) {
                runArtifacts.push(event.payload);
            }
            if (adapter.sendEvent) {
                await adapter.sendEvent(correlatedEvent, msg.metadata);
            }
        };
        const approvalTraceId = msg.metadata?.traceId || crypto.randomUUID();
        const approvalUserId = msg.metadata?.user_id || msg.senderId;
        const approvalUserText = extractText(msg.content);
        const scopeBinding = {
            channel,
            sessionId,
            userId: approvalUserId,
            tenantId: typeof msg.metadata?.tenant_id === "string"
                ? msg.metadata.tenant_id
                : undefined,
        };
        const scopeGrant = await resolveToolPolicyScopeGrant(this.toolPolicyScopeResolver, scopeBinding);
        const harnessEvents = [];
        const approvalBinding = {
            channel,
            sessionId,
            userId: approvalUserId,
            traceId: approvalTraceId,
            userText: approvalUserText,
        };
        const approvalStore = getApprovalChallengeStore();
        // “取消” must revoke the pending operation even when the model correctly avoids another
        // tool call. Approval still flows through the tool boundary so the original args are used.
        await approvalStore.cancelPending(approvalBinding);
        const approvalCoordinator = createTurnApprovalCoordinator(createTurnBoundApprovalHandler(approvalBinding, approvalStore));
        const context = {
            channel: channel,
            sessionId: sessionId,
            userId: approvalUserId,
            tenantId: scopeBinding.tenantId,
            traceId: approvalTraceId,
            intent: msg.metadata?.intent,
            // scheduler 的写操作在工具层会核对这一条**真实用户原文**。模型的解释或
            // 自造参数不能替代用户授权，因而诊断“为什么没跑”不会再触发删建任务。
            userText: approvalUserText,
            toolPolicyScopes: scopeGrant?.scopes || [],
            toolPolicyScopeSource: scopeGrant?.source || "none",
            // Selected/autonomous Workers begin with the minimal parent delegation policy. More
            // sensitive capabilities require future authenticated, resource-bound host grants.
            expertWorkerCapabilities: ["web.public.read"],
            expertWorkerWorkspaceRoots: [],
            expertWorkerKnowledgeNamespaces: [],
            expertWorkerDeniedTools: [],
            fileMutationPolicyMode: resolveFileMutationPolicyModeForChannel(channel),
            toolApprovalHandler: approvalCoordinator.handler,
            harnessEventSink: (type, payload) => {
                harnessEvents.push({ type, payload });
            },
            finalResponseGuard: (content) => guardTurnResponse(content, approvalCoordinator.pending(), harnessEvents).content,
            attachedSkill: (() => {
                const reference = msg.metadata?.attachedSkill;
                if (!reference?.id)
                    return undefined;
                const disabled = ConfigManager.getInstance().getConfig().disabledSkills || [];
                const installed = loadUserInstalledSkill(reference.id, process.env.USER_DATA_PATH, disabled);
                if (!installed || installed.disabled) {
                    return {
                        id: reference.id,
                        name: reference.name || reference.id,
                        unavailable: true,
                        unavailableReason: installed?.disabled
                            ? "技能已停用"
                            : "技能已卸载或 SKILL.md 无法读取",
                    };
                }
                return {
                    id: installed.id,
                    name: installed.name,
                    version: installed.version,
                    baseDir: installed.baseDir,
                    content: installed.content,
                };
            })(),
            onEvent: emitAgentEvent
        };
        // 本轮结局，供下面 finally 里的 trace 上报打标用。
        // 留 undefined 表示「异常逃逸出去了」——那比 "failed" 更严重，两者要分开。
        let turnStatus;
        // 落一条本地账本。渠道任务同样会遇到「进程崩了，这一轮永远没有收尾」——
        // 届时下面的 finally 根本不会执行，日志只留在本地、线上一条记录都没有。
        // 账本让下次启动能把它捞回来。websocket 那条由渲染进程负责，不在这里重复登记。
        if (adapter.name !== 'websocket') {
            // label 只在崩溃补报时用来建行——否则补出来的记录是一条
            // 「[未收尾的轮次]」，翻到它完全不知道是哪个任务。
            openChannelTurn(msg.metadata?.traceId, unifiedSessionId, adapter.name, extractText(msg.content));
        }
        try {
            return await runWithContext(context, async () => {
                console.log(`[Gateway] Received from ${adapter.name}: ${extractText(msg.content)}`);
                // 1. Get History
                // PiKernel manages its own history, so we don't need to pass it or save it here.
                /* DISABLED: PiKernel handles persistence. We don't want to duplicate writes.
                try {
                    // Add user message to history
                    this.sessionManager.addMessage(storageChannel, storageId, msg);
                } catch (e) {
                    console.error(`[Gateway] Failed to save message to session:`, e);
                }
                */
                const history = this.sessionManager.getPrimarySession(storageChannel, storageId);
                const historyForAgent = buildModelHistory(history, msg, Boolean(msg.metadata?.retryOfTurnId));
                try {
                    const selected = parseSelectedExpertRef(msg.metadata);
                    const pendingKey = pendingExpertKey(unifiedSessionId, approvalUserId, scopeBinding.tenantId);
                    const pendingCandidate = selected.present
                        ? undefined
                        : this.peekPendingExpertTurn(storageChannel, storageId, unifiedSessionId, approvalUserId, scopeBinding.tenantId);
                    const pendingExpert = pendingCandidate
                        && shouldConsumeExpertClarification(extractText(msg.content))
                        ? pendingCandidate
                        : undefined;
                    // The UI intentionally omits selectedExpertRef while a clarification is pending.
                    // If the next message is clearly a new request, keep the active Expert but do not
                    // splice that request into the stale objective/questions.
                    const resumedExpertRef = pendingCandidate && !pendingExpert
                        ? pendingCandidate.expertRef
                        : undefined;
                    const expertRouted = selected.present || Boolean(pendingExpert) || Boolean(resumedExpertRef);
                    let expertResult;
                    let pendingExpertToCommit;
                    let newlyPersistedPendingExpert = false;
                    let continuationNotRetained = false;
                    let responseText;
                    if (expertRouted) {
                        if (selected.present && adapter.name !== "websocket") {
                            const rejectedRef = "ref" in selected ? selected.ref : undefined;
                            expertResult = {
                                status: "blocked",
                                definitionId: rejectedRef?.definitionId ?? "unavailable",
                                definitionVersion: rejectedRef?.definitionVersion ?? "unavailable",
                                ...(rejectedRef?.jobId ? { jobId: rejectedRef.jobId } : {}),
                                code: "expert_channel_not_allowed",
                                message: "官方专家首版仅支持在主对话中使用。",
                            };
                        }
                        else if ("error" in selected) {
                            expertResult = {
                                status: "blocked",
                                definitionId: "invalid",
                                definitionVersion: "invalid",
                                code: selected.error,
                                message: "所选专家引用格式无效，请刷新专家列表后重试。",
                            };
                        }
                        else if (!this.expertWorkerProvider) {
                            const expertRef = pendingExpert?.expertRef
                                ?? resumedExpertRef
                                ?? (selected.present && "ref" in selected ? selected.ref : undefined);
                            expertResult = {
                                status: "blocked",
                                definitionId: expertRef?.definitionId ?? "unavailable",
                                definitionVersion: expertRef?.definitionVersion ?? "unavailable",
                                ...(expertRef?.jobId ? { jobId: expertRef.jobId } : {}),
                                code: "expert_worker_unavailable",
                                message: "专家 Worker 当前未启用或启动失败。",
                            };
                        }
                        else {
                            const expertRef = pendingExpert?.expertRef
                                ?? resumedExpertRef
                                ?? (selected.present && "ref" in selected ? selected.ref : undefined);
                            if (!expertRef)
                                throw new Error("Expert route invariant violated: missing Expert reference.");
                            const availableExpert = this.expertWorkerProvider.listAvailable?.().find(candidate => (candidate.definitionId === expertRef.definitionId
                                && candidate.definitionVersion === expertRef.definitionVersion));
                            const displayJobId = expertRef.jobId || availableExpert?.jobs[0]?.id;
                            if (availableExpert && displayJobId) {
                                const trustedActiveExpert = {
                                    ref: {
                                        definitionId: expertRef.definitionId,
                                        definitionVersion: expertRef.definitionVersion,
                                        jobId: displayJobId,
                                    },
                                    name: availableExpert.name,
                                };
                                msg.metadata = {
                                    ...(msg.metadata || {}),
                                    officialExpert: trustedActiveExpert,
                                };
                                this.sessionManager.updateSessionMetadata(storageChannel, storageId, {
                                    activeOfficialExpert: trustedActiveExpert,
                                    ...(!pendingExpert
                                        ? { [PENDING_OFFICIAL_EXPERT_CONTINUATION_META_KEY]: null }
                                        : {}),
                                });
                                if (!pendingExpert)
                                    this.pendingExpertTurns.delete(pendingKey);
                            }
                            console.log(`[Gateway] Deterministic Expert route ${expertRef.definitionId}@${expertRef.definitionVersion} `
                                + `for session ${unifiedSessionId}.`);
                            const traceId = String(msg.metadata?.traceId || msg.id);
                            const authority = this.expertWorkerProvider.issueAuthority({
                                parentSessionId: unifiedSessionId,
                                traceId,
                                channel,
                                subjectId: approvalUserId || "anonymous",
                                ...(scopeBinding.tenantId ? { tenantId: scopeBinding.tenantId } : {}),
                                capabilities: context.expertWorkerCapabilities,
                                resourceScopes: scopeGrant?.scopes ?? [],
                                workspaceRoots: context.expertWorkerWorkspaceRoots,
                                knowledgeNamespaces: context.expertWorkerKnowledgeNamespaces,
                                deniedTools: context.expertWorkerDeniedTools,
                            });
                            expertResult = await this.expertWorkerProvider.invoke({
                                expertRef,
                                objective: pendingExpert
                                    ? buildExpertContinuationObjective(pendingExpert, extractText(msg.content))
                                    : extractText(msg.content),
                                projectedContext: projectExpertWorkerContext(historyForAgent),
                                invocation: pendingExpert ? "continuation" : "selected",
                                ...(pendingExpert?.turnMode ? { turnModeHint: pendingExpert.turnMode } : {}),
                                parentSessionId: unifiedSessionId,
                                traceId,
                                parentDepth: 0,
                                authority,
                                onEvent: emitAgentEvent,
                            });
                            if (expertResult.status === "needs_input" && expertResult.continuation) {
                                const nextRound = (pendingExpert?.round ?? 0) + 1;
                                const now = Date.now();
                                if (nextRound <= EXPERT_WORKER_MAX_CLARIFICATION_ROUNDS
                                    && expertResult.continuation.expiresAt > now
                                    && expertResult.continuation.expiresAt <= now + EXPERT_WORKER_CONTINUATION_TTL_MS + 30_000
                                    && expertResult.continuation.objective.length <= 20_000
                                    && expertResult.continuation.questions.length <= 1) {
                                    pendingExpertToCommit = {
                                        expertRef,
                                        objective: expertResult.continuation.objective,
                                        questions: expertResult.continuation.questions,
                                        expiresAt: expertResult.continuation.expiresAt,
                                        round: nextRound,
                                        ...(expertResult.continuation.turnMode
                                            ? { turnMode: expertResult.continuation.turnMode }
                                            : {}),
                                    };
                                    try {
                                        this.persistPendingExpertTurn(storageChannel, storageId, pendingKey, approvalUserId, scopeBinding.tenantId, pendingExpertToCommit);
                                        newlyPersistedPendingExpert = !pendingExpert;
                                    }
                                    catch (error) {
                                        pendingExpertToCommit = undefined;
                                        continuationNotRetained = true;
                                        console.error("[Gateway] Failed to persist Expert continuation:", error);
                                    }
                                }
                                else {
                                    continuationNotRetained = true;
                                }
                            }
                        }
                        responseText = expertWorkerDisplayText(expertResult);
                        if (continuationNotRetained) {
                            responseText += "\n\n自动补充已达到轮次或时效上限，请重新选择专家并一次性提供完整信息。";
                        }
                        console.log(`[Gateway] Expert route finished with status=${expertResult.status}.`);
                    }
                    else {
                        console.log(`[Gateway] Invoking Agent run for session ${unifiedSessionId} (Channel: ${storageChannel}, ID: ${storageId})...`);
                        responseText = await this.agent.run(msg.content, historyForAgent, unifiedSessionId, // Use Unified ID
                        emitAgentEvent);
                        console.log(`[Gateway] Agent run finished. Response length: ${responseText.length}`);
                    }
                    const turnStatus = expertResult
                        && (expertResult.status === "blocked" || expertResult.status === "failed")
                        ? "failed"
                        : "completed";
                    let finalContent = responseText;
                    const agentInteraction = expertRouted
                        ? undefined
                        : await this.interactionStore.getPending(unifiedSessionId);
                    if (agentInteraction?.origin === "agent" && adapter.name !== "websocket") {
                        finalContent = this.interactionFallbackText(agentInteraction);
                    }
                    // FIX: Handle Empty Response (Silent Failure)
                    // If the agent returns empty string (e.g. only thoughts/tools with no text output), 
                    // the frontend MessageItem will return null and the bot icon will disappear.
                    // We MUST return some text to ensure the message renders.
                    if (!finalContent || finalContent.trim().length === 0) {
                        console.warn("[Gateway] Agent returned empty response. Injecting fallback message.");
                        finalContent = "（任务已完成，但Agent未生成文本总结。请查看上方工具执行结果。）";
                    }
                    // FIX: Handle Naked Tool Call (Ghost Avatar Issue)
                    // If response is purely JSON (likely a tool call without explanation), append text to force UI rendering
                    else {
                        const trimmed = finalContent.trim();
                        if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
                            try {
                                JSON.parse(trimmed);
                                // If valid JSON, it might be a tool call. Append text to ensure bubble & avatar appear.
                                finalContent += "\n\n（操作已执行，请查看上方工具详情）";
                            }
                            catch (e) {
                                // Not valid JSON, ignore
                            }
                        }
                    }
                    const guarded = guardTurnResponse(finalContent, approvalCoordinator.pending(), harnessEvents);
                    finalContent = guarded.content;
                    // 3. Create Response Message
                    // Ensure we don't carry over user-specific display metadata (like display_text) to the assistant response
                    const responseMetadata = { ...msg.metadata };
                    delete responseMetadata.display_text;
                    if (runArtifacts.length > 0) {
                        responseMetadata.artifacts = runArtifacts;
                    }
                    if (guarded.approval) {
                        responseMetadata.harnessApproval = {
                            state: "pending",
                            ...guarded.approval,
                        };
                    }
                    if (guarded.correctedFalseSuccess) {
                        responseMetadata.harnessOutcomeCorrection = "false_success_after_file_failure";
                    }
                    if (expertResult) {
                        const continuationAvailable = Boolean(pendingExpertToCommit
                            || (pendingExpert
                                && expertResult.status === "failed"
                                && expertResult.retryable
                                && pendingExpert.expiresAt > Date.now()));
                        responseMetadata.expertInvocation = {
                            ...expertWorkerResultMetadata(expertResult),
                            ...(continuationAvailable ? {
                                continuationAvailable: true,
                                continuationExpiresAt: pendingExpertToCommit?.expiresAt ?? pendingExpert?.expiresAt,
                            } : {}),
                        };
                        const expertProcess = expertProcessRecorder.snapshot();
                        if (expertProcess)
                            responseMetadata.expertProcess = expertProcess;
                        if (expertResult.status === "needs_input") {
                            responseMetadata.errorType = "expert_input_required";
                        }
                        else if (expertResult.status === "partial") {
                            responseMetadata.errorType = "expert_partial_result";
                        }
                        else if (expertResult.status !== "completed") {
                            responseMetadata.errorType = "expert_invocation_failed";
                        }
                    }
                    const responseMsg = {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: finalContent,
                        senderId: "ai",
                        source: msg.source,
                        metadata: responseMetadata // Copy metadata (excluding display_text) to reply to correct chat
                    };
                    // PiKernel persists ordinary main turns. A deterministic Expert route bypasses the
                    // main model entirely, so the Gateway owns this one user/assistant pair and then
                    // evicts any idle Pi cache to make the external append visible on the next turn.
                    if (expertRouted) {
                        try {
                            this.sessionManager.appendTurnAtomically(storageChannel, storageId, msg, responseMsg);
                        }
                        catch (error) {
                            if (newlyPersistedPendingExpert) {
                                try {
                                    this.clearPendingExpertTurn(storageChannel, storageId, pendingKey);
                                }
                                catch (cleanupError) {
                                    console.error("[Gateway] Failed to clean an uncommitted Expert continuation:", cleanupError);
                                }
                            }
                            throw error;
                        }
                        const retainConsumedPending = Boolean(pendingExpert
                            && expertResult?.status === "failed"
                            && expertResult.retryable
                            && pendingExpert.expiresAt > Date.now());
                        if (pendingExpert && !retainConsumedPending) {
                            try {
                                this.clearPendingExpertTurn(storageChannel, storageId, pendingKey);
                            }
                            catch (error) {
                                // The durable latest response is no longer a clarification request, so the
                                // UI will send an explicit Expert ref and heal this stale marker next turn.
                                console.error("[Gateway] Failed to clear completed Expert continuation:", error);
                            }
                        }
                        try {
                            this.agent.evictSession(unifiedSessionId);
                        }
                        catch (error) {
                            console.warn("[Gateway] Expert turn is durable but idle Pi cache eviction failed:", error);
                        }
                    }
                    // 5. Send back
                    await adapter.send(responseMsg);
                    // Harness approvals and model-authored clarification requests share the same
                    // persisted interaction surface. The run is already complete here, so no worker
                    // is held while the user decides.
                    if (!expertRouted && guarded.approval) {
                        const target = guarded.approval.targetSummary
                            ? `\n${guarded.approval.targetSummary}`
                            : "";
                        await this.interactionStore.create({
                            sessionId: unifiedSessionId,
                            turnId: String(msg.metadata?.turnId || msg.id),
                            traceId: approvalTraceId,
                            kind: "approval",
                            origin: "harness",
                            question: {
                                id: "approval",
                                prompt: `Agent 准备${guarded.approval.actionSummary}，是否继续？${target}`,
                                selection: "single",
                                options: [
                                    { id: "approve", label: "继续", value: "approve" },
                                    { id: "cancel", label: "取消", value: "cancel" },
                                ],
                            },
                            expiresAt: guarded.approval.expiresAt,
                            continuation: {
                                mode: "harness_approval",
                                channel,
                                userId: approvalUserId,
                            },
                        });
                    }
                    const pendingInteraction = expertRouted
                        ? undefined
                        : await this.interactionStore.getPending(unifiedSessionId);
                    if (pendingInteraction) {
                        await this.turnQueue.pauseForInteraction(unifiedSessionId);
                    }
                    // 6. 提问配额提醒（如果这一轮踩到了 100 的倍数）。
                    //    刻意放在回答之后：夹在提问和回答中间会像是打断了对话。
                    //    只在成功答完时提醒——这一轮如果是报错收场，用户正烦着，
                    //    再跳一张"建议换会话"只会火上浇油。
                    const reminder = turnStatus === "completed" ? takeReminder(unifiedSessionId) : undefined;
                    if (reminder) {
                        await this.emitSessionQuotaCard(adapter, msg, resolved, {
                            kind: "reminder",
                            count: reminder.count,
                            limit: reminder.limit,
                            remaining: reminder.remaining,
                        });
                    }
                    return turnStatus;
                }
                catch (error) {
                    console.error("[Gateway] Error processing message:", error);
                    // Special handling for Insufficient Balance (402)
                    if (error.message.includes('402') || error.message.includes('Insufficient balance') || error.message.includes('insufficient_quota')) {
                        let displayMessage = "余额不足，无法继续对话。请充值后重试。";
                        let errorSubCode;
                        try {
                            // Extract inner JSON message if present (OpenAI SDK error format: "402 {\"error\":{\"message\":\"...\"}}")
                            const jsonMatch = error.message.match(/\{.*\}/);
                            if (jsonMatch) {
                                const parsed = JSON.parse(jsonMatch[0]);
                                if (parsed?.error?.message) {
                                    displayMessage = parsed.error.message;
                                }
                                if (parsed?.error?.code) {
                                    errorSubCode = parsed.error.code;
                                }
                            }
                            else {
                                // Handle raw string like "402 您的可用积分过低..."
                                const rawMsg = error.message.replace(/^Error:\s*/, '').replace(/^402\s*/, '').trim();
                                if (rawMsg) {
                                    displayMessage = rawMsg;
                                }
                            }
                        }
                        catch (e) {
                            // Ignore parse error
                        }
                        const errorMsg = {
                            id: crypto.randomUUID(),
                            role: "system",
                            content: displayMessage,
                            senderId: "system",
                            source: "system",
                            metadata: {
                                ...msg.metadata,
                                errorType: 'insufficient_balance',
                                errorCode: 402,
                                ...(errorSubCode && { errorSubCode })
                            },
                            timestamp: Date.now()
                        };
                        // Save to session history so it persists after refresh
                        try {
                            console.log(`[Gateway] Saving 402 error message to session ${storageChannel}/${storageId}`);
                            this.sessionManager.addMessage(storageChannel, storageId, errorMsg);
                        }
                        catch (e) {
                            console.error(`[Gateway] Failed to save 402 error message to session:`, e);
                        }
                        await adapter.send(errorMsg);
                        return "failed";
                    }
                    if (error.message.includes('401') ||
                        error.message.includes('Unauthorized') ||
                        error.message.includes('unauthorized') ||
                        error.message.includes('登录状态到期') ||
                        error.message.includes('token expired') ||
                        error.message.includes('Token expired')) {
                        const expiredMsg = {
                            id: crypto.randomUUID(),
                            role: "system",
                            content: "登录状态已过期，请重新登录。",
                            senderId: "system",
                            source: "system",
                            metadata: {
                                ...msg.metadata,
                                errorType: 'auth_expired',
                                errorCode: 401
                            },
                            timestamp: Date.now()
                        };
                        try {
                            this.sessionManager.addMessage(storageChannel, storageId, expiredMsg);
                        }
                        catch (e) {
                            console.error(`[Gateway] Failed to save 401 error message to session:`, e);
                        }
                        await adapter.send(expiredMsg);
                        return "failed";
                    }
                    let content = "抱歉！回复问题是遇到LLM报错，您可以稍后重试~";
                    const stopped = error.message === 'Aborted'
                        || error.name === 'AbortError'
                        || error.name === 'APIUserAbortError'
                        || error.message.includes('aborted');
                    if (stopped) {
                        content = "已终止回复";
                    }
                    const errorMsg = {
                        id: crypto.randomUUID(),
                        role: "system",
                        content: content,
                        senderId: "system",
                        source: msg.source,
                        metadata: msg.metadata
                    };
                    await adapter.send(errorMsg);
                    return stopped ? "stopped" : "failed";
                }
            }).then((status) => { turnStatus = status; return status; });
        }
        finally {
            // 这一轮彻底结束，静默上报 trace。放在 runWithContext 之外、await 之后：
            // 上报不占用户等待回复的时间。
            //
            // 用 finally 而不是顺序执行：上面的 catch 虽然不重新抛出，但它自己
            // 也会 await adapter.send——渠道断连时那一步同样会抛。届时若不是 finally，
            // 整个上报会被跳过，而「回复根本没发出去」恰恰是最需要 trace 的场景。
            //
            // 只对渠道任务触发：websocket 是客户端自己的聊天页，
            // 渲染进程已经有一条 reportTurn → ipc('trace:report') 的链，
            // 这里再报一次就是同一份日志传两遍。
            if (adapter.name !== 'websocket') {
                reportChannelTurn(msg.metadata?.traceId, unifiedSessionId, adapter.name, extractText(msg.content), 
                // 结局随建行的那次 POST 一起写，不额外发请求。
                // undefined = 异常逃逸，按 error 记：能走到 finally 说明这一轮
                // 确实结束了，只是没有走完正常的返回路径。
                turnStatus === undefined ? 'error'
                    : turnStatus === 'stopped' ? 'aborted_by_user'
                        : turnStatus === 'failed' ? 'error'
                            : undefined);
                // 这一轮走到了收尾，销账。能执行到这里就说明它不是「没收尾」，
                // 无论结局是成功、失败还是被中止——那些结局上面已经如实上报了。
                closeChannelTurn(msg.metadata?.traceId);
            }
        }
    }
    async continueTaskGroupToParent(group) {
        const target = this.parseParentSessionId(group.parentSessionId);
        if (!target) {
            console.warn(`[Gateway] Cannot continue task group ${group.id}: invalid parent session ${group.parentSessionId}`);
            return;
        }
        const existing = this.sessionManager.getPrimarySession(target.channel, target.sessionId);
        const alreadyFinalized = existing.some((m) => m?.metadata?.taskGroupId === group.id &&
            m?.metadata?.kind === 'task_group_final_response');
        if (alreadyFinalized) {
            return;
        }
        let finalContent = group.finalSummary || this.buildFallbackTaskGroupSummary(group);
        try {
            const synthesisPrompt = this.buildTaskGroupContinuationPrompt(group, existing);
            const responseText = await this.agent.run(synthesisPrompt, [], `system__task_final_${group.id}`, async () => { });
            if (responseText && responseText.trim()) {
                finalContent = responseText.trim();
            }
        }
        catch (e) {
            console.error(`[Gateway] Failed to synthesize final response for task group ${group.id}`, e);
        }
        const message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: finalContent,
            senderId: "ai",
            source: this.toMessageSource(target.channel),
            metadata: {
                chat_id: target.sessionId,
                taskGroupId: group.id,
                kind: "task_group_final_response",
                parentSessionId: group.parentSessionId,
                notificationKey: `delegate-group:${group.id}:final`,
                notificationTitle: "Agent 任务已完成",
            },
            timestamp: Date.now(),
        };
        this.sessionManager.addMessage(target.channel, target.sessionId, message);
        for (const adapter of this.adapters) {
            if (adapter.name !== target.channel)
                continue;
            try {
                await adapter.send(message);
            }
            catch (e) {
                console.warn(`[Gateway] Failed to send task final response via ${adapter.name}`, e);
            }
        }
    }
    parseParentSessionId(parentSessionId) {
        if (!parentSessionId)
            return null;
        if (!parentSessionId.includes('__')) {
            return { channel: 'websocket', sessionId: parentSessionId };
        }
        const parts = parentSessionId.split('__');
        const channel = parts[0];
        const sessionId = parts.slice(1).join('__');
        if (!channel || !sessionId)
            return null;
        return { channel, sessionId };
    }
    toMessageSource(channel) {
        switch (channel) {
            case "feishu":
            case "cli":
            case "wechat":
            case "wechat-ilink":
            case "websocket":
            case "system":
                return channel;
            default:
                return "system";
        }
    }
    buildTaskGroupContinuationPrompt(group, parentMessages) {
        const originalRequest = this.findNearestUserRequest(parentMessages, group.createdAt);
        const taskResults = group.subTasks.map((task, index) => {
            const result = task.result;
            const findings = result?.findings?.length
                ? result.findings.map((f, i) => `    ${i + 1}. ${f}`).join("\n")
                : "    (none)";
            const artifacts = result?.artifacts?.length
                ? result.artifacts.map((a, i) => `    ${i + 1}. ${a.title}${a.uri ? ` - ${a.uri}` : ""}`).join("\n")
                : "    (none)";
            return [
                `${index + 1}. ${task.title}`,
                `  Status: ${task.status}`,
                `  Objective: ${task.objective}`,
                `  Summary: ${result?.summary || task.error || task.errorCode || ""}`,
                `  Findings:`,
                findings,
                `  Artifacts:`,
                artifacts,
            ].join("\n");
        }).join("\n\n");
        return [
            "You are the parent agent completing a user request after delegated sub-tasks finished.",
            "Do not call tools. Do not mention internal task ids unless useful. Produce the final user-facing answer in the user's language.",
            "Use the sub-task results as source material and synthesize them into one coherent answer.",
            "",
            `Original user request:\n${originalRequest || group.goal}`,
            "",
            `Task group goal:\n${group.goal}`,
            "",
            `Sub-task results:\n${taskResults}`,
            "",
            `Fallback mechanical summary:\n${group.finalSummary || ""}`,
        ].join("\n");
    }
    findNearestUserRequest(messages, createdAt) {
        const users = messages
            .filter((m) => m.role === 'user' && (!m.timestamp || m.timestamp <= createdAt + 5000))
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        return users.length > 0 ? extractText(users[0].content) : "";
    }
    buildFallbackTaskGroupSummary(group) {
        const lines = [`任务已完成 (${group.subTasks.filter(t => t.status === 'completed').length}/${group.subTasks.length})。`];
        for (const task of group.subTasks) {
            const summary = task.result?.summary || task.error || task.errorCode || task.status;
            lines.push(`- ${task.title}: ${summary}`);
        }
        return lines.join("\n");
    }
}
