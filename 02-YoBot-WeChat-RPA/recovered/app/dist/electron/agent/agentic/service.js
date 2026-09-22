import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { runWithContext } from "../../utils/context.js";
import { resolveFileMutationPolicyModeForChannel } from "../harness/tool_policy_gateway.js";
import { guardTurnResponse } from "../harness/turn_guard.js";
import { LLMManager } from "../llm/manager.js";
import { IMAGE_TOKENS_CTX_KEY, extractImageTokens } from "../../memory/image_tokens.js";
import { AGENTIC_RUN_FLAG } from "../profile/agentic_guard.js";
import { bindSessionProfile, unbindSessionProfile, registerProfile, unregisterProfile } from "../profile/resolver.js";
import { AGENTIC_RUN_DEFAULT_TIMEOUT_MS, buildAgenticRunSpec } from "../run/agentic_spec.js";
import { AgentRunStore } from "../run/store.js";
import { AgentRunExecutionError } from "../run/service.js";
import { estimateAgentRunTokens } from "../run/budget.js";
import { rpaReplyProfile, RPA_REPLY_PROFILE_NAME, DEFAULT_FOLLOWUP_PROMPT } from "../profile/builtins.js";
import { sanitizeForWeChat, hasEscalationMarker, isNoReplySentinel } from "./sanitize.js";
import { ConversationStore } from "./store.js";
import { AgenticContextManager, AgenticContextStore, } from "./context.js";
import { AgenticError, } from "./types.js";
import { AgenticIdempotencyStore } from "./idempotency.js";
import { AgenticDeliveryLedger } from "./delivery_ledger.js";
import { buildLocalDocumentContext, } from "./input_attachments.js";
/** 约 1 token/汉字,足够做熔断,不追求精确。 */
function estimateTokens(text) {
    return Math.ceil(text.length / 2);
}
const IMAGE_MIME = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".gif": "image/gif", ".webp": "image/webp", ".bmp": "image/bmp",
};
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const EXPERT_RPA_CURRENT_MESSAGE_MAX_BYTES = 256 * 1024;
const EXPERT_RPA_CURRENT_MESSAGE_MAX_IMAGES = 4;
const AGENTIC_TIMEOUT_UNCERTAIN_MS = 10 * 60 * 1000;
const LOCAL_ATTACHMENT_EXTENSIONS = new Set([
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".txt", ".csv", ".rtf", ".md", ".zip", ".rar", ".7z",
    ".mp3", ".mp4", ".wav", ".m4a", ".mov",
]);
/**
 * 本地图片文件 → data URI(同机场景)。RPA 把图片缓存到本地并把绝对路径传来,这里读文件转
 * base64,复用 kernel 既有的 image_url→模型 管线。守卫:仅图片扩展名、必须是文件、大小上限;
 * 任何异常回落 null(调用方降级为文本)。扩展名白名单也挡住"拿任意本地文件当图片读"。
 */
function localImageToDataUri(p) {
    try {
        if (typeof p !== "string" || !p)
            return null;
        const mime = IMAGE_MIME[path.extname(p).toLowerCase()];
        if (!mime)
            return null;
        const st = fs.statSync(p);
        if (!st.isFile() || st.size === 0 || st.size > MAX_IMAGE_BYTES)
            return null;
        return `data:${mime};base64,${fs.readFileSync(p).toString("base64")}`;
    }
    catch {
        return null;
    }
}
function toolResultText(value) {
    if (typeof value === "string")
        return value;
    if (Array.isArray(value)) {
        return value.map((part) => {
            if (typeof part === "string")
                return part;
            if (part && typeof part === "object" && typeof part.text === "string") {
                return part.text;
            }
            return "";
        }).filter(Boolean).join("\n");
    }
    if (value && typeof value === "object") {
        const candidate = value.text ?? value.content ?? value.result;
        if (candidate !== value)
            return toolResultText(candidate);
    }
    return "";
}
/**
 * shell 明确输出“仅一个已存在本地文件绝对路径”时，把它视为附件交接。
 * 目录列表、普通命令输出和不存在的路径都不会进入附件，避免误发文件。
 */
function localAttachmentsFromToolResult(value) {
    const text = toolResultText(value).trim();
    if (!text)
        return [];
    const lines = text.split(/\r?\n/).map((line) => line.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    if (lines.length === 0 || lines.length > 5)
        return [];
    const attachments = [];
    for (const line of lines) {
        // The attachment must be an absolute path on either supported desktop OS.
        // `path.isAbsolute()` follows the test host, so use both namespaces to keep
        // the contract stable in Windows CRLF regression and native macOS runs.
        if (!path.posix.isAbsolute(line) && !path.win32.isAbsolute(line))
            return [];
        const ext = path.extname(line).toLowerCase();
        if (!LOCAL_ATTACHMENT_EXTENSIONS.has(ext))
            return [];
        try {
            if (!fs.statSync(line).isFile())
                return [];
        }
        catch {
            return [];
        }
        attachments.push({
            type: "local_file",
            path: path.normalize(line),
            mediaType: IMAGE_MIME[ext] ? "image" : "file",
        });
    }
    return attachments;
}
const AGENTIC_CONVERSATION_RULES = [
    "[Conversation continuity rules]",
    "- Act only on the latest user message. Earlier messages are context, not pending instructions.",
    "- Do not repeat a file, image, link, payment instruction, or other resource already sent in the latest assistant reply unless the latest user message explicitly asks you to resend it.",
    "- Never invent a local file path. Only output a path that was supplied in context or confirmed by an available tool.",
    "- To send a verified local file, make the shell tool output only its exact absolute path on a separate tool result; the provider will attach it deterministically.",
].join("\n");
class Semaphore {
    limit;
    active = 0;
    constructor(limit) {
        this.limit = limit;
    }
    tryAcquire() {
        if (this.active >= this.limit)
            return false;
        this.active++;
        return true;
    }
    release() {
        if (this.active > 0)
            this.active--;
    }
    get inFlight() {
        return this.active;
    }
}
class DailyBudget {
    limitPerProfile;
    day = "";
    used = new Map();
    constructor(limitPerProfile) {
        this.limitPerProfile = limitPerProfile;
    }
    roll() {
        const today = new Date().toISOString().slice(0, 10);
        if (today !== this.day) {
            this.day = today;
            this.used.clear();
        }
    }
    check(profileId) {
        this.roll();
        if ((this.used.get(profileId) ?? 0) >= this.limitPerProfile) {
            throw new AgenticError("BUDGET_EXCEEDED", `profile ${profileId} 今日 token 预算已用尽`);
        }
    }
    add(profileId, tokens) {
        this.roll();
        this.used.set(profileId, (this.used.get(profileId) ?? 0) + tokens);
    }
    snapshot() {
        this.roll();
        return Object.fromEntries(this.used);
    }
}
/**
 * agentic 服务编排。
 *
 * 关键设计(§6D.3):**run 与 conversation 分离**。
 *   - run:`{logicalId}__{runId}`,唯一 → PiKernel 的 per-session 锁永不触发 →
 *     RPA 的并发请求天然互不阻塞;跑完即从 sessionCache 移除。
 *   - conversation:`rpa__{accountId}__{sessionId}`,长期,只写业务日志。
 */
export class AgenticService {
    agent;
    store;
    contextManager;
    semaphore;
    budget;
    idempotencyStore;
    deliveryLedger;
    profiles = new Map();
    loader;
    describeSkills;
    runShadowRecorder;
    runRolloutPolicy;
    expertCapabilityShadow;
    expertDeploymentShadow;
    expertRpaRuntime;
    localDocumentPolicyResolver;
    /** Parsed documents are persisted in lightweight context, while call records keep raw text only. */
    preparedUserContent = new WeakMap();
    agentRunRuntime;
    constructor(agent, opts) {
        this.agent = agent;
        this.store = opts?.store ?? new ConversationStore();
        const contextStore = opts?.contextStore
            // 生产默认使用独立的 data/agentic_contexts；测试/显式自定义业务 store 时
            // 才把上下文放进该测试目录，避免测试写入真实用户数据。
            ?? (opts?.store
                ? new AgenticContextStore(path.join(this.store.directory, "context"))
                : new AgenticContextStore());
        this.contextManager = new AgenticContextManager(contextStore);
        this.idempotencyStore = opts?.idempotencyStore
            ?? (opts?.store
                ? new AgenticIdempotencyStore(path.join(this.store.directory, "idempotency"))
                : new AgenticIdempotencyStore());
        this.deliveryLedger = opts?.deliveryLedger
            ?? (opts?.store
                ? new AgenticDeliveryLedger(path.join(this.store.directory, "deliveries"))
                : new AgenticDeliveryLedger());
        this.semaphore = new Semaphore(opts?.maxConcurrency ?? 4);
        this.budget = new DailyBudget(opts?.dailyTokenBudget ?? 2_000_000);
        this.loader = opts?.loader;
        this.describeSkills = opts?.describeSkills;
        this.runShadowRecorder = opts?.runShadowRecorder;
        this.runRolloutPolicy = opts?.runRolloutPolicy;
        this.expertCapabilityShadow = opts?.expertCapabilityShadow;
        this.expertDeploymentShadow = opts?.expertDeploymentShadow;
        this.expertRpaRuntime = opts?.expertRpaRuntime;
        this.localDocumentPolicyResolver = opts?.localDocumentPolicyResolver;
        this.agentRunRuntime = opts?.agentRunRuntime;
        // 内建兜底：没有任何 AGENT.md 时仍有一个可用的默认客服 profile。
        this.profiles.set(RPA_REPLY_PROFILE_NAME, () => rpaReplyProfile());
        this.reloadFromDisk();
    }
    registerAgenticProfile(id, factory) {
        this.profiles.set(id, factory);
    }
    /**
     * 重新装载磁盘上的 profile。
     *
     * 每次装载都**重建**用户 profile 集合，使删除文件等价于删除 profile；
     * 内建兜底不会被移除。UI 保存 AGENT.md 后调用本方法即可让变更生效
     * ——ephemeral 会话每条消息都是新 run，因此"下一条客户消息起生效"。
     */
    reloadFromDisk() {
        if (!this.loader)
            return { loaded: 0, disabled: 0 };
        // 清掉上一轮从磁盘装载的,再重建。包含同名 rpa-reply —— 否则用户在磁盘上
        // 覆盖了内建 profile 后再删掉文件,内建兜底不会恢复。
        for (const [id, factory] of [...this.profiles]) {
            if (factory.__fromDisk)
                this.profiles.delete(id);
        }
        if (!this.profiles.has(RPA_REPLY_PROFILE_NAME)) {
            this.profiles.set(RPA_REPLY_PROFILE_NAME, () => rpaReplyProfile());
        }
        let loaded = 0;
        let disabled = 0;
        for (const p of this.loader.load()) {
            if (!p.enabled) {
                disabled++;
                continue; // Q7 暂不处理：禁用即不暴露，RPA 侧靠自身报错提醒
            }
            const factory = () => p;
            factory.__fromDisk = true;
            this.profiles.set(p.name, factory);
            loaded++;
        }
        const names = [...this.profiles.keys()].join(", ");
        console.log(`[Agentic] Profiles loaded from ${this.loader.dir}: ${loaded} enabled, ${disabled} disabled. ` +
            `Available profileIds: [${names}]`);
        return { loaded, disabled };
    }
    /**
     * 供 RPA 配置页做下拉选择。name 取 displayName,回落到注册 id ——
     * 不能用 profile.name:多个 profile 可以共用同一个底座(如都由 rpaReplyProfile()
     * 派生),那样下拉框里会出现多个同名项,用户无法分辨。
     */
    listProfiles() {
        return [...this.profiles.entries()].map(([id, factory]) => ({
            id,
            name: factory().displayName || id,
        }));
    }
    /** 只要 profile 声明了可用技能,深度阶段才有意义。 */
    supportsTwoPhase(profileId) {
        const p = this.profiles.get(profileId);
        return !!p && (p().allowedSkills?.size ?? 0) > 0;
    }
    budgetSnapshot() {
        return this.budget.snapshot();
    }
    acknowledgeDelivery(deliveryId, request) {
        return this.deliveryLedger.acknowledge(deliveryId, request);
    }
    /**
     * 幂等重放的观测点。
     *
     * 线上出现过「1ms 返回 phases=0、客户零回复」，而重放分支是 run() 里唯一能不发事件
     * 就返回的地方。要区分两种成因，必须知道"存了几条"和"重放后还剩几条"：
     *   · stored=0 → 记录本身就是空的（上一轮没产出就被标记完成）
     *   · stored>0 && replayable=0 → 投递账本判定全部已送达，于是一条都不重发
     * 只在重放时打一条，频率极低。
     */
    logReplay(key, stored, replayable, site) {
        console.warn(`[Agentic] 幂等命中已完成记录(${site})：key=${key.slice(0, 12)} `
            + `stored=${stored} replayable=${replayable}`
            + (replayable === 0 ? " —— 本轮不会向客户发送任何内容" : ""));
    }
    idempotencyLookup(key) {
        try {
            return this.idempotencyStore.lookup(key);
        }
        catch (error) {
            console.error("[Agentic] Idempotency state unavailable:", error);
            throw new AgenticError("BUSY", "请求去重状态暂不可用，为避免重复回复，本次已拒绝执行");
        }
    }
    durableEvent(key, event) {
        if (!key)
            return event;
        try {
            return this.deliveryLedger.prepare(this.idempotencyStore.append(key, event));
        }
        catch (error) {
            console.error("[Agentic] Failed to persist response idempotency event:", error);
            throw new AgenticError("BUSY", "回复去重状态无法保存，为避免重复发送，本次已停止");
        }
    }
    /**
     * 重放事件转成线上报文：整批里没有 Phase-2 时，把 phase 去掉。
     *
     * 必须和"新跑"时的处理保持一致，否则重放会把已修的 bug 原样带回来——
     * RPA 每条自动回复都带 idempotencyKey（它按 messages+scene 自己生成），
     * 超时重试走的正是这条路，而重放发出去的是**存下来的**事件。
     *
     * 判定用「整批里有没有 Phase-2」而不是事件自己的 phase：
     *   · 单阶段：只有一条 phase=1 → 去掉 → RPA 走完整管线（转人工/过滤词/二次确认都在）
     *   · 真两阶段两条：保留 1 与 2，RPA 才会先秒回再追发
     *   · 两阶段但 Phase-2 被抑制（内容重复/未触发追答）：只剩一条 phase=1 → 也去掉。
     *     这反而更正确：既然不会再有追发，它就该走完整管线受检。
     * 只剩一条 phase=2 的情形（Phase-1 已确认）保持原样，与改动前行为一致。
     */
    toWireEvents(events) {
        if (events.some((e) => e.phase === 2))
            return events;
        return events.map((event) => {
            if (event.phase !== 1)
                return event;
            const { phase: _dropped, ...wire } = event;
            return wire;
        });
    }
    replayPendingEvents(events) {
        try {
            return events
                .map((event) => this.deliveryLedger.pendingForReplay(event))
                .filter((event) => event !== undefined);
        }
        catch (error) {
            console.error("[Agentic] Delivery acknowledgement state unavailable during replay:", error);
            throw new AgenticError("BUSY", "历史投递确认状态不可用，为避免向客户重复发送，本次已拒绝自动重放");
        }
    }
    /**
     * 执行一次 agentic 请求,通过 emit 回调流式吐出事件。
     *
     * Phase-1:无工具单轮,秒回。Phase-2:完整 agent loop,同一条 SSE 流续发。
     * Phase-2 不使用 `defer` —— 消息已经发出去了,转人工没有意义。
     */
    async run(req, emit, opts) {
        const started = Date.now();
        const requestDeadlineAt = started + AGENTIC_RUN_DEFAULT_TIMEOUT_MS;
        this.validate(req);
        const factory = this.profiles.get(req.profileId);
        const canResolveExplicitExpert = Boolean(this.expertRpaRuntime && req.conversation.upstreamBindingId?.trim());
        if (!factory && !canResolveExplicitExpert) {
            throw new AgenticError("UNKNOWN_PROFILE", `未知 profileId: ${req.profileId}`);
        }
        if (req.idempotencyKey) {
            const existing = this.idempotencyLookup(req.idempotencyKey);
            if (existing.state === "completed") {
                if (existing.events.length === 0) {
                    throw new Error("已完成请求缺少回复事件，请核对历史任务状态");
                }
                const replay = this.replayPendingEvents(existing.events);
                this.logReplay(req.idempotencyKey, existing.events.length, replay.length, "lookup");
                this.toWireEvents(replay).forEach(emit);
                return { ...(replay.length === 0 ? { outcome: "already_delivered" } : {}),
                    usage: { phases: replay.length, estimatedTokens: 0, elapsedMs: Date.now() - started } };
            }
            if (existing.state === "busy") {
                throw new AgenticError("BUSY", existing.status === "uncertain"
                    ? "上一次同请求的投递状态不确定，为避免重复回复，请稍后核对后再试"
                    : "相同请求正在处理中，请勿重复提交");
            }
        }
        this.budget.check(req.profileId);
        if (!this.semaphore.tryAcquire()) {
            // 快速失败,让 RPA 走自己的降级(本地 LLM),而不是把队列堆在 Agent 里。
            throw new AgenticError("BUSY", "Agent 并发已满,请降级处理本条消息");
        }
        const logicalId = `rpa__${req.conversation.accountId}__${req.conversation.sessionId}`;
        const emitted = [];
        let tokens = 0;
        let idempotencyClaimed = false;
        let executionStarted = false;
        try {
            if (req.idempotencyKey) {
                let claim;
                try {
                    claim = this.idempotencyStore.claim(req.idempotencyKey);
                }
                catch (error) {
                    console.error("[Agentic] Failed to claim idempotency key:", error);
                    throw new AgenticError("BUSY", "请求去重状态无法建立，为避免重复回复，本次已拒绝执行");
                }
                if (claim.state === "completed") {
                    if (claim.events.length === 0) {
                        throw new Error("已完成请求缺少回复事件，请核对历史任务状态");
                    }
                    const replay = this.replayPendingEvents(claim.events);
                    this.logReplay(req.idempotencyKey, claim.events.length, replay.length, "claim");
                    this.toWireEvents(replay).forEach(emit);
                    return { ...(replay.length === 0 ? { outcome: "already_delivered" } : {}),
                        usage: { phases: replay.length, estimatedTokens: 0, elapsedMs: Date.now() - started } };
                }
                if (claim.state === "busy") {
                    throw new AgenticError("BUSY", "相同请求正在处理中，请勿重复提交");
                }
                idempotencyClaimed = true;
            }
            let baseProfile = factory
                ? this.withConversationRules(factory())
                : this.withConversationRules({
                    name: req.profileId,
                    version: "unresolved",
                    scope: "subagent",
                    memoryNamespace: { read: null, write: null },
                    sessionPolicy: "ephemeral",
                    runtime: "inproc",
                });
            let expertCapabilityShadow;
            try {
                expertCapabilityShadow = this.expertCapabilityShadow?.evaluate({
                    profile: baseProfile,
                    source: "rpa",
                    channel: "rpa",
                    invocationRole: "primary",
                });
            }
            catch (error) {
                console.warn("[ExpertCapabilityShadow] RPA request-profile evaluation failed; live tools are unchanged:", error);
            }
            let expertDeploymentShadow;
            try {
                expertDeploymentShadow = this.expertDeploymentShadow?.evaluateRpa({
                    profile: baseProfile,
                    accountId: req.conversation.accountId,
                    upstreamBindingId: req.conversation.upstreamBindingId,
                });
            }
            catch (error) {
                console.warn("[ExpertDeploymentShadow] RPA split evaluation failed; live route remains legacy:", error);
            }
            const expertRpaDecision = this.expertRpaRuntime?.resolveLive({ request: req, profile: baseProfile });
            if (!factory && expertRpaDecision?.route !== "expert_v2" && expertRpaDecision?.route !== "blocked") {
                throw new AgenticError("UNKNOWN_PROFILE", `未知 profileId: ${req.profileId}`);
            }
            if (expertRpaDecision?.route === "blocked") {
                const blocked = this.durableEvent(req.idempotencyKey, {
                    action: "defer",
                    segments: [],
                    reason: "专家部署当前不可安全执行，请转人工处理。",
                    phase: 1,
                });
                emitted.push(blocked);
                emit(blocked);
                this.record(req, logicalId, {
                    text: "",
                    tokens: 0,
                    elapsedMs: Date.now() - started,
                    tools: [],
                    traceId: crypto.randomUUID(),
                }, blocked);
                if (req.idempotencyKey)
                    this.idempotencyStore.complete(req.idempotencyKey);
                return { usage: { phases: 1, estimatedTokens: 0, elapsedMs: Date.now() - started } };
            }
            if (expertRpaDecision?.route === "expert_v2") {
                const inputViolation = this.expertRpaInputViolation(req, expertRpaDecision.candidate.binding.contextPolicy.maxTokens);
                if (inputViolation) {
                    const blocked = this.durableEvent(req.idempotencyKey, {
                        action: "defer",
                        segments: [],
                        reason: "客户消息超过当前专家的安全输入范围，请缩短内容后重试或转人工处理。",
                        phase: 1,
                    });
                    emitted.push(blocked);
                    emit(blocked);
                    console.warn(`[ExpertRpaBudget] Deferred request before context/model execution: ${inputViolation}`);
                    if (req.idempotencyKey)
                        this.idempotencyStore.complete(req.idempotencyKey);
                    return { usage: { phases: 1, estimatedTokens: 0, elapsedMs: Date.now() - started } };
                }
                baseProfile = this.expertRpaRuntime.profileFor(expertRpaDecision.candidate, this.withConversationRules(expertRpaDecision.candidate.expert.profile));
            }
            const expertOwnsContext = expertRpaDecision?.route === "expert_v2";
            const contextLimits = expertOwnsContext
                ? {
                    maxTurns: expertRpaDecision.candidate.binding.contextPolicy.maxTurns,
                    maxTokens: expertRpaDecision.candidate.binding.contextPolicy.maxTokens,
                }
                : undefined;
            const { history, userMessage } = await this.toAgentInput(req, baseProfile, {
                limits: contextLimits,
                forceConversation: expertOwnsContext,
                allowLocalAttachments: opts?.allowLocalAttachments !== false,
            });
            const policy = baseProfile.followUp ?? "never";
            const hasSkills = (baseProfile.allowedSkills?.size ?? 0) > 0;
            // 智能追答(§21) = followUp 非 never、有技能、且调用方能收 Phase-2。
            // 关闭追答 → 单阶段:直接用 baseProfile 完整答完(有技能就带工具跑)一次发送,
            // 客户静默等待(“大模型完整回答完后发送”)。无技能时也走单阶段 = 无工具秒回。
            //
            // ⚠️ 仅 auto_reply 场景才可能两阶段:两阶段的意义是"客户在等 → 先秒回一句安抚、
            // 再追发深答"。跟单/开场白/朋友圈评论等**生成型**场景是主动出站、没有等待的客户,
            // Phase-1 的"稍等"过渡语会变成错误产物(RPA 只读第一条 message)。故非 auto_reply
            // 一律单阶段:完整生成(有技能就带工具跑)一次返回最终内容。
            const smart = (opts?.allowTwoPhase ?? true) &&
                req.scene === "auto_reply" &&
                policy !== "never" &&
                hasSkills;
            if (!smart) {
                executionStarted = true;
                const only = await this.runPhase(logicalId, baseProfile, history, userMessage, req, 1, requestDeadlineAt, expertCapabilityShadow, expertDeploymentShadow, expertRpaDecision);
                tokens += only.tokens;
                const ev = this.durableEvent(req.idempotencyKey, this.toEvent(only.text, 1, only.imageTokens, only.attachments));
                emitted.push(ev);
                // 单阶段：报文里【不能】带 phase。带了 RPA 会当成两阶段的第一阶段，
                // 发完就去等永远不来的 Phase-2，最终把这轮折叠成空回复，
                // 转人工/过滤词/二次确认全被跳过（详见 AgenticWireMessageEvent 的说明）。
                // 内部记账仍用带 phase 的原对象，delivery_ledger / record 依赖它。
                const { phase: _singlePhase, ...wireEvent } = ev;
                emit(wireEvent);
                this.record(req, logicalId, only, ev, expertOwnsContext);
                this.budget.add(req.profileId, tokens);
                if (req.idempotencyKey)
                    this.idempotencyStore.complete(req.idempotencyKey);
                return { usage: { phases: emitted.length, estimatedTokens: tokens, elapsedMs: Date.now() - started } };
            }
            // ---- 智能追答 · Phase-1:无工具单轮 ----
            // 仅 auto 需要自评:让模型判「能否当场答准」,需要才输出 [[ESCALATE]] 触发深答。
            // always 无条件追,注入自评指令是浪费也污染秒回文本;故只对 auto 注入。
            // 自评提示词做成数据(AGENT.md followUpPrompt 可改),且只进 Phase-1、不进 Phase-2。
            const phase1Profile = { ...baseProfile, allowedSkills: new Set() };
            if (policy === "auto") {
                const followUpPrompt = baseProfile.followUpPrompt || DEFAULT_FOLLOWUP_PROMPT;
                // 能力自知(§21):Phase-1 无工具,若不告知挂了哪些技能,模型会按人设直接否认能力
                // (实测「美缝销售」被问做 PPT 时直接说不会、从不追答)。把技能能力注入 Phase-1,
                // 模型才可能判断「这事我有工具能做」→ 追答;或直接答「能,你想做什么」。
                const capBlock = this.capabilityBlock(baseProfile.allowedSkills);
                phase1Profile.systemPrompt = (baseProfile.systemPrompt ?? "") + "\n\n---\n" + capBlock + followUpPrompt;
            }
            executionStarted = true;
            const phase1 = await this.runPhase(logicalId, phase1Profile, history, userMessage, req, 1, requestDeadlineAt, expertCapabilityShadow, expertDeploymentShadow);
            tokens += phase1.tokens;
            const ev1 = this.durableEvent(req.idempotencyKey, this.toEvent(phase1.text, 1, phase1.imageTokens, phase1.attachments));
            emitted.push(ev1);
            emit(ev1);
            this.record(req, logicalId, phase1, ev1);
            // ---- Phase-2:完整 agent loop ----
            // always 无条件追;auto 看 Phase-1 自评标记(在原始文本上探测,ev1.segments 已剥标记)。
            const escalated = policy === "always" || hasEscalationMarker(phase1.text);
            if (escalated && ev1.action !== "defer") {
                const phase2 = await this.runPhase(logicalId, baseProfile, history, userMessage, req, 2, requestDeadlineAt);
                tokens += phase2.tokens;
                let ev2 = this.toEvent(phase2.text, 2, phase2.imageTokens, phase2.attachments);
                // 只有当深度结果与秒回**实质不同**时才追发,否则客户会收到两条几乎一样的话。
                if (!ev2.segments.length || this.sameContent(ev1.segments, ev2.segments)) {
                    // 无追加价值:静默结束
                }
                else {
                    if (ev2.action === "defer")
                        ev2.action = "reply"; // Phase-2 的 defer 无意义
                    ev2 = this.durableEvent(req.idempotencyKey, ev2);
                    emitted.push(ev2);
                    emit(ev2);
                    this.record(req, logicalId, phase2, ev2);
                }
            }
            this.budget.add(req.profileId, tokens);
            if (req.idempotencyKey)
                this.idempotencyStore.complete(req.idempotencyKey);
            return { usage: { phases: emitted.length, estimatedTokens: tokens, elapsedMs: Date.now() - started } };
        }
        catch (error) {
            if (req.idempotencyKey && idempotencyClaimed) {
                try {
                    if (error instanceof AgentRunExecutionError) {
                        if (error.executionStarted || emitted.length > 0) {
                            this.idempotencyStore.fail(req.idempotencyKey, error.code === "deadline_exceeded" ? AGENTIC_TIMEOUT_UNCERTAIN_MS : undefined);
                        }
                        else {
                            this.idempotencyStore.release(req.idempotencyKey);
                        }
                    }
                    else if (executionStarted) {
                        this.idempotencyStore.fail(req.idempotencyKey);
                    }
                    else {
                        this.idempotencyStore.release(req.idempotencyKey);
                    }
                }
                catch (idempotencyError) {
                    console.error("[Agentic] Failed to finalize idempotency failure state:", idempotencyError);
                }
            }
            throw error;
        }
        finally {
            this.semaphore.release();
        }
    }
    sameContent(a, b) {
        return a.join("\n").trim() === b.join("\n").trim();
    }
    withConversationRules(profile) {
        const systemPrompt = profile.systemPrompt || "";
        return {
            ...profile,
            sessionPolicy: "ephemeral",
            systemPrompt: systemPrompt.includes("[Conversation continuity rules]")
                ? systemPrompt
                : [systemPrompt.trim(), AGENTIC_CONVERSATION_RULES]
                    .filter(Boolean)
                    .join("\n\n---\n"),
        };
    }
    usesConversationContext(req, forceConversation = false) {
        if (forceConversation)
            return true;
        if (req.conversation.memoryMode) {
            return req.conversation.memoryMode === "conversation";
        }
        // 旧协议兼容：自动回复默认有会话；群发(stateless)和其他单次生成场景不维护。
        return req.scene === "auto_reply" && !req.conversation.stateless;
    }
    conversationKey(req) {
        return {
            source: req.conversation.source?.trim() || "agentic",
            scopeId: req.conversation.scopeId?.trim() || req.conversation.accountId,
            profileId: req.profileId,
            conversationId: req.conversation.sessionId,
        };
    }
    renderMessage(message) {
        return message.senderName && message.role === "user"
            ? `[${message.senderName}] ${message.content}`
            : message.content;
    }
    expertRpaCurrentInputTokens(req) {
        const last = req.messages[req.messages.length - 1];
        const text = this.contextHeader(req) + this.renderMessage(last);
        const imageCount = Array.isArray(last.images)
            ? last.images.filter((item) => typeof item === "string" && item.length > 0).length
            : 0;
        return estimateAgentRunTokens(text) + imageCount * 1_024;
    }
    expertRpaInputViolation(req, maxTokens) {
        const last = req.messages[req.messages.length - 1];
        const text = this.contextHeader(req) + this.renderMessage(last);
        const imageCount = Array.isArray(last.images)
            ? last.images.filter((item) => typeof item === "string" && item.length > 0).length
            : 0;
        const bytes = Buffer.byteLength(text, "utf8");
        if (bytes > EXPERT_RPA_CURRENT_MESSAGE_MAX_BYTES)
            return "current_message_bytes_exceeded";
        if (imageCount > EXPERT_RPA_CURRENT_MESSAGE_MAX_IMAGES)
            return "current_message_images_exceeded";
        if (this.expertRpaCurrentInputTokens(req) > maxTokens)
            return "current_message_tokens_exceeded";
        return undefined;
    }
    /**
     * Phase-1 能力清单块(§21)。**只陈述事实**:当前挂了哪些技能(排除 shell —— 执行底座、
     * 非面向客户能力)。无工具的 Phase-1 靠它知道自己「有什么」,否则会按人设直接否认能力。
     *
     * 何时用、要不要为技能破人设 —— 属于**策略**,不写在这里,交给可编辑的 `followUpPrompt`
     * (DEFAULT_FOLLOWUP_PROMPT 里有默认判定，用户可在 AGENT.md 改)。这样机制注入事实、
     * 数据承载策略，两者解耦；也不会和 followUpPrompt 里的 [[ESCALATE]] 说明重复打架。
     */
    capabilityBlock(allowed) {
        if (!this.describeSkills || !allowed)
            return "";
        const names = [...allowed].filter((n) => n !== "shell");
        if (names.length === 0)
            return "";
        const items = this.describeSkills(names).filter((s) => s && s.name);
        if (items.length === 0)
            return "";
        const lines = items.map((s) => {
            const desc = (s.description || "").replace(/\s+/g, " ").trim().slice(0, 80);
            return `- ${s.name}${desc ? "：" + desc : ""}`;
        });
        return "[你已挂载的技能]（需要时可调用）：\n" + lines.join("\n") + "\n\n";
    }
    validate(req) {
        if (!req?.profileId)
            throw new AgenticError("BAD_REQUEST", "profileId 必填");
        if (!req?.conversation?.accountId)
            throw new AgenticError("BAD_REQUEST", "conversation.accountId 必填");
        if (!req?.conversation?.sessionId)
            throw new AgenticError("BAD_REQUEST", "conversation.sessionId 必填");
        if (!Array.isArray(req.messages) || req.messages.length === 0) {
            throw new AgenticError("BAD_REQUEST", "messages 不能为空");
        }
    }
    /**
     * 契约禁令 3:不假设 messages 完整或前缀稳定。只有 1 条也要能工作。
     * 群聊里 senderName 可选 —— 传了就带上归属前缀,不传也不报错。
     *
     * 图片(§图片输入):末条带本地图片路径 且 子Agent 模型支持 vision → 组装多模态内容
     * (文本 + image_url data URI),复用 kernel 既有图像管线;模型不支持(如 deepseek)或
     * 读图失败 → 纯文本(content 里 RPA 已放 "[图片]" 占位),不发字节 —— 能力门兜底。
     */
    async toAgentInput(req, baseProfile, contextOptions) {
        const msgs = req.messages;
        const last = msgs[msgs.length - 1];
        const renderedLast = this.renderMessage(last);
        const documentContext = contextOptions?.allowLocalAttachments === false
            ? ""
            : await buildLocalDocumentContext(req, this.localDocumentPolicyResolver);
        const preparedLast = [renderedLast, documentContext].filter(Boolean).join("\n\n");
        if (documentContext)
            this.preparedUserContent.set(req, preparedLast);
        else
            this.preparedUserContent.delete(req);
        const text = this.contextHeader(req) + preparedLast;
        const boundedLimits = contextOptions?.limits
            ? {
                ...contextOptions.limits,
                maxTokens: Math.max(0, (contextOptions.limits.maxTokens ?? 0)
                    - this.expertRpaCurrentInputTokens(req)
                    - (contextOptions.limits.maxTurns ?? 0) * 4),
            }
            : undefined;
        const incomingHistory = msgs.slice(0, -1).map((m) => ({
            id: m.id,
            role: m.role,
            content: this.renderMessage(m),
            timestamp: m.timestamp,
        }));
        const contextHistory = this.usesConversationContext(req, contextOptions?.forceConversation)
            ? this.contextManager.syncAndBuild(this.conversationKey(req), incomingHistory, boundedLimits)
            : incomingHistory;
        const history = contextHistory.map((message) => ({
            role: message.role,
            content: message.content,
            senderId: message.role === "user" ? "agentic-user" : "agentic-assistant",
            timestamp: message.timestamp ?? Date.now(),
        }));
        // images 也是本机路径输入；和文档一样只允许 loopback HTTP 请求读取。
        const imgs = contextOptions?.allowLocalAttachments === false
            ? []
            : (Array.isArray(last.images) ? last.images.filter((p) => typeof p === "string" && p) : []);
        if (imgs.length > 0) {
            const modelId = baseProfile.model || LLMManager.getInstance().getModelName();
            if (await LLMManager.getInstance().modelSupportsVision(modelId)) {
                const parts = [{ type: "text", text }];
                for (const p of imgs) {
                    const uri = localImageToDataUri(p);
                    if (uri)
                        parts.push({ type: "image_url", image_url: { url: uri } });
                }
                if (parts.length > 1)
                    return { history, userMessage: parts };
            }
            // 不支持 vision 或全部读图失败 → 纯文本降级(见下)
        }
        return { history, userMessage: text };
    }
    /**
     * 会话背景块。拼在末条 user 消息前、**不进 system 块** —— 保 INV-1
     * (system prompt 字节稳定)。ephemeral 会话每 run 只注入一次,天然不重复。
     * 空字段整行省略,避免 "客户昵称：" 这类空值噪音。
     *
     * account_id **不注入 prompt**(有意为之)。item 3 Part B 之后 RPA 已改送明文
     * account_id(见 auto_reply_task._provider_account_id),幻觉风险已消除;但它是
     * **机器人自己的账号**、不是客户信息,放进"会话背景"语义不合,故仍留在 envelope 里
     * 只用于路由与会话记录(logicalId / store)。多账号/代理商场景若要让 agent 感知
     * 当前服务账号,这里加一行即可(一行的事)。
     */
    contextHeader(req) {
        const lines = [];
        const name = req.identity?.userName?.trim();
        const sess = req.conversation.sessionName?.trim();
        if (name)
            lines.push(`客户昵称：${name}`);
        if (sess)
            lines.push(`会话名称：${sess}`);
        const mention = this.mentionLine(req);
        if (mention)
            lines.push(mention);
        return lines.length ? `[会话背景]\n${lines.join("\n")}\n\n` : "";
    }
    /**
     * @ 情况的**事实陈述**行。上游没下发 mentions 时返回空串 —— 行为与此前完全一致。
     *
     * 措辞上刻意只陈述事实、并显式声明"不构成指令":
     * 「未@你」这种事实一旦被模型读成规则,就会退化成"没@就一律不回",
     * 于是"对方在回答助理自己刚问出的问题、只是没重复@"这类消息会被误吞——
     * 而"乱回没@的消息"与"该回的没回"往往是同一个用户先后抱怨的两件事。
     * 收紧@判定和不漏消息是**同一个天平的两端**,判断权必须留在人设里,
     * 这里只负责把此前缺失的输入补上。
     */
    mentionLine(req) {
        if (!req.conversation.isGroup)
            return "";
        const m = req.conversation.mentions;
        if (!m || (typeof m.me !== "boolean" && !Array.isArray(m.names)))
            return "";
        const parts = ["群聊"];
        if (m.me === true)
            parts.push("本条@了你");
        else if (m.me === false)
            parts.push("本条未@你");
        const others = (m.names || []).map((n) => String(n).trim()).filter(Boolean);
        if (others.length)
            parts.push(`本条@到的人：${others.join("、")}`);
        return `消息背景：${parts.join(" · ")}（客观事实，仅供参考；是否回复以你的人设规则为准）`;
    }
    async runPhase(logicalId, profile, history, userMessage, // string | 多模态 content 数组(带图时)
    req, phase, deadlineAt, expertCapabilityShadow, expertDeploymentShadow, expertRpaDecision) {
        const t0 = Date.now();
        // run id 唯一 → PiKernel 的 per-session 锁永不触发,并发请求互不阻塞
        const runSessionId = `${logicalId}__${crypto.randomUUID().slice(0, 8)}`;
        const profileKey = `agentic:${runSessionId}`;
        const rolloutMode = this.runRolloutPolicy?.resolve({
            profileId: req.profileId,
            accountId: req.conversation.accountId,
            source: "rpa",
        }) ?? (this.agentRunRuntime ? "active" : this.runShadowRecorder?.enabled ? "shadow" : "off");
        const usesExpertRpaRuntime = expertRpaDecision?.route === "expert_v2";
        const usesActiveRuntime = usesExpertRpaRuntime
            || (rolloutMode === "active" && this.agentRunRuntime !== undefined);
        const usesShadowRuntime = !usesExpertRpaRuntime
            && rolloutMode === "shadow" && this.runShadowRecorder?.enabled === true;
        const needsRunSpec = usesActiveRuntime || usesShadowRuntime;
        const runSpec = needsRunSpec && !usesExpertRpaRuntime
            ? buildAgenticRunSpec({
                runId: AgentRunStore.newRunId(),
                profile,
                request: req,
                phase,
                usesConversationContext: this.usesConversationContext(req),
                deadlineAt,
            })
            : undefined;
        const shadowHandle = usesShadowRuntime && runSpec
            ? this.runShadowRecorder.begin(runSpec)
            : undefined;
        let legacyProfileBound = false;
        const bindLegacyProfile = () => {
            if (legacyProfileBound)
                return;
            registerProfile(profileKey, () => profile);
            bindSessionProfile(runSessionId, profileKey);
            legacyProfileBound = true;
        };
        if (!usesActiveRuntime)
            bindLegacyProfile();
        // 采集本次调用到的工具名(去重)。用于回复记录展示"调了哪些工具"——
        // 直接读 Agent 的调用 trace(onEvent 带 toolName),无需另建埋点。
        const toolsUsed = new Set();
        const attachments = new Map();
        // 图片令牌通道:kernel 检索到带图知识时,把令牌→URL 映射写进这个**可变**上下文对象;
        // run 结束后我们从同一引用读回,出口按令牌展开成图片消息。
        const harnessEvents = [];
        let runCtx = {
            channel: "agentic",
            sessionId: runSessionId,
            // profile.memoryNamespace.read 为 null 时 kernel 回落到这里的 userId。
            // 用 profileId 而非真实用户,避免客户会话读到主 agent 的用户画像。
            userId: `agentic:${req.profileId}`,
            traceId: crypto.randomUUID(),
            fileMutationPolicyMode: resolveFileMutationPolicyModeForChannel("agentic"),
            harnessEventSink: (type, payload) => harnessEvents.push({ type, payload }),
            finalResponseGuard: (content) => guardTurnResponse(content, [], harnessEvents).content,
            ...(expertCapabilityShadow ? { expertCapabilityShadow } : {}),
            ...(expertDeploymentShadow ? { expertDeploymentShadow } : {}),
            // 运行时守卫(L3):本次调用链内禁止反向调用 wechat-rpa
            [AGENTIC_RUN_FLAG]: true,
        };
        const handleAgentEvent = (ev) => {
            if (ev?.toolName)
                toolsUsed.add(String(ev.toolName));
            if (ev?.type === "tool_result" && !ev?.isError) {
                for (const attachment of localAttachmentsFromToolResult(ev.toolResult)) {
                    attachments.set(attachment.path.toLowerCase(), attachment);
                }
            }
        };
        try {
            const runLegacy = () => runWithContext(runCtx, () => this.agent.run(userMessage, history, runSessionId, handleAgentEvent));
            let text;
            if (usesExpertRpaRuntime && expertRpaDecision?.route === "expert_v2" && this.expertRpaRuntime) {
                text = (await this.expertRpaRuntime.execute({
                    candidate: expertRpaDecision.candidate,
                    profile,
                    request: req,
                    userMessage,
                    history,
                    sessionId: runSessionId,
                    deadlineAt,
                    requestContext: runCtx,
                    onContextReady: (context) => { runCtx = context; },
                    onEvent: handleAgentEvent,
                })).text;
            }
            else if (usesActiveRuntime && runSpec && this.agentRunRuntime) {
                try {
                    text = (await this.agentRunRuntime.runService.execute(runSpec, this.agentRunRuntime.executor.createExecutor({
                        profile,
                        userMessage,
                        history,
                        sessionId: runSessionId,
                        requestContext: runCtx,
                        onContextReady: (context) => { runCtx = context; },
                        onEvent: handleAgentEvent,
                    }), (execution) => ({
                        passed: typeof execution.output === "string",
                        summary: typeof execution.output === "string"
                            ? "APP phase output contract satisfied."
                            : "APP phase output must be text.",
                    }))).result.output;
                }
                catch (error) {
                    const canFailOpen = error instanceof AgentRunExecutionError
                        && error.code === "run_state_unavailable"
                        && !error.executionStarted;
                    if (!canFailOpen)
                        throw error;
                    console.error("[AgentRun] Metadata unavailable before execution; falling back to the legacy Pi path:", error);
                    bindLegacyProfile();
                    text = await runLegacy();
                }
            }
            else {
                text = await runLegacy();
            }
            // 带图时 userMessage 是内容数组;token 估算只按其中文本(图片另计,这里只做熔断)。
            const inTextLen = typeof userMessage === "string"
                ? userMessage
                : (Array.isArray(userMessage) ? userMessage.filter((p) => p?.type === "text").map((p) => p.text || "").join(" ") : "");
            const result = {
                text: text ?? "",
                tokens: estimateTokens(inTextLen) + estimateTokens(text ?? ""),
                elapsedMs: Date.now() - t0,
                tools: [...toolsUsed],
                imageTokens: runCtx[IMAGE_TOKENS_CTX_KEY] ?? [],
                attachments: [...attachments.values()],
                traceId: runCtx.traceId,
            };
            shadowHandle?.complete({
                summary: "Observed existing AgenticService PiKernel run.",
                usage: {
                    inputTokens: estimateTokens(inTextLen),
                    outputTokens: estimateTokens(text ?? ""),
                    toolCalls: toolsUsed.size,
                    turns: 1,
                },
            });
            return result;
        }
        catch (error) {
            shadowHandle?.fail(error);
            throw error;
        }
        finally {
            if (legacyProfileBound) {
                // 成对回收:不注销 registry 条目的话,每个 phase 会永久留下一条闭包。
                unbindSessionProfile(runSessionId);
                unregisterProfile(profileKey);
            }
        }
    }
    /**
     * 净化后为空 → no_reply。绝不发空消息,也绝不发兜底文案。
     *
     * 图片令牌先于净化剥离:模型输出的 `[[IMG:n]]` 展开成真实图片 URL,作为**独立段**
     * 拼在文本段之后(RPA `parse_message` 认得裸 URL → 发图)。URL 段绕过净化,不会被
     * 300 字硬切打断,也不会被 markdown 剥离误伤。仅有图无文时也应发图,不算空回复。
     */
    toEvent(raw, phase, imageTokens = [], attachments = []) {
        const { text, urls } = extractImageTokens(raw, imageTokens);
        const { segments } = sanitizeForWeChat(text);
        const finalSegments = [...segments, ...urls];
        if (finalSegments.length === 0 && attachments.length === 0) {
            // 「没得发」有两种成因，务必分开记：
            //   · raw 本身就是空白 → 模型零输出，这是【故障】（线上 10.1% 的轮次是零输出）；
            //   · raw 非空但净化后清空 → 模型说了话，被净化规则吃掉了，需要回看原文。
            // 两者以前都只落成一个 no_reply，于是「为什么不回复」在数据上无法归因。
            // action 保持不变，只多带一个原因字段——RPA 侧不读它，行为零变化。
            return {
                action: "no_reply",
                segments: [],
                phase,
                noReplyCause: raw.trim() ? "sanitized_empty" : "empty_output",
            };
        }
        // 哨兵判定放在净化**之后**、且只在"无图 + 恰好一段"时生效:
        //   · 净化后判 → markdown 包裹(`**NO_REPLY**`)已剥离,不必在这里重复处理;
        //   · 有图令牌时绝不判 → 有图就该发图,不存在"整条只是哨兵"的情形;
        //   · 只认单段 → 多段说明模型真的说了话,哪怕其中一段长得像哨兵也照发。
        // 三个条件缺一不可,共同保证"宁可多发一条怪话,也不静默吞掉真实回复"。
        if (urls.length === 0
            && attachments.length === 0
            && finalSegments.length === 1
            && isNoReplySentinel(finalSegments[0])) {
            // 与上面那条区分开：这一条是模型【明确】说了不回，属于正常业务判断。
            return { action: "no_reply", segments: [], phase, noReplyCause: "sentinel" };
        }
        return {
            action: "reply",
            segments: finalSegments,
            attachments: attachments.length ? attachments : undefined,
            phase,
        };
    }
    record(req, logicalId, phase, ev, forceConversation = false) {
        if (this.usesConversationContext(req, forceConversation)) {
            const last = req.messages[req.messages.length - 1];
            const assistantText = ev.action === "reply"
                ? ev.segments.join("\n").trim()
                : "";
            const key = this.conversationKey(req);
            const sources = Array.isArray(last?.sourceMessages)
                ? last.sourceMessages.filter((message) => message && typeof message.id === "string"
                    && message.id.startsWith("rpa-message-v2:") && message.role === "user"
                    && typeof message.content === "string")
                : [];
            if (sources.length > 1) {
                this.contextManager.recordMessages(key, sources.slice(0, -1));
            }
            const memoryLast = sources.length > 0 ? sources[sources.length - 1] : last;
            const prepared = this.preparedUserContent.get(req);
            // Keep parsed document context without persisting the burst text twice.
            const memoryContent = memoryLast !== last && last && prepared
                ? this.renderMessage(memoryLast) + prepared.slice(this.renderMessage(last).length)
                : prepared ?? (memoryLast ? this.renderMessage(memoryLast) : "");
            this.contextManager.recordTurn(key, {
                id: memoryLast?.id,
                role: "user",
                content: memoryContent,
                timestamp: memoryLast?.timestamp,
            }, assistantText
                ? {
                    id: `run:${phase.traceId || logicalId}:phase:${ev.phase}`,
                    role: "assistant",
                    content: assistantText,
                    timestamp: Date.now(),
                }
                : undefined);
            if (ev.action === "reply" && ev.attachments?.length) {
                const rawUserTimestamp = Number(last?.timestamp) || 0;
                const userTimestamp = rawUserTimestamp > 0 && rawUserTimestamp < 10_000_000_000
                    ? rawUserTimestamp * 1000
                    : rawUserTimestamp;
                const baseTimestamp = Math.max(Date.now() + 1, userTimestamp + 2);
                this.contextManager.recordMessages(key, ev.attachments.map((attachment, index) => ({
                    id: `run:${phase.traceId || logicalId}:attachment:${index}`,
                    role: "assistant",
                    content: `[已发送${attachment.mediaType === "image" ? "图片" : "文件"}] ${attachment.path}`,
                    timestamp: baseTimestamp + index,
                })));
            }
        }
        if (req.conversation.stateless && !forceConversation)
            return; // 群发场景:不写会话记录
        this.store.append(req.conversation.accountId, req.conversation.sessionId, {
            ts: Date.now(),
            runId: logicalId,
            profileId: req.profileId,
            scene: req.scene,
            sessionName: req.conversation.sessionName,
            isGroup: req.conversation.isGroup,
            userName: req.identity?.userName,
            input: req.messages[req.messages.length - 1]?.content ?? "",
            action: ev.action,
            segments: ev.segments,
            phase: ev.phase,
            elapsedMs: phase.elapsedMs,
            estimatedTokens: phase.tokens,
            tools: phase.tools.length ? phase.tools : undefined,
            traceId: phase.traceId,
        });
    }
}
