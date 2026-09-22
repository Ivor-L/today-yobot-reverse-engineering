// Compiled fragment from ../../packages/client-node-adapter/src/aspects/nei/modules/preferences/index.ts.
// The original TypeScript and import graph are not restored.






class PreferencesNativeService {
    subscribe(eventName, listener) {
        return this.shell.subscribe(eventName, listener);
    }
    listPreferences() {
        return this.shell.listPreferences();
    }
    setPreferenceValue(params) {
        const { preferenceId, value } = params;
        return this.shell.setPreferenceValue({
            preferenceId,
            value
        });
    }
}
__decorate([
    inject(PreferencesShellService),
    __metadata("design:type", typeof PreferencesShellService === "undefined" ? Object : PreferencesShellService)
], PreferencesNativeService.prototype, "shell", void 0);
PreferencesNativeService = __decorate([
    logCalls(),
    injectable()
], PreferencesNativeService);
