// Compiled fragment from ./src/app/modules/shell/modules/request-headers/modules/account/index.ts.
// The original TypeScript and import graph are not restored.










class ShellAccountRequestHeaders {
    async prepare(browserSession, details, headers) {
        const context = this.context.current;
        const targetsApi = hasExactHttpsOrigin(details.url, context.apiOrigin);
        const targetsWeb = utils_hasExactOrigin(details.url, context.webOrigin);
        const targetsLocalBff = targetsWeb && isLocalWebOrigin(context.webOrigin) && new URL(details.url).pathname.startsWith('/api/');
        const previouslyAuthenticated = this.authenticatedRequests.get(browserSession)?.has(details.id);
        // Third-party SDKs own their credentials, even when called from a trusted app frame.
        // Only first-party destinations and redirects carrying our injected bearer are ours.
        if (!targetsApi && !targetsWeb && !previouslyAuthenticated) {
            return;
        }
        // Renderer credentials never override the account owner. Removing Authorization
        // on other destinations also prevents an app request redirect from carrying it on.
        for (const [name, value] of Object.entries(headers)){
            if (name.toLowerCase() === 'authorization') {
                delete headers[name];
            }
            if (name.toLowerCase() !== 'cookie' || !targetsApi && !targetsWeb) {
                continue;
            }
            delete headers[name];
            if (targetsApi) {
                continue;
            }
            const cookies = value.split(';').filter((cookie)=>{
                const separator = cookie.indexOf('=');
                if (separator <= 0) {
                    return false;
                }
                return this.adapter.sei.account.classifyWebSessionCookie({
                    name: cookie.slice(0, separator).trim(),
                    value: cookie.slice(separator + 1).trim()
                }) === 'non-account';
            });
            if (cookies.length > 0) {
                headers[name] = cookies.map((cookie)=>cookie.trim()).join('; ');
            }
        }
        if (!targetsApi && !targetsLocalBff || details.method === 'OPTIONS' || !this.isTrustedRequest(browserSession, details, context.webOrigin, targetsLocalBff)) {
            return;
        }
        const auth = await this.adapter.sei.account.getFreshAuthContext();
        const current = this.context.current;
        // Refresh may outlive a navigation or environment switch. Revalidate the sender
        // and destination before releasing the token to Chromium's network stack.
        if (!auth || auth.environment !== current.environment || context.apiOrigin !== current.apiOrigin || context.webOrigin !== current.webOrigin || !this.isTrustedRequest(browserSession, details, current.webOrigin, targetsLocalBff)) {
            return;
        }
        headers.Authorization = `Bearer ${auth.accessToken}`;
        const requests = this.authenticatedRequests.get(browserSession) ?? new Set();
        requests.add(details.id);
        this.authenticatedRequests.set(browserSession, requests);
    }
    complete(browserSession, requestId) {
        const requests = this.authenticatedRequests.get(browserSession);
        requests?.delete(requestId);
        if (requests?.size === 0) {
            this.authenticatedRequests.delete(browserSession);
        }
    }
    isTrustedRequest(browserSession, details, webOrigin, targetsLocalBff) {
        if (browserSession !== external_electron_.session.defaultSession || details.resourceType === 'mainFrame' || details.resourceType === 'subFrame') {
            return false;
        }
        // Service Worker network requests have no frame identity, including fetches
        // that forward a page's original Request. Local BFF authority is same-origin,
        // matching the packaged protocol bridge; it never grants direct API authority.
        if (details.webContents === undefined && details.webContentsId === undefined && details.frame === undefined) {
            return targetsLocalBff && this.hasSameOriginContext(details, webOrigin, true);
        }
        const contents = details.webContents;
        const frame = details.frame;
        if (!contents || !frame || !this.trust.resolveHttpSurface(contents) || frame !== contents.mainFrame || details.webContentsId !== undefined && details.webContentsId !== contents.id || !utils_hasExactOrigin(frame.url, webOrigin)) {
            return false;
        }
        return this.hasSameOriginContext(details, webOrigin, false);
    }
    hasSameOriginContext(details, webOrigin, requiresEvidence) {
        const originHeaders = Object.entries(details.requestHeaders).filter(([name])=>[
                'origin',
                'referer'
            ].includes(name.toLowerCase())).map(([, value])=>value);
        const evidence = [
            ...originHeaders,
            details.referrer
        ].filter(Boolean);
        return (!requiresEvidence || Boolean(details.referrer)) && evidence.every((value)=>utils_hasExactOrigin(value, webOrigin));
    }
    constructor(){
        this.authenticatedRequests = new WeakMap();
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], ShellAccountRequestHeaders.prototype, "adapter", void 0);
__decorate([
    inject(ShellWebContext),
    __metadata("design:type", typeof ShellWebContext === "undefined" ? Object : ShellWebContext)
], ShellAccountRequestHeaders.prototype, "context", void 0);
__decorate([
    inject(ShellWebContentsTrust),
    __metadata("design:type", typeof ShellWebContentsTrust === "undefined" ? Object : ShellWebContentsTrust)
], ShellAccountRequestHeaders.prototype, "trust", void 0);
ShellAccountRequestHeaders = __decorate([
    injectable()
], ShellAccountRequestHeaders);
