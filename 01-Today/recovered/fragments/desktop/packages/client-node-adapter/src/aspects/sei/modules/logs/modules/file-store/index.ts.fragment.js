// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/file-store/index.ts.
// The original TypeScript and import graph are not restored.












class FileLogStore extends readonly_events_ReadonlyEvents {
    initialize() {
        try {
            if (this.config.filePath.length === 0) {
                throw new Error('The file log path must not be empty.');
            }
            (0,external_node_fs_namespaceObject.mkdirSync)((0,external_node_path_namespaceObject.dirname)(this.config.filePath), {
                recursive: true
            });
            this.cleanupStaleTemporaryFiles();
            const descriptor = (0,external_node_fs_namespaceObject.openSync)(this.config.filePath, 'a', (/* inlined export .FILE_LOG_FILE_MODE */384));
            (0,external_node_fs_namespaceObject.closeSync)(descriptor);
            (0,external_node_fs_namespaceObject.chmodSync)(this.config.filePath, (/* inlined export .FILE_LOG_FILE_MODE */384));
            const retentionCheckLineCount = this.retentionCheckLineCount;
            this.linesSinceRetentionCheck = retentionCheckLineCount - 1;
            this.timer = setInterval(()=>{
                this.flush();
            }, this.flushIntervalMs);
            this.timer.unref();
        } catch  {
            this.disable();
        }
    }
    async openDirectory() {
        if (this.failed || this.disposed) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The local log directory is unavailable.');
        }
        try {
            const error = await external_electron_.shell.openPath((0,external_node_path_namespaceObject.dirname)(this.config.filePath));
            if (error.length > 0) {
                throw new Error(error);
            }
        } catch  {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The local log directory could not be opened.');
        }
    }
    append(entry) {
        if (this.failed || this.disposed) {
            return false;
        }
        try {
            const serialized = JSON.stringify(entry);
            if (serialized === undefined) {
                throw new Error('The file log entry is not serializable.');
            }
            this.pendingLines.push(`${serialized}\n`);
            this.emit('appended', Object.freeze({
                serialized
            }));
            return true;
        } catch  {
            this.disable();
            return false;
        }
    }
    flush() {
        if (this.failed || this.disposed || this.pendingLines.length === 0) {
            return;
        }
        const lines = this.pendingLines.splice(0);
        try {
            (0,external_node_fs_namespaceObject.appendFileSync)(this.config.filePath, lines.join(''), {
                encoding: 'utf8',
                mode: (/* inlined export .FILE_LOG_FILE_MODE */384)
            });
            this.linesSinceRetentionCheck += lines.length;
            const maxBytes = this.maxBytes;
            const exceedsSizeLimit = (0,external_node_fs_namespaceObject.statSync)(this.config.filePath).size > maxBytes;
            const reachedAgeCheckThreshold = this.linesSinceRetentionCheck >= this.retentionCheckLineCount && Date.now() >= this.nextRetentionCheckAt;
            if (exceedsSizeLimit || reachedAgeCheckThreshold) {
                const largestFlushedLineBytes = lines.reduce((largest, line)=>Math.max(largest, Buffer.byteLength(line)), 0);
                const targetBytes = exceedsSizeLimit ? Math.min(maxBytes, Math.max(largestFlushedLineBytes, Math.floor(maxBytes * (/* inlined export .FILE_LOG_SIZE_RETENTION_TARGET_RATIO */0.9)))) : maxBytes;
                this.enforceRetention(targetBytes);
                this.markRetentionChecked();
            }
        } catch  {
            this.disable();
        }
    }
    createUploadSnapshot() {
        if (this.failed || this.disposed) {
            return {
                status: 'failed'
            };
        }
        this.flush();
        if (this.failed) {
            return {
                status: 'failed'
            };
        }
        let snapshotPath;
        try {
            const source = this.enforceRetention();
            this.markRetentionChecked();
            if (source.length === 0) {
                return {
                    status: 'empty'
                };
            }
            snapshotPath = this.createTemporaryPath('upload.ndjson');
            (0,external_node_fs_namespaceObject.writeFileSync)(snapshotPath, source, {
                encoding: 'utf8',
                flag: 'wx',
                mode: (/* inlined export .FILE_LOG_FILE_MODE */384)
            });
            (0,external_node_fs_namespaceObject.chmodSync)(snapshotPath, (/* inlined export .FILE_LOG_FILE_MODE */384));
            const snapshot = (0,external_node_fs_namespaceObject.statSync)(snapshotPath);
            this.uploadSnapshotPaths.add(snapshotPath);
            return {
                status: 'ready',
                snapshot: {
                    path: snapshotPath,
                    byteLength: snapshot.size
                }
            };
        } catch  {
            if (snapshotPath !== undefined) {
                this.removeFileQuietly(snapshotPath);
            }
            this.disable();
            return {
                status: 'failed'
            };
        }
    }
    createReadWindow(maxBytes) {
        if (this.failed || this.disposed || !Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
            return undefined;
        }
        this.flush();
        if (this.failed) {
            return undefined;
        }
        try {
            const size = (0,external_node_fs_namespaceObject.statSync)(this.config.filePath).size;
            return Object.freeze({
                endExclusive: size,
                path: this.config.filePath,
                start: Math.max(0, size - maxBytes)
            });
        } catch  {
            return undefined;
        }
    }
    removeUploadSnapshot(snapshot) {
        if (!this.uploadSnapshotPaths.has(snapshot.path)) {
            return;
        }
        if (!this.removeFileQuietly(snapshot.path)) {
            this.disable();
            return;
        }
        this.uploadSnapshotPaths.delete(snapshot.path);
    }
    dispose() {
        if (this.disposed) {
            return;
        }
        if (this.timer !== undefined) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
        this.flush();
        this.disposed = true;
    }
    enforceRetention(maxBytes = this.maxBytes) {
        const source = (0,external_node_fs_namespaceObject.readFileSync)(this.config.filePath, 'utf8');
        const cutoffTime = Date.now() - this.maxAgeMs;
        const retained = retainNdjson(source, cutoffTime, maxBytes);
        if (!retained.changed) {
            return source;
        }
        const temporaryPath = this.createTemporaryPath('retention.tmp');
        try {
            (0,external_node_fs_namespaceObject.writeFileSync)(temporaryPath, retained.contents, {
                encoding: 'utf8',
                flag: 'wx',
                mode: (/* inlined export .FILE_LOG_FILE_MODE */384)
            });
            (0,external_node_fs_namespaceObject.renameSync)(temporaryPath, this.config.filePath);
            (0,external_node_fs_namespaceObject.chmodSync)(this.config.filePath, (/* inlined export .FILE_LOG_FILE_MODE */384));
            return retained.contents;
        } catch (error) {
            this.removeFileQuietly(temporaryPath);
            throw error;
        }
    }
    cleanupStaleTemporaryFiles() {
        const directory = (0,external_node_path_namespaceObject.dirname)(this.config.filePath);
        const prefix = `${(0,external_node_path_namespaceObject.basename)(this.config.filePath)}.`;
        const cutoffTime = Date.now() - DEFAULT_FILE_LOG_STALE_TEMPORARY_FILE_MAX_AGE_MS;
        for (const name of (0,external_node_fs_namespaceObject.readdirSync)(directory)){
            const isStoreTemporaryFile = name.startsWith(prefix) && (name.endsWith('.upload.ndjson') || name.endsWith('.retention.tmp'));
            if (!isStoreTemporaryFile) {
                continue;
            }
            const path = (0,external_node_path_namespaceObject.join)(directory, name);
            if ((0,external_node_fs_namespaceObject.statSync)(path).mtimeMs <= cutoffTime) {
                (0,external_node_fs_namespaceObject.rmSync)(path, {
                    force: true
                });
            }
        }
    }
    disable() {
        this.failed = true;
        this.pendingLines.length = 0;
        if (this.timer === undefined) {
            return;
        }
        clearInterval(this.timer);
        this.timer = undefined;
    }
    markRetentionChecked() {
        this.linesSinceRetentionCheck = 0;
        this.nextRetentionCheckAt = Date.now() + DEFAULT_FILE_LOG_RETENTION_CHECK_INTERVAL_MS;
    }
    createTemporaryPath(suffix) {
        this.temporaryFileSequence += 1;
        return `${this.config.filePath}.${process.pid}.${Date.now()}.${this.temporaryFileSequence}.${suffix}`;
    }
    removeFileQuietly(path) {
        try {
            (0,external_node_fs_namespaceObject.rmSync)(path, {
                force: true
            });
            return true;
        } catch  {
            // File logging must never report its own cleanup failures.
            return false;
        }
    }
    get flushIntervalMs() {
        return resolvePositiveInteger(this.config.flushIntervalMs, (/* inlined export .DEFAULT_FILE_LOG_FLUSH_INTERVAL_MS */3000));
    }
    get maxAgeMs() {
        return resolvePositiveInteger(this.config.maxAgeMs, DEFAULT_FILE_LOG_MAX_AGE_MS);
    }
    get maxBytes() {
        return resolvePositiveInteger(this.config.maxBytes, DEFAULT_FILE_LOG_MAX_BYTES);
    }
    get retentionCheckLineCount() {
        return resolvePositiveInteger(this.config.retentionCheckLineCount, (/* inlined export .DEFAULT_FILE_LOG_RETENTION_CHECK_LINE_COUNT */300));
    }
    constructor(...args){
        super(...args), this.pendingLines = [], this.uploadSnapshotPaths = new Set(), this.failed = false, this.disposed = false, this.linesSinceRetentionCheck = 0, this.nextRetentionCheckAt = 0, this.temporaryFileSequence = 0;
    }
}
__decorate([
    inject(CLIENT_NODE_LOGS_CONFIG),
    __metadata("design:type", typeof ClientNodeLogsConfig === "undefined" ? Object : ClientNodeLogsConfig)
], FileLogStore.prototype, "config", void 0);
__decorate([
    postConstruct(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FileLogStore.prototype, "initialize", null);
FileLogStore = __decorate([
    injectable()
], FileLogStore);
