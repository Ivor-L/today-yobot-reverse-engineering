// Compiled fragment from ./src/app/modules/single-instance/index.ts.
// The original TypeScript and import graph are not restored.








class DesktopSingleInstance {
    tryAcquire() {
        if (this.acquired !== undefined) {
            return this.acquired;
        }
        const { application, platform } = this.configuration;
        const { buildEnvironment, macosRegion } = this.configuration.current;
        const scheme = resolveDesktopDeepLinkScheme(buildEnvironment, macosRegion);
        if (platform === 'darwin') {
            application.on('open-url', this.handleOpenUrl);
            this.acquired = true;
            return true;
        }
        this.acquired = application.requestSingleInstanceLock();
        if (!this.acquired) {
            application.quit();
            return false;
        }
        if (this.shortcuts.consumeActivation(process.argv)) {
            this.acquired = false;
            application.quit();
            return false;
        }
        application.on('second-instance', this.handleSecondInstance);
        const launchRequest = resolveDesktopActivationRequest(process.argv, scheme);
        if (launchRequest) {
            this.dispatchActivation(launchRequest);
        }
        return true;
    }
    bindActivation(handler) {
        const { application } = this.configuration;
        const { buildEnvironment, macosRegion } = this.configuration.current;
        application.setAsDefaultProtocolClient(resolveDesktopDeepLinkScheme(buildEnvironment, macosRegion));
        this.activationHandler = handler;
        const pending = this.activationPending;
        if (!pending) {
            return;
        }
        this.activationPending = undefined;
        handler(pending);
    }
    dispatchActivation(request) {
        const handler = this.activationHandler;
        if (!handler) {
            this.activationPending = mergeDesktopActivationRequests(this.activationPending, request);
            return;
        }
        handler(request);
    }
    constructor(){
        this.handleOpenUrl = (event, url)=>{
            const { buildEnvironment, macosRegion } = this.configuration.current;
            const scheme = resolveDesktopDeepLinkScheme(buildEnvironment, macosRegion);
            const request = resolveDesktopActivationRequest([
                url
            ], scheme);
            if (!request) {
                return;
            }
            event.preventDefault();
            this.dispatchActivation(request);
        };
        this.handleSecondInstance = (_event, commandLine)=>{
            if (this.shortcuts.consumeActivation(commandLine)) {
                return;
            }
            const { buildEnvironment, macosRegion } = this.configuration.current;
            const scheme = resolveDesktopDeepLinkScheme(buildEnvironment, macosRegion);
            const request = resolveDesktopActivationRequest(commandLine, scheme) ?? {};
            this.dispatchActivation(request);
        };
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], DesktopSingleInstance.prototype, "configuration", void 0);
__decorate([
    inject(ShellShortcuts),
    __metadata("design:type", typeof ShellShortcuts === "undefined" ? Object : ShellShortcuts)
], DesktopSingleInstance.prototype, "shortcuts", void 0);
DesktopSingleInstance = __decorate([
    injectable()
], DesktopSingleInstance);
