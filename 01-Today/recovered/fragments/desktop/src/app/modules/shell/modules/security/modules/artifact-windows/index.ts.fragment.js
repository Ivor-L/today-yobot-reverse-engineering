// Compiled fragment from ./src/app/modules/shell/modules/security/modules/artifact-windows/index.ts.
// The original TypeScript and import graph are not restored.









class ShellArtifactWindows {
    matches(url) {
        return isArtifactPreviewWindowUrl(url, this.context.current.webOrigin);
    }
    matchesOpenIntent(url, frameName) {
        return frameName.startsWith(ARTIFACT_PREVIEW_WINDOW_NAME_PREFIX) && this.matches(url);
    }
    matchesExternalBrowserIntent(frameName) {
        return frameName === ARTIFACT_EXTERNAL_BROWSER_WINDOW_NAME;
    }
    allowsClipboardWrite(browserSession, permission, requestingUrl, isMainFrame) {
        return browserSession === external_electron_.session.defaultSession && permission === 'clipboard-sanitized-write' && isMainFrame && this.matches(requestingUrl);
    }
    getWindowOptions() {
        return {
            ...ARTIFACT_WINDOW_OPTIONS,
            titleBarStyle: this.configuration.platform === 'darwin' ? 'hiddenInset' : 'default',
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: true,
                session: external_electron_.session.defaultSession,
                webviewTag: false
            }
        };
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellArtifactWindows.prototype, "configuration", void 0);
__decorate([
    inject(ShellWebContext),
    __metadata("design:type", typeof ShellWebContext === "undefined" ? Object : ShellWebContext)
], ShellArtifactWindows.prototype, "context", void 0);
ShellArtifactWindows = __decorate([
    injectable()
], ShellArtifactWindows);
