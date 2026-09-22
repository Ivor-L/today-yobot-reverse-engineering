// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/runtime-diagnostics/modules/web-runtime/index.ts.
// The original TypeScript and import graph are not restored.











class WebRuntimeDiagnostics {
    start() {
        if (this.subscription) {
            return;
        }
        const runtimeWatcher = this.runtimeWatcher;
        if (!runtimeWatcher) {
            return;
        }
        this.telemetryEndpoints = resolveRuntimeTelemetryEndpoints(this.config);
        this.subscription = runtimeWatcher.subscribe(this.handleDiagnostic);
    }
    dispose() {
        const subscription = this.subscription;
        this.subscription = undefined;
        this.telemetryEndpoints = [];
        try {
            subscription?.unsubscribe();
        } catch  {
        // The Desktop runtime watcher must not block File log shutdown.
        }
    }
    recordConsoleMessage(diagnostic) {
        const output = sanitizeRuntimeDiagnosticText(diagnostic.message);
        if (!output) {
            return;
        }
        const byteLength = resolveWebRuntimeDiagnosticInteger(diagnostic.byteLength);
        this.recorder.record({
            id: WEB_RUNTIME_CONSOLE_MESSAGE_EVENT_ID,
            layer: 'node',
            level: diagnostic.severity === 'error' ? base_LogLevel.Error : base_LogLevel.Warning,
            payload: {
                byte_length: byteLength ?? output.byteLength,
                message: output.message,
                runtime: (/* inlined export .WEB_RUNTIME_NAME */"next"),
                severity: diagnostic.severity,
                truncated: diagnostic.truncated || output.truncated
            }
        });
    }
    recordProcessOutput(diagnostic) {
        const output = sanitizeRuntimeDiagnosticText(diagnostic.message);
        if (!output) {
            return;
        }
        const byteLength = resolveWebRuntimeDiagnosticInteger(diagnostic.byteLength);
        this.recorder.record({
            id: WEB_RUNTIME_PROCESS_OUTPUT_EVENT_ID,
            layer: 'node',
            level: diagnostic.stream === 'stderr' ? base_LogLevel.Warning : base_LogLevel.Log,
            payload: {
                byte_length: byteLength ?? output.byteLength,
                message: output.message,
                runtime: (/* inlined export .WEB_RUNTIME_NAME */"next"),
                stream: diagnostic.stream,
                truncated: diagnostic.truncated || output.truncated
            }
        });
    }
    recordNetworkRequest(diagnostic) {
        if (isRuntimeLoopbackUrl(diagnostic.url) || isRuntimeTelemetryUrl(diagnostic.url, this.telemetryEndpoints)) {
            return;
        }
        const durationMs = resolveWebRuntimeDiagnosticDuration(diagnostic.durationMs);
        const url = sanitizeRuntimeDiagnosticUrl(diagnostic.url);
        if (durationMs === undefined || url === undefined) {
            return;
        }
        const statusCode = resolveWebRuntimeDiagnosticStatusCode(diagnostic.statusCode);
        const contentType = resolveRuntimeDiagnosticContentType({
            'content-type': diagnostic.contentType
        });
        const errorCode = resolveRuntimeDiagnosticErrorCode(diagnostic.errorCode);
        const failed = diagnostic.outcome === 'failed';
        this.recorder.record({
            id: WEB_RUNTIME_NETWORK_REQUEST_EVENT_ID,
            layer: 'node',
            level: resolveRuntimeDiagnosticNetworkLevel(statusCode, failed),
            payload: {
                direction: 'outbound',
                duration_ms: durationMs,
                method: sanitizeRuntimeDiagnosticMethod(diagnostic.method),
                outcome: diagnostic.outcome,
                runtime: (/* inlined export .WEB_RUNTIME_NAME */"next"),
                transport: diagnostic.transport,
                url,
                ...failed || contentType === undefined ? {} : {
                    content_type: contentType
                },
                ...failed || statusCode === undefined ? {} : {
                    status_code: statusCode
                },
                ...!failed || errorCode === undefined ? {} : {
                    error_code: errorCode
                }
            }
        });
    }
    recordProcessFailure(diagnostic) {
        const exitCode = diagnostic.exitCode === undefined ? undefined : resolveWebRuntimeDiagnosticInteger(diagnostic.exitCode);
        const errorCode = resolveRuntimeDiagnosticErrorCode(diagnostic.errorCode);
        this.recorder.record({
            id: WEB_RUNTIME_PROCESS_FAILURE_EVENT_ID,
            issue: true,
            layer: 'node',
            level: base_LogLevel.Error,
            payload: {
                phase: diagnostic.phase,
                reason: diagnostic.reason,
                runtime: (/* inlined export .WEB_RUNTIME_NAME */"next"),
                ...exitCode === undefined ? {} : {
                    exit_code: exitCode
                },
                ...errorCode === undefined ? {} : {
                    error_code: errorCode
                }
            }
        });
    }
    recordRateLimit(diagnostic) {
        const limit = resolveWebRuntimeDiagnosticInteger(diagnostic.limit);
        const windowMs = resolveWebRuntimeDiagnosticInteger(diagnostic.windowMs);
        if (limit === undefined || windowMs === undefined) {
            return;
        }
        this.recorder.record({
            id: RUNTIME_DIAGNOSTIC_RATE_LIMIT_EVENT_ID,
            layer: 'node',
            level: base_LogLevel.Warning,
            payload: {
                event_id: diagnostic.source === 'console-message' ? WEB_RUNTIME_CONSOLE_MESSAGE_EVENT_ID : WEB_RUNTIME_NETWORK_REQUEST_EVENT_ID,
                level: diagnostic.level,
                limit,
                window_ms: windowMs
            }
        });
    }
    constructor(){
        this.telemetryEndpoints = [];
        this.handleDiagnostic = (diagnostic)=>{
            try {
                if (diagnostic.kind === 'console-message') {
                    this.recordConsoleMessage(diagnostic);
                    return;
                }
                if (diagnostic.kind === 'process-output') {
                    this.recordProcessOutput(diagnostic);
                    return;
                }
                if (diagnostic.kind === 'network-request') {
                    this.recordNetworkRequest(diagnostic);
                    return;
                }
                if (diagnostic.kind === 'process-failure') {
                    this.recordProcessFailure(diagnostic);
                    return;
                }
                this.recordRateLimit(diagnostic);
            } catch  {
            // A malformed or unavailable Desktop runtime watcher must not affect the UtilityProcess.
            }
        };
    }
}
__decorate([
    inject(CLIENT_NODE_LOGS_CONFIG),
    __metadata("design:type", typeof ClientNodeLogsConfig === "undefined" ? Object : ClientNodeLogsConfig)
], WebRuntimeDiagnostics.prototype, "config", void 0);
__decorate([
    inject(RuntimeDiagnosticRecorder),
    __metadata("design:type", typeof RuntimeDiagnosticRecorder === "undefined" ? Object : RuntimeDiagnosticRecorder)
], WebRuntimeDiagnostics.prototype, "recorder", void 0);
__decorate([
    inject(CLIENT_NODE_RUNTIME_WATCHER),
    optional_optional(),
    __metadata("design:type", typeof ClientNodeRuntimeWatcher === "undefined" ? Object : ClientNodeRuntimeWatcher)
], WebRuntimeDiagnostics.prototype, "runtimeWatcher", void 0);
WebRuntimeDiagnostics = __decorate([
    injectable()
], WebRuntimeDiagnostics);
