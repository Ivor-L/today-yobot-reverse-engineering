// Compiled fragment from ./src/app/modules/shell/utils.ts.
// The original TypeScript and import graph are not restored.



const toElectronKey = (code)=>{
    if (/^Key[A-Z]$/u.test(code)) {
        return code.slice(3);
    }
    if (/^Digit[0-9]$/u.test(code)) {
        return code.slice(5);
    }
    if (/^F(?:[1-9]|1[0-9]|2[0-4])$/u.test(code)) {
        return code;
    }
    if (/^Numpad[0-9]$/u.test(code)) {
        return `num${code.slice(6)}`;
    }
    switch(code){
        case 'ArrowDown':
            return 'Down';
        case 'ArrowLeft':
            return 'Left';
        case 'ArrowRight':
            return 'Right';
        case 'ArrowUp':
            return 'Up';
        case 'Backquote':
            return '`';
        case 'Backslash':
            return '\\';
        case 'Backspace':
            return 'Backspace';
        case 'BracketLeft':
            return '[';
        case 'BracketRight':
            return ']';
        case 'Comma':
            return ',';
        case 'Delete':
            return 'Delete';
        case 'End':
            return 'End';
        case 'Enter':
            return 'Enter';
        case 'Equal':
            return '=';
        case 'Escape':
            return 'Escape';
        case 'Home':
            return 'Home';
        case 'Insert':
            return 'Insert';
        case 'Minus':
            return '-';
        case 'NumpadAdd':
            return 'numadd';
        case 'NumpadDecimal':
            return 'numdec';
        case 'NumpadDivide':
            return 'numdiv';
        case 'NumpadMultiply':
            return 'nummult';
        case 'NumpadSubtract':
            return 'numsub';
        case 'PageDown':
            return 'PageDown';
        case 'PageUp':
            return 'PageUp';
        case 'Period':
            return '.';
        case 'Semicolon':
            return ';';
        case 'Slash':
            return '/';
        case 'Space':
            return 'Space';
        case 'Tab':
            return 'Tab';
        default:
            return null;
    }
};
const hasExactOrigin = (value, expectedOrigin)=>{
    try {
        const url = new URL(value);
        const expected = new URL(expectedOrigin);
        return expected.origin !== 'null' && url.origin === expected.origin;
    } catch  {
        return false;
    }
};
const toElectronAccelerator = (binding)=>{
    // Electron accelerators always end in a non-modifier key, so a modifier-only
    // gesture has no representation here and is registered through the OS Host.
    if (binding.kind === (/* inlined export .ShortcutBindingKind.ModifierDoubleTap */"modifier-double-tap") || binding.kind === (/* inlined export .ShortcutBindingKind.ModifierChord */"modifier-chord")) {
        return null;
    }
    const key = toElectronKey(binding.code);
    if (!key) {
        return null;
    }
    const modifiers = new Set(binding.modifiers);
    const acceleratorParts = [];
    if (modifiers.has((/* inlined export .ShortcutModifier.Control */"control"))) {
        acceleratorParts.push('Control');
    }
    if (modifiers.has((/* inlined export .ShortcutModifier.Alt */"alt"))) {
        acceleratorParts.push('Alt');
    }
    if (modifiers.has((/* inlined export .ShortcutModifier.Shift */"shift"))) {
        acceleratorParts.push('Shift');
    }
    if (modifiers.has((/* inlined export .ShortcutModifier.Meta */"meta"))) {
        acceleratorParts.push('Super');
    }
    acceleratorParts.push(key);
    return acceleratorParts.join('+');
};
const isArtifactPreviewWindowUrl = (value, webOrigin)=>{
    if (!hasExactOrigin(value, webOrigin)) {
        return false;
    }
    try {
        const url = new URL(value);
        return url.pathname === ARTIFACT_PREVIEW_ROUTE || url.pathname === `${ARTIFACT_PREVIEW_ROUTE}/`;
    } catch  {
        return false;
    }
};
