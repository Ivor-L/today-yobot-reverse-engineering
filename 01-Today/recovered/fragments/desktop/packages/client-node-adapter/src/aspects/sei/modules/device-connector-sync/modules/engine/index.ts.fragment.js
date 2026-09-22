// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/device-connector-sync/modules/engine/index.ts.
// The original TypeScript and import graph are not restored.

















class DeviceConnectorSyncEngine {
    get isEnabled() {
        return this.policy?.enabled === true;
    }
    get currentPolicy() {
        return this.policy;
    }
    /**
   * 返回策略是否发生变化。capability 被关闭（全局 disabled 或从策略里移除）时立即取消它在跑的轮次
   * （契约 §3.6 关闭即停）；outbox 由紧随的 `policyChanged` kick 在 `makeContext` 里废弃。
   */ updatePolicy(policy) {
        const previous = this.policy;
        this.policy = policy;
        if (policiesEqual(previous, policy)) {
            return false;
        }
        for (const capability of Object.values(cpi_DeviceConnectorCapability)){
            const wasEnabled = previous?.enabled === true && previous.capabilities[capability] !== undefined;
            const isEnabled = policy?.enabled === true && policy.capabilities[capability] !== undefined;
            if (wasEnabled && !isEnabled) {
                this.cancelRunner(capability);
                this.logger.info(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${this.label(capability)} disabled by policy, active run cancelled`);
            }
        }
        this.logger.info(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `policy updated: enabled=${policy?.enabled === true}, version=${policy?.policyVersion ?? 'none'}, capabilities=${Object.keys(policy?.capabilities ?? {}).sort().join(',')}`);
        return true;
    }
    kick(capability, reason) {
        const targets = capability ? [
            capability
        ] : Object.values(cpi_DeviceConnectorCapability);
        for (const target of targets){
            if (isDebouncedReason(reason)) {
                this.scheduleDebounced(target, reason);
                continue;
            }
            // 本地写入会立刻完整读一遍，自己触发的变化通知去抖轮次只会读出「未变」，直接取消。
            if (reason === (/* inlined export .DeviceConnectorSyncKickReason.LocalWrite */"local-write")) {
                this.cancelDebounce(target);
            }
            this.enqueue(target, createKickIntent(reason)).catch(()=>undefined);
        }
    }
    /** 周期兜底：按「最久没成功」的顺序串行跑，避免固定顺序长期饿死第二个 capability。 */ async runAll(reason) {
        for (const capability of (await this.capabilitiesOrderedByStaleness())){
            await this.enqueue(capability, createKickIntent(reason));
        }
    }
    /** 登出：取消在跑轮次、等它收尾（有上限）、清掉该用户在该环境下的全部本地状态。 */ async signOut(environment, accountId) {
        this.generation += 1;
        this.lastRegisteredDevice = null;
        const draining = [];
        for (const capability of Object.values(cpi_DeviceConnectorCapability)){
            const runner = this.runners.get(capability);
            this.cancelRunner(capability);
            if (runner?.active) {
                draining.push(runner.active.catch(()=>undefined));
            }
        }
        await Promise.race([
            Promise.all(draining),
            utils_sleep((/* inlined export .DEVICE_CONNECTOR_SYNC_SIGN_OUT_DRAIN_MS */5000), new AbortController().signal)
        ]);
        await this.store.clearAccount(environment, accountId);
    }
    dispose() {
        for (const capability of Object.values(cpi_DeviceConnectorCapability)){
            this.cancelRunner(capability);
        }
    }
    /** 调试投影：当前策略下各 capability 的落盘状态。 */ async capabilityStatuses() {
        const identity = this.sessionIdentity();
        const statuses = [];
        for (const capability of Object.values(cpi_DeviceConnectorCapability)){
            const enabled = this.policy?.enabled === true && this.policy.capabilities[capability] !== undefined;
            if (!identity) {
                statuses.push({
                    capability,
                    enabled,
                    hasPendingUpload: false
                });
                continue;
            }
            const scope = this.scope(capability, identity);
            const state = await this.store.readState(scope);
            const pending = await this.store.readPending(scope);
            statuses.push({
                capability,
                enabled,
                lastSuccessAtMs: state.lastSuccessAtMs,
                lastReadAtMs: state.lastReadAtMs,
                cooldownUntilMs: state.cooldownUntilMs,
                hasPendingUpload: pending.kind === 'pending'
            });
        }
        return statuses;
    }
    // MARK: 排队与串行
    runner(capability) {
        let runner = this.runners.get(capability);
        if (!runner) {
            runner = {
                abort: new AbortController(),
                lastRunHadRetryableFailure: false
            };
            this.runners.set(capability, runner);
        }
        return runner;
    }
    scheduleDebounced(capability, reason) {
        const runner = this.runner(capability);
        this.cancelDebounce(capability);
        runner.debounce = setTimeout(()=>{
            runner.debounce = undefined;
            this.enqueue(capability, createKickIntent(reason)).catch(()=>undefined);
        }, (/* inlined export .DEVICE_CONNECTOR_SYNC_STORE_CHANGED_DEBOUNCE_MS */2000));
        runner.debounce.unref();
    }
    cancelDebounce(capability) {
        const runner = this.runners.get(capability);
        if (runner?.debounce) {
            clearTimeout(runner.debounce);
            runner.debounce = undefined;
        }
    }
    cancelRunner(capability) {
        const runner = this.runners.get(capability);
        if (!runner) {
            return;
        }
        this.cancelDebounce(capability);
        if (runner.retry) {
            clearTimeout(runner.retry);
            runner.retry = undefined;
        }
        if (runner.interval) {
            clearTimeout(runner.interval);
            runner.interval = undefined;
        }
        runner.pendingIntent = undefined;
        runner.abort.abort();
        runner.abort = new AbortController();
    }
    /** 单飞 + 尾随合并：在跑时只把诉求并进下一轮，不另起并发轮次。 */ enqueue(capability, intent) {
        const runner = this.runner(capability);
        if (runner.active) {
            runner.pendingIntent = runner.pendingIntent ? mergeKickIntent(runner.pendingIntent, intent) : intent;
            return runner.active;
        }
        const active = this.runLoop(capability, intent).finally(()=>{
            if (runner.active === active) {
                runner.active = undefined;
            }
        });
        runner.active = active;
        return active;
    }
    async runLoop(capability, initial) {
        const runner = this.runner(capability);
        let current = initial;
        while(current){
            const signal = runner.abort.signal;
            await this.waitForMinInterval(runner, current, signal);
            if (signal.aborted) {
                return;
            }
            runner.lastRunStartedAtMs = Date.now();
            try {
                runner.lastRunHadRetryableFailure = await this.performRun(capability, current, signal);
            } catch (error) {
                this.logger.error(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${this.label(capability)} run failed: ${describeCode(error)}`);
            }
            current = runner.pendingIntent;
            runner.pendingIntent = undefined;
        }
    }
    async waitForMinInterval(runner, intent, signal) {
        if (runner.lastRunStartedAtMs === undefined || intentBypassesMinInterval(intent)) {
            return;
        }
        const remaining = runner.lastRunStartedAtMs + (/* inlined export .DEVICE_CONNECTOR_SYNC_MIN_RUN_INTERVAL_MS */15000) - Date.now();
        if (remaining > 0) {
            await utils_sleep(remaining, signal);
        }
    }
    // MARK: 一轮
    /** 返回本轮是否以「可重试失败」收尾。 */ async performRun(capability, intent, signal) {
        const context = await this.makeContext(capability);
        if (!context) {
            return false;
        }
        const generation = this.generation;
        const hadRetryableFailure = await this.execute(context, intent, signal, generation);
        if (generation === this.generation && !signal.aborted) {
            await this.scheduleIntervalKick(context);
        }
        return hadRetryableFailure;
    }
    /** 当前会话 + 已注册设备，同步读取、不联网；任一缺失即本轮跳过。 */ sessionIdentity() {
        const session = this.account.currentUserSocketSession;
        if (!session) {
            return undefined;
        }
        const deviceId = this.registeredDeviceId(session);
        if (!deviceId) {
            return undefined;
        }
        return {
            accountId: session.accountId,
            environment: session.environment,
            sessionGeneration: session.sessionGeneration,
            deviceId
        };
    }
    /** 该会话的注册设备 id：socket 当前连接上有就用并记住，重连窗口里沿用同一会话最近一次的值。 */ registeredDeviceId(session) {
        const sessionKey = `${session.environment}:${session.accountId}:${session.sessionGeneration}`;
        const liveDeviceId = this.socket.getRegisteredDeviceId(session);
        if (liveDeviceId) {
            this.lastRegisteredDevice = {
                sessionKey,
                deviceId: liveDeviceId
            };
            return liveDeviceId;
        }
        if (this.lastRegisteredDevice?.sessionKey === sessionKey) {
            return this.lastRegisteredDevice.deviceId;
        }
        return undefined;
    }
    /**
   * 发请求前才取新鲜 token（读取可能耗时 30 s，makeContext 时拿的 token 可能已过期）。
   * 返回 undefined 表示会话已不是本轮那个：调用方按「上下文失效」处理，不重试。
   */ async freshRequest(context) {
        const auth = await this.account.getFreshUserSocketAuthContext();
        if (!auth || auth.accountId !== context.session.accountId || auth.environment !== context.session.environment || auth.sessionGeneration !== context.session.sessionGeneration) {
            return undefined;
        }
        const deviceId = this.registeredDeviceId(auth);
        if (deviceId !== context.scope.deviceId) {
            return undefined;
        }
        return {
            accessToken: auth.accessToken,
            accountId: auth.accountId,
            apiBaseUrl: this.account.runtimeSnapshot.apiBaseUrl,
            deviceId,
            environment: auth.environment,
            sessionGeneration: auth.sessionGeneration
        };
    }
    scope(capability, identity) {
        return {
            environment: identity.environment,
            accountId: identity.accountId,
            deviceId: identity.deviceId,
            capability
        };
    }
    /**
   * 前置条件：已登录且设备已注册、策略启用且含该 capability、系统权限为完全访问。任一不满足就静默跳过；
   * 策略关闭或权限撤销时顺带废弃该 scope 的 outbox（契约 §3.6 / §5.5）。
   */ async makeContext(capability) {
        const label = this.label(capability);
        const identity = this.sessionIdentity();
        if (!identity) {
            this.logger.debug(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${label} skipped: not signed in or device not registered`);
            return undefined;
        }
        const scope = this.scope(capability, identity);
        const capabilityPolicy = this.policy?.enabled === true ? this.policy.capabilities[capability] : undefined;
        if (!capabilityPolicy || !this.policy) {
            this.logger.debug(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${label} skipped: policy disabled or capability missing`);
            await this.store.clearPending(scope);
            return undefined;
        }
        // 服务端按设备已发布的 connector 判定 capability 是否启用：未连接就上传只会得到 409 并进入 24h 冷却，
        // 所以连接选择也是前置条件，与系统权限同级。
        const authorization = await this.authorization.getAuthorization();
        const connectorId = DEVICE_CONNECTOR_SYNC_CONNECTOR_IDS[capability];
        if (!authorization.committed || !authorization.connectorIds.includes(connectorId)) {
            this.logger.info(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${label} skipped: connector not connected`);
            await this.store.clearPending(scope);
            return undefined;
        }
        const permission = await this.cpi.permissions.getPermissionInfo({
            permissionId: DEVICE_CONNECTOR_SYNC_PERMISSION_IDS[capability]
        });
        if (permission.state !== (/* inlined export .PermissionState.Granted */"granted")) {
            this.logger.info(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${label} skipped: permission not authorized`);
            await this.store.clearPending(scope);
            return undefined;
        }
        return {
            scope,
            capabilityPolicy,
            policyVersion: this.policy.policyVersion,
            session: {
                accountId: identity.accountId,
                environment: identity.environment,
                sessionGeneration: identity.sessionGeneration
            }
        };
    }
    /** 读取与上传期间策略 / 账号可能已变（契约 §3.6 关闭即停）；落盘和发送前各核一次。 */ isContextStillValid(context) {
        const runtime = this.account.runtimeSnapshot;
        const capabilityPolicy = this.policy?.enabled === true ? this.policy.capabilities[context.scope.capability] : undefined;
        return this.account.isCurrentUserSocketAuthContext(context.session) && runtime.environment === context.session.environment && this.registeredDeviceId(context.session) === context.scope.deviceId && capabilityPolicy !== undefined && JSON.stringify(capabilityPolicy) === JSON.stringify(context.capabilityPolicy);
    }
    async execute(context, intent, signal, generation) {
        const { scope } = context;
        const label = this.label(scope.capability);
        // 1. 先把结果未知的在途请求发完（契约 §5.6：不得放弃旧请求另发新 snapshot）。
        const pending = await this.store.readPending(scope);
        if (pending.kind === 'corrupted') {
            await this.setCooldown(scope, (/* inlined export .DEVICE_CONNECTOR_SYNC_ABANDONED_PENDING_COOLDOWN_MS */600000), generation);
            return false;
        }
        if (pending.kind === 'pending') {
            const outcome = await this.flushPending(pending.upload, pending.body, context, intent, signal, generation);
            if (outcome === 'rejected') {
                return false;
            }
            if (outcome === 'retryable') {
                return true;
            }
        }
        if (!intentNeedsRead(intent)) {
            return false;
        }
        // flush 可能耗时（上传 deadline 60 s），时间判定一律用此刻。
        const now = Date.now();
        const state = await this.stateAfterCooldownCheck(scope, intent, now, generation);
        if (!state) {
            return false;
        }
        // 被动触发（回前台 / 冷启动）按 `incrementalIntervalSeconds` 限频：距上次读取不够久就不读。
        // `fullSnapshotIntervalSeconds` 的兜底由 interval 定时器（非被动）独立保证。
        if (intentIsPassiveOnly(intent) && state.lastReadAtMs !== undefined) {
            const elapsed = now - state.lastReadAtMs;
            const interval = context.capabilityPolicy.incrementalIntervalSeconds * 1000;
            if (elapsed >= 0 && elapsed < interval) {
                this.logger.info(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${label} skipped: passive kick ${Math.floor(elapsed / 1000)}s after last read < ${context.capabilityPolicy.incrementalIntervalSeconds}s, reason=${intentLabel(intent)}`);
                return false;
            }
        }
        // 2. 完整读取 + 指纹比对。
        const timeZone = currentTimeZone();
        const window = computeCoverageWindow(context.capabilityPolicy, context.policyVersion, now, timeZone);
        if (!window) {
            this.reportFault('coverage_invalid', {
                capability: context.scope.capability,
                past_days: context.capabilityPolicy.pastDays,
                future_days: context.capabilityPolicy.futureDays
            });
            return false;
        }
        const snapshot = await this.readSnapshot(context, window, signal, generation);
        if (!snapshot) {
            return false;
        }
        if (generation !== this.generation || signal.aborted) {
            return false;
        }
        const prepared = this.prepare(context, window, snapshot);
        if (!prepared) {
            return false;
        }
        // 读成功就记时间，不管这轮传不传：时间门限的是「读」的频率，不是上传。读取本身可能耗时，取读完的时刻。
        const readAtMs = Date.now();
        await this.store.saveState(scope, {
            ...state,
            lastReadAtMs: readAtMs
        });
        const fingerprintOfWindow = windowFingerprint(window);
        const unchanged = state.lastFingerprint === prepared.fingerprint && state.lastWindowFingerprint === fingerprintOfWindow;
        const intervalElapsed = state.lastSuccessAtMs === undefined || readAtMs - state.lastSuccessAtMs >= context.capabilityPolicy.fullSnapshotIntervalSeconds * 1000;
        if (unchanged && !intervalElapsed) {
            this.logger.info(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${label} unchanged, skip upload: items=${prepared.itemCount}, reason=${intentLabel(intent)}`);
            return false;
        }
        if (!this.isContextStillValid(context)) {
            this.logger.info(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${label} policy or account changed during read, dropped`);
            await this.store.clearPending(scope);
            return false;
        }
        // 3. 落 outbox 再上传：进程被杀也能按同一 body 续传；落盘失败就不能发（发了也无法续传）。
        const upload = {
            createdAtMs: Date.now(),
            capturedAtMs: prepared.capturedAtMs,
            fingerprint: prepared.fingerprint,
            windowFingerprint: fingerprintOfWindow,
            attempts: 0
        };
        if (!await this.store.savePending(scope, upload, prepared.body)) {
            this.logger.error(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${label} outbox write failed, upload skipped`);
            return true;
        }
        this.logger.info(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${label} snapshot ready: items=${prepared.itemCount}, bytes=${prepared.body.length}, reason=${intentLabel(intent)}, unchanged=${unchanged}, intervalElapsed=${intervalElapsed}`);
        return await this.upload(upload, prepared.body, context, signal, generation) === 'retryable';
    }
    /** 冷却中且诉求不解除冷却 → undefined（本轮跳过）；解除冷却的诉求把 `cooldownUntil` 清掉后落盘再返回。 */ async stateAfterCooldownCheck(scope, intent, now, generation) {
        const state = await this.store.readState(scope);
        if (state.cooldownUntilMs === undefined || state.cooldownUntilMs <= now) {
            return state;
        }
        if (!intentClearsCooldown(intent)) {
            this.logger.info(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${this.label(scope.capability)} in cooldown until ${new Date(state.cooldownUntilMs).toISOString()}`);
            return undefined;
        }
        const cleared = {
            ...state,
            cooldownUntilMs: undefined
        };
        if (generation === this.generation) {
            await this.store.saveState(scope, cleared);
        }
        this.logger.info(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${this.label(scope.capability)} cooldown cleared by ${intentLabel(intent)}`);
        return cleared;
    }
    async readSnapshot(context, window, signal, generation) {
        const { scope } = context;
        const label = this.label(scope.capability);
        const startedAt = Date.now();
        try {
            const result = await this.cpi.deviceConnectors.readSnapshot({
                capability: scope.capability,
                coverage: {
                    start: window.startDay,
                    end: window.endDay,
                    timeZone: window.timeZone
                }
            });
            if (result.outcome === (/* inlined export .DeviceConnectorSnapshotOutcome.IdentityLost */"identity-lost")) {
                // 契约禁止提交残缺集合：留一条上传等于把残缺集合当权威集合，服务端会删掉其余实例。
                this.reportFault('identity_lost', {
                    capability: context.scope.capability
                });
                return undefined;
            }
            const { snapshot } = result;
            this.logger.info(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${label} read: items=${snapshot.items.length}, outsideCoverage=${snapshot.outsideCoverageCount}, unusable=${snapshot.unusableCount}, truncations=${snapshot.truncationCount}, ${Date.now() - startedAt}ms`);
            if (snapshot.truncationCount > 0) {
                this.logger.warn(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${label} uploaded with field truncations: ${snapshot.truncationCount}`);
            }
            return {
                capturedAtMs: snapshot.capturedAt,
                items: snapshot.items,
                outsideCoverageCount: snapshot.outsideCoverageCount,
                unusableCount: snapshot.unusableCount,
                truncationCount: snapshot.truncationCount
            };
        } catch (error) {
            const code = describeCode(error);
            this.logger.error(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${label} read failed: ${code}`);
            if ((code === base_InterfaceErrorCode.PermissionDenied || code === base_InterfaceErrorCode.PermissionRequired) && generation === this.generation && !signal.aborted) {
                await this.store.clearPending(scope);
            }
            return undefined;
        }
    }
    /** 去重、按 key 字节序排序、组 wire body、算内容指纹（不含 `capturedAt` 与 `policyVersion`）。 */ prepare(context, window, snapshot) {
        const label = this.label(context.scope.capability);
        const seen = new Set();
        const items = [];
        let duplicates = 0;
        for (const item of snapshot.items){
            const identity = keyByteIdentity(item.key);
            if (seen.has(identity)) {
                duplicates += 1;
                continue;
            }
            seen.add(identity);
            items.push(item);
        }
        if (duplicates > 0) {
            this.logger.warn(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${label} duplicate keys dropped: ${duplicates}`);
        }
        items.sort((left, right)=>compareKeyBytes(left.key, right.key));
        if (items.length > (/* inlined export .DEVICE_CONNECTOR_SYNC_MAX_ITEMS */2000)) {
            // 不得截断 snapshot（会误删服务端数据）；停止并等 policy 调整。
            this.logger.error(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${label} too many items: ${items.length} > ${(/* inlined export .DEVICE_CONNECTOR_SYNC_MAX_ITEMS */2000)}`);
            return undefined;
        }
        if (snapshot.capturedAtMs < window.startEpochMs || snapshot.capturedAtMs >= window.endEpochMs) {
            this.logger.info(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${label} capturedAt left coverage (midnight crossed), will retry on next kick`);
            return undefined;
        }
        const upserts = items.map((item)=>item.payload);
        const body = Buffer.from(canonicalJson({
            schemaVersion: 1,
            deviceId: context.scope.deviceId,
            capabilityId: context.scope.capability,
            mode: 'snapshot',
            capturedAt: localIso8601(snapshot.capturedAtMs, window.timeZone),
            coverage: {
                start: localIso8601(window.startEpochMs, window.timeZone),
                end: localIso8601(window.endEpochMs, window.timeZone),
                policyVersion: window.policyVersion
            },
            upserts,
            deletes: []
        }), 'utf8');
        if (body.length > DEVICE_CONNECTOR_SYNC_MAX_BODY_BYTES) {
            this.logger.error(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${label} body too large: ${body.length} > ${DEVICE_CONNECTOR_SYNC_MAX_BODY_BYTES}`);
            return undefined;
        }
        const fingerprint = fingerprintOf(canonicalJson({
            capabilityId: context.scope.capability,
            coverage: {
                start: localIso8601(window.startEpochMs, window.timeZone),
                end: localIso8601(window.endEpochMs, window.timeZone)
            },
            upserts
        }));
        return {
            capturedAtMs: snapshot.capturedAtMs,
            body,
            fingerprint,
            itemCount: items.length
        };
    }
    // MARK: outbox 与上传
    async flushPending(upload, body, context, intent, signal, generation) {
        const { scope } = context;
        const now = Date.now();
        if (now - upload.createdAtMs > DEVICE_CONNECTOR_SYNC_MAX_PENDING_AGE_MS) {
            // 48h 前的请求不可能仍在途，这是「不放弃结果未知请求」的端上失效边界。
            this.logger.warn(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${this.label(scope.capability)} pending upload expired, discarded`);
            await this.store.clearPending(scope);
            await this.setCooldown(scope, (/* inlined export .DEVICE_CONNECTOR_SYNC_ABANDONED_PENDING_COOLDOWN_MS */600000), generation);
            return 'rejected';
        }
        if (upload.nextAttemptAtMs !== undefined && upload.nextAttemptAtMs > now && !intentMayRetryPendingEarly(intent)) {
            // 退避未到点只补建定时器（冷启动时旧进程的定时器已不存在）。
            this.scheduleRetry(scope.capability, upload.nextAttemptAtMs - now, upload.attempts);
            return 'retryable';
        }
        return await this.upload(upload, body, context, signal, generation);
    }
    async upload(upload, body, context, signal, generation) {
        const { scope } = context;
        const label = this.label(scope.capability);
        if (!this.isContextStillValid(context)) {
            this.logger.info(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${label} policy or account changed before upload, skipped`);
            return 'rejected';
        }
        let request;
        try {
            request = await this.freshRequest(context);
        } catch  {
            // token 刷新失败是网络问题：保留 outbox，走退避。
            this.logger.warn(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${label} auth refresh failed before upload`);
            return await this.markRetryable(upload, context, generation);
        }
        if (!request) {
            this.logger.info(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${label} session changed before upload, skipped`);
            return 'rejected';
        }
        const result = await this.backend.upload(body, request, signal, label);
        if (generation !== this.generation || signal.aborted) {
            this.logger.info(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${label} account changed during upload, result discarded`);
            return 'rejected';
        }
        switch(result.kind){
            case 'accepted':
                {
                    const state = await this.store.readState(scope);
                    await this.store.saveState(scope, {
                        ...state,
                        lastSuccessAtMs: Date.now(),
                        lastFingerprint: upload.fingerprint,
                        lastWindowFingerprint: upload.windowFingerprint,
                        cooldownUntilMs: undefined
                    });
                    await this.store.clearPending(scope);
                    const counts = result.counts ? `upserted=${result.counts.upserted}, deleted=${result.counts.deleted}, unchanged=${result.counts.unchanged}` : 'counts=n/a';
                    this.logger.info(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${label} accepted: ${counts}, attempts=${upload.attempts + 1}, bytes=${body.length}`);
                    return 'accepted';
                }
            case 'rejected':
                {
                    await this.store.clearPending(scope);
                    const cooldown = rejectionCooldownMs(result.httpStatus);
                    await this.setCooldown(scope, cooldown, generation);
                    this.logger.error(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${label} rejected: http=${result.httpStatus} code=${result.code}, cooldown=${Math.floor(cooldown / 1000)}s`);
                    if (result.httpStatus === 404) {
                        // 设备不在 registry：等下一次设备注册变化（`deviceRegistered`）提前解除冷却。
                        this.logger.warn(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${label} device not registered, waiting for re-registration`);
                    }
                    return 'rejected';
                }
            case 'retryable':
                {
                    return await this.markRetryable(upload, context, generation);
                }
        }
    }
    /** 结果未知：attempts +1、按指数退避排下一次；超过定时重试次数后只跟随自然触发，body 仍保留。 */ async markRetryable(upload, context, generation) {
        if (generation !== this.generation) {
            return 'retryable';
        }
        const { scope } = context;
        const attempts = upload.attempts + 1;
        const delay = utils_retryDelayMs(attempts);
        // 始终写下一次可重试的时刻：超过定时重试次数后不再自建定时器，但自然触发仍要等到点（手动 / 周期兜底除外）。
        const next = {
            ...upload,
            attempts,
            nextAttemptAtMs: Date.now() + delay
        };
        await this.store.savePending(scope, next);
        this.logger.warn(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${this.label(scope.capability)} retry scheduled: attempts=${attempts}, delaySeconds=${Math.floor(delay / 1000)}`);
        this.scheduleRetry(scope.capability, delay, attempts);
        return 'retryable';
    }
    async setCooldown(scope, durationMs, generation) {
        if (generation !== this.generation) {
            return;
        }
        const state = await this.store.readState(scope);
        await this.store.saveState(scope, {
            ...state,
            cooldownUntilMs: Date.now() + durationMs
        });
    }
    // MARK: 定时器
    /** 幂等：同一 capability 只保留一个 retry 定时器。超过 `maxTimedRetryAttempts` 后不再自动重试。 */ scheduleRetry(capability, delayMs, attempts) {
        if (attempts >= (/* inlined export .DEVICE_CONNECTOR_SYNC_MAX_TIMED_RETRY_ATTEMPTS */6)) {
            return;
        }
        const runner = this.runner(capability);
        if (runner.retry) {
            clearTimeout(runner.retry);
        }
        runner.retry = setTimeout(()=>{
            runner.retry = undefined;
            this.kick(capability, (/* inlined export .DeviceConnectorSyncKickReason.Retry */"retry"));
        }, Math.max(delayMs, 1000));
        runner.retry.unref();
    }
    /**
   * 前台常驻时按 `fullSnapshotIntervalSeconds` 到期自踢一次。从未成功或已经逾期时用 15 分钟下限兜底——
   * 逾期不是这个定时器该追的，其它触发和 retry 会处理，这里只防退化成分钟级紧循环。
   */ async scheduleIntervalKick(context) {
        const { capability } = context.scope;
        const runner = this.runner(capability);
        if (runner.interval) {
            clearTimeout(runner.interval);
        }
        const state = await this.store.readState(context.scope);
        const interval = context.capabilityPolicy.fullSnapshotIntervalSeconds * 1000;
        const remaining = state.lastSuccessAtMs === undefined ? undefined : state.lastSuccessAtMs + interval - Date.now();
        const delay = remaining !== undefined && remaining > 0 ? remaining : (/* inlined export .DEVICE_CONNECTOR_SYNC_OVERDUE_INTERVAL_KICK_MS */900000);
        runner.interval = setTimeout(()=>{
            runner.interval = undefined;
            this.kick(capability, (/* inlined export .DeviceConnectorSyncKickReason.IntervalElapsed */"interval-elapsed"));
        }, delay);
        runner.interval.unref();
    }
    async capabilitiesOrderedByStaleness() {
        const identity = this.sessionIdentity();
        const capabilities = Object.values(cpi_DeviceConnectorCapability);
        if (!identity) {
            return capabilities;
        }
        const stamped = [];
        for (const capability of capabilities){
            const state = await this.store.readState(this.scope(capability, identity));
            stamped.push({
                capability,
                lastSuccessAtMs: state.lastSuccessAtMs ?? 0
            });
        }
        return stamped.sort((left, right)=>left.lastSuccessAtMs - right.lastSuccessAtMs).map((entry)=>entry.capability);
    }
    async reportFault(reason, payload) {
        try {
            await this.logs.push({
                id: `device_connector_sync_${reason}`,
                issue: true,
                level: base_LogLevel.Error,
                payload
            });
        } catch  {
        // Reporting cannot change snapshot rejection or recursively report a failed sink.
        }
    }
    label(capability) {
        return DEVICE_CONNECTOR_SYNC_CAPABILITY_SLUGS[capability];
    }
    constructor(){
        /**
   * 同一会话最近一次见到的注册设备 id。Socket 的 `registeredDeviceId` 只属于当前这条连接，断线重连的
   * Connecting 窗口里会清空；设备注册本身是持久的（与原生端一致），这段时间的 kick 不该被丢掉。
   * 换设备 id 时以 socket 的新值为准；登出时清空。
   */ this.lastRegisteredDevice = null;
        this.runners = new Map();
        /** 登出 / 换账号递增；迟到的写盘按它丢弃，不得重建已删除的目录。 */ this.generation = 0;
    }
}
__decorate([
    inject(CROSS_PLATFORM_INTERFACE),
    __metadata("design:type", typeof Pick === "undefined" ? Object : Pick)
], DeviceConnectorSyncEngine.prototype, "cpi", void 0);
__decorate([
    inject(AccountShellService),
    __metadata("design:type", typeof AccountShellService === "undefined" ? Object : AccountShellService)
], DeviceConnectorSyncEngine.prototype, "account", void 0);
__decorate([
    inject(SocketShellService),
    __metadata("design:type", typeof Pick === "undefined" ? Object : Pick)
], DeviceConnectorSyncEngine.prototype, "socket", void 0);
__decorate([
    inject(ToolAuthorizationService),
    __metadata("design:type", typeof Pick === "undefined" ? Object : Pick)
], DeviceConnectorSyncEngine.prototype, "authorization", void 0);
__decorate([
    inject(DeviceConnectorSyncStore),
    __metadata("design:type", typeof DeviceConnectorSyncStore === "undefined" ? Object : DeviceConnectorSyncStore)
], DeviceConnectorSyncEngine.prototype, "store", void 0);
__decorate([
    inject(DeviceConnectorSyncBackend),
    __metadata("design:type", typeof DeviceConnectorSyncBackend === "undefined" ? Object : DeviceConnectorSyncBackend)
], DeviceConnectorSyncEngine.prototype, "backend", void 0);
__decorate([
    inject(AdapterLogger),
    __metadata("design:type", typeof AdapterLogger === "undefined" ? Object : AdapterLogger)
], DeviceConnectorSyncEngine.prototype, "logger", void 0);
__decorate([
    inject(LogsShellService),
    __metadata("design:type", typeof Pick === "undefined" ? Object : Pick)
], DeviceConnectorSyncEngine.prototype, "logs", void 0);
DeviceConnectorSyncEngine = __decorate([
    injectable()
], DeviceConnectorSyncEngine);
