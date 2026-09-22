// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/runtime-diagnostics/modules/node-network/utils.ts.
// The original TypeScript and import graph are not restored.


const readRequestHost = (request)=>{
    const header = request.getHeader('host');
    if (typeof header === 'string' || typeof header === 'number') {
        return String(header);
    }
    return request.host;
};
const createRequestState = (rawUrl, method, transport, policy)=>{
    if (isRuntimeLoopbackUrl(rawUrl) || isRuntimeTelemetryUrl(rawUrl, policy.telemetryEndpoints)) {
        return undefined;
    }
    const url = sanitizeRuntimeDiagnosticUrl(rawUrl);
    if (url === undefined) {
        return undefined;
    }
    return {
        method: sanitizeRuntimeDiagnosticMethod(method),
        startedAt: performance.now(),
        transport,
        url
    };
};
const createNodeHttpRequestState = (request, policy)=>{
    try {
        const base = `${request.protocol}//${readRequestHost(request)}`;
        const rawUrl = new URL(request.path, base).href;
        return createRequestState(rawUrl, request.method, 'node_http', policy);
    } catch  {
        return undefined;
    }
};
const createUndiciRequestState = (request, policy)=>{
    if (typeof request.origin !== 'string' && !(request.origin instanceof URL) || typeof request.path !== 'string') {
        return undefined;
    }
    try {
        const rawUrl = new URL(request.path, request.origin).href;
        return createRequestState(rawUrl, request.method, 'undici', policy);
    } catch  {
        return undefined;
    }
};
const resolveNodeNetworkDuration = (startedAt)=>Math.max(0, Math.round(performance.now() - startedAt));
const resolveNodeNetworkStatusCode = (value)=>typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599 ? value : undefined;
