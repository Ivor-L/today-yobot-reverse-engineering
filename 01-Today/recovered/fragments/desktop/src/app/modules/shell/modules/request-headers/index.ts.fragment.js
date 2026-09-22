// Compiled fragment from ./src/app/modules/shell/modules/request-headers/index.ts.
// The original TypeScript and import graph are not restored.













class ShellRequestHeaders {
    configure(browserSession) {
        if (this.configuredSessions.has(browserSession)) {
            return;
        }
        this.configuredSessions.add(browserSession);
        browserSession.webRequest.onBeforeSendHeaders(REQUEST_FILTER, (details, callback)=>{
            this.prepare(browserSession, details, callback);
        });
        browserSession.webRequest.onCompleted(REQUEST_FILTER, (details)=>{
            this.account.complete(browserSession, details.id);
        });
        browserSession.webRequest.onErrorOccurred(REQUEST_FILTER, (details)=>{
            this.account.complete(browserSession, details.id);
        });
    }
    async prepare(browserSession, details, callback) {
        try {
            const requestHeaders = applyAuthoritativeRequestHeaders(details.requestHeaders, await this.resolve(details.url));
            await this.account.prepare(browserSession, details, requestHeaders);
            callback({
                requestHeaders
            });
        } catch  {
            // A failed account refresh must not retry the request using ambient cookies.
            callback({
                cancel: true
            });
        }
    }
    async resolve(requestUrl) {
        const { apiOrigin, canonicalWebOrigin, clientPlatform, environment, trafficLane, webOrigin } = this.context.current;
        let clientHeaders = {};
        if (hasExactHttpsOrigin(requestUrl, apiOrigin)) {
            clientHeaders = {
                'X-App-Version': this.configuration.application.getVersion(),
                'X-Client-Platform': clientPlatform,
                ...trafficLane ? {
                    'X-Traffic-Lane': trafficLane
                } : {}
            };
        } else if (trafficLane && utils_hasExactOrigin(requestUrl, webOrigin)) {
            clientHeaders = {
                'X-Traffic-Lane': trafficLane
            };
        }
        if (hasExactHttpsOrigin(requestUrl, apiOrigin) || utils_hasExactOrigin(requestUrl, webOrigin) || hasExactHttpsOrigin(requestUrl, canonicalWebOrigin)) {
            clientHeaders = {
                ...clientHeaders,
                'Accept-Language': await this.requestLanguage.get()
            };
        }
        const bypassSecret = this.webAccess.bypassSecret;
        const shouldBypass = environment !== base_RuntimeEnvironment.Production && bypassSecret !== undefined && hasExactHttpsOrigin(requestUrl, canonicalWebOrigin);
        if (!shouldBypass) {
            return clientHeaders;
        }
        return {
            ...clientHeaders,
            [VERCEL_BYPASS_HEADER_NAME]: bypassSecret,
            [VERCEL_SET_BYPASS_COOKIE_HEADER_NAME]: 'true'
        };
    }
    constructor(){
        this.configuredSessions = new WeakSet();
    }
}
__decorate([
    inject(ShellAccountRequestHeaders),
    __metadata("design:type", typeof ShellAccountRequestHeaders === "undefined" ? Object : ShellAccountRequestHeaders)
], ShellRequestHeaders.prototype, "account", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellRequestHeaders.prototype, "configuration", void 0);
__decorate([
    inject(DesktopRequestLanguage),
    __metadata("design:type", typeof DesktopRequestLanguage === "undefined" ? Object : DesktopRequestLanguage)
], ShellRequestHeaders.prototype, "requestLanguage", void 0);
__decorate([
    inject(ShellWebContext),
    __metadata("design:type", typeof ShellWebContext === "undefined" ? Object : ShellWebContext)
], ShellRequestHeaders.prototype, "context", void 0);
__decorate([
    inject(DesktopWebAccess),
    __metadata("design:type", typeof DesktopWebAccess === "undefined" ? Object : DesktopWebAccess)
], ShellRequestHeaders.prototype, "webAccess", void 0);
ShellRequestHeaders = __decorate([
    injectable()
], ShellRequestHeaders);
