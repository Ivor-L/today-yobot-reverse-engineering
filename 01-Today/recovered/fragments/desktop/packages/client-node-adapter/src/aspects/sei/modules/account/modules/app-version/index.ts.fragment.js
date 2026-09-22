// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/app-version/index.ts.
// The original TypeScript and import graph are not restored.








class AccountAppVersion {
    async get() {
        if (this.value) {
            return this.value;
        }
        if (this.flight) {
            return await this.flight;
        }
        const flight = this.load();
        this.flight = flight;
        try {
            const version = await flight;
            this.value = version;
            return version;
        } finally{
            if (this.flight === flight) {
                this.flight = undefined;
            }
        }
    }
    async load() {
        let value;
        try {
            const info = await this.update.getVersionInfo();
            value = info.version;
        } catch (error) {
            throw interface_error_InterfaceError(error, 'The application version is not available.');
        }
        if (!lodash_es_isString(value)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'The application version is not available.');
        }
        const version = value.trim();
        if (lodash_es_isEmpty(version)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'The application version is not available.');
        }
        return version;
    }
}
__decorate([
    inject(UpdateShellService),
    __metadata("design:type", typeof Pick === "undefined" ? Object : Pick)
], AccountAppVersion.prototype, "update", void 0);
AccountAppVersion = __decorate([
    injectable()
], AccountAppVersion);
