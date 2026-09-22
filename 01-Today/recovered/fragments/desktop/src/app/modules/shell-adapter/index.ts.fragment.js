// Compiled fragment from ./src/app/modules/shell-adapter/index.ts.
// The original TypeScript and import graph are not restored.






class DesktopShellAdapter {
    attach(shell) {
        if (this._shell) {
            throw new Error('Desktop shell is already attached');
        }
        this._shell = shell;
    }
    activate() {
        this.shell.activate();
    }
    async clearSystemBadge() {
        return this.notificationAgent.clearBadge();
    }
    async dismiss(surface) {
        await this.shell.dismiss(surface);
    }
    isFocused() {
        return this.applicationPresence.isFocused();
    }
    isPresent() {
        return this.applicationPresence.isPresent();
    }
    openConsole() {
        this.shell.openDebugPanel();
    }
    async openExternal(url) {
        await this.shell.openExternal(url);
    }
    quit() {
        this.shell.quit();
    }
    resolveSurface(sender) {
        return this.shell.resolveSurface(sender);
    }
    async setSize(surface, params) {
        return this.shell.setSize(surface, params);
    }
    subscribe(eventName, listener) {
        if (eventName === 'focusChanged') {
            return this.applicationPresence.subscribe('focusChanged', listener);
        }
        if (eventName === 'presenceChanged') {
            return this.applicationPresence.subscribe('changed', listener);
        }
        if (eventName === 'deepLinkRequested') {
            return this.shell.subscribe('deepLinkRequested', listener);
        }
        return this.shell.subscribe('settingsRequested', listener);
    }
    get shell() {
        const shell = this._shell;
        if (!shell) {
            throw new Error('Desktop shell is not attached');
        }
        return shell;
    }
}
__decorate([
    inject(ShellApplicationPresence),
    __metadata("design:type", typeof ShellApplicationPresence === "undefined" ? Object : ShellApplicationPresence)
], DesktopShellAdapter.prototype, "applicationPresence", void 0);
__decorate([
    inject(ShellNotificationAgent),
    __metadata("design:type", typeof ShellNotificationAgent === "undefined" ? Object : ShellNotificationAgent)
], DesktopShellAdapter.prototype, "notificationAgent", void 0);
DesktopShellAdapter = __decorate([
    injectable()
], DesktopShellAdapter);
