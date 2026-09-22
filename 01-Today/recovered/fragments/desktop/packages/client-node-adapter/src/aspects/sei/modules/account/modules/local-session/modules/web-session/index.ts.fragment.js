// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/local-session/modules/web-session/index.ts.
// The original TypeScript and import graph are not restored.











class ElectronAccountWebSession {
    clear() {
        return this.tasks.run(async ()=>{
            try {
                const snapshot = await this.cookies.get({});
                const cookies = snapshot.filter((cookie)=>this.owns(cookie));
                if (cookies.length === 0) {
                    return 0;
                }
                for (const cookie of cookies){
                    const url = this.policy.removalUrl(cookie);
                    if (!url) {
                        continue;
                    }
                    await this.cookies.remove(url, cookie.name);
                }
                await this.cookies.flushStore();
                return cookies.length;
            } catch (error) {
                throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The Web account session could not be cleared.', {
                    cause: error
                });
            }
        });
    }
    owns(cookie) {
        if (!cookie.domain || !isAccountCookieName(cookie.name)) {
            return false;
        }
        if (this.policy.owns(cookie)) {
            return true;
        }
        const domain = normalizeDomain(cookie.domain);
        if (domain === LEGACY_TRANSPORT_HOSTNAME) {
            return true;
        }
        const mirrorOrigin = this.config.current.webSessionMirrorOrigin;
        return !!mirrorOrigin && domain === new URL(mirrorOrigin).hostname;
    }
    get cookies() {
        return external_electron_.session.defaultSession.cookies;
    }
}
__decorate([
    inject(AccountConfig),
    __metadata("design:type", typeof AccountConfig === "undefined" ? Object : AccountConfig)
], ElectronAccountWebSession.prototype, "config", void 0);
__decorate([
    inject(AccountCookiePolicy),
    __metadata("design:type", typeof AccountCookiePolicy === "undefined" ? Object : AccountCookiePolicy)
], ElectronAccountWebSession.prototype, "policy", void 0);
__decorate([
    inject(SerialTask),
    __metadata("design:type", typeof SerialTask === "undefined" ? Object : SerialTask)
], ElectronAccountWebSession.prototype, "tasks", void 0);
ElectronAccountWebSession = __decorate([
    injectable()
], ElectronAccountWebSession);
