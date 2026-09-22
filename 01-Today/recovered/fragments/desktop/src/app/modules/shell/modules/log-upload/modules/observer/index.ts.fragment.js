// Compiled fragment from ./src/app/modules/shell/modules/log-upload/modules/observer/index.ts.
// The original TypeScript and import graph are not restored.







class ShellLogUploadObserver {
    async start() {
        if (this.subscription) {
            return;
        }
        this.subscription = await this.adapter.sei.logs.subscribe('uploadStateChanged', this.handleState);
        this.handleState(await this.adapter.sei.logs.getLocalUploadState());
    }
    async stop() {
        const subscription = this.subscription;
        this.subscription = undefined;
        await subscription?.unsubscribe();
    }
    async startUpload() {
        await this.window.show();
        if (this.starting) {
            return;
        }
        const starting = this.upload();
        this.starting = starting;
        this.finishUpload(starting);
    }
    async finishUpload(starting) {
        try {
            await starting;
        } finally{
            if (this.starting === starting) {
                this.starting = undefined;
            }
        }
    }
    async upload() {
        try {
            const state = await this.adapter.sei.logs.getLocalUploadState();
            if (state.status === (/* inlined export .LocalLogUploadStatus.Uploading */"uploading")) {
                return;
            }
            await this.adapter.sei.logs.uploadLocal();
        } catch  {
        // The Logs Owner publishes the sanitized failure snapshot before rejecting.
        }
    }
    async showUpload() {
        try {
            await this.window.show();
        } catch  {
            // A local presentation failure must not cancel the shared Owner's upload.
            console.warn('[desktop] unable to open the log upload window');
        }
    }
    constructor(){
        this.previousStatus = null;
        this.handleState = (state)=>{
            const started = state.status === (/* inlined export .LocalLogUploadStatus.Uploading */"uploading") && this.previousStatus !== state.status;
            this.previousStatus = state.status;
            this.window.publish(state);
            if (started && state.trigger === 'local') {
                this.showUpload();
            }
        };
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], ShellLogUploadObserver.prototype, "adapter", void 0);
__decorate([
    inject(ShellLogUploadWindow),
    __metadata("design:type", typeof ShellLogUploadWindow === "undefined" ? Object : ShellLogUploadWindow)
], ShellLogUploadObserver.prototype, "window", void 0);
ShellLogUploadObserver = __decorate([
    injectable()
], ShellLogUploadObserver);
