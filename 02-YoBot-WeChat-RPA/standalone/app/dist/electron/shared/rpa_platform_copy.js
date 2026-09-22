export function rpaEnvironmentFailureMessage(platform) {
    if (platform === 'darwin') {
        return '微信界面读取失败：请让微信桌面版保持登录并显示在桌面上；若仍失败，请前往「系统设置 → 隐私与安全性 → 辅助功能」，允许 YokoWebot RPA Helper 后重试。';
    }
    if (platform === 'win32') {
        return '微信界面读取失败：请让微信桌面版保持登录并显示在桌面上（不要最小化或被完全遮挡）；若仍失败，按 Ctrl+Shift+Enter 开启一次「讲述人」以激活辅助功能，再回到「微信 BOT」页面重新初始化。';
    }
    return '微信界面读取失败：请让微信桌面版保持登录并显示在桌面上，确认系统辅助功能权限后重试。';
}
export function rpaAccessibilityDegradationCopy(platform) {
    if (platform === 'darwin') {
        return {
            title: '微信界面读取失败，macOS 辅助功能权限可能未开启',
            detail: '请在「系统设置 → 隐私与安全性 → 辅助功能」中允许 YokoWebot RPA Helper，然后保持微信窗口可见并重试。',
        };
    }
    if (platform === 'win32') {
        return {
            title: '微信界面读取失败，辅助功能（UIA）可能未开启',
            detail: '请让微信窗口保持显示，然后按 Ctrl+Shift+Enter 开启一次「讲述人」以激活辅助功能，稍候会自动恢复。',
        };
    }
    return {
        title: '微信界面读取失败，系统辅助功能可能未就绪',
        detail: '请保持微信窗口可见，确认系统辅助功能权限后重试。',
    };
}
export function rpaLockedSessionDegradationCopy(platform) {
    if (platform === 'darwin') {
        return {
            title: 'macOS 会话已锁定，自动回复已暂停',
            detail: '解锁后会自动恢复扫描，RPA 无需重启。锁屏期间无法操作微信界面。',
        };
    }
    if (platform === 'win32') {
        return {
            title: 'Windows 会话已锁定，自动回复已暂停',
            detail: '解锁后会自动恢复扫描，Worker 无需重启。锁屏期间无法操作微信界面。',
        };
    }
    return {
        title: '系统会话已锁定，自动回复已暂停',
        detail: '解锁后会自动恢复扫描，无需重启 RPA。锁屏期间无法操作微信界面。',
    };
}
