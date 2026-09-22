// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/debug/modules/logs/modules/file-reader/index.ts.
// The original TypeScript and import graph are not restored.










class DebugFileLogReader {
    async list(params) {
        const window = this.store.createReadWindow(MAX_DEBUG_FILE_SCAN_BYTES);
        if (window === undefined) {
            throw new Error('The local log read window is unavailable.');
        }
        if (window.endExclusive === 0) {
            return Object.freeze({
                records: Object.freeze([]),
                truncated: false
            });
        }
        const descriptor = (0,external_node_fs_namespaceObject.openSync)(window.path, 'r');
        let input;
        try {
            input = (0,external_node_fs_namespaceObject.createReadStream)(window.path, {
                autoClose: true,
                encoding: 'utf8',
                end: window.endExclusive - 1,
                fd: descriptor,
                start: window.start
            });
        } catch (error) {
            (0,external_node_fs_namespaceObject.closeSync)(descriptor);
            throw error;
        }
        const lines = (0,external_node_readline_namespaceObject.createInterface)({
            input,
            crlfDelay: Infinity
        });
        const records = new Array((/* inlined export .MAX_DEBUG_FILE_LOG_RECORDS */500));
        const recordBytes = new Array((/* inlined export .MAX_DEBUG_FILE_LOG_RECORDS */500)).fill(0);
        let recordCount = 0;
        let retainedBytes = 0;
        let oldestIndex = 0;
        let firstLine = true;
        let truncated = window.start > 0;
        try {
            for await (const line of lines){
                if (firstLine && window.start > 0) {
                    firstLine = false;
                    continue;
                }
                firstLine = false;
                const record = this.parseLine(line);
                if (record === undefined) {
                    truncated = true;
                    continue;
                }
                if (record.recordedAt < params.fromAt || record.recordedAt >= params.toAt) {
                    continue;
                }
                const projectedBytes = Buffer.byteLength(JSON.stringify(record), 'utf8') + 1;
                while(recordCount > 0 && (recordCount >= (/* inlined export .MAX_DEBUG_FILE_LOG_RECORDS */500) || retainedBytes + projectedBytes > MAX_DEBUG_FILE_RESULT_BYTES)){
                    retainedBytes -= recordBytes[oldestIndex] ?? 0;
                    records[oldestIndex] = undefined;
                    recordBytes[oldestIndex] = 0;
                    oldestIndex = (oldestIndex + 1) % (/* inlined export .MAX_DEBUG_FILE_LOG_RECORDS */500);
                    recordCount -= 1;
                    truncated = true;
                }
                const writeIndex = (oldestIndex + recordCount) % (/* inlined export .MAX_DEBUG_FILE_LOG_RECORDS */500);
                records[writeIndex] = record;
                recordBytes[writeIndex] = projectedBytes;
                retainedBytes += projectedBytes;
                recordCount += 1;
            }
        } finally{
            lines.close();
            input.destroy();
        }
        const retained = Array.from({
            length: recordCount
        }, (_, index)=>{
            const record = records[(oldestIndex + index) % (/* inlined export .MAX_DEBUG_FILE_LOG_RECORDS */500)];
            if (record === undefined) {
                throw new Error('The bounded log record buffer is inconsistent.');
            }
            return record;
        }).sort((left, right)=>left.recordedAt - right.recordedAt);
        return Object.freeze({
            records: Object.freeze(retained),
            truncated
        });
    }
    parseLine(line) {
        return parseDebugLogRecord((/* inlined export .PushTarget.File */"file"), line);
    }
}
__decorate([
    inject(FileLogStore),
    __metadata("design:type", typeof FileLogStore === "undefined" ? Object : FileLogStore)
], DebugFileLogReader.prototype, "store", void 0);
DebugFileLogReader = __decorate([
    injectable()
], DebugFileLogReader);
