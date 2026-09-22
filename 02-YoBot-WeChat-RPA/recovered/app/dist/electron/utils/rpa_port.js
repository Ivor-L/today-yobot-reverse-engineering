export const DEFAULT_RPA_PORT = 9922;
const FALLBACK_RPA_PORTS = [9923, 9924, 9925, 9926, 9927, 9928, 9929, 9930];
const MACOS_LOOPBACK_KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const RUNTIME_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CHANNEL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
let runtimeRpaLoopbackTransport = null;
function parsePort(value) {
    if (!value)
        return null;
    const port = Number(value);
    return Number.isInteger(port) && port > 0 && port < 65536 ? port : null;
}
export function getRuntimeRpaPort() {
    if (process.env.YOKO_MACOS_RPA_MAIN_OWNED === '1' && runtimeRpaLoopbackTransport) {
        return runtimeRpaLoopbackTransport.port;
    }
    return parsePort(process.env.YOKO_RPA_PORT) ?? DEFAULT_RPA_PORT;
}
export function setRuntimeRpaPort(port) {
    if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
        throw new Error('RPA runtime port is invalid');
    }
    process.env.YOKO_RPA_PORT = String(port);
}
/**
 * Resolve the current in-process RPA credential.
 *
 * Windows keeps its existing static/default-key behavior. On macOS Electron
 * main replaces this value over trusted child IPC whenever it owns a Control
 * runtime. Callers resolve lazily so clients created before RPA startup do not
 * retain the stale Windows fallback.
 */
export function getRuntimeRpaApiKey() {
    if (process.env.YOKO_MACOS_RPA_MAIN_OWNED !== '1')
        return 'yoko_test';
    return runtimeRpaLoopbackTransport?.apiKey ?? 'yoko_test';
}
export function applyRuntimeRpaLoopbackTransport(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('RPA loopback transport is invalid');
    }
    const candidate = value;
    const keys = Object.keys(candidate).sort();
    if (keys.join(',') !== ['apiKey', 'channelId', 'port', 'runtimeId'].sort().join(',')
        || typeof candidate.runtimeId !== 'string' || !RUNTIME_ID_PATTERN.test(candidate.runtimeId)
        || !Number.isSafeInteger(candidate.port) || Number(candidate.port) < 1 || Number(candidate.port) > 65535
        || typeof candidate.apiKey !== 'string' || !MACOS_LOOPBACK_KEY_PATTERN.test(candidate.apiKey)
        || typeof candidate.channelId !== 'string' || !CHANNEL_ID_PATTERN.test(candidate.channelId)) {
        throw new Error('RPA loopback transport is invalid');
    }
    const transport = Object.freeze({
        runtimeId: candidate.runtimeId,
        port: Number(candidate.port),
        apiKey: candidate.apiKey,
        channelId: candidate.channelId,
    });
    runtimeRpaLoopbackTransport = transport;
    process.env.YOKO_RPA_PORT = String(transport.port);
    return transport;
}
export function clearRuntimeRpaLoopbackTransport() {
    runtimeRpaLoopbackTransport = null;
    delete process.env.YOKO_RPA_PORT;
}
export function getRpaPortCandidates(preferredPort) {
    const envPort = parsePort(process.env.YOKO_RPA_PORT);
    return Array.from(new Set([
        preferredPort,
        envPort,
        DEFAULT_RPA_PORT,
        ...FALLBACK_RPA_PORTS,
    ].filter((port) => typeof port === 'number')));
}
export function getRpaHttpUrl(port = getRuntimeRpaPort()) {
    return `http://127.0.0.1:${port}`;
}
export function getRpaWsUrl(port = getRuntimeRpaPort()) {
    return `ws://127.0.0.1:${port}/ws`;
}
export function getPortFromUrl(url) {
    try {
        const parsed = new URL(url);
        return parsePort(parsed.port);
    }
    catch {
        return null;
    }
}
export function httpToWsUrl(httpUrl) {
    const parsed = new URL(httpUrl);
    parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    parsed.pathname = '/ws';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
}
async function fetchWithTimeout(url, init = {}, timeoutMs = 350) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    }
    finally {
        clearTimeout(timeoutId);
    }
}
export async function isRpaHealthy(httpUrl, strict = false) {
    try {
        const docs = await fetchWithTimeout(`${httpUrl}/docs`, { method: 'HEAD' });
        if (!docs.ok)
            return false;
        if (!strict)
            return true;
        const status = await fetchWithTimeout(`${httpUrl}/api/agent/instances_status`, {
            method: 'GET',
            headers: { 'X-API-Key': getRuntimeRpaApiKey() },
        });
        return status.ok;
    }
    catch {
        return false;
    }
}
export async function discoverRpaHttpUrl(preferredUrl) {
    const preferredPort = preferredUrl ? getPortFromUrl(preferredUrl) : null;
    for (const port of getRpaPortCandidates(preferredPort ?? undefined)) {
        const httpUrl = getRpaHttpUrl(port);
        const strict = port !== DEFAULT_RPA_PORT;
        if (await isRpaHealthy(httpUrl, strict)) {
            setRuntimeRpaPort(port);
            return httpUrl;
        }
    }
    return null;
}
