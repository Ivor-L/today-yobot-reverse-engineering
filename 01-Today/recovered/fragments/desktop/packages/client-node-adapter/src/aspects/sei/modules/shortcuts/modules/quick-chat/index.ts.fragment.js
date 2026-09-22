// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/shortcuts/modules/quick-chat/index.ts.
// The original TypeScript and import graph are not restored.






class QuickChatShortcut extends ShortcutShellItem {
    isEnabled(platform) {
        return platform === cpi_SystemPlatform.MacOS || platform === cpi_SystemPlatform.Windows || platform === cpi_SystemPlatform.Linux;
    }
    getDefaultBinding(platform) {
        if (platform === cpi_SystemPlatform.MacOS) {
            return MACOS_QUICK_CHAT_BINDING;
        }
        return NON_MACOS_QUICK_CHAT_BINDING;
    }
    constructor(...args){
        super(...args), this.id = (/* inlined export .WellKnownShortcutId.QuickChat */"quick-chat"), this.scope = (/* inlined export .ShortcutScope.Global */"global");
    }
}
QuickChatShortcut = __decorate([
    injectable()
], QuickChatShortcut);
