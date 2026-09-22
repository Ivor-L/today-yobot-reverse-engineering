// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/tools-debug/modules/window/index.ts.
// The original TypeScript and import graph are not restored.








class ShellToolsDebugWindow {
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
            window.webContents.send(TOOLS_DEBUG_RECORD_CHANNEL, record);
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
            height: (/* inlined export .TOOLS_DEBUG_WINDOW_HEIGHT */640),
            icon: this.assets.iconPath,
            minHeight: (/* inlined export .TOOLS_DEBUG_WINDOW_MIN_HEIGHT */420),
            minWidth: (/* inlined export .TOOLS_DEBUG_WINDOW_MIN_WIDTH */720),
            show: false,
            title: 'Tools Debug',
            useContentSize: true,
            width: (/* inlined export .TOOLS_DEBUG_WINDOW_WIDTH */920),
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                partition: TOOLS_DEBUG_SESSION_PARTITION,
                preload: this.assets.toolsDebugPreloadPath,
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
            await window.loadFile(this.assets.toolsDebugPagePath);
        } catch (error) {
            console.error('[desktop] failed to load Tools debug page', error);
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
], ShellToolsDebugWindow.prototype, "assets", void 0);
ShellToolsDebugWindow = __decorate([
    injectable()
], ShellToolsDebugWindow);
