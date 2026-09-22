// Compiled fragment from ./src/app/modules/data-reset/modules/staged-update/utils.ts.
// The original TypeScript and import graph are not restored.

const resolveBundleIdentifier = (value)=>{
    const identifier = value.trim();
    if (!/^[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/.test(identifier)) {
        throw new Error('Invalid application bundle identifier.');
    }
    return identifier;
};
const isStagedUpdateLog = (name)=>{
    return /^ShipIt_(?:stdout|stderr)\.log(?:\.\d+)?$/.test(name);
};
