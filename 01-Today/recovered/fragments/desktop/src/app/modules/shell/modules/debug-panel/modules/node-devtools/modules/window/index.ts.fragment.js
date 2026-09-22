// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/node-devtools/modules/window/index.ts.
// The original TypeScript and import graph are not restored.










class ShellNodeDevToolsWindow {
    async show() {
        const currentWindow = this.nodeDevToolsWindow;
        if (currentWindow && !currentWindow.isDestroyed()) {
            await this.loadPromise;
            if (currentWindow.isMinimized()) {
                currentWindow.restore();
            }
            currentWindow.show();
            currentWindow.focus();
            return;
        }
        const inspectorUrl = this.inspector.open();
        let frontendUrl;
        try {
            frontendUrl = resolveNodeDevToolsFrontendUrl(inspectorUrl);
        } catch (error) {
            this.inspector.close();
            throw error;
        }
        let window;
        try {
            window = new external_electron_.BrowserWindow({
                autoHideMenuBar: this.configuration.platform !== 'darwin',
                backgroundColor: '#ffffff',
                height: (/* inlined export .NODE_DEVTOOLS_WINDOW_HEIGHT */800),
                icon: this.assets.iconPath,
                minHeight: (/* inlined export .NODE_DEVTOOLS_WINDOW_MIN_HEIGHT */600),
                minWidth: (/* inlined export .NODE_DEVTOOLS_WINDOW_MIN_WIDTH */800),
                show: false,
                title: 'Electron Node DevTools',
                useContentSize: true,
                width: (/* inlined export .NODE_DEVTOOLS_WINDOW_WIDTH */1200),
                webPreferences: {
                    contextIsolation: true,
                    devTools: false,
                    nodeIntegration: false,
                    partition: NODE_DEVTOOLS_SESSION_PARTITION,
                    sandbox: true,
                    webSecurity: true,
                    webviewTag: false
                }
            });
        } catch (error) {
            this.inspector.close();
            throw error;
        }
        this.nodeDevToolsWindow = window;
        window.webContents.setWindowOpenHandler(()=>({
                action: 'deny'
            }));
        window.webContents.on('will-navigate', (event)=>{
            event.preventDefault();
        });
        window.once('ready-to-show', ()=>{
            if (window.isDestroyed()) {
                return;
            }
            window.show();
            window.focus();
        });
        window.on('closed', ()=>{
            this.release(window);
        });
        let loadPromise;
        try {
            loadPromise = window.loadURL(frontendUrl);
        } catch (error) {
            this.destroy(window);
            throw error;
        }
        this.loadPromise = loadPromise;
        try {
            await loadPromise;
        } catch (error) {
            this.destroy(window);
            throw error;
        } finally{
            if (this.loadPromise === loadPromise) {
                this.loadPromise = undefined;
            }
        }
    }
    destroy(window) {
        if (this.nodeDevToolsWindow !== window) {
            return;
        }
        this.nodeDevToolsWindow = undefined;
        try {
            if (!window.isDestroyed()) {
                window.destroy();
            }
        } finally{
            this.inspector.close();
        }
    }
    release(window) {
        if (this.nodeDevToolsWindow !== window) {
            return;
        }
        this.nodeDevToolsWindow = undefined;
        this.inspector.close();
    }
}
__decorate([
    inject(DesktopAssets),
    __metadata("design:type", typeof DesktopAssets === "undefined" ? Object : DesktopAssets)
], ShellNodeDevToolsWindow.prototype, "assets", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellNodeDevToolsWindow.prototype, "configuration", void 0);
__decorate([
    inject(ShellNodeInspector),
    __metadata("design:type", typeof ShellNodeInspector === "undefined" ? Object : ShellNodeInspector)
], ShellNodeDevToolsWindow.prototype, "inspector", void 0);
ShellNodeDevToolsWindow = __decorate([
    injectable()
], ShellNodeDevToolsWindow);
