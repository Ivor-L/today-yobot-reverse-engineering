// Compiled fragment from ./src/app/modules/remote-debugging/index.ts.
// The original TypeScript and import graph are not restored.








class DesktopRemoteDebugging {
    prepare() {
        if (this.inspectPort) {
            return;
        }
        const { inspectable, inspectPort } = this.configuration.current.launchOptions;
        if (!inspectable) {
            return;
        }
        if (!inspectPort) {
            throw new Error('Inspectable desktop startup requires a configured inspector port.');
        }
        this.activePort.prepare();
        this.inspectPort = inspectPort;
    }
    async start() {
        if (!this.configuration.current.launchOptions.inspectable) {
            return;
        }
        if (!this.inspectPort) {
            throw new Error('Remote debugging must be prepared before Electron is ready.');
        }
        if (!this.startPromise) {
            this.startPromise = this.startBridge(this.inspectPort);
        }
        await this.startPromise;
    }
    async startBridge(inspectPort) {
        const targetPort = await this.activePort.waitForPort();
        await this.bridge.start({
            onError: this.handleBridgeError,
            port: inspectPort,
            targetPort
        });
        this.configuration.application.once('will-quit', this.handleWillQuit);
        console.warn(`[desktop] unauthenticated remote debugging exposed on ${REMOTE_DEBUGGING_HOST}:${inspectPort}`);
    }
    constructor(){
        this.close = async ()=>{
            this.configuration.application.removeListener('will-quit', this.handleWillQuit);
            try {
                await this.bridge.close();
            } finally{
                this.startPromise = undefined;
            }
        };
        this.handleBridgeError = (error)=>{
            queueMicrotask(()=>{
                throw error;
            });
        };
        this.handleWillQuit = ()=>{
            this.close().catch((error)=>{
                console.error('[desktop] failed to close remote debugging bridge', error);
            });
        };
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], DesktopRemoteDebugging.prototype, "configuration", void 0);
__decorate([
    inject(DevToolsActivePort),
    __metadata("design:type", typeof DevToolsActivePort === "undefined" ? Object : DevToolsActivePort)
], DesktopRemoteDebugging.prototype, "activePort", void 0);
__decorate([
    inject(RemoteDebuggingBridge),
    __metadata("design:type", typeof RemoteDebuggingBridge === "undefined" ? Object : RemoteDebuggingBridge)
], DesktopRemoteDebugging.prototype, "bridge", void 0);
DesktopRemoteDebugging = __decorate([
    injectable()
], DesktopRemoteDebugging);
