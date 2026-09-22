// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/socket/modules/notifications/modules/presence/index.ts.
// The original TypeScript and import graph are not restored.







class SocketPresence extends readonly_events_ReadonlyEvents {
    get isPresent() {
        return this.present;
    }
    async initialize() {
        await this.lifecycle.run(async ()=>{
            if (this.subscription) {
                return;
            }
            await this.performInitialize();
        });
    }
    async dispose() {
        await this.lifecycle.run(async ()=>{
            this.handleDisconnected();
            const subscription = this.subscription;
            this.subscription = undefined;
            if (subscription) {
                await subscription.unsubscribe();
            }
        });
    }
    handleConnected() {
        this.connected = true;
        this.requestReport();
        this.syncKeepalive();
    }
    handleDisconnected() {
        this.connected = false;
        this.clearKeepalive();
    }
    async performInitialize() {
        const subscription = await this.shell.subscribe('presenceChanged', (present)=>{
            this.handlePresenceChanged(present);
        });
        this.present = this.safeIsPresent();
        this.subscription = subscription;
    }
    handlePresenceChanged(present) {
        if (this.present === present) {
            return;
        }
        this.present = present;
        this.emit('changed', present);
        if (!this.connected) {
            return;
        }
        this.requestReport();
        this.syncKeepalive();
    }
    requestReport() {
        const inChat = this.present ? 1 : 0;
        this.emit('reportRequested', inChat);
        this.logger.debug(NOTIFICATION_PRESENCE_LOG_CATEGORY, `client status requested inChat=${inChat}`);
    }
    syncKeepalive() {
        if (!this.connected || !this.present) {
            this.clearKeepalive();
            return;
        }
        if (this.keepaliveTimer) {
            return;
        }
        this.keepaliveTimer = setInterval(()=>{
            this.requestReport();
        }, (/* inlined export .NOTIFICATION_PRESENCE_KEEPALIVE_INTERVAL_MS */10000));
    }
    clearKeepalive() {
        if (!this.keepaliveTimer) {
            return;
        }
        clearInterval(this.keepaliveTimer);
        this.keepaliveTimer = undefined;
    }
    safeIsPresent() {
        try {
            return this.shell.isPresent();
        } catch (error) {
            this.logger.warn(NOTIFICATION_PRESENCE_LOG_CATEGORY, `presence read failed: ${describeError(error)}`);
            return false;
        }
    }
    constructor(...args){
        super(...args), this.present = false, this.connected = false;
    }
}
__decorate([
    inject(CLIENT_NODE_SHELL),
    __metadata("design:type", typeof ClientNodeShellFacade === "undefined" ? Object : ClientNodeShellFacade)
], SocketPresence.prototype, "shell", void 0);
__decorate([
    inject(AdapterLogger),
    __metadata("design:type", typeof AdapterLogger === "undefined" ? Object : AdapterLogger)
], SocketPresence.prototype, "logger", void 0);
__decorate([
    inject(SerialTask),
    __metadata("design:type", typeof SerialTask === "undefined" ? Object : SerialTask)
], SocketPresence.prototype, "lifecycle", void 0);
SocketPresence = __decorate([
    injectable()
], SocketPresence);
