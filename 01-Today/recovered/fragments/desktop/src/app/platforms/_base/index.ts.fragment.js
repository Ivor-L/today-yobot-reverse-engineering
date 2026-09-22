// Compiled fragment from ./src/app/platforms/_base/index.ts.
// The original TypeScript and import graph are not restored.


class BaseDesktopPlatform {
    prepareStatusMenu() {}
    async resetLocalData() {}
    async start() {
        return this.platformSerialTask.run(async ()=>{
            if (this.quitRequested) {
                throw new Error('The desktop platform cannot start while the application is quitting.');
            }
            if (this.connection) {
                return this.connection;
            }
            const configuration = this.desktopConfiguration;
            const configuredPlatform = configuration.platform;
            if (this.target !== configuredPlatform) {
                throw new Error(`Desktop bundle target ${this.target} cannot run as ${configuredPlatform}.`);
            }
            configuration.application.on('before-quit', this.handleBeforeQuit);
            try {
                const connection = await this.startPlatformHost();
                this.connection = connection;
                return connection;
            } catch (error) {
                configuration.application.removeListener('before-quit', this.handleBeforeQuit);
                throw error;
            }
        });
    }
    async stop() {
        await this.platformSerialTask.run(async ()=>{
            if (!this.connection) {
                return;
            }
            try {
                await this.stopPlatformHost();
            } finally{
                this.connection = undefined;
                this.desktopConfiguration.application.removeListener('before-quit', this.handleBeforeQuit);
            }
        });
    }
    async finishQuit() {
        try {
            await this.stop();
        } catch (error) {
            console.warn('[desktop] failed to stop the platform before quitting', error);
        } finally{
            // Electron can ignore a reentrant quit while it is still unwinding a prevented native
            // Command+Q request. Resume after the original request returns to the event loop.
            setImmediate(()=>{
                this.desktopConfiguration.application.quit();
            });
        }
    }
    constructor(){
        this.featureIds = [
            (/* inlined export .WellKnownFeatureId.Recording */"recording")
        ];
        this.quitRequested = false;
        this.handleBeforeQuit = (event)=>{
            event.preventDefault();
            if (this.quitRequested) {
                return;
            }
            this.quitRequested = true;
            this.finishQuit();
        };
    }
}
