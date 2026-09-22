// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/tools/modules/file-inventory/index.ts.
// The original TypeScript and import graph are not restored.











class ToolFileInventory {
    async scanFileInventory() {
        await this.observeAccount();
        this.updateAccountScope();
        if (this.cache?.snapshots) {
            this.clear();
        }
        let cache = this.cache;
        if (!cache) {
            const scope = this.authorization.currentScope;
            cache = {
                scope,
                anonymous: scope === null,
                snapshots: null,
                scan: null
            };
            this.cache = cache;
            cache.scan = this.scan(cache);
        }
        await cache.scan;
    }
    async uploadFileInventory() {
        const scope = this.authorization.currentScope;
        const epoch = this.authorizationEpoch;
        if (!scope) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.AuthRequired, 'Sign in before uploading local files.');
        }
        this.updateAccountScope();
        const cache = this.cache;
        await this.uploads.run(async ()=>{
            this.authorization.assertCurrentScope(scope);
            this.assertAuthorizationSettled(epoch);
            await this.authorization.assertSynced(scope);
            const authorization = await this.authorization.getAuthorization(scope);
            this.assertAuthorizationSettled(epoch);
            if (!authorization.committed || authorization.fileRoots.length === 0) {
                return;
            }
            if (!cache || cache !== this.cache) {
                throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'Scan local files before uploading them.');
            }
            await cache.scan;
            this.assertCacheCurrent(cache);
            this.assertAuthorizationSettled(epoch);
            const currentAuthorization = await this.authorization.getAuthorization(scope);
            const platform = INVENTORY_PLATFORMS[this.account.runtimeSnapshot.clientPlatform];
            const snapshots = (cache.snapshots ?? []).filter((snapshot)=>currentAuthorization.committed && currentAuthorization.fileRoots.includes(snapshot.root) && currentAuthorization.connectorIds.includes(`${platform}_${snapshot.root}`));
            this.assertCacheCurrent(cache);
            this.assertAuthorizationSettled(epoch);
            if (snapshots.length === 0) {
                return;
            }
            const controller = new AbortController();
            this.uploadController = controller;
            try {
                await this.uploader.upload(snapshots, scope, currentAuthorization, controller.signal);
                this.assertCacheCurrent(cache);
            } finally{
                if (this.uploadController === controller) {
                    this.uploadController = null;
                }
            }
        });
    }
    authorizationChanging() {
        this.authorizationEpoch += 1;
        this.pendingAuthorizationChanges += 1;
        // Cancel a request immediately when a connector is revoked, including draft selection changes.
        if (this.uploadController) {
            this.uploadController.abort();
        }
    }
    authorizationSettled() {
        this.pendingAuthorizationChanges -= 1;
    }
    assertAuthorizationSettled(epoch) {
        if (epoch !== this.authorizationEpoch || this.pendingAuthorizationChanges > 0) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The local file upload selection changed.');
        }
    }
    async scan(cache) {
        try {
            const snapshots = await this.cpi.system.scanFileInventory();
            this.assertCacheCurrent(cache);
            const roots = snapshots.map((snapshot)=>snapshot.root);
            if (roots.some((root)=>!Object.values(base_ToolFileRoot).includes(root)) || new Set(roots).size !== roots.length) {
                throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'The local file scan roots are invalid.');
            }
            cache.snapshots = snapshots;
        } catch (error) {
            if (this.cache === cache) {
                this.cache = null;
            }
            throw interface_error_InterfaceError(error, 'Local file scanning could not finish.');
        }
    }
    async observeAccount() {
        await this.initialization.run(async ()=>{
            if (this.subscriptions.length > 0) {
                return;
            }
            const subscriptions = [];
            try {
                subscriptions.push(await this.account.subscribe('beforeSwitch', (event)=>{
                    if (this.cache?.anonymous && !this.cache.scope && event.previousAccountId === undefined) {
                        return;
                    }
                    this.clear();
                }));
                subscriptions.push(await this.account.subscribe('beforeSignOut', ()=>this.clear()));
                subscriptions.push(await this.account.subscribe('changed', ()=>this.updateAccountScope()));
                this.subscriptions.push(...subscriptions);
            } catch (error) {
                for (const subscription of subscriptions){
                    await subscription.unsubscribe();
                }
                throw error;
            }
        });
    }
    updateAccountScope() {
        const cache = this.cache;
        if (!cache) {
            return;
        }
        const scope = this.authorization.currentScope;
        // An email-step scan may be claimed only by the first subsequent signed-in account.
        if (cache.anonymous && cache.scope === null && scope) {
            cache.scope = scope;
            return;
        }
        if (cache.scope) {
            try {
                this.authorization.assertCurrentScope(cache.scope);
            } catch  {
                this.clear();
            }
        }
    }
    assertCacheCurrent(cache) {
        if (cache !== this.cache) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The local file scan account changed.');
        }
        if (cache.scope) {
            this.authorization.assertCurrentScope(cache.scope);
        }
    }
    clear() {
        this.cache = null;
        this.uploadController?.abort();
        this.uploadController = null;
    }
    constructor(){
        this.cache = null;
        this.subscriptions = [];
        this.uploadController = null;
        this.authorizationEpoch = 0;
        this.pendingAuthorizationChanges = 0;
    }
}
__decorate([
    inject(CROSS_PLATFORM_INTERFACE),
    __metadata("design:type", typeof ICrossPlatformInterface === "undefined" ? Object : ICrossPlatformInterface)
], ToolFileInventory.prototype, "cpi", void 0);
__decorate([
    inject(AccountShellService),
    __metadata("design:type", typeof AccountShellService === "undefined" ? Object : AccountShellService)
], ToolFileInventory.prototype, "account", void 0);
__decorate([
    inject(ToolAuthorizationService),
    __metadata("design:type", typeof ToolAuthorizationService === "undefined" ? Object : ToolAuthorizationService)
], ToolFileInventory.prototype, "authorization", void 0);
__decorate([
    inject(FileInventoryUploader),
    __metadata("design:type", typeof FileInventoryUploader === "undefined" ? Object : FileInventoryUploader)
], ToolFileInventory.prototype, "uploader", void 0);
__decorate([
    inject(SerialTask),
    __metadata("design:type", typeof SerialTask === "undefined" ? Object : SerialTask)
], ToolFileInventory.prototype, "initialization", void 0);
__decorate([
    inject(SerialTask),
    __metadata("design:type", typeof SerialTask === "undefined" ? Object : SerialTask)
], ToolFileInventory.prototype, "uploads", void 0);
ToolFileInventory = __decorate([
    injectable()
], ToolFileInventory);
