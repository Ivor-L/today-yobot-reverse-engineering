// Compiled fragment from ./src/app/modules/features/modules/state/index.ts.
// The original TypeScript and import graph are not restored.







const DESKTOP_FEATURES_STATE_FILE_NAME = 'desktop-features.json';
const DESKTOP_FEATURES_STATE_SCHEMA_VERSION = 1;
const state_isFileNotFoundError = (error)=>error instanceof Error && 'code' in error && error.code === 'ENOENT';
const parseDesktopFeaturesState = (value)=>{
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return undefined;
    }
    const state = value;
    if (state.schemaVersion !== DESKTOP_FEATURES_STATE_SCHEMA_VERSION || typeof state.recordingEnabled !== 'boolean') {
        return undefined;
    }
    return state.recordingEnabled;
};
class DesktopFeaturesState {
    async clear() {
        await Promise.all([
            (0,promises_namespaceObject.rm)(this.filePath, {
                force: true
            }),
            (0,promises_namespaceObject.rm)(this.temporaryPath, {
                force: true
            })
        ]);
    }
    async read() {
        try {
            const contents = await (0,promises_namespaceObject.readFile)(this.filePath, 'utf8');
            return parseDesktopFeaturesState(JSON.parse(contents));
        } catch (error) {
            if (state_isFileNotFoundError(error) || error instanceof SyntaxError) {
                return undefined;
            }
            throw error;
        }
    }
    async write(recordingEnabled) {
        const state = {
            recordingEnabled,
            schemaVersion: DESKTOP_FEATURES_STATE_SCHEMA_VERSION
        };
        await (0,promises_namespaceObject.mkdir)((0,external_node_path_namespaceObject.dirname)(this.filePath), {
            recursive: true
        });
        try {
            await (0,promises_namespaceObject.rm)(this.temporaryPath, {
                force: true
            });
            await (0,promises_namespaceObject.writeFile)(this.temporaryPath, `${JSON.stringify(state, null, 2)}\n`, {
                encoding: 'utf8',
                flag: 'wx',
                mode: 384
            });
            await (0,promises_namespaceObject.rename)(this.temporaryPath, this.filePath);
        } finally{
            await (0,promises_namespaceObject.rm)(this.temporaryPath, {
                force: true
            });
        }
    }
    get filePath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getPath('userData'), DESKTOP_FEATURES_STATE_FILE_NAME);
    }
    get temporaryPath() {
        return `${this.filePath}.tmp`;
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], DesktopFeaturesState.prototype, "configuration", void 0);
DesktopFeaturesState = __decorate([
    injectable()
], DesktopFeaturesState);
