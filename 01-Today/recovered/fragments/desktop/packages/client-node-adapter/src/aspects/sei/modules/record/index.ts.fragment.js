// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/record/index.ts.
// The original TypeScript and import graph are not restored.






















class RecordShellService extends readonly_events_ReadonlyEvents {
    async initialize() {
        if (this.initialized || !this.supported) {
            this.initialized = true;
            return;
        }
        this.initialized = true;
        this.subscriptions.push(await this.cpi.audio.subscribe('segmentCompleted', async (event)=>{
            this.pendingSegmentEvents.add(event);
            await this.actions.run(async ()=>{
                if (!this.pendingSegmentEvents.delete(event)) {
                    return;
                }
                await this.acceptSegmentEvent(event);
            });
        }), await this.cpi.audio.subscribe('levelChanged', (event)=>{
            this.acceptLevel(event);
        }), await this.cpi.audio.subscribe('healthChanged', async (event)=>{
            await this.acceptHealth(event);
        }), await this.cpi.audio.subscribe('captureFailed', async (event)=>{
            if (this.activeRunClock?.runId !== event.runId && this.pendingStart?.runId !== event.runId) {
                return;
            }
            await this.actions.run(async ()=>await this.acceptAudioCaptureFailure(event));
        }), await this.cpi.audio.subscribe('stateChanged', async (event)=>{
            await this.actions.run(async ()=>await this.acceptAudioStateEvent(event));
        }), await this.account.subscribe('beforeSignOut', async ()=>{
            await this.stopForAccountTransition();
        }), await this.account.subscribe('beforeSwitch', async ()=>{
            await this.stopForAccountTransition();
        }), await this.account.subscribe('afterSignIn', async ()=>{
            await this.refreshAccountPresentation();
        }), await this.account.subscribe('afterSwitch', async ()=>{
            await this.refreshAccountPresentation();
        }), await this.account.subscribe('afterSignOut', async ()=>{
            await this.refreshAccountPresentation();
        }), await this.account.subscribe('changed', async ()=>{
            await this.refreshAccountPresentation();
        }), await this.socket.subscribeRegisteredDeviceAvailable(()=>{
            this.synchronizePendingJobs(true);
        }));
        const storedJobs = await this.store.load();
        for (const storedJob of storedJobs){
            const job = await this.recover(storedJob);
            this.jobs.set(job.sessionId, job);
        }
        this.presentCurrentAccountJob();
        this.recoveryMonitor.start(()=>this.monitorUploadRecovery());
        await this.monitorUploadRecovery();
        this.synchronizePendingJobs();
    }
    async dispose() {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        this.recoveryMonitor.stop();
        this.cancelPendingStarts();
        this.liveState.stop();
        for (const controller of this.uploadControllers.values()){
            controller.abort();
        }
        await this.actions.run(async ()=>{
            await this.finishLocalCapture('deviceShutdown');
        });
        this.clearCaptureRecovery();
        for (const timer of this.retryTimers.values()){
            clearTimeout(timer);
        }
        this.retryTimers.clear();
        this.uploadRetryAttempts.clear();
        await Promise.all(this.subscriptions.map(async (subscription)=>subscription.unsubscribe()));
        this.subscriptions.length = 0;
    }
    async getState() {
        return this.state;
    }
    async listScheduledOffers() {
        this.assertSupported();
        return await this.scheduledOffers.list();
    }
    async start(params) {
        const { type = base_RecordStartType.Direct } = params;
        this.assertSupported();
        if (!Object.values(base_RecordStartType).includes(type)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'Unknown recording start type.');
        }
        if (this.disposed) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Cancelled, 'The recording owner has been disposed.');
        }
        const joining = this.startRequests.active;
        if (!joining && this.state.phase !== (/* inlined export .RecordPhase.Idle */"idle")) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'A recording is already active.');
        }
        const completion = this.startRequests.add(type);
        if (!joining) {
            this.completeStartRequests();
        }
        await completion;
    }
    async completeStartRequests() {
        try {
            await this.actions.run(async ()=>await this.performStart());
            this.startRequests.finish();
        } catch (error) {
            this.startRequests.finish(error);
        }
    }
    cancelPendingStarts() {
        if (this.pendingStart) {
            this.pendingStart.cancelRequested = true;
        }
        this.startRequests.cancel();
    }
    async cancel() {
        this.assertSupported();
        const pending = this.pendingStart;
        if (!this.startRequests.active && (this.state.phase !== (/* inlined export .RecordPhase.Starting */"starting") || !pending)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'There is no pending recording start.');
        }
        // Remember cancellation before waiting for the queue or native stop confirmation.
        this.cancelPendingStarts();
        await this.actions.run(async ()=>{
            if (pending?.cancellationError !== undefined) {
                throw pending.cancellationError;
            }
        });
    }
    async setPaused(params) {
        const { paused } = params;
        await this.actions.run(async ()=>{
            if (paused) {
                await this.performPause();
                return;
            }
            await this.performResume();
        });
    }
    async stop() {
        await this.actions.run(async ()=>await this.performStop());
    }
    async retry() {
        await this.actions.run(async ()=>{
            this.assertSupported();
            if (this.state.phase !== (/* inlined export .RecordPhase.Failed */"failed") || !this.currentJobId) {
                throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'There is no failed recording to retry.');
            }
            let job = this.jobs.get(this.currentJobId);
            if (!job) {
                throw interface_error_InterfaceError(base_InterfaceErrorCode.NotFound, 'The recording job is not available.');
            }
            if (this.pendingFinalizeJobId === job.sessionId) {
                await this.performStop();
                return;
            }
            if (job.terminalFailure) {
                throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'This recording ended with a terminal failure.');
            }
            if (this.state.failure?.retryable !== true) {
                throw interface_error_InterfaceError(base_InterfaceErrorCode.Unsupported, 'This recording failure cannot be retried.');
            }
            if (job.processingWaitStartedAtEpochMs !== undefined) {
                const retried = {
                    ...job,
                    processingWaitStartedAtEpochMs: Date.now()
                };
                await this.store.save(retried);
                this.jobs.set(retried.sessionId, retried);
                job = retried;
            }
            if (job.uploadRecovery) {
                job = await this.saveUploadRecovery(job, {
                    attempts: 0,
                    stopped: false
                });
            }
            this.presentProcessingJob(job);
            this.triggerSynchronization(job.sessionId, true);
        });
    }
    async dismiss() {
        await this.actions.run(async ()=>{
            this.assertSupported();
            if (this.state.phase !== (/* inlined export .RecordPhase.Failed */"failed") && this.state.processingStage !== (/* inlined export .RecordProcessingStage.Retrying */"retrying") || !this.currentJobId) {
                throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'There is no failed recording to dismiss.');
            }
            const job = this.jobs.get(this.currentJobId);
            if (job && this.pendingFinalizeJobId === job.sessionId) {
                throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'Audio is still waiting to be saved locally. Retry saving before closing this recording.');
            }
            if (!job) {
                this.currentJobId = undefined;
                this.publish((/* inlined export .RecordPhase.Idle */"idle"), 0);
                return;
            }
            const dismissed = {
                ...job,
                dismissed: true,
                ...this.hasPendingUpload(job) ? {
                    uploadRecovery: {
                        attempts: job.uploadRecovery?.attempts ?? 0,
                        stopped: true
                    }
                } : {}
            };
            this.uploadControllers.get(job.sessionId)?.abort();
            this.clearRetry(job.sessionId);
            this.jobs.set(dismissed.sessionId, dismissed);
            await this.store.save(dismissed);
            this.currentJobId = undefined;
            this.publish((/* inlined export .RecordPhase.Idle */"idle"), 0);
            this.triggerSynchronization(dismissed.sessionId);
        });
    }
    async openDirectory() {
        this.assertSupported();
        try {
            await this.store.openDirectory();
        } catch (error) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'The local recording directory could not be opened.', {
                cause: error
            });
        }
    }
    async exportAudio() {
        this.assertSupported();
        const job = this.currentJob;
        if (!job || this.state.phase !== (/* inlined export .RecordPhase.Failed */"failed") || !job.runs.some((run)=>run.segments.length > 0) || !this.belongsToCurrentAccount(job)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'There is no failed recording audio to export.');
        }
        const generation = this.account.currentUserSocketSession?.sessionGeneration;
        await this.audioExport.export(job, ()=>this.currentJobId === job.sessionId && this.belongsToCurrentAccount(job) && this.account.currentUserSocketSession?.sessionGeneration === generation && this.state.phase === (/* inlined export .RecordPhase.Failed */"failed"));
    }
    get supported() {
        return this.featureIds.includes((/* inlined export .WellKnownFeatureId.Recording */"recording"));
    }
    assertSupported() {
        if (!this.supported) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unsupported, 'Recording is not supported by this client.');
        }
    }
    async performStart() {
        this.assertSupported();
        if (this.state.phase !== (/* inlined export .RecordPhase.Idle */"idle")) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'A recording is already active.');
        }
        const accountId = this.account.currentAccountId;
        if (!accountId) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.AuthRequired, 'Sign in before starting a recording.');
        }
        const now = Date.now();
        const run = this.createRun(now);
        const job = {
            schemaVersion: (/* inlined export .RECORD_MANIFEST_SCHEMA_VERSION */2),
            sessionId: (0,external_node_crypto_namespaceObject.randomUUID)(),
            accountId,
            environment: this.account.runtimeSnapshot.environment,
            timezone: this.timezone,
            targetSegmentDurationMs: (/* inlined export .RECORD_AUDIO_SEGMENT_DURATION_MS */20000),
            startedAtEpochMs: now,
            status: 'capturing',
            dismissed: false,
            runs: [
                run
            ],
            capture: {
                startedAtEpochMs: run.startedAtEpochMs,
                deviceMonotonicStartMs: run.deviceMonotonicStartMs,
                createIdempotencyKey: (0,external_node_crypto_namespaceObject.randomUUID)(),
                sealIdempotencyKey: (0,external_node_crypto_namespaceObject.randomUUID)()
            }
        };
        let directoryPath;
        try {
            directoryPath = await this.store.createRunDirectory(job.sessionId, run.runId);
            await this.store.save(job);
        } catch (error) {
            await this.removeJobBestEffort(job);
            throw this.localStorageError(error, 'Recording storage could not be prepared.');
        }
        this.jobs.set(job.sessionId, job);
        this.currentJobId = job.sessionId;
        await this.startRun(job, run, directoryPath, 0);
    }
    async performPause() {
        this.assertSupported();
        if (this.state.phase !== (/* inlined export .RecordPhase.Recording */"recording")) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'The recording is not active.');
        }
        if (this.captureRecoveryJobId && !this.activeRunClock) {
            const durationMs = this.currentDurationMs();
            this.clearCaptureRecovery();
            this.noSoundJobId = undefined;
            this.publish((/* inlined export .RecordPhase.Paused */"paused"), durationMs);
            return;
        }
        const runId = this.activeRunClock?.runId;
        if (!runId) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'The active recording run is unavailable.');
        }
        const durationMs = this.currentDurationMs();
        const level = this.state.level;
        this.noSoundJobId = undefined;
        this.clearCaptureRecovery();
        this.publish((/* inlined export .RecordPhase.Paused */"paused"), durationMs);
        let stopped;
        try {
            stopped = await this.stopCaptureForCleanup(runId);
        } catch (error) {
            this.publish((/* inlined export .RecordPhase.Recording */"recording"), durationMs, level);
            throw interface_error_InterfaceError(error, 'Recording could not be paused.');
        }
        if (stopped.kind === 'responseFailed') {
            await this.failStoppedCapture(this.nativeCaptureStoppedError(stopped.responseError), 'encoderRestart', durationMs, interface_error_InterfaceError(stopped.responseError).code);
            throw interface_error_InterfaceError(stopped.responseError, 'Recording could not be paused.');
        }
        try {
            // A resume action can already be queued before the final periodic event.
            // Account for every event delivered before the stop response first.
            await this.acceptPendingSegmentEvents(runId);
            if (stopped.finalSegment) {
                await this.acceptSegmentWithRecovery(stopped.finalSegment, false);
            }
            const job = await this.closeCurrentRun('userStopped', 'paused');
            this.activeRunClock = undefined;
            if (job) {
                if (!this.belongsToCurrentAccount(job)) {
                    this.presentCurrentAccountJob();
                    this.synchronizePendingJobs();
                    return;
                }
                if (job.terminalFailure) {
                    this.failCurrent(job.terminalFailure, {
                        durationMs
                    });
                    return;
                }
                this.publish((/* inlined export .RecordPhase.Paused */"paused"), Math.max(durationMs, recordJobDurationMs(job)));
                this.triggerSynchronization(job.sessionId);
            }
        } catch (error) {
            const failure = this.localStorageError(error, 'The captured audio could not be stored.');
            await this.failStoppedCapture(failure, 'userStopped', durationMs);
            throw failure;
        }
    }
    async performResume(recovering = false) {
        this.assertSupported();
        if (!recovering && this.state.phase !== (/* inlined export .RecordPhase.Paused */"paused") || !this.currentJobId) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'The recording is not paused.');
        }
        if (!recovering) {
            this.noSoundJobId = undefined;
        }
        let job = this.jobs.get(this.currentJobId);
        if (!job) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.NotFound, 'The recording job is not available.');
        }
        if (job.terminalFailure) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'This recording ended with a terminal failure.');
        }
        if (!job.capture) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'This recovered recording must finish sending before a new recording can start.');
        }
        // A deferred segment still owns a capture-wide sequence number, even before validation succeeds.
        await this.flushPendingPersistence(job.sessionId);
        job = this.jobs.get(job.sessionId) ?? job;
        let run = recovering ? this.captureRecoveryRun : undefined;
        if (!run) {
            run = this.createRun(Date.now(), nextRecordSequenceNo(job));
            if (recovering) {
                // Reuse the same empty spool directory during retries instead of leaking one per attempt.
                this.captureRecoveryRun = run;
            }
        }
        const resumed = {
            ...job,
            status: 'capturing',
            runs: [
                ...job.runs,
                run
            ]
        };
        let directoryPath;
        try {
            directoryPath = await this.store.createRunDirectory(resumed.sessionId, run.runId);
            await this.store.save(resumed);
        } catch (error) {
            throw this.localStorageError(error, 'Recording storage could not be prepared.');
        }
        this.jobs.set(resumed.sessionId, resumed);
        const pausedDurationMs = Math.max(this.state.durationMs, recordJobDurationMs(job));
        await this.startRun(resumed, run, directoryPath, pausedDurationMs, job, recovering);
    }
    async startRun(job, run, directoryPath, durationMs, previousJob, recovering = false) {
        const pending = {
            cancelRequested: false,
            runId: run.runId
        };
        this.latestAudioLevel = undefined;
        this.latestAudioHealth = undefined;
        this.pendingStart = pending;
        this.publish(recovering ? (/* inlined export .RecordPhase.Recording */"recording") : (/* inlined export .RecordPhase.Starting */"starting"), durationMs);
        try {
            let startError;
            try {
                const params = {
                    runId: run.runId,
                    directoryPath,
                    segmentDurationMs: job.targetSegmentDurationMs
                };
                if (previousJob) {
                    await this.cpi.audio.startCapture(params);
                } else {
                    await this.startRequests.capture(params);
                }
            } catch (error) {
                startError = interface_error_InterfaceError(error, 'Recording could not start.');
            }
            if (pending.cancelRequested) {
                // Keep ownership even if the start response failed: capture may have started.
                this.activeRunClock = {
                    runId: run.runId,
                    baseDurationMs: durationMs,
                    startedAtMonotonicMs: performance.now()
                };
                try {
                    await this.stopCaptureForCleanup(run.runId);
                } catch (error) {
                    pending.cancellationError = interface_error_InterfaceError(error, 'Recording could not be cancelled.');
                    this.publish((/* inlined export .RecordPhase.Recording */"recording"), durationMs);
                    throw pending.cancellationError;
                }
                await this.rollbackStart(job, durationMs, previousJob, recovering);
                return;
            }
            if (startError) {
                let nativeState;
                try {
                    nativeState = await this.cpi.audio.getState();
                } catch (error) {
                    this.recordCaptureDiagnostic('capture_recovery_failed', job, error);
                }
                if (!nativeState || nativeState.status === (/* inlined export .AudioCaptureStatus.Capturing */"capturing") && nativeState.runId === run.runId) {
                    this.activeRunClock = {
                        runId: run.runId,
                        baseDurationMs: durationMs,
                        startedAtMonotonicMs: performance.now()
                    };
                    this.noSoundJobId = job.sessionId;
                    this.publish((/* inlined export .RecordPhase.Recording */"recording"), durationMs);
                } else {
                    await this.rollbackStart(job, durationMs, previousJob, recovering);
                }
                throw startError;
            }
            const resumedDurationMs = recovering ? this.currentDurationMs() : durationMs;
            this.activeRunClock = {
                runId: run.runId,
                baseDurationMs: resumedDurationMs,
                startedAtMonotonicMs: performance.now()
            };
            this.publish((/* inlined export .RecordPhase.Recording */"recording"), resumedDurationMs);
        } finally{
            this.pendingStart = undefined;
        }
    }
    async rollbackStart(job, durationMs, previousJob, recovering = false) {
        this.activeRunClock = undefined;
        if (previousJob) {
            this.jobs.set(previousJob.sessionId, previousJob);
            try {
                await this.store.save(previousJob);
            } catch  {
                this.logger.warn('record.capture', 'recording resume rollback could not be persisted');
            }
            if (!this.belongsToCurrentAccount(previousJob)) {
                this.presentCurrentAccountJob();
                this.synchronizePendingJobs();
                return;
            }
            this.publish(recovering ? (/* inlined export .RecordPhase.Recording */"recording") : (/* inlined export .RecordPhase.Paused */"paused"), durationMs);
            return;
        }
        await this.removeJobBestEffort(job);
        this.jobs.delete(job.sessionId);
        this.currentJobId = undefined;
        this.publish((/* inlined export .RecordPhase.Idle */"idle"), 0);
    }
    async performStop() {
        this.assertSupported();
        const retryingFinalize = this.pendingFinalizeJobId !== undefined && this.pendingFinalizeJobId === this.currentJobId;
        if (!retryingFinalize && this.state.phase !== (/* inlined export .RecordPhase.Recording */"recording") && this.state.phase !== (/* inlined export .RecordPhase.Paused */"paused")) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'There is no recording to stop.');
        }
        this.noSoundJobId = undefined;
        const wasRecording = (this.state.phase === (/* inlined export .RecordPhase.Recording */"recording") || retryingFinalize) && this.activeRunClock !== undefined;
        const durationMs = this.currentDurationMs();
        this.clearCaptureRecovery();
        this.uploadRetryAttempts.delete(this.currentJobId ?? '');
        const level = this.state.level;
        this.publish((/* inlined export .RecordPhase.Processing */"processing"), durationMs, 0, (/* inlined export .RecordProcessingStage.Finalizing */"finalizing"));
        if (wasRecording) {
            const runId = this.activeRunClock?.runId;
            if (!runId) {
                this.publish((/* inlined export .RecordPhase.Recording */"recording"), durationMs, level);
                throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'The active recording run is unavailable.');
            }
            let stopped;
            try {
                stopped = await this.stopCaptureForCleanup(runId, true);
            } catch (error) {
                let nativeState;
                try {
                    nativeState = await this.cpi.audio.getState();
                } catch  {
                // An unconfirmed native state must keep its existing capture ownership.
                }
                if (nativeState?.status === (/* inlined export .AudioCaptureStatus.Capturing */"capturing") && nativeState.runId === runId && nativeState.pendingPersistence) {
                    this.presentPendingFinalization(runId, durationMs);
                    throw interface_error_InterfaceError(error, 'The recorded audio is still waiting to be saved.');
                }
                if (interface_error_InterfaceError(error).code === base_InterfaceErrorCode.Unavailable) {
                    this.noSoundJobId = this.currentJobId;
                    this.latestAudioLevel = undefined;
                }
                this.publish((/* inlined export .RecordPhase.Recording */"recording"), durationMs, level);
                throw interface_error_InterfaceError(error, 'Recording could not be stopped.');
            }
            this.pendingFinalizeJobId = undefined;
            if (stopped.kind === 'responseFailed') {
                await this.failStoppedCapture(this.nativeCaptureStoppedError(stopped.responseError), 'encoderRestart', durationMs, interface_error_InterfaceError(stopped.responseError).code);
                throw interface_error_InterfaceError(stopped.responseError, 'Recording could not be stopped.');
            }
            try {
                if (stopped.finalSegment) {
                    await this.acceptSegmentWithRecovery(stopped.finalSegment, false);
                }
                await this.acceptPendingSegmentEvents(runId);
                await this.flushPendingPersistence(this.currentJobId, (/* inlined export .RECORD_CAPTURE_STOP_MAX_RETRIES */5) + 1);
                await this.closeCurrentRun('userStopped', 'processing');
            } catch (error) {
                const failure = this.localStorageError(error, 'The captured audio could not be stored.');
                await this.failStoppedCapture(failure, 'userStopped', durationMs);
                throw failure;
            }
        } else {
            const job = this.currentJob;
            if (job) {
                const processing = {
                    ...job,
                    status: 'processing'
                };
                this.jobs.set(processing.sessionId, processing);
                try {
                    await this.persistLocalJob(processing, true);
                } catch (error) {
                    const failure = this.localStorageError(error, 'The recording could not be finalized.');
                    this.recordCaptureDiagnostic('storage_failed', processing, error);
                    const retained = await this.persistTerminalFailure(processing, toRecordFailure(failure), true);
                    this.failCurrent(retained.terminalFailure, {
                        durationMs
                    });
                    throw failure;
                }
            }
        }
        this.activeRunClock = undefined;
        const job = this.currentJob;
        if (!job) {
            this.publish((/* inlined export .RecordPhase.Idle */"idle"), 0);
            return;
        }
        if (!this.belongsToCurrentAccount(job)) {
            this.presentCurrentAccountJob();
            this.synchronizePendingJobs();
            return;
        }
        if (job.terminalFailure) {
            this.failCurrent(job.terminalFailure, {
                durationMs
            });
            return;
        }
        this.publish((/* inlined export .RecordPhase.Processing */"processing"), Math.max(durationMs, recordJobDurationMs(job)), 0, (/* inlined export .RecordProcessingStage.Uploading */"uploading"));
        this.triggerSynchronization(job.sessionId, true);
    }
    async finishLocalCapture(reason) {
        if (this.pendingFinalizeJobId && this.pendingFinalizeJobId === this.currentJobId) {
            await this.performStop();
            return;
        }
        if (this.captureRecoveryJobId && !this.activeRunClock) {
            await this.performStop();
            return;
        }
        this.clearCaptureRecovery();
        if (!this.supported || this.state.phase !== (/* inlined export .RecordPhase.Recording */"recording")) {
            return;
        }
        const runId = this.activeRunClock?.runId;
        if (!runId) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'The active recording run is unavailable.');
        }
        const durationMs = this.currentDurationMs();
        const stopped = await this.stopCaptureForCleanup(runId);
        if (stopped.kind === 'responseFailed') {
            await this.failStoppedCapture(this.nativeCaptureStoppedError(stopped.responseError), reason, durationMs, interface_error_InterfaceError(stopped.responseError).code);
            return;
        }
        if (stopped.finalSegment) {
            try {
                await this.acceptSegmentWithRecovery(stopped.finalSegment, false);
            } catch (error) {
                this.diagnostics.reportFault('record.capture', 'the final recording segment could not be stored', !this.currentJob?.runs.length);
                await this.failStoppedCapture(this.localStorageError(error, 'The captured audio could not be stored.'), reason, durationMs);
                return;
            }
        }
        try {
            await this.closeCurrentRun(reason, 'processing');
        } catch (error) {
            this.diagnostics.reportFault('record.capture', 'the stopped recording could not be persisted', !this.currentJob?.runs.length);
            await this.failStoppedCapture(this.localStorageError(error, 'The recording could not be finalized.'), reason, durationMs);
            return;
        }
        this.activeRunClock = undefined;
        if (!this.disposed) {
            const job = this.currentJob;
            if (job) {
                if (job.terminalFailure && this.belongsToCurrentAccount(job)) {
                    this.failCurrent(job.terminalFailure, {
                        durationMs
                    });
                    return;
                }
                this.publish((/* inlined export .RecordPhase.Processing */"processing"), Math.max(durationMs, recordJobDurationMs(job)), 0, (/* inlined export .RecordProcessingStage.Uploading */"uploading"));
                this.triggerSynchronization(job.sessionId);
            }
        }
    }
    async stopForAccountTransition() {
        this.cancelPendingStarts();
        await this.actions.run(async ()=>{
            await this.finishCurrentJobForAccountTransition();
        });
    }
    async finishCurrentJobForAccountTransition() {
        if (this.pendingFinalizeJobId && this.pendingFinalizeJobId === this.currentJobId) {
            await this.performStop();
            return;
        }
        if (this.state.phase === (/* inlined export .RecordPhase.Recording */"recording")) {
            await this.finishLocalCapture('deviceShutdown');
            return;
        }
        if (this.state.phase !== (/* inlined export .RecordPhase.Paused */"paused") || !this.currentJob) {
            return;
        }
        const job = {
            ...this.currentJob,
            status: 'processing'
        };
        await this.store.save(job);
        this.jobs.set(job.sessionId, job);
        this.publish((/* inlined export .RecordPhase.Processing */"processing"), recordJobDurationMs(job), 0, (/* inlined export .RecordProcessingStage.Uploading */"uploading"));
        this.triggerSynchronization(job.sessionId);
    }
    async acceptSegment(event, triggerSynchronization) {
        const job = this.findJobByRunId(event.runId);
        if (!job) {
            this.logger.warn('record.capture', 'ignored a segment for an unknown local run');
            return;
        }
        await this.store.validateSegment(job, event);
        const updated = mergeRecordSegment(job, event, external_node_crypto_namespaceObject.randomUUID);
        if (updated === job) {
            return;
        }
        this.jobs.set(updated.sessionId, updated);
        await this.store.save(updated);
        this.logUploadProgress(updated, event.runId);
        if (triggerSynchronization) {
            this.triggerSynchronization(updated.sessionId);
        }
    }
    async acceptPendingSegmentEvents(runId) {
        for (const event of this.pendingSegmentEvents){
            if (event.runId !== runId) {
                continue;
            }
            this.pendingSegmentEvents.delete(event);
            await this.acceptSegmentWithRecovery(event, false);
        }
    }
    async acceptSegmentWithRecovery(event, triggerSynchronization) {
        try {
            await this.acceptSegment(event, triggerSynchronization);
        } catch (error) {
            const job = this.findJobByRunId(event.runId);
            if (!job || !isTransientRecordStorageError(error)) {
                throw error;
            }
            this.deferLocalPersistence(job, error, event);
        }
    }
    deferLocalPersistence(job, error, event) {
        let pending = this.pendingPersistence.get(job.sessionId);
        if (!pending) {
            pending = {
                events: new Map(),
                attempts: 0,
                retryAtEpochMs: Date.now() + (/* inlined export .RECORD_CAPTURE_RETRY_INITIAL_DELAY_MS */1000)
            };
            this.pendingPersistence.set(job.sessionId, pending);
        }
        if (event) {
            pending.events.set(`${event.runId}:${event.sequenceNo}`, event);
        }
        this.uploadControllers.get(job.sessionId)?.abort('record-storage-pending');
        this.clearRetry(job.sessionId);
        this.recordCaptureDiagnostic('storage_failed', job, error, {
            attempt: pending.attempts + 1
        });
    }
    async persistLocalJob(job, finalizing) {
        try {
            await this.store.save(job);
        } catch (error) {
            if (!isTransientRecordStorageError(error)) {
                throw error;
            }
            this.deferLocalPersistence(job, error);
        }
        if (finalizing) {
            await this.flushPendingPersistence(job.sessionId, (/* inlined export .RECORD_CAPTURE_STOP_MAX_RETRIES */5) + 1);
        }
    }
    async flushPendingPersistence(sessionId, maximumAttempts = 1) {
        for(let attempt = 0; attempt < maximumAttempts; attempt += 1){
            const pending = this.pendingPersistence.get(sessionId);
            if (!pending) {
                return;
            }
            try {
                for (const event of pending.events.values()){
                    await this.acceptSegment(event, false);
                }
                const job = this.jobs.get(sessionId);
                if (job) {
                    await this.store.save(job);
                }
                this.pendingPersistence.delete(sessionId);
                return;
            } catch (error) {
                pending.attempts += 1;
                const delayMs = Math.min((/* inlined export .RECORD_CAPTURE_RETRY_MAX_DELAY_MS */30000), (/* inlined export .RECORD_CAPTURE_RETRY_INITIAL_DELAY_MS */1000) * 2 ** Math.min(maximumAttempts > 1 ? attempt : pending.attempts - 1, 5));
                pending.retryAtEpochMs = Date.now() + delayMs;
                const job = this.jobs.get(sessionId);
                if (job) {
                    this.recordCaptureDiagnostic('storage_failed', job, error, {
                        attempt: pending.attempts,
                        retryDelayMs: delayMs
                    });
                }
                if (!isTransientRecordStorageError(error) || attempt + 1 >= maximumAttempts) {
                    throw error;
                }
                await new Promise((resolve)=>setTimeout(resolve, delayMs));
            }
        }
    }
    async acceptSegmentEvent(event) {
        try {
            await this.acceptSegmentWithRecovery(event, true);
        } catch (error) {
            const job = this.findJobByRunId(event.runId);
            this.diagnostics.reportFault('record.capture', 'a finalized recording segment was rejected locally', !job?.runs.length || job.sessionId !== this.currentJobId);
            if (!job || job.sessionId !== this.currentJobId) {
                return;
            }
            const durationMs = this.currentDurationMs();
            const failure = this.localStorageError(error, 'The captured audio could not be stored.');
            const failed = await this.persistTerminalFailure(job, {
                ...toRecordFailure(failure),
                retryable: false
            }, true);
            this.recordCaptureDiagnostic('storage_failed', job, error);
            if (this.state.phase === (/* inlined export .RecordPhase.Recording */"recording") && this.activeRunClock) {
                try {
                    const stopped = await this.stopCaptureForCleanup(this.activeRunClock.runId);
                    if (stopped.kind === 'completed' && stopped.finalSegment) {
                        try {
                            await this.acceptSegmentWithRecovery(stopped.finalSegment, false);
                        } catch  {
                            this.diagnostics.reportFault('record.capture', 'the final recording segment was also rejected', !this.diagnostics.hasReportedFailure('storage_failed', job.sessionId));
                        }
                    }
                } catch  {
                    this.logger.warn('record.capture', 'native capture did not stop after a segment failure');
                    return;
                }
            }
            await this.failStoppedCapture(failed.terminalFailure ?? failure, 'encoderRestart', durationMs);
        }
    }
    acceptLevel(event) {
        if (this.pendingStart?.runId === event.runId || this.activeRunClock?.runId === event.runId) {
            // Retain the latest sample during start/stop RPCs too: if native dedupes
            // subsequent samples, successful start or failed-stop rollback still needs it.
            this.latestAudioLevel = {
                ...event,
                level: Math.round(event.level * 100) / 100
            };
        }
        if (this.state.phase !== (/* inlined export .RecordPhase.Recording */"recording") || this.activeRunClock?.runId !== event.runId) {
            return;
        }
        this.liveState.accept(event.level);
    }
    async acceptHealth(event) {
        if (this.pendingStart?.runId !== event.runId && this.activeRunClock?.runId !== event.runId) {
            return;
        }
        if (this.latestAudioHealth?.runId === event.runId && this.latestAudioHealth.health === event.health) {
            return;
        }
        this.latestAudioHealth = event;
        const job = this.findJobByRunId(event.runId);
        if (!job || !this.belongsToCurrentAccount(job)) {
            return;
        }
        // Latch at receipt, before a queued pause/stop can close this run.
        if (event.health === (/* inlined export .AudioCaptureHealth.Healthy */"healthy")) {
            this.detectedAudioJobId = job.sessionId;
        }
        await this.actions.run(async ()=>{
            const latest = this.jobs.get(job.sessionId);
            if (!latest || this.currentJobId !== latest.sessionId || !this.belongsToCurrentAccount(latest) || (this.activeRunClock?.runId ?? latest.runs.at(-1)?.runId) !== event.runId) {
                return;
            }
            if (event.health === (/* inlined export .AudioCaptureHealth.Healthy */"healthy")) {
                if (this.activeRunClock?.runId !== event.runId || this.activeRunClock.stoppedAtMonotonicMs !== undefined || latest.terminalFailure) {
                    return;
                }
                this.noSoundJobId = undefined;
                this.clearCaptureRecovery();
                if (this.state.phase === (/* inlined export .RecordPhase.Recording */"recording")) {
                    this.publish((/* inlined export .RecordPhase.Recording */"recording"), this.currentDurationMs(), this.state.level);
                }
                if (!latest.hasDetectedAudio) {
                    const updated = {
                        ...latest,
                        hasDetectedAudio: true
                    };
                    this.jobs.set(updated.sessionId, updated);
                    try {
                        await this.store.save(updated);
                    } catch (error) {
                        this.recordCaptureDiagnostic('storage_failed', updated, error);
                        this.logger.warn('record.storage', 'recording audio detection could not be persisted');
                    }
                }
                return;
            }
            if (this.latestAudioHealth?.runId === event.runId && this.latestAudioHealth.health === (/* inlined export .AudioCaptureHealth.Silent */"silent")) {
                await this.handleNoInput(event.runId);
            }
        });
    }
    hasDetectedAudio(job) {
        return job.hasDetectedAudio === true || this.detectedAudioJobId === job.sessionId;
    }
    async handleNoInput(runId, confirmedStopped = false) {
        const job = this.currentJob;
        if (!job || !this.belongsToCurrentAccount(job) || this.state.phase !== (/* inlined export .RecordPhase.Recording */"recording") || this.activeRunClock?.runId !== runId) {
            return;
        }
        this.noSoundJobId = job.sessionId;
        this.publish((/* inlined export .RecordPhase.Recording */"recording"), this.currentDurationMs(), this.state.level);
        if (!confirmedStopped) {
            return;
        }
        this.beginCaptureRecovery(job);
        this.freezeActiveRunClock(runId);
        this.publish((/* inlined export .RecordPhase.Recording */"recording"), this.currentDurationMs());
        this.scheduleCaptureRecovery();
    }
    beginCaptureRecovery(job) {
        if (!this.captureRecoveryClock) {
            this.captureRecoveryClock = {
                baseDurationMs: this.currentDurationMs(),
                startedAtMonotonicMs: performance.now()
            };
        }
        this.captureRecoveryJobId = job.sessionId;
    }
    clearCaptureRecovery() {
        if (this.captureRecoveryTimer) {
            clearTimeout(this.captureRecoveryTimer);
            this.captureRecoveryTimer = undefined;
        }
        this.captureRecoveryJobId = undefined;
        this.captureRecoveryAttempts = 0;
        this.captureRecoveryRun = undefined;
        this.captureRecoveryClock = undefined;
    }
    scheduleCaptureRecovery() {
        if (this.captureRecoveryTimer || !this.captureRecoveryJobId || this.disposed) {
            return;
        }
        const delayMs = Math.min((/* inlined export .RECORD_CAPTURE_RETRY_MAX_DELAY_MS */30000), (/* inlined export .RECORD_CAPTURE_RETRY_INITIAL_DELAY_MS */1000) * 2 ** Math.min(this.captureRecoveryAttempts, 5));
        this.captureRecoveryTimer = setTimeout(async ()=>{
            this.captureRecoveryTimer = undefined;
            await this.actions.run(async ()=>{
                const job = this.currentJob;
                if (!job || job.sessionId !== this.captureRecoveryJobId || !this.belongsToCurrentAccount(job) || this.state.phase !== (/* inlined export .RecordPhase.Recording */"recording") || job.terminalFailure || this.disposed) {
                    this.clearCaptureRecovery();
                    return;
                }
                try {
                    const nativeState = await this.cpi.audio.getState();
                    if (nativeState.status !== (/* inlined export .AudioCaptureStatus.Idle */"idle")) {
                        this.captureRecoveryAttempts += 1;
                        this.scheduleCaptureRecovery();
                        return;
                    }
                    if (this.activeRunClock) {
                        const runId = this.activeRunClock.runId;
                        this.freezeActiveRunClock(runId);
                        await this.acceptPendingSegmentEvents(runId);
                        await this.closeCurrentRun('encoderRestart', 'paused');
                        this.activeRunClock = undefined;
                        this.captureRecoveryRun = undefined;
                    }
                    await this.performResume(true);
                    this.recordCaptureDiagnostic('capture_recovered', job);
                    this.clearCaptureRecovery();
                    this.triggerSynchronization(job.sessionId);
                } catch (error) {
                    this.captureRecoveryAttempts += 1;
                    this.recordCaptureDiagnostic('capture_recovery_failed', job, error);
                    this.publish((/* inlined export .RecordPhase.Recording */"recording"), this.currentDurationMs());
                    this.scheduleCaptureRecovery();
                }
            });
        }, delayMs);
        this.captureRecoveryTimer.unref();
    }
    async acceptAudioCaptureFailure(event) {
        // The action queue may have paused/resumed after the event passed its receipt-time check.
        if (this.activeRunClock && this.activeRunClock.runId !== event.runId) {
            return;
        }
        const job = this.findJobByRunId(event.runId);
        if (!job || this.currentJobId !== job.sessionId) {
            this.logger.warn('record.capture', 'ignored a capture failure for an unknown local run');
            return;
        }
        const code = audioCaptureFailureInterfaceErrorCode(event.code);
        this.recordCaptureDiagnostic('capture_failed', job, event, {
            issue: this.shouldReportNativeCaptureIssue(code)
        });
        if (this.pendingFinalizeJobId === job.sessionId) {
            return;
        }
        if (code === base_InterfaceErrorCode.Unavailable && this.state.phase === (/* inlined export .RecordPhase.Recording */"recording")) {
            this.noSoundJobId = job.sessionId;
            this.beginCaptureRecovery(job);
            try {
                const nativeState = await this.cpi.audio.getState();
                if (nativeState.status === (/* inlined export .AudioCaptureStatus.Capturing */"capturing") && nativeState.runId === event.runId && nativeState.pendingPersistence) {
                    this.presentPendingFinalization(event.runId);
                    return;
                }
                if (nativeState.status === (/* inlined export .AudioCaptureStatus.Idle */"idle")) {
                    this.freezeActiveRunClock(event.runId);
                }
            } catch (error) {
                this.recordCaptureDiagnostic('capture_recovery_failed', job, error);
            }
            this.publish((/* inlined export .RecordPhase.Recording */"recording"), this.currentDurationMs());
            this.scheduleCaptureRecovery();
            return;
        }
        if (this.belongsToCurrentAccount(job) && this.activeRunClock?.runId === event.runId && this.state.phase === (/* inlined export .RecordPhase.Recording */"recording")) {
            try {
                const nativeState = await this.cpi.audio.getState();
                if (nativeState.status === (/* inlined export .AudioCaptureStatus.Capturing */"capturing") && nativeState.runId === event.runId && nativeState.pendingPersistence) {
                    this.presentPendingFinalization(event.runId);
                    return;
                }
                if (nativeState.status === (/* inlined export .AudioCaptureStatus.Idle */"idle")) {
                    this.freezeActiveRunClock(event.runId);
                    if (code === base_InterfaceErrorCode.Unavailable) {
                        await this.handleNoInput(event.runId, true);
                        return;
                    }
                }
            } catch  {
            // An unconfirmed interruption follows the existing terminal stop barrier.
            }
        }
        const failure = interface_error_InterfaceError(code, 'Recording stopped because the local audio capture failed.', {
            terminal: true
        });
        const failed = await this.persistTerminalFailure(job, {
            ...toRecordFailure(failure),
            retryable: false,
            reason: base_RecordFailureReason.CaptureInterrupted
        }, true);
        if (failed.dismissed || this.currentJobId !== failed.sessionId || !this.belongsToCurrentAccount(failed)) {
            return;
        }
        await this.stopForTerminalFailure(failed.terminalFailure ?? failure);
    }
    presentPendingFinalization(runId, durationMs = this.currentDurationMs()) {
        this.clearCaptureRecovery();
        this.pendingFinalizeJobId = this.currentJobId;
        this.freezeActiveRunClock(runId);
        this.failCurrent({
            code: base_InterfaceErrorCode.Unavailable,
            message: 'Audio is still waiting to be saved locally. Free disk space and retry to finish this recording.',
            retryable: true,
            reason: base_RecordFailureReason.LocalStoragePending
        }, {
            durationMs
        });
    }
    async acceptAudioStateEvent(state) {
        if (state.status === (/* inlined export .AudioCaptureStatus.Capturing */"capturing") && state.pendingPersistence && state.runId !== undefined && this.state.phase === (/* inlined export .RecordPhase.Recording */"recording") && this.activeRunClock?.runId === state.runId) {
            let current;
            try {
                current = await this.cpi.audio.getState();
            } catch (error) {
                if (this.currentJob) {
                    this.recordCaptureDiagnostic('capture_stop_failed', this.currentJob, error);
                }
                return;
            }
            if (current.status === (/* inlined export .AudioCaptureStatus.Capturing */"capturing") && current.runId === state.runId && current.pendingPersistence) {
                this.presentPendingFinalization(state.runId);
            }
            return;
        }
        if (state.status !== (/* inlined export .AudioCaptureStatus.Idle */"idle") || this.state.phase !== (/* inlined export .RecordPhase.Recording */"recording")) {
            return;
        }
        const runId = this.activeRunClock?.runId;
        if (!runId) {
            return;
        }
        let currentState;
        try {
            currentState = await this.cpi.audio.getState();
        } catch  {
            this.logger.warn('record.capture', 'native capture state could not be confirmed');
            return;
        }
        if (currentState.status !== (/* inlined export .AudioCaptureStatus.Idle */"idle") || this.state.phase !== (/* inlined export .RecordPhase.Recording */"recording") || this.activeRunClock?.runId !== runId) {
            return;
        }
        await this.handleNoInput(runId, true);
    }
    async closeCurrentRun(endReason, status, retryPersistence = true) {
        const job = this.currentJob;
        const runId = this.activeRunClock?.runId ?? job?.runs.at(-1)?.runId;
        if (!job || !runId) {
            return undefined;
        }
        const run = findRecordRun(job, runId);
        if (!run || run.endedAtEpochMs !== undefined) {
            return job;
        }
        const deviceMonotonicEndMs = run.segments.reduce((endMs, segment)=>{
            return Math.max(endMs, segment.deviceMonotonicStartMs + segment.durationMs);
        }, run.deviceMonotonicStartMs);
        const closedRun = {
            ...run,
            endedAtEpochMs: Date.now(),
            deviceMonotonicEndMs,
            endReason
        };
        const updated = {
            ...replaceRecordRun(job, closedRun),
            status,
            hasDetectedAudio: this.hasDetectedAudio(job)
        };
        this.jobs.set(updated.sessionId, updated);
        await this.persistLocalJob(updated, status === 'processing' && retryPersistence);
        return updated;
    }
    createRun(startedAtEpochMs, sequenceNoOffset = 0) {
        return {
            runId: (0,external_node_crypto_namespaceObject.randomUUID)(),
            startedAtEpochMs,
            deviceMonotonicStartMs: Math.max(0, Math.round(performance.now())),
            sequenceNoOffset,
            segments: []
        };
    }
    get timezone() {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        } catch  {
            return 'UTC';
        }
    }
    get currentJob() {
        if (!this.currentJobId) {
            return undefined;
        }
        return this.jobs.get(this.currentJobId);
    }
    findJobByRunId(runId) {
        return [
            ...this.jobs.values()
        ].find((job)=>job.runs.some((run)=>run.runId === runId));
    }
    async stopCaptureForCleanup(runId, retryPendingWrites = false) {
        let responseError;
        const maximumAttempts = retryPendingWrites ? (/* inlined export .RECORD_CAPTURE_STOP_MAX_RETRIES */5) + 1 : 2;
        for(let attempt = 0; attempt < maximumAttempts; attempt += 1){
            try {
                const finalSegment = await this.cpi.audio.stopCapture();
                this.freezeActiveRunClock(runId);
                return {
                    kind: 'completed',
                    finalSegment
                };
            } catch (error) {
                responseError = error;
            }
            let state;
            try {
                state = await this.cpi.audio.getState();
            } catch (error) {
                const job = this.currentJob;
                if (job) {
                    this.recordCaptureDiagnostic('capture_stop_failed', job, error, {
                        attempt: attempt + 1
                    });
                }
                if (attempt >= 1) {
                    break;
                }
                continue;
            }
            if (state.status === (/* inlined export .AudioCaptureStatus.Idle */"idle")) {
                this.freezeActiveRunClock(runId);
                return {
                    kind: 'responseFailed',
                    responseError
                };
            }
            if (state.runId !== runId) {
                throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'Another native audio capture became active.');
            }
            if (state.pendingPersistence) {
                this.freezeActiveRunClock(runId);
            }
            const retryable = interface_error_InterfaceError(responseError).code === base_InterfaceErrorCode.Unavailable;
            const job = this.currentJob;
            if (job) {
                this.recordCaptureDiagnostic('capture_stop_failed', job, responseError, {
                    issue: !state.pendingPersistence,
                    attempt: attempt + 1
                });
            }
            if (retryPendingWrites && retryable && !this.disposed) {
                if (attempt >= (/* inlined export .RECORD_CAPTURE_STOP_MAX_RETRIES */5)) {
                    break;
                }
                const delayMs = (/* inlined export .RECORD_CAPTURE_RETRY_INITIAL_DELAY_MS */1000) * 2 ** attempt;
                await new Promise((resolve)=>setTimeout(resolve, delayMs));
                continue;
            }
            if (attempt >= 1) {
                break;
            }
        }
        throw interface_error_InterfaceError(responseError, 'Native audio capture could not be confirmed stopped.');
    }
    async failStoppedCapture(error, endReason, durationMs, nativeFailureCode) {
        try {
            await this.closeCurrentRun(endReason, 'processing', false);
        } catch  {
            this.diagnostics.reportFault('record.capture', 'the failed recording state could not be persisted', nativeFailureCode !== undefined || !this.currentJob?.runs.length);
        }
        const failure = {
            ...toRecordFailure(error),
            retryable: false
        };
        const job = this.currentJob;
        if (job) {
            if (nativeFailureCode !== undefined) {
                this.recordCaptureDiagnostic('capture_stop_failed', job, error, {
                    issue: true
                });
            } else {
                this.recordCaptureDiagnostic('storage_failed', job, error);
            }
            await this.persistTerminalFailure(job, failure, true);
        }
        this.activeRunClock = undefined;
        const failed = this.currentJob;
        if (failed && !this.belongsToCurrentAccount(failed)) {
            this.presentCurrentAccountJob();
            this.synchronizePendingJobs();
            return;
        }
        this.failCurrent(failed?.terminalFailure ?? failure, {
            durationMs
        });
    }
    localStorageError(error, message) {
        if (error instanceof interface_error_InterfaceError) {
            return interface_error_InterfaceError(error.code, error.message, {
                cause: error,
                terminal: true
            });
        }
        if (error instanceof RecordStoreValidationError) {
            const code = error.code === 'quotaExceeded' ? base_InterfaceErrorCode.ResourceExhausted : base_InterfaceErrorCode.Conflict;
            return interface_error_InterfaceError(code, error.message, {
                cause: error,
                terminal: true
            });
        }
        return interface_error_InterfaceError(base_InterfaceErrorCode.Internal, message, {
            cause: error,
            terminal: true
        });
    }
    shouldReportNativeCaptureIssue(code) {
        // macOS reports terminal capture/encoding faults with native context before forwarding them.
        return this.account.runtimeSnapshot.clientPlatform !== 'macos-client' && (code === base_InterfaceErrorCode.Internal || code === base_InterfaceErrorCode.ResourceExhausted);
    }
    nativeCaptureStoppedError(error) {
        return interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'Recording stopped before its final audio could be confirmed.', {
            cause: error,
            terminal: true
        });
    }
    async removeJobBestEffort(job) {
        try {
            await this.store.remove(job);
        } catch  {
            this.logger.warn('record.storage', 'unused recording storage could not be cleaned up');
        }
    }
    freezeActiveRunClock(runId) {
        const clock = this.activeRunClock;
        if (!clock || clock.runId !== runId || clock.stoppedAtMonotonicMs !== undefined) {
            return;
        }
        // Keep the run identity until its final segment and manifest are persisted,
        // but never count that asynchronous cleanup as captured audio.
        this.activeRunClock = {
            ...clock,
            stoppedAtMonotonicMs: performance.now()
        };
        if (!this.captureRecoveryClock) {
            this.liveState.stop();
        }
    }
    currentDurationMs() {
        const job = this.currentJob;
        if (!job) {
            return 0;
        }
        let durationMs = recordJobDurationMs(job);
        if (this.activeRunClock) {
            durationMs = Math.max(durationMs, this.activeRunClock.baseDurationMs + Math.max(0, (this.activeRunClock.stoppedAtMonotonicMs ?? performance.now()) - this.activeRunClock.startedAtMonotonicMs));
        }
        if (this.captureRecoveryClock) {
            durationMs = Math.max(durationMs, this.captureRecoveryClock.baseDurationMs + Math.max(0, performance.now() - this.captureRecoveryClock.startedAtMonotonicMs));
        }
        return durationMs;
    }
    get hasRunningDisplayClock() {
        return this.captureRecoveryClock !== undefined || this.activeRunClock !== undefined && this.activeRunClock.stoppedAtMonotonicMs === undefined;
    }
    publish(phase, durationMs, level = 0, processingStage) {
        const sameJob = this.currentJobId !== undefined && this.currentJobId === this.presentedJobId;
        const visibleDurationMs = phase === (/* inlined export .RecordPhase.Idle */"idle") || !sameJob ? durationMs : Math.max(this.state.durationMs, durationMs);
        const visibleLevel = phase === (/* inlined export .RecordPhase.Recording */"recording") && this.latestAudioLevel?.runId === this.activeRunClock?.runId ? this.latestAudioLevel?.level ?? level : level;
        if (phase !== (/* inlined export .RecordPhase.Recording */"recording") || !this.hasRunningDisplayClock) {
            this.liveState.stop();
        } else if (!this.liveState.active && !this.disposed) {
            this.liveState.start(visibleLevel, (latestLevel)=>{
                if (this.state.phase !== (/* inlined export .RecordPhase.Recording */"recording") || !this.hasRunningDisplayClock) {
                    return;
                }
                const currentDurationMs = this.currentDurationMs();
                if (latestLevel === this.state.level && Math.floor(currentDurationMs / 1000) === Math.floor(this.state.durationMs / 1000)) {
                    return;
                }
                this.publish((/* inlined export .RecordPhase.Recording */"recording"), currentDurationMs, latestLevel);
            });
        }
        this.state = makeRecordState(this.state, phase, visibleDurationMs, {
            level: visibleLevel,
            recordingId: recordJobCaptureId(this.currentJob),
            ...phase === (/* inlined export .RecordPhase.Recording */"recording") && this.noSoundJobId !== undefined && this.noSoundJobId === this.currentJobId ? {
                warning: (/* inlined export .RecordWarning.NoSound */"no-sound")
            } : {},
            ...processingStage === undefined ? {} : {
                processingStage
            }
        });
        this.presentedJobId = phase === (/* inlined export .RecordPhase.Idle */"idle") ? undefined : this.currentJobId;
        this.emit('stateChanged', this.state);
    }
    failCurrent(error, options = {}) {
        this.liveState.stop();
        const job = this.currentJob;
        if (!job) {
            this.publish((/* inlined export .RecordPhase.Idle */"idle"), 0);
            return;
        }
        const durationMs = Math.max(this.presentedJobId === job.sessionId ? this.state.durationMs : 0, options.durationMs ?? 0, recordJobDurationMs(job));
        this.state = makeRecordState(this.state, (/* inlined export .RecordPhase.Failed */"failed"), durationMs, {
            failure: toRecordFailure(error),
            canExportAudio: job.runs.some((run)=>run.segments.length > 0),
            recordingId: recordJobCaptureId(job)
        });
        this.presentedJobId = job.sessionId;
        this.emit('stateChanged', this.state);
    }
    synchronizePendingJobs(immediate = false) {
        for (const job of this.jobs.values()){
            if (this.belongsToCurrentAccount(job)) {
                this.triggerSynchronization(job.sessionId, immediate);
            }
        }
    }
    triggerSynchronization(sessionId, immediate = false) {
        const job = this.jobs.get(sessionId);
        if (this.disposed || !job || !this.belongsToCurrentAccount(job)) {
            return;
        }
        if (this.hasPendingUpload(job) && job.uploadRecovery?.stopped) {
            return;
        }
        const timer = this.retryTimers.get(sessionId);
        // New segments must not bypass a backoff scheduled by a failed synchronization.
        if (timer && !immediate) {
            return;
        }
        if (timer) {
            clearTimeout(timer);
            this.retryTimers.delete(sessionId);
        }
        if (this.synchronizations.has(sessionId)) {
            this.synchronizeAgain.add(sessionId);
            return;
        }
        this.synchronizations.set(sessionId, this.synchronizeWithCleanup(sessionId));
    }
    async synchronizeWithCleanup(sessionId) {
        const controller = new AbortController();
        this.uploadControllers.set(sessionId, controller);
        try {
            await this.synchronize(sessionId, controller.signal);
        } catch (error) {
            this.diagnostics.reportFault('record.upload', 'recording synchronization stopped unexpectedly', !(error instanceof interface_error_InterfaceError && error.terminal && this.diagnostics.hasReportedFailure('storage_failed', sessionId)));
        } finally{
            this.uploadControllers.delete(sessionId);
            this.synchronizations.delete(sessionId);
            if (this.synchronizeAgain.delete(sessionId) && !this.disposed) {
                this.triggerSynchronization(sessionId);
            }
        }
    }
    async synchronize(sessionId, signal) {
        const refreshedPrepareKeys = new Set();
        let recoveryAttemptReserved = false;
        while(!this.disposed){
            const selectedStep = await this.actions.run(async ()=>{
                let job = this.jobs.get(sessionId);
                if (job && !job.terminalFailure && this.hasPendingUpload(job)) {
                    if (signal.aborted || !await this.updateUploadRecovery(job)) {
                        return undefined;
                    }
                    job = this.jobs.get(sessionId);
                    if (!recoveryAttemptReserved && job.uploadRecovery?.retryAtEpochMs !== undefined) {
                        const { retryAtEpochMs: _retryAt, ...recovery } = job.uploadRecovery;
                        await this.saveUploadRecovery(job, {
                            ...recovery,
                            attempts: recovery.attempts + 1
                        });
                        recoveryAttemptReserved = true;
                    }
                }
                const nextStep = this.nextSyncStep(sessionId);
                if (nextStep) {
                    this.presentSyncStep(nextStep);
                }
                return nextStep;
            });
            if (!selectedStep) {
                return;
            }
            let segmentFailure;
            try {
                const step = selectedStep;
                if (step.kind === 'cancel') {
                    await this.backend.cancelRemoteCapture({
                        job: step.job,
                        run: step.run,
                        idempotencyKey: `record-cancel-${step.job.capture ? step.job.sessionId : step.run.runId}`
                    });
                    await this.actions.run(async ()=>{
                        await this.markRemoteCancellationResolved(step);
                    });
                    continue;
                }
                if (step.kind === 'create' || step.kind === 'recoverRemote') {
                    if (step.kind === 'create') {
                        await this.actions.run(async ()=>{
                            await this.markRemoteCreationAttempted(step);
                        });
                    }
                    const creation = this.backend.createCapture({
                        ...step,
                        ...step.kind === 'create' ? {
                            signal
                        } : {}
                    });
                    const remote = step.kind === 'create' ? await awaitRecordUpload(creation, signal) : await creation;
                    if (step.kind === 'create' && signal.aborted) {
                        return;
                    }
                    await this.actions.run(async ()=>{
                        if (step.kind === 'recoverRemote' || !signal.aborted) {
                            await this.applyRemoteCapture(step, remote);
                        }
                    });
                    continue;
                }
                if (step.kind === 'segment') {
                    segmentFailure = await this.uploadSegments(step, signal);
                    if (segmentFailure) {
                        throw segmentFailure.error;
                    }
                    continue;
                }
                if (step.kind === 'seal') {
                    await awaitRecordUpload(this.backend.sealCapture({
                        ...step,
                        signal
                    }), signal);
                    if (signal.aborted) {
                        return;
                    }
                    await this.actions.run(async ()=>{
                        if (!signal.aborted) {
                            await this.markRunSealed(step);
                        }
                    });
                    continue;
                }
                if (step.kind === 'outcome') {
                    if (!await this.actions.run(async ()=>await this.prepareProcessingOutcomeRead(step))) {
                        return;
                    }
                    const outcome = await this.backend.getProcessingOutcome(step);
                    await this.actions.run(async ()=>{
                        await this.acceptProcessingOutcome(step, outcome);
                    });
                    if (outcome === 'pending') {
                        return;
                    }
                    continue;
                }
                await this.actions.run(async ()=>{
                    await this.completeJob(step.job);
                });
                return;
            } catch (error) {
                if (signal.aborted && !this.jobs.get(sessionId)?.terminalFailure) {
                    return;
                }
                const step = segmentFailure?.step ?? selectedStep;
                let synchronizationError = error;
                if (step.kind === 'outcome') {
                    await this.actions.run(async ()=>{
                        if (!toRecordFailure(error).retryable) {
                            await this.acceptSynchronizationFailure(sessionId, error);
                            return;
                        }
                        if (await this.prepareProcessingOutcomeRead(step)) {
                            this.scheduleRetry(sessionId);
                        }
                    });
                    return;
                }
                if (step.kind === 'create') {
                    let resolved = false;
                    try {
                        resolved = await this.actions.run(async ()=>await this.acceptDefinitiveRemoteCreationRejection(step, error));
                    } catch (resolutionError) {
                        synchronizationError = this.localStorageError(resolutionError, 'Remote recording creation recovery could not be persisted.');
                    }
                    if (resolved) {
                        continue;
                    }
                }
                if (step.kind === 'cancel') {
                    const resolved = await this.actions.run(async ()=>await this.acceptRemoteCancellationFailure(step, error));
                    if (resolved) {
                        continue;
                    }
                    return;
                }
                if (step.kind === 'create' && this.jobs.get(step.job.sessionId)?.terminalFailure) {
                    continue;
                }
                if (step.kind === 'recoverRemote') {
                    await this.actions.run(async ()=>{
                        this.acceptRemoteRecoveryFailure(step.job.sessionId, synchronizationError);
                    });
                    return;
                }
                if (step.kind === 'segment' && synchronizationError instanceof RecordBackendError && synchronizationError.retryPrepare) {
                    const backendError = synchronizationError;
                    const exhausted = backendError.segmentIntegrityFailure && step.segment.integrityFailureCount >= (/* inlined export .RECORD_MAX_SEGMENT_INTEGRITY_FAILURES */2);
                    if (!exhausted && !refreshedPrepareKeys.has(this.segmentKey(step))) {
                        refreshedPrepareKeys.add(this.segmentKey(step));
                        const countIntegrityFailure = backendError.segmentIntegrityFailure;
                        try {
                            await this.actions.run(async ()=>{
                                await this.refreshSegmentIdempotency(step, countIntegrityFailure);
                            });
                        } catch (rotationError) {
                            synchronizationError = this.localStorageError(rotationError, 'Recording upload recovery could not be persisted.');
                        }
                        if (synchronizationError instanceof RecordBackendError) {
                            continue;
                        }
                    }
                    if (exhausted) {
                        synchronizationError = new RecordBackendError(backendError.code, backendError.message, {
                            ...backendError.businessCode ? {
                                businessCode: backendError.businessCode
                            } : {},
                            retryable: false,
                            segmentIntegrityFailure: true,
                            cause: backendError
                        });
                    }
                }
                await this.actions.run(async ()=>{
                    await this.acceptSynchronizationFailure(sessionId, synchronizationError, step.kind);
                });
                return;
            }
        }
    }
    async uploadSegments(first, signal) {
        const steps = first.run.segments.filter((segment)=>segment.status === 'pending').slice(0, (/* inlined export .RECORD_UPLOAD_CONCURRENCY */2)).map((segment)=>({
                ...first,
                segment
            }));
        // Drain every in-flight upload before handling failure, rotating keys, or sealing.
        const results = await Promise.allSettled(steps.map(async (step)=>await this.uploadSegment(step, signal)));
        const failures = [];
        for (const [index, result] of results.entries()){
            const step = steps[index];
            if (step && result.status === 'rejected') {
                failures.push({
                    step,
                    error: result.reason
                });
            }
        }
        // A retryable sibling failure must not mask a local integrity or terminal failure.
        return failures.find(({ error })=>!this.uploadFailure(first.job, error).retryable) ?? failures[0];
    }
    async uploadSegment(step, signal) {
        if (this.activeSegmentUploads >= (/* inlined export .RECORD_UPLOAD_CONCURRENCY */2)) {
            await new Promise((resolve)=>{
                this.waitingSegmentUploads.push(resolve);
            });
        } else {
            this.activeSegmentUploads += 1;
        }
        try {
            const job = this.jobs.get(step.job.sessionId);
            // Queued uploads may outlive an account transition, shutdown, or native failure.
            if (signal.aborted || this.disposed || !job || job.terminalFailure || !this.belongsToCurrentAccount(job)) {
                return;
            }
            this.logUploadProgress(job, step.run.runId);
            let bytes;
            try {
                const snapshot = await this.store.readSegmentForUpload(step.job.sessionId, step.run.runId, step.segment);
                bytes = snapshot.bytes;
            } catch (error) {
                throw this.localStorageError(error, 'A local recording segment is unavailable.');
            }
            await awaitRecordUpload(this.backend.uploadSegment({
                ...step,
                bytes,
                signal
            }), signal);
            await this.actions.run(async ()=>{
                if (!signal.aborted) {
                    await this.markSegmentCommitted(step);
                }
            });
        } catch (error) {
            if (!this.uploadFailure(this.jobs.get(step.job.sessionId) ?? step.job, error).retryable) {
                // Stop capture promptly; remote cleanup still waits for this batch to drain.
                await this.actions.run(async ()=>{
                    await this.acceptSynchronizationFailure(step.job.sessionId, error);
                });
            }
            throw error;
        } finally{
            const next = this.waitingSegmentUploads.shift();
            if (next) {
                next();
            } else {
                this.activeSegmentUploads -= 1;
            }
        }
    }
    nextSyncStep(sessionId) {
        const job = this.jobs.get(sessionId);
        if (!job || !this.belongsToCurrentAccount(job)) {
            return undefined;
        }
        if (this.hasPendingUpload(job) && (job.uploadRecovery?.stopped || job.uploadRecovery?.offlineSinceEpochMs !== undefined || (job.uploadRecovery?.retryAtEpochMs ?? 0) > Date.now())) {
            return undefined;
        }
        if (this.pendingPersistence.has(sessionId)) {
            return undefined;
        }
        if (job.preserveAudio && job.terminalFailure) {
            return undefined;
        }
        if (job.capture) {
            return this.nextCaptureSyncStep(job);
        }
        if (job.terminalFailure) {
            const run = job.runs.find((candidate)=>candidate.remote !== undefined && candidate.sealed !== true && candidate.remoteCancellationResolved !== true);
            if (run) {
                return {
                    kind: 'cancel',
                    job,
                    run
                };
            }
            const unknownRemoteRun = job.runs.find((candidate)=>candidate.segments.length > 0 && candidate.remote === undefined && candidate.remoteCreationAttempted === true && candidate.remoteCreationResolvedAbsent !== true);
            if (unknownRemoteRun) {
                return {
                    kind: 'recoverRemote',
                    job,
                    run: unknownRemoteRun
                };
            }
            if (job.dismissed) {
                return {
                    kind: 'complete',
                    job
                };
            }
            return undefined;
        }
        for (const run of job.runs){
            if (run.segments.length === 0) {
                continue;
            }
            if (!run.remote) {
                return {
                    kind: 'create',
                    job,
                    run
                };
            }
            const segment = run.segments.find((candidate)=>candidate.status === 'pending');
            if (segment) {
                return {
                    kind: 'segment',
                    job,
                    run,
                    segment
                };
            }
            if (run.endedAtEpochMs !== undefined && run.sealed !== true) {
                return {
                    kind: 'seal',
                    job,
                    run
                };
            }
        }
        if (job.status === 'processing' && job.runs.every((run)=>run.segments.length === 0 || run.sealed === true)) {
            // Legacy runs are independent captures. Finish every upload before inspecting
            // the final run that owns the public recordingId; an older empty run must
            // never cancel a later spoken run in the same recovered local job.
            const last = job.runs.at(-1);
            if (last?.remote && last.sealed && !last.processingResolved) {
                return {
                    kind: 'outcome',
                    job,
                    run: last
                };
            }
            return {
                kind: 'complete',
                job
            };
        }
        return undefined;
    }
    nextCaptureSyncStep(job) {
        const capture = job.capture;
        const run = job.runs.find((candidate)=>candidate.segments.length > 0);
        if (job.terminalFailure) {
            if (run && capture.remote && !capture.sealed && !capture.remoteCancellationResolved) {
                return {
                    kind: 'cancel',
                    job,
                    run
                };
            }
            if (run && !capture.remote && capture.remoteCreationAttempted && !capture.remoteCreationResolvedAbsent) {
                return {
                    kind: 'recoverRemote',
                    job,
                    run
                };
            }
            if (job.dismissed) {
                return {
                    kind: 'complete',
                    job
                };
            }
            return undefined;
        }
        if (run && !capture.remote) {
            return {
                kind: 'create',
                job,
                run
            };
        }
        for (const localRun of job.runs){
            const segment = localRun.segments.find((candidate)=>candidate.status === 'pending');
            if (segment) {
                return {
                    kind: 'segment',
                    job,
                    run: localRun,
                    segment
                };
            }
        }
        if (job.status !== 'processing') {
            return undefined;
        }
        if (run && !capture.sealed) {
            return {
                kind: 'seal',
                job,
                run
            };
        }
        if (run && capture.sealed && !capture.processingResolved) {
            return {
                kind: 'outcome',
                job,
                run
            };
        }
        return {
            kind: 'complete',
            job
        };
    }
    presentSyncStep(step) {
        if (step.kind === 'cancel' || step.kind === 'recoverRemote' || step.kind === 'complete' || step.job.sessionId !== this.currentJobId || step.job.dismissed || this.state.phase !== (/* inlined export .RecordPhase.Processing */"processing")) {
            return;
        }
        if (step.kind === 'outcome') {
            // Sending is complete. Keep observing the result without occupying the composer.
            this.publish((/* inlined export .RecordPhase.Idle */"idle"), 0);
            return;
        }
        const stage = step.kind === 'seal' ? (/* inlined export .RecordProcessingStage.Sealing */"sealing") : (/* inlined export .RecordProcessingStage.Uploading */"uploading");
        if (this.state.processingStage === stage) {
            return;
        }
        this.publish((/* inlined export .RecordPhase.Processing */"processing"), recordJobDurationMs(step.job), 0, stage);
    }
    async applyRemoteCapture(step, remote) {
        const job = this.jobs.get(step.job.sessionId);
        const run = job && findRecordRun(job, step.run.runId);
        if (!job || !run || recordCapture(job, run).remote) {
            return;
        }
        const updated = replaceRecordCapture(job, run, {
            ...recordCapture(job, run),
            remote
        });
        await this.store.save(updated);
        this.jobs.set(updated.sessionId, updated);
        if (updated.sessionId === this.currentJobId && !updated.dismissed && this.belongsToCurrentAccount(updated)) {
            if (this.state.phase === (/* inlined export .RecordPhase.Failed */"failed")) {
                this.failCurrent(this.state.failure);
                return;
            }
            this.publish(this.state.phase, this.state.durationMs, this.state.level, this.state.processingStage);
        }
    }
    async markRemoteCreationAttempted(step) {
        const job = this.jobs.get(step.job.sessionId);
        const run = job && findRecordRun(job, step.run.runId);
        if (!job || !run || recordCapture(job, run).remote || recordCapture(job, run).remoteCreationAttempted && !recordCapture(job, run).remoteCreationResolvedAbsent) {
            return;
        }
        const { remoteCreationResolvedAbsent: _resolvedAbsent, ...attemptedRun } = recordCapture(job, run);
        const updated = replaceRecordCapture(job, run, {
            ...attemptedRun,
            remoteCreationAttempted: true
        });
        await this.store.save(updated);
        this.jobs.set(updated.sessionId, updated);
    }
    async markSegmentCommitted(step) {
        const job = this.jobs.get(step.job.sessionId);
        const run = job && findRecordRun(job, step.run.runId);
        if (!job || !run) {
            return;
        }
        const segments = run.segments.map((segment)=>{
            if (segment.sequenceNo !== step.segment.sequenceNo || segment.contentSha256 !== step.segment.contentSha256) {
                return segment;
            }
            return {
                ...segment,
                status: 'committed'
            };
        });
        const updated = replaceRecordRun(job, {
            ...run,
            segments
        });
        await this.store.save(updated);
        this.jobs.set(updated.sessionId, updated);
        this.logUploadProgress(updated, step.run.runId);
    }
    async markRunSealed(step) {
        const job = this.jobs.get(step.job.sessionId);
        const run = job && findRecordRun(job, step.run.runId);
        if (!job || !run) {
            return;
        }
        const updated = replaceRecordCapture(job, run, {
            ...recordCapture(job, run),
            sealed: true
        });
        this.jobs.set(updated.sessionId, updated);
        await this.store.save(updated);
    }
    async acceptProcessingOutcome(step, outcome) {
        const job = this.jobs.get(step.job.sessionId);
        const run = job && findRecordRun(job, step.run.runId);
        if (!job || !run || job.terminalFailure || !this.belongsToCurrentAccount(job)) {
            return;
        }
        if (outcome === 'pending') {
            if (await this.prepareProcessingOutcomeRead(step)) {
                this.scheduleRetry(job.sessionId, 5000);
            }
            return;
        }
        if (outcome === 'ready') {
            const updated = replaceRecordCapture(job, run, {
                ...recordCapture(job, run),
                processingResolved: true
            });
            await this.store.save(updated);
            this.jobs.set(updated.sessionId, updated);
            return;
        }
        const failure = {
            code: base_InterfaceErrorCode.Unavailable,
            message: outcome === 'no-usable-speech' ? 'No speech was detected in this recording. Check your microphone and record again.' : 'The recording could not be processed. Open Audio Notes to review it.',
            retryable: false,
            ...outcome === 'no-usable-speech' ? {
                reason: base_RecordFailureReason.NoUsableSpeech
            } : {}
        };
        const failed = await this.persistTerminalFailure(job, failure);
        this.diagnostics.record('processing_failed', {
            job: failed,
            run
        }, {
            ...failure.reason === undefined ? {} : {
                failureReason: failure.reason
            }
        });
        if (this.currentJobId === failed.sessionId && !failed.dismissed && this.belongsToCurrentAccount(failed)) {
            this.failCurrent(failed.terminalFailure);
        }
    }
    async prepareProcessingOutcomeRead(step) {
        let job = this.jobs.get(step.job.sessionId);
        if (!job || job.terminalFailure || !this.belongsToCurrentAccount(job)) {
            return false;
        }
        if (job.processingWaitStartedAtEpochMs === undefined) {
            job = {
                ...job,
                processingWaitStartedAtEpochMs: Date.now()
            };
            try {
                await this.store.save(job);
            } catch (error) {
                throw this.localStorageError(error, 'Recording processing recovery could not be persisted.');
            }
            this.jobs.set(job.sessionId, job);
        }
        if (!this.belongsToCurrentAccount(job)) {
            return false;
        }
        if (Date.now() - job.processingWaitStartedAtEpochMs < (/* inlined export .RECORD_PROCESSING_WAIT_TIMEOUT_MS */600000)) {
            return true;
        }
        if (this.currentJobId === job.sessionId && !job.dismissed) {
            this.failCurrent({
                code: base_InterfaceErrorCode.Unavailable,
                message: 'Recording processing status is unavailable. Try checking again or dismiss this message.',
                retryable: true
            });
        }
        return false;
    }
    async markRemoteCancellationResolved(step) {
        const job = this.jobs.get(step.job.sessionId);
        const run = job && findRecordRun(job, step.run.runId);
        if (!job || !run || recordCapture(job, run).remoteCancellationResolved) {
            return;
        }
        const updated = replaceRecordCapture(job, run, {
            ...recordCapture(job, run),
            remoteCancellationResolved: true
        });
        await this.store.save(updated);
        this.jobs.set(updated.sessionId, updated);
    }
    async refreshSegmentIdempotency(step, countIntegrityFailure) {
        const job = this.jobs.get(step.job.sessionId);
        const run = job && findRecordRun(job, step.run.runId);
        if (!job || !run) {
            return;
        }
        const segments = run.segments.map((segment)=>{
            if (segment.sequenceNo !== step.segment.sequenceNo || segment.contentSha256 !== step.segment.contentSha256) {
                return segment;
            }
            return {
                ...segment,
                prepareIdempotencyKey: (0,external_node_crypto_namespaceObject.randomUUID)(),
                commitIdempotencyKey: (0,external_node_crypto_namespaceObject.randomUUID)(),
                uploadGeneration: segment.uploadGeneration + 1,
                integrityFailureCount: segment.integrityFailureCount + (countIntegrityFailure ? 1 : 0)
            };
        });
        const updated = replaceRecordRun(job, {
            ...run,
            segments
        });
        this.jobs.set(updated.sessionId, updated);
        await this.store.save(updated);
    }
    async completeJob(jobSnapshot) {
        const job = this.jobs.get(jobSnapshot.sessionId);
        if (!job || this.nextSyncStep(job.sessionId)?.kind !== 'complete') {
            return;
        }
        try {
            await this.store.remove(job);
        } catch  {
            this.logger.warn('record.storage', 'a completed recording could not be cleaned up locally');
        }
        this.jobs.delete(job.sessionId);
        if (this.currentJobId === job.sessionId) {
            this.currentJobId = undefined;
            this.publish((/* inlined export .RecordPhase.Idle */"idle"), 0);
        }
    }
    uploadFailure(job, error) {
        const failure = toRecordFailure(error);
        if ((job.status !== 'processing' || this.hasPendingUpload(job)) && error instanceof RecordBackendError && !error.segmentIntegrityFailure) {
            return {
                ...failure,
                retryable: true
            };
        }
        return failure;
    }
    async acceptSynchronizationFailure(sessionId, error, stage = 'synchronization') {
        let job = this.jobs.get(sessionId);
        if (!job || job.terminalFailure) {
            return;
        }
        if (isTransientRecordStorageError(error)) {
            this.deferLocalPersistence(job, error);
            return;
        }
        const failure = this.uploadFailure(job, error);
        this.synchronizeAgain.delete(sessionId);
        const run = job.runs.find((candidate)=>candidate.sealed !== true);
        if (run) {
            this.diagnostics.record('sync_failed', {
                job,
                run
            }, {
                error,
                stage
            });
        }
        this.logger.warn('record.upload', `recording sync stopped with ${failure.code}`);
        if (!failure.retryable) {
            job = await this.persistTerminalFailure(job, failure, true);
            if (!job.dismissed && this.currentJobId === job.sessionId && this.belongsToCurrentAccount(job)) {
                await this.stopForTerminalFailure(error);
            }
            return;
        }
        if (this.hasPendingUpload(job) && this.belongsToCurrentAccount(job)) {
            const attempts = job.uploadRecovery?.attempts ?? 0;
            await this.saveUploadRecovery(job, {
                attempts,
                stopped: attempts >= (/* inlined export .RECORD_UPLOAD_MAX_RETRIES */10),
                ...attempts < (/* inlined export .RECORD_UPLOAD_MAX_RETRIES */10) ? {
                    retryAtEpochMs: Date.now() + (/* inlined export .RECORD_UPLOAD_RETRY_INTERVAL_MS */1000)
                } : {}
            });
            await this.updateUploadRecovery(this.jobs.get(job.sessionId));
            this.presentUploadRecovery(this.jobs.get(job.sessionId));
            return;
        }
        if (this.belongsToCurrentAccount(job)) {
            const attempts = (this.uploadRetryAttempts.get(job.sessionId) ?? 0) + 1;
            this.uploadRetryAttempts.set(job.sessionId, attempts);
            this.scheduleRetry(job.sessionId, Math.min((/* inlined export .RECORD_RETRY_DELAY_MS */30000), 1000 * 2 ** Math.min(attempts - 1, 5)));
        }
    }
    async acceptRemoteCancellationFailure(step, error) {
        const job = this.jobs.get(step.job.sessionId);
        if (!job?.terminalFailure) {
            return false;
        }
        if (error instanceof RecordBackendError && (error.code === base_InterfaceErrorCode.NotFound || error.businessCode === 'voice_capture.cancelled')) {
            await this.markRemoteCancellationResolved(step);
            return true;
        }
        const failure = toRecordFailure(error);
        this.logger.warn('record.upload', `recording cleanup stopped with ${failure.code}`);
        if (failure.retryable) {
            this.scheduleRetry(job.sessionId);
        }
        return false;
    }
    async acceptDefinitiveRemoteCreationRejection(step, error) {
        const attemptedCapture = recordCapture(step.job, step.run);
        if (attemptedCapture.remoteCreationAttempted === true && attemptedCapture.remoteCreationResolvedAbsent !== true || !(error instanceof RecordBackendError) || !error.requestDefinitelyRejected) {
            return false;
        }
        const job = this.jobs.get(step.job.sessionId);
        const run = job && findRecordRun(job, step.run.runId);
        const failure = this.uploadFailure(job ?? step.job, error);
        if (!job || !run || recordCapture(job, run).remote || recordCapture(job, run).remoteCreationResolvedAbsent) {
            return false;
        }
        const resolved = replaceRecordCapture(job, run, {
            ...recordCapture(job, run),
            remoteCreationAttempted: true,
            remoteCreationResolvedAbsent: true
        });
        const terminalFailure = job.terminalFailure ?? (failure.retryable ? undefined : {
            ...failure,
            retryable: false
        });
        const updated = terminalFailure ? {
            ...resolved,
            terminalFailure
        } : resolved;
        if (!terminalFailure) {
            await this.store.save(updated);
            this.jobs.set(updated.sessionId, updated);
            return false;
        }
        this.jobs.set(updated.sessionId, updated);
        try {
            await this.store.save(updated);
        } catch  {
            this.diagnostics.reportFault('record.storage', 'the rejected remote creation could not be persisted');
        }
        const timer = this.retryTimers.get(job.sessionId);
        if (timer) {
            clearTimeout(timer);
            this.retryTimers.delete(job.sessionId);
        }
        this.triggerSynchronization(updated.sessionId);
        if (!job.terminalFailure && !updated.dismissed && this.currentJobId === updated.sessionId && this.belongsToCurrentAccount(updated)) {
            await this.stopForTerminalFailure(error);
        }
        return true;
    }
    acceptRemoteRecoveryFailure(sessionId, error) {
        const job = this.jobs.get(sessionId);
        if (!job?.terminalFailure) {
            return;
        }
        const failure = toRecordFailure(error);
        this.logger.warn('record.upload', `recording cleanup recovery stopped with ${failure.code}`);
        if (failure.retryable) {
            this.scheduleRetry(job.sessionId);
        }
    }
    async stopForTerminalFailure(error) {
        this.clearCaptureRecovery();
        const durationMs = this.currentDurationMs();
        if (this.state.phase === (/* inlined export .RecordPhase.Recording */"recording") && this.activeRunClock) {
            let stopped;
            try {
                stopped = await this.stopCaptureForCleanup(this.activeRunClock.runId);
            } catch  {
                this.logger.warn('record.capture', 'native capture could not stop after a terminal failure');
                return;
            }
            if (stopped.kind === 'completed' && stopped.finalSegment) {
                try {
                    await this.acceptSegmentWithRecovery(stopped.finalSegment, false);
                } catch  {
                    this.diagnostics.reportFault('record.capture', 'the final failed recording segment could not be stored');
                }
            }
            try {
                await this.closeCurrentRun('encoderRestart', 'processing', false);
            } catch  {
                this.diagnostics.reportFault('record.capture', 'the terminal recording state could not be persisted');
            }
            this.activeRunClock = undefined;
        }
        this.failCurrent(error, {
            durationMs
        });
    }
    scheduleRetry(sessionId, delayMs = (/* inlined export .RECORD_RETRY_DELAY_MS */30000)) {
        if (this.retryTimers.has(sessionId) || this.disposed) {
            return;
        }
        const timer = setTimeout(()=>{
            this.retryTimers.delete(sessionId);
            this.triggerSynchronization(sessionId);
        }, delayMs);
        timer.unref();
        this.retryTimers.set(sessionId, timer);
        const job = this.jobs.get(sessionId);
        const run = job?.runs.find((candidate)=>candidate.sealed !== true);
        if (job && run) {
            this.diagnostics.record('retry_scheduled', {
                job,
                run
            }, {
                retryDelayMs: delayMs
            });
        }
    }
    recordCaptureDiagnostic(event, job, error, fields = {}) {
        const run = job.runs.at(-1);
        if (run) {
            this.diagnostics.record(event, {
                job,
                run
            }, {
                stage: event === 'storage_failed' ? 'storage' : event === 'capture_stop_failed' ? 'finalizing' : 'capture',
                attempt: this.captureRecoveryAttempts,
                error,
                ...fields
            });
        }
    }
    logUploadProgress(job, runId) {
        const run = findRecordRun(job, runId);
        if (!run) {
            return;
        }
        const segments = job.runs.flatMap((candidate)=>candidate.segments);
        const committed = segments.filter((segment)=>segment.status === 'committed');
        this.diagnostics.record('queue_progress', {
            job,
            run
        }, {
            totalSegments: segments.length,
            committedSegments: committed.length,
            pendingSegments: segments.length - committed.length,
            totalBytes: segments.reduce((total, segment)=>total + segment.contentLength, 0),
            committedBytes: committed.reduce((total, segment)=>total + segment.contentLength, 0),
            activeUploads: this.activeSegmentUploads,
            concurrency: (/* inlined export .RECORD_UPLOAD_CONCURRENCY */2)
        });
    }
    segmentKey(step) {
        return `${step.run.runId}:${step.segment.sequenceNo}`;
    }
    hasPendingUpload(job) {
        if (job.status !== 'processing' || job.terminalFailure) {
            return false;
        }
        if (job.capture) {
            return !job.capture.sealed && !job.capture.remoteCancellationResolved;
        }
        return job.runs.some((run)=>run.segments.length > 0 && !run.sealed);
    }
    clearRetry(sessionId) {
        const timer = this.retryTimers.get(sessionId);
        if (timer) {
            clearTimeout(timer);
            this.retryTimers.delete(sessionId);
        }
        this.synchronizeAgain.delete(sessionId);
    }
    async saveUploadRecovery(job, uploadRecovery) {
        const updated = {
            ...job,
            uploadRecovery
        };
        // Keep cancellation authoritative even when storage fails. The error is reported by
        // the owning action; nothing may resume this in-memory job behind the user's back.
        this.jobs.set(updated.sessionId, updated);
        try {
            await this.store.save(updated);
        } catch (error) {
            if (isTransientRecordStorageError(error)) {
                this.deferLocalPersistence(updated, error);
                throw this.localStorageError(error, 'Recording upload recovery could not be saved.');
            }
            const failure = this.localStorageError(error, 'Recording upload recovery could not be saved.');
            const failed = await this.persistTerminalFailure(updated, toRecordFailure(failure), true);
            this.recordCaptureDiagnostic('storage_failed', updated, error);
            if (!failed.dismissed && failed.sessionId === this.currentJobId && this.belongsToCurrentAccount(failed)) {
                this.failCurrent(failed.terminalFailure);
            }
            throw failure;
        }
        return updated;
    }
    presentUploadRecovery(job) {
        if (job.sessionId !== this.currentJobId || job.dismissed || !this.belongsToCurrentAccount(job)) {
            return false;
        }
        const recovery = job.uploadRecovery;
        if (!recovery || !this.hasPendingUpload(job)) {
            return false;
        }
        if (recovery.stopped) {
            this.failCurrent({
                code: base_InterfaceErrorCode.NetworkError,
                message: 'The recording could not be uploaded. Check your connection and try again.',
                reason: base_RecordFailureReason.UploadFailed,
                retryable: true
            });
            return true;
        }
        if (recovery.offlineSinceEpochMs !== undefined || recovery.retryAtEpochMs !== undefined) {
            if (this.state.processingStage !== (/* inlined export .RecordProcessingStage.Retrying */"retrying")) {
                this.publish((/* inlined export .RecordPhase.Processing */"processing"), recordJobDurationMs(job), 0, (/* inlined export .RecordProcessingStage.Retrying */"retrying"));
            }
            return true;
        }
        return false;
    }
    async updateUploadRecovery(job) {
        let recovery = job.uploadRecovery;
        const now = Date.now();
        if (!this.hasPendingUpload(job)) {
            return true;
        }
        if (recovery?.stopped) {
            return false;
        }
        // Check the durable deadline before online: a late restoration cannot revive an
        // expired attempt, including after sleep or a process restart.
        if (recovery?.offlineSinceEpochMs !== undefined && now - recovery.offlineSinceEpochMs >= (/* inlined export .RECORD_UPLOAD_OFFLINE_TIMEOUT_MS */30000)) {
            this.uploadControllers.get(job.sessionId)?.abort();
            this.clearRetry(job.sessionId);
            await this.saveUploadRecovery(job, {
                attempts: recovery.attempts,
                stopped: true
            });
            this.presentUploadRecovery(this.jobs.get(job.sessionId));
            return false;
        }
        if (!this.recoveryMonitor.online) {
            if (recovery?.offlineSinceEpochMs === undefined) {
                this.uploadControllers.get(job.sessionId)?.abort();
                this.clearRetry(job.sessionId);
                job = await this.saveUploadRecovery(job, {
                    attempts: recovery?.attempts ?? 0,
                    stopped: false,
                    offlineSinceEpochMs: now
                });
            }
            this.presentUploadRecovery(job);
            return false;
        }
        if (recovery?.offlineSinceEpochMs !== undefined) {
            job = await this.saveUploadRecovery(job, {
                attempts: recovery.attempts,
                stopped: recovery.attempts >= (/* inlined export .RECORD_UPLOAD_MAX_RETRIES */10),
                retryAtEpochMs: now
            });
            recovery = job.uploadRecovery;
        }
        if (recovery?.stopped || (recovery?.retryAtEpochMs ?? 0) > now) {
            this.presentUploadRecovery(job);
            return false;
        }
        return true;
    }
    async monitorUploadRecovery() {
        if (this.disposed || this.recoveryTickPending) {
            return;
        }
        this.recoveryTickPending = true;
        let recoveryJob;
        try {
            await this.actions.run(async ()=>{
                for (const [sessionId, pending] of this.pendingPersistence){
                    const job = this.jobs.get(sessionId);
                    if (!job || job.terminalFailure && !job.preserveAudio || !this.belongsToCurrentAccount(job) || pending.retryAtEpochMs > Date.now()) {
                        continue;
                    }
                    try {
                        await this.flushPendingPersistence(sessionId);
                        const recovered = this.jobs.get(sessionId);
                        if (recovered?.terminalFailure && this.currentJobId === sessionId && this.state.phase === (/* inlined export .RecordPhase.Failed */"failed")) {
                            this.failCurrent(recovered.terminalFailure);
                        }
                        this.triggerSynchronization(sessionId, true);
                    } catch (error) {
                        if (job.terminalFailure) {
                            continue;
                        }
                        if (!isTransientRecordStorageError(error) || job.status === 'processing' && pending.attempts >= (/* inlined export .RECORD_CAPTURE_STOP_MAX_RETRIES */5)) {
                            const failure = this.localStorageError(error, 'The recorded audio metadata could not be saved.');
                            const failed = await this.persistTerminalFailure(job, toRecordFailure(failure), true);
                            if (this.currentJobId === sessionId) {
                                await this.stopForTerminalFailure(failed.terminalFailure);
                            }
                        }
                    }
                }
                for (const job of this.jobs.values()){
                    if (!this.belongsToCurrentAccount(job) || !this.hasPendingUpload(job) || this.pendingPersistence.has(job.sessionId)) {
                        continue;
                    }
                    recoveryJob = job;
                    if (await this.updateUploadRecovery(job)) {
                        const current = this.jobs.get(job.sessionId);
                        if (current.uploadRecovery?.retryAtEpochMs !== undefined) {
                            this.triggerSynchronization(job.sessionId, true);
                        }
                    }
                }
            });
        } catch (error) {
            this.diagnostics.reportFault('record.storage', 'Recording upload recovery could not be persisted.', !(error instanceof interface_error_InterfaceError && error.terminal && recoveryJob && this.diagnostics.hasReportedFailure('storage_failed', recoveryJob.sessionId)));
        } finally{
            this.recoveryTickPending = false;
        }
    }
    async recover(job) {
        const stored = job;
        job = upgradeLocalRecordJob(job, external_node_crypto_namespaceObject.randomUUID);
        if (job.terminalFailure || job.status === 'processing') {
            if (job !== stored) {
                await this.store.save(job);
            }
            return job;
        }
        let recovered = job;
        const now = Date.now();
        for (const run of job.runs){
            if (run.endedAtEpochMs !== undefined) {
                continue;
            }
            const deviceMonotonicEndMs = run.segments.reduce((endMs, segment)=>{
                return Math.max(endMs, segment.deviceMonotonicStartMs + segment.durationMs);
            }, run.deviceMonotonicStartMs);
            recovered = replaceRecordRun(recovered, {
                ...run,
                endedAtEpochMs: now,
                deviceMonotonicEndMs,
                endReason: 'crashRecovered'
            });
        }
        recovered = {
            ...recovered,
            status: 'processing'
        };
        await this.store.save(recovered);
        return recovered;
    }
    belongsToCurrentAccount(job) {
        return this.account.currentAccountId === job.accountId && this.account.runtimeSnapshot.environment === job.environment;
    }
    async refreshAccountPresentation() {
        for (const [sessionId, controller] of this.uploadControllers){
            const job = this.jobs.get(sessionId);
            if (!job || !this.belongsToCurrentAccount(job)) {
                controller.abort();
            }
        }
        await this.actions.run(async ()=>{
            const currentJob = this.currentJob;
            if (currentJob && this.belongsToCurrentAccount(currentJob)) {
                this.synchronizePendingJobs();
                return;
            }
            if (currentJob) {
                try {
                    await this.finishCurrentJobForAccountTransition();
                } catch (error) {
                    this.diagnostics.reportFault('record.account', 'the previous account recording could not be finalized locally', !(error instanceof interface_error_InterfaceError && error.terminal && this.diagnostics.hasReportedFailure('storage_failed', currentJob.sessionId)));
                    if (this.activeRunClock) {
                        return;
                    }
                }
            }
            this.presentCurrentAccountJob();
            this.synchronizePendingJobs();
        });
    }
    presentCurrentAccountJob() {
        const visible = [
            ...this.jobs.values()
        ].filter((job)=>!job.dismissed && this.belongsToCurrentAccount(job)).at(-1);
        this.currentJobId = visible?.sessionId;
        if (!visible) {
            this.publish((/* inlined export .RecordPhase.Idle */"idle"), 0);
            return;
        }
        if (visible.terminalFailure) {
            this.failCurrent(visible.terminalFailure);
            return;
        }
        if (visible.status === 'paused') {
            this.publish((/* inlined export .RecordPhase.Paused */"paused"), recordJobDurationMs(visible));
            return;
        }
        this.presentProcessingJob(visible);
    }
    presentProcessingJob(job) {
        if (this.presentUploadRecovery(job)) {
            return;
        }
        const step = this.nextSyncStep(job.sessionId);
        if (step?.kind === 'outcome' || step?.kind === 'complete') {
            this.publish((/* inlined export .RecordPhase.Idle */"idle"), 0);
            return;
        }
        this.publish((/* inlined export .RecordPhase.Processing */"processing"), recordJobDurationMs(job), 0, (/* inlined export .RecordProcessingStage.Uploading */"uploading"));
    }
    async persistTerminalFailure(job, failure, preserveAudio = false) {
        const current = this.jobs.get(job.sessionId) ?? job;
        if (current.terminalFailure) {
            this.triggerSynchronization(current.sessionId);
            return current;
        }
        const terminalFailure = {
            ...failure,
            retryable: false
        };
        const updated = {
            ...current,
            terminalFailure,
            ...preserveAudio ? {
                preserveAudio: true
            } : {}
        };
        const timer = this.retryTimers.get(current.sessionId);
        if (timer) {
            clearTimeout(timer);
            this.retryTimers.delete(current.sessionId);
        }
        this.jobs.set(updated.sessionId, updated);
        this.uploadControllers.get(updated.sessionId)?.abort('record-terminal');
        try {
            await this.store.save(updated);
        } catch (error) {
            this.recordCaptureDiagnostic('storage_failed', updated, error);
            this.diagnostics.reportFault('record.storage', 'the terminal recording failure could not be persisted', updated.runs.length === 0);
        }
        this.triggerSynchronization(updated.sessionId);
        return updated;
    }
    constructor(...args){
        super(...args), this.recoveryTickPending = false, this.jobs = new Map(), this.synchronizations = new Map(), this.synchronizeAgain = new Set(), this.retryTimers = new Map(), this.activeSegmentUploads = 0, this.waitingSegmentUploads = [], this.uploadControllers = new Map(), this.subscriptions = [], this.pendingSegmentEvents = new Set(), this.pendingPersistence = new Map(), this.state = createIdleRecordState(), this.captureRecoveryAttempts = 0, this.uploadRetryAttempts = new Map(), this.initialized = false, this.disposed = false;
    }
}
__decorate([
    inject(CROSS_PLATFORM_INTERFACE),
    __metadata("design:type", typeof ICrossPlatformInterface === "undefined" ? Object : ICrossPlatformInterface)
], RecordShellService.prototype, "cpi", void 0);
__decorate([
    inject(CLIENT_NODE_FEATURE_IDS),
    __metadata("design:type", Object)
], RecordShellService.prototype, "featureIds", void 0);
__decorate([
    inject(AccountShellService),
    __metadata("design:type", typeof AccountShellService === "undefined" ? Object : AccountShellService)
], RecordShellService.prototype, "account", void 0);
__decorate([
    inject(SocketShellService),
    __metadata("design:type", typeof Pick === "undefined" ? Object : Pick)
], RecordShellService.prototype, "socket", void 0);
__decorate([
    inject(RecordBackend),
    __metadata("design:type", typeof RecordBackend === "undefined" ? Object : RecordBackend)
], RecordShellService.prototype, "backend", void 0);
__decorate([
    inject(RecordStore),
    __metadata("design:type", typeof RecordStore === "undefined" ? Object : RecordStore)
], RecordShellService.prototype, "store", void 0);
__decorate([
    inject(SerialTask),
    __metadata("design:type", typeof SerialTask === "undefined" ? Object : SerialTask)
], RecordShellService.prototype, "actions", void 0);
__decorate([
    inject(AdapterLogger),
    __metadata("design:type", typeof AdapterLogger === "undefined" ? Object : AdapterLogger)
], RecordShellService.prototype, "logger", void 0);
__decorate([
    inject(RecordDiagnostics),
    __metadata("design:type", typeof RecordDiagnostics === "undefined" ? Object : RecordDiagnostics)
], RecordShellService.prototype, "diagnostics", void 0);
__decorate([
    inject(RecordLiveState),
    __metadata("design:type", typeof RecordLiveState === "undefined" ? Object : RecordLiveState)
], RecordShellService.prototype, "liveState", void 0);
__decorate([
    inject(RecordScheduledOffers),
    __metadata("design:type", typeof RecordScheduledOffers === "undefined" ? Object : RecordScheduledOffers)
], RecordShellService.prototype, "scheduledOffers", void 0);
__decorate([
    inject(RecordStartRequests),
    __metadata("design:type", typeof RecordStartRequests === "undefined" ? Object : RecordStartRequests)
], RecordShellService.prototype, "startRequests", void 0);
__decorate([
    inject(RecordUploadRecoveryMonitor),
    __metadata("design:type", typeof RecordUploadRecoveryMonitor === "undefined" ? Object : RecordUploadRecoveryMonitor)
], RecordShellService.prototype, "recoveryMonitor", void 0);
__decorate([
    inject(RecordAudioExport),
    __metadata("design:type", typeof RecordAudioExport === "undefined" ? Object : RecordAudioExport)
], RecordShellService.prototype, "audioExport", void 0);
RecordShellService = __decorate([
    injectable()
], RecordShellService);
