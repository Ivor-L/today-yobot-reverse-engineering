// Compiled fragment from ./src/app/modules/web-runtime/modules/runtime-host/modules/diagnostics/utils.ts.
// The original TypeScript and import graph are not restored.





const CONTENT_TYPE_PATTERN = /^[A-Z0-9!#$&^_.+-]+\/[A-Z0-9!#$&^_.+-]+$/iu;
const sanitizeDesktopWebRuntimeHostUrl = (value)=>{
    try {
        const url = new URL(value);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return undefined;
        }
        const hostname = url.hostname.replace(/\.$/u, '').replace(/^\[|\]$/gu, '').toLowerCase();
        const ipVersion = (0,external_node_net_namespaceObject.isIP)(hostname);
        const isLoopbackIp = ipVersion === 4 && hostname.startsWith('127.') || ipVersion === 6 && (hostname === '::1' || /^::ffff:7f[0-9a-f]{2}:/u.test(hostname));
        if (hostname === 'localhost' || hostname.endsWith('.localhost') || isLoopbackIp) {
            return undefined;
        }
        url.username = '';
        url.password = '';
        url.search = '';
        url.hash = '';
        return takeDesktopWebRuntimeTextPrefix(url.href, (/* inlined export .DESKTOP_WEB_RUNTIME_DIAGNOSTIC_URL_MAX_BYTES */4096)).message;
    } catch  {
        return undefined;
    }
};
const readHeaderPart = (value)=>{
    if (typeof value === 'string') {
        return value;
    }
    if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
        return Buffer.from(value).toString('utf8');
    }
};
const sanitizeContentType = (value)=>{
    const mediaType = value.split(';', 1)[0]?.trim();
    if (!mediaType || !CONTENT_TYPE_PATTERN.test(mediaType)) {
        return undefined;
    }
    let result = '';
    for (const character of mediaType){
        const code = character.codePointAt(0) ?? 0;
        if (code >= 0x20 && code <= 0x7e) {
            result += character;
        }
    }
    if (!CONTENT_TYPE_PATTERN.test(result)) {
        return undefined;
    }
    return Buffer.from(result).subarray(0, (/* inlined export .DESKTOP_WEB_RUNTIME_DIAGNOSTIC_CONTENT_TYPE_MAX_BYTES */512)).toString('utf8');
};
const createDesktopWebRuntimeHostUrl = (origin, path)=>{
    if (typeof origin !== 'string' && !(origin instanceof URL) || typeof path !== 'string') {
        return undefined;
    }
    try {
        return sanitizeDesktopWebRuntimeHostNetworkUrl(new URL(path, origin).href);
    } catch  {
        return undefined;
    }
};
const isDesktopWebRuntimeHostTelemetryUrl = (value)=>{
    try {
        const url = new URL(value);
        const hostname = url.hostname.replace(/\.$/u, '').toLowerCase();
        if (url.pathname === '/monitoring' || url.pathname.startsWith('/monitoring/')) {
            return true;
        }
        return DESKTOP_WEB_RUNTIME_HOST_TELEMETRY_SUFFIXES.some((suffix)=>hostname === suffix || hostname.endsWith(`.${suffix}`));
    } catch  {
        return false;
    }
};
const readDesktopWebRuntimeHostContentType = (headers)=>{
    if (Array.isArray(headers)) {
        for(let index = 0; index + 1 < headers.length; index += 2){
            const name = readHeaderPart(headers[index]);
            if (name?.toLowerCase() !== 'content-type') {
                continue;
            }
            const value = readHeaderPart(headers[index + 1]);
            if (value === undefined) {
                return undefined;
            }
            return sanitizeContentType(value);
        }
        return undefined;
    }
    if (!headers || typeof headers !== 'object') {
        return undefined;
    }
    for (const [name, candidate] of Object.entries(headers)){
        if (name.toLowerCase() !== 'content-type') {
            continue;
        }
        const value = Array.isArray(candidate) ? readHeaderPart(candidate[0]) : readHeaderPart(candidate);
        if (value === undefined) {
            return undefined;
        }
        return sanitizeContentType(value);
    }
};
const readDesktopWebRuntimeHostErrorCode = (value)=>{
    if (!value || typeof value !== 'object') {
        return undefined;
    }
    const error = value;
    const code = typeof error.code === 'string' ? error.code.trim() : undefined;
    if (code && DESKTOP_WEB_RUNTIME_HOST_ERROR_CODE_PATTERN.test(code)) {
        return code;
    }
    const name = typeof error.name === 'string' ? error.name.trim() : undefined;
    if (name && DESKTOP_WEB_RUNTIME_HOST_ERROR_NAMES.includes(name)) {
        return name;
    }
};
const readDesktopWebRuntimeHostStatusCode = (value)=>{
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 100 || value > 599) {
        return undefined;
    }
    return value;
};
const resolveDesktopWebRuntimeHostDuration = (startedAt)=>Math.max(0, Math.round(performance.now() - startedAt));
const resolveDesktopWebRuntimeHostLevel = (statusCode, failed)=>{
    if (failed || statusCode !== undefined && statusCode >= 500) {
        return 'error';
    }
    if (statusCode !== undefined && statusCode >= 400) {
        return 'warning';
    }
    return 'log';
};
const sanitizeDesktopWebRuntimeHostMethod = (value)=>{
    if (typeof value !== 'string') {
        return 'UNKNOWN';
    }
    const method = value.trim().toUpperCase();
    if (!/^[A-Z-]{1,32}$/u.test(method)) {
        return 'UNKNOWN';
    }
    if (Buffer.byteLength(method) > (/* inlined export .DESKTOP_WEB_RUNTIME_DIAGNOSTIC_METHOD_MAX_BYTES */64)) {
        return 'UNKNOWN';
    }
    return method;
};
const sanitizeDesktopWebRuntimeHostNetworkUrl = (value)=>{
    if (isDesktopWebRuntimeHostTelemetryUrl(value)) {
        return undefined;
    }
    return sanitizeDesktopWebRuntimeHostUrl(value);
};
