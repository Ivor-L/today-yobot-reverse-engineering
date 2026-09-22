// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/socket-debug/modules/window/index.ts.
// The original TypeScript and import graph are not restored.








class ShellSocketDebugWindow {
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
        const packetEvent = {
            record
        };
        if (!this.rendererSubscribed || !window || window.isDestroyed()) {
            this.enqueue(packetEvent);
            return;
        }
        try {
            window.webContents.send(SOCKET_DEBUG_RECORD_CHANNEL, packetEvent);
        } catch  {
            this.rendererSubscribed = false;
            this.enqueue(packetEvent);
        }
    }
    setRendererSubscribed(subscribed) {
        this.rendererSubscribed = subscribed;
        if (subscribed) {
            this.flushBacklog();
        }
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
            height: (/* inlined export .SOCKET_DEBUG_WINDOW_HEIGHT */640),
            icon: this.assets.iconPath,
            minHeight: (/* inlined export .SOCKET_DEBUG_WINDOW_MIN_HEIGHT */420),
            minWidth: (/* inlined export .SOCKET_DEBUG_WINDOW_MIN_WIDTH */720),
            show: false,
            title: 'Socket Debug',
            useContentSize: true,
            width: (/* inlined export .SOCKET_DEBUG_WINDOW_WIDTH */920),
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                partition: SOCKET_DEBUG_SESSION_PARTITION,
                preload: this.assets.socketDebugPreloadPath,
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
            await window.loadFile(this.assets.socketDebugPagePath);
        } catch (error) {
            console.error('[desktop] failed to load Socket debug page', error);
            if (!window.isDestroyed()) {
                window.show();
            }
        }
    }
    enqueue(packetEvent) {
        if (this.backlog.length >= (/* inlined export .MAX_SOCKET_DEBUG_RECORDS */500)) {
            this.backlog.shift();
        }
        this.backlog.push(packetEvent);
    }
    flushBacklog() {
        const window = this.debugWindow;
        if (!this.rendererSubscribed || !window || window.isDestroyed()) {
            return;
        }
        while(this.backlog.length > 0){
            const packetEvent = this.backlog[0];
            if (!packetEvent) {
                return;
            }
            try {
                window.webContents.send(SOCKET_DEBUG_RECORD_CHANNEL, packetEvent);
            } catch  {
                this.rendererSubscribed = false;
                return;
            }
            this.backlog.shift();
        }
    }
    constructor(){
        this.rendererSubscribed = false;
        this.backlog = [];
    }
}
__decorate([
    inject(DesktopAssets),
    __metadata("design:type", typeof DesktopAssets === "undefined" ? Object : DesktopAssets)
], ShellSocketDebugWindow.prototype, "assets", void 0);
ShellSocketDebugWindow = __decorate([
    injectable()
], ShellSocketDebugWindow);
