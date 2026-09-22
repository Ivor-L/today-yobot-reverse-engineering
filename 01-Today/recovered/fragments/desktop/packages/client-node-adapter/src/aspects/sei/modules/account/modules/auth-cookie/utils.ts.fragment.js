// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/auth-cookie/utils.ts.
// The original TypeScript and import graph are not restored.



const normalizeDomain = (value)=>value.trim().toLowerCase().replace(/^\./u, '');
const isValidDomain = (value)=>{
    if (lodash_es_isEmpty(value) || value.length > 253 || value.includes('..')) {
        return false;
    }
    return value.split('.').every((label)=>label.length > 0 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(label));
};
const isAccountCookieName = (name)=>{
    if (PRIMARY_COOKIE_NAMES.has(name)) {
        return true;
    }
    return MULTI_COOKIE_PATTERN.test(name);
};
const getCookieRemovalUrl = (cookie)=>{
    if (!cookie.domain) {
        return null;
    }
    const hostname = normalizeDomain(cookie.domain);
    if (!isValidDomain(hostname)) {
        return null;
    }
    let protocol = 'https:';
    if (cookie.secure === false) {
        protocol = 'http:';
    }
    return `${protocol}//${hostname}${cookie.path ?? '/'}`;
};
