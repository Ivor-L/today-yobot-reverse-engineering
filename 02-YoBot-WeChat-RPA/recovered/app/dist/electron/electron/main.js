import { app, BrowserWindow, ipcMain, shell, protocol, net, dialog, screen, Tray, Menu, safeStorage, nativeImage, powerMonitor, Notification as ElectronNotification } from 'electron';
import { resizeWithNativeImage } from '../utils/image_downscale.js';
import * as path from 'path';
import { isInsideDir } from './workspace_paths.js';
import { loadChannelEnv } from './channel_env.js';
import { createSystemProbe, describeReclaim, reclaimPort } from '../utils/process_ownership.js';
import { RestartPolicy, shouldSuperviseExit } from './server_supervisor.js';
import * as fs from 'fs';
import * as os from 'os';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { loadSkillsList } from './skill_reader.js';
import { fork, execFileSync, execSync } from 'child_process';
import { randomBytes } from 'crypto';
import { ConfigManager } from '../core/config/manager.js';
import { LogManager } from './log_manager.js';
import { MCPClient } from '../skills/mcp/client.js';
import { ConversationStore } from '../agent/agentic/store.js';
import { AgenticContextStore } from '../agent/agentic/context.js';
import { composeAgentMd as composeAgentMd_ } from '../agent/profile/agent_md.js';
import { KnowledgeRegistry, countChars } from '../knowledge/registry.js';
import { getKbEntitlement } from '../knowledge/limits.js';
import { KbQuotaLedger, acquireIndexSlot, checkCapacityForReplace, checkConcurrency, checkDailyIncrement, checkFileSize, checkFormat, checkRawQuota, checkTotalCapacity, measureKnowledgeBytes, measureRawBytes, } from '../knowledge/quota.js';
import { updateDocs, reconcileOverlay, discoverDocsSkills, readEffectiveVersions } from './docs_updater.js';
import { filterUpdatableDocsSkills, selfProfileUsesOnlineDocs } from '../shared/self_profile_config.js';
import { reportTrace, reportOutcome, ensureQuestionRow, traceLooksCompleted } from '../utils/trace_reporter.js';
import { markTurnOpen, markTurnClosed, stampClosedReason, claimStaleTurns, releaseClaim, pruneOpenTurns, outcomeForRecord, detailForRecord, } from '../utils/open_turns.js';
import { readRpaVersionAt } from '../skills/utils/version_gate.js';
import { discoverRpaHttpUrl } from '../utils/rpa_port.js';
import { getMachineCode } from '../core/machine_code.js';
import { createAgentDeviceContext } from '../core/auth/device_context.js';
import { resolvePlatformTarget, } from '../core/platform/contracts.js';
import { normalizeDesktopExecutablePath } from '../core/platform/shell_runtime.js';
import * as nodeNet from 'net';
import { listUserInstalledSkills } from '../skills/user_installed_catalog.js';
import { MigrationService } from './migration/service.js';
import { DesktopUpdateManager } from './app_updater.js';
import { executeAppUpdateTestRestartExit } from './app_update_test_restart.js';
import { getManagedDataLayout } from './migration/paths.js';
import { deleteTaskFromFile, readTaskStoreFile, setTaskEnabledInFile, updateTaskInFile } from '../scheduler/store_file.js';
import { agentFileLayoutEnvironment, resolveAgentFileLayout, resolveBootstrapAgentFileLayout, } from '../core/platform/file_layout.js';
import { inspectMacOSUserDataMigration, migrateMacOSUserData } from './migration/macos_user_data.js';
import { decideMacOSBootstrap } from './migration/macos_bootstrap.js';
import { createAgentSecretStore, createAgentSecretStoreAt } from './security/agent_secret_store.js';
import { SecureConfigRepository } from './security/secure_config_repository.js';
import { LegacyFileAuthTokenRepository, SecretStoreAuthTokenRepository, migrateLegacyAuthToken, normalizeAuthAccessToken, } from './security/auth_token_repository.js';
import { DEVICE_IDENTITY_V2_ENV, SecretStoreDeviceIdentityProvider, } from './security/device_identity_provider.js';
import { createConfigReplaceMessage, handleConfigOwnerRequest, SECURE_CONFIG_IPC_ENV, } from '../core/config/process_bridge.js';
import { mergeConfigSecretPlaceholders } from '../core/config/secret_projection.js';
import { applyWindowsRegressionRemoteServer } from '../config/windows_regression_env.js';
import { MACOS_PLUGIN_MANIFEST_KEYS_ENV, MACOS_PLUGIN_RELEASE_API_ENV, MacOSPluginCompositionOwner, } from './macos_plugin_composition.js';
import { parseMacOSPluginIntent, } from './macos_plugin_intent.js';
import { isTrustedMacOSPluginIpcSender } from './macos_plugin_ipc_sender.js';
import { MacOSControlDriver } from './macos_control_driver.js';
import { MacOSControlTransport, } from './macos_control_transport.js';
import { assertRpaApplicationSuccess, unwrapRpaApplicationData, } from '../shared/rpa_application_response.js';
import { macOSControlWindowHeaders, macOSControlWindowOwnsUrl, } from './macos_control_window_transport.js';
import { MacOSPowerLifecycle } from './macos_power_lifecycle.js';
import { MacOSPluginRuntimeRecoveryCoordinator } from './macos_plugin_runtime_recovery.js';
import { MacOSControlCrashMonitor } from './macos_control_crash_monitor.js';
import { replaceWindowIpcHandler as replaceRegisteredWindowIpcHandler, replaceWindowIpcListener as replaceRegisteredWindowIpcListener, } from './window_ipc_registry.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// 渠道 .env 必须在任何 getBrandName() 之前进入主进程环境：VITE_* 是 Vite 的构建期变量，
// 只注入渲染进程，主进程拿不到，托盘/通知/窗口标题会一路掉到中性兜底名。
(function initChannelEnv() {
    try {
        const loaded = loadChannelEnv({
            isDev: process.env.NODE_ENV === 'development',
            channel: process.env.VITE_CHANNEL_ID,
            repoRoot: path.resolve(__dirname, '../../..'),
            resourcesPath: process.resourcesPath || '',
        });
        console.log(loaded.length > 0
            ? `[Main] Channel env loaded from: ${loaded.join(', ')}`
            : '[Main] No channel .env found; branding falls back to defaults.');
    }
    catch (e) {
        console.error('[Main] Failed to load channel env:', e);
    }
})();
const appUpdateE2ETestMode = process.env.APP_UPDATE_E2E_TEST_MODE === 'true'
    && process.env.VITE_CHANNEL_ID === 'update_test'
    && process.env.VITE_APP_ID === 'com.yobot.app.update-test'
    && process.env.VITE_APP_DIR_NAME === 'yobot-update-test';
let appUpdateE2ELifecyclePath = appUpdateE2ETestMode && process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, 'YokoUpdater', 'com.yobot.app.update-test', 'update_test', 'lifecycle.jsonl')
    : null;
function reportAppUpdateE2ELifecycle(event, details = {}) {
    if (!appUpdateE2ETestMode || !appUpdateE2ELifecyclePath)
        return;
    const record = {
        schemaVersion: 1,
        at: new Date().toISOString(),
        event,
        pid: process.pid,
        version: app.getVersion(),
        ...details,
    };
    try {
        fs.mkdirSync(path.dirname(appUpdateE2ELifecyclePath), { recursive: true });
        fs.appendFileSync(appUpdateE2ELifecyclePath, `${JSON.stringify(record)}\n`, 'utf8');
    }
    catch (error) {
        console.warn('[AppUpdater:E2E] Failed to persist lifecycle marker:', error);
    }
    console.log(`[AppUpdater:E2E] lifecycle=${event} pid=${process.pid} version=${app.getVersion()}`);
}
// This marker deliberately precedes app.whenReady(). The isolated update test
// coordinator uses it to distinguish OS loader/main-entry failures from later
// Electron startup.
reportAppUpdateE2ELifecycle('bootstrap-enter');
const windowsRegressionServer = applyWindowsRegressionRemoteServer(process.env, {
    platform: process.platform,
    isPackaged: app.isPackaged,
});
if (windowsRegressionServer) {
    console.warn(`[Main] LOCAL TEST SERVER active: ${windowsRegressionServer.origin}`);
}
// 渠道品牌名：优先 VITE_BOT_NAME，其次 VITE_APP_TITLE，最后中性兜底。
// 避免在托盘/通知/窗口标题里写死 YoBot 泄露给 OEM 渠道。
function getBrandName() {
    return process.env.VITE_BOT_NAME || process.env.VITE_APP_TITLE || 'AI Assistant';
}
// --- User Data Path Normalization ---
// Existing macOS installs remain on the legacy root for the migration-only first
// launch; a verified activation marker (or a fresh install) selects Application
// Support. This is the sole bootstrap decision point for every child process.
const explicitAgentUserData = process.env.USER_DATA_PATH?.trim() || undefined;
const platformAgentFileLayout = resolveAgentFileLayout({
    platform: process.platform,
    userHome: os.homedir(),
    userDataRoot: explicitAgentUserData,
});
const legacyAgentFileLayout = resolveAgentFileLayout({
    platform: process.platform,
    userHome: os.homedir(),
    userDataRoot: platformAgentFileLayout.legacyUserData,
});
const legacyAgentDataExistedAtBootstrap = process.platform === 'darwin'
    && explicitAgentUserData === undefined
    && fs.existsSync(legacyAgentFileLayout.userData);
const macOSMigrationInspection = process.platform === 'darwin' && explicitAgentUserData === undefined
    ? inspectMacOSUserDataMigration(legacyAgentFileLayout.userData, platformAgentFileLayout.userData)
    : { active: false, reason: 'not-applicable' };
const macOSBootstrapDecision = decideMacOSBootstrap({
    platform: process.platform,
    hasExplicitUserData: explicitAgentUserData !== undefined,
    legacyDataExists: legacyAgentDataExistedAtBootstrap,
    migrationActive: macOSMigrationInspection.active,
});
const macOSPlatformLayoutActive = macOSBootstrapDecision.secureConfigRequired;
const macOSMigrationRequired = macOSBootstrapDecision.migrationRequired;
const activeAgentFileLayout = resolveBootstrapAgentFileLayout({
    platform: process.platform,
    userHome: os.homedir(),
    userDataRoot: explicitAgentUserData,
    macOSDataLayout: macOSBootstrapDecision.dataLayout,
});
(function normalizeUserDataPath() {
    try {
        if (!fs.existsSync(activeAgentFileLayout.userData)) {
            fs.mkdirSync(activeAgentFileLayout.userData, { recursive: true });
        }
        app.setPath('userData', activeAgentFileLayout.userData);
        for (const [key, value] of Object.entries(agentFileLayoutEnvironment(activeAgentFileLayout))) {
            process.env[key] = value;
        }
        if (!fs.existsSync(activeAgentFileLayout.logsDir)) {
            fs.mkdirSync(activeAgentFileLayout.logsDir, { recursive: true });
        }
        app.setAppLogsPath(activeAgentFileLayout.logsDir);
        // Chromium data is cacheable and should not be mixed into Application
        // Support on the native macOS layout. Preserve all legacy/Windows paths.
        if (macOSPlatformLayoutActive) {
            const electronSessionDir = path.join(activeAgentFileLayout.cacheDir, 'electron-session');
            fs.mkdirSync(electronSessionDir, { recursive: true });
            app.setPath('sessionData', electronSessionDir);
        }
        console.log(`[Main] UserData Path normalized to: ${activeAgentFileLayout.userData}`);
    }
    catch (err) {
        console.error('[Main] Error normalizing userData path:', err);
    }
})();
// Force reload config manager after path change
ConfigManager.getInstance().reloadConfig();
// Register custom protocol before app ready for serving local images in renderer
protocol.registerSchemesAsPrivileged([
    { scheme: 'local-image', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true } }
]);
let mainWindow = null;
/**
 * 本地 API 密钥。每次启动随机生成，只在主进程与 server 子进程之间共享。
 * 见 channels/websocket.ts 的 requireLocalToken。
 */
const LOCAL_API_TOKEN = randomBytes(32).toString('hex');
let serverProcess = null;
let splashWindow = null;
// 系统托盘 + 后台运行:关闭窗口默认隐藏到托盘(保持网关/RPA 运行),真正退出走托盘菜单。
let tray = null;
let isQuitting = false;
let bgHintShown = false;
let teardownDone = false;
let teardownPromise = null;
let heartbeatTimer = null;
let appUpdateCheckTimer = null;
let lastWechatIlinkState;
let desktopUpdateManager = null;
let appUpdateTestRestartPromise = null;
let secureConfigRepository = null;
let ownedSecretStore = null;
let macOSControlDriver = null;
let macOSControlTransport = null;
let macOSOwnedLoopbackSnapshot = null;
const macOSPluginCompositionOwner = new MacOSPluginCompositionOwner();
let macOSPluginComposition = null;
let macOSPowerLifecycle = null;
let macOSControlCrashMonitor = null;
let macOSPluginInstallInFlight = 0;
const macOSPluginRuntimeRecovery = new MacOSPluginRuntimeRecoveryCoordinator({
    isQuitting: () => isQuitting,
    recover: async (reason) => {
        if (!macOSPluginComposition?.available) {
            return {
                success: false,
                reason: 'recovery_failed',
                error: 'macOS RPA 主进程服务尚未就绪',
            };
        }
        if (reason === 'startup') {
            // A Control left alive by an abrupt previous Agent exit still inherits
            // that process's private Agent token. Only the exact persisted owner may
            // be stopped; an unowned IDE or conflicting bundle must remain untouched.
            const stopped = await stopMacOSOwnedControl('startup');
            if (!stopped.success) {
                return {
                    success: false,
                    reason: 'recovery_failed',
                    error: '无法安全停止上次 Agent 的 macOS RPA，拒绝继承旧私域凭据',
                };
            }
        }
        let result;
        try {
            result = await macOSPluginComposition.intents.recoverOwnedRuntime();
        }
        catch {
            result = {
                success: false,
                reason: 'recovery_failed',
                error: 'macOS RPA 恢复未完成',
            };
        }
        if (result.success) {
            console.log(`[MacPlugin] ${reason} recovery settled (${result.data.mode}; version=${result.data.activeVersion ?? 'none'}).`);
            await syncMacOSControlTransportToServer();
        }
        else if (result.reason === 'auth_required') {
            console.log(`[MacPlugin] ${reason} recovery deferred until login.`);
        }
        else {
            console.error(`[MacPlugin] ${reason} recovery failed (${result.code ?? result.reason}; cause=${result.causeCode ?? 'none'}).`);
        }
        return result;
    },
});
let ownedConfigPersistenceQueue = Promise.resolve();
let ownedAuthTokenRepository = new LegacyFileAuthTokenRepository(path.join(activeAgentFileLayout.userData, 'auth.json'));
let ownedDeviceIdentity = null;
function applyOwnedAuthToken(token) {
    if (token)
        process.env.YOKO_RPA_TOKEN = token;
    else
        delete process.env.YOKO_RPA_TOKEN;
    if (serverProcess?.connected)
        serverProcess.send({ type: 'auth:set-token', token: token || '' });
}
async function syncMacOSControlTransportToServer() {
    if (process.platform !== 'darwin' || !macOSControlDriver)
        return false;
    try {
        const target = await macOSControlDriver.resolveOwnedLoopback();
        macOSOwnedLoopbackSnapshot = target;
        macOSControlCrashMonitor?.observe(target.ownership);
        if (serverIpcReady && serverProcess?.connected) {
            serverProcess.send({
                type: 'rpa:set-loopback-transport',
                transport: {
                    runtimeId: target.ownership.runtime_id,
                    port: target.ownership.port,
                    apiKey: target.credential.read(),
                    channelId: target.ownership.channel_id,
                },
            });
        }
        return true;
    }
    catch {
        // A stale child transport must never keep calling a reused 9922 port when
        // main can no longer prove the exact Control owner.
        clearMacOSControlTransportFromServer();
        return false;
    }
}
function clearMacOSControlTransportFromServer() {
    macOSOwnedLoopbackSnapshot = null;
    if (process.platform === 'darwin' && serverProcess?.connected) {
        serverProcess.send({ type: 'rpa:clear-loopback-transport' });
    }
}
async function readOwnedAuthToken() {
    return ownedAuthTokenRepository.read();
}
async function persistOwnedAuthToken(value) {
    const token = normalizeAuthAccessToken(value);
    const previous = process.platform === 'darwin' ? await readOwnedAuthToken() : null;
    await ownedAuthTokenRepository.write(token);
    applyOwnedAuthToken(token);
    if (process.platform === 'darwin' && previous !== token) {
        // LaunchServices cannot mutate an existing app's environment. Match the
        // Windows applyAuthToken contract by replacing only our exact owned Control
        // before a new access token is allowed to drive automation.
        const stopped = await stopMacOSOwnedControl('auth-refresh');
        if (!stopped.success)
            throw new Error('登录状态已更新，但 macOS RPA 无法安全刷新凭据');
        await macOSPluginRuntimeRecovery.waitForCurrent();
        void macOSPluginRuntimeRecovery.request('auth-refresh');
    }
}
async function clearOwnedAuthToken() {
    const stopResult = await stopMacOSOwnedControl('auth-loss');
    try {
        await ownedAuthTokenRepository.clear();
    }
    finally {
        // Fail closed in memory even if damaged storage could not be removed. The
        // IPC caller still receives the persistence error and can surface repair.
        applyOwnedAuthToken(null);
    }
    if (!stopResult.success) {
        throw new Error('登录状态已清除，但 macOS RPA 未能确认停止');
    }
}
async function persistOwnedConfigNow(config) {
    const manager = ConfigManager.getInstance();
    const mergedConfig = mergeConfigSecretPlaceholders(config, manager.getConfig());
    if (!secureConfigRepository) {
        manager.saveConfig(mergedConfig);
        return manager.getConfig();
    }
    const physical = manager.getPersistableConfig(mergedConfig);
    await secureConfigRepository.write(physical);
    const hydrated = await secureConfigRepository.read();
    if (!hydrated)
        throw new Error('Secure config disappeared after persistence');
    manager.useExternalPersistence(hydrated);
    return manager.getConfig();
}
function persistOwnedConfig(config) {
    // Secure persistence includes multiple async commits (secret generation,
    // config pointer, old-generation cleanup). Serialize the owner transaction so
    // generations cannot interleave and secret placeholders see the latest snapshot.
    const task = ownedConfigPersistenceQueue.then(() => persistOwnedConfigNow(config));
    ownedConfigPersistenceQueue = task.then(() => undefined, () => undefined);
    return task;
}
function pushOwnedConfigToServer() {
    if (!serverProcess?.connected)
        return;
    serverProcess.send(createConfigReplaceMessage(ConfigManager.getInstance().getConfig()));
}
async function initializeMacOSSecureConfig() {
    if (!macOSPlatformLayoutActive)
        return;
    if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('macOS system encryption is unavailable');
    }
    const secretStore = createAgentSecretStore(activeAgentFileLayout);
    ownedSecretStore = secretStore;
    secureConfigRepository = new SecureConfigRepository({
        configPath: activeAgentFileLayout.configFile,
        secretStore,
    });
    ownedAuthTokenRepository = new SecretStoreAuthTokenRepository(secretStore);
    const deviceIdentity = await new SecretStoreDeviceIdentityProvider(secretStore, getMachineCode).getOrCreate();
    ownedDeviceIdentity = deviceIdentity;
    process.env[DEVICE_IDENTITY_V2_ENV] = deviceIdentity.id;
    console.log(`[Main] Device identity v2 ready (${deviceIdentity.source}; legacy RPA mapping preserved).`);
    let document = await secureConfigRepository.read();
    if (document && !(await secureConfigRepository.isProtected())) {
        // One-time conversion for a platform-layout plaintext config created by a
        // prerelease build. The repository commits the encrypted generation first.
        await secureConfigRepository.write(document);
        document = await secureConfigRepository.read();
    }
    ConfigManager.getInstance().useExternalPersistence(document);
    const legacyAuth = new LegacyFileAuthTokenRepository(path.join(activeAgentFileLayout.userData, 'auth.json'));
    await migrateLegacyAuthToken(legacyAuth, ownedAuthTokenRepository);
    applyOwnedAuthToken(await readOwnedAuthToken());
}
function initializeMacOSPluginComposition() {
    if (process.platform !== 'darwin')
        return;
    if (!macOSPlatformLayoutActive || !ownedSecretStore) {
        console.warn('[MacPlugin] Secure platform layout is unavailable; v2 plugin service disabled.');
        return;
    }
    const localTestMode = !app.isPackaged
        && process.env.NODE_ENV === 'development'
        && process.env.YOKO_MACOS_PLUGIN_LOCAL_TEST_MODE === 'true';
    try {
        macOSControlDriver = new MacOSControlDriver({
            pluginRoot: path.join(activeAgentFileLayout.pluginsDir, 'wechat-rpa'),
            secretStore: ownedSecretStore,
            platform: 'darwin',
        });
        macOSControlTransport = new MacOSControlTransport({
            owner: macOSControlDriver,
            platform: 'darwin',
        });
    }
    catch {
        macOSControlDriver = null;
        macOSControlTransport = null;
        console.warn('[MacPlugin] Control ownership driver unavailable; v2 plugin service disabled.');
        return;
    }
    macOSPluginComposition = macOSPluginCompositionOwner.getOrCreate({
        fileLayout: activeAgentFileLayout,
        secretStore: ownedSecretStore,
        authTokens: ownedAuthTokenRepository,
        controlDriver: macOSControlDriver,
        agentVersion: app.getVersion(),
        systemVersion: process.getSystemVersion(),
        releaseApiBaseUrl: process.env[MACOS_PLUGIN_RELEASE_API_ENV],
        // Keep signed artifact discovery separate from the mature RPA business API.
        // This is the same Server origin injected into the Windows service process.
        businessApiBaseUrl: process.env.REMOTE_SERVER_URL,
        machineCodeProvider: getMachineCode,
        privateAgentToken: LOCAL_API_TOKEN,
        pluginManifestPublicKeys: process.env[MACOS_PLUGIN_MANIFEST_KEYS_ENV],
        channelId: process.env.VITE_CHANNEL_ID || 'agent_generic',
        getGate: () => {
            const gate = getRpaUpdateBlock();
            return { blocked: gate.blocked, requiredVersion: gate.requiredVersion };
        },
        mode: localTestMode ? 'local-test' : 'production',
    });
    if (macOSPluginComposition.available) {
        if (!macOSControlCrashMonitor) {
            macOSControlCrashMonitor = new MacOSControlCrashMonitor({
                isPaused: () => isQuitting || macOSPluginInstallInFlight > 0
                    || !macOSPluginComposition?.available || getRpaUpdateBlock().blocked,
                isOwnedControlRunning: (ownership) => macOSControlDriver.isOwnedControlRunning(ownership),
                recoverExitedOwner: async (ownership) => {
                    if (macOSPluginInstallInFlight > 0)
                        return 'deferred';
                    if (macOSOwnedLoopbackSnapshot
                        && macOSOwnedLoopbackSnapshot.ownership.runtime_id !== ownership.runtime_id)
                        return 'deferred';
                    // The process identity probe has proven this exact owner exited.
                    // Revoke the old worker transport before any port can be reused.
                    if (macOSOwnedLoopbackSnapshot?.ownership.runtime_id === ownership.runtime_id) {
                        clearMacOSControlTransportFromServer();
                    }
                    const composition = macOSPluginComposition;
                    if (!composition?.available)
                        return 'deferred';
                    const status = await composition.service.getStatus();
                    if (status.phase !== 'healthy')
                        return 'deferred';
                    const result = await macOSPluginRuntimeRecovery.request('runtime-exit');
                    if (!result?.success || result.data.mode === 'inactive') {
                        console.error('[MacPlugin] exact-owner Control exit recovery failed or deferred.');
                        return false;
                    }
                    return true;
                },
            });
        }
        console.log('[MacPlugin] v2 intent service is ready; scheduling owned startup recovery.');
        if (!macOSPowerLifecycle) {
            macOSPowerLifecycle = new MacOSPowerLifecycle({
                stopOwnedRuntime: () => stopMacOSOwnedControl('system-suspend'),
                recoverOwnedRuntime: async () => {
                    const result = await macOSPluginRuntimeRecovery.request('power-resume');
                    if (!result?.success)
                        throw new Error('macOS RPA recovery was rejected after resume');
                    return result;
                },
                isQuitting: () => isQuitting,
                onError: (stage) => console.error(`[MacPlugin] ${stage} lifecycle failed.`),
            });
            powerMonitor.on('suspend', () => {
                void macOSPowerLifecycle?.suspend();
            });
            powerMonitor.on('resume', () => {
                void macOSPowerLifecycle?.resume();
            });
        }
        // Start in the background so the main window is not held behind the RPA's
        // bounded cold-start gate. Plugin intents join this exact attempt.
        void macOSPluginRuntimeRecovery.request('startup');
    }
    else {
        console.warn(`[MacPlugin] v2 intent service unavailable (${macOSPluginComposition.reason}).`);
    }
}
async function stopMacOSOwnedControl(reason) {
    if (process.platform !== 'darwin')
        return { success: true, mode: 'already-stopped' };
    macOSControlCrashMonitor?.clear();
    macOSControlDriver?.revokeSessionOwnership();
    clearMacOSControlTransportFromServer();
    if (reason !== 'system-suspend')
        macOSPowerLifecycle?.cancelRecovery();
    try {
        const result = macOSPluginComposition?.available
            ? await macOSPluginComposition.service.stopRuntime()
            : await macOSControlDriver?.stopOwnedControl();
        clearMacOSControlTransportFromServer();
        return { success: true, mode: result?.mode ?? 'already-stopped' };
    }
    catch (error) {
        macOSControlDriver?.revokeSessionOwnership();
        clearMacOSControlTransportFromServer();
        const code = error && typeof error === 'object' && typeof error.code === 'string'
            ? error.code
            : 'MACOS_CONTROL_STOP_FAILED';
        console.error(`[MacPlugin] ${reason} stop failed (${code}).`);
        return { success: false };
    }
}
async function prepareMacOSUserData() {
    if (!macOSMigrationRequired) {
        try {
            await initializeMacOSSecureConfig();
            return false;
        }
        catch (error) {
            console.error('[Main] Secure config initialization failed:', error);
            await dialog.showMessageBox({
                type: 'error',
                title: `${getBrandName()} 安全存储不可用`,
                message: '无法安全读取本机配置，应用将退出。',
                detail: error instanceof Error ? error.message : String(error),
                buttons: ['退出'],
                defaultId: 0,
            });
            app.quit();
            return true;
        }
    }
    try {
        const result = await migrateMacOSUserData({
            sourceLayout: legacyAgentFileLayout,
            targetLayout: platformAgentFileLayout,
            createSecretStore: createAgentSecretStoreAt,
        });
        if (result.status === 'migrated' || result.status === 'already-active' || result.status === 'source-missing') {
            console.log(`[Main] macOS user-data migration ${result.status}; relaunching on platform layout.`);
            app.relaunch();
            app.quit();
            return true;
        }
        await initializeMacOSSecureConfig();
        return false;
    }
    catch (error) {
        console.error('[Main] macOS user-data migration failed; keeping legacy layout:', error);
        await dialog.showMessageBox({
            type: 'warning',
            title: `${getBrandName()} 数据迁移未完成`,
            message: '数据迁移未完成，本次仍使用旧数据目录。',
            detail: error instanceof Error ? error.message : String(error),
            buttons: ['继续使用旧目录'],
            defaultId: 0,
        });
        return false;
    }
}
function getRpaUpdateBlock() {
    const snapshot = desktopUpdateManager?.getSnapshot();
    if (!snapshot?.policy.rpa_blocked || snapshot.policy.rpa_action === 'allow') {
        return { blocked: false };
    }
    return {
        blocked: true,
        requiredVersion: snapshot.targetVersion,
        message: snapshot.targetVersion
            ? `当前客户端版本存在已知 RPA 风险，请先升级到 ${snapshot.targetVersion} 后再启动 RPA。`
            : '当前客户端版本存在已知 RPA 风险，请先完成客户端升级后再启动 RPA。',
    };
}
function scheduleAppUpdateCheck(delayMs = 60 * 60 * 1000) {
    if (appUpdateCheckTimer)
        clearTimeout(appUpdateCheckTimer);
    appUpdateCheckTimer = setTimeout(async () => {
        try {
            await desktopUpdateManager?.checkForUpdates(false);
        }
        catch (error) {
            console.warn('[Main] Background app update check failed:', error);
        }
        finally {
            if (!isQuitting)
                scheduleAppUpdateCheck();
        }
    }, delayMs);
    appUpdateCheckTimer.unref();
}
function getWechatIlinkCredentialPath() {
    return path.join(app.getPath('userData'), 'channels', 'wechat-ilink', 'credentials.bin');
}
function readWechatIlinkCredential() {
    const credentialPath = getWechatIlinkCredentialPath();
    if (!fs.existsSync(credentialPath))
        return null;
    if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('当前系统安全存储不可用，无法读取微信 iLink 凭据。');
    }
    const decrypted = safeStorage.decryptString(fs.readFileSync(credentialPath));
    const parsed = JSON.parse(decrypted);
    if (typeof parsed.accountId !== 'string' ||
        typeof parsed.botToken !== 'string' ||
        typeof parsed.baseUrl !== 'string' ||
        typeof parsed.ownerUserId !== 'string') {
        throw new Error('本地微信 iLink 凭据已损坏，请重新绑定。');
    }
    return {
        accountId: parsed.accountId,
        botToken: parsed.botToken,
        baseUrl: parsed.baseUrl,
        ownerUserId: parsed.ownerUserId,
        savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
    };
}
function writeWechatIlinkCredential(credential) {
    if (!credential ||
        typeof credential.accountId !== 'string' || !credential.accountId.trim() ||
        typeof credential.botToken !== 'string' || !credential.botToken.trim() ||
        typeof credential.baseUrl !== 'string' || !credential.baseUrl.trim() ||
        typeof credential.ownerUserId !== 'string' || !credential.ownerUserId.trim()) {
        throw new Error('拒绝保存不完整的微信 iLink 凭据。');
    }
    if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('当前系统安全存储不可用，无法安全保存微信 iLink 凭据。');
    }
    const credentialPath = getWechatIlinkCredentialPath();
    fs.mkdirSync(path.dirname(credentialPath), { recursive: true });
    const encrypted = safeStorage.encryptString(JSON.stringify(credential));
    const tempPath = `${credentialPath}.tmp`;
    fs.writeFileSync(tempPath, encrypted, { mode: 0o600 });
    fs.renameSync(tempPath, credentialPath);
    try {
        fs.chmodSync(credentialPath, 0o600);
    }
    catch { }
}
function deleteWechatIlinkCredential() {
    try {
        fs.unlinkSync(getWechatIlinkCredentialPath());
    }
    catch (error) {
        if (error?.code !== 'ENOENT')
            throw error;
    }
}
async function updateWechatIlinkConfig(update) {
    const manager = ConfigManager.getInstance();
    const current = manager.getConfig();
    const existing = current.channels?.wechatIlink ?? { enabled: false };
    const next = {
        ...existing,
        ...(update.enabled !== undefined ? { enabled: update.enabled } : {}),
        ...(update.accountId === null
            ? { accountId: undefined }
            : update.accountId !== undefined
                ? { accountId: update.accountId }
                : {}),
    };
    await persistOwnedConfig({
        ...current,
        channels: { ...current.channels, wechatIlink: next },
    });
    if (secureConfigRepository)
        pushOwnedConfigToServer();
}
function publishWechatIlinkStatus(status) {
    if (status.accountId) {
        const savedAccountId = ConfigManager.getInstance().getConfig().channels?.wechatIlink?.accountId;
        if (savedAccountId !== status.accountId) {
            void updateWechatIlinkConfig({ accountId: status.accountId }).catch((error) => {
                console.error('[Main] Failed to persist WeChat iLink account state:', error);
            });
        }
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('wechat-ilink:status', status);
    }
    if (status.state === 'expired' && lastWechatIlinkState !== 'expired' && ElectronNotification.isSupported()) {
        const notification = new ElectronNotification({
            title: `${getBrandName()}：微信连接已过期`,
            body: '请打开配置页面，重新扫码绑定微信 iLink。',
        });
        notification.on('click', () => {
            mainWindow?.show();
            mainWindow?.focus();
            mainWindow?.webContents.send('wechat-ilink:open-config');
        });
        notification.show();
    }
    lastWechatIlinkState = status.state;
}
function assertWechatIlinkIpcSender(event) {
    if (!mainWindow || mainWindow.isDestroyed() || event.sender.id !== mainWindow.webContents.id) {
        throw new Error('拒绝来自非主窗口的微信 iLink 操作。');
    }
}
function isTrustedMacOSPluginRenderer(event) {
    const frame = event.senderFrame;
    return isTrustedMacOSPluginIpcSender({
        senderWebContentsId: event.sender.id,
        mainWindowWebContentsId: mainWindow && !mainWindow.isDestroyed()
            ? mainWindow.webContents.id
            : null,
        senderFrameUrl: frame?.url ?? '',
        senderFrameIsMainFrame: Boolean(frame && frame === event.sender.mainFrame),
        mode: process.env.NODE_ENV === 'development' ? 'development' : 'packaged',
        developmentUrl: process.env.VITE_DEV_SERVER_URL || 'http://localhost:9988',
        packagedIndexPath: path.join(__dirname, '../../ui/index.html'),
    });
}
function getPowerShellPath() {
    const systemRoot = process.env.SystemRoot || process.env.windir || 'C:\\Windows';
    return path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
}
function sendServerRequest(type, doneType, payload = {}, timeoutMs = 90000) {
    if (!serverProcess || !serverProcess.connected) {
        return Promise.resolve({ success: false, error: 'Server process not running' });
    }
    const requestServer = serverProcess;
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return new Promise((resolve) => {
        let settled = false;
        const finish = (value) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timeout);
            requestServer.off('message', handler);
            resolve(value);
        };
        const handler = (msg) => {
            if (msg && msg.type === doneType && msg.requestId === requestId) {
                finish(msg.result || { success: false, error: 'Empty server response' });
            }
        };
        const timeout = setTimeout(() => {
            finish({ success: false, reason: 'ipc_timeout', message: `${type} timed out.` });
        }, timeoutMs);
        requestServer.on('message', handler);
        try {
            requestServer.send({ type, requestId, ...payload }, (error) => {
                if (error)
                    finish({ success: false, reason: 'ipc_unavailable' });
            });
        }
        catch {
            finish({ success: false, reason: 'ipc_unavailable' });
        }
    });
}
async function runPluginUpdaterSwap(payload) {
    const updaterPath = path.join(__dirname, 'plugin_updater.js');
    if (!fs.existsSync(updaterPath)) {
        throw new Error(`Updater script not found: ${updaterPath}`);
    }
    return new Promise((resolve, reject) => {
        const updaterProcess = fork(updaterPath, [], {
            env: {
                ...process.env,
                ELECTRON_RUN_AS_NODE: '1'
            },
            stdio: ['ignore', 'pipe', 'pipe', 'ipc']
        });
        let settled = false;
        const finish = (err, pendingUpdate = false) => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timeout);
            if (err) {
                reject(err);
                return;
            }
            resolve({ pendingUpdate });
        };
        const timeout = setTimeout(() => {
            try {
                updaterProcess.kill();
            }
            catch { }
            finish(new Error('Updater process timeout after 240 seconds'));
        }, 240000);
        updaterProcess.stdout?.on('data', (data) => {
            console.log(`[PluginUpdater] ${data.toString().trim()}`);
        });
        updaterProcess.stderr?.on('data', (data) => {
            console.error(`[PluginUpdater Error] ${data.toString().trim()}`);
        });
        updaterProcess.on('message', (msg) => {
            if (!msg) {
                return;
            }
            if (msg.type === 'plugin-updater:done') {
                finish(undefined, msg.pendingUpdate === true);
            }
            else if (msg.type === 'plugin-updater:error') {
                finish(new Error(msg.error || 'Unknown updater error'));
            }
        });
        updaterProcess.on('error', (err) => finish(err));
        updaterProcess.on('exit', (code) => {
            if (!settled && code !== 0) {
                finish(new Error(`Updater exited with code ${code}`));
            }
        });
        updaterProcess.send({ type: 'plugin-updater:run', payload });
    });
}
// --- Config IPC Handlers ---
ipcMain.handle('config:get', async () => {
    // Use getSafeConfig to return masked keys to UI
    const config = ConfigManager.getInstance().getSafeConfig();
    return config;
});
let migrationBusy = false;
function emitMigrationProgress(progress) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('migration:progress', progress);
    }
}
function createMigrationService() {
    return new MigrationService({
        layout: getManagedDataLayout(),
        appVersion: app.getVersion(),
        tempRoot: app.getPath('temp'),
        onProgress: emitMigrationProgress,
    });
}
ipcMain.handle('migration:export', async () => {
    if (migrationBusy)
        return { success: false, error: '已有数据迁移任务正在进行' };
    const defaultName = '客户端数据迁移.agentbackup';
    const selection = mainWindow
        ? await dialog.showSaveDialog(mainWindow, {
            title: '导出数据迁移包',
            defaultPath: path.join(app.getPath('documents'), defaultName),
            filters: [{ name: '客户端数据迁移包', extensions: ['agentbackup'] }],
        })
        : await dialog.showSaveDialog({
            title: '导出数据迁移包',
            defaultPath: path.join(app.getPath('documents'), defaultName),
            filters: [{ name: '客户端数据迁移包', extensions: ['agentbackup'] }],
        });
    if (selection.canceled || !selection.filePath)
        return { success: false, cancelled: true };
    migrationBusy = true;
    const shouldRestartServer = !!serverProcess;
    try {
        emitMigrationProgress({ operation: 'export', stage: 'collecting', percent: 2, message: '正在暂停后台服务并准备数据快照…' });
        await stopServer();
        return await createMigrationService().exportTo(selection.filePath);
    }
    finally {
        migrationBusy = false;
        if (shouldRestartServer && !isQuitting && !serverProcess)
            startServer();
    }
});
ipcMain.handle('migration:import', async () => {
    if (migrationBusy)
        return { success: false, error: '已有数据迁移任务正在进行' };
    const selection = mainWindow
        ? await dialog.showOpenDialog(mainWindow, {
            title: '选择数据迁移包',
            properties: ['openFile'],
            filters: [
                { name: '客户端数据迁移包', extensions: ['agentbackup', 'yokomigrate', 'zip'] },
            ],
        })
        : await dialog.showOpenDialog({
            title: '选择数据迁移包',
            properties: ['openFile'],
            filters: [{ name: '客户端数据迁移包', extensions: ['agentbackup', 'yokomigrate', 'zip'] }],
        });
    if (selection.canceled || !selection.filePaths[0])
        return { success: false, cancelled: true };
    migrationBusy = true;
    const shouldRestartServerOnFailure = !!serverProcess;
    try {
        emitMigrationProgress({ operation: 'import', stage: 'validating', percent: 2, message: '正在暂停后台服务并准备校验…' });
        await stopServer();
        const result = await createMigrationService().importFrom(selection.filePaths[0]);
        if (!result.success && shouldRestartServerOnFailure && !isQuitting && !serverProcess)
            startServer();
        return result;
    }
    finally {
        migrationBusy = false;
    }
});
ipcMain.handle('migration:restart', async () => {
    app.relaunch();
    app.quit();
    return { success: true };
});
ipcMain.handle('service:restart-rpa', async (event) => {
    if (process.platform === 'darwin') {
        if (!isTrustedMacOSPluginRenderer(event)) {
            return { success: false, reason: 'sender_rejected', error: '拒绝来自非主窗口的 macOS RPA 请求' };
        }
        const gate = getRpaUpdateBlock();
        if (gate.blocked)
            return { success: false, reason: 'client_update_required', message: gate.message, requiredVersion: gate.requiredVersion };
        if (!macOSPluginComposition?.available) {
            return {
                success: false,
                reason: 'plugin_unavailable',
                error: macOSPluginComposition?.message ?? 'macOS RPA 主进程服务尚未就绪',
            };
        }
        const result = await macOSPluginRuntimeRecovery.request('manual-restart');
        return result ?? {
            success: false,
            reason: 'recovery_failed',
            error: '应用正在退出，未启动 macOS RPA',
        };
    }
    const gate = getRpaUpdateBlock();
    if (gate.blocked)
        return { success: false, reason: 'client_update_required', message: gate.message, requiredVersion: gate.requiredVersion };
    // Full lifecycle restart: reserved for plugin install/update and legacy RPA without 9921.
    return sendServerRequest('service:restart-rpa', 'service:restart-rpa:done');
});
ipcMain.handle('service:restart-rpa-worker', async () => {
    const gate = getRpaUpdateBlock();
    if (gate.blocked)
        return { success: false, reason: 'client_update_required', message: gate.message, requiredVersion: gate.requiredVersion };
    // Server waits up to 180s for hot attachment and feature restoration. Keep IPC alive a
    // little longer so the UI cannot report a false timeout while recovery is still succeeding.
    return sendServerRequest('service:restart-rpa-worker', 'service:restart-rpa-worker:done', {}, 195_000);
});
ipcMain.handle('service:repair-rpa', async () => {
    const gate = getRpaUpdateBlock();
    if (gate.blocked)
        return { success: false, reason: 'client_update_required', message: gate.message, requiredVersion: gate.requiredVersion };
    return sendServerRequest('service:repair-rpa', 'service:repair-rpa:done');
});
ipcMain.handle('service:stop-rpa', async (event) => {
    if (process.platform === 'darwin') {
        if (!isTrustedMacOSPluginRenderer(event)) {
            return { success: false, error: '拒绝来自非主窗口的 macOS RPA 请求' };
        }
        return stopMacOSOwnedControl('manual-stop');
    }
    if (serverProcess && serverProcess.connected) {
        serverProcess.send({ type: 'service:stop-rpa' });
        return { success: true };
    }
    return { success: false, error: 'Server process not running' };
});
ipcMain.handle('config:save', async (_, newConfig) => {
    await persistOwnedConfig(newConfig);
    // Optional: Trigger reload in LLMManager if needed (but ConfigManager updates are usually enough if LLMManager pulls fresh)
    // However, LLMManager might have cached clients.
    // We can broadcast an event or let the renderer trigger a re-init via another IPC if strictly needed.
    // For now, simple save is enough.
    // Notify Server Process to reload config
    if (secureConfigRepository)
        pushOwnedConfigToServer();
    else if (serverProcess?.connected)
        serverProcess.send({ type: 'config:reload' });
    return { success: true };
});
// 微信 iLink 使用独立 IPC 管理扫码、状态和安全凭据，不经过普通配置接口传递 token。
ipcMain.handle('wechat-ilink:get-status', async (event) => {
    assertWechatIlinkIpcSender(event);
    return sendServerRequest('wechat-ilink:get-status', 'wechat-ilink:get-status:done', {}, 15_000);
});
ipcMain.handle('wechat-ilink:start-binding', async (event) => {
    assertWechatIlinkIpcSender(event);
    const result = await sendServerRequest('wechat-ilink:start-binding', 'wechat-ilink:start-binding:done', {}, 25_000);
    if (result?.success)
        await updateWechatIlinkConfig({ enabled: true });
    return result;
});
ipcMain.handle('wechat-ilink:submit-verify-code', async (_, code) => {
    assertWechatIlinkIpcSender(_);
    return sendServerRequest('wechat-ilink:submit-verify-code', 'wechat-ilink:submit-verify-code:done', { code }, 15_000);
});
ipcMain.handle('wechat-ilink:cancel-binding', async (event) => {
    assertWechatIlinkIpcSender(event);
    return sendServerRequest('wechat-ilink:cancel-binding', 'wechat-ilink:cancel-binding:done', {}, 15_000);
});
ipcMain.handle('wechat-ilink:set-enabled', async (_, enabled) => {
    assertWechatIlinkIpcSender(_);
    const result = await sendServerRequest('wechat-ilink:set-enabled', 'wechat-ilink:set-enabled:done', { enabled }, 20_000);
    if (result?.success)
        await updateWechatIlinkConfig({ enabled });
    return result;
});
ipcMain.handle('wechat-ilink:unbind', async (event) => {
    assertWechatIlinkIpcSender(event);
    const result = await sendServerRequest('wechat-ilink:unbind', 'wechat-ilink:unbind:done', {}, 20_000);
    if (result?.success)
        await updateWechatIlinkConfig({ enabled: false, accountId: null });
    return result;
});
ipcMain.handle('config:test-llm', async (_, providerId) => {
    try {
        const { LLMManager } = await import('../agent/llm/manager.js');
        const client = LLMManager.getInstance().getClient(providerId);
        const model = LLMManager.getInstance().getModelName(providerId);
        const response = await client.chat.completions.create({
            model: model,
            messages: [{ role: 'user', content: 'Hello' }],
            max_tokens: 5
        });
        return { success: true, message: response.choices[0].message?.content };
    }
    catch (e) {
        return { success: false, error: e.message };
    }
});
// 计算本机机器码，与 RPA 插件 license_manager.get_machine_code() 完全一致。
// 用途：客户端在「插件尚未安装(status 'missing')」时也能据此查询本设备是否已通过
// 激活码激活（老用户从 yokowebot 迁移的常见场景），从而在已激活时隐藏「购买席位」按钮。
// 算法：sha256(f"{node}-{processor}-{machine}") 取前 16 位大写，每 4 位用 '-' 连接。
//   node      = os.hostname()                                       (== Python platform.uname().node)
//   machine   = %PROCESSOR_ARCHITEW6432% || %PROCESSOR_ARCHITECTURE%(== uname().machine on Windows)
//   processor = %PROCESSOR_IDENTIFIER% || machine                    (== uname().processor on Windows)
// 已在本机验证与 Python 输出逐字节一致（RPA 为 Windows 专属功能）。
// 实现收敛到 src/core/machine_code.ts：Entitlement Bundle 的设备绑定用的是同一个值，
// 两份实现一旦漂移就会表现为「授权莫名失效」，所以只保留一份。
ipcMain.handle('rpa:get-machine-code', async () => {
    try {
        return { success: true, machineCode: getMachineCode() };
    }
    catch (e) {
        console.error('[Main] rpa:get-machine-code failed:', e);
        return { success: false, error: e.message };
    }
});
// --- RPA Feature Toggle IPC ---
ipcMain.handle('rpa:get-features-status', async () => {
    try {
        if (process.platform === 'darwin') {
            return await executeMacOSControlJson({ path: '/api/agent/features_status', method: 'GET' });
        }
        const { RPAApiClient } = await import('../skills/wechat_rpa/api_client.js');
        const client = new RPAApiClient();
        return await client.getFeaturesStatus();
    }
    catch (e) {
        console.error(`[Main] RPA get-features-status failed:`, e);
        return { success: false, error: e.message };
    }
});
ipcMain.handle('rpa:get-supervisor-status', async () => {
    try {
        const { RpaSupervisorClient } = await import('../skills/wechat_rpa/supervisor_client.js');
        const data = await new RpaSupervisorClient().getStatus();
        return data ? { success: true, reachable: true, data } : { success: false, reachable: false, data: null };
    }
    catch (e) {
        return { success: false, reachable: false, data: null, error: e?.message || String(e) };
    }
});
ipcMain.handle('rpa:check-runtime', async (_, options = {}) => {
    return sendServerRequest('service:check-rpa-runtime', 'service:check-rpa-runtime:done', {
        retry: options.retry === true, repair: options.repair === true,
    }, 30_000);
});
ipcMain.handle('rpa:toggle-feature', async (_, { feature, enabled }) => {
    try {
        if (process.platform === 'darwin') {
            if (feature === 'ai_sales') {
                return await executeMacOSControlJson({
                    path: enabled ? '/api/chat/multi-monitor/start' : '/api/chat/monitor/stop',
                    method: 'POST',
                    body: {},
                });
            }
            if (feature === 'ai_moment') {
                return await executeMacOSControlJson({
                    path: '/api/moment/toggle-auto-comment', method: 'POST', body: { enabled },
                });
            }
            if (feature === 'auto_add_friend') {
                return await executeMacOSControlJson({
                    path: '/api/friend/auto-add-new/toggle', method: 'POST', body: { enabled },
                });
            }
            throw new Error(`Unknown feature: ${feature}`);
        }
        const { RPAApiClient } = await import('../skills/wechat_rpa/api_client.js');
        // Currently relying on default port and key, in future might need to read from config
        const client = new RPAApiClient();
        if (feature === 'ai_sales') {
            return await client.toggleAiSales(enabled);
        }
        else if (feature === 'ai_moment') {
            return await client.toggleAiMoment(enabled);
        }
        else if (feature === 'auto_add_friend') {
            return await client.toggleAutoAddFriend(enabled);
        }
        else {
            throw new Error(`Unknown feature: ${feature}`);
        }
    }
    catch (e) {
        console.error(`[Main] RPA toggle-feature failed:`, e);
        return { success: false, error: e.message };
    }
});
// --- Auth IPC Handlers ---
ipcMain.handle('auth:get-device-context', async () => {
    try {
        const target = resolvePlatformTarget();
        const deviceContext = createAgentDeviceContext({
            platform: target.platform,
            arch: target.arch,
            appVersion: app.getVersion(),
            installationIdentity: ownedDeviceIdentity,
            legacyMachineCode: getMachineCode(),
        });
        return { success: true, deviceContext };
    }
    catch (e) {
        console.error('[Main] Failed to resolve auth device context:', e);
        return { success: false, error: e?.message || String(e) };
    }
});
ipcMain.handle('auth:set-token', async (_, token) => {
    try {
        await persistOwnedAuthToken(token);
        console.log('[Main] Auth token updated');
        return { success: true };
    }
    catch (e) {
        console.error('[Main] Failed to save auth token:', e);
        return { success: false, error: e.message };
    }
});
ipcMain.handle('auth:clear-token', async () => {
    try {
        await clearOwnedAuthToken();
        console.log('[Main] Auth token cleared');
        return { success: true };
    }
    catch (e) {
        console.error('[Main] Failed to clear auth token:', e);
        return { success: false, error: e?.message || String(e) };
    }
});
// --- Plugin Management IPC ---
ipcMain.handle('app:get-platform', () => process.platform);
ipcMain.handle('plugin:intent-v2', async (event, input) => {
    if (!isTrustedMacOSPluginRenderer(event)) {
        return {
            ok: false,
            action: null,
            error: {
                code: 'MACOS_PLUGIN_INTENT_SENDER_REJECTED',
                message: '拒绝来自非主窗口的 macOS RPA 请求',
            },
        };
    }
    const intent = parseMacOSPluginIntent(input);
    if (!intent) {
        return {
            ok: false,
            action: null,
            error: {
                code: 'MACOS_PLUGIN_INTENT_INVALID',
                message: 'macOS RPA 请求只允许官方插件和已知业务动作',
            },
        };
    }
    if (process.platform !== 'darwin') {
        return {
            ok: false,
            action: intent.action,
            error: {
                code: 'MACOS_PLUGIN_INTENT_UNAVAILABLE',
                reason: 'not-darwin',
                message: 'macOS RPA 服务仅在 Darwin 可用',
            },
        };
    }
    if (!macOSPluginComposition?.available) {
        return {
            ok: false,
            action: intent.action,
            error: {
                code: 'MACOS_PLUGIN_INTENT_UNAVAILABLE',
                reason: macOSPluginComposition?.reason ?? 'secure-platform-layout-unavailable',
                message: macOSPluginComposition?.message ?? 'macOS RPA 安全运行环境尚未就绪',
            },
        };
    }
    // Cold start, login refresh and wake are main-owned operations. Waiting
    // here prevents a durable `healthy` pointer from being mistaken for a live
    // 9922 process, and keeps install/update serialized behind recovery.
    await macOSPluginRuntimeRecovery.waitForCurrent();
    const installing = intent.action === 'install-latest';
    if (installing)
        macOSPluginInstallInFlight += 1;
    try {
        const result = await macOSPluginComposition.intents.execute(intent, {
            onProgress: (progress) => {
                if (!event.sender.isDestroyed() && isTrustedMacOSPluginRenderer(event)) {
                    event.sender.send('plugin:intent-v2-progress', progress);
                }
            },
        });
        if (result.ok)
            await syncMacOSControlTransportToServer();
        return result;
    }
    finally {
        if (installing)
            macOSPluginInstallInFlight -= 1;
    }
});
ipcMain.handle('rpa:request-v2', async (event, input) => {
    const unavailable = (status, code, message) => ({
        success: false,
        status,
        contentType: 'application/json',
        bodyText: JSON.stringify({ success: false, code, message }),
    });
    if (!isTrustedMacOSPluginRenderer(event)) {
        return unavailable(403, 'MACOS_RPA_REQUEST_SENDER_REJECTED', '拒绝来自非主窗口的 macOS RPA 请求');
    }
    if (process.platform !== 'darwin') {
        return unavailable(400, 'MACOS_RPA_REQUEST_UNAVAILABLE', 'macOS RPA 本地传输仅在 Darwin 可用');
    }
    if (!macOSControlTransport) {
        return unavailable(503, 'MACOS_RPA_REQUEST_UNAVAILABLE', 'macOS RPA 本地服务暂不可用');
    }
    return macOSControlTransport.execute(input);
});
async function executeMacOSControlJson(input) {
    if (!macOSControlTransport)
        throw new Error('macOS RPA 本地服务暂不可用');
    const result = await macOSControlTransport.execute(input);
    let body;
    try {
        body = JSON.parse(result.bodyText);
    }
    catch {
        throw new Error(`macOS RPA 返回了无效响应（HTTP ${result.status}）`);
    }
    if (!result.success || result.status < 200 || result.status >= 300) {
        const detail = typeof body?.detail === 'string'
            ? body.detail
            : (body?.detail?.message || body?.error || body?.message);
        throw new Error(detail || `macOS RPA 请求失败（HTTP ${result.status}）`);
    }
    return assertRpaApplicationSuccess(body, 'macOS RPA 请求');
}
async function executeMacOSControlConfigJson(input) {
    if (!macOSControlTransport)
        throw new Error('macOS RPA 本地服务暂不可用');
    const result = await macOSControlTransport.executeConfig(input);
    let body;
    try {
        body = JSON.parse(result.bodyText);
    }
    catch {
        throw new Error(`macOS RPA 返回了无效配置响应（HTTP ${result.status}）`);
    }
    if (!result.success || result.status < 200 || result.status >= 300) {
        const detail = typeof body?.detail === 'string'
            ? body.detail
            : (body?.detail?.message || body?.error || body?.message);
        throw new Error(detail || `macOS RPA 配置请求失败（HTTP ${result.status}）`);
    }
    return assertRpaApplicationSuccess(body, 'macOS RPA 配置请求');
}
ipcMain.handle('plugin:check-status', async (_, pluginName) => {
    // The webot frontend (served by service.exe) now ships only inside the online plugin zip.
    // hasFrontend lets the renderer detect a backend-present-but-frontend-missing install
    // (fresh install, or a legacy install whose bundled frontend was removed) and self-heal.
    const hasFrontendAt = (baseDir) => fs.existsSync(path.join(baseDir, 'webot', 'dist', 'index.html'));
    // 1. Check User Data Path (Priority)
    const userDataPath = app.getPath('userData');
    const userPluginDir = path.join(userDataPath, 'bin', pluginName);
    const userPluginPath = path.join(userPluginDir, 'service.exe');
    const userVersionPath = path.join(userPluginDir, 'version.json');
    if (fs.existsSync(userPluginPath)) {
        let version = '0.0.0';
        try {
            if (fs.existsSync(userVersionPath)) {
                const versionData = JSON.parse(fs.readFileSync(userVersionPath, 'utf-8'));
                if (versionData.version) {
                    version = versionData.version;
                }
            }
        }
        catch (e) {
            console.error('[Plugin] Failed to read version file:', e);
        }
        return { status: 'installed', path: userPluginPath, type: 'user', version, hasFrontend: hasFrontendAt(userPluginDir) };
    }
    // 2. Check Resources Path (Built-in)
    const resourcesPath = process.resourcesPath;
    const builtInPluginDir = path.join(resourcesPath, pluginName);
    const builtInPluginPath = path.join(builtInPluginDir, 'service.exe');
    // Built-in plugins usually don't have version.json unless we package it.
    // We can assume a default version or try to read one if present.
    // For now, let's treat built-in as base version 1.0.0 or read if available.
    if (fs.existsSync(builtInPluginPath)) {
        return { status: 'installed', path: builtInPluginPath, type: 'builtin', version: '1.0.0', hasFrontend: hasFrontendAt(builtInPluginDir) };
    }
    return { status: 'missing' };
});
ipcMain.handle('plugin:download', async (_, { url, pluginName, version }) => {
    if (pluginName.toLowerCase() === 'wechat-rpa') {
        const gate = getRpaUpdateBlock();
        if (gate.blocked) {
            return { success: false, reason: 'client_update_required', error: gate.message, requiredVersion: gate.requiredVersion };
        }
    }
    try {
        // console.log(`[Plugin] Downloading ${pluginName} v${version || 'unknown'} from ${url}`);
        const userDataPath = app.getPath('userData');
        const binDir = path.join(userDataPath, 'bin');
        const pluginDir = path.join(binDir, pluginName);
        const tempZipPath = path.join(binDir, `${pluginName}_temp_${Date.now()}_${Math.random().toString(36).slice(2)}.zip`);
        // Ensure directories exist
        await fs.promises.mkdir(binDir, { recursive: true });
        // 1. Download File
        const response = await net.fetch(url);
        if (!response.ok)
            throw new Error(`Download failed: ${response.statusText}`);
        const buffer = await response.arrayBuffer();
        await fs.promises.writeFile(tempZipPath, Buffer.from(buffer));
        console.log(`[Plugin] Downloaded to ${tempZipPath}`);
        // 2. Unzip to a temporary directory first (to minimize downtime and avoid partial states).
        // Keep the temp dir name short: the zip now carries the webot frontend (hashed asset
        // filenames nested under webot/dist/assets), so an overly long prefix can push extracted
        // paths past Windows' 260-char MAX_PATH limit and make Expand-Archive fail.
        const tempExtractDir = path.join(binDir, `${pluginName}_n${Date.now().toString(36)}`);
        await fs.promises.mkdir(tempExtractDir, { recursive: true });
        const safeZipPath = tempZipPath.replace(/'/g, "''");
        const safeTempDir = tempExtractDir.replace(/'/g, "''");
        const psCommand = `Expand-Archive -Path '${safeZipPath}' -DestinationPath '${safeTempDir}' -Force`;
        console.log(`[Plugin] Unzipping to temp: ${psCommand}`);
        const { execFile } = await import('child_process');
        await new Promise((resolve, reject) => {
            execFile(getPowerShellPath(), ['-NoProfile', '-NonInteractive', '-Command', psCommand], (error, _stdout, stderr) => {
                if (error) {
                    console.error(`[Plugin] Unzip Error: ${stderr}`);
                    reject(error);
                }
                else {
                    resolve();
                }
            });
        });
        // RPA stop/swap/start must be one operation in the server's existing queue.
        if (pluginName === 'wechat-rpa') {
            const result = await sendServerRequest('service:install-rpa-update', 'service:install-rpa-update:done', {
                directory: tempExtractDir, version,
            }, 150_000);
            await fs.promises.unlink(tempZipPath).catch(() => { });
            if (!result?.success) {
                return { success: false, error: '微信 BOT 更新未能完成，请重新检查连接状态。', details: result };
            }
            return { success: true, pendingUpdate: false };
        }
        // 4. Swap Directories via dedicated updater process
        const { pendingUpdate } = await runPluginUpdaterSwap({
            pluginDir,
            tempExtractDir,
            binDir,
            pluginName
        });
        if (pendingUpdate) {
            // Directory was locked (Windows Defender / AV). New version saved as pending.
            // service_manager will apply it automatically on the next RPA service start.
            console.log(`[Plugin] Update saved as pending - will apply on next RPA restart: ${binDir}/${pluginName}_pending`);
            if (version) {
                const pendingDir = path.join(binDir, `${pluginName}_pending`);
                if (fs.existsSync(pendingDir)) {
                    await fs.promises.writeFile(path.join(pendingDir, 'version.json'), JSON.stringify({ version, updated_at: new Date().toISOString() }, null, 2)).catch(() => { });
                }
            }
        }
        else {
            console.log(`[Plugin] Swap completed: ${pluginDir}`);
            if (version) {
                const versionPath = path.join(pluginDir, 'version.json');
                await fs.promises.writeFile(versionPath, JSON.stringify({ version, updated_at: new Date().toISOString() }, null, 2));
                console.log(`[Plugin] Wrote version file: ${version}`);
            }
            // The online plugin zip is now the source of truth for the webot frontend.
            // Only fall back to a bundled copy (legacy builds that still ship one) when the
            // freshly installed plugin has NO frontend at all — never overwrite a frontend
            // that came from the zip, otherwise an online frontend update would be clobbered.
            const resourcesPath = process.resourcesPath;
            const bundledWebotPath = path.join(resourcesPath, pluginName, 'webot');
            const installedWebotPath = path.join(pluginDir, 'webot');
            const installedFrontendIndex = path.join(installedWebotPath, 'dist', 'index.html');
            if (!fs.existsSync(installedFrontendIndex) && fs.existsSync(bundledWebotPath)) {
                console.log(`[Plugin] Installed plugin has no frontend; seeding from bundled copy at ${bundledWebotPath}`);
                // @ts-ignore
                await fs.promises.cp(bundledWebotPath, installedWebotPath, { recursive: true, force: true });
            }
        }
        // Cleanup temp zip
        await fs.promises.unlink(tempZipPath).catch(() => { });
        console.log(`[Plugin] ${pendingUpdate ? 'Pending update staged' : 'Installed successfully'}: ${pluginDir}`);
        // Restart service - if pendingUpdate, service_manager will apply the pending dir during startup
        if (serverProcess && serverProcess.connected) {
            serverProcess.send({ type: 'service:restart-rpa' });
        }
        return { success: true, pendingUpdate };
    }
    catch (e) {
        console.error(`[Plugin] Installation failed:`, e);
        return { success: false, error: e.message };
    }
});
// --- App Update IPC ---
ipcMain.handle('app:download-update', async (_, { url }) => {
    if (desktopUpdateManager) {
        // The renderer-supplied URL is intentionally ignored. New clients only
        // download the immutable artifact selected by the signed/channel policy.
        void url;
        const snapshot = await desktopUpdateManager.downloadAvailableUpdate();
        return { success: snapshot.phase === 'ready' || snapshot.phase === 'downloading', snapshot, error: snapshot.error || undefined };
    }
    try {
        console.log(`[Update] Starting download for: ${url}`);
        // 安装包必须落在「安装目录之外」的中立目录。
        // 旧实现用 showSaveDialog，默认目录常落在软件安装目录里；NSIS 安装时会清空安装目录，
        // 把正在运行的安装包一并删掉 → 安装卡死（用户还不知道要换个目录重存）。
        // 改为静默下载到系统临时目录的专用子目录，彻底规避，无需用户选路径。
        const updatesDir = path.join(app.getPath('temp'), 'App-Updates');
        await fs.promises.mkdir(updatesDir, { recursive: true });
        // 清理历史遗留的更新包（best-effort；正在运行的旧安装包会被锁，rm 失败忽略即可）。
        try {
            for (const f of await fs.promises.readdir(updatesDir)) {
                if (f.toLowerCase().endsWith('.exe')) {
                    await fs.promises.rm(path.join(updatesDir, f), { force: true }).catch(() => { });
                }
            }
        }
        catch { }
        // 唯一文件名，避免与被占用的遗留包冲突。
        const filePath = path.join(updatesDir, `Setup-${Date.now().toString(36)}.exe`);
        console.log(`[Update] Downloading to ${filePath}...`);
        // Use axios for stream download
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);
        await new Promise((resolve, reject) => {
            writer.on('finish', () => resolve());
            writer.on('error', (err) => reject(err));
        });
        console.log(`[Update] Download complete. Launching installer: ${filePath}`);
        // 启动安装包（独立进程；即便本应用随后退出也不影响安装继续）。
        // shell.openPath opens the file with default associated program. For .exe it runs it.
        const result = await shell.openPath(filePath);
        if (result) {
            console.error(`[Update] Failed to open installer: ${result}`);
            throw new Error(`Failed to launch installer: ${result}`);
        }
        return { success: true, filePath };
    }
    catch (e) {
        console.error('[Update] Download failed', e);
        return { success: false, error: e.message };
    }
});
ipcMain.handle('app:update-state', async () => desktopUpdateManager?.getSnapshot() || null);
ipcMain.handle('app:update-check', async () => desktopUpdateManager?.checkForUpdates(false) || null);
ipcMain.handle('app:update-download', async () => desktopUpdateManager?.downloadAvailableUpdate() || null);
ipcMain.handle('app:update-install', async () => {
    if (!desktopUpdateManager)
        return { success: false, error: '更新服务尚未初始化。' };
    const success = await desktopUpdateManager.installReadyUpdate(true);
    const snapshot = desktopUpdateManager.getSnapshot();
    return { success, snapshot, error: snapshot.error || undefined };
});
ipcMain.handle('app:update-open-manual', async () => {
    const url = desktopUpdateManager?.getSnapshot().manualFallbackUrl;
    if (!url)
        return { success: false, error: '该渠道未配置手动下载地址。' };
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && app.isPackaged) {
        return { success: false, error: '生产环境手动下载地址必须使用 HTTPS。' };
    }
    const allowedHosts = String(process.env.APP_UPDATE_ALLOWED_HOSTS || 'dl.yokoagi.com')
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
    if (app.isPackaged && !allowedHosts.includes(parsed.hostname.toLowerCase())) {
        return { success: false, error: `手动下载地址域名不在渠道白名单中：${parsed.hostname}` };
    }
    await shell.openExternal(parsed.toString());
    return { success: true };
});
// --- MCP Management IPC ---
ipcMain.handle('mcp:test-connection', async (_, config) => {
    console.log(`[Main] Testing MCP connection: ${config.name} (${config.transport})`);
    try {
        // Renderer-visible config masks every secret. Hydrate placeholders from
        // the owner snapshot before testing an existing server; otherwise a
        // harmless "test connection" would send literal asterisks as secrets.
        const hydrated = mergeConfigSecretPlaceholders({ mcpServers: [config] }, ConfigManager.getInstance().getConfig()).mcpServers?.[0];
        const client = new MCPClient(hydrated);
        await client.connect();
        const tools = await client.listTools();
        await client.disconnect();
        return { success: true, toolCount: tools.length, tools };
    }
    catch (error) {
        console.error(`[Main] MCP connection failed:`, error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('mcp:reload', async () => {
    if (serverProcess && serverProcess.connected) {
        serverProcess.send({ type: 'mcp:reload' });
        return { success: true };
    }
    return { success: false, error: 'Server process not running' };
});
// -----------------------------
// ---------------------------
// --- File Logging Setup ---
// Use LogManager for daily rotation and retention (saves IO and manages disk usage)
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
console.log = (...args) => {
    LogManager.getInstance().log('INFO', ...args);
    originalConsoleLog.apply(console, args);
};
console.error = (...args) => {
    LogManager.getInstance().log('ERROR', ...args);
    originalConsoleError.apply(console, args);
};
console.warn = (...args) => {
    LogManager.getInstance().log('WARN', ...args);
    originalConsoleWarn.apply(console, args);
};
/**
 * 渲染进程的故障此前在 main-*.log 里没有任何采集点：窗口 OOM 被 Chromium 干掉、
 * 或 React 渲染期抛异常，用户看到的都是白屏，而日志一个字都不会写。排查时只能
 * 看到"某轮开始了，然后什么都没有，然后进程重启"，无从判断死在哪一侧。
 *
 * 这里把三类信号接进 LogManager：进程级崩溃、主线程无响应、渲染进程 console.error。
 */
function installRendererDiagnostics(win, label) {
    win.webContents.on('render-process-gone', (_event, details) => {
        console.error(`[Renderer:${label}] 渲染进程消失 reason=${details.reason} exitCode=${details.exitCode}`);
    });
    win.webContents.on('unresponsive', () => {
        console.error(`[Renderer:${label}] 主线程无响应（界面此时通常已经是白屏/卡死）`);
    });
    win.webContents.on('responsive', () => {
        console.log(`[Renderer:${label}] 主线程恢复响应`);
    });
    win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
        console.error(`[Renderer:${label}] 页面加载失败 ${errorCode} ${errorDescription} ${validatedURL}`);
    });
    // level 3 = error。只收 error，否则渲染进程的日常日志会把文件刷爆。
    win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
        if (level < 3)
            return;
        console.error(`[Renderer:${label}] console.error ${message} (${sourceId}:${line})`);
    });
}
// LogManager handles formatLogMessage internally
function formatLogMessage(args) {
    // Deprecated but kept if needed elsewhere, though LogManager has its own.
    // We can remove it or keep it for safety if used elsewhere.
    return args.map(arg => String(arg)).join(' ');
}
// -------------------------
// --- Skill Store Install (shared by UI IPC and Agent-driven install) ---
// 下载 → sha256 校验 → 解压 → 原地替换 skills/<id> 内容 → 写 version.json → 触发热重载。
// 既供前端「商店安装」按钮(ipcMain store:install-skill)，也供 agent 自动安装(server 进程经 IPC 委托)。
async function installSkillPackage(item) {
    const { id, backend, version, artifact_url, sha256 } = item || {};
    try {
        if (backend && backend !== 'skillmd')
            return { success: false, error: `暂不支持的技能类型: ${backend}` };
        if (!id || !artifact_url)
            return { success: false, error: '参数缺失（id / artifact_url）' };
        const skillsRoot = path.join(app.getPath('userData'), 'skills');
        await fs.promises.mkdir(skillsRoot, { recursive: true });
        // 1. 下载
        const tmpZip = path.join(skillsRoot, `${id}_dl_${Date.now().toString(36)}.zip`);
        const resp = await net.fetch(artifact_url);
        if (!resp.ok)
            throw new Error(`下载失败: ${resp.statusText}`);
        const buf = Buffer.from(await resp.arrayBuffer());
        await fs.promises.writeFile(tmpZip, buf);
        // 2. sha256 校验
        if (sha256) {
            const crypto = await import('crypto');
            const digest = crypto.createHash('sha256').update(buf).digest('hex');
            if (digest.toLowerCase() !== sha256.toLowerCase()) {
                await fs.promises.rm(tmpZip, { force: true });
                return { success: false, error: '校验失败（sha256 不匹配），已中止安装' };
            }
        }
        // 3. 解压到临时目录
        //    用 JS 原生解压（extract-zip/yauzl），不再 shell 出 PowerShell Expand-Archive：
        //    后者依赖客户机的执行策略/杀软/Archive 模块，且其 stderr 用控制台代码页编码，
        //    被本进程按 UTF-8 解码后会乱码甚至被 NUL 截断（曾导致弹窗只显示一个「W」）。
        const tmpExtract = path.join(skillsRoot, `${id}_n${Date.now().toString(36)}`);
        await fs.promises.mkdir(tmpExtract, { recursive: true });
        try {
            const extract = (await import('extract-zip')).default;
            await extract(tmpZip, { dir: tmpExtract });
        }
        catch (e) {
            await fs.promises.rm(tmpZip, { force: true }).catch(() => { });
            await fs.promises.rm(tmpExtract, { recursive: true, force: true }).catch(() => { });
            throw new Error(`解压失败（安装包可能已损坏或下载不完整）: ${e?.message || String(e)}`);
        }
        // 解压可能多套一层目录：若顶层无 SKILL.md 而只有一个子目录，则取该子目录
        let srcDir = tmpExtract;
        const top = await fs.promises.readdir(tmpExtract, { withFileTypes: true });
        if (!top.some(e => e.isFile() && e.name === 'SKILL.md')) {
            const onlyDir = top.find(e => e.isDirectory());
            if (onlyDir)
                srcDir = path.join(tmpExtract, onlyDir.name);
        }
        // 4. 原地替换 skills/<id> 的「内容」（不重命名/删除目录本身）。
        //    Windows 上若顶层目录被资源管理器/搜索索引/杀软占用，rename 整个目录会 EPERM；
        //    但改写其「子项」不受影响。故保留 dest 这个目录，逐个替换里面的文件。
        //    （仅当某个具体文件本身被锁——典型是浏览器仍加载着该扩展的 .js——才需先移除扩展。）
        const dest = path.join(skillsRoot, id);
        await fs.promises.mkdir(dest, { recursive: true });
        const lockHint = (name) => `技能文件被占用，无法更新（${name}）。若该技能含浏览器扩展且你已在浏览器中「加载已解压」运行它，` +
            `请先到 chrome://extensions（Edge 为 edge://extensions）移除该扩展，并关闭打开了该目录的「文件资源管理器」窗口后重试更新。`;
        // 4a. 清空 dest 现有子项（保留 dest 目录本身）
        for (const name of await fs.promises.readdir(dest)) {
            try {
                await fs.promises.rm(path.join(dest, name), { recursive: true, force: true });
            }
            catch (e) {
                if (e && (e.code === 'EPERM' || e.code === 'EBUSY')) {
                    fs.promises.rm(tmpZip, { force: true }).catch(() => { });
                    fs.promises.rm(tmpExtract, { recursive: true, force: true }).catch(() => { });
                    throw new Error(lockHint(name));
                }
                throw e;
            }
        }
        // 4b. 把新内容移入 dest（同卷 rename，逐项）
        for (const name of await fs.promises.readdir(srcDir)) {
            await fs.promises.rename(path.join(srcDir, name), path.join(dest, name));
        }
        // 5. 写入版本信息（供更新检测 P3）
        await fs.promises.writeFile(path.join(dest, 'version.json'), JSON.stringify({ id, version: version || '0.0.0' }, null, 2), 'utf-8');
        // 6. 清理临时文件 + 触发热重载
        fs.promises.rm(tmpZip, { force: true }).catch(() => { });
        fs.promises.rm(tmpExtract, { recursive: true, force: true }).catch(() => { });
        if (serverProcess && serverProcess.connected)
            serverProcess.send({ type: 'skills:reload' });
        return { success: true };
    }
    catch (e) {
        console.error('[Store] install-skill failed:', e);
        return { success: false, error: e?.message || String(e) };
    }
}
// --- SOP 文档热更 ---
// 设计见 docs/SOP_DOCS_MAINTENANCE_AND_RELEASE.md §5。
// 文档随客户端版本打包意味着改一句 SOP 也要发一次客户端；热更让「发现问题 → 修文档 → 生效」
// 从一个发版周期缩短到一次重启。
let lastDocsUpdateSummary = [];
function docsUpdaterDeps() {
    return {
        userDataPath: app.getPath('userData'),
        resourcesPath: process.resourcesPath,
        clientVersion: app.getVersion(),
        apiBaseUrl: process.env.REMOTE_SERVER_URL,
        fetchFn: (url) => net.fetch(url),
        log: (msg) => console.log(msg),
    };
}
/**
 * 启动时分两段执行，因为这两段的时效要求完全不同：
 *
 *   同步段（本函数）—— 纯本地，微秒级：清理陈旧 overlay 和 .swapping 残留。
 *     必须在 server 进程起来之前完成，否则 agent 可能读到被遮蔽的旧文档。
 *
 *   异步段（下载）—— 走网络，不确定耗时：绝不能挡在启动路径上。
 *     manual_provider 每次读文档都逐文件重新解析路径，所以中途换掉 overlay
 *     对下一次 read_manual 立即生效，不需要重启。
 */
function reconcileDocsSync() {
    try {
        const deps = docsUpdaterDeps();
        for (const skill of filterUpdatableDocsSkills(discoverDocsSkills(deps))) {
            try {
                reconcileOverlay(deps, skill);
            }
            catch (e) {
                console.error(`[DocsUpdater] reconcile ${skill} failed:`, e);
            }
        }
    }
    catch (e) {
        console.error('[DocsUpdater] 同步仲裁失败（不影响启动）:', e);
    }
}
function scheduleDocsUpdate() {
    setTimeout(async () => {
        try {
            const deps = docsUpdaterDeps();
            const skills = filterUpdatableDocsSkills(discoverDocsSkills(deps));
            // 这条分支必须出声。它静默 return 时的症状是「零日志、零文件、零报错」，
            // 和「代码没生效」完全无法区分，排查会直接走进死胡同。
            if (!skills.length) {
                // console.log(`[DocsUpdater] 未发现内置 docs，跳过在线检查（resourcesPath=${process.resourcesPath}）。`);
                return;
            }
            lastDocsUpdateSummary = await updateDocs(deps, skills);
            // 逐条汇报「没发生下载」的那些技能。
            // 「已是最新所以什么都不做」和「压根没跑」在日志上必须能区分开，否则排查会走进死胡同。
            //
            // updated / failed 不在这里重复打印：updateDocs 内部已经分别输出了
            // 「X → Y」和「已更新至 Y」两行。再补一行会让人误以为下载了两次。
            for (const r of lastDocsUpdateSummary) {
                if (r.action === 'updated' || r.action === 'failed')
                    continue;
                const detail = r.action === 'up-to-date'
                    ? `${r.from}（已是最新，无需下载）`
                    : `${r.from ?? '(无)'}（${r.reason ?? '未知原因'}，继续使用当前版本）`;
                console.log(`[DocsUpdater] ${r.skill}: ${detail}`);
            }
            // 文档不是代码，agent 每次读都会重新解析路径，更新后无需重载技能。
        }
        catch (e) {
            // updateDocs 内部已经 fail-soft，这里只兜住意料之外的抛出。
            console.error('[DocsUpdater] 更新流程异常（已忽略）:', e);
        }
    }, 5000);
}
// --- Server Management ---
// --- Server 进程监督 -------------------------------------------------------
//
// server 子进程是整个客户端的核心：Agent、网关、RPA 桥接都跑在里面。它此前意外退出
// 时只写一行日志，既不重启也不告诉任何人 —— 主进程和窗口照常活着，用户看到的是一个
// 「界面在、什么都点不动」的客户端，RPA 那边则是「无法连接私域 Agent」。这不是理论
// 情况：线上已经出现过。
//
// 这里补一个最小可用的监督器：意外退出 → 退避重启 → 连续失败则停手并明确告知。
const SERVER_RESTART_BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 16_000];
/** 起来后连续存活多久算「这次重启成功」，用于清零退避计数。 */
const SERVER_STABLE_MS = 60_000;
const serverRestartPolicy = new RestartPolicy(SERVER_RESTART_BACKOFF_MS);
let serverRestartTimer = null;
let serverStableTimer = null;
/** 把服务状态推给渲染进程。UI 侧的常驻横幅（L3）会消费它；现在先保证事件有人发。 */
function notifyServerStatus(status) {
    if (status.state === 'failed') {
        console.error(`[Main] Server supervisor gave up after ${status.attempts} attempts.`);
    }
    try {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('server-status', status);
        }
    }
    catch {
        // 窗口正在销毁，忽略。
    }
}
function clearServerTimers() {
    if (serverRestartTimer) {
        clearTimeout(serverRestartTimer);
        serverRestartTimer = null;
    }
    if (serverStableTimer) {
        clearTimeout(serverStableTimer);
        serverStableTimer = null;
    }
}
function scheduleServerRestart(code, signal) {
    if (serverRestartTimer)
        return; // 已经排上了
    const attempt = serverRestartPolicy.next();
    if (!attempt) {
        notifyServerStatus({ state: 'failed', attempts: serverRestartPolicy.attempts });
        return;
    }
    const { delayMs } = attempt;
    console.error(`[Main] Server died unexpectedly (code=${code} signal=${signal}). `
        + `Restarting in ${delayMs}ms (attempt ${attempt.attempt}/${attempt.max}).`);
    notifyServerStatus({ state: 'restarting', ...attempt });
    serverRestartTimer = setTimeout(async () => {
        serverRestartTimer = null;
        if (isQuitting || teardownDone || serverProcess)
            return;
        // 旧进程刚死，3000 未必马上释放（它的 RPA 子树还在收尾）。不等就会 EADDRINUSE，
        // 白白烧掉一次重试配额。
        const free = await waitForPortFree(3000, 5_000);
        if (!free)
            await reclaimOwnPorts();
        if (isQuitting || teardownDone || serverProcess)
            return;
        startServer();
    }, delayMs);
}
function startServer() {
    if (process.env.SKIP_LOCAL_SERVER === 'true') {
        console.log('[Main] SKIP_LOCAL_SERVER is set. Skipping embedded server startup.');
        return;
    }
    const isDev = process.env.NODE_ENV === 'development';
    let serverPath;
    if (isDev) {
        serverPath = path.join(__dirname, '../../../dist/server.cjs');
    }
    else {
        // In prod, check unpacked first, then asar
        // app.asar.unpacked/dist/server.cjs
        const unpackedPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'server.cjs');
        if (fs.existsSync(unpackedPath)) {
            serverPath = unpackedPath;
        }
        else {
            // app.asar/dist/electron/electron/main.js -> ../../server.cjs
            serverPath = path.join(__dirname, '../../server.cjs');
        }
    }
    if (!fs.existsSync(serverPath)) {
        console.error(`[Main] Server script NOT found at ${serverPath}. Please ensure build:server is run.`);
        return;
    }
    const env = { ...process.env };
    env.PATH = normalizeDesktopExecutablePath(env.PATH, process.platform, os.homedir());
    if (process.platform === 'darwin')
        env.YOKO_MACOS_RPA_MAIN_OWNED = '1';
    else
        delete env.YOKO_MACOS_RPA_MAIN_OWNED;
    // Explicitly pass normalized USER_DATA_PATH to the server process
    Object.assign(env, agentFileLayoutEnvironment(activeAgentFileLayout));
    if (secureConfigRepository)
        env[SECURE_CONFIG_IPC_ENV] = '1';
    else
        delete env[SECURE_CONFIG_IPC_ENV];
    // 子进程里没有 electron 的 app.getVersion()。渠道任务的 trace 上报
    // （gateway/trace_upload.ts）要带客户端版本，否则服务端只能看到 null。
    env.APP_VERSION = app.getVersion();
    if (desktopUpdateManager) {
        Object.assign(env, desktopUpdateManager.getRpaEnvironment());
    }
    // Handle .env file location for production
    if (!isDev) {
        env.NODE_ENV = 'production';
        // Look for .env in resources path (read-only installation directory)
        // User data and plugins use the bootstrap layout selected above.
        const envPaths = [
            path.join(process.resourcesPath, '.env')
        ];
        let foundEnvPath = null;
        for (const p of envPaths) {
            if (fs.existsSync(p)) {
                env.DOTENV_CONFIG_PATH = p;
                foundEnvPath = p;
                break;
            }
        }
        if (!foundEnvPath) {
            console.warn(`[Main] .env NOT found in: ${envPaths.join(', ')}`);
            try {
                const resFiles = fs.readdirSync(process.resourcesPath);
                console.log(`[Main] Files in ${process.resourcesPath}: ${resFiles.join(', ')}`);
            }
            catch (e) {
                console.error(`[Main] Failed to list files:`, e);
            }
        }
        else {
            // Pre-load .env into env object so child process inherits all variables
            // This ensures REMOTE_SERVER_URL etc. are available even if dotenv fails in child
            try {
                const envContent = fs.readFileSync(foundEnvPath, 'utf-8');
                for (const line of envContent.split('\n')) {
                    const trimmed = line.trim();
                    if (trimmed && !trimmed.startsWith('#')) {
                        const eqIdx = trimmed.indexOf('=');
                        if (eqIdx > 0) {
                            const key = trimmed.substring(0, eqIdx).trim();
                            const val = trimmed.substring(eqIdx + 1).trim();
                            if (!env[key]) {
                                env[key] = val;
                            }
                            // Mirror into the main process's own env so main-process UI
                            // (tray tooltip/menu, window title, notifications) can read
                            // channel branding (VITE_BOT_NAME 等) in production builds.
                            if (process.env[key] === undefined) {
                                process.env[key] = val;
                            }
                        }
                    }
                }
                console.log('[Main] Environment loaded');
            }
            catch (e) {
                console.error(`[Main] Failed to pre-load .env:`, e);
            }
        }
        // Pass resources path for service manager to find external binaries
        env.RESOURCES_PATH = process.resourcesPath;
        // Pass user data path for service manager plugin detection
        Object.assign(env, agentFileLayoutEnvironment(activeAgentFileLayout));
        // Set NODE_PATH so forked child process can find modules inside the asar archive
        // Without this, require('pdf-parse') etc. fail because server.cjs runs from
        // app.asar.unpacked/dist/ and Node's resolution doesn't search app.asar/node_modules/
        const asarNodeModules = path.join(process.resourcesPath, 'app.asar', 'node_modules');
        const unpackedNodeModules = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules');
        env.NODE_PATH = [asarNodeModules, unpackedNodeModules].join(path.delimiter);
    }
    // 本地 API 密钥：/api/knowledge/* 靠它鉴权。
    //
    // 为什么需要：本地 express 挂了 cors()（放行任意 Origin），用户访问的**任意网页**
    // 都能 fetch 本机接口并读到响应。每进程随机的密钥网页拿不到，
    // 而主进程是这些接口唯一的合法调用方。
    env.YOKO_LOCAL_API_TOKEN = LOCAL_API_TOKEN;
    // 私域 Agent Provider 与 RPA 共享的本机临时令牌。沿用每次启动随机生成的
    // LOCAL_API_TOKEN，不落盘、不暴露给配置页；RPA 子进程会继续继承该环境变量。
    env.RPA_PRIVATE_AGENT_TOKEN = LOCAL_API_TOKEN;
    // --- Proxy Sanitization ---
    const proxyVars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy'];
    proxyVars.forEach(key => {
        const val = env[key];
        if (val && !val.match(/^https?:\/\//i)) {
            console.warn(`[Main] Invalid proxy URL in ${key}: "${val}". Auto-fixing by prepending "http://".`);
            env[key] = `http://${val}`;
        }
    });
    // Ensure local requests bypass the proxy
    if (!env.NO_PROXY && !env.no_proxy) {
        env.NO_PROXY = 'localhost,127.0.0.1,::1';
    }
    else {
        const noProxy = env.NO_PROXY || env.no_proxy || '';
        if (!noProxy.includes('localhost')) {
            env.NO_PROXY = `${noProxy},localhost,127.0.0.1,::1`;
        }
    }
    try {
        serverProcess = fork(serverPath, [], {
            env,
            stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        });
        const child = serverProcess;
        child.stdout?.on('data', (data) => {
            const msg = data.toString().trim();
            console.log(`[Server] ${msg}`);
        });
        child.stderr?.on('data', (data) => {
            const msg = data.toString().trim();
            console.error(`[Server Error] ${msg}`);
        });
        // Agent 自动安装技能：server 进程发起 store:install-request，主进程执行下载/校验/解压并回 done。
        child.on('message', async (msg) => {
            if (!msg)
                return;
            if (await handleConfigOwnerRequest(msg, {
                getConfig: () => ConfigManager.getInstance().getConfig(),
                persist: persistOwnedConfig,
                send: (response) => {
                    if (child.connected)
                        child.send(response);
                },
            }))
                return;
            // server 的 IPC 监听是在 main() 的若干 await 之后才挂上的，比 fork 晚好几秒。
            // 在那之前发过去的消息会被当作「无监听者的事件」丢掉，所以挂起的 yoko://
            // 引种请求必须等这条 ready 才能补发。
            if (msg.type === 'server:ipc-ready') {
                serverIpcReady = true;
                if (process.env.YOKO_RPA_TOKEN) {
                    child.send({ type: 'auth:set-token', token: process.env.YOKO_RPA_TOKEN });
                }
                await syncMacOSControlTransportToServer();
                flushPendingEntitlementBootstrap();
                return;
            }
            // server 进程(agent 的 mcp_add/remove 工具)写了 config 文件后,让 main 进程
            // 从磁盘重载,消除 main 内存态陈旧——否则用户下次在设置页保存会覆盖掉新增的 MCP。
            if (msg.type === 'config:reload-from-disk') {
                try {
                    ConfigManager.getInstance().reloadConfig();
                }
                catch (e) {
                    console.error('[Main] config:reload-from-disk failed:', e);
                }
                return;
            }
            if (msg.type === 'wechat-ilink:credentials' && msg.requestId) {
                try {
                    let value;
                    if (msg.operation === 'load')
                        value = readWechatIlinkCredential();
                    else if (msg.operation === 'save')
                        writeWechatIlinkCredential(msg.value);
                    else if (msg.operation === 'delete')
                        deleteWechatIlinkCredential();
                    else
                        throw new Error('未知的微信 iLink 凭据操作。');
                    serverProcess?.send({
                        type: 'wechat-ilink:credentials:result',
                        requestId: msg.requestId,
                        success: true,
                        value,
                    });
                }
                catch (error) {
                    serverProcess?.send({
                        type: 'wechat-ilink:credentials:result',
                        requestId: msg.requestId,
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
                return;
            }
            if (msg.type === 'wechat-ilink:status' && msg.status) {
                publishWechatIlinkStatus(msg.status);
                return;
            }
            // Renderer never receives the macOS loopback credential. The bundled
            // server is a trusted child (it already receives the login token and
            // owns RPA business tools), so main synchronizes only the current
            // ephemeral credential to that child over its private IPC channel.
            if (msg.type === 'rpa:mcp-control-request' && typeof msg.requestId === 'string') {
                const body = msg.body;
                let result;
                if (process.platform !== 'darwin' || !macOSControlTransport
                    || !body || typeof body.enabled !== 'boolean'
                    || typeof body.regenerate_token !== 'boolean') {
                    result = {
                        success: false,
                        status: process.platform === 'darwin' ? 400 : 503,
                        contentType: 'application/json',
                        bodyText: JSON.stringify({
                            success: false,
                            code: process.platform === 'darwin' ? 'MCP_CONTROL_REQUEST_INVALID' : 'MCP_CONTROL_UNAVAILABLE',
                        }),
                    };
                }
                else {
                    result = await macOSControlTransport.execute({
                        path: '/api/mcp/control',
                        method: 'POST',
                        body: { enabled: body.enabled, regenerate_token: body.regenerate_token },
                    });
                }
                if (child.connected) {
                    child.send({ type: 'rpa:mcp-control-request:done', requestId: msg.requestId, result });
                }
                return;
            }
            if (msg.type === 'rpa:owned-runtime-request' && typeof msg.requestId === 'string') {
                let result = { success: false, reason: 'unsupported' };
                if (process.platform === 'darwin' && msg.action === 'restart'
                    && macOSPluginComposition?.available) {
                    const stopped = await stopMacOSOwnedControl('manual-stop');
                    if (stopped.success) {
                        await macOSPluginRuntimeRecovery.waitForCurrent();
                        result = await macOSPluginRuntimeRecovery.request('manual-restart')
                            ?? { success: false, reason: 'recovery_failed' };
                    }
                    else {
                        result = { success: false, reason: 'stop_failed' };
                    }
                }
                if (child.connected) {
                    child.send({ type: 'rpa:owned-runtime-request:done', requestId: msg.requestId, result });
                }
                return;
            }
            if (msg.type === 'store:install-request' && msg.requestId) {
                const result = await installSkillPackage(msg.item || {}).catch((e) => ({ success: false, error: e?.message || String(e) }));
                if (serverProcess && serverProcess.connected) {
                    serverProcess.send({ type: 'store:install-request:done', requestId: msg.requestId, result });
                }
            }
            // 超限图片缩放：server 是 ELECTRON_RUN_AS_NODE 的子进程，拿不到 nativeImage，
            // 只有主进程能解码。缩不动就如实回 success:false —— 调用方会降级成
            // 「不内联、只给路径」，绝不能把原图放行（会话会被永久毒化）。
            if (msg.type === 'image:downscale-request' && msg.requestId) {
                let result = { success: false, error: 'unknown' };
                try {
                    const input = Buffer.from(String(msg.base64 || ''), 'base64');
                    const image = nativeImage.createFromBuffer(input);
                    const limit = Number(msg.limitBytes) || 5 * 1024 * 1024;
                    const resized = resizeWithNativeImage(image, limit);
                    result = resized
                        ? {
                            success: true,
                            base64: resized.buffer.toString('base64'),
                            kind: resized.kind,
                            width: resized.width,
                            height: resized.height,
                        }
                        : { success: false, error: `cannot fit ${input.length}B under ${limit}B (format may be undecodable)` };
                }
                catch (e) {
                    result = { success: false, error: e?.message || String(e) };
                }
                if (serverProcess && serverProcess.connected) {
                    serverProcess.send({ type: 'image:downscale-request:done', requestId: msg.requestId, result });
                }
            }
        });
        // 捕获局部引用：stopServer() 会先把模块级 serverProcess 置空再等退出，
        // 所以 `serverProcess === child` 正好可以区分「我们主动停的」和「它自己死的」。
        child.on('exit', (code, signal) => {
            console.log(`[Main] Server exited with code ${code} signal ${signal}`);
            const wasCurrent = serverProcess === child;
            if (wasCurrent) {
                serverProcess = null;
                serverIpcReady = false;
            }
            const supervise = shouldSuperviseExit({
                wasCurrentProcess: wasCurrent,
                isQuitting,
                teardownDone,
                localServerDisabled: process.env.SKIP_LOCAL_SERVER === 'true',
            });
            if (supervise)
                scheduleServerRestart(code, signal);
        });
        // 连续存活一段时间才认为「这次重启是成功的」，把退避计数清零。
        // 否则崩溃循环会因为每次都短暂起来而永远重置，退避形同虚设。
        if (serverStableTimer)
            clearTimeout(serverStableTimer);
        serverStableTimer = setTimeout(() => {
            if (serverProcess === child && serverRestartPolicy.reset()) {
                console.log('[Main] Server has been stable; resetting restart backoff.');
                notifyServerStatus({ state: 'recovered' });
            }
        }, SERVER_STABLE_MS);
    }
    catch (e) {
        console.error('[Main] Failed to start server:', e);
    }
}
// Windows RPA shutdown performs synchronous ownership checks before the server exits.
// Those checks launch PowerShell and normally take about 2-4 seconds, so the old 2s
// grace window routinely interrupted a healthy cleanup. Keep a bounded force-kill
// fallback, but leave enough time for the normal path to finish and report its result.
//
// 8s was still too tight, and not by a little: the RPA Supervisor's own
// `_terminate_worker` (yokowebot main.py) waits up to 8s for the Worker to exit before
// escalating to kill. That inner budget alone equals the whole outer one, so any shutdown
// that actually had to wait on the Worker lost the race by construction — Main force-killed
// the tree mid-cleanup, leaving a Worker whose PID the next start could not prove ownership
// of ("Could not prove recorded PID … leaving it untouched") and therefore refused to reap.
// The orphan then fought the fresh generation and parked the Supervisor in `degraded`,
// stranding users behind the RPA recovery overlay.
//
// Budget: 8s worker terminate + PowerShell ownership probes (2-4s) + port verification.
// 20s clears that worst case with margin. This only delays the pathological path — a
// cleanup that finishes normally resolves early and clears this timer.
const SERVER_SHUTDOWN_GRACE_MS = 20_000;
function stopServer() {
    // 主动停服优先于监督器：把排着的重启和存活计时一并取消，
    // 否则数据迁移期间会被监督器把服务重新拉起来。
    clearServerTimers();
    return new Promise((resolve) => {
        const proc = serverProcess;
        if (!proc) {
            resolve();
            return;
        }
        // Detach immediately so re-entry / concurrent callers don't double-handle it.
        serverProcess = null;
        serverIpcReady = false;
        console.log('[Main] Stopping server process...');
        let settled = false;
        const finish = () => {
            if (settled)
                return;
            settled = true;
            clearTimeout(graceTimer);
            resolve();
        };
        // Resolve as soon as the server actually exits (graceful path).
        proc.once('exit', () => {
            console.log('[Main] Server process exited.');
            finish();
        });
        // 1. Ask the server to shut down gracefully — it stops the RPA service itself.
        try {
            if (proc.connected) {
                proc.send({ type: 'shutdown' });
            }
        }
        catch (e) {
            console.error('[Main] Failed to send shutdown signal:', e);
        }
        // 2. If it has not exited within the grace period, force-kill ITS OWN process
        //    tree only. `taskkill /T` also takes down the RPA service.exe child, so we
        //    never need a global / by-name kill that could hit another instance's
        //    server (that cross-instance kill was the root cause of the start failure).
        const graceTimer = setTimeout(() => {
            const pid = proc.pid;
            if (pid) {
                try {
                    console.log(`[Main] Grace period elapsed. Force-killing server tree PID ${pid}`);
                    execFileSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'pipe', windowsHide: true, timeout: 5000 });
                }
                catch (e) {
                    // 128 = process already gone
                    if (e.status !== 128) {
                        console.warn(`[Main] taskkill warning (might be already dead): ${e.message}`);
                    }
                }
            }
            try {
                if (!proc.killed)
                    proc.kill('SIGKILL');
            }
            catch (e) {
                // ignore
            }
            finish();
        }, SERVER_SHUTDOWN_GRACE_MS);
    });
}
// -------------------------
function replaceWindowIpcHandler(channel, listener) {
    replaceRegisteredWindowIpcHandler(ipcMain, channel, listener);
}
function replaceWindowIpcListener(channel, listener) {
    replaceRegisteredWindowIpcListener(ipcMain, channel, listener);
}
function createWindow() {
    if (isQuitting)
        return;
    if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized())
            mainWindow.restore();
        if (!mainWindow.isVisible())
            mainWindow.show();
        mainWindow.focus();
        return;
    }
    const isDev = process.env.NODE_ENV === 'development';
    // Fix Icon Path Resolution:
    // In Dev: src/electron/main.ts -> ../../resources/icon.ico (relative to source file location not built file)
    // But wait, in Dev we are running from dist/electron/main.js usually if built by tsc, or via ts-node?
    // If running via electron-vite or similar, __dirname might be different.
    // The error showed: C:\Users\Administrator\vscode\YokoAgent\dist\resources\icon.ico not found.
    // This implies __dirname is dist/electron/ and it looked for ../resources/icon.ico which resolved to dist/resources/icon.ico
    // But resources are in root/resources.
    // Let's resolve project root first.
    let iconPath = '';
    if (process.platform === 'darwin') {
        // Tray accepts bitmap representations, while the app bundle itself uses
        // ICNS. Keep the PNG separate and never require the Windows-only ICO.
        iconPath = isDev
            ? path.join(process.cwd(), 'resources', 'logo.png')
            : path.join(process.resourcesPath, 'tray-icon.png');
    }
    else if (isDev) {
        // In Dev, we assume we are running from project root or can find it.
        // If __dirname is .../dist/electron/electron
        // Then path.join(__dirname, '../../resources/icon.ico') -> .../dist/resources/icon.ico (WRONG)
        // We want .../resources/icon.ico (in project root)
        // Let's try to find project root relative to CWD if we are running from there
        // or use a known relative path from the built file location.
        // Usually dist/ is at the same level as resources/
        // So if __dirname is dist/electron/electron (3 levels deep? No, likely dist/electron)
        // If __dirname = .../dist/electron
        // ../../resources -> .../resources
        // Let's debug by using process.cwd() in dev which is usually the project root.
        iconPath = path.join(process.cwd(), 'resources', 'icon.ico');
        if (!fs.existsSync(iconPath)) {
            // Fallback if cwd is not root
            iconPath = path.join(__dirname, '../../resources/icon.ico');
        }
    }
    else {
        // In Prod, resources are in process.resourcesPath
        iconPath = path.join(process.resourcesPath, 'icon.ico');
    }
    const workAreaSize = screen.getPrimaryDisplay().workAreaSize;
    const initialWidth = Math.max(980, Math.min(1120, workAreaSize.width - 120));
    const initialHeight = Math.max(820, Math.min(980, workAreaSize.height - 40));
    // Determine window title based on env configuration
    const windowTitle = process.env.VITE_APP_TITLE || getBrandName();
    mainWindow = new BrowserWindow({
        title: windowTitle,
        icon: iconPath,
        width: initialWidth,
        height: initialHeight,
        minWidth: 800,
        minHeight: 600,
        frame: false, // Custom window controls
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // For MVP IPC
        },
    });
    LogManager.getInstance().setWindow(mainWindow);
    installRendererDiagnostics(mainWindow, 'main');
    // Check if we are in development mode (by checking for Vite dev server port or env)
    // Simple heuristic: if we can connect to localhost:5173, use it.
    // For now, let's rely on an environment variable or just try loading it.
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:9988';
    // Try to load from dev server first if env var is set
    if (process.env.NODE_ENV === 'development') {
        console.log(`[Main] Running in Development mode. Loading URL: ${devUrl}`);
        mainWindow.loadURL(devUrl).catch(e => {
            console.error(`Failed to load URL: ${devUrl}`, e);
        });
        // mainWindow.webContents.openDevTools();
    }
    else {
        // Production: Load from dist/ui
        // __dirname is dist/electron/electron, so ../../ is dist
        const indexPath = path.join(__dirname, '../../ui/index.html');
        mainWindow.loadFile(indexPath);
    }
    // 渲染进程 index.html 的 <title> 会覆盖 BrowserWindow 的 title，而任务栏预览/Alt-Tab
    // 显示的正是这个窗口标题。阻止页面标题生效，锁死为渠道品牌名，避免露出 YoBot。
    mainWindow.webContents.on('page-title-updated', (e) => {
        e.preventDefault();
    });
    let rpaConfigWindow = null;
    // Handle IPC request to open or focus RPA config window
    replaceWindowIpcListener('rpa:open-config-window', async (event, url) => {
        let targetUrl = url;
        if (process.platform === 'darwin') {
            if (!isTrustedMacOSPluginRenderer(event) || !macOSControlDriver)
                return;
            try {
                const target = await macOSControlDriver.resolveOwnedLoopback();
                macOSOwnedLoopbackSnapshot = target;
                targetUrl = target.apiBaseUrl;
            }
            catch {
                console.error('[Main] Refusing to open RPA Config window without an owned runtime.');
                return;
            }
        }
        if (rpaConfigWindow && !rpaConfigWindow.isDestroyed()) {
            if (process.platform === 'darwin'
                && !macOSControlWindowOwnsUrl(rpaConfigWindow.webContents.getURL(), macOSOwnedLoopbackSnapshot)) {
                await rpaConfigWindow.loadURL(targetUrl);
            }
            // If window exists, focus it and restore if minimized
            if (rpaConfigWindow.isMinimized())
                rpaConfigWindow.restore();
            rpaConfigWindow.focus();
        }
        else {
            // Create new window
            rpaConfigWindow = new BrowserWindow({
                autoHideMenuBar: true,
                frame: true,
                width: 680,
                height: 900,
                minWidth: 500,
                minHeight: 600,
                resizable: true,
                title: '微信BOT',
                icon: iconPath,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    ...(process.platform === 'darwin' ? { partition: 'rpa-config-runtime' } : {}),
                }
            });
            rpaConfigWindow.setMenu(null);
            if (process.platform === 'darwin') {
                const ownedOrigin = new URL(targetUrl).origin;
                rpaConfigWindow.webContents.session.webRequest.onBeforeSendHeaders({ urls: [`${ownedOrigin}/*`] }, (details, callback) => {
                    const headers = macOSControlWindowHeaders(details.url, details.requestHeaders, macOSOwnedLoopbackSnapshot);
                    if (!headers) {
                        callback({ cancel: true });
                        return;
                    }
                    callback({ requestHeaders: headers });
                });
                rpaConfigWindow.webContents.on('will-navigate', (navigationEvent, navigationUrl) => {
                    if (!macOSControlWindowOwnsUrl(navigationUrl, macOSOwnedLoopbackSnapshot)) {
                        navigationEvent.preventDefault();
                        console.error('[Main] Blocked RPA Config navigation outside the owned runtime origin.');
                    }
                });
            }
            rpaConfigWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
                shell.openExternal(targetUrl);
                return { action: 'deny' };
            });
            rpaConfigWindow.webContents.on('did-finish-load', () => {
                console.log(`[Main] RPA Config window loaded: ${rpaConfigWindow?.webContents.getURL()}`);
                rpaConfigWindow?.webContents.session.clearCache().then(() => {
                    console.log('[Main] Cleared cache for RPA UI');
                });
                const scrollbarCss = `
                  ::-webkit-scrollbar { width: 8px; height: 8px; }
                  ::-webkit-scrollbar-track { background: transparent; }
                  ::-webkit-scrollbar-thumb { background-color: #4b5563; border-radius: 4px; }
                  ::-webkit-scrollbar-thumb:hover { background-color: #6b7280; }
              `;
                rpaConfigWindow?.webContents.insertCSS(scrollbarCss).catch(e => console.error('[Main] Failed to inject scrollbar CSS:', e));
                rpaConfigWindow?.setTitle('微信BOT');
            });
            rpaConfigWindow.on('closed', () => {
                rpaConfigWindow = null;
            });
            rpaConfigWindow.loadURL(targetUrl);
        }
    });
    // FireFlow 工作流：内部弹窗打开（无地址栏，隐藏域名 URL）。
    // OEM 渠道无自有反代域名时使用，避免外部浏览器暴露官方域名。
    let fireflowWindow = null;
    replaceWindowIpcListener('fireflow:open-window', (_, url) => {
        if (fireflowWindow && !fireflowWindow.isDestroyed()) {
            if (fireflowWindow.isMinimized())
                fireflowWindow.restore();
            fireflowWindow.focus();
            return;
        }
        fireflowWindow = new BrowserWindow({
            autoHideMenuBar: true,
            frame: true,
            width: 1200,
            height: 820,
            minWidth: 900,
            minHeight: 600,
            resizable: true,
            title: 'FireFlow',
            icon: iconPath,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
            }
        });
        fireflowWindow.setMenu(null);
        // 窗口内点开的外链走系统浏览器；FireFlow 自身页面留在本窗口
        fireflowWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
            shell.openExternal(targetUrl);
            return { action: 'deny' };
        });
        // 固定标题，避免远端页面 <title> 覆盖后暴露品牌/域名
        fireflowWindow.webContents.on('page-title-updated', (e) => {
            e.preventDefault();
            fireflowWindow?.setTitle('FireFlow');
        });
        fireflowWindow.on('closed', () => { fireflowWindow = null; });
        fireflowWindow.loadURL(url);
    });
    // Handle new window creation (e.g. Service Agreement opened via window.open)
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        let title = 'AI私域机器人';
        // Check URL for specific titles
        if (url.includes('127.0.0.1:9922') || url.includes('localhost:9922')) {
            title = '微信BOT';
        }
        else if (url.includes('feishu.cn') || url.includes('larksuite.com')) {
            title = '服务协议';
        }
        else if (url.includes('coze.cn')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return {
            action: 'allow',
            overrideBrowserWindowOptions: {
                autoHideMenuBar: true, // Hide the default menu bar (File, Edit, etc.)
                frame: true, // Keep the window frame for standard controls (min/max/close)
                width: 680,
                height: 900,
                minWidth: 500,
                minHeight: 600,
                resizable: true,
                title: title, // Set title here as well
                icon: iconPath // Ensure icon is passed to new window options
            }
        };
    });
    // Listen for child window creation and explicitly remove the menu
    mainWindow.webContents.on('did-create-window', (childWindow) => {
        childWindow.setMenu(null);
        // Ensure links clicked inside the child window open in the default browser
        childWindow.webContents.setWindowOpenHandler(({ url }) => {
            shell.openExternal(url);
            return { action: 'deny' };
        });
        // Set icon explicitly for child window (safe)
        try {
            if (fs.existsSync(iconPath)) {
                childWindow.setIcon(iconPath);
            }
            else {
                console.warn(`[Main] Icon not found at ${iconPath}, skipping setIcon for child window.`);
            }
        }
        catch (e) {
            console.error(`[Main] Failed to set icon for child window: ${e.message}`);
        }
        // Initial title setting (might be overwritten by page load)
        // childWindow.setTitle('私域AI销售'); // REMOVED: Don't force default title immediately, let setWindowOpenHandler or page load handle it
        // Dynamic Title Logic based on URL content
        childWindow.webContents.on('did-finish-load', () => {
            const url = childWindow.webContents.getURL();
            console.log(`[Main] Child window loaded: ${url}`);
            // Clear cache for RPA UI to ensure latest frontend version
            if (url.includes('127.0.0.1:9922') || url.includes('localhost:9922')) {
                childWindow.webContents.session.clearCache().then(() => {
                    console.log('[Main] Cleared cache for RPA UI');
                });
            }
            // Inject Custom Scrollbar CSS to match client style
            const scrollbarCss = `
            ::-webkit-scrollbar { width: 8px; height: 8px; }
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb { background-color: #4b5563; border-radius: 4px; }
            ::-webkit-scrollbar-thumb:hover { background-color: #6b7280; }
        `;
            childWindow.webContents.insertCSS(scrollbarCss).catch(e => console.error('[Main] Failed to inject scrollbar CSS:', e));
            // 1. WeChat RPA UI
            if (url.includes('127.0.0.1:9922') || url.includes('localhost:9922')) {
                childWindow.setTitle('微信BOT');
            }
            // 2. Service Agreement (Feishu Wiki)
            else if (url.includes('feishu.cn') || url.includes('larksuite.com')) {
                childWindow.setTitle('服务协议');
            }
        });
        // Prevent the loaded page from changing the title IF it's one of our managed windows?
        // Or just let it be? The user requirement says "Show: Wechat BOT".
        // If the page itself (e.g. Feishu) changes title, we might want to enforce our title.
        childWindow.on('page-title-updated', (e) => {
            const url = childWindow.webContents.getURL();
            if (url.includes('127.0.0.1:9922') || url.includes('localhost:9922') || url.includes('feishu.cn')) {
                e.preventDefault();
            }
        });
    });
    // IPC listeners for window controls
    replaceWindowIpcListener('window-min', () => mainWindow?.minimize());
    replaceWindowIpcListener('window-max', () => {
        if (mainWindow?.isMaximized()) {
            mainWindow.unmaximize();
        }
        else {
            mainWindow?.maximize();
        }
    });
    replaceWindowIpcListener('window-close', () => mainWindow?.close());
    // Skills IPC
    replaceWindowIpcHandler('get-skills', async () => {
        const rootDir = path.join(__dirname, '../../');
        return await loadSkillsList(rootDir);
    });
    // 通用的“用户已安装技能”目录：严格只扫 userData/skills，不混入客户端内建技能。
    // 聊天技能选择器与子智能体挂载页共用同一数据源，避免两套列表口径漂移。
    replaceWindowIpcHandler('skills:installed', async () => {
        try {
            const disabled = ConfigManager.getInstance().getConfig().disabledSkills || [];
            return {
                success: true,
                data: listUserInstalledSkills(app.getPath('userData'), disabled),
            };
        }
        catch (e) {
            return { success: false, error: e?.message || String(e), data: [] };
        }
    });
    replaceWindowIpcHandler('toggle-skill', async (_, skillId) => {
        try {
            const configManager = ConfigManager.getInstance();
            const config = configManager.getConfig();
            const disabledSkills = new Set(config.disabledSkills || []);
            if (disabledSkills.has(skillId)) {
                disabledSkills.delete(skillId);
            }
            else {
                disabledSkills.add(skillId);
            }
            await persistOwnedConfig({ ...config, disabledSkills: Array.from(disabledSkills) });
            if (secureConfigRepository)
                pushOwnedConfigToServer();
            // Notify Server Process to reload skills
            if (serverProcess && serverProcess.connected) {
                serverProcess.send({ type: 'skills:reload' });
            }
            return { success: true };
        }
        catch (e) {
            console.error('Failed to toggle skill:', e);
            return { success: false, error: String(e) };
        }
    });
    // SOP 文档版本可见性（§5.6）：诊断页展示 + 反馈上报时携带。
    // 没有它，一条「agent 答错了」的反馈无法定位到用户当时读的是哪一版文档。
    replaceWindowIpcHandler('docs:versions', async () => {
        try {
            // RPA 版本必须显式传目录：USER_DATA_PATH / RESOURCES_PATH 只注入给 agent 子进程，
            // 主进程直接调 getRpaVersion() 会落到 homedir 猜测路径上，报出错误的版本。
            const rpaDirs = [
                path.join(app.getPath('userData'), 'bin', 'wechat-rpa'),
                path.join(process.resourcesPath, 'wechat-rpa'),
            ];
            return {
                client_version: app.getVersion(),
                rpa_version: readRpaVersionAt(rpaDirs),
                versions: readEffectiveVersions(docsUpdaterDeps(), (skill) => skill !== 'self_profile' || selfProfileUsesOnlineDocs()),
                last_update: lastDocsUpdateSummary,
            };
        }
        catch (e) {
            return { versions: {}, last_update: [], error: e?.message || String(e) };
        }
    });
    // 技能商店：安装 skillmd 技能（下载→sha256 校验→解压到 USER_DATA/skills/<id>→热重载）
    // 仅用户显式触发；MVP 仅支持 skillmd backend。
    replaceWindowIpcHandler('store:install-skill', async (_, item) => {
        return installSkillPackage(item);
    });
    // Scheduler IPC
    // Use app.getAppPath() or path logic to ensure correct path in dev/prod
    // In dev, cwd is usually project root. In prod, it might differ.
    // data/tasks.json is in project root.
    let projectRoot = process.cwd();
    if (app.isPackaged) {
        // In Production: Use User Data directory for mutable data (Workspace, Tasks)
        // Path: C:\Users\Administrator\AppData\Roaming\YoBot
        projectRoot = app.getPath('userData');
    }
    else {
        // In Development: Try to locate project root by checking for package.json
        if (!fs.existsSync(path.join(projectRoot, 'package.json'))) {
            // Maybe we are in dist/electron?
            projectRoot = path.resolve(__dirname, '../../');
        }
        console.log(`[Main] Development Mode. Project Root: ${projectRoot}`);
    }
    // 本地知识库统一管理（Phase 1）——注册表口径的文档 CRUD + scope + 配额/字数，替代旧扁平模型。
    // 目录与 server 对齐：app.getPath('userData')/workspace/knowledge（迁移/检索同口径）。
    const KDIR = () => path.join(getWorkspacePath(), 'knowledge');
    const kbRegistry = () => new KnowledgeRegistry(KDIR());
    const VALID_SCOPES = new Set(['main', 'sub', 'all']);
    const sanitizeScope = (s) => (VALID_SCOPES.has(s) ? s : 'main');
    // 触发 server 的确定性重索引/清除（不依赖 chokidar）。best-effort：失败不阻断操作。
    const localApiBase = () => `http://127.0.0.1:${process.env.PORT || '3000'}/api/knowledge`;
    const localApiHeaders = { 'Content-Type': 'application/json', 'X-Yoko-Local-Token': LOCAL_API_TOKEN };
    /**
     * 重索引：**提交 job + 轮询**，不再用一个会超时的同步 HTTP。
     *
     * 旧实现 60s 超时，而一篇大文档索引会超过它 —— 超时后连接断掉但服务端任务照跑，
     * 主进程随即释放并发槽、UI 显示「已导入」，于是「看不见的任务在后台重叠」，
     * 并发闸形同虚设，用户也不知道索引其实还没完。
     *
     * 轮询上限 10 分钟；到点仍未完成时**不报错**，而是回报「仍在进行」——
     * 任务本身还在跑，让用户知道稍后会好，比谎报失败准确。
     */
    const knowledgeReindex = async (dir = 'knowledge') => {
        try {
            const submit = await fetch(`${localApiBase()}/reindex`, {
                method: 'POST', headers: localApiHeaders, body: JSON.stringify({ dir }),
            });
            if (!submit.ok)
                return { ok: false };
            // 必须拿到并使用**这次提交的** jobId。按 dir 轮询会读到「该目录当前那个任务」，
            // 在任务复用的场景下那可能是别人的任务：它一完成就被当成我们成功了，
            // 而我们刚上传的文档其实还没被扫到。
            const sub = await submit.json().catch(() => null);
            const jobId = sub?.jobId || '';
            const statusUrl = jobId
                ? `${localApiBase()}/reindex/status?jobId=${encodeURIComponent(jobId)}`
                : `${localApiBase()}/reindex/status?dir=${dir}`; // 兼容旧服务端
            const deadline = Date.now() + 10 * 60 * 1000;
            let delay = 400;
            while (Date.now() < deadline) {
                await new Promise((r) => setTimeout(r, delay));
                delay = Math.min(delay * 1.5, 3000); // 退避，避免长任务期间高频轮询
                const st = await fetch(statusUrl, { headers: localApiHeaders });
                if (!st.ok)
                    return { ok: false };
                const j = await st.json().catch(() => null);
                if (!j)
                    return { ok: false };
                if (j.state === 'error')
                    return { ok: false };
                if (j.state === 'done' || j.state === 'idle') {
                    const failed = j.failed || [];
                    const blocked = j.blocked || [];
                    // failed 非空表示有文件向量没落盘（会自动重试），不是「调用失败」；
                    // blocked 是被配额挡下的，重试也不会好。两类都必须让用户知道 ——
                    // 否则他以为整份资料都能检索到了。
                    return { ok: failed.length === 0 && blocked.length === 0, failed, blocked };
                }
            }
            return { ok: false, pending: true };
        }
        catch {
            return { ok: false };
        }
    };
    /** purge 仍是同步的：删向量很快，没有超时风险。 */
    const knowledgePurge = async (ns) => {
        try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 60000);
            try {
                const r = await fetch(`${localApiBase()}/purge`, {
                    method: 'POST', headers: localApiHeaders,
                    body: JSON.stringify({ ns }), signal: ctrl.signal,
                });
                return r.ok;
            }
            finally {
                clearTimeout(timer);
            }
        }
        catch {
            return false;
        }
    };
    /**
     * 让 server 子进程把上传的文件解析成规范化 markdown。
     *
     * 解析放在子进程（而非主进程）：pdf-parse / mammoth / xlsx 都很重，主进程加载它们
     * 曾因 NODE_PATH 出过问题；子进程本来就 bundle 了 doc_converter。
     *
     * 超时给 5 分钟：一个几十 MB 的 PDF 解析确实可能跑上几分钟，
     * 用 60s 会把正常的大文件误判成失败。
     */
    const knowledgeConvert = async (srcPath) => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5 * 60 * 1000);
        try {
            // ⚠️ 读文件必须留在主进程、**只发字节给子进程**。
            // 早期版本把路径 POST 过去让子进程 readFile —— 那是一个任意本地文件读取原语，
            // 配上 cors() 就等于让任意网页读走本地 auth.json（平台 JWT）。
            // 这里的 srcPath 来自用户刚在系统对话框里选中的文件，是可信来源。
            const bytes = await fs.promises.readFile(srcPath);
            const r = await fetch(`http://127.0.0.1:${process.env.PORT || '3000'}/api/knowledge/convert`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'X-Yoko-Local-Token': LOCAL_API_TOKEN,
                    // 文件名只用于后缀判断，URL 编码以支持中文名
                    'X-Filename': encodeURIComponent(path.basename(srcPath)),
                },
                body: bytes,
                signal: ctrl.signal,
            });
            const json = await r.json().catch(() => null);
            if (!r.ok || !json?.success) {
                return { ok: false, error: json?.error || `HTTP ${r.status}` };
            }
            return { ok: true, content: String(json.content ?? ''), metadata: json.metadata ?? {}, bytes: Number(json.bytes ?? 0) };
        }
        catch (e) {
            return { ok: false, error: e?.name === 'AbortError' ? '解析超时（文件过大或格式复杂）' : (e?.message || String(e)) };
        }
        finally {
            clearTimeout(timer);
        }
    };
    // 可上传的扩展名。必须与服务端 config/kb_limits.ts 的 formats 以及
    // doc_converter 真正能解析的后缀保持一致（三者对不上就会出现「能选中、传不进去」）。
    const KB_UPLOAD_EXTS = ['md', 'txt', 'pdf', 'docx', 'xlsx'];
    // 上传原件的存放子目录。与 src/memory/file_memory.ts 的 KB_RAW_SUBDIR 必须一致：
    // 那边靠这个名字把原件排除在索引之外，改名会让原件被当成知识重复索引。
    const KB_RAW_SUBDIR = 'raw';
    // 日增量账本。放在 userData/data 下，与其它客户端状态同目录。
    // 路径由 quota.ts 的 kbLedgerPath() 统一给出（server 子进程也用它），
    // 两处各拼一次会出现「一边记账、另一边看不到」，日增量闸半失效。
    const kbLedger = () => new KbQuotaLedger();
    /**
     * 手工新建/编辑文档时的闸门。手写内容没有「原始文件」，所以只过总容量 + 日增量，
     * 用规范化文本的字节数当增量（与 measureKnowledgeBytes 的口径一致）。
     *
     * `existingBytes` 是被替换掉的旧正文字节数：编辑时只有净增部分算新增，
     * 否则用户反复微调一篇长文档会把日额度飞快耗尽。
     */
    const gateManualWrite = async (text, existingBytes = 0) => {
        const { limits } = await getKbEntitlement();
        const newBytes = Buffer.byteLength(text, 'utf-8');
        // 容量与日增量用的是**两个不同的量**，别合成一个：
        //   容量  = 其它文档 + 这篇的新体积（这篇的旧体积被替换掉了）
        //   日增量 = 净增部分（否则反复微调一篇长文档会飞快吃掉当天额度）
        const addBytes = Math.max(0, newBytes - existingBytes);
        const currentBytes = await measureKnowledgeBytes(getWorkspacePath());
        const size = checkFileSize(newBytes, limits);
        if (!size.allowed)
            return size;
        // 算式收在 checkCapacityForReplace 里（它已经算错过两次，见那里的注释）。
        const total = checkCapacityForReplace(currentBytes, existingBytes, newBytes, limits);
        if (!total.allowed)
            return total;
        const daily = checkDailyIncrement(await kbLedger().todayBytes(), addBytes, limits);
        if (!daily.allowed)
            return daily;
        // ⚠️ 这里**只检查、不记账**。记账的唯一地点是索引入口（file_memory.syncFile）——
        // 两边都记会重复计数：写完文件后触发的 reindex 会让同一份内容再被算一次。
        // 这里的检查只为「保存前就给出友好拒绝」，不承担账本职责。
        return { allowed: true, addBytes };
    };
    replaceWindowIpcHandler('knowledge:list', async () => {
        try {
            const dir = KDIR();
            const docs = await kbRegistry().list();
            const data = await Promise.all(docs.map(async (d) => {
                let preview = '';
                try {
                    const content = await fs.promises.readFile(path.join(dir, d.id, d.file), 'utf-8');
                    preview = content.slice(0, 120).replace(/\s+/g, ' ').trim();
                }
                catch { /* 文件缺失容忍 */ }
                return { id: d.id, title: d.title, scope: d.scope, chars: d.chars, date: d.updatedAt || d.createdAt, preview };
            }));
            // 配额条改为展示「容量」而非「篇数」——容量是风控口径，篇数已不再限制。
            const { tier, limits, fallback } = await getKbEntitlement();
            const usedBytes = await measureKnowledgeBytes(getWorkspacePath());
            return {
                success: true,
                data,
                quota: {
                    used: docs.length,
                    usedBytes,
                    maxTotalBytes: limits.maxTotalBytes,
                    maxFileBytes: limits.maxFileBytes,
                    formats: limits.formats,
                    tier,
                    fallback,
                },
            };
        }
        catch (e) {
            console.error('[Main] knowledge:list failed', e);
            return { success: false, error: e.message };
        }
    });
    replaceWindowIpcHandler('knowledge:get', async (_, { id }) => {
        try {
            const d = (await kbRegistry().load())[id];
            if (!d)
                return { success: false, error: '文档不存在' };
            const content = await fs.promises.readFile(path.join(KDIR(), d.id, d.file), 'utf-8').catch(() => '');
            return { success: true, content, title: d.title, scope: d.scope };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    });
    replaceWindowIpcHandler('knowledge:create', async (_, { title, content, scope }) => {
        try {
            const reg = kbRegistry();
            const map = await reg.load();
            const text = String(content ?? '');
            const chars = countChars(text);
            if (!String(title ?? '').trim())
                return { success: false, error: '请填写标题' };
            if (chars === 0)
                return { success: false, error: '内容不能为空' };
            const gate = await gateManualWrite(text);
            if (!gate.allowed)
                return { success: false, error: gate.reason };
            const id = reg.uniqueId(map);
            const file = 'doc.md';
            await fs.promises.mkdir(path.join(KDIR(), id), { recursive: true });
            await fs.promises.writeFile(path.join(KDIR(), id, file), text, 'utf-8');
            map[id] = { id, title: String(title).trim(), scope: sanitizeScope(scope), chars, file, createdAt: Date.now() };
            await reg.save(map);
            // 不在此记日增量：reindex 触发的 syncFile 会按真正新增的 chunk 记账（唯一账本入口）
            const idx = await knowledgeReindex('knowledge');
            return { success: true, id, ref: `@shared/${id}`, indexed: idx.ok, indexFailed: idx.failed, indexPending: idx.pending, indexBlocked: idx.blocked };
        }
        catch (e) {
            console.error('[Main] knowledge:create failed', e);
            return { success: false, error: e.message };
        }
    });
    replaceWindowIpcHandler('knowledge:update', async (_, { id, title, content, scope }) => {
        try {
            const reg = kbRegistry();
            const map = await reg.load();
            const d = map[id];
            if (!d)
                return { success: false, error: '文档不存在' };
            const text = String(content ?? '');
            const chars = countChars(text);
            if (!String(title ?? '').trim())
                return { success: false, error: '请填写标题' };
            if (chars === 0)
                return { success: false, error: '内容不能为空' };
            const prevBytes = await fs.promises
                .stat(path.join(KDIR(), d.id, d.file))
                .then((st) => st.size)
                .catch(() => 0);
            const gate = await gateManualWrite(text, prevBytes);
            if (!gate.allowed)
                return { success: false, error: gate.reason };
            await fs.promises.mkdir(path.join(KDIR(), d.id), { recursive: true });
            await fs.promises.writeFile(path.join(KDIR(), d.id, d.file), text, 'utf-8');
            map[id] = { ...d, title: String(title).trim(), scope: sanitizeScope(scope), chars, updatedAt: Date.now() };
            await reg.save(map);
            // 同上：日增量由索引入口统一记账
            const idx = await knowledgeReindex('knowledge');
            return { success: true, indexed: idx.ok, indexFailed: idx.failed, indexPending: idx.pending, indexBlocked: idx.blocked };
        }
        catch (e) {
            console.error('[Main] knowledge:update failed', e);
            return { success: false, error: e.message };
        }
    });
    // 仅改 scope（不动文件/索引；检索层 Phase 2 会读 scope 严格分流）。
    replaceWindowIpcHandler('knowledge:set-scope', async (_, { id, scope }) => {
        try {
            const reg = kbRegistry();
            const map = await reg.load();
            if (!map[id])
                return { success: false, error: '文档不存在' };
            map[id] = { ...map[id], scope: sanitizeScope(scope), updatedAt: Date.now() };
            await reg.save(map);
            return { success: true };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    });
    replaceWindowIpcHandler('knowledge:delete', async (_, { id }) => {
        try {
            const reg = kbRegistry();
            const map = await reg.load();
            if (!map[id])
                return { success: true }; // 已不存在，幂等
            delete map[id];
            await reg.save(map); // 1. 注册表条目
            await fs.promises.rm(path.join(KDIR(), id), { recursive: true, force: true }); // 2. 文件目录
            await knowledgePurge(`knowledge/${id}`); // 3. 确定性清向量库
            return { success: true };
        }
        catch (e) {
            console.error('[Main] knowledge:delete failed', e);
            return { success: false, error: e.message };
        }
    });
    // 上传 .md/.txt：每个文件成一篇文档（scope 由参数指定）。逐个校验配额+字数，超限跳过并回报原因。
    replaceWindowIpcHandler('knowledge:upload', async (_, { scope }) => {
        try {
            const pick = await dialog.showOpenDialog(mainWindow ?? undefined, {
                title: `选择要导入的知识文档（${KB_UPLOAD_EXTS.map(e => '.' + e).join(' / ')}）`,
                filters: [{ name: '文档 / 表格 / 文本', extensions: KB_UPLOAD_EXTS }],
                properties: ['openFile', 'multiSelections'],
            });
            if (pick.canceled || pick.filePaths.length === 0)
                return { success: true, cancelled: true };
            const reg = kbRegistry();
            const map = await reg.load();
            let added = 0;
            const skipped = [];
            const truncated = [];
            // 配额与容量在循环外读一次：limits 有缓存，但 measureKnowledgeBytes 要遍历目录，
            // 逐文件重算会让多选上传变成 O(n^2) 次目录扫描。循环内按已入库量增量累加。
            const { limits } = await getKbEntitlement();
            let usedBytes = await measureKnowledgeBytes(getWorkspacePath());
            let todayBytes = await kbLedger().todayBytes();
            let ledgerDelta = 0;
            // 原件磁盘另有一套配额：文本容量按索引成本算（不含 raw/），
            // 但原件实实在在占盘。见 quota.ts 的 RAW_QUOTA_MULTIPLIER。
            let rawBytes = await measureRawBytes(getWorkspacePath());
            const rawSkipped = [];
            // 并发闸：整批上传占一个槽位，用 try/finally 保证异常也归还。
            const concurrency = checkConcurrency(limits);
            if (!concurrency.allowed)
                return { success: false, error: concurrency.reason };
            const releaseSlot = acquireIndexSlot();
            try {
                for (const src of pick.filePaths) {
                    const base = path.basename(src);
                    // 格式闸走服务端下发的 formats（免费档只有 txt/md），不是本地硬编码列表 ——
                    // KB_UPLOAD_EXTS 只用来给文件选择器做过滤，真正的准入以 limits 为准。
                    const fmt = checkFormat(base, limits);
                    if (!fmt.allowed) {
                        skipped.push(`${base}（${fmt.reason}）`);
                        continue;
                    }
                    // 单文件闸在**解析之前**：一个 200MB 的 PDF 不该先花几分钟解析完才被拒。
                    const srcSize = await fs.promises.stat(src).then((st) => st.size).catch(() => 0);
                    const sizeGate = checkFileSize(srcSize, limits);
                    if (!sizeGate.allowed) {
                        skipped.push(`${base}（${sizeGate.reason}）`);
                        continue;
                    }
                    // 交给 server 子进程解析成 markdown（ingest 模式，不做预览截断）。
                    // 纯文本走同一条路：doc_converter 的 convertText 就是原样读出，
                    // 不为 md/txt 单开分支，省掉两条路径行为不一致的风险。
                    const conv = await knowledgeConvert(src);
                    if (!conv.ok) {
                        skipped.push(`${base}（${conv.error}）`);
                        continue;
                    }
                    const text = conv.content;
                    const chars = countChars(text);
                    // 解析器判定「这种文件我处理不了」时会给出结构化原因（如扫描件需要 OCR）。
                    // 必须优先用它：否则用户只看到「解析结果为空」，完全不知道该怎么办。
                    if (conv.metadata?.unsupported) {
                        skipped.push(`${base}（${conv.metadata.reason || '暂不支持该文件'}）`);
                        continue;
                    }
                    if (chars === 0) {
                        skipped.push(base + '（解析结果为空）');
                        continue;
                    }
                    // 容量/日增量按**规范化文本**的字节数算，与 measureKnowledgeBytes 同口径
                    // （原件不进索引，也不计容量）。
                    const addBytes = Buffer.byteLength(text, 'utf-8');
                    const totalGate = checkTotalCapacity(usedBytes, addBytes, limits);
                    if (!totalGate.allowed) {
                        skipped.push(`${base}（${totalGate.reason}）`);
                        continue;
                    }
                    const dailyGate = checkDailyIncrement(todayBytes, addBytes, limits);
                    if (!dailyGate.allowed) {
                        skipped.push(`${base}（${dailyGate.reason}）`);
                        continue;
                    }
                    // 内容被解析器截断过就要告诉用户，绝不默默入库一份不全的文档 ——
                    // 否则用户以为整份资料都能检索到，实际后半截根本不在索引里。
                    if (conv.metadata?.truncatedByCharacterLimit || conv.metadata?.boundedPreview) {
                        truncated.push(base);
                    }
                    const id = reg.uniqueId(map);
                    const file = 'doc.md';
                    const docDir = path.join(KDIR(), id);
                    await fs.promises.mkdir(docDir, { recursive: true });
                    await fs.promises.writeFile(path.join(docDir, file), text, 'utf-8');
                    // 原件另存 raw/：换切块策略或换解析器时可以从原件重跑，不必让用户重新上传。
                    // raw/ 被 file_memory.isKbRawPath 排除在索引之外 —— 不排除的话同一份内容
                    // 会被索引两遍（原件是 .txt/.md 时尤其明显）。
                    // 存原件失败不算上传失败：doc.md 已经落盘，知识库能用，只是日后无法重跑解析。
                    // 原件超出磁盘配额时**只跳过保留原件，不阻断上传** ——
                    // 原件只用于日后重跑解析，知识内容本身已入库可检索。
                    // 为了「日后可能重跑」而拒绝一次正常上传，是本末倒置。
                    const rawGate = checkRawQuota(rawBytes, srcSize, limits);
                    if (!rawGate.allowed) {
                        rawSkipped.push(base);
                    }
                    else {
                        try {
                            const rawDir = path.join(docDir, KB_RAW_SUBDIR);
                            await fs.promises.mkdir(rawDir, { recursive: true });
                            await fs.promises.copyFile(src, path.join(rawDir, base));
                            rawBytes += srcSize;
                        }
                        catch (e) {
                            console.warn(`[Main] 保存上传原件失败（不影响已入库的 doc.md）: ${base}`, e?.message);
                        }
                    }
                    map[id] = {
                        id,
                        title: base.replace(new RegExp(`\\.(${KB_UPLOAD_EXTS.join('|')})$`, 'i'), ''),
                        scope: sanitizeScope(scope),
                        chars,
                        file,
                        createdAt: Date.now(),
                    };
                    // 本批内累加，让后续文件看到的是「含前面几份」的用量
                    usedBytes += addBytes;
                    todayBytes += addBytes;
                    ledgerDelta += addBytes;
                    added++;
                }
                if (added > 0)
                    await reg.save(map);
                // ledgerDelta 只用于**本批内**的前置检查累加（让第 2 个文件看到含第 1 个的用量），
                // 不写账本 —— 记账由 reindex 触发的 syncFile 统一负责，避免同一份内容计两次。
                const idx = added > 0
                    ? await knowledgeReindex('knowledge')
                    : {
                        ok: false, failed: [],
                        pending: undefined, blocked: [],
                    };
                return {
                    success: true, added, skipped, truncated, rawSkipped,
                    indexed: idx.ok, indexFailed: idx.failed, indexPending: idx.pending,
                    // 配额闸在**索引入口**也会拦（Agent 直接写文件时 IPC 那层的检查绕得过去），
                    // 所以即便这里前置检查全过了，仍可能有文件在索引阶段被挡下。
                    indexBlocked: idx.blocked,
                };
            }
            finally {
                releaseSlot();
            }
        }
        catch (e) {
            console.error('[Main] knowledge:upload failed', e);
            return { success: false, error: e.message };
        }
    });
    // Agent 进程按 `USER_DATA_PATH/workspace` 写文件（见 src/config/index.ts），
    // 而 projectRoot 在开发态是 cwd。两者不一致时，"打开工作空间"会打开一个空目录，
    // 渲染进程解析相对路径也会落空。这里以 userData 为唯一口径。
    const getWorkspacePath = () => path.join(app.getPath('userData'), 'workspace');
    replaceWindowIpcListener('get-workspace-path', (event) => {
        event.returnValue = getWorkspacePath();
    });
    // ===== 智能体（子 Agent）管理：读写 workspace/agents/<name>/AGENT.md =====
    // 直接读写文件（与 knowledge:* 同模式）；server 子进程有 chokidar 监听 agents/，
    // 保存后自动 reloadFromDisk，下一条客户消息起生效。这里不引入 server 侧 ProfileLoader
    // （它会拉入 vector.js 等重依赖），改用轻量 frontmatter 解析。
    const AGENTS_DIR = () => path.join(getWorkspacePath(), 'agents');
    const AGENT_NAME_RE = /^[A-Za-z0-9_-]+$/;
    const recordsStore = () => new ConversationStore(path.join(app.getPath('userData'), 'data', 'rpa_conversations'));
    const agentContextStore = () => new AgenticContextStore(path.join(app.getPath('userData'), 'data', 'agentic_contexts'));
    replaceWindowIpcHandler('agents:backup-status', async () => {
        try {
            return await sendServerRequest('asset-backup:status', 'asset-backup:status:done', {}, 5000);
        }
        catch (e) {
            return { success: false, error: e?.message || String(e) };
        }
    });
    replaceWindowIpcHandler('agents:backup-refresh', async () => {
        try {
            return await sendServerRequest('asset-backup:sync-now', 'asset-backup:sync-now:done', { reason: 'manual' }, 30000);
        }
        catch (e) {
            return { success: false, error: e?.message || String(e) };
        }
    });
    replaceWindowIpcHandler('agents:backup-restore', async (_, { profileId, overwrite }) => {
        try {
            if (!AGENT_NAME_RE.test(profileId || ''))
                return { success: false, error: '非法的智能体标识' };
            return await sendServerRequest('asset-backup:restore', 'asset-backup:restore:done', { profileId, overwrite: overwrite === true }, 30000);
        }
        catch (e) {
            return { success: false, error: e?.message || String(e) };
        }
    });
    // 执行过程 trace 保留 7 天：启动时清理过期的按日目录(data/traces/<date>/)与 .log。
    // best-effort，任何异常都不影响启动。
    const pruneOldTraces = (keepDays = 7) => {
        try {
            const cutoff = Date.now() - keepDays * 86400000;
            const traceRoot = path.join(app.getPath('userData'), 'data', 'traces');
            if (fs.existsSync(traceRoot)) {
                for (const day of fs.readdirSync(traceRoot)) {
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(day))
                        continue; // 只碰按日目录，别误删其它
                    if (new Date(day + 'T23:59:59Z').getTime() < cutoff) {
                        try {
                            fs.rmSync(path.join(traceRoot, day), { recursive: true, force: true });
                        }
                        catch { /* ignore */ }
                    }
                }
            }
            const logRoot = path.join(app.getPath('userData'), 'logs', 'traces');
            if (fs.existsSync(logRoot)) {
                for (const f of fs.readdirSync(logRoot)) {
                    const p = path.join(logRoot, f);
                    try {
                        if (fs.statSync(p).mtimeMs < cutoff)
                            fs.rmSync(p, { force: true });
                    }
                    catch { /* ignore */ }
                }
            }
            // 账本必须跟着日志一起清：日志被清掉之后，账本里那条记录永远补报不出内容，
            // 留着只会让每次开机白扫一遍。
            pruneOpenTurns(app.getPath('userData'), keepDays);
        }
        catch (e) {
            console.error('[Traces] prune failed:', e);
        }
    };
    pruneOldTraces();
    const parseAgentMd = (raw, dirName) => {
        const m = raw.replace(/^﻿/, '').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
        const fm = m ? m[1] : '';
        const body = (m ? m[2] : raw).trim();
        const scalar = (k) => {
            const r = fm.match(new RegExp(`^${k}:\\s*(.+)$`, 'm'));
            return r ? r[1].trim().replace(/^["']|["']$/g, '') : undefined;
        };
        const list = (k) => {
            const inline = fm.match(new RegExp(`^${k}:\\s*\\[(.*)\\]\\s*$`, 'm'));
            if (inline)
                return inline[1].split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
            const lines = fm.split(/\r?\n/);
            const start = lines.findIndex(l => new RegExp(`^${k}:\\s*$`).test(l));
            if (start === -1)
                return [];
            const out = [];
            for (let i = start + 1; i < lines.length; i++) {
                const mm = lines[i].match(/^\s+-\s*(.+)$/);
                if (!mm)
                    break;
                out.push(mm[1].trim().replace(/^["']|["']$/g, ''));
            }
            return out;
        };
        // 块标量 `key: |`：读缩进多行文本（与 loader.blockScalar 同构，供 followUpPrompt 往返）。
        const block = (k) => {
            const lines = fm.split(/\r?\n/);
            const start = lines.findIndex(l => new RegExp(`^${k}:\\s*\\|\\s*$`).test(l));
            if (start === -1)
                return '';
            const out = [];
            let indent = -1;
            for (let i = start + 1; i < lines.length; i++) {
                const line = lines[i];
                if (line.trim() === '') {
                    out.push('');
                    continue;
                }
                const mm = line.match(/^(\s+)\S/);
                if (!mm)
                    break;
                if (indent === -1)
                    indent = mm[1].length;
                if (mm[1].length < indent)
                    break;
                out.push(line.slice(indent));
            }
            while (out.length && out[out.length - 1] === '')
                out.pop();
            return out.join('\n').trim();
        };
        const fu = scalar('followUp');
        return {
            name: scalar('name') || dirName,
            displayName: scalar('displayName') || scalar('name') || dirName,
            enabled: (scalar('enabled') ?? 'true').toLowerCase() !== 'false',
            scene: scalar('scene') || '',
            // 技能模块开关（默认关，风险模块）。UI 里 shell 自动放行、不写进 skills 列表。
            skillsEnabled: (scalar('skillsEnabled') ?? 'false').toLowerCase() === 'true',
            skills: list('skills'),
            knowledge: list('knowledge'),
            followUp: (fu === 'auto' || fu === 'always') ? fu : 'never',
            // 智能追答提示词：空则运行时回落默认（DEFAULT_FOLLOWUP_PROMPT）。往返保用户手改。
            followUpPrompt: block('followUpPrompt'),
            // 空 = 跟随全局默认模型（kernel 回落 createPiModel(undefined)）；不写死默认值。
            model: scalar('model') || '',
            systemPrompt: body,
        };
    };
    // 单一出处：与 agent_builder 技能服务端写文件共用同一序列化器，杜绝字段漂移。
    const composeAgentMd = (a) => composeAgentMd_(a);
    replaceWindowIpcHandler('agents:list', async () => {
        try {
            const dir = AGENTS_DIR();
            if (!fs.existsSync(dir))
                return { success: true, data: [] };
            const ovMap = new Map(recordsStore().overview().map(o => [o.profileId, o]));
            const out = [];
            for (const entry of await fs.promises.readdir(dir, { withFileTypes: true })) {
                if (!entry.isDirectory())
                    continue;
                const md = path.join(dir, entry.name, 'AGENT.md');
                if (!fs.existsSync(md))
                    continue;
                const p = parseAgentMd(await fs.promises.readFile(md, 'utf-8'), entry.name);
                const ov = ovMap.get(p.name);
                out.push({ ...p, records: ov?.total || 0, today: ov?.today || 0, lastTs: ov?.lastTs || 0 });
            }
            out.sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0));
            return { success: true, data: out };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    });
    replaceWindowIpcHandler('agents:get', async (_, { name }) => {
        try {
            if (!AGENT_NAME_RE.test(name || ''))
                return { success: false, error: '非法的智能体标识' };
            const md = path.join(AGENTS_DIR(), name, 'AGENT.md');
            if (!fs.existsSync(md))
                return { success: false, error: '智能体不存在' };
            return { success: true, data: parseAgentMd(await fs.promises.readFile(md, 'utf-8'), name) };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    });
    replaceWindowIpcHandler('agents:save', async (_, a) => {
        try {
            if (!AGENT_NAME_RE.test(a?.name || '')) {
                return { success: false, error: '标识只能包含字母、数字、下划线、连字符' };
            }
            if (!String(a?.systemPrompt || '').trim())
                return { success: false, error: '人设不能为空' };
            const agentDir = path.join(AGENTS_DIR(), a.name);
            await fs.promises.mkdir(agentDir, { recursive: true });
            await fs.promises.writeFile(path.join(agentDir, 'AGENT.md'), composeAgentMd(a), 'utf-8');
            return { success: true };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    });
    replaceWindowIpcHandler('agents:set-enabled', async (_, { name, enabled }) => {
        try {
            if (!AGENT_NAME_RE.test(name || ''))
                return { success: false, error: '非法的智能体标识' };
            const md = path.join(AGENTS_DIR(), name, 'AGENT.md');
            if (!fs.existsSync(md))
                return { success: false, error: '智能体不存在' };
            const cur = parseAgentMd(await fs.promises.readFile(md, 'utf-8'), name);
            await fs.promises.writeFile(md, composeAgentMd({ ...cur, enabled }), 'utf-8');
            return { success: true };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    });
    replaceWindowIpcHandler('agents:delete', async (_, { name }) => {
        try {
            if (!AGENT_NAME_RE.test(name || ''))
                return { success: false, error: '非法的智能体标识' };
            const agentDir = path.join(AGENTS_DIR(), name);
            if (fs.existsSync(agentDir))
                await fs.promises.rm(agentDir, { recursive: true, force: true });
            return { success: true };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    });
    // 可挂载的共享知识库：workspace/knowledge/<ns>/（AGENT.md 里以 @shared/<ns> 引用）
    // 可挂载技能 = 用户安装的 SKILL.md 技能（内建 TS 技能一律不可挂，见 AGENT_BUILTIN_SKILLS）。
    // 只扫 userData/skills（技能商店安装落点）；每个子目录读 SKILL.md 的 name/description。
    replaceWindowIpcHandler('agents:installed-skills', async () => {
        try {
            const disabled = ConfigManager.getInstance().getConfig().disabledSkills || [];
            return {
                success: true,
                data: listUserInstalledSkills(app.getPath('userData'), disabled),
            };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    });
    // 子 Agent 可挂载的本地知识库 = 注册表里 scope∈{sub,all} 的文档（管理统一在账户弹窗）。
    // ref=@shared/<docId>，name 用展示标题（不是目录 id）。主智能体专属(main)不出现在此。
    replaceWindowIpcHandler('agents:knowledge-bases', async () => {
        try {
            const docs = await kbRegistry().list();
            const data = docs
                .filter(d => d.scope === 'sub' || d.scope === 'all')
                .map(d => ({ ref: `@shared/${d.id}`, name: d.title, docs: 1, scope: d.scope }));
            return { success: true, data };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    });
    // 可挂载的 Fireflow(workflow)线上知识库：调 fireflow 的 agent 专用列表接口。
    // 鉴权由 main-owned repository 提供；macOS 使用 Agent SecretStore，Windows
    // compatibility backend 仍读取同一份 auth.json 业务格式。
    replaceWindowIpcHandler('agents:workflow-knowledge-bases', async () => {
        try {
            const token = await readOwnedAuthToken();
            if (!token)
                return { success: true, data: [] };
            const base = (process.env.VITE_FIREFLOW_BASE_URL || 'https://fireflow.yokoagi.com').replace(/\/+$/, '');
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 10000);
            let res;
            try {
                res = await fetch(`${base}/v1/agent/knowledge-bases`, { headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal });
            }
            finally {
                clearTimeout(timer);
            }
            if (!res.ok)
                return { success: false, error: `HTTP ${res.status}` };
            const json = await res.json();
            const kbs = Array.isArray(json?.data) ? json.data : [];
            return {
                success: true,
                data: kbs.map((k) => ({ ref: `@wf/${k.id}`, name: k.name, docs: Array.isArray(k.documents) ? k.documents.length : 0, scope: 'workflow' })),
            };
        }
        catch (e) {
            return { success: false, error: e?.name === 'AbortError' ? '连接 Fireflow 超时' : (e?.message || String(e)) };
        }
    });
    // 回复记录：复用 ConversationStore 的跨会话聚合（与主 agent 的 agent_records 技能同源）
    replaceWindowIpcHandler('agents:records', async (_, opts) => {
        try {
            const sinceMs = opts?.sinceHours ? Date.now() - opts.sinceHours * 3600000 : undefined;
            const turns = recordsStore().queryTurns({
                profileId: opts?.profileId,
                sessionId: typeof opts?.sessionId === 'string' && opts.sessionId ? opts.sessionId : undefined,
                action: opts?.action,
                sinceMs,
                limit: Math.min(opts?.limit || 40, 100), // 硬上限 100 条，避免大量历史拖慢加载
            });
            return { success: true, data: turns };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    });
    // 会话筛选项：扫描完整回复历史并只返回名称/计数，不受回复列表 100 条上限影响。
    ipcMain.handle('agents:record-conversations', async (_, opts) => {
        try {
            const profileId = typeof opts?.profileId === 'string' ? opts.profileId.trim() : '';
            if (profileId && !AGENT_NAME_RE.test(profileId))
                return { success: false, error: '智能体标识无效' };
            return { success: true, data: recordsStore().listConversations(profileId || undefined) };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    });
    // 只清空子 Agent 本地上下文；RPA 自己保存的微信聊天记录和调用审计记录均不改动。
    replaceWindowIpcHandler('agents:clear-contexts', async (_, opts) => {
        try {
            const profileId = String(opts?.profileId || '').trim();
            if (!AGENT_NAME_RE.test(profileId))
                return { success: false, error: '智能体标识无效' };
            const store = agentContextStore();
            const targets = store.list({ profileId })
                .filter(row => row.key.source !== 'desktop-agent-preview');
            let messages = 0;
            for (const target of targets)
                messages += store.clear(target.key).clearedMessages;
            return { success: true, data: { conversations: targets.length, messages } };
        }
        catch (e) {
            return { success: false, error: e?.message || String(e) };
        }
    });
    // 本地 trace 静默上报。渲染进程只递交「哪一轮」，日志内容全程留在主进程，
    // 不经渲染层——与下面 agents:record-trace 那条「绝不暴露 .log」的约束保持一致。
    //
    // 永远 resolve、永不 reject、不打印任何日志：上报是旁路，
    // 它的任何异常都不该出现在用户面前，也不该让渲染进程感知到。
    replaceWindowIpcHandler('trace:report', async (_, args) => {
        try {
            const { messageId, sessionId, token, channelId } = args || {};
            if (typeof messageId !== 'string' || typeof token !== 'string')
                return { ok: false };
            await reportTrace({
                tracesDir: path.join(app.getPath('userData'), 'logs', 'traces'),
                apiBase: process.env.REMOTE_SERVER_URL || '',
                token,
                channelId: typeof channelId === 'string' && channelId ? channelId : (process.env.CHANNEL_ID || 'official'),
                clientVersion: app.getVersion(),
            }, { messageId, sessionId: typeof sessionId === 'string' ? sessionId : '' });
        }
        catch { /* 静默 */ }
        return { ok: true };
    });
    // 未收尾轮次的本地账本。渲染进程只递交「哪一轮、什么时候」，
    // fs 全部在主进程 —— userData 的权威路径只有这里知道，
    // 而且渲染进程不碰 fs 是既有约束。
    //
    // 一次 writeFileSync 几十字节，永远 resolve、不打印任何日志。
    replaceWindowIpcHandler('trace:open', async (_, args) => {
        try {
            const { traceId, sessionId, origin, submittedAt, startedAt } = args || {};
            if (typeof traceId !== 'string' || !traceId)
                return { ok: false };
            markTurnOpen(app.getPath('userData'), {
                traceId,
                ...(typeof sessionId === 'string' ? { sessionId } : {}),
                ...(typeof origin === 'string' ? { origin } : {}),
                ...(typeof submittedAt === 'number' ? { submittedAt } : {}),
                ...(typeof startedAt === 'number' ? { startedAt } : {}),
                clientVersion: app.getVersion(),
            });
        }
        catch { /* 静默 */ }
        return { ok: true };
    });
    replaceWindowIpcHandler('trace:close', async (_, args) => {
        try {
            const { traceId } = args || {};
            if (typeof traceId === 'string' && traceId)
                markTurnClosed(app.getPath('userData'), traceId);
        }
        catch { /* 静默 */ }
        return { ok: true };
    });
    /**
     * 补报上次没收尾的轮次。
     *
     * 由渲染进程在启动 30 秒后敲一次：token 只存在于渲染进程的 localStorage，
     * 主进程拿不到；而且开机瞬间网络多半还没就绪，等一会儿再报命中率高得多。
     *
     * 限流由 claimStaleTurns 承担（一次最多 20 条、按时间倒序取最近的），
     * 用户长期离线后开机不会一次性打上百个请求。
     * 处理完无论成败都销账 —— 这条链不做重试队列，与既有约定一致。
     */
    replaceWindowIpcHandler('trace:sweep', async (_, args) => {
        let handled = 0;
        try {
            const { token, channelId } = args || {};
            const apiBase = process.env.REMOTE_SERVER_URL || '';
            if (typeof token !== 'string' || !token || !apiBase)
                return { ok: false, handled };
            const root = app.getPath('userData');
            const chan = typeof channelId === 'string' && channelId ? channelId : (process.env.CHANNEL_ID || 'official');
            const claimed = claimStaleTurns(root, {
                // 5 分钟保险。有单实例锁，启动时不可能有上一次的轮次还在跑；
                // 这个阈值防的是时钟异常与「刚提交就重启」的边角情况。
                olderThanMs: 5 * 60 * 1000,
                limit: 20,
            });
            for (const c of claimed) {
                try {
                    // 先确保有行再谈其它。agent 那些在提问时就建好了行（这一步会被
                    // 唯一索引挡下并静默忽略）；渠道 / cron 的行却是建在 finally 里的——
                    // 崩在半路时那段没执行过，库里没有行，后面两步就都是空更新。
                    await ensureQuestionRow(
                    // clientVersion 取【账本里记的那个】，不是当前版本：这一轮跑在旧版本上，
                    // 补报时可能已经升级过了。P4 的版本维度分析靠这一列，写错会把
                    // 老版本的问题算到新版本头上。
                    { apiBase, token, channelId: chan, clientVersion: c.record.clientVersion }, {
                        messageId: c.record.traceId,
                        sessionId: c.record.sessionId,
                        origin: c.record.origin,
                        content: c.record.label || '',
                    });
                    // 再写结局，最后传日志。结局那次请求更小、更可能成功，
                    // 先发它可以在弱网下至少保住「这一轮没收尾」这个事实。
                    // 账本有残留 ≠ 这一轮没跑完。日志尾部有 Run End 就说明 kernel 收过尾，
                    // 那只是客户端漏了销账——补传日志即可，绝不能打 unfinished，
                    // 否则真正卡死的那几条会被噪音淹掉（2026-09-07 复盘）。
                    const completed = traceLooksCompleted(path.join(root, 'logs', 'traces'), c.record.traceId);
                    if (!completed) {
                        await reportOutcome({ apiBase, token, channelId: chan }, {
                            messageId: c.record.traceId,
                            outcome: outcomeForRecord(c.record),
                            detail: detailForRecord(c.record),
                        });
                    }
                    await reportTrace({
                        tracesDir: path.join(root, 'logs', 'traces'),
                        apiBase,
                        token,
                        channelId: chan,
                        clientVersion: app.getVersion(),
                    }, { messageId: c.record.traceId, sessionId: c.record.sessionId });
                    handled++;
                }
                catch { /* 静默：单条失败不影响其余 */ }
                finally {
                    releaseClaim(c.claimPath);
                }
            }
        }
        catch { /* 静默 */ }
        return { ok: true, handled };
    });
    // 单条记录的执行过程 trace：读结构化事件（data/traces/<UTC日>/<traceId>.jsonl）。
    // 只暴露这份截断过的结构化 trace，绝不暴露 logs/traces/*.log（含完整 system prompt/payload）。
    replaceWindowIpcHandler('agents:record-trace', async (_, { traceId, ts }) => {
        try {
            if (typeof traceId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(traceId)) {
                return { success: false, error: '非法 traceId' };
            }
            const base = path.join(app.getPath('userData'), 'data', 'traces');
            // 文件夹按 UTC 日期命名；用记录 ts 反推，跨零点兜底查相邻两日。
            const anchor = typeof ts === 'number' ? new Date(ts) : new Date();
            let file = '';
            for (const off of [0, -1, 1]) {
                const day = new Date(anchor.getTime() + off * 86400000).toISOString().slice(0, 10);
                const p = path.join(base, day, `${traceId}.jsonl`);
                if (fs.existsSync(p)) {
                    file = p;
                    break;
                }
            }
            if (!file)
                return { success: true, data: { events: [], missing: true } };
            const events = fs.readFileSync(file, 'utf-8').split(/\r?\n/).filter(Boolean)
                .map(l => { try {
                return JSON.parse(l);
            }
            catch {
                return null;
            } })
                .filter(Boolean);
            return { success: true, data: { events } };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    });
    // ===== 接入微信RPA =====
    // agents.json 只是**候选池**：写进去 agentic agent 才能在微信RPA 界面里被选到，但没有任何功能
    // 会因此改用它。真正生效的是 AI助理的 agentId（reply_strategy_v2.staffList[i]）和朋友圈评论的
    // agentId（sop_cache.commentConfig）。历史上这里只写池子，用户点完"接入"以为就生效了，是最常见
    // 的困惑来源；现在按用户勾选的 scenes 一并把功能配好。
    const RPA_DIR = () => path.join(os.homedir(), '.yokowebot');
    const RPA_AGENTS = () => path.join(RPA_DIR(), 'agents.json');
    const RPA_SOP_CACHE = () => path.join(RPA_DIR(), 'sop_cache.json');
    const AGENT_API_URL = () => `http://127.0.0.1:${process.env.PORT || '3000'}`;
    const readLegacyRpaAgents = () => {
        const p = RPA_AGENTS();
        if (!fs.existsSync(p))
            return { list: [], raw: { agents: [] } };
        const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
        return { list: Array.isArray(raw?.agents) ? raw.agents : [], raw: (raw && typeof raw === 'object') ? raw : { agents: [] } };
    };
    const isSameAgentic = (a, id) => a?.platform === 'agentic' && (a?.botId === id || a?.id === id);
    const readJson = (p, fallback) => {
        try {
            return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : fallback;
        }
        catch {
            return fallback;
        }
    };
    const readMacRpaConfig = async (configType, accountId) => unwrapRpaApplicationData(await executeMacOSControlConfigJson({
        configType,
        method: 'GET',
        ...(accountId ? { accountId } : {}),
    }));
    const writeMacRpaConfig = async (configType, body, accountId) => executeMacOSControlConfigJson({
        configType,
        method: 'POST',
        body,
        ...(accountId ? { accountId } : {}),
    });
    const readRpaAgents = async () => {
        if (process.platform !== 'darwin')
            return readLegacyRpaAgents();
        const data = await readMacRpaConfig('agents');
        const list = Array.isArray(data) ? data : (Array.isArray(data?.agents) ? data.agents : []);
        return { list, raw: { agents: list } };
    };
    const writeRpaAgents = async (list, raw) => {
        if (process.platform === 'darwin')
            return writeMacRpaConfig('agents', { agents: list });
        const p = RPA_AGENTS();
        if (fs.existsSync(p))
            await fs.promises.copyFile(p, `${p}.bak.${Date.now()}`);
        raw.agents = list;
        await fs.promises.mkdir(RPA_DIR(), { recursive: true });
        await fs.promises.writeFile(p, JSON.stringify(raw, null, 2), 'utf-8');
        return null;
    };
    const readRpaStrategy = async (accountId) => process.platform === 'darwin'
        ? ((await readMacRpaConfig('reply_strategy_v2', accountId)) || {})
        : readJson(path.join(RPA_DIR(), accountId, 'reply_strategy_v2.json'), {});
    const writeRpaStrategy = async (accountId, strategy) => {
        if (process.platform === 'darwin') {
            await writeMacRpaConfig('reply_strategy_v2', strategy, accountId);
            return;
        }
        const strategyPath = path.join(RPA_DIR(), accountId, 'reply_strategy_v2.json');
        await fs.promises.copyFile(strategyPath, `${strategyPath}.bak.${Date.now()}`);
        await fs.promises.writeFile(strategyPath, JSON.stringify(strategy, null, 2), 'utf-8');
    };
    const readRpaSopCache = async () => process.platform === 'darwin'
        ? ((await readMacRpaConfig('sop_cache')) || {})
        : readJson(RPA_SOP_CACHE(), {});
    const writeRpaSopCache = async (cache) => {
        if (process.platform === 'darwin') {
            await writeMacRpaConfig('sop_cache', cache);
            return;
        }
        const cachePath = RPA_SOP_CACHE();
        if (fs.existsSync(cachePath))
            await fs.promises.copyFile(cachePath, `${cachePath}.bak.${Date.now()}`);
        await fs.promises.writeFile(cachePath, JSON.stringify(cache, null, 2), 'utf-8');
    };
    const rpaAgentName = (list, botId) => (botId && list.find(a => a?.botId === botId || a?.id === botId)?.name) || (botId ? `未登记(${botId})` : '未绑定');
    // reply_strategy_v2 是**按微信账号隔离**的（~/.yokowebot/<account_id>/），写错账号 = 静默失败
    // （配了却没人读）。账号目录会为历史登录过的号一直留着，光数目录必然歧义，所以优先问 RPA
    // 要"当前活跃实例"；服务没起来时才退回"恰好一个目录"的保守判断，仍然歧义就不猜、交给用户。
    const rpaAccountDirs = () => {
        if (!fs.existsSync(RPA_DIR()))
            return [];
        return fs.readdirSync(RPA_DIR(), { withFileTypes: true })
            .filter(d => d.isDirectory() && d.name !== 'file_cache')
            .map(d => d.name)
            .filter(n => fs.existsSync(path.join(RPA_DIR(), n, 'reply_strategy_v2.json')));
    };
    const resolveRpaAccount = async () => {
        if (process.platform === 'darwin') {
            try {
                const data = await executeMacOSControlJson({ path: '/api/instances/active', method: 'GET' });
                const list = Array.isArray(data?.instances) ? data.instances : [];
                const active = list.find(i => i?.is_active) || list[0];
                if (active?.account_id)
                    return { accountId: active.account_id };
                return { accountId: null, reason: '微信 BOT 里没有已登录的微信，先登录再来配置' };
            }
            catch {
                return { accountId: null, reason: 'macOS 微信 BOT 本地服务暂不可用，请先重新检查连接' };
            }
        }
        try {
            const base = await discoverRpaHttpUrl();
            if (base) {
                const r = await axios.get(`${base}/api/instances/active`, {
                    headers: { 'X-API-Key': 'yoko_test' }, timeout: 4000,
                });
                const list = Array.isArray(r.data?.instances) ? r.data.instances : [];
                const active = list.find(i => i?.is_active) || list[0];
                if (active?.account_id)
                    return { accountId: active.account_id };
                return { accountId: null, reason: '微信 BOT 里没有已登录的微信，先登录再来配置' };
            }
        }
        catch { /* 服务没起来 / 接口变了，走下面的目录兜底 */ }
        const dirs = rpaAccountDirs();
        if (dirs.length === 1)
            return { accountId: dirs[0] };
        return {
            accountId: null,
            reason: dirs.length === 0
                ? '还没有配置过的微信账号，先在微信 BOT 里登录并配置一次'
                : `微信 BOT 没在运行，判断不了当前是哪个微信号（本机有 ${dirs.length} 个），请先启动它`,
        };
    };
    /** 定位要改的那条 AI助理：账号唯一 + 非 monitorOnly 的助理唯一时才敢动，否则如实说明原因。 */
    const locateStaff = async () => {
        const { accountId, reason } = await resolveRpaAccount();
        if (!accountId)
            return { blocked: reason };
        const strategy = await readRpaStrategy(accountId);
        const staffList = Array.isArray(strategy?.staffList) ? strategy.staffList : [];
        const hits = staffList.map((s, i) => ({ s, i })).filter(x => x.s?.monitorOnly !== true);
        if (hits.length > 1)
            return { blocked: `有 ${hits.length} 个 AI助理，请在微信 BOT 里指派，或让 ${getBrandName()} 帮你配` };
        return { accountId, index: hits.length === 1 ? hits[0].i : null, strategy };
    };
    replaceWindowIpcHandler('agents:rpa-status', async (_, { profileId }) => {
        try {
            if (process.platform !== 'darwin' && !fs.existsSync(RPA_DIR())) {
                return { success: true, installed: false, bound: false };
            }
            const { list } = await readRpaAgents();
            const bound = list.some(a => isSameAgentic(a, profileId));
            // 顺带把两个功能位当前用的是谁读出来，勾选框直接显示"当前：X"，
            // 省掉一次单独的预览请求，也让"会换掉谁"一眼可见。
            const loc = await locateStaff();
            const reply = 'blocked' in loc
                ? { blocked: loc.blocked }
                : (() => {
                    const s = loc.index === null ? null : loc.strategy?.staffList?.[loc.index];
                    return { current: s ? rpaAgentName(list, s.agentId) : null, staffName: s?.name || null };
                })();
            const momentAgentId = (await readRpaSopCache())?.commentConfig?.agentId;
            return {
                success: true, installed: true, bound, reply,
                moment: { current: momentAgentId ? rpaAgentName(list, momentAgentId) : null },
            };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    });
    replaceWindowIpcHandler('agents:bind-rpa', async (_, { profileId, displayName, scenes }) => {
        try {
            if (!AGENT_NAME_RE.test(profileId || ''))
                return { success: false, error: '非法的智能体标识' };
            if (process.platform !== 'darwin' && !fs.existsSync(RPA_DIR())) {
                return { success: false, error: '未检测到微信 BOT（未安装或未初始化）' };
            }
            const wanted = Array.isArray(scenes) ? scenes.filter((s) => s === 'reply' || s === 'moment') : [];
            const label = `${displayName || profileId}(Agent)`;
            const applied = [];
            const { list, raw } = await readRpaAgents();
            const entry = { name: label, id: profileId, botId: profileId, platform: 'agentic', apiUrl: AGENT_API_URL(), apiToken: '' };
            const idx = list.findIndex(a => a?.botId === profileId || a?.id === profileId);
            if (idx >= 0)
                list[idx] = { ...list[idx], ...entry };
            else
                list.push(entry);
            await writeRpaAgents(list, raw);
            applied.push(`已登记「${label}」`);
            if (wanted.includes('reply')) {
                const loc = await locateStaff();
                if ('blocked' in loc) {
                    applied.push(`自动回复未配置：${loc.blocked}`);
                }
                else {
                    const strategy = loc.strategy;
                    const staffList = Array.isArray(strategy?.staffList) ? [...strategy.staffList] : [];
                    if (loc.index === null) {
                        // 字段与 auto_config_sop 的默认助理一致。
                        staffList.push({ id: String(Date.now()), name: `${label} 助理`, enabled: true, agentId: profileId, chatType: 'all', selectedTags: [], keywords: [] });
                        applied.push('已新建 AI助理并绑到它');
                    }
                    else {
                        staffList[loc.index] = { ...staffList[loc.index], agentId: profileId };
                        applied.push(`AI助理「${staffList[loc.index].name || ''}」已改用它${staffList[loc.index].enabled === true ? '' : '（该助理是停用状态，需在微信 BOT 里启用）'}`);
                    }
                    await writeRpaStrategy(loc.accountId, { ...strategy, staffList });
                }
            }
            if (wanted.includes('moment')) {
                // 朋友圈只改配置：正在跑的任务是调度器里的活对象，改文件动不了它。
                const cache = await readRpaSopCache();
                const commentConfig = { ...(cache?.commentConfig || {}), agentId: profileId };
                await writeRpaSopCache({ ...cache, commentConfig });
                applied.push('AI朋友圈下次开启时会用它（正在跑的话需关掉再开）');
            }
            return { success: true, applied };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    });
    replaceWindowIpcHandler('agents:unbind-rpa', async (_, { profileId }) => {
        try {
            if (process.platform !== 'darwin' && !fs.existsSync(RPA_AGENTS()))
                return { success: true };
            const { list, raw } = await readRpaAgents();
            await writeRpaAgents(list.filter(a => !isSameAgentic(a, profileId)), raw);
            return { success: true };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    });
    // 在文件管理器中定位一个工具产物。
    //
    // 产物路径最终源自模型可影响的工具输出，所以这里必须自证边界：解析符号链接后，
    // 只允许 workspace 之内的路径。否则一段被诱导生成的内容就能让用户一键打开
    // 任意位置的文件。
    replaceWindowIpcHandler('reveal-artifact', async (_event, target) => {
        if (typeof target !== 'string' || !target)
            return { success: false, error: 'invalid path' };
        try {
            // 先 realpath 再判断包含关系：符号链接可以让一个"看起来在 workspace 里"的路径
            // 指向任意位置。
            const workspace = await fs.promises.realpath(getWorkspacePath());
            const resolved = await fs.promises.realpath(path.resolve(target));
            if (!isInsideDir(workspace, resolved)) {
                console.warn(`[Main] reveal-artifact denied (outside workspace): ${resolved}`);
                return { success: false, error: 'path outside workspace' };
            }
            shell.showItemInFolder(resolved);
            return { success: true };
        }
        catch (e) {
            console.error('[Main] reveal-artifact failed', e);
            return { success: false, error: e.message };
        }
    });
    replaceWindowIpcListener('open-workspace', async () => {
        const workspacePath = getWorkspacePath();
        console.log(`[Main] Opening workspace: ${workspacePath}`);
        // Ensure workspace directory exists
        if (!fs.existsSync(workspacePath)) {
            try {
                await fs.promises.mkdir(workspacePath, { recursive: true });
            }
            catch (e) {
                console.error(`[Main] Failed to create workspace directory: ${e}`);
                // Fallback to project root
                shell.openPath(projectRoot);
                return;
            }
        }
        const error = await shell.openPath(workspacePath);
        if (error) {
            console.error(`[Main] Failed to open workspace: ${error}`);
        }
    });
    // Logs IPC
    replaceWindowIpcHandler('logs:get-recent', async () => {
        return { logs: LogManager.getInstance().getRecentLogs() };
    });
    // 渲染进程的 ErrorBoundary / window.onerror / unhandledrejection 上报。
    // 走 IPC 而不是只靠 console-message，是因为这条路径带得动完整堆栈和组件栈。
    replaceWindowIpcListener('renderer-error', (_event, payload) => {
        const source = String(payload?.source || 'unknown');
        const message = String(payload?.message || '(empty)');
        console.error(`[Renderer] ${source}
${message}`);
    });
    // MUST match the scheduler store path (src/scheduler/store.ts STORE_FILE),
    // which is `${USER_DATA_PATH || cwd}/data/tasks.json`. The server child always runs
    // with USER_DATA_PATH = app.getPath('userData'), so the store lives under userData.
    // Using `projectRoot` here diverges in DEV (projectRoot = cwd, not userData), causing
    // the UI to read a stale/empty file while the agent's jobs land under userData.
    const TASKS_FILE = path.join(app.getPath('userData'), 'data', 'tasks.json');
    replaceWindowIpcHandler('get-cron-tasks', async () => {
        // console.log('[Main] get-cron-tasks called');
        // console.log(`[Main] Project Root derived: ${projectRoot}`);
        // console.log(`[Main] TASKS_FILE path: ${TASKS_FILE}`);
        try {
            if (fs.existsSync(TASKS_FILE)) {
                const data = readTaskStoreFile(TASKS_FILE);
                // console.log(`[Main] Found ${data.jobs?.length || 0} tasks.`);
                return data.jobs || [];
            }
            else {
                console.warn('[Main] TASKS_FILE does not exist at path');
            }
            return [];
        }
        catch (e) {
            console.error('[Main] Failed to read tasks:', e);
            return [];
        }
    });
    // 定时任务执行记录。路径口径必须与 scheduler/runs_store.ts 的 RUNS_DIR 一致
    // (`${USER_DATA_PATH || cwd}/data/cron_runs`)，server 子进程恒以
    // USER_DATA_PATH = app.getPath('userData') 启动 —— 这里若用 projectRoot，
    // DEV 下就会读到空目录而 UI 一片空白（tasks.json 踩过同样的坑）。
    const CRON_RUNS_DIR = path.join(app.getPath('userData'), 'data', 'cron_runs');
    const readRunsFromDisk = async (jobId, limit) => {
        const file = path.join(CRON_RUNS_DIR, `${String(jobId).replace(/[^a-zA-Z0-9_-]/g, '_')}.jsonl`);
        if (!fs.existsSync(file))
            return [];
        const content = await fs.promises.readFile(file, 'utf-8');
        const runs = [];
        for (const line of content.split('\n')) {
            if (!line.trim())
                continue;
            // 单行损坏不该让整页空白：跳过坏行，尽可能多地展示。
            try {
                runs.push(JSON.parse(line));
            }
            catch { /* skip */ }
        }
        runs.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
        return runs.slice(0, Math.max(1, limit));
    };
    /** 单个任务的执行记录（详情抽屉用）。 */
    replaceWindowIpcHandler('get-cron-runs', async (_, jobId, limit = 30) => {
        try {
            return await readRunsFromDisk(jobId, limit);
        }
        catch (e) {
            console.error('[Main] Failed to read cron runs:', e);
            return [];
        }
    });
    /**
     * 全部任务的近期记录，按 jobId 聚合。
     * 列表页要画"最近 N 次"稳定性时间线和"近 7 天消耗"，逐个任务发 IPC 太碎。
     */
    replaceWindowIpcHandler('get-cron-runs-summary', async (_, perJob = 10) => {
        try {
            if (!fs.existsSync(CRON_RUNS_DIR))
                return {};
            const out = {};
            for (const name of await fs.promises.readdir(CRON_RUNS_DIR)) {
                if (!name.endsWith('.jsonl'))
                    continue;
                const jobId = name.slice(0, -'.jsonl'.length);
                const file = path.join(CRON_RUNS_DIR, `${String(jobId).replace(/[^a-zA-Z0-9_-]/g, '_')}.jsonl`);
                if (!fs.existsSync(file))
                    continue;
                const content = await fs.promises.readFile(file, 'utf-8');
                const ticks = [];
                let total = 0;
                let failed = 0;
                for (const line of content.split('\n')) {
                    if (!line.trim())
                        continue;
                    try {
                        const r = JSON.parse(line);
                        total += 1;
                        if (r.status === 'error' || r.status === 'timeout')
                            failed += 1;
                        ticks.push({
                            runId: r.runId,
                            startedAt: r.startedAt,
                            status: r.status,
                            durationMs: r.durationMs,
                            points: r.usage?.points || 0,
                        });
                    }
                    catch { }
                }
                ticks.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
                out[jobId] = { ticks: ticks.slice(0, Math.max(1, perJob)), total, failed };
            }
            return out;
        }
        catch (e) {
            console.error('[Main] Failed to summarize cron runs:', e);
            return {};
        }
    });
    /**
     * 暂停 / 恢复定时任务。
     *
     * 与 delete 的关键区别：**执行记录一行不动**。此前想让循环任务停下来只能删除它，
     * 而删除之后这个任务的历史记录就再也没有入口能查了 ——「先停一下」和「不要了」
     * 被迫共用一个动作，代价是丢掉排查依据。
     *
     * 与 delete 一样保持单写者：server 在线时由运行中的 scheduler 原子落盘并摘掉
     * 定时器，Electron 只等待确认；server 不在线时才直接修改文件。
     */
    replaceWindowIpcHandler('set-cron-task-enabled', async (_, jobId, enabled, expectedRevision) => {
        try {
            // ⚠️ tasks.json 有且只有一个写者。
            //
            // 第一版这里是"发 IPC + 自己也写一遍文件"（照抄 delete 的双写），结果是：
            // server 收到信号后 store.update → save() 正在重写整个文件，main 同时读它，
            // 读到写了一半的内容 → `SyntaxError: Unexpected end of JSON input`。
            // 而且就算不撞车，main 写完也会被 server 内存里的副本覆盖掉 —— 双写从来
            // 就没有意义，只是把竞态引进来了。
            //
            // server 活着 → 只发带确认的请求，由它写；server 不在 → main 兜底直接改文件。
            if (serverProcess && serverProcess.connected) {
                return sendServerRequest('scheduler:set-enabled', 'scheduler:set-enabled:done', { jobId, enabled: !!enabled, expectedRevision }, 15_000);
            }
            if (!fs.existsSync(TASKS_FILE))
                return { success: false, error: 'File not found' };
            if (!setTaskEnabledInFile(TASKS_FILE, jobId, !!enabled, expectedRevision)) {
                return { success: false, error: 'Job not found' };
            }
            return { success: true, enabled: !!enabled };
        }
        catch (e) {
            console.error('[Main] Failed to toggle task:', e);
            return { success: false, error: String(e) };
        }
    });
    replaceWindowIpcHandler('update-cron-task', async (_, jobId, patch, expectedRevision) => {
        try {
            const safePatch = {
                payload: String(patch?.payload || '').trim(),
                outputContract: patch?.outputContract,
            };
            if (!safePatch.payload)
                return { success: false, error: 'Payload cannot be empty' };
            if (serverProcess && serverProcess.connected) {
                return sendServerRequest('scheduler:update', 'scheduler:update:done', { jobId, patch: safePatch, expectedRevision }, 15_000);
            }
            if (!fs.existsSync(TASKS_FILE))
                return { success: false, error: 'File not found' };
            const updated = updateTaskInFile(TASKS_FILE, jobId, safePatch, expectedRevision);
            return updated ? { success: true, job: updated } : { success: false, error: 'Job not found' };
        }
        catch (e) {
            console.error('[Main] Failed to update task:', e);
            return { success: false, error: String(e) };
        }
    });
    replaceWindowIpcHandler('delete-cron-task', async (_, jobId, expectedRevision) => {
        try {
            // tasks.json 保持单写者：server 在线时由运行中的 scheduler 停表并落盘，
            // Electron 等待真实确认；只有 server 不在线时才走本地原子写兜底。
            if (serverProcess && serverProcess.connected) {
                console.log(`[Main] Sending scheduler:delete signal for job ${jobId}`);
                return sendServerRequest('scheduler:delete', 'scheduler:delete:done', { jobId, expectedRevision }, 15_000);
            }
            if (!fs.existsSync(TASKS_FILE))
                return { success: false, error: 'File not found' };
            return deleteTaskFromFile(TASKS_FILE, jobId, expectedRevision)
                ? { success: true }
                : { success: false, error: 'Job not found' };
        }
        catch (e) {
            console.error('[Main] Failed to delete task:', e);
            return { success: false, error: String(e) };
        }
    });
    // Image Save IPC
    replaceWindowIpcHandler('save-image', async (_, { filename, buffer }) => {
        try {
            const cacheDir = path.join(projectRoot, 'data', 'images', 'cache');
            await fs.promises.mkdir(cacheDir, { recursive: true });
            const filePath = path.join(cacheDir, filename);
            // If file exists, append timestamp or random string to avoid overwrite? 
            // User didn't specify, but safer to do so. 
            // For MVP, just overwrite or simple name.
            await fs.promises.writeFile(filePath, Buffer.from(buffer));
            console.log(`[Main] Saved image to: ${filePath}`);
            return { success: true, path: filePath };
        }
        catch (e) {
            console.error('[Main] Failed to save image:', e);
            return { success: false, error: String(e) };
        }
    });
    // 关闭行为由配置控制:默认隐藏到托盘保持网关/RPA 运行;关闭该选项则直接退出。
    mainWindow.on('close', (e) => {
        const closeToTray = ConfigManager.getInstance().getSystemConfig().closeToTray !== false;
        if (!isQuitting && closeToTray) {
            e.preventDefault();
            mainWindow?.hide();
            if (!bgHintShown) {
                bgHintShown = true;
                try {
                    tray?.displayBalloon?.({
                        title: `${getBrandName()} 仍在后台运行`,
                        content: `已最小化到托盘,后台仍可随时调用 ${getBrandName()} 的能力。右键托盘图标可退出。`,
                    });
                }
                catch { /* ignore */ }
            }
        }
        else if (!isQuitting) {
            isQuitting = true;
        }
    });
    // 系统托盘(只建一次)
    if (!tray) {
        try {
            if (process.platform === 'darwin') {
                // A macOS template image uses its alpha silhouette. The full-size
                // window logo has an opaque background and renders as a solid square.
                const trayTemplatePath = isDev
                    ? path.join(process.cwd(), 'resources', 'trayIconTemplate.png')
                    : path.join(process.resourcesPath, 'trayIconTemplate.png');
                const trayIcon = nativeImage.createFromPath(trayTemplatePath);
                if (trayIcon.isEmpty())
                    throw new Error(`Failed to load macOS tray icon from ${trayTemplatePath}`);
                trayIcon.setTemplateImage(true);
                tray = new Tray(trayIcon);
            }
            else {
                tray = new Tray(iconPath);
            }
            tray.setToolTip(getBrandName());
            const showWindow = () => {
                if (!mainWindow || mainWindow.isDestroyed()) {
                    createWindow();
                    return;
                }
                if (mainWindow.isMinimized())
                    mainWindow.restore();
                mainWindow.show();
                mainWindow.focus();
            };
            tray.setContextMenu(Menu.buildFromTemplate([
                { label: `显示 ${getBrandName()}`, click: showWindow },
                { type: 'separator' },
                { label: `退出 ${getBrandName()}`, click: () => { isQuitting = true; app.quit(); } },
            ]));
            tray.on('double-click', showWindow);
        }
        catch (e) {
            console.error('[Main] Failed to create tray:', e);
        }
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
async function waitForPortFree(port, maxWaitMs) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
        const isFree = await new Promise((resolve) => {
            const server = nodeNet.createServer();
            server.once('error', () => resolve(false));
            server.once('listening', () => {
                server.close(() => resolve(true));
            });
            server.listen(port);
        });
        if (isFree)
            return true;
        await new Promise(r => setTimeout(r, 500));
    }
    return false;
}
// --- Splash shown while waiting for a previous instance to fully exit ---
function createSplashWindow() {
    const splash = new BrowserWindow({
        width: 340,
        height: 210,
        frame: false,
        resizable: false,
        movable: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        show: true,
        webPreferences: { nodeIntegration: false, contextIsolation: true },
    });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;height:100%;font-family:'Microsoft YaHei',Segoe UI,sans-serif;
      background:#1f2937;color:#e5e7eb;display:flex;flex-direction:column;
      align-items:center;justify-content:center;-webkit-user-select:none;}
    .spinner{width:34px;height:34px;border:3px solid #374151;border-top-color:#3b82f6;
      border-radius:50%;animation:spin .8s linear infinite;margin-bottom:18px;}
    @keyframes spin{to{transform:rotate(360deg);}}
    .title{font-size:15px;font-weight:600;margin-bottom:6px;}
    .msg{font-size:12px;color:#9ca3af;}
  </style></head><body>
    <div class="spinner"></div>
    <div class="title">正在启动</div>
    <div class="msg">正在等待上一个实例退出…</div>
  </body></html>`;
    splash.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    return splash;
}
// Repeatedly try to acquire the single-instance lock. We never release the lock
// manually, so the OS only frees it when the previous instance's process fully
// exits — success here guarantees the old server / service.exe are already gone.
async function waitForSingleInstanceLock(maxWaitMs) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
        await new Promise(r => setTimeout(r, 400));
        if (app.requestSingleInstanceLock())
            return true;
    }
    return false;
}
const HEARTBEAT_MS = 5000;
const STATE_STALE_MS = 15000;
function instanceStateFile() {
    return path.join(app.getPath('userData'), 'instance-state.json');
}
function writeInstanceState(status) {
    try {
        const state = { pid: process.pid, status, ts: Date.now() };
        fs.writeFileSync(instanceStateFile(), JSON.stringify(state));
    }
    catch { /* best-effort */ }
}
function readInstanceState() {
    try {
        return JSON.parse(fs.readFileSync(instanceStateFile(), 'utf-8'));
    }
    catch {
        return null;
    }
}
function clearInstanceState() {
    try {
        fs.unlinkSync(instanceStateFile());
    }
    catch { /* ignore */ }
}
function isPidAlive(pid) {
    if (!pid)
        return false;
    try {
        process.kill(pid, 0); // signal 0 = existence check, kills nothing
        return true;
    }
    catch (e) {
        return e && e.code === 'EPERM'; // exists but owned by another user
    }
}
// Run teardown exactly once; resolves when the server (and its RPA service.exe
// child, killed via taskkill /T) are fully stopped.
function teardown() {
    if (teardownPromise)
        return teardownPromise;
    console.log('[Main] Starting teardown...');
    teardownPromise = Promise.all([
        stopServer(),
        stopMacOSOwnedControl('shutdown'),
    ]).then(() => {
        teardownDone = true;
        console.log('[Main] Teardown complete.');
    });
    return teardownPromise;
}
function requestAppUpdateTestRestart() {
    if (appUpdateTestRestartPromise) {
        reportAppUpdateE2ELifecycle('test-restart-deduplicated');
        return;
    }
    appUpdateTestRestartPromise = executeAppUpdateTestRestartExit({
        markQuitting: () => {
            isQuitting = true;
            if (appUpdateCheckTimer) {
                clearTimeout(appUpdateCheckTimer);
                appUpdateCheckTimer = null;
            }
            clearServerTimers();
            if (heartbeatTimer) {
                clearInterval(heartbeatTimer);
                heartbeatTimer = null;
            }
            writeInstanceState('quitting');
        },
        teardown,
        requestExit: () => app.exit(0),
        report: (event, details) => reportAppUpdateE2ELifecycle(event, details),
    }).catch((error) => {
        reportAppUpdateE2ELifecycle('test-restart-preparation-failed');
        console.error('[AppUpdater:E2E] Graceful next-launch preparation failed:', error);
    });
}
async function runStartup() {
    protocol.handle('local-image', async (request) => {
        try {
            const filePath = decodeURIComponent(new URL(request.url).pathname);
            // Handle Windows path issues if necessary (e.g. remove leading slash)
            let finalPath = filePath;
            if (process.platform === 'win32' && /^\/[a-zA-Z]:/.test(filePath)) {
                finalPath = filePath.slice(1);
            }
            console.log(`[Main] Loading local-image. Original: ${request.url}, Decoded: ${filePath}, Final: ${finalPath}`);
            try {
                // Use fs to read file directly instead of net.fetch/file:// to avoid protocol issues
                const mime = {
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.gif': 'image/gif',
                    '.webp': 'image/webp',
                    '.svg': 'image/svg+xml'
                };
                // Check if file exists
                if (!fs.existsSync(finalPath)) {
                    console.error(`[Main] File not found: ${finalPath}`);
                    return new Response('File not found', { status: 404 });
                }
                const ext = path.extname(finalPath).toLowerCase();
                const contentType = mime[ext] || 'application/octet-stream';
                const data = await fs.promises.readFile(finalPath);
                return new Response(data, {
                    headers: { 'content-type': contentType }
                });
            }
            catch (err) {
                console.error(`[Main] Error reading file: ${finalPath}`, err);
                return new Response('Internal Server Error', { status: 500 });
            }
        }
        catch (e) {
            console.error(`[Main] Failed to load local-image: ${request.url}`, e);
            // Return 404 response to avoid crashing renderer or main process unhandled rejection
            return new Response('File not found', { status: 404 });
        }
    });
    // Fetch the channel policy before the local server exists. This makes the
    // RPA gate effective before its background auto-start path runs. A network
    // failure uses the last-known policy (or fail-open defaults on first launch).
    if (desktopUpdateManager) {
        const installing = await desktopUpdateManager.initializeBeforeServices();
        if (installing) {
            console.log('[Main] Verified update installer started before local services.');
            return;
        }
    }
    console.log('[Main] Checking if port 3000 is free...');
    const isFree = await waitForPortFree(3000, 10000); // Safety net for genuine orphans
    if (!isFree) {
        console.log('[Main] Port 3000 is still occupied. Reclaiming ports owned by this install...');
        await reclaimOwnPorts();
    }
    else {
        console.log('[Main] Port 3000 is free. Proceeding...');
    }
    // 必须早于 startServer()：agent 在 server 子进程里读文档，
    // 陈旧 overlay 的清理要赶在它第一次 read_manual 之前。纯本地操作，不产生网络等待。
    reconcileDocsSync();
    startServer();
    createWindow();
    // 下载走网络，延后到窗口已创建之后，不占启动路径。
    scheduleDocsUpdate();
    // The policy was already fetched for the RPA startup decision. Run the
    // potentially bandwidth-heavy update check only after the real window and
    // local server are available.
    scheduleAppUpdateCheck(10_000);
    // Hand off from the splash window to the real window once it has painted.
    const closeSplash = () => {
        if (splashWindow && !splashWindow.isDestroyed()) {
            try {
                splashWindow.close();
            }
            catch (e) { /* ignore */ }
        }
        splashWindow = null;
    };
    if (mainWindow) {
        mainWindow.once('ready-to-show', closeSplash);
        mainWindow.webContents.once('did-finish-load', closeSplash);
    }
    setTimeout(closeSplash, 8000);
}
// --- yoko:// 自定义协议（Entitlement Bundle 引种入口，见 docs/ENTITLEMENT_BUNDLE.md §8）---
//
// 本地 MCP 工具（yoko-wechat-log 等）发现自己没有权益凭据时，会 ShellExecute
// "yoko://bootstrap?product=xxx" 把 Agent 唤起来要一份。这是两个项目之间**唯一**的耦合点，
// 且是单向、可失败、纯 UX 的：工具不需要知道 Agent 装在哪、什么版本、是否在运行；
// 协议没注册就说明没装，工具那边显示下载引导即可。
//
// 渠道 OEM 打包可用 YOKO_PROTOCOL_SCHEME 换掉 scheme，避免多个白标版本互相抢注册。
const YOKO_PROTOCOL_SCHEME = (process.env.YOKO_PROTOCOL_SCHEME || 'yoko').toLowerCase();
let pendingEntitlementBootstrap = null;
// server 子进程的 IPC 监听是否已就绪。fork 成功 ≠ 能收消息：监听挂在 main() 的
// 若干 await 之后，在那之前发过去的消息会被静默丢弃。
let serverIpcReady = false;
function registerYokoProtocol() {
    try {
        if (process.defaultApp) {
            // 开发模式（electron .）：必须显式带上入口脚本路径，否则写进注册表的命令行缺参数，
            // 协议唤起时拉起来的是一个空壳 Electron。
            if (process.argv.length >= 2) {
                app.setAsDefaultProtocolClient(YOKO_PROTOCOL_SCHEME, process.execPath, [path.resolve(process.argv[1])]);
            }
        }
        else {
            app.setAsDefaultProtocolClient(YOKO_PROTOCOL_SCHEME);
        }
        console.log(`[Main] Registered protocol client: ${YOKO_PROTOCOL_SCHEME}://`);
    }
    catch (e) {
        // 注册失败不影响主流程：只是工具那边的"打开 Agent"按钮点不动，用户仍可手动打开。
        console.warn('[Main] Failed to register protocol client:', e);
    }
}
function sendEntitlementBootstrap(reason) {
    if (serverIpcReady && serverProcess && serverProcess.connected) {
        try {
            serverProcess.send({ type: 'entitlement:sync', reason });
            return;
        }
        catch (e) {
            console.warn('[Main] Failed to forward entitlement bootstrap:', e);
        }
    }
    pendingEntitlementBootstrap = reason;
}
function flushPendingEntitlementBootstrap() {
    if (!pendingEntitlementBootstrap)
        return;
    const reason = pendingEntitlementBootstrap;
    pendingEntitlementBootstrap = null;
    sendEntitlementBootstrap(reason);
}
function handleYokoProtocolUrl(rawUrl) {
    let parsed;
    try {
        parsed = new URL(rawUrl);
    }
    catch {
        return;
    }
    // 目前只支持 yoko://bootstrap?product=<name>
    if ((parsed.hostname || '').toLowerCase() !== 'bootstrap') {
        console.warn(`[Main] Ignoring unknown ${YOKO_PROTOCOL_SCHEME}:// action: ${parsed.hostname}`);
        return;
    }
    // product 来自外部调用方，落日志前先收紧字符集。
    const rawProduct = parsed.searchParams.get('product') || 'unknown';
    const product = /^[a-z0-9_-]{1,32}$/i.test(rawProduct) ? rawProduct : 'invalid';
    console.log(`[Main] Entitlement bootstrap requested by product=${product}`);
    sendEntitlementBootstrap(`protocol:${product}`);
    // 用户可能尚未登录，需要看到登录页，所以把窗口带到前台。
    if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized())
            mainWindow.restore();
        if (!mainWindow.isVisible())
            mainWindow.show();
        mainWindow.focus();
    }
}
function handleYokoProtocolArgv(argv) {
    const prefix = `${YOKO_PROTOCOL_SCHEME}://`;
    const url = (argv || []).find((a) => typeof a === 'string' && a.toLowerCase().startsWith(prefix));
    if (url)
        handleYokoProtocolUrl(url);
}
(async () => {
    await app.whenReady();
    if (appUpdateE2ETestMode) {
        if (!appUpdateE2ELifecyclePath) {
            const localAppData = process.env.LOCALAPPDATA || app.getPath('appData');
            appUpdateE2ELifecyclePath = path.join(localAppData, 'YokoUpdater', 'com.yobot.app.update-test', 'update_test', 'lifecycle.jsonl');
        }
        reportAppUpdateE2ELifecycle('process-start');
    }
    // GPU / utility 子进程崩溃同样会表现成白屏或界面失去响应，而且不属于任何窗口，
    // 只能在 app 层收。
    app.on('child-process-gone', (_event, details) => {
        console.error(`[Electron] 子进程消失 type=${details.type} reason=${details.reason} exitCode=${details.exitCode}`);
    });
    // Become the primary instance. Losing the single-instance lock means another
    // instance holds it — but there are two very different situations:
    //   1) A healthy instance is running (typically minimized to tray). Our failed
    //      lock request already fired its `second-instance` event, which surfaces
    //      its window. We just quit silently — no misleading "waiting" splash.
    //   2) A previous instance is mid-shutdown ("close + immediately relaunch").
    //      It still holds the lock for a moment; wait for it to exit, then start
    //      fresh. This is the only case that warrants the waiting splash.
    if (!app.requestSingleInstanceLock()) {
        const prev = readInstanceState();
        const healthyRunning = !!prev
            && prev.status === 'running'
            && isPidAlive(prev.pid)
            && (Date.now() - prev.ts) < STATE_STALE_MS;
        if (healthyRunning) {
            reportAppUpdateE2ELifecycle('single-instance-running-exit');
            // Case 1: existing instance is alive — it will bring itself to the front.
            console.log('[Main] A running instance was found. Surfacing it and exiting.');
            app.quit();
            return;
        }
        // Case 2: previous instance is shutting down (or its state is stale/unknown).
        console.log('[Main] Previous instance is shutting down. Waiting for it to exit...');
        reportAppUpdateE2ELifecycle('single-instance-wait');
        splashWindow = createSplashWindow();
        const gotLock = await waitForSingleInstanceLock(8000);
        if (!gotLock) {
            console.log('[Main] Timed out waiting for previous instance. Exiting.');
            if (splashWindow && !splashWindow.isDestroyed()) {
                try {
                    splashWindow.close();
                }
                catch (e) { /* ignore */ }
            }
            app.quit();
            return;
        }
        console.log('[Main] Previous instance exited. Lock acquired.');
        reportAppUpdateE2ELifecycle('single-instance-lock-acquired');
    }
    // Migration owns no running services. A successful transaction relaunches so
    // app.setPath(), child env and every singleton agree on the platform root.
    if (await prepareMacOSUserData())
        return;
    // --- We are the primary instance: advertise health + start heartbeat. ---
    writeInstanceState('running');
    heartbeatTimer = setInterval(() => writeInstanceState('running'), HEARTBEAT_MS);
    app.on('quit', () => {
        reportAppUpdateE2ELifecycle('process-quit');
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
        clearInstanceState();
    });
    // --- Primary instance from here on ---
    registerYokoProtocol();
    app.on('second-instance', (_event, argv) => {
        reportAppUpdateE2ELifecycle('second-instance-received');
        if (isQuitting) {
            // Ignore any manual/protocol launch that races teardown. The isolated
            // test coordinator waits for this PID to disappear before it
            // starts the next launch, so it cannot arrive on this path.
            reportAppUpdateE2ELifecycle('second-instance-ignored-during-quit');
            return;
        }
        // A relaunch was attempted while we're already running. Pull ourselves to the
        // front. When minimized to tray the window is hidden (not minimized), so we
        // must show() it — focus() alone is a no-op on a hidden window.
        if (mainWindow && !mainWindow.isDestroyed()) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            if (!mainWindow.isVisible())
                mainWindow.show();
            mainWindow.focus();
        }
        else {
            createWindow();
        }
        // Windows 下自定义协议是以「再启动一次 exe，把 URL 作为参数」的形式送达的，
        // 所以协议处理必须挂在 second-instance 上，而不是 open-url（那是 macOS 的）。
        handleYokoProtocolArgv(argv);
    });
    // macOS：协议通过 open-url 送达。
    app.on('open-url', (event, url) => {
        event.preventDefault();
        handleYokoProtocolUrl(url);
    });
    // 冷启动即由协议拉起（Agent 原本没在运行）：URL 在本进程的 argv 里。
    handleYokoProtocolArgv(process.argv);
    app.on('window-all-closed', () => {
        // 托盘常驻:只有在真正退出时才 quit;否则保持后台运行(窗口只是被隐藏)。
        if (isQuitting) {
            app.quit();
        }
    });
    // Async teardown: hold the quit until the server is fully stopped. The
    // single-instance lock therefore stays held until the process truly exits,
    // which is what prevents a relaunch from racing this instance's shutdown.
    app.on('before-quit', (event) => {
        reportAppUpdateE2ELifecycle('before-quit', { teardownDone });
        isQuitting = true; // 进入真正退出流程,窗口 close 不再拦截为隐藏
        // 给还没收尾的轮次盖上「是用户主动退出的」。
        //
        // 下次开机时：看到 app_quit = 用户在等待回答的过程中关掉了应用；
        // 看不到 = 进程非正常退出（崩溃 / 强杀 / 断电）。两者含义差别很大。
        // ⚠️ 都只是旁证：app_quit 不等于「因为卡死才放弃」，缺失它也不等于「agent 崩溃」。
        //
        // 必须同步执行——异步的话进程可能先退出。每条只是几十字节的读改写、
        // 且函数内部限量 500 个并全程吞异常，不会拖慢退出。
        try {
            stampClosedReason(app.getPath('userData'), 'app_quit');
        }
        catch { /* 静默 */ }
        if (appUpdateCheckTimer) {
            clearTimeout(appUpdateCheckTimer);
            appUpdateCheckTimer = null;
        }
        clearServerTimers(); // 监督器不能在退出过程中把服务又拉起来
        // Mark "quitting" before the lock is released so a relaunch racing our
        // shutdown sees the correct state and waits for us to exit (not surface us).
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
        writeInstanceState('quitting');
        if (teardownDone)
            return;
        event.preventDefault();
        teardown().finally(() => app.quit());
    });
    app.on('activate', () => {
        if (!isQuitting && mainWindow === null) {
            createWindow();
        }
    });
    const allowedFeedHosts = String(process.env.APP_UPDATE_ALLOWED_HOSTS || 'dl.yokoagi.com')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    const allowedPolicyHosts = String(process.env.APP_UPDATE_POLICY_ALLOWED_HOSTS || 'yobot.yokoagi.com')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    const publisherNames = String(process.env.APP_UPDATE_PUBLISHER_NAME || '')
        .split(';')
        .map((item) => item.trim())
        .filter(Boolean);
    desktopUpdateManager = new DesktopUpdateManager({
        channelId: process.env.VITE_CHANNEL_ID || 'agent_generic',
        appId: process.env.VITE_APP_ID || 'com.yobot.app',
        apiBaseUrl: process.env.APP_UPDATE_POLICY_BASE_URL || 'https://yobot.yokoagi.com/api',
        allowedPolicyHosts,
        defaultFeedUrl: process.env.APP_UPDATE_FEED_URL || '',
        allowedFeedHosts,
        trustedManifestKeys: process.env.APP_UPDATE_ED25519_PUBLIC_KEYS || '',
        publisherNames,
        stateBaseDirectory: process.platform === 'darwin'
            ? activeAgentFileLayout.userData
            : undefined,
        macOSStagingRoot: process.platform === 'darwin'
            ? path.join(activeAgentFileLayout.cacheDir, 'app-update-staging')
            : undefined,
        minimumOsVersion: process.platform === 'darwin' ? '13.0' : undefined,
        signingIdentity: process.platform === 'darwin' ? '2M27ML4PY2' : undefined,
        onStateChange: (snapshot) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('app:update-state-changed', snapshot);
            }
        },
        onPolicyChange: () => {
            if (serverProcess?.connected && desktopUpdateManager) {
                serverProcess.send({ type: 'rpa:update-policy', policy: desktopUpdateManager.getRpaEnvironment() });
            }
        },
        onLifecycleEvent: appUpdateE2ETestMode
            ? (event, details) => reportAppUpdateE2ELifecycle(event, details)
            : undefined,
        onUpdateReady: appUpdateE2ETestMode ? () => {
            // The disposable Sandbox E2E exercises the real next-launch path without
            // UI automation: the first launch downloads and exits after teardown;
            // the independent guest coordinator confirms this PID is gone and starts
            // the exact installed executable once. The second launch verifies policy
            // and signature again, then starts NSIS before local services. Formal
            // channel builds cannot carry the E2E marker.
            console.log('[AppUpdater:E2E] Update ready; exiting for coordinated next-launch installation.');
            reportAppUpdateE2ELifecycle('ready-callback');
            setTimeout(() => {
                if (isQuitting)
                    return;
                requestAppUpdateTestRestart();
            }, 750);
        } : undefined,
        beforeInstall: async () => {
            const shouldRestartServerOnFailure = Boolean(serverProcess);
            await teardown();
            return () => {
                // The installer did not start, so this Electron instance will remain
                // alive. Re-arm normal teardown and restore services for the user.
                teardownPromise = null;
                teardownDone = false;
                if (shouldRestartServerOnFailure && !isQuitting && !serverProcess)
                    startServer();
            };
        },
    });
    initializeMacOSPluginComposition();
    await runStartup();
})();
/**
 * 本安装拥有的目录。端口回收只终结可执行文件落在这些目录下的进程。
 *
 * - 安装目录：主进程、渲染进程、server 子进程（fork 用的就是本 exe）都在这里
 * - userData/bin：RPA service.exe 等按插件方式下发的伴生程序
 * - 开发态下的 cwd：dev 跑的是 node_modules/electron 里的 exe，另算
 */
function ownedProcessRoots() {
    const roots = [
        path.dirname(process.execPath),
        path.join(app.getPath('userData'), 'bin'),
    ];
    if (process.env.NODE_ENV === 'development')
        roots.push(process.cwd());
    return roots;
}
/**
 * 启动时回收被占用的端口。
 *
 * 旧实现是「谁占着 3000/9922 就 taskkill 谁」，唯一护栏是 `pid !== process.pid`——
 * 而监听端口的是 server **子进程**，PID 和主进程本来就不同。结果这段代码会把另一个
 * 健康实例的 server 子进程连同它的子树一起杀掉，那个实例的窗口却毫发无损，表现就是
 * 「客户端还在、服务层没了」。关闭路径（stopServer）早就改成按 PID 精确杀并留了注释，
 * 启动路径一直没跟上，这里补齐。
 *
 * 同理去掉了 `taskkill /F /IM service.exe /T`：service.exe 是个极其通用的名字，
 * 按名字杀是对整台机器无差别开火。
 */
async function reclaimOwnPorts() {
    const roots = ownedProcessRoots();
    const probe = createSystemProbe();
    for (const port of [3000, 9922]) {
        try {
            const result = await reclaimPort(port, roots, probe);
            const summary = describeReclaim(result);
            if (result.freed) {
                console.log(`[Main] ${summary}`);
            }
            else {
                // 端口没腾出来不是可以忽略的情况：server 接下来会 EADDRINUSE。
                // 与其静默杀掉别人的程序，不如把占用者是谁如实记下来。
                console.error(`[Main] ${summary}`);
            }
        }
        catch (e) {
            console.error(`[Main] 回收端口 ${port} 时出错:`, e);
        }
    }
    // 开发态特例：dev 的 RPA 是「系统 python 跑 server.py」，可执行文件是解释器本身，
    // 不在本安装目录下，按 exe 路径判归属必然失败。命令行里带 server.py 已经足够特指，
    // 且只在开发机上生效，不影响用户环境。
    if (process.env.NODE_ENV === 'development' && process.platform === 'win32') {
        try {
            const psCmd = `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*server.py*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`;
            execSync(`"${getPowerShellPath()}" -NoProfile -Command "${psCmd}"`, { stdio: 'ignore' });
        }
        catch (e) {
            // 没有匹配进程时 PowerShell 也会非零退出，忽略。
        }
    }
}
