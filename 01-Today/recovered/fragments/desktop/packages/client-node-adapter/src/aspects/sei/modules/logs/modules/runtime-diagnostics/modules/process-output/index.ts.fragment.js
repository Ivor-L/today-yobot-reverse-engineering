// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/runtime-diagnostics/modules/process-output/index.ts.
// The original TypeScript and import graph are not restored.









class NodeProcessOutputDiagnostics {
    runWithStderrCaptured(operation, onCaptured) {
        const state = this.createState();
        this.stderrCaptures.push(state);
        try {
            return operation();
        } finally{
            const index = this.stderrCaptures.lastIndexOf(state);
            if (index >= 0) {
                this.stderrCaptures.splice(index, 1);
            }
            try {
                this.append(state, state.decoder.end());
                onCaptured({
                    byteLength: state.byteLength,
                    message: state.buffered,
                    truncated: state.truncated
                });
            } catch  {
            // Console capture must not alter the wrapped console method.
            }
        }
    }
    start() {
        if (this.started) {
            return;
        }
        this.started = true;
        try {
            const installations = [];
            this.installations = installations;
            installations.push(this.install(process.stdout, 'stdout'));
            installations.push(this.install(process.stderr, 'stderr'));
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
        for (const installation of this.installations){
            this.finish(installation);
        }
        this.installations = [];
    }
    install(stream, name) {
        const descriptor = Object.getOwnPropertyDescriptor(stream, 'write');
        const originalWrite = stream.write;
        const state = this.createState();
        const diagnostics = this;
        // This wrapper deliberately preserves the receiver expected by Writable.write.
        const replacement = function(...args) {
            const result = Reflect.apply(originalWrite, this, args);
            if (diagnostics.started) {
                try {
                    const stderrCapture = name === 'stderr' ? diagnostics.stderrCaptures.at(-1) : undefined;
                    if (stderrCapture) {
                        diagnostics.captureRedirected(stderrCapture, args[0]);
                    } else {
                        diagnostics.capture(state, name, args[0]);
                    }
                } catch  {
                // Capturing process output must not affect the original write.
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
            throw new Error(`Unable to observe process ${name}.`);
        }
        return {
            ...descriptor === undefined ? {} : {
                descriptor
            },
            name,
            originalWrite,
            replacement,
            state,
            stream
        };
    }
    capture(state, name, chunk) {
        const text = this.decode(state, chunk);
        if (text === undefined) {
            return;
        }
        this.consume(state, name, text);
    }
    captureRedirected(state, chunk) {
        const text = this.decode(state, chunk);
        if (text === undefined) {
            return;
        }
        this.append(state, text);
    }
    createState() {
        return {
            byteLength: 0,
            buffered: '',
            decoder: new external_node_string_decoder_namespaceObject.StringDecoder('utf8'),
            truncated: false
        };
    }
    decode(state, chunk) {
        let text;
        if (typeof chunk === 'string') {
            text = state.decoder.end() + chunk;
            state.decoder = new external_node_string_decoder_namespaceObject.StringDecoder('utf8');
        } else if (Buffer.isBuffer(chunk) || chunk instanceof Uint8Array) {
            text = state.decoder.write(Buffer.from(chunk));
        } else {
            return undefined;
        }
        return text;
    }
    consume(state, name, text) {
        let offset = 0;
        let newline = text.indexOf('\n');
        while(newline >= 0){
            this.append(state, text.slice(offset, newline));
            this.flush(state, name);
            offset = newline + 1;
            newline = text.indexOf('\n', offset);
        }
        this.append(state, text.slice(offset));
    }
    append(state, value) {
        state.byteLength += Buffer.byteLength(value);
        if (state.truncated || value.length === 0) {
            return;
        }
        const next = takeRuntimeDiagnosticTextPrefix(`${state.buffered}${value}`);
        state.buffered = next.message;
        state.truncated = next.truncated;
    }
    flush(state, name) {
        const line = state.buffered.endsWith('\r') ? state.buffered.slice(0, -1) : state.buffered;
        const byteLength = state.byteLength;
        const wasTruncated = state.truncated;
        state.byteLength = 0;
        state.buffered = '';
        state.truncated = false;
        if (STRUCTURED_LOG_OUTPUT_PATTERN.test(line.trimStart())) {
            return;
        }
        const output = sanitizeRuntimeDiagnosticText(line);
        if (!output) {
            return;
        }
        this.recorder.record({
            id: NODE_PROCESS_OUTPUT_EVENT_ID,
            layer: 'node',
            level: name === 'stderr' ? base_LogLevel.Warning : base_LogLevel.Log,
            payload: {
                byte_length: byteLength,
                message: output.message,
                stream: name,
                truncated: wasTruncated || output.truncated
            }
        });
    }
    finish(installation) {
        try {
            const tail = installation.state.decoder.end();
            this.consume(installation.state, installation.name, tail);
            if (installation.state.byteLength > 0 || installation.state.buffered.length > 0) {
                this.flush(installation.state, installation.name);
            }
        } catch  {
        // Shutdown keeps process output best effort.
        }
    }
    restore(installation) {
        if (installation.stream.write !== installation.replacement) {
            return;
        }
        if (installation.descriptor) {
            Reflect.defineProperty(installation.stream, 'write', installation.descriptor);
            return;
        }
        Reflect.deleteProperty(installation.stream, 'write');
    }
    constructor(){
        this.installations = [];
        this.stderrCaptures = [];
        this.started = false;
    }
}
__decorate([
    inject(RuntimeDiagnosticRecorder),
    __metadata("design:type", typeof RuntimeDiagnosticRecorder === "undefined" ? Object : RuntimeDiagnosticRecorder)
], NodeProcessOutputDiagnostics.prototype, "recorder", void 0);
NodeProcessOutputDiagnostics = __decorate([
    injectable()
], NodeProcessOutputDiagnostics);
