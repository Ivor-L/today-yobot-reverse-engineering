// Compiled fragment from ./src/app/platforms/darwin/modules/local-data/index.ts.
// The original TypeScript and import graph are not restored.









class DarwinLocalData {
    get environment() {
        const application = this.configuration.application;
        const profileDigest = (0,external_node_crypto_namespaceObject.createHash)('sha256').update(application.getPath('userData')).digest('hex');
        return {
            TODAY_HOME_ROOT: application.getPath('home'),
            TODAY_DESKTOP_ROOT: application.getPath('desktop'),
            TODAY_DOCUMENTS_ROOT: application.getPath('documents'),
            TODAY_DOWNLOADS_ROOT: application.getPath('downloads'),
            TODAY_PLATFORM_STATE_NAMESPACE: `ai.today.desktop.profile.${profileDigest}`
        };
    }
    async reset() {
        const application = this.configuration.application;
        const { isDevelopment, localProfileId } = this.configuration.current.launchOptions;
        const args = [
            '--reset-local-data'
        ];
        if (application.isPackaged && !isDevelopment && !localProfileId) {
            args.push('--include-application-state');
        }
        const binaryPath = resolvePlatformHostPath({
            appPath: application.getAppPath(),
            environment: this.configuration.environment,
            isPackaged: application.isPackaged,
            resourcesPath: this.configuration.resourcesPath
        });
        assertPlatformHostExecutable(binaryPath);
        try {
            await (0,external_node_util_namespaceObject.promisify)(external_node_child_process_namespaceObject.execFile)(binaryPath, args, {
                env: this.environment,
                killSignal: 'SIGKILL',
                maxBuffer: 4096,
                timeout: 10000
            });
        } catch  {
            throw new Error('The macOS platform host could not reset its local data.');
        }
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], DarwinLocalData.prototype, "configuration", void 0);
DarwinLocalData = __decorate([
    injectable()
], DarwinLocalData);
