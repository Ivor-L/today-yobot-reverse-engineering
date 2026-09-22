const MAX_RESPONSE_BYTES = 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 5_000;
// RPA performs existing online entitlement operations (10s upstream), and
// verification may try a 5s seat check before the legacy check. No retries:
// replaying activate/unbind after a lost response can consume business quota.
export function macOSControlRouteTimeout(path) {
    if (path === '/api/license/verify' || path === '/api/agent/instances_status')
        return 20_000;
    if (path === '/api/license/activate' || path === '/api/license/unbind')
        return 15_000;
    if (path === '/api/init/multi')
        return 30_000;
    return DEFAULT_TIMEOUT_MS;
}
const MACHINE_CODE_PATTERN = /^[0-9A-F]{4}(?:-[0-9A-F]{4}){3}$/;
export const MACOS_CONTROL_AGENT_CONFIG_TYPES = [
    'agents',
    'reply_strategy_v2',
    'sop_cache',
];
function parseConfigRequest(value) {
    if (!value || typeof value !== 'object'
        || !MACOS_CONTROL_AGENT_CONFIG_TYPES.includes(value.configType)
        || (value.method !== 'GET' && value.method !== 'POST'))
        return null;
    if (value.accountId !== undefined
        && (typeof value.accountId !== 'string'
            || value.accountId !== value.accountId.trim()
            || value.accountId.length < 1
            || value.accountId.length > 255
            || /[\u0000-\u001f\u007f]/.test(value.accountId)))
        return null;
    if (value.configType === 'reply_strategy_v2' && !value.accountId)
        return null;
    if (value.configType !== 'reply_strategy_v2' && value.accountId !== undefined)
        return null;
    if (value.method === 'GET' && value.body !== undefined)
        return null;
    if (value.method === 'POST' && !isRecord(value.body))
        return null;
    const query = value.accountId ? `?account_id=${encodeURIComponent(value.accountId)}` : '';
    return {
        path: `/api/config/${value.configType}${query}`,
        method: value.method,
        ...(value.method === 'POST' ? { body: value.body } : {}),
    };
}
function exactKeys(value, expected) {
    const actual = Object.keys(value).sort();
    const wanted = [...expected].sort();
    return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}
function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
function activationCode(value) {
    return typeof value === 'string' && value === value.trim() && value.length >= 1 && value.length <= 256;
}
function parseBody(path, value) {
    if (path === '/api/license/activate') {
        if (!isRecord(value) || !exactKeys(value, ['activation_code', 'machine_code'])
            || !activationCode(value.activation_code)
            || typeof value.machine_code !== 'string'
            || !MACHINE_CODE_PATTERN.test(value.machine_code))
            return undefined;
        return { activation_code: value.activation_code, machine_code: value.machine_code };
    }
    if (path === '/api/license/unbind') {
        if (!isRecord(value) || !exactKeys(value, ['activation_code'])
            || !activationCode(value.activation_code))
            return undefined;
        return { activation_code: value.activation_code };
    }
    if (path === '/api/mcp/control') {
        if (!isRecord(value) || !exactKeys(value, ['enabled', 'regenerate_token'])
            || typeof value.enabled !== 'boolean'
            || typeof value.regenerate_token !== 'boolean')
            return undefined;
        return { enabled: value.enabled, regenerate_token: value.regenerate_token };
    }
    if (path === '/api/init/multi') {
        if (!isRecord(value) || !exactKeys(value, ['timestamp'])
            || !Number.isSafeInteger(value.timestamp) || Number(value.timestamp) <= 0)
            return undefined;
        return { timestamp: value.timestamp };
    }
    if (path === '/api/moment/toggle-auto-comment'
        || path === '/api/friend/auto-add-new/toggle') {
        if (!isRecord(value) || !exactKeys(value, ['enabled']) || typeof value.enabled !== 'boolean') {
            return undefined;
        }
        return { enabled: value.enabled };
    }
    if (path === '/api/chat/multi-monitor/start' || path === '/api/chat/monitor/stop') {
        return isRecord(value) && exactKeys(value, []) ? {} : undefined;
    }
    return value === undefined ? {} : undefined;
}
export function parseMacOSControlTransportRequest(value) {
    if (!isRecord(value) || !exactKeys(value, value.method === 'POST'
        ? ['path', 'method', 'body']
        : ['path', 'method']))
        return null;
    if (typeof value.path !== 'string' || typeof value.method !== 'string')
        return null;
    const getRoutes = new Set([
        '/api/health',
        '/api/license/info',
        '/api/license/verify',
        '/api/license/machine-code',
        '/api/agent/instances_status',
        '/api/agent/features_status',
        '/api/instances/active',
    ]);
    const postRoutes = new Set([
        '/api/license/activate',
        '/api/license/unbind',
        '/api/mcp/control',
        '/api/init/multi',
        '/api/chat/multi-monitor/start',
        '/api/chat/monitor/stop',
        '/api/moment/toggle-auto-comment',
        '/api/friend/auto-add-new/toggle',
    ]);
    const method = value.method;
    if (method !== 'GET' && method !== 'POST')
        return null;
    if ((method === 'GET' && !getRoutes.has(value.path))
        || (method === 'POST' && !postRoutes.has(value.path)))
        return null;
    const path = value.path;
    const body = parseBody(path, value.body);
    if (body === undefined)
        return null;
    return Object.freeze({ path, method, ...(method === 'POST' ? { body } : {}) });
}
function failure(status, code, message) {
    return Object.freeze({
        success: false,
        status,
        contentType: 'application/json',
        bodyText: JSON.stringify({ success: false, code, message }),
    });
}
async function readLimitedBody(response, maxBytes) {
    const declared = Number(response.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > maxBytes)
        throw new Error('response too large');
    if (!response.body)
        return '';
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
        const item = await reader.read();
        if (item.done)
            break;
        total += item.value.byteLength;
        if (total > maxBytes) {
            await reader.cancel().catch(() => undefined);
            throw new Error('response too large');
        }
        chunks.push(item.value);
    }
    return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString('utf8');
}
export class MacOSControlTransport {
    owner;
    fetchFn;
    timeoutMs;
    maxResponseBytes;
    explicitTimeout;
    constructor(options) {
        if ((options.platform ?? process.platform) !== 'darwin') {
            throw new Error('macOS Control transport 只能在 Darwin 启用');
        }
        if (!options.owner || typeof options.owner.resolveOwnedLoopback !== 'function') {
            throw new Error('macOS Control transport owner 无效');
        }
        this.owner = options.owner;
        this.fetchFn = options.fetchFn ?? fetch;
        this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        this.explicitTimeout = options.timeoutMs !== undefined;
        this.maxResponseBytes = options.maxResponseBytes ?? MAX_RESPONSE_BYTES;
        if (!Number.isSafeInteger(this.timeoutMs) || this.timeoutMs < 100 || this.timeoutMs > 30_000
            || !Number.isSafeInteger(this.maxResponseBytes)
            || this.maxResponseBytes < 1024 || this.maxResponseBytes > MAX_RESPONSE_BYTES) {
            throw new Error('macOS Control transport limits 无效');
        }
    }
    async execute(input) {
        const request = parseMacOSControlTransportRequest(input);
        if (!request) {
            return failure(400, 'MACOS_RPA_REQUEST_INVALID', 'macOS RPA 本地请求无效');
        }
        return this.executeParsed(request);
    }
    /** Main-owned bridge for Agent/RPA binding configuration. Not exposed by the renderer parser. */
    async executeConfig(input) {
        const request = parseConfigRequest(input);
        if (!request) {
            return failure(400, 'MACOS_RPA_CONFIG_REQUEST_INVALID', 'macOS RPA 配置请求无效');
        }
        return this.executeParsed(request);
    }
    async executeParsed(request) {
        try {
            const target = await this.owner.resolveOwnedLoopback();
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), this.explicitTimeout ? this.timeoutMs : macOSControlRouteTimeout(request.path));
            try {
                const response = await this.fetchFn(`${target.apiBaseUrl}${request.path}`, {
                    method: request.method,
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'X-API-Key': target.credential.read(),
                        'X-Channel-ID': target.ownership.channel_id,
                    },
                    ...(request.body ? { body: JSON.stringify(request.body) } : {}),
                    cache: 'no-store',
                    credentials: 'omit',
                    redirect: 'error',
                    referrerPolicy: 'no-referrer',
                    signal: controller.signal,
                });
                const contentType = response.headers.get('content-type')?.split(';', 1)[0]?.trim();
                return Object.freeze({
                    success: true,
                    status: response.status,
                    contentType: contentType === 'application/json' ? contentType : 'text/plain',
                    bodyText: await readLimitedBody(response, this.maxResponseBytes),
                });
            }
            finally {
                clearTimeout(timeout);
            }
        }
        catch {
            return failure(503, 'MACOS_RPA_REQUEST_UNAVAILABLE', 'macOS RPA 本地服务暂不可用');
        }
    }
}
