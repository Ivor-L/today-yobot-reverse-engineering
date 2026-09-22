// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/runtime-diagnostics/modules/node-console/index.ts.
// The original TypeScript and import graph are not restored.









class NodeConsoleDiagnostics {
    start() {
        if (this.started) {
            return;
        }
        this.started = true;
        try {
            const installations = [];
            this.installations = installations;
            installations.push(this.install('warn'));
            installations.push(this.install('error'));
        } catch (error) {
            this.dispose();
            throw error;
        }
    }
    dispose() {
        if (!this.started) {
            return;
        }
        this.started = false;
        for (const installation of this.installations){
            this.restore(installation);
        }
        this.installations = [];
    }
    install(method) {
        const descriptor = Object.getOwnPropertyDescriptor(console, method);
        const original = console[method];
        const diagnostics = this;
        const replacement = function(...arguments_) {
            return diagnostics.processOutput.runWithStderrCaptured(()=>Reflect.apply(original, this, arguments_), (output)=>{
                diagnostics.capture(method, output);
            });
        };
        const installed = Reflect.defineProperty(console, method, {
            configurable: true,
            value: replacement,
            writable: true
        });
        if (!installed) {
            throw new Error(`Unable to observe console.${method}.`);
        }
        return {
            ...descriptor === undefined ? {} : {
                descriptor
            },
            method,
            original,
            replacement
        };
    }
    capture(method, captured) {
        if (!this.started) {
            return;
        }
        try {
            const output = sanitizeRuntimeDiagnosticText(captured.message);
            if (!output) {
                return;
            }
            const severity = method === 'error' ? 'error' : 'warning';
            this.recorder.record({
                id: NODE_CONSOLE_MESSAGE_EVENT_ID,
                layer: 'node',
                level: method === 'error' ? base_LogLevel.Error : base_LogLevel.Warning,
                payload: {
                    message: output.message,
                    severity,
                    truncated: captured.truncated || output.truncated
                }
            });
        } catch  {
        // Main console diagnostics must never alter the original console call.
        }
    }
    restore(installation) {
        if (console[installation.method] !== installation.replacement) {
            return;
        }
        if (installation.descriptor) {
            Reflect.defineProperty(console, installation.method, installation.descriptor);
            return;
        }
        Reflect.deleteProperty(console, installation.method);
    }
    constructor(){
        this.installations = [];
        this.started = false;
    }
}
__decorate([
    inject(NodeProcessOutputDiagnostics),
    __metadata("design:type", typeof NodeProcessOutputDiagnostics === "undefined" ? Object : NodeProcessOutputDiagnostics)
], NodeConsoleDiagnostics.prototype, "processOutput", void 0);
__decorate([
    inject(RuntimeDiagnosticRecorder),
    __metadata("design:type", typeof RuntimeDiagnosticRecorder === "undefined" ? Object : RuntimeDiagnosticRecorder)
], NodeConsoleDiagnostics.prototype, "recorder", void 0);
NodeConsoleDiagnostics = __decorate([
    injectable()
], NodeConsoleDiagnostics);
