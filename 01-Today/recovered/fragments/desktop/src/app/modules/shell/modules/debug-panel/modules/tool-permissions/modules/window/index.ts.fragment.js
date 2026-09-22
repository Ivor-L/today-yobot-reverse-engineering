// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/tool-permissions/modules/window/index.ts.
// The original TypeScript and import graph are not restored.







class ShellToolPermissionsWindow {
    close() {
        const window = this.permissionsWindow;
        if (window && !window.isDestroyed()) {
            window.close();
        }
    }
    isTrustedSender(event) {
        const window = this.permissionsWindow;
        if (!window || window.isDestroyed()) {
            return false;
        }
        const { sender, senderFrame } = event;
        return sender === window.webContents && senderFrame === sender.mainFrame;
    }
    async show() {
        if (this.opening) {
            await this.opening;
        }
        const currentWindow = this.permissionsWindow;
        if (currentWindow && !currentWindow.isDestroyed()) {
            currentWindow.show();
            currentWindow.focus();
            return;
        }
        const window = new external_electron_.BrowserWindow({
            autoHideMenuBar: false,
            backgroundColor: '#f4f2ed',
            height: (/* inlined export .TOOL_PERMISSIONS_WINDOW_HEIGHT */820),
            icon: this.assets.iconPath,
            minHeight: (/* inlined export .TOOL_PERMISSIONS_WINDOW_MIN_HEIGHT */620),
            minWidth: (/* inlined export .TOOL_PERMISSIONS_WINDOW_MIN_WIDTH */900),
            show: false,
            title: 'Tool Permissions',
            useContentSize: true,
            width: (/* inlined export .TOOL_PERMISSIONS_WINDOW_WIDTH */1180),
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                partition: TOOL_PERMISSIONS_SESSION_PARTITION,
                preload: this.assets.toolPermissionsPreloadPath,
                sandbox: true,
                webSecurity: true,
                webviewTag: false
            }
        });
        this.permissionsWindow = window;
        window.webContents.setWindowOpenHandler(()=>({
                action: 'deny'
            }));
        window.webContents.on('will-navigate', (event)=>{
            event.preventDefault();
        });
        window.once('ready-to-show', ()=>{
            if (!window.isDestroyed()) {
                window.show();
                window.focus();
            }
        });
        window.on('closed', ()=>{
            if (this.permissionsWindow === window) {
                this.permissionsWindow = undefined;
            }
        });
        const opening = this.load(window);
        this.opening = opening;
        try {
            await opening;
        } finally{
            if (this.opening === opening) {
                this.opening = undefined;
            }
        }
    }
    async load(window) {
        try {
            await window.loadFile(this.assets.toolPermissionsPagePath);
        } catch (error) {
            if (this.permissionsWindow === window) {
                this.permissionsWindow = undefined;
            }
            if (!window.isDestroyed()) {
                window.destroy();
            }
            throw error;
        }
    }
}
__decorate([
    inject(DesktopAssets),
    __metadata("design:type", typeof DesktopAssets === "undefined" ? Object : DesktopAssets)
], ShellToolPermissionsWindow.prototype, "assets", void 0);
ShellToolPermissionsWindow = __decorate([
    injectable()
], ShellToolPermissionsWindow);
