// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/record-debug/modules/ipc/index.ts.
// The original TypeScript and import graph are not restored.










class ShellRecordDebugIpc {
    install() {
        const ipc = this.configuration.ipc;
        ipc.removeHandler(RECORD_DEBUG_GET_DEFAULTS_CHANNEL);
        ipc.removeHandler(RECORD_DEBUG_TRIGGER_CHANNEL);
        ipc.handle(RECORD_DEBUG_GET_DEFAULTS_CHANNEL, (event)=>{
            this.assertTrustedSender(event);
            return createRecordDebugDefaults(Date.now(), (0,external_node_crypto_namespaceObject.randomUUID)());
        });
        ipc.handle(RECORD_DEBUG_TRIGGER_CHANNEL, (event, value)=>{
            this.assertTrustedSender(event);
            this.reminder.simulate(parseRecordDebugOffer(value, Date.now()));
        });
    }
    assertTrustedSender(event) {
        if (this.window.isTrustedSender(event)) {
            return;
        }
        throw new Error('Rejected untrusted Record debug IPC sender');
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellRecordDebugIpc.prototype, "configuration", void 0);
__decorate([
    inject(ShellRecordDebugWindow),
    __metadata("design:type", typeof ShellRecordDebugWindow === "undefined" ? Object : ShellRecordDebugWindow)
], ShellRecordDebugIpc.prototype, "window", void 0);
__decorate([
    inject(ShellMeetingReminder),
    __metadata("design:type", typeof ShellMeetingReminder === "undefined" ? Object : ShellMeetingReminder)
], ShellRecordDebugIpc.prototype, "reminder", void 0);
ShellRecordDebugIpc = __decorate([
    injectable()
], ShellRecordDebugIpc);
