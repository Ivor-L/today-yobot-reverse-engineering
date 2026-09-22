// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/preferences/modules/prevent-sleep/index.ts.
// The original TypeScript and import graph are not restored.









class PreventSleepPreference extends PreferenceShellItem {
    get available() {
        return this.supported;
    }
    get writable() {
        return this.available;
    }
    async setPreferenceValue(value) {
        const transaction = this.setTransaction.then(async ()=>{
            await this.applyPreferenceValue(value);
        });
        this.setTransaction = transaction.catch(()=>undefined);
        await transaction;
    }
    async loadValue() {
        await this.state.initialize();
        const enabled = this.state.persisted.preventSleepWhileRunning ?? false;
        this.supported = await this.cpi.system.isPreventSleepWhileRunningSupported();
        if (!this.supported) {
            return enabled;
        }
        const hostEnabled = await this.cpi.system.getPreventSleepWhileRunning();
        if (hostEnabled !== enabled) {
            await this.cpi.system.setPreventSleepWhileRunning({
                enabled
            });
        }
        return enabled;
    }
    async applyPreferenceValue(value) {
        await this.prepareValueUpdate();
        if (typeof value !== 'boolean') {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'The prevent-sleep preference must be a boolean.');
        }
        const previousValue = this.value;
        await this.cpi.system.setPreventSleepWhileRunning({
            enabled: value
        });
        let persisted;
        try {
            persisted = await this.state.mutate((current)=>{
                if ((current.preventSleepWhileRunning ?? false) === value) {
                    return current;
                }
                const { preventSleepWhileRunning: _previous, ...rest } = current;
                // 只持久化 true：false 是默认值，写盘只会积灰。
                if (value) {
                    return {
                        ...rest,
                        preventSleepWhileRunning: true
                    };
                }
                return rest;
            });
        } catch (error) {
            try {
                await this.cpi.system.setPreventSleepWhileRunning({
                    enabled: previousValue
                });
            } catch  {
            // Keep the persistence failure as the caller-visible error.
            }
            throw error;
        }
        if (!persisted) {
            return;
        }
        const enabled = persisted.preventSleepWhileRunning ?? false;
        this.updateCurrentValue(enabled);
    }
    constructor(...args){
        super(...args), this.id = (/* inlined export .WellKnownPreferenceId.DesktopPreventSleepWhileRunning */"desktop.prevent-sleep-while-running"), this.debugOnly = false, this.supported = false, this.setTransaction = Promise.resolve();
    }
}
__decorate([
    inject(PreferencesState),
    __metadata("design:type", typeof PreferencesState === "undefined" ? Object : PreferencesState)
], PreventSleepPreference.prototype, "state", void 0);
__decorate([
    inject(CROSS_PLATFORM_INTERFACE),
    __metadata("design:type", typeof ICrossPlatformInterface === "undefined" ? Object : ICrossPlatformInterface)
], PreventSleepPreference.prototype, "cpi", void 0);
PreventSleepPreference = __decorate([
    injectable()
], PreventSleepPreference);
