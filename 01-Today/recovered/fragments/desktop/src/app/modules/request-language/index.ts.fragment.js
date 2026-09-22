// Compiled fragment from ./src/app/modules/request-language/index.ts.
// The original TypeScript and import graph are not restored.










class DesktopRequestLanguage {
    async get() {
        if (false) {}
        let timer;
        const deadline = new Promise((resolve)=>{
            timer = setTimeout(()=>resolve(toAcceptLanguage(this.configuration.application.getLocale())), (/* inlined export .REQUEST_LANGUAGE_TIMEOUT_MS */1000));
        });
        try {
            return await Promise.race([
                this.resolve(),
                deadline
            ]);
        } finally{
            clearTimeout(timer);
        }
    }
    async resolve() {
        const { environment } = this.nodeAdapter.sei.account.runtimeSnapshot;
        const { webSessionMirrorOrigin } = this.configuration.accountConfig[environment];
        try {
            const cookies = await external_electron_.session.defaultSession.cookies.get({
                name: 'i18next',
                url: new URL('/', webSessionMirrorOrigin).href
            });
            const language = utils_normalizeLanguage(cookies.find((cookie)=>cookie.name === 'i18next' && !cookie.httpOnly)?.value);
            if (language) {
                return toAcceptLanguage(language);
            }
        } catch  {
        // Startup and temporarily unavailable cookie stores use the local UI language.
        }
        return toAcceptLanguage(this.configuration.application.getLocale());
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], DesktopRequestLanguage.prototype, "nodeAdapter", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], DesktopRequestLanguage.prototype, "configuration", void 0);
DesktopRequestLanguage = __decorate([
    injectable()
], DesktopRequestLanguage);
