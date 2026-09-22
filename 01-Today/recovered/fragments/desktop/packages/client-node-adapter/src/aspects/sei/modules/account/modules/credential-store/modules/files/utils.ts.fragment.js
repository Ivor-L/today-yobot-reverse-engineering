// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/credential-store/modules/files/utils.ts.
// The original TypeScript and import graph are not restored.







const getCredentialPaths = (path)=>({
        head: `${path}${(/* inlined export .HEAD_SUFFIX */".head")}`,
        slots: [
            `${path}${SLOT_SUFFIXES["0"]}`,
            `${path}${SLOT_SUFFIXES["1"]}`
        ],
        tombstone: `${path}${TOMBSTONE_SUFFIX}`
    });
const getAccountCredentialSlotPaths = (path)=>getCredentialPaths(path).slots;
const getAccountCredentialMetadataPaths = (path)=>{
    const paths = getCredentialPaths(path);
    return {
        head: paths.head,
        signedOutTombstone: paths.tombstone
    };
};
const getSlotPath = (path, index)=>getCredentialPaths(path).slots[index];
const hasFileErrorCode = (error, code)=>{
    if (!lodash_es_isObject(error)) {
        return false;
    }
    const errorCode = lodash_es_get(error, 'code');
    return lodash_es_isString(errorCode) && errorCode === code;
};
const pathExists = async (path)=>{
    try {
        await (0,promises_namespaceObject.access)(path);
        return true;
    } catch (error) {
        if (hasFileErrorCode(error, 'ENOENT')) {
            return false;
        }
        throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, STORAGE_UNAVAILABLE_MESSAGE, {
            cause: error
        });
    }
};
const syncDirectory = async (path)=>{
    let directory;
    try {
        directory = await (0,promises_namespaceObject.open)(path, 'r');
        await directory.sync();
    } catch (error) {
        const unsupported = hasFileErrorCode(error, 'EINVAL') || hasFileErrorCode(error, 'ENOTSUP') || hasFileErrorCode(error, 'EISDIR') || process.platform === 'win32' && hasFileErrorCode(error, 'EPERM');
        if (!unsupported) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, STORAGE_UNAVAILABLE_MESSAGE, {
                cause: error
            });
        }
    } finally{
        if (directory) {
            try {
                await directory.close();
            } catch  {
            // Directory handle cleanup is best effort after the sync attempt.
            }
        }
    }
};
