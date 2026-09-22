// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/runtime-diagnostics/modules/recorder/index.ts.
// The original TypeScript and import graph are not restored.









class RuntimeDiagnosticRecorder {
    hasPendingIssues() {
        return this.pendingIssues.size > 0;
    }
    async flushIssues() {
        await Promise.allSettled([
            ...this.pendingIssues
        ]);
    }
    record(event) {
        try {
            if (!this.reserve(event)) {
                return;
            }
            this.append(event);
        } catch  {
        // Runtime diagnostics must never alter the observed operation or write recursively.
        }
    }
    reserve(event) {
        const key = `${event.layer}:${event.id}:${event.level}`;
        const now = Date.now();
        let window = this.rateWindows.get(key);
        if (!window || now - window.startedAt >= (/* inlined export .RUNTIME_DIAGNOSTIC_EVENT_WINDOW_MS */60000)) {
            window = {
                count: 0,
                limited: false,
                startedAt: now
            };
            this.rateWindows.set(key, window);
        }
        if (window.count < (/* inlined export .RUNTIME_DIAGNOSTIC_EVENT_LIMIT */240)) {
            window.count += 1;
            return true;
        }
        if (!window.limited) {
            window.limited = true;
            this.append({
                id: RUNTIME_DIAGNOSTIC_RATE_LIMIT_EVENT_ID,
                layer: event.layer,
                level: base_LogLevel.Warning,
                payload: {
                    event_id: event.id,
                    level: event.level,
                    limit: (/* inlined export .RUNTIME_DIAGNOSTIC_EVENT_LIMIT */240),
                    window_ms: (/* inlined export .RUNTIME_DIAGNOSTIC_EVENT_WINDOW_MS */60000)
                }
            });
        }
        return false;
    }
    append(event) {
        const { layer, ...params } = event;
        const entry = this.context.enrich(layer, params);
        try {
            this.store.append(entry);
        } finally{
            if (event.issue === true) {
                const report = this.sentry.push(entry);
                this.pendingIssues.add(report);
                this.settleIssue(report);
            }
        }
    }
    async settleIssue(report) {
        try {
            await report;
        } catch  {
        // Issue delivery must not affect the observed operation or report recursively.
        } finally{
            this.pendingIssues.delete(report);
        }
    }
    constructor(){
        this.rateWindows = new Map();
        this.pendingIssues = new Set();
    }
}
__decorate([
    inject(LogsContext),
    __metadata("design:type", typeof LogsContext === "undefined" ? Object : LogsContext)
], RuntimeDiagnosticRecorder.prototype, "context", void 0);
__decorate([
    inject(FileLogStore),
    __metadata("design:type", typeof FileLogStore === "undefined" ? Object : FileLogStore)
], RuntimeDiagnosticRecorder.prototype, "store", void 0);
__decorate([
    inject(SentryLogsPushTarget),
    __metadata("design:type", typeof SentryLogsPushTarget === "undefined" ? Object : SentryLogsPushTarget)
], RuntimeDiagnosticRecorder.prototype, "sentry", void 0);
RuntimeDiagnosticRecorder = __decorate([
    injectable()
], RuntimeDiagnosticRecorder);
