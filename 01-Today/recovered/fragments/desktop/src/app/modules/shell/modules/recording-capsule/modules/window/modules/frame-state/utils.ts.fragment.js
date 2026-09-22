// Compiled fragment from ./src/app/modules/shell/modules/recording-capsule/modules/window/modules/frame-state/utils.ts.
// The original TypeScript and import graph are not restored.

const modules_frame_state_utils_isFileNotFoundError = (error)=>error instanceof Error && 'code' in error && error.code === 'ENOENT';
const isRecordingCapsuleFrame = (value)=>{
    if (!value || typeof value !== 'object') {
        return false;
    }
    const frame = value;
    return Number.isSafeInteger(frame.x) && Number.isSafeInteger(frame.y) && Number.isSafeInteger(frame.width) && Number.isSafeInteger(frame.height) && Number(frame.width) > 0 && Number(frame.height) > 0;
};
const recordingCapsuleFrameFitsWorkArea = (frame, workArea)=>isRecordingCapsuleFrame(frame) && isRecordingCapsuleFrame(workArea) && frame.x >= workArea.x && frame.y >= workArea.y && frame.x + frame.width <= workArea.x + workArea.width && frame.y + frame.height <= workArea.y + workArea.height;
