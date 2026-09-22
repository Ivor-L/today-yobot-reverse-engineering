// Compiled fragment from ./src/app/modules/shell/modules/log-upload/modules/window/index.ts.
// The original TypeScript and import graph are not restored.









class ShellLogUploadWindow {
    close() {
        const window = this.window;
        if (window && !window.isDestroyed()) {
            window.close();
        }
    }
    isTrustedSender(event) {
        const window = this.window;
        if (!window || window.isDestroyed()) {
            return false;
        }
        return event.sender === window.webContents && event.senderFrame === event.sender.mainFrame;
    }
    setRendererSubscribed(subscribed) {
        this.rendererSubscribed = subscribed;
    }
    publish(state) {
        const window = this.window;
        if (!this.rendererSubscribed || !window || window.isDestroyed()) {
            return;
        }
        try {
            window.webContents.send(LOG_UPLOAD_EVENT_CHANNEL, state);
        } catch  {
            this.rendererSubscribed = false;
        }
    }
    async show() {
        const currentWindow = this.window;
        if (currentWindow && !currentWindow.isDestroyed()) {
            await this.loading;
            if (!currentWindow.isDestroyed()) {
                currentWindow.show();
                currentWindow.focus();
            }
            return;
        }
        const platform = this.configuration.platform;
        const window = new external_electron_.BrowserWindow({
            autoHideMenuBar: true,
            backgroundColor: '#f7f6f2',
            center: true,
            fullscreenable: false,
            height: 442,
            icon: this.assets.iconPath,
            maximizable: false,
            minimizable: true,
            resizable: false,
            show: false,
            title: 'Upload logs',
            titleBarStyle: platform === 'darwin' ? 'hiddenInset' : 'hidden',
            ...platform === 'darwin' ? {
                frame: true,
                hasShadow: true,
                transparent: false
            } : {
                titleBarOverlay: {
                    color: '#00000000',
                    symbolColor: '#272923',
                    height: 36
                }
            },
            useContentSize: true,
            width: 520,
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                partition: `desktop-log-upload-${(0,external_node_crypto_namespaceObject.randomUUID)()}`,
                preload: this.assets.logUploadPreloadPath,
                sandbox: true,
                webSecurity: true,
                webviewTag: false
            }
        });
        this.window = window;
        this.rendererSubscribed = false;
        window.setMenu(null);
        window.webContents.setWindowOpenHandler(()=>({
                action: 'deny'
            }));
        window.webContents.on('will-navigate', (event)=>{
            event.preventDefault();
        });
        window.webContents.on('will-redirect', (event)=>{
            event.preventDefault();
        });
        window.on('closed', ()=>{
            if (this.window === window) {
                this.window = undefined;
                this.rendererSubscribed = false;
            }
        });
        const loading = this.load(window);
        this.loading = loading;
        try {
            await loading;
        } finally{
            if (this.loading === loading) {
                this.loading = undefined;
            }
        }
    }
    async load(window) {
        const firstFrame = new Promise((resolve)=>{
            window.once('ready-to-show', resolve);
            window.once('closed', resolve);
        });
        try {
            await window.loadFile(this.assets.logUploadPagePath);
            await firstFrame;
            if (!window.isDestroyed()) {
                window.show();
                window.focus();
            }
        } catch (error) {
            if (!window.isDestroyed()) {
                window.destroy();
            }
            throw error;
        }
    }
    constructor(){
        this.rendererSubscribed = false;
    }
}
__decorate([
    inject(DesktopAssets),
    __metadata("design:type", typeof DesktopAssets === "undefined" ? Object : DesktopAssets)
], ShellLogUploadWindow.prototype, "assets", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellLogUploadWindow.prototype, "configuration", void 0);
ShellLogUploadWindow = __decorate([
    injectable()
], ShellLogUploadWindow);
