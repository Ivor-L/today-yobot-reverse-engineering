// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/record/modules/backend/utils.ts.
// The original TypeScript and import graph are not restored.



const isRetryableHttpStatus = (status)=>{
    return status === 408 || status === 425 || status === 429 || status >= 500;
};
const toWireMilliseconds = (value)=>{
    const rounded = Math.round(value);
    if (value < 0 || !Number.isFinite(value) || !Number.isSafeInteger(rounded)) {
        throw new RecordBackendError(base_InterfaceErrorCode.InvalidArgument, 'The recording contains an invalid timestamp.', {
            retryable: false
        });
    }
    return rounded;
};
const utils_asObject = (value)=>{
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return undefined;
    }
    return value;
};
const readString = (value)=>{
    if (typeof value !== 'string' || value.length === 0) {
        return undefined;
    }
    return value;
};
const readNonNegativeInteger = (value)=>{
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
        return undefined;
    }
    return value;
};
const readEnvelopeData = (value)=>{
    const envelope = utils_asObject(value);
    const data = utils_asObject(envelope?.['data']);
    if (!data) {
        throw new RecordBackendError(base_InterfaceErrorCode.Internal, 'The recording service returned an invalid response.', {
            retryable: true
        });
    }
    return data;
};
const readBusinessCode = (value)=>{
    const body = utils_asObject(value);
    const direct = readString(body?.['code']);
    if (direct) {
        return direct;
    }
    return readString(utils_asObject(body?.['error'])?.['code']);
};
const parseCreatedCapture = (value)=>{
    const capture = utils_asObject(readEnvelopeData(value)['capture']);
    const captureId = readString(capture?.['id']);
    const streamId = readString(capture?.['streamId']);
    const nextSequenceNo = readNonNegativeInteger(capture?.['nextSequenceNo']) ?? 0;
    if (!captureId || !streamId) {
        throw new RecordBackendError(base_InterfaceErrorCode.Internal, 'The recording service returned an invalid capture.', {
            retryable: true
        });
    }
    return {
        captureId,
        streamId,
        nextSequenceNo
    };
};
const parseCancelledCapture = (value, expectedCaptureId)=>{
    const data = readEnvelopeData(value);
    const captureId = readString(data['captureId']);
    const status = readString(data['status']);
    const cancelled = data['cancelled'];
    const reason = readString(data['reason']);
    const validSoftRejection = cancelled === false && (reason === 'note_handoff_started' && status === 'processing' || reason === 'already_completed' && (status === 'ready' || status === 'ready_with_errors') || reason === 'already_failed' && status === 'failed');
    if (captureId !== expectedCaptureId || !status || !(cancelled === true && status === 'cancelled' && reason === undefined || validSoftRejection)) {
        throw new RecordBackendError(base_InterfaceErrorCode.Internal, 'The recording service returned an invalid cancellation decision.', {
            retryable: true
        });
    }
    if (reason) {
        return {
            captureId,
            status,
            cancelled,
            reason
        };
    }
    return {
        captureId,
        status,
        cancelled
    };
};
const parseUpload = (value)=>{
    const upload = utils_asObject(value);
    const method = readString(upload?.['method']);
    const rawUrl = readString(upload?.['url']);
    const headers = utils_asObject(upload?.['requiredHeaders']);
    if (method !== 'PUT' || !rawUrl || !headers) {
        return undefined;
    }
    let url;
    try {
        url = new URL(rawUrl);
    } catch  {
        return undefined;
    }
    if (url.protocol !== 'https:' || url.username || url.password) {
        return undefined;
    }
    const requiredHeaders = {};
    for (const [name, headerValue] of Object.entries(headers)){
        if (typeof headerValue !== 'string') {
            return undefined;
        }
        requiredHeaders[name] = headerValue;
    }
    return {
        method,
        requiredHeaders,
        url: url.href
    };
};
const parsePreparedSegment = (value, sequenceNo)=>{
    const data = readEnvelopeData(value);
    const batchId = readString(data['batchId']);
    const items = Array.isArray(data['items']) ? data['items'] : [];
    const item = items.map(utils_asObject).find((candidate)=>candidate?.['sequenceNo'] === sequenceNo);
    const segmentId = readString(item?.['segmentId']);
    const status = item?.['status'];
    if (!batchId || !segmentId || status !== 'uploadRequired' && status !== 'alreadyPrepared' && status !== 'alreadyCommitted' && status !== 'conflict') {
        throw new RecordBackendError(base_InterfaceErrorCode.Internal, 'The recording service returned an invalid upload plan.', {
            retryPrepare: true,
            retryable: true
        });
    }
    const result = {
        batchId,
        segmentId,
        status
    };
    const upload = parseUpload(item?.['upload']);
    if (upload) {
        result.upload = upload;
    }
    return result;
};
const assertCommittedSegment = (value, segmentId)=>{
    const data = readEnvelopeData(value);
    const items = Array.isArray(data['items']) ? data['items'] : [];
    const item = items.map(utils_asObject).find((candidate)=>candidate?.['segmentId'] === segmentId);
    if (item?.['success'] === true) {
        return;
    }
    const businessCode = readString(item?.['code']);
    if (businessCode === 'voice_capture.segment_conflict') {
        throw new RecordBackendError(base_InterfaceErrorCode.Conflict, 'The recording service found conflicting audio segment data.', {
            businessCode,
            retryable: false
        });
    }
    throw new RecordBackendError(base_InterfaceErrorCode.Unavailable, 'The recording service could not accept an audio segment.', {
        businessCode,
        retryPrepare: true,
        retryable: true,
        segmentIntegrityFailure: businessCode === 'voice_capture.segment_invalid'
    });
};
