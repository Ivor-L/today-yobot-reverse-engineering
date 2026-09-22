// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/socket/index.ts.
// The original TypeScript and import graph are not restored.



























/** 与 `scheduleToolCatalogSyncRetry` 同一口径：只有 Conflict 不会重试，是服务端的明确拒绝。 */ const isToolCatalogSyncRejected = (error)=>error instanceof interface_error_InterfaceError && error.code === base_InterfaceErrorCode.Conflict;
class SocketShellService extends readonly_events_ReadonlyEvents {
    async subscribe(eventName, listener) {
        const subscription = await super.subscribe(eventName, listener);
        this.demanded = true;
        try {
            await this.ensureStarted();
        } catch  {}
        return subscription;
    }
    async initialize() {
        if (this.initialized) {
            return;
        }
        if (this.initialization) {
            await this.initialization;
            return;
        }
        const initialization = this.performInitialize();
        this.initialization = initialization;
        try {
            await initialization;
            this.initialized = true;
        } finally{
            if (this.initialization === initialization) {
                this.initialization = undefined;
            }
        }
    }
    async start() {
        this.demanded = true;
        await this.ensureStarted();
    }
    /**
   * Waits for the current consent snapshot to reach this connection's device registry.
   *
   * `requireServerAck: false`：本地 connector 授权是权威状态（与 mac native 一致），不依赖 socket。
   * 断线、正在重连或本轮上传失败但已排入退避重试时都直接返回——连上后的 `handleConnected`
   * 与重试 task 会把最新快照补到服务端。只有服务端明确拒绝（Conflict，不会重试）才向调用方抛出。
   */ async syncToolCatalog({ force = false, requireServerAck = true } = {}) {
        if (force) {
            // Consume the explicit confirmation now, never carry a force flag into a
            // later queued snapshot that may contain a newer, unconfirmed draft.
            await this.authorization.commitAuthorization();
        }
        await this.start();
        if (this.state.status !== (/* inlined export .SocketStatus.Connected */"connected") || !this.state.registeredDeviceId) {
            if (!requireServerAck) {
                this.logger.info(SOCKET_TOOL_CATALOG_LOG_CATEGORY, 'local connector access confirmed while disconnected; catalog syncs once the Socket connects');
                return;
            }
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'Connect to the server before confirming local connector access.');
        }
        const generation = this.generation;
        this.syncCurrentToolCatalogQuietly();
        while(this.toolCatalogSyncTask){
            await this.toolCatalogSyncTask;
        }
        const syncError = this.toolCatalogSyncError;
        if (generation !== this.generation || this.state.status !== (/* inlined export .SocketStatus.Connected */"connected") || syncError) {
            if (!requireServerAck && !isToolCatalogSyncRejected(syncError)) {
                this.logger.info(SOCKET_TOOL_CATALOG_LOG_CATEGORY, 'local connector access confirmed; catalog sync deferred to reconnect or retry');
                return;
            }
            throw interface_error_InterfaceError(syncError ?? base_InterfaceErrorCode.Unavailable, 'Local connector access has not reached the server. Please retry.');
        }
    }
    async performInitialize() {
        const notificationSubscriptions = [];
        const runtimeCleanups = [];
        let remoteLogUploadSubscription = null;
        let toolCatalogSubscription = null;
        try {
            remoteLogUploadSubscription = await this.remoteLogUpload.subscribe('outbound', (frame)=>{
                this.client?.sendClientLogUpload?.(frame);
            });
            toolCatalogSubscription = await this.subscribeToolCatalogQuietly();
            notificationSubscriptions.push(await this.notifications.subscribe('activated', (activation)=>{
                this.emit('notificationActivated', activation);
            }));
            notificationSubscriptions.push(await this.notifications.subscribe('clientStatusRequested', (inChat)=>{
                this.client?.sendClientStatus?.(inChat);
            }));
            notificationSubscriptions.push(await this.notifications.subscribe('reconnectRequested', ()=>{
                this.client?.nudgeReconnect?.();
            }));
            await this.notifications.initialize();
            runtimeCleanups.push(this.accountBarrier.onSuspended(()=>{
                this.remoteLogUpload.cancelActive();
                this.stopClient((/* inlined export .SocketStatus.Idle */"idle"));
            }));
            runtimeCleanups.push(this.accountBarrier.onAvailable(()=>{
                this.startOnDemand();
            }));
            runtimeCleanups.push(this.preferences.trafficLane.subscribeChanged(()=>{
                this.restartForTrafficLaneChange();
            }));
        } catch (error) {
            this.cleanupRuntimeObservers(runtimeCleanups);
            await this.unsubscribeAll(notificationSubscriptions);
            if (remoteLogUploadSubscription) {
                await remoteLogUploadSubscription.unsubscribe();
            }
            if (toolCatalogSubscription) {
                await toolCatalogSubscription.unsubscribe();
            }
            await this.remoteLogUpload.dispose();
            await this.notifications.dispose();
            throw error;
        }
        this.runtimeCleanups = runtimeCleanups;
        this.notificationSubscriptions = notificationSubscriptions;
        this.remoteLogUploadSubscription = remoteLogUploadSubscription;
        this.toolCatalogSubscription = toolCatalogSubscription;
        if (!toolCatalogSubscription) {
            this.scheduleToolCatalogSubscriptionRetry(this.toolCatalogSubscriptionGeneration);
        }
    }
    dispose() {
        this.remoteLogUpload.cancelActive();
        return this.performDispose();
    }
    async performDispose() {
        const initialization = this.initialization;
        if (initialization) {
            try {
                await initialization;
            } catch  {}
        }
        this.remoteLogUpload.cancelActive();
        this.cancelToolCatalogSubscriptionRetry();
        this.toolCatalogSubscriptionGeneration += 1;
        this.toolCatalogSubscriptionRetryAttempt = 0;
        this.stopClient((/* inlined export .SocketStatus.Idle */"idle"));
        const notificationSubscriptions = this.notificationSubscriptions;
        const runtimeCleanups = this.runtimeCleanups;
        const remoteLogUploadSubscription = this.remoteLogUploadSubscription;
        const toolCatalogSubscription = this.toolCatalogSubscription;
        this.notificationSubscriptions = [];
        this.runtimeCleanups = [];
        this.remoteLogUploadSubscription = null;
        this.toolCatalogSubscription = null;
        this.initialized = false;
        this.cleanupRuntimeObservers(runtimeCleanups);
        await this.unsubscribeAll(notificationSubscriptions);
        if (remoteLogUploadSubscription) {
            await remoteLogUploadSubscription.unsubscribe();
        }
        if (toolCatalogSubscription) {
            await toolCatalogSubscription.unsubscribe();
        }
        await this.remoteLogUpload.dispose();
        await this.notifications.dispose();
    }
    reconcileNotificationBadge() {
        this.notifications.reconcileBadge();
    }
    cleanupRuntimeObservers(cleanups) {
        for (const cleanup of [
            ...cleanups
        ].reverse()){
            try {
                cleanup();
            } catch (error) {
                this.logger.warn(USER_SOCKET_LOG_CATEGORY, `runtime cleanup failed: ${describeError(error)}`);
            }
        }
    }
    async getSocketState() {
        return copySocketState(this.state);
    }
    getRegisteredDeviceId(context) {
        if (!this.activeContext || !isSameUserSocketSession(context, this.activeContext)) {
            return null;
        }
        return normalizeRegisteredDeviceId(this.state.registeredDeviceId);
    }
    subscribeRegisteredDeviceAvailable(listener) {
        return super.subscribe('stateChange', (state)=>{
            if (!state.registeredDeviceId) {
                return;
            }
            listener();
        });
    }
    subscribeNativeToolEvents(eventName, listener) {
        return this.nativeTools.subscribeNative(eventName, listener);
    }
    async completeNativeToolInvocation(result) {
        await this.nativeTools.completeInvocation(result);
        this.nativeToolCompletions.emit('completed', result);
    }
    /**
   * Native 回传一次远程工具结果之后的 Node 内通知（不进 SEI 契约）。Device Connector Sync 用它把
   * agent 写日历 / 提醒的成功执行翻译成一次即时读取，不等变化通知的去抖。
   */ subscribeNativeToolInvocationCompleted(listener) {
        this.nativeToolCompletions.on('completed', listener);
        return {
            unsubscribe: async ()=>{
                this.nativeToolCompletions.off('completed', listener);
            }
        };
    }
    async forceSync() {
        this.demanded = true;
        try {
            await this.ensureStarted();
            if (!this.client) {
                throw interface_error_InterfaceError(base_InterfaceErrorCode.AuthRequired, 'Socket authentication is required.');
            }
            if (this.client.nudgeReconnect) {
                this.client.nudgeReconnect();
            } else {
                this.client.requestResume();
            }
        } catch (error) {
            throw interface_error_InterfaceError(error);
        }
    }
    restartForTrafficLaneChange() {
        this.stopClient((/* inlined export .SocketStatus.Idle */"idle"));
        this.startOnDemand();
    }
    startOnDemand() {
        if (!this.demanded) {
            return;
        }
        if (this.accountBarrier.suspended) {
            return;
        }
        this.startQuietly();
    }
    async startQuietly() {
        try {
            await this.ensureStarted();
        } catch (error) {
            this.logger.warn(USER_SOCKET_LOG_CATEGORY, `background start failed: ${describeError(error)}`);
        }
    }
    async ensureStarted() {
        await this.initialize();
        if (this.accountBarrier.suspended) {
            return;
        }
        if (this.client) {
            return;
        }
        if (this.startTask) {
            await this.startTask;
            return;
        }
        const generation = this.generation;
        const task = this.startClient(generation);
        this.startTask = task;
        try {
            await task;
        } catch (error) {
            if (generation !== this.generation) {
                return;
            }
            this.releaseClient();
            const interfaceError = interface_error_InterfaceError(error, 'The User Socket could not be started.');
            this.setState({
                status: (/* inlined export .SocketStatus.Failed */"failed"),
                error: interfaceError.toJSON()
            });
            throw interfaceError;
        } finally{
            if (this.startTask === task) {
                this.startTask = null;
            }
        }
    }
    async startClient(generation) {
        const context = await this.account.getFreshUserSocketAuthContext();
        if (!this.canStart(generation)) {
            return;
        }
        if (!context) {
            this.setState({
                status: (/* inlined export .SocketStatus.AuthRequired */"auth-required")
            });
            return;
        }
        const userSocketProfile = await this.deviceProfile.get();
        if (!this.canStart(generation)) {
            return;
        }
        const { apiBaseUrl, clientPlatform, environment, webOrigin } = this.account.runtimeSnapshot;
        if (environment !== context.environment) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The User Socket account environment is unavailable.');
        }
        this.setState({
            status: (/* inlined export .SocketStatus.Connecting */"connecting")
        });
        const messageProtocolVersion = CANONICAL_MESSAGE_PROTOCOL_VERSION;
        if (!this.canStart(generation)) {
            return;
        }
        const config = {
            baseUrl: apiBaseUrl,
            clientPlatformHeader: clientPlatform,
            deviceId: userSocketProfile.clientMachineId,
            deviceProfile: userSocketProfile.deviceProfile,
            getAcceptLanguage: ()=>this.account.getRequestAcceptLanguage(),
            getAccessToken: (options)=>this.getAccessToken(context, generation, options),
            origin: webOrigin,
            notifacations: this.notifications.isDisplaySupported(),
            userId: context.accountId,
            ...messageProtocolVersion ? {
                messageProtocolVersion
            } : {},
            ...context.trafficLane ? {
                trafficLane: context.trafficLane
            } : {}
        };
        const client = this.clientProvider.create(config);
        if (!this.canStart(generation)) {
            this.destroyClient(client);
            return;
        }
        this.client = client;
        this.nativeTools.bind(client);
        this.activeContext = context;
        const identity = toUserSocketSessionIdentity(context);
        this.notifications.handleSessionStarted(identity);
        this.cleanup = this.bindClient(client, context, identity, generation);
        client.start();
    }
    async getAccessToken(context, generation, options) {
        if (!this.isActiveSession(context, generation)) {
            return null;
        }
        const fresh = await this.account.getFreshUserSocketAuthContext(options);
        if (!fresh || !isSameUserSocketSession(context, fresh)) {
            return null;
        }
        if (!this.isActiveSession(context, generation)) {
            return null;
        }
        this.notifications.rememberAccessToken(fresh.accessToken, toUserSocketSessionIdentity(fresh));
        return fresh.accessToken;
    }
    bindClient(client, context, identity, generation) {
        const handleDebug = (event)=>{
            if (!this.isActiveClient(client, context, generation)) {
                return;
            }
            this.debugUserSocket.record(event);
            const diagnostic = toSocketDiagnosticRecord(event);
            if (diagnostic) {
                this.emit('diagnostic', diagnostic);
            }
            if (event.socketStatus !== 'error') {
                return;
            }
            if (event.type === 'socket.parse_error') {
                return;
            }
            this.setState({
                status: (/* inlined export .SocketStatus.Failed */"failed"),
                error: interface_error_InterfaceError(base_InterfaceErrorCode.NetworkError, 'Socket connection failed.').toJSON()
            });
        };
        const handleMessage = (message)=>{
            if (!this.isActiveClient(client, context, generation)) {
                return;
            }
            this.routeNativeToolMessage(message);
            const normalized = normalizeSocketMessage(message);
            if (normalized) {
                this.emit('receive', normalized);
            }
        };
        const handleEventPush = (message)=>{
            if (!this.isActiveClient(client, context, generation)) {
                return;
            }
            if (this.remoteLogUpload.handleEventPush(message)) {
                return;
            }
            this.notifications.handleEventPush(message, identity);
            const normalized = normalizeEventPush(message);
            if (normalized?.type === socketEventNames.notification.deliver && !recordingOfferFromSocketMessage(normalized, identity.accountId)) {
                return;
            }
            if (normalized) {
                this.emit('receive', normalized);
            }
        };
        const handleConnected = (messageProtocolVersion)=>{
            if (!this.isActiveClient(client, context, generation)) {
                return;
            }
            const registeredDeviceId = normalizeRegisteredDeviceId(client.registeredDeviceId);
            if (!registeredDeviceId && client.registeredDeviceId) {
                this.logger.warn(USER_SOCKET_LOG_CATEGORY, 'registration returned an unexpected device id; continuing the Socket without exposing it');
            }
            this.setState({
                status: (/* inlined export .SocketStatus.Connected */"connected"),
                messageProtocolVersion,
                ...registeredDeviceId ? {
                    registeredDeviceId
                } : {}
            });
            this.notifications.handleConnected({
                identity,
                registeredDeviceId
            });
            this.cancelToolCatalogSyncRetry();
            this.toolCatalogSyncRetryAttempt = 0;
            this.toolCatalogSync.invalidate();
            this.syncCurrentToolCatalogQuietly();
        };
        const handleWillReconnect = ()=>{
            if (!this.isActiveClient(client, context, generation)) {
                return;
            }
            this.toolCatalogSyncRequested = false;
            this.toolCatalogSync.invalidate();
            this.cancelToolCatalogSyncRetry();
            this.toolCatalogSyncRetryAttempt = 0;
            this.notifications.handleDisconnected();
            const registeredDeviceId = normalizeRegisteredDeviceId(this.state.registeredDeviceId);
            this.setState({
                status: (/* inlined export .SocketStatus.Reconnecting */"reconnecting"),
                ...registeredDeviceId ? {
                    registeredDeviceId
                } : {}
            });
        };
        const handleUnauthorized = ()=>{
            if (!this.isActiveClient(client, context, generation)) {
                return;
            }
            this.remoteLogUpload.cancelActive();
            this.stopClient((/* inlined export .SocketStatus.AuthRequired */"auth-required"));
            this.invalidateRejectedCredentials(context);
        };
        const handleNotifyTap = (detail)=>{
            if (!this.isActiveClient(client, context, generation)) {
                return;
            }
            this.emit('notificationActivated', detail);
        };
        client.on('debug', handleDebug);
        client.on('message', handleMessage);
        client.on('eventPush', handleEventPush);
        client.on('connected', handleConnected);
        client.on('willReconnect', handleWillReconnect);
        client.on('unauthorized', handleUnauthorized);
        client.on('notifyTap', handleNotifyTap);
        return ()=>{
            client.destroy();
        };
    }
    stopClient(nextState) {
        this.generation += 1;
        this.startTask = null;
        this.releaseClient();
        if (typeof nextState === 'string') {
            this.setState({
                status: nextState
            });
            return;
        }
        this.setState(nextState);
    }
    releaseClient() {
        const cleanup = this.cleanup;
        const client = this.client;
        this.cleanup = null;
        this.client = null;
        this.activeContext = null;
        this.toolCatalogSyncRequested = false;
        this.toolCatalogSync.invalidate();
        this.cancelToolCatalogSyncRetry();
        this.toolCatalogSyncRetryAttempt = 0;
        if (client) {
            this.nativeTools.unbind(client);
        }
        this.notifications.handleDisconnected();
        if (!cleanup) {
            return;
        }
        try {
            cleanup();
        } catch (error) {
            this.logger.warn(USER_SOCKET_LOG_CATEGORY, `client cleanup failed: ${describeError(error)}`);
        }
    }
    destroyClient(client) {
        try {
            client.destroy();
        } catch (error) {
            this.logger.warn(USER_SOCKET_LOG_CATEGORY, `obsolete client cleanup failed: ${describeError(error)}`);
        }
    }
    routeNativeToolMessage(message) {
        if (!isNativeToolSocketMessage(message)) {
            return;
        }
        this.routeNativeToolMessageQuietly(message);
    }
    async routeNativeToolMessageQuietly(message) {
        try {
            await this.nativeTools.route(message);
        } catch (error) {
            this.logger.warn(USER_SOCKET_LOG_CATEGORY, `Native tool request rejected: ${describeError(error)}`);
        }
    }
    async invalidateRejectedCredentials(context) {
        try {
            await this.account.invalidateRejectedUserSocketSession(context);
        } catch (error) {
            this.logger.warn(USER_SOCKET_LOG_CATEGORY, `rejected Socket credentials could not clear the account: ${describeError(error)}`);
        }
    }
    syncCurrentToolCatalogQuietly() {
        this.toolCatalogSyncRequested = true;
        if (this.toolCatalogSyncTask) {
            return;
        }
        const task = this.runToolCatalogSyncLoop();
        this.toolCatalogSyncTask = task;
        this.watchToolCatalogSync(task);
    }
    async runToolCatalogSyncLoop() {
        while(this.toolCatalogSyncRequested){
            this.toolCatalogSyncRequested = false;
            await this.syncCurrentToolCatalogOnceQuietly();
        }
    }
    async watchToolCatalogSync(task) {
        try {
            await task;
        } catch (error) {
            this.logger.warn(SOCKET_TOOL_CATALOG_LOG_CATEGORY, `catalog sync loop stopped unexpectedly: ${describeError(error)}`);
        } finally{
            if (this.toolCatalogSyncTask === task) {
                this.toolCatalogSyncTask = null;
            }
            if (this.toolCatalogSyncRequested) {
                this.syncCurrentToolCatalogQuietly();
            }
        }
    }
    async syncCurrentToolCatalogOnceQuietly() {
        // This pass replaces any scheduled retry; the old timer must not queue another pass mid-sync.
        this.cancelToolCatalogSyncRetry();
        this.toolCatalogSyncError = interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The tool catalog connection changed.');
        const client = this.client;
        const context = this.activeContext;
        const generation = this.generation;
        const registeredDeviceId = normalizeRegisteredDeviceId(this.state.registeredDeviceId);
        if (this.state.status !== (/* inlined export .SocketStatus.Connected */"connected") || !client || !context || !registeredDeviceId) {
            return;
        }
        try {
            const accessToken = await this.getAccessToken(context, generation);
            if (!accessToken || !this.isActiveClient(client, context, generation)) {
                return;
            }
            const profile = await this.deviceProfile.get();
            if (!this.isActiveClient(client, context, generation)) {
                return;
            }
            const { apiBaseUrl, clientPlatform } = this.account.runtimeSnapshot;
            await this.toolCatalogSync.sync({
                accountId: context.accountId,
                environment: context.environment,
                sessionGeneration: context.sessionGeneration,
                accessToken,
                apiBaseUrl,
                appVersion: profile.deviceProfile.version,
                clientPlatform,
                deviceId: registeredDeviceId,
                signal: AbortSignal.timeout((/* inlined export .SOCKET_TOOL_CATALOG_SYNC_TIMEOUT_MS */15000)),
                ...context.trafficLane ? {
                    trafficLane: context.trafficLane
                } : {}
            });
            this.cancelToolCatalogSyncRetry();
            this.toolCatalogSyncRetryAttempt = 0;
            this.toolCatalogSyncError = null;
        } catch (error) {
            this.toolCatalogSyncError = error;
            this.logger.warn(SOCKET_TOOL_CATALOG_LOG_CATEGORY, `catalog sync deferred without interrupting the Socket: ${describeError(error)}`);
            if (!(error instanceof interface_error_InterfaceError) || error.code !== base_InterfaceErrorCode.Conflict) {
                this.scheduleToolCatalogSyncRetry(client, context, generation);
            }
        }
    }
    async subscribeToolCatalogQuietly() {
        const subscriptions = [];
        let observing = true;
        const sync = ()=>{
            if (!observing) {
                return;
            }
            this.syncCurrentToolCatalogQuietly();
        };
        const syncPermissions = ()=>{
            if (!observing) {
                return;
            }
            this.toolCatalogSync.invalidate();
            this.syncCurrentToolCatalogQuietly();
        };
        try {
            subscriptions.push(await this.cpi.tools.subscribe('catalogChanged', sync));
            // Permission changes may leave the public tool catalog unchanged.
            subscriptions.push(await this.cpi.permissions.subscribe('changed', syncPermissions));
            return {
                unsubscribe: async ()=>{
                    observing = false;
                    await this.unsubscribeAll(subscriptions);
                }
            };
        } catch (error) {
            observing = false;
            await this.unsubscribeAll(subscriptions);
            this.logger.warn(SOCKET_TOOL_CATALOG_LOG_CATEGORY, `catalog or permission change observation unavailable; continuing the Socket: ${describeError(error)}`);
            return null;
        }
    }
    scheduleToolCatalogSubscriptionRetry(generation) {
        if (this.toolCatalogSubscriptionRetryTimer || generation !== this.toolCatalogSubscriptionGeneration) {
            return;
        }
        const delay = this.getToolCatalogRetryDelay(this.toolCatalogSubscriptionRetryAttempt);
        this.toolCatalogSubscriptionRetryAttempt += 1;
        this.toolCatalogSubscriptionRetryTimer = setTimeout(()=>{
            this.toolCatalogSubscriptionRetryTimer = null;
            this.retryToolCatalogSubscriptionQuietly(generation);
        }, delay);
        this.toolCatalogSubscriptionRetryTimer.unref();
    }
    async retryToolCatalogSubscriptionQuietly(generation) {
        if (!this.initialized || this.toolCatalogSubscription || generation !== this.toolCatalogSubscriptionGeneration) {
            return;
        }
        const subscription = await this.subscribeToolCatalogQuietly();
        if (!subscription) {
            this.scheduleToolCatalogSubscriptionRetry(generation);
            return;
        }
        if (!this.initialized || generation !== this.toolCatalogSubscriptionGeneration) {
            try {
                await subscription.unsubscribe();
            } catch (error) {
                this.logger.warn(SOCKET_TOOL_CATALOG_LOG_CATEGORY, `obsolete catalog observer cleanup failed: ${describeError(error)}`);
            }
            return;
        }
        this.toolCatalogSubscription = subscription;
        this.toolCatalogSubscriptionRetryAttempt = 0;
        this.toolCatalogSync.invalidate();
        this.syncCurrentToolCatalogQuietly();
    }
    cancelToolCatalogSubscriptionRetry() {
        if (!this.toolCatalogSubscriptionRetryTimer) {
            return;
        }
        clearTimeout(this.toolCatalogSubscriptionRetryTimer);
        this.toolCatalogSubscriptionRetryTimer = null;
    }
    scheduleToolCatalogSyncRetry(client, context, generation) {
        if (this.toolCatalogSyncRetryTimer || this.state.status !== (/* inlined export .SocketStatus.Connected */"connected") || !this.isActiveClient(client, context, generation)) {
            return;
        }
        const delay = this.getToolCatalogRetryDelay(this.toolCatalogSyncRetryAttempt);
        this.toolCatalogSyncRetryAttempt += 1;
        this.toolCatalogSyncRetryTimer = setTimeout(()=>{
            this.toolCatalogSyncRetryTimer = null;
            if (this.state.status !== (/* inlined export .SocketStatus.Connected */"connected") || !this.isActiveClient(client, context, generation)) {
                return;
            }
            this.syncCurrentToolCatalogQuietly();
        }, delay);
        this.toolCatalogSyncRetryTimer.unref();
    }
    cancelToolCatalogSyncRetry() {
        if (!this.toolCatalogSyncRetryTimer) {
            return;
        }
        clearTimeout(this.toolCatalogSyncRetryTimer);
        this.toolCatalogSyncRetryTimer = null;
    }
    getToolCatalogRetryDelay(attempt) {
        const exponent = Math.min(attempt, 30);
        return Math.min((/* inlined export .SOCKET_TOOL_CATALOG_RETRY_MIN_MS */1000) * 2 ** exponent, (/* inlined export .SOCKET_TOOL_CATALOG_RETRY_MAX_MS */30000));
    }
    isActiveClient(client, context, generation) {
        if (this.client !== client) {
            return false;
        }
        return this.isActiveSession(context, generation);
    }
    isActiveSession(context, generation) {
        if (!this.canStart(generation) || !this.activeContext) {
            return false;
        }
        if (!this.account.isCurrentUserSocketAuthContext(context)) {
            return false;
        }
        return isSameUserSocketSession(context, this.activeContext);
    }
    canStart(generation) {
        return generation === this.generation && !this.accountBarrier.suspended;
    }
    setState(state) {
        if (lodash_es_isEqual(this.state, state)) {
            return;
        }
        const next = copySocketState(state);
        this.state = next;
        this.emit('stateChange', next);
    }
    async unsubscribeAll(subscriptions) {
        for (const subscription of [
            ...subscriptions
        ].reverse()){
            try {
                await subscription.unsubscribe();
            } catch (error) {
                this.logger.warn(USER_SOCKET_LOG_CATEGORY, `subscription cleanup failed: ${describeError(error)}`);
            }
        }
    }
    constructor(...args){
        super(...args), this.nativeToolCompletions = new node_modules_eventemitter3(), this.state = {
            status: (/* inlined export .SocketStatus.Idle */"idle")
        }, this.client = null, this.activeContext = null, this.cleanup = null, this.startTask = null, this.initialized = false, this.notificationSubscriptions = [], this.remoteLogUploadSubscription = null, this.toolCatalogSubscription = null, this.toolCatalogSubscriptionGeneration = 0, this.toolCatalogSubscriptionRetryAttempt = 0, this.toolCatalogSubscriptionRetryTimer = null, this.toolCatalogSyncRequested = false, this.toolCatalogSyncRetryAttempt = 0, this.toolCatalogSyncRetryTimer = null, this.toolCatalogSyncTask = null, this.toolCatalogSyncError = null, this.runtimeCleanups = [], this.demanded = false, this.generation = 0;
    }
}
__decorate([
    inject(AccountShellService),
    __metadata("design:type", typeof AccountShellService === "undefined" ? Object : AccountShellService)
], SocketShellService.prototype, "account", void 0);
__decorate([
    inject(ToolAuthorizationService),
    __metadata("design:type", typeof ToolAuthorizationService === "undefined" ? Object : ToolAuthorizationService)
], SocketShellService.prototype, "authorization", void 0);
__decorate([
    inject(UserSocketClientProvider),
    __metadata("design:type", typeof UserSocketClientProvider === "undefined" ? Object : UserSocketClientProvider)
], SocketShellService.prototype, "clientProvider", void 0);
__decorate([
    inject(UserSocketDeviceProfile),
    __metadata("design:type", typeof UserSocketDeviceProfile === "undefined" ? Object : UserSocketDeviceProfile)
], SocketShellService.prototype, "deviceProfile", void 0);
__decorate([
    inject(SocketNativeTools),
    __metadata("design:type", typeof SocketNativeTools === "undefined" ? Object : SocketNativeTools)
], SocketShellService.prototype, "nativeTools", void 0);
__decorate([
    inject(SocketToolCatalogSync),
    __metadata("design:type", typeof SocketToolCatalogSync === "undefined" ? Object : SocketToolCatalogSync)
], SocketShellService.prototype, "toolCatalogSync", void 0);
__decorate([
    inject(CROSS_PLATFORM_INTERFACE),
    __metadata("design:type", typeof Pick === "undefined" ? Object : Pick)
], SocketShellService.prototype, "cpi", void 0);
__decorate([
    inject(AccountSessionBarrier),
    __metadata("design:type", typeof AccountSessionBarrier === "undefined" ? Object : AccountSessionBarrier)
], SocketShellService.prototype, "accountBarrier", void 0);
__decorate([
    inject(PreferencesShellService),
    __metadata("design:type", typeof PreferencesShellService === "undefined" ? Object : PreferencesShellService)
], SocketShellService.prototype, "preferences", void 0);
__decorate([
    inject(SocketNotifications),
    __metadata("design:type", typeof SocketNotifications === "undefined" ? Object : SocketNotifications)
], SocketShellService.prototype, "notifications", void 0);
__decorate([
    inject(RemoteLogUpload),
    __metadata("design:type", typeof RemoteLogUpload === "undefined" ? Object : RemoteLogUpload)
], SocketShellService.prototype, "remoteLogUpload", void 0);
__decorate([
    inject(AdapterLogger),
    __metadata("design:type", typeof AdapterLogger === "undefined" ? Object : AdapterLogger)
], SocketShellService.prototype, "logger", void 0);
__decorate([
    inject(DebugUserSocketShellService),
    __metadata("design:type", typeof DebugUserSocketShellService === "undefined" ? Object : DebugUserSocketShellService)
], SocketShellService.prototype, "debugUserSocket", void 0);
SocketShellService = __decorate([
    injectable()
], SocketShellService);
