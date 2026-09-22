// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/update/modules/electron-updater/modules/native-stage/index.ts.
// The original TypeScript and import graph are not restored.





class ElectronUpdateNativeStage {
    start() {
        this.stopping = false;
        if (process.platform !== 'darwin' || this.observing) {
            return;
        }
        external_electron_.autoUpdater.on('checking-for-update', this.onChecking);
        external_electron_.autoUpdater.on('update-downloaded', this.onSettled);
        external_electron_.autoUpdater.on('update-not-available', this.onSettled);
        external_electron_.autoUpdater.on('error', this.onSettled);
        this.observing = true;
    }
    expectStage() {
        if (process.platform === 'darwin' && this.observing) {
            this.active = true;
        }
    }
    stop() {
        this.stopping = true;
        if (!this.active) {
            this.detach();
        }
    }
    async waitForIdle() {
        if (!this.active) {
            return;
        }
        await new Promise((resolve, reject)=>{
            const onIdle = ()=>{
                clearTimeout(timeout);
                this.idleListeners.delete(onIdle);
                resolve();
            };
            const timeout = setTimeout(()=>{
                this.idleListeners.delete(onIdle);
                reject(new Error('The native application update did not finish staging in time.'));
            }, (/* inlined export .NATIVE_UPDATE_STAGE_TIMEOUT_MS */30000));
            this.idleListeners.add(onIdle);
        });
    }
    detach() {
        if (!this.observing) {
            return;
        }
        external_electron_.autoUpdater.off('checking-for-update', this.onChecking);
        external_electron_.autoUpdater.off('update-downloaded', this.onSettled);
        external_electron_.autoUpdater.off('update-not-available', this.onSettled);
        external_electron_.autoUpdater.off('error', this.onSettled);
        this.observing = false;
    }
    constructor(){
        this.active = false;
        this.observing = false;
        this.stopping = false;
        this.idleListeners = new Set();
        this.onChecking = ()=>{
            this.active = true;
        };
        this.onSettled = ()=>{
            this.active = false;
            for (const listener of this.idleListeners){
                listener();
            }
            if (this.stopping) {
                this.detach();
            }
        };
    }
}
ElectronUpdateNativeStage = __decorate([
    injectable()
], ElectronUpdateNativeStage);
