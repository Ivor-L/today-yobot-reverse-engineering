// Compiled fragment from ./src/app/modules/shell/modules/surfaces/modules/main-window/modules/navigation/utils.ts.
// The original TypeScript and import graph are not restored.

const describeStartupError = (error)=>{
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }
    if (typeof error === 'string' && error.trim()) {
        return error;
    }
    return 'Unknown startup error';
};
