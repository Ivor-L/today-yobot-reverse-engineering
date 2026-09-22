// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/settings/index.ts.
// The original TypeScript and import graph are not restored.



class AccountSettings {
    constructor(){
        this.now = Date.now;
        this.refreshSkewMs = 30000;
        this.nativeTimeoutMs = 5000;
        this.retryMinMs = 1000;
        this.retryMaxMs = 30000;
    }
}
AccountSettings = __decorate([
    injectable()
], AccountSettings);
