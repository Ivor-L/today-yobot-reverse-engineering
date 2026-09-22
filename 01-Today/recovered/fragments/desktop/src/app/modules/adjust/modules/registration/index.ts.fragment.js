// Compiled fragment from ./src/app/modules/adjust/modules/registration/index.ts.
// The original TypeScript and import graph are not restored.








class DesktopAdjustRegistration {
    start(context) {
        if (this.startResult) {
            return this.startResult;
        }
        const startResult = this.performStart(context);
        this.startResult = startResult;
        return startResult;
    }
    async stop() {
        this.stopped = true;
        this.clearRetryTimer();
        this.transport.stop();
        const subscriptions = this.subscriptions;
        this.subscriptions = [];
        await Promise.allSettled(subscriptions.map(async (subscription)=>subscription.unsubscribe()));
        await this.workerTask;
    }
    async performStart(context) {
        this.context = context;
        const afterSignIn = await this.nodeAdapter.sei.account.subscribe('afterSignIn', (event)=>{
            this.enqueue(event.accountId);
        });
        let afterSwitch;
        try {
            afterSwitch = await this.nodeAdapter.sei.account.subscribe('afterSwitch', ()=>{
                this.requestWork();
            });
        } catch (error) {
            await afterSignIn.unsubscribe();
            throw error;
        }
        const subscriptions = [
            afterSignIn,
            afterSwitch
        ];
        if (this.stopped) {
            await Promise.allSettled(subscriptions.map(async (subscription)=>subscription.unsubscribe()));
            return;
        }
        this.subscriptions = subscriptions;
        try {
            this.state = await this.store.load(context.environment, context.externalDeviceId);
        } catch (error) {
            this.subscriptions = [];
            await Promise.allSettled(subscriptions.map(async (subscription)=>subscription.unsubscribe()));
            throw error;
        }
        this.requestWork();
    }
    enqueue(accountId) {
        if (this.stopped) {
            return;
        }
        let derivedAccountId;
        try {
            derivedAccountId = deriveDesktopAdjustAccountId(accountId);
        } catch  {
            return;
        }
        if (this.state?.completedAccountIds.includes(derivedAccountId)) {
            return;
        }
        if (this.queuedAccountIds.has(derivedAccountId) || this.state?.pending.some((item)=>item.accountId === derivedAccountId)) {
            this.requestWork();
            return;
        }
        this.queuedAccountIds.add(derivedAccountId);
        this.requestWork();
    }
    requestWork() {
        if (this.stopped) {
            return;
        }
        this.workRequested = true;
        this.clearRetryTimer();
        if (this.workerTask) {
            return;
        }
        const workerTask = this.runWorkerSafely();
        this.workerTask = workerTask;
    }
    async runWorkerSafely() {
        try {
            while(this.workRequested && !this.stopped){
                this.workRequested = false;
                await this.runOnce();
            }
            this.recoveryAttempt = 0;
        } catch  {
            console.warn('[desktop] Adjust registration report could not be delivered');
            this.recoveryAttempt += 1;
            this.scheduleRetry(getDesktopAdjustRetryDelay(this.recoveryAttempt, this.context?.externalDeviceId));
        } finally{
            this.workerTask = undefined;
            if (this.workRequested && !this.stopped) {
                this.requestWork();
            }
        }
    }
    async runOnce() {
        await this.persistQueuedAccounts();
        const context = this.context;
        const state = this.state;
        if (!context || !state || state.pending.length === 0 || this.stopped) {
            return;
        }
        const auth = await this.nodeAdapter.sei.account.getFreshAuthContext();
        if (!auth) {
            return;
        }
        const accountId = deriveDesktopAdjustAccountId(auth.accountId);
        const pending = state.pending.find((item)=>item.accountId === accountId);
        if (!pending) {
            return;
        }
        const remainingDelay = pending.nextAttemptAtMs - Date.now();
        if (remainingDelay > 0) {
            this.scheduleRetry(remainingDelay);
            return;
        }
        const result = await this.transport.send(context, auth.accessToken);
        if (result.kind === 'completed') {
            const completed = {
                ...state,
                completedAccountIds: [
                    ...state.completedAccountIds,
                    accountId
                ],
                pending: state.pending.filter((item)=>item.accountId !== accountId)
            };
            await this.store.write(context.environment, completed);
            this.state = completed;
            return;
        }
        const attempt = pending.attempt + 1;
        const delay = Math.max(getDesktopAdjustRetryDelay(attempt, accountId), result.retryAfterMs ?? 0);
        const retry = {
            ...pending,
            attempt,
            nextAttemptAtMs: Date.now() + delay
        };
        const retryState = {
            ...state,
            pending: state.pending.map((item)=>item.accountId === accountId ? retry : item)
        };
        await this.store.write(context.environment, retryState);
        this.state = retryState;
        this.scheduleRetry(delay);
    }
    async persistQueuedAccounts() {
        const state = this.state;
        if (!state || this.queuedAccountIds.size === 0) {
            return;
        }
        const queued = [
            ...this.queuedAccountIds
        ].filter((accountId)=>{
            return !state.completedAccountIds.includes(accountId) && !state.pending.some((item)=>item.accountId === accountId);
        });
        if (queued.length === 0) {
            this.queuedAccountIds.clear();
            return;
        }
        const nextState = {
            ...state,
            pending: [
                ...state.pending,
                ...queued.map((accountId)=>({
                        accountId,
                        attempt: 0,
                        nextAttemptAtMs: 0
                    }))
            ]
        };
        const context = this.context;
        if (!context) {
            return;
        }
        await this.store.write(context.environment, nextState);
        this.state = nextState;
        for (const accountId of queued){
            this.queuedAccountIds.delete(accountId);
        }
    }
    scheduleRetry(delayMs) {
        if (this.stopped) {
            return;
        }
        this.clearRetryTimer();
        this.retryTimer = setTimeout(this.handleRetryTimer, delayMs);
    }
    clearRetryTimer() {
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = undefined;
        }
    }
    constructor(){
        this.queuedAccountIds = new Set();
        this.subscriptions = [];
        this.recoveryAttempt = 0;
        this.workRequested = false;
        this.stopped = false;
        this.handleRetryTimer = ()=>{
            this.retryTimer = undefined;
            this.requestWork();
        };
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], DesktopAdjustRegistration.prototype, "nodeAdapter", void 0);
__decorate([
    inject(DesktopAdjustRegistrationStore),
    __metadata("design:type", typeof DesktopAdjustRegistrationStore === "undefined" ? Object : DesktopAdjustRegistrationStore)
], DesktopAdjustRegistration.prototype, "store", void 0);
__decorate([
    inject(DesktopAdjustRegistrationTransport),
    __metadata("design:type", typeof DesktopAdjustRegistrationTransport === "undefined" ? Object : DesktopAdjustRegistrationTransport)
], DesktopAdjustRegistration.prototype, "transport", void 0);
DesktopAdjustRegistration = __decorate([
    injectable()
], DesktopAdjustRegistration);
