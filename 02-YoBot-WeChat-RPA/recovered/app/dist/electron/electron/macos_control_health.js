import { RPA_MACOS_BUNDLE_NAME, RPA_MACOS_CONTROL_BUNDLE_ID, RPA_MACOS_HELPER_BUNDLE_ID, RPA_MACOS_HELPER_RELATIVE_PATH, RPA_MACOS_TEAM_ID, } from './plugin_manifest.js';
import { MacOSControlLoopbackCredential, } from './macos_control_driver.js';
const DEFAULT_REQUEST_TIMEOUT_MS = 2_500;
const DEFAULT_TOTAL_READY_TIMEOUT_MS = 60_000;
// The notarized Python Control may spend up to 30 seconds in its existing
// SQLite/APScheduler busy window before the loopback Host begins listening.
// Keep the probe bounded, but do not roll back a correctly authenticated cold
// launch at the former 10-second boundary.
const DEFAULT_READY_ATTEMPTS = 160;
const DEFAULT_RETRY_INTERVAL_MS = 250;
const MAX_RESPONSE_BYTES = 64 * 1024;
const MAX_CAPABILITY_COUNT = 512;
const MAX_CAPABILITY_NAME_LENGTH = 128;
const MAX_CAPABILITY_REASON_LENGTH = 256;
const MAX_CAPABILITY_PERMISSION_COUNT = 32;
const MAX_CAPABILITY_PERMISSION_LENGTH = 128;
const CAPABILITY_NAME_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const CAPABILITY_STATUSES = new Set([
    'supported',
    'experimental',
    'permission_required',
    'client_version_unsupported',
    'unavailable',
]);
const EXPECTED_DRIVER_ID = 'macos.ax.qt-4_x';
const EXPECTED_DRIVER_API_VERSION = '1.0';
export class MacOSControlHealthError extends Error {
    code;
    retryable;
    causeCode;
    constructor(code, message, options = {}) {
        super(message);
        this.name = 'MacOSControlHealthError';
        this.code = code;
        this.retryable = options.retryable ?? false;
        this.causeCode = options.causeCode;
    }
    toJSON() {
        return {
            name: this.name,
            code: this.code,
            retryable: this.retryable,
            ...(this.causeCode ? { causeCode: this.causeCode } : {}),
            message: this.message,
        };
    }
}
function raceWithAbort(task, signal, message) {
    if (signal.aborted)
        return Promise.reject(healthError('MACOS_CONTROL_CANCELLED', message));
    return new Promise((resolve, reject) => {
        const aborted = () => reject(healthError('MACOS_CONTROL_CANCELLED', message));
        signal.addEventListener('abort', aborted, { once: true });
        void task.then((value) => { signal.removeEventListener('abort', aborted); resolve(value); }, (error) => { signal.removeEventListener('abort', aborted); reject(error); });
    });
}
function healthError(code, message, retryable = false) {
    return new MacOSControlHealthError(code, message, { retryable });
}
function requireRecord(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw healthError('MACOS_CONTROL_HEALTH_RESPONSE_INVALID', 'Control 返回了无效 JSON 结构');
    }
    return value;
}
function requireExactKeys(record, expected, code = 'MACOS_CONTROL_HEALTH_RESPONSE_INVALID') {
    const actual = Object.keys(record).sort();
    const wanted = [...expected].sort();
    if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
        throw healthError(code, 'Control 返回了不受支持的响应字段');
    }
}
function safePositiveInteger(value, fallback, label, maximum) {
    const normalized = value ?? fallback;
    if (!Number.isSafeInteger(normalized) || normalized < 1 || normalized > maximum) {
        throw new MacOSControlHealthError('MACOS_CONTROL_CONTRACT_MISMATCH', `${label} 无效`);
    }
    return normalized;
}
function validateExpectation(expectation) {
    const { manifest, ownership, credential } = expectation;
    const identity = manifest.macos_identity;
    if (!(credential instanceof MacOSControlLoopbackCredential)) {
        throw healthError('MACOS_CONTROL_CONTRACT_MISMATCH', 'Control loopback credential 无效');
    }
    if (ownership.phase !== 'running' || ownership.pid === null
        || ownership.schema_version !== 1
        || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ownership.runtime_id)
        || !Number.isSafeInteger(ownership.pid) || ownership.pid <= 0
        || !Number.isSafeInteger(ownership.port) || ownership.port < 1 || ownership.port > 65535
        || ownership.bundle_identifier !== RPA_MACOS_CONTROL_BUNDLE_ID
        || manifest.platform !== 'darwin' || manifest.architecture !== 'arm64'
        || manifest.artifact_type !== 'macos-app-bundle'
        || manifest.entrypoint !== RPA_MACOS_BUNDLE_NAME
        || manifest.runtime_contract_version !== '1.0'
        || !identity
        || identity.control_bundle_identifier !== RPA_MACOS_CONTROL_BUNDLE_ID
        || identity.helper_bundle_identifier !== RPA_MACOS_HELPER_BUNDLE_ID
        || identity.team_identifier !== RPA_MACOS_TEAM_ID
        || identity.bundle_name !== RPA_MACOS_BUNDLE_NAME
        || identity.helper_relative_path !== RPA_MACOS_HELPER_RELATIVE_PATH
        || identity.build_channel !== 'production'
        || identity.capability_wave !== 'none'
        || ownership.version !== manifest.version
        || ownership.channel_id !== manifest.channel_id) {
        throw healthError('MACOS_CONTROL_CONTRACT_MISMATCH', 'Control owner 与已验签插件清单不匹配');
    }
}
async function readBoundedJson(response) {
    const contentType = response.headers.get('content-type') ?? '';
    if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
        throw healthError('MACOS_CONTROL_HEALTH_RESPONSE_INVALID', 'Control 响应类型不是 JSON');
    }
    const contentLength = response.headers.get('content-length');
    if (contentLength !== null
        && (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_RESPONSE_BYTES)) {
        throw healthError('MACOS_CONTROL_HEALTH_RESPONSE_INVALID', 'Control 响应大小无效');
    }
    if (!response.body) {
        throw healthError('MACOS_CONTROL_HEALTH_RESPONSE_INVALID', 'Control 响应正文为空');
    }
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    try {
        while (true) {
            const item = await reader.read();
            if (item.done)
                break;
            total += item.value.byteLength;
            if (total > MAX_RESPONSE_BYTES) {
                await reader.cancel();
                throw healthError('MACOS_CONTROL_HEALTH_RESPONSE_INVALID', 'Control 响应超过大小上限');
            }
            chunks.push(item.value);
        }
    }
    finally {
        reader.releaseLock();
    }
    if (total === 0) {
        throw healthError('MACOS_CONTROL_HEALTH_RESPONSE_INVALID', 'Control 响应正文为空');
    }
    const body = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString('utf8');
    try {
        return JSON.parse(body);
    }
    catch {
        throw healthError('MACOS_CONTROL_HEALTH_RESPONSE_INVALID', 'Control 响应不是有效 JSON');
    }
}
function validateHostHealth(value) {
    const body = requireRecord(value);
    requireExactKeys(body, ['status', 'service', 'component', 'schemaVersion']);
    if (body.status !== 'ok' || body.service !== 'yokobot'
        || body.component !== 'control-host' || body.schemaVersion !== 1) {
        throw healthError('MACOS_CONTROL_HEALTH_NOT_READY', 'Control Host 尚未就绪', true);
    }
}
function validateRuntimeIdentity(value, ownership) {
    const body = requireRecord(value);
    requireExactKeys(body, ['success', 'data']);
    const data = requireRecord(body.data);
    requireExactKeys(data, ['schemaVersion', 'runtimeId', 'pid', 'channelId', 'backendMode']);
    if (body.success !== true || data.schemaVersion !== 1 || data.backendMode !== true
        || data.runtimeId !== ownership.runtime_id || data.pid !== ownership.pid
        || data.channelId !== ownership.channel_id) {
        throw healthError('MACOS_CONTROL_RUNTIME_IDENTITY_MISMATCH', 'Control 未回显当前 Agent runtime owner');
    }
}
function validateAgentContract(value, manifest) {
    const body = requireRecord(value);
    requireExactKeys(body, ['success', 'data']);
    const data = requireRecord(body.data);
    requireExactKeys(data, [
        'appVersion',
        'contractVersion',
        'supportedContractVersions',
        'driverApiVersion',
    ]);
    const supported = data.supportedContractVersions;
    if (body.success !== true || data.appVersion !== manifest.version) {
        throw healthError('MACOS_CONTROL_VERSION_MISMATCH', 'Control 版本与已激活插件不匹配');
    }
    if (data.contractVersion !== manifest.runtime_contract_version
        || data.driverApiVersion !== EXPECTED_DRIVER_API_VERSION
        || !Array.isArray(supported)
        || supported.length === 0
        || supported.some((version) => typeof version !== 'string' || !/^\d+\.\d+$/.test(version))
        || new Set(supported).size !== supported.length
        || !supported.includes(manifest.runtime_contract_version)) {
        throw healthError('MACOS_CONTROL_CONTRACT_MISMATCH', 'Control Runtime Contract 不兼容');
    }
}
function validateCapabilityState(value) {
    const state = requireRecord(value);
    if (typeof state.status !== 'string' || !CAPABILITY_STATUSES.has(state.status)) {
        throw healthError('MACOS_CONTROL_CAPABILITY_MISMATCH', 'Control 能力状态无效');
    }
    if (state.reasonCode !== null
        && (typeof state.reasonCode !== 'string'
            || state.reasonCode.length === 0
            || state.reasonCode.length > MAX_CAPABILITY_REASON_LENGTH)) {
        throw healthError('MACOS_CONTROL_CAPABILITY_MISMATCH', 'Control 能力原因码无效');
    }
    if (state.status !== 'supported' && state.reasonCode === null) {
        throw healthError('MACOS_CONTROL_CAPABILITY_MISMATCH', 'Control 能力状态缺少原因码');
    }
    if (!Array.isArray(state.requiredPermissions)
        || state.requiredPermissions.length > MAX_CAPABILITY_PERMISSION_COUNT
        || state.requiredPermissions.some((permission) => (typeof permission !== 'string'
            || permission.length === 0
            || permission.length > MAX_CAPABILITY_PERMISSION_LENGTH))
        || new Set(state.requiredPermissions).size !== state.requiredPermissions.length) {
        throw healthError('MACOS_CONTROL_CAPABILITY_MISMATCH', 'Control 能力权限声明无效');
    }
    if (state.status === 'permission_required' && state.requiredPermissions.length === 0) {
        throw healthError('MACOS_CONTROL_CAPABILITY_MISMATCH', 'Control 能力缺少所需权限');
    }
}
function validateRuntimeCapabilities(value, manifest) {
    const body = requireRecord(value);
    requireExactKeys(body, ['success', 'data']);
    const data = requireRecord(body.data);
    requireExactKeys(data, [
        'contractVersion',
        'platform',
        'arch',
        'driverId',
        'driverApiVersion',
        'capabilities',
    ], 'MACOS_CONTROL_CAPABILITY_MISMATCH');
    if (body.success !== true
        || data.contractVersion !== manifest.runtime_contract_version
        || data.platform !== 'darwin'
        || data.arch !== 'arm64'
        || data.driverId !== EXPECTED_DRIVER_ID
        || data.driverApiVersion !== EXPECTED_DRIVER_API_VERSION) {
        throw healthError('MACOS_CONTROL_CAPABILITY_MISMATCH', 'Control 平台或 Driver 能力契约不匹配');
    }
    const capabilities = requireRecord(data.capabilities);
    const entries = Object.entries(capabilities);
    if (entries.length > MAX_CAPABILITY_COUNT) {
        throw healthError('MACOS_CONTROL_CAPABILITY_MISMATCH', 'Control 能力目录超过上限');
    }
    // The catalog is negotiated data, not an Agent/RPA release lock. Names and
    // defined runtime-v1 states may evolve independently; callers consume only
    // capabilities they understand. Authorization remains enforced by the
    // authenticated runtime and server policy, never by this discovery payload.
    for (const [name, state] of entries) {
        if (name.length > MAX_CAPABILITY_NAME_LENGTH || !CAPABILITY_NAME_PATTERN.test(name)) {
            throw healthError('MACOS_CONTROL_CAPABILITY_MISMATCH', 'Control 能力名称无效');
        }
        validateCapabilityState(state);
    }
    return entries.length;
}
export class MacOSControlHealthGate {
    fetcher;
    readyAttempts;
    requestTimeoutMs;
    totalReadyTimeoutMs;
    retryIntervalMs;
    sleep;
    livenessProbe;
    constructor(options = {}) {
        if ((options.platform ?? process.platform) !== 'darwin') {
            throw healthError('MACOS_CONTROL_CONTRACT_MISMATCH', 'macOS Control health gate 只能在 Darwin 使用');
        }
        this.fetcher = options.fetcher ?? fetch;
        this.readyAttempts = safePositiveInteger(options.readyAttempts, DEFAULT_READY_ATTEMPTS, 'readyAttempts', 240);
        this.requestTimeoutMs = safePositiveInteger(options.requestTimeoutMs, DEFAULT_REQUEST_TIMEOUT_MS, 'requestTimeoutMs', 30_000);
        this.totalReadyTimeoutMs = safePositiveInteger(options.totalReadyTimeoutMs, DEFAULT_TOTAL_READY_TIMEOUT_MS, 'totalReadyTimeoutMs', 120_000);
        this.retryIntervalMs = options.retryIntervalMs ?? DEFAULT_RETRY_INTERVAL_MS;
        if (!Number.isSafeInteger(this.retryIntervalMs)
            || this.retryIntervalMs < 0 || this.retryIntervalMs > 5_000) {
            throw healthError('MACOS_CONTROL_CONTRACT_MISMATCH', 'retryIntervalMs 无效');
        }
        this.sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
        if (options.livenessProbe !== undefined && typeof options.livenessProbe !== 'function') {
            throw healthError('MACOS_CONTROL_CONTRACT_MISMATCH', 'livenessProbe 无效');
        }
        this.livenessProbe = options.livenessProbe;
    }
    async request(baseUrl, pathname, credential, kind, signal) {
        const controller = new AbortController();
        let timer;
        let timedOut = false;
        try {
            const timeout = new Promise((_resolve, reject) => {
                timer = setTimeout(() => {
                    timedOut = true;
                    controller.abort();
                    reject(healthError('MACOS_CONTROL_HEALTH_REQUEST_TIMEOUT', 'Control loopback 请求超时', true));
                }, this.requestTimeoutMs);
            });
            const requestSignal = signal ? AbortSignal.any([controller.signal, signal]) : controller.signal;
            const operation = (async () => {
                const response = await this.fetcher(`${baseUrl}${pathname}`, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        'X-API-Key': credential.read(),
                    },
                    cache: 'no-store',
                    credentials: 'omit',
                    redirect: 'error',
                    referrerPolicy: 'no-referrer',
                    signal: requestSignal,
                });
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        throw healthError('MACOS_CONTROL_AUTH_REJECTED', 'Control 拒绝 loopback credential');
                    }
                    if (kind === 'identity' && response.status === 404) {
                        throw healthError('MACOS_CONTROL_RUNTIME_IDENTITY_UNAVAILABLE', 'Control 尚未提供 runtime identity contract');
                    }
                    if ([408, 425, 429, 500, 502, 503, 504].includes(response.status)) {
                        throw healthError('MACOS_CONTROL_HEALTH_NOT_READY', 'Control 尚未就绪', true);
                    }
                    throw healthError('MACOS_CONTROL_HEALTH_HTTP_REJECTED', 'Control 返回了非预期 HTTP 状态');
                }
                return readBoundedJson(response);
            })();
            const bounded = Promise.race([operation, timeout]);
            return await (signal
                ? raceWithAbort(bounded, signal, 'Control 健康检查已取消')
                : bounded);
        }
        catch (error) {
            if (error instanceof MacOSControlHealthError)
                throw error;
            if (signal?.aborted) {
                throw healthError('MACOS_CONTROL_CANCELLED', 'Control 健康检查已取消');
            }
            if (timedOut) {
                throw healthError('MACOS_CONTROL_HEALTH_REQUEST_TIMEOUT', 'Control loopback 请求超时', true);
            }
            throw healthError('MACOS_CONTROL_HEALTH_TRANSPORT_ERROR', 'Control loopback 连接失败', true);
        }
        finally {
            if (timer)
                clearTimeout(timer);
        }
    }
    /** Probe only the fixed owner port; no port discovery or alternate host fallback is allowed. */
    async probeReady(expectation, signal) {
        validateExpectation(expectation);
        const { manifest, ownership, credential } = expectation;
        const baseUrl = `http://127.0.0.1:${ownership.port}`;
        validateHostHealth(await this.request(baseUrl, '/api/health', credential, 'health', signal));
        validateRuntimeIdentity(await this.request(baseUrl, '/api/agent/runtime-identity', credential, 'identity', signal), ownership);
        validateAgentContract(await this.request(baseUrl, '/api/agent/contract', credential, 'contract', signal), manifest);
        const capabilityCount = validateRuntimeCapabilities(await this.request(baseUrl, '/api/runtime/capabilities', credential, 'capabilities', signal), manifest);
        return {
            schemaVersion: 1,
            runtimeId: ownership.runtime_id,
            pid: ownership.pid,
            channelId: ownership.channel_id,
            version: manifest.version,
            contractVersion: manifest.runtime_contract_version,
            driverId: EXPECTED_DRIVER_ID,
            driverApiVersion: EXPECTED_DRIVER_API_VERSION,
            capabilityWave: 'none',
            capabilityCount,
        };
    }
    /** Retry transient startup states, while deterministic owner/auth/version mismatches fail immediately. */
    async waitUntilReady(expectation, signal) {
        validateExpectation(expectation);
        if (signal?.aborted)
            throw healthError('MACOS_CONTROL_CANCELLED', 'Control 健康检查已取消');
        const deadline = new AbortController();
        const deadlineTimer = setTimeout(() => deadline.abort(), this.totalReadyTimeoutMs);
        const activeSignal = signal ? AbortSignal.any([signal, deadline.signal]) : deadline.signal;
        let lastError;
        try {
            for (let attempt = 0; attempt < this.readyAttempts; attempt += 1) {
                if (deadline.signal.aborted)
                    break;
                if (signal?.aborted)
                    throw healthError('MACOS_CONTROL_CANCELLED', 'Control 健康检查已取消');
                if (attempt > 0) {
                    try {
                        await raceWithAbort(this.sleep(this.retryIntervalMs), activeSignal, 'Control 健康检查已取消');
                    }
                    catch (error) {
                        if (deadline.signal.aborted)
                            break;
                        throw error;
                    }
                }
                try {
                    return await this.probeReady(expectation, activeSignal);
                }
                catch (error) {
                    if (deadline.signal.aborted)
                        break;
                    if (signal?.aborted)
                        throw healthError('MACOS_CONTROL_CANCELLED', 'Control 健康检查已取消');
                    if (!(error instanceof MacOSControlHealthError))
                        throw error;
                    if (!error.retryable)
                        throw error;
                    if (this.livenessProbe) {
                        let alive = true;
                        try {
                            alive = await raceWithAbort(this.livenessProbe(expectation.ownership), activeSignal, 'Control 健康检查已取消');
                        }
                        catch {
                            if (deadline.signal.aborted)
                                break;
                            if (signal?.aborted)
                                throw healthError('MACOS_CONTROL_CANCELLED', 'Control 健康检查已取消');
                            // A transient LaunchServices inspection failure must not override
                            // the bounded authenticated health gate. Only a proven exit is
                            // promoted to a deterministic lifecycle failure.
                        }
                        if (!alive) {
                            throw new MacOSControlHealthError('MACOS_CONTROL_PROCESS_EXITED', 'Control 进程在健康检查完成前退出', { causeCode: error.code });
                        }
                    }
                    lastError = error;
                }
            }
        }
        finally {
            clearTimeout(deadlineTimer);
        }
        throw new MacOSControlHealthError('MACOS_CONTROL_READY_TIMEOUT', 'Control 未在健康等待窗口内就绪', { causeCode: lastError?.code });
    }
}
