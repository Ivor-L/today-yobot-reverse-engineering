// Compiled fragment from ./src/app/modules/shell/modules/debug-window/index.ts.
// The original TypeScript and import graph are not restored.








class ShellDebugWindow {
    attach(window) {
        this.mainWindow = window;
    }
    detach(window) {
        if (this.mainWindow !== window) {
            return;
        }
        this.mainWindow = undefined;
    }
    isMainWindow(window) {
        return this.mainWindow === window;
    }
    isTrustedSender(event) {
        const debugWindow = this.debugWindow;
        if (!debugWindow || debugWindow.isDestroyed()) {
            return false;
        }
        const { sender, senderFrame } = event;
        return sender === debugWindow.webContents && senderFrame === sender.mainFrame;
    }
    async confirmNodeNetworkInspectionRestart(enabled) {
        const action = enabled ? 'enable' : 'disable';
        const detail = enabled ? 'Node Network capture is experimental and may crash the Node thread and shut down the app.' : 'Node Network capture will be disabled after the restart.';
        return await this.confirmRestart(`Restart the app to ${action} Node Network capture?`, detail);
    }
    async confirmRestart(message, detail) {
        const debugWindow = this.debugWindow;
        if (!debugWindow || debugWindow.isDestroyed()) {
            throw new Error('Debug window is unavailable');
        }
        const result = await external_electron_.dialog.showMessageBox(debugWindow, {
            buttons: [
                'Restart App',
                'Cancel'
            ],
            cancelId: 1,
            defaultId: 1,
            detail,
            message,
            noLink: true,
            type: 'warning'
        });
        return result.response === 0;
    }
    openMainWindowDevTools() {
        const mainWindow = this.mainWindow;
        if (!mainWindow || mainWindow.isDestroyed()) {
            throw new Error('Main window is unavailable');
        }
        const debugWindow = this.debugWindow;
        if (debugWindow && !debugWindow.isDestroyed()) {
            debugWindow.close();
        }
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.openDevTools({
            activate: true,
            mode: 'undocked'
        });
    }
    reloadMainWindowPage() {
        const mainWindow = this.mainWindow;
        if (!mainWindow || mainWindow.isDestroyed()) {
            throw new Error('Main window is unavailable');
        }
        mainWindow.webContents.reload();
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }
        mainWindow.show();
        mainWindow.focus();
    }
    async reloadMainWindow(url) {
        const mainWindow = this.mainWindow;
        if (!mainWindow || mainWindow.isDestroyed()) {
            throw new Error('Main window is unavailable');
        }
        await mainWindow.loadURL(url);
        mainWindow.show();
        mainWindow.focus();
    }
    show() {
        const currentWindow = this.debugWindow;
        if (currentWindow && !currentWindow.isDestroyed()) {
            currentWindow.show();
            currentWindow.focus();
            return;
        }
        const window = new external_electron_.BrowserWindow({
            autoHideMenuBar: this.configuration.platform !== 'darwin',
            backgroundColor: '#f4f2ed',
            height: (/* inlined export .DEBUG_WINDOW_HEIGHT */400),
            icon: this.assets.iconPath,
            minHeight: (/* inlined export .DEBUG_WINDOW_MIN_HEIGHT */360),
            minWidth: (/* inlined export .DEBUG_WINDOW_MIN_WIDTH */400),
            show: false,
            title: 'Debug Console',
            useContentSize: true,
            width: (/* inlined export .DEBUG_WINDOW_WIDTH */480),
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                partition: DEBUG_SESSION_PARTITION,
                preload: this.assets.debugPreloadPath,
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
        window.loadFile(this.assets.debugPagePath).catch((error)=>{
            console.error('[desktop] failed to load debug page', error);
            if (!window.isDestroyed()) {
                window.show();
            }
        });
    }
}
__decorate([
    inject(DesktopAssets),
    __metadata("design:type", typeof DesktopAssets === "undefined" ? Object : DesktopAssets)
], ShellDebugWindow.prototype, "assets", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellDebugWindow.prototype, "configuration", void 0);
ShellDebugWindow = __decorate([
    injectable()
], ShellDebugWindow);
