// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/shortcuts/utils.ts.
// The original TypeScript and import graph are not restored.




const SHORTCUT_MODIFIER_ORDER = [
    (/* inlined export .ShortcutModifier.Control */"control"),
    (/* inlined export .ShortcutModifier.Alt */"alt"),
    (/* inlined export .ShortcutModifier.Shift */"shift"),
    (/* inlined export .ShortcutModifier.Meta */"meta")
];
const PHYSICAL_MODIFIER_SIDE_ORDER = [
    (/* inlined export .PhysicalModifierSide.Left */"left"),
    (/* inlined export .PhysicalModifierSide.Right */"right")
];
const MODIFIER_DOUBLE_TAP_SIDES = [
    (/* inlined export .ModifierDoubleTapSide.Left */"left"),
    (/* inlined export .ModifierDoubleTapSide.Right */"right"),
    (/* inlined export .ModifierDoubleTapSide.Either */"either")
];
const SHORTCUT_BINDING_KINDS = [
    (/* inlined export .ShortcutBindingKind.KeyCombination */"key-combination"),
    (/* inlined export .ShortcutBindingKind.ModifierDoubleTap */"modifier-double-tap"),
    (/* inlined export .ShortcutBindingKind.ModifierChord */"modifier-chord")
];
const MINIMUM_MODIFIER_CHORD_KEYS = 2;
const NAMED_SHORTCUT_CODES = new Set([
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'Backquote',
    'Backslash',
    'Backspace',
    'BracketLeft',
    'BracketRight',
    'Comma',
    'Delete',
    'End',
    'Enter',
    'Equal',
    'Escape',
    'Home',
    'Insert',
    'Minus',
    'NumpadAdd',
    'NumpadDecimal',
    'NumpadDivide',
    'NumpadEnter',
    'NumpadMultiply',
    'NumpadSubtract',
    'PageDown',
    'PageUp',
    'Period',
    'Quote',
    'Semicolon',
    'Slash',
    'Space',
    'Tab'
]);
const isShortcutCode = (code)=>/^Key[A-Z]$/u.test(code) || /^Digit[0-9]$/u.test(code) || /^Numpad[0-9]$/u.test(code) || /^F(?:[1-9]|1[0-9]|2[0-4])$/u.test(code) || NAMED_SHORTCUT_CODES.has(code);
const utils_hasOnlyKeys = (value, expectedKeys)=>{
    const actualKeys = Object.keys(value);
    return actualKeys.length === expectedKeys.length && expectedKeys.every((key)=>Object.hasOwn(value, key));
};
const invalidBinding = ()=>interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'The shortcut binding is invalid.');
const readBindingRecord = (value)=>{
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw invalidBinding();
    }
    return value;
};
/**
 * Reads the binding form. An absent `kind` means the untagged key-combination
 * declaration that predates the discriminated union.
 */ const readBindingKind = (binding)=>{
    if (!Object.hasOwn(binding, 'kind') || binding.kind === undefined) {
        return (/* inlined export .ShortcutBindingKind.KeyCombination */"key-combination");
    }
    if (!SHORTCUT_BINDING_KINDS.includes(binding.kind)) {
        throw invalidBinding();
    }
    return binding.kind;
};
const readModifier = (value)=>{
    if (!SHORTCUT_MODIFIER_ORDER.includes(value)) {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'The shortcut modifier is invalid.');
    }
    return value;
};
const normalizeKeyCombination = (binding)=>{
    const code = typeof binding.code === 'string' ? binding.code.trim() : '';
    const modifiers = Array.isArray(binding.modifiers) ? binding.modifiers : [];
    if (!isShortcutCode(code)) {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'The shortcut key code is invalid.');
    }
    const modifierSet = new Set(modifiers.map(readModifier));
    if (modifierSet.size === 0) {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'A shortcut binding requires at least one modifier.');
    }
    return Object.freeze({
        kind: (/* inlined export .ShortcutBindingKind.KeyCombination */"key-combination"),
        code,
        modifiers: Object.freeze(SHORTCUT_MODIFIER_ORDER.filter((modifier)=>modifierSet.has(modifier)))
    });
};
const normalizeModifierDoubleTap = (binding)=>{
    if (!MODIFIER_DOUBLE_TAP_SIDES.includes(binding.side)) {
        throw invalidBinding();
    }
    return Object.freeze({
        kind: (/* inlined export .ShortcutBindingKind.ModifierDoubleTap */"modifier-double-tap"),
        modifier: readModifier(binding.modifier),
        side: binding.side
    });
};
const normalizeModifierChord = (binding)=>{
    if (!Array.isArray(binding.keys)) {
        throw invalidBinding();
    }
    const keys = new Map();
    for (const value of binding.keys){
        const key = readBindingRecord(value);
        if (!utils_hasOnlyKeys(key, [
            'modifier',
            'side'
        ]) || !PHYSICAL_MODIFIER_SIDE_ORDER.includes(key.side)) {
            throw invalidBinding();
        }
        const normalized = Object.freeze({
            modifier: readModifier(key.modifier),
            side: key.side
        });
        keys.set(`${normalized.modifier}:${normalized.side}`, normalized);
    }
    if (keys.size !== binding.keys.length || keys.size < MINIMUM_MODIFIER_CHORD_KEYS) {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'A modifier chord requires at least two unique physical modifier keys.');
    }
    const sortedKeys = SHORTCUT_MODIFIER_ORDER.flatMap((modifier)=>PHYSICAL_MODIFIER_SIDE_ORDER.flatMap((side)=>{
            const key = keys.get(`${modifier}:${side}`);
            return key ? [
                key
            ] : [];
        }));
    return Object.freeze({
        kind: (/* inlined export .ShortcutBindingKind.ModifierChord */"modifier-chord"),
        keys: Object.freeze(sortedKeys)
    });
};
/**
 * Validates one binding declaration and returns its canonical tagged form.
 * Untagged `{ code, modifiers }` declarations stay accepted and gain
 * `kind: 'key-combination'`.
 */ const normalizeShortcutBinding = (value)=>{
    const binding = readBindingRecord(value);
    const kind = readBindingKind(binding);
    switch(kind){
        case (/* inlined export .ShortcutBindingKind.KeyCombination */"key-combination"):
            if (!utils_hasOnlyKeys(binding, [
                'code',
                'modifiers'
            ]) && !utils_hasOnlyKeys(binding, [
                'kind',
                'code',
                'modifiers'
            ])) {
                throw invalidBinding();
            }
            return normalizeKeyCombination(binding);
        case (/* inlined export .ShortcutBindingKind.ModifierDoubleTap */"modifier-double-tap"):
            if (!utils_hasOnlyKeys(binding, [
                'kind',
                'modifier',
                'side'
            ])) {
                throw invalidBinding();
            }
            return normalizeModifierDoubleTap(binding);
        case (/* inlined export .ShortcutBindingKind.ModifierChord */"modifier-chord"):
            if (!utils_hasOnlyKeys(binding, [
                'kind',
                'keys'
            ])) {
                throw invalidBinding();
            }
            return normalizeModifierChord(binding);
    }
};
/** Whether a normalized binding observes modifier keys without a companion key. */ const isModifierGestureShortcutBinding = (binding)=>binding.kind === (/* inlined export .ShortcutBindingKind.ModifierDoubleTap */"modifier-double-tap") || binding.kind === (/* inlined export .ShortcutBindingKind.ModifierChord */"modifier-chord");
const areShortcutBindingsEqual = (left, right)=>lodash_es_isEqual(left, right);
