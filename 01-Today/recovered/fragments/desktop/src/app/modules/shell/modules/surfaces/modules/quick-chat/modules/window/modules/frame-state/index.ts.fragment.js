// Compiled fragment from ./src/app/modules/shell/modules/surfaces/modules/quick-chat/modules/window/modules/frame-state/index.ts.
// The original TypeScript and import graph are not restored.











class ShellQuickChatFrameState {
    async restore(defaultBounds, constraints) {
        await this.waitForPendingWrite();
        const savedFrame = await this.read();
        if (!savedFrame) {
            return undefined;
        }
        const workAreas = external_electron_.screen.getAllDisplays().map((display)=>display.workArea);
        const fallbackWorkArea = external_electron_.screen.getPrimaryDisplay().workArea;
        const bounds = constrainQuickChatFrame(savedFrame, workAreas, fallbackWorkArea, constraints);
        const isPinned = !quickChatFramesApproximatelyEqual(bounds, defaultBounds, (/* inlined export .QUICK_CHAT_FRAME_COMPARISON_TOLERANCE */1));
        return {
            bounds,
            isPinned
        };
    }
    async save(bounds) {
        const frame = {
            ...bounds
        };
        const previousWrite = this.pendingWrite;
        const pendingWrite = this.writeAfter(previousWrite, frame);
        this.pendingWrite = pendingWrite;
        await pendingWrite;
    }
    get filePath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getPath('userData'), QUICK_CHAT_FRAME_STATE_FILE_NAME);
    }
    async read() {
        try {
            const contents = await (0,promises_namespaceObject.readFile)(this.filePath, 'utf8');
            const value = JSON.parse(contents);
            if (isQuickChatFrame(value)) {
                return value;
            }
            return undefined;
        } catch (error) {
            if (frame_state_utils_isFileNotFoundError(error) || error instanceof SyntaxError) {
                return undefined;
            }
            throw error;
        }
    }
    async waitForPendingWrite() {
        try {
            await this.pendingWrite;
        } catch  {
        // A failed write must not prevent a later restore from reading the last valid frame.
        }
    }
    async writeAfter(previousWrite, bounds) {
        try {
            await previousWrite;
        } catch  {
        // Continue with the newest frame after an older write failed.
        }
        await this.write(bounds);
    }
    async write(bounds) {
        const filePath = this.filePath;
        await (0,promises_namespaceObject.mkdir)((0,external_node_path_namespaceObject.dirname)(filePath), {
            recursive: true
        });
        this.temporaryFileSequence += 1;
        const temporaryPath = `${filePath}.${process.pid}.${this.temporaryFileSequence}.tmp`;
        try {
            await (0,promises_namespaceObject.writeFile)(temporaryPath, `${JSON.stringify(bounds, null, 2)}\n`, {
                encoding: 'utf8',
                mode: 384
            });
            await (0,promises_namespaceObject.rename)(temporaryPath, filePath);
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
        this.pendingWrite = Promise.resolve();
        this.temporaryFileSequence = 0;
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellQuickChatFrameState.prototype, "configuration", void 0);
ShellQuickChatFrameState = __decorate([
    injectable()
], ShellQuickChatFrameState);
