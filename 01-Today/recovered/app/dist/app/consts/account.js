import { RuntimeEnvironment } from '@todayai-labs/platform-interface';
import { DESKTOP_CLOUD_PUBLIC_CONFIG_DEFAULTS } from './cloud-public-config.mjs';
import { DESKTOP_WEB_RUNTIME_ORIGINS } from './web-runtime.js';
const OAUTH_REDIRECT_URI = 'today-connector://auth/callback';
const cloudConfig = typeof DESKTOP_CLOUD_PUBLIC_CONFIG === 'undefined'
    ? DESKTOP_CLOUD_PUBLIC_CONFIG_DEFAULTS
    : DESKTOP_CLOUD_PUBLIC_CONFIG;
const resolveAuthCookieDomains = (baseDomain, webOrigin) => {
    const hostname = new URL(webOrigin).hostname;
    return hostname === baseDomain ? [baseDomain] : [baseDomain, hostname];
};
export const ACCOUNT_CONFIG = {
    [RuntimeEnvironment.Development]: {
        apiBaseUrl: cloudConfig.dev.apiBaseUrl,
        audience: cloudConfig.dev.tokenAudience,
        authBaseUrl: cloudConfig.dev.betterAuthUrl,
        authCookieDomains: resolveAuthCookieDomains(cloudConfig.dev.baseDomain, cloudConfig.dev.appUrl),
        oauthClientId: cloudConfig.dev.oidcClientId,
        oauthRedirectUri: OAUTH_REDIRECT_URI,
        webOrigin: cloudConfig.dev.appUrl,
        webSessionMirrorOrigin: DESKTOP_WEB_RUNTIME_ORIGINS[RuntimeEnvironment.Development],
    },
    [RuntimeEnvironment.Staging]: {
        apiBaseUrl: cloudConfig.staging.apiBaseUrl,
        audience: cloudConfig.staging.tokenAudience,
        authBaseUrl: cloudConfig.staging.betterAuthUrl,
        authCookieDomains: resolveAuthCookieDomains(cloudConfig.staging.baseDomain, cloudConfig.staging.appUrl),
        oauthClientId: cloudConfig.staging.oidcClientId,
        oauthRedirectUri: OAUTH_REDIRECT_URI,
        webOrigin: cloudConfig.staging.appUrl,
        webSessionMirrorOrigin: DESKTOP_WEB_RUNTIME_ORIGINS[RuntimeEnvironment.Staging],
    },
    [RuntimeEnvironment.Production]: {
        apiBaseUrl: cloudConfig.prod.apiBaseUrl,
        audience: cloudConfig.prod.tokenAudience,
        authBaseUrl: cloudConfig.prod.betterAuthUrl,
        authCookieDomains: resolveAuthCookieDomains(cloudConfig.prod.baseDomain, cloudConfig.prod.appUrl),
        oauthClientId: cloudConfig.prod.oidcClientId,
        oauthRedirectUri: OAUTH_REDIRECT_URI,
        webOrigin: cloudConfig.prod.appUrl,
        webSessionMirrorOrigin: DESKTOP_WEB_RUNTIME_ORIGINS[RuntimeEnvironment.Production],
    },
};
