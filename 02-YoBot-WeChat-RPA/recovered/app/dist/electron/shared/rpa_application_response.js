const MAX_ERROR_DETAIL_LENGTH = 320;
function safeText(value) {
    if (typeof value !== 'string')
        return null;
    const normalized = value.replace(/[\r\n\t]+/g, ' ').trim();
    if (!normalized)
        return null;
    // RPA errors should explain the rejected field, never echo credentials. Keep
    // diagnostics useful while removing common bearer/API-key shaped values.
    return normalized
        .replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [redacted]')
        .replace(/\b[A-Za-z0-9_-]{40,}\b/g, '[redacted]')
        .slice(0, MAX_ERROR_DETAIL_LENGTH);
}
export class RpaApplicationResponseError extends Error {
    code;
    constructor(operation, payload) {
        const code = typeof payload.code === 'string' && /^[A-Z0-9_]{1,96}$/.test(payload.code)
            ? payload.code
            : null;
        const detail = safeText(payload.error) ?? safeText(payload.message) ?? safeText(payload.detail);
        super(`${operation}被 RPA 拒绝${code ? `（${code}）` : ''}${detail ? `：${detail}` : ''}`);
        this.name = 'RpaApplicationResponseError';
        this.code = code;
    }
}
/** RPA has mature endpoints that report business failures inside HTTP 200. */
export function assertRpaApplicationSuccess(payload, operation) {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)
        && payload.success === false) {
        throw new RpaApplicationResponseError(operation, payload);
    }
    return payload;
}
/** Preserve the Windows/direct response shape while accepting the Mac wrapper. */
export function unwrapRpaApplicationData(payload) {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        const record = payload;
        if (record.success === true && Object.prototype.hasOwnProperty.call(record, 'data')) {
            return record.data;
        }
    }
    return payload;
}
