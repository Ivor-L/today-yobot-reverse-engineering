// Compiled fragment from ./src/app/modules/web-runtime/modules/runtime-diagnostics/index.ts.
// The original TypeScript and import graph are not restored.







class DesktopWebRuntimeDiagnostics {
    attach(child, nonce) {
        if (this.installations.has(child)) {
            return;
        }
        const stdout = child.stdout ? this.createOutputState(child.stdout, 'stdout') : undefined;
        const stderr = child.stderr ? this.createOutputState(child.stderr, 'stderr') : undefined;
        let installation;
        installation = {
            child,
            failureReported: false,
            handleError: (type)=>{
                this.recordFailure(installation, 'utility_process_error', undefined, type);
            },
            handleExit: (code)=>{
                this.finishInstallation(installation);
                if (!installation.stopped) {
                    this.recordFailure(installation, 'unexpected_exit', code);
                }
                this.detachInstallation(installation);
            },
            handleMessage: (message)=>{
                this.handleMessage(installation, message);
            },
            ...stderr === undefined ? {} : {
                handleStderrData: (chunk)=>{
                    this.captureOutput(stderr, chunk);
                },
                handleStderrEnd: ()=>{
                    this.finishOutput(stderr);
                }
            },
            ...stdout === undefined ? {} : {
                handleStdoutData: (chunk)=>{
                    this.captureOutput(stdout, chunk);
                },
                handleStdoutEnd: ()=>{
                    this.finishOutput(stdout);
                }
            },
            nonce,
            phase: 'launch',
            ...stderr === undefined ? {} : {
                stderr
            },
            stopped: false,
            ...stdout === undefined ? {} : {
                stdout
            }
        };
        this.installations.set(child, installation);
        if (stdout && installation.handleStdoutData && installation.handleStdoutEnd) {
            stdout.stream.on('data', installation.handleStdoutData);
            stdout.stream.on('end', installation.handleStdoutEnd);
        }
        if (stderr && installation.handleStderrData && installation.handleStderrEnd) {
            stderr.stream.on('data', installation.handleStderrData);
            stderr.stream.on('end', installation.handleStderrEnd);
        }
        child.on('message', installation.handleMessage);
        child.on('error', installation.handleError);
        child.on('exit', installation.handleExit);
    }
    markRunning(child) {
        const installation = this.installations.get(child);
        if (installation && !installation.stopped) {
            installation.phase = 'running';
        }
    }
    recordLaunchFailure(child, error) {
        const installation = this.installations.get(child);
        if (!installation) {
            return;
        }
        this.recordFailure(installation, 'unexpected_exit', undefined, readDesktopWebRuntimeErrorCode(error));
    }
    stop(child) {
        const installation = this.installations.get(child);
        if (!installation) {
            return;
        }
        installation.phase = 'shutdown';
        this.finishInstallation(installation);
        this.detachInstallation(installation);
        installation.stopped = true;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return Object.freeze({
            unsubscribe: ()=>{
                this.listeners.delete(listener);
            }
        });
    }
    appendOutput(state, value) {
        state.byteLength += Buffer.byteLength(value);
        if (state.truncated || value.length === 0) {
            return;
        }
        const next = takeDesktopWebRuntimeTextPrefix(`${state.buffered}${value}`);
        state.buffered = next.message;
        state.truncated = next.truncated;
    }
    captureOutput(state, chunk) {
        if (state.finished) {
            return;
        }
        let text;
        if (typeof chunk === 'string') {
            text = state.decoder.end() + chunk;
            state.decoder = new external_node_string_decoder_namespaceObject.StringDecoder('utf8');
        } else if (Buffer.isBuffer(chunk) || chunk instanceof Uint8Array) {
            text = state.decoder.write(Buffer.from(chunk));
        } else {
            return;
        }
        this.consumeOutput(state, text);
    }
    consumeOutput(state, text) {
        let offset = 0;
        let newline = text.indexOf('\n');
        while(newline >= 0){
            this.appendOutput(state, text.slice(offset, newline));
            this.flushOutput(state);
            offset = newline + 1;
            newline = text.indexOf('\n', offset);
        }
        this.appendOutput(state, text.slice(offset));
    }
    createOutputState(stream, streamName) {
        return {
            byteLength: 0,
            buffered: '',
            decoder: new external_node_string_decoder_namespaceObject.StringDecoder('utf8'),
            finished: false,
            stream,
            streamName,
            truncated: false
        };
    }
    detachInstallation(installation) {
        if (!this.installations.delete(installation.child)) {
            return;
        }
        const { child } = installation;
        this.detachOutputListeners(installation);
        child.removeListener('message', installation.handleMessage);
        child.removeListener('error', installation.handleError);
        child.removeListener('exit', installation.handleExit);
    }
    detachOutputListeners(installation) {
        const { stderr, stdout } = installation;
        if (stdout && installation.handleStdoutData && installation.handleStdoutEnd) {
            stdout.stream.removeListener('data', installation.handleStdoutData);
            stdout.stream.removeListener('end', installation.handleStdoutEnd);
        }
        if (stderr && installation.handleStderrData && installation.handleStderrEnd) {
            stderr.stream.removeListener('data', installation.handleStderrData);
            stderr.stream.removeListener('end', installation.handleStderrEnd);
        }
    }
    emitDiagnostic(diagnostic) {
        for (const listener of this.listeners){
            try {
                listener(diagnostic);
            } catch  {
            // One consumer must not interfere with the UtilityProcess or another consumer.
            }
        }
    }
    finishInstallation(installation) {
        this.detachOutputListeners(installation);
        if (installation.stdout) {
            this.finishOutput(installation.stdout);
        }
        if (installation.stderr) {
            this.finishOutput(installation.stderr);
        }
    }
    finishOutput(state) {
        if (state.finished) {
            return;
        }
        try {
            let chunk = state.stream.read();
            while(chunk !== null){
                this.captureOutput(state, chunk);
                chunk = state.stream.read();
            }
        } catch  {
        // Stream shutdown is best effort and must not block application quit.
        }
        try {
            this.consumeOutput(state, state.decoder.end());
            if (state.byteLength > 0 || state.buffered.length > 0) {
                this.flushOutput(state);
            }
        } catch  {
        // Final stream processing is best effort and must not block application quit.
        } finally{
            state.finished = true;
        }
    }
    flushOutput(state) {
        const message = state.buffered.endsWith('\r') ? state.buffered.slice(0, -1) : state.buffered;
        const byteLength = state.byteLength;
        const truncated = state.truncated;
        state.byteLength = 0;
        state.buffered = '';
        state.truncated = false;
        if (message.length === 0) {
            return;
        }
        this.emitDiagnostic({
            byteLength,
            kind: 'process-output',
            message,
            stream: state.streamName,
            truncated
        });
    }
    handleMessage(installation, value) {
        if (installation.stopped || this.installations.get(installation.child) !== installation) {
            return;
        }
        const message = parseDesktopWebRuntimeDiagnosticMessage(value, installation.nonce);
        if (!message) {
            return;
        }
        const { diagnostic } = message;
        if (diagnostic.kind === 'process-failure') {
            this.recordFailure(installation, diagnostic.reason, undefined, diagnostic.errorCode);
            return;
        }
        this.emitDiagnostic(diagnostic);
    }
    recordFailure(installation, reason, exitCode, errorCode) {
        if (installation.failureReported || installation.stopped) {
            return;
        }
        installation.failureReported = true;
        this.emitDiagnostic({
            kind: 'process-failure',
            phase: installation.phase,
            reason,
            ...exitCode === undefined ? {} : {
                exitCode
            },
            ...errorCode === undefined ? {} : {
                errorCode
            }
        });
    }
    constructor(){
        this.serviceName = WEB_RUNTIME_SERVICE_NAME;
        this.installations = new Map();
        this.listeners = new Set();
    }
}
DesktopWebRuntimeDiagnostics = __decorate([
    injectable()
], DesktopWebRuntimeDiagnostics);
