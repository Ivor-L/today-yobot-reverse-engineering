import { MacOSControlDriverError, } from './macos_control_driver.js';
import { MacOSControlHealthError, } from './macos_control_health.js';
import { PluginStoreError, } from './macos_plugin_store.js';
export class MacOSPluginLifecycleError extends Error {
    code;
    causeCode;
    constructor(code, message, causeCode) {
        super(message);
        this.name = 'MacOSPluginLifecycleError';
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
function lifecycleError(code, message, cause) {
    return new MacOSPluginLifecycleError(code, message, boundedCauseCode(cause));
}
function boundedCauseCode(error) {
    if (error instanceof MacOSControlHealthError
        || error instanceof MacOSPluginLifecycleError)
        return error.code;
    if (error instanceof MacOSControlDriverError)
        return 'MACOS_CONTROL_DRIVER_ERROR';
    if (error instanceof PluginStoreError)
        return 'MACOS_PLUGIN_STORE_ERROR';
    if (error && typeof error === 'object') {
        const value = error.code;
        if (typeof value === 'string' && /^[A-Z0-9_]{1,64}$/.test(value))
            return value;
    }
    return undefined;
}
function activationFailureCode(error) {
    return boundedCauseCode(error) ?? 'CONTROL_START_FAILED';
}
function referencesMatch(left, right) {
    return left.schema_version === right.schema_version
        && left.plugin_name === right.plugin_name
        && left.channel_id === right.channel_id
        && left.platform === right.platform
        && left.architecture === right.architecture
        && left.version === right.version
        && left.version_code === right.version_code
        && left.artifact_sha256 === right.artifact_sha256
        && left.artifact_size_bytes === right.artifact_size_bytes
        && left.entrypoint === right.entrypoint
        && left.committed_at === right.committed_at;
}
function manifestMatchesInstalled(manifest, installed) {
    return manifest.plugin_name === installed.plugin_name
        && manifest.channel_id === installed.channel_id
        && manifest.platform === installed.platform
        && manifest.architecture === installed.architecture
        && manifest.version === installed.version
        && manifest.version_code === installed.version_code
        && manifest.artifact_sha256 === installed.artifact_sha256
        && manifest.artifact_size_bytes === installed.artifact_size_bytes
        && manifest.entrypoint === installed.entrypoint
        && manifest.artifact_type === 'macos-app-bundle'
        && manifest.runtime_contract_version === '1.0'
        && manifest.macos_identity?.capability_wave === 'none';
}
function exactPendingState(state) {
    if ((state.phase !== 'pending-health' && state.phase !== 'rollback-pending-health')
        || !state.transition_id || !state.active) {
        throw lifecycleError('MACOS_PLUGIN_LIFECYCLE_STATE_INVALID', '插件激活状态不属于可确认的健康过渡');
    }
    return {
        transitionId: state.transition_id,
        generation: state.generation,
        active: state.active,
    };
}
export class MacOSPluginLifecycleCoordinator {
    store;
    control;
    health;
    resolveVerifiedManifest;
    port;
    operationActive = false;
    constructor(options) {
        if ((options.platform ?? process.platform) !== 'darwin') {
            throw lifecycleError('MACOS_PLUGIN_LIFECYCLE_STATE_INVALID', 'macOS plugin lifecycle 只能在 Darwin 使用');
        }
        if (!options.store || !options.control || !options.health
            || typeof options.store.readActivationState !== 'function'
            || typeof options.store.readInstalledVersion !== 'function'
            || typeof options.store.activateInstalledVersion !== 'function'
            || typeof options.store.confirmActivationHealthy !== 'function'
            || typeof options.store.failPendingActivation !== 'function'
            || typeof options.store.recoverInterruptedActivation !== 'function'
            || typeof options.control.startOrAdopt !== 'function'
            || typeof options.control.stopOwnedControl !== 'function'
            || typeof options.health.waitUntilReady !== 'function'
            || typeof options.resolveVerifiedManifest !== 'function') {
            throw lifecycleError('MACOS_PLUGIN_LIFECYCLE_STATE_INVALID', 'macOS plugin lifecycle 依赖无效');
        }
        if (!Number.isSafeInteger(options.port) || options.port < 1 || options.port > 65535) {
            throw lifecycleError('MACOS_PLUGIN_LIFECYCLE_STATE_INVALID', 'macOS plugin port 无效');
        }
        this.store = options.store;
        this.control = options.control;
        this.health = options.health;
        this.resolveVerifiedManifest = options.resolveVerifiedManifest;
        this.port = options.port;
    }
    async withOperation(operation) {
        if (this.operationActive) {
            throw lifecycleError('MACOS_PLUGIN_LIFECYCLE_STATE_INVALID', '另一个 macOS plugin lifecycle 操作仍在运行');
        }
        this.operationActive = true;
        try {
            return await operation();
        }
        finally {
            this.operationActive = false;
        }
    }
    async stopOwnedRuntime() {
        return this.withOperation(async () => {
            try {
                return await this.control.stopOwnedControl();
            }
            catch (error) {
                throw lifecycleError('MACOS_PLUGIN_LIFECYCLE_STOP_FAILED', '无法停止当前 Agent 拥有的 macOS Control', error);
            }
        });
    }
    launchRequest(manifest, secrets) {
        return {
            version: manifest.version,
            channelId: manifest.channel_id,
            port: this.port,
            // Driver validates this main-owned fact and refuses to launch when it is
            // absent or malformed. Keeping the compatibility service interface
            // optional lets read-only/fake lifecycle tests remain side-effect free.
            machineCode: secrets.machineCode ?? '',
            ...(secrets.rpaToken === undefined ? {} : { rpaToken: secrets.rpaToken }),
            ...(secrets.apiBase === undefined ? {} : { apiBase: secrets.apiBase }),
            ...(secrets.privateAgentToken === undefined ? {} : { privateAgentToken: secrets.privateAgentToken }),
        };
    }
    async manifestFor(installed) {
        let verified;
        try {
            verified = await this.resolveVerifiedManifest(installed);
        }
        catch (error) {
            throw lifecycleError('MACOS_PLUGIN_LIFECYCLE_MANIFEST_MISMATCH', '无法取得已安装插件的已验签清单', error);
        }
        const manifest = verified.payload;
        if (!manifestMatchesInstalled(manifest, installed)) {
            throw lifecycleError('MACOS_PLUGIN_LIFECYCLE_MANIFEST_MISMATCH', '已验签清单与不可变插件 marker 不匹配');
        }
        return manifest;
    }
    async stopExactOwner(message) {
        try {
            await this.control.stopOwnedControl();
        }
        catch (error) {
            throw lifecycleError('MACOS_PLUGIN_LIFECYCLE_STOP_FAILED', message, error);
        }
    }
    async startAndWait(manifest, secrets, signal) {
        const control = await this.control.startOrAdopt(this.launchRequest(manifest, secrets));
        const ready = await this.health.waitUntilReady({
            ownership: control.ownership,
            credential: control.credential,
            manifest,
        }, signal);
        return { control, ready };
    }
    async confirm(state, message) {
        const pending = exactPendingState(state);
        try {
            return await this.store.confirmActivationHealthy(pending.transitionId, pending.generation);
        }
        catch (error) {
            await this.stopExactOwner('健康结果无法提交且 Control 未能安全停止');
            throw lifecycleError('MACOS_PLUGIN_LIFECYCLE_CONFIRM_FAILED', message, error);
        }
    }
    async failPending(state, failureCode) {
        const pending = exactPendingState(state);
        try {
            return await this.store.failPendingActivation(pending.transitionId, pending.generation, failureCode);
        }
        catch (error) {
            throw lifecycleError('MACOS_PLUGIN_LIFECYCLE_CONFIRM_FAILED', '插件失败结果无法提交到当前激活过渡', error);
        }
    }
    async restoreRollback(rollbackState, failedVersion, failureCode, secrets, signal) {
        const pending = exactPendingState(rollbackState);
        const rollbackManifest = await this.manifestFor(pending.active);
        let running;
        try {
            running = await this.startAndWait(rollbackManifest, secrets, signal);
        }
        catch (error) {
            try {
                await this.stopExactOwner('回滚 Control 未能安全停止');
            }
            catch (stopError) {
                throw lifecycleError('MACOS_PLUGIN_LIFECYCLE_ROLLBACK_FAILED', '回滚失败且无法证明旧 Control 已停止', stopError);
            }
            if (signal?.aborted) {
                throw lifecycleError('MACOS_PLUGIN_LIFECYCLE_ROLLBACK_FAILED', '回滚等待已取消，保留事务供下次启动恢复', error);
            }
            const deactivated = await this.failPending(rollbackState, activationFailureCode(error));
            if (!deactivated.state || deactivated.state.phase !== 'inactive') {
                throw lifecycleError('MACOS_PLUGIN_LIFECYCLE_ROLLBACK_FAILED', '回滚失败后插件未进入安全 inactive 状态', error);
            }
            return {
                mode: 'deactivated',
                state: deactivated.state,
                failedVersion,
                failureCode,
            };
        }
        const healthy = await this.confirm(rollbackState, '回滚 Control 健康但状态确认失败');
        return {
            mode: 'rolled-back',
            state: healthy,
            control: running.control,
            ready: running.ready,
            failedVersion,
            failureCode,
        };
    }
    /**
     * Activate an already committed immutable version. The previous Control is
     * stopped before pointer mutation; a failed candidate is stopped before the
     * store may point back to previous.
     */
    async activateInstalledVersion(verifiedManifest, expectedGeneration, secrets = {}, signal) {
        return this.withOperation(() => this.activateInstalledVersionOwned(verifiedManifest.payload, expectedGeneration, secrets, signal));
    }
    async activateInstalledVersionOwned(manifest, expectedGeneration, secrets, signal) {
        const current = await this.store.readActivationState();
        if ((current?.generation ?? 0) !== expectedGeneration
            || (current && current.phase !== 'healthy' && current.phase !== 'inactive')) {
            throw lifecycleError('MACOS_PLUGIN_LIFECYCLE_STATE_INVALID', '插件激活 generation 或 phase 已变化');
        }
        let installed;
        try {
            installed = await this.store.readInstalledVersion(manifest.version);
        }
        catch (error) {
            throw lifecycleError('MACOS_PLUGIN_LIFECYCLE_STATE_INVALID', '无法读取候选不可变插件 marker', error);
        }
        if (!installed || !manifestMatchesInstalled(manifest, installed)) {
            throw lifecycleError('MACOS_PLUGIN_LIFECYCLE_MANIFEST_MISMATCH', '候选清单与不可变插件 marker 不匹配');
        }
        const alreadyActive = current?.phase === 'healthy'
            && current.active !== null
            && referencesMatch(current.active, installed);
        if (!alreadyActive) {
            await this.stopExactOwner('旧 Control 未能安全停止，拒绝切换插件指针');
        }
        let mutation;
        try {
            mutation = await this.store.activateInstalledVersion(manifest.version, expectedGeneration);
        }
        catch (error) {
            throw lifecycleError('MACOS_PLUGIN_LIFECYCLE_STATE_INVALID', '不可变插件版本无法进入激活过渡', error);
        }
        if (!mutation.state.active || !manifestMatchesInstalled(manifest, mutation.state.active)) {
            throw lifecycleError('MACOS_PLUGIN_LIFECYCLE_MANIFEST_MISMATCH', '候选清单与激活状态中的不可变 marker 不匹配');
        }
        let running;
        try {
            running = await this.startAndWait(manifest, secrets, signal);
        }
        catch (error) {
            await this.stopExactOwner('失败候选 Control 未能安全停止，拒绝切换回滚指针');
            if (!mutation.changed) {
                throw lifecycleError('MACOS_PLUGIN_LIFECYCLE_START_FAILED', '当前健康版本 Control 未能通过严格 ready 门', error);
            }
            const failureCode = activationFailureCode(error);
            const failed = await this.failPending(mutation.state, failureCode);
            if (signal?.aborted) {
                throw lifecycleError('MACOS_PLUGIN_LIFECYCLE_START_FAILED', '候选健康等待已取消，保留回滚事务供下次启动恢复', error);
            }
            if (failed.action === 'rollback-required' && failed.state) {
                return this.restoreRollback(failed.state, mutation.state.active.version, failureCode, secrets, signal);
            }
            if (!failed.state || failed.state.phase !== 'inactive') {
                throw lifecycleError('MACOS_PLUGIN_LIFECYCLE_STATE_INVALID', '失败候选没有 previous 且未进入安全 inactive 状态', error);
            }
            return {
                mode: 'deactivated',
                state: failed.state,
                failedVersion: mutation.state.active.version,
                failureCode,
            };
        }
        if (!mutation.changed) {
            return {
                mode: 'already-active',
                state: mutation.state,
                control: running.control,
                ready: running.ready,
            };
        }
        const healthy = await this.confirm(mutation.state, '候选 Control 健康但状态确认失败');
        return {
            mode: 'activated',
            state: healthy,
            control: running.control,
            ready: running.ready,
        };
    }
    /** Recover transitions conservatively while preserving a proven healthy owner for adopt. */
    async recoverAtStartup(secrets = {}, signal) {
        return this.withOperation(() => this.recoverAtStartupOwned(secrets, signal));
    }
    async recoverAtStartupOwned(secrets, signal) {
        let beforeRecovery;
        try {
            beforeRecovery = await this.store.readActivationState();
        }
        catch (error) {
            throw lifecycleError('MACOS_PLUGIN_LIFECYCLE_STATE_INVALID', '无法读取插件激活状态', error);
        }
        // A healthy pointer may still own in-flight work, so startOrAdopt below is
        // allowed to preserve it. Any unconfirmed/inactive pointer first removes
        // only the exact AG-309 owner before state recovery changes references.
        if (beforeRecovery?.phase !== 'healthy') {
            await this.stopExactOwner('中断恢复前无法证明旧 Control 已停止');
        }
        let recovery;
        try {
            recovery = await this.store.recoverInterruptedActivation();
        }
        catch (error) {
            throw lifecycleError('MACOS_PLUGIN_LIFECYCLE_STATE_INVALID', '无法恢复插件激活状态', error);
        }
        const state = recovery.state;
        if (!state || state.phase === 'inactive')
            return { mode: 'inactive', state };
        if (state.phase === 'healthy') {
            if (!state.active) {
                throw lifecycleError('MACOS_PLUGIN_LIFECYCLE_STATE_INVALID', '健康插件状态缺少 active');
            }
            const manifest = await this.manifestFor(state.active);
            let running;
            try {
                running = await this.startAndWait(manifest, secrets, signal);
            }
            catch (error) {
                await this.stopExactOwner('恢复健康版本失败后 Control 未能安全停止');
                throw lifecycleError('MACOS_PLUGIN_LIFECYCLE_START_FAILED', '健康插件版本未能恢复 ready', error);
            }
            return { mode: 'active', state, control: running.control, ready: running.ready };
        }
        if (recovery.action !== 'rollback-required' && recovery.action !== 'verify-rollback') {
            throw lifecycleError('MACOS_PLUGIN_LIFECYCLE_STATE_INVALID', '中断恢复没有产生可验证的 rollback 状态');
        }
        const failedVersion = state.last_failed?.version ?? state.active?.version;
        if (!failedVersion) {
            throw lifecycleError('MACOS_PLUGIN_LIFECYCLE_STATE_INVALID', '回滚状态缺少失败版本');
        }
        const restored = await this.restoreRollback(state, failedVersion, state.last_failure_code ?? 'ACTIVATION_INTERRUPTED', secrets, signal);
        if (restored.mode === 'rolled-back') {
            return {
                mode: 'rollback-restored',
                state: restored.state,
                control: restored.control,
                ready: restored.ready,
            };
        }
        return { mode: 'inactive', state: restored.state };
    }
}
