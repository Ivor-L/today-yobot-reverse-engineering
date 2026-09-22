import os from 'node:os';
import path from 'node:path';
export const DEFAULT_MACOS_APP_NAME = 'YoBot';
export const DEFAULT_MACOS_APP_ID = 'com.yobot.app';
export const LEGACY_AGENT_DIRECTORY = '.yokoagent';
export const AGENT_USER_DATA_ENV = 'USER_DATA_PATH';
export const AGENT_CACHE_DIR_ENV = 'YOKO_AGENT_CACHE_PATH';
export const AGENT_LOGS_DIR_ENV = 'YOKO_AGENT_LOGS_PATH';
function requireAbsolutePath(value, field, pathApi) {
    const trimmed = value.trim();
    if (!trimmed || trimmed.includes('\0') || !pathApi.isAbsolute(trimmed)) {
        throw new Error(`${field} must be an absolute path`);
    }
    return pathApi.normalize(trimmed);
}
function requirePathSegment(value, field) {
    const trimmed = value.trim();
    if (!trimmed
        || trimmed === '.'
        || trimmed === '..'
        || trimmed.includes('\0')
        || trimmed.includes('/')
        || trimmed.includes('\\')) {
        throw new Error(`${field} must be a single path segment`);
    }
    return trimmed;
}
/**
 * Resolves paths without touching the filesystem. Explicit roots make tests,
 * migration staging and child-process injection deterministic.
 */
export function resolveAgentFileLayout(options = {}) {
    const platform = options.platform ?? process.platform;
    const pathApi = platform === 'win32' ? path.win32 : path.posix;
    const userHome = requireAbsolutePath(options.userHome ?? os.homedir(), 'userHome', pathApi);
    const legacyUserData = pathApi.join(userHome, LEGACY_AGENT_DIRECTORY);
    const macOSAppName = requirePathSegment(options.macOSAppName ?? DEFAULT_MACOS_APP_NAME, 'macOSAppName');
    const macOSAppId = requirePathSegment(options.macOSAppId ?? DEFAULT_MACOS_APP_ID, 'macOSAppId');
    const platformUserData = platform === 'darwin'
        ? pathApi.join(userHome, 'Library', 'Application Support', macOSAppName)
        : legacyUserData;
    const userData = options.userDataRoot !== undefined
        ? requireAbsolutePath(options.userDataRoot, 'userDataRoot', pathApi)
        : platformUserData;
    const defaultCache = platform === 'darwin' && options.userDataRoot === undefined
        ? pathApi.join(userHome, 'Library', 'Caches', macOSAppId)
        : pathApi.join(userData, 'cache');
    const defaultLogs = platform === 'darwin' && options.userDataRoot === undefined
        ? pathApi.join(userHome, 'Library', 'Logs', macOSAppName)
        : pathApi.join(userData, 'logs');
    const cacheDir = options.cacheRoot !== undefined
        ? requireAbsolutePath(options.cacheRoot, 'cacheRoot', pathApi)
        : defaultCache;
    const logsDir = options.logsRoot !== undefined
        ? requireAbsolutePath(options.logsRoot, 'logsRoot', pathApi)
        : defaultLogs;
    return Object.freeze({
        platform,
        userHome,
        userData,
        configDir: pathApi.join(userData, 'config'),
        configFile: pathApi.join(userData, 'config.json'),
        dataDir: pathApi.join(userData, 'data'),
        workspaceDir: pathApi.join(userData, 'workspace'),
        skillsDir: pathApi.join(userData, 'skills'),
        pluginsDir: pathApi.join(userData, 'plugins'),
        compatPluginDir: pathApi.join(userData, 'bin', 'wechat-rpa'),
        protectedDir: pathApi.join(userData, 'protected'),
        runtimeDir: pathApi.join(userData, 'runtime'),
        cacheDir,
        downloadsDir: pathApi.join(cacheDir, 'downloads'),
        pluginStagingDir: pathApi.join(cacheDir, 'plugin-staging'),
        logsDir,
        legacyUserData,
        legacyPluginDir: pathApi.join(legacyUserData, 'bin', 'wechat-rpa'),
    });
}
/**
 * Bootstrap routing used by today's production code. macOS stays on the legacy
 * root until migration commits the switch; children receive the chosen root as
 * USER_DATA_PATH and therefore do not make their own platform decision.
 */
export function resolveBootstrapAgentFileLayout(options = {}) {
    const target = resolveAgentFileLayout(options);
    const hasExplicitUserData = options.userDataRoot !== undefined;
    if (target.platform !== 'darwin'
        || hasExplicitUserData
        || options.macOSDataLayout === 'platform') {
        return target;
    }
    return resolveAgentFileLayout({
        ...options,
        userDataRoot: target.legacyUserData,
    });
}
function nonEmptyEnvironmentValue(env, key) {
    const value = env[key]?.trim();
    return value || undefined;
}
/**
 * Resolves the single layout selected by the Electron owner process. Child
 * processes must consume all three roots together: deriving cache/logs from an
 * injected USER_DATA_PATH would collapse macOS platform directories back into
 * Application Support.
 */
export function resolveRuntimeAgentFileLayout(options = {}) {
    const { env = process.env, ...layoutOptions } = options;
    return resolveBootstrapAgentFileLayout({
        ...layoutOptions,
        userDataRoot: layoutOptions.userDataRoot
            ?? nonEmptyEnvironmentValue(env, AGENT_USER_DATA_ENV),
        cacheRoot: layoutOptions.cacheRoot
            ?? nonEmptyEnvironmentValue(env, AGENT_CACHE_DIR_ENV),
        logsRoot: layoutOptions.logsRoot
            ?? nonEmptyEnvironmentValue(env, AGENT_LOGS_DIR_ENV),
    });
}
/**
 * Log-only consumers historically fall back to cwd outside Electron. Keep that
 * CLI/test behavior while honoring the owner's explicit macOS logs root.
 */
export function resolveRuntimeAgentLogsDirectory(env = process.env, cwd = process.cwd(), platform = process.platform) {
    const pathApi = platform === 'win32' ? path.win32 : path.posix;
    const explicitLogs = nonEmptyEnvironmentValue(env, AGENT_LOGS_DIR_ENV);
    if (explicitLogs !== undefined) {
        return requireAbsolutePath(explicitLogs, AGENT_LOGS_DIR_ENV, pathApi);
    }
    const root = nonEmptyEnvironmentValue(env, AGENT_USER_DATA_ENV) ?? cwd;
    return pathApi.join(requireAbsolutePath(root, 'runtime log root', pathApi), 'logs');
}
export function agentFileLayoutEnvironment(layout) {
    return Object.freeze({
        [AGENT_USER_DATA_ENV]: layout.userData,
        [AGENT_CACHE_DIR_ENV]: layout.cacheDir,
        [AGENT_LOGS_DIR_ENV]: layout.logsDir,
    });
}
