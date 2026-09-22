// Compiled fragment from ./src/app/modules/adjust/modules/registration/modules/store/index.ts.
// The original TypeScript and import graph are not restored.







class DesktopAdjustRegistrationStore {
    async load(environment, externalDeviceId) {
        const fileName = this.getFileName(environment);
        const persisted = await this.stateFile.read(fileName);
        if (persisted !== undefined) {
            const state = parseDesktopAdjustRegistrationState(persisted);
            if (state.externalDeviceId === externalDeviceId) {
                return state;
            }
        }
        const state = createDesktopAdjustRegistrationState(externalDeviceId);
        await this.write(environment, state);
        return state;
    }
    async write(environment, state) {
        const validated = parseDesktopAdjustRegistrationState(state);
        await this.stateFile.write(this.getFileName(environment), validated);
    }
    getFileName(environment) {
        return `${ADJUST_REGISTRATION_STATE_FILE_PREFIX}-${environment}-v${(/* inlined export .ADJUST_REGISTRATION_STATE_SCHEMA_VERSION */1)}.json`;
    }
}
__decorate([
    inject(DesktopAdjustStateFile),
    __metadata("design:type", typeof DesktopAdjustStateFile === "undefined" ? Object : DesktopAdjustStateFile)
], DesktopAdjustRegistrationStore.prototype, "stateFile", void 0);
DesktopAdjustRegistrationStore = __decorate([
    injectable()
], DesktopAdjustRegistrationStore);
