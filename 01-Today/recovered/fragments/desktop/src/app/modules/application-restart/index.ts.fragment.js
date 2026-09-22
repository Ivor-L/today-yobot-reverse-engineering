// Compiled fragment from ./src/app/modules/application-restart/index.ts.
// The original TypeScript and import graph are not restored.







class DesktopApplicationRestart {
    async restart(options = {}) {
        await this.prepare(options);
        setImmediate(()=>{
            this.configuration.application.quit();
        });
    }
    async prepare(options) {
        const { developmentSupervisorDirectory } = this.configuration.current.launchOptions;
        const { nodeNetworkInspectionEnabled } = options;
        if (!developmentSupervisorDirectory) {
            const currentArguments = [
                ...process.execArgv,
                ...process.argv.slice(1)
            ];
            this.configuration.application.relaunch({
                args: typeof nodeNetworkInspectionEnabled === 'boolean' ? setNodeNetworkInspection(currentArguments, nodeNetworkInspectionEnabled) : currentArguments
            });
            return;
        }
        await (0,promises_namespaceObject.writeFile)(resolveDesktopDevelopmentRestartRequestPath(developmentSupervisorDirectory), serializeDesktopDevelopmentRestartRequest(options), {
            encoding: 'utf8',
            flag: 'wx',
            mode: 384
        });
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], DesktopApplicationRestart.prototype, "configuration", void 0);
DesktopApplicationRestart = __decorate([
    injectable()
], DesktopApplicationRestart);

// EXTERNAL MODULE: external "node:inspector"
var external_node_inspector_ = __webpack_require__(6592);
