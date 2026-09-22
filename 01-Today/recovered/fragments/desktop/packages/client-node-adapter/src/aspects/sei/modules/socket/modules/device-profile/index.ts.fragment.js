// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/socket/modules/device-profile/index.ts.
// The original TypeScript and import graph are not restored.









class UserSocketDeviceProfile {
    async get() {
        if (this.value) {
            return this.value;
        }
        if (this.task) {
            return await this.task;
        }
        const task = this.read();
        this.task = task;
        try {
            const value = await task;
            this.value = value;
            return value;
        } finally{
            if (this.task === task) {
                this.task = null;
            }
        }
    }
    async read() {
        const [device, system, versionInfo] = await Promise.all([
            this.cpi.system.getDeviceInfo(),
            this.cpi.system.getSystemInfo(),
            this.update.getVersionInfo()
        ]);
        const displayName = device.displayName.trim();
        const installationId = device.installationId.trim();
        const version = versionInfo.version.trim();
        if (!displayName || !installationId || !version) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The User Socket device profile is unavailable.');
        }
        const metadata = DEVICE_REGISTRATION_PLATFORM_METADATA[system.platform];
        return Object.freeze({
            clientMachineId: installationId,
            deviceProfile: Object.freeze({
                name: displayName,
                clientPlatform: metadata.clientPlatform,
                clientType: DEVICE_CONNECTOR_CLIENT_TYPE_BY_PLATFORM[system.platform],
                platform: metadata.nodePlatform,
                version
            })
        });
    }
    constructor(){
        this.value = null;
        this.task = null;
    }
}
__decorate([
    inject(CROSS_PLATFORM_INTERFACE),
    __metadata("design:type", typeof Pick === "undefined" ? Object : Pick)
], UserSocketDeviceProfile.prototype, "cpi", void 0);
__decorate([
    inject(UpdateShellService),
    __metadata("design:type", typeof Pick === "undefined" ? Object : Pick)
], UserSocketDeviceProfile.prototype, "update", void 0);
UserSocketDeviceProfile = __decorate([
    injectable()
], UserSocketDeviceProfile);
