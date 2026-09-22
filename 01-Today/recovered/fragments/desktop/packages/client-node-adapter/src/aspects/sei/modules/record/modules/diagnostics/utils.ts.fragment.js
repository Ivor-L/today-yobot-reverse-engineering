// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/record/modules/diagnostics/utils.ts.
// The original TypeScript and import graph are not restored.





const isRecordDiagnosticIssue = (fields, payload)=>{
    return fields.issue !== false && fields.failureReason !== base_RecordFailureReason.NoUsableSpeech && payload['errorCode'] !== base_InterfaceErrorCode.PermissionRequired && payload['errorCode'] !== base_InterfaceErrorCode.PermissionDenied && payload['errorCode'] !== base_InterfaceErrorCode.PermissionSettingsOpened && payload['errorCode'] !== base_InterfaceErrorCode.Cancelled && payload['errorName'] !== 'AbortError';
};
const hashRecordDiagnosticValue = (value)=>(0,external_node_crypto_namespaceObject.createHash)('sha256').update(value).digest('hex').slice(0, 16);
const sanitizeRecordDiagnosticText = (value)=>{
    // Signed storage URLs and arbitrary server paths have no diagnostic value here.
    const withoutUrls = value.replaceAll(/\bhttps?:\/\/[^\s<>"']+/giu, '[url]');
    return sanitizeRuntimeDiagnosticText(withoutUrls)?.message;
};
/** Keep causal structure, sanitized explanations and stack locations without credentials or paths. */ const recordErrorMetadata = (error, seen = new Set())=>{
    if (typeof error !== 'object' || error === null || seen.has(error) || seen.size >= 4) {
        return {};
    }
    seen.add(error);
    const payload = {};
    const name = Reflect.get(error, 'name');
    const code = Reflect.get(error, 'code');
    const domain = Reflect.get(error, 'domain');
    const stack = Reflect.get(error, 'stack');
    const message = Reflect.get(error, 'message');
    if (typeof name === 'string' && ERROR_NAMES.has(name)) {
        payload['errorName'] = name;
    }
    if (typeof code === 'string' && consts_ERROR_CODES.has(code)) {
        payload['errorCode'] = code;
    }
    if (typeof code === 'number' && Number.isSafeInteger(code)) {
        payload['nativeCode'] = code;
    }
    if (typeof domain === 'string' && ERROR_DOMAINS.has(domain)) {
        payload['errorDomain'] = domain;
    }
    for (const field of [
        'errno',
        'httpStatus'
    ]){
        const value = Reflect.get(error, field);
        if (typeof value === 'number' && Number.isSafeInteger(value)) {
            payload[field] = value;
        }
    }
    if (typeof message === 'string') {
        payload['messageHash'] = hashRecordDiagnosticValue(message);
        const safeMessage = sanitizeRecordDiagnosticText(message);
        if (safeMessage !== undefined) {
            payload['errorMessage'] = safeMessage;
        }
    }
    if (typeof stack === 'string') {
        payload['stackHash'] = hashRecordDiagnosticValue(stack);
        const safeStack = sanitizeRecordDiagnosticText(stack);
        if (safeStack !== undefined) {
            payload['errorStack'] = safeStack;
        }
        payload['stackFrames'] = stack.split('\n').slice(1, 13).map((frame)=>{
            const location = /:(\d+):(\d+)\)?$/.exec(frame);
            const details = {
                hash: hashRecordDiagnosticValue(frame)
            };
            if (location) {
                details['line'] = Number(location[1]);
                details['column'] = Number(location[2]);
            }
            return details;
        });
    }
    const cause = recordErrorMetadata(Reflect.get(error, 'cause'), seen);
    if (Object.keys(cause).length > 0) {
        payload['cause'] = cause;
        if (cause['errorCode'] !== undefined) {
            payload['errorCode'] = cause['errorCode'];
        }
    }
    return payload;
};
