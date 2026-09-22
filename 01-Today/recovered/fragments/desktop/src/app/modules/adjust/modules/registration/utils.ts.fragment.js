// Compiled fragment from ./src/app/modules/adjust/modules/registration/utils.ts.
// The original TypeScript and import graph are not restored.



const SHA_256_PATTERN = /^[a-f0-9]{64}$/u;
const parseAccountIds = (value)=>{
    if (!Array.isArray(value) || value.length > (/* inlined export .ADJUST_REGISTRATION_STATE_MAX_ACCOUNTS */1024) || value.some((accountId)=>typeof accountId !== 'string' || !SHA_256_PATTERN.test(accountId))) {
        throw new Error('The persisted Adjust account list is invalid.');
    }
    const accountIds = [
        ...value
    ];
    if (new Set(accountIds).size !== accountIds.length) {
        throw new Error('The persisted Adjust account list contains duplicates.');
    }
    return accountIds;
};
const parsePending = (value)=>{
    if (!Array.isArray(value) || value.length > (/* inlined export .ADJUST_REGISTRATION_STATE_MAX_ACCOUNTS */1024)) {
        throw new Error('The persisted Adjust registration queue is invalid.');
    }
    const pending = value.map((item)=>{
        if (!adjust_utils_isRecord(item) || typeof item['accountId'] !== 'string' || !SHA_256_PATTERN.test(item['accountId']) || !Number.isSafeInteger(item['attempt']) || Number(item['attempt']) < 0 || typeof item['nextAttemptAtMs'] !== 'number' || !Number.isFinite(item['nextAttemptAtMs']) || item['nextAttemptAtMs'] < 0) {
            throw new Error('The persisted Adjust registration request is invalid.');
        }
        return {
            accountId: item['accountId'],
            attempt: Number(item['attempt']),
            nextAttemptAtMs: item['nextAttemptAtMs']
        };
    });
    const accountIds = pending.map((item)=>item.accountId);
    if (new Set(accountIds).size !== accountIds.length) {
        throw new Error('The persisted Adjust registration queue contains duplicates.');
    }
    return pending;
};
const parseDesktopAdjustRegistrationState = (value)=>{
    if (!adjust_utils_isRecord(value) || value['schemaVersion'] !== (/* inlined export .ADJUST_REGISTRATION_STATE_SCHEMA_VERSION */1) || typeof value['externalDeviceId'] !== 'string' || !SHA_256_PATTERN.test(value['externalDeviceId'])) {
        throw new Error('The persisted Adjust registration state is invalid.');
    }
    const completedAccountIds = parseAccountIds(value['completedAccountIds']);
    const pending = parsePending(value['pending']);
    const completed = new Set(completedAccountIds);
    if (pending.some((item)=>completed.has(item.accountId))) {
        throw new Error('The persisted Adjust registration state overlaps account states.');
    }
    return {
        completedAccountIds,
        externalDeviceId: value['externalDeviceId'],
        pending,
        schemaVersion: (/* inlined export .ADJUST_REGISTRATION_STATE_SCHEMA_VERSION */1)
    };
};
const createDesktopAdjustRegistrationState = (externalDeviceId)=>{
    return parseDesktopAdjustRegistrationState({
        completedAccountIds: [],
        externalDeviceId,
        pending: [],
        schemaVersion: (/* inlined export .ADJUST_REGISTRATION_STATE_SCHEMA_VERSION */1)
    });
};
