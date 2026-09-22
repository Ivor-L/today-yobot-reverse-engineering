// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/deep-link-debug/modules/window/index.ts.
// The original TypeScript and import graph are not restored.







class ShellDeepLinkDebugWindow {
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
            height: (/* inlined export .DEEP_LINK_DEBUG_WINDOW_HEIGHT */760),
            icon: this.assets.iconPath,
            minHeight: (/* inlined export .DEEP_LINK_DEBUG_WINDOW_MIN_HEIGHT */520),
            minWidth: (/* inlined export .DEEP_LINK_DEBUG_WINDOW_MIN_WIDTH */760),
            show: false,
            title: 'Deep Link Debug',
            useContentSize: true,
            width: (/* inlined export .DEEP_LINK_DEBUG_WINDOW_WIDTH */1180),
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                partition: DEEP_LINK_DEBUG_SESSION_PARTITION,
                preload: this.assets.deepLinkDebugPreloadPath,
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
            await window.loadFile(this.assets.deepLinkDebugPagePath);
        } catch  {
            console.error('[desktop] failed to load Deep Link debug page');
            if (!window.isDestroyed()) {
                window.show();
            }
        }
    }
}
__decorate([
    inject(DesktopAssets),
    __metadata("design:type", typeof DesktopAssets === "undefined" ? Object : DesktopAssets)
], ShellDeepLinkDebugWindow.prototype, "assets", void 0);
ShellDeepLinkDebugWindow = __decorate([
    injectable()
], ShellDeepLinkDebugWindow);
