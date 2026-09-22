// Compiled fragment from ./src/app/modules/configuration/consts.ts.
// The original TypeScript and import graph are not restored.



const BACKEND_LANE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/u;
const DESKTOP_BUILD_ENVIRONMENT_METADATA_KEY = 'todayDesktopDefaultEnvironment';
const consts_DESKTOP_APPLICATION_BUILD_METADATA_KEY = 'todayDesktopBuild';
const DEFAULT_INSPECT_PORT = 9222;
const GLOBAL_SHORTCUTS_PORTAL_FEATURES = 'GlobalShortcutsPortal,GlobalShortcutsPortalPreferredTrigger';
const LINUX_DESKTOP_FILE_NAMES = {
    [base_RuntimeEnvironment.Development]: 'ai.today.desktop.app.dev.desktop',
    [base_RuntimeEnvironment.Staging]: 'ai.today.desktop.app.staging.desktop',
    [base_RuntimeEnvironment.Production]: 'ai.today.desktop.app.desktop'
};
const LOCAL_WEB_ORIGIN = 'http://localhost:4060';
/**
 * 此处 appId 仅用于 Windows 的 AppUserModelID（win32 门控）。macOS 的
 * bundle id 由构建脚本切到 native App ID（ai.today.macos.app[.canary]），
 * 见 scripts/build-environment.mjs 的 macAppId，与这里的值无关。
 */ const PRODUCT_IDENTITIES = {
    [base_RuntimeEnvironment.Development]: {
        appId: 'ai.today.desktop.app.dev',
        productName: 'Today Dev'
    },
    [base_RuntimeEnvironment.Staging]: {
        // Windows Beta and Release occupy the same Today installation.
        appId: 'ai.today.desktop.app',
        productName: 'Today Staging'
    },
    [base_RuntimeEnvironment.Production]: {
        appId: 'ai.today.desktop.app',
        productName: 'Today'
    }
};
const DESKTOP_CHANNEL_PRODUCT_NAMES = {
    [base_RuntimeEnvironment.Development]: 'Today Canary',
    [base_RuntimeEnvironment.Staging]: 'Today',
    [base_RuntimeEnvironment.Production]: 'Today'
};
/**
 * Chromium profile names are deliberately independent from the visible macOS
 * product name. Keep the existing development profile and make beta/release
 * share the release profile so switching channels does not look like data loss.
 *
 * 地区维度不可省略：两地包的 productName 同为 Today，若共用目录，
 * Electron 的单实例锁（锁文件位于 userData 根）会让后启动的包拉不起窗口，
 * 且登录态与 Chromium profile 互相覆盖。国际版取值保持原样，避免既有安装迁移。
 */ const toRuntimeEnvironmentNames = (names)=>({
        [base_RuntimeEnvironment.Development]: names.dev,
        [base_RuntimeEnvironment.Staging]: names.staging,
        [base_RuntimeEnvironment.Production]: names.prod
    });
const MACOS_REGION_USER_DATA_NAMES = {
    global: toRuntimeEnvironmentNames(MACOS_REGION_USER_DATA_BASE_NAMES.global),
    cn: toRuntimeEnvironmentNames(MACOS_REGION_USER_DATA_BASE_NAMES.cn)
};
