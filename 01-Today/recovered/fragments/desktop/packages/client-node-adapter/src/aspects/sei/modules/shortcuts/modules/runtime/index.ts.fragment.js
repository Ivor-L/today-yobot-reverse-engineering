// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/shortcuts/modules/runtime/index.ts.
// The original TypeScript and import graph are not restored.





class ShortcutsRuntime {
    async getPlatform() {
        if (this.platform) {
            return this.platform;
        }
        if (this.platformFlight) {
            return this.platformFlight;
        }
        const flight = this.loadPlatform();
        this.platformFlight = flight;
        try {
            return await flight;
        } finally{
            if (this.platformFlight === flight) {
                this.platformFlight = undefined;
            }
        }
    }
    async register(binding, scope, listener) {
        return await this.host.register({
            binding,
            scope
        }, listener);
    }
    /** Reads the host's legacy Quick Chat migration source, if it offers one. */ async readLegacyQuickChatShortcut() {
        if (!this.host.readLegacyQuickChatShortcut) {
            return null;
        }
        return await this.host.readLegacyQuickChatShortcut();
    }
    async loadPlatform() {
        const { platform } = await this.cpi.system.getSystemInfo();
        this.platform = platform;
        return platform;
    }
}
__decorate([
    inject(CROSS_PLATFORM_INTERFACE),
    __metadata("design:type", typeof ICrossPlatformInterface === "undefined" ? Object : ICrossPlatformInterface)
], ShortcutsRuntime.prototype, "cpi", void 0);
__decorate([
    inject(CLIENT_NODE_SHORTCUT_HOST),
    __metadata("design:type", typeof ClientNodeShortcutHost === "undefined" ? Object : ClientNodeShortcutHost)
], ShortcutsRuntime.prototype, "host", void 0);
ShortcutsRuntime = __decorate([
    injectable()
], ShortcutsRuntime);
