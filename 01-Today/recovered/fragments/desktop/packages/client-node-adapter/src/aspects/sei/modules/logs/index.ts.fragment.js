// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/index.ts.
// The original TypeScript and import graph are not restored.
















class LogsShellService extends readonly_events_ReadonlyEvents {
    registerLifecycleListeners() {
        external_electron_.app.on('before-quit', this.handleBeforeQuit);
        external_electron_.app.on('render-process-gone', this.handleRenderProcessGone);
        external_electron_.app.on('child-process-gone', this.handleChildProcessGone);
        process.on('uncaughtExceptionMonitor', this.handleUncaughtExceptionMonitor);
        process.on('uncaughtException', this.handleUncaughtException);
    }
    async initialize() {
        this.runtimeDiagnostics.start();
        try {
            await this.context.getDeviceId();
        } catch  {
        // Device identity prewarming is best effort and must not block Adapter launch.
        }
    }
    push(params) {
        return this.pushFrom('node', params);
    }
    async pushFrom(layer, params) {
        this.assertActive();
        const entry = this.context.enrich(layer, params);
        const targetNames = this.resolveTargetNames(params);
        await this.dispatcher.dispatch(targetNames, ()=>entry);
    }
    pushMetrics(params) {
        return this.pushMetricsFrom('node', params);
    }
    async pushMetricsFrom(layer, params) {
        this.assertActive();
        const environment = this.context.readEnvironment();
        const points = prepareMetricPoints(params, this.context.metricAttributes(layer, environment));
        if (points.length === 0) {
            return;
        }
        const recordMetrics = async ()=>{
            this.metrics.push(points, environment);
        };
        const results = await Promise.allSettled([
            recordMetrics(),
            ...points.map(async (point)=>{
                await this.pushFrom(layer, {
                    id: point.name,
                    level: base_LogLevel.Info,
                    payload: {
                        type: point.type,
                        value: point.value,
                        ...point.unit === undefined ? {} : {
                            unit: point.unit
                        },
                        ...point.attributes === undefined ? {} : {
                            attributes: point.attributes
                        }
                    }
                });
            })
        ]);
        const failure = results.find((result)=>result.status === 'rejected');
        if (failure?.status === 'rejected') {
            throw interface_error_InterfaceError(failure.reason);
        }
    }
    resolveTargetNames({ target, issue }) {
        const targetNames = new Set([
            (/* inlined export .PushTarget.Console */"console"),
            (/* inlined export .PushTarget.File */"file")
        ]);
        if (issue === true) {
            targetNames.add((/* inlined export .PushTarget.Sentry */"sentry"));
        }
        if (typeof target === 'string') {
            targetNames.add(target);
        } else if (target !== undefined) {
            for (const targetName of target){
                targetNames.add(targetName);
            }
        }
        return targetNames;
    }
    async getLocalUploadState() {
        this.assertActive();
        return this.uploadState;
    }
    async openDirectory() {
        this.assertActive();
        await this.file.openDirectory();
    }
    async uploadLocal() {
        await this.runUpload();
    }
    async uploadRemote(requestId, signal, onProgress) {
        return await this.runUpload({
            onProgress,
            requestId,
            signal
        });
    }
    async runUpload(remote) {
        this.assertActive();
        if (this.uploading) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'A local log upload is already in progress.');
        }
        this.uploading = true;
        try {
            return await this.performUpload(remote);
        } finally{
            this.uploading = false;
        }
    }
    dispose() {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        external_electron_.app.removeListener('before-quit', this.handleBeforeQuit);
        external_electron_.app.removeListener('render-process-gone', this.handleRenderProcessGone);
        external_electron_.app.removeListener('child-process-gone', this.handleChildProcessGone);
        process.removeListener('uncaughtExceptionMonitor', this.handleUncaughtExceptionMonitor);
        process.removeListener('uncaughtException', this.handleUncaughtException);
        this.runtimeDiagnostics.dispose();
        this.file.dispose();
        for (const target of this.targets){
            if (target === this.file) {
                continue;
            }
            try {
                target.dispose();
            } catch  {
            // Logs targets must never recursively report their own shutdown failure.
            }
        }
    }
    async reportCrash(id, payload, issue = true) {
        try {
            await this.pushFrom('node', {
                id,
                level: base_LogLevel.Error,
                issue,
                payload,
                target: (/* inlined export .PushTarget.Sentry */"sentry")
            });
        } catch  {
        // Crash reporting must never trigger another log or change process behavior.
        }
    }
    async finishRuntimeIssueReports() {
        try {
            await this.runtimeDiagnostics.flushIssues();
        } catch  {
        // A failed Issue flush must never keep the application running.
        }
        this.dispose();
        try {
            external_electron_.app.quit();
        } catch  {
        // Electron may already be terminating after the bounded Issue flush.
        }
    }
    async finishFatal(report) {
        await report;
        this.file.flush();
        process.exitCode = 1;
        try {
            external_electron_.app.quit();
        } catch  {
        // Electron is already terminating; the non-zero exit code remains the final fallback.
        }
    }
    async performUpload(remote) {
        this.assertNotCancelled(remote?.signal);
        this.setUploadState({
            status: (/* inlined export .LocalLogUploadStatus.Uploading */"uploading"),
            progress: 0,
            trigger: remote === undefined ? 'local' : 'remote',
            logId: null,
            error: null
        });
        this.emit('uploadStatusChanged', (/* inlined export .LocalLogUploadStatus.Uploading */"uploading"));
        this.emit('uploadProgressChanged', 0);
        remote?.onProgress(0);
        try {
            const onProgress = (progress)=>{
                if (Number.isFinite(progress) && progress > this.uploadState.progress && progress < 1) {
                    this.setUploadState({
                        ...this.uploadState,
                        progress
                    });
                    this.emit('uploadProgressChanged', progress);
                    remote?.onProgress(progress);
                }
            };
            let logId;
            if (remote) {
                logId = await this.file.uploadRemote(remote.requestId, remote.signal, onProgress);
            } else {
                logId = await this.file.upload(onProgress);
            }
            this.assertNotCancelled(remote?.signal);
            this.setUploadState({
                ...this.uploadState,
                progress: 1
            });
            this.emit('uploadProgressChanged', 1);
            remote?.onProgress(1);
            this.setUploadState({
                ...this.uploadState,
                status: (/* inlined export .LocalLogUploadStatus.Completed */"completed"),
                logId
            });
            this.emit('uploadStatusChanged', (/* inlined export .LocalLogUploadStatus.Completed */"completed"));
            return logId;
        } catch (error) {
            let failure = this.cleanError(error, 'The local log upload failed.');
            if (remote?.signal.aborted) {
                failure = interface_error_InterfaceError(base_InterfaceErrorCode.Cancelled, 'The local log upload was cancelled.');
            }
            this.setUploadState({
                ...this.uploadState,
                status: (/* inlined export .LocalLogUploadStatus.Failed */"failed"),
                error: Object.freeze({
                    code: failure.code,
                    message: failure.message
                })
            });
            this.emit('uploadStatusChanged', (/* inlined export .LocalLogUploadStatus.Failed */"failed"));
            throw failure;
        }
    }
    setUploadState(state) {
        this.uploadState = Object.freeze(state);
        this.emit('uploadStateChanged', this.uploadState);
    }
    assertNotCancelled(signal) {
        if (signal?.aborted) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Cancelled, 'The local log upload was cancelled.');
        }
    }
    cleanError(error, fallbackMessage) {
        const normalized = interface_error_InterfaceError(error, fallbackMessage);
        return interface_error_InterfaceError(normalized.code, normalized.message);
    }
    assertActive() {
        if (this.disposed) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The logs module has been disposed.');
        }
    }
    constructor(...args){
        super(...args), this.disposed = false, this.finishingFatal = false, this.finishingRuntimeIssues = false, this.uploading = false, this.uploadState = Object.freeze({
            status: null,
            progress: 0,
            trigger: null,
            logId: null,
            error: null
        }), this.handleBeforeQuit = (event)=>{
            if (this.finishingRuntimeIssues) {
                event.preventDefault();
                return;
            }
            if (!this.runtimeDiagnostics.hasPendingIssues()) {
                this.dispose();
                return;
            }
            event.preventDefault();
            this.finishingRuntimeIssues = true;
            this.file.flush();
            this.finishRuntimeIssueReports();
        }, this.handleChildProcessGone = (_event, details)=>{
            if (details.reason === 'clean-exit') {
                return;
            }
            const runtimeWatcher = this.runtimeWatcher;
            const reportedByRuntime = runtimeWatcher !== undefined && (details.serviceName === runtimeWatcher.serviceName || details.name === runtimeWatcher.serviceName);
            this.reportCrash('electron_child_crashed', {
                exit_code: details.exitCode,
                process_name: details.name ?? details.serviceName ?? details.type,
                process_type: 'child',
                reason: details.reason
            }, !reportedByRuntime);
        }, this.handleRenderProcessGone = (_event, webContents, details)=>{
            if (details.reason === 'clean-exit') {
                return;
            }
            this.reportCrash('electron_renderer_crashed', {
                exit_code: details.exitCode,
                process_type: 'renderer',
                reason: details.reason,
                web_contents_id: webContents.id
            });
        }, this.handleUncaughtExceptionMonitor = (_error, origin)=>{
            if (this.fatalReport !== undefined) {
                return;
            }
            this.fatalReport = this.reportCrash('electron_main_crashed', {
                origin,
                process_type: 'main',
                reason: 'uncaught_exception'
            });
            // Node does not wait for async monitor listeners before terminating. pushFrom synchronously
            // reaches the file target before its first await, so this persists the fatal row immediately.
            this.file.flush();
        }, this.handleUncaughtException = (error, origin)=>{
            this.handleUncaughtExceptionMonitor(error, origin);
            if (this.finishingFatal || this.fatalReport === undefined) {
                return;
            }
            this.finishingFatal = true;
            this.finishFatal(this.fatalReport);
        };
    }
}
__decorate([
    multiInject(LOGS_PUSH_TARGET),
    __metadata("design:type", Object)
], LogsShellService.prototype, "targets", void 0);
__decorate([
    inject(LogsContext),
    __metadata("design:type", typeof LogsContext === "undefined" ? Object : LogsContext)
], LogsShellService.prototype, "context", void 0);
__decorate([
    inject(LogsDispatcher),
    __metadata("design:type", typeof LogsDispatcher === "undefined" ? Object : LogsDispatcher)
], LogsShellService.prototype, "dispatcher", void 0);
__decorate([
    inject(FileLogsPushTarget),
    __metadata("design:type", typeof FileLogsPushTarget === "undefined" ? Object : FileLogsPushTarget)
], LogsShellService.prototype, "file", void 0);
__decorate([
    inject(RuntimeDiagnostics),
    __metadata("design:type", typeof RuntimeDiagnostics === "undefined" ? Object : RuntimeDiagnostics)
], LogsShellService.prototype, "runtimeDiagnostics", void 0);
__decorate([
    inject(CLIENT_NODE_RUNTIME_WATCHER),
    optional_optional(),
    __metadata("design:type", typeof ClientNodeRuntimeWatcher === "undefined" ? Object : ClientNodeRuntimeWatcher)
], LogsShellService.prototype, "runtimeWatcher", void 0);
__decorate([
    inject(SentryMetricsSink),
    __metadata("design:type", typeof SentryMetricsSink === "undefined" ? Object : SentryMetricsSink)
], LogsShellService.prototype, "metrics", void 0);
__decorate([
    postConstruct(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LogsShellService.prototype, "registerLifecycleListeners", null);
LogsShellService = __decorate([
    injectable()
], LogsShellService);
