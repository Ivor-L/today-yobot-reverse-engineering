// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/update/modules/lifecycle-analytics/index.ts.
// The original TypeScript and import graph are not restored.








class UpdateLifecycleAnalytics {
    async start() {
        if (this.started) {
            return;
        }
        this.started = true;
        try {
            this.previousState = await this.update.getUpdateState();
            if (this.previousState.attempt) {
                this.reportAttemptStarted(this.previousState);
            }
            this.subscription = await this.update.subscribe('stateChanged', this.handleStateChanged);
        } catch  {
            this.previousState = undefined;
            this.started = false;
        }
    }
    async stop() {
        if (!this.started) {
            return;
        }
        this.started = false;
        this.previousState = undefined;
        const subscription = this.subscription;
        this.subscription = undefined;
        try {
            await subscription?.unsubscribe();
        } catch  {
        // Analytics teardown is best effort and must never block adapter disposal.
        }
    }
    reportAttemptStarted(state) {
        const attempt = state.attempt;
        if (!attempt) {
            return;
        }
        this.reportEvent('desktop_update_attempt_started', base_LogLevel.Info, {
            ...this.buildContext(state)
        }, attempt.startedAt);
    }
    reportPhaseCompleted(previousState, state) {
        const previousAttempt = previousState.attempt;
        const attempt = state.attempt;
        if (!previousAttempt || !attempt) {
            return;
        }
        const completedAt = attempt.phaseStartedAt;
        this.reportEvent('desktop_update_phase_completed', base_LogLevel.Info, {
            ...this.buildContext(previousState),
            duration_ms: Math.max(0, completedAt - previousAttempt.phaseStartedAt),
            phase: previousState.status,
            ...this.buildTransferProperties(previousState, completedAt)
        }, completedAt);
    }
    reportFailed(previousState, state) {
        const attempt = state.attempt;
        if (!attempt) {
            return;
        }
        this.reportEvent('desktop_update_failed', base_LogLevel.Error, {
            ...this.buildContext(state),
            elapsed_ms: Math.max(0, attempt.phaseStartedAt - attempt.startedAt),
            failed_phase: previousState.status
        }, attempt.phaseStartedAt);
    }
    buildContext(state) {
        return {
            ...state.attempt ? {
                attempt_id: state.attempt.id,
                check_trigger: state.attempt.trigger
            } : {},
            current_build: state.currentVersion.build,
            current_version: state.currentVersion.version,
            requirement: state.requirement === (/* inlined export .UpdateRequirement.Required */"required") ? 'required' : 'optional',
            status: state.status,
            ...state.availableUpdate ? {
                target_build: state.availableUpdate.build,
                target_version: state.availableUpdate.version
            } : {}
        };
    }
    buildTransferProperties(state, completedAt) {
        const progress = state.downloadProgress;
        if (!progress) {
            return {};
        }
        const totalBytes = progress.totalBytes;
        const transferredBytes = this.resolveTransferredBytes(progress);
        const transferCompletionRatio = totalBytes !== undefined && totalBytes > 0 && transferredBytes !== undefined ? Math.min(1, Math.max(0, transferredBytes / totalBytes)) : undefined;
        const targetPackageBytes = state.attempt?.targetPackageBytes;
        const networkSavingsRatio = totalBytes !== undefined && targetPackageBytes !== undefined && targetPackageBytes > 0 && totalBytes <= targetPackageBytes ? Math.min(1, Math.max(0, 1 - totalBytes / targetPackageBytes)) : undefined;
        const averageBytesPerSecond = this.resolveAverageBytesPerSecond(progress, transferredBytes, state.attempt?.downloadStartedAt, completedAt);
        return {
            ...averageBytesPerSecond === undefined ? {} : {
                average_bytes_per_second: averageBytesPerSecond
            },
            ...networkSavingsRatio === undefined ? {} : {
                differential_effect_inferred: networkSavingsRatio > 0,
                network_savings_ratio: networkSavingsRatio
            },
            ...targetPackageBytes === undefined ? {} : {
                target_package_bytes: targetPackageBytes
            },
            ...totalBytes === undefined ? {} : {
                total_bytes: totalBytes
            },
            ...transferCompletionRatio === undefined ? {} : {
                transfer_completion_ratio: transferCompletionRatio
            },
            ...transferredBytes === undefined ? {} : {
                transferred_bytes: transferredBytes
            }
        };
    }
    resolveTransferredBytes(progress) {
        if (progress.percent >= 100 && progress.totalBytes !== undefined) {
            return progress.totalBytes;
        }
        return progress.transferredBytes;
    }
    resolveAverageBytesPerSecond(progress, transferredBytes, downloadStartedAt, completedAt) {
        if (transferredBytes !== undefined && downloadStartedAt !== undefined && completedAt > downloadStartedAt) {
            return transferredBytes * 1000 / (completedAt - downloadStartedAt);
        }
        return progress.bytesPerSecond;
    }
    reportEvent(id, level, properties, timestamp) {
        this.pushEvent(id, level, properties, timestamp);
    }
    async pushEvent(id, level, properties, timestamp) {
        try {
            await this.logs.push({
                id,
                level,
                payload: {
                    ...properties,
                    eid: (0,external_node_crypto_namespaceObject.randomUUID)(),
                    ts: new Date(timestamp).toISOString()
                },
                target: [
                    (/* inlined export .PushTarget.PostHog */"posthog"),
                    (/* inlined export .PushTarget.Sentry */"sentry")
                ]
            });
        } catch  {
        // Analytics delivery is best effort and must never change updater behavior.
        }
    }
    constructor(){
        this.started = false;
        this.handleStateChanged = (state)=>{
            const previousState = this.previousState;
            this.previousState = state;
            if (!state.attempt) {
                return;
            }
            if (previousState?.attempt?.id !== state.attempt.id) {
                this.reportAttemptStarted(state);
                return;
            }
            if (previousState.status === state.status) {
                return;
            }
            this.reportPhaseCompleted(previousState, state);
            if (state.status === (/* inlined export .UpdateStatus.Failed */"failed")) {
                this.reportFailed(previousState, state);
            }
        };
    }
}
__decorate([
    inject(UpdateShellService),
    __metadata("design:type", typeof UpdateShellService === "undefined" ? Object : UpdateShellService)
], UpdateLifecycleAnalytics.prototype, "update", void 0);
__decorate([
    inject(LogsShellService),
    __metadata("design:type", typeof LogsShellService === "undefined" ? Object : LogsShellService)
], UpdateLifecycleAnalytics.prototype, "logs", void 0);
UpdateLifecycleAnalytics = __decorate([
    injectable()
], UpdateLifecycleAnalytics);
