// Compiled fragment from ./src/app/modules/data-reset/modules/startup/modules/files/modules/update-cache/index.ts.
// The original TypeScript and import graph are not restored.








class DesktopDataResetUpdateCache {
    get paths() {
        const { application, environment, platform, resourcesPath } = this.configuration;
        if (!application.isPackaged) {
            return [];
        }
        const configPath = (0,external_node_path_namespaceObject.join)(resourcesPath, 'app-update.yml');
        if (!(0,external_node_fs_namespaceObject.existsSync)(configPath)) {
            return [];
        }
        const metadata = (0,yaml_dist/* .parse */.qg)((0,external_node_fs_namespaceObject.readFileSync)(configPath, 'utf8'));
        const configuredName = metadata?.updaterCacheDirName;
        const name = configuredName ?? application.getName();
        if (typeof name !== 'string' || !name.trim() || name === '.' || name === '..' || (0,external_node_path_namespaceObject.basename)(name) !== name || name.includes('\\') || name.includes('\0')) {
            throw new Error('The application update cache directory is invalid.');
        }
        const home = application.getPath('home');
        let cacheRoot = environment.XDG_CACHE_HOME || (0,external_node_path_namespaceObject.join)(home, '.cache');
        if (platform === 'darwin') {
            cacheRoot = (0,external_node_path_namespaceObject.join)(home, 'Library', 'Caches');
        } else if (platform === 'win32') {
            cacheRoot = environment.LOCALAPPDATA || (0,external_node_path_namespaceObject.join)(home, 'AppData', 'Local');
        }
        if (!(0,external_node_path_namespaceObject.isAbsolute)(cacheRoot)) {
            throw new Error('The application cache root must be absolute.');
        }
        return [
            (0,external_node_path_namespaceObject.join)(cacheRoot, name)
        ];
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], DesktopDataResetUpdateCache.prototype, "configuration", void 0);
DesktopDataResetUpdateCache = __decorate([
    injectable()
], DesktopDataResetUpdateCache);
