// Compiled fragment from ./src/app/modules/shell/modules/tray/modules/host/modules/menu/utils.ts.
// The original TypeScript and import graph are not restored.


const resolveTrayMenuCopy = (locale, platform = 'darwin')=>{
    if (locale.toLowerCase().startsWith('zh')) {
        if (platform !== 'darwin') {
            return CHINESE_WINDOWS_TRAY_MENU_COPY;
        }
        return CHINESE_TRAY_MENU_COPY;
    }
    if (platform !== 'darwin') {
        return ENGLISH_WINDOWS_TRAY_MENU_COPY;
    }
    return ENGLISH_TRAY_MENU_COPY;
};
