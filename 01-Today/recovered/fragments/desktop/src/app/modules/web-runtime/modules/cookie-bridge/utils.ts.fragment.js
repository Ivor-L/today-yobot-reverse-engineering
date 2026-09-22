// Compiled fragment from ./src/app/modules/web-runtime/modules/cookie-bridge/utils.ts.
// The original TypeScript and import graph are not restored.

const UNSAFE_COOKIE_PATH_PATTERN = /[\\?#;]/u;
const hasUnsafeCookiePathCharacter = (path)=>UNSAFE_COOKIE_PATH_PATTERN.test(path) || [
        ...path
    ].some((character)=>{
        const codePoint = character.codePointAt(0) ?? 0;
        return codePoint <= 0x1f || codePoint === 0x7f;
    });
const resolveCookiePath = (path, requestPath)=>{
    if (path !== undefined) {
        if (!path.startsWith('/') || path.startsWith('//') || hasUnsafeCookiePathCharacter(path)) {
            return undefined;
        }
        return path;
    }
    if (!requestPath.startsWith('/') || requestPath === '/') {
        return '/';
    }
    const lastSlash = requestPath.lastIndexOf('/');
    if (lastSlash <= 0) {
        return '/';
    }
    return requestPath.slice(0, lastSlash);
};
const isSafeRendererCookie = (cookie)=>Boolean(cookie.name && cookie.domain === undefined && cookie.httpOnly !== true && cookie.partitioned !== true && cookie.secure !== true && cookie.sameSite?.trim().toLowerCase() !== 'none');
const resolveCookieSameSite = (value)=>{
    const normalized = value?.trim().toLowerCase();
    if (normalized === 'lax' || normalized === 'strict') {
        return normalized;
    }
    if (normalized === 'none') {
        return 'no_restriction';
    }
    return undefined;
};
const resolveCookieExpirationDate = (cookie, nowSeconds)=>{
    if (cookie.maxAge !== undefined && Number.isFinite(cookie.maxAge)) {
        return nowSeconds + cookie.maxAge;
    }
    const expiresAt = cookie.expires?.getTime();
    if (expiresAt !== undefined && Number.isFinite(expiresAt)) {
        return expiresAt / 1000;
    }
    return undefined;
};
