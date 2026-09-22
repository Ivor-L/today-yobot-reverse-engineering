// Compiled fragment from ./src/app/modules/shell/modules/surfaces/index.ts.
// The original TypeScript and import graph are not restored.











class ShellSurfaces {
    async launch() {
        this.windowChrome.prepare();
        try {
            await this.mainWindow.install();
            await this.quickChat.install();
        } catch (error) {
            this.mainWindow.destroy();
            throw error;
        }
    }
    /**
   * `reason` 标识是谁要求打开主窗口（OS activate、托盘、菜单、Web activate 等），
   * 随排障日志一起落盘，用于回溯"主窗口为何弹出"。
   */ openMain(reason) {
        this.diagnostics.record('desktop_main_window_open_requested', {
            reason
        });
        this.quickChat.hide('open-main');
        this.prepareQuickChat();
    }
    openDeepLink(url) {
        this.diagnostics.record('desktop_main_window_open_requested', {
            reason: 'deep-link'
        });
        this.quickChat.hide('deep-link');
        this.presentDeepLink(url);
    }
    openSettings() {
        this.diagnostics.record('desktop_main_window_open_requested', {
            reason: 'settings'
        });
        this.quickChat.hide('settings');
        this.presentSettings();
    }
    subscribe(eventName, listener) {
        if (eventName === 'deepLinkRequested') {
            return this.deepLinkNavigation.subscribe('deepLinkRequested', listener);
        }
        return this.settingsNavigation.subscribe('settingsRequested', listener);
    }
    toggleQuickChat() {
        this.quickChat.toggle();
    }
    exitMainFullScreen(window) {
        this.mainWindow.exitFullScreen(window);
    }
    dismiss(surface) {
        this.diagnostics.record('desktop_surface_dismiss_requested', {
            surface
        });
        if (surface === (/* inlined export .ClientRuntimeSurface.QuickChat */"quick-chat")) {
            this.quickChat.hide('web-dismiss');
            return;
        }
        if (surface === (/* inlined export .ClientRuntimeSurface.AppShell */"app-shell")) {
            this.mainWindow.hide();
        }
    }
    setSize(surface, params) {
        if (surface === (/* inlined export .ClientRuntimeSurface.QuickChat */"quick-chat")) {
            return this.quickChat.setSize(params);
        }
        if (surface === (/* inlined export .ClientRuntimeSurface.AppShell */"app-shell")) {
            return this.mainWindow.setSize(params);
        }
        return false;
    }
    destroy() {
        this.mainWindow.destroy();
        this.quickChat.destroy();
    }
    async prepareQuickChat() {
        try {
            const loaded = await this.mainWindow.open();
            if (loaded) {
                this.quickChat.prewarm();
            }
        } catch (error) {
            console.error('[desktop] failed to prepare quick chat', error);
        }
    }
    async presentSettings() {
        try {
            const loaded = await this.mainWindow.open();
            if (!loaded) {
                return;
            }
            this.quickChat.prewarm();
            this.settingsNavigation.request();
        } catch (error) {
            console.error('[desktop] failed to present Settings', error);
        }
    }
    async presentDeepLink(url) {
        try {
            const loaded = await this.mainWindow.open();
            if (!loaded) {
                return;
            }
            this.quickChat.prewarm();
            this.deepLinkNavigation.request(url);
        } catch (error) {
            console.error('[desktop] failed to present a deep link', error);
        }
    }
}
__decorate([
    inject(ShellDeepLinkNavigation),
    __metadata("design:type", typeof ShellDeepLinkNavigation === "undefined" ? Object : ShellDeepLinkNavigation)
], ShellSurfaces.prototype, "deepLinkNavigation", void 0);
__decorate([
    inject(ShellDiagnostics),
    __metadata("design:type", typeof ShellDiagnostics === "undefined" ? Object : ShellDiagnostics)
], ShellSurfaces.prototype, "diagnostics", void 0);
__decorate([
    inject(ShellQuickChat),
    __metadata("design:type", typeof ShellQuickChat === "undefined" ? Object : ShellQuickChat)
], ShellSurfaces.prototype, "quickChat", void 0);
__decorate([
    inject(ShellMainWindow),
    __metadata("design:type", typeof ShellMainWindow === "undefined" ? Object : ShellMainWindow)
], ShellSurfaces.prototype, "mainWindow", void 0);
__decorate([
    inject(ShellSettingsNavigation),
    __metadata("design:type", typeof ShellSettingsNavigation === "undefined" ? Object : ShellSettingsNavigation)
], ShellSurfaces.prototype, "settingsNavigation", void 0);
__decorate([
    inject(ShellWindowChrome),
    __metadata("design:type", typeof ShellWindowChrome === "undefined" ? Object : ShellWindowChrome)
], ShellSurfaces.prototype, "windowChrome", void 0);
ShellSurfaces = __decorate([
    injectable()
], ShellSurfaces);
