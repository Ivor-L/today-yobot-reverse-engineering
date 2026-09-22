// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/socket/modules/notifications/index.ts.
// The original TypeScript and import graph are not restored.












class SocketNotifications extends readonly_events_ReadonlyEvents {
    async initialize() {
        await this.lifecycle.run(async ()=>{
            if (this.initialized) {
                return;
            }
            await this.performInitialize();
            this.initialized = true;
        });
    }
    async dispose() {
        await this.lifecycle.run(async ()=>{
            const subscriptions = this.subscriptions;
            this.subscriptions = [];
            this.initialized = false;
            this.activeIdentity = null;
            await this.unsubscribeAll(subscriptions);
            await this.remotePush.dispose();
            await this.presence.dispose();
            await this.delivery.dispose();
        });
    }
    isDisplaySupported() {
        return this.delivery.isDisplaySupported();
    }
    handleEventPush(message, identity) {
        const delivery = this.delivery.handleEventPush(message, identity, this.presence.isPresent);
        if (!delivery) {
            return;
        }
        this.badge.applySnapshot(delivery.badge);
    }
    handleSessionStarted(identity) {
        this.activeIdentity = identity;
    }
    handleConnected(context) {
        this.handleSessionStarted(context.identity);
        this.presence.handleConnected();
        this.badge.refreshFromServer();
        this.remotePush.handleConnected(context);
    }
    handleDisconnected() {
        this.presence.handleDisconnected();
    }
    rememberAccessToken(accessToken, identity) {
        this.remotePush.rememberAccessToken(accessToken, identity);
    }
    reconcileBadge() {
        this.badge.refreshFromServer();
    }
    async performInitialize() {
        const subscriptions = [];
        try {
            subscriptions.push(await this.delivery.subscribe('activated', (activation)=>{
                this.emit('activated', activation);
            }));
            subscriptions.push(await this.presence.subscribe('reportRequested', (inChat)=>{
                this.emit('clientStatusRequested', inChat);
            }));
            subscriptions.push(await this.presence.subscribe('changed', (present)=>{
                this.badge.handlePresenceChanged(present);
            }));
            subscriptions.push(await this.remotePush.subscribe('received', (notification)=>{
                this.handleRemoteNotification(notification);
            }));
            subscriptions.push(await this.account.subscribe('beforeSwitch', ()=>{
                this.remotePush.prepareRegistrationCleanup();
            }));
            subscriptions.push(await this.account.subscribe('beforeSignOut', ()=>{
                this.remotePush.prepareRegistrationCleanup();
                this.handleAccountEnded();
            }));
            subscriptions.push(await this.account.subscribe('afterSwitch', ()=>{
                this.handleAccountEnded();
            }));
            subscriptions.push(await this.account.subscribe('changed', (snapshot)=>{
                if (snapshot.status === (/* inlined export .AccountStatus.SignedOut */"signed-out")) {
                    this.clearAccountNotifications();
                }
            }));
            await this.delivery.initialize();
            await this.presence.initialize();
            // 只订阅转换事件有一个洞：presence 初始化时窗口若已在前台，初始值直接
            // 播种为 true，此后不会再有 false→true 的转换——启动早期对账设上的红点
            // 就永远等不到清除。所以初始化完成后按当前值补一次清除时机，与 native
            // 的产品原则对齐：app active = 用户已在看，红点无条件清，且不依赖网络
            // 对账（对账失败不允许成为红点残留的原因）。
            this.badge.handlePresenceChanged(this.presence.isPresent);
            await this.remotePush.initialize();
            this.subscriptions = subscriptions;
        } catch (error) {
            await this.unsubscribeAll(subscriptions);
            await this.remotePush.dispose();
            await this.presence.dispose();
            await this.delivery.dispose();
            throw error;
        }
    }
    handleRemoteNotification(notification) {
        this.logger.info(NOTIFICATIONS_LOG_CATEGORY, 'remote push received');
        this.badge.refreshFromServer();
        const identity = this.activeIdentity;
        if (!identity || !this.account.isCurrentUserSocketAuthContext(identity)) {
            return;
        }
        this.delivery.registerRemoteNotification(notification);
        this.emit('reconnectRequested', undefined);
    }
    handleAccountEnded() {
        this.clearAccountNotifications();
        this.remotePush.commitRegistrationCleanup();
    }
    clearAccountNotifications() {
        this.activeIdentity = null;
        this.delivery.reset();
        this.badge.clear();
        this.presence.handleDisconnected();
    }
    async unsubscribeAll(subscriptions) {
        for (const subscription of [
            ...subscriptions
        ].reverse()){
            try {
                await subscription.unsubscribe();
            } catch (error) {
                this.logger.warn(NOTIFICATIONS_LOG_CATEGORY, `subscription cleanup failed: ${describeError(error)}`);
            }
        }
    }
    constructor(...args){
        super(...args), this.subscriptions = [], this.initialized = false, this.activeIdentity = null;
    }
}
__decorate([
    inject(SocketNotificationDelivery),
    __metadata("design:type", typeof SocketNotificationDelivery === "undefined" ? Object : SocketNotificationDelivery)
], SocketNotifications.prototype, "delivery", void 0);
__decorate([
    inject(SocketBadge),
    __metadata("design:type", typeof SocketBadge === "undefined" ? Object : SocketBadge)
], SocketNotifications.prototype, "badge", void 0);
__decorate([
    inject(SocketPresence),
    __metadata("design:type", typeof SocketPresence === "undefined" ? Object : SocketPresence)
], SocketNotifications.prototype, "presence", void 0);
__decorate([
    inject(SocketRemotePush),
    __metadata("design:type", typeof SocketRemotePush === "undefined" ? Object : SocketRemotePush)
], SocketNotifications.prototype, "remotePush", void 0);
__decorate([
    inject(AccountShellService),
    __metadata("design:type", typeof AccountShellService === "undefined" ? Object : AccountShellService)
], SocketNotifications.prototype, "account", void 0);
__decorate([
    inject(AdapterLogger),
    __metadata("design:type", typeof AdapterLogger === "undefined" ? Object : AdapterLogger)
], SocketNotifications.prototype, "logger", void 0);
__decorate([
    inject(SerialTask),
    __metadata("design:type", typeof SerialTask === "undefined" ? Object : SerialTask)
], SocketNotifications.prototype, "lifecycle", void 0);
SocketNotifications = __decorate([
    injectable()
], SocketNotifications);
