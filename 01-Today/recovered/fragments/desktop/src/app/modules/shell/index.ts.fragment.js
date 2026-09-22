// Compiled fragment from ./src/app/modules/shell/index.ts.
// The original TypeScript and import graph are not restored.















class DesktopShell {
    prepare() {
        this.readiness.prepare();
    }
    async whenReady() {
        await this.readiness.whenReady();
    }
    open() {
        this.menu.install();
        this.lifecycle.install();
        this.surfaces.openMain('launch');
    }
    /** Shell Adapter 入口：Web `shell.activate()` 与通知点击都经由这里。 */ activate() {
        this.surfaces.openMain('shell-activate');
    }
    openDeepLink(url) {
        this.surfaces.openDeepLink(url);
    }
    async launch() {
        await this.accountWindows.install();
        await this.lifecycle.launch();
        await this.surfaces.launch();
        await this.recordingCapsule.install();
        await this.tray.prepare();
    }
    /** Reminder snapshots require the Account, Features, and Preferences owners to be initialized. */ async startMeetingReminders() {
        await this.meetingReminder.install();
    }
    async dismiss(surface) {
        this.surfaces.dismiss(surface);
    }
    async openExternal(url) {
        await this.externalBrowser.open(url);
    }
    quit() {
        this.lifecycle.quit();
    }
    async setSize(surface, params) {
        return this.surfaces.setSize(surface, params);
    }
    openDebugPanel() {
        this.debugPanel.show();
    }
    subscribe(eventName, listener) {
        return this.surfaces.subscribe(eventName, listener);
    }
    resolveSurface(sender) {
        return this.trust.resolveSurface(sender);
    }
}
__decorate([
    inject(ShellAccountWindows),
    __metadata("design:type", typeof ShellAccountWindows === "undefined" ? Object : ShellAccountWindows)
], DesktopShell.prototype, "accountWindows", void 0);
__decorate([
    inject(ShellDebugPanel),
    __metadata("design:type", typeof ShellDebugPanel === "undefined" ? Object : ShellDebugPanel)
], DesktopShell.prototype, "debugPanel", void 0);
__decorate([
    inject(ShellExternalBrowser),
    __metadata("design:type", typeof ShellExternalBrowser === "undefined" ? Object : ShellExternalBrowser)
], DesktopShell.prototype, "externalBrowser", void 0);
__decorate([
    inject(ShellLifecycle),
    __metadata("design:type", typeof ShellLifecycle === "undefined" ? Object : ShellLifecycle)
], DesktopShell.prototype, "lifecycle", void 0);
__decorate([
    inject(ShellMenu),
    __metadata("design:type", typeof ShellMenu === "undefined" ? Object : ShellMenu)
], DesktopShell.prototype, "menu", void 0);
__decorate([
    inject(ShellMeetingReminder),
    __metadata("design:type", typeof ShellMeetingReminder === "undefined" ? Object : ShellMeetingReminder)
], DesktopShell.prototype, "meetingReminder", void 0);
__decorate([
    inject(ShellReadiness),
    __metadata("design:type", typeof ShellReadiness === "undefined" ? Object : ShellReadiness)
], DesktopShell.prototype, "readiness", void 0);
__decorate([
    inject(ShellRecordingCapsule),
    __metadata("design:type", typeof ShellRecordingCapsule === "undefined" ? Object : ShellRecordingCapsule)
], DesktopShell.prototype, "recordingCapsule", void 0);
__decorate([
    inject(ShellSurfaces),
    __metadata("design:type", typeof ShellSurfaces === "undefined" ? Object : ShellSurfaces)
], DesktopShell.prototype, "surfaces", void 0);
__decorate([
    inject(ShellTray),
    __metadata("design:type", typeof ShellTray === "undefined" ? Object : ShellTray)
], DesktopShell.prototype, "tray", void 0);
__decorate([
    inject(ShellWebContentsTrust),
    __metadata("design:type", typeof ShellWebContentsTrust === "undefined" ? Object : ShellWebContentsTrust)
], DesktopShell.prototype, "trust", void 0);
DesktopShell = __decorate([
    injectable()
], DesktopShell);
