// Compiled fragment from ./src/app/modules/shell/modules/recording-capsule/modules/ipc/index.ts.
// The original TypeScript and import graph are not restored.










class ShellRecordingCapsuleIpc {
    install() {
        const ipc = this.configuration.ipc;
        const channels = [
            RECORDING_CAPSULE_CANCEL_CHANNEL,
            RECORDING_CAPSULE_OPEN_NOTES_CHANNEL,
            RECORDING_CAPSULE_OPEN_APP_CHANNEL,
            RECORDING_CAPSULE_POINTER_CHANNEL,
            RECORDING_CAPSULE_WARNING_SIZE_CHANNEL,
            RECORDING_CAPSULE_DISMISS_CHANNEL,
            RECORDING_CAPSULE_GET_STATE_CHANNEL,
            RECORDING_CAPSULE_RETRY_CHANNEL,
            RECORDING_CAPSULE_SET_PAUSED_CHANNEL,
            RECORDING_CAPSULE_STOP_CHANNEL,
            RECORDING_CAPSULE_SUBSCRIBE_CHANNEL,
            RECORDING_CAPSULE_UNSUBSCRIBE_CHANNEL
        ];
        for (const channel of channels){
            ipc.removeHandler(channel);
        }
        ipc.handle(RECORDING_CAPSULE_OPEN_APP_CHANNEL, (event)=>{
            this.assertTrustedSender(event);
            this.surfaces.openMain('recording-capsule');
        });
        ipc.handle(RECORDING_CAPSULE_POINTER_CHANNEL, (event, phase)=>{
            this.assertTrustedSender(event);
            if (phase !== 'start' && phase !== 'move' && phase !== 'end' && phase !== 'cancel') {
                throw new TypeError('Invalid Recording capsule pointer phase');
            }
            return this.window.pointerInteraction(phase);
        });
        ipc.handle(RECORDING_CAPSULE_WARNING_SIZE_CHANNEL, (event, size)=>{
            this.assertTrustedSender(event);
            if (!size || typeof size !== 'object' || Array.isArray(size)) {
                throw new TypeError('Invalid Recording capsule warning size');
            }
            const { width, height } = size;
            if (typeof width !== 'number' || typeof height !== 'number' || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || width > (/* inlined export .RECORDING_CAPSULE_WARNING_WIDTH */320) || height > (/* inlined export .RECORDING_CAPSULE_WARNING_HEIGHT */104)) {
                throw new TypeError('Invalid Recording capsule warning size');
            }
            this.window.setWarningSize({
                width,
                height
            });
        });
        ipc.handle(RECORDING_CAPSULE_CANCEL_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            await this.adapter.sei.record.cancel();
        });
        ipc.handle(RECORDING_CAPSULE_OPEN_NOTES_CHANNEL, (event, recordingId)=>{
            this.assertTrustedSender(event);
            if (recordingId !== undefined && (typeof recordingId !== 'string' || !/^vc_[A-Za-z0-9_-]+$/.test(recordingId))) {
                throw new TypeError('Invalid recording ID');
            }
            const path = recordingId ? `/audio-notes/${encodeURIComponent(recordingId)}` : '/audio-notes';
            this.surfaces.openDeepLink(`today://memories${path}`);
        });
        ipc.handle(RECORDING_CAPSULE_DISMISS_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            await this.adapter.sei.record.dismiss();
        });
        ipc.handle(RECORDING_CAPSULE_GET_STATE_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            return this.window.getState() ?? await this.adapter.sei.record.getState();
        });
        ipc.handle(RECORDING_CAPSULE_RETRY_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            await this.adapter.sei.record.retry();
        });
        ipc.handle(RECORDING_CAPSULE_SET_PAUSED_CHANNEL, async (event, paused)=>{
            this.assertTrustedSender(event);
            if (typeof paused !== 'boolean') {
                throw new TypeError('Recording paused state must be a boolean');
            }
            await this.adapter.sei.record.setPaused({
                paused
            });
        });
        ipc.handle(RECORDING_CAPSULE_STOP_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            await this.adapter.sei.record.stop();
        });
        ipc.handle(RECORDING_CAPSULE_SUBSCRIBE_CHANNEL, (event)=>{
            this.assertTrustedSender(event);
            this.window.setRendererSubscribed(true);
        });
        ipc.handle(RECORDING_CAPSULE_UNSUBSCRIBE_CHANNEL, (event)=>{
            this.assertTrustedSender(event);
            this.window.setRendererSubscribed(false);
        });
    }
    assertTrustedSender(event) {
        if (this.window.isTrustedSender(event)) {
            return;
        }
        throw new Error('Rejected untrusted Recording capsule IPC sender');
    }
}
__decorate([
    inject(ShellSurfaces),
    __metadata("design:type", typeof ShellSurfaces === "undefined" ? Object : ShellSurfaces)
], ShellRecordingCapsuleIpc.prototype, "surfaces", void 0);
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], ShellRecordingCapsuleIpc.prototype, "adapter", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellRecordingCapsuleIpc.prototype, "configuration", void 0);
__decorate([
    inject(ShellRecordingCapsuleWindow),
    __metadata("design:type", typeof ShellRecordingCapsuleWindow === "undefined" ? Object : ShellRecordingCapsuleWindow)
], ShellRecordingCapsuleIpc.prototype, "window", void 0);
ShellRecordingCapsuleIpc = __decorate([
    injectable()
], ShellRecordingCapsuleIpc);
