// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/record/modules/store/index.ts.
// The original TypeScript and import graph are not restored.




















const IDENTIFIER_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;
const DELETION_PREFIX = '.delete-';
const STALE_DELETION_PREFIX = '.delete-stale-';
const MANIFEST_TEMPORARY_FILE_PATTERN = /^manifest\.json\.[^.]+\.[^.]+\.tmp$/;
class RecordStore {
    async openDirectory() {
        const root = await this.tasks.run(async ()=>await this.ensureRoot());
        const error = await external_electron_.shell.openPath(root);
        if (error) {
            throw new Error('The local recording directory could not be opened.');
        }
    }
    async load() {
        return await this.tasks.run(async ()=>{
            this.assertPolicy();
            const rootRealPath = await this.ensureRoot();
            const loaded = [];
            for (const entry of (await this.readDirectory(this.rootPath, this.policy.maximumJobs * 4 + 16, true))){
                try {
                    const value = await this.loadJob(rootRealPath, entry);
                    if (value) {
                        loaded.push(value);
                    }
                } catch  {
                // A corrupt or unsafe job is isolated without weakening the spool root.
                }
            }
            loaded.sort((left, right)=>left.job.startedAtEpochMs - right.job.startedAtEpochMs);
            const jobs = [];
            let bytes = 0;
            let durationMs = 0;
            for (const value of loaded){
                const nextBytes = bytes + value.bytes;
                const nextDurationMs = durationMs + recordJobDurationMs(value.job);
                if (jobs.length >= this.policy.maximumJobs || nextBytes > this.policy.maximumSpoolBytes || nextDurationMs > this.policy.maximumSpoolDurationMs) {
                    continue;
                }
                try {
                    const reconciled = await this.reconcile(rootRealPath, value.job);
                    const reconciledBytes = await this.scanDirectoryBytes(rootRealPath, this.jobPath(reconciled.sessionId), this.maximumJobEntries, true, this.policy.maximumJobBytes);
                    if (reconciledBytes > this.policy.maximumJobBytes || bytes + reconciledBytes > this.policy.maximumSpoolBytes || durationMs + recordJobDurationMs(reconciled) > this.policy.maximumSpoolDurationMs) {
                        continue;
                    }
                    jobs.push(reconciled);
                    bytes += reconciledBytes;
                    durationMs += recordJobDurationMs(reconciled);
                } catch  {
                // Recovery failure remains isolated to this job.
                }
            }
            return jobs;
        });
    }
    async save(job) {
        await this.tasks.run(async ()=>{
            this.assertPolicy();
            this.assertJob(job);
            const rootRealPath = await this.ensureRoot();
            const jobPath = this.jobPath(job.sessionId);
            await this.ensureDurableJobDirectory(rootRealPath, jobPath);
            const source = this.serializeManifest(job);
            await this.assertProjectedManifestQuota(rootRealPath, jobPath, job, Buffer.byteLength(source));
            await this.writeManifest(rootRealPath, jobPath, source);
        });
    }
    async createRunDirectory(sessionId, runId) {
        return await this.tasks.run(async ()=>{
            this.assertPolicy();
            const rootRealPath = await this.ensureRoot();
            await this.assertCurrentSpoolByteQuota(rootRealPath);
            await this.assertJobCapacity(rootRealPath, sessionId);
            const jobPath = this.jobPath(sessionId);
            await this.ensureDurableJobDirectory(rootRealPath, jobPath);
            await this.assertRunCapacity(rootRealPath, jobPath, runId);
            const runPath = this.runPath(sessionId, runId);
            await this.security.ensureRecordDirectory(rootRealPath, runPath);
            return runPath;
        });
    }
    resolveSegmentPath(sessionId, runId, fileName) {
        this.assertSegmentFileName(fileName);
        return (0,external_node_path_namespaceObject.join)(this.runPath(sessionId, runId), fileName);
    }
    async validateSegment(job, event) {
        await this.tasks.run(async ()=>{
            try {
                this.assertPolicy();
                this.assertJob(job);
                this.assertCompletedSegment(event.runId, event);
                const run = job.runs.find((candidate)=>candidate.runId === event.runId);
                if (!run) {
                    throw new Error('The recording segment does not belong to the job.');
                }
                const rootRealPath = await this.ensureRoot();
                await this.readAndValidateSegment(rootRealPath, job.sessionId, run.runId, event);
                await this.assertCurrentByteQuotas(rootRealPath, this.jobPath(job.sessionId));
                const alreadyMerged = run.segments.some((segment)=>segment.sequenceNo === event.sequenceNo);
                if (recordJobDurationMs(job) + (alreadyMerged ? 0 : event.durationMs) > this.policy.maximumJobDurationMs) {
                    throw new RecordStoreValidationError('quotaExceeded', 'The local recording duration quota was exceeded.');
                }
                const segmentCount = job.runs.reduce((total, candidate)=>total + candidate.segments.length, 0);
                if (!alreadyMerged && segmentCount >= this.policy.maximumSegmentsPerJob) {
                    throw new RecordStoreValidationError('quotaExceeded', 'The local recording segment quota was exceeded.');
                }
                await this.assertProjectedSpoolDurationQuota(rootRealPath, job.sessionId, recordJobDurationMs(job) + (alreadyMerged ? 0 : event.durationMs));
            } catch (error) {
                this.throwValidationError(error);
            }
        });
    }
    async readSegmentForUpload(sessionId, runId, segment) {
        return await this.tasks.run(async ()=>{
            try {
                this.assertPolicy();
                this.assertSegment(runId, segment);
                const rootRealPath = await this.ensureRoot();
                const verified = await this.readAndValidateSegment(rootRealPath, sessionId, runId, segment);
                return {
                    bytes: verified.bytes,
                    contentLength: verified.bytes.byteLength,
                    contentSha256: verified.contentSha256
                };
            } catch (error) {
                this.throwValidationError(error);
            }
        });
    }
    async remove(job) {
        await this.tasks.run(async ()=>{
            this.assertPolicy();
            this.assertId(job.sessionId);
            const rootRealPath = await this.ensureRoot();
            const jobPath = this.jobPath(job.sessionId);
            const deletionPath = (0,external_node_path_namespaceObject.join)(this.rootPath, `${DELETION_PREFIX}${(0,external_node_crypto_namespaceObject.randomUUID)()}`);
            try {
                await this.security.validateRecordDirectory(rootRealPath, jobPath);
                await (0,promises_namespaceObject.rename)(jobPath, deletionPath);
                this.jobDirectoriesAwaitingParentSync.delete(jobPath);
                await this.syncDirectory(this.rootPath);
            } catch (error) {
                if (this.security.isFileSystemError(error, 'ENOENT')) {
                    this.jobDirectoriesAwaitingParentSync.delete(jobPath);
                    return;
                }
                throw error;
            }
            try {
                await this.secureDeleteDirectory(rootRealPath, deletionPath, job);
            } catch  {
            // The atomic rename is the durable completion point. Unsafe contents stay quarantined.
            }
        });
    }
    get rootPath() {
        return (0,external_node_path_namespaceObject.join)((0,external_node_path_namespaceObject.dirname)(this.preferences.settingsPath), RECORD_STATE_DIRECTORY_NAME);
    }
    jobPath(sessionId) {
        this.assertId(sessionId);
        return (0,external_node_path_namespaceObject.join)(this.rootPath, sessionId);
    }
    runPath(sessionId, runId) {
        this.assertId(runId);
        return (0,external_node_path_namespaceObject.join)(this.jobPath(sessionId), runId);
    }
    assertId(value) {
        if (!IDENTIFIER_PATTERN.test(value)) {
            throw new Error('The recording storage identifier is invalid.');
        }
    }
    assertPolicy() {
        const values = [
            this.policy.maximumManifestBytes,
            this.policy.maximumSegmentBytes,
            this.policy.maximumJobBytes,
            this.policy.maximumSpoolBytes,
            this.policy.maximumJobDurationMs,
            this.policy.maximumSpoolDurationMs,
            this.policy.maximumJobs,
            this.policy.maximumRunsPerJob,
            this.policy.maximumSegmentsPerJob,
            this.policy.jobRetentionMs,
            this.policy.staleArtifactRetentionMs
        ];
        if (values.some((value)=>!Number.isSafeInteger(value) || value <= 0)) {
            throw new Error('The recording store policy is invalid.');
        }
    }
    assertJob(job) {
        this.assertId(job.sessionId);
        if (job.preserveAudio !== undefined && typeof job.preserveAudio !== 'boolean') {
            throw new Error('The recording audio retention metadata is invalid.');
        }
        if (job.schemaVersion === 2 && !parseRecordJob(job)) {
            throw new Error('The recording capture manifest is invalid.');
        }
        if (job.terminalFailure && (!Object.values(base_InterfaceErrorCode).some((candidate)=>candidate === job.terminalFailure?.code) || typeof job.terminalFailure.message !== 'string' || job.terminalFailure.message.length === 0 || job.terminalFailure.message.trim() !== job.terminalFailure.message || job.terminalFailure.retryable !== false)) {
            throw new Error('The recording terminal failure metadata is invalid.');
        }
        if (!Number.isFinite(job.startedAtEpochMs) || job.startedAtEpochMs < 0 || !Number.isFinite(job.targetSegmentDurationMs) || job.targetSegmentDurationMs <= 0 || job.runs.length > this.policy.maximumRunsPerJob || recordJobDurationMs(job) > this.policy.maximumJobDurationMs) {
            throw new Error('The recording job exceeds its quota.');
        }
        let segmentCount = 0;
        for (const run of job.runs){
            this.assertId(run.runId);
            if (!Number.isFinite(run.startedAtEpochMs) || run.startedAtEpochMs < 0 || !Number.isFinite(run.deviceMonotonicStartMs) || run.deviceMonotonicStartMs < 0 || run.endedAtEpochMs !== undefined && (!Number.isFinite(run.endedAtEpochMs) || run.endedAtEpochMs < 0) || run.deviceMonotonicEndMs !== undefined && (!Number.isFinite(run.deviceMonotonicEndMs) || run.deviceMonotonicEndMs < 0)) {
                throw new Error('The recording run timing metadata is invalid.');
            }
            if (run.remoteCancellationResolved !== undefined && (run.remoteCancellationResolved !== true || !run.remote)) {
                throw new Error('The recording remote cancellation metadata is invalid.');
            }
            if (run.remoteCreationAttempted !== undefined && (run.remoteCreationAttempted !== true || run.segments.length === 0)) {
                throw new Error('The recording remote creation metadata is invalid.');
            }
            if (run.remoteCreationResolvedAbsent !== undefined && (run.remoteCreationResolvedAbsent !== true || run.remoteCreationAttempted !== true || run.remote !== undefined)) {
                throw new Error('The recording remote creation resolution is invalid.');
            }
            for (const segment of run.segments){
                this.assertSegment(run.runId, segment);
                segmentCount += 1;
            }
        }
        if (segmentCount > this.policy.maximumSegmentsPerJob) {
            throw new Error('The recording job exceeds its segment quota.');
        }
    }
    assertSegment(runId, segment) {
        this.assertCompletedSegment(runId, segment);
        if (!Number.isSafeInteger(segment.uploadGeneration) || segment.uploadGeneration < 0 || !Number.isSafeInteger(segment.integrityFailureCount) || segment.integrityFailureCount < 0) {
            throw new Error('The recording segment metadata is invalid.');
        }
    }
    assertCompletedSegment(runId, segment) {
        this.assertSegmentFileName(segment.fileName);
        if (segment.runId !== runId || segment.contentType !== 'audio/flac' || !Number.isSafeInteger(segment.sequenceNo) || segment.sequenceNo < 0 || !Number.isSafeInteger(segment.contentLength) || segment.contentLength <= 0 || segment.contentLength > this.policy.maximumSegmentBytes || !Number.isFinite(segment.capturedAtEpochMs) || segment.capturedAtEpochMs < 0 || !Number.isFinite(segment.deviceMonotonicStartMs) || segment.deviceMonotonicStartMs < 0 || !Number.isFinite(segment.durationMs) || segment.durationMs <= 0 || !/^[a-f0-9]{64}$/.test(segment.contentSha256)) {
            throw new Error('The recording segment metadata is invalid.');
        }
    }
    assertSegmentFileName(fileName) {
        this.security.assertSafeBaseName(fileName);
        if (!isSafeRecordSegmentFileName(fileName)) {
            throw new Error('The recording segment file name is invalid.');
        }
    }
    async loadJob(rootRealPath, entry) {
        this.security.assertSafeBaseName(entry.name);
        const path = (0,external_node_path_namespaceObject.join)(this.rootPath, entry.name);
        const stats = await (0,promises_namespaceObject.lstat)(path);
        if (entry.name.startsWith(DELETION_PREFIX)) {
            if (!stats.isSymbolicLink() && stats.isDirectory()) {
                try {
                    await this.cleanupTombstone(rootRealPath, path);
                } catch  {
                // Tombstones are never recovered. Unsafe contents remain quarantined.
                }
            }
            return undefined;
        }
        if (stats.isSymbolicLink() || !stats.isDirectory()) {
            return undefined;
        }
        this.security.assertOwned(stats);
        await this.security.validateRecordDirectory(rootRealPath, path);
        let stored;
        try {
            stored = await this.readManifest(rootRealPath, path);
        } catch  {
            if (this.isExpired(stats.mtimeMs, this.policy.staleArtifactRetentionMs)) {
                await this.quarantineAndCleanup(rootRealPath, path);
            }
            return undefined;
        }
        const job = stored.job;
        if (!job || job.sessionId !== entry.name) {
            if (this.isExpired(stored.stats?.mtimeMs ?? stats.mtimeMs, this.policy.staleArtifactRetentionMs)) {
                await this.quarantineAndCleanup(rootRealPath, path);
            }
            return undefined;
        }
        this.assertJob(job);
        if (job.dismissed && !job.preserveAudio && (job.capture ? job.capture.sealed === true || job.capture.remoteCancellationResolved === true : job.runs.every((run)=>run.sealed === true || run.remoteCancellationResolved === true)) && this.isExpired(stored.stats?.mtimeMs ?? job.startedAtEpochMs, this.policy.jobRetentionMs)) {
            await this.quarantineAndCleanup(rootRealPath, path, job);
            return undefined;
        }
        const bytes = await this.scanDirectoryBytes(rootRealPath, path, this.maximumJobEntries, true, this.policy.maximumJobBytes);
        if (bytes > this.policy.maximumJobBytes) {
            throw new Error('The recording job exceeds its byte quota.');
        }
        return {
            bytes,
            job
        };
    }
    async readManifest(rootRealPath, jobPath) {
        try {
            const verified = await this.security.readVerifiedRecordFile(rootRealPath, (0,external_node_path_namespaceObject.join)(jobPath, RECORD_MANIFEST_FILE_NAME), this.policy.maximumManifestBytes);
            try {
                return {
                    job: parseRecordJob(JSON.parse(verified.bytes.toString('utf8'))),
                    stats: verified.stats
                };
            } catch (error) {
                if (error instanceof SyntaxError) {
                    return {
                        stats: verified.stats
                    };
                }
                throw error;
            }
        } catch (error) {
            if (this.security.isFileSystemError(error, 'ENOENT')) {
                return {};
            }
            throw error;
        }
    }
    async reconcile(rootRealPath, job) {
        let reconciled = job;
        const budget = {
            entries: 0,
            segments: job.runs.reduce((total, run)=>total + run.segments.length, 0)
        };
        for (const run of job.runs){
            reconciled = await this.reconcileRun(rootRealPath, reconciled, run, budget);
            this.assertJob(reconciled);
        }
        if (reconciled !== job) {
            const source = this.serializeManifest(reconciled);
            const jobPath = this.jobPath(job.sessionId);
            await this.assertProjectedManifestQuota(rootRealPath, jobPath, reconciled, Buffer.byteLength(source));
            await this.writeManifest(rootRealPath, jobPath, source);
        }
        return reconciled;
    }
    async reconcileRun(rootRealPath, job, run, budget) {
        const path = this.runPath(job.sessionId, run.runId);
        let entries;
        try {
            await this.security.validateRecordDirectory(rootRealPath, path);
            entries = await this.readDirectory(path, this.policy.maximumSegmentsPerJob * 2 + 8);
        } catch (error) {
            if (this.security.isFileSystemError(error, 'ENOENT') && run.segments.length === 0) {
                return job;
            }
            throw error;
        }
        let reconciled = job;
        const persisted = new Map(run.segments.map((segment)=>[
                segment.fileName,
                segment
            ]));
        const found = new Set();
        for (const entry of entries){
            budget.entries += 1;
            if (budget.entries > this.maximumJobEntries) {
                throw new Error('The recording job exceeds its entry quota.');
            }
            this.security.assertSafeBaseName(entry.name);
            const filePath = (0,external_node_path_namespaceObject.join)(path, entry.name);
            const stats = await (0,promises_namespaceObject.lstat)(filePath);
            if (stats.isSymbolicLink()) {
                throw new Error('The recording run contains a symbolic link.');
            }
            if (this.isPartialFile(entry.name)) {
                const verified = await this.security.readVerifiedRecordFile(rootRealPath, filePath, this.policy.maximumSegmentBytes);
                if (this.isExpired(verified.stats.mtimeMs, this.policy.staleArtifactRetentionMs)) {
                    await (0,promises_namespaceObject.unlink)(filePath);
                }
                continue;
            }
            this.assertSegmentFileName(entry.name);
            const verified = await this.security.readVerifiedRecordFile(rootRealPath, filePath, this.policy.maximumSegmentBytes);
            const segment = persisted.get(entry.name);
            if (segment) {
                found.add(entry.name);
                this.assertIntegrity(verified, segment);
                continue;
            }
            if (budget.segments >= this.policy.maximumSegmentsPerJob) {
                throw new Error('The recording job exceeds its segment quota.');
            }
            const event = recoveredRecordSegment(run, entry.name, verified.stats, verified.contentSha256, verified.bytes);
            if (!event) {
                throw new Error('The recording run contains an invalid segment.');
            }
            reconciled = mergeRecordSegment(reconciled, event, external_node_crypto_namespaceObject.randomUUID);
            budget.segments += 1;
        }
        if (run.segments.some((segment)=>!found.has(segment.fileName))) {
            throw new Error('A persisted recording segment is missing.');
        }
        return reconciled;
    }
    serializeManifest(job) {
        const source = `${JSON.stringify(job, null, 2)}\n`;
        if (Buffer.byteLength(source) > this.policy.maximumManifestBytes) {
            throw new Error('The recording manifest exceeds its byte quota.');
        }
        return source;
    }
    async writeManifest(rootRealPath, jobPath, source) {
        await this.security.validateRecordDirectory(rootRealPath, jobPath);
        const path = (0,external_node_path_namespaceObject.join)(jobPath, RECORD_MANIFEST_FILE_NAME);
        const temporaryPath = `${path}.${process.pid}.${(0,external_node_crypto_namespaceObject.randomUUID)()}.tmp`;
        let handle;
        try {
            handle = await (0,promises_namespaceObject.open)(temporaryPath, 'wx', (/* inlined export .RECORD_FILE_MODE */384));
            await handle.writeFile(source, 'utf8');
            await handle.sync();
            if (process.platform !== 'win32') {
                await handle.chmod((/* inlined export .RECORD_FILE_MODE */384));
            }
            await handle.close();
            handle = undefined;
            try {
                await this.security.readVerifiedRecordFile(rootRealPath, path, this.policy.maximumManifestBytes);
            } catch (error) {
                if (!this.security.isFileSystemError(error, 'ENOENT')) {
                    throw error;
                }
            }
            await (0,promises_namespaceObject.rename)(temporaryPath, path);
            await this.security.readVerifiedRecordFile(rootRealPath, path, this.policy.maximumManifestBytes);
            await this.security.validateRecordDirectory(rootRealPath, jobPath);
            await this.syncDirectory(jobPath);
        } catch (error) {
            if (handle) {
                await handle.close();
            }
            await (0,promises_namespaceObject.rm)(temporaryPath, {
                force: true
            });
            throw error;
        }
    }
    async readAndValidateSegment(rootRealPath, sessionId, runId, segment) {
        await this.security.validateRecordDirectory(rootRealPath, this.jobPath(sessionId));
        await this.security.validateRecordDirectory(rootRealPath, this.runPath(sessionId, runId));
        const verified = await this.security.readVerifiedRecordFile(rootRealPath, this.resolveSegmentPath(sessionId, runId, segment.fileName), this.policy.maximumSegmentBytes);
        this.assertIntegrity(verified, segment);
        return verified;
    }
    assertIntegrity(verified, segment) {
        if (verified.bytes.byteLength !== segment.contentLength || verified.contentSha256 !== segment.contentSha256) {
            throw new Error('The recording segment does not match its metadata.');
        }
    }
    async assertProjectedManifestQuota(rootRealPath, jobPath, job, manifestBytes) {
        const existingManifestBytes = await this.readCurrentManifestBytes(rootRealPath, jobPath);
        const currentJobBytes = await this.scanDirectoryBytes(rootRealPath, jobPath, this.maximumJobEntries, true);
        const currentSpoolBytes = await this.scanDirectoryBytes(rootRealPath, this.rootPath, this.maximumSpoolEntries, false);
        const projectedJobBytes = currentJobBytes - existingManifestBytes + manifestBytes;
        const projectedSpoolBytes = currentSpoolBytes - existingManifestBytes + manifestBytes;
        if (projectedJobBytes > this.policy.maximumJobBytes || projectedSpoolBytes > this.policy.maximumSpoolBytes) {
            this.throwByteQuotaError();
        }
        await this.assertProjectedSpoolDurationQuota(rootRealPath, job.sessionId, recordJobDurationMs(job));
    }
    async assertCurrentByteQuotas(rootRealPath, jobPath) {
        const jobBytes = await this.scanDirectoryBytes(rootRealPath, jobPath, this.maximumJobEntries, true);
        const spoolBytes = await this.scanDirectoryBytes(rootRealPath, this.rootPath, this.maximumSpoolEntries, false);
        if (jobBytes > this.policy.maximumJobBytes || spoolBytes > this.policy.maximumSpoolBytes) {
            this.throwByteQuotaError();
        }
    }
    async assertCurrentSpoolByteQuota(rootRealPath) {
        const bytes = await this.scanDirectoryBytes(rootRealPath, this.rootPath, this.maximumSpoolEntries, false);
        if (bytes > this.policy.maximumSpoolBytes) {
            this.throwByteQuotaError();
        }
    }
    throwByteQuotaError() {
        throw new RecordStoreValidationError('quotaExceeded', 'The local recording byte quota was exceeded.');
    }
    async assertProjectedSpoolDurationQuota(rootRealPath, sessionId, projectedJobDurationMs) {
        const durations = new Map();
        for (const job of (await this.readStoredJobs(rootRealPath))){
            durations.set(job.sessionId, recordJobDurationMs(job));
        }
        durations.set(sessionId, projectedJobDurationMs);
        const spoolDurationMs = [
            ...durations.values()
        ].reduce((total, durationMs)=>total + durationMs, 0);
        if (durations.size > this.policy.maximumJobs || spoolDurationMs > this.policy.maximumSpoolDurationMs) {
            throw new RecordStoreValidationError('quotaExceeded', 'The local recording duration quota was exceeded.');
        }
    }
    async readStoredJobs(rootRealPath) {
        const jobs = [];
        for (const entry of (await this.readDirectory(this.rootPath, this.maximumRootEntries))){
            if (entry.name.startsWith(DELETION_PREFIX)) {
                continue;
            }
            try {
                this.security.assertSafeBaseName(entry.name);
                const path = (0,external_node_path_namespaceObject.join)(this.rootPath, entry.name);
                const stats = await (0,promises_namespaceObject.lstat)(path);
                if (stats.isSymbolicLink() || !stats.isDirectory()) {
                    continue;
                }
                this.security.assertOwned(stats);
                await this.security.validateRecordDirectory(rootRealPath, path);
                const stored = await this.readManifest(rootRealPath, path);
                if (stored.job?.sessionId === entry.name) {
                    this.assertJob(stored.job);
                    jobs.push(stored.job);
                }
            } catch  {
            // One corrupt job does not prevent accounting for independent valid jobs.
            }
        }
        return jobs;
    }
    async readCurrentManifestBytes(rootRealPath, jobPath) {
        try {
            return (await this.security.readVerifiedRecordFile(rootRealPath, (0,external_node_path_namespaceObject.join)(jobPath, RECORD_MANIFEST_FILE_NAME), this.policy.maximumManifestBytes)).bytes.byteLength;
        } catch (error) {
            if (this.security.isFileSystemError(error, 'ENOENT')) {
                return 0;
            }
            throw error;
        }
    }
    async assertJobCapacity(rootRealPath, sessionId) {
        const jobs = await this.readStoredJobs(rootRealPath);
        const existing = jobs.some((job)=>job.sessionId === sessionId);
        if (!existing && jobs.length >= this.policy.maximumJobs) {
            throw new RecordStoreValidationError('quotaExceeded', 'The local recording job quota was exceeded.');
        }
        try {
            await this.security.validateRecordDirectory(rootRealPath, this.jobPath(sessionId));
        } catch (error) {
            if (!this.security.isFileSystemError(error, 'ENOENT')) {
                throw error;
            }
        }
    }
    async assertRunCapacity(rootRealPath, jobPath, runId) {
        let existing = false;
        let runs = 0;
        for (const entry of (await this.readDirectory(jobPath, this.maximumJobEntries))){
            this.security.assertSafeBaseName(entry.name);
            const path = (0,external_node_path_namespaceObject.join)(jobPath, entry.name);
            const stats = await (0,promises_namespaceObject.lstat)(path);
            if (stats.isSymbolicLink() || !stats.isDirectory()) {
                continue;
            }
            runs += 1;
            existing ||= entry.name === runId;
        }
        if (!existing && runs >= this.policy.maximumRunsPerJob) {
            throw new RecordStoreValidationError('quotaExceeded', 'The local recording run quota was exceeded.');
        }
        if (existing) {
            await this.security.validateRecordDirectory(rootRealPath, (0,external_node_path_namespaceObject.join)(jobPath, runId));
        }
    }
    async scanDirectoryBytes(rootRealPath, directoryPath, maximumEntries, strict, maximumBytes = Number.MAX_SAFE_INTEGER) {
        await this.security.validateRecordDirectory(rootRealPath, directoryPath);
        const pending = [
            directoryPath
        ];
        let bytes = 0;
        let entriesSeen = 0;
        while(pending.length > 0){
            const currentPath = pending.pop();
            if (!currentPath) {
                break;
            }
            for (const entry of (await this.readDirectory(currentPath, maximumEntries))){
                entriesSeen += 1;
                if (entriesSeen > maximumEntries) {
                    throw new Error('The recording spool exceeds its entry quota.');
                }
                try {
                    this.security.assertSafeBaseName(entry.name);
                    const path = (0,external_node_path_namespaceObject.join)(currentPath, entry.name);
                    const stats = await (0,promises_namespaceObject.lstat)(path);
                    if (stats.isSymbolicLink()) {
                        if (strict) {
                            throw new Error('The recording spool contains a symbolic link.');
                        }
                        continue;
                    }
                    if (stats.isDirectory()) {
                        this.security.assertOwned(stats);
                        this.security.assertPathContained(rootRealPath, await (0,promises_namespaceObject.realpath)(path));
                        pending.push(path);
                        continue;
                    }
                    if (!stats.isFile()) {
                        throw new Error('The recording spool entry must be a regular file.');
                    }
                    this.security.assertOwned(stats);
                    if (process.platform !== 'win32' && stats.nlink !== 1) {
                        throw new Error('The recording spool file must not have additional hard links.');
                    }
                    this.security.assertPathContained(rootRealPath, await (0,promises_namespaceObject.realpath)(path));
                    if (!Number.isSafeInteger(stats.size) || stats.size < 0) {
                        throw new Error('The recording spool file size is invalid.');
                    }
                    bytes += stats.size;
                    if (!Number.isSafeInteger(bytes)) {
                        throw new Error('The recording spool byte count is invalid.');
                    }
                    if (bytes > maximumBytes) {
                        return bytes;
                    }
                } catch (error) {
                    if (strict) {
                        throw error;
                    }
                }
            }
        }
        return bytes;
    }
    async readDirectory(path, maximumEntries, truncate = false) {
        try {
            const directory = await (0,promises_namespaceObject.opendir)(path);
            const entries = [];
            for await (const entry of directory){
                if (entries.length >= maximumEntries) {
                    if (truncate) {
                        break;
                    }
                    throw new Error('The recording spool exceeds its entry quota.');
                }
                entries.push(entry);
            }
            return entries;
        } catch (error) {
            if (this.security.isFileSystemError(error, 'ENOENT')) {
                return [];
            }
            throw error;
        }
    }
    async quarantineAndCleanup(rootRealPath, path, expectedJob) {
        await this.security.validateRecordDirectory(rootRealPath, path);
        const prefix = expectedJob ? DELETION_PREFIX : STALE_DELETION_PREFIX;
        const deletionPath = (0,external_node_path_namespaceObject.join)(this.rootPath, `${prefix}${(0,external_node_crypto_namespaceObject.randomUUID)()}`);
        await (0,promises_namespaceObject.rename)(path, deletionPath);
        await this.syncDirectory(this.rootPath);
        try {
            await this.secureDeleteDirectory(rootRealPath, deletionPath, expectedJob, !expectedJob);
        } catch  {
        // Quarantine remains durable when secure cleanup cannot prove every entry safe.
        }
    }
    async cleanupTombstone(rootRealPath, path) {
        await this.security.validateRecordDirectory(rootRealPath, path);
        let expectedJob;
        try {
            const stored = await this.readManifest(rootRealPath, path);
            if (stored.job) {
                this.assertJob(stored.job);
                expectedJob = stored.job;
            }
        } catch  {
        // The secure traversal below will retain any tombstone it cannot verify.
        }
        const staleArtifact = (0,external_node_path_namespaceObject.basename)(path).startsWith(STALE_DELETION_PREFIX);
        if (!expectedJob && !staleArtifact) {
            throw new Error('The recording deletion tombstone has no valid manifest.');
        }
        await this.secureDeleteDirectory(rootRealPath, path, expectedJob, staleArtifact);
    }
    async secureDeleteDirectory(rootRealPath, path, expectedJob, allowManifestless = false) {
        if ((0,external_node_path_namespaceObject.dirname)(path) !== this.rootPath) {
            throw new Error('The recording cleanup target is invalid.');
        }
        this.security.assertSafeBaseName((0,external_node_path_namespaceObject.basename)(path));
        const initialStats = await (0,promises_namespaceObject.lstat)(path);
        if (initialStats.isSymbolicLink() || !initialStats.isDirectory()) {
            throw new Error('The recording cleanup target must be a real directory.');
        }
        this.security.assertOwned(initialStats);
        await this.security.validateRecordDirectory(rootRealPath, path);
        if (await this.scanDirectoryBytes(rootRealPath, path, this.maximumJobEntries, true, this.policy.maximumJobBytes) > this.policy.maximumJobBytes) {
            throw new Error('The recording cleanup target exceeds its byte quota.');
        }
        if (expectedJob) {
            this.assertJob(expectedJob);
        }
        const expectedSegments = this.recordSegmentMap(expectedJob);
        const foundSegments = new Set();
        const cleanupDirectories = [];
        const cleanupFiles = [];
        const jobEntries = await this.readDirectory(path, this.maximumJobEntries);
        let manifestJob;
        let manifestFound = false;
        let runCount = 0;
        let entriesSeen = 0;
        for (const entry of jobEntries){
            entriesSeen += 1;
            this.security.assertSafeBaseName(entry.name);
            const entryPath = (0,external_node_path_namespaceObject.join)(path, entry.name);
            const stats = await (0,promises_namespaceObject.lstat)(entryPath);
            if (stats.isSymbolicLink()) {
                throw new Error('The recording cleanup target contains a symbolic link.');
            }
            if (stats.isDirectory()) {
                this.assertId(entry.name);
                runCount += 1;
                if (runCount > this.policy.maximumRunsPerJob) {
                    throw new Error('The recording cleanup target exceeds its run quota.');
                }
                await this.security.validateRecordDirectory(rootRealPath, entryPath);
                cleanupDirectories.push({
                    path: entryPath,
                    stats
                });
                for (const file of (await this.readDirectory(entryPath, this.policy.maximumSegmentsPerJob * 2 + 8))){
                    entriesSeen += 1;
                    if (entriesSeen > this.maximumJobEntries) {
                        throw new Error('The recording cleanup target exceeds its entry quota.');
                    }
                    this.security.assertSafeBaseName(file.name);
                    const filePath = (0,external_node_path_namespaceObject.join)(entryPath, file.name);
                    const fileStats = await (0,promises_namespaceObject.lstat)(filePath);
                    if (fileStats.isSymbolicLink() || !fileStats.isFile()) {
                        throw new Error('The recording cleanup target contains an unsafe entry.');
                    }
                    if (this.isPartialFile(file.name)) {
                        const verified = await this.security.readVerifiedRecordFile(rootRealPath, filePath, this.policy.maximumSegmentBytes);
                        cleanupFiles.push({
                            contentSha256: verified.contentSha256,
                            maximumBytes: this.policy.maximumSegmentBytes,
                            path: filePath,
                            stats: verified.stats
                        });
                        continue;
                    }
                    this.assertSegmentFileName(file.name);
                    const key = this.segmentKey(entry.name, file.name);
                    const expected = expectedSegments.get(key);
                    if (!expected && !allowManifestless) {
                        throw new Error('The recording cleanup target contains an unknown segment.');
                    }
                    const verified = await this.security.readVerifiedRecordFile(rootRealPath, filePath, this.policy.maximumSegmentBytes);
                    if (expected) {
                        this.assertIntegrity(verified, expected);
                        foundSegments.add(key);
                    }
                    cleanupFiles.push({
                        contentSha256: verified.contentSha256,
                        maximumBytes: this.policy.maximumSegmentBytes,
                        path: filePath,
                        stats: verified.stats
                    });
                }
                continue;
            }
            if (!stats.isFile()) {
                throw new Error('The recording cleanup target contains an unsafe entry.');
            }
            if (entry.name === RECORD_MANIFEST_FILE_NAME) {
                const verified = await this.security.readVerifiedRecordFile(rootRealPath, entryPath, this.policy.maximumManifestBytes);
                manifestFound = true;
                try {
                    manifestJob = parseRecordJob(JSON.parse(verified.bytes.toString('utf8')));
                } catch (error) {
                    if (!(error instanceof SyntaxError)) {
                        throw error;
                    }
                }
                cleanupFiles.push({
                    contentSha256: verified.contentSha256,
                    maximumBytes: this.policy.maximumManifestBytes,
                    path: entryPath,
                    stats: verified.stats
                });
                continue;
            }
            if (MANIFEST_TEMPORARY_FILE_PATTERN.test(entry.name)) {
                const verified = await this.security.readVerifiedRecordFile(rootRealPath, entryPath, this.policy.maximumManifestBytes);
                cleanupFiles.push({
                    contentSha256: verified.contentSha256,
                    maximumBytes: this.policy.maximumManifestBytes,
                    path: entryPath,
                    stats: verified.stats
                });
                continue;
            }
            throw new Error('The recording cleanup target contains an unknown entry.');
        }
        if (expectedJob) {
            if (!manifestFound || !manifestJob) {
                throw new Error('The recording cleanup manifest is missing or invalid.');
            }
            this.assertCleanupManifest(expectedJob, manifestJob);
            if ([
                ...expectedSegments.keys()
            ].some((key)=>!foundSegments.has(key))) {
                throw new Error('The recording cleanup target is missing a persisted segment.');
            }
        } else if (!allowManifestless) {
            throw new Error('The recording cleanup manifest is missing or invalid.');
        }
        for (const file of cleanupFiles){
            await this.unlinkVerifiedFile(rootRealPath, file);
        }
        for (const directory of cleanupDirectories.reverse()){
            await this.removeVerifiedDirectory(rootRealPath, directory);
        }
        const finalStats = await (0,promises_namespaceObject.lstat)(path);
        if (finalStats.isSymbolicLink() || !finalStats.isDirectory() || finalStats.dev !== initialStats.dev || finalStats.ino !== initialStats.ino) {
            throw new Error('The recording cleanup target changed during validation.');
        }
        this.security.assertOwned(finalStats);
        await this.security.validateRecordDirectory(rootRealPath, path);
        await (0,promises_namespaceObject.rmdir)(path);
        await this.syncDirectory(this.rootPath);
    }
    async unlinkVerifiedFile(rootRealPath, file) {
        const verified = await this.security.readVerifiedRecordFile(rootRealPath, file.path, file.maximumBytes);
        const pathStats = await (0,promises_namespaceObject.lstat)(file.path);
        if (verified.stats.dev !== file.stats.dev || verified.stats.ino !== file.stats.ino || verified.contentSha256 !== file.contentSha256 || pathStats.isSymbolicLink() || !pathStats.isFile() || pathStats.dev !== verified.stats.dev || pathStats.ino !== verified.stats.ino || process.platform !== 'win32' && pathStats.nlink !== 1) {
            throw new Error('The recording cleanup file changed during validation.');
        }
        this.security.assertOwned(pathStats);
        this.security.assertPathContained(rootRealPath, await (0,promises_namespaceObject.realpath)(file.path));
        await (0,promises_namespaceObject.unlink)(file.path);
    }
    async removeVerifiedDirectory(rootRealPath, directory) {
        const stats = await (0,promises_namespaceObject.lstat)(directory.path);
        if (stats.isSymbolicLink() || !stats.isDirectory() || stats.dev !== directory.stats.dev || stats.ino !== directory.stats.ino) {
            throw new Error('The recording cleanup directory changed during validation.');
        }
        this.security.assertOwned(stats);
        await this.security.validateRecordDirectory(rootRealPath, directory.path);
        await (0,promises_namespaceObject.rmdir)(directory.path);
    }
    async ensureRoot() {
        const root = await this.security.ensureRecordRoot(this.rootPath);
        this.rootDirectoryAwaitingParentSync ||= root.created;
        if (this.rootDirectoryAwaitingParentSync) {
            await this.syncDirectory((0,external_node_path_namespaceObject.dirname)(root.realPath));
            this.rootDirectoryAwaitingParentSync = false;
        }
        return root.realPath;
    }
    async ensureDurableJobDirectory(rootRealPath, jobPath) {
        const jobDirectory = await this.security.ensureRecordDirectory(rootRealPath, jobPath);
        if (jobDirectory.created) {
            this.jobDirectoriesAwaitingParentSync.add(jobPath);
        }
        if (this.jobDirectoriesAwaitingParentSync.has(jobPath)) {
            await this.syncDirectory(rootRealPath);
            this.jobDirectoriesAwaitingParentSync.delete(jobPath);
        }
    }
    async syncDirectory(path) {
        if (process.platform === 'win32') {
            return;
        }
        const handle = await (0,promises_namespaceObject.open)(path, external_node_fs_namespaceObject.constants.O_RDONLY);
        try {
            await handle.sync();
        } finally{
            await handle.close();
        }
    }
    recordSegmentMap(job) {
        const segments = new Map();
        for (const run of job?.runs ?? []){
            for (const segment of run.segments){
                segments.set(this.segmentKey(run.runId, segment.fileName), segment);
            }
        }
        return segments;
    }
    assertCleanupManifest(expected, actual) {
        if (expected.sessionId !== actual.sessionId) {
            throw new Error('The recording cleanup manifest does not match its job.');
        }
        const expectedSegments = this.recordSegmentMap(expected);
        const actualSegments = this.recordSegmentMap(actual);
        if (expectedSegments.size !== actualSegments.size) {
            throw new Error('The recording cleanup manifest changed unexpectedly.');
        }
        for (const [key, segment] of expectedSegments){
            const actualSegment = actualSegments.get(key);
            if (!actualSegment || actualSegment.contentLength !== segment.contentLength || actualSegment.contentSha256 !== segment.contentSha256) {
                throw new Error('The recording cleanup manifest changed unexpectedly.');
            }
        }
    }
    segmentKey(runId, fileName) {
        return `${runId}/${fileName}`;
    }
    isExpired(mtimeMs, retentionMs) {
        return mtimeMs <= Date.now() - retentionMs;
    }
    get maximumRootEntries() {
        return this.policy.maximumJobs * 4 + 16;
    }
    get maximumJobEntries() {
        return this.policy.maximumRunsPerJob + this.policy.maximumSegmentsPerJob * 2 + 8;
    }
    get maximumSpoolEntries() {
        return this.maximumRootEntries + this.policy.maximumJobs * this.maximumJobEntries;
    }
    isPartialFile(fileName) {
        const finalName = fileName.endsWith('.partial') ? fileName.slice(0, -'.partial'.length) : '';
        return finalName.length > 0 && isSafeRecordSegmentFileName(finalName);
    }
    throwValidationError(error) {
        if (error instanceof RecordStoreValidationError) {
            throw error;
        }
        throw new RecordStoreValidationError('invalidSegment', 'The local recording segment failed validation.', {
            cause: error
        });
    }
    constructor(){
        this.jobDirectoriesAwaitingParentSync = new Set();
        this.rootDirectoryAwaitingParentSync = false;
    }
}
__decorate([
    inject(PreferencesShellService),
    __metadata("design:type", typeof PreferencesShellService === "undefined" ? Object : PreferencesShellService)
], RecordStore.prototype, "preferences", void 0);
__decorate([
    inject(SerialTask),
    __metadata("design:type", typeof SerialTask === "undefined" ? Object : SerialTask)
], RecordStore.prototype, "tasks", void 0);
__decorate([
    inject(RecordStorePolicy),
    __metadata("design:type", typeof RecordStorePolicy === "undefined" ? Object : RecordStorePolicy)
], RecordStore.prototype, "policy", void 0);
__decorate([
    inject(RecordStoreSecurity),
    __metadata("design:type", typeof RecordStoreSecurity === "undefined" ? Object : RecordStoreSecurity)
], RecordStore.prototype, "security", void 0);
RecordStore = __decorate([
    injectable()
], RecordStore);
