// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/credential-store/modules/codec/utils.ts.
// The original TypeScript and import graph are not restored.




const utils_isRecord = (value)=>lodash_es_isPlainObject(value);
const hasOnlyKeys = (value, allowedKeys)=>lodash_es_every(lodash_es_keys(value), (key)=>lodash_es_includes(allowedKeys, key));
const isBoundedString = (value, limit, allowEmpty = false)=>{
    if (!lodash_es_isString(value) || value.length > limit) {
        return false;
    }
    if (allowEmpty) {
        return true;
    }
    return value.length > 0;
};
const isOptionalString = (value, limit)=>{
    if (lodash_es_isUndefined(value)) {
        return true;
    }
    return isBoundedString(value, limit, true);
};
const isHttpsUrl = (value)=>{
    if (!isBoundedString(value, 4096)) {
        return false;
    }
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password && !url.hash && !url.search;
    } catch  {
        return false;
    }
};
const isHttpsAvatar = (value)=>{
    if (!isBoundedString(value, 4096)) {
        return false;
    }
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password;
    } catch  {
        return false;
    }
};
const RECORD_KEYS = [
    'schemaVersion',
    'environment',
    'source',
    'accessToken',
    'accessTokenExpiresAt',
    'refreshCredential',
    'user'
];
const USER_KEYS = [
    'id',
    'displayName',
    'email',
    'avatarUrl'
];
const isPublicUser = (value)=>{
    if (!utils_isRecord(value) || !hasOnlyKeys(value, USER_KEYS)) {
        return false;
    }
    return isBoundedString(value.id, 1024) && isOptionalString(value.displayName, 4096) && isOptionalString(value.email, 4096) && (lodash_es_isUndefined(value.avatarUrl) || isHttpsAvatar(value.avatarUrl));
};
const isStoredAccountRecord = (value)=>{
    if (!utils_isRecord(value) || !hasOnlyKeys(value, RECORD_KEYS)) {
        return false;
    }
    const validEnvironment = value.environment === base_RuntimeEnvironment.Development || value.environment === base_RuntimeEnvironment.Staging || value.environment === base_RuntimeEnvironment.Production;
    const validSource = value.source === 'better-auth-session' || value.source === 'oauth2';
    return value.schemaVersion === 2 && validEnvironment && validSource && isBoundedString(value.accessToken, (/* inlined export .MAX_SECRET_LENGTH */131072)) && lodash_es_isNumber(value.accessTokenExpiresAt) && lodash_es_isSafeInteger(value.accessTokenExpiresAt) && value.accessTokenExpiresAt > 0 && isBoundedString(value.refreshCredential, (/* inlined export .MAX_SECRET_LENGTH */131072)) && isPublicUser(value.user);
};
const SLOT_KEYS = [
    'formatVersion',
    'generation',
    'record'
];
const HEAD_KEYS = [
    'formatVersion',
    'state',
    'slotIndex',
    'generation'
];
const isPersistedSlot = (value)=>{
    if (!utils_isRecord(value) || !hasOnlyKeys(value, SLOT_KEYS)) {
        return false;
    }
    return value.formatVersion === (/* inlined export .CREDENTIAL_VERSION */1) && lodash_es_isNumber(value.generation) && lodash_es_isSafeInteger(value.generation) && value.generation >= 0 && isStoredAccountRecord(value.record);
};
const isPersistedHead = (value)=>{
    if (!utils_isRecord(value) || !hasOnlyKeys(value, HEAD_KEYS)) {
        return false;
    }
    return value.formatVersion === (/* inlined export .CREDENTIAL_VERSION */1) && value.state === 'signed-in' && (value.slotIndex === 0 || value.slotIndex === 1) && lodash_es_isNumber(value.generation) && lodash_es_isSafeInteger(value.generation) && value.generation >= 0;
};
