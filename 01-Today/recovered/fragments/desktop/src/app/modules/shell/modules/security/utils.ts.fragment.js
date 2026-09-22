// Compiled fragment from ./src/app/modules/shell/modules/security/utils.ts.
// The original TypeScript and import graph are not restored.



const isTodayHost = (host)=>{
    return TODAY_ROOT_HOSTS.some((rootHost)=>{
        return host === rootHost || host.endsWith(`.${rootHost}`);
    });
};
const isTrustedTodayUrl = (value)=>{
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && isTodayHost(url.hostname);
    } catch  {
        return false;
    }
};
const isAllowedNavigationUrl = (value, webOrigin)=>{
    return hasExactOrigin(value, webOrigin);
};
const isBriefNavigationAllowed = (value, webOrigin)=>{
    try {
        const url = new URL(value);
        const isBriefPath = url.pathname === '/feed' || url.pathname.startsWith('/feed/');
        const isBriefOrigin = url.origin === webOrigin || url.protocol === 'https:' && TODAY_ROOT_HOSTS.includes(url.hostname);
        return isBriefPath && isBriefOrigin;
    } catch  {
        return false;
    }
};
const isNavigationAllowed = (value, navigationPolicy, webOrigin)=>{
    if (navigationPolicy === 'popup') {
        return true;
    }
    if (navigationPolicy === 'brief') {
        return isBriefNavigationAllowed(value, webOrigin);
    }
    return isAllowedNavigationUrl(value, webOrigin);
};
const isWindowOpenAllowed = (value, navigationPolicy, webOrigin)=>{
    if (navigationPolicy === 'application' && value === 'about:blank') {
        return false;
    }
    return isNavigationAllowed(value, navigationPolicy, webOrigin);
};
const isBriefWindowOpenAllowed = (value, frameName, webOrigin)=>{
    return frameName?.startsWith(BRIEF_POPUP_WINDOW_NAME_PREFIX) === true && isBriefNavigationAllowed(value, webOrigin);
};
const isProductWindowOpenAllowed = (value, frameName, webOrigin)=>{
    if (false) {}
    if (frameName === 'today_billing_management' && value === 'about:blank') {
        return true;
    }
    let url;
    try {
        url = new URL(value);
    } catch  {
        return false;
    }
    if (PAYWALL_POPUP_WINDOW_NAMES.has(frameName)) {
        return url.protocol === 'https:';
    }
    if (!OAUTH_POPUP_WINDOW_NAMES.has(frameName)) {
        return false;
    }
    return url.origin === webOrigin && url.pathname === OAUTH_POPUP_PATH;
};
const isAllowedAudioPermission = (permission, sourceUrl, mediaTypes, isMainFrame, localWebOrigin)=>{
    if (permission !== 'media' || !isMainFrame || mediaTypes.length === 0) {
        return false;
    }
    const hasAllowedOrigin = isTrustedTodayUrl(sourceUrl) || localWebOrigin !== undefined && hasExactOrigin(sourceUrl, localWebOrigin);
    if (!hasAllowedOrigin) {
        return false;
    }
    return mediaTypes.every((mediaType)=>mediaType === 'audio');
};
const isAllowedClipboardWritePermission = (permission, sourceUrl, isMainFrame, navigationPolicy, localWebOrigin)=>{
    if (permission !== 'clipboard-sanitized-write' || !isMainFrame || navigationPolicy !== 'application') {
        return false;
    }
    return localWebOrigin !== undefined && hasExactOrigin(sourceUrl, localWebOrigin);
};
