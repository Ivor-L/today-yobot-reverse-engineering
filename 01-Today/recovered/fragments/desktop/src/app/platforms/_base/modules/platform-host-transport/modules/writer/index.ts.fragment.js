// Compiled fragment from ./src/app/platforms/_base/modules/platform-host-transport/modules/writer/index.ts.
// The original TypeScript and import graph are not restored.






class NdjsonMessageWriter extends node_main.AbstractMessageWriter {
    connect(output) {
        if (this.output) {
            throw new Error('NDJSON message writer can only connect once');
        }
        this.output = output;
        output.once('close', this.handleClose);
        output.on('error', this.handleError);
    }
    async write(message) {
        const previous = this.tail;
        let release;
        this.tail = new Promise((resolve)=>{
            release = resolve;
        });
        await previous;
        try {
            await this.writeMessage(message);
        } finally{
            release();
        }
    }
    end() {
        if (this.ended) {
            return;
        }
        this.ended = true;
        this.output?.end();
    }
    dispose() {
        const output = this.output;
        if (output) {
            output.removeListener('close', this.handleClose);
            output.removeListener('error', this.handleError);
        }
        super.dispose();
    }
    async writeMessage(message) {
        const output = this.output;
        if (!output) {
            throw new Error('NDJSON message writer is not connected');
        }
        if (this.ended) {
            throw new Error('Platform host NDJSON writer is closed');
        }
        let payload;
        try {
            payload = Buffer.from(`${JSON.stringify(message)}\n`, 'utf8');
        } catch (error) {
            const normalized = new Error('Failed to encode platform host JSON-RPC message', {
                cause: error
            });
            this.errorCount += 1;
            this.fireError(normalized, message, this.errorCount);
            throw normalized;
        }
        if (payload.length - 1 > PLATFORM_HOST_MAX_MESSAGE_BYTES) {
            const error = new Error('Platform host JSON-RPC message exceeds the size limit');
            this.errorCount += 1;
            this.fireError(error, message, this.errorCount);
            throw error;
        }
        await new Promise((resolve, reject)=>{
            output.write(payload, (error)=>{
                if (!error) {
                    resolve();
                    return;
                }
                this.errorCount += 1;
                this.fireError(error, message, this.errorCount);
                reject(error);
            });
        });
    }
    constructor(...args){
        super(...args), this.errorCount = 0, this.ended = false, this.tail = Promise.resolve(), this.handleClose = ()=>{
            this.fireClose();
        }, this.handleError = (error)=>{
            this.errorCount += 1;
            this.fireError(asError(error), undefined, this.errorCount);
        };
    }
}
NdjsonMessageWriter = __decorate([
    injectable()
], NdjsonMessageWriter);
