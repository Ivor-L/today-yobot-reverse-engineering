import { MacOSPluginInstallerError, } from './macos_plugin_installer.js';
import { MacOSPluginLifecycleError, } from './macos_plugin_lifecycle.js';
import { MacOSPluginReleaseClientError } from './macos_plugin_release_client.js';
export class MacOSPluginServiceError extends Error {
    code;
    causeCode;
    constructor(code, message, causeCode) {
        super(message);
        this.name = 'MacOSPluginServiceError';
        this.code = code;
        this.causeCode = causeCode;
    }
    toJSON() {
        return {
            name: this.name,
            code: this.code,
            ...(this.causeCode ? { causeCode: this.causeCode } : {}),
            message: this.message,
        };
    }
}
function causeCode(error) {
    if (error instanceof MacOSPluginServiceError || error instanceof MacOSPluginInstallerError
        || error instanceof MacOSPluginLifecycleError || error instanceof MacOSPluginReleaseClientError) {
        // Preserve the most actionable bounded code across service boundaries. In
        // particular, installer identity failures distinguish codesign,
        // Gatekeeper and stapled-ticket failures without exposing tool output.
        return ('causeCode' in error ? error.causeCode : undefined) ?? error.code;
    }
    if (error && typeof error === 'object') {
        const value = error.code;
        if (typeof value === 'string' && /^[A-Z0-9_]{1,64}$/.test(value))
            return value;
    }
    return undefined;
}
function serviceError(code, message, cause) {
    return new MacOSPluginServiceError(code, message, causeCode(cause));
}
function statusFrom(state) {
    const phase = !state
        ? 'not-installed'
        : state.phase === 'healthy'
            ? 'healthy'
            : state.phase === 'inactive'
                ? 'inactive'
                : 'transitioning';
    return {
        phase,
        generation: state?.generation ?? 0,
        activeVersion: state?.active?.version ?? null,
        previousVersion: state?.previous?.version ?? null,
        lastFailedVersion: state?.last_failed?.version ?? null,
        failureCode: state?.last_failure_code ?? null,
    };
}
function reportProgress(callback, progress) {
    try {
        callback?.(progress);
    }
    catch {
        // A renderer/event observer never owns the durable plugin transaction.
    }
}
function activationSummary(activation, targetVersion) {
    if (activation.mode === 'deactivated') {
        return {
            mode: 'deactivated',
            targetVersion,
            activeVersion: null,
            failureCode: activation.failureCode,
        };
    }
    if (activation.mode === 'rolled-back') {
        return {
            mode: 'rolled-back',
            targetVersion,
            activeVersion: activation.state.active?.version ?? null,
            failureCode: activation.failureCode,
        };
    }
    return {
        mode: 'active',
        targetVersion,
        activeVersion: activation.state.active?.version ?? targetVersion,
    };
}
/** The only main-owned façade renderer intents should reach on Darwin. */
export class MacOSPluginService {
    releaseClient;
    installer;
    lifecycle;
    store;
    getGate;
    operationActive = false;
    operationAbort = null;
    operationDone = null;
    stopRequested = false;
    stopPromise = null;
    constructor(options) {
        if ((options.platform ?? process.platform) !== 'darwin') {
            throw serviceError('MACOS_PLUGIN_SERVICE_STATE_INVALID', 'macOS 插件主进程服务只能在 Darwin 使用');
        }
        this.releaseClient = options.releaseClient;
        this.installer = options.installer;
        this.lifecycle = options.lifecycle;
        this.store = options.store;
        this.getGate = options.getGate ?? (() => ({ blocked: false }));
    }
    async readState() {
        try {
            return await this.store.readActivationState();
        }
        catch (error) {
            throw serviceError('MACOS_PLUGIN_SERVICE_STATE_INVALID', '无法读取 macOS 插件状态', error);
        }
    }
    assertAllowed() {
        const gate = this.getGate();
        if (gate.blocked) {
            throw serviceError('MACOS_PLUGIN_SERVICE_BLOCKED', gate.requiredVersion
                ? `当前 Agent 必须先升级到 ${gate.requiredVersion}`
                : '当前 Agent 版本不允许启动 RPA');
        }
    }
    async resolveLatest(signal) {
        try {
            return await this.releaseClient.resolveLatest(signal);
        }
        catch (error) {
            throw serviceError('MACOS_PLUGIN_SERVICE_RELEASE_FAILED', '无法取得可信 macOS RPA 发布版本', error);
        }
    }
    async withOperation(operation, abortController = null, allowDuringStop = false) {
        if (this.operationActive || (this.stopRequested && !allowDuringStop)) {
            throw serviceError('MACOS_PLUGIN_SERVICE_BUSY', '已有 macOS RPA 生命周期操作正在运行');
        }
        this.operationActive = true;
        this.operationAbort = abortController;
        let finish;
        this.operationDone = new Promise((resolve) => { finish = resolve; });
        try {
            return await operation();
        }
        finally {
            this.operationActive = false;
            this.operationAbort = null;
            finish();
            this.operationDone = null;
        }
    }
    async getStatus() {
        const state = await this.readState();
        const snapshot = statusFrom(state);
        if (state?.phase === 'healthy' && state.active && this.store.hasInstalledFrontend) {
            snapshot.hasFrontend = await this.store.hasInstalledFrontend(state.active);
        }
        return snapshot;
    }
    async checkLatest(signal) {
        const state = await this.readState();
        const current = statusFrom(state);
        const release = await this.resolveLatest(signal);
        return {
            available: release !== null,
            version: release?.descriptor.version ?? null,
            versionCode: release?.descriptor.version_code ?? null,
            updateAvailable: Boolean(release
                && (current.phase !== 'healthy'
                    || !current.activeVersion
                    || release.descriptor.version_code > (state?.active?.version_code ?? 0))),
            current,
        };
    }
    async installLatest(secrets = {}, options = {}) {
        const operationAbort = new AbortController();
        const operationSignal = options.signal
            ? AbortSignal.any([options.signal, operationAbort.signal])
            : operationAbort.signal;
        return this.withOperation(async () => {
            this.assertAllowed();
            reportProgress(options.onProgress, { phase: 'resolving' });
            let state = await this.readState();
            if (state && state.phase !== 'healthy' && state.phase !== 'inactive') {
                try {
                    await this.lifecycle.recoverAtStartup(secrets, operationSignal);
                    state = await this.readState();
                }
                catch (error) {
                    throw serviceError('MACOS_PLUGIN_SERVICE_LIFECYCLE_FAILED', '无法先恢复中断的 macOS RPA 生命周期', error);
                }
            }
            const release = await this.resolveLatest(operationSignal);
            if (operationSignal.aborted) {
                throw serviceError('MACOS_PLUGIN_SERVICE_INSTALL_FAILED', 'macOS RPA 插件安装已取消，未进入激活', { code: 'MACOS_PLUGIN_INSTALLER_CANCELLED' });
            }
            if (!release) {
                return {
                    mode: 'not-available',
                    targetVersion: null,
                    activeVersion: state?.active?.version ?? null,
                };
            }
            if (state?.phase === 'healthy' && state.active
                && state.active.version_code >= release.descriptor.version_code) {
                if (this.store.hasInstalledFrontend
                    && !await this.store.hasInstalledFrontend(state.active)) {
                    throw serviceError('MACOS_PLUGIN_SERVICE_STATE_INVALID', '当前版本的 macOS RPA 前端文件缺失，无法将损坏的同版本插件判定为已安装；请发布递增版本或先清理损坏版本再安装');
                }
                return {
                    mode: 'already-current',
                    targetVersion: release.descriptor.version,
                    activeVersion: state.active.version,
                };
            }
            try {
                await this.installer.install(release.verifiedManifest, {
                    signal: operationSignal,
                    onProgress: (progress) => reportProgress(options.onProgress, {
                        phase: 'installing',
                        installStage: progress.stage,
                        ...(progress.transferred === undefined ? {} : { transferred: progress.transferred }),
                        ...(progress.total === undefined ? {} : { total: progress.total }),
                        ...(progress.resumed === undefined ? {} : { resumed: progress.resumed }),
                    }),
                });
            }
            catch (error) {
                throw serviceError('MACOS_PLUGIN_SERVICE_INSTALL_FAILED', 'macOS RPA 插件安装未完成', error);
            }
            if (operationSignal.aborted) {
                throw serviceError('MACOS_PLUGIN_SERVICE_INSTALL_FAILED', 'macOS RPA 插件安装已取消，未进入激活', { code: 'MACOS_PLUGIN_INSTALLER_CANCELLED' });
            }
            state = await this.readState();
            if (state && state.phase !== 'healthy' && state.phase !== 'inactive') {
                throw serviceError('MACOS_PLUGIN_SERVICE_STATE_INVALID', '安装完成后插件激活状态仍有未恢复事务');
            }
            reportProgress(options.onProgress, { phase: 'activating' });
            try {
                const activation = await this.lifecycle.activateInstalledVersion(release.verifiedManifest, state?.generation ?? 0, secrets, operationSignal);
                return activationSummary(activation, release.descriptor.version);
            }
            catch (error) {
                throw serviceError('MACOS_PLUGIN_SERVICE_LIFECYCLE_FAILED', 'macOS RPA 插件无法完成启动和严格健康确认', error);
            }
        }, operationAbort);
    }
    /**
     * Main-only priority stop for logout, remote session revocation and app exit.
     * It aborts an in-flight install before waiting for its durable stage to settle.
     */
    async stopRuntime() {
        if (this.stopPromise)
            return this.stopPromise;
        const stopPromise = this.stopRuntimeOwned();
        this.stopPromise = stopPromise;
        try {
            return await stopPromise;
        }
        finally {
            if (this.stopPromise === stopPromise)
                this.stopPromise = null;
        }
    }
    async stopRuntimeOwned() {
        this.stopRequested = true;
        try {
            const activeOperation = this.operationDone;
            this.operationAbort?.abort();
            if (activeOperation)
                await activeOperation;
            return await this.withOperation(async () => {
                try {
                    const result = await this.lifecycle.stopOwnedRuntime();
                    return { mode: result.mode };
                }
                catch (error) {
                    throw serviceError('MACOS_PLUGIN_SERVICE_LIFECYCLE_FAILED', '无法停止当前 Agent 拥有的 macOS RPA', error);
                }
            }, null, true);
        }
        finally {
            this.stopRequested = false;
        }
    }
    async recoverAtStartup(secrets = {}) {
        const operationAbort = new AbortController();
        return this.withOperation(async () => {
            this.assertAllowed();
            let recovered;
            try {
                recovered = await this.lifecycle.recoverAtStartup(secrets, operationAbort.signal);
            }
            catch (error) {
                throw serviceError('MACOS_PLUGIN_SERVICE_LIFECYCLE_FAILED', 'macOS RPA 启动恢复失败', error);
            }
            return {
                mode: recovered.mode,
                activeVersion: recovered.state?.active?.version ?? null,
                failureCode: recovered.state?.last_failure_code ?? null,
            };
        }, operationAbort);
    }
}
