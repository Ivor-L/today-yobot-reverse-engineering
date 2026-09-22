// Compiled fragment from ./src/app/modules/shell/modules/surfaces/modules/quick-chat/modules/window/index.ts.
// The original TypeScript and import graph are not restored.




















class ShellQuickChatWindow {
    get isVisible() {
        const window = this.window;
        return Boolean(window && !window.isDestroyed() && window.isVisible());
    }
    async prewarm() {
        await this.ensureLoaded();
    }
    async open() {
        this.activationRequested = true;
        const window = await this.ensureLoaded();
        if (!this.activationRequested || this.window !== window || window.isDestroyed()) {
            return;
        }
        if (!window.isVisible()) {
            await this.prepareForDisplay(window);
        }
        if (!this.activationRequested || this.window !== window || window.isDestroyed()) {
            return;
        }
        this.activate(window);
    }
    /** `reason` 标识隐藏触发源（Esc、失焦、Cmd+W、toggle、主窗口打开等），只用于排障日志。 */ hide(reason) {
        this.activationRequested = false;
        const window = this.window;
        if (!window || window.isDestroyed()) {
            this.diagnostics.record('desktop_quick_chat_hidden', {
                reason,
                window_present: false
            });
            return;
        }
        const wasVisible = window.isVisible();
        this.diagnostics.record('desktop_quick_chat_hidden', {
            pinned: this.isPinnedByUser,
            reason,
            was_focused: window.isFocused(),
            was_visible: wasVisible,
            window_present: true
        });
        if (wasVisible) {
            this.saveCurrentFrame(window);
        }
        this.applyPinnedState(window, false);
        window.hide();
        this.publishPresence();
    }
    setSize(params) {
        const window = this.window;
        if (!window || window.isDestroyed()) {
            return false;
        }
        const display = external_electron_.screen.getDisplayMatching(window.getBounds());
        const frameSize = resolveSurfaceFrameSize(window.getSize(), window.getContentSize());
        const size = clampSurfaceContentSize(params, display.workAreaSize, window.getMinimumSize(), window.getMaximumSize(), frameSize);
        this.applyProgrammaticFrameChange(window, ()=>{
            window.setContentSize(size.width, size.height);
        });
        return surfaceContentSizeMatches(window.getContentSize(), size);
    }
    destroy() {
        this.activationRequested = false;
        const window = this.window;
        if (!window || window.isDestroyed()) {
            return;
        }
        window.destroy();
        this.applicationPresence.setQuickChatPresent(false);
        this.applicationPresence.setQuickChatFocused(false);
    }
    create() {
        this.observeApplicationActivation();
        const application = this.configuration.application;
        const window = new external_electron_.BrowserWindow({
            alwaysOnTop: true,
            autoHideMenuBar: true,
            backgroundColor: '#f7f6f2',
            center: true,
            frame: false,
            fullscreenable: false,
            icon: this.windowIcon.load(),
            ...QUICK_CHAT_WINDOW_LAYOUT,
            maximizable: false,
            paintWhenInitiallyHidden: false,
            resizable: true,
            ...this.configuration.platform === 'darwin' ? {
                roundedCorners: false
            } : {},
            show: false,
            skipTaskbar: true,
            title: application.getName(),
            transparent: false,
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
            this.windowChrome.apply(window);
        } catch (error) {
            window.destroy();
            throw error;
        }
        this.defaultBounds = window.getBounds();
        this.isPinnedByUser = false;
        this.isProgrammaticPositioning = false;
        this.programmaticBounds = undefined;
        this.surfaceWebContents.attach(window, (/* inlined export .ClientRuntimeSurface.QuickChat */"quick-chat"));
        window.webContents.on('before-input-event', (event, input)=>{
            if (this.window !== window || !this.activationRequested || input.type !== 'keyDown' || input.code !== 'Escape' || input.isAutoRepeat || input.isComposing || input.control || input.alt || input.shift || input.meta) {
                return;
            }
            event.preventDefault();
            this.hide('escape');
        });
        for (const eventName of [
            'show',
            'hide'
        ]){
            window.on(eventName, ()=>{
                this.publishPresence();
            });
        }
        window.on('focus', ()=>{
            this.publishFocus();
        });
        window.on('blur', ()=>{
            this.applicationPresence.setQuickChatFocused(false);
            if (this.window !== window || !this.activationRequested || this.activationInProgress || this.isPinnedByUser) {
                return;
            }
            this.hide('blur');
        });
        window.on('move', ()=>{
            this.handleUserFrameChange(window);
        });
        window.on('resize', ()=>{
            this.handleUserFrameChange(window);
        });
        window.on('close', (event)=>{
            if (this.quitState.isQuitting) {
                if (window.isVisible()) {
                    this.saveCurrentFrame(window);
                }
                return;
            }
            event.preventDefault();
            // Cmd+W（菜单 role: 'close'）与窗口关闭按钮都走这里。
            this.hide('close-event');
        });
        const webContents = window.webContents;
        window.on('closed', ()=>{
            this.applicationPresence.setQuickChatPresent(false);
            this.applicationPresence.setQuickChatFocused(false);
            this.surfaceWebContents.detach(webContents);
            if (this.window === window) {
                this.activationRequested = false;
                this.window = undefined;
                this.loadResult = undefined;
                this.defaultBounds = undefined;
                this.isPinnedByUser = false;
                this.isProgrammaticPositioning = false;
                this.programmaticBounds = undefined;
            }
        });
        return window;
    }
    async ensureLoaded() {
        let window = this.window;
        if (!window || window.isDestroyed()) {
            const createdWindow = this.create();
            window = createdWindow;
            this.window = createdWindow;
            this.loadResult = this.loadSafely(createdWindow);
        }
        const loadResult = this.loadResult;
        if (!loadResult) {
            throw new Error('Quick Chat window load is not available.');
        }
        await loadResult;
        return window;
    }
    activate(window) {
        if (window.isMinimized()) {
            window.restore();
        }
        const application = this.configuration.application;
        const platform = this.configuration.platform;
        this.diagnostics.record('desktop_quick_chat_shown', {
            application_active: application.isActive(),
            pinned: this.isPinnedByUser,
            was_visible: window.isVisible()
        });
        this.activationInProgress = true;
        try {
            if (platform === 'darwin') {
                this.mainWindow.suppressHiddenApplicationRestore();
                application.show();
                application.focus({
                    steal: true
                });
            }
            window.show();
            if (platform === 'linux') {
                application.focus();
            }
            this.publishPresence();
            window.focus();
        } finally{
            this.activationInProgress = false;
        }
    }
    applyPinnedState(window, isPinned) {
        this.isPinnedByUser = isPinned;
        if (isPinned) {
            window.setAlwaysOnTop(true, QUICK_CHAT_PINNED_WINDOW_LEVEL);
            window.moveTop();
            return;
        }
        window.setAlwaysOnTop(true, QUICK_CHAT_DEFAULT_WINDOW_LEVEL);
    }
    applyProgrammaticFrameChange(window, change) {
        this.isProgrammaticPositioning = true;
        try {
            change();
        } finally{
            this.programmaticBounds = window.getBounds();
            this.isProgrammaticPositioning = false;
        }
    }
    handleUserFrameChange(window) {
        if (this.window !== window || !window.isVisible() || this.isProgrammaticFrameChange(window)) {
            return;
        }
        this.saveCurrentFrame(window);
        if (this.isPinnedByUser) {
            return;
        }
        this.applyPinnedState(window, true);
    }
    isProgrammaticFrameChange(window) {
        if (this.isProgrammaticPositioning) {
            return true;
        }
        const expectedBounds = this.programmaticBounds;
        if (!expectedBounds) {
            return false;
        }
        const actualBounds = window.getBounds();
        if (quickChatFramesApproximatelyEqual(actualBounds, expectedBounds, (/* inlined export .QUICK_CHAT_PROGRAMMATIC_FRAME_TOLERANCE */0))) {
            return true;
        }
        this.programmaticBounds = undefined;
        return false;
    }
    async prepareForDisplay(window) {
        const defaultBounds = this.defaultBounds ?? window.getBounds();
        const [minimumWidth = 0, minimumHeight = 0] = window.getMinimumSize();
        const [maximumWidth = 0, maximumHeight = 0] = window.getMaximumSize();
        const constraints = {
            maximumHeight,
            maximumWidth,
            minimumHeight,
            minimumWidth
        };
        let bounds = defaultBounds;
        let isPinned = false;
        try {
            const restoration = await this.frameState.restore(defaultBounds, constraints);
            if (restoration) {
                bounds = restoration.bounds;
                isPinned = restoration.isPinned;
            }
        } catch (error) {
            console.error('[desktop] failed to restore the Quick Chat window frame', error);
        }
        if (!this.activationRequested || this.window !== window || window.isDestroyed()) {
            return;
        }
        this.applyProgrammaticFrameChange(window, ()=>{
            window.setBounds(bounds);
        });
        this.applyPinnedState(window, isPinned);
    }
    saveCurrentFrame(window) {
        let bounds = window.getBounds();
        const defaultBounds = this.defaultBounds;
        const programmaticBounds = this.programmaticBounds;
        if (!this.isPinnedByUser && defaultBounds && programmaticBounds && quickChatFramesApproximatelyEqual(bounds, programmaticBounds, (/* inlined export .QUICK_CHAT_PROGRAMMATIC_FRAME_TOLERANCE */0))) {
            bounds = defaultBounds;
        }
        this.saveFrame(bounds);
    }
    publishPresence() {
        this.applicationPresence.setQuickChatPresent(this.isVisible);
        this.publishFocus();
    }
    observeApplicationActivation() {
        if (this.applicationActivationObserved || this.configuration.platform !== 'darwin') {
            return;
        }
        this.applicationActivationObserved = true;
        this.configuration.application.on('did-become-active', ()=>{
            this.publishFocus();
        });
        this.configuration.application.on('did-resign-active', ()=>{
            this.applicationPresence.setQuickChatFocused(false);
        });
    }
    publishFocus() {
        const window = this.window;
        const focused = Boolean(window && !window.isDestroyed() && window.isVisible() && !window.isMinimized() && window.isFocused() && (this.configuration.platform !== 'darwin' || this.configuration.application.isActive()));
        this.applicationPresence.setQuickChatFocused(focused);
    }
    async load(window) {
        const url = new URL('/chat', `${this.webContext.current.webOrigin}/`).href;
        await window.loadURL(url);
    }
    async loadSafely(window) {
        try {
            await this.load(window);
        } catch (error) {
            if (!window.isDestroyed()) {
                window.destroy();
            }
            throw error;
        }
    }
    constructor(){
        this.applicationActivationObserved = false;
        this.activationRequested = false;
        this.activationInProgress = false;
        this.isPinnedByUser = false;
        this.isProgrammaticPositioning = false;
        this.saveFrame = async (bounds)=>{
            try {
                await this.frameState.save(bounds);
            } catch (error) {
                console.error('[desktop] failed to save the Quick Chat window frame', error);
            }
        };
    }
}
__decorate([
    inject(DesktopAssets),
    __metadata("design:type", typeof DesktopAssets === "undefined" ? Object : DesktopAssets)
], ShellQuickChatWindow.prototype, "assets", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellQuickChatWindow.prototype, "configuration", void 0);
__decorate([
    inject(ShellApplicationPresence),
    __metadata("design:type", typeof ShellApplicationPresence === "undefined" ? Object : ShellApplicationPresence)
], ShellQuickChatWindow.prototype, "applicationPresence", void 0);
__decorate([
    inject(ShellDiagnostics),
    __metadata("design:type", typeof ShellDiagnostics === "undefined" ? Object : ShellDiagnostics)
], ShellQuickChatWindow.prototype, "diagnostics", void 0);
__decorate([
    inject(ShellQuitState),
    __metadata("design:type", typeof ShellQuitState === "undefined" ? Object : ShellQuitState)
], ShellQuickChatWindow.prototype, "quitState", void 0);
__decorate([
    inject(ShellSurfaceWebContents),
    __metadata("design:type", typeof ShellSurfaceWebContents === "undefined" ? Object : ShellSurfaceWebContents)
], ShellQuickChatWindow.prototype, "surfaceWebContents", void 0);
__decorate([
    inject(ShellSurfaceWindowIcon),
    __metadata("design:type", typeof ShellSurfaceWindowIcon === "undefined" ? Object : ShellSurfaceWindowIcon)
], ShellQuickChatWindow.prototype, "windowIcon", void 0);
__decorate([
    inject(ShellWebContext),
    __metadata("design:type", typeof ShellWebContext === "undefined" ? Object : ShellWebContext)
], ShellQuickChatWindow.prototype, "webContext", void 0);
__decorate([
    inject(ShellQuickChatFrameState),
    __metadata("design:type", typeof ShellQuickChatFrameState === "undefined" ? Object : ShellQuickChatFrameState)
], ShellQuickChatWindow.prototype, "frameState", void 0);
__decorate([
    inject(ShellQuickChatWindowChrome),
    __metadata("design:type", typeof ShellQuickChatWindowChrome === "undefined" ? Object : ShellQuickChatWindowChrome)
], ShellQuickChatWindow.prototype, "windowChrome", void 0);
__decorate([
    inject(ShellMainWindow),
    __metadata("design:type", typeof ShellMainWindow === "undefined" ? Object : ShellMainWindow)
], ShellQuickChatWindow.prototype, "mainWindow", void 0);
ShellQuickChatWindow = __decorate([
    injectable()
], ShellQuickChatWindow);
