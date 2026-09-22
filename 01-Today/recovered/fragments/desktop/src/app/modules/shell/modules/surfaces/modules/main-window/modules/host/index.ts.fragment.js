// Compiled fragment from ./src/app/modules/shell/modules/surfaces/modules/main-window/modules/host/index.ts.
// The original TypeScript and import graph are not restored.


















class ShellMainWindowHost {
    get current() {
        const window = this.window;
        if (!window || window.isDestroyed()) {
            return undefined;
        }
        return window;
    }
    create(authenticated) {
        const current = this.current;
        if (current) {
            return current;
        }
        this.observeApplicationActivation();
        const application = this.configuration.application;
        const platform = this.configuration.platform;
        const title = resolveWindowTitle(application, platform);
        const window = new external_electron_.BrowserWindow({
            backgroundColor: '#f7f6f2',
            autoHideMenuBar: platform !== 'darwin',
            center: true,
            icon: this.windowIcon.load(),
            ...platform === 'darwin' ? MACOS_MAIN_WINDOW_INITIAL_LAYOUT : MAIN_WINDOW_INITIAL_LAYOUT,
            show: false,
            title,
            ...resolveMainWindowChromeOptions(platform),
            useContentSize: true,
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                preload: this.assets.preloadPath,
                sandbox: true,
                session: external_electron_.session.defaultSession,
                webSecurity: true,
                webviewTag: false
            }
        });
        try {
            if (authenticated) {
                this.applyInitialAuthenticatedProfile(window);
            } else {
                this.chrome.apply(window, true);
                if (platform === 'darwin') {
                    const applied = this.applyMacOSProfile(window, {
                        contentSize: MAIN_WINDOW_FIXED_CONTENT_SIZE,
                        fixed: true
                    });
                    if (!applied) {
                        throw new Error('The macOS authentication window profile could not be applied');
                    }
                    window.center();
                }
            }
        } catch (error) {
            window.destroy();
            throw error;
        }
        this.window = window;
        this.webContents.attach(window, (/* inlined export .ClientRuntimeSurface.AppShell */"app-shell"));
        this.attachments.attach(window);
        window.webContents.on('page-title-updated', (event)=>{
            event.preventDefault();
            window.setTitle(title);
        });
        window.webContents.on('did-finish-load', ()=>{
            console.info(`[desktop] loaded ${window.webContents.getURL()}`);
        });
        window.on('close', (event)=>{
            // Cmd+W（菜单 role: 'close'）与红点关闭都走这里。
            this.diagnostics.record('desktop_main_window_close_requested', {
                quitting: this.quitState.isQuitting,
                was_focused: window.isFocused()
            });
            if (this.quitState.isQuitting) {
                return;
            }
            event.preventDefault();
            this.hideWindow(window);
        });
        if (platform === 'win32') {
            window.on('query-session-end', ()=>{
                this.quitState.begin();
            });
        }
        const webContents = window.webContents;
        for (const eventName of [
            'show',
            'hide',
            'minimize',
            'restore'
        ]){
            window.on(eventName, ()=>{
                this.publishPresence();
            });
        }
        window.on('closed', ()=>{
            this.leavingFullScreenWindows.delete(window);
            this.pendingFullScreenHideWindows.delete(window);
            this.attachments.detach(window, webContents);
            this.webContents.detach(webContents);
            if (this.window === window) {
                this.window = undefined;
            }
            this.publishPresence();
        });
        return window;
    }
    observeApplicationActivation() {
        if (this.applicationActivationObserved) {
            return;
        }
        this.applicationActivationObserved = true;
        const application = this.configuration.application;
        if (this.configuration.platform === 'darwin') {
            this.applicationActive = application.isActive();
            application.on('did-become-active', ()=>{
                this.setApplicationActive(true);
            });
            application.on('did-resign-active', ()=>{
                this.setApplicationActive(false);
            });
            // A nonactivating panel can receive key focus without representing the
            // main surface. App activation can also arrive before its focus event.
            application.on('browser-window-focus', ()=>{
                this.publishPresence();
            });
            application.on('browser-window-blur', ()=>{
                queueMicrotask(()=>{
                    this.publishPresence();
                });
            });
            return;
        }
        this.applicationActive = this.isAnyWindowFocused();
        application.on('browser-window-blur', ()=>{
            queueMicrotask(()=>{
                this.setApplicationActive(this.isAnyWindowFocused());
            });
        });
        application.on('browser-window-focus', ()=>{
            this.setApplicationActive(true);
        });
    }
    isAnyWindowFocused() {
        return external_electron_.BrowserWindow.getFocusedWindow() !== null;
    }
    isMainWindowFocused(window) {
        let focused = external_electron_.BrowserWindow.getFocusedWindow();
        while(focused && !focused.isDestroyed()){
            if (focused === window) {
                return true;
            }
            focused = focused.getParentWindow();
        }
        return false;
    }
    setApplicationActive(active) {
        this.applicationActive = active;
        this.publishPresence();
    }
    publishPresence() {
        const window = this.current;
        if (!window) {
            this.applicationPresence.setMainWindowPresent(false);
            this.applicationPresence.setMainWindowFocused(false);
            return;
        }
        const present = this.applicationActive && window.isVisible() && !window.isMinimized() && (this.configuration.platform !== 'darwin' || this.isMainWindowFocused(window));
        this.applicationPresence.setMainWindowPresent(present);
        this.applicationPresence.setMainWindowFocused(this.applicationActive && window.isVisible() && !window.isMinimized() && this.isMainWindowFocused(window));
    }
    activate() {
        const window = this.current;
        if (!window) {
            this.diagnostics.record('desktop_main_window_activated', {
                window_present: false
            });
            return false;
        }
        this.diagnostics.record('desktop_main_window_activated', {
            was_focused: window.isFocused(),
            was_minimized: window.isMinimized(),
            was_visible: window.isVisible(),
            window_present: true
        });
        this.pendingFullScreenHideWindows.delete(window);
        if (window.isMinimized()) {
            window.restore();
        }
        const application = this.configuration.application;
        if (this.configuration.platform === 'darwin') {
            application.show();
        } else {
            window.show();
        }
        application.focus({
            steal: true
        });
        if (this.configuration.platform === 'darwin') {
            window.show();
        }
        window.focus();
        return true;
    }
    hide() {
        const window = this.current;
        if (!window) {
            return;
        }
        this.hideWindow(window);
    }
    suppressHiddenApplicationRestore() {
        const window = this.current;
        if (!window || this.configuration.platform !== 'darwin' || !this.configuration.application.isHidden()) {
            return;
        }
        // app.show() restores windows hidden by Command-H. Mark the main window
        // explicitly hidden first so Quick Chat can activate without reviving it.
        window.hide();
    }
    exitFullScreen(window) {
        const current = this.current;
        if (!current || current !== window || this.configuration.platform !== 'darwin' || this.leavingFullScreenWindows.has(current) || !current.isFullScreen()) {
            return;
        }
        this.leaveFullScreen(current);
    }
    hideWindow(window) {
        if (this.configuration.platform !== 'darwin') {
            window.hide();
            return;
        }
        if (this.leavingFullScreenWindows.has(window)) {
            this.pendingFullScreenHideWindows.add(window);
            return;
        }
        if (!window.isFullScreen()) {
            window.hide();
            return;
        }
        this.pendingFullScreenHideWindows.add(window);
        this.leaveFullScreen(window);
    }
    leaveFullScreen(window) {
        this.leavingFullScreenWindows.add(window);
        window.once('leave-full-screen', ()=>{
            this.leavingFullScreenWindows.delete(window);
            if (!this.pendingFullScreenHideWindows.delete(window)) {
                return;
            }
            if (this.window !== window || window.isDestroyed() || this.quitState.isQuitting) {
                return;
            }
            window.hide();
        });
        window.setFullScreen(false);
    }
    setSize(params) {
        const window = this.current;
        if (!window) {
            return false;
        }
        return this.applySize(window, params);
    }
    applySize(window, params) {
        const previousBounds = window.getBounds();
        const display = external_electron_.screen.getDisplayMatching(previousBounds);
        let applied;
        if (this.configuration.platform === 'darwin') {
            const profile = resolveMacOSMainWindowProfile(params, display.workAreaSize);
            if (profile) {
                this.chrome.apply(window, profile.fixed);
                applied = this.applyMacOSProfile(window, profile);
            }
        }
        if (applied === undefined) {
            const frameSize = resolveSurfaceFrameSize(window.getSize(), window.getContentSize());
            const size = clampSurfaceContentSize(params, display.workAreaSize, window.getMinimumSize(), window.getMaximumSize(), frameSize);
            window.setContentSize(size.width, size.height);
            applied = surfaceContentSizeMatches(window.getContentSize(), size);
        }
        const resizedBounds = window.getBounds();
        const position = resolveCenteredMainWindowPosition(previousBounds, resizedBounds);
        if (position.x !== resizedBounds.x || position.y !== resizedBounds.y) {
            try {
                window.setPosition(position.x, position.y);
            } catch  {
            // Some window managers do not expose writable global coordinates.
            }
        }
        return applied;
    }
    applyMacOSProfile(window, profile) {
        const frameSize = resolveSurfaceFrameSize(window.getSize(), window.getContentSize());
        const minimumFrameSize = {
            height: MAIN_WINDOW_RESIZABLE_MINIMUM_SIZE.height + frameSize[1],
            width: MAIN_WINDOW_RESIZABLE_MINIMUM_SIZE.width + frameSize[0]
        };
        const profileFrameSize = {
            height: profile.contentSize.height + frameSize[1],
            width: profile.contentSize.width + frameSize[0]
        };
        // 顺序是约束：必须先把 min/max 放开、再 setResizable(true)。
        // 最小 harness 实证（Electron 43 / macOS 15）：从 fixed profile（min==max
        // 锁定态）执行本序列时，若 resizable(true) 在前，结束后 isResizable() 与
        // isMaximizable() 均为 false、zoom 按钮置灰、用户无法拖拽——即 onboarding
        // 结束后窗口锁死、重启才恢复的现象；仅交换这两步即恢复正常。从构造期
        // 约束（宽度维度 min≠max）出发时两种顺序都能生效，与「锁定态下的
        // resizable(true) 不落地」一致，但内部机制未经 AppKit 层面证实——
        // 这里只依赖实测结论：约束放开必须先行。
        window.setMinimumSize(0, 0);
        // 显式大值而非 (0, 0)：见 MAIN_WINDOW_UNBOUNDED_MAXIMUM_SIZE 的注释。
        // fixed 分支随后会用 min=max 覆盖成真实锁；resizable 分支就保持这个"无上限"。
        window.setMaximumSize(MAIN_WINDOW_UNBOUNDED_MAXIMUM_SIZE.width, MAIN_WINDOW_UNBOUNDED_MAXIMUM_SIZE.height);
        window.setResizable(true);
        window.setContentSize(profile.contentSize.width, profile.contentSize.height);
        if (profile.fixed) {
            window.setMinimumSize(profileFrameSize.width, profileFrameSize.height);
            window.setMaximumSize(profileFrameSize.width, profileFrameSize.height);
            window.setMaximizable(false);
            window.setResizable(false);
        } else {
            window.setMinimumSize(minimumFrameSize.width, minimumFrameSize.height);
            window.setMaximizable(true);
        }
        return surfaceContentSizeMatches(window.getContentSize(), profile.contentSize);
    }
    applyInitialAuthenticatedProfile(window) {
        if (this.applySize(window, MAIN_WINDOW_RESIZABLE_CONTENT_SIZE)) {
            window.center();
        }
    }
    constructor(){
        this.applicationActive = false;
        this.applicationActivationObserved = false;
        this.leavingFullScreenWindows = new WeakSet();
        this.pendingFullScreenHideWindows = new WeakSet();
    }
}
__decorate([
    inject(DesktopAssets),
    __metadata("design:type", typeof DesktopAssets === "undefined" ? Object : DesktopAssets)
], ShellMainWindowHost.prototype, "assets", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellMainWindowHost.prototype, "configuration", void 0);
__decorate([
    inject(ShellMainWindowAttachments),
    __metadata("design:type", typeof ShellMainWindowAttachments === "undefined" ? Object : ShellMainWindowAttachments)
], ShellMainWindowHost.prototype, "attachments", void 0);
__decorate([
    inject(ShellMainWindowChrome),
    __metadata("design:type", typeof ShellMainWindowChrome === "undefined" ? Object : ShellMainWindowChrome)
], ShellMainWindowHost.prototype, "chrome", void 0);
__decorate([
    inject(ShellApplicationPresence),
    __metadata("design:type", typeof ShellApplicationPresence === "undefined" ? Object : ShellApplicationPresence)
], ShellMainWindowHost.prototype, "applicationPresence", void 0);
__decorate([
    inject(ShellDiagnostics),
    __metadata("design:type", typeof ShellDiagnostics === "undefined" ? Object : ShellDiagnostics)
], ShellMainWindowHost.prototype, "diagnostics", void 0);
__decorate([
    inject(ShellQuitState),
    __metadata("design:type", typeof ShellQuitState === "undefined" ? Object : ShellQuitState)
], ShellMainWindowHost.prototype, "quitState", void 0);
__decorate([
    inject(ShellSurfaceWebContents),
    __metadata("design:type", typeof ShellSurfaceWebContents === "undefined" ? Object : ShellSurfaceWebContents)
], ShellMainWindowHost.prototype, "webContents", void 0);
__decorate([
    inject(ShellSurfaceWindowIcon),
    __metadata("design:type", typeof ShellSurfaceWindowIcon === "undefined" ? Object : ShellSurfaceWindowIcon)
], ShellMainWindowHost.prototype, "windowIcon", void 0);
ShellMainWindowHost = __decorate([
    injectable()
], ShellMainWindowHost);
