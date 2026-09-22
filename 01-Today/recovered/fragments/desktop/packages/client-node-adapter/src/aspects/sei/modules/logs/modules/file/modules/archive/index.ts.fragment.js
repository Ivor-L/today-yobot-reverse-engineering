// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/file/modules/archive/index.ts.
// The original TypeScript and import graph are not restored.











class FileLogArchive {
    cleanupStaleDirectories() {
        const parentDirectory = (0,external_node_os_namespaceObject.tmpdir)();
        const cutoffTime = Date.now() - FILE_LOG_ARCHIVE_STALE_DIRECTORY_MAX_AGE_MS;
        try {
            for (const name of (0,external_node_fs_namespaceObject.readdirSync)(parentDirectory)){
                if (!name.startsWith(FILE_LOG_ARCHIVE_DIRECTORY_PREFIX)) {
                    continue;
                }
                const path = (0,external_node_path_namespaceObject.join)(parentDirectory, name);
                try {
                    const candidate = (0,external_node_fs_namespaceObject.lstatSync)(path);
                    if (candidate.isDirectory() && candidate.mtimeMs <= cutoffTime) {
                        (0,external_node_fs_namespaceObject.rmSync)(path, {
                            force: true,
                            recursive: true
                        });
                    }
                } catch  {
                // Log upload cleanup must never recursively report its own failure.
                }
            }
        } catch  {
        // Log upload remains available when stale cleanup is unavailable.
        }
    }
    async create(snapshot) {
        const directory = await (0,promises_namespaceObject.mkdtemp)((0,external_node_path_namespaceObject.join)((0,external_node_os_namespaceObject.tmpdir)(), FILE_LOG_ARCHIVE_DIRECTORY_PREFIX));
        const originalFileName = `today-desktop-logs-${Date.now()}.zip`;
        try {
            const sourceChunks = await this.splitSnapshot(snapshot.path, directory);
            const archives = [];
            for (const sourceChunk of sourceChunks){
                const fileName = this.resolveChunkFileName(originalFileName, sourceChunk.chunkIndex);
                const archivePath = (0,external_node_path_namespaceObject.join)(directory, fileName);
                await this.writeArchive(sourceChunk.path, archivePath);
                archives.push({
                    chunkIndex: sourceChunk.chunkIndex,
                    fileName,
                    path: archivePath,
                    sourceByteLength: sourceChunk.sourceByteLength
                });
                await this.removeFileQuietly(sourceChunk.path);
            }
            return {
                archives,
                originalFileName,
                remove: async ()=>{
                    await this.removeDirectoryQuietly(directory);
                }
            };
        } catch (error) {
            await this.removeDirectoryQuietly(directory);
            throw error;
        }
    }
    async splitSnapshot(sourcePath, directory) {
        const sourceChunks = [];
        let sourceChunkBuffers = [];
        let sourceChunkByteLength = 0;
        let pendingLineBuffers = [];
        let pendingLineByteLength = 0;
        const flushSourceChunk = async ()=>{
            if (sourceChunkByteLength === 0) {
                return;
            }
            const chunkIndex = sourceChunks.length;
            const path = (0,external_node_path_namespaceObject.join)(directory, `source-${chunkIndex}.ndjson`);
            await this.writeSourceChunk(path, sourceChunkBuffers);
            sourceChunks.push({
                chunkIndex,
                path,
                sourceByteLength: sourceChunkByteLength
            });
            sourceChunkBuffers = [];
            sourceChunkByteLength = 0;
        };
        const appendPendingLine = async ()=>{
            if (pendingLineByteLength === 0) {
                return;
            }
            if (sourceChunkByteLength > 0 && sourceChunkByteLength + pendingLineByteLength > FILE_LOG_ARCHIVE_TARGET_SOURCE_BYTES) {
                await flushSourceChunk();
            }
            sourceChunkBuffers.push(...pendingLineBuffers);
            sourceChunkByteLength += pendingLineByteLength;
            pendingLineBuffers = [];
            pendingLineByteLength = 0;
            if (sourceChunkByteLength >= FILE_LOG_ARCHIVE_TARGET_SOURCE_BYTES) {
                await flushSourceChunk();
            }
        };
        for await (const value of (0,external_node_fs_namespaceObject.createReadStream)(sourcePath)){
            const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
            let cursor = 0;
            let newlineIndex = buffer.indexOf(0x0a, cursor);
            while(newlineIndex >= 0){
                const segment = buffer.subarray(cursor, newlineIndex + 1);
                pendingLineBuffers.push(segment);
                pendingLineByteLength += segment.byteLength;
                await appendPendingLine();
                cursor = newlineIndex + 1;
                newlineIndex = buffer.indexOf(0x0a, cursor);
            }
            if (cursor < buffer.byteLength) {
                const segment = buffer.subarray(cursor);
                pendingLineBuffers.push(segment);
                pendingLineByteLength += segment.byteLength;
            }
        }
        await appendPendingLine();
        await flushSourceChunk();
        return sourceChunks;
    }
    resolveChunkFileName(originalFileName, chunkIndex) {
        const extension = '.zip';
        if (originalFileName.endsWith(extension)) {
            return `${originalFileName.slice(0, -extension.length)}-${chunkIndex}${extension}`;
        }
        return `${originalFileName}-${chunkIndex}`;
    }
    async writeArchive(sourcePath, archivePath) {
        const output = this.createArchiveOutput(archivePath);
        const archive = new ZipArchive({
            zlib: {
                level: (/* inlined export .FILE_LOG_ARCHIVE_COMPRESSION_LEVEL */9)
            }
        });
        const outputFinished = (0,external_node_stream_promises_namespaceObject.finished)(output);
        archive.once('error', (error)=>{
            output.destroy(error);
        });
        archive.pipe(output);
        archive.file(sourcePath, {
            name: 'client.ndjson'
        });
        try {
            await Promise.all([
                archive.finalize(),
                outputFinished
            ]);
        } catch (error) {
            try {
                archive.abort();
            } catch  {
            // The output stream remains the final resource cleanup boundary.
            }
            output.destroy();
            try {
                await outputFinished;
            } catch  {
            // Preserve the original archive failure.
            }
            throw error;
        }
    }
    createArchiveOutput(archivePath) {
        return (0,external_node_fs_namespaceObject.createWriteStream)(archivePath, {
            flags: 'wx',
            mode: 384
        });
    }
    async writeSourceChunk(path, buffers) {
        const file = await (0,promises_namespaceObject.open)(path, 'wx', 384);
        try {
            for (const buffer of buffers){
                let offset = 0;
                while(offset < buffer.byteLength){
                    const result = await file.write(buffer, offset, buffer.byteLength - offset);
                    if (result.bytesWritten === 0) {
                        throw new Error('The local log source chunk could not be written.');
                    }
                    offset += result.bytesWritten;
                }
            }
        } finally{
            await file.close();
        }
    }
    async removeFileQuietly(path) {
        try {
            await (0,promises_namespaceObject.rm)(path, {
                force: true
            });
        } catch  {
        // The enclosing upload directory remains the final cleanup boundary.
        }
    }
    async removeDirectoryQuietly(directory) {
        try {
            await (0,promises_namespaceObject.rm)(directory, {
                force: true,
                recursive: true
            });
        } catch  {
        // Log upload cleanup must never recursively report its own failure.
        }
    }
}
__decorate([
    postConstruct(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FileLogArchive.prototype, "cleanupStaleDirectories", null);
FileLogArchive = __decorate([
    injectable()
], FileLogArchive);
