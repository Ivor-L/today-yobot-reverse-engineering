// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/file/modules/uploader/index.ts.
// The original TypeScript and import graph are not restored.

















class FileLogsUploader {
    async upload(options = {
        trigger: 'local_logs_upload'
    }) {
        const { signal } = options;
        // Explicit uploads also flush buffered records before any authentication or network work.
        this.store.flush();
        this.assertNotCancelled(signal);
        const auth = await this.getUploadAuth(options);
        this.assertNotCancelled(signal);
        if (!auth && options.trigger === 'remote_logs_upload') {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.AuthRequired, 'Sign in to upload remote diagnostics.');
        }
        const deviceId = await this.context.getDeviceId();
        this.assertNotCancelled(signal);
        if (!deviceId) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The device identity is unavailable for local log upload.');
        }
        const snapshotResult = this.store.createUploadSnapshot();
        if (snapshotResult.status === 'empty') {
            return null;
        }
        if (snapshotResult.status === 'failed') {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The local log store is unavailable for upload.');
        }
        const snapshot = snapshotResult.snapshot;
        let archiveResult;
        try {
            const diagnostics = await this.context.getUploadDiagnostics();
            this.assertNotCancelled(signal);
            archiveResult = await this.archive.create(snapshot);
            this.assertNotCancelled(signal);
            if (archiveResult.archives.length === 0) {
                throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The local log snapshot did not contain uploadable records.');
            }
            const context = this.createUploadContext(archiveResult, snapshot.byteLength, auth, deviceId, diagnostics, options);
            return await this.uploadArchives(archiveResult.archives, context);
        } finally{
            if (archiveResult !== undefined) {
                try {
                    await archiveResult.remove();
                } catch  {
                // Log upload cleanup must never recursively report its own failure.
                }
            }
            try {
                this.store.removeUploadSnapshot(snapshot);
            } catch  {
            // The store owns its cleanup fuse; cleanup must never mask the upload result.
            }
        }
    }
    async getUploadAuth(options) {
        try {
            return await this.account.getFreshAuthContext();
        } catch (error) {
            if (options.trigger === 'remote_logs_upload') {
                throw error;
            }
            // User-requested diagnostics must also work when refreshing a damaged session fails.
            return null;
        }
    }
    getUploadTrafficLane(auth) {
        if (auth !== null) {
            return auth.trafficLane;
        }
        try {
            return this.preferences.trafficLane.value ?? undefined;
        } catch  {
            // Unavailable routing preferences must not prevent anonymous diagnostics.
            return undefined;
        }
    }
    createUploadContext(archiveResult, sourceByteLength, auth, deviceId, diagnostics, options) {
        const runtime = this.account.runtimeSnapshot;
        // Log archives use a direct client so caller cancellation reaches fetch and uploads are not
        // constrained by the account request timeout. Apply the desktop identity explicitly here.
        const headers = {
            'X-App-Version': this.config.appVersion,
            'X-Client-Platform': runtime.clientPlatform,
            'X-Device-Id': deviceId
        };
        const trafficLane = this.getUploadTrafficLane(auth);
        if (trafficLane) {
            headers['X-Traffic-Lane'] = trafficLane;
        }
        const client = createClient({
            baseUrl: runtime.apiBaseUrl,
            ...auth === null ? {} : {
                auth: auth.accessToken
            },
            headers,
            fetch: async (input, init)=>{
                const requestHeaders = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
                requestHeaders.set('Accept-Language', await this.account.getRequestAcceptLanguage());
                return await globalThis.fetch(input, {
                    ...init,
                    headers: requestHeaders
                });
            },
            redirect: 'error'
        });
        return {
            environment: auth?.environment ?? runtime.environment,
            batchId: (0,external_node_crypto_namespaceObject.randomUUID)(),
            chunkCount: archiveResult.archives.length,
            client,
            deviceId,
            diagnostics,
            options,
            originalFileName: archiveResult.originalFileName,
            sourceByteLength
        };
    }
    async uploadArchives(archives, context) {
        const queue = [
            ...archives
        ].sort((left, right)=>right.chunkIndex - left.chunkIndex);
        const failures = [];
        const logIds = new Map();
        let nextQueueIndex = 0;
        let stopDequeuing = false;
        const chunkProgress = new Map();
        const totalSourceBytes = archives.reduce((total, archive)=>total + archive.sourceByteLength, 0);
        const onChunkProgress = (archive, progress)=>{
            const previous = chunkProgress.get(archive.chunkIndex) ?? 0;
            chunkProgress.set(archive.chunkIndex, Math.max(previous, progress));
            const transferred = archives.reduce((total, chunk)=>total + (chunkProgress.get(chunk.chunkIndex) ?? 0) * chunk.sourceByteLength, 0);
            this.notifyProgress(context.options.onProgress, transferred / Math.max(1, totalSourceBytes));
        };
        const worker = async ()=>{
            while(!stopDequeuing && nextQueueIndex < queue.length){
                const queueIndex = nextQueueIndex;
                nextQueueIndex += 1;
                const archive = queue[queueIndex];
                if (archive === undefined) {
                    return;
                }
                try {
                    const logId = await this.uploadArchiveWithRetry(archive, context, (progress)=>{
                        onChunkProgress(archive, progress);
                    });
                    this.assertNotCancelled(context.options.signal);
                    if (logId !== null) {
                        logIds.set(archive.chunkIndex, logId);
                    }
                    onChunkProgress(archive, 1);
                } catch (error) {
                    failures.push(interface_error_InterfaceError(error, 'The local log upload failed.'));
                    stopDequeuing = true;
                }
            }
        };
        const workerCount = Math.min((/* inlined export .FILE_LOG_UPLOAD_CONCURRENCY */3), queue.length);
        const workers = [];
        for(let index = 0; index < workerCount; index += 1){
            workers.push(worker());
        }
        await Promise.all(workers);
        this.assertNotCancelled(context.options.signal);
        const failure = failures[0];
        if (failure !== undefined) {
            throw failure;
        }
        for (const archive of queue){
            const logId = logIds.get(archive.chunkIndex);
            if (logId !== undefined) {
                return logId;
            }
        }
        return null;
    }
    async uploadArchiveWithRetry(archive, context, onProgress) {
        for(let attempt = 1; attempt <= (/* inlined export .FILE_LOG_UPLOAD_MAX_ATTEMPTS */3); attempt += 1){
            this.assertNotCancelled(context.options.signal);
            try {
                return await this.uploadArchive(archive, context, onProgress);
            } catch (error) {
                this.assertNotCancelled(context.options.signal);
                const normalized = interface_error_InterfaceError(error, 'The local log upload failed.');
                if (attempt >= (/* inlined export .FILE_LOG_UPLOAD_MAX_ATTEMPTS */3) || !this.isRetryable(normalized)) {
                    throw normalized;
                }
                await this.retryDelay.wait(attempt);
            }
        }
        return null;
    }
    async uploadArchive(archiveChunk, context, onProgress) {
        const { remoteUploadRequestId, signal, trigger } = context.options;
        this.assertNotCancelled(signal);
        const archive = await this.uploadFileProvider.create(archiveChunk.path, archiveChunk.fileName, (progress)=>{
            // Reserve the final portion until the server confirms this chunk is persisted.
            onProgress(progress * 0.95);
        });
        const metadata = JSON.stringify({
            app_version: this.config.appVersion,
            batch_id: context.batchId,
            chunk_count: context.chunkCount,
            chunk_index: archiveChunk.chunkIndex,
            chunk_source_bytes: String(archiveChunk.sourceByteLength),
            device_id: context.deviceId,
            environment: context.environment,
            original_filename: context.originalFileName,
            platform: this.config.platform,
            screen: 'desktop_logs',
            severity: 'info',
            source_bytes: String(context.sourceByteLength),
            trigger,
            ...context.diagnostics,
            ...remoteUploadRequestId ? {
                remote_upload_request_id: remoteUploadRequestId
            } : {}
        });
        let result;
        try {
            result = await postV1ClientLogs({
                body: {
                    archive,
                    metadata
                },
                client: context.client,
                signal
            });
        } catch (error) {
            this.assertNotCancelled(signal);
            throw interface_error_InterfaceError(base_InterfaceErrorCode.NetworkError, 'The local log upload failed.', {
                cause: error
            });
        }
        this.assertNotCancelled(signal);
        if (result.response?.ok) {
            const data = result.data;
            let logId = data?.id.trim();
            if (trigger === 'local_logs_upload' && data && 'uploadId' in data) {
                const uploadId = data.uploadId;
                if (typeof uploadId === 'string' && uploadId.trim().length > 0) {
                    logId = uploadId.trim();
                }
            }
            if (!logId) {
                throw interface_error_InterfaceError(base_InterfaceErrorCode.NetworkError, 'The log upload response did not include an upload ID.');
            }
            return logId;
        }
        const status = result.response?.status;
        const suffix = status === undefined ? '' : ` (HTTP ${status})`;
        const cause = 'error' in result ? result.error : undefined;
        throw interface_error_InterfaceError(base_InterfaceErrorCode.NetworkError, `The local log upload failed${suffix}.`, {
            cause,
            status
        });
    }
    notifyProgress(onProgress, progress) {
        if (onProgress === undefined) {
            return;
        }
        try {
            onProgress(progress);
        } catch  {
        // Progress observation must not change the upload result.
        }
    }
    isRetryable(error) {
        if (error.code !== base_InterfaceErrorCode.NetworkError) {
            return false;
        }
        const status = error.status;
        if (status === undefined) {
            return true;
        }
        return status === 408 || status === 425 || status === 429 || status >= 500;
    }
    assertNotCancelled(signal) {
        if (signal?.aborted) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Cancelled, 'The local log upload was cancelled.');
        }
    }
}
__decorate([
    inject(FileLogStore),
    __metadata("design:type", typeof FileLogStore === "undefined" ? Object : FileLogStore)
], FileLogsUploader.prototype, "store", void 0);
__decorate([
    inject(FileLogArchive),
    __metadata("design:type", typeof FileLogArchive === "undefined" ? Object : FileLogArchive)
], FileLogsUploader.prototype, "archive", void 0);
__decorate([
    inject(AccountShellService),
    __metadata("design:type", typeof AccountShellService === "undefined" ? Object : AccountShellService)
], FileLogsUploader.prototype, "account", void 0);
__decorate([
    inject(PreferencesShellService),
    __metadata("design:type", typeof PreferencesShellService === "undefined" ? Object : PreferencesShellService)
], FileLogsUploader.prototype, "preferences", void 0);
__decorate([
    inject(FileLogUploadFileProvider),
    __metadata("design:type", typeof FileLogUploadFileProvider === "undefined" ? Object : FileLogUploadFileProvider)
], FileLogsUploader.prototype, "uploadFileProvider", void 0);
__decorate([
    inject(LogsContext),
    __metadata("design:type", typeof LogsContext === "undefined" ? Object : LogsContext)
], FileLogsUploader.prototype, "context", void 0);
__decorate([
    inject(CLIENT_NODE_LOGS_CONFIG),
    __metadata("design:type", typeof ClientNodeLogsConfig === "undefined" ? Object : ClientNodeLogsConfig)
], FileLogsUploader.prototype, "config", void 0);
__decorate([
    inject(FileLogUploadRetryDelay),
    __metadata("design:type", typeof FileLogUploadRetryDelay === "undefined" ? Object : FileLogUploadRetryDelay)
], FileLogsUploader.prototype, "retryDelay", void 0);
FileLogsUploader = __decorate([
    injectable()
], FileLogsUploader);
