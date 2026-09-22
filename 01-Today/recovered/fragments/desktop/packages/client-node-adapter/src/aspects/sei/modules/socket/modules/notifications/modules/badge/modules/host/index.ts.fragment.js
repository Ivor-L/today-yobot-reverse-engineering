// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/socket/modules/notifications/modules/badge/modules/host/index.ts.
// The original TypeScript and import graph are not restored.






class DesktopNotificationBadge {
    setCount(count) {
        if (process.platform === 'win32') {
            return;
        }
        try {
            if (!external_electron_.app.setBadgeCount(count)) {
                console.warn(`[desktop] setBadgeCount(${count}) was rejected by the platform`);
            }
        } catch (error) {
            console.warn('[desktop] failed to set the badge count', error);
        }
        // `app.setBadgeCount(0)` 只清 `NSDockTile` 层。APNs `aps.badge` /
        // `UNNotificationContent.badge` 写在通知系统层，同 bundle id 的任何来源
        // （包括原生 App）都能写上去，只有宿主经 `UNUserNotificationCenter` 才清得掉。
        // 写非零值时不动那层：Dock 展示的是本进程写的数，不需要两层对齐。
        if (count === 0) {
            this.clearSystemBadge();
        }
    }
    /**
   * 合并并发清除：presence 切换与服务端对账常在几毫秒内连续写 0，
   * 代理是子进程，不能每次都拉一个；在飞的那次结束后最多再补一次。
   */ clearSystemBadge() {
        this.systemClearQueued = true;
        if (this.systemClearFlight) {
            return;
        }
        const flight = this.drainSystemClearQueue();
        this.systemClearFlight = flight;
        this.observeSystemClearFlight(flight);
    }
    async drainSystemClearQueue() {
        while(this.systemClearQueued){
            this.systemClearQueued = false;
            try {
                await this.shell.clearSystemBadge();
            } catch (error) {
                console.warn('[desktop] failed to clear the system badge', error);
            }
        }
    }
    async observeSystemClearFlight(flight) {
        try {
            await flight;
        } finally{
            if (this.systemClearFlight === flight) {
                this.systemClearFlight = undefined;
                if (this.systemClearQueued) {
                    this.clearSystemBadge();
                }
            }
        }
    }
    constructor(){
        this.systemClearQueued = false;
    }
}
__decorate([
    inject(CLIENT_NODE_SHELL),
    __metadata("design:type", typeof ClientNodeShellFacade === "undefined" ? Object : ClientNodeShellFacade)
], DesktopNotificationBadge.prototype, "shell", void 0);
DesktopNotificationBadge = __decorate([
    injectable()
], DesktopNotificationBadge);
