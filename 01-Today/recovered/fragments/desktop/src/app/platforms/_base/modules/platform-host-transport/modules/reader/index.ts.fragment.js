// Compiled fragment from ./src/app/platforms/_base/modules/platform-host-transport/modules/reader/index.ts.
// The original TypeScript and import graph are not restored.






class NdjsonMessageReader extends node_main.AbstractMessageReader {
    connect(input) {
        if (this.input) {
            throw new Error('NDJSON message reader can only connect once');
        }
        this.input = input;
    }
    listen(callback) {
        if (this.callback) {
            throw new Error('NDJSON message reader can only listen once');
        }
        const input = this.input;
        if (!input) {
            throw new Error('NDJSON message reader is not connected');
        }
        this.callback = callback;
        input.on('data', this.handleData);
        input.once('end', this.handleClose);
        input.once('close', this.handleClose);
        input.once('error', this.handleError);
        return node_main.Disposable.create(()=>this.detach());
    }
    dispose() {
        this.detach();
        this.buffer = Buffer.alloc(0);
        this.callback = undefined;
        super.dispose();
    }
    bufferRemainder(remainder) {
        const nextLength = this.buffer.length + remainder.length;
        let endsWithCarriageReturn = this.buffer.at(-1) === 0x0d;
        if (remainder.length > 0) {
            endsWithCarriageReturn = remainder.at(-1) === 0x0d;
        }
        if (nextLength > PLATFORM_HOST_MAX_MESSAGE_BYTES + 1 || nextLength === PLATFORM_HOST_MAX_MESSAGE_BYTES + 1 && !endsWithCarriageReturn) {
            this.fail(new Error('Platform host NDJSON message exceeds the size limit'));
            return;
        }
        if (this.buffer.length === 0) {
            this.buffer = Buffer.from(remainder);
            return;
        }
        this.buffer = Buffer.concat([
            this.buffer,
            remainder
        ], nextLength);
    }
    consumeLine(segment) {
        const encodedLength = this.buffer.length + segment.length;
        let endsWithCarriageReturn = this.buffer.at(-1) === 0x0d;
        if (segment.length > 0) {
            endsWithCarriageReturn = segment.at(-1) === 0x0d;
        }
        let messageLength = encodedLength;
        if (endsWithCarriageReturn) {
            messageLength -= 1;
        }
        if (messageLength > PLATFORM_HOST_MAX_MESSAGE_BYTES) {
            this.fail(new Error('Platform host NDJSON message exceeds the size limit'));
            return;
        }
        let line = segment;
        if (this.buffer.length > 0) {
            line = Buffer.concat([
                this.buffer,
                segment
            ], encodedLength);
        }
        this.buffer = Buffer.alloc(0);
        if (endsWithCarriageReturn) {
            line = line.subarray(0, -1);
        }
        if (line.length === 0) {
            return;
        }
        try {
            const decoded = new TextDecoder('utf-8', {
                fatal: true
            }).decode(line);
            const message = JSON.parse(decoded);
            if (typeof message !== 'object' || message === null || Array.isArray(message)) {
                throw new TypeError('JSON-RPC message must be an object');
            }
            this.callback?.(message);
        } catch (error) {
            this.fail(new Error('Platform host returned invalid UTF-8 NDJSON', {
                cause: error
            }));
        }
    }
    detach() {
        const input = this.input;
        if (!input) {
            return;
        }
        input.removeListener('data', this.handleData);
        input.removeListener('end', this.handleClose);
        input.removeListener('close', this.handleClose);
        input.removeListener('error', this.handleError);
    }
    fail(error) {
        if (this.failed) {
            return;
        }
        this.failed = true;
        this.detach();
        this.fireError(error);
    }
    constructor(...args){
        super(...args), this.buffer = Buffer.alloc(0), this.closed = false, this.failed = false, this.handleClose = ()=>{
            if (this.closed) {
                return;
            }
            this.closed = true;
            if (!this.failed && this.buffer.length > 0) {
                this.fail(new Error('Platform host closed with an unterminated NDJSON message'));
            }
            this.fireClose();
        }, this.handleData = (chunk)=>{
            if (this.failed || this.closed) {
                return;
            }
            let data = Buffer.from(chunk);
            if (Buffer.isBuffer(chunk)) {
                data = chunk;
            }
            let offset = 0;
            while(offset < data.length && !this.failed){
                const newlineIndex = data.indexOf(0x0a, offset);
                if (newlineIndex < 0) {
                    this.bufferRemainder(data.subarray(offset));
                    return;
                }
                this.consumeLine(data.subarray(offset, newlineIndex));
                offset = newlineIndex + 1;
            }
        }, this.handleError = (error)=>{
            this.fail(asError(error));
        };
    }
}
NdjsonMessageReader = __decorate([
    injectable()
], NdjsonMessageReader);
