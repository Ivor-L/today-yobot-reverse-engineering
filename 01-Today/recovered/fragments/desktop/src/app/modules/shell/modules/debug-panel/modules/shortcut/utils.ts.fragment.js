// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/shortcut/utils.ts.
// The original TypeScript and import graph are not restored.

const resolveDebugShortcutAction = (input, platform)=>{
    const { alt, control, isComposing, key, meta, shift, type } = input;
    const action = key.toLowerCase();
    if (type !== 'keyDown' || isComposing || !shift || alt) {
        return null;
    }
    if (action !== 'c' && action !== 'd' && action !== 'f') {
        return null;
    }
    if (platform === 'darwin') {
        if (!meta || control) {
            return null;
        }
    } else if (!control || action === 'c' && meta) {
        return null;
    }
    return action;
};
