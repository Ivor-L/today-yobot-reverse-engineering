// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/socket/modules/notifications/modules/remote-push/modules/registration/modules/store/utils.ts.
// The original TypeScript and import graph are not restored.




const createEmptyRemotePushRegistrationState = ()=>({
        version: (/* inlined export .REMOTE_PUSH_REGISTRATION_STATE_SCHEMA_VERSION */1)
    });
const store_utils_isFileNotFoundError = (error)=>error instanceof Error && 'code' in error && error.code === 'ENOENT';
const isRuntimeEnvironment = (value)=>value === base_RuntimeEnvironment.Development || value === base_RuntimeEnvironment.Staging || value === base_RuntimeEnvironment.Production;
const isRemotePushRegistrationState = (value)=>{
    if (!lodash_es_isPlainObject(value)) {
        return false;
    }
    const record = value;
    if (!lodash_es_isNumber(record['version']) || record['version'] !== (/* inlined export .REMOTE_PUSH_REGISTRATION_STATE_SCHEMA_VERSION */1)) {
        return false;
    }
    if (Object.keys(record).some((key)=>key !== 'registration' && key !== 'version')) {
        return false;
    }
    const registration = record['registration'];
    if (registration === undefined) {
        return true;
    }
    if (!lodash_es_isPlainObject(registration)) {
        return false;
    }
    const registrationRecord = registration;
    const cleanupPending = registrationRecord['cleanupPending'];
    const owner = registrationRecord['owner'];
    if (cleanupPending !== undefined && cleanupPending !== true) {
        return false;
    }
    if (!lodash_es_isPlainObject(owner)) {
        return false;
    }
    const ownerRecord = owner;
    return lodash_es_isString(registrationRecord['deviceId']) && registrationRecord['deviceId'].length > 0 && lodash_es_isString(ownerRecord['accountId']) && ownerRecord['accountId'].length > 0 && isRuntimeEnvironment(ownerRecord['environment']);
};
