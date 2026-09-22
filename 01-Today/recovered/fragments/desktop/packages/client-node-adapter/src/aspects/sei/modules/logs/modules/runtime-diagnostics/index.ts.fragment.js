// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/runtime-diagnostics/index.ts.
// The original TypeScript and import graph are not restored.











class RuntimeDiagnostics {
    hasPendingIssues() {
        return this.recorder.hasPendingIssues();
    }
    flushIssues() {
        return this.recorder.flushIssues();
    }
    start() {
        if (this.started) {
            return;
        }
        this.started = true;
        const activeSources = [];
        this.activeSources = activeSources;
        for (const source of this.sources){
            try {
                source.start();
                activeSources.push(source);
            } catch  {
                try {
                    source.dispose();
                } catch  {
                // One unavailable source must not disable the remaining diagnostics.
                }
            }
        }
    }
    dispose() {
        if (!this.started) {
            return;
        }
        this.started = false;
        for (const source of [
            ...this.activeSources
        ].reverse()){
            try {
                source.dispose();
            } catch  {
            // Runtime diagnostic cleanup must not prevent File logs from flushing.
            }
        }
        this.activeSources = [];
    }
    get sources() {
        return [
            this.nodeProcessOutput,
            this.nodeConsole,
            this.nodeNetwork,
            this.webConsole,
            this.webNetwork,
            this.webRuntime
        ];
    }
    constructor(){
        this.activeSources = [];
        this.started = false;
    }
}
__decorate([
    inject(NodeConsoleDiagnostics),
    __metadata("design:type", typeof NodeConsoleDiagnostics === "undefined" ? Object : NodeConsoleDiagnostics)
], RuntimeDiagnostics.prototype, "nodeConsole", void 0);
__decorate([
    inject(NodeNetworkDiagnostics),
    __metadata("design:type", typeof NodeNetworkDiagnostics === "undefined" ? Object : NodeNetworkDiagnostics)
], RuntimeDiagnostics.prototype, "nodeNetwork", void 0);
__decorate([
    inject(NodeProcessOutputDiagnostics),
    __metadata("design:type", typeof NodeProcessOutputDiagnostics === "undefined" ? Object : NodeProcessOutputDiagnostics)
], RuntimeDiagnostics.prototype, "nodeProcessOutput", void 0);
__decorate([
    inject(WebConsoleDiagnostics),
    __metadata("design:type", typeof WebConsoleDiagnostics === "undefined" ? Object : WebConsoleDiagnostics)
], RuntimeDiagnostics.prototype, "webConsole", void 0);
__decorate([
    inject(WebNetworkDiagnostics),
    __metadata("design:type", typeof WebNetworkDiagnostics === "undefined" ? Object : WebNetworkDiagnostics)
], RuntimeDiagnostics.prototype, "webNetwork", void 0);
__decorate([
    inject(WebRuntimeDiagnostics),
    __metadata("design:type", typeof WebRuntimeDiagnostics === "undefined" ? Object : WebRuntimeDiagnostics)
], RuntimeDiagnostics.prototype, "webRuntime", void 0);
__decorate([
    inject(RuntimeDiagnosticRecorder),
    __metadata("design:type", typeof RuntimeDiagnosticRecorder === "undefined" ? Object : RuntimeDiagnosticRecorder)
], RuntimeDiagnostics.prototype, "recorder", void 0);
RuntimeDiagnostics = __decorate([
    injectable()
], RuntimeDiagnostics);
