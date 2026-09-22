// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/configuration/utils.ts.
// The original TypeScript and import graph are not restored.





const normalizeHttpsUrl = (value, field, originOnly)=>{
    let url;
    try {
        url = new URL(value);
    } catch (error) {
        throw interface_error_InterfaceError(error, `${field} must be a valid URL.`);
    }
    const { hash, href, origin, password, pathname, protocol, search, username } = url;
    if (protocol !== 'https:' || username || password) {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, `${field} must be an HTTPS URL without credentials.`);
    }
    if (originOnly && (pathname !== '/' || search || hash)) {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, `${field} must be an origin.`);
    }
    if (originOnly) {
        return origin;
    }
    return href.replace(/\/+$/u, '');
};
const assertNonEmpty = (value, field)=>{
    const normalized = value.trim();
    if (lodash_es_isEmpty(normalized)) {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, `${field} must not be empty.`);
    }
    return normalized;
};
const normalizeLocalWebOrigin = (value)=>{
    if (value === undefined) {
        return undefined;
    }
    let url;
    try {
        url = new URL(value);
    } catch (error) {
        throw interface_error_InterfaceError(error, 'webSessionMirrorOrigin must be a valid URL.');
    }
    const { hash, hostname, origin, password, pathname, protocol, search, username } = url;
    const isLoopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname.endsWith('.localhost');
    if (protocol !== 'http:' || !isLoopback || username || password || pathname !== '/' || search || hash) {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'webSessionMirrorOrigin must be an HTTP loopback origin without credentials.');
    }
    return origin;
};
const normalizeCookieDomain = (value)=>{
    const normalized = value.trim().toLowerCase().replace(/^\./u, '');
    const valid = !lodash_es_isEmpty(normalized) && normalized.length <= 253 && !normalized.includes('..') && normalized.split('.').every((label)=>label.length > 0 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(label));
    if (!valid) {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'Account Cookie domains must be explicit valid domains.');
    }
    return normalized;
};
const isTrustedCookieDomain = (domain, authHost, webHost)=>{
    if (domain.split('.').length < 2) {
        return false;
    }
    return [
        authHost,
        webHost
    ].some((hostname)=>hostname === domain || hostname.endsWith(`.${domain}`));
};
const resolveAccountAuthenticatorProfile = (profile, environment, clientPlatform)=>{
    const { apiBaseUrl: configuredApiBaseUrl, audience: configuredAudience, authBaseUrl: configuredAuthBaseUrl, authCookieDomains: configuredAuthCookieDomains, oauthClientId: configuredOauthClientId, oauthRedirectUri, webOrigin: configuredWebOrigin, webSessionMirrorOrigin: configuredWebSessionMirrorOrigin } = profile;
    let callback;
    try {
        callback = new URL(oauthRedirectUri);
    } catch (error) {
        throw interface_error_InterfaceError(error, 'The OAuth redirect URI must be a registered application URL.');
    }
    const { hash, hostname, password, protocol, search, username } = callback;
    const localhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost');
    const allowedProtocol = protocol === 'https:' || NATIVE_REDIRECT_PROTOCOLS.has(protocol) || protocol === 'http:' && localhost;
    if (!allowedProtocol || username || password || !protocol || !hostname || search || hash) {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'The OAuth redirect URI must be a registered application URL.');
    }
    if (configuredAuthCookieDomains.length === 0) {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'At least one account Cookie domain is required.');
    }
    if (!CLIENT_PLATFORMS.has(clientPlatform)) {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'The desktop client platform is unsupported.');
    }
    const authBaseUrl = normalizeHttpsUrl(configuredAuthBaseUrl, 'authBaseUrl', true);
    const apiBaseUrl = normalizeHttpsUrl(configuredApiBaseUrl, 'apiBaseUrl', true);
    const webOrigin = normalizeHttpsUrl(configuredWebOrigin, 'webOrigin', true);
    const webSessionMirrorOrigin = normalizeLocalWebOrigin(configuredWebSessionMirrorOrigin);
    const authHost = new URL(authBaseUrl).hostname;
    const webHost = new URL(webOrigin).hostname;
    const authCookieDomains = [
        ...new Set(configuredAuthCookieDomains.map(normalizeCookieDomain))
    ];
    if (!authCookieDomains.includes(webHost)) {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'Account Cookie domains must include the Web origin.');
    }
    if (authCookieDomains.some((domain)=>!isTrustedCookieDomain(domain, authHost, webHost))) {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'Account Cookie domains must belong to the Auth or Web origin.');
    }
    return {
        environment,
        authBaseUrl,
        apiBaseUrl,
        webOrigin,
        ...webSessionMirrorOrigin ? {
            webSessionMirrorOrigin
        } : {},
        oauthClientId: assertNonEmpty(configuredOauthClientId, 'oauthClientId'),
        oauthRedirectUri,
        audience: normalizeHttpsUrl(configuredAudience, 'audience', true),
        clientPlatform,
        authCookieDomains
    };
};
