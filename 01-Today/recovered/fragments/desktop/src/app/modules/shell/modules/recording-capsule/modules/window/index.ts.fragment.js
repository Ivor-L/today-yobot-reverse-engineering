// Compiled fragment from ./src/app/modules/shell/modules/recording-capsule/modules/window/index.ts.
// The original TypeScript and import graph are not restored.
















class ShellRecordingCapsuleWindow {
    getState() {
        return this.state ? this.rendererState(this.state) : undefined;
    }
    setWarningSize(size) {
        const window = this.window;
        const state = this.state;
        if (!state || !hasRecordingCapsuleWarning(state) || !window || window.isDestroyed()) {
            return;
        }
        const width = Math.ceil(size.width);
        const height = Math.ceil(size.height);
        if (this.warningSize?.width === width && this.warningSize.height === height) {
            return;
        }
        this.warningSize = {
            width,
            height
        };
        this.resizeForWarning(window, state);
        this.publish(state);
    }
    pointerInteraction(phase) {
        const window = this.window;
        if (phase === 'cancel' || !window || window.isDestroyed() || !window.isVisible() || this.foreground || !isRecordingCapsulePresentable(this.state)) {
            this.clearDrag();
            return false;
        }
        if (phase === 'start') {
            this.clearDrag();
            this.drag = {
                origin: external_electron_.screen.getCursorScreenPoint(),
                bounds: window.getBounds(),
                startedAt: Date.now(),
                moved: false
            };
            return false;
        }
        const drag = this.drag;
        if (!drag) {
            return false;
        }
        const cursor = external_electron_.screen.getCursorScreenPoint();
        const deltaX = cursor.x - drag.origin.x;
        const deltaY = cursor.y - drag.origin.y;
        drag.moved ||= Math.hypot(deltaX, deltaY) >= (/* inlined export .RECORDING_CAPSULE_DRAG_THRESHOLD */4);
        if (drag.moved) {
            // A deliberate move supersedes the position held before a warning clamp.
            this.compactAnchor = undefined;
            const { workArea } = external_electron_.screen.getDisplayNearestPoint(cursor);
            const bounds = clampRecordingCapsuleBounds({
                ...window.getBounds(),
                x: drag.bounds.x + deltaX,
                y: drag.bounds.y + deltaY
            }, workArea);
            window.setPosition(bounds.x, bounds.y);
        }
        if (phase === 'end') {
            this.clearDrag();
            return !drag.moved && Date.now() - drag.startedAt <= (/* inlined export .RECORDING_CAPSULE_CLICK_DURATION_MS */500);
        }
        return false;
    }
    async setForeground(foreground) {
        this.foreground = foreground;
        if (foreground) {
            this.clearDrag();
            const window = this.window;
            if (window && !window.isDestroyed() && window.isVisible()) {
                this.windowChrome.setCursor(window, false);
                window.hide();
            }
            return;
        }
        if (this.state) {
            await this.update(this.state);
        }
    }
    isTrustedSender(event) {
        const window = this.window;
        if (!window || window.isDestroyed()) {
            return false;
        }
        const { sender, senderFrame } = event;
        return sender === window.webContents && senderFrame === sender.mainFrame;
    }
    setRendererSubscribed(subscribed) {
        this.rendererSubscribed = subscribed;
        if (!subscribed) {
            return;
        }
        const state = this.state;
        if (state) {
            this.publish(state);
        }
    }
    async update(state) {
        const currentState = this.state;
        if (currentState && state.revision < currentState.revision) {
            return;
        }
        // Starting also represents native capture resumption. Keep that transition
        // compact even when no audio was captured before the pause or the renderer
        // reconnects while main is waiting for the microphone.
        const resuming = state.phase === (/* inlined export .RecordPhase.Starting */"starting") && (currentState?.phase === (/* inlined export .RecordPhase.Paused */"paused") || currentState?.resuming === true);
        this.state = resuming ? {
            ...state,
            resuming: true
        } : state;
        if (!isRecordingCapsulePresentable(this.state)) {
            this.clearDrag();
            const window = this.window;
            if (window && !window.isDestroyed() && window.isVisible()) {
                this.windowChrome.setCursor(window, false);
                window.hide();
            }
            return;
        }
        if (this.foreground) {
            return;
        }
        try {
            const window = await this.ensureWindow();
            if (window.isDestroyed()) {
                return;
            }
            const latestState = this.state;
            if (!latestState) {
                return;
            }
            if (!isRecordingCapsulePresentable(latestState) || this.foreground) {
                if (window.isVisible()) {
                    this.windowChrome.setCursor(window, false);
                    window.hide();
                }
                return;
            }
            if (!window.isVisible()) {
                this.restoreVisiblePosition(window);
            }
            this.resizeForWarning(window, latestState);
            if (!window.isVisible()) {
                const bounds = window.getBounds();
                window.setPosition(bounds.x, bounds.y);
                window.showInactive();
            }
            this.publish(latestState);
        } catch (error) {
            console.error('[desktop] failed to show the Recording capsule', error);
            this.close();
        }
    }
    close() {
        this.clearDrag();
        const window = this.window;
        if (window && !window.isDestroyed()) {
            this.windowChrome.setCursor(window, false);
            window.close();
        }
    }
    async createWindow() {
        const fallback = this.defaultBounds();
        let bounds = fallback;
        try {
            bounds = await this.frameState.restore(fallback);
        } catch (error) {
            console.error('[desktop] failed to restore the Recording capsule position', error);
        }
        // Older versions persisted horizontal status bars. Restore their position,
        // but the capture-only surface always has one fixed size.
        bounds = clampRecordingCapsuleBounds({
            ...bounds,
            width: (/* inlined export .RECORDING_CAPSULE_WINDOW_WIDTH */56),
            height: (/* inlined export .RECORDING_CAPSULE_WINDOW_HEIGHT */84)
        }, external_electron_.screen.getDisplayMatching(bounds).workArea);
        const window = new external_electron_.BrowserWindow({
            ...RECORDING_CAPSULE_WINDOW_OPTIONS,
            ...bounds,
            // AppKit needs a key-capable panel to deliver the first background mouse gesture.
            // Main-surface presence is tracked separately from this utility window's focus.
            focusable: this.configuration.platform === 'darwin',
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                partition: RECORDING_CAPSULE_SESSION_PARTITION,
                preload: this.assets.recordingCapsulePreloadPath,
                sandbox: true,
                spellcheck: false,
                webSecurity: true,
                webviewTag: false
            }
        });
        this.window = window;
        this.rendererSubscribed = false;
        this.windowChrome.setCursor(window, false);
        window.webContents.on('cursor-changed', (_event, type)=>{
            // Match meeting reminders: Electron's CSS pointer cursor is named "hand".
            this.windowChrome.setCursor(window, type === 'hand');
        });
        window.webContents.setWindowOpenHandler(()=>({
                action: 'deny'
            }));
        window.webContents.on('will-navigate', (event)=>{
            event.preventDefault();
        });
        window.on('closed', ()=>{
            if (this.window !== window) {
                return;
            }
            this.window = undefined;
            this.rendererSubscribed = false;
            this.drag = undefined;
            this.compactAnchor = undefined;
            this.warningSize = undefined;
            this.appliedWarningOffsetY = 0;
        });
        try {
            this.applyBackdrop(window);
            await window.loadFile(this.assets.recordingCapsulePagePath);
        } catch (error) {
            if (!window.isDestroyed()) {
                this.windowChrome.setCursor(window, false);
                window.destroy();
            }
            throw new Error('The Recording capsule page could not be loaded.', {
                cause: error
            });
        }
        return window;
    }
    async ensureWindow() {
        const currentCreation = this.creation;
        if (currentCreation) {
            return await currentCreation;
        }
        const currentWindow = this.window;
        if (currentWindow && !currentWindow.isDestroyed()) {
            return currentWindow;
        }
        const creation = this.createWindow();
        this.creation = creation;
        try {
            return await creation;
        } finally{
            if (this.creation === creation) {
                this.creation = undefined;
            }
        }
    }
    publish(state) {
        const window = this.window;
        if (!this.rendererSubscribed || !window || window.isDestroyed() || !window.isVisible() || this.foreground || !isRecordingCapsulePresentable(state)) {
            return;
        }
        try {
            window.webContents.send(RECORDING_CAPSULE_STATE_CHANGED_CHANNEL, this.rendererState(state));
        } catch  {
            this.rendererSubscribed = false;
        }
    }
    defaultBounds() {
        const { workArea } = external_electron_.screen.getDisplayNearestPoint(external_electron_.screen.getCursorScreenPoint());
        return defaultRecordingCapsuleBounds(workArea);
    }
    resizeForWarning(window, state) {
        const warning = hasRecordingCapsuleWarning(state);
        const width = warning ? Math.max((/* inlined export .RECORDING_CAPSULE_WINDOW_WIDTH */56), (this.warningSize?.width ?? (/* inlined export .RECORDING_CAPSULE_WARNING_WIDTH */320)) + 16) : (/* inlined export .RECORDING_CAPSULE_WINDOW_WIDTH */56);
        const warningHeight = this.warningSize?.height ?? (/* inlined export .RECORDING_CAPSULE_WARNING_HEIGHT */104);
        const height = warning ? (/* inlined export .RECORDING_CAPSULE_WINDOW_HEIGHT */84) + (/* inlined export .RECORDING_CAPSULE_WARNING_GAP */8) + warningHeight : (/* inlined export .RECORDING_CAPSULE_WINDOW_HEIGHT */84);
        const offsetY = this.warningTopInset(state);
        const current = window.getBounds();
        if (current.width === width && current.height === height && this.appliedWarningOffsetY === offsetY) {
            return;
        }
        this.clearDrag();
        const currentAnchor = this.compactBounds(current);
        if (warning && !this.compactAnchor) {
            this.compactAnchor = currentAnchor;
        }
        const anchor = this.compactAnchor ?? currentAnchor;
        const bounds = clampRecordingCapsuleBounds({
            ...anchor,
            y: anchor.y - offsetY,
            width,
            height
        }, external_electron_.screen.getDisplayMatching(anchor).workArea);
        if (!warning) {
            this.compactAnchor = undefined;
            this.warningSize = undefined;
        }
        this.appliedWarningOffsetY = offsetY;
        window.setBounds(bounds, false);
        // AppKit's backdrop frame is relative to the native content height.
        this.applyBackdrop(window);
    }
    warningTopInset(state) {
        if (!hasRecordingCapsuleWarning(state) || state.phase !== (/* inlined export .RecordPhase.Paused */"paused")) {
            return 0;
        }
        return (this.warningSize?.height ?? (/* inlined export .RECORDING_CAPSULE_WARNING_HEIGHT */104)) + (/* inlined export .RECORDING_CAPSULE_WARNING_GAP */8);
    }
    rendererState(state) {
        const warningOffsetY = this.warningTopInset(state);
        return warningOffsetY ? {
            ...state,
            warningOffsetY
        } : state;
    }
    compactBounds(bounds) {
        return {
            ...bounds,
            y: bounds.y + this.appliedWarningOffsetY,
            width: (/* inlined export .RECORDING_CAPSULE_WINDOW_WIDTH */56),
            height: (/* inlined export .RECORDING_CAPSULE_WINDOW_HEIGHT */84)
        };
    }
    applyBackdrop(window) {
        try {
            this.windowChrome.applyRoundedBackdrops(window, [
                {
                    ...RECORDING_CAPSULE_BACKDROP_BOUNDS,
                    y: RECORDING_CAPSULE_BACKDROP_BOUNDS.y + this.appliedWarningOffsetY,
                    cornerRadius: (/* inlined export .RECORDING_CAPSULE_BACKDROP_CORNER_RADIUS */32)
                }
            ]);
        } catch (error) {
            console.error('[desktop] failed to apply the Recording capsule backdrop', error);
        }
    }
    clearDrag() {
        const drag = this.drag;
        const window = this.window;
        this.drag = undefined;
        if (drag?.moved && window && !window.isDestroyed()) {
            this.saveFrame(this.compactBounds(window.getBounds()));
        }
    }
    restoreVisiblePosition(window) {
        const bounds = window.getBounds();
        const fits = external_electron_.screen.getAllDisplays().some(({ workArea })=>recordingCapsuleFrameFitsWorkArea(bounds, workArea));
        if (fits) {
            return;
        }
        // A removed display or off-screen saved position resets to the default left
        // edge, instead of turning an unreachable right edge into a new user position.
        const fallback = this.defaultBounds();
        window.setBounds(fallback, false);
        this.compactAnchor = undefined;
        this.appliedWarningOffsetY = 0;
        if (bounds.width !== fallback.width || bounds.height !== fallback.height) {
            this.applyBackdrop(window);
        }
        this.saveFrame(fallback);
    }
    async saveFrame(bounds) {
        try {
            await this.frameState.save({
                ...bounds,
                width: (/* inlined export .RECORDING_CAPSULE_WINDOW_WIDTH */56),
                height: (/* inlined export .RECORDING_CAPSULE_WINDOW_HEIGHT */84)
            });
        } catch (error) {
            console.error('[desktop] failed to save the Recording capsule position', error);
        }
    }
    constructor(){
        this.rendererSubscribed = false;
        this.foreground = false;
        this.appliedWarningOffsetY = 0;
    }
}
__decorate([
    inject(DesktopAssets),
    __metadata("design:type", typeof DesktopAssets === "undefined" ? Object : DesktopAssets)
], ShellRecordingCapsuleWindow.prototype, "assets", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellRecordingCapsuleWindow.prototype, "configuration", void 0);
__decorate([
    inject(RecordingCapsuleFrameState),
    __metadata("design:type", typeof RecordingCapsuleFrameState === "undefined" ? Object : RecordingCapsuleFrameState)
], ShellRecordingCapsuleWindow.prototype, "frameState", void 0);
__decorate([
    inject(ShellWindowChrome),
    __metadata("design:type", typeof ShellWindowChrome === "undefined" ? Object : ShellWindowChrome)
], ShellRecordingCapsuleWindow.prototype, "windowChrome", void 0);
ShellRecordingCapsuleWindow = __decorate([
    injectable()
], ShellRecordingCapsuleWindow);
