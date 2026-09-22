// Compiled fragment from ./src/app/modules/shell/modules/tray/modules/host/modules/menu/modules/template/utils.ts.
// The original TypeScript and import graph are not restored.



const describePhysicalSide = (side)=>{
    if (side === (/* inlined export .PhysicalModifierSide.Left */"left")) {
        return 'L';
    }
    return 'R';
};
const describeModifier = (modifier, platform)=>{
    if (platform === 'win32') {
        return WINDOWS_MODIFIER_LABELS[modifier];
    }
    return MAC_MODIFIER_GLYPHS[modifier];
};
const describePhysicalModifier = (modifier, side, platform)=>{
    const sideLabel = describePhysicalSide(side);
    const modifierLabel = describeModifier(modifier, platform);
    if (platform === 'win32') {
        return `${sideLabel} ${modifierLabel}`;
    }
    return `${sideLabel}${modifierLabel}`;
};
const describeDoubleTapModifier = (binding, platform)=>{
    switch(binding.side){
        case (/* inlined export .ModifierDoubleTapSide.Left */"left"):
            return describePhysicalModifier(binding.modifier, (/* inlined export .PhysicalModifierSide.Left */"left"), platform);
        case (/* inlined export .ModifierDoubleTapSide.Right */"right"):
            return describePhysicalModifier(binding.modifier, (/* inlined export .PhysicalModifierSide.Right */"right"), platform);
        case (/* inlined export .ModifierDoubleTapSide.Either */"either"):
            return describeModifier(binding.modifier, platform);
    }
};
/**
 * Chooses between a native key equivalent and a subtitle description.
 *
 * The system menu can only draw a key equivalent for a key combination, so a
 * modifier-only gesture is spelled out in the subtitle instead.
 */ const describeQuickChatShortcut = (binding, copy, platform)=>{
    if (!binding) {
        return {};
    }
    if (binding.kind === (/* inlined export .ShortcutBindingKind.ModifierDoubleTap */"modifier-double-tap")) {
        return {
            subtitle: copy.quickChatDoubleTapDescription(describeDoubleTapModifier(binding, platform))
        };
    }
    if (binding.kind === (/* inlined export .ShortcutBindingKind.ModifierChord */"modifier-chord")) {
        return {
            subtitle: copy.quickChatChordDescription(binding.keys.map((key)=>describePhysicalModifier(key.modifier, key.side, platform)).join(' + '))
        };
    }
    return {
        shortcut: binding
    };
};
