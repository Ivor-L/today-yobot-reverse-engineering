// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/preferences/modules/environment/index.ts.
// The original TypeScript and import graph are not restored.










class EnvironmentPreference extends PreferenceShellItem {
    get writable() {
        const configuration = this.runtime.current;
        return configuration.buildEnvironment !== base_RuntimeEnvironment.Production && configuration.environmentOverride === undefined && configuration.backendLane === undefined;
    }
    setValue(params) {
        const { value } = params;
        return this.setPreferenceValue(value);
    }
    async setPreferenceValue(value) {
        await this.prepareValueUpdate();
        if (value !== base_RuntimeEnvironment.Development && value !== base_RuntimeEnvironment.Staging && value !== base_RuntimeEnvironment.Production) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'The runtime environment preference is invalid.');
        }
        const persisted = await this.state.mutate((current)=>{
            if (value === current.environment) {
                return current;
            }
            return {
                ...current,
                environment: value
            };
        });
        if (!persisted) {
            return;
        }
        this.scheduleRestart();
    }
    async loadValue() {
        await this.state.initialize();
        const configuration = this.runtime.current;
        if (configuration.buildEnvironment !== base_RuntimeEnvironment.Production) {
            return configuration.environmentOverride ?? this.state.persisted.environment;
        }
        return configuration.buildEnvironment;
    }
    scheduleRestart() {
        if (this.restartScheduled) {
            return;
        }
        this.restartScheduled = true;
        setImmediate(()=>{
            const { application } = this.runtime.current;
            application.relaunch();
            application.quit();
        });
    }
    constructor(...args){
        super(...args), this.id = (/* inlined export .ENVIRONMENT_PREFERENCE_ID */"env"), this.debugOnly = true, this.restartScheduled = false;
    }
}
__decorate([
    inject(PreferencesRuntimeProvider),
    __metadata("design:type", typeof PreferencesRuntimeProvider === "undefined" ? Object : PreferencesRuntimeProvider)
], EnvironmentPreference.prototype, "runtime", void 0);
__decorate([
    inject(PreferencesState),
    __metadata("design:type", typeof PreferencesState === "undefined" ? Object : PreferencesState)
], EnvironmentPreference.prototype, "state", void 0);
EnvironmentPreference = __decorate([
    injectable()
], EnvironmentPreference);
