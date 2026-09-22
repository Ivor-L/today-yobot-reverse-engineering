// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/deep-link-debug/modules/ipc/utils.ts.
// The original TypeScript and import graph are not restored.

const resolveDeepLinkDebugUrl = (value, scheme)=>{
    if (typeof value !== 'string') {
        throw new TypeError('The deep link must be a string');
    }
    const normalizedValue = value.trim();
    if (!normalizedValue) {
        throw new TypeError('The deep link must be a valid URL');
    }
    let url;
    try {
        url = new URL(normalizedValue);
    } catch  {
        throw new TypeError('The deep link must be a valid URL');
    }
    if (url.protocol !== `${scheme}:`) {
        throw new TypeError('The deep link must use the current application scheme');
    }
    return normalizedValue;
};
