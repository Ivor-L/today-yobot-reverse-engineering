// Compiled fragment from ./src/app/modules/shell/modules/meeting-reminder/modules/window/index.ts.
// The original TypeScript and import graph are not restored.









class ShellMeetingReminderWindow {
    getState() {
        return {
            offer: this.offer,
            recording: this.recording,
            nativeBackdrop: this.nativeBackdrop,
            presentationId: this.presentationId
        };
    }
    setRecording(recording) {
        if (this.recording === recording) {
            return;
        }
        this.recording = recording;
        this.publish();
    }
    getOffer() {
        return this.offer;
    }
    setExpanded(expanded, menuOpen = false) {
        const window = this.window;
        if (!window || window.isDestroyed()) {
            return;
        }
        const bounds = window.getBounds();
        const height = expanded ? (/* inlined export .MEETING_REMINDER_EXPANDED_HEIGHT */163) : (/* inlined export .MEETING_REMINDER_HEIGHT */107);
        const nextMenuOpen = expanded && menuOpen;
        if (bounds.height === height && this.menuOpen === nextMenuOpen) {
            return;
        }
        this.menuOpen = nextMenuOpen;
        if (bounds.height !== height) {
            window.setBounds({
                ...bounds,
                height
            }, false);
        }
        // AppKit's backdrop frame is relative to the native content height.
        this.applyBackdrop(window);
    }
    isTrustedSender(event) {
        const window = this.window;
        return Boolean(window && !window.isDestroyed() && event.sender === window.webContents && event.senderFrame === window.webContents.mainFrame);
    }
    hide() {
        if (!this.offer) {
            return;
        }
        this.offer = null;
        const presentationId = ++this.presentationId;
        const window = this.window;
        if (window && !window.isDestroyed()) {
            this.chrome.setCursor(window, false);
            this.fadeTo(window, 0);
            this.publish();
            // Recreate a stalled renderer next time so its unfinished exit cannot suppress readiness.
            this.exitTimer = setTimeout(()=>{
                if (this.presentationId === presentationId && !this.offer) {
                    this.close();
                }
            }, (/* inlined export .MEETING_REMINDER_EXIT_TIMEOUT_MS */1000));
            this.exitTimer.unref();
        }
    }
    ready(presentationId) {
        const window = this.window;
        if (presentationId !== this.presentationId || !this.offer || !window || window.isDestroyed()) {
            return false;
        }
        if (!window.isVisible()) {
            const { workArea } = external_electron_.screen.getDisplayNearestPoint(external_electron_.screen.getCursorScreenPoint());
            const width = Math.min((/* inlined export .MEETING_REMINDER_WIDTH */454), workArea.width);
            window.setBounds({
                x: workArea.x + workArea.width - width,
                y: workArea.y,
                width,
                height: MEETING_REMINDER_WINDOW_OPTIONS.height
            }, false);
            this.applyBackdrop(window);
            this.setOpacity(window, 0);
            window.showInactive();
            this.fadeTo(window, 1);
        }
        return true;
    }
    finishExit(presentationId) {
        if (presentationId !== this.presentationId || this.offer) {
            return;
        }
        clearTimeout(this.exitTimer);
        this.exitTimer = undefined;
        const window = this.window;
        if (window && !window.isDestroyed()) {
            this.cancelFade();
            this.setOpacity(window, 0);
            window.hide();
            this.setExpanded(false);
        }
    }
    close() {
        this.cancelFade();
        this.offer = null;
        this.creation = undefined;
        this.nativeBackdrop = false;
        this.menuOpen = false;
        this.presentationId += 1;
        clearTimeout(this.exitTimer);
        this.exitTimer = undefined;
        if (this.window && !this.window.isDestroyed()) {
            this.chrome.setCursor(this.window, false);
            this.window.destroy();
        }
    }
    async show(offer) {
        clearTimeout(this.exitTimer);
        this.exitTimer = undefined;
        if (this.offer?.id !== offer.id) {
            this.presentationId += 1;
            this.cancelFade();
            if (this.window && !this.window.isDestroyed() && this.window.isVisible()) {
                // A replacement remains visible, including when it interrupts an outgoing fade.
                this.setOpacity(this.window, 1);
            }
            this.setExpanded(false);
        }
        this.offer = offer;
        const presentationId = this.presentationId;
        try {
            const window = await this.ensureWindow();
            if (window.isDestroyed() || this.offer !== offer || presentationId !== this.presentationId) {
                return;
            }
            this.publish();
        } catch  {
            if (this.presentationId === presentationId) {
                this.close();
            }
        }
    }
    publish() {
        const window = this.window;
        if (!window || window.isDestroyed()) {
            return;
        }
        try {
            window.webContents.send(MEETING_REMINDER_CHANGED_CHANNEL, this.getState());
        } catch  {
        // The renderer can terminate independently of its native window.
        }
    }
    applyBackdrop(window) {
        const { width } = window.getBounds();
        const cardWidth = Math.min(MEETING_REMINDER_BACKDROP_BOUNDS.width, width - ((/* inlined export .MEETING_REMINDER_WIDTH */454) - MEETING_REMINDER_BACKDROP_BOUNDS.width));
        let nativeBackdrop = false;
        if (cardWidth > 0) {
            const card = {
                ...MEETING_REMINDER_BACKDROP_BOUNDS,
                width: cardWidth
            };
            const backdrops = [
                {
                    ...card,
                    cornerRadius: (/* inlined export .MEETING_REMINDER_BACKDROP_CORNER_RADIUS */20)
                }
            ];
            if (this.menuOpen) {
                backdrops.push({
                    x: card.x + card.width - (/* inlined export .MEETING_REMINDER_MENU_BACKDROP_RIGHT */13) - (/* inlined export .MEETING_REMINDER_MENU_BACKDROP_WIDTH */204),
                    y: card.y + card.height / 2 + (/* inlined export .MEETING_REMINDER_MENU_BACKDROP_TOP */30),
                    width: (/* inlined export .MEETING_REMINDER_MENU_BACKDROP_WIDTH */204),
                    height: (/* inlined export .MEETING_REMINDER_MENU_BACKDROP_HEIGHT */48),
                    cornerRadius: (/* inlined export .MEETING_REMINDER_BACKDROP_CORNER_RADIUS */20)
                });
            }
            try {
                // CSS backdrop-filter cannot sample the desktop behind a transparent WebContents.
                nativeBackdrop = this.chrome.applyRoundedBackdrops(window, backdrops);
            } catch (error) {
                console.error('[desktop] failed to apply the Meeting reminder backdrop', error);
            }
        }
        if (this.nativeBackdrop !== nativeBackdrop) {
            this.nativeBackdrop = nativeBackdrop;
            this.publish();
        }
    }
    cancelFade() {
        clearInterval(this.fadeTimer);
        this.fadeTimer = undefined;
    }
    setOpacity(window, opacity) {
        this.opacity = opacity;
        window.setOpacity(opacity);
    }
    fadeTo(window, opacity) {
        this.cancelFade();
        if (process.platform === 'linux' || external_electron_.systemPreferences.getAnimationSettings().prefersReducedMotion) {
            this.setOpacity(window, opacity);
            return;
        }
        // Native blur lives outside Chromium, so it must fade with the whole window.
        // CSS still owns renderer readiness/exit acknowledgement and the Linux fallback.
        const from = this.opacity;
        const startedAt = Date.now();
        const presentationId = this.presentationId;
        this.fadeTimer = setInterval(()=>{
            if (window.isDestroyed() || this.window !== window || this.presentationId !== presentationId) {
                this.cancelFade();
                return;
            }
            const progress = Math.min(1, (Date.now() - startedAt) / (/* inlined export .MEETING_REMINDER_FADE_DURATION_MS */180));
            this.setOpacity(window, from + (opacity - from) * progress);
            if (progress === 1) {
                this.cancelFade();
            }
        }, 16);
        this.fadeTimer.unref();
    }
    async ensureWindow() {
        if (this.creation) {
            return await this.creation;
        }
        if (this.window && !this.window.isDestroyed()) {
            return this.window;
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
    async createWindow() {
        // BrowserWindow is the transient native resource owned by this window provider.
        const window = new external_electron_.BrowserWindow({
            ...MEETING_REMINDER_WINDOW_OPTIONS,
            // Notification actions must not take key focus and bring the main window forward on exit.
            // acceptFirstMouse still delivers the first click while another application is active.
            focusable: false,
            webPreferences: {
                // A reused hidden panel must paint its transparent frame before acknowledging readiness.
                backgroundThrottling: false,
                contextIsolation: true,
                nodeIntegration: false,
                partition: 'today-desktop-meeting-reminder',
                preload: this.assets.meetingReminderPreloadPath,
                sandbox: true,
                spellcheck: false,
                webSecurity: true,
                webviewTag: false
            }
        });
        this.window = window;
        this.chrome.setCursor(window, false);
        window.webContents.on('cursor-changed', (_event, type)=>{
            // Electron calls the CSS pointer cursor "hand"; "pointer" is its arrow.
            this.chrome.setCursor(window, type === 'hand');
        });
        window.webContents.setWindowOpenHandler(()=>({
                action: 'deny'
            }));
        window.webContents.on('will-navigate', (event)=>{
            event.preventDefault();
        });
        window.on('closed', ()=>{
            if (this.window === window) {
                this.window = undefined;
                this.nativeBackdrop = false;
                this.menuOpen = false;
            }
        });
        try {
            await window.loadFile(this.assets.meetingReminderPagePath);
        } catch (error) {
            window.destroy();
            throw error;
        }
        return window;
    }
    constructor(){
        this.offer = null;
        this.presentationId = 0;
        this.opacity = 1;
        this.recording = true;
        this.nativeBackdrop = false;
        this.menuOpen = false;
    }
}
__decorate([
    inject(DesktopAssets),
    __metadata("design:type", typeof DesktopAssets === "undefined" ? Object : DesktopAssets)
], ShellMeetingReminderWindow.prototype, "assets", void 0);
__decorate([
    inject(ShellWindowChrome),
    __metadata("design:type", typeof ShellWindowChrome === "undefined" ? Object : ShellWindowChrome)
], ShellMeetingReminderWindow.prototype, "chrome", void 0);
ShellMeetingReminderWindow = __decorate([
    injectable()
], ShellMeetingReminderWindow);
