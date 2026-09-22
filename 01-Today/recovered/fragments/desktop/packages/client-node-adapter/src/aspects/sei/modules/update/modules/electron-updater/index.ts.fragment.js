// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/update/modules/electron-updater/index.ts.
// The original TypeScript and import graph are not restored.










class ElectronUpdateProvider {
    getVersionInfo() {
        const version = external_electron_.app.getVersion();
        const { build } = this.resolveMetadata();
        return {
            build: build ?? version,
            version
        };
    }
    isSupported() {
        const supportedPlatform = process.platform === 'darwin' || process.platform === 'win32' || process.platform === 'linux' && this.isAppImageRuntime();
        return external_electron_.app.isPackaged && supportedPlatform && this.resolveMetadata().updateEnabled;
    }
    start(callbacks) {
        if (this.started || this.dataResetRequested) {
            return;
        }
        const updater = this.resolveUpdater();
        this.callbacks = callbacks;
        try {
            this.nativeStage.start();
            updater.autoDownload = false;
            updater.autoInstallOnAppQuit = true;
            updater.autoRunAppAfterInstall = true;
            updater.allowDowngrade = false;
            updater.on('checking-for-update', this.onCheckingForUpdate);
            updater.on('update-available', this.onUpdateAvailable);
            updater.on('download-progress', this.onDownloadProgress);
            updater.on('update-not-available', this.onUpdateNotAvailable);
            updater.on('update-cancelled', this.onUpdateCancelled);
            updater.on('update-downloaded', this.onUpdateDownloaded);
            updater.on('error', this.onError);
        } catch (error) {
            this.callbacks = undefined;
            this.nativeStage.stop();
            this.detachListeners(updater);
            throw error;
        }
        this.started = true;
    }
    stop(forDataReset = false) {
        const updater = this.updater;
        this.callbacks = undefined;
        if (forDataReset) {
            this.dataResetRequested = true;
            if (updater) {
                updater.autoInstallOnAppQuit = false;
            }
            this.downloadCancellation?.cancel();
        }
        if (!this.started) {
            if (forDataReset) {
                return this.nativeStage.waitForIdle();
            }
            return;
        }
        this.started = false;
        this.nativeStage.stop();
        if (!updater) {
            return;
        }
        const errors = this.detachListeners(updater);
        if (errors.length === 1) {
            throw errors[0];
        }
        if (errors.length > 1) {
            throw new AggregateError(errors, 'Failed to stop the Electron update provider.');
        }
        if (forDataReset) {
            return this.nativeStage.waitForIdle();
        }
    }
    async checkForUpdates() {
        if (this.dataResetRequested) {
            return null;
        }
        const result = await this.resolveUpdater().checkForUpdates();
        if (!result || this.dataResetRequested) {
            return null;
        }
        if (!result.isUpdateAvailable) {
            return {
                updateAvailable: false
            };
        }
        const availableUpdate = resolveAvailableVersion(result.updateInfo);
        const targetPackageBytes = resolveTargetPackageBytes(result.updateInfo);
        return {
            availableUpdate,
            ...targetPackageBytes === undefined ? {} : {
                targetPackageBytes
            },
            updateAvailable: true
        };
    }
    async downloadUpdate() {
        if (this.dataResetRequested) {
            return;
        }
        const cancellation = new main.CancellationToken();
        this.downloadCancellation = cancellation;
        try {
            await this.resolveUpdater().downloadUpdate(cancellation);
        } finally{
            if (this.downloadCancellation === cancellation) {
                this.downloadCancellation = undefined;
            }
        }
    }
    quitAndInstall() {
        if (this.dataResetRequested) {
            return;
        }
        if (process.platform === 'win32') {
            this.resolveUpdater().quitAndInstall(true, true);
            return;
        }
        this.resolveUpdater().quitAndInstall();
    }
    isAppImageRuntime() {
        const appImage = process.env['APPIMAGE'];
        if (!appImage || !(0,external_node_path_namespaceObject.isAbsolute)(appImage) || appImage.includes('\0') || process.env['SNAP']) {
            return false;
        }
        try {
            // electron-updater selects a system package installer when this marker exists.
            // An inherited APPIMAGE variable must never enable deb/rpm/pacman installation.
            const packageTypePath = (0,external_node_path_namespaceObject.join)(process.resourcesPath, 'package-type');
            if ((0,external_node_fs_namespaceObject.existsSync)(packageTypePath)) {
                return false;
            }
            return (0,external_node_fs_namespaceObject.statSync)(appImage).isFile();
        } catch  {
            return false;
        }
    }
    resolveUpdater() {
        if (this.updater) {
            return this.updater;
        }
        this.updater = main.autoUpdater;
        return this.updater;
    }
    resolveMetadata() {
        if (this.metadataResolved) {
            return this.metadata ?? {
                updateEnabled: false
            };
        }
        this.metadataResolved = true;
        try {
            const packageMetadata = JSON.parse((0,external_node_fs_namespaceObject.readFileSync)((0,external_node_path_namespaceObject.join)(external_electron_.app.getAppPath(), 'package.json'), 'utf8'));
            this.metadata = resolveElectronUpdatePackageMetadata(packageMetadata);
        } catch  {
            this.metadata = {
                updateEnabled: false
            };
        }
        return this.metadata;
    }
    detachListeners(updater) {
        const errors = [];
        const detach = (operation)=>{
            try {
                operation();
            } catch (error) {
                errors.push(error);
            }
        };
        detach(()=>{
            updater.off('checking-for-update', this.onCheckingForUpdate);
        });
        detach(()=>{
            updater.off('update-available', this.onUpdateAvailable);
        });
        detach(()=>{
            updater.off('download-progress', this.onDownloadProgress);
        });
        detach(()=>{
            updater.off('update-not-available', this.onUpdateNotAvailable);
        });
        detach(()=>{
            updater.off('update-cancelled', this.onUpdateCancelled);
        });
        detach(()=>{
            updater.off('update-downloaded', this.onUpdateDownloaded);
        });
        detach(()=>{
            updater.off('error', this.onError);
        });
        return errors;
    }
    constructor(){
        this.dataResetRequested = false;
        this.metadataResolved = false;
        this.started = false;
        this.onCheckingForUpdate = ()=>{
            this.callbacks?.onChecking();
        };
        this.onUpdateAvailable = (info)=>{
            this.callbacks?.onAvailable(resolveAvailableVersion(info));
        };
        this.onDownloadProgress = (info)=>{
            this.callbacks?.onProgress(resolveDownloadProgress(info));
        };
        this.onUpdateNotAvailable = ()=>{
            this.callbacks?.onNotAvailable();
        };
        this.onUpdateCancelled = ()=>{
            this.callbacks?.onCancelled();
        };
        this.onUpdateDownloaded = ()=>{
            if (!this.dataResetRequested) {
                // MacUpdater emits this immediately before handing its ZIP to Squirrel.
                // Native checking events arrive later on the Electron event loop.
                this.nativeStage.expectStage();
            }
        };
        this.onError = ()=>{
            this.callbacks?.onError();
        };
    }
}
__decorate([
    inject(ElectronUpdateNativeStage),
    __metadata("design:type", typeof ElectronUpdateNativeStage === "undefined" ? Object : ElectronUpdateNativeStage)
], ElectronUpdateProvider.prototype, "nativeStage", void 0);
ElectronUpdateProvider = __decorate([
    injectable()
], ElectronUpdateProvider);
