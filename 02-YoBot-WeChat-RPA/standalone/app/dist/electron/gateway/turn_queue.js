import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const MAX_RECENT = 1000;
const MAX_PENDING = 20;
function previewMessage(message) {
    const displayText = typeof message.metadata?.display_text === "string"
        ? message.metadata.display_text.trim()
        : "";
    if (displayText)
        return displayText.slice(0, 240);
    if (typeof message.content === "string")
        return message.content.trim().slice(0, 240);
    const text = message.content
        .filter(part => part.type === "text" && typeof part.text === "string")
        .map(part => part.text)
        .join("\n")
        .trim();
    return (text || "[附件]").slice(0, 240);
}
function displayContentForTurn(message) {
    const displayText = typeof message.metadata?.display_text === "string"
        ? message.metadata.display_text.trim()
        : "";
    if (displayText)
        return displayText;
    if (typeof message.content === "string")
        return message.content;
    return previewMessage(message);
}
const STAGED_IMAGE_URL = "yoko-staged-image:";
function externalizeQueuedMessage(message) {
    if (!Array.isArray(message.content))
        return message;
    return {
        ...message,
        content: message.content.map((part) => {
            if (part?.type !== "image_url")
                return part;
            const url = String(part.image_url?.url || "");
            const filePath = part.image_url?.path;
            const match = url.match(/^data:([^;]+);base64,(.+)$/);
            if (!match || typeof filePath !== "string" || !filePath || !fs.existsSync(filePath)) {
                return part;
            }
            try {
                const inlineBytes = Buffer.from(match[2], "base64");
                const stagedBytes = fs.readFileSync(filePath);
                if (!inlineBytes.equals(stagedBytes))
                    return part;
            }
            catch {
                return part;
            }
            return {
                ...part,
                image_url: {
                    ...part.image_url,
                    url: `${STAGED_IMAGE_URL}${match[1]}`,
                },
            };
        }),
    };
}
function hydrateQueuedMessage(message) {
    if (!Array.isArray(message.content))
        return message;
    return {
        ...message,
        content: message.content.map((part) => {
            if (part?.type !== "image_url")
                return part;
            const url = String(part.image_url?.url || "");
            if (!url.startsWith(STAGED_IMAGE_URL))
                return part;
            const filePath = part.image_url?.path;
            if (typeof filePath !== "string" || !filePath || !fs.existsSync(filePath)) {
                throw new Error(`Staged queue image is missing: ${String(filePath || "")}`);
            }
            const mime = url.slice(STAGED_IMAGE_URL.length) || "image/jpeg";
            const data = fs.readFileSync(filePath).toString("base64");
            return {
                ...part,
                image_url: {
                    ...part.image_url,
                    url: `data:${mime};base64,${data}`,
                },
            };
        }),
    };
}
/**
 * 把暂停原因翻译成给渠道用户看的自救提示。
 *
 * 暂停态下 pump 不会启动（activateNext 第一个条件就返回 undefined），所以
 * "前面还有 N 项" 这种排队文案是误导性的 —— 那 N 项永远不会开始。桌面 UI 有
 * TurnQueuePanel 的"点击继续"按钮，而渠道用户（微信等）没有任何可视入口，
 * 这条文本是他们唯一能发现 /resume 的地方。返回空串表示未暂停。
 */
export function describeQueuePause(snapshot) {
    const paused = snapshot.paused;
    if (!paused)
        return "";
    const waiting = snapshot.pending.length;
    const actions = waiting > 0
        ? `发送 /resume 继续执行，/clear 丢弃等待中的 ${waiting} 项，/queue 查看详情。`
        : "发送 /resume 继续执行，/queue 查看详情。";
    switch (paused.reason) {
        case "recovery_required":
            return `上次执行被意外中断（客户端未正常退出），队列已暂停，不会自动继续。${actions}`;
        case "user_stopped":
            return `队列已按你的要求暂停。${actions}`;
        case "execution_failed":
            return `上一轮执行失败，队列已暂停。${actions}`;
        case "delivery_failed":
            return `上一轮回复发送失败，队列已暂停。${actions}`;
        default:
            // 队列文件是持久化的，可能由其他版本写入未知 reason。不要因此静默。
            return `队列当前已暂停。${actions}`;
    }
}
function view(turn) {
    return {
        turnId: turn.turnId,
        sequence: turn.sequence,
        preview: previewMessage(turn.message),
        receivedAt: turn.receivedAt,
        state: turn.state,
        startedAt: turn.startedAt,
    };
}
export class TurnQueueStore {
    rootDir;
    transactionTails = new Map();
    constructor(rootDir) {
        const dataRoot = process.env.USER_DATA_PATH || process.cwd() || os.homedir();
        this.rootDir = rootDir || path.join(dataRoot, "data", "turn_queues");
        fs.mkdirSync(this.rootDir, { recursive: true });
    }
    async enqueue(input) {
        return this.transaction(input.session.unifiedSessionId, state => {
            const all = [
                ...(state.active ? [state.active] : []),
                ...state.pending,
            ];
            const duplicate = all.find(turn => turn.idempotencyKey === input.idempotencyKey)
                || state.recentAccepted.find(item => item.idempotencyKey === input.idempotencyKey);
            if (duplicate) {
                const snapshot = this.toSnapshot(state);
                const index = state.pending.findIndex(turn => turn.idempotencyKey === input.idempotencyKey);
                return {
                    value: {
                        accepted: true,
                        duplicate: true,
                        queuePosition: index < 0 ? 0 : (state.active ? index + 1 : index),
                        snapshot,
                    },
                    changed: false,
                };
            }
            if (state.pending.length >= MAX_PENDING) {
                return {
                    value: {
                        accepted: false,
                        duplicate: false,
                        queuePosition: -1,
                        snapshot: this.toSnapshot(state),
                    },
                    changed: false,
                };
            }
            const turn = {
                ...input,
                message: externalizeQueuedMessage(input.message),
                sequence: state.nextSequence++,
                state: "queued",
                attempt: 0,
            };
            state.pending.push(turn);
            const queuePosition = state.active ? state.pending.length : state.pending.length - 1;
            return {
                value: {
                    accepted: true,
                    duplicate: false,
                    queuePosition,
                    snapshot: this.toSnapshot(state),
                },
                changed: true,
            };
        });
    }
    async activateNext(unifiedSessionId) {
        return this.transaction(unifiedSessionId, state => {
            if (state.paused || state.active || state.pending.length === 0) {
                return { value: undefined, changed: false };
            }
            const turn = state.pending.shift();
            turn.state = "running";
            delete turn.interrupted;
            turn.attempt += 1;
            turn.startedAt = Date.now();
            state.active = turn;
            return { value: turn, changed: true };
        });
    }
    async finishActive(unifiedSessionId, status) {
        return this.transaction(unifiedSessionId, state => {
            const active = state.active;
            if (active) {
                state.recentAccepted.push({
                    idempotencyKey: active.idempotencyKey,
                    turnId: active.turnId,
                    at: Date.now(),
                });
                state.recentAccepted = state.recentAccepted.slice(-MAX_RECENT);
            }
            state.active = undefined;
            if (status === "failed" && !state.paused && state.pending.length > 0) {
                state.paused = { reason: "execution_failed", at: Date.now(), turnId: active?.turnId };
            }
            else if (status === "stopped" && !state.paused && state.pending.length > 0) {
                state.paused = { reason: "user_stopped", at: Date.now(), turnId: active?.turnId };
            }
            if (state.pending.length === 0 && state.paused?.reason === "user_stopped") {
                state.paused = undefined;
            }
            return { value: this.toSnapshot(state), changed: true };
        });
    }
    /**
     * 终结一个"执行者已经不在了"的会话（进程被强杀后重启，finishActive 永远不会到来）。
     *
     * 与 finishActive 的区别在于还要收拾暂停标记：用户按停止的诉求是"把输入框还给我"，
     * 留一条点了也没用的"点击继续"横幅不算解卡。只有 awaiting_interaction 保留——
     * 那边可能还挂着一张真实的确认卡，清掉会让用户失去回答入口。
     */
    /**
     * 当前这一轮是不是"执行者已经随上个进程消失"的壳（recover() 打的标记）。
     *
     * 单独暴露是因为 `toSnapshot` 刻意把中断壳隐藏了（不对外算"正在执行"），
     * 所以调用方从快照里看不到它，只能问这里。
     */
    async hasInterruptedActive(unifiedSessionId) {
        return Boolean(this.load(unifiedSessionId).active?.interrupted);
    }
    async settleInterrupted(unifiedSessionId) {
        return this.transaction(unifiedSessionId, state => {
            const active = state.active;
            if (active)
                this.rememberAccepted(state, active);
            state.active = undefined;
            if (state.pending.length === 0) {
                if (state.paused?.reason !== "awaiting_interaction")
                    state.paused = undefined;
            }
            else if (!state.paused) {
                state.paused = { reason: "user_stopped", at: Date.now(), turnId: active?.turnId };
            }
            return { value: this.toSnapshot(state), changed: true };
        });
    }
    async pause(unifiedSessionId, reason) {
        return this.transaction(unifiedSessionId, state => {
            state.paused = reason === "user_stopped" && state.pending.length === 0
                ? undefined
                : { reason, at: Date.now(), turnId: state.active?.turnId };
            return { value: this.toSnapshot(state), changed: true };
        });
    }
    async resume(unifiedSessionId) {
        return this.transaction(unifiedSessionId, state => {
            if (state.paused?.reason === "recovery_required" && state.active) {
                state.active.state = "queued";
                delete state.active.interrupted;
                state.pending.unshift(state.active);
                state.active = undefined;
            }
            state.paused = undefined;
            return { value: this.toSnapshot(state), changed: true };
        });
    }
    async resumeAfterInteraction(unifiedSessionId, blockedTurnId) {
        return this.transaction(unifiedSessionId, state => {
            if (state.paused?.reason === "recovery_required"
                && state.active
                && blockedTurnId
                && state.active.turnId === blockedTurnId) {
                this.rememberAccepted(state, state.active);
                state.active = undefined;
            }
            else if (state.paused?.reason === "recovery_required" && state.active) {
                return { value: this.toSnapshot(state), changed: false };
            }
            state.paused = undefined;
            return { value: this.toSnapshot(state), changed: true };
        });
    }
    async cancel(unifiedSessionId, turnId) {
        return this.transaction(unifiedSessionId, state => {
            const cancelled = state.pending.find(turn => turn.turnId === turnId);
            const before = state.pending.length;
            state.pending = state.pending.filter(turn => turn.turnId !== turnId);
            if (cancelled)
                this.rememberAccepted(state, cancelled);
            return { value: this.toSnapshot(state), changed: before !== state.pending.length };
        });
    }
    async clearPending(unifiedSessionId) {
        return this.transaction(unifiedSessionId, state => {
            const changed = state.pending.length > 0;
            for (const turn of state.pending)
                this.rememberAccepted(state, turn);
            state.pending = [];
            return { value: this.toSnapshot(state), changed };
        });
    }
    async snapshot(unifiedSessionId) {
        return this.transaction(unifiedSessionId, state => ({
            value: this.toSnapshot(state),
            changed: false,
        }));
    }
    async hasWork(unifiedSessionId) {
        return this.transaction(unifiedSessionId, state => ({
            value: Boolean(state.active || state.pending.length > 0),
            changed: false,
        }));
    }
    async delete(unifiedSessionId) {
        await this.withKeyLock(unifiedSessionId, async () => {
            const filePath = this.filePath(unifiedSessionId);
            try {
                fs.unlinkSync(filePath);
            }
            catch (error) {
                if (error?.code !== "ENOENT")
                    throw error;
            }
        });
    }
    async recover() {
        const snapshots = [];
        if (!fs.existsSync(this.rootDir))
            return snapshots;
        for (const name of fs.readdirSync(this.rootDir)) {
            if (!name.endsWith(".json"))
                continue;
            const filePath = path.join(this.rootDir, name);
            try {
                const state = JSON.parse(fs.readFileSync(filePath, "utf8"));
                if (!state?.unifiedSessionId)
                    continue;
                if (state.active || state.pending.length > 0) {
                    if (state.active)
                        state.active.interrupted = true;
                    state.paused = {
                        reason: "recovery_required",
                        at: Date.now(),
                        turnId: state.active?.turnId,
                    };
                    state.revision += 1;
                    this.save(state);
                    snapshots.push(this.toSnapshot(state));
                }
            }
            catch (error) {
                console.error(`[TurnQueueStore] Failed to recover ${filePath}`, error);
            }
        }
        return snapshots;
    }
    async transaction(unifiedSessionId, mutate) {
        return this.withKeyLock(unifiedSessionId, async () => {
            const state = this.load(unifiedSessionId);
            const result = mutate(state);
            if (result.changed) {
                state.revision += 1;
                const value = result.value;
                if (value && typeof value === "object") {
                    if (typeof value.revision === "number")
                        value.revision = state.revision;
                    if (value.snapshot && typeof value.snapshot.revision === "number") {
                        value.snapshot.revision = state.revision;
                    }
                }
                this.save(state);
            }
            return result.value;
        });
    }
    async withKeyLock(key, operation) {
        const previous = this.transactionTails.get(key) || Promise.resolve();
        let release;
        const current = new Promise(resolve => { release = resolve; });
        const tail = previous.catch(() => undefined).then(() => current);
        this.transactionTails.set(key, tail);
        await previous.catch(() => undefined);
        try {
            return await operation();
        }
        finally {
            release();
            if (this.transactionTails.get(key) === tail) {
                this.transactionTails.delete(key);
            }
        }
    }
    load(unifiedSessionId) {
        const filePath = this.filePath(unifiedSessionId);
        if (fs.existsSync(filePath)) {
            const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
            if (parsed.unifiedSessionId !== unifiedSessionId) {
                throw new Error(`Queue key mismatch in ${filePath}`);
            }
            return parsed;
        }
        return {
            schemaVersion: 1,
            unifiedSessionId,
            revision: 0,
            nextSequence: 1,
            pending: [],
            recentAccepted: [],
        };
    }
    save(state) {
        fs.mkdirSync(this.rootDir, { recursive: true });
        const filePath = this.filePath(state.unifiedSessionId);
        const tempPath = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
        fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), { encoding: "utf8", mode: 0o600 });
        fs.renameSync(tempPath, filePath);
    }
    filePath(unifiedSessionId) {
        const digest = crypto.createHash("sha256").update(unifiedSessionId).digest("hex");
        return path.join(this.rootDir, `${digest}.json`);
    }
    toSnapshot(state) {
        // 中断壳不对外算"正在执行"。见 QueuedTurn.interrupted：留在 state 里是给
        // resumeAfterInteraction 用的，播报出去会让 UI 永久停在"执行中"。
        const running = state.active && !state.active.interrupted ? state.active : undefined;
        return {
            unifiedSessionId: state.unifiedSessionId,
            revision: state.revision,
            phase: state.paused ? "paused" : running ? "running" : "idle",
            active: running ? view(running) : undefined,
            pending: state.pending.map(view),
            paused: state.paused,
        };
    }
    rememberAccepted(state, turn) {
        state.recentAccepted.push({
            idempotencyKey: turn.idempotencyKey,
            turnId: turn.turnId,
            at: Date.now(),
        });
        state.recentAccepted = state.recentAccepted.slice(-MAX_RECENT);
    }
}
export class TurnQueueCoordinator {
    options;
    store;
    runningPumps = new Set();
    stopRequestedTurnIds = new Set();
    constructor(options) {
        this.options = options;
        this.store = options.store || new TurnQueueStore();
    }
    async recover() {
        return this.store.recover();
    }
    async submit(adapter, message, session) {
        const turnId = String(message.metadata?.turnId || message.id || crypto.randomUUID());
        const inboundMessageId = String(message.id || turnId);
        const traceId = String(message.metadata?.traceId || turnId);
        message.id = inboundMessageId;
        message.metadata = { ...(message.metadata || {}), turnId, traceId };
        const result = await this.store.enqueue({
            turnId,
            inboundMessageId,
            idempotencyKey: inboundMessageId,
            traceId,
            session,
            adapterName: adapter.name,
            message,
            receivedAt: message.timestamp || Date.now(),
        });
        const emissionTurn = {
            turnId,
            inboundMessageId,
            idempotencyKey: inboundMessageId,
            traceId,
            session,
            adapterName: adapter.name,
            message,
            receivedAt: message.timestamp || Date.now(),
            sequence: 0,
            attempt: 0,
            state: "queued",
        };
        await this.emitSnapshot(adapter, emissionTurn, "queue_snapshot", result.snapshot);
        if (result.accepted && !result.duplicate) {
            void this.pump(session.unifiedSessionId);
        }
        return result;
    }
    async stop(unifiedSessionId) {
        // 这一轮的执行者已经随上个进程消失（白屏后强杀、崩溃重启）时才走终态判定：
        // finishActive 永远不会到来，而 pause() 在 pending 为空时会把 paused 清成
        // undefined 却原样留下 state.active —— 结果是停止不但无效，还顺手抹掉了
        // TurnQueuePanel 上"点击继续"这个唯一入口。
        //
        // ⚠️ 判据必须是 recover() 打的 `interrupted` 标记，**不能**用"本进程没有跑着的 pump"。
        // 后者在会话正常停在 awaiting_interaction 时同样成立（pump 已经返回了），
        // 于是用户对着一张还在屏幕上的确认卡按停止，会被误判成中断壳：active 被丢弃、
        // 而 settleInterrupted 又刻意保留 awaiting_interaction 暂停，
        // TurnQueuePanel 在 interactionPending 为真时不渲染继续按钮 —— 会话就卡成
        // "没有进行中的轮次、也没有任何出口"，只能去回答那张已经没人接的卡。
        // 走正常 pause 分支反而是对的：pending 为空时它会清掉暂停，输入框直接还给用户。
        if (await this.store.hasInterruptedActive(unifiedSessionId)) {
            const settled = await this.store.settleInterrupted(unifiedSessionId);
            this.options.stopAgent(unifiedSessionId);
            await this.emitForSnapshot(settled, "queue_paused");
            return settled;
        }
        const snapshot = await this.store.pause(unifiedSessionId, "user_stopped");
        if (snapshot.active) {
            this.stopRequestedTurnIds.add(snapshot.active.turnId);
        }
        this.options.stopAgent(unifiedSessionId);
        await this.emitForSnapshot(snapshot, "queue_paused");
        return snapshot;
    }
    async pauseForInteraction(unifiedSessionId) {
        const snapshot = await this.store.pause(unifiedSessionId, "awaiting_interaction");
        await this.emitForSnapshot(snapshot, "queue_paused");
        return snapshot;
    }
    async resume(unifiedSessionId) {
        const snapshot = await this.store.resume(unifiedSessionId);
        await this.emitForSnapshot(snapshot, "queue_snapshot");
        void this.pump(unifiedSessionId);
        return snapshot;
    }
    async resumeAfterInteraction(unifiedSessionId, blockedTurnId) {
        const snapshot = await this.store.resumeAfterInteraction(unifiedSessionId, blockedTurnId);
        await this.emitForSnapshot(snapshot, "queue_snapshot");
        if (!snapshot.paused)
            void this.pump(unifiedSessionId);
        return snapshot;
    }
    async cancel(unifiedSessionId, turnId) {
        const snapshot = await this.store.cancel(unifiedSessionId, turnId);
        await this.emitForSnapshot(snapshot, "queue_snapshot");
        return snapshot;
    }
    async clear(unifiedSessionId) {
        const snapshot = await this.store.clearPending(unifiedSessionId);
        await this.emitForSnapshot(snapshot, "queue_snapshot");
        return snapshot;
    }
    snapshot(unifiedSessionId) {
        return this.store.snapshot(unifiedSessionId);
    }
    hasWork(unifiedSessionId) {
        return this.store.hasWork(unifiedSessionId);
    }
    delete(unifiedSessionId) {
        return this.store.delete(unifiedSessionId);
    }
    async pump(unifiedSessionId) {
        if (this.runningPumps.has(unifiedSessionId))
            return;
        this.runningPumps.add(unifiedSessionId);
        try {
            while (true) {
                const turn = await this.store.activateNext(unifiedSessionId);
                if (!turn)
                    return;
                const adapter = this.options.resolveAdapter(turn.adapterName);
                if (!adapter) {
                    const snapshot = await this.store.finishActive(unifiedSessionId, "failed");
                    await this.emitForSnapshot(snapshot, "queue_paused");
                    return;
                }
                let status = "failed";
                const started = await this.store.snapshot(unifiedSessionId);
                await this.options.emit(adapter, turn, {
                    type: "turn_started",
                    turnId: turn.turnId,
                    payload: {
                        snapshot: started,
                        turn: {
                            turnId: turn.turnId,
                            content: displayContentForTurn(turn.message),
                            timestamp: turn.message.timestamp || turn.receivedAt,
                            attachedSkill: turn.message.metadata?.attachedSkill,
                        },
                    },
                }, started);
                try {
                    status = await this.options.execute({
                        ...turn,
                        message: hydrateQueuedMessage(turn.message),
                    }, adapter);
                }
                catch (error) {
                    console.error(`[TurnQueue] Turn ${turn.turnId} failed`, error);
                    status = "failed";
                }
                if (this.stopRequestedTurnIds.delete(turn.turnId)) {
                    status = "stopped";
                }
                const snapshot = await this.store.finishActive(unifiedSessionId, status);
                await this.options.emit(adapter, turn, {
                    type: snapshot.paused ? "queue_paused" : "turn_completed",
                    turnId: turn.turnId,
                    payload: { status, snapshot },
                }, snapshot);
                if (status !== "completed" || snapshot.paused)
                    return;
            }
        }
        finally {
            this.runningPumps.delete(unifiedSessionId);
            // Close the submit-vs-pump-exit race: a turn may be enqueued after
            // activateNext() observed an empty queue but before this pump
            // released its in-memory ownership.
            const snapshot = await this.store.snapshot(unifiedSessionId);
            if (!snapshot.paused && !snapshot.active && snapshot.pending.length > 0) {
                void this.pump(unifiedSessionId);
            }
        }
    }
    async emitForSnapshot(snapshot, type) {
        const adapterName = snapshot.unifiedSessionId.split("__")[0];
        const adapter = this.options.resolveAdapter(adapterName);
        if (!adapter)
            return;
        await this.emitSnapshot(adapter, undefined, type, snapshot);
    }
    async emitSnapshot(adapter, turn, type, snapshot) {
        await this.options.emit(adapter, turn, {
            type,
            turnId: turn?.turnId,
            payload: { snapshot },
        }, snapshot);
    }
}
