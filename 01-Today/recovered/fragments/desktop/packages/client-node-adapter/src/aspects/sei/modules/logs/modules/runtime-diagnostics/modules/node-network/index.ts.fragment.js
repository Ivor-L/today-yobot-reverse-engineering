// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/runtime-diagnostics/modules/node-network/index.ts.
// The original TypeScript and import graph are not restored.










class NodeNetworkDiagnostics {
    start() {
        if (this.started) {
            return;
        }
        this.started = true;
        this.policy = {
            telemetryEndpoints: resolveRuntimeTelemetryEndpoints(this.config)
        };
        const subscriptions = this.subscriptions;
        let subscribed = 0;
        try {
            for (const [name, listener] of subscriptions){
                (0,external_node_diagnostics_channel_namespaceObject.subscribe)(name, listener);
                subscribed += 1;
            }
        } catch (error) {
            for (const [name, listener] of subscriptions.slice(0, subscribed)){
                (0,external_node_diagnostics_channel_namespaceObject.unsubscribe)(name, listener);
            }
            this.started = false;
            throw error;
        }
    }
    dispose() {
        if (!this.started) {
            return;
        }
        this.started = false;
        for (const [name, listener] of this.subscriptions){
            (0,external_node_diagnostics_channel_namespaceObject.unsubscribe)(name, listener);
        }
        this.httpRequests = new WeakMap();
        this.undiciRequests = new WeakMap();
    }
    get subscriptions() {
        return [
            [
                NODE_NETWORK_CHANNELS.httpStart,
                this.handleHttpStart
            ],
            [
                NODE_NETWORK_CHANNELS.httpFinish,
                this.handleHttpFinish
            ],
            [
                NODE_NETWORK_CHANNELS.httpError,
                this.handleHttpError
            ],
            [
                NODE_NETWORK_CHANNELS.undiciCreate,
                this.handleUndiciCreate
            ],
            [
                NODE_NETWORK_CHANNELS.undiciHeaders,
                this.handleUndiciHeaders
            ],
            [
                NODE_NETWORK_CHANNELS.undiciTrailers,
                this.handleUndiciTrailers
            ],
            [
                NODE_NETWORK_CHANNELS.undiciError,
                this.handleUndiciError
            ]
        ];
    }
    finishUndici(request) {
        if (!request || typeof request !== 'object') {
            return;
        }
        const state = this.undiciRequests.get(request);
        if (!state) {
            return;
        }
        this.undiciRequests.delete(request);
        this.recordCompleted(state, state.statusCode, state.contentType);
    }
    recordCompleted(state, statusCode, contentType) {
        this.recorder.record({
            id: NODE_NETWORK_REQUEST_EVENT_ID,
            layer: 'node',
            level: resolveRuntimeDiagnosticNetworkLevel(statusCode, false),
            payload: {
                duration_ms: resolveNodeNetworkDuration(state.startedAt),
                method: state.method,
                outcome: 'completed',
                ...contentType === undefined ? {} : {
                    content_type: contentType
                },
                ...statusCode === undefined ? {} : {
                    status_code: statusCode
                },
                transport: state.transport,
                url: state.url
            }
        });
    }
    recordFailed(state, error) {
        const errorCode = resolveRuntimeDiagnosticErrorCode(error);
        this.recorder.record({
            id: NODE_NETWORK_REQUEST_EVENT_ID,
            layer: 'node',
            level: resolveRuntimeDiagnosticNetworkLevel(undefined, true),
            payload: {
                duration_ms: resolveNodeNetworkDuration(state.startedAt),
                method: state.method,
                outcome: 'failed',
                ...errorCode === undefined ? {} : {
                    error_code: errorCode
                },
                transport: state.transport,
                url: state.url
            }
        });
    }
    constructor(){
        this.httpRequests = new WeakMap();
        this.policy = {
            telemetryEndpoints: []
        };
        this.started = false;
        this.undiciRequests = new WeakMap();
        this.handleHttpStart = (message)=>{
            try {
                const { request } = message;
                if (!request) {
                    return;
                }
                const state = createNodeHttpRequestState(request, this.policy);
                if (state) {
                    this.httpRequests.set(request, state);
                }
            } catch  {
            // diagnostics_channel subscribers must never throw into the observed request.
            }
        };
        this.handleHttpFinish = (message)=>{
            try {
                const { request, response } = message;
                if (!request || !response) {
                    return;
                }
                const state = this.httpRequests.get(request);
                if (!state) {
                    return;
                }
                this.httpRequests.delete(request);
                this.recordCompleted(state, resolveNodeNetworkStatusCode(response.statusCode), resolveRuntimeDiagnosticContentType(response.headers));
            } catch  {
            // diagnostics_channel subscribers must never throw into the observed request.
            }
        };
        this.handleHttpError = (message)=>{
            try {
                const { error, request } = message;
                if (!request) {
                    return;
                }
                const state = this.httpRequests.get(request);
                if (!state) {
                    return;
                }
                this.httpRequests.delete(request);
                this.recordFailed(state, error);
            } catch  {
            // diagnostics_channel subscribers must never throw into the observed request.
            }
        };
        this.handleUndiciCreate = (message)=>{
            try {
                const { request } = message;
                if (!request || typeof request !== 'object') {
                    return;
                }
                const state = createUndiciRequestState(request, this.policy);
                if (state) {
                    this.undiciRequests.set(request, state);
                }
            } catch  {
            // diagnostics_channel subscribers must never throw into the observed request.
            }
        };
        this.handleUndiciHeaders = (message)=>{
            try {
                const { request, response } = message;
                if (!request || typeof request !== 'object' || !response) {
                    return;
                }
                const state = this.undiciRequests.get(request);
                if (!state) {
                    return;
                }
                state.statusCode = resolveNodeNetworkStatusCode(response.statusCode);
                state.contentType = resolveRuntimeDiagnosticContentType(response.headers);
            } catch  {
            // diagnostics_channel subscribers must never throw into the observed request.
            }
        };
        this.handleUndiciTrailers = (message)=>{
            try {
                const { request } = message;
                this.finishUndici(request);
            } catch  {
            // diagnostics_channel subscribers must never throw into the observed request.
            }
        };
        this.handleUndiciError = (message)=>{
            try {
                const { error, request } = message;
                if (!request || typeof request !== 'object') {
                    return;
                }
                const state = this.undiciRequests.get(request);
                if (!state) {
                    return;
                }
                this.undiciRequests.delete(request);
                this.recordFailed(state, error);
            } catch  {
            // diagnostics_channel subscribers must never throw into the observed request.
            }
        };
    }
}
__decorate([
    inject(CLIENT_NODE_LOGS_CONFIG),
    __metadata("design:type", typeof ClientNodeLogsConfig === "undefined" ? Object : ClientNodeLogsConfig)
], NodeNetworkDiagnostics.prototype, "config", void 0);
__decorate([
    inject(RuntimeDiagnosticRecorder),
    __metadata("design:type", typeof RuntimeDiagnosticRecorder === "undefined" ? Object : RuntimeDiagnosticRecorder)
], NodeNetworkDiagnostics.prototype, "recorder", void 0);
NodeNetworkDiagnostics = __decorate([
    injectable()
], NodeNetworkDiagnostics);
