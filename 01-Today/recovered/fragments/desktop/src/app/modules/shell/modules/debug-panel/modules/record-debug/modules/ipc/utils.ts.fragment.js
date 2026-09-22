// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/record-debug/modules/ipc/utils.ts.
// The original TypeScript and import graph are not restored.

const createRecordDebugDefaults = (now, id)=>{
    const startAtEpochMs = Math.floor(now / 1000) * 1000 + 30000;
    return {
        id,
        title: 'Catch up with the team',
        startAtEpochMs,
        endAtEpochMs: startAtEpochMs + 30 * 60000,
        expiresAtEpochMs: startAtEpochMs + 5 * 60000
    };
};
const isTimestamp = (value)=>{
    return typeof value === 'number' && Number.isSafeInteger(value) && Math.abs(value) <= 8.64e15;
};
const parseRecordDebugOffer = (value, now)=>{
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Enter valid meeting reminder parameters.');
    }
    const { id, title, startAtEpochMs, endAtEpochMs, expiresAtEpochMs } = value;
    if (typeof id !== 'string' || !id.trim() || id.trim().length > 256) {
        throw new Error('Meeting ID must contain 1–256 characters.');
    }
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 500) {
        throw new Error('Meeting title must contain 1–500 characters.');
    }
    if (!isTimestamp(startAtEpochMs) || !isTimestamp(expiresAtEpochMs)) {
        throw new Error('Enter valid start and expiry times.');
    }
    if (endAtEpochMs !== undefined && (!isTimestamp(endAtEpochMs) || endAtEpochMs < startAtEpochMs)) {
        throw new Error('Meeting end must be at or after its start.');
    }
    if (expiresAtEpochMs <= now || expiresAtEpochMs <= startAtEpochMs - 60000) {
        throw new Error('Expiry must be in the future and after the reminder is due.');
    }
    return {
        id: id.trim(),
        title: title.trim(),
        startAtEpochMs,
        ...endAtEpochMs === undefined ? {} : {
            endAtEpochMs
        },
        expiresAtEpochMs
    };
};
