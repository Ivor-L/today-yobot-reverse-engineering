// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/request-language/index.ts.
// The original TypeScript and import graph are not restored.



/// <reference path="../../../../../../typings/vars.d.ts" />







class AccountRequestLanguage {
    async get(signal) {
        signal?.throwIfAborted();
        if (false) {}
        let timer;
        let abort;
        const deadline = new Promise((resolve, reject)=>{
            timer = setTimeout(()=>resolve(toAcceptLanguage('en')), (/* inlined export .REQUEST_LANGUAGE_TIMEOUT_MS */1000));
            if (signal) {
                abort = ()=>reject(signal.reason);
                signal.addEventListener('abort', abort, {
                    once: true
                });
            }
        });
        try {
            return await Promise.race([
                this.resolve(),
                deadline
            ]);
        } finally{
            clearTimeout(timer);
            if (signal && abort) {
                signal.removeEventListener('abort', abort);
            }
        }
    }
    async resolve() {
        const { webOrigin, webSessionMirrorOrigin } = this.config.current;
        const url = new URL('/', webSessionMirrorOrigin ?? webOrigin).href;
        try {
            const cookies = await external_electron_.session.defaultSession.cookies.get({
                url,
                name: 'i18next'
            });
            const language = normalizeLanguage(cookies.find((cookie)=>cookie.name === 'i18next' && !cookie.httpOnly)?.value);
            if (language) {
                return toAcceptLanguage(language);
            }
        } catch  {
        // A missing or temporarily unavailable language cookie falls back to the host locale.
        }
        try {
            const { locale } = await this.cpi.system.getSystemInfo();
            return toAcceptLanguage(normalizeLanguage(locale) ?? 'en');
        } catch  {
            // Language resolution must not prevent authentication when the Native Host is unavailable.
            return toAcceptLanguage('en');
        }
    }
    async headers(input, init) {
        const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
        const signal = init?.signal === undefined && input instanceof Request ? input.signal : init?.signal;
        headers.set('Accept-Language', await this.get(signal ?? undefined));
        return headers;
    }
}
__decorate([
    inject(AccountConfig),
    __metadata("design:type", typeof AccountConfig === "undefined" ? Object : AccountConfig)
], AccountRequestLanguage.prototype, "config", void 0);
__decorate([
    inject(CROSS_PLATFORM_INTERFACE),
    __metadata("design:type", typeof AccountCpi === "undefined" ? Object : AccountCpi)
], AccountRequestLanguage.prototype, "cpi", void 0);
AccountRequestLanguage = __decorate([
    injectable()
], AccountRequestLanguage);
