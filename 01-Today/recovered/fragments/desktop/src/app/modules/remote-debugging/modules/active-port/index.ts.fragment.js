// Compiled fragment from ./src/app/modules/remote-debugging/modules/active-port/index.ts.
// The original TypeScript and import graph are not restored.










class DevToolsActivePort {
    prepare() {
        if (this.filePath) {
            return;
        }
        const application = this.configuration.application;
        const filePath = (0,external_node_path_namespaceObject.join)(application.getPath('sessionData'), DEVTOOLS_ACTIVE_PORT_FILENAME);
        (0,external_node_fs_namespaceObject.rmSync)(filePath, {
            force: true
        });
        application.commandLine.appendSwitch('remote-debugging-port', '0');
        this.filePath = filePath;
    }
    async waitForPort({ pollIntervalMilliseconds = (/* inlined export .DEVTOOLS_ACTIVE_PORT_POLL_INTERVAL_MILLISECONDS */25), timeoutMilliseconds = (/* inlined export .DEVTOOLS_ACTIVE_PORT_TIMEOUT_MILLISECONDS */5000) } = {}) {
        const filePath = this.filePath;
        if (!filePath) {
            throw new Error('The DevTools active port was not prepared before Electron became ready.');
        }
        const timeoutAt = Date.now() + timeoutMilliseconds;
        while(Date.now() <= timeoutAt){
            const contents = await this.read(filePath);
            const port = contents ? parseDevToolsActivePort(contents) : undefined;
            if (port) {
                return port;
            }
            await new Promise((resolve)=>{
                setTimeout(resolve, pollIntervalMilliseconds);
            });
        }
        throw new Error(`Electron did not publish a valid ${DEVTOOLS_ACTIVE_PORT_FILENAME} file`);
    }
    async read(filePath) {
        try {
            return await (0,promises_namespaceObject.readFile)(filePath, 'utf8');
        } catch (error) {
            if (isErrnoException(error) && error.code === 'ENOENT') {
                return undefined;
            }
            throw error;
        }
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], DevToolsActivePort.prototype, "configuration", void 0);
DevToolsActivePort = __decorate([
    injectable()
], DevToolsActivePort);
