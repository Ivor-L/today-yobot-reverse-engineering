// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/rpc-debug/modules/window/index.ts.
// The original TypeScript and import graph are not restored.








class ShellRpcDebugWindow {
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
    publish(record) {
        const window = this.debugWindow;
        if (!this.rendererSubscribed || !window || window.isDestroyed()) {
            return;
        }
        try {
            window.webContents.send(RPC_DEBUG_RECORD_CHANNEL, record);
        } catch  {
            this.rendererSubscribed = false;
        }
    }
    setRendererSubscribed(subscribed) {
        this.rendererSubscribed = subscribed;
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
            height: (/* inlined export .RPC_DEBUG_WINDOW_HEIGHT */640),
            icon: this.assets.iconPath,
            minHeight: (/* inlined export .RPC_DEBUG_WINDOW_MIN_HEIGHT */420),
            minWidth: (/* inlined export .RPC_DEBUG_WINDOW_MIN_WIDTH */720),
            show: false,
            title: 'RPC Debug',
            useContentSize: true,
            width: (/* inlined export .RPC_DEBUG_WINDOW_WIDTH */920),
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                partition: RPC_DEBUG_SESSION_PARTITION,
                preload: this.assets.rpcDebugPreloadPath,
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
        });
        try {
            await window.loadFile(this.assets.rpcDebugPagePath);
        } catch (error) {
            console.error('[desktop] failed to load RPC debug page', error);
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
], ShellRpcDebugWindow.prototype, "assets", void 0);
ShellRpcDebugWindow = __decorate([
    injectable()
], ShellRpcDebugWindow);
