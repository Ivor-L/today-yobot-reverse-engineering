// Compiled fragment from ./src/app/modules/web-runtime/modules/cookie-bridge/index.ts.
// The original TypeScript and import graph are not restored.









class DesktopWebRuntimeCookieBridge {
    async prepareRequestHeaders(request, headers) {
        // Electron normalizes every renderer credentials mode to `same-origin` and removes
        // Cookie before an HTTP protocol handler sees the Request. The packaged product
        // surface is therefore an ambient projection of the Node account: only a provable
        // logical-origin subrequest can receive a short-lived Node-owned bearer.
        const hasLogicalOriginContext = this.hasLogicalOriginContext(request);
        // A logical Origin on the rewritten 127.0.0.1 request makes Chromium apply CORS to
        // the private transport hop. Carry the proven value in a private marker instead;
        // the token-authenticated runtime host restores Origin immediately before Next.
        headers.delete('origin');
        headers.delete(DESKTOP_WEB_RUNTIME_LOGICAL_ORIGIN_HEADER);
        headers.delete('authorization');
        headers.delete('cookie');
        if (request.method !== 'GET' && request.method !== 'HEAD' && hasLogicalOriginContext) {
            headers.set(DESKTOP_WEB_RUNTIME_LOGICAL_ORIGIN_HEADER, new URL(request.url).origin);
        }
        if (!hasLogicalOriginContext) {
            return;
        }
        const requestUrl = new URL(request.url);
        const cookies = (await this.cookies.get({
            url: request.url
        })).filter((cookie)=>this.canForwardCookie(cookie, requestUrl.hostname));
        if (cookies.length > 0) {
            headers.set('cookie', cookies.map((cookie)=>`${cookie.name}=${cookie.value}`).join('; '));
        }
        // Protocol requests have no WebContents identity. Their HTTP authority is the
        // proven logical origin, and only local BFF requests need account credentials.
        // Keep the generation-fenced account read last: no I/O may outlive this lease.
        if (requestUrl.pathname.startsWith('/api/')) {
            const auth = await this.adapter.sei.account.getFreshAuthContext();
            if (auth) {
                headers.set('authorization', `Bearer ${auth.accessToken}`);
            }
        }
    }
    async processResponse(request, response) {
        await this.persistResponseCookies(request, response);
        return this.stripResponseCookies(response);
    }
    stripResponseCookies(response) {
        if (!response.headers.has('set-cookie')) {
            return response;
        }
        const headers = new Headers(response.headers);
        headers.delete('set-cookie');
        return new Response(response.body, {
            headers,
            status: response.status,
            statusText: response.statusText
        });
    }
    async persistResponseCookies(request, response) {
        let responseCookies;
        try {
            responseCookies = parseSetCookie(response, {
                decodeValues: false
            });
        } catch  {
            return;
        }
        if (responseCookies.length === 0) {
            return;
        }
        const requestUrl = new URL(request.url);
        const nowSeconds = Date.now() / 1000;
        let mutated = false;
        for (const cookie of responseCookies){
            const classification = this.adapter.sei.account.classifyWebSessionCookie({
                name: cookie.name,
                value: cookie.value
            });
            if (classification !== 'non-account' || !isSafeRendererCookie(cookie)) {
                continue;
            }
            const path = resolveCookiePath(cookie.path, requestUrl.pathname);
            if (!path) {
                continue;
            }
            const expirationDate = resolveCookieExpirationDate(cookie, nowSeconds);
            const sameSite = resolveCookieSameSite(cookie.sameSite);
            const details = {
                url: `${requestUrl.origin}/`,
                name: cookie.name,
                value: cookie.value,
                httpOnly: false,
                path,
                secure: false,
                ...expirationDate === undefined ? {} : {
                    expirationDate
                },
                ...sameSite === undefined ? {} : {
                    sameSite
                }
            };
            try {
                await this.cookies.set(details);
                mutated = true;
            } catch  {
            // Chromium ignores a rejected Set-Cookie without failing the response.
            }
        }
        if (!mutated) {
            return;
        }
        try {
            await this.cookies.flushStore();
        } catch  {
        // Cookie persistence is best-effort and must not consume the HTTP response.
        }
    }
    canForwardCookie(cookie, logicalHostname) {
        if (cookie.hostOnly !== true || cookie.domain?.trim().toLowerCase() !== logicalHostname.toLowerCase()) {
            return false;
        }
        const classification = this.adapter.sei.account.classifyWebSessionCookie({
            name: cookie.name,
            value: cookie.value
        });
        if (classification !== 'non-account') {
            return false;
        }
        // Partitioned cookies are always Secure. Electron's Cookie DTO omits their partition
        // key, so only non-sensitive renderer cookies cross
        // this boundary; opaque HttpOnly/Secure cookies fail closed.
        return cookie.httpOnly !== true && cookie.secure !== true;
    }
    hasLogicalOriginContext(request) {
        const requestOrigin = new URL(request.url).origin;
        let hasOriginEvidence = false;
        const structuredReferrer = request.referrer && request.referrer !== 'about:client' ? request.referrer : undefined;
        for (const value of [
            request.headers.get('origin'),
            request.headers.get('referer'),
            structuredReferrer
        ]){
            if (!value) {
                continue;
            }
            hasOriginEvidence = true;
            try {
                if (new URL(value).origin !== requestOrigin) {
                    return false;
                }
            } catch  {
                return false;
            }
        }
        return hasOriginEvidence;
    }
    get cookies() {
        return external_electron_.session.defaultSession.cookies;
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], DesktopWebRuntimeCookieBridge.prototype, "adapter", void 0);
DesktopWebRuntimeCookieBridge = __decorate([
    injectable()
], DesktopWebRuntimeCookieBridge);
