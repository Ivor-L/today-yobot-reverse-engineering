// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/runtime-diagnostics/modules/web-network/index.ts.
// The original TypeScript and import graph are not restored.









class WebNetworkDiagnostics {
    start() {
        if (this.started) {
            return;
        }
        this.started = true;
        this.policy = {
            telemetryEndpoints: resolveRuntimeTelemetryEndpoints(this.config)
        };
        external_electron_.app.on('session-created', this.handleSessionCreated);
        this.attach(external_electron_.session.defaultSession);
    }
    dispose() {
        if (!this.started) {
            return;
        }
        this.started = false;
        external_electron_.app.removeListener('session-created', this.handleSessionCreated);
        for (const installation of this.installations.values()){
            this.detach(installation);
        }
        this.installations.clear();
    }
    attach(session) {
        if (this.installations.has(session)) {
            return;
        }
        const requests = new Map();
        const beforeRequest = (details, callback)=>{
            try {
                requests.delete(details.id);
                const state = this.createRequestState(details);
                if (state) {
                    requests.set(details.id, state);
                }
            } catch  {
            // Observation must never prevent Chromium from issuing the request.
            } finally{
                callback({});
            }
        };
        const completed = (details)=>{
            this.handleCompleted(requests, details);
        };
        const errors = (details)=>{
            this.handleError(requests, details);
        };
        const installation = {
            beforeRequest,
            completed,
            errors,
            requests,
            session
        };
        this.installations.set(session, installation);
        try {
            session.webRequest.onBeforeRequest(WEB_NETWORK_REQUEST_FILTER, beforeRequest);
            session.webRequest.onCompleted(WEB_NETWORK_REQUEST_FILTER, completed);
            session.webRequest.onErrorOccurred(WEB_NETWORK_REQUEST_FILTER, errors);
        } catch (error) {
            this.detach(installation);
            this.installations.delete(session);
            throw error;
        }
    }
    detach(installation) {
        try {
            installation.session.webRequest.onBeforeRequest(WEB_NETWORK_REQUEST_FILTER, null);
            installation.session.webRequest.onCompleted(WEB_NETWORK_REQUEST_FILTER, null);
            installation.session.webRequest.onErrorOccurred(WEB_NETWORK_REQUEST_FILTER, null);
        } catch  {
        // An isolated Session may already be unavailable during Adapter teardown.
        }
        installation.requests.clear();
    }
    createRequestState(details) {
        const capturesResourceType = WEB_NETWORK_RESOURCE_TYPES.has(details.resourceType) && (details.resourceType !== 'other' || details.webContents === undefined);
        if (!capturesResourceType || isRuntimeLoopbackUrl(details.url) || isRuntimeTelemetryUrl(details.url, this.policy.telemetryEndpoints)) {
            return undefined;
        }
        const url = sanitizeRuntimeDiagnosticUrl(details.url);
        if (url === undefined) {
            return undefined;
        }
        return {
            method: sanitizeRuntimeDiagnosticMethod(details.method),
            resourceType: details.resourceType,
            startedAt: performance.now(),
            url,
            ...details.webContentsId === undefined ? {} : {
                webContentsId: details.webContentsId
            }
        };
    }
    handleCompleted(requests, details) {
        try {
            const state = requests.get(details.id);
            if (!state) {
                return;
            }
            requests.delete(details.id);
            const contentType = resolveRuntimeDiagnosticContentType(details.responseHeaders);
            this.recorder.record({
                id: WEB_NETWORK_REQUEST_EVENT_ID,
                layer: 'web',
                level: resolveRuntimeDiagnosticNetworkLevel(details.statusCode, false),
                payload: {
                    duration_ms: this.resolveDuration(state.startedAt),
                    from_cache: details.fromCache,
                    method: state.method,
                    outcome: 'completed',
                    resource_type: state.resourceType,
                    ...contentType === undefined ? {} : {
                        content_type: contentType
                    },
                    status_code: details.statusCode,
                    url: state.url,
                    ...state.webContentsId === undefined ? {} : {
                        web_contents_id: state.webContentsId
                    }
                }
            });
        } catch  {
        // Web request diagnostics must never alter the completed request.
        }
    }
    handleError(requests, details) {
        try {
            const state = requests.get(details.id);
            if (!state) {
                return;
            }
            requests.delete(details.id);
            const errorCode = resolveRuntimeDiagnosticErrorCode(details.error);
            this.recorder.record({
                id: WEB_NETWORK_REQUEST_EVENT_ID,
                layer: 'web',
                level: resolveRuntimeDiagnosticNetworkLevel(undefined, true),
                payload: {
                    duration_ms: this.resolveDuration(state.startedAt),
                    ...errorCode === undefined ? {} : {
                        error_code: errorCode
                    },
                    from_cache: details.fromCache,
                    method: state.method,
                    outcome: 'failed',
                    resource_type: state.resourceType,
                    url: state.url,
                    ...state.webContentsId === undefined ? {} : {
                        web_contents_id: state.webContentsId
                    }
                }
            });
        } catch  {
        // Web request diagnostics must never alter the failed request.
        }
    }
    resolveDuration(startedAt) {
        return Math.max(0, Math.round(performance.now() - startedAt));
    }
    constructor(){
        this.installations = new Map();
        this.policy = {
            telemetryEndpoints: []
        };
        this.started = false;
        this.handleSessionCreated = (session)=>{
            try {
                this.attach(session);
            } catch  {
            // One unsupported Session must not affect the Electron application event.
            }
        };
    }
}
__decorate([
    inject(CLIENT_NODE_LOGS_CONFIG),
    __metadata("design:type", typeof ClientNodeLogsConfig === "undefined" ? Object : ClientNodeLogsConfig)
], WebNetworkDiagnostics.prototype, "config", void 0);
__decorate([
    inject(RuntimeDiagnosticRecorder),
    __metadata("design:type", typeof RuntimeDiagnosticRecorder === "undefined" ? Object : RuntimeDiagnosticRecorder)
], WebNetworkDiagnostics.prototype, "recorder", void 0);
WebNetworkDiagnostics = __decorate([
    injectable()
], WebNetworkDiagnostics);
