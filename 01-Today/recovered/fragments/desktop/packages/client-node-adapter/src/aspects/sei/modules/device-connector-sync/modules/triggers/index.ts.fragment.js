// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/device-connector-sync/modules/triggers/index.ts.
// The original TypeScript and import graph are not restored.
















class DeviceConnectorSyncTriggers {
    /**
   * 挂全部触发源。返回本平台是否支持：CPI `deviceConnectors` 是 optional common module，Windows / Linux
   * Provider 以 `Unsupported` 拒绝订阅，此时不挂任何其它触发源，整个模块保持惰性。
   * 订阅逐个 push，中途失败时已挂上的能被 `dispose()` 收回。
   */ async start(sink) {
        this.sink = sink;
        try {
            this.subscriptions.push(await this.cpi.deviceConnectors.subscribe('changed', (event)=>{
                this.engine.kick(event.capability, (/* inlined export .DeviceConnectorSyncKickReason.StoreChanged */"store-changed"));
            }));
        } catch (error) {
            this.logger.info(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `device connectors unavailable on this platform: ${describeCode(error)}`);
            this.sink = undefined;
            return false;
        }
        this.subscriptions.push(await this.account.subscribe('afterSignIn', ()=>{
            this.handleSignIn();
        }));
        this.subscriptions.push(await this.account.subscribe('afterSwitch', ()=>{
            this.handleSignIn();
        }));
        this.subscriptions.push(await this.account.subscribe('beforeSignOut', ()=>{
            this.handleSignOut();
        }));
        this.subscriptions.push(await this.account.subscribe('beforeSwitch', ()=>{
            this.handleSignOut();
        }));
        this.subscriptions.push(await this.socket.subscribeRegisteredDeviceAvailable(()=>{
            this.handleRegisteredDeviceAvailable();
        }));
        this.subscriptions.push(await this.cpi.permissions.subscribe('changed', (info)=>{
            this.handlePermissionChanged(info.id);
        }));
        this.subscriptions.push(await this.shell.subscribe('presenceChanged', (present)=>{
            this.handlePresenceChanged(present);
        }));
        this.subscriptions.push(await this.socket.subscribeNativeToolEvents('invocationRequested', (request)=>{
            const capability = writeToolCapability(request.capabilityId);
            if (capability) {
                this.writeInvocations.set(request.invocationId, capability);
            }
        }));
        this.subscriptions.push(await this.socket.subscribeNativeToolEvents('invocationCancelled', (cancellation)=>{
            this.writeInvocations.delete(cancellation.invocationId);
        }));
        this.subscriptions.push(this.socket.subscribeNativeToolInvocationCompleted((result)=>{
            this.handleToolCompleted(result.invocationId, result.success);
        }));
        this.subscriptions.push(// 连接 / 断开 connector：服务端的 capability 启用状态随之变化，立刻重跑并解除 409 留下的冷却。
        this.tools.subscribeAuthorizationChanged(()=>{
            this.engine.kick(undefined, (/* inlined export .DeviceConnectorSyncKickReason.ConnectorChanged */"connector-changed"));
        }));
        // 以当前已注册的设备 id 起算：之后普通重连带回同一个 id 不算「注册变化」。
        this.lastKnownDeviceId = this.currentRegisteredDeviceId();
        external_electron_.powerMonitor.on('resume', this.onResume);
        this.lastTickAtMs = Date.now();
        this.periodic = setInterval(()=>{
            this.handlePeriodicTick();
        }, (/* inlined export .DEVICE_CONNECTOR_SYNC_PERIODIC_WAKE_INTERVAL_MS */900000));
        this.periodic.unref();
        this.scheduleMidnight();
        return true;
    }
    async dispose() {
        external_electron_.powerMonitor.off('resume', this.onResume);
        if (this.periodic) {
            clearInterval(this.periodic);
            this.periodic = undefined;
        }
        if (this.midnight) {
            clearTimeout(this.midnight);
            this.midnight = undefined;
        }
        const subscriptions = this.subscriptions;
        this.subscriptions = [];
        await Promise.allSettled(subscriptions.map((subscription)=>subscription.unsubscribe()));
        this.sink = undefined;
    }
    handleSignIn() {
        this.sink?.signIn().catch(()=>undefined);
    }
    handleSignOut() {
        this.lastKnownDeviceId = null;
        this.sink?.signOut().catch(()=>undefined);
    }
    /**
   * 只有 deviceId 真的变了才当作「设备注册完成」：`stateChange` 在普通重连时也会带着同一个 id 回调，
   * 直接映射会让每次重连都解除 24h 冷却、绕过被动时间门。首轮（此前为空）走 `launch`。
   */ currentRegisteredDeviceId() {
        const session = this.account.currentUserSocketSession;
        return session ? this.socket.getRegisteredDeviceId(session) : null;
    }
    handleRegisteredDeviceAvailable() {
        const deviceId = this.currentRegisteredDeviceId();
        if (!deviceId || deviceId === this.lastKnownDeviceId) {
            return;
        }
        const first = this.lastKnownDeviceId === null;
        this.lastKnownDeviceId = deviceId;
        this.engine.kick(undefined, first ? (/* inlined export .DeviceConnectorSyncKickReason.Launch */"launch") : (/* inlined export .DeviceConnectorSyncKickReason.DeviceRegistered */"device-registered"));
    }
    handlePermissionChanged(permissionId) {
        for (const capability of Object.values(cpi_DeviceConnectorCapability)){
            if (DEVICE_CONNECTOR_SYNC_PERMISSION_IDS[capability] === permissionId) {
                this.engine.kick(capability, (/* inlined export .DeviceConnectorSyncKickReason.PermissionChanged */"permission-changed"));
            }
        }
    }
    handlePresenceChanged(present) {
        const became = present && !this.present;
        this.present = present;
        if (became) {
            this.engine.kick(undefined, (/* inlined export .DeviceConnectorSyncKickReason.Foreground */"foreground"));
        }
    }
    handleToolCompleted(invocationId, success) {
        const capability = this.writeInvocations.get(invocationId);
        this.writeInvocations.delete(invocationId);
        if (capability && success) {
            this.engine.kick(capability, (/* inlined export .DeviceConnectorSyncKickReason.LocalWrite */"local-write"));
        }
    }
    /** 睡醒 / 漂移：先刷新过期策略，再按新窗口重读；定时器在休眠期间被拖过期的轮次由这次合并补上。 */ handleWake(source) {
        this.logger.info(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `wake: ${source}`);
        this.lastTickAtMs = Date.now();
        this.scheduleMidnight();
        this.sink?.refreshPolicyIfStale().catch(()=>undefined).finally(()=>{
            this.engine.kick(undefined, (/* inlined export .DeviceConnectorSyncKickReason.DayChanged */"day-changed"));
        });
    }
    /** 周期兜底：先刷策略再判开关——引擎停在 disabled 时这条定时器是唯一的自愈路径。 */ handlePeriodicTick() {
        const now = Date.now();
        const drift = now - this.lastTickAtMs - (/* inlined export .DEVICE_CONNECTOR_SYNC_PERIODIC_WAKE_INTERVAL_MS */900000);
        this.lastTickAtMs = now;
        const timeZone = currentTimeZone();
        if (timeZone !== this.lastTimeZone) {
            this.lastTimeZone = timeZone;
            this.handleWake('time-zone-changed');
            return;
        }
        if (drift > (/* inlined export .DEVICE_CONNECTOR_SYNC_WAKE_DRIFT_MS */300000)) {
            this.handleWake('clock-drift');
            return;
        }
        this.sink?.refreshPolicyIfStale().catch(()=>undefined).finally(()=>{
            if (this.engine.isEnabled) {
                this.engine.runAll((/* inlined export .DeviceConnectorSyncKickReason.BackgroundRefresh */"background-refresh")).catch(()=>undefined);
            }
        });
    }
    /** 跨自然日：窗口滑动，必须重读。按当前时区的下一个零点排。 */ scheduleMidnight() {
        if (this.midnight) {
            clearTimeout(this.midnight);
        }
        const timeZone = currentTimeZone();
        const now = Date.now();
        const today = zonedParts(now, timeZone);
        const tomorrow = new Date(Date.UTC(today.year, today.month - 1, today.day + 1));
        const nextMidnight = localMidnightEpochMs(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth() + 1, tomorrow.getUTCDate(), timeZone);
        const delay = Math.max(1000, nextMidnight - now + 1000);
        this.midnight = setTimeout(()=>{
            this.midnight = undefined;
            this.engine.kick(undefined, (/* inlined export .DeviceConnectorSyncKickReason.DayChanged */"day-changed"));
            this.scheduleMidnight();
        }, delay);
        this.midnight.unref();
    }
    constructor(){
        this.subscriptions = [];
        this.lastTickAtMs = 0;
        this.lastTimeZone = currentTimeZone();
        this.lastKnownDeviceId = null;
        this.present = false;
        /** 远程工具调用 id → capability，只记写类工具，用于把「执行成功」翻译成 `localWrite`。 */ this.writeInvocations = new Map();
        this.onResume = ()=>{
            this.handleWake('resume');
        };
    }
}
__decorate([
    inject(DeviceConnectorSyncEngine),
    __metadata("design:type", typeof DeviceConnectorSyncEngine === "undefined" ? Object : DeviceConnectorSyncEngine)
], DeviceConnectorSyncTriggers.prototype, "engine", void 0);
__decorate([
    inject(AccountShellService),
    __metadata("design:type", typeof AccountShellService === "undefined" ? Object : AccountShellService)
], DeviceConnectorSyncTriggers.prototype, "account", void 0);
__decorate([
    inject(SocketShellService),
    __metadata("design:type", typeof Pick === "undefined" ? Object : Pick)
], DeviceConnectorSyncTriggers.prototype, "socket", void 0);
__decorate([
    inject(ToolsShellService),
    __metadata("design:type", typeof Pick === "undefined" ? Object : Pick)
], DeviceConnectorSyncTriggers.prototype, "tools", void 0);
__decorate([
    inject(CROSS_PLATFORM_INTERFACE),
    __metadata("design:type", typeof Pick === "undefined" ? Object : Pick)
], DeviceConnectorSyncTriggers.prototype, "cpi", void 0);
__decorate([
    inject(CLIENT_NODE_SHELL),
    __metadata("design:type", typeof Pick === "undefined" ? Object : Pick)
], DeviceConnectorSyncTriggers.prototype, "shell", void 0);
__decorate([
    inject(AdapterLogger),
    __metadata("design:type", typeof AdapterLogger === "undefined" ? Object : AdapterLogger)
], DeviceConnectorSyncTriggers.prototype, "logger", void 0);
DeviceConnectorSyncTriggers = __decorate([
    injectable()
], DeviceConnectorSyncTriggers);
