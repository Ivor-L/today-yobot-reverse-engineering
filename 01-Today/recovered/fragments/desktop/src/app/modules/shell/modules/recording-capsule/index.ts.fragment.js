// Compiled fragment from ./src/app/modules/shell/modules/recording-capsule/index.ts.
// The original TypeScript and import graph are not restored.








class ShellRecordingCapsule {
    install() {
        if (this.installResult) {
            return this.installResult;
        }
        const installResult = this.performInstall();
        this.installResult = installResult;
        return installResult;
    }
    async performInstall() {
        this.ipc.install();
        const presenceSubscription = await this.presence.subscribe('focusChanged', (focused)=>this.window.setForeground(focused));
        await this.window.setForeground(this.presence.isFocused());
        const record = this.adapter.sei.record;
        const subscription = await record.subscribe('stateChanged', async (state)=>{
            await this.window.update(state);
        });
        try {
            const state = await record.getState();
            await this.window.update(state);
        } catch (error) {
            await subscription.unsubscribe();
            await presenceSubscription.unsubscribe();
            throw error;
        }
    }
}
__decorate([
    inject(ShellApplicationPresence),
    __metadata("design:type", typeof ShellApplicationPresence === "undefined" ? Object : ShellApplicationPresence)
], ShellRecordingCapsule.prototype, "presence", void 0);
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], ShellRecordingCapsule.prototype, "adapter", void 0);
__decorate([
    inject(ShellRecordingCapsuleIpc),
    __metadata("design:type", typeof ShellRecordingCapsuleIpc === "undefined" ? Object : ShellRecordingCapsuleIpc)
], ShellRecordingCapsule.prototype, "ipc", void 0);
__decorate([
    inject(ShellRecordingCapsuleWindow),
    __metadata("design:type", typeof ShellRecordingCapsuleWindow === "undefined" ? Object : ShellRecordingCapsuleWindow)
], ShellRecordingCapsule.prototype, "window", void 0);
ShellRecordingCapsule = __decorate([
    injectable()
], ShellRecordingCapsule);
