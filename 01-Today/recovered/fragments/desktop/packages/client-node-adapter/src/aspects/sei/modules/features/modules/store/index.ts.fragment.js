// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/features/modules/store/index.ts.
// The original TypeScript and import graph are not restored.








class FeatureOverridesStore {
    async read(featureId) {
        await this.load();
        return this.values?.[featureId];
    }
    async write(featureId, value) {
        await this.mutations.run(async ()=>{
            await this.load();
            const next = {
                ...this.values
            };
            if (value === undefined) {
                delete next[featureId];
            } else {
                next[featureId] = value;
            }
            const path = this.filePath;
            const temporaryPath = `${path}.tmp`;
            await (0,promises_namespaceObject.mkdir)((0,external_node_path_namespaceObject.dirname)(path), {
                recursive: true
            });
            try {
                await (0,promises_namespaceObject.writeFile)(temporaryPath, JSON.stringify({
                    schemaVersion: 1,
                    overrides: next
                }), {
                    mode: 384
                });
                await (0,promises_namespaceObject.rename)(temporaryPath, path);
                this.values = next;
            } finally{
                await (0,promises_namespaceObject.rm)(temporaryPath, {
                    force: true
                });
            }
        });
    }
    async load() {
        if (this.values) {
            return;
        }
        try {
            const value = JSON.parse(await (0,promises_namespaceObject.readFile)(this.filePath, 'utf8'));
            if (typeof value === 'object' && value !== null && 'schemaVersion' in value && value.schemaVersion === 1 && 'overrides' in value) {
                const overrides = value.overrides;
                if (typeof overrides === 'object' && overrides !== null && !Array.isArray(overrides)) {
                    this.values = Object.fromEntries(Object.entries(overrides).filter((entry)=>typeof entry[1] === 'boolean'));
                    return;
                }
            }
        } catch (error) {
            if (!(error instanceof SyntaxError) && !(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
                throw error;
            }
        }
        // Preserve the explicit pre-registry Desktop override during migration.
        try {
            const legacy = JSON.parse(await (0,promises_namespaceObject.readFile)((0,external_node_path_namespaceObject.join)((0,external_node_path_namespaceObject.dirname)(this.filePath), 'desktop-features.json'), 'utf8'));
            if (typeof legacy === 'object' && legacy !== null && 'schemaVersion' in legacy && legacy.schemaVersion === 1 && 'recordingEnabled' in legacy && typeof legacy.recordingEnabled === 'boolean') {
                this.values = {
                    recording: legacy.recordingEnabled
                };
                return;
            }
        } catch  {
        // The legacy file is optional; the build default remains authoritative.
        }
        this.values = {};
    }
    get filePath() {
        return (0,external_node_path_namespaceObject.join)((0,external_node_path_namespaceObject.dirname)(this.runtime.current.settingsPath), 'feature-overrides.json');
    }
}
__decorate([
    inject(PreferencesRuntimeProvider),
    __metadata("design:type", typeof PreferencesRuntimeProvider === "undefined" ? Object : PreferencesRuntimeProvider)
], FeatureOverridesStore.prototype, "runtime", void 0);
__decorate([
    inject(SerialTask),
    __metadata("design:type", typeof SerialTask === "undefined" ? Object : SerialTask)
], FeatureOverridesStore.prototype, "mutations", void 0);
FeatureOverridesStore = __decorate([
    injectable()
], FeatureOverridesStore);
