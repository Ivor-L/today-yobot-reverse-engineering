// Compiled fragment from ./src/app/modules/shell/modules/tray/modules/host/modules/menu/consts.ts.
// The original TypeScript and import graph are not restored.

const CHECK_FOR_UPDATES_ACTION_ID = 'check-for-updates';
const OPEN_DEBUG_PANEL_ACTION_ID = 'open-debug-panel';
const UPLOAD_LOCAL_LOGS_ACTION_ID = 'upload-local-logs';
const RESET_ALL_DATA_ACTION_ID = 'reset-all-data';
const OPEN_MAIN_ACTION_ID = 'open-main';
const OPEN_SETTINGS_ACTION_ID = 'open-settings';
const QUIT_ACTION_ID = 'quit';
const SELECT_DEVELOPMENT_ENVIRONMENT_ACTION_ID = 'select-environment:dev';
const SELECT_PRODUCTION_ENVIRONMENT_ACTION_ID = 'select-environment:prod';
const TOGGLE_QUICK_CHAT_ACTION_ID = 'toggle-quick-chat';
const ENGLISH_TRAY_MENU_COPY = {
    checkForUpdates: 'Check for Updates…',
    debugPanel: 'Debug Console',
    debugShortcutDescription: 'Press ⇧⌘D 5 times',
    uploadLocalLogs: 'Upload Local Logs…',
    uploadShortcutDescription: 'Press ⇧⌘F 5 times',
    resetAllData: 'Reset App',
    resetShortcutDescription: 'Press ⇧⌘C 5 times',
    developmentEnvironment: 'Dev',
    environment: 'Environment',
    offlineStatus: 'This Mac is offline',
    offlineStatusDetail: 'Not available for agent actions',
    onlineStatus: 'This Mac is online',
    onlineStatusDetail: 'Available for agent actions',
    openTodayWindow: 'Open Today Window',
    productionEnvironment: 'Prod',
    quickChat: 'Quick Chat',
    quickChatChordDescription: (keys)=>`Hold ${keys}`,
    quickChatDoubleTapDescription: (modifier)=>`Tap ${modifier} twice`,
    quit: 'Quit',
    settings: 'Settings',
    switchEnvironment: 'Switch Environment?',
    switchEnvironmentCancel: 'Cancel',
    switchEnvironmentConfirm: 'Switch & Relaunch',
    switchEnvironmentDetail: (environment)=>`Switching to ${environment} will sign you out and relaunch the app with the new backend.`
};
const CHINESE_TRAY_MENU_COPY = {
    checkForUpdates: '检查更新…',
    debugPanel: '调试面板',
    debugShortcutDescription: '连续按 5 次 ⇧⌘D',
    uploadLocalLogs: '上传本地日志…',
    uploadShortcutDescription: '连续按 5 次 ⇧⌘F',
    resetAllData: '重置 App',
    resetShortcutDescription: '连续按 5 次 ⇧⌘C',
    developmentEnvironment: '开发环境',
    environment: '环境',
    offlineStatus: '此 Mac 已离线',
    offlineStatusDetail: '无法执行助理操作',
    onlineStatus: '此 Mac 已在线',
    onlineStatusDetail: '可执行助理操作',
    openTodayWindow: '打开 Today 窗口',
    productionEnvironment: '生产环境',
    quickChat: '快速聊天',
    quickChatChordDescription: (keys)=>`同时按住 ${keys}`,
    quickChatDoubleTapDescription: (modifier)=>`轻点两次 ${modifier}`,
    quit: '退出',
    settings: '设置',
    switchEnvironment: '切换环境？',
    switchEnvironmentCancel: '取消',
    switchEnvironmentConfirm: '切换并重启',
    switchEnvironmentDetail: (environment)=>`切换到${environment}将退出当前账号，并使用新后端重启应用。`
};
const ENGLISH_WINDOWS_TRAY_MENU_COPY = {
    ...ENGLISH_TRAY_MENU_COPY,
    debugShortcutDescription: 'Press Ctrl+Shift+D 5 times',
    uploadShortcutDescription: 'Press Ctrl+Shift+F 5 times',
    resetShortcutDescription: 'Press Ctrl+Shift+C 5 times',
    offlineStatus: 'This PC is offline',
    onlineStatus: 'This PC is online'
};
const CHINESE_WINDOWS_TRAY_MENU_COPY = {
    ...CHINESE_TRAY_MENU_COPY,
    debugShortcutDescription: '连续按 5 次 Ctrl+Shift+D',
    uploadShortcutDescription: '连续按 5 次 Ctrl+Shift+F',
    resetShortcutDescription: '连续按 5 次 Ctrl+Shift+C',
    offlineStatus: '此电脑已离线',
    onlineStatus: '此电脑已在线'
};
