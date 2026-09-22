// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/shortcut/index.ts.
// The original TypeScript and import graph are not restored.










class ShellDebugShortcut {
    install() {
        if (this.installed) {
            return;
        }
        this.installed = true;
        this.configuration.application.on('browser-window-created', this.handleWindowCreated);
    }
    async uploadLogs() {
        try {
            await this.logUpload.startUpload();
        } catch  {
            console.error('[desktop] unable to open the log upload window');
        }
    }
    accept(window, input, action, now = Date.now()) {
        if (input.type !== 'keyDown' || input.isAutoRepeat) {
            return null;
        }
        const sequences = this.sequences.get(window) ?? new Map();
        if (action !== 'c' && !DEBUG_SHORTCUT_MODIFIER_KEYS.includes(input.key.toLowerCase())) {
            sequences.delete('c');
        }
        if (!action) {
            return null;
        }
        const sequence = sequences.get(action) ?? {
            count: 0,
            lastMatchAt: undefined
        };
        const didExpire = sequence.lastMatchAt !== undefined && now - sequence.lastMatchAt > (/* inlined export .DEBUG_SHORTCUT_MAX_INTERVAL_MS */500);
        if (didExpire) {
            sequence.count = 0;
        }
        sequence.count += 1;
        sequence.lastMatchAt = now;
        if (sequence.count < (/* inlined export .DEBUG_SHORTCUT_REQUIRED_COUNT */5)) {
            sequences.set(action, sequence);
            this.sequences.set(window, sequences);
            return null;
        }
        sequences.delete(action);
        return action;
    }
    constructor(){
        this.installed = false;
        this.sequences = new WeakMap();
        this.handleWindowCreated = (_event, window)=>{
            window.on('blur', ()=>{
                this.sequences.get(window)?.delete('c');
            });
            window.webContents.on('before-input-event', (_event, input)=>{
                const candidate = resolveDebugShortcutAction(input, this.configuration.platform);
                if (candidate === 'c') {
                    _event.preventDefault();
                }
                const action = this.accept(window, input, candidate);
                if (!action) {
                    return;
                }
                if (action === 'c') {
                    this.dataReset.requestReset();
                    return;
                }
                if (action === 'f') {
                    _event.preventDefault();
                    this.uploadLogs();
                    return;
                }
                if (this.debugWindow.isMainWindow(window)) {
                    this.debugWindow.show();
                    return;
                }
                window.webContents.openDevTools({
                    activate: true,
                    mode: 'undocked'
                });
            });
        };
    }
}
__decorate([
    inject(DesktopDataReset),
    __metadata("design:type", typeof DesktopDataReset === "undefined" ? Object : DesktopDataReset)
], ShellDebugShortcut.prototype, "dataReset", void 0);
__decorate([
    inject(ShellLogUploadPanel),
    __metadata("design:type", typeof ShellLogUploadPanel === "undefined" ? Object : ShellLogUploadPanel)
], ShellDebugShortcut.prototype, "logUpload", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellDebugShortcut.prototype, "configuration", void 0);
__decorate([
    inject(ShellDebugWindow),
    __metadata("design:type", typeof ShellDebugWindow === "undefined" ? Object : ShellDebugWindow)
], ShellDebugShortcut.prototype, "debugWindow", void 0);
ShellDebugShortcut = __decorate([
    injectable()
], ShellDebugShortcut);
