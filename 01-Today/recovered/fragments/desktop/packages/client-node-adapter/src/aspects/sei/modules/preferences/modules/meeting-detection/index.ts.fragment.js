// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/preferences/modules/meeting-detection/index.ts.
// The original TypeScript and import graph are not restored.








class MeetingDetectionPreference extends PreferenceShellItem {
    get writable() {
        return true;
    }
    async loadValue() {
        await this.state.initialize();
        return this.state.persisted.meetingDetectionEnabled ?? true;
    }
    async setPreferenceValue(value) {
        await this.prepareValueUpdate();
        if (typeof value !== 'boolean') {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'The meeting-detection preference must be a boolean.');
        }
        const persisted = await this.state.mutate((current)=>{
            if ((current.meetingDetectionEnabled ?? true) === value) {
                return current;
            }
            const { meetingDetectionEnabled: _previous, ...rest } = current;
            if (value) {
                return rest;
            }
            return {
                ...rest,
                meetingDetectionEnabled: false
            };
        });
        if (!persisted) {
            return;
        }
        this.updateCurrentValue(persisted.meetingDetectionEnabled ?? true);
    }
    constructor(...args){
        super(...args), this.id = (/* inlined export .WellKnownPreferenceId.MeetingDetectionEnabled */"meeting-detection.enabled"), this.debugOnly = false;
    }
}
__decorate([
    inject(PreferencesState),
    __metadata("design:type", typeof PreferencesState === "undefined" ? Object : PreferencesState)
], MeetingDetectionPreference.prototype, "state", void 0);
MeetingDetectionPreference = __decorate([
    injectable()
], MeetingDetectionPreference);
