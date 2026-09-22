// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/socket/modules/notifications/modules/remote-push/modules/registration/modules/store/index.ts.
// The original TypeScript and import graph are not restored.









class RemotePushRegistrationStore {
    async read() {
        try {
            const contents = await (0,promises_namespaceObject.readFile)(this.filePath, 'utf8');
            const parsed = JSON.parse(contents);
            if (isRemotePushRegistrationState(parsed)) {
                return parsed;
            }
            throw new Error(`Invalid remote push registration state at ${this.filePath}`);
        } catch (error) {
            if (store_utils_isFileNotFoundError(error)) {
                return createEmptyRemotePushRegistrationState();
            }
            throw error;
        }
    }
    async write(state) {
        const filePath = this.filePath;
        await (0,promises_namespaceObject.mkdir)((0,external_node_path_namespaceObject.dirname)(filePath), {
            recursive: true
        });
        const temporaryPath = `${filePath}.${process.pid}.tmp`;
        try {
            await (0,promises_namespaceObject.writeFile)(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, {
                encoding: 'utf8',
                mode: 384
            });
            await (0,promises_namespaceObject.rename)(temporaryPath, filePath);
        } catch (error) {
            try {
                await (0,promises_namespaceObject.rm)(temporaryPath, {
                    force: true
                });
            } catch  {}
            throw error;
        }
    }
    get filePath() {
        return (0,external_node_path_namespaceObject.join)((0,external_node_path_namespaceObject.dirname)(this.preferences.settingsPath), REMOTE_PUSH_REGISTRATION_STATE_FILE_NAME);
    }
}
__decorate([
    inject(PreferencesShellService),
    __metadata("design:type", typeof PreferencesShellService === "undefined" ? Object : PreferencesShellService)
], RemotePushRegistrationStore.prototype, "preferences", void 0);
RemotePushRegistrationStore = __decorate([
    injectable()
], RemotePushRegistrationStore);
