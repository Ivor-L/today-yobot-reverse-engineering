// Compiled fragment from ./src/app/platforms/_base/modules/platform-host-transport/utils.ts.
// The original TypeScript and import graph are not restored.

const asError = (error)=>{
    if (error instanceof Error) {
        return error;
    }
    return new Error(String(error));
};
const utils_assertNonEmpty = (value, name)=>{
    if (value.trim().length === 0) {
        throw new TypeError(`${name} must not be empty`);
    }
    return value;
};
