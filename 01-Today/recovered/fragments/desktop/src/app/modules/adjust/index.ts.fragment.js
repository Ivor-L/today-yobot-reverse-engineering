// Compiled fragment from ./src/app/modules/adjust/index.ts.
// The original TypeScript and import graph are not restored.









class DesktopAdjustAttribution {
    start() {
        if (this.startResult) {
            return this.startResult;
        }
        const startResult = this.startSafely();
        this.startResult = startResult;
        return startResult;
    }
    async stop() {
        await Promise.allSettled([
            this.installation.stop(),
            this.registration.stop()
        ]);
    }
    async startSafely() {
        if (!this.configuration.application.isPackaged) {
            return;
        }
        let context;
        try {
            context = await this.readContext();
        } catch  {
            console.warn('[desktop] Adjust attribution identity is unavailable');
            return;
        }
        if (!context) {
            return;
        }
        try {
            await this.installation.start(context, this.configuration.current.profileExists);
        } catch  {
            console.warn('[desktop] Adjust installation reporting is unavailable');
        }
        try {
            await this.registration.start(context);
        } catch  {
            console.warn('[desktop] Adjust registration reporting is unavailable');
        }
    }
    async readContext() {
        const { environment } = this.nodeAdapter.sei.account.runtimeSnapshot;
        const system = await this.nodeAdapter.cpi.system.getSystemInfo();
        const platform = resolveDesktopAdjustPlatform(system.platform);
        if (!platform) {
            return undefined;
        }
        const device = await this.nodeAdapter.cpi.system.getDeviceInfo();
        return {
            environment,
            externalDeviceId: deriveDesktopAdjustDeviceId(device.installationId),
            platform
        };
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], DesktopAdjustAttribution.prototype, "nodeAdapter", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], DesktopAdjustAttribution.prototype, "configuration", void 0);
__decorate([
    inject(DesktopAdjustInstallation),
    __metadata("design:type", typeof DesktopAdjustInstallation === "undefined" ? Object : DesktopAdjustInstallation)
], DesktopAdjustAttribution.prototype, "installation", void 0);
__decorate([
    inject(DesktopAdjustRegistration),
    __metadata("design:type", typeof DesktopAdjustRegistration === "undefined" ? Object : DesktopAdjustRegistration)
], DesktopAdjustAttribution.prototype, "registration", void 0);
DesktopAdjustAttribution = __decorate([
    injectable()
], DesktopAdjustAttribution);
