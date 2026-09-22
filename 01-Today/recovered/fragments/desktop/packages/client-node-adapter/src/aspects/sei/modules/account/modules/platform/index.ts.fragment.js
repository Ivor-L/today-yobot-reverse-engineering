// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/platform/index.ts.
// The original TypeScript and import graph are not restored.





class AccountPlatform {
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
            const platform = await flight;
            this.value = platform;
            return platform;
        } finally{
            if (this.flight === flight) {
                this.flight = undefined;
            }
        }
    }
    async load() {
        const { platform } = await this.cpi.system.getSystemInfo();
        return platform;
    }
}
__decorate([
    inject(CROSS_PLATFORM_INTERFACE),
    __metadata("design:type", typeof AccountCpi === "undefined" ? Object : AccountCpi)
], AccountPlatform.prototype, "cpi", void 0);
AccountPlatform = __decorate([
    injectable()
], AccountPlatform);
