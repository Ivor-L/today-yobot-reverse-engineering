// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/logs-debug/modules/window/index.ts.
// The original TypeScript and import graph are not restored.








class ShellLogsDebugWindow {
    close() {
        const window = this.debugWindow;
        if (window && !window.isDestroyed()) {
            window.close();
        }
    }
    isTrustedSender(event) {
        const window = this.debugWindow;
        if (!window || window.isDestroyed()) {
            return false;
        }
        const { sender, senderFrame } = event;
        return sender === window.webContents && senderFrame === sender.mainFrame;
    }
    publish(event) {
        const window = this.debugWindow;
        if (!this.rendererSubscribed || !window || window.isDestroyed()) {
            return;
        }
        try {
            window.webContents.send(LOGS_DEBUG_EVENT_CHANNEL, event);
        } catch  {
            this.rendererSubscribed = false;
        }
    }
    setRendererSubscribed(subscribed) {
        this.rendererSubscribed = subscribed;
    }
    setClosedHandler(handler) {
        this.closedHandler = handler;
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
            height: (/* inlined export .LOGS_DEBUG_WINDOW_HEIGHT */680),
            icon: this.assets.iconPath,
            minHeight: (/* inlined export .LOGS_DEBUG_WINDOW_MIN_HEIGHT */460),
            minWidth: (/* inlined export .LOGS_DEBUG_WINDOW_MIN_WIDTH */760),
            show: false,
            title: 'Logs Debug',
            useContentSize: true,
            width: (/* inlined export .LOGS_DEBUG_WINDOW_WIDTH */1000),
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                partition: LOGS_DEBUG_SESSION_PARTITION,
                preload: this.assets.logsDebugPreloadPath,
                sandbox: true,
                webSecurity: true,
                webviewTag: false
            }
        });
        this.debugWindow = window;
        this.rendererSubscribed = false;
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
                this.rendererSubscribed = false;
            }
            this.closedHandler?.();
        });
        try {
            await window.loadFile(this.assets.logsDebugPagePath);
        } catch (error) {
            console.error('[desktop] failed to load Logs debug page', error);
            if (!window.isDestroyed()) {
                window.show();
            }
        }
    }
    constructor(){
        this.rendererSubscribed = false;
    }
}
__decorate([
    inject(DesktopAssets),
    __metadata("design:type", typeof DesktopAssets === "undefined" ? Object : DesktopAssets)
], ShellLogsDebugWindow.prototype, "assets", void 0);
ShellLogsDebugWindow = __decorate([
    injectable()
], ShellLogsDebugWindow);
