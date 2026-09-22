// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/device-connector-sync/index.ts.
// The original TypeScript and import graph are not restored.














class DeviceConnectorSyncShellService {
    async initialize() {
        if (this.initialized) {
            return;
        }
        this.initialized = true;
        // 先装缓存策略、再挂触发源：装载期间引擎的策略还是 disabled，此时落地的 kick 会把上个进程留下的
        // outbox 当作已关闭而清掉（契约 §5.6 要求结果未知的请求不得放弃）。
        await this.reloadCachedPolicy();
        const supported = await this.triggers.start({
            refreshPolicyIfStale: ()=>this.refreshPolicyIfStale(),
            signIn: ()=>this.signIn(),
            signOut: ()=>this.signOut()
        });
        // Windows / Linux 的 Provider 不实现 deviceConnectors：不踢、不拉策略，模块保持惰性。
        if (!supported) {
            return;
        }
        this.engine.kick(undefined, (/* inlined export .DeviceConnectorSyncKickReason.Launch */"launch"));
        this.refreshPolicyIfStale().catch(()=>undefined);
    }
    async dispose() {
        await this.triggers.dispose();
        this.engine.dispose();
    }
    async getState() {
        const policy = this.engine.currentPolicy;
        const statuses = await this.engine.capabilityStatuses();
        return {
            enabled: this.engine.isEnabled,
            policyVersion: policy?.policyVersion,
            capabilities: statuses.map((status)=>({
                    capability: status.capability,
                    enabled: status.enabled,
                    lastSuccessAt: status.lastSuccessAtMs,
                    lastReadAt: status.lastReadAtMs,
                    cooldownUntil: status.cooldownUntilMs,
                    hasPendingUpload: status.hasPendingUpload
                }))
        };
    }
    /** 调试用：一定会读一遍（不受被动时间门与 15s 最小间隔约束），仍走指纹比对。 */ async requestSync() {
        await this.refreshPolicy();
        this.engine.kick(undefined, (/* inlined export .DeviceConnectorSyncKickReason.Manual */"manual"));
    }
    /**
   * 拉一次 `/v1/config` 并装载。请求失败时保持现状（继续用缓存策略），只有服务端明确没下发 /
   * 整份不合法才按 disabled 处理并清缓存。返回是否拿到了服务端的明确答复。
   */ async refreshPolicy() {
        return await this.policyTask.run(()=>this.performRefresh());
    }
    async refreshPolicyIfStale() {
        await this.policyTask.run(async ()=>{
            // 在串行任务里再判一次：并发的两次「若过期则刷新」只打一次请求。
            if (this.lastPolicyRefreshAtMs !== undefined && Date.now() - this.lastPolicyRefreshAtMs < DEVICE_CONNECTOR_SYNC_POLICY_REFRESH_INTERVAL_MS) {
                return;
            }
            await this.performRefresh();
        });
    }
    /**
   * 登录 / 换账号（与原生 macOS `.didSignIn` 同序）：先把该账号上次缓存的合法策略装回去并踢一轮，
   * 再立刻拿新账号的策略（不走节流）——拉取失败时至少还能按缓存跑，不必等周期唤醒。
   */ async signIn() {
        await this.reloadCachedPolicy();
        this.engine.kick(undefined, (/* inlined export .DeviceConnectorSyncKickReason.SignIn */"sign-in"));
        await this.refreshPolicy();
    }
    /** 登出 / 换账号：由触发源在 `before*` 阶段调用，此时会话记录仍在，按它定位要清的目录；不联网。 */ async signOut() {
        const session = this.account.currentUserSocketSession;
        this.lastPolicyRefreshAtMs = undefined;
        this.engine.updatePolicy(undefined);
        if (!session) {
            this.engine.dispose();
            return;
        }
        await this.engine.signOut(session.environment, session.accountId);
    }
    async performRefresh() {
        const context = await this.requestContext();
        if (!context) {
            return false;
        }
        const outcome = await this.policyLoader.fetch(context);
        if (outcome.kind === 'unavailable') {
            return false;
        }
        // 期间可能已登出 / 换账号：策略是按账号拿的，不能装到别的账号上。
        if (!this.account.isCurrentUserSocketAuthContext(context)) {
            return false;
        }
        const policy = outcome.kind === 'policy' ? outcome.policy : undefined;
        await this.store.savePolicy(context.environment, context.accountId, policy);
        this.lastPolicyRefreshAtMs = Date.now();
        // 只有策略真的变了才踢：启动 + 登录 + 手动刷新可能连发几次。
        if (this.engine.updatePolicy(policy)) {
            this.engine.kick(undefined, (/* inlined export .DeviceConnectorSyncKickReason.PolicyChanged */"policy-changed"));
        }
        return true;
    }
    async reloadCachedPolicy() {
        const session = this.account.currentUserSocketSession;
        if (!session) {
            return;
        }
        const policy = await this.store.readPolicy(session.environment, session.accountId);
        if (policy) {
            this.engine.updatePolicy(policy);
        }
    }
    async requestContext() {
        let auth;
        try {
            auth = await this.account.getFreshUserSocketAuthContext();
        } catch  {
            this.logger.debug(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, 'auth context unavailable');
            return undefined;
        }
        if (!auth) {
            return undefined;
        }
        const runtime = this.account.runtimeSnapshot;
        return {
            accessToken: auth.accessToken,
            accountId: auth.accountId,
            apiBaseUrl: runtime.apiBaseUrl,
            // 策略与登出不依赖设备注册；没注册时用空串占位，引擎自己在 makeContext 里再查一次。
            deviceId: this.socket.getRegisteredDeviceId(auth) ?? '',
            environment: auth.environment,
            sessionGeneration: auth.sessionGeneration
        };
    }
    constructor(){
        this.initialized = false;
    }
}
__decorate([
    inject(DeviceConnectorSyncEngine),
    __metadata("design:type", typeof DeviceConnectorSyncEngine === "undefined" ? Object : DeviceConnectorSyncEngine)
], DeviceConnectorSyncShellService.prototype, "engine", void 0);
__decorate([
    inject(DeviceConnectorSyncStore),
    __metadata("design:type", typeof DeviceConnectorSyncStore === "undefined" ? Object : DeviceConnectorSyncStore)
], DeviceConnectorSyncShellService.prototype, "store", void 0);
__decorate([
    inject(DeviceConnectorSyncPolicyLoader),
    __metadata("design:type", typeof DeviceConnectorSyncPolicyLoader === "undefined" ? Object : DeviceConnectorSyncPolicyLoader)
], DeviceConnectorSyncShellService.prototype, "policyLoader", void 0);
__decorate([
    inject(DeviceConnectorSyncTriggers),
    __metadata("design:type", typeof DeviceConnectorSyncTriggers === "undefined" ? Object : DeviceConnectorSyncTriggers)
], DeviceConnectorSyncShellService.prototype, "triggers", void 0);
__decorate([
    inject(AccountShellService),
    __metadata("design:type", typeof AccountShellService === "undefined" ? Object : AccountShellService)
], DeviceConnectorSyncShellService.prototype, "account", void 0);
__decorate([
    inject(SocketShellService),
    __metadata("design:type", typeof Pick === "undefined" ? Object : Pick)
], DeviceConnectorSyncShellService.prototype, "socket", void 0);
__decorate([
    inject(SerialTask),
    __metadata("design:type", typeof SerialTask === "undefined" ? Object : SerialTask)
], DeviceConnectorSyncShellService.prototype, "policyTask", void 0);
__decorate([
    inject(AdapterLogger),
    __metadata("design:type", typeof AdapterLogger === "undefined" ? Object : AdapterLogger)
], DeviceConnectorSyncShellService.prototype, "logger", void 0);
DeviceConnectorSyncShellService = __decorate([
    injectable()
], DeviceConnectorSyncShellService);
