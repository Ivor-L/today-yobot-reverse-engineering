// Compiled fragment from ./src/app/modules/web-runtime/modules/runtime-diagnostics/utils.ts.
// The original TypeScript and import graph are not restored.


const runtime_diagnostics_utils_isRecord = (value)=>value !== null && typeof value === 'object' && !Array.isArray(value);
const runtime_diagnostics_utils_hasOnlyKeys = (value, keys)=>Object.keys(value).every((key)=>keys.has(key));
const utils_isBoundedString = (value, maxBytes)=>typeof value === 'string' && Buffer.byteLength(value) <= maxBytes;
const isOptionalBoundedString = (value, maxBytes)=>value === undefined || utils_isBoundedString(value, maxBytes);
const isSafeDuration = (value)=>typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
const isNonNegativeSafeInteger = (value)=>typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const isStatusCode = (value)=>value === undefined || typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599;
const parseConsoleDiagnostic = (value)=>{
    const keys = new Set([
        'byteLength',
        'kind',
        'message',
        'severity',
        'truncated'
    ]);
    if (value.kind !== 'console-message' || !runtime_diagnostics_utils_hasOnlyKeys(value, keys) || !isNonNegativeSafeInteger(value.byteLength) || !utils_isBoundedString(value.message, (/* inlined export .DESKTOP_WEB_RUNTIME_DIAGNOSTIC_TEXT_MAX_BYTES */8192)) || value.severity !== 'error' && value.severity !== 'warning' || typeof value.truncated !== 'boolean') {
        return undefined;
    }
    return {
        byteLength: value.byteLength,
        kind: 'console-message',
        message: value.message,
        severity: value.severity,
        truncated: value.truncated
    };
};
const parseNetworkDiagnostic = (value)=>{
    if (value.kind !== 'network-request' || !utils_isBoundedString(value.method, (/* inlined export .DESKTOP_WEB_RUNTIME_DIAGNOSTIC_METHOD_MAX_BYTES */64)) || !utils_isBoundedString(value.url, (/* inlined export .DESKTOP_WEB_RUNTIME_DIAGNOSTIC_URL_MAX_BYTES */4096)) || !isSafeDuration(value.durationMs) || value.transport !== 'node_http' && value.transport !== 'undici') {
        return undefined;
    }
    if (value.outcome === 'completed') {
        const keys = new Set([
            'contentType',
            'durationMs',
            'kind',
            'method',
            'outcome',
            'statusCode',
            'transport',
            'url'
        ]);
        if (!runtime_diagnostics_utils_hasOnlyKeys(value, keys) || !isStatusCode(value.statusCode) || !isOptionalBoundedString(value.contentType, (/* inlined export .DESKTOP_WEB_RUNTIME_DIAGNOSTIC_CONTENT_TYPE_MAX_BYTES */512))) {
            return undefined;
        }
        return {
            kind: 'network-request',
            method: value.method,
            url: value.url,
            outcome: value.outcome,
            durationMs: value.durationMs,
            transport: value.transport,
            ...value.statusCode === undefined ? {} : {
                statusCode: value.statusCode
            },
            ...value.contentType === undefined ? {} : {
                contentType: value.contentType
            }
        };
    }
    if (value.outcome !== 'failed') {
        return undefined;
    }
    const keys = new Set([
        'durationMs',
        'errorCode',
        'kind',
        'method',
        'outcome',
        'transport',
        'url'
    ]);
    if (!runtime_diagnostics_utils_hasOnlyKeys(value, keys) || !isOptionalBoundedString(value.errorCode, (/* inlined export .DESKTOP_WEB_RUNTIME_DIAGNOSTIC_ERROR_CODE_MAX_BYTES */128))) {
        return undefined;
    }
    return {
        kind: 'network-request',
        method: value.method,
        url: value.url,
        outcome: value.outcome,
        durationMs: value.durationMs,
        transport: value.transport,
        ...value.errorCode === undefined ? {} : {
            errorCode: value.errorCode
        }
    };
};
const parseProcessFailureDiagnostic = (value)=>{
    const keys = new Set([
        'errorCode',
        'kind',
        'reason'
    ]);
    if (value.kind !== 'process-failure' || !runtime_diagnostics_utils_hasOnlyKeys(value, keys) || value.reason !== 'uncaught_exception' || !isOptionalBoundedString(value.errorCode, (/* inlined export .DESKTOP_WEB_RUNTIME_DIAGNOSTIC_ERROR_CODE_MAX_BYTES */128))) {
        return undefined;
    }
    return {
        kind: 'process-failure',
        reason: value.reason,
        ...value.errorCode === undefined ? {} : {
            errorCode: value.errorCode
        }
    };
};
const parseRateLimitDiagnostic = (value)=>{
    const keys = new Set([
        'kind',
        'level',
        'limit',
        'source',
        'windowMs'
    ]);
    if (value.kind !== 'rate-limited' || !runtime_diagnostics_utils_hasOnlyKeys(value, keys) || value.level !== 'error' && value.level !== 'log' && value.level !== 'warning' || value.source !== 'console-message' && value.source !== 'network-request' || value.limit !== (/* inlined export .DESKTOP_WEB_RUNTIME_DIAGNOSTIC_EVENT_LIMIT */240) || value.windowMs !== (/* inlined export .DESKTOP_WEB_RUNTIME_DIAGNOSTIC_EVENT_WINDOW_MS */60000)) {
        return undefined;
    }
    return {
        kind: 'rate-limited',
        level: value.level,
        limit: value.limit,
        source: value.source,
        windowMs: value.windowMs
    };
};
const parseDesktopWebRuntimeDiagnosticMessage = (value, nonce)=>{
    if (!runtime_diagnostics_utils_isRecord(value)) {
        return undefined;
    }
    const messageKeys = new Set([
        'diagnostic',
        'nonce',
        'type'
    ]);
    if (!runtime_diagnostics_utils_hasOnlyKeys(value, messageKeys) || value.type !== DESKTOP_WEB_RUNTIME_DIAGNOSTIC_MESSAGE_TYPE || value.nonce !== nonce || !runtime_diagnostics_utils_isRecord(value.diagnostic)) {
        return undefined;
    }
    const diagnostic = parseConsoleDiagnostic(value.diagnostic) ?? parseNetworkDiagnostic(value.diagnostic) ?? parseProcessFailureDiagnostic(value.diagnostic) ?? parseRateLimitDiagnostic(value.diagnostic);
    if (!diagnostic) {
        return undefined;
    }
    return {
        diagnostic,
        nonce,
        type: 'diagnostic'
    };
};
const readDesktopWebRuntimeErrorCode = (value)=>{
    if (!runtime_diagnostics_utils_isRecord(value)) {
        return undefined;
    }
    const candidate = typeof value.code === 'string' ? value.code : value.name;
    if (!utils_isBoundedString(candidate, (/* inlined export .DESKTOP_WEB_RUNTIME_DIAGNOSTIC_ERROR_CODE_MAX_BYTES */128))) {
        return undefined;
    }
    return candidate;
};
