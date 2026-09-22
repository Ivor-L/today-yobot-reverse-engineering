// Compiled fragment from ./src/app/modules/node-network-inspection/modules/state/index.ts.
// The original TypeScript and import graph are not restored.









class DesktopNetworkInspectionState {
    async clear() {
        const pendingMutation = this.clearAfter(this.pendingMutation);
        this.pendingMutation = pendingMutation;
        await pendingMutation;
    }
    async read() {
        await this.waitForPendingMutation();
        try {
            const contents = await this.readStateContents();
            return parseNodeNetworkInspectionState(JSON.parse(contents));
        } catch (error) {
            if (state_utils_isFileNotFoundError(error) || error instanceof SyntaxError) {
                return undefined;
            }
            throw error;
        }
    }
    async write(enabled) {
        const pendingMutation = this.writeAfter(this.pendingMutation, enabled);
        this.pendingMutation = pendingMutation;
        await pendingMutation;
    }
    get filePath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getPath('userData'), NODE_NETWORK_INSPECTION_STATE_FILE_NAME);
    }
    get backupPath() {
        return `${this.filePath}.bak`;
    }
    get temporaryPath() {
        return `${this.filePath}.tmp`;
    }
    async clearAfter(previousMutation) {
        try {
            await previousMutation;
        } catch  {
        // A failed write must not prevent the persisted state from being cleared.
        }
        await Promise.all([
            (0,promises_namespaceObject.rm)(this.backupPath, {
                force: true
            }),
            (0,promises_namespaceObject.rm)(this.filePath, {
                force: true
            }),
            (0,promises_namespaceObject.rm)(this.temporaryPath, {
                force: true
            })
        ]);
    }
    async readStateContents() {
        try {
            return await (0,promises_namespaceObject.readFile)(this.filePath, 'utf8');
        } catch (error) {
            if (!state_utils_isFileNotFoundError(error)) {
                throw error;
            }
            return await (0,promises_namespaceObject.readFile)(this.backupPath, 'utf8');
        }
    }
    async waitForPendingMutation() {
        try {
            await this.pendingMutation;
        } catch  {
        // Read the last valid state after a failed mutation.
        }
    }
    async writeAfter(previousMutation, enabled) {
        try {
            await previousMutation;
        } catch  {
        // Continue with the newest state after an older mutation failed.
        }
        await this.writeState(enabled);
    }
    async writeState(enabled) {
        const backupPath = this.backupPath;
        const filePath = this.filePath;
        const temporaryPath = this.temporaryPath;
        const state = {
            enabled,
            schemaVersion: (/* inlined export .NODE_NETWORK_INSPECTION_STATE_SCHEMA_VERSION */1)
        };
        await (0,promises_namespaceObject.mkdir)((0,external_node_path_namespaceObject.dirname)(filePath), {
            recursive: true
        });
        try {
            await (0,promises_namespaceObject.rm)(temporaryPath, {
                force: true
            });
            await (0,promises_namespaceObject.writeFile)(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, {
                encoding: 'utf8',
                flag: 'wx',
                mode: 384
            });
            try {
                await (0,promises_namespaceObject.rename)(temporaryPath, filePath);
            } catch (error) {
                if (process.platform !== 'win32' || !isDestinationConflictError(error)) {
                    throw error;
                }
                await (0,promises_namespaceObject.rm)(backupPath, {
                    force: true
                });
                await (0,promises_namespaceObject.rename)(filePath, backupPath);
                try {
                    await (0,promises_namespaceObject.rename)(temporaryPath, filePath);
                } catch (replacementError) {
                    try {
                        await (0,promises_namespaceObject.rename)(backupPath, filePath);
                    } catch  {
                    // Leave the backup available for the next read.
                    }
                    throw replacementError;
                }
            }
            try {
                await (0,promises_namespaceObject.rm)(backupPath, {
                    force: true
                });
            } catch  {
            // The committed primary file remains authoritative over a stale backup.
            }
        } catch (error) {
            try {
                await (0,promises_namespaceObject.rm)(temporaryPath, {
                    force: true
                });
            } catch  {
            // Preserve the primary persistence failure.
            }
            throw error;
        }
    }
    constructor(){
        this.pendingMutation = Promise.resolve();
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], DesktopNetworkInspectionState.prototype, "configuration", void 0);
DesktopNetworkInspectionState = __decorate([
    injectable()
], DesktopNetworkInspectionState);
