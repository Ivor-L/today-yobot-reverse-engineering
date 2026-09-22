// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/record/utils.ts.
// The original TypeScript and import graph are not restored.



const recordCapture = (job, run)=>{
    if (job.capture) {
        return job.capture;
    }
    if (run.createIdempotencyKey && run.sealIdempotencyKey) {
        return {
            ...run,
            createIdempotencyKey: run.createIdempotencyKey,
            sealIdempotencyKey: run.sealIdempotencyKey
        };
    }
    throw interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'The recording capture state is unavailable.');
};
const replaceRecordCapture = (job, run, capture)=>{
    if (job.capture) {
        return {
            ...job,
            capture
        };
    }
    return replaceRecordRun(job, {
        ...run,
        ...capture
    });
};
const recordUploadSequenceNo = (job, run, sequenceNo)=>{
    return sequenceNo + (job.capture ? run.sequenceNoOffset ?? 0 : 0);
};
const nextRecordSequenceNo = (job)=>{
    return job.runs.reduce((next, run)=>Math.max(next, run.sequenceNoOffset ?? 0, ...run.segments.map((segment)=>recordUploadSequenceNo(job, run, segment.sequenceNo) + 1)), 0);
};
const recordJobCaptureId = (job)=>{
    return job?.capture?.remote?.captureId ?? job?.runs.at(-1)?.remote?.captureId;
};
const upgradeLocalRecordJob = (job, createIdempotencyKey)=>{
    if (job.schemaVersion !== 1 || job.runs.some((run)=>run.remote || run.remoteCreationAttempted || run.sealed || run.remoteCancellationResolved || run.segments.some((segment)=>segment.status === 'committed'))) {
        return job;
    }
    let nextSequenceNo = 0;
    const runs = job.runs.map((run)=>{
        const { createIdempotencyKey: _createKey, sealIdempotencyKey: _sealKey, remote: _remote, sealed: _sealed, remoteCreationAttempted: _attempted, remoteCreationResolvedAbsent: _absent, remoteCancellationResolved: _cancelled, ...local } = run;
        const sequenceNoOffset = nextSequenceNo;
        nextSequenceNo += run.segments.reduce((next, segment)=>Math.max(next, segment.sequenceNo + 1), 0);
        return {
            ...local,
            sequenceNoOffset
        };
    });
    const first = job.runs.find((run)=>run.segments.length > 0) ?? job.runs[0];
    return {
        ...job,
        schemaVersion: 2,
        runs,
        capture: {
            startedAtEpochMs: first?.startedAtEpochMs ?? job.startedAtEpochMs,
            deviceMonotonicStartMs: first?.deviceMonotonicStartMs ?? 0,
            createIdempotencyKey: first?.createIdempotencyKey ?? createIdempotencyKey(),
            sealIdempotencyKey: first?.sealIdempotencyKey ?? createIdempotencyKey()
        }
    };
};
const audioCaptureFailureInterfaceErrorCode = (code)=>{
    switch(code){
        case cpi_AudioCaptureFailureCode.ResourceExhausted:
            return base_InterfaceErrorCode.ResourceExhausted;
        case cpi_AudioCaptureFailureCode.Internal:
            return base_InterfaceErrorCode.Internal;
        case cpi_AudioCaptureFailureCode.Unavailable:
            return base_InterfaceErrorCode.Unavailable;
    }
};
const createIdleRecordState = ()=>{
    return {
        revision: 0,
        phase: (/* inlined export .RecordPhase.Idle */"idle"),
        durationMs: 0,
        updatedAtEpochMs: Date.now(),
        level: 0
    };
};
const recordJobDurationMs = (job)=>{
    return job.runs.reduce((total, run)=>{
        return total + run.segments.reduce((duration, segment)=>duration + segment.durationMs, 0);
    }, 0);
};
const findRecordRun = (job, runId)=>{
    return job.runs.find((run)=>run.runId === runId);
};
const replaceRecordRun = (job, replacement)=>{
    return {
        ...job,
        runs: job.runs.map((run)=>run.runId === replacement.runId ? replacement : run)
    };
};
const mergeRecordSegment = (job, event, createIdempotencyKey)=>{
    const run = findRecordRun(job, event.runId);
    if (!run) {
        return job;
    }
    const existing = run.segments.find((segment)=>segment.sequenceNo === event.sequenceNo);
    if (existing) {
        if (existing.contentSha256 !== event.contentSha256) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'The native audio provider finalized conflicting segment metadata.');
        }
        return job;
    }
    const segment = {
        ...event,
        prepareIdempotencyKey: createIdempotencyKey(),
        commitIdempotencyKey: createIdempotencyKey(),
        uploadGeneration: 0,
        integrityFailureCount: 0,
        status: 'pending'
    };
    const segments = [
        ...run.segments,
        segment
    ].sort((left, right)=>left.sequenceNo - right.sequenceNo);
    let startedAtEpochMs = run.startedAtEpochMs;
    let deviceMonotonicStartMs = run.deviceMonotonicStartMs;
    if (event.sequenceNo === 0) {
        startedAtEpochMs = event.capturedAtEpochMs;
        deviceMonotonicStartMs = event.deviceMonotonicStartMs;
    }
    const deviceMonotonicEndMs = run.endedAtEpochMs === undefined ? run.deviceMonotonicEndMs : Math.max(run.deviceMonotonicEndMs ?? run.deviceMonotonicStartMs, event.deviceMonotonicStartMs + event.durationMs);
    const updated = replaceRecordRun(job, {
        ...run,
        startedAtEpochMs,
        deviceMonotonicStartMs,
        ...deviceMonotonicEndMs === undefined ? {} : {
            deviceMonotonicEndMs
        },
        segments
    });
    if (job.capture && !job.capture.remoteCreationAttempted && recordUploadSequenceNo(job, run, event.sequenceNo) === 0) {
        return {
            ...updated,
            capture: {
                ...job.capture,
                startedAtEpochMs,
                deviceMonotonicStartMs
            }
        };
    }
    return updated;
};
const toRecordFailure = (error)=>{
    if (isRecordFailureDetails(error)) {
        return {
            code: error.code,
            message: error.message,
            retryable: error.retryable,
            ...error.reason === undefined ? {} : {
                reason: error.reason
            }
        };
    }
    if (error instanceof interface_error_InterfaceError || isInterfaceFailureDetails(error)) {
        return {
            code: error.code,
            message: error.message,
            retryable: !error.terminal
        };
    }
    return {
        code: base_InterfaceErrorCode.Internal,
        message: 'The recording could not be sent.',
        retryable: true
    };
};
const isInterfaceFailureDetails = (error)=>{
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    const code = Reflect.get(error, 'code');
    return Object.values(base_InterfaceErrorCode).some((candidate)=>candidate === code) && typeof Reflect.get(error, 'message') === 'string' && typeof Reflect.get(error, 'terminal') === 'boolean';
};
const isRecordFailureDetails = (error)=>{
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    const code = Reflect.get(error, 'code');
    const message = Reflect.get(error, 'message');
    const retryable = Reflect.get(error, 'retryable');
    return Object.values(base_InterfaceErrorCode).some((candidate)=>candidate === code) && typeof message === 'string' && typeof retryable === 'boolean';
};
const makeRecordState = (previous, phase, durationMs, options = {})=>{
    const { failure, level = 0, processingStage, recordingId, warning, canExportAudio } = options;
    const state = {
        revision: previous.revision + 1,
        phase,
        durationMs: Math.max(0, Math.round(durationMs)),
        updatedAtEpochMs: Date.now(),
        level: Math.max(0, Math.min(1, level))
    };
    if (phase !== (/* inlined export .RecordPhase.Idle */"idle") && recordingId !== undefined) {
        state.recordingId = recordingId;
    }
    if (phase === (/* inlined export .RecordPhase.Processing */"processing")) {
        state.processingStage = processingStage ?? (/* inlined export .RecordProcessingStage.Uploading */"uploading");
    }
    if (phase === (/* inlined export .RecordPhase.Failed */"failed") && failure) {
        state.failure = failure;
        state.canExportAudio = canExportAudio ?? false;
    }
    if ((phase === (/* inlined export .RecordPhase.Recording */"recording") || phase === (/* inlined export .RecordPhase.Paused */"paused")) && warning !== undefined) {
        state.warning = warning;
    }
    return state;
};
