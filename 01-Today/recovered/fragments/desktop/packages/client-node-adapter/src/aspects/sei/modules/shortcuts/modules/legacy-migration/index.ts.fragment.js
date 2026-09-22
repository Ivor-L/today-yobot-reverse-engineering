// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/shortcuts/modules/legacy-migration/index.ts.
// The original TypeScript and import graph are not restored.









class LegacyQuickChatShortcutMigration {
    async apply(platform) {
        if (platform !== cpi_SystemPlatform.MacOS) {
            return;
        }
        if (this.state.isMigrationApplied(LEGACY_MACOS_QUICK_CHAT_MIGRATION_ID)) {
            return;
        }
        const legacy = await this.runtime.readLegacyQuickChatShortcut();
        if (!legacy) {
            // The Host offers no legacy source, or the previous client never stored a choice.
            // Recording a decision here would burn the migration for a later packaged launch
            // that shares this settings directory, so nothing is written.
            return;
        }
        if (this.state.getBindingOverride((/* inlined export .WellKnownShortcutId.QuickChat */"quick-chat")).configured) {
            // An Electron preference already exists and always wins, but the decision is
            // recorded so the legacy value is never reconsidered.
            await this.state.applyMigration(LEGACY_MACOS_QUICK_CHAT_MIGRATION_ID);
            return;
        }
        const decision = resolveLegacyQuickChatDecision(legacy);
        await this.state.applyMigration(LEGACY_MACOS_QUICK_CHAT_MIGRATION_ID, decision.imported ? {
            [(/* inlined export .WellKnownShortcutId.QuickChat */"quick-chat")]: decision.binding
        } : {});
    }
}
__decorate([
    inject(ShortcutsRuntime),
    __metadata("design:type", typeof ShortcutsRuntime === "undefined" ? Object : ShortcutsRuntime)
], LegacyQuickChatShortcutMigration.prototype, "runtime", void 0);
__decorate([
    inject(ShortcutsState),
    __metadata("design:type", typeof ShortcutsState === "undefined" ? Object : ShortcutsState)
], LegacyQuickChatShortcutMigration.prototype, "state", void 0);
LegacyQuickChatShortcutMigration = __decorate([
    injectable()
], LegacyQuickChatShortcutMigration);
