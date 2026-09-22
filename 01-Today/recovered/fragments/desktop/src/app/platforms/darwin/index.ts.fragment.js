// Compiled fragment from ./src/app/platforms/darwin/index.ts.
// The original TypeScript and import graph are not restored.












class SelectedDesktopPlatform extends BaseDesktopPlatform {
    get desktopConfiguration() {
        return this.configuration;
    }
    get platformSerialTask() {
        return this.serialTask;
    }
    async resetLocalData() {
        await this.localData.reset();
    }
    async startPlatformHost() {
        const configuration = this.desktopConfiguration;
        const application = configuration.application;
        const binaryPath = resolvePlatformHostPath({
            appPath: application.getAppPath(),
            environment: configuration.environment,
            isPackaged: application.isPackaged,
            resourcesPath: configuration.resourcesPath
        });
        assertPlatformHostExecutable(binaryPath);
        try {
            this.transport.start({
                binaryPath,
                environment: this.localData.environment,
                logPrefix: PLATFORM_HOST_LOG_PREFIX
            });
        } catch (error) {
            await this.transport.stop();
            throw error;
        }
        return this.transport.connection;
    }
    async stopPlatformHost() {
        await this.transport.stop();
    }
    constructor(...args){
        super(...args), this.featureIds = [
            (/* inlined export .WellKnownFeatureId.Recording */"recording")
        ], this.target = 'darwin';
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], SelectedDesktopPlatform.prototype, "configuration", void 0);
__decorate([
    inject(DesktopPlatformSerialTask),
    __metadata("design:type", typeof DesktopPlatformSerialTask === "undefined" ? Object : DesktopPlatformSerialTask)
], SelectedDesktopPlatform.prototype, "serialTask", void 0);
__decorate([
    inject(PlatformHostTransport),
    __metadata("design:type", typeof PlatformHostTransport === "undefined" ? Object : PlatformHostTransport)
], SelectedDesktopPlatform.prototype, "transport", void 0);
__decorate([
    inject(DarwinLocalData),
    __metadata("design:type", typeof DarwinLocalData === "undefined" ? Object : DarwinLocalData)
], SelectedDesktopPlatform.prototype, "localData", void 0);
SelectedDesktopPlatform = __decorate([
    injectable()
], SelectedDesktopPlatform);
