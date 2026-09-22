// Compiled fragment from ./src/app/modules/shell/modules/web-context/utils.ts.
// The original TypeScript and import graph are not restored.

const normalizeOrigin = (value)=>{
    const url = new URL(value);
    if (url.origin === 'null') {
        throw new Error('The shell Web origin is invalid.');
    }
    return url.origin;
};
const isLocalWebOrigin = (value)=>{
    try {
        const url = new URL(value);
        return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname.endsWith('.localhost') || url.hostname === '127.0.0.1' || url.hostname === '[::1]');
    } catch  {
        return false;
    }
};
