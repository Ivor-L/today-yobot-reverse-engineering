// Compiled fragment from ./src/app/modules/adjust/modules/installation/modules/store/index.ts.
// The original TypeScript and import graph are not restored.







class DesktopAdjustInstallationStore {
    async load(environment, externalDeviceId, occurredAtMs, profileExists) {
        const fileName = this.getFileName(environment);
        const persisted = await this.stateFile.read(fileName);
        if (persisted !== undefined) {
            const state = parseDesktopAdjustInstallationState(persisted);
            if (state.externalDeviceId === externalDeviceId) {
                return state;
            }
            const reinstalled = createDesktopAdjustInstallationState(externalDeviceId, occurredAtMs);
            await this.write(environment, reinstalled);
            return reinstalled;
        }
        const state = profileExists ? createLegacyExcludedDesktopAdjustInstallationState(externalDeviceId) : createDesktopAdjustInstallationState(externalDeviceId, occurredAtMs);
        await this.write(environment, state);
        return state;
    }
    async write(environment, state) {
        const validated = parseDesktopAdjustInstallationState(state);
        await this.stateFile.write(this.getFileName(environment), validated);
    }
    getFileName(environment) {
        return `${ADJUST_INSTALLATION_STATE_FILE_PREFIX}-${environment}-v${(/* inlined export .ADJUST_INSTALLATION_STATE_SCHEMA_VERSION */1)}.json`;
    }
}
__decorate([
    inject(DesktopAdjustStateFile),
    __metadata("design:type", typeof DesktopAdjustStateFile === "undefined" ? Object : DesktopAdjustStateFile)
], DesktopAdjustInstallationStore.prototype, "stateFile", void 0);
DesktopAdjustInstallationStore = __decorate([
    injectable()
], DesktopAdjustInstallationStore);
