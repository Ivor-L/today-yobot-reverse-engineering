// Compiled fragment from ./src/app/modules/shell/modules/tray/index.ts.
// The original TypeScript and import graph are not restored.






class ShellTray {
    async prepare() {
        if (!this.host.requiresStatePreparation) {
            return;
        }
        await this.state.prepare();
    }
    install() {
        this.host.install();
    }
    destroy() {
        this.state.destroy();
        this.host.destroy();
    }
}
__decorate([
    inject(ShellTrayHost),
    __metadata("design:type", typeof ShellTrayHost === "undefined" ? Object : ShellTrayHost)
], ShellTray.prototype, "host", void 0);
__decorate([
    inject(ShellTrayState),
    __metadata("design:type", typeof ShellTrayState === "undefined" ? Object : ShellTrayState)
], ShellTray.prototype, "state", void 0);
ShellTray = __decorate([
    injectable()
], ShellTray);
