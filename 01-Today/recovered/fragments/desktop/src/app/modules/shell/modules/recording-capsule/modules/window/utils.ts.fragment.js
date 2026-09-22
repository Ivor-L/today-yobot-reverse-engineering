// Compiled fragment from ./src/app/modules/shell/modules/recording-capsule/modules/window/utils.ts.
// The original TypeScript and import graph are not restored.


const defaultRecordingCapsuleBounds = (workArea)=>({
        width: (/* inlined export .RECORDING_CAPSULE_WINDOW_WIDTH */56),
        height: (/* inlined export .RECORDING_CAPSULE_WINDOW_HEIGHT */84),
        x: Math.round(workArea.x + (/* inlined export .RECORDING_CAPSULE_WINDOW_LEFT_INSET */12)),
        y: Math.round(workArea.y + (workArea.height - (/* inlined export .RECORDING_CAPSULE_WINDOW_HEIGHT */84)) / 2)
    });
const clampRecordingCapsuleBounds = (bounds, workArea)=>({
        ...bounds,
        x: Math.round(Math.max(workArea.x, Math.min(bounds.x, workArea.x + workArea.width - bounds.width))),
        y: Math.round(Math.max(workArea.y, Math.min(bounds.y, workArea.y + workArea.height - bounds.height)))
    });
