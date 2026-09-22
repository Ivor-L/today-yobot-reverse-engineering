// Compiled fragment from ./src/app/modules/shell/modules/surfaces/modules/quick-chat/modules/window/utils.ts.
// The original TypeScript and import graph are not restored.

const quickChatFramesApproximatelyEqual = (left, right, tolerance)=>Math.abs(left.x - right.x) <= tolerance && Math.abs(left.y - right.y) <= tolerance && Math.abs(left.width - right.width) <= tolerance && Math.abs(left.height - right.height) <= tolerance;
