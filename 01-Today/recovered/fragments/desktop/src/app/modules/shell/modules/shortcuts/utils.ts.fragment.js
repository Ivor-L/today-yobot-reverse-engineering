// Compiled fragment from ./src/app/modules/shell/modules/shortcuts/utils.ts.
// The original TypeScript and import graph are not restored.


/**
 * Stable key identifying one physical binding across kinds. Normalized bindings
 * already carry canonical modifier and chord-key order, so serializing them is
 * enough to make two equal bindings collide and two different bindings not.
 */ const createShortcutBindingKey = (binding)=>{
    if (binding.kind === (/* inlined export .ShortcutBindingKind.ModifierDoubleTap */"modifier-double-tap")) {
        return [
            (/* inlined export .ShortcutBindingKind.ModifierDoubleTap */"modifier-double-tap"),
            binding.modifier,
            binding.side
        ].join(':');
    }
    if (binding.kind === (/* inlined export .ShortcutBindingKind.ModifierChord */"modifier-chord")) {
        return [
            (/* inlined export .ShortcutBindingKind.ModifierChord */"modifier-chord"),
            ...binding.keys.map((key)=>`${key.modifier}.${key.side}`)
        ].join(':');
    }
    const modifiers = new Set(binding.modifiers);
    return [
        (/* inlined export .ShortcutBindingKind.KeyCombination */"key-combination"),
        binding.code,
        modifiers.has((/* inlined export .ShortcutModifier.Control */"control")),
        modifiers.has((/* inlined export .ShortcutModifier.Alt */"alt")),
        modifiers.has((/* inlined export .ShortcutModifier.Shift */"shift")),
        modifiers.has((/* inlined export .ShortcutModifier.Meta */"meta"))
    ].join(':');
};
/** Whether the binding is a modifier-only gesture the OS Host has to observe. */ const isModifierGestureBinding = (binding)=>binding.kind === (/* inlined export .ShortcutBindingKind.ModifierDoubleTap */"modifier-double-tap") || binding.kind === (/* inlined export .ShortcutBindingKind.ModifierChord */"modifier-chord");
const isShortcutInputMatch = (input, binding)=>{
    if (isModifierGestureBinding(binding)) {
        return false;
    }
    if (input.type !== 'keyDown' || input.isAutoRepeat || input.isComposing || input.code !== binding.code) {
        return false;
    }
    const modifiers = new Set(binding.modifiers);
    return input.control === modifiers.has((/* inlined export .ShortcutModifier.Control */"control")) && input.alt === modifiers.has((/* inlined export .ShortcutModifier.Alt */"alt")) && input.shift === modifiers.has((/* inlined export .ShortcutModifier.Shift */"shift")) && input.meta === modifiers.has((/* inlined export .ShortcutModifier.Meta */"meta"));
};
