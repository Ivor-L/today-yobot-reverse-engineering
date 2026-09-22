import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { discoverRpaHttpUrl, getRpaWsUrl, httpToWsUrl } from '../../utils/rpa_port.js';
// Events from yokowebot that agent client needs to handle in Phase 1.
// All other events are silently ignored.
const HANDLED_EVENTS = {
    'wechat.manual_action_required': 'wechat_manual_action',
    // 重开自动回复时仍有转人工挂起的会话。旧版客户端不认这个 event：
    // HANDLED_EVENTS 查不到就直接 return，静默忽略——新 RPA + 旧客户端安全。
    'wechat.sessions_suspended': 'wechat_sessions_suspended',
    'ai.service_error': 'ai_service_error',
    'ai.config_error': 'ai_config_error',
};
const SUBSCRIBE_TOPICS = ['wechat.*', 'ai.*'];
const CLIENT_ID = 'yoko-agent-main';
const RECONNECT_DELAY_MS = 15_000;
/**
 * 重连日志按**状态**打，不按次数打。
 *
 * 之前每 15 秒无条件打三行（Connecting / Connected / Disconnected），一夜就是几千行，
 * 把真正有价值的日志全冲走了。而这三行在第 2 次之后不携带任何新信息——同一个失败
 * 反复发生时，值得知道的只有「什么时候开始的、发生了多少次、什么时候恢复」。
 *
 * 规则：结局**变化**时打（含首次），其余静默；静默期间每隔这么多次补一条汇总，
 * 好让「一直没连上」不至于完全无声。60 次 × 15 秒 ≈ 15 分钟一条。
 */
const REPEAT_SUMMARY_EVERY = 60;
/**
 * 发出 register 之后等 `registered` 回执的上限。
 *
 * 这是本文件唯一防「静默失聪」的东西。原来的握手是**没有超时**的：
 * accept 成功后如果对端既不回 registered、也不断开（worker 的事件循环被同步的
 * UIA 操作占住时就是这样），客户端会一直挂着一条**已连接但未注册**的连接——
 * `start()` 的 `if (this.ws || this.connecting) return` 认为一切正常，不再重连，
 * 而 RPA 侧 `broadcast_to_agents` 只推给已注册连接，于是告警全部静默丢弃。
 * 刷屏至少还看得见，这个洞是彻底无声的。
 *
 * 取 8 秒：正常注册实测在 2ms 量级，8 秒有四个数量级的余量；同时小于 15 秒的
 * 重连间隔，保证「超时 → 关闭 → 重连」不会和下一次重连撞车。
 */
const REGISTER_TIMEOUT_MS = 8_000;
export class YokowebotWSClient extends EventEmitter {
    registerTimeoutMs;
    ws = null;
    url;
    autoDiscover;
    reconnectTimer = null;
    intentionalClose = false;
    connecting = false;
    registered = false;
    /** 上一次连接的结局；与本次相同则不再重复打日志。 */
    lastOutcome = null;
    /** 当前这个结局已经连续出现多少次。 */
    repeatCount = 0;
    /**
     * 本次尝试是否真的建立过连接。
     *
     * 用来分开「连不上」和「连上了但被踢」——这两件事 error 与 close 会**接连**触发，
     * 各报一次就会让两个结局交替出现，静默判定永远命中不了，日志照旧刷屏。
     */
    opened = false;
    /** 注册回执的等待计时器；收到回执或连接关闭时必须清掉，否则会误杀下一条连接。 */
    registerTimer = null;
    /** 本次尝试是否已因注册超时报告过结局，避免随后的 close 再报一次。 */
    registerTimedOut = false;
    constructor(url, registerTimeoutMs = REGISTER_TIMEOUT_MS) {
        super();
        this.registerTimeoutMs = registerTimeoutMs;
        this.autoDiscover = !url;
        this.url = url || getRpaWsUrl();
    }
    start() {
        if (this.ws || this.connecting)
            return;
        this.intentionalClose = false;
        this.connect();
    }
    /**
     * 记录本次连接的结局，并决定要不要打日志。
     *
     * 只有「结局变了」才值得说话：从失败恢复成注册成功、或者失败的原因换了。
     * 同一个结局连续发生时静默，仅按固定间隔补一条带次数的汇总——次数本身是信息
     * （"持续 3 小时"和"刚开始"是两回事），而重复三行不是。
     */
    noteOutcome(outcome, describe) {
        if (outcome === this.lastOutcome) {
            this.repeatCount += 1;
            if (this.repeatCount % REPEAT_SUMMARY_EVERY === 0) {
                console.log(`[webotWS] ${describe(this.repeatCount)}（已连续 ${this.repeatCount} 次，期间日志已静默）`);
            }
            return;
        }
        const suppressed = this.lastOutcome !== null && this.repeatCount > 1 ? this.repeatCount : 0;
        this.lastOutcome = outcome;
        this.repeatCount = 1;
        console.log(`[webotWS] ${describe(1)}` +
            (suppressed ? `（上一状态连续出现 ${suppressed} 次，其间日志已静默）` : ''));
    }
    stop() {
        this.intentionalClose = true;
        this.lastOutcome = null;
        this.repeatCount = 0;
        this.clearRegisterTimer();
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.removeAllListeners();
            this.ws.close();
            this.ws = null;
        }
        this.connecting = false;
    }
    clearRegisterTimer() {
        if (this.registerTimer) {
            clearTimeout(this.registerTimer);
            this.registerTimer = null;
        }
    }
    async refreshDiscoveredEndpoint() {
        if (!this.autoDiscover)
            return;
        const discoveredHttpUrl = await discoverRpaHttpUrl();
        if (!discoveredHttpUrl)
            return;
        const discoveredWsUrl = httpToWsUrl(discoveredHttpUrl);
        if (discoveredWsUrl !== this.url) {
            console.warn(`[webotWS] RPA endpoint moved; reconnecting to ${discoveredWsUrl}.`);
            this.url = discoveredWsUrl;
        }
    }
    async connect() {
        if (this.ws || this.connecting)
            return;
        this.connecting = true;
        await this.refreshDiscoveredEndpoint();
        // 连接尝试本身不再打日志：它每 15 秒发生一次，且不携带任何结论。
        // 有结论的是**结局**，交给 noteOutcome。
        this.opened = false;
        try {
            this.ws = new WebSocket(this.url);
            this.ws.on('open', () => {
                this.connecting = false;
                this.registered = false;
                this.opened = true;
                this.ws.send(JSON.stringify({
                    type: 'register',
                    clientType: 'agent',
                    clientId: CLIENT_ID,
                    subscribe: SUBSCRIBE_TOPICS,
                }));
                // 握手从这里开始计时。对端不回执也不断开时，只有这个计时器能把连接救回来。
                this.clearRegisterTimer();
                this.registerTimedOut = false;
                this.registerTimer = setTimeout(() => {
                    this.registerTimer = null;
                    if (this.registered || this.intentionalClose)
                        return;
                    this.registerTimedOut = true;
                    this.noteOutcome('register_timeout', () => `已连接但 ${this.registerTimeoutMs / 1000}s 内没收到注册回执，判定通道不可用并重连；` +
                        `告警类事件（微信需人工处理、AI 服务/配置异常）在此期间会丢失，` +
                        `定时任务与消息读写不受影响`);
                    try {
                        this.ws?.close();
                    }
                    catch { /* best effort */ }
                }, this.registerTimeoutMs);
            });
            this.ws.on('message', (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.type === 'ping') {
                        this.ws?.send(JSON.stringify({ type: 'pong' }));
                        return;
                    }
                    if (msg.type === 'registered') {
                        this.registered = true;
                        this.clearRegisterTimer();
                        this.noteOutcome('registered', () => `已注册为 agent 客户端（sessionId=${msg.sessionId}）`);
                        return;
                    }
                    if (msg.type === 'agent_event') {
                        this.dispatch(msg);
                    }
                }
                catch {
                    // Ignore non-JSON messages (e.g. old protocol UI messages)
                }
            });
            this.ws.on('close', () => {
                const wasRegistered = this.registered;
                this.registered = false;
                this.ws = null;
                this.connecting = false;
                this.clearRegisterTimer();
                if (this.intentionalClose)
                    return;
                if (this.registerTimedOut) {
                    // 结局已由超时分支报告，这里只负责排重连，别把同一件事说两遍。
                    this.scheduleReconnect();
                    return;
                }
                if (!this.opened) {
                    // 压根没连上，error 分支已经报过了，这里只负责安排重连。
                    this.scheduleReconnect();
                    return;
                }
                if (wasRegistered) {
                    this.noteOutcome('closed_after_register', () => `连接断开，${RECONNECT_DELAY_MS / 1000}s 后重连`);
                }
                else {
                    // 能连上、却在注册完成前就被断开 —— 这不是"RPA 没启动"，是它拒绝了 agent 注册。
                    // 两者的处置完全不同，所以文案必须把它们分开，否则排查时会一直去查服务有没有起来。
                    this.noteOutcome('closed_before_register', () => `RPA 服务在监听但未完成 agent 注册就断开连接；` +
                        `告警类事件（微信需人工处理、AI 服务/配置异常）将收不到，` +
                        `定时任务与消息读写不受影响。${RECONNECT_DELAY_MS / 1000}s 后重试`);
                }
                this.scheduleReconnect();
            });
            this.ws.on('ping', () => {
                this.ws?.pong();
            });
            this.ws.on('error', (err) => {
                // Let the 'close' event handle scheduling the reconnect
                const msg = err.message;
                if (this.opened) {
                    // 已经建立过连接，结局由 close 判定（未注册 / 已注册断开），这里不抢着报。
                    this.ws?.close();
                    return;
                }
                if (msg.includes('ECONNREFUSED')) {
                    // RPA 没启动是常态（没装插件的用户天天如此），只在状态变化时说一次。
                    this.noteOutcome('connect_failed', () => `连不上 RPA 服务（${this.url}），可能未启动；将持续重试`);
                }
                else {
                    this.noteOutcome('connect_failed', () => `连接出错：${msg}`);
                }
                this.ws?.close();
            });
        }
        catch (e) {
            this.connecting = false;
            this.noteOutcome('connect_failed', () => `建立连接失败：${e?.message || String(e)}`);
            if (!this.intentionalClose)
                this.scheduleReconnect();
        }
    }
    scheduleReconnect() {
        if (this.reconnectTimer)
            return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, RECONNECT_DELAY_MS);
    }
    dispatch(msg) {
        const alertType = HANDLED_EVENTS[msg.event];
        if (!alertType)
            return;
        const alert = {
            type: 'yokowebot_alert',
            alertType,
            eventId: msg.eventId,
            correlationId: msg.correlationId,
            timestamp: msg.timestamp,
            event: msg.event,
            context: msg.context ?? {},
            payload: msg.payload ?? {},
            actions: msg.actions ?? [],
        };
        this.emit('alert', alert);
    }
}
