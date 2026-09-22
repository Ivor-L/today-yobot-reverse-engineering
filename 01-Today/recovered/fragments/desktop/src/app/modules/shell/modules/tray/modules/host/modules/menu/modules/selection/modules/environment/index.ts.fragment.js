// Compiled fragment from ./src/app/modules/shell/modules/tray/modules/host/modules/menu/modules/selection/modules/environment/index.ts.
// The original TypeScript and import graph are not restored.









class ShellTrayEnvironmentSelection {
    selectDevelopment() {
        this.select(base_RuntimeEnvironment.Development);
    }
    selectProduction() {
        this.select(base_RuntimeEnvironment.Production);
    }
    select(value) {
        const preference = this.nodeAdapter.sei.preferences.environment;
        if (preference.value === value) {
            return;
        }
        this.confirmAndSet(value);
    }
    async confirmAndSet(value) {
        const copy = resolveTrayMenuCopy(this.configuration.application.getLocale());
        let environmentLabel = copy.productionEnvironment;
        if (value === base_RuntimeEnvironment.Development) {
            environmentLabel = copy.developmentEnvironment;
        }
        try {
            const result = await external_electron_.dialog.showMessageBox({
                buttons: [
                    copy.switchEnvironmentConfirm,
                    copy.switchEnvironmentCancel
                ],
                cancelId: 1,
                defaultId: 0,
                detail: copy.switchEnvironmentDetail(environmentLabel),
                message: copy.switchEnvironment,
                noLink: true,
                type: 'warning'
            });
            if (result.response !== 0) {
                return;
            }
            await this.nodeAdapter.sei.preferences.environment.setValue({
                value
            });
        } catch (error) {
            console.error('[desktop] failed to switch the runtime environment', error);
        }
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], ShellTrayEnvironmentSelection.prototype, "nodeAdapter", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellTrayEnvironmentSelection.prototype, "configuration", void 0);
ShellTrayEnvironmentSelection = __decorate([
    injectable()
], ShellTrayEnvironmentSelection);
