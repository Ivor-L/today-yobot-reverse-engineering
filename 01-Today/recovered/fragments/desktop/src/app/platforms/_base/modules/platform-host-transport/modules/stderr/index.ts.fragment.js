// Compiled fragment from ./src/app/platforms/_base/modules/platform-host-transport/modules/stderr/index.ts.
// The original TypeScript and import graph are not restored.








class PlatformHostStderr {
    connect(input, logPrefix) {
        if (this.input) {
            throw new Error('Platform host stderr can only connect once');
        }
        this.input = input;
        this.logPrefix = logPrefix;
        input.on('data', this.handleData);
        input.once('end', this.handleEnd);
    }
    detach() {
        const input = this.input;
        if (!input) {
            return;
        }
        input.removeListener('data', this.handleData);
        input.removeListener('end', this.handleEnd);
    }
    flush(line) {
        const logPrefix = this.logPrefix;
        if (!logPrefix) {
            return;
        }
        const message = formatPlatformHostStderrLine(line, logPrefix);
        if (!message) {
            return;
        }
        this.logger.warn(message);
    }
    constructor(){
        this.buffered = '';
        this.decoder = new external_node_string_decoder_namespaceObject.StringDecoder('utf8');
        this.handleData = (chunk)=>{
            if (Buffer.isBuffer(chunk)) {
                this.buffered += this.decoder.write(chunk);
            } else {
                this.buffered += chunk;
            }
            while(this.buffered.includes('\n')){
                const newlineIndex = this.buffered.indexOf('\n');
                const line = this.buffered.slice(0, newlineIndex);
                this.buffered = this.buffered.slice(newlineIndex + 1);
                this.flush(line);
            }
            if (Buffer.byteLength(this.buffered, 'utf8') > (/* inlined export .PLATFORM_HOST_MAX_STDERR_LINE_BYTES */8192)) {
                this.flush(`${this.buffered}…`);
                this.buffered = '';
            }
        };
        this.handleEnd = ()=>{
            this.buffered += this.decoder.end();
            this.flush(this.buffered);
            this.buffered = '';
            this.detach();
        };
    }
}
__decorate([
    inject(PlatformHostLogger),
    __metadata("design:type", typeof PlatformHostLogger === "undefined" ? Object : PlatformHostLogger)
], PlatformHostStderr.prototype, "logger", void 0);
PlatformHostStderr = __decorate([
    injectable()
], PlatformHostStderr);
