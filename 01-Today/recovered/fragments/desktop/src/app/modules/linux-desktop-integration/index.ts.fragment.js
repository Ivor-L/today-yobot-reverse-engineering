// Compiled fragment from ./src/app/modules/linux-desktop-integration/index.ts.
// The original TypeScript and import graph are not restored.












class DesktopLinuxDesktopIntegration {
    async prepare() {
        if (this.configuration.platform !== 'linux') {
            return;
        }
        const appImage = this.configuration.environment['APPIMAGE'];
        if (!appImage) {
            return;
        }
        try {
            await this.install(appImage);
        } catch  {
            throw new Error('Unable to register the Today AppImage desktop entry and icon. Keep the AppImage in an accessible location and ensure your user application data directory is writable.');
        }
    }
    async install(appImage) {
        if (!(0,external_node_path_namespaceObject.isAbsolute)(appImage) || appImage.includes('=')) {
            throw new Error('The AppImage executable path must be absolute and cannot contain =.');
        }
        // APPIMAGE identifies the persistent file; execPath points inside a temporary mount.
        const appImagePath = await (0,promises_namespaceObject.realpath)(appImage);
        const appImageStat = await (0,promises_namespaceObject.stat)(appImagePath);
        if (!appImageStat.isFile() || appImagePath.includes('=')) {
            throw new Error('The AppImage executable must be a regular file.');
        }
        const { appName, buildEnvironment, launchOptions } = this.configuration.current;
        const desktopFileName = LINUX_DESKTOP_FILE_NAMES[buildEnvironment];
        const appId = desktopFileName.slice(0, -'.desktop'.length);
        const configuredDataHome = this.configuration.environment['XDG_DATA_HOME'];
        let dataHome = (0,external_node_path_namespaceObject.join)(this.configuration.application.getPath('home'), '.local', 'share');
        if (configuredDataHome && (0,external_node_path_namespaceObject.isAbsolute)(configuredDataHome)) {
            dataHome = configuredDataHome;
        }
        const iconPath = (0,external_node_path_namespaceObject.join)(dataHome, appId, 'icon.png');
        const desktopPath = (0,external_node_path_namespaceObject.join)(dataHome, 'applications', desktopFileName);
        const icon = await (0,promises_namespaceObject.readFile)(this.assets.iconPath);
        if (icon.length === 0) {
            throw new Error('The AppImage icon is empty.');
        }
        const entry = createDesktopEntry({
            appId,
            appImagePath,
            appName,
            iconPath,
            launchOptions,
            sandboxDisabled: this.configuration.current.noSandboxOnStartup,
            // Linux 不参与 macOS 的地区划分，沿用默认 scheme。
            scheme: resolveDesktopDeepLinkScheme(buildEnvironment)
        });
        // Publish the desktop entry only after its persistent icon is available.
        await this.writeIfChanged(iconPath, icon);
        await this.writeIfChanged(desktopPath, Buffer.from(entry));
    }
    async writeIfChanged(path, content) {
        try {
            if ((await (0,promises_namespaceObject.readFile)(path)).equals(content)) {
                return;
            }
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
        await (0,promises_namespaceObject.mkdir)((0,external_node_path_namespaceObject.dirname)(path), {
            recursive: true
        });
        const temporaryPath = `${path}.${(0,external_node_crypto_namespaceObject.randomUUID)()}.tmp`;
        try {
            await (0,promises_namespaceObject.writeFile)(temporaryPath, content, {
                flag: 'wx',
                mode: 420
            });
            await (0,promises_namespaceObject.rename)(temporaryPath, path);
        } finally{
            await (0,promises_namespaceObject.rm)(temporaryPath, {
                force: true
            });
        }
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], DesktopLinuxDesktopIntegration.prototype, "configuration", void 0);
__decorate([
    inject(DesktopAssets),
    __metadata("design:type", typeof DesktopAssets === "undefined" ? Object : DesktopAssets)
], DesktopLinuxDesktopIntegration.prototype, "assets", void 0);
DesktopLinuxDesktopIntegration = __decorate([
    injectable()
], DesktopLinuxDesktopIntegration);
