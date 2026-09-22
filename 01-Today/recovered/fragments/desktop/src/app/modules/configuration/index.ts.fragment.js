// Compiled fragment from ./src/app/modules/configuration/index.ts.
// The original TypeScript and import graph are not restored.













class DesktopConfiguration {
    get accountConfig() {
        const { environmentOverride, localWebOrigin } = this.current.launchOptions;
        if (localWebOrigin) {
            const environment = environmentOverride ?? base_RuntimeEnvironment.Development;
            return {
                ...account_ACCOUNT_CONFIG,
                [environment]: {
                    ...account_ACCOUNT_CONFIG[environment],
                    webSessionMirrorOrigin: localWebOrigin
                }
            };
        }
        return account_ACCOUNT_CONFIG;
    }
    get bootstrapVercelBypassSecret() {
        if (this.current.buildEnvironment === base_RuntimeEnvironment.Production) {
            return undefined;
        }
        const embedded = this.options.bypassSecret?.trim();
        if (this.application.isPackaged) {
            return embedded || undefined;
        }
        const configured = this.environment['TODAY_DESKTOP_VERCEL_BYPASS_SECRET']?.trim();
        return embedded || configured || undefined;
    }
    get application() {
        return this.options.application;
    }
    get current() {
        if (this.value) {
            return this.value;
        }
        return this.prepare();
    }
    get environment() {
        return this.options.environment ?? process.env;
    }
    get ipc() {
        return this.options.ipc;
    }
    get logsConfig() {
        const { buildEnvironment, launchOptions, platform } = this.current;
        return resolveClientNodeLogsConfig({
            appVersion: this.application.getVersion(),
            buildEnvironment,
            environment: this.environment,
            environmentOverride: launchOptions.environmentOverride ?? buildEnvironment,
            logs: this.options.logs,
            platform,
            userDataPath: this.application.getPath('userData')
        });
    }
    get preferencesRuntime() {
        const { buildEnvironment, launchOptions, settingsPath } = this.current;
        const { backendLane, environmentOverride } = launchOptions;
        return {
            application: this.application,
            ...backendLane ? {
                backendLane
            } : {},
            buildEnvironment,
            environmentOverride: environmentOverride ?? buildEnvironment,
            settingsPath
        };
    }
    get platform() {
        return this.current.platform;
    }
    get resourcesPath() {
        return this.options.resourcesPath ?? process.resourcesPath;
    }
    markProfileReset() {
        this.value = {
            ...this.current,
            profileExists: false
        };
    }
    prepare() {
        if (this.value) {
            return this.value;
        }
        const application = this.application;
        const { lane, platform: configuredPlatform } = this.options;
        const metadata = JSON.parse((0,external_node_fs_namespaceObject.readFileSync)((0,external_node_path_namespaceObject.join)(application.getAppPath(), 'package.json'), 'utf8'));
        const launchOptions = parseDesktopLaunchOptions(process.argv, this.environment, application.isPackaged, lane);
        const { httpProxy, isDevelopment } = launchOptions;
        let buildEnvironment = resolveBuildEnvironment(metadata);
        if (isDevelopment) {
            buildEnvironment = base_RuntimeEnvironment.Development;
        }
        const platform = resolveSupportedDesktopPlatform(configuredPlatform ?? process.platform);
        const applicationBuild = resolveApplicationBuild(metadata, application.getVersion());
        const noSandboxOnStartup = platform === 'linux' && application.commandLine.hasSwitch('no-sandbox');
        if (platform === 'linux') {
            application.commandLine.appendSwitch('enable-features', GLOBAL_SHORTCUTS_PORTAL_FEATURES);
            application.setDesktopName(LINUX_DESKTOP_FILE_NAMES[buildEnvironment]);
        }
        const appName = resolveApplicationName(launchOptions, buildEnvironment, platform);
        /**
     * 地区决定用户数据目录。两地包的 productName 同为 Today，
     * 不按地区分目录会共用同一份 Chromium profile 与单实例锁。
     */ const macosRegion = resolveMacosRegion(metadata);
        const userDataDirectoryName = resolveUserDataDirectoryName(launchOptions, buildEnvironment, platform, macosRegion);
        const appDataPath = application.getPath('appData');
        const profileOptions = {
            appDataPath,
            buildEnvironment,
            isDevelopment,
            isPackaged: application.isPackaged,
            localProfileId: launchOptions.localProfileId,
            macosRegion,
            platform,
            sharedProfileName: userDataDirectoryName
        };
        const profileExists = desktopProfileExists(profileOptions);
        prepareMacOSSharedProfile(profileOptions);
        if (httpProxy) {
            application.commandLine.appendSwitch('proxy-server', httpProxy);
        } else {
            application.commandLine.appendSwitch('no-proxy-server');
        }
        application.setName(appName);
        application.setPath('userData', (0,external_node_path_namespaceObject.join)(appDataPath, userDataDirectoryName));
        if (platform === 'win32') {
            application.setAppUserModelId(PRODUCT_IDENTITIES[buildEnvironment].appId);
        }
        application.enableSandbox();
        this.value = {
            appName,
            applicationBuild,
            buildEnvironment,
            launchOptions,
            macosRegion,
            noSandboxOnStartup,
            platform,
            profileExists,
            settingsPath: (0,external_node_path_namespaceObject.join)(application.getPath('userData'), 'settings.json')
        };
        return this.value;
    }
}
__decorate([
    inject(DESKTOP_MAIN_APP_OPTIONS),
    __metadata("design:type", typeof DesktopMainAppOptions === "undefined" ? Object : DesktopMainAppOptions)
], DesktopConfiguration.prototype, "options", void 0);
DesktopConfiguration = __decorate([
    injectable()
], DesktopConfiguration);
