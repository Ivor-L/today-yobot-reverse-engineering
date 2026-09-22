// Compiled fragment from ./src/app/modules/data-reset/index.ts.
// The original TypeScript and import graph are not restored.









class DesktopDataReset {
    constructor(){
        this.requested = false;
        this.requestReset = async ()=>{
            if (this.requested) {
                return;
            }
            this.requested = true;
            try {
                this.state.request();
                await this.nodeAdapter.dispose({
                    forDataReset: true
                });
                await this.stagedUpdate.clear();
                // The old process finishes its normal shutdown first. The next process erases
                // the durable profile before any Session, Adapter or Native Host can read it.
                // This also restores the launcher's default inspection switches, which a
                // generic relaunch would otherwise inherit from the current process.
                await this.networkInspector.reset();
            } catch  {
                this.requested = false;
                external_electron_.dialog.showErrorBox('Today could not reset local data', 'Unable to safely finish the reset and restart. Please try again.');
            }
        };
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], DesktopDataReset.prototype, "nodeAdapter", void 0);
__decorate([
    inject(DesktopNetworkInspector),
    __metadata("design:type", typeof DesktopNetworkInspector === "undefined" ? Object : DesktopNetworkInspector)
], DesktopDataReset.prototype, "networkInspector", void 0);
__decorate([
    inject(DesktopDataResetStagedUpdate),
    __metadata("design:type", typeof DesktopDataResetStagedUpdate === "undefined" ? Object : DesktopDataResetStagedUpdate)
], DesktopDataReset.prototype, "stagedUpdate", void 0);
__decorate([
    inject(DesktopDataResetState),
    __metadata("design:type", typeof DesktopDataResetState === "undefined" ? Object : DesktopDataResetState)
], DesktopDataReset.prototype, "state", void 0);
DesktopDataReset = __decorate([
    injectable()
], DesktopDataReset);
