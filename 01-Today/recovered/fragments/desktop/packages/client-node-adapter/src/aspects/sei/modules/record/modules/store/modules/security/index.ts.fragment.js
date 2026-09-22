// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/record/modules/store/modules/security/index.ts.
// The original TypeScript and import graph are not restored.








const FILE_READ_CHUNK_BYTES = 64 * 1024;
class RecordStoreSecurity {
    isFileSystemError(error, code) {
        return typeof error === 'object' && error !== null && 'code' in error && Reflect.get(error, 'code') === code;
    }
    assertSafeBaseName(value) {
        if (value.length === 0 || value === '.' || value === '..' || value.includes('/') || value.includes('\\') || value.includes('\0') || (0,external_node_path_namespaceObject.basename)(value) !== value) {
            throw new Error('The recording storage file name is invalid.');
        }
    }
    assertPathContained(rootRealPath, candidateRealPath) {
        const pathFromRoot = (0,external_node_path_namespaceObject.relative)(rootRealPath, candidateRealPath);
        if (pathFromRoot === '..' || pathFromRoot.startsWith(`..${external_node_path_namespaceObject.sep}`) || (0,external_node_path_namespaceObject.isAbsolute)(pathFromRoot)) {
            throw new Error('The recording storage path escaped its private spool root.');
        }
    }
    assertOwned(stats) {
        if (typeof process.getuid !== 'function') {
            return;
        }
        if (stats.uid !== process.getuid()) {
            throw new Error('The recording storage entry is not owned by the current user.');
        }
    }
    async ensureRecordRoot(rootPath) {
        const parentPath = (0,external_node_path_namespaceObject.dirname)(rootPath);
        let created = false;
        await (0,promises_namespaceObject.mkdir)(parentPath, {
            recursive: true
        });
        try {
            await (0,promises_namespaceObject.mkdir)(rootPath, {
                mode: (/* inlined export .RECORD_DIRECTORY_MODE */448)
            });
            created = true;
        } catch (error) {
            if (!this.isFileSystemError(error, 'EEXIST')) {
                throw error;
            }
        }
        const realPath = await this.validateDirectory(await (0,promises_namespaceObject.realpath)(parentPath), rootPath, 'The recording spool root must be a real directory.');
        return {
            created,
            realPath
        };
    }
    async ensureRecordDirectory(rootRealPath, directoryPath) {
        let created = false;
        try {
            await (0,promises_namespaceObject.mkdir)(directoryPath, {
                mode: (/* inlined export .RECORD_DIRECTORY_MODE */448)
            });
            created = true;
        } catch (error) {
            if (!this.isFileSystemError(error, 'EEXIST')) {
                throw error;
            }
        }
        return {
            created,
            realPath: await this.validateRecordDirectory(rootRealPath, directoryPath)
        };
    }
    async validateRecordDirectory(rootRealPath, directoryPath) {
        return await this.validateDirectory(rootRealPath, directoryPath, 'The recording spool entry must be a real directory.');
    }
    async readVerifiedRecordFile(rootRealPath, filePath, maximumBytes) {
        const pathStats = await (0,promises_namespaceObject.lstat)(filePath);
        if (pathStats.isSymbolicLink() || !pathStats.isFile()) {
            throw new Error('The recording spool file must be a regular file.');
        }
        this.assertOwned(pathStats);
        if (process.platform !== 'win32' && pathStats.nlink !== 1) {
            throw new Error('The recording spool file must not have additional hard links.');
        }
        if (!Number.isSafeInteger(pathStats.size) || pathStats.size < 0 || pathStats.size > maximumBytes) {
            throw new Error('The recording spool file exceeds its byte quota.');
        }
        const fileRealPath = await (0,promises_namespaceObject.realpath)(filePath);
        this.assertPathContained(rootRealPath, fileRealPath);
        const noFollow = process.platform === 'win32' ? 0 : external_node_fs_namespaceObject.constants.O_NOFOLLOW;
        const handle = await (0,promises_namespaceObject.open)(filePath, external_node_fs_namespaceObject.constants.O_RDONLY | noFollow);
        try {
            const openedStats = await handle.stat();
            this.assertSameFile(pathStats, openedStats);
            if (!openedStats.isFile()) {
                throw new Error('The recording spool file must be a regular file.');
            }
            this.assertOwned(openedStats);
            if (process.platform !== 'win32') {
                if (openedStats.nlink !== 1) {
                    throw new Error('The recording spool file must not have additional hard links.');
                }
                await handle.chmod((/* inlined export .RECORD_FILE_MODE */384));
            }
            const stableStats = await handle.stat();
            const chunks = [];
            let byteLength = 0;
            while(true){
                const bytesRemaining = maximumBytes + 1 - byteLength;
                if (bytesRemaining <= 0) {
                    throw new Error('The recording spool file exceeds its byte quota.');
                }
                const buffer = Buffer.allocUnsafe(Math.min(FILE_READ_CHUNK_BYTES, bytesRemaining));
                const { bytesRead } = await handle.read(buffer, 0, buffer.byteLength, byteLength);
                if (bytesRead === 0) {
                    break;
                }
                chunks.push(buffer.subarray(0, bytesRead));
                byteLength += bytesRead;
            }
            if (byteLength > maximumBytes) {
                throw new Error('The recording spool file exceeds its byte quota.');
            }
            const finalStats = await handle.stat();
            this.assertSameFile(stableStats, finalStats);
            if (finalStats.size !== byteLength || finalStats.mtimeMs !== stableStats.mtimeMs || finalStats.ctimeMs !== stableStats.ctimeMs) {
                throw new Error('The recording spool file changed while it was being read.');
            }
            const bytes = Buffer.concat(chunks, byteLength);
            return {
                bytes,
                contentSha256: (0,external_node_crypto_namespaceObject.createHash)('sha256').update(bytes).digest('hex'),
                stats: finalStats
            };
        } finally{
            await handle.close();
        }
    }
    async enforceMode(path, mode) {
        if (process.platform === 'win32') {
            return;
        }
        await (0,promises_namespaceObject.chmod)(path, mode);
    }
    assertSameFile(pathStats, descriptorStats) {
        if (pathStats.dev !== descriptorStats.dev || pathStats.ino !== descriptorStats.ino) {
            throw new Error('The recording storage entry changed while it was being opened.');
        }
    }
    async validateDirectory(rootRealPath, directoryPath, errorMessage) {
        const stats = await (0,promises_namespaceObject.lstat)(directoryPath);
        if (stats.isSymbolicLink() || !stats.isDirectory()) {
            throw new Error(errorMessage);
        }
        this.assertOwned(stats);
        const directoryRealPath = await (0,promises_namespaceObject.realpath)(directoryPath);
        this.assertPathContained(rootRealPath, directoryRealPath);
        await this.enforceMode(directoryPath, (/* inlined export .RECORD_DIRECTORY_MODE */448));
        return directoryRealPath;
    }
}
RecordStoreSecurity = __decorate([
    injectable()
], RecordStoreSecurity);
