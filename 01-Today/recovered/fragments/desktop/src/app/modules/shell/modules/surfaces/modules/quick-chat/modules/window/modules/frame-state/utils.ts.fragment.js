// Compiled fragment from ./src/app/modules/shell/modules/surfaces/modules/quick-chat/modules/window/modules/frame-state/utils.ts.
// The original TypeScript and import graph are not restored.


const clamp = (value, minimum, maximum)=>Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
const rectanglesIntersect = (left, right)=>left.x < right.x + right.width && left.x + left.width > right.x && left.y < right.y + right.height && left.y + left.height > right.y;
const intersectionArea = (left, right)=>{
    const width = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x));
    const height = Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y));
    return width * height;
};
const resolveMaximumDimension = (configuredMaximum, availableMaximum, minimum)=>{
    let maximum = availableMaximum;
    if (configuredMaximum > 0) {
        maximum = Math.min(configuredMaximum, availableMaximum);
    }
    return Math.max(minimum, maximum);
};
const frame_state_utils_isFileNotFoundError = (error)=>error instanceof Error && 'code' in error && error.code === 'ENOENT';
const isQuickChatFrame = (value)=>{
    if (!value || typeof value !== 'object') {
        return false;
    }
    const frame = value;
    return Number.isSafeInteger(frame.x) && Number.isSafeInteger(frame.y) && Number.isSafeInteger(frame.width) && Number.isSafeInteger(frame.height) && Number(frame.width) > 0 && Number(frame.height) > 0;
};
const constrainQuickChatFrame = (frame, workAreas, fallbackWorkArea, constraints)=>{
    const matchingWorkArea = workAreas.filter((workArea)=>rectanglesIntersect(workArea, frame)).reduce((current, workArea)=>{
        if (!current || intersectionArea(frame, workArea) > intersectionArea(frame, current)) {
            return workArea;
        }
        return current;
    }, undefined);
    const workArea = matchingWorkArea ?? fallbackWorkArea;
    const insetWorkArea = {
        height: Math.max(0, workArea.height - (/* inlined export .QUICK_CHAT_FRAME_SCREEN_PADDING */12) * 2),
        width: Math.max(0, workArea.width - (/* inlined export .QUICK_CHAT_FRAME_SCREEN_PADDING */12) * 2),
        x: workArea.x + (/* inlined export .QUICK_CHAT_FRAME_SCREEN_PADDING */12),
        y: workArea.y + (/* inlined export .QUICK_CHAT_FRAME_SCREEN_PADDING */12)
    };
    const maximumWidth = resolveMaximumDimension(constraints.maximumWidth, insetWorkArea.width, constraints.minimumWidth);
    const maximumHeight = resolveMaximumDimension(constraints.maximumHeight, insetWorkArea.height, constraints.minimumHeight);
    const width = clamp(frame.width, constraints.minimumWidth, maximumWidth);
    const height = clamp(frame.height, constraints.minimumHeight, maximumHeight);
    return {
        height,
        width,
        x: clamp(frame.x, insetWorkArea.x, insetWorkArea.x + insetWorkArea.width - width),
        y: clamp(frame.y, insetWorkArea.y, insetWorkArea.y + insetWorkArea.height - height)
    };
};
