// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/update/index.ts.
// The original TypeScript and import graph are not restored.










class UpdateShellService extends readonly_events_ReadonlyEvents {
    async getVersionInfo() {
        return this.provider.getVersionInfo();
    }
    async getUpdateState() {
        return this.resolveState();
    }
    async performUpdateAction({ action }) {
        const state = this.resolveState();
        if (!state.supportedActions.includes(action)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'The requested update action is not available in the current state.');
        }
        if (action === (/* inlined export .UpdateAction.Check */"check")) {
            const trigger = state.status === (/* inlined export .UpdateStatus.Failed */"failed") ? (/* inlined export .UpdateCheckTrigger.ManualRetry */"manual-retry") : (/* inlined export .UpdateCheckTrigger.Manual */"manual");
            this.startUpdateCheck(trigger);
            return;
        }
        if (action === (/* inlined export .UpdateAction.Download */"download")) {
            this.startUpdateDownload();
            return;
        }
        if (action === (/* inlined export .UpdateAction.Restart */"restart")) {
            this.setState({
                downloadProgress: undefined,
                status: (/* inlined export .UpdateStatus.Applying */"applying"),
                supportedActions: []
            });
            try {
                this.provider.quitAndInstall();
            } catch  {
                const error = updateInstallError();
                this.setState({
                    downloadProgress: undefined,
                    error,
                    status: (/* inlined export .UpdateStatus.Failed */"failed"),
                    supportedActions: [
                        (/* inlined export .UpdateAction.Check */"check")
                    ]
                });
                throw interface_error_InterfaceError(error.code, error.message);
            }
            return;
        }
        throw interface_error_InterfaceError(base_InterfaceErrorCode.Unsupported, 'The requested update action is not supported.');
    }
    async requestPresentation() {
        this.emit('presentationRequested', this.resolveState());
    }
    async requestRequiredPresentation() {
        this.requiredPresentationActive = true;
        this.emit('presentationRequested', {
            ...this.resolveState(),
            requirement: (/* inlined export .UpdateRequirement.Required */"required")
        });
    }
    setRequirement(requirement) {
        if (this.resolveState().requirement === requirement) {
            return;
        }
        this.setState({
            requirement
        });
    }
    canQuitForRequiredUpdate() {
        return this.requiredPresentationActive || this.resolveState().requirement === (/* inlined export .UpdateRequirement.Required */"required");
    }
    start() {
        if (this.started) {
            return;
        }
        this.started = true;
        this.lifecycle += 1;
        if (!this.provider.isSupported()) {
            return;
        }
        try {
            this.provider.start(this.providerCallbacks);
        } catch (error) {
            this.started = false;
            this.lifecycle += 1;
            throw error;
        }
        this.setState({
            supportedActions: activeUpdateActions(this.resolveState().status)
        });
        this.startupTimer = setTimeout(()=>{
            this.checkForUpdatesIfIdle((/* inlined export .UpdateCheckTrigger.ScheduledStartup */"scheduled-startup"));
        }, (/* inlined export .UPDATE_STARTUP_DELAY_MS */30000));
        this.interval = setInterval(()=>{
            this.checkForUpdatesIfIdle((/* inlined export .UpdateCheckTrigger.ScheduledInterval */"scheduled-interval"));
        }, UPDATE_CHECK_INTERVAL_MS);
    }
    stop(forDataReset = false) {
        if (!this.started) {
            if (forDataReset) {
                return this.provider.stop(true);
            }
            return;
        }
        if (this.startupTimer) {
            clearTimeout(this.startupTimer);
            this.startupTimer = undefined;
        }
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = undefined;
        }
        this.lifecycle += 1;
        this.checkResult = undefined;
        this.downloadResult = undefined;
        this.requiredPresentationActive = false;
        this.started = false;
        try {
            return this.provider.stop(forDataReset);
        } finally{
            this.lastPublishedDownloadProgress = undefined;
            if (this.state) {
                this.setState({
                    supportedActions: []
                });
            }
        }
    }
    startUpdateCheck(trigger) {
        if (this.checkResult) {
            return;
        }
        if (!this.started || !this.provider.isSupported()) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unsupported, 'Application updates are not available in this build.');
        }
        const startedAt = Date.now();
        this.attempt = {
            id: (0,external_node_crypto_namespaceObject.randomUUID)(),
            phaseStartedAt: startedAt,
            startedAt,
            trigger
        };
        const lifecycle = this.lifecycle;
        const token = this.checkToken += 1;
        const checkResult = this.performTrackedCheck(this.provider, lifecycle, token);
        this.checkResult = checkResult;
    }
    checkForUpdatesIfIdle(trigger) {
        const status = this.resolveState().status;
        if (!canStartUpdateCheck(status)) {
            return;
        }
        try {
            this.startUpdateCheck(trigger);
        } catch  {
        // Scheduled checks have no caller and publish operational failures through update state.
        }
    }
    async performTrackedCheck(provider, lifecycle, token) {
        try {
            await this.performCheck(provider, lifecycle);
        } finally{
            if (this.checkToken === token) {
                this.checkResult = undefined;
            }
        }
    }
    async performCheck(provider, lifecycle) {
        this.lastPublishedDownloadProgress = undefined;
        this.setState({
            downloadProgress: undefined,
            error: undefined,
            status: (/* inlined export .UpdateStatus.Checking */"checking"),
            supportedActions: []
        });
        try {
            const result = await provider.checkForUpdates();
            if (!this.isActiveProvider(provider, lifecycle)) {
                return;
            }
            if (!result?.updateAvailable) {
                this.onUpdateNotAvailable();
                return;
            }
            if (this.attempt && result.targetPackageBytes !== undefined) {
                this.attempt = {
                    ...this.attempt,
                    targetPackageBytes: result.targetPackageBytes
                };
            }
            const state = this.resolveState();
            const availableUpdateAlreadyPublished = state.status === (/* inlined export .UpdateStatus.Available */"available") && state.availableUpdate?.version === result.availableUpdate.version && state.availableUpdate.build === result.availableUpdate.build;
            if (!availableUpdateAlreadyPublished) {
                this.onUpdateAvailable(result.availableUpdate);
            }
            this.startUpdateDownload();
        } catch  {
            if (!this.isActiveProvider(provider, lifecycle)) {
                return;
            }
            const error = updateCheckError();
            this.setState({
                downloadProgress: undefined,
                error,
                status: (/* inlined export .UpdateStatus.Failed */"failed"),
                supportedActions: [
                    (/* inlined export .UpdateAction.Check */"check")
                ]
            });
        }
    }
    startUpdateDownload() {
        if (this.downloadResult) {
            return;
        }
        if (!this.started || !this.provider.isSupported()) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unsupported, 'Application updates are not available in this build.');
        }
        const lifecycle = this.lifecycle;
        const token = this.downloadToken += 1;
        const result = this.performTrackedDownload(this.provider, lifecycle, token);
        this.downloadResult = result;
    }
    async performTrackedDownload(provider, lifecycle, token) {
        try {
            await this.performDownload(provider, lifecycle);
        } finally{
            if (this.downloadToken === token) {
                this.downloadResult = undefined;
            }
        }
    }
    async performDownload(provider, lifecycle) {
        const { availableUpdate } = this.resolveState();
        if (this.attempt && this.attempt.downloadStartedAt === undefined) {
            this.attempt = {
                ...this.attempt,
                downloadStartedAt: Date.now()
            };
        }
        this.setState({
            downloadProgress: {
                percent: 0
            },
            error: undefined,
            status: (/* inlined export .UpdateStatus.Downloading */"downloading"),
            supportedActions: []
        });
        try {
            await provider.downloadUpdate();
            if (!this.isActiveProvider(provider, lifecycle) || this.isInstallPending()) {
                return;
            }
            this.setState({
                availableUpdate,
                downloadProgress: undefined,
                error: undefined,
                status: (/* inlined export .UpdateStatus.Ready */"ready"),
                supportedActions: [
                    (/* inlined export .UpdateAction.Restart */"restart")
                ]
            });
        } catch  {
            if (this.isActiveProvider(provider, lifecycle)) {
                this.setState({
                    downloadProgress: undefined,
                    error: updateCheckError(),
                    status: (/* inlined export .UpdateStatus.Failed */"failed"),
                    supportedActions: [
                        (/* inlined export .UpdateAction.Check */"check")
                    ]
                });
            }
        }
    }
    isActiveProvider(provider, lifecycle) {
        return this.started && this.provider === provider && this.lifecycle === lifecycle;
    }
    isInstallPending() {
        return isInstallPending(this.resolveState().status);
    }
    resolveState() {
        if (this.state) {
            return this.state;
        }
        this.state = utils_initialUpdateState(this.provider.getVersionInfo(), this.provider.isSupported());
        return this.state;
    }
    downloadProgressMatches(current, next) {
        return current?.percent === next.percent;
    }
    setState(change) {
        const currentState = this.resolveState();
        const nextStatus = change.status ?? currentState.status;
        if (this.attempt && nextStatus !== currentState.status) {
            this.attempt = {
                ...this.attempt,
                phaseStartedAt: Date.now()
            };
        }
        const nextState = applyUpdateStateChange(currentState, {
            ...change,
            ...this.attempt ? {
                attempt: this.attempt
            } : {}
        });
        this.state = nextState;
        this.emit('stateChanged', nextState);
    }
    constructor(...args){
        super(...args), this.checkToken = 0, this.downloadToken = 0, this.lifecycle = 0, this.requiredPresentationActive = false, this.started = false, this.providerCallbacks = {
            onAvailable: (availableUpdate)=>{
                this.onUpdateAvailable(availableUpdate);
            },
            onCancelled: ()=>{
                this.onUpdateCancelled();
            },
            onChecking: ()=>{
                this.onCheckingForUpdate();
            },
            onError: ()=>{
                this.onError();
            },
            onNotAvailable: ()=>{
                this.onUpdateNotAvailable();
            },
            onProgress: (progress)=>{
                this.onDownloadProgress(progress);
            }
        }, this.onCheckingForUpdate = ()=>{
            if (this.isInstallPending()) {
                return;
            }
            this.lastPublishedDownloadProgress = undefined;
            this.setState({
                downloadProgress: undefined,
                status: (/* inlined export .UpdateStatus.Checking */"checking"),
                supportedActions: []
            });
        }, this.onUpdateAvailable = (availableUpdate)=>{
            if (this.isInstallPending()) {
                return;
            }
            this.setState({
                availableUpdate,
                downloadProgress: undefined,
                error: undefined,
                status: (/* inlined export .UpdateStatus.Available */"available"),
                supportedActions: [
                    (/* inlined export .UpdateAction.Download */"download")
                ]
            });
        }, this.onDownloadProgress = (progress)=>{
            const status = this.resolveState().status;
            if (status !== (/* inlined export .UpdateStatus.Available */"available") && status !== (/* inlined export .UpdateStatus.Downloading */"downloading")) {
                return;
            }
            const normalizedProgress = {
                ...this.lastPublishedDownloadProgress,
                ...progress,
                percent: Math.round(progress.percent)
            };
            if (status === (/* inlined export .UpdateStatus.Downloading */"downloading") && this.downloadProgressMatches(this.lastPublishedDownloadProgress, normalizedProgress)) {
                return;
            }
            this.lastPublishedDownloadProgress = normalizedProgress;
            this.setState({
                downloadProgress: normalizedProgress,
                status: (/* inlined export .UpdateStatus.Downloading */"downloading"),
                supportedActions: []
            });
        }, this.onUpdateNotAvailable = ()=>{
            if (this.isInstallPending()) {
                return;
            }
            this.setState({
                availableUpdate: undefined,
                downloadProgress: undefined,
                error: undefined,
                status: (/* inlined export .UpdateStatus.UpToDate */"up-to-date"),
                supportedActions: [
                    (/* inlined export .UpdateAction.Check */"check")
                ]
            });
        }, this.onUpdateCancelled = ()=>{
            this.setState({
                downloadProgress: undefined,
                error: updateCancelledError(),
                status: (/* inlined export .UpdateStatus.Failed */"failed"),
                supportedActions: [
                    (/* inlined export .UpdateAction.Check */"check")
                ]
            });
        }, this.onError = ()=>{
            const error = this.resolveState().status === (/* inlined export .UpdateStatus.Applying */"applying") ? updateInstallError() : updateCheckError();
            this.setState({
                downloadProgress: undefined,
                error,
                status: (/* inlined export .UpdateStatus.Failed */"failed"),
                supportedActions: [
                    (/* inlined export .UpdateAction.Check */"check")
                ]
            });
        };
    }
}
__decorate([
    inject(ElectronUpdateProvider),
    __metadata("design:type", typeof ElectronUpdateProvider === "undefined" ? Object : ElectronUpdateProvider)
], UpdateShellService.prototype, "provider", void 0);
UpdateShellService = __decorate([
    injectable()
], UpdateShellService);
