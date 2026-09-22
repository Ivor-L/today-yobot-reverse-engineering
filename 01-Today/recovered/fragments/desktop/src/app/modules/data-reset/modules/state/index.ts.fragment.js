// Compiled fragment from ./src/app/modules/data-reset/modules/state/index.ts.
// The original TypeScript and import graph are not restored.









class DesktopDataResetState {
    get path() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getPath('userData'), DATA_RESET_REQUEST_FILE_NAME);
    }
    get pending() {
        if (!(0,external_node_fs_namespaceObject.existsSync)(this.path)) {
            return false;
        }
        if (!(0,external_node_fs_namespaceObject.lstatSync)(this.path).isFile() || (0,external_node_fs_namespaceObject.readFileSync)(this.path, 'utf8') !== DATA_RESET_REQUEST_CONTENT) {
            throw new Error('The local data reset request is invalid.');
        }
        return true;
    }
    request() {
        if (this.pending) {
            return;
        }
        (0,external_node_fs_namespaceObject.mkdirSync)(this.configuration.application.getPath('userData'), {
            recursive: true
        });
        const temporaryPath = `${this.path}.${(0,external_node_crypto_namespaceObject.randomUUID)()}.tmp`;
        try {
            (0,external_node_fs_namespaceObject.writeFileSync)(temporaryPath, DATA_RESET_REQUEST_CONTENT, {
                flag: 'wx',
                mode: 384,
                flush: true
            });
            (0,external_node_fs_namespaceObject.renameSync)(temporaryPath, this.path);
        } finally{
            (0,external_node_fs_namespaceObject.rmSync)(temporaryPath, {
                force: true
            });
        }
    }
    complete() {
        (0,external_node_fs_namespaceObject.rmSync)(this.path, {
            force: true
        });
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], DesktopDataResetState.prototype, "configuration", void 0);
DesktopDataResetState = __decorate([
    injectable()
], DesktopDataResetState);
