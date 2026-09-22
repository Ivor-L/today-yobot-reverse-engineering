// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/ipc/index.ts.
// The original TypeScript and import graph are not restored.





















class ShellDebugIpc {
    install() {
        const ipc = this.configuration.ipc;
        ipc.removeHandler(DEBUG_CLEAR_ALL_DATA_CHANNEL);
        ipc.removeHandler(DEBUG_GET_STATE_CHANNEL);
        ipc.removeHandler(DEBUG_OPEN_TOOL_PERMISSIONS_CHANNEL);
        ipc.removeHandler(DEBUG_OPEN_DEEP_LINK_DEBUG_CHANNEL);
        ipc.removeHandler(DEBUG_OPEN_DEVTOOLS_CHANNEL);
        ipc.removeHandler(DEBUG_OPEN_LOGS_DEBUG_CHANNEL);
        ipc.removeHandler(DEBUG_OPEN_LOGS_DIRECTORY_CHANNEL);
        ipc.removeHandler(DEBUG_UPLOAD_LOCAL_LOGS_CHANNEL);
        ipc.removeHandler(DEBUG_OPEN_NODE_DEVTOOLS_CHANNEL);
        ipc.removeHandler(DEBUG_OPEN_TOOLS_DEBUG_CHANNEL);
        ipc.removeHandler(DEBUG_OPEN_RECORD_DEBUG_CHANNEL);
        ipc.removeHandler(DEBUG_OPEN_RECORDINGS_DIRECTORY_CHANNEL);
        ipc.removeHandler(DEBUG_OPEN_RPC_DEBUG_CHANNEL);
        ipc.removeHandler(DEBUG_OPEN_SOCKET_DEBUG_CHANNEL);
        ipc.removeHandler(DEBUG_RELOAD_MAIN_WINDOW_CHANNEL);
        ipc.removeHandler(DEBUG_SET_ENVIRONMENT_CHANNEL);
        ipc.removeHandler(DEBUG_SET_NODE_NETWORK_INSPECTION_CHANNEL);
        ipc.removeHandler(DEBUG_SET_FEATURE_OVERRIDE_CHANNEL);
        ipc.removeHandler(DEBUG_RESET_FEATURE_OVERRIDES_CHANNEL);
        ipc.removeHandler(DEBUG_SET_TRAFFIC_LANE_CHANNEL);
        ipc.removeHandler(DEBUG_TRIGGER_REQUIRED_UPDATE_CHANNEL);
        ipc.handle(DEBUG_CLEAR_ALL_DATA_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            await this.dataReset.requestReset();
        });
        ipc.handle(DEBUG_GET_STATE_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            return await this.getState();
        });
        ipc.handle(DEBUG_OPEN_TOOL_PERMISSIONS_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            await this.toolPermissions.show();
        });
        ipc.handle(DEBUG_OPEN_DEEP_LINK_DEBUG_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            await this.deepLinkDebug.show();
        });
        ipc.handle(DEBUG_OPEN_DEVTOOLS_CHANNEL, (event)=>{
            this.assertTrustedSender(event);
            this.window.openMainWindowDevTools();
        });
        ipc.handle(DEBUG_OPEN_LOGS_DEBUG_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            await this.logsDebug.show();
        });
        ipc.handle(DEBUG_OPEN_LOGS_DIRECTORY_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            await this.adapter.sei.logs.openDirectory();
        });
        ipc.handle(DEBUG_UPLOAD_LOCAL_LOGS_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            await this.logUpload.startUpload();
        });
        ipc.handle(DEBUG_OPEN_NODE_DEVTOOLS_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            await this.nodeDevTools.show();
        });
        ipc.handle(DEBUG_OPEN_TOOLS_DEBUG_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            await this.toolsDebug.show();
        });
        ipc.handle(DEBUG_OPEN_RECORD_DEBUG_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            await this.recordDebug.show();
        });
        ipc.handle(DEBUG_OPEN_RECORDINGS_DIRECTORY_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            await this.adapter.sei.record.openDirectory();
        });
        ipc.handle(DEBUG_OPEN_RPC_DEBUG_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            await this.rpcDebug.show();
        });
        ipc.handle(DEBUG_OPEN_SOCKET_DEBUG_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            await this.socketDebug.show();
        });
        ipc.handle(DEBUG_RELOAD_MAIN_WINDOW_CHANNEL, (event)=>{
            this.assertTrustedSender(event);
            this.window.reloadMainWindowPage();
        });
        ipc.handle(DEBUG_SET_ENVIRONMENT_CHANNEL, async (event, value)=>{
            this.assertTrustedSender(event);
            if (!isAppEnvironment(value)) {
                throw new Error('Unsupported desktop environment');
            }
            await this.adapter.sei.preferences.environment.setValue({
                value: toRuntimeEnvironment(value)
            });
            return await this.getState();
        });
        ipc.handle(DEBUG_SET_NODE_NETWORK_INSPECTION_CHANNEL, async (event, value)=>{
            this.assertTrustedSender(event);
            const enabled = parseDebugNetworkInspectionEnabled(value);
            if (enabled === this.networkInspector.enabled) {
                return false;
            }
            if (!await this.window.confirmNodeNetworkInspectionRestart(enabled)) {
                return false;
            }
            await this.networkInspector.setEnabled(enabled);
            return true;
        });
        ipc.handle(DEBUG_SET_FEATURE_OVERRIDE_CHANNEL, async (event, value)=>{
            this.assertTrustedSender(event);
            const params = parseDebugFeatureOverride(value);
            const feature = await this.adapter.sei.features.getFeature({
                featureId: params.featureId
            });
            if (!feature.debug) {
                throw new Error('This feature does not expose a boolean debug control');
            }
            await this.adapter.sei.features.setOverrideValue(params);
            return await this.getState();
        });
        ipc.handle(DEBUG_RESET_FEATURE_OVERRIDES_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            await this.adapter.sei.features.resetOverrides();
            return await this.getState();
        });
        ipc.handle(DEBUG_SET_TRAFFIC_LANE_CHANNEL, async (event, value)=>{
            this.assertTrustedSender(event);
            const trafficLane = parseDebugTrafficLane(value);
            await this.adapter.sei.preferences.trafficLane.setValue({
                value: trafficLane
            });
            await this.window.reloadMainWindow(this.webContext.current.webUrl);
            return await this.getState();
        });
        ipc.handle(DEBUG_TRIGGER_REQUIRED_UPDATE_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            await this.adapter.sei.update.requestRequiredPresentation();
        });
    }
    assertTrustedSender(event) {
        if (this.window.isTrustedSender(event)) {
            return;
        }
        throw new Error('Rejected untrusted debug IPC sender');
    }
    async getState() {
        const { buildEnvironment, launchOptions, platform } = this.configuration.current;
        const { httpProxy } = launchOptions;
        const { environment: environmentPreference, trafficLane: trafficLanePreference } = this.adapter.sei.preferences;
        const { value: environmentValue, writable: canSwitchEnvironment } = environmentPreference;
        const { value: trafficLane, writable: trafficLaneWritable } = trafficLanePreference;
        const environment = toAppEnvironment(environmentValue);
        return {
            buildEnvironment: toAppEnvironment(buildEnvironment),
            canSwitchEnvironment,
            environment,
            features: await this.adapter.sei.features.listFeatures(),
            ...httpProxy ? {
                httpProxy
            } : {},
            isTrafficLaneLocked: !trafficLaneWritable,
            loginUrl: this.webContext.current.webUrl,
            deepLinkDebugAvailable: this.deepLinkDebug.available,
            logsDebugAvailable: this.logsDebug.available,
            nodeNetworkInspectionEnabled: this.networkInspector.enabled,
            recordDebugAvailable: this.recordDebug.available,
            rpcDebugAvailable: this.rpcDebug.available,
            toolsDebugAvailable: this.toolsDebug.available,
            socketDebugAvailable: this.socketDebug.available,
            target: toDesktopTarget(platform),
            ...trafficLane ? {
                trafficLane
            } : {},
            version: this.configuration.application.getVersion()
        };
    }
}
__decorate([
    inject(ShellLogUploadPanel),
    __metadata("design:type", typeof ShellLogUploadPanel === "undefined" ? Object : ShellLogUploadPanel)
], ShellDebugIpc.prototype, "logUpload", void 0);
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], ShellDebugIpc.prototype, "adapter", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellDebugIpc.prototype, "configuration", void 0);
__decorate([
    inject(DesktopDataReset),
    __metadata("design:type", typeof DesktopDataReset === "undefined" ? Object : DesktopDataReset)
], ShellDebugIpc.prototype, "dataReset", void 0);
__decorate([
    inject(DesktopNetworkInspector),
    __metadata("design:type", typeof DesktopNetworkInspector === "undefined" ? Object : DesktopNetworkInspector)
], ShellDebugIpc.prototype, "networkInspector", void 0);
__decorate([
    inject(ShellWebContext),
    __metadata("design:type", typeof ShellWebContext === "undefined" ? Object : ShellWebContext)
], ShellDebugIpc.prototype, "webContext", void 0);
__decorate([
    inject(ShellDebugWindow),
    __metadata("design:type", typeof ShellDebugWindow === "undefined" ? Object : ShellDebugWindow)
], ShellDebugIpc.prototype, "window", void 0);
__decorate([
    inject(ShellDeepLinkDebugPanel),
    __metadata("design:type", typeof ShellDeepLinkDebugPanel === "undefined" ? Object : ShellDeepLinkDebugPanel)
], ShellDebugIpc.prototype, "deepLinkDebug", void 0);
__decorate([
    inject(ShellToolPermissionsPanel),
    __metadata("design:type", typeof ShellToolPermissionsPanel === "undefined" ? Object : ShellToolPermissionsPanel)
], ShellDebugIpc.prototype, "toolPermissions", void 0);
__decorate([
    inject(ShellToolsDebugPanel),
    __metadata("design:type", typeof ShellToolsDebugPanel === "undefined" ? Object : ShellToolsDebugPanel)
], ShellDebugIpc.prototype, "toolsDebug", void 0);
__decorate([
    inject(ShellRecordDebugPanel),
    __metadata("design:type", typeof ShellRecordDebugPanel === "undefined" ? Object : ShellRecordDebugPanel)
], ShellDebugIpc.prototype, "recordDebug", void 0);
__decorate([
    inject(ShellRpcDebugPanel),
    __metadata("design:type", typeof ShellRpcDebugPanel === "undefined" ? Object : ShellRpcDebugPanel)
], ShellDebugIpc.prototype, "rpcDebug", void 0);
__decorate([
    inject(ShellLogsDebugPanel),
    __metadata("design:type", typeof ShellLogsDebugPanel === "undefined" ? Object : ShellLogsDebugPanel)
], ShellDebugIpc.prototype, "logsDebug", void 0);
__decorate([
    inject(ShellNodeDevTools),
    __metadata("design:type", typeof ShellNodeDevTools === "undefined" ? Object : ShellNodeDevTools)
], ShellDebugIpc.prototype, "nodeDevTools", void 0);
__decorate([
    inject(ShellSocketDebugPanel),
    __metadata("design:type", typeof ShellSocketDebugPanel === "undefined" ? Object : ShellSocketDebugPanel)
], ShellDebugIpc.prototype, "socketDebug", void 0);
ShellDebugIpc = __decorate([
    injectable()
], ShellDebugIpc);
