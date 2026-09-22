// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/authenticator/modules/isolated-session/modules/request-origin/index.ts.
// The original TypeScript and import graph are not restored.





class AccountIsolatedSessionRequestOrigin {
    configure(session) {
        const config = this.config.current;
        const authOrigin = new URL(config.authBaseUrl).origin;
        session.webRequest.onBeforeSendHeaders({
            urls: [
                `${authOrigin}/*`
            ]
        }, (details, callback)=>{
            if (details.resourceType !== 'other') {
                callback({});
                return;
            }
            const requestHeaders = this.withTrustedOrigin(details.requestHeaders, config.webOrigin);
            callback({
                requestHeaders
            });
        });
    }
    withTrustedOrigin(headers, trustedOrigin) {
        const requestHeaders = {};
        for (const [name, value] of Object.entries(headers)){
            if (name.toLowerCase() === 'origin') {
                continue;
            }
            requestHeaders[name] = value;
        }
        requestHeaders['Origin'] = trustedOrigin;
        return requestHeaders;
    }
}
__decorate([
    inject(AccountConfig),
    __metadata("design:type", typeof AccountConfig === "undefined" ? Object : AccountConfig)
], AccountIsolatedSessionRequestOrigin.prototype, "config", void 0);
AccountIsolatedSessionRequestOrigin = __decorate([
    injectable()
], AccountIsolatedSessionRequestOrigin);
