// Compiled fragment from ./src/app/modules/web-runtime/modules/runtime-host/modules/server/utils.ts.
// The original TypeScript and import graph are not restored.




const hasMatchingDesktopWebRuntimeSecret = (provided, expected)=>{
    if (typeof provided !== 'string') {
        return false;
    }
    const providedBuffer = Buffer.from(provided);
    const expectedBuffer = Buffer.from(expected);
    return providedBuffer.length === expectedBuffer.length && (0,external_node_crypto_namespaceObject.timingSafeEqual)(providedBuffer, expectedBuffer);
};
const readDistinctHeaders = (request)=>{
    return request.headersDistinct;
};
const readHeaderValues = (request, name)=>{
    const distinctValues = readDistinctHeaders(request)?.[name];
    if (distinctValues !== undefined) {
        return distinctValues;
    }
    const value = request.headers[name];
    if (Array.isArray(value)) {
        return value;
    }
    if (typeof value === 'string') {
        return [
            value
        ];
    }
    const rawValues = [];
    for(let index = 0; index + 1 < request.rawHeaders.length; index += 2){
        if (request.rawHeaders[index]?.toLowerCase() === name) {
            rawValues.push(request.rawHeaders[index + 1] ?? '');
        }
    }
    if (rawValues.length > 0) {
        return rawValues;
    }
    return undefined;
};
const removeRawHeaders = (request, names)=>{
    for(let index = request.rawHeaders.length - 2; index >= 0; index -= 2){
        const name = request.rawHeaders[index]?.toLowerCase();
        if (name && names.includes(name)) {
            request.rawHeaders.splice(index, 2);
        }
    }
};
const removeRequestHeaders = (request, names)=>{
    const distinctHeaders = readDistinctHeaders(request);
    for (const name of names){
        delete request.headers[name];
        if (distinctHeaders) {
            delete distinctHeaders[name];
        }
    }
    removeRawHeaders(request, names);
};
const setRequestHeader = (request, name, value)=>{
    request.headers[name] = value;
    const distinctHeaders = readDistinctHeaders(request);
    if (distinctHeaders) {
        distinctHeaders[name] = [
            value
        ];
    }
    request.rawHeaders.push(name, value);
};
const hasValidLogicalOriginMarker = (request, expectedSurfaceOrigin)=>{
    const logicalOrigin = request.headers[DESKTOP_WEB_RUNTIME_LOGICAL_ORIGIN_HEADER];
    const forwardedHost = request.headers['x-forwarded-host'];
    const forwardedProtocol = request.headers['x-forwarded-proto'];
    const logicalOrigins = readHeaderValues(request, DESKTOP_WEB_RUNTIME_LOGICAL_ORIGIN_HEADER);
    if (logicalOrigins === undefined) {
        return true;
    }
    const expectedOrigin = new URL(expectedSurfaceOrigin);
    const forwardedHosts = readHeaderValues(request, 'x-forwarded-host');
    const forwardedProtocols = readHeaderValues(request, 'x-forwarded-proto');
    const directOrigins = readHeaderValues(request, 'origin');
    const method = request.method?.toUpperCase();
    return method !== undefined && method !== 'GET' && method !== 'HEAD' && directOrigins === undefined && typeof logicalOrigin === 'string' && logicalOrigins.length === 1 && logicalOrigin === expectedSurfaceOrigin && logicalOrigins[0] === logicalOrigin && typeof forwardedHost === 'string' && forwardedHosts?.length === 1 && forwardedHost === expectedOrigin.host && forwardedHosts[0] === forwardedHost && typeof forwardedProtocol === 'string' && forwardedProtocols?.length === 1 && forwardedProtocol === expectedOrigin.protocol.slice(0, -1) && forwardedProtocols[0] === forwardedProtocol;
};
const rejectInvalidLogicalOrigin = (response)=>{
    response.statusCode = 400;
    response.setHeader('cache-control', 'no-store');
    response.end('Bad Request');
};
const createAuthenticatedRequestListener = (listener, token, nonce, expectedSurfaceOrigin)=>{
    let readinessNonce = nonce;
    return (request, response)=>{
        if (!hasMatchingDesktopWebRuntimeSecret(request.headers[DESKTOP_WEB_RUNTIME_AUTH_HEADER], token)) {
            response.statusCode = 403;
            response.setHeader('cache-control', 'no-store');
            response.end('Forbidden');
            return;
        }
        const logicalOrigin = readHeaderValues(request, DESKTOP_WEB_RUNTIME_LOGICAL_ORIGIN_HEADER)?.[0];
        const hasValidMarker = hasValidLogicalOriginMarker(request, expectedSurfaceOrigin);
        const provesReadiness = readinessNonce !== undefined && hasMatchingDesktopWebRuntimeSecret(request.headers[DESKTOP_WEB_RUNTIME_PROBE_HEADER], readinessNonce);
        removeRequestHeaders(request, PRIVATE_RUNTIME_REQUEST_HEADERS);
        removeRequestHeaders(request, ORIGIN_REQUEST_HEADERS);
        if (!hasValidMarker) {
            rejectInvalidLogicalOrigin(response);
            return;
        }
        if (logicalOrigin !== undefined) {
            setRequestHeader(request, 'origin', logicalOrigin);
        }
        if (provesReadiness && readinessNonce) {
            response.setHeader(DESKTOP_WEB_RUNTIME_PROBE_RESPONSE_HEADER, readinessNonce);
            readinessNonce = undefined;
        }
        listener(request, response);
    };
};
