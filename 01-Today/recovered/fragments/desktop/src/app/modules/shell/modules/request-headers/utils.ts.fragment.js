// Compiled fragment from ./src/app/modules/shell/modules/request-headers/utils.ts.
// The original TypeScript and import graph are not restored.


const utils_hasExactOrigin = (value, expectedOrigin)=>{
    try {
        return new URL(value).origin === new URL(expectedOrigin).origin;
    } catch  {
        return false;
    }
};
const hasExactHttpsOrigin = (value, expectedOrigin)=>{
    try {
        const url = new URL(value);
        const expected = new URL(expectedOrigin);
        return url.protocol === 'https:' && expected.protocol === 'https:' && url.origin === expected.origin;
    } catch  {
        return false;
    }
};
const applyAuthoritativeRequestHeaders = (requestHeaders, authoritativeHeaders)=>({
        ...Object.fromEntries(Object.entries(requestHeaders).filter(([name])=>!AUTHORITATIVE_HEADER_NAMES.has(name.toLowerCase()) && !Object.keys(authoritativeHeaders).some((authoritativeName)=>authoritativeName.toLowerCase() === name.toLowerCase()))),
        ...authoritativeHeaders
    });
