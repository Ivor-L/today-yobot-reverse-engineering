import { getLocalRpaContext } from '../../../recovery-local-rpa.js';
import { normalizeAuthAccessToken, } from './security/auth_token_repository.js';
import { MacOSPluginServiceError, } from './macos_plugin_service.js';
export const MACOS_PLUGIN_INTENT_ACTIONS = [
    'status',
    'check-latest',
    'install-latest',
];
function exactKeys(value, expected) {
    const actual = Object.keys(value).sort();
    const wanted = [...expected].sort();
    return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}
function normalizeBusinessApiBase(value) {
    let parsed;
    try {
        parsed = new URL(value);
    }
    catch {
        throw new Error('invalid API base');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)
        || parsed.username || parsed.password || parsed.search || parsed.hash
        || (parsed.pathname !== '/' && parsed.pathname !== '')) {
        throw new Error('invalid API base');
    }
    return parsed.origin;
}
function normalizePrivateAgentToken(value) {
    if (typeof value !== 'string' || value.length < 32 || value.length > 4096
        || /[\u0000-\u001f\u007f]/.test(value)) {
        throw new Error('invalid private Agent token');
    }
    return value;
}
export function parseMacOSPluginIntent(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input))
        return null;
    const value = input;
    if (!exactKeys(value, ['pluginName', 'action']) || value.pluginName !== 'wechat-rpa'
        || !MACOS_PLUGIN_INTENT_ACTIONS.includes(value.action)) {
        return null;
    }
    return value;
}
function safeFailure(action, code, message, causeCode) {
    return {
        ok: false,
        action,
        error: {
            code,
            message,
            ...(causeCode ? { causeCode } : {}),
        },
    };
}
function sanitizeStatus(value) {
    const phases = new Set(['not-installed', 'inactive', 'transitioning', 'healthy']);
    if (!value || typeof value !== 'object' || !phases.has(value.phase)
        || !Number.isSafeInteger(value.generation) || value.generation < 0) {
        throw new Error('invalid status result');
    }
    const optionalVersion = (text) => {
        if (text === null)
            return null;
        if (typeof text !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9.+-]{0,63}$/.test(text)) {
            throw new Error('invalid status result');
        }
        return text;
    };
    const failureCode = value.failureCode === null
        ? null
        : typeof value.failureCode === 'string' && /^[A-Z0-9_]{1,64}$/.test(value.failureCode)
            ? value.failureCode
            : undefined;
    if (failureCode === undefined)
        throw new Error('invalid status result');
    if (value.hasFrontend !== undefined && typeof value.hasFrontend !== 'boolean') {
        throw new Error('invalid status result');
    }
    return {
        phase: value.phase,
        generation: value.generation,
        activeVersion: optionalVersion(value.activeVersion),
        previousVersion: optionalVersion(value.previousVersion),
        lastFailedVersion: optionalVersion(value.lastFailedVersion),
        failureCode,
        ...(value.hasFrontend === undefined ? {} : { hasFrontend: value.hasFrontend }),
    };
}
function sanitizeLatest(value) {
    if (!value || typeof value !== 'object' || typeof value.available !== 'boolean'
        || typeof value.updateAvailable !== 'boolean'
        || (value.version !== null
            && (typeof value.version !== 'string'
                || !/^[A-Za-z0-9][A-Za-z0-9.+-]{0,63}$/.test(value.version)))
        || (value.versionCode !== null
            && (!Number.isSafeInteger(value.versionCode) || value.versionCode <= 0))) {
        throw new Error('invalid latest result');
    }
    return {
        available: value.available,
        version: value.version,
        versionCode: value.versionCode,
        updateAvailable: value.updateAvailable,
        current: sanitizeStatus(value.current),
    };
}
function sanitizeInstall(value) {
    if (!value || typeof value !== 'object')
        throw new Error('invalid install result');
    const modes = new Set(['not-available', 'already-current', 'active', 'rolled-back', 'deactivated']);
    if (!modes.has(value.mode)
        || (value.targetVersion !== null
            && (typeof value.targetVersion !== 'string'
                || !/^[A-Za-z0-9][A-Za-z0-9.+-]{0,63}$/.test(value.targetVersion)))
        || (value.activeVersion !== null
            && (typeof value.activeVersion !== 'string'
                || !/^[A-Za-z0-9][A-Za-z0-9.+-]{0,63}$/.test(value.activeVersion)))) {
        throw new Error('invalid install result');
    }
    if (value.mode === 'not-available' || value.mode === 'already-current') {
        return {
            mode: value.mode,
            targetVersion: value.targetVersion,
            activeVersion: value.activeVersion,
        };
    }
    if (typeof value.targetVersion !== 'string' || value.targetVersion.length === 0) {
        throw new Error('invalid install result');
    }
    const failureCode = 'failureCode' in value ? value.failureCode : undefined;
    if (failureCode !== undefined
        && (typeof failureCode !== 'string' || !/^[A-Z0-9_]{1,64}$/.test(failureCode))) {
        throw new Error('invalid install result');
    }
    return {
        mode: value.mode,
        targetVersion: value.targetVersion,
        activeVersion: value.activeVersion,
        ...(failureCode ? { failureCode } : {}),
    };
}
function sanitizeProgress(value) {
    if (!value || typeof value !== 'object'
        || !['resolving', 'installing', 'activating'].includes(value.phase)) {
        throw new Error('invalid progress');
    }
    const result = { phase: value.phase };
    if (value.installStage !== undefined) {
        const stages = [
            'resolving', 'downloading', 'downloaded', 'extracting', 'extracted',
            'verifying', 'verified', 'committing', 'committed',
        ];
        if (!stages.includes(value.installStage))
            throw new Error('invalid progress');
        result.installStage = value.installStage;
    }
    if (value.transferred !== undefined && Number.isSafeInteger(value.transferred) && value.transferred >= 0) {
        result.transferred = value.transferred;
    }
    if (value.total !== undefined && Number.isSafeInteger(value.total) && value.total >= 0) {
        result.total = value.total;
    }
    if (value.resumed !== undefined)
        result.resumed = value.resumed === true;
    return result;
}
function sanitizeRecovery(value) {
    if (!value || typeof value !== 'object'
        || !['active', 'rollback-restored', 'inactive'].includes(value.mode)
        || (value.activeVersion !== null
            && (typeof value.activeVersion !== 'string'
                || !/^[A-Za-z0-9][A-Za-z0-9.+-]{0,63}$/.test(value.activeVersion)))
        || (value.failureCode !== null
            && (typeof value.failureCode !== 'string'
                || !/^[A-Z0-9_]{1,64}$/.test(value.failureCode)))) {
        throw new Error('invalid recovery result');
    }
    return {
        mode: value.mode,
        activeVersion: value.activeVersion,
        failureCode: value.failureCode,
    };
}
/**
 * Darwin IPC boundary. The renderer may express only an action for the single
 * official plugin. Release URLs, hashes, paths and credentials remain main-owned.
 */
export class MacOSPluginIntentGateway {
    service;
    authTokens;
    businessApiBaseUrl;
    machineCodeProvider;
    privateAgentToken;
    constructor(options) {
        if ((options.platform ?? process.platform) !== 'darwin') {
            throw new Error('macOS plugin intent gateway is Darwin-only');
        }
        if (!options.service || typeof options.service.getStatus !== 'function'
            || typeof options.service.checkLatest !== 'function'
            || typeof options.service.installLatest !== 'function'
            || typeof options.service.recoverAtStartup !== 'function'
            || !options.authTokens || typeof options.authTokens.read !== 'function'
            || typeof options.machineCodeProvider !== 'function') {
            throw new Error('macOS plugin intent dependencies are invalid');
        }
        this.service = options.service;
        this.authTokens = options.authTokens;
        this.businessApiBaseUrl = normalizeBusinessApiBase(options.businessApiBaseUrl);
        this.machineCodeProvider = options.machineCodeProvider;
        this.privateAgentToken = normalizePrivateAgentToken(options.privateAgentToken);
    }
    readMachineCode() {
        const machineCode = this.machineCodeProvider();
        if (!/^[0-9A-F]{4}(?:-[0-9A-F]{4}){3}$/.test(machineCode)) {
            throw new Error('invalid machine code');
        }
        return machineCode;
    }
    async execute(input, options = {}) {
        const intent = parseMacOSPluginIntent(input);
        if (!intent) {
            return safeFailure(null, 'MACOS_PLUGIN_INTENT_INVALID', 'macOS RPA 请求只允许官方插件和已知业务动作');
        }
        try {
            if (intent.action === 'status') {
                return { ok: true, action: intent.action, data: sanitizeStatus(await this.service.getStatus()) };
            }
            if (intent.action === 'check-latest') {
                return {
                    ok: true,
                    action: intent.action,
                    data: sanitizeLatest(await this.service.checkLatest(options.signal)),
                };
            }
            let token;
            try {
                const storedToken = getLocalRpaContext()?.token ?? await this.authTokens.read();
                token = storedToken === null ? null : normalizeAuthAccessToken(storedToken);
            }
            catch {
                return safeFailure(intent.action, 'MACOS_PLUGIN_INTENT_AUTH_UNAVAILABLE', '无法读取当前登录凭据，请重新登录后重试');
            }
            if (!token) {
                return safeFailure(intent.action, 'MACOS_PLUGIN_INTENT_AUTH_REQUIRED', '请先登录再安装或更新 macOS RPA');
            }
            let machineCode;
            try {
                machineCode = this.readMachineCode();
            }
            catch {
                return safeFailure(intent.action, 'MACOS_PLUGIN_INTENT_DEVICE_ID_UNAVAILABLE', '无法取得稳定设备身份，macOS RPA 未启动');
            }
            const onProgress = options.onProgress
                ? (progress) => {
                    try {
                        options.onProgress?.(sanitizeProgress(progress));
                    }
                    catch {
                        // Progress observers do not own or interrupt the durable operation.
                    }
                }
                : undefined;
            return {
                ok: true,
                action: intent.action,
                data: sanitizeInstall(await this.service.installLatest({
                    rpaToken: token,
                    apiBase: this.businessApiBaseUrl,
                    machineCode,
                    privateAgentToken: this.privateAgentToken,
                }, { signal: options.signal, ...(onProgress ? { onProgress } : {}) })),
            };
        }
        catch (error) {
            if (error instanceof MacOSPluginServiceError) {
                return safeFailure(intent.action, error.code, error.message, error.causeCode);
            }
            return safeFailure(intent.action, 'MACOS_PLUGIN_INTENT_OPERATION_FAILED', 'macOS RPA 操作未完成');
        }
    }
    /** Main-only recovery: no renderer value can supply credentials or an API endpoint. */
    async recoverOwnedRuntime() {
        let token;
        try {
            const storedToken = getLocalRpaContext()?.token ?? await this.authTokens.read();
            token = storedToken === null ? null : normalizeAuthAccessToken(storedToken);
        }
        catch {
            return {
                success: false,
                reason: 'auth_unavailable',
                error: '无法读取当前登录凭据，请重新登录后重试',
            };
        }
        if (!token) {
            return {
                success: false,
                reason: 'auth_required',
                error: '请先登录再启动 macOS RPA',
            };
        }
        let machineCode;
        try {
            machineCode = this.readMachineCode();
        }
        catch {
            return {
                success: false,
                reason: 'auth_unavailable',
                error: '无法取得稳定设备身份，macOS RPA 未启动',
            };
        }
        try {
            return {
                success: true,
                data: sanitizeRecovery(await this.service.recoverAtStartup({
                    rpaToken: token,
                    apiBase: this.businessApiBaseUrl,
                    machineCode,
                    privateAgentToken: this.privateAgentToken,
                })),
            };
        }
        catch (error) {
            if (error instanceof MacOSPluginServiceError) {
                return {
                    success: false,
                    reason: 'recovery_failed',
                    error: error.message,
                    code: error.code,
                    ...(error.causeCode ? { causeCode: error.causeCode } : {}),
                };
            }
            return {
                success: false,
                reason: 'recovery_failed',
                error: 'macOS RPA 恢复未完成',
            };
        }
    }
}
