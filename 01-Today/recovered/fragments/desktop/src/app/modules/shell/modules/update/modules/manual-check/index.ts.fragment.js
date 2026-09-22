// Compiled fragment from ./src/app/modules/shell/modules/update/modules/manual-check/index.ts.
// The original TypeScript and import graph are not restored.







class ShellManualUpdateCheck {
    run() {
        if (this.activeCheck) {
            this.presentCoalescedManualUpdateState();
            return;
        }
        const check = this.performManualUpdateCheck();
        this.activeCheck = check;
        this.releaseManualUpdateCheck(check);
    }
    async presentCoalescedManualUpdateState() {
        try {
            const state = await this.nodeAdapter.sei.update.getUpdateState();
            if (this.shouldPresentUpdateInMainWindow(state, true)) {
                this.presenter.presentUpdateInMainWindow();
            } else if (state.status === (/* inlined export .UpdateStatus.Unsupported */"unsupported")) {
                await this.presenter.presentManualUpdateResult(state, false);
            }
        } catch  {
        // The active check remains responsible for projecting its final state.
        }
    }
    async releaseManualUpdateCheck(check) {
        try {
            await check;
        } catch  {
        // Manual update failures are already projected through UpdateState.
        } finally{
            if (this.activeCheck === check) {
                this.activeCheck = undefined;
            }
        }
    }
    async performManualUpdateCheck() {
        const update = this.nodeAdapter.sei.update;
        let subscription;
        let presented = false;
        let completionAfterRevision;
        let latestObservedState;
        let observedRevision = 0;
        let resolveCompletion;
        const presentFreshState = (state)=>{
            if (!presented && this.shouldPresentUpdateInMainWindow(state, true)) {
                presented = true;
                this.presenter.presentUpdateInMainWindow();
            }
        };
        const handleStateChanged = (state)=>{
            latestObservedState = state;
            observedRevision += 1;
            presentFreshState(state);
            if (state.status === (/* inlined export .UpdateStatus.Checking */"checking") || completionAfterRevision === undefined || observedRevision <= completionAfterRevision) {
                return;
            }
            const resolve = resolveCompletion;
            completionAfterRevision = undefined;
            resolveCompletion = undefined;
            resolve?.(state);
        };
        const presentOngoingState = (state)=>{
            if (!presented && this.shouldPresentUpdateInMainWindow(state, false)) {
                presented = true;
                this.presenter.presentUpdateInMainWindow();
            }
        };
        const waitForTerminalStateAfter = (revision)=>{
            const observedState = latestObservedState;
            if (observedRevision > revision && observedState && observedState.status !== (/* inlined export .UpdateStatus.Checking */"checking")) {
                return Promise.resolve(observedState);
            }
            completionAfterRevision = revision;
            return new Promise((resolve)=>{
                resolveCompletion = resolve;
            });
        };
        try {
            const initialState = await update.getUpdateState();
            if (initialState.status === (/* inlined export .UpdateStatus.Unsupported */"unsupported")) {
                await this.presenter.presentManualUpdateResult(initialState, false);
                return;
            }
            subscription = await update.subscribe('stateChanged', handleStateChanged);
            const subscribedState = await update.getUpdateState();
            presentOngoingState(subscribedState);
            let state = subscribedState;
            if (subscribedState.supportedActions.includes((/* inlined export .UpdateAction.Check */"check"))) {
                const completion = waitForTerminalStateAfter(observedRevision);
                await update.performUpdateAction({
                    action: (/* inlined export .UpdateAction.Check */"check")
                });
                state = await completion;
            } else if (subscribedState.status === (/* inlined export .UpdateStatus.Checking */"checking")) {
                const observedState = latestObservedState;
                if (observedState && observedState.status !== (/* inlined export .UpdateStatus.Checking */"checking")) {
                    state = observedState;
                } else {
                    state = await waitForTerminalStateAfter(observedRevision);
                }
            }
            presentFreshState(state);
            await this.presenter.presentManualUpdateResult(state, true);
        } catch  {
            const state = await update.getUpdateState();
            presentFreshState(state);
            await this.presenter.presentManualUpdateResult(state, false);
        } finally{
            completionAfterRevision = undefined;
            resolveCompletion = undefined;
            await subscription?.unsubscribe();
        }
    }
    shouldPresentUpdateInMainWindow(state, includeFailure) {
        return state.status === (/* inlined export .UpdateStatus.Available */"available") || state.status === (/* inlined export .UpdateStatus.Downloading */"downloading") || state.status === (/* inlined export .UpdateStatus.Ready */"ready") || includeFailure && state.status === (/* inlined export .UpdateStatus.Failed */"failed");
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], ShellManualUpdateCheck.prototype, "nodeAdapter", void 0);
__decorate([
    inject(ShellManualUpdatePresenter),
    __metadata("design:type", typeof ShellManualUpdatePresenter === "undefined" ? Object : ShellManualUpdatePresenter)
], ShellManualUpdateCheck.prototype, "presenter", void 0);
ShellManualUpdateCheck = __decorate([
    injectable()
], ShellManualUpdateCheck);
