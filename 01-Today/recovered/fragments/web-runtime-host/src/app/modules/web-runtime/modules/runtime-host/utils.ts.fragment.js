// Compiled fragment from ./src/app/modules/web-runtime/modules/runtime-host/utils.ts.
// The original TypeScript and import graph are not restored.

const isLogicalLocalhostOrigin = (value)=>{
    try {
        const origin = new URL(value);
        return origin.protocol === 'http:' && origin.hostname.length > '.localhost'.length && origin.hostname.endsWith('.localhost') && origin.port === '' && value === origin.origin;
    } catch  {
        return false;
    }
};
const isDesktopWebRuntimeLaunchMessage = (value)=>{
    if (!value || typeof value !== 'object') {
        return false;
    }
    const candidate = value;
    return candidate.type === 'launch' && typeof candidate.environment === 'object' && typeof candidate.nonce === 'string' && candidate.nonce.length > 0 && typeof candidate.serverPath === 'string' && candidate.serverPath.length > 0 && typeof candidate.surfaceOrigin === 'string' && isLogicalLocalhostOrigin(candidate.surfaceOrigin) && typeof candidate.token === 'string' && candidate.token.length > 0;
};
