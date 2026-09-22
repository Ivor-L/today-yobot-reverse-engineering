// Compiled fragment from ./src/app/modules/shell/modules/trust/index.ts.
// The original TypeScript and import graph are not restored.








class ShellWebContentsTrust {
    attach(webContents, surface) {
        const previousSurface = this.surfaceByWebContents.get(webContents);
        if (previousSurface !== undefined && previousSurface !== surface) {
            this.webContentsBySurface.delete(previousSurface);
        }
        const previousWebContents = this.webContentsBySurface.get(surface);
        if (previousWebContents && previousWebContents !== webContents) {
            this.surfaceByWebContents.delete(previousWebContents);
        }
        this.surfaceByWebContents.set(webContents, surface);
        this.webContentsBySurface.set(surface, webContents);
    }
    attachHttpSurface(webContents, surface) {
        this.httpSurfaces.set(webContents, surface);
    }
    detachHttpSurfaces() {
        const contents = [
            ...this.httpSurfaces.keys()
        ];
        this.httpSurfaces.clear();
        return contents;
    }
    detach(webContents) {
        this.httpSurfaces.delete(webContents);
        const surface = this.surfaceByWebContents.get(webContents);
        if (surface === undefined) {
            return;
        }
        this.surfaceByWebContents.delete(webContents);
        if (this.webContentsBySurface.get(surface) === webContents) {
            this.webContentsBySurface.delete(surface);
        }
    }
    resolveHttpSurface(sender) {
        if (this.resolveSurface(sender) !== null) {
            return true;
        }
        const surface = this.httpSurfaces.get(sender);
        if (!surface || sender.isDestroyed() || sender.session !== external_electron_.session.defaultSession) {
            return false;
        }
        return matchesHttpAccountSurface(sender.getURL(), this.context.current.webOrigin, surface);
    }
    resolveSurface(sender) {
        const surface = this.surfaceByWebContents.get(sender);
        if (surface === undefined || this.webContentsBySurface.get(surface) !== sender) {
            return null;
        }
        if (sender.isDestroyed() || sender.session !== external_electron_.session.defaultSession) {
            return null;
        }
        if (!hasExactOrigin(sender.getURL(), this.context.current.webOrigin)) {
            return null;
        }
        return surface;
    }
    constructor(){
        this.surfaceByWebContents = new Map();
        this.httpSurfaces = new Map();
        this.webContentsBySurface = new Map();
    }
}
__decorate([
    inject(ShellWebContext),
    __metadata("design:type", typeof ShellWebContext === "undefined" ? Object : ShellWebContext)
], ShellWebContentsTrust.prototype, "context", void 0);
ShellWebContentsTrust = __decorate([
    injectable()
], ShellWebContentsTrust);
