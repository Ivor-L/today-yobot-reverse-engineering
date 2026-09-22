// Compiled fragment from ./src/app/modules/web-access/index.ts.
// The original TypeScript and import graph are not restored.












const WEB_ACCESS_REFRESH_TIMEOUT_MS = 15000;
class DesktopWebAccess {
    get bypassSecret() {
        return this.currentSecret ?? this.configuration.bootstrapVercelBypassSecret;
    }
    start() {
        if (this.startResult) {
            return this.startResult;
        }
        const startResult = this.performStart();
        this.startResult = startResult;
        return startResult;
    }
    async stop() {
        this.stopped = true;
        this.refreshGeneration += 1;
        this.refreshAbortController?.abort();
        const subscriptions = this.subscriptions;
        this.subscriptions = [];
        await Promise.allSettled(subscriptions.map(async (subscription)=>subscription.unsubscribe()));
    }
    async performStart() {
        const { environment } = this.nodeAdapter.sei.account.runtimeSnapshot;
        if (environment === base_RuntimeEnvironment.Production) {
            return;
        }
        try {
            this.currentSecret = await this.store.read(environment);
        } catch  {
            console.warn('[desktop] could not restore cached Web access configuration');
        }
        const afterSignIn = await this.nodeAdapter.sei.account.subscribe('afterSignIn', ()=>{
            this.refreshInBackground();
        });
        let afterSwitch;
        try {
            afterSwitch = await this.nodeAdapter.sei.account.subscribe('afterSwitch', ()=>{
                this.refreshInBackground();
            });
        } catch (error) {
            await afterSignIn.unsubscribe();
            throw error;
        }
        if (this.stopped) {
            await Promise.allSettled([
                afterSignIn.unsubscribe(),
                afterSwitch.unsubscribe()
            ]);
            return;
        }
        this.subscriptions = [
            afterSignIn,
            afterSwitch
        ];
        this.refreshInBackground();
    }
    refreshInBackground() {
        this.refreshGeneration += 1;
        this.ensureRefreshTask();
    }
    ensureRefreshTask() {
        if (this.refreshTask || this.stopped) {
            return;
        }
        this.refreshTask = this.drainRefreshes();
    }
    async drainRefreshes() {
        let completedGeneration = 0;
        try {
            while(!this.stopped && completedGeneration < this.refreshGeneration){
                const generation = this.refreshGeneration;
                await this.refreshSafely(generation);
                completedGeneration = generation;
            }
        } finally{
            this.refreshTask = undefined;
            if (!this.stopped && completedGeneration < this.refreshGeneration) {
                this.ensureRefreshTask();
            }
        }
    }
    async refreshSafely(generation) {
        try {
            await this.refresh(generation);
        } catch  {
            if (!this.stopped) {
                console.warn('[desktop] could not refresh Web access configuration');
            }
        }
    }
    async refresh(generation) {
        const auth = await this.nodeAdapter.sei.account.getFreshAuthContext();
        if (!auth || this.stopped || auth.environment === base_RuntimeEnvironment.Production) {
            return;
        }
        const { apiBaseUrl, clientPlatform, environment } = this.nodeAdapter.sei.account.runtimeSnapshot;
        if (auth.environment !== environment) {
            return;
        }
        const acceptLanguage = await this.requestLanguage.get();
        if (this.stopped || generation !== this.refreshGeneration) {
            return;
        }
        const trafficLane = this.nodeAdapter.sei.preferences.trafficLane.value;
        const client = createClient({
            auth: auth.accessToken,
            baseUrl: apiBaseUrl,
            redirect: 'error',
            headers: {
                'Accept-Language': acceptLanguage,
                'X-App-Version': this.configuration.application.getVersion(),
                'X-Client-Platform': clientPlatform,
                ...trafficLane ? {
                    'X-Traffic-Lane': trafficLane
                } : {}
            }
        });
        const abortController = new AbortController();
        const timeout = setTimeout(()=>{
            abortController.abort();
        }, WEB_ACCESS_REFRESH_TIMEOUT_MS);
        this.refreshAbortController = abortController;
        let result;
        try {
            result = await getV1Config({
                client,
                signal: abortController.signal
            });
        } finally{
            clearTimeout(timeout);
            if (this.refreshAbortController === abortController) {
                this.refreshAbortController = undefined;
            }
        }
        if (!result.response?.ok || !result.data) {
            throw new Error(`client config rejected with status ${result.response?.status ?? 'none'}`);
        }
        const bypassSecret = normalizeVercelBypassSecret(Object.entries(result.data.feedExtraHeaders ?? {}).find(([name])=>name.toLowerCase() === VERCEL_BYPASS_HEADER_NAME)?.[1]);
        if (!bypassSecret || this.stopped) {
            return;
        }
        const latestAuth = await this.nodeAdapter.sei.account.getFreshAuthContext();
        if (!latestAuth || latestAuth.accountId !== auth.accountId || latestAuth.environment !== auth.environment || generation !== this.refreshGeneration || this.stopped) {
            return;
        }
        const committed = await this.store.write(environment, bypassSecret, ()=>!this.stopped && generation === this.refreshGeneration);
        if (!committed || this.stopped || generation !== this.refreshGeneration) {
            return;
        }
        this.currentSecret = bypassSecret;
    }
    constructor(){
        this.subscriptions = [];
        this.stopped = false;
        this.refreshGeneration = 0;
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], DesktopWebAccess.prototype, "nodeAdapter", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], DesktopWebAccess.prototype, "configuration", void 0);
__decorate([
    inject(DesktopRequestLanguage),
    __metadata("design:type", typeof DesktopRequestLanguage === "undefined" ? Object : DesktopRequestLanguage)
], DesktopWebAccess.prototype, "requestLanguage", void 0);
__decorate([
    inject(DesktopWebAccessStore),
    __metadata("design:type", typeof DesktopWebAccessStore === "undefined" ? Object : DesktopWebAccessStore)
], DesktopWebAccess.prototype, "store", void 0);
DesktopWebAccess = __decorate([
    injectable()
], DesktopWebAccess);
