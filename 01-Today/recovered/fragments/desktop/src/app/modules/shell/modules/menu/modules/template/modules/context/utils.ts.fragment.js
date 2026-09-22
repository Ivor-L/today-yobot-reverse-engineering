// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/context/utils.ts.
// The original TypeScript and import graph are not restored.


const resolveMacMenuCopy = (locale)=>{
    const normalizedLocale = locale.toLowerCase();
    if (normalizedLocale.startsWith('zh-hant') || normalizedLocale.startsWith('zh-tw') || normalizedLocale.startsWith('zh-hk') || normalizedLocale.startsWith('zh-mo')) {
        return TRADITIONAL_CHINESE_MAC_MENU_COPY;
    }
    if (normalizedLocale.startsWith('zh')) {
        return CHINESE_MAC_MENU_COPY;
    }
    if (normalizedLocale.startsWith('ja')) {
        return JAPANESE_MAC_MENU_COPY;
    }
    return ENGLISH_MAC_MENU_COPY;
};
const resolveMacMenuRoleLabel = (role, copy)=>{
    switch(role){
        case 'about':
            return copy.about;
        case 'services':
            return copy.services;
        case 'hide':
            return copy.hide;
        case 'hideOthers':
            return copy.hideOthers;
        case 'unhide':
            return copy.unhide;
        case 'quit':
            return copy.quit;
        case 'close':
            return copy.close;
        case 'undo':
            return copy.undo;
        case 'redo':
            return copy.redo;
        case 'cut':
            return copy.cut;
        case 'copy':
            return copy.copy;
        case 'paste':
            return copy.paste;
        case 'selectAll':
            return copy.selectAll;
        case 'minimize':
            return copy.minimize;
        case 'zoom':
            return copy.zoom;
        case 'front':
            return copy.bringAllToFront;
        default:
            return undefined;
    }
};
