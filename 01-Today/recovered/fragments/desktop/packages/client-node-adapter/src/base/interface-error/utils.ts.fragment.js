// Compiled fragment from ../../packages/client-node-adapter/src/base/interface-error/utils.ts.
// The original TypeScript and import graph are not restored.




const isInterfaceErrorInstance = (error, prototype)=>{
    if (!lodash_es_isObject(error)) {
        return false;
    }
    try {
        return Object.prototype.isPrototypeOf.call(prototype, error);
    } catch  {
        return false;
    }
};
const isErrorCode = (value)=>{
    try {
        return lodash_es_isString(value) && ERROR_CODES.has(value);
    } catch  {
        return false;
    }
};
const readErrorData = (error)=>{
    if (!lodash_es_isObject(error)) {
        return null;
    }
    try {
        const candidate = error;
        const code = candidate.code;
        const message = candidate.message;
        const permissionId = candidate.permissionId;
        if (!isErrorCode(code) || !lodash_es_isString(message)) {
            return null;
        }
        if (permissionId !== undefined && !lodash_es_isString(permissionId)) {
            return null;
        }
        const data = {
            code,
            message
        };
        if (permissionId !== undefined) {
            data.permissionId = permissionId;
        }
        return data;
    } catch  {
        return null;
    }
};
const readOptions = (error)=>{
    if (!lodash_es_isObject(error)) {
        return {
            cause: error
        };
    }
    try {
        const candidate = error;
        const retryAfterMs = candidate.retryAfterMs;
        const status = candidate.status;
        const terminal = candidate.terminal;
        const metadata = {
            cause: error
        };
        if (lodash_es_isNumber(retryAfterMs) && lodash_es_isFinite(retryAfterMs)) {
            metadata.retryAfterMs = retryAfterMs;
        }
        if (lodash_es_isNumber(status) && lodash_es_isFinite(status)) {
            metadata.status = status;
        }
        if (terminal === true) {
            metadata.terminal = true;
        }
        return metadata;
    } catch  {
        return {
            cause: error
        };
    }
};
const readExplicitOptions = (options)=>{
    try {
        const { cause, permissionId, retryAfterMs, status, terminal } = options;
        if (permissionId !== undefined && !lodash_es_isString(permissionId)) {
            return null;
        }
        if (retryAfterMs !== undefined && (!lodash_es_isNumber(retryAfterMs) || !lodash_es_isFinite(retryAfterMs))) {
            return null;
        }
        if (status !== undefined && (!lodash_es_isNumber(status) || !lodash_es_isFinite(status))) {
            return null;
        }
        if (terminal !== undefined && !lodash_es_isBoolean(terminal)) {
            return null;
        }
        return {
            cause,
            permissionId,
            retryAfterMs,
            status,
            terminal
        };
    } catch  {
        return null;
    }
};
const isPermissionCode = (code)=>{
    return code === base_InterfaceErrorCode.PermissionRequired || code === base_InterfaceErrorCode.PermissionDenied || code === base_InterfaceErrorCode.PermissionSettingsOpened;
};
const hasValidPermission = (code, permissionId)=>{
    if (isPermissionCode(code)) {
        return permissionId !== undefined && permissionId.length > 0 && permissionId.trim() === permissionId;
    }
    return permissionId === undefined;
};
const invalidMetadata = (cause)=>{
    return {
        code: base_InterfaceErrorCode.Internal,
        message: INVALID_METADATA_MESSAGE,
        options: {
            cause
        }
    };
};
const resolveInterfaceError = (codeOrError, message, options)=>{
    if (isErrorCode(codeOrError)) {
        const resolvedOptions = readExplicitOptions(options);
        if (!resolvedOptions || !hasValidPermission(codeOrError, resolvedOptions.permissionId)) {
            return invalidMetadata(options);
        }
        return {
            code: codeOrError,
            message,
            options: resolvedOptions
        };
    }
    const data = readErrorData(codeOrError);
    if (!data) {
        return {
            code: base_InterfaceErrorCode.Internal,
            message,
            options: {
                cause: codeOrError
            }
        };
    }
    if (!hasValidPermission(data.code, data.permissionId)) {
        return invalidMetadata(codeOrError);
    }
    const errorOptions = readOptions(codeOrError);
    if (data.permissionId !== undefined) {
        errorOptions.permissionId = data.permissionId;
    }
    return {
        code: data.code,
        message: data.message,
        options: errorOptions
    };
};
