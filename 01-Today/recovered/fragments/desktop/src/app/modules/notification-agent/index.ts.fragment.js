// Compiled fragment from ./src/app/modules/notification-agent/index.ts.
// The original TypeScript and import graph are not restored.








class ShellNotificationAgent {
    async clearBadge() {
        const application = this.configuration.application;
        // 未打包时代理不在 .app 内，没有 bundle identifier，`UNUserNotificationCenter`
        // 会直接终止它；而且开发态本来也没有通知系统层角标可清。
        if (this.configuration.platform !== 'darwin' || !application.isPackaged) {
            return false;
        }
        const executablePath = resolveNotificationAgentPath({
            executablePath: process.execPath
        });
        let stdout;
        try {
            ;
            ({ stdout } = await this.process.run(executablePath, [
                NOTIFICATION_AGENT_CLEAR_BADGE_FLAG
            ]));
        } catch (error) {
            this.reportFailure(`notification agent could not clear the badge: ${String(error)}`);
            return false;
        }
        const result = parseNotificationAgentBadgeOutput(stdout);
        if (result.state === 'cleared') {
            this.reportedFailure = undefined;
            return true;
        }
        this.reportFailure(`notification agent did not clear the badge: ${result.state}${result.reason ? ` (${result.reason})` : ''}`);
        return false;
    }
    reportFailure(message) {
        if (this.reportedFailure === message) {
            return;
        }
        this.reportedFailure = message;
        console.warn(`[desktop] ${message}`);
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellNotificationAgent.prototype, "configuration", void 0);
__decorate([
    inject(NotificationAgentProcess),
    __metadata("design:type", typeof NotificationAgentProcess === "undefined" ? Object : NotificationAgentProcess)
], ShellNotificationAgent.prototype, "process", void 0);
ShellNotificationAgent = __decorate([
    injectable()
], ShellNotificationAgent);
