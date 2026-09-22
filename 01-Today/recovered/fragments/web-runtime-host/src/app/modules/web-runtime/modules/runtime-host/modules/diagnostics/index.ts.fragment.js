// Compiled fragment from ./src/app/modules/web-runtime/modules/runtime-host/modules/diagnostics/index.ts.
// The original TypeScript and import graph are not restored.












const readHttpRequestHost = (request)=>{
    const header = request.getHeader('host');
    if (typeof header === 'string' || typeof header === 'number') {
        return String(header);
    }
    return request.host;
};
class DesktopWebRuntimeHostDiagnostics {
    start(nonce) {
        if (this.started) {
            return;
        }
        if (nonce.length === 0) {
            throw new Error('The packaged Web runtime diagnostics nonce is missing.');
        }
        this.nonce = nonce;
        this.started = true;
        let subscribed = 0;
        try {
            this.stderrInstallation = this.installStderrCapture();
            const consoleInstallations = [];
            this.consoleInstallations = consoleInstallations;
            consoleInstallations.push(this.installConsole('warn'));
            consoleInstallations.push(this.installConsole('error'));
            for (const [name, listener] of this.subscriptions){
                (0,external_node_diagnostics_channel_namespaceObject.subscribe)(name, listener);
                subscribed += 1;
            }
            process.on('uncaughtExceptionMonitor', this.handleUncaughtExceptionMonitor);
        } catch (error) {
            for (const [name, listener] of this.subscriptions.slice(0, subscribed)){
                (0,external_node_diagnostics_channel_namespaceObject.unsubscribe)(name, listener);
            }
            this.restoreConsole();
            this.restoreStderrCapture();
            this.nonce = undefined;
            this.started = false;
            throw error;
        }
    }
    dispose() {
        if (!this.started) {
            return;
        }
        this.started = false;
        process.removeListener('uncaughtExceptionMonitor', this.handleUncaughtExceptionMonitor);
        this.restoreConsole();
        this.restoreStderrCapture();
        this.consoleCaptures.length = 0;
        for (const [name, listener] of this.subscriptions){
            try {
                (0,external_node_diagnostics_channel_namespaceObject.unsubscribe)(name, listener);
            } catch  {
            // A diagnostics channel implementation must not block UtilityProcess shutdown.
            }
        }
        for (const installation of this.httpResponses){
            this.detachHttpResponse(installation);
        }
        this.httpRequests = new WeakMap();
        this.httpResponses.clear();
        this.undiciRequests = new WeakMap();
        this.rateWindows.clear();
        this.nonce = undefined;
    }
    get subscriptions() {
        return [
            [
                DESKTOP_WEB_RUNTIME_HOST_DIAGNOSTIC_CHANNELS.httpStart,
                this.handleHttpStart
            ],
            [
                DESKTOP_WEB_RUNTIME_HOST_DIAGNOSTIC_CHANNELS.httpFinish,
                this.handleHttpFinish
            ],
            [
                DESKTOP_WEB_RUNTIME_HOST_DIAGNOSTIC_CHANNELS.httpError,
                this.handleHttpError
            ],
            [
                DESKTOP_WEB_RUNTIME_HOST_DIAGNOSTIC_CHANNELS.undiciCreate,
                this.handleUndiciCreate
            ],
            [
                DESKTOP_WEB_RUNTIME_HOST_DIAGNOSTIC_CHANNELS.undiciHeaders,
                this.handleUndiciHeaders
            ],
            [
                DESKTOP_WEB_RUNTIME_HOST_DIAGNOSTIC_CHANNELS.undiciTrailers,
                this.handleUndiciTrailers
            ],
            [
                DESKTOP_WEB_RUNTIME_HOST_DIAGNOSTIC_CHANNELS.undiciError,
                this.handleUndiciError
            ]
        ];
    }
    appendConsoleCapture(state, value) {
        state.byteLength += Buffer.byteLength(value);
        if (state.truncated || value.length === 0) {
            return;
        }
        const next = takeDesktopWebRuntimeTextPrefix(`${state.buffered}${value}`);
        state.buffered = next.message;
        state.truncated = next.truncated;
    }
    captureConsoleChunk(state, chunk) {
        let text;
        if (typeof chunk === 'string') {
            text = state.decoder.end() + chunk;
            state.decoder = new external_node_string_decoder_namespaceObject.StringDecoder('utf8');
        } else if (Buffer.isBuffer(chunk) || chunk instanceof Uint8Array) {
            text = state.decoder.write(Buffer.from(chunk));
        } else {
            return;
        }
        this.appendConsoleCapture(state, text);
    }
    createConsoleCapture() {
        return {
            byteLength: 0,
            buffered: '',
            decoder: new external_node_string_decoder_namespaceObject.StringDecoder('utf8'),
            truncated: false
        };
    }
    detachHttpResponse(installation) {
        const { response } = installation;
        try {
            response.removeListener('aborted', installation.handleAborted);
            response.removeListener('close', installation.handleClose);
            response.removeListener('end', installation.handleEnd);
            response.removeListener('error', installation.handleError);
        } catch  {
        // Response observer cleanup is best effort.
        }
    }
    installConsole(method) {
        const descriptor = Object.getOwnPropertyDescriptor(console, method);
        const original = console[method];
        const diagnostics = this;
        const replacement = function(...arguments_) {
            return diagnostics.runWithConsoleCaptured(method, ()=>Reflect.apply(original, this, arguments_));
        };
        const installed = Reflect.defineProperty(console, method, {
            configurable: true,
            value: replacement,
            writable: true
        });
        if (!installed) {
            throw new Error(`Unable to observe Web runtime console.${method}.`);
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
    installStderrCapture() {
        const stream = process.stderr;
        const descriptor = Object.getOwnPropertyDescriptor(stream, 'write');
        const originalWrite = stream.write;
        const diagnostics = this;
        const replacement = function(...args) {
            const result = Reflect.apply(originalWrite, this, args);
            if (diagnostics.started) {
                try {
                    const capture = diagnostics.consoleCaptures.at(-1);
                    if (capture) {
                        diagnostics.captureConsoleChunk(capture, args[0]);
                    }
                } catch  {
                // Console observation must never alter the original stderr write.
                }
            }
            return result;
        };
        const installed = Reflect.defineProperty(stream, 'write', {
            configurable: true,
            value: replacement,
            writable: true
        });
        if (!installed) {
            throw new Error('Unable to observe Web runtime stderr for console output.');
        }
        return {
            ...descriptor === undefined ? {} : {
                descriptor
            },
            originalWrite,
            replacement,
            stream
        };
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
    finishHttpResponse(installation, completed, error) {
        if (!this.httpResponses.delete(installation)) {
            return;
        }
        this.detachHttpResponse(installation);
        try {
            if (!this.started) {
                return;
            }
            if (completed) {
                this.recordCompleted(installation.state, installation.statusCode, installation.contentType);
                return;
            }
            this.recordFailed(installation.state, error);
        } catch  {
        // A response observer must never alter the request or response stream.
        }
    }
    finishConsoleCapture(method, state) {
        try {
            this.appendConsoleCapture(state, state.decoder.end());
            if (state.byteLength === 0 && state.buffered.length === 0) {
                return;
            }
            const severity = method === 'error' ? 'error' : 'warning';
            if (!this.reserve('console-message', severity)) {
                return;
            }
            this.post({
                byteLength: state.byteLength,
                kind: 'console-message',
                message: state.buffered,
                severity,
                truncated: state.truncated
            });
        } catch  {
        // Console diagnostics must not change the original return value or thrown error.
        }
    }
    post(diagnostic) {
        const nonce = this.nonce;
        if (!this.started || nonce === undefined) {
            return;
        }
        const message = {
            diagnostic,
            nonce,
            type: 'diagnostic'
        };
        try {
            this.parentPort.postMessage(message);
        } catch  {
        // A closed parent port must not affect the observed operation or process semantics.
        }
    }
    recordCompleted(state, statusCode, contentType) {
        const diagnostic = {
            durationMs: resolveDesktopWebRuntimeHostDuration(state.startedAt),
            kind: 'network-request',
            method: state.method,
            outcome: 'completed',
            transport: state.transport,
            url: state.url,
            ...statusCode === undefined ? {} : {
                statusCode
            },
            ...contentType === undefined ? {} : {
                contentType
            }
        };
        this.recordNetwork(diagnostic, resolveDesktopWebRuntimeHostLevel(statusCode, false));
    }
    recordFailed(state, error) {
        const errorCode = readDesktopWebRuntimeHostErrorCode(error);
        const diagnostic = {
            durationMs: resolveDesktopWebRuntimeHostDuration(state.startedAt),
            kind: 'network-request',
            method: state.method,
            outcome: 'failed',
            transport: state.transport,
            url: state.url,
            ...errorCode === undefined ? {} : {
                errorCode
            }
        };
        this.recordNetwork(diagnostic, 'error');
    }
    recordNetwork(diagnostic, level) {
        if (this.started && this.reserve('network-request', level)) {
            this.post(diagnostic);
        }
    }
    observeHttpResponse(state, response, statusCode, contentType) {
        let installation;
        installation = {
            ...contentType === undefined ? {} : {
                contentType
            },
            handleAborted: ()=>{
                this.finishHttpResponse(installation, false);
            },
            handleClose: ()=>{
                this.finishHttpResponse(installation, response.complete);
            },
            handleEnd: ()=>{
                this.finishHttpResponse(installation, response.complete);
            },
            handleError: (error)=>{
                this.finishHttpResponse(installation, false, error);
            },
            response,
            state,
            ...statusCode === undefined ? {} : {
                statusCode
            }
        };
        this.httpResponses.add(installation);
        response.once('aborted', installation.handleAborted);
        response.once('close', installation.handleClose);
        response.once('end', installation.handleEnd);
        response.once('error', installation.handleError);
        if (response.readableEnded) {
            this.finishHttpResponse(installation, response.complete);
        }
    }
    reserve(source, level) {
        const key = `${source}:${level}`;
        const now = Date.now();
        let window = this.rateWindows.get(key);
        if (!window || now - window.startedAt >= (/* inlined export .DESKTOP_WEB_RUNTIME_DIAGNOSTIC_EVENT_WINDOW_MS */60000)) {
            window = {
                count: 0,
                limited: false,
                startedAt: now
            };
            this.rateWindows.set(key, window);
        }
        if (window.count < (/* inlined export .DESKTOP_WEB_RUNTIME_DIAGNOSTIC_EVENT_LIMIT */240)) {
            window.count += 1;
            return true;
        }
        if (!window.limited) {
            window.limited = true;
            this.post({
                kind: 'rate-limited',
                level,
                limit: (/* inlined export .DESKTOP_WEB_RUNTIME_DIAGNOSTIC_EVENT_LIMIT */240),
                source,
                windowMs: (/* inlined export .DESKTOP_WEB_RUNTIME_DIAGNOSTIC_EVENT_WINDOW_MS */60000)
            });
        }
        return false;
    }
    restoreConsole() {
        for (const installation of [
            ...this.consoleInstallations
        ].reverse()){
            if (console[installation.method] !== installation.replacement) {
                continue;
            }
            if (installation.descriptor) {
                Reflect.defineProperty(console, installation.method, installation.descriptor);
            } else {
                Reflect.deleteProperty(console, installation.method);
            }
        }
        this.consoleInstallations = [];
    }
    restoreStderrCapture() {
        const installation = this.stderrInstallation;
        this.stderrInstallation = undefined;
        if (!installation || installation.stream.write !== installation.replacement) {
            return;
        }
        if (installation.descriptor) {
            Reflect.defineProperty(installation.stream, 'write', installation.descriptor);
            return;
        }
        Reflect.deleteProperty(installation.stream, 'write');
    }
    runWithConsoleCaptured(method, operation) {
        const state = this.createConsoleCapture();
        this.consoleCaptures.push(state);
        try {
            return operation();
        } finally{
            const index = this.consoleCaptures.lastIndexOf(state);
            if (index >= 0) {
                this.consoleCaptures.splice(index, 1);
            }
            this.finishConsoleCapture(method, state);
        }
    }
    constructor(){
        this.consoleCaptures = [];
        this.consoleInstallations = [];
        this.httpRequests = new WeakMap();
        this.httpResponses = new Set();
        this.rateWindows = new Map();
        this.started = false;
        this.undiciRequests = new WeakMap();
        this.handleHttpStart = (message)=>{
            try {
                const { request } = message;
                if (!request) {
                    return;
                }
                const url = sanitizeDesktopWebRuntimeHostNetworkUrl(new URL(request.path, `${request.protocol}//${readHttpRequestHost(request)}`).href);
                if (!url) {
                    return;
                }
                this.httpRequests.set(request, {
                    method: sanitizeDesktopWebRuntimeHostMethod(request.method),
                    startedAt: performance.now(),
                    transport: 'node_http',
                    url
                });
            } catch  {
            // Observing a Node request must never alter it.
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
                this.observeHttpResponse(state, response, readDesktopWebRuntimeHostStatusCode(response.statusCode), readDesktopWebRuntimeHostContentType(response.headers));
            } catch  {
            // Observing a Node response must never alter it.
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
            // Observing a Node request failure must never alter it.
            }
        };
        this.handleUndiciCreate = (message)=>{
            try {
                const { request } = message;
                if (!request || typeof request !== 'object') {
                    return;
                }
                const url = createDesktopWebRuntimeHostUrl(request.origin, request.path);
                if (!url) {
                    return;
                }
                this.undiciRequests.set(request, {
                    method: sanitizeDesktopWebRuntimeHostMethod(request.method),
                    startedAt: performance.now(),
                    transport: 'undici',
                    url
                });
            } catch  {
            // Observing an Undici request must never alter it.
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
                state.statusCode = readDesktopWebRuntimeHostStatusCode(response.statusCode);
                state.contentType = readDesktopWebRuntimeHostContentType(response.headers);
            } catch  {
            // Observing Undici response headers must never alter the request.
            }
        };
        this.handleUndiciTrailers = (message)=>{
            try {
                const { request } = message;
                this.finishUndici(request);
            } catch  {
            // Observing an Undici response completion must never alter the request.
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
            // Observing an Undici request failure must never alter it.
            }
        };
        this.handleUncaughtExceptionMonitor = (error)=>{
            try {
                if (!this.started) {
                    return;
                }
                const errorCode = readDesktopWebRuntimeHostErrorCode(error);
                this.post({
                    kind: 'process-failure',
                    reason: 'uncaught_exception',
                    ...errorCode === undefined ? {} : {
                        errorCode
                    }
                });
            } catch  {
            // A hostile thrown value must not replace the original fatal error.
            }
        };
    }
}
__decorate([
    inject(DESKTOP_WEB_RUNTIME_HOST_PARENT_PORT),
    __metadata("design:type", typeof DesktopWebRuntimeHostParentPort === "undefined" ? Object : DesktopWebRuntimeHostParentPort)
], DesktopWebRuntimeHostDiagnostics.prototype, "parentPort", void 0);
DesktopWebRuntimeHostDiagnostics = __decorate([
    injectable()
], DesktopWebRuntimeHostDiagnostics);
