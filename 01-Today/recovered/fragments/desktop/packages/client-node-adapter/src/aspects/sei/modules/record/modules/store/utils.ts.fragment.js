// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/record/modules/store/utils.ts.
// The original TypeScript and import graph are not restored.




const RECORD_JOB_STATUSES = [
    'capturing',
    'paused',
    'processing'
];
const RECORD_RUN_END_REASONS = [
    'userStopped',
    'encoderRestart',
    'deviceShutdown',
    'crashRecovered'
];
const RECORD_SEGMENT_STATUSES = [
    'pending',
    'committed'
];
const isRecordJobStatus = (value)=>{
    return RECORD_JOB_STATUSES.some((candidate)=>candidate === value);
};
const isRecordRunEndReason = (value)=>{
    return RECORD_RUN_END_REASONS.some((candidate)=>candidate === value);
};
const isRecordSegmentStatus = (value)=>{
    return RECORD_SEGMENT_STATUSES.some((candidate)=>candidate === value);
};
const utils_isObject = (value)=>{
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};
const isSafeString = (value)=>{
    return typeof value === 'string' && value.length > 0 && value.trim() === value;
};
const isNonNegativeInteger = (value)=>{
    return Number.isSafeInteger(value) && typeof value === 'number' && value >= 0;
};
const isNonNegativeFiniteNumber = (value)=>{
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
};
const isPositiveFiniteNumber = (value)=>{
    return isNonNegativeFiniteNumber(value) && value > 0;
};
const utils_isRuntimeEnvironment = (value)=>{
    return Object.values(base_RuntimeEnvironment).some((environment)=>environment === value);
};
const isInterfaceErrorCode = (value)=>{
    return Object.values(base_InterfaceErrorCode).some((code)=>code === value);
};
const parseTerminalFailure = (value)=>{
    if (!utils_isObject(value)) {
        return undefined;
    }
    const { code, message, retryable, reason } = value;
    if (!isInterfaceErrorCode(code) || !isSafeString(message) || retryable !== false) {
        return undefined;
    }
    if (reason !== undefined && !Object.values(base_RecordFailureReason).some((candidate)=>candidate === reason)) {
        return undefined;
    }
    return {
        code,
        message,
        retryable,
        ...reason === undefined ? {} : {
            reason: reason
        }
    };
};
const parseRemoteCapture = (value)=>{
    if (!utils_isObject(value)) {
        return undefined;
    }
    const { captureId, nextSequenceNo, streamId } = value;
    if (!isSafeString(captureId) || !isSafeString(streamId) || !isNonNegativeInteger(nextSequenceNo)) {
        return undefined;
    }
    return {
        captureId,
        nextSequenceNo,
        streamId
    };
};
const parseRecordSegment = (value)=>{
    if (!utils_isObject(value)) {
        return undefined;
    }
    const { capturedAtEpochMs, commitIdempotencyKey, contentLength, contentSha256, contentType, deviceMonotonicStartMs, durationMs, fileName, integrityFailureCount, prepareIdempotencyKey, runId, sequenceNo, status, uploadGeneration } = value;
    if (!isSafeString(runId) || !isNonNegativeInteger(sequenceNo) || !isSafeRecordSegmentFileName(fileName) || integrityFailureCount !== undefined && !isNonNegativeInteger(integrityFailureCount) || !isNonNegativeFiniteNumber(capturedAtEpochMs) || !isNonNegativeFiniteNumber(deviceMonotonicStartMs) || !isPositiveFiniteNumber(durationMs) || contentType !== 'audio/flac' && contentType !== 'audio/ogg' || !isNonNegativeInteger(contentLength) || typeof contentSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(contentSha256) || !isSafeString(prepareIdempotencyKey) || !isSafeString(commitIdempotencyKey) || uploadGeneration !== undefined && !isNonNegativeInteger(uploadGeneration) || !isRecordSegmentStatus(status)) {
        return undefined;
    }
    return {
        capturedAtEpochMs,
        commitIdempotencyKey,
        contentLength,
        contentSha256,
        contentType,
        deviceMonotonicStartMs,
        durationMs,
        fileName,
        integrityFailureCount: integrityFailureCount ?? 0,
        prepareIdempotencyKey,
        runId,
        sequenceNo,
        status,
        uploadGeneration: uploadGeneration ?? 0
    };
};
const parseRecordRun = (value, legacy)=>{
    if (!utils_isObject(value)) {
        return undefined;
    }
    const { createIdempotencyKey, deviceMonotonicEndMs, deviceMonotonicStartMs, endedAtEpochMs, endReason, remote: remoteValue, remoteCreationAttempted, remoteCreationResolvedAbsent, remoteCancellationResolved, runId, sealIdempotencyKey, sealed, processingResolved, segments: segmentValues, startedAtEpochMs, sequenceNoOffset } = value;
    if (!isSafeString(runId) || !isNonNegativeFiniteNumber(startedAtEpochMs) || !isNonNegativeFiniteNumber(deviceMonotonicStartMs) || legacy && (!isSafeString(createIdempotencyKey) || !isSafeString(sealIdempotencyKey)) || !legacy && (!isNonNegativeInteger(sequenceNoOffset) || createIdempotencyKey !== undefined || sealIdempotencyKey !== undefined || remoteValue !== undefined || sealed !== undefined || remoteCreationAttempted !== undefined || remoteCreationResolvedAbsent !== undefined || remoteCancellationResolved !== undefined) || !Array.isArray(segmentValues)) {
        return undefined;
    }
    const segments = segmentValues.map(parseRecordSegment);
    if (segments.some((segment)=>segment === undefined)) {
        return undefined;
    }
    if (segments.some((segment)=>segment?.runId !== runId)) {
        return undefined;
    }
    const run = {
        runId,
        startedAtEpochMs,
        deviceMonotonicStartMs,
        ...legacy ? {
            createIdempotencyKey: createIdempotencyKey,
            sealIdempotencyKey: sealIdempotencyKey
        } : {
            sequenceNoOffset: sequenceNoOffset
        },
        segments: segments
    };
    if (remoteValue !== undefined) {
        const remote = parseRemoteCapture(remoteValue);
        if (!remote) {
            return undefined;
        }
        run.remote = remote;
    }
    if (remoteCreationAttempted !== undefined) {
        if (remoteCreationAttempted !== true || segments.length === 0) {
            return undefined;
        }
        run.remoteCreationAttempted = true;
    }
    if (remoteCreationResolvedAbsent !== undefined) {
        if (remoteCreationResolvedAbsent !== true || remoteCreationAttempted !== true || remoteValue !== undefined) {
            return undefined;
        }
        run.remoteCreationResolvedAbsent = true;
    }
    if (remoteCancellationResolved !== undefined) {
        if (remoteCancellationResolved !== true || !run.remote) {
            return undefined;
        }
        run.remoteCancellationResolved = true;
    }
    if (endedAtEpochMs !== undefined) {
        if (!isNonNegativeFiniteNumber(endedAtEpochMs)) {
            return undefined;
        }
        run.endedAtEpochMs = endedAtEpochMs;
    }
    if (deviceMonotonicEndMs !== undefined) {
        if (!isNonNegativeFiniteNumber(deviceMonotonicEndMs)) {
            return undefined;
        }
        run.deviceMonotonicEndMs = deviceMonotonicEndMs;
    }
    if (endReason !== undefined) {
        if (!isRecordRunEndReason(endReason)) {
            return undefined;
        }
        run.endReason = endReason;
    }
    if (sealed !== undefined) {
        if (typeof sealed !== 'boolean') {
            return undefined;
        }
        run.sealed = sealed;
    }
    if (processingResolved !== undefined) {
        if (!legacy || processingResolved !== true || !sealed) {
            return undefined;
        }
        run.processingResolved = true;
    }
    return run;
};
const parseJobCapture = (value, hasSegments)=>{
    if (!utils_isObject(value)) {
        return undefined;
    }
    const { startedAtEpochMs, deviceMonotonicStartMs, createIdempotencyKey, sealIdempotencyKey, remote: remoteValue, sealed, processingResolved, remoteCreationAttempted, remoteCreationResolvedAbsent, remoteCancellationResolved } = value;
    const remote = remoteValue === undefined ? undefined : parseRemoteCapture(remoteValue);
    if (!isNonNegativeFiniteNumber(startedAtEpochMs) || !isNonNegativeFiniteNumber(deviceMonotonicStartMs) || !isSafeString(createIdempotencyKey) || !isSafeString(sealIdempotencyKey) || remoteValue !== undefined && (!remote || !hasSegments) || sealed !== undefined && (sealed !== true || !remote) || processingResolved !== undefined && (processingResolved !== true || !sealed) || remoteCreationAttempted !== undefined && (remoteCreationAttempted !== true || !hasSegments) || remoteCreationResolvedAbsent !== undefined && (remoteCreationResolvedAbsent !== true || !remoteCreationAttempted || remoteValue !== undefined) || remoteCancellationResolved !== undefined && (remoteCancellationResolved !== true || !remote)) {
        return undefined;
    }
    return {
        startedAtEpochMs,
        deviceMonotonicStartMs,
        createIdempotencyKey,
        sealIdempotencyKey,
        ...remote ? {
            remote
        } : {},
        ...sealed === true ? {
            sealed: true
        } : {},
        ...processingResolved === true ? {
            processingResolved: true
        } : {},
        ...remoteCreationAttempted === true ? {
            remoteCreationAttempted: true
        } : {},
        ...remoteCreationResolvedAbsent === true ? {
            remoteCreationResolvedAbsent: true
        } : {},
        ...remoteCancellationResolved === true ? {
            remoteCancellationResolved: true
        } : {}
    };
};
const parseRecordJob = (value)=>{
    if (!utils_isObject(value)) {
        return undefined;
    }
    const { accountId, dismissed, environment, runs: runValues, schemaVersion, sessionId, startedAtEpochMs, status, targetSegmentDurationMs, terminalFailure: terminalFailureValue, timezone, capture: captureValue, processingWaitStartedAtEpochMs, hasDetectedAudio, preserveAudio, uploadRecovery } = value;
    if (schemaVersion !== 1 && schemaVersion !== (/* inlined export .RECORD_MANIFEST_SCHEMA_VERSION */2) || !isSafeString(sessionId) || !isSafeString(accountId) || !utils_isRuntimeEnvironment(environment) || !isSafeString(timezone) || !isPositiveFiniteNumber(targetSegmentDurationMs) || !isNonNegativeFiniteNumber(startedAtEpochMs) || uploadRecovery !== undefined && !isRecordUploadRecovery(uploadRecovery) || hasDetectedAudio !== undefined && typeof hasDetectedAudio !== 'boolean' || preserveAudio !== undefined && typeof preserveAudio !== 'boolean' || processingWaitStartedAtEpochMs !== undefined && !isNonNegativeFiniteNumber(processingWaitStartedAtEpochMs) || !isRecordJobStatus(status) || typeof dismissed !== 'boolean' || !Array.isArray(runValues)) {
        return undefined;
    }
    const runs = runValues.map((run)=>parseRecordRun(run, schemaVersion === 1));
    const terminalFailure = terminalFailureValue === undefined ? undefined : parseTerminalFailure(terminalFailureValue);
    if (runs.some((run)=>run === undefined) || terminalFailureValue !== undefined && !terminalFailure) {
        return undefined;
    }
    const capture = schemaVersion === 2 ? parseJobCapture(captureValue, runs.some((run)=>run.segments.length > 0)) : undefined;
    if (schemaVersion === 2 && !capture || schemaVersion === 1 && captureValue !== undefined) {
        return undefined;
    }
    if (schemaVersion === 2) {
        let boundary = 0;
        for (const run of runs){
            if (run.sequenceNoOffset < boundary || boundary === 0 && run.sequenceNoOffset !== 0) {
                return undefined;
            }
            const sequences = new Set();
            for (const segment of run.segments){
                const sequence = run.sequenceNoOffset + segment.sequenceNo;
                if (!Number.isSafeInteger(sequence) || sequences.has(sequence)) {
                    return undefined;
                }
                sequences.add(sequence);
                boundary = Math.max(boundary, sequence + 1);
            }
            boundary = Math.max(boundary, run.sequenceNoOffset);
        }
    }
    const job = {
        schemaVersion,
        sessionId,
        accountId,
        environment,
        timezone,
        targetSegmentDurationMs,
        startedAtEpochMs,
        status,
        dismissed,
        runs: runs,
        ...capture ? {
            capture
        } : {},
        ...processingWaitStartedAtEpochMs === undefined ? {} : {
            processingWaitStartedAtEpochMs
        },
        ...hasDetectedAudio === undefined ? {} : {
            hasDetectedAudio
        },
        ...preserveAudio === undefined ? {} : {
            preserveAudio
        },
        ...uploadRecovery === undefined ? {} : {
            uploadRecovery
        }
    };
    if (terminalFailure) {
        return {
            ...job,
            terminalFailure
        };
    }
    return job;
};
const isSafeRecordSegmentFileName = (value)=>{
    return typeof value === 'string' && consts_RECORD_SEGMENT_FILE_PATTERN.test(value);
};
const recordSegmentSequenceNo = (fileName)=>{
    const match = RECORD_SEGMENT_FILE_PATTERN.exec(fileName);
    const sequence = match?.[1];
    if (!sequence) {
        return undefined;
    }
    const value = Number.parseInt(sequence, 10);
    if (!Number.isSafeInteger(value)) {
        return undefined;
    }
    return value;
};
const decodeFloat64Bits = (hex)=>{
    try {
        const bytes = new ArrayBuffer(8);
        const view = new DataView(bytes);
        view.setBigUint64(0, BigInt(`0x${hex}`));
        const value = view.getFloat64(0);
        if (!Number.isFinite(value) || value < 0) {
            return undefined;
        }
        return value;
    } catch  {
        return undefined;
    }
};
const parseFinalizedSegmentFileMetadata = (fileName)=>{
    const match = consts_RECORD_SEGMENT_FILE_PATTERN.exec(fileName);
    const sequence = match?.[1];
    const capturedAtBits = match?.[2];
    const monotonicStartBits = match?.[3];
    const frameCountSource = match?.[4];
    if (!sequence || !capturedAtBits || !monotonicStartBits || !frameCountSource) {
        return undefined;
    }
    const sequenceNo = Number.parseInt(sequence, 10);
    const capturedAtEpochMs = decodeFloat64Bits(capturedAtBits);
    const deviceMonotonicStartMs = decodeFloat64Bits(monotonicStartBits);
    let frameCount;
    try {
        frameCount = BigInt(frameCountSource);
    } catch  {
        return undefined;
    }
    if (!Number.isSafeInteger(sequenceNo) || capturedAtEpochMs === undefined || deviceMonotonicStartMs === undefined || frameCount <= 0n || frameCount > BigInt(Number.MAX_SAFE_INTEGER)) {
        return undefined;
    }
    return {
        sequenceNo,
        capturedAtEpochMs,
        deviceMonotonicStartMs,
        frameCount: Number(frameCount)
    };
};
const parseFlacStreamInfo = (bytes)=>{
    if (bytes.byteLength < 8 || bytes[0] !== 0x66 || bytes[1] !== 0x4c || bytes[2] !== 0x61 || bytes[3] !== 0x43) {
        return undefined;
    }
    let offset = 4;
    while(offset + 4 <= bytes.byteLength){
        const blockHeader = bytes[offset];
        if (blockHeader === undefined) {
            return undefined;
        }
        const blockType = blockHeader & 0x7f;
        const blockLength = (bytes[offset + 1] ?? 0) << 16 | (bytes[offset + 2] ?? 0) << 8 | (bytes[offset + 3] ?? 0);
        const blockOffset = offset + 4;
        const nextOffset = blockOffset + blockLength;
        if (nextOffset > bytes.byteLength) {
            return undefined;
        }
        if (blockType === 0) {
            if (offset !== 4 || blockLength !== 34) {
                return undefined;
            }
            let packed = 0n;
            for(let index = blockOffset + 10; index < blockOffset + 18; index += 1){
                packed = packed << 8n | BigInt(bytes[index] ?? 0);
            }
            return {
                sampleRate: Number(packed >> 44n & 0xfffffn),
                channelCount: Number(packed >> 41n & 0x7n) + 1,
                bitsPerSample: Number(packed >> 36n & 0x1fn) + 1,
                totalSamples: Number(packed & 0xfffffffffn)
            };
        }
        if ((blockHeader & 0x80) !== 0) {
            return undefined;
        }
        offset = nextOffset;
    }
    return undefined;
};
const recoveredRecordSegment = (run, fileName, stats, contentSha256, bytes)=>{
    const metadata = parseFinalizedSegmentFileMetadata(fileName);
    const streamInfo = parseFlacStreamInfo(bytes);
    if (!metadata || !streamInfo || !stats.isFile() || stats.size === 0 || stats.size !== bytes.byteLength || streamInfo.sampleRate !== 48000 || streamInfo.channelCount !== 1 || streamInfo.bitsPerSample !== 16 || streamInfo.totalSamples !== metadata.frameCount) {
        return undefined;
    }
    return {
        runId: run.runId,
        sequenceNo: metadata.sequenceNo,
        fileName,
        capturedAtEpochMs: metadata.capturedAtEpochMs,
        deviceMonotonicStartMs: metadata.deviceMonotonicStartMs,
        durationMs: metadata.frameCount * 1000 / streamInfo.sampleRate,
        contentType: 'audio/flac',
        contentLength: stats.size,
        contentSha256
    };
};
/** Transient filesystem failures are distinct from failed integrity checks and configured quotas. */ const isTransientRecordStorageError = (error)=>{
    const seen = new Set();
    let current = error;
    while(typeof current === 'object' && current !== null && !seen.has(current) && seen.size < 8){
        seen.add(current);
        const code = Reflect.get(current, 'code');
        if (code === 'quotaExceeded') {
            return false;
        }
        if (typeof code === 'string' && [
            'ENOSPC',
            'EIO',
            'EBUSY',
            'EMFILE',
            'ENFILE'
        ].includes(code)) {
            return true;
        }
        current = Reflect.get(current, 'cause');
    }
    return false;
};
