// Compiled fragment from ./src/app/modules/data-reset/modules/staged-update/index.ts.
// The original TypeScript and import graph are not restored.










class DesktopDataResetStagedUpdate {
    async clear() {
        const { application, platform } = this.configuration;
        if (platform !== 'darwin' || !application.isPackaged) {
            return;
        }
        try {
            const executable = await (0,promises_namespaceObject.realpath)(application.getPath('exe'));
            const executableDirectory = (0,external_node_path_namespaceObject.dirname)(executable);
            const contentsDirectory = (0,external_node_path_namespaceObject.dirname)(executableDirectory);
            const bundleDirectory = (0,external_node_path_namespaceObject.dirname)(contentsDirectory);
            if (!(0,external_node_path_namespaceObject.isAbsolute)(executable) || (0,external_node_path_namespaceObject.basename)(executableDirectory) !== 'MacOS' || (0,external_node_path_namespaceObject.basename)(contentsDirectory) !== 'Contents' || !(0,external_node_path_namespaceObject.basename)(bundleDirectory).endsWith('.app')) {
                throw new Error('Invalid application bundle.');
            }
            const result = await (0,external_node_util_namespaceObject.promisify)(external_node_child_process_namespaceObject.execFile)('/usr/bin/plutil', [
                '-extract',
                'CFBundleIdentifier',
                'raw',
                '-o',
                '-',
                (0,external_node_path_namespaceObject.join)(contentsDirectory, 'Info.plist')
            ], {
                encoding: 'utf8',
                maxBuffer: 4096,
                timeout: 5000
            });
            const identifier = resolveBundleIdentifier(result.stdout);
            const home = application.getPath('home');
            if (!(0,external_node_path_namespaceObject.isAbsolute)(home)) {
                throw new Error('Invalid application home.');
            }
            const directory = (0,external_node_path_namespaceObject.join)(home, 'Library', 'Caches', `${identifier}.ShipIt`);
            let directoryStats;
            try {
                directoryStats = await (0,promises_namespaceObject.lstat)(directory);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    return;
                }
                throw error;
            }
            if (!directoryStats.isDirectory() || directoryStats.isSymbolicLink()) {
                throw new Error('Invalid staged update directory.');
            }
            // The Node Update Owner must finish native staging before this operation.
            // Invalidate the installation request before deleting the referenced bundle.
            await (0,promises_namespaceObject.rm)((0,external_node_path_namespaceObject.join)(directory, 'ShipItState.plist'), {
                force: true,
                recursive: true
            });
            for (const entry of (await (0,promises_namespaceObject.readdir)(directory, {
                withFileTypes: true
            }))){
                if (entry.isFile() && isStagedUpdateLog(entry.name)) {
                    continue;
                }
                await (0,promises_namespaceObject.rm)((0,external_node_path_namespaceObject.join)(directory, entry.name), {
                    force: true,
                    recursive: true
                });
            }
        } catch  {
            // Native process and filesystem errors contain private paths and output.
            throw new Error('Unable to clear the staged application update.');
        }
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], DesktopDataResetStagedUpdate.prototype, "configuration", void 0);
DesktopDataResetStagedUpdate = __decorate([
    injectable()
], DesktopDataResetStagedUpdate);
