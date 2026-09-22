// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/auth-cookie/index.ts.
// The original TypeScript and import graph are not restored.






class AccountCookiePolicy {
    owns(cookie) {
        if (!cookie.domain || !isAccountCookieName(cookie.name)) {
            return false;
        }
        const domain = normalizeDomain(cookie.domain);
        return this.config.current.authCookieDomains.some((allowed)=>normalizeDomain(allowed) === domain);
    }
    removalUrl(cookie) {
        return getCookieRemovalUrl(cookie);
    }
}
__decorate([
    inject(AccountConfig),
    __metadata("design:type", typeof AccountConfig === "undefined" ? Object : AccountConfig)
], AccountCookiePolicy.prototype, "config", void 0);
AccountCookiePolicy = __decorate([
    injectable()
], AccountCookiePolicy);
