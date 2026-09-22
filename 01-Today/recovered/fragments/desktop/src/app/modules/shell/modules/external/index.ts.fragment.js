// Compiled fragment from ./src/app/modules/shell/modules/external/index.ts.
// The original TypeScript and import graph are not restored.







class ShellExternalBrowser {
    async open(url) {
        if (!utils_isAllowedExternalUrl(url)) {
            throw new TypeError('Shell external URL must use HTTP or HTTPS');
        }
        const { canonicalWebOrigin, webOrigin } = this.context.current;
        const externalUrl = resolveExternalBrowserUrl(url, webOrigin, canonicalWebOrigin);
        await external_electron_.shell.openExternal(externalUrl);
    }
    tryOpen(url) {
        if (!utils_isAllowedExternalUrl(url)) {
            return false;
        }
        this.openIgnoringFailure(url);
        return true;
    }
    async openIgnoringFailure(url) {
        try {
            await this.open(url);
        } catch  {
        // A failed system-browser handoff must not create a less trusted Electron fallback.
        }
    }
}
__decorate([
    inject(ShellWebContext),
    __metadata("design:type", typeof ShellWebContext === "undefined" ? Object : ShellWebContext)
], ShellExternalBrowser.prototype, "context", void 0);
ShellExternalBrowser = __decorate([
    injectable()
], ShellExternalBrowser);
