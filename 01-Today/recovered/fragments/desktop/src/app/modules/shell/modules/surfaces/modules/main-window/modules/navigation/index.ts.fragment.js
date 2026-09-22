// Compiled fragment from ./src/app/modules/shell/modules/surfaces/modules/main-window/modules/navigation/index.ts.
// The original TypeScript and import graph are not restored.








class ShellMainWindowNavigation {
    load(window, url) {
        const generation = this.begin();
        return this.runInitialNavigation(window, url, generation);
    }
    begin() {
        this.generation += 1;
        return this.generation;
    }
    isCurrent(window, generation) {
        return this.host.current === window && this.generation === generation;
    }
    async runInitialNavigation(window, url, generation) {
        try {
            return await this.performInitialNavigation(window, url, generation);
        } catch  {
            if (!this.isCurrent(window, generation)) {
                return false;
            }
            this.diagnostics.reportFault('desktop_main_window_navigation_failed');
            return false;
        }
    }
    async performInitialNavigation(window, url, generation) {
        let wasShownDuringLoading = false;
        let webPageLoaded = false;
        try {
            await window.loadFile(this.assets.loadingPagePath);
            if (!this.isCurrent(window, generation)) {
                return false;
            }
            window.show();
            window.focus();
            wasShownDuringLoading = true;
            await window.loadURL(url);
            if (!this.isCurrent(window, generation)) {
                return false;
            }
            webPageLoaded = true;
        } catch (error) {
            if (!this.isCurrent(window, generation)) {
                return false;
            }
            console.error('[desktop] failed to load app page', error);
            await this.loadErrorPage(window, error, generation);
        }
        if (!wasShownDuringLoading && this.isCurrent(window, generation)) {
            window.show();
            window.focus();
        }
        return webPageLoaded;
    }
    async loadErrorPage(window, error, generation) {
        if (!this.isCurrent(window, generation)) {
            return;
        }
        try {
            await window.loadFile(this.assets.errorPagePath, {
                query: {
                    desc: describeStartupError(error)
                }
            });
        } catch  {
            if (!this.isCurrent(window, generation)) {
                return;
            }
            this.diagnostics.reportFault('desktop_startup_error_page_failed');
        }
    }
    constructor(){
        this.generation = 0;
    }
}
__decorate([
    inject(DesktopAssets),
    __metadata("design:type", typeof DesktopAssets === "undefined" ? Object : DesktopAssets)
], ShellMainWindowNavigation.prototype, "assets", void 0);
__decorate([
    inject(ShellMainWindowHost),
    __metadata("design:type", typeof ShellMainWindowHost === "undefined" ? Object : ShellMainWindowHost)
], ShellMainWindowNavigation.prototype, "host", void 0);
__decorate([
    inject(ShellDiagnostics),
    __metadata("design:type", typeof ShellDiagnostics === "undefined" ? Object : ShellDiagnostics)
], ShellMainWindowNavigation.prototype, "diagnostics", void 0);
ShellMainWindowNavigation = __decorate([
    injectable()
], ShellMainWindowNavigation);
