// Compiled fragment from ./src/app/modules/assets/index.ts.
// The original TypeScript and import graph are not restored.








class DesktopAssets {
    get childWindowLoadingPagePath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getAppPath(), 'dist', 'pages', 'child-window-loading-page', 'index.html');
    }
    get errorPagePath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getAppPath(), 'dist', 'pages', 'error-page', 'index.html');
    }
    get debugPagePath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getAppPath(), 'dist', 'pages', 'debug', 'index.html');
    }
    get debugPreloadPath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getAppPath(), 'dist', 'pages', 'debug', 'preload.cjs');
    }
    get recordDebugPagePath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getAppPath(), 'dist', 'pages', 'record-debug', 'index.html');
    }
    get recordDebugPreloadPath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getAppPath(), 'dist', 'pages', 'record-debug', 'preload.cjs');
    }
    get deepLinkDebugPagePath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getAppPath(), 'dist', 'pages', 'deep-link-debug', 'index.html');
    }
    get deepLinkDebugPreloadPath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getAppPath(), 'dist', 'pages', 'deep-link-debug', 'preload.cjs');
    }
    get iconPath() {
        return this.resolveAsset('icon.png');
    }
    get loadingPagePath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getAppPath(), 'dist', 'pages', 'loading-page', 'index.html');
    }
    get logsDebugPagePath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getAppPath(), 'dist', 'pages', 'logs-debug', 'index.html');
    }
    get logUploadPagePath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getAppPath(), 'dist', 'pages', 'log-upload', 'index.html');
    }
    get logUploadPreloadPath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getAppPath(), 'dist', 'pages', 'log-upload', 'preload.cjs');
    }
    get logsDebugPreloadPath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getAppPath(), 'dist', 'pages', 'logs-debug', 'preload.cjs');
    }
    get preloadPath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getAppPath(), 'dist', 'preload', 'desktop.cjs');
    }
    get meetingReminderPagePath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getAppPath(), 'dist', 'pages', 'meeting-reminder', 'index.html');
    }
    get meetingReminderPreloadPath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getAppPath(), 'dist', 'pages', 'meeting-reminder', 'preload.cjs');
    }
    get recordingCapsulePagePath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getAppPath(), 'dist', 'pages', 'recording-capsule', 'index.html');
    }
    get recordingCapsulePreloadPath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getAppPath(), 'dist', 'pages', 'recording-capsule', 'preload.cjs');
    }
    get windowChromePath() {
        const application = this.configuration.application;
        if (!application.isPackaged) {
            const configuredPath = this.configuration.environment['TODAY_WINDOW_CHROME_PATH']?.trim();
            if (configuredPath) {
                return configuredPath;
            }
        }
        let directory = (0,external_node_path_namespaceObject.join)(application.getAppPath(), 'dist', 'native', 'macos');
        if (application.isPackaged) {
            directory = (0,external_node_path_namespaceObject.join)(this.configuration.resourcesPath, 'tools', 'macos');
        }
        return (0,external_node_path_namespaceObject.join)(directory, WINDOW_CHROME_RESOURCE_NAME);
    }
    get rpcDebugPagePath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getAppPath(), 'dist', 'pages', 'rpc-debug', 'index.html');
    }
    get rpcDebugPreloadPath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getAppPath(), 'dist', 'pages', 'rpc-debug', 'preload.cjs');
    }
    get toolPermissionsPagePath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getAppPath(), 'dist', 'pages', 'tool-permissions', 'index.html');
    }
    get toolPermissionsPreloadPath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getAppPath(), 'dist', 'pages', 'tool-permissions', 'preload.cjs');
    }
    get toolsDebugPagePath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getAppPath(), 'dist', 'pages', 'tools-debug', 'index.html');
    }
    get toolsDebugPreloadPath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getAppPath(), 'dist', 'pages', 'tools-debug', 'preload.cjs');
    }
    get socketDebugPagePath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getAppPath(), 'dist', 'pages', 'socket-debug', 'index.html');
    }
    get socketDebugPreloadPath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getAppPath(), 'dist', 'pages', 'socket-debug', 'preload.cjs');
    }
    get trayIconPath() {
        const filename = {
            darwin: 'tray-iconTemplate.png',
            linux: 'tray-icon-linux.png',
            win32: 'icon.png'
        }[this.configuration.platform];
        return this.resolveAsset(filename);
    }
    webRuntimeServerPath(environment) {
        return (0,external_node_path_namespaceObject.join)(this.configuration.resourcesPath, 'web-runtimes', `${environment}.asar`, 'apps', 'web', 'server.js');
    }
    webRuntimeBuildInfoPath(environment) {
        return (0,external_node_path_namespaceObject.join)(this.configuration.resourcesPath, 'web-runtimes', `${environment}.asar`, 'apps', 'web', 'public', 'build-info.json');
    }
    get webRuntimeManifestPath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.resourcesPath, 'web-runtimes', 'manifest.json');
    }
    get webRuntimeHostPath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getAppPath(), 'dist', 'app', 'web-runtime-host.cjs');
    }
    assertRequiredFiles() {
        const requiredFiles = [
            this.preloadPath,
            this.childWindowLoadingPagePath,
            this.loadingPagePath,
            this.errorPagePath,
            this.debugPagePath,
            this.debugPreloadPath,
            this.deepLinkDebugPagePath,
            this.deepLinkDebugPreloadPath,
            this.recordDebugPagePath,
            this.recordDebugPreloadPath,
            this.logsDebugPagePath,
            this.logsDebugPreloadPath,
            this.logUploadPagePath,
            this.logUploadPreloadPath,
            this.rpcDebugPagePath,
            this.rpcDebugPreloadPath,
            this.toolsDebugPagePath,
            this.toolsDebugPreloadPath,
            this.toolPermissionsPagePath,
            this.toolPermissionsPreloadPath,
            this.socketDebugPagePath,
            this.socketDebugPreloadPath,
            this.meetingReminderPagePath,
            this.meetingReminderPreloadPath,
            this.iconPath,
            this.trayIconPath,
            ...this.configuration.platform === 'darwin' ? [
                this.recordingCapsulePagePath,
                this.recordingCapsulePreloadPath,
                this.windowChromePath
            ] : []
        ];
        for (const path of requiredFiles){
            try {
                if ((0,external_node_fs_namespaceObject.statSync)(path).isFile()) {
                    continue;
                }
            } catch (error) {
                throw new Error(`Required shell asset is unavailable: ${path}`, {
                    cause: error
                });
            }
            throw new Error(`Required shell asset is not a file: ${path}`);
        }
    }
    resolveAsset(filename) {
        const application = this.configuration.application;
        let assetPath = (0,external_node_path_namespaceObject.join)(application.getAppPath(), 'build', filename);
        if (application.isPackaged) {
            assetPath = (0,external_node_path_namespaceObject.join)(this.configuration.resourcesPath, filename);
        }
        return assetPath;
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], DesktopAssets.prototype, "configuration", void 0);
DesktopAssets = __decorate([
    injectable()
], DesktopAssets);
