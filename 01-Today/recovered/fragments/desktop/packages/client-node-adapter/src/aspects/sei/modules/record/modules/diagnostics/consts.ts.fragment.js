// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/record/modules/diagnostics/consts.ts.
// The original TypeScript and import graph are not restored.


const ERROR_NAMES = new Set([
    'Error',
    'TypeError',
    'AbortError',
    'TimeoutError',
    'RecordBackendError',
    'InterfaceError',
    'RecordStoreValidationError',
    'SystemError'
]);
const consts_ERROR_CODES = new Set([
    ...Object.values(base_InterfaceErrorCode),
    ...Object.values(cpi_AudioCaptureFailureCode),
    'UND_ERR_SOCKET',
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_HEADERS_TIMEOUT',
    'UND_ERR_BODY_TIMEOUT',
    'UND_ERR_ABORTED',
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENETUNREACH',
    'EHOSTUNREACH',
    'ENOTFOUND',
    'EAI_AGAIN',
    'EPIPE',
    'ENOSPC',
    'EIO',
    'EBUSY',
    'EROFS',
    'EACCES',
    'EPERM',
    'ENOENT',
    'EMFILE',
    'ENFILE',
    'quotaExceeded',
    'invalidSegment'
]);
const NUMBER_FIELDS = [
    'sequenceNo',
    'bytes',
    'attempt',
    'durationMs',
    'timeoutMs',
    'httpStatus',
    'retryDelayMs',
    'totalSegments',
    'committedSegments',
    'pendingSegments',
    'activeUploads',
    'concurrency',
    'committedBytes',
    'totalBytes',
    'pendingBytes',
    'uploadGeneration'
];
const ERROR_DOMAINS = new Set([
    'NSCocoaErrorDomain',
    'NSPOSIXErrorDomain',
    'NSOSStatusErrorDomain',
    'AVFoundationErrorDomain',
    'SCStreamErrorDomain'
]);
