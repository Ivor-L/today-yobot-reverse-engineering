// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/socket/modules/notifications/modules/badge/index.ts.
// The original TypeScript and import graph are not restored.











class SocketBadge {
    applySnapshot(unreadCount) {
        if (!lodash_es_isNumber(unreadCount) || !lodash_es_isFinite(unreadCount)) {
            return;
        }
        this.apply(unreadCount);
    }
    clear() {
        this.setCount(0);
    }
    handlePresenceChanged(present) {
        if (present) {
            this.clear();
        }
    }
    refreshFromServer() {
        this.refreshQueued = true;
        if (this.refreshFlight) {
            return;
        }
        const flight = this.drainRefreshQueue();
        this.refreshFlight = flight;
        this.observeRefreshFlight(flight);
    }
    async drainRefreshQueue() {
        while(this.refreshQueued){
            this.refreshQueued = false;
            try {
                await this.performRefresh();
            } catch (error) {
                this.logger.warn(NOTIFICATION_BADGE_LOG_CATEGORY, `refresh failed: ${describeError(error)}`);
            }
        }
    }
    async observeRefreshFlight(flight) {
        try {
            await flight;
        } finally{
            if (this.refreshFlight === flight) {
                this.refreshFlight = undefined;
                if (this.refreshQueued) {
                    this.refreshFromServer();
                }
            }
        }
    }
    async performRefresh() {
        const snapshot = await this.unreadStatus.read();
        if (!snapshot) {
            this.clear();
            return;
        }
        if (!this.account.isCurrentUserSocketAuthContext(snapshot.identity)) {
            return;
        }
        this.apply(snapshot.unreadCount);
    }
    apply(unreadCount) {
        const count = this.safeIsPresent() || unreadCount <= 0 ? 0 : Math.floor(unreadCount);
        this.setCount(count);
    }
    safeIsPresent() {
        try {
            return this.shell.isPresent();
        } catch  {
            return false;
        }
    }
    setCount(count) {
        try {
            this.badgeHost.setCount(count);
        } catch (error) {
            this.logger.warn(NOTIFICATION_BADGE_LOG_CATEGORY, `badge write failed: ${describeError(error)}`);
        }
    }
    constructor(){
        this.refreshQueued = false;
    }
}
__decorate([
    inject(DesktopNotificationBadge),
    __metadata("design:type", typeof DesktopNotificationBadge === "undefined" ? Object : DesktopNotificationBadge)
], SocketBadge.prototype, "badgeHost", void 0);
__decorate([
    inject(CLIENT_NODE_SHELL),
    __metadata("design:type", typeof ClientNodeShellFacade === "undefined" ? Object : ClientNodeShellFacade)
], SocketBadge.prototype, "shell", void 0);
__decorate([
    inject(SocketUnreadStatus),
    __metadata("design:type", typeof SocketUnreadStatus === "undefined" ? Object : SocketUnreadStatus)
], SocketBadge.prototype, "unreadStatus", void 0);
__decorate([
    inject(AccountShellService),
    __metadata("design:type", typeof AccountShellService === "undefined" ? Object : AccountShellService)
], SocketBadge.prototype, "account", void 0);
__decorate([
    inject(AdapterLogger),
    __metadata("design:type", typeof AdapterLogger === "undefined" ? Object : AdapterLogger)
], SocketBadge.prototype, "logger", void 0);
SocketBadge = __decorate([
    injectable()
], SocketBadge);
