// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/runtime-diagnostics/utils.ts.
// The original TypeScript and import graph are not restored.







const BEARER_CREDENTIAL_PATTERN = /\bbearer\s+[^\s,;]+/giu;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const AUTHORIZATION_ASSIGNMENT_PATTERN = /["']?\bauthorization\b["']?\s*[:=]\s*[^\r\n]*/giu;
const QUOTED_SENSITIVE_ASSIGNMENT_PATTERN = /["']?\b(authorization|cookie|set[-_]?cookie|token|session(?:_token)?|id_token|access_token|refresh_token|password|secret|ticket|oauth_state|code_verifier|otp|verification_code)\b["']?\s*[:=]\s*(?:"(?:\\.|[^"\\\r\n])*(?:"|\\?(?=\r?$))|'(?:\\.|[^'\\\r\n])*(?:'|\\?(?=\r?$)))/gimu;
const SENSITIVE_ASSIGNMENT_PATTERN = /\b(authorization|cookie|set[-_]?cookie|token|session(?:_token)?|id_token|access_token|refresh_token|password|secret|ticket|oauth_state|code_verifier|otp|verification_code)\s*[:=]\s*[^\s,;]+/giu;
const CONTENT_TYPE_PATTERN = /^[A-Z0-9!#$&^_.+-]+\/[A-Z0-9!#$&^_.+-]+$/iu;
const NETWORK_ERROR_CODE_PATTERN = /^(?:E[A-Z0-9_]{1,63}|ABORT_ERR|CERT_[A-Z0-9_]{1,58}|HPE_[A-Z0-9_]{1,59}|UND_ERR_[A-Z0-9_]{1,55}|net::ERR_[A-Z0-9_]{1,55})$/u;
const BARE_STACK_LOCAL_PATH_PATTERN = /(^\s*at(?:\s+async)?\s+)(?:file:\/\/\/|\/|[A-Z]:[\\/]|\\\\)[^\r\n]+(?=:\d+:\d+$)/gimu;
const FILE_URL_PATTERN = /\bfile:\/\/\/[^\s<>"')\]}]+/giu;
const PAREN_STACK_LOCAL_PATH_PATTERN = /(^\s*at\b[^\r\n(]*\()(?:file:\/\/\/|\/|[A-Z]:[\\/]|\\\\)[^)\r\n]+(?=:\d+:\d+\)?$)/gimu;
const POSIX_LOCAL_PATH_PATTERN = /(?<![:/A-Za-z0-9_.-])\/(?:Applications|Library|System|Users|Volumes|private|var|tmp|opt|usr|etc|home|root)(?:\/[^\s<>"']*)?/gu;
const WINDOWS_LOCAL_PATH_PATTERN = /(?<![A-Z0-9_])(?:[A-Z]:[\\/]|\\\\)[^\s<>"']+/giu;
const URL_PATTERN = /\bhttps?:\/\/[^\s<>"']+/giu;
const URL_TRAILING_PUNCTUATION_PATTERN = /[),.;\]}]+$/u;
const UUID_PATH_SEGMENT_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const NETWORK_ERROR_NAMES = new Set([
    'AbortError',
    'Error',
    'SystemError',
    'TimeoutError',
    'TypeError'
]);
const escapeRegExp = (value)=>value.replaceAll(/[.*+?^${}()|[\]\\]/gu, '\\$&');
const normalizeRuntimeDiagnosticHostname = (value)=>value.replace(/\.$/u, '').toLowerCase();
const stripControlCharacters = (value)=>{
    let result = '';
    for (const character of value){
        const code = character.codePointAt(0) ?? 0;
        const isAllowedWhitespace = code === 0x09 || code === 0x0a || code === 0x0d;
        if (isAllowedWhitespace || code >= 0x20 && code <= 0x7e || code >= 0xa0) {
            result += character;
        }
    }
    return result;
};
const replacePath = (value, path)=>{
    if (path.length === 0 || path === (0,external_node_path_namespaceObject.parse)(path).root) {
        return value;
    }
    return value.replaceAll(new RegExp(escapeRegExp(path), 'gu'), '[path]');
};
const readHeaderPart = (value)=>{
    if (typeof value === 'string') {
        return value;
    }
    if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
        return Buffer.from(value).toString('utf8');
    }
    return undefined;
};
const sanitizeContentType = (value)=>{
    const contentType = stripControlCharacters((0,external_node_util_namespaceObject.stripVTControlCharacters)(value)).trim();
    const mediaType = contentType.split(';', 1)[0]?.trim();
    if (mediaType === undefined || !CONTENT_TYPE_PATTERN.test(mediaType)) {
        return undefined;
    }
    return mediaType.slice(0, (/* inlined export .RUNTIME_DIAGNOSTIC_CONTENT_TYPE_MAX_LENGTH */256));
};
const truncateUtf8 = (value, maxBytes)=>{
    const bytes = Buffer.from(value);
    if (bytes.byteLength <= maxBytes) {
        return {
            message: value,
            truncated: false
        };
    }
    let end = maxBytes;
    while(end > 0 && (bytes[end] ?? 0) >= 0x80 && (bytes[end] ?? 0) < 0xc0){
        end -= 1;
    }
    return {
        message: bytes.subarray(0, end).toString('utf8'),
        truncated: true
    };
};
const sanitizeUrlInText = (candidate)=>{
    const trailing = candidate.match(URL_TRAILING_PUNCTUATION_PATTERN)?.[0] ?? '';
    const rawUrl = trailing.length === 0 ? candidate : candidate.slice(0, -trailing.length);
    const safeUrl = sanitizeRuntimeDiagnosticUrl(rawUrl);
    return `${safeUrl ?? '[url]'}${trailing}`;
};
const sanitizeUrlPathname = (pathname)=>pathname.split('/').map((segment)=>{
        const normalizedIpCandidate = segment.replace(/^\[|\]$/gu, '');
        const isOpaque = segment.includes('%') || segment.includes('@') || segment.length >= 24 || /^\d+$/u.test(segment) || UUID_PATH_SEGMENT_PATTERN.test(segment) || (0,external_node_net_namespaceObject.isIP)(normalizedIpCandidate) !== 0;
        return isOpaque ? ':id' : segment;
    }).join('/');
const appendTelemetryEndpoint = (endpoints, value, matchOrigin)=>{
    try {
        const url = new URL(value);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return;
        }
        url.hostname = normalizeRuntimeDiagnosticHostname(url.hostname);
        const pathname = url.pathname.replace(/\/+$/u, '') || '/';
        const pathPrefix = matchOrigin || pathname === '/' ? undefined : pathname;
        endpoints.push({
            origin: url.origin,
            ...pathPrefix === undefined ? {} : {
                pathPrefix
            }
        });
    } catch  {
    // Invalid telemetry configuration must not disable local diagnostics.
    }
};
const takeRuntimeDiagnosticTextPrefix = (value)=>{
    const byteLength = Buffer.byteLength(value);
    const truncated = truncateUtf8(value, (/* inlined export .RUNTIME_DIAGNOSTIC_TEXT_MAX_BYTES */8192));
    return {
        byteLength,
        message: truncated.message,
        truncated: truncated.truncated
    };
};
const sanitizeRuntimeDiagnosticText = (value)=>{
    const byteLength = Buffer.byteLength(value);
    const input = truncateUtf8(value, (/* inlined export .RUNTIME_DIAGNOSTIC_TEXT_MAX_BYTES */8192));
    let message = stripControlCharacters((0,external_node_util_namespaceObject.stripVTControlCharacters)(input.message));
    message = message.replaceAll(URL_PATTERN, sanitizeUrlInText);
    message = message.replaceAll(AUTHORIZATION_ASSIGNMENT_PATTERN, 'auth_header=[redacted]');
    message = message.replaceAll(QUOTED_SENSITIVE_ASSIGNMENT_PATTERN, '$1=[redacted]');
    message = message.replaceAll(BEARER_CREDENTIAL_PATTERN, 'Bearer [redacted]');
    message = message.replaceAll(SENSITIVE_ASSIGNMENT_PATTERN, '$1=[redacted]');
    message = message.replaceAll(EMAIL_PATTERN, '[email]');
    message = replacePath(message, process.cwd());
    message = replacePath(message, (0,external_node_os_namespaceObject.homedir)());
    message = message.replaceAll(PAREN_STACK_LOCAL_PATH_PATTERN, '$1[path]');
    message = message.replaceAll(BARE_STACK_LOCAL_PATH_PATTERN, '$1[path]');
    message = message.replaceAll(FILE_URL_PATTERN, '[path]');
    message = message.replaceAll(POSIX_LOCAL_PATH_PATTERN, '[path]');
    message = message.replaceAll(WINDOWS_LOCAL_PATH_PATTERN, '[path]');
    message = message.trim();
    if (message.length === 0) {
        return undefined;
    }
    const truncated = truncateUtf8(message, (/* inlined export .RUNTIME_DIAGNOSTIC_TEXT_MAX_BYTES */8192));
    return {
        byteLength,
        message: truncated.message,
        truncated: input.truncated || truncated.truncated
    };
};
const sanitizeRuntimeDiagnosticUrl = (value)=>{
    try {
        const url = new URL(value);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return undefined;
        }
        const normalizedHostname = url.hostname.replace(/^\[|\]$/gu, '');
        const safeHost = (0,external_node_net_namespaceObject.isIP)(normalizedHostname) === 0 ? url.host : '[ip]';
        const safeUrl = `${url.protocol}//${safeHost}${sanitizeUrlPathname(url.pathname)}`;
        return truncateUtf8(safeUrl, (/* inlined export .RUNTIME_DIAGNOSTIC_URL_MAX_BYTES */2048)).message;
    } catch  {
        return undefined;
    }
};
const resolveRuntimeTelemetryEndpoints = (config)=>{
    const endpoints = [];
    for (const profile of Object.values(config.sentry ?? {})){
        if (profile) {
            appendTelemetryEndpoint(endpoints, profile.dsn, true);
        }
    }
    for (const profile of Object.values(config.postHog ?? {})){
        if (profile) {
            appendTelemetryEndpoint(endpoints, profile.host, false);
        }
    }
    return Object.freeze(endpoints);
};
const isRuntimeTelemetryUrl = (value, endpoints)=>{
    try {
        const url = new URL(value);
        url.hostname = normalizeRuntimeDiagnosticHostname(url.hostname);
        const hostname = url.hostname;
        if (url.pathname === '/monitoring' || url.pathname.startsWith('/monitoring/')) {
            return true;
        }
        if (TELEMETRY_HOST_SUFFIXES.some((suffix)=>hostname === suffix || hostname.endsWith(`.${suffix}`))) {
            return true;
        }
        return endpoints.some((endpoint)=>{
            if (url.origin !== endpoint.origin) {
                return false;
            }
            if (endpoint.pathPrefix === undefined) {
                return true;
            }
            return url.pathname === endpoint.pathPrefix || url.pathname.startsWith(`${endpoint.pathPrefix}/`);
        });
    } catch  {
        return false;
    }
};
const isRuntimeLoopbackUrl = (value)=>{
    try {
        const hostname = normalizeRuntimeDiagnosticHostname(new URL(value).hostname).replace(/^\[|\]$/gu, '');
        const ipVersion = (0,external_node_net_namespaceObject.isIP)(hostname);
        return hostname === 'localhost' || hostname.endsWith('.localhost') || ipVersion === 4 && hostname.startsWith('127.') || ipVersion === 6 && (hostname === '::1' || /^::ffff:7f[0-9a-f]{2}:/u.test(hostname));
    } catch  {
        return false;
    }
};
const resolveRuntimeDiagnosticContentType = (headers)=>{
    if (Array.isArray(headers)) {
        for(let index = 0; index + 1 < headers.length; index += 2){
            const name = readHeaderPart(headers[index]);
            if (name?.toLowerCase() !== 'content-type') {
                continue;
            }
            const value = readHeaderPart(headers[index + 1]);
            return value === undefined ? undefined : sanitizeContentType(value);
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
        return value === undefined ? undefined : sanitizeContentType(value);
    }
    return undefined;
};
const sanitizeRuntimeDiagnosticMethod = (value)=>{
    if (typeof value !== 'string') {
        return 'UNKNOWN';
    }
    const method = value.trim().toUpperCase();
    return /^[A-Z-]{1,32}$/u.test(method) ? method : 'UNKNOWN';
};
const resolveRuntimeDiagnosticErrorCode = (value)=>{
    if (value && typeof value === 'object') {
        const error = value;
        const code = typeof error.code === 'string' ? error.code.trim() : undefined;
        if (code !== undefined && NETWORK_ERROR_CODE_PATTERN.test(code)) {
            return code;
        }
        const name = typeof error.name === 'string' ? error.name.trim() : undefined;
        return name !== undefined && NETWORK_ERROR_NAMES.has(name) ? name : undefined;
    }
    if (typeof value !== 'string') {
        return undefined;
    }
    const code = value.trim();
    return NETWORK_ERROR_CODE_PATTERN.test(code) || NETWORK_ERROR_NAMES.has(code) ? code : undefined;
};
const resolveRuntimeDiagnosticNetworkLevel = (statusCode, failed)=>{
    if (failed || statusCode !== undefined && statusCode >= 500) {
        return base_LogLevel.Error;
    }
    if (statusCode !== undefined && statusCode >= 400) {
        return base_LogLevel.Warning;
    }
    return base_LogLevel.Log;
};
