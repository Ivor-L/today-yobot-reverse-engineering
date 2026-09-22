// Compiled fragment from ./src/app/modules/adjust/modules/installation/index.ts.
// The original TypeScript and import graph are not restored.







class DesktopAdjustInstallation {
    start(context, profileExists) {
        if (this.startResult) {
            return this.startResult;
        }
        const startResult = this.performStart(context, profileExists);
        this.startResult = startResult;
        return startResult;
    }
    async stop() {
        this.stopped = true;
        this.clearRetryTimer();
        this.transport.stop();
        await this.deliveryTask;
    }
    async performStart(context, profileExists) {
        this.context = context;
        this.state = await this.store.load(context.environment, context.externalDeviceId, Date.now(), profileExists);
        this.scheduleFromState();
    }
    scheduleFromState() {
        const state = this.state;
        if (!state || state.rollout !== 'eligible') {
            return;
        }
        const report = state.report;
        if (!report || report.status === 'completed') {
            return;
        }
        this.schedule(Math.max(0, report.nextAttemptAtMs - Date.now()));
    }
    schedule(delayMs) {
        if (this.stopped) {
            return;
        }
        this.clearRetryTimer();
        if (delayMs > 0) {
            this.retryTimer = setTimeout(this.handleRetryTimer, delayMs);
            return;
        }
        this.startDelivery();
    }
    startDelivery() {
        if (this.deliveryTask || this.stopped) {
            return;
        }
        const deliveryTask = this.deliverSafely();
        this.deliveryTask = deliveryTask;
    }
    async deliverSafely() {
        try {
            await this.deliver();
            this.recoveryAttempt = 0;
        } catch  {
            console.warn('[desktop] Adjust installation report could not be delivered');
            this.recoveryAttempt += 1;
            this.schedule(getDesktopAdjustRetryDelay(this.recoveryAttempt, this.context?.externalDeviceId));
        } finally{
            this.deliveryTask = undefined;
        }
    }
    async deliver() {
        const context = this.context;
        const state = this.state;
        if (!context || !state || state.rollout !== 'eligible' || this.stopped) {
            return;
        }
        const report = state.report;
        if (report.status === 'completed') {
            return;
        }
        const remainingDelay = report.nextAttemptAtMs - Date.now();
        if (remainingDelay > 0) {
            this.schedule(remainingDelay);
            return;
        }
        const result = await this.transport.send(context, report);
        if (result.kind === 'completed') {
            const completed = {
                ...state,
                report: {
                    status: 'completed'
                }
            };
            await this.store.write(context.environment, completed);
            this.state = completed;
            return;
        }
        const attempt = report.attempt + 1;
        const delay = Math.max(getDesktopAdjustRetryDelay(attempt, context.externalDeviceId), result.retryAfterMs ?? 0);
        const pending = {
            ...state,
            report: {
                ...report,
                attempt,
                nextAttemptAtMs: Date.now() + delay
            }
        };
        await this.store.write(context.environment, pending);
        this.state = pending;
        this.schedule(delay);
    }
    clearRetryTimer() {
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = undefined;
        }
    }
    constructor(){
        this.recoveryAttempt = 0;
        this.stopped = false;
        this.handleRetryTimer = ()=>{
            this.retryTimer = undefined;
            this.startDelivery();
        };
    }
}
__decorate([
    inject(DesktopAdjustInstallationStore),
    __metadata("design:type", typeof DesktopAdjustInstallationStore === "undefined" ? Object : DesktopAdjustInstallationStore)
], DesktopAdjustInstallation.prototype, "store", void 0);
__decorate([
    inject(DesktopAdjustInstallationTransport),
    __metadata("design:type", typeof DesktopAdjustInstallationTransport === "undefined" ? Object : DesktopAdjustInstallationTransport)
], DesktopAdjustInstallation.prototype, "transport", void 0);
DesktopAdjustInstallation = __decorate([
    injectable()
], DesktopAdjustInstallation);
