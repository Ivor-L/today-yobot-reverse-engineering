// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/context/index.ts.
// The original TypeScript and import graph are not restored.












class LogsContext {
    enrich(layer, params) {
        this.ensureDeviceIdRefresh();
        const deviceId = this.deviceId;
        const userId = this.account.currentAccountId;
        return Object.freeze({
            level: params.level,
            id: params.id,
            ...params.issue === undefined ? {} : {
                issue: params.issue
            },
            ...params.payload === undefined ? {} : {
                payload: params.payload
            },
            ...userId === undefined ? {} : {
                user_id: userId
            },
            ...deviceId === undefined ? {} : {
                device_id: deviceId
            },
            platform: this.config.platform,
            layer,
            time: Date.now(),
            app_version: this.config.appVersion,
            runtime_environment: this.readEnvironment()
        });
    }
    metricAttributes(layer, environment) {
        return {
            app_version: this.config.appVersion,
            environment: resolveSentryEnvironment(environment),
            layer,
            platform: this.config.platform === base_ClientRuntimePlatform.MacOS ? 'mac' : this.config.platform
        };
    }
    readEnvironment() {
        try {
            return this.preferences.environment.value;
        } catch  {
            // Logging remains available before preferences initialize.
            return this.config.defaultEnvironment;
        }
    }
    async getDeviceId() {
        if (this.deviceId !== undefined) {
            return this.deviceId;
        }
        this.ensureDeviceIdRefresh();
        const flight = this.deviceIdFlight;
        if (flight === undefined) {
            return this.deviceId;
        }
        let timeout;
        try {
            const timedOut = new Promise((resolve)=>{
                const timer = (0,external_node_timers_namespaceObject.setTimeout)(resolve, (/* inlined export .DEVICE_ID_WAIT_TIMEOUT_MS */1000));
                timer.unref();
                timeout = timer;
            });
            return await Promise.race([
                flight,
                timedOut
            ]);
        } finally{
            if (timeout !== undefined) {
                clearTimeout(timeout);
            }
        }
    }
    async getUploadDiagnostics() {
        return await this.uploadDiagnostics.collect();
    }
    ensureDeviceIdRefresh() {
        if (this.deviceId !== undefined || this.deviceIdFlight !== undefined) {
            return;
        }
        const flight = this.readDeviceId();
        this.deviceIdFlight = flight;
        this.cacheDeviceId(flight);
    }
    async cacheDeviceId(flight) {
        try {
            const deviceId = await flight;
            if (deviceId !== undefined) {
                this.deviceId = deviceId;
            }
        } finally{
            if (this.deviceIdFlight === flight) {
                this.deviceIdFlight = undefined;
            }
        }
    }
    async readDeviceId() {
        try {
            const device = await this.cpi.system.getDeviceInfo();
            const deviceId = device.installationId.trim();
            if (deviceId.length > 0) {
                return deviceId;
            }
        } catch  {
        // A missing Native peer must not prevent local file logging.
        }
        return undefined;
    }
}
__decorate([
    inject(CLIENT_NODE_LOGS_CONFIG),
    __metadata("design:type", typeof ClientNodeLogsConfig === "undefined" ? Object : ClientNodeLogsConfig)
], LogsContext.prototype, "config", void 0);
__decorate([
    inject(CROSS_PLATFORM_INTERFACE),
    __metadata("design:type", typeof ICrossPlatformInterface === "undefined" ? Object : ICrossPlatformInterface)
], LogsContext.prototype, "cpi", void 0);
__decorate([
    inject(AccountShellService),
    __metadata("design:type", typeof AccountShellService === "undefined" ? Object : AccountShellService)
], LogsContext.prototype, "account", void 0);
__decorate([
    inject(PreferencesShellService),
    __metadata("design:type", typeof PreferencesShellService === "undefined" ? Object : PreferencesShellService)
], LogsContext.prototype, "preferences", void 0);
__decorate([
    inject(LogUploadDiagnosticsCollector),
    __metadata("design:type", typeof LogUploadDiagnosticsCollector === "undefined" ? Object : LogUploadDiagnosticsCollector)
], LogsContext.prototype, "uploadDiagnostics", void 0);
LogsContext = __decorate([
    injectable()
], LogsContext);
