// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/record-debug/modules/window/index.ts.
// The original TypeScript and import graph are not restored.







class ShellRecordDebugWindow {
    isTrustedSender(event) {
        const window = this.debugWindow;
        if (!window || window.isDestroyed()) {
            return false;
        }
        const { sender, senderFrame } = event;
        return sender === window.webContents && senderFrame === sender.mainFrame;
    }
    async show() {
        const currentWindow = this.debugWindow;
        if (currentWindow && !currentWindow.isDestroyed()) {
            currentWindow.show();
            currentWindow.focus();
            return;
        }
        const window = new external_electron_.BrowserWindow({
            autoHideMenuBar: false,
            backgroundColor: '#f4f2ed',
            height: (/* inlined export .RECORD_DEBUG_WINDOW_HEIGHT */790),
            icon: this.assets.iconPath,
            minHeight: (/* inlined export .RECORD_DEBUG_WINDOW_MIN_HEIGHT */520),
            minWidth: (/* inlined export .RECORD_DEBUG_WINDOW_MIN_WIDTH */560),
            show: false,
            title: 'Record Simulation',
            useContentSize: true,
            width: (/* inlined export .RECORD_DEBUG_WINDOW_WIDTH */720),
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                partition: RECORD_DEBUG_SESSION_PARTITION,
                preload: this.assets.recordDebugPreloadPath,
                sandbox: true,
                webSecurity: true,
                webviewTag: false
            }
        });
        this.debugWindow = window;
        window.webContents.setWindowOpenHandler(()=>({
                action: 'deny'
            }));
        window.webContents.on('will-navigate', (event)=>{
            event.preventDefault();
        });
        window.once('ready-to-show', ()=>{
            window.show();
            window.focus();
        });
        window.on('closed', ()=>{
            if (this.debugWindow === window) {
                this.debugWindow = undefined;
            }
        });
        try {
            await window.loadFile(this.assets.recordDebugPagePath);
        } catch  {
            if (this.debugWindow === window) {
                this.debugWindow = undefined;
            }
            if (!window.isDestroyed()) {
                window.destroy();
            }
            throw new Error('Unable to open Record Simulation. Please try again.');
        }
    }
}
__decorate([
    inject(DesktopAssets),
    __metadata("design:type", typeof DesktopAssets === "undefined" ? Object : DesktopAssets)
], ShellRecordDebugWindow.prototype, "assets", void 0);
ShellRecordDebugWindow = __decorate([
    injectable()
], ShellRecordDebugWindow);
