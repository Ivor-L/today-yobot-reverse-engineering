// Compiled fragment from ../../packages/socket/src/classic/index.ts.
// The original TypeScript and import graph are not restored.

/**
 * Direct Cloud WebSocket client.
 *
 * This is the direct socket transport for an authenticated client. It defaults
 * to the web-dashboard registration profile and accepts an explicit profile for
 * other direct clients. It mirrors cloud-service's WebSocket relay protocol:
 * 1. register the client device;
 * 2. exchange the bearer token for a one-time `/ws` ticket;
 * 3. connect `/ws?ticket=...` using the browser WebSocket API;
 * 4. authenticate with `device.hello` or resume with `device.resume`;
 * 5. keep the session sequence contiguous, resuming when a frame is missing;
 * 6. publish raw cloud messages to subscribers;
 * 7. ACK eligible downlink envelopes with `client.received`.
 */ 


const APP_VERSION_HEADER_VALUE = '2.0.0';
// Keep this transport-level constant aligned with packages/api-client/src/platform-constants.ts.
const CLIENT_CAPABILITIES_HEADER_VALUE = 'chat.automation_card.v1,chat.brief_card.v1,chat.connector_auth_card.v1,chat.follow_up_recommendations.v1,chat.qa_cardflow_single.v1';
const CLIENT_PLATFORM_HEADER_VALUE = 'web';
const BACKOFF_BASE_MS = 250;
const BACKOFF_CAP_MS = 8000;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 30000;
const MIN_HEARTBEAT_INTERVAL_MS = 1000;
const MAX_HEARTBEAT_INTERVAL_MS = 60000;
const SETUP_REQUEST_TIMEOUT_MS = 15000;
const HANDSHAKE_TIMEOUT_MS = 15000;
const SEQUENCE_REORDER_WAIT_MS = 250;
const SOCKET_CLOSE_WATCHDOG_MS = 1000;
const MAX_SEQUENCE_REORDER_BUFFER_SIZE = 128;
const MAX_PENDING_CLIENT_LOG_UPLOAD_FRAMES = 16;
const MAX_SEQUENCE_RECOVERY_ATTEMPTS = 3;
const HEARTBEAT_ACK_MISS_THRESHOLD = 2;
// Hidden Chromium contexts may batch chained timers to roughly once per minute.
const HEARTBEAT_TIMER_GAP_FLOOR_MS = MAX_HEARTBEAT_INTERVAL_MS * 2 + 30000;
const MAX_ERROR_RESPONSE_LENGTH = 512;
const REPLACEMENT_TAKEOVER_DELAY_MS = 500;
const REPLACEMENT_STABILITY_RESET_MS = 30000;
const MAX_REPLACEMENT_TAKEOVER_ATTEMPTS = 1;
const REPLACED_BY_NEWER_CONNECTION_CLOSE_CODE = 4002;
const SEQUENCE_GAP_CLOSE_CODE = 4004;
const HANDSHAKE_TIMEOUT_CLOSE_CODE = 4005;
const HEARTBEAT_TIMEOUT_CLOSE_CODE = 4006;
const MANUAL_RESUME_CLOSE_CODE = 4007;
const WS_READY_OPEN = 1;
class ClassicSocketClient extends BaseSocketClient {
    constructor(config, options = {}){
        super(config), this.attempt = 0, this.aborted = false, this.connecting = false, this.started = false, this.socket = null, this.retryTimer = null, this.setupAbortController = null, this.heartbeatTimer = null, this.onlineListener = null, this.sessionId = null, this.negotiatedMessageProtocolVersion = null, this.lastContiguousSeq = 0, this.debugPacketLossArmed = false, this.lastHeartbeatIntervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS, this.sequenceGapRecovery = null, this.sequenceReorderBuffer = new Map(), this.socketLifecycleCleanup = null, this.requestResumeCurrentSocket = null, this.sendClientStatusCurrentSocket = null, this.sendClientLogUploadCurrentSocket = null, this.sendInvocationFrameCurrentSocket = null, this.sendInvocationAckCurrentSocket = null, this.pendingClientLogUploadFrames = [], this.lastRegisteredDeviceId = null, this.replacementTakeoverAttempts = 0, this.replacementStabilityTimer = null, this.awaitingHeartbeatAck = false, this.missedHeartbeatAckCount = 0;
        this.replacementPolicy = options.replacementPolicy ?? 'yield';
    }
    /** 最近一次注册成功的服务端设备 id（`device.hello` 与 push token 绑定的同一身份）。 */ get registeredDeviceId() {
        return this.lastRegisteredDeviceId;
    }
    start() {
        if (this.started || this.aborted) return;
        this.started = true;
        this.emitDebug({
            direction: 'internal',
            type: 'classic.start',
            socketStatus: 'connecting'
        });
        this.registerNetworkRecovery();
        void this.connect();
    }
    debugSetPacketLossEnabled(enabled) {
        if (this.debugPacketLossArmed === enabled) return;
        this.debugPacketLossArmed = enabled;
        this.emitDebug({
            direction: 'internal',
            type: 'socket.packet_loss_simulation',
            payload: {
                enabled
            }
        });
    }
    /**
   * 把 chat 在场状态经 `client.status` 帧发给云端（服务端据此维护
   * `device_presence` 并做用户级通知抑制）。仅在连接 accepted 后真正发送；
   * 未连接时返回 false，由调用方在下一次 connected 后补发。
   */ sendClientStatus(inChat) {
        if (this.aborted || !this.started || !this.sendClientStatusCurrentSocket) {
            return false;
        }
        return this.sendClientStatusCurrentSocket(inChat);
    }
    sendClientLogUpload(frame) {
        if (this.aborted || !this.started) {
            return false;
        }
        if (this.sendClientLogUploadCurrentSocket?.(frame)) {
            return true;
        }
        return this.enqueueClientLogUploadFrame(frame);
    }
    sendInvocationResult(result) {
        return this.sendInvocationFrame({
            ...result,
            type: 'invocation.result'
        });
    }
    sendInvocationAck(invocationId) {
        const normalized = invocationId.trim();
        if (!normalized || this.aborted || !this.started || !this.sendInvocationAckCurrentSocket) {
            return false;
        }
        return this.sendInvocationAckCurrentSocket(normalized);
    }
    sendInvocationFrame(frame) {
        if (this.aborted || !this.started || !this.sendInvocationFrameCurrentSocket) {
            return false;
        }
        return this.sendInvocationFrameCurrentSocket(frame);
    }
    requestResume() {
        if (this.aborted || !this.started) {
            return;
        }
        if (this.sessionId && this.requestResumeCurrentSocket) {
            this.requestResumeCurrentSocket();
            return;
        }
        this.fastForwardReconnect();
    }
    /**
   * 非破坏性重连提示，与 native 的 requestReconnectIfDisconnected 同语义：
   * 连接健康时不做任何事（requestResume 会主动断开健康连接走 resume 握手，
   * 不适合作为「远程推送到达」这类高频提示的响应——那会把连接打成重连循环）；
   * 仅在断线退避期快进重连计时立即重连。
   */ nudgeReconnect() {
        if (this.aborted || !this.started) {
            return;
        }
        if (this.sendClientStatusCurrentSocket) {
            return;
        }
        this.fastForwardReconnect();
    }
    fastForwardReconnect() {
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
            this.connect();
        }
    }
    close() {
        this.aborted = true;
        this.lastRegisteredDeviceId = null;
        this.setupAbortController?.abort();
        this.setupAbortController = null;
        this.pendingClientLogUploadFrames.length = 0;
        this.emitDebug({
            direction: 'internal',
            type: 'classic.close',
            socketStatus: 'closed'
        });
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }
        this.clearHeartbeat();
        this.clearReplacementStabilityTimer();
        this.socketLifecycleCleanup?.();
        this.socketLifecycleCleanup = null;
        this.sequenceReorderBuffer.clear();
        this.unregisterNetworkRecovery();
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
    clearHeartbeat() {
        this.awaitingHeartbeatAck = false;
        this.missedHeartbeatAckCount = 0;
        if (!this.heartbeatTimer) return;
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
    }
    clearReplacementStabilityTimer() {
        if (!this.replacementStabilityTimer) return;
        clearTimeout(this.replacementStabilityTimer);
        this.replacementStabilityTimer = null;
    }
    scheduleReplacementStabilityReset() {
        this.clearReplacementStabilityTimer();
        if (this.replacementPolicy !== 'bounded-takeover') return;
        this.replacementStabilityTimer = setTimeout(()=>{
            this.replacementStabilityTimer = null;
            this.replacementTakeoverAttempts = 0;
        }, REPLACEMENT_STABILITY_RESET_MS);
    }
    claimReplacementTakeoverAttempt() {
        if (this.replacementPolicy !== 'bounded-takeover' || this.replacementTakeoverAttempts >= MAX_REPLACEMENT_TAKEOVER_ATTEMPTS) {
            return null;
        }
        this.replacementTakeoverAttempts += 1;
        return this.replacementTakeoverAttempts;
    }
    scheduleRetry(delayMs) {
        if (this.aborted) return;
        this.emitDebug({
            direction: 'internal',
            type: 'socket.reconnect_scheduled',
            socketStatus: 'reconnecting',
            payload: {
                delayMs
            }
        });
        this.emit('willReconnect', delayMs);
        this.retryTimer = setTimeout(()=>{
            this.retryTimer = null;
            void this.connect();
        }, delayMs);
    }
    nextDelay() {
        const exp = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** this.attempt);
        this.attempt += 1;
        return Math.floor(Math.random() * exp);
    }
    async connect() {
        if (this.aborted || this.connecting || this.socket) return;
        this.connecting = true;
        if (!this.SocketImpl) {
            console.warn('[cloud websocket] WebSocket is unavailable');
            this.emitDebug({
                direction: 'internal',
                type: 'socket.unavailable',
                socketStatus: 'error',
                detail: 'WebSocket is unavailable'
            });
            this.scheduleRetry(this.nextDelay());
            this.connecting = false;
            return;
        }
        try {
            const token = await this.getAccessToken();
            if (this.aborted) return;
            if (!token) {
                this.emitDebug({
                    direction: 'internal',
                    type: 'auth.token_missing',
                    socketStatus: 'reconnecting'
                });
                this.scheduleRetry(this.nextDelay());
                return;
            }
            try {
                await this.openWithAccessToken(token);
            } catch (error) {
                if (!(error instanceof CloudWebSocketUnauthorizedError)) {
                    throw error;
                }
                this.emitDebug({
                    direction: 'internal',
                    type: 'socket.auth_retry',
                    socketStatus: 'reconnecting',
                    payload: {
                        code: error.code,
                        phase: error.phase
                    }
                });
                const refreshedToken = await this.getAccessToken({
                    forceRefresh: true,
                    staleToken: token
                });
                if (this.aborted) return;
                if (!refreshedToken) {
                    throw new CloudWebSocketAuthRecoveryError(error.phase, error.code, 'No refreshed access token was available');
                }
                try {
                    await this.openWithAccessToken(refreshedToken);
                } catch (retryError) {
                    if (retryError instanceof CloudWebSocketUnauthorizedError) {
                        this.lastRegisteredDeviceId = null;
                        this.emitDebug({
                            direction: 'internal',
                            type: 'socket.unauthorized',
                            socketStatus: 'unauthorized',
                            payload: {
                                code: retryError.code,
                                phase: retryError.phase
                            }
                        });
                        this.emit('unauthorized');
                        return;
                    }
                    throw retryError;
                }
            }
        } catch (err) {
            if (this.aborted) {
                return;
            }
            console.warn('[cloud websocket] connection setup failed', err);
            this.emitDebug({
                direction: 'internal',
                type: 'socket.setup_failed',
                socketStatus: 'error',
                ...err instanceof CloudWebSocketSetupError ? {
                    payload: {
                        ...err.status === undefined ? {} : {
                            code: err.status
                        },
                        phase: err.phase
                    }
                } : {},
                detail: err instanceof Error ? err.message : String(err)
            });
            this.scheduleRetry(this.nextDelay());
        } finally{
            this.connecting = false;
        }
    }
    async getAccessToken(options) {
        return await this.withSetupDeadline('token', async ()=>{
            return await this.config.getAccessToken(options);
        });
    }
    async openWithAccessToken(token) {
        const deviceId = await this.ensureRegisteredDevice(token);
        if (this.aborted) {
            return;
        }
        this.lastRegisteredDeviceId = deviceId;
        const ticket = await this.issueWebSocketTicket(token);
        if (this.aborted) {
            return;
        }
        this.openSocket(this.SocketImpl, ticket, deviceId);
    }
    registerNetworkRecovery() {
        const target = globalThis;
        if (this.onlineListener || typeof target.addEventListener !== 'function') return;
        this.onlineListener = ()=>{
            if (this.aborted || this.socket) return;
            if (this.retryTimer) {
                clearTimeout(this.retryTimer);
                this.retryTimer = null;
            }
            void this.connect();
        };
        target.addEventListener('online', this.onlineListener);
    }
    unregisterNetworkRecovery() {
        if (!this.onlineListener) return;
        const target = globalThis;
        target.removeEventListener?.('online', this.onlineListener);
        this.onlineListener = null;
    }
    async ensureRegisteredDevice(token) {
        const deviceProfile = this.config.deviceProfile ?? {
            name: 'Today Web',
            clientPlatform: 'web',
            clientType: 'web-dashboard',
            platform: browserPlatform(),
            version: APP_VERSION_HEADER_VALUE
        };
        return await this.withSetupDeadline('register', async (signal)=>{
            const response = await this.fetcher(`${this.baseUrl}/registry/devices`, {
                method: 'POST',
                headers: await this.buildHeaders(token, {
                    json: true
                }),
                body: JSON.stringify({
                    ...deviceProfile,
                    notificationEnabled: this.config.notifacations ?? false,
                    clientMachineId: this.deviceId
                }),
                signal
            });
            if (response.status === 401 || response.status === 403) {
                throw new CloudWebSocketUnauthorizedError('register', response.status);
            }
            if (!response.ok) {
                throw new Error(`Device registration failed: ${response.status} ${response.statusText}` + await describeErrorResponse(response));
            }
            const body = await classic_readJson(response);
            const deviceId = body.device?.id;
            if (typeof deviceId !== 'string' || deviceId.length === 0) {
                throw new Error('Device registration response did not include device.id');
            }
            return deviceId;
        });
    }
    async issueWebSocketTicket(token) {
        return await this.withSetupDeadline('ticket', async (signal)=>{
            const response = await this.fetcher(`${this.baseUrl}/ws-ticket`, {
                method: 'POST',
                headers: await this.buildHeaders(token),
                signal
            });
            if (response.status === 401 || response.status === 403) {
                throw new CloudWebSocketUnauthorizedError('ticket', response.status);
            }
            if (!response.ok) {
                throw new Error(`WebSocket ticket request failed: ${response.status} ${response.statusText}` + await describeErrorResponse(response));
            }
            const body = await classic_readJson(response);
            const ticket = body.ticket;
            if (typeof ticket !== 'string' || ticket.length === 0) {
                throw new Error('WebSocket ticket response did not include ticket');
            }
            const webSocketUrl = response.headers.get('x-websocket-url')?.trim();
            return {
                ticket,
                ...webSocketUrl ? {
                    webSocketUrl
                } : {}
            };
        });
    }
    async withSetupDeadline(phase, operation) {
        const controller = new AbortController();
        let timedOut = false;
        let handleAbort;
        this.setupAbortController = controller;
        const aborted = new Promise((_resolve, reject)=>{
            handleAbort = ()=>{
                reject(new Error(`Cloud WebSocket ${phase} was aborted`));
            };
            controller.signal.addEventListener('abort', handleAbort, {
                once: true
            });
        });
        const timer = setTimeout(()=>{
            timedOut = true;
            controller.abort();
        }, SETUP_REQUEST_TIMEOUT_MS);
        try {
            return await Promise.race([
                operation(controller.signal),
                aborted
            ]);
        } catch (error) {
            if (timedOut) {
                throw new CloudWebSocketSetupTimeoutError(phase);
            }
            throw error;
        } finally{
            clearTimeout(timer);
            if (handleAbort) {
                controller.signal.removeEventListener('abort', handleAbort);
            }
            if (this.setupAbortController === controller) {
                this.setupAbortController = null;
            }
        }
    }
    openSocket(SocketConstructor, ticket, deviceId) {
        this.clearHeartbeat();
        const ws = new SocketConstructor(ticket.webSocketUrl ?? buildWsUrl(this.baseUrl, ticket.ticket, this.origin));
        this.socket = ws;
        this.emitDebug({
            direction: 'internal',
            type: 'socket.opening',
            socketStatus: 'connecting'
        });
        let phase = 'opening';
        let resumeBaseSeq = 0;
        let handshakeTimer = null;
        let sequenceGapTimer = null;
        let closeWatchdogTimer = null;
        let terminationRequested = false;
        let terminationSettled = false;
        let waitingToConnectAfterHelloDrain = false;
        let retryDelayOverrideMs = null;
        let requestResumeCurrentSocket = null;
        let sendClientStatusCurrentSocket = null;
        let sendClientLogUploadCurrentSocket = null;
        let sendInvocationFrameCurrentSocket = null;
        let sendInvocationAckCurrentSocket = null;
        let clientLogUploadConnected = false;
        const clearHandshakeWatchdog = ()=>{
            if (!handshakeTimer) return;
            clearTimeout(handshakeTimer);
            handshakeTimer = null;
        };
        const clearSequenceGapWait = ()=>{
            if (!sequenceGapTimer) return;
            clearTimeout(sequenceGapTimer);
            sequenceGapTimer = null;
        };
        const clearCloseWatchdog = ()=>{
            if (!closeWatchdogTimer) return;
            clearTimeout(closeWatchdogTimer);
            closeWatchdogTimer = null;
        };
        const cleanupSocketLifecycle = ()=>{
            clearHandshakeWatchdog();
            clearSequenceGapWait();
            clearCloseWatchdog();
            clientLogUploadConnected = false;
            if (this.socketLifecycleCleanup === cleanupSocketLifecycle) {
                this.socketLifecycleCleanup = null;
            }
            if (this.requestResumeCurrentSocket === requestResumeCurrentSocket) {
                this.requestResumeCurrentSocket = null;
            }
            if (this.sendClientStatusCurrentSocket === sendClientStatusCurrentSocket) {
                this.sendClientStatusCurrentSocket = null;
            }
            if (this.sendClientLogUploadCurrentSocket === sendClientLogUploadCurrentSocket) {
                this.sendClientLogUploadCurrentSocket = null;
            }
            if (this.sendInvocationFrameCurrentSocket === sendInvocationFrameCurrentSocket) {
                this.sendInvocationFrameCurrentSocket = null;
            }
            if (this.sendInvocationAckCurrentSocket === sendInvocationAckCurrentSocket) {
                this.sendInvocationAckCurrentSocket = null;
            }
        };
        this.socketLifecycleCleanup = cleanupSocketLifecycle;
        const isSocketLifecycleActive = ()=>!this.aborted && !terminationRequested && !terminationSettled && this.socket === ws;
        const settleSocketClose = (event)=>{
            if (terminationSettled) return;
            terminationSettled = true;
            cleanupSocketLifecycle();
            this.clearHeartbeat();
            this.clearReplacementStabilityTimer();
            if (this.socket === ws) {
                this.socket = null;
            }
            if (this.aborted) return;
            if (event) {
                this.emitDebug({
                    direction: 'internal',
                    type: 'socket.close',
                    socketStatus: 'reconnecting',
                    payload: {
                        code: event.code,
                        reason: event.reason,
                        wasClean: event.wasClean
                    }
                });
                if (event.code === REPLACED_BY_NEWER_CONNECTION_CLOSE_CODE && !terminationRequested) {
                    const takeoverAttempt = this.claimReplacementTakeoverAttempt();
                    if (takeoverAttempt !== null) {
                        this.emitDebug({
                            direction: 'internal',
                            type: 'socket.replacement_takeover_scheduled',
                            socketStatus: 'reconnecting',
                            payload: {
                                attempt: takeoverAttempt,
                                delayMs: REPLACEMENT_TAKEOVER_DELAY_MS,
                                maxAttempts: MAX_REPLACEMENT_TAKEOVER_ATTEMPTS
                            },
                            detail: 'Retrying once so the current SharedWorker can replace a legacy connection'
                        });
                        this.scheduleRetry(REPLACEMENT_TAKEOVER_DELAY_MS);
                        return;
                    }
                    this.emit('willReconnect', 0);
                    this.emitDebug({
                        direction: 'internal',
                        type: 'socket.replacement_yielded',
                        socketStatus: 'closed',
                        payload: {
                            attempts: this.replacementTakeoverAttempts,
                            maxAttempts: MAX_REPLACEMENT_TAKEOVER_ATTEMPTS,
                            policy: this.replacementPolicy
                        },
                        detail: 'Yielded to the newer connection to prevent a reconnect loop'
                    });
                    return;
                }
            }
            this.scheduleRetry(retryDelayOverrideMs ?? this.nextDelay());
        };
        const terminateSocket = (code, reason, retryDelayMs)=>{
            if (this.aborted || terminationRequested || terminationSettled || this.socket !== ws) {
                return;
            }
            terminationRequested = true;
            retryDelayOverrideMs = retryDelayMs ?? null;
            clearHandshakeWatchdog();
            clearSequenceGapWait();
            this.clearHeartbeat();
            closeWatchdogTimer = setTimeout(()=>{
                if (terminationSettled || this.aborted) return;
                this.emitDebug({
                    direction: 'internal',
                    type: 'socket.close_watchdog_timeout',
                    socketStatus: 'reconnecting',
                    payload: {
                        code,
                        reason,
                        timeoutMs: SOCKET_CLOSE_WATCHDOG_MS
                    },
                    detail: 'WebSocket close event did not arrive; detaching the stale socket'
                });
                settleSocketClose();
            }, SOCKET_CLOSE_WATCHDOG_MS);
            try {
                ws.close(code, reason);
            } catch (error) {
                this.emitDebug({
                    direction: 'internal',
                    type: 'socket.close_failed',
                    socketStatus: 'reconnecting',
                    payload: {
                        code,
                        reason
                    },
                    detail: error instanceof Error ? error.message : String(error)
                });
                settleSocketClose();
            }
        };
        requestResumeCurrentSocket = ()=>{
            if (!isSocketLifecycleActive()) return;
            this.emitDebug({
                direction: 'internal',
                type: 'socket.resume_requested',
                socketStatus: 'reconnecting'
            });
            terminateSocket(MANUAL_RESUME_CLOSE_CODE, 'Manual resume', 0);
        };
        sendClientStatusCurrentSocket = (inChat)=>{
            if (!isSocketLifecycleActive()) {
                return false;
            }
            if (ws.readyState !== WS_READY_OPEN) {
                return false;
            }
            const packet = {
                type: 'client.status',
                inChat
            };
            ws.send(JSON.stringify(packet));
            this.emitDebug({
                direction: 'outgoing',
                type: packet.type,
                payload: packet
            });
            return true;
        };
        sendClientLogUploadCurrentSocket = (frame)=>{
            if (!isSocketLifecycleActive()) {
                return false;
            }
            if (ws.readyState !== WS_READY_OPEN) {
                return false;
            }
            if (!clientLogUploadConnected) {
                return false;
            }
            this.send(ws, frame);
            return true;
        };
        sendInvocationFrameCurrentSocket = (frame)=>{
            if (!isSocketLifecycleActive() || ws.readyState !== WS_READY_OPEN || phase !== 'accepted') {
                return false;
            }
            this.send(ws, frame);
            return true;
        };
        sendInvocationAckCurrentSocket = (invocationId)=>{
            if (!isSocketLifecycleActive() || ws.readyState !== WS_READY_OPEN || phase !== 'accepted' && phase !== 'resume') {
                return false;
            }
            this.send(ws, {
                invocationId,
                type: 'invocation.ack'
            });
            return true;
        };
        const maxBufferedSequence = ()=>{
            let maximum = null;
            for (const sequence of this.sequenceReorderBuffer.keys()){
                maximum = maximum === null ? sequence : Math.max(maximum, sequence);
            }
            return maximum;
        };
        const hasSequenceGap = ()=>this.sequenceReorderBuffer.size > 0 && !this.sequenceReorderBuffer.has(this.lastContiguousSeq + 1);
        const abandonSequenceState = (detail)=>{
            this.emitBufferedSequenceFramesBestEffort(detail);
            this.resetSequenceForFreshSession();
        };
        const recoverSequenceGap = (expectedSeq, receivedSeq, detail)=>{
            if (terminationRequested || terminationSettled) return;
            const lastContiguousSeq = this.lastContiguousSeq;
            if (!this.sessionId) {
                this.emitDebug({
                    direction: 'internal',
                    type: 'socket.sequence_recovery_abandoned',
                    socketStatus: 'reconnecting',
                    payload: {
                        expectedSeq,
                        receivedSeq,
                        recoveryAttempts: 0,
                        reason: 'missing_session_id'
                    },
                    detail: 'Cannot resume a session without its id; starting a fresh session'
                });
                abandonSequenceState('Session id was unavailable while recovering a sequence gap');
                terminateSocket(SEQUENCE_GAP_CLOSE_CODE, 'Sequence gap');
                return;
            }
            const recovery = this.registerSequenceGap(expectedSeq, receivedSeq);
            const resetSession = recovery.attempt >= MAX_SEQUENCE_RECOVERY_ATTEMPTS;
            this.emitDebug({
                direction: 'internal',
                type: 'socket.sequence_gap',
                socketStatus: 'reconnecting',
                payload: {
                    expectedSeq,
                    receivedSeq,
                    lastContiguousSeq,
                    recoveryAttempt: recovery.attempt,
                    resetSession
                },
                detail
            });
            if (resetSession) {
                this.emitDebug({
                    direction: 'internal',
                    type: 'socket.sequence_recovery_abandoned',
                    socketStatus: 'reconnecting',
                    payload: {
                        expectedSeq,
                        receivedSeq,
                        recoveryAttempts: recovery.attempt,
                        reason: 'retry_limit'
                    },
                    detail: 'Replay could not fill the sequence gap; starting a fresh session'
                });
                abandonSequenceState('Sequence replay retry limit was reached');
            }
            terminateSocket(SEQUENCE_GAP_CLOSE_CODE, 'Sequence gap');
        };
        const scheduleSequenceGapWait = ()=>{
            if (sequenceGapTimer || terminationRequested || terminationSettled || phase !== 'accepted' || !hasSequenceGap()) {
                return;
            }
            const receivedSeq = maxBufferedSequence();
            if (receivedSeq === null) return;
            sequenceGapTimer = setTimeout(()=>{
                sequenceGapTimer = null;
                if (this.aborted || terminationRequested || terminationSettled || this.socket !== ws || !hasSequenceGap()) {
                    return;
                }
                recoverSequenceGap(this.lastContiguousSeq + 1, maxBufferedSequence() ?? receivedSeq, 'Sequenced websocket frame was missing after the reorder wait');
            }, SEQUENCE_REORDER_WAIT_MS);
        };
        const commitSequenceMessage = (sequence, message)=>{
            this.lastContiguousSeq = sequence;
            this.advanceSequenceGapRecovery(sequence);
            this.emitDeliveredMessage(message);
        };
        const drainSequenceBuffer = ()=>{
            if (!isSocketLifecycleActive()) return false;
            clearSequenceGapWait();
            let nextSequence = this.lastContiguousSeq + 1;
            let bufferedMessage = this.sequenceReorderBuffer.get(nextSequence);
            while(bufferedMessage){
                this.sequenceReorderBuffer.delete(nextSequence);
                commitSequenceMessage(nextSequence, bufferedMessage);
                if (!isSocketLifecycleActive()) return false;
                nextSequence = this.lastContiguousSeq + 1;
                bufferedMessage = this.sequenceReorderBuffer.get(nextSequence);
            }
            scheduleSequenceGapWait();
            return !hasSequenceGap();
        };
        const bufferSequenceMessage = (sequence, message)=>{
            if (this.sequenceReorderBuffer.has(sequence)) {
                this.emitDebug({
                    direction: 'internal',
                    type: 'socket.sequence_buffer_duplicate',
                    payload: {
                        receivedSeq: sequence
                    }
                });
                return;
            }
            this.sequenceReorderBuffer.set(sequence, message);
            const recovery = this.sequenceGapRecovery;
            if (recovery && sequence > recovery.receivedSeq) {
                this.sequenceGapRecovery = {
                    ...recovery,
                    receivedSeq: sequence
                };
            }
            this.emitDebug({
                direction: 'internal',
                type: 'socket.sequence_buffered',
                payload: {
                    receivedSeq: sequence,
                    expectedSeq: this.lastContiguousSeq + 1,
                    bufferSize: this.sequenceReorderBuffer.size
                }
            });
            if (this.sequenceReorderBuffer.size > MAX_SEQUENCE_REORDER_BUFFER_SIZE) {
                this.emitDebug({
                    direction: 'internal',
                    type: 'socket.sequence_buffer_overflow',
                    socketStatus: 'reconnecting',
                    payload: {
                        bufferSize: this.sequenceReorderBuffer.size,
                        maxBufferSize: MAX_SEQUENCE_REORDER_BUFFER_SIZE
                    },
                    detail: 'The sequence reorder buffer reached its safety limit'
                });
                abandonSequenceState('Sequence reorder buffer overflowed');
                terminateSocket(SEQUENCE_GAP_CLOSE_CODE, 'Sequence buffer overflow');
                return;
            }
            scheduleSequenceGapWait();
        };
        const beginHandshake = (nextPhase)=>{
            if (!isSocketLifecycleActive()) return;
            clearHandshakeWatchdog();
            phase = nextPhase;
            handshakeTimer = setTimeout(()=>{
                handshakeTimer = null;
                if (this.aborted || terminationRequested || terminationSettled || phase !== nextPhase || this.socket !== ws) {
                    return;
                }
                this.emitDebug({
                    direction: 'internal',
                    type: 'socket.handshake_timeout',
                    socketStatus: 'reconnecting',
                    payload: {
                        phase: nextPhase,
                        timeoutMs: HANDSHAKE_TIMEOUT_MS
                    },
                    detail: `Timed out waiting for cloud.${nextPhase === 'hello' ? 'hello_ack' : 'resume_ok'}`
                });
                if (!isSocketLifecycleActive()) return;
                if (nextPhase === 'hello') {
                    abandonSequenceState('Fresh session handshake timed out');
                }
                terminateSocket(HANDSHAKE_TIMEOUT_CLOSE_CODE, 'Handshake timeout');
            }, HANDSHAKE_TIMEOUT_MS);
        };
        const markConnected = ()=>{
            if (!isSocketLifecycleActive()) return;
            const messageProtocolVersion = this.negotiatedMessageProtocolVersion;
            if (!messageProtocolVersion) {
                terminateSocket(HANDSHAKE_TIMEOUT_CLOSE_CODE, 'Missing Message protocol negotiation');
                return;
            }
            waitingToConnectAfterHelloDrain = false;
            phase = 'accepted';
            clientLogUploadConnected = true;
            this.requestResumeCurrentSocket = requestResumeCurrentSocket;
            this.sendClientStatusCurrentSocket = sendClientStatusCurrentSocket;
            this.sendClientLogUploadCurrentSocket = sendClientLogUploadCurrentSocket;
            this.flushPendingClientLogUploadFrames(ws);
            this.scheduleReplacementStabilityReset();
            this.startHeartbeat(ws, deviceId, this.lastHeartbeatIntervalMs, ()=>{
                this.emitDebug({
                    direction: 'internal',
                    type: 'socket.heartbeat_ack_timeout',
                    socketStatus: 'reconnecting',
                    payload: {
                        missedAcks: HEARTBEAT_ACK_MISS_THRESHOLD
                    },
                    detail: 'Heartbeat acknowledgements stopped arriving'
                });
                terminateSocket(HEARTBEAT_TIMEOUT_CLOSE_CODE, 'Heartbeat acknowledgement timeout');
            }, ()=>requestResumeCurrentSocket?.());
            this.attempt = 0;
            this.emitDebug({
                direction: 'internal',
                type: 'socket.connected',
                socketStatus: 'connected'
            });
            if (!isSocketLifecycleActive()) return;
            this.emit('connected', messageProtocolVersion);
        };
        ws.addEventListener('open', ()=>{
            if (!isSocketLifecycleActive()) return;
            this.sendClientLogUploadCurrentSocket = sendClientLogUploadCurrentSocket;
            this.sendInvocationFrameCurrentSocket = sendInvocationFrameCurrentSocket;
            this.sendInvocationAckCurrentSocket = sendInvocationAckCurrentSocket;
            this.emitDebug({
                direction: 'internal',
                type: 'socket.open',
                socketStatus: 'connecting'
            });
            if (!isSocketLifecycleActive()) return;
            if (this.sessionId) {
                resumeBaseSeq = this.lastContiguousSeq;
                this.send(ws, {
                    type: 'device.resume',
                    sessionId: this.sessionId,
                    lastSeq: resumeBaseSeq
                });
                beginHandshake('resume');
                drainSequenceBuffer();
                return;
            }
            if (this.sequenceReorderBuffer.size > 0) {
                abandonSequenceState('A fresh connection cannot reuse buffered frames from an old session');
            } else {
                this.resetSequenceForFreshSession();
            }
            if (!isSocketLifecycleActive()) return;
            this.sendHello(ws, deviceId);
            beginHandshake('hello');
        });
        ws.addEventListener('message', (event)=>{
            if (!isSocketLifecycleActive()) return;
            const raw = typeof event.data === 'string' ? event.data : String(event.data);
            const message = parseJsonRecord(raw);
            if (!message) {
                this.emitDebug({
                    direction: 'incoming',
                    type: 'socket.parse_error',
                    socketStatus: 'error',
                    payload: {
                        raw
                    }
                });
                return;
            }
            const sequence = trackedSequenceFromMessage(message);
            if (this.debugPacketLossArmed && sequence !== null && sequence === this.lastContiguousSeq + 1) {
                this.debugPacketLossArmed = false;
                this.emitDebug({
                    direction: 'incoming',
                    type: 'socket.packet_dropped_simulated',
                    payload: {
                        messageType: getMessageType(message),
                        seq: sequence
                    },
                    detail: 'Dropped before acknowledgement, sequence tracking, or event delivery'
                });
                return;
            }
            this.emitDebug({
                direction: 'incoming',
                type: getMessageType(message),
                payload: message
            });
            if (!isSocketLifecycleActive()) return;
            if (message.type === 'cloud.heartbeat_ack') {
                this.awaitingHeartbeatAck = false;
                this.missedHeartbeatAckCount = 0;
            }
            if (sequence !== null) {
                this.acknowledgeDownlink(ws, message);
                if (!isSocketLifecycleActive()) return;
                if (sequence <= this.lastContiguousSeq) {
                    this.emitDebug({
                        direction: 'internal',
                        type: 'socket.sequence_duplicate',
                        payload: {
                            receivedSeq: sequence,
                            lastContiguousSeq: this.lastContiguousSeq
                        }
                    });
                    return;
                }
                if (phase === 'hello') {
                    bufferSequenceMessage(sequence, message);
                    return;
                }
                const expectedSequence = this.lastContiguousSeq + 1;
                if (sequence > expectedSequence) {
                    bufferSequenceMessage(sequence, message);
                    return;
                }
                clearSequenceGapWait();
                commitSequenceMessage(sequence, message);
                const drainedCompletely = drainSequenceBuffer();
                if (drainedCompletely && waitingToConnectAfterHelloDrain) {
                    markConnected();
                }
                return;
            }
            if (message.type === 'cloud.resume_ok') {
                if (phase !== 'resume') {
                    this.emit('message', message);
                    if (!isSocketLifecycleActive()) return;
                    this.emitDebug({
                        direction: 'internal',
                        type: 'socket.handshake_duplicate',
                        payload: {
                            phase,
                            messageType: message.type
                        }
                    });
                    return;
                }
                clearHandshakeWatchdog();
                drainSequenceBuffer();
                if (!isSocketLifecycleActive()) return;
                const replayedCount = nonNegativeSafeInteger(message.replayedCount) ?? 0;
                const replayTarget = safeSequenceSum(resumeBaseSeq, replayedCount);
                const recoveryTarget = this.sequenceGapRecovery?.receivedSeq ?? 0;
                const bufferedTarget = maxBufferedSequence() ?? 0;
                const requiredSequence = Math.max(replayTarget, recoveryTarget, bufferedTarget);
                if (this.lastContiguousSeq < requiredSequence) {
                    recoverSequenceGap(this.lastContiguousSeq + 1, requiredSequence, 'Session replay completed without delivering every advertised sequence');
                    return;
                }
                this.sequenceGapRecovery = null;
                this.emit('message', message);
                if (!isSocketLifecycleActive()) return;
                markConnected();
                return;
            }
            this.acknowledgeDownlink(ws, message);
            if (!isSocketLifecycleActive()) return;
            this.emit('message', message);
            if (!isSocketLifecycleActive()) return;
            switch(message.type){
                case 'cloud.hello_ack':
                    if (phase !== 'hello') {
                        this.emitDebug({
                            direction: 'internal',
                            type: 'socket.handshake_duplicate',
                            payload: {
                                phase,
                                messageType: message.type
                            }
                        });
                        return;
                    }
                    clearHandshakeWatchdog();
                    this.negotiatedMessageProtocolVersion = messageProtocolVersionFromHelloAck(message);
                    if (!this.negotiatedMessageProtocolVersion) {
                        this.emitDebug({
                            direction: 'internal',
                            type: 'socket.handshake_protocol_invalid',
                            socketStatus: 'error',
                            payload: {
                                messageProtocolVersion: message.messageProtocolVersion
                            },
                            detail: 'cloud.hello_ack returned an unsupported Message protocol version'
                        });
                        terminateSocket(HANDSHAKE_TIMEOUT_CLOSE_CODE, 'Invalid Message protocol negotiation');
                        return;
                    }
                    this.sessionId = typeof message.sessionId === 'string' ? message.sessionId : this.sessionId;
                    this.lastHeartbeatIntervalMs = heartbeatIntervalFromAck(message);
                    phase = 'accepted';
                    waitingToConnectAfterHelloDrain = true;
                    if (!drainSequenceBuffer()) return;
                    markConnected();
                    return;
                case 'cloud.resume_failed':
                    if (phase !== 'resume') return;
                    clearHandshakeWatchdog();
                    abandonSequenceState('Cloud rejected the resumable session');
                    if (!isSocketLifecycleActive()) return;
                    this.sendHello(ws, deviceId);
                    beginHandshake('hello');
                    return;
                case 'event.push':
                    this.handleEventPush(message);
                    return;
                case 'error':
                    console.warn('[cloud websocket] error frame', message);
                    return;
                default:
                    return;
            }
        });
        ws.addEventListener('error', (event)=>{
            if (terminationSettled) return;
            console.warn('[cloud websocket] socket error', event);
            this.emitDebug({
                direction: 'internal',
                type: 'socket.error',
                socketStatus: 'error',
                detail: 'WebSocket emitted an error'
            });
        });
        ws.addEventListener('close', (event)=>{
            settleSocketClose(event);
        });
    }
    sendHello(ws, deviceId) {
        this.send(ws, {
            type: 'device.hello',
            deviceId,
            tools: [],
            ...this.config.messageProtocolVersion ? {
                messageProtocolVersion: this.config.messageProtocolVersion
            } : {}
        });
    }
    startHeartbeat(ws, deviceId, intervalMs, onMissedAcknowledgements, onLongTimerGap) {
        this.clearHeartbeat();
        let safeIntervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS;
        if (typeof intervalMs === 'number' && Number.isFinite(intervalMs) && intervalMs > 0) {
            if (intervalMs < MIN_HEARTBEAT_INTERVAL_MS) {
                safeIntervalMs = MIN_HEARTBEAT_INTERVAL_MS;
            } else if (intervalMs > MAX_HEARTBEAT_INTERVAL_MS) {
                safeIntervalMs = MAX_HEARTBEAT_INTERVAL_MS;
            } else {
                safeIntervalMs = intervalMs;
            }
        }
        const timerGapThresholdMs = Math.max(safeIntervalMs * 3, HEARTBEAT_TIMER_GAP_FLOOR_MS);
        let lastTickAt = Date.now();
        this.heartbeatTimer = setInterval(()=>{
            const tickAt = Date.now();
            const elapsedMs = tickAt - lastTickAt;
            lastTickAt = tickAt;
            if (elapsedMs > timerGapThresholdMs) {
                onLongTimerGap();
                return;
            }
            if (this.awaitingHeartbeatAck) {
                this.missedHeartbeatAckCount += 1;
                if (this.missedHeartbeatAckCount >= HEARTBEAT_ACK_MISS_THRESHOLD) {
                    onMissedAcknowledgements();
                    return;
                }
            }
            this.send(ws, {
                type: 'device.heartbeat',
                deviceId
            });
            this.awaitingHeartbeatAck = true;
        }, safeIntervalMs);
    }
    emitDeliveredMessage(message) {
        this.emit('message', message);
        if (message.type === 'event.push') {
            this.handleEventPush(message);
            return;
        }
        if (message.type === 'error') {
            console.warn('[cloud websocket] error frame', message);
        }
    }
    emitBufferedSequenceFramesBestEffort(detail) {
        if (this.sequenceReorderBuffer.size === 0) return;
        const bufferedFrames = [
            ...this.sequenceReorderBuffer.entries()
        ].sort(([leftSequence], [rightSequence])=>leftSequence - rightSequence);
        this.sequenceReorderBuffer.clear();
        this.emitDebug({
            direction: 'internal',
            type: 'socket.sequence_buffer_degraded',
            payload: {
                sequences: bufferedFrames.map(([sequence])=>sequence),
                frameCount: bufferedFrames.length,
                acknowledgedOnReceipt: true,
                acknowledgementTiming: 'on_receipt_when_eligible'
            },
            detail
        });
        for (const [, message] of bufferedFrames){
            this.emitDeliveredMessage(message);
        }
    }
    resetSequenceForFreshSession() {
        this.sessionId = null;
        this.negotiatedMessageProtocolVersion = null;
        this.lastContiguousSeq = 0;
        this.sequenceGapRecovery = null;
        this.sequenceReorderBuffer.clear();
    }
    handleEventPush(message) {
        const eventPush = toCloudEventPushMessage(message);
        if (!eventPush) return;
        this.emit('eventPush', eventPush);
    }
    acknowledgeDownlink(ws, message) {
        const origin = acknowledgementOrigin(message);
        if (!origin) return;
        this.send(ws, {
            type: 'client.received',
            originId: origin.id,
            originType: origin.type,
            ...origin.seq !== undefined ? {
                originSeq: origin.seq
            } : {},
            originTimestamp: origin.timestamp
        });
    }
    registerSequenceGap(expectedSeq, receivedSeq) {
        const previous = this.sequenceGapRecovery;
        const recovery = previous?.expectedSeq === expectedSeq ? {
            attempt: previous.attempt + 1,
            expectedSeq,
            receivedSeq: Math.max(previous.receivedSeq, receivedSeq)
        } : {
            attempt: 1,
            expectedSeq,
            receivedSeq
        };
        this.sequenceGapRecovery = recovery;
        return recovery;
    }
    advanceSequenceGapRecovery(sequence) {
        const recovery = this.sequenceGapRecovery;
        if (!recovery) return;
        if (sequence >= recovery.receivedSeq) {
            this.sequenceGapRecovery = null;
            return;
        }
        this.sequenceGapRecovery = {
            ...recovery,
            expectedSeq: sequence + 1
        };
    }
    async buildHeaders(token, options = {}) {
        const headers = new Headers();
        const acceptLanguage = await this.config.getAcceptLanguage?.();
        if (acceptLanguage) headers.set('Accept-Language', acceptLanguage);
        headers.set('Authorization', `Bearer ${token}`);
        headers.set('X-App-Version', this.config.deviceProfile?.version ?? APP_VERSION_HEADER_VALUE);
        headers.set('X-Client-Capabilities', CLIENT_CAPABILITIES_HEADER_VALUE);
        headers.set('X-Client-Platform', this.config.clientPlatformHeader ?? CLIENT_PLATFORM_HEADER_VALUE);
        headers.set('X-Device-Id', this.deviceId);
        const lane = this.config.trafficLane?.trim();
        if (lane) headers.set('X-Traffic-Lane', lane);
        if (options.json) headers.set('Content-Type', 'application/json');
        return headers;
    }
    send(ws, body) {
        if (ws.readyState !== WS_READY_OPEN) return;
        const packet = {
            id: randomId(),
            timestamp: new Date().toISOString(),
            ...body
        };
        ws.send(JSON.stringify(packet));
        this.emitDebug({
            direction: 'outgoing',
            type: getMessageType(packet),
            payload: packet
        });
    }
    enqueueClientLogUploadFrame(frame) {
        const isTerminal = frame.type === CLIENT_LOG_UPLOAD_COMPLETED_FRAME_TYPE || frame.type === CLIENT_LOG_UPLOAD_FAILED_FRAME_TYPE;
        const existingTerminalIndex = this.pendingClientLogUploadFrames.findIndex((pending)=>pending.requestId === frame.requestId && (pending.type === CLIENT_LOG_UPLOAD_COMPLETED_FRAME_TYPE || pending.type === CLIENT_LOG_UPLOAD_FAILED_FRAME_TYPE));
        if (existingTerminalIndex >= 0) {
            if (isTerminal) {
                this.pendingClientLogUploadFrames[existingTerminalIndex] = frame;
            }
            return true;
        }
        const existingProgressIndex = this.pendingClientLogUploadFrames.findIndex((pending)=>pending.type === CLIENT_LOG_UPLOAD_PROGRESS_FRAME_TYPE && pending.requestId === frame.requestId);
        const existingAcceptedIndex = this.pendingClientLogUploadFrames.findIndex((pending)=>pending.type === CLIENT_LOG_UPLOAD_ACCEPTED_FRAME_TYPE && pending.requestId === frame.requestId);
        if (frame.type === CLIENT_LOG_UPLOAD_ACCEPTED_FRAME_TYPE && existingAcceptedIndex >= 0) {
            return true;
        }
        if (frame.type === CLIENT_LOG_UPLOAD_PROGRESS_FRAME_TYPE && existingProgressIndex >= 0) {
            this.pendingClientLogUploadFrames[existingProgressIndex] = frame;
            return true;
        }
        if (isTerminal) {
            for(let index = this.pendingClientLogUploadFrames.length - 1; index >= 0; index -= 1){
                const pending = this.pendingClientLogUploadFrames[index];
                if (pending.requestId === frame.requestId && pending.type === CLIENT_LOG_UPLOAD_PROGRESS_FRAME_TYPE) {
                    this.pendingClientLogUploadFrames.splice(index, 1);
                }
            }
        }
        if (this.pendingClientLogUploadFrames.length >= MAX_PENDING_CLIENT_LOG_UPLOAD_FRAMES) {
            const queuedProgressIndex = this.pendingClientLogUploadFrames.findIndex((pending)=>pending.type === CLIENT_LOG_UPLOAD_PROGRESS_FRAME_TYPE);
            if (queuedProgressIndex >= 0) {
                this.pendingClientLogUploadFrames.splice(queuedProgressIndex, 1);
            } else {
                // Cloud admits one active upload per device. If that invariant is violated, preserve
                // already accepted request sequences instead of silently evicting an accepted/terminal.
                return false;
            }
        }
        this.pendingClientLogUploadFrames.push(frame);
        return true;
    }
    flushPendingClientLogUploadFrames(ws) {
        while(this.pendingClientLogUploadFrames.length > 0){
            if (ws.readyState !== WS_READY_OPEN) {
                return;
            }
            const frame = this.pendingClientLogUploadFrames[0];
            this.send(ws, frame);
            this.pendingClientLogUploadFrames.shift();
        }
    }
    emitDebug(event) {
        this.emit('debug', {
            timestamp: event.timestamp ?? new Date().toISOString(),
            socketType: 'not-shared',
            source: 'classic',
            ...event
        });
    }
}
const messageProtocolVersionFromHelloAck = (message)=>{
    const value = message.messageProtocolVersion;
    // Older Cloud deployments did not include this additive field. Such a fresh
    // handshake is a Legacy connection; an explicit unknown value is invalid.
    if (value === undefined) return 'legacy';
    if (value === 'legacy' || value === 'canonical-v1') return value;
    return null;
};
function startCloudWebSocket(config) {
    const client = new ClassicSocketClient(config);
    client.start();
    return client;
}
class CloudWebSocketSetupError extends Error {
    constructor(message, phase, status){
        super(message), this.phase = phase, this.status = status;
    }
}
class CloudWebSocketUnauthorizedError extends CloudWebSocketSetupError {
    constructor(phase, code){
        super(`Cloud WebSocket ${phase} credentials were rejected (${code})`, phase, code), this.code = code;
        this.name = 'CloudWebSocketUnauthorizedError';
    }
}
class CloudWebSocketAuthRecoveryError extends CloudWebSocketSetupError {
    constructor(phase, status, detail){
        super(`${detail} after Cloud WebSocket ${phase} returned ${status}`, phase, status);
        this.name = 'CloudWebSocketAuthRecoveryError';
    }
}
class CloudWebSocketSetupTimeoutError extends CloudWebSocketSetupError {
    constructor(phase){
        super(`Cloud WebSocket ${phase} timed out after ${SETUP_REQUEST_TIMEOUT_MS}ms`, phase);
        this.name = 'CloudWebSocketSetupTimeoutError';
    }
}
const trackedSequenceFromMessage = (message)=>{
    const sequence = acknowledgedSequenceFromMessage(message);
    return sequence !== null && sequence > 0 ? sequence : null;
};
const acknowledgedSequenceFromMessage = (message)=>{
    return nonNegativeSafeInteger(message.seq);
};
const nonNegativeSafeInteger = (value)=>typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
const safeSequenceSum = (left, right)=>{
    const sum = left + right;
    return Number.isSafeInteger(sum) ? sum : Number.MAX_SAFE_INTEGER;
};
const acknowledgementOrigin = (message)=>{
    const id = typeof message.id === 'string' ? message.id.trim() : '';
    const timestamp = typeof message.timestamp === 'string' ? message.timestamp.trim() : '';
    if (!id || !timestamp) return null;
    const messageType = typeof message.type === 'string' ? message.type : '';
    let originType;
    switch(messageType){
        case 'event.push':
            {
                const payload = classic_isRecord(message.payload) ? message.payload : null;
                originType = typeof payload?.event === 'string' ? payload.event.trim() : '';
                break;
            }
        case 'invocation.request':
        case 'invocation.cancel':
        case 'cloud.pending_invocations':
            originType = messageType;
            break;
        default:
            return null;
    }
    if (!originType) return null;
    const sequence = acknowledgedSequenceFromMessage(message);
    return {
        id,
        type: originType,
        timestamp,
        ...sequence !== null ? {
            seq: sequence
        } : {}
    };
};
function toCloudEventPushMessage(message) {
    if (message.type !== 'event.push') return null;
    const payload = classic_isRecord(message.payload) ? message.payload : null;
    const event = typeof payload?.event === 'string' ? payload.event : '';
    if (!payload || !event) return null;
    const sequence = acknowledgedSequenceFromMessage(message);
    return {
        type: 'event.push',
        ...typeof message.id === 'string' ? {
            id: message.id
        } : {},
        ...typeof message.timestamp === 'string' ? {
            timestamp: message.timestamp
        } : {},
        ...sequence !== null ? {
            seq: sequence
        } : {},
        payload: {
            ...payload,
            event
        }
    };
}
async function classic_readJson(response) {
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text);
}
/**
 * 把错误响应体压成一行接在错误消息后面。
 *
 * 只有状态码时（`400 Bad Request`）根本看不出是哪个字段被拒，而这类失败会
 * 无限重试，日志里堆几百条一模一样的消息也定位不了问题。
 *
 * 读取本身失败时返回空串：诊断信息缺失也不能盖掉原始的 HTTP 错误。
 */ async function describeErrorResponse(response) {
    try {
        const text = (await response.text()).trim();
        if (!text) {
            return '';
        }
        const collapsed = text.replaceAll(/\s+/gu, ' ');
        if (collapsed.length <= MAX_ERROR_RESPONSE_LENGTH) {
            return ` — ${collapsed}`;
        }
        return ` — ${collapsed.slice(0, MAX_ERROR_RESPONSE_LENGTH)}…`;
    } catch  {
        return '';
    }
}
function buildWsUrl(baseUrl, ticket, origin) {
    const url = new URL(`${trimTrailingSlashes(baseUrl)}/ws`, origin);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.searchParams.set('ticket', ticket);
    return url.toString();
}
function heartbeatIntervalFromAck(message) {
    const value = message.heartbeatIntervalMs;
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        return DEFAULT_HEARTBEAT_INTERVAL_MS;
    }
    if (value < MIN_HEARTBEAT_INTERVAL_MS) {
        return MIN_HEARTBEAT_INTERVAL_MS;
    }
    if (value > MAX_HEARTBEAT_INTERVAL_MS) {
        return MAX_HEARTBEAT_INTERVAL_MS;
    }
    return value;
}
function parseJsonRecord(raw) {
    try {
        const value = JSON.parse(raw);
        return classic_isRecord(value) ? value : null;
    } catch  {
        return null;
    }
}
function classic_isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function getMessageType(message) {
    return typeof message.type === 'string' && message.type.trim() ? message.type : 'message';
}
function browserPlatform() {
    if (typeof navigator === 'undefined') return undefined;
    const userAgentData = navigator.userAgentData;
    const platform = userAgentData?.platform || navigator.platform;
    return platform?.trim() || undefined;
}
function randomId() {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
