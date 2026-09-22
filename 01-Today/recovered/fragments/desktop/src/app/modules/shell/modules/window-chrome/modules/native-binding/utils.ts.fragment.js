// Compiled fragment from ./src/app/modules/shell/modules/window-chrome/modules/native-binding/utils.ts.
// The original TypeScript and import graph are not restored.

const isWindowChromeNativeBinding = (value)=>{
    if (!value || typeof value !== 'object') {
        return false;
    }
    return 'setWindowCursor' in value && typeof value.setWindowCursor === 'function' && 'applyAuthenticationMainWindowChrome' in value && typeof value.applyAuthenticationMainWindowChrome === 'function' && 'applyRoundedWindowChrome' in value && typeof value.applyRoundedWindowChrome === 'function' && 'applyRoundedBackdrops' in value && typeof value.applyRoundedBackdrops === 'function' && 'restoreApplicationMainWindowChrome' in value && typeof value.restoreApplicationMainWindowChrome === 'function';
};
