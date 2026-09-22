// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/shortcuts/modules/legacy-migration/utils.ts.
// The original TypeScript and import graph are not restored.



/** Legacy `doubleOption` observed either Option key, so the side stays either. */ const LEGACY_DOUBLE_OPTION_BINDING = Object.freeze({
    kind: (/* inlined export .ShortcutBindingKind.ModifierDoubleTap */"modifier-double-tap"),
    modifier: (/* inlined export .ShortcutModifier.Alt */"alt"),
    side: (/* inlined export .ModifierDoubleTapSide.Either */"either")
});
const LEGACY_OPTION_SPACE_BINDING = Object.freeze({
    kind: (/* inlined export .ShortcutBindingKind.KeyCombination */"key-combination"),
    code: 'Space',
    modifiers: Object.freeze([
        (/* inlined export .ShortcutModifier.Alt */"alt")
    ])
});
/**
 * Translates one legacy choice into a migration decision.
 *
 * `imported: false` means the decision is "keep the current platform default",
 * which is what an untranslatable legacy custom recording collapses to.
 */ const resolveLegacyQuickChatDecision = (legacy)=>{
    switch(legacy.option){
        case (/* inlined export .MacOSLegacyQuickChatShortcutOption.DoubleOption */"double-option"):
            return {
                imported: true,
                binding: LEGACY_DOUBLE_OPTION_BINDING
            };
        case (/* inlined export .MacOSLegacyQuickChatShortcutOption.OptionSpace */"option-space"):
            return {
                imported: true,
                binding: LEGACY_OPTION_SPACE_BINDING
            };
        case (/* inlined export .MacOSLegacyQuickChatShortcutOption.NoShortcut */"no-shortcut"):
            return {
                imported: true,
                binding: null
            };
        case (/* inlined export .MacOSLegacyQuickChatShortcutOption.Custom */"custom"):
            if (!legacy.customBinding) {
                return {
                    imported: false
                };
            }
            try {
                return {
                    imported: true,
                    binding: normalizeShortcutBinding(legacy.customBinding)
                };
            } catch  {
                // An untranslatable legacy recording must not block the rest of startup.
                return {
                    imported: false
                };
            }
    }
};
