// Compiled fragment from ./src/app/modules/web-runtime/modules/runtime-host/index.ts.
// The original TypeScript and import graph are not restored.









class DesktopWebRuntimeHost {
    static create(parentPort) {
        const container = new Container({
            autobind: true,
            defaultScope: 'Singleton'
        });
        container.bind(DESKTOP_WEB_RUNTIME_HOST_PARENT_PORT).toConstantValue(parentPort);
        return container.get(DesktopWebRuntimeHost);
    }
    start() {
        if (this.started) {
            return;
        }
        this.started = true;
        this.parentPort.once('message', this.handleLaunchMessage);
    }
    dispose() {
        if (this.started) {
            this.started = false;
            this.parentPort.removeListener('message', this.handleLaunchMessage);
        }
        this.diagnostics.dispose();
    }
    async launch(value) {
        try {
            if (!isDesktopWebRuntimeLaunchMessage(value)) {
                throw new Error('The packaged Next runtime received an invalid launch request.');
            }
            try {
                this.diagnostics.start(value.nonce);
            } catch  {
            // Diagnostics are best effort and must not block the packaged runtime.
            }
            await this.server.launch(value);
        } catch (error) {
            try {
                console.error(error);
            } catch  {
            // A replaced console implementation must not prevent process exit.
            }
            this.exitAfterDiagnosticsFlush();
        }
    }
    exitAfterDiagnosticsFlush() {
        process.exitCode = 1;
        const exit = ()=>{
            try {
                this.dispose();
            } catch  {
            // Diagnostics cleanup must not prevent process exit.
            }
            process.exit(1);
        };
        try {
            process.stderr.write('', ()=>{
                setImmediate(exit);
            });
        } catch  {
            setImmediate(exit);
        }
    }
    constructor(){
        this.started = false;
        this.handleLaunchMessage = (event)=>{
            this.started = false;
            this.launch(event.data);
        };
    }
}
__decorate([
    inject(DESKTOP_WEB_RUNTIME_HOST_PARENT_PORT),
    __metadata("design:type", typeof DesktopWebRuntimeHostParentPort === "undefined" ? Object : DesktopWebRuntimeHostParentPort)
], DesktopWebRuntimeHost.prototype, "parentPort", void 0);
__decorate([
    inject(DesktopWebRuntimeHostDiagnostics),
    __metadata("design:type", typeof DesktopWebRuntimeHostDiagnostics === "undefined" ? Object : DesktopWebRuntimeHostDiagnostics)
], DesktopWebRuntimeHost.prototype, "diagnostics", void 0);
__decorate([
    inject(DesktopWebRuntimeHostServer),
    __metadata("design:type", typeof DesktopWebRuntimeHostServer === "undefined" ? Object : DesktopWebRuntimeHostServer)
], DesktopWebRuntimeHost.prototype, "server", void 0);
DesktopWebRuntimeHost = __decorate([
    injectable()
], DesktopWebRuntimeHost);
