// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/legacy-file-inventory-cleanup/index.ts.
// The original TypeScript and import graph are not restored.









class LegacyFileInventoryCleanup {
    start() {
        this.run();
    }
    async run() {
        try {
            const directory = (0,external_node_path_namespaceObject.dirname)(this.preferences.settingsPath);
            const names = await (0,promises_namespaceObject.readdir)(directory);
            for (const name of names){
                if (name === LEGACY_FILE_INVENTORY_NAME || /^file-inventory\.json\.\d+\.\d+\.tmp$/u.test(name)) {
                    await (0,promises_namespaceObject.rm)((0,external_node_path_namespaceObject.join)(directory, name), {
                        force: true
                    });
                }
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                return;
            }
            this.logger.warn('file-inventory', 'Legacy snapshot cleanup failed; no data will be uploaded.');
        }
    }
}
__decorate([
    inject(PreferencesShellService),
    __metadata("design:type", typeof PreferencesShellService === "undefined" ? Object : PreferencesShellService)
], LegacyFileInventoryCleanup.prototype, "preferences", void 0);
__decorate([
    inject(AdapterLogger),
    __metadata("design:type", typeof AdapterLogger === "undefined" ? Object : AdapterLogger)
], LegacyFileInventoryCleanup.prototype, "logger", void 0);
LegacyFileInventoryCleanup = __decorate([
    injectable()
], LegacyFileInventoryCleanup);
