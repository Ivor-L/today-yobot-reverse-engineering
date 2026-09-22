// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/shortcuts/modules/chat-history-search/index.ts.
// The original TypeScript and import graph are not restored.






class ChatHistorySearchShortcut extends ShortcutShellItem {
    isEnabled(platform) {
        return platform === cpi_SystemPlatform.MacOS || platform === cpi_SystemPlatform.Windows || platform === cpi_SystemPlatform.Linux;
    }
    getDefaultBinding(platform) {
        if (platform === cpi_SystemPlatform.MacOS) {
            return MACOS_CHAT_HISTORY_SEARCH_BINDING;
        }
        return NON_MACOS_CHAT_HISTORY_SEARCH_BINDING;
    }
    constructor(...args){
        super(...args), this.id = (/* inlined export .WellKnownShortcutId.ChatHistorySearch */"chat-history-search"), this.scope = (/* inlined export .ShortcutScope.Foreground */"foreground");
    }
}
ChatHistorySearchShortcut = __decorate([
    injectable()
], ChatHistorySearchShortcut);
