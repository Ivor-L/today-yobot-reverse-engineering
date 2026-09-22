// Compiled fragment from ../../packages/client-node-adapter/src/adapter/index.ts.
// The original TypeScript and import graph are not restored.


































class ClientNodeAdapter {
    static create(connection, ipcMain, options) {
        const { accountConfig, featureIds: requestedFeatureIds = [], logsConfig, runtimeWatcher, shell, shortcuts } = options;
        const debugCapable = true;
        const featureIds = requestedFeatureIds;
        const recordingSupported = featureIds.includes((/* inlined export .WellKnownFeatureId.Recording */"recording"));
        const manager = NodeAdapterPeerManager.create(connection, ipcMain, {
            debugCapable,
            resolveWebContentsSurface: (sender)=>shell.resolveSurface(sender)
        });
        const container = new Container({
            autobind: true,
            defaultScope: 'Singleton'
        });
        container.bind(NodeAdapterPeerManager).toConstantValue(manager);
        container.bind(ACCOUNT_CONFIG).toConstantValue(accountConfig);
        container.bind(CLIENT_NODE_SHELL).toConstantValue(shell);
        container.bind(CLIENT_NODE_LOGS_CONFIG).toConstantValue(logsConfig);
        container.bind(CLIENT_NODE_FEATURE_IDS).toConstantValue(featureIds);
        container.bind(CLIENT_NODE_SHORTCUT_HOST).toConstantValue(shortcuts);
        if (runtimeWatcher) {
            container.bind(CLIENT_NODE_RUNTIME_WATCHER).toConstantValue(runtimeWatcher);
        }
        container.bind(CLIENT_NODE_WEB_REQUEST_CONTEXT).toConstantValue(manager.webRequestContext);
        container.bind(CROSS_PLATFORM_INTERFACE).toConstantValue(manager.cpi);
        container.bind(DEBUG_CAPABLE).toConstantValue(debugCapable);
        container.bind(RPC_CALL_REPORTER).to(RpcCallReporter);
        container.bind(PREFERENCE_SHELL_ITEM).toService(EnvironmentPreference);
        container.bind(PREFERENCE_SHELL_ITEM).toService(TrafficLanePreference);
        container.bind(PREFERENCE_SHELL_ITEM).toService(PreventSleepPreference);
        container.bind(PREFERENCE_SHELL_ITEM).toService(MessageNotificationsPreference);
        container.bind(PREFERENCE_SHELL_ITEM).toService(MeetingDetectionPreference);
        container.bind(LOGS_PUSH_TARGET).to(ConsoleLogsPushTarget);
        container.bind(LOGS_PUSH_TARGET).to(PostHogLogsPushTarget);
        container.bind(LOGS_PUSH_TARGET).toService(SentryLogsPushTarget);
        container.bind(LOGS_PUSH_TARGET).toService(FileLogsPushTarget);
        container.bind(FEATURE_SHELL_ITEM).to(ShowSidePanelFeature);
        if (recordingSupported) {
            container.bind(FEATURE_SHELL_ITEM).to(RecordingFeature);
        }
        container.bind(SHORTCUT_SHELL_ITEM).to(ChatHistorySearchShortcut);
        container.bind(SHORTCUT_SHELL_ITEM).to(QuickChatShortcut);
        return container.get(ClientNodeAdapter);
    }
    get sei() {
        return this.shell;
    }
    dispose(options = {}) {
        const { forDataReset = false } = options;
        if (forDataReset) {
            if (this.dataResetDisposeResult) {
                return this.dataResetDisposeResult;
            }
            const updateStop = safe(()=>this.shell.update.stop(true));
            const result = this.performDataResetDispose(updateStop);
            this.dataResetDisposeResult = result;
            return result;
        }
        if (this.disposeResult) {
            return this.disposeResult;
        }
        const disposeResult = this.performDispose();
        this.disposeResult = disposeResult;
        return disposeResult;
    }
    async performDataResetDispose(updateStop) {
        try {
            await updateStop;
            try {
                await this.dispose();
            } catch  {
                this.logger.warn('data-reset', 'application owners did not finish shutdown cleanly');
            }
        } finally{
            // A timed-out native stage remains observed; a later reset can wait again.
            this.dataResetDisposeResult = undefined;
        }
    }
    async performDispose() {
        const results = await Promise.allSettled([
            safe(()=>this.updateLifecycleAnalytics.stop()),
            safe(()=>this.clientUpgradePolicy.stop()),
            safe(()=>this.shell.update.stop()),
            safe(()=>this.shell.socket.dispose()),
            safe(()=>this.shell.logs.dispose()),
            safe(()=>this.shell.record.dispose()),
            safe(()=>this.shell.deviceConnectorSync.dispose()),
            safe(()=>this.shell.features.dispose())
        ]);
        const errors = [];
        for (const result of results){
            if (result.status === 'rejected') {
                errors.push(result.reason);
            }
        }
        if (errors.length === 0) {
            return;
        }
        if (errors.length === 1) {
            throw errors[0];
        }
        throw new AggregateError(errors, 'Failed to dispose the client Node adapter.');
    }
    launch(options) {
        const { preferences } = options;
        if (this.launchResult) {
            return this.launchResult;
        }
        const launchResult = this.performLaunch(preferences);
        this.launchResult = launchResult;
        return launchResult;
    }
    async performLaunch(preferences) {
        this.shell.preferences.configure(preferences);
        await this.updateLifecycleAnalytics.start();
        this.shell.update.start();
        this.rpcCallReporter.register(this.nei, (/* inlined export .InterfaceKind.NativeExtended */"NEI"));
        this.manager.bindNEI(this.nei);
        await this.shell.logs.initialize();
        this.accountTracer.connect(async (params)=>await this.shell.logs.push(params), async (params)=>await this.shell.logs.pushMetrics(params));
        await this.shell.shortcuts.initialize();
        await this.shell.account.initialize();
        try {
            await this.shell.tools.getAuthorization();
        } catch (error) {
            this.logger.warn('tools.authorization', `startup initialization deferred: ${describeError(error)}`);
        }
        await this.shell.features.initialize();
        await this.shell.record.initialize();
        await this.shell.socket.initialize();
        this.startSocketQuietly();
        try {
            await this.shell.account.getFreshAccountSnapshot();
        } catch  {
            this.logger.warn('account.initializer', 'startup freshness reconciliation deferred');
        }
        this.shell.socket.reconcileNotificationBadge();
        // 在 Account 与 Socket Owner 之后非阻塞启动：策略缺失时它自己保持 disabled，不影响 WEI 绑定。
        this.startDeviceConnectorSyncQuietly();
        this.rpcCallReporter.register(this.wei, (/* inlined export .InterfaceKind.WebExtended */"WEI"));
        this.manager.bindWEI(this.wei);
    }
    async startDeviceConnectorSyncQuietly() {
        try {
            await this.shell.deviceConnectorSync.initialize();
        } catch (error) {
            this.logger.warn('device-connector-sync', `startup deferred: ${describeError(error)}`);
        }
    }
    async startSocketQuietly() {
        try {
            await this.shell.socket.start();
        } catch (error) {
            this.logger.warn('user-socket', `startup connection deferred: ${describeError(error)}`);
        }
    }
}
__decorate([
    inject(NodeAdapterPeerManager),
    __metadata("design:type", typeof NodeAdapterPeerManager === "undefined" ? Object : NodeAdapterPeerManager)
], ClientNodeAdapter.prototype, "manager", void 0);
__decorate([
    inject(WebExtendedAspect),
    __metadata("design:type", typeof WebExtendedAspect === "undefined" ? Object : WebExtendedAspect)
], ClientNodeAdapter.prototype, "wei", void 0);
__decorate([
    inject(NativeExtendedAspect),
    __metadata("design:type", typeof NativeExtendedAspect === "undefined" ? Object : NativeExtendedAspect)
], ClientNodeAdapter.prototype, "nei", void 0);
__decorate([
    inject(ShellExtendedAspect),
    __metadata("design:type", typeof ShellExtendedAspect === "undefined" ? Object : ShellExtendedAspect)
], ClientNodeAdapter.prototype, "shell", void 0);
__decorate([
    inject(RPC_CALL_REPORTER),
    __metadata("design:type", typeof RpcCallReporter === "undefined" ? Object : RpcCallReporter)
], ClientNodeAdapter.prototype, "rpcCallReporter", void 0);
__decorate([
    inject(ClientUpgradePolicySync),
    __metadata("design:type", typeof ClientUpgradePolicySync === "undefined" ? Object : ClientUpgradePolicySync)
], ClientNodeAdapter.prototype, "clientUpgradePolicy", void 0);
__decorate([
    inject(AccountTracer),
    __metadata("design:type", typeof AccountTracer === "undefined" ? Object : AccountTracer)
], ClientNodeAdapter.prototype, "accountTracer", void 0);
__decorate([
    inject(AdapterLogger),
    __metadata("design:type", typeof AdapterLogger === "undefined" ? Object : AdapterLogger)
], ClientNodeAdapter.prototype, "logger", void 0);
__decorate([
    inject(UpdateLifecycleAnalytics),
    __metadata("design:type", typeof UpdateLifecycleAnalytics === "undefined" ? Object : UpdateLifecycleAnalytics)
], ClientNodeAdapter.prototype, "updateLifecycleAnalytics", void 0);
__decorate([
    inject(CROSS_PLATFORM_INTERFACE),
    __metadata("design:type", typeof ICrossPlatformInterface === "undefined" ? Object : ICrossPlatformInterface)
], ClientNodeAdapter.prototype, "cpi", void 0);
ClientNodeAdapter = __decorate([
    injectable()
], ClientNodeAdapter);
