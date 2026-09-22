// Compiled fragment from ./src/app/modules/shell/modules/recording-capsule/modules/window/modules/frame-state/index.ts.
// The original TypeScript and import graph are not restored.










class RecordingCapsuleFrameState {
    async restore(defaultBounds) {
        try {
            await this.pendingWrite;
        } catch  {
        // An unsuccessful save must not prevent reading the last valid frame.
        }
        const savedFrame = await this.read();
        if (savedFrame && external_electron_.screen.getAllDisplays().some((display)=>recordingCapsuleFrameFitsWorkArea(savedFrame, display.workArea))) {
            return savedFrame;
        }
        return {
            ...defaultBounds
        };
    }
    async save(bounds) {
        if (!isRecordingCapsuleFrame(bounds)) {
            throw new TypeError('Invalid Recording capsule window frame');
        }
        const frame = {
            height: bounds.height,
            width: bounds.width,
            x: bounds.x,
            y: bounds.y
        };
        const pendingWrite = this.writeAfter(this.pendingWrite, frame);
        this.pendingWrite = pendingWrite;
        await pendingWrite;
    }
    get filePath() {
        return (0,external_node_path_namespaceObject.join)(this.configuration.application.getPath('userData'), RECORDING_CAPSULE_FRAME_STATE_FILE_NAME);
    }
    async read() {
        try {
            const contents = await (0,promises_namespaceObject.readFile)(this.filePath, 'utf8');
            const value = JSON.parse(contents);
            if (!isRecordingCapsuleFrame(value)) {
                return undefined;
            }
            return {
                height: value.height,
                width: value.width,
                x: value.x,
                y: value.y
            };
        } catch (error) {
            if (modules_frame_state_utils_isFileNotFoundError(error) || error instanceof SyntaxError) {
                return undefined;
            }
            throw error;
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
], RecordingCapsuleFrameState.prototype, "configuration", void 0);
RecordingCapsuleFrameState = __decorate([
    injectable()
], RecordingCapsuleFrameState);
