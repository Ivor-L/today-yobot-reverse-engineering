// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/runtime-diagnostics/modules/web-console/index.ts.
// The original TypeScript and import graph are not restored.










class WebConsoleDiagnostics {
    start() {
        if (this.started) {
            return;
        }
        this.started = true;
        external_electron_.app.on('web-contents-created', this.handleWebContentsCreated);
        try {
            for (const contents of external_electron_.webContents.getAllWebContents()){
                this.attach(contents);
            }
        } catch  {
        // Future WebContents remain observable through the application listener.
        }
    }
    dispose() {
        if (!this.started) {
            return;
        }
        this.started = false;
        external_electron_.app.removeListener('web-contents-created', this.handleWebContentsCreated);
        for (const installation of this.installations.values()){
            this.detach(installation);
        }
        this.installations.clear();
    }
    attach(contents) {
        if (this.installations.has(contents) || contents.isDestroyed()) {
            return;
        }
        const listener = (details)=>{
            this.handleConsoleMessage(contents, details);
        };
        const destroyedListener = ()=>{
            const installation = this.installations.get(contents);
            if (installation) {
                this.detach(installation);
                this.installations.delete(contents);
            }
        };
        const installation = {
            destroyedListener,
            listener,
            webContents: contents
        };
        this.installations.set(contents, installation);
        contents.on('console-message', listener);
        contents.once('destroyed', destroyedListener);
    }
    detach(installation) {
        installation.webContents.removeListener('console-message', installation.listener);
        installation.webContents.removeListener('destroyed', installation.destroyedListener);
    }
    handleConsoleMessage(contents, details) {
        try {
            if (details.level !== 'warning' && details.level !== 'error' || details.frame !== contents.mainFrame) {
                return;
            }
            const surface = this.shell.resolveSurface(contents);
            if (surface === null) {
                return;
            }
            const output = sanitizeRuntimeDiagnosticText(details.message);
            if (!output) {
                return;
            }
            const sourceUrl = sanitizeRuntimeDiagnosticUrl(details.sourceId);
            const lineNumber = Number.isSafeInteger(details.lineNumber) && details.lineNumber >= 0 ? details.lineNumber : 0;
            this.recorder.record({
                id: WEB_CONSOLE_MESSAGE_EVENT_ID,
                layer: 'web',
                level: details.level === 'error' ? base_LogLevel.Error : base_LogLevel.Warning,
                payload: {
                    line_number: lineNumber,
                    message: output.message,
                    severity: details.level,
                    ...sourceUrl === undefined ? {} : {
                        source_url: sourceUrl
                    },
                    surface,
                    truncated: output.truncated,
                    web_contents_id: contents.id
                }
            });
        } catch  {
        // Renderer console diagnostics must never alter WebContents event delivery.
        }
    }
    constructor(){
        this.installations = new Map();
        this.started = false;
        this.handleWebContentsCreated = (_event, contents)=>{
            try {
                this.attach(contents);
            } catch  {
            // One unsupported WebContents must not affect the application event.
            }
        };
    }
}
__decorate([
    inject(CLIENT_NODE_SHELL),
    __metadata("design:type", typeof ClientNodeShellFacade === "undefined" ? Object : ClientNodeShellFacade)
], WebConsoleDiagnostics.prototype, "shell", void 0);
__decorate([
    inject(RuntimeDiagnosticRecorder),
    __metadata("design:type", typeof RuntimeDiagnosticRecorder === "undefined" ? Object : RuntimeDiagnosticRecorder)
], WebConsoleDiagnostics.prototype, "recorder", void 0);
WebConsoleDiagnostics = __decorate([
    injectable()
], WebConsoleDiagnostics);
