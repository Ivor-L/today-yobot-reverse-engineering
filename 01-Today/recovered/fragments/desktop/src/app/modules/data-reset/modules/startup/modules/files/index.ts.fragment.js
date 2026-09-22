// Compiled fragment from ./src/app/modules/data-reset/modules/startup/modules/files/index.ts.
// The original TypeScript and import graph are not restored.











class DesktopDataResetFiles {
    clear() {
        const application = this.configuration.application;
        if (application.isReady()) {
            throw new Error('Local data must be reset before Electron is ready.');
        }
        const userData = (0,external_node_path_namespaceObject.resolve)(application.getPath('userData'));
        const sessionData = (0,external_node_path_namespaceObject.resolve)(application.getPath('sessionData'));
        const roots = [
            ...new Set([
                userData,
                sessionData,
                ...this.updateCache.paths
            ])
        ];
        const preserved = [
            (0,external_node_path_namespaceObject.resolve)(this.state.path),
            (0,external_node_path_namespaceObject.resolve)((0,external_node_path_namespaceObject.dirname)(this.configuration.logsConfig.filePath)),
            (0,external_node_path_namespaceObject.resolve)(application.getPath('logs')),
            ...SINGLE_INSTANCE_FILES.map((name)=>(0,external_node_path_namespaceObject.join)(userData, name))
        ];
        const forbidden = new Set([
            (0,external_node_path_namespaceObject.resolve)(application.getPath('home')),
            (0,external_node_path_namespaceObject.resolve)(application.getPath('appData')),
            (0,external_node_path_namespaceObject.resolve)(application.getAppPath())
        ]);
        // Validate every root before deleting anything. Only app-owned directories may
        // be removed; a symlink at a root must never redirect the recursive traversal.
        for (const root of roots){
            if (root === (0,external_node_path_namespaceObject.parse)(root).root || forbidden.has(root) || [
                ...forbidden
            ].some((path)=>containsPath(root, path)) || (0,external_node_fs_namespaceObject.existsSync)(root) && (!(0,external_node_fs_namespaceObject.lstatSync)(root).isDirectory() || (0,external_node_fs_namespaceObject.lstatSync)(root).isSymbolicLink()) || preserved.some((path)=>containsPath(path, root))) {
                throw new Error('The local data directory is unsafe to reset.');
            }
        }
        for (const root of roots){
            this.clearDirectory(root, preserved);
        }
    }
    clearDirectory(directory, preserved) {
        if (!(0,external_node_fs_namespaceObject.existsSync)(directory)) {
            return;
        }
        for (const entry of (0,external_node_fs_namespaceObject.readdirSync)(directory, {
            withFileTypes: true
        })){
            const path = (0,external_node_path_namespaceObject.join)(directory, entry.name);
            if (preserved.includes(path)) {
                continue;
            }
            if (preserved.some((keptPath)=>containsPath(path, keptPath))) {
                if (!entry.isDirectory() || entry.isSymbolicLink()) {
                    throw new Error('The local log directory is unsafe to preserve.');
                }
                this.clearDirectory(path, preserved);
                continue;
            }
            (0,external_node_fs_namespaceObject.rmSync)(path, {
                force: true,
                recursive: true,
                maxRetries: 3
            });
        }
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], DesktopDataResetFiles.prototype, "configuration", void 0);
__decorate([
    inject(DesktopDataResetState),
    __metadata("design:type", typeof DesktopDataResetState === "undefined" ? Object : DesktopDataResetState)
], DesktopDataResetFiles.prototype, "state", void 0);
__decorate([
    inject(DesktopDataResetUpdateCache),
    __metadata("design:type", typeof DesktopDataResetUpdateCache === "undefined" ? Object : DesktopDataResetUpdateCache)
], DesktopDataResetFiles.prototype, "updateCache", void 0);
DesktopDataResetFiles = __decorate([
    injectable()
], DesktopDataResetFiles);
