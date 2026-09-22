// Compiled fragment from ./src/app/modules/shell/modules/external/utils.ts.
// The original TypeScript and import graph are not restored.

const utils_isAllowedExternalUrl = (value)=>{
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch  {
        return false;
    }
};
const resolveExternalBrowserUrl = (value, webOrigin, canonicalWebOrigin)=>{
    const url = new URL(value);
    const currentWebOrigin = new URL(webOrigin);
    if (url.origin !== currentWebOrigin.origin || currentWebOrigin.protocol !== 'http:' || !currentWebOrigin.hostname.endsWith('.localhost')) {
        return url.href;
    }
    const externalUrl = new URL(canonicalWebOrigin);
    externalUrl.pathname = url.pathname;
    externalUrl.search = url.search;
    externalUrl.hash = url.hash;
    return externalUrl.href;
};
