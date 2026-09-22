// Compiled fragment from ./src/app/index.ts.
// The original TypeScript and import graph are not restored.


























class DesktopMainApp {
    static async create(options) {
        const container = new Container({
            autobind: true,
            defaultScope: 'Singleton'
        });
        container.bind(DESKTOP_MAIN_APP_OPTIONS).toConstantValue(options);
        bindDepsToContainer(container);
        const [configuration, dataReset, features, linuxDesktopIntegration, networkInspector, platform, preflight, remoteDebugging, shellAdapter, shortcuts, singleInstance, runtimeWatcher] = getFromContainer(container, DesktopConfiguration, DesktopDataResetStartup, DesktopFeatures, DesktopLinuxDesktopIntegration, DesktopNetworkInspector, SelectedDesktopPlatform, DesktopPreflight, DesktopRemoteDebugging, DesktopShellAdapter, ShellShortcuts, DesktopSingleInstance, DesktopWebRuntimeDiagnostics);
        let nodeAdapter;
        try {
            configuration.prepare();
            const { accountConfig, ipc } = configuration;
            if (!singleInstance.tryAcquire()) {
                return null;
            }
            // Keep disk removal synchronous in the first tick, before Chromium creates
            // its Session. Native preferences are cleared before the normal Host starts.
            const resettingData = dataReset.prepare();
            if (resettingData) {
                await dataReset.clearStagedUpdate();
                await platform.resetLocalData();
            }
            const networkInspectionPrepared = await networkInspector.prepare();
            if (!networkInspectionPrepared) {
                return null;
            }
            if (resettingData) {
                dataReset.complete();
            }
            await features.prepare(platform.featureIds);
            remoteDebugging.prepare();
            preflight.run();
            await linuxDesktopIntegration.prepare();
            const connection = await platform.start();
            nodeAdapter = ClientNodeAdapter.create(connection, ipc, {
                accountConfig,
                featureIds: features.featureIds,
                logsConfig: configuration.logsConfig,
                shell: shellAdapter,
                shortcuts,
                runtimeWatcher
            });
            container.bind(ClientNodeAdapter).toConstantValue(nodeAdapter);
            // The shortcut host is constructed before the Adapter it takes modifier-gesture
            // leases through, so the minimal public CPI is handed over here, alongside the
            // Shell Adapter attach, and before Shortcuts initialize during launch.
            shortcuts.attachCrossPlatformInterface(nodeAdapter.cpi);
            const shell = container.get(DesktopShell);
            shellAdapter.attach(shell);
            const desktopApp = container.get(DesktopMainApp);
            singleInstance.bindActivation((request)=>{
                desktopApp.activate(request);
            });
            return desktopApp;
        } catch (error) {
            await cleanupAfterFailure({
                networkInspector,
                nodeAdapter,
                platform,
                remoteDebugging
            });
            throw error;
        }
    }
    async launch() {
        try {
            this.shell.prepare();
            await this.shell.whenReady();
            await this.remoteDebugging.start();
            await this.shell.launch();
            const { preferencesRuntime: preferences } = this.configuration;
            await this.nodeAdapter.launch({
                preferences
            });
            await this.shell.startMeetingReminders();
            await this.adjustAttribution.start();
            await this.webAccess.start();
            await this.webRuntime.start();
            this.shell.open();
            this.launched = true;
            const pendingActivation = this.activationPending;
            if (pendingActivation) {
                this.activationPending = undefined;
                this.handleActivation(pendingActivation);
            }
        } catch (error) {
            try {
                await this.adjustAttribution.stop();
            } catch (cleanupError) {
                console.error('[desktop] failed to stop Adjust attribution', cleanupError);
            }
            try {
                await this.webAccess.stop();
            } catch (cleanupError) {
                console.error('[desktop] failed to stop Web access configuration', cleanupError);
            }
            this.webRuntime.stop();
            await cleanupAfterFailure({
                networkInspector: this.networkInspector,
                nodeAdapter: this.nodeAdapter,
                platform: this.platform,
                remoteDebugging: this.remoteDebugging
            });
            throw error;
        }
    }
    activate(request = {}) {
        if (!this.launched) {
            this.activationPending = mergeDesktopActivationRequests(this.activationPending, request);
            return;
        }
        this.handleActivation(request);
    }
    handleActivation(request) {
        if (request.deepLink) {
            this.shell.openDeepLink(request.deepLink);
            return;
        }
        this.shell.open();
    }
    constructor(){
        this.launched = false;
    }
}
__decorate([
    inject(DesktopAdjustAttribution),
    __metadata("design:type", typeof DesktopAdjustAttribution === "undefined" ? Object : DesktopAdjustAttribution)
], DesktopMainApp.prototype, "adjustAttribution", void 0);
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], DesktopMainApp.prototype, "nodeAdapter", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], DesktopMainApp.prototype, "configuration", void 0);
__decorate([
    inject(DesktopNetworkInspector),
    __metadata("design:type", typeof DesktopNetworkInspector === "undefined" ? Object : DesktopNetworkInspector)
], DesktopMainApp.prototype, "networkInspector", void 0);
__decorate([
    inject(SelectedDesktopPlatform),
    __metadata("design:type", typeof IDesktopPlatform === "undefined" ? Object : IDesktopPlatform)
], DesktopMainApp.prototype, "platform", void 0);
__decorate([
    inject(DesktopRemoteDebugging),
    __metadata("design:type", typeof DesktopRemoteDebugging === "undefined" ? Object : DesktopRemoteDebugging)
], DesktopMainApp.prototype, "remoteDebugging", void 0);
__decorate([
    inject(DesktopShell),
    __metadata("design:type", typeof DesktopShell === "undefined" ? Object : DesktopShell)
], DesktopMainApp.prototype, "shell", void 0);
__decorate([
    inject(DesktopWebAccess),
    __metadata("design:type", typeof DesktopWebAccess === "undefined" ? Object : DesktopWebAccess)
], DesktopMainApp.prototype, "webAccess", void 0);
__decorate([
    inject(DesktopWebRuntime),
    __metadata("design:type", typeof DesktopWebRuntime === "undefined" ? Object : DesktopWebRuntime)
], DesktopMainApp.prototype, "webRuntime", void 0);
DesktopMainApp = __decorate([
    injectable()
], DesktopMainApp);
