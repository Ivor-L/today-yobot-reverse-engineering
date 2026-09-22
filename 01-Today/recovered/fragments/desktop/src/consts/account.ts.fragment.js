// Compiled fragment from ./src/consts/account.ts.
// The original TypeScript and import graph are not restored.




const OAUTH_REDIRECT_URI = 'today-connector://auth/callback';
const cloudConfig = typeof {"dev":{"apiBaseUrl":"https://api.todayai.dev","appUrl":"https://todayai.dev","baseDomain":"todayai.dev","betterAuthUrl":"https://auth.todayai.dev","oidcAuthority":"https://auth.todayai.dev","oidcClientId":"vfKNEjlofHTRUVvgfPYUPtYdMeakEvbI","tokenAudience":"https://api.today.ai"},"staging":{"apiBaseUrl":"https://api.today.ai","appUrl":"https://staging.today.ai","baseDomain":"today.ai","betterAuthUrl":"https://auth.today.ai","oidcAuthority":"https://auth.today.ai","oidcClientId":"Bh2VwEojzfuJw4kBGuLQf3wxGEoupUnx","tokenAudience":"https://api.today.ai"},"prod":{"apiBaseUrl":"https://api.today.ai","appUrl":"https://today.ai","baseDomain":"today.ai","betterAuthUrl":"https://auth.today.ai","oidcAuthority":"https://auth.today.ai","oidcClientId":"Bh2VwEojzfuJw4kBGuLQf3wxGEoupUnx","tokenAudience":"https://api.today.ai"}} === 'undefined' ? DESKTOP_CLOUD_PUBLIC_CONFIG_DEFAULTS : {"dev":{"apiBaseUrl":"https://api.todayai.dev","appUrl":"https://todayai.dev","baseDomain":"todayai.dev","betterAuthUrl":"https://auth.todayai.dev","oidcAuthority":"https://auth.todayai.dev","oidcClientId":"vfKNEjlofHTRUVvgfPYUPtYdMeakEvbI","tokenAudience":"https://api.today.ai"},"staging":{"apiBaseUrl":"https://api.today.ai","appUrl":"https://staging.today.ai","baseDomain":"today.ai","betterAuthUrl":"https://auth.today.ai","oidcAuthority":"https://auth.today.ai","oidcClientId":"Bh2VwEojzfuJw4kBGuLQf3wxGEoupUnx","tokenAudience":"https://api.today.ai"},"prod":{"apiBaseUrl":"https://api.today.ai","appUrl":"https://today.ai","baseDomain":"today.ai","betterAuthUrl":"https://auth.today.ai","oidcAuthority":"https://auth.today.ai","oidcClientId":"Bh2VwEojzfuJw4kBGuLQf3wxGEoupUnx","tokenAudience":"https://api.today.ai"}};
const resolveAuthCookieDomains = (baseDomain, webOrigin)=>{
    const hostname = new URL(webOrigin).hostname;
    return hostname === baseDomain ? [
        baseDomain
    ] : [
        baseDomain,
        hostname
    ];
};
const account_ACCOUNT_CONFIG = {
    [base_RuntimeEnvironment.Development]: {
        apiBaseUrl: cloudConfig.dev.apiBaseUrl,
        audience: cloudConfig.dev.tokenAudience,
        authBaseUrl: cloudConfig.dev.betterAuthUrl,
        authCookieDomains: resolveAuthCookieDomains(cloudConfig.dev.baseDomain, cloudConfig.dev.appUrl),
        oauthClientId: cloudConfig.dev.oidcClientId,
        oauthRedirectUri: OAUTH_REDIRECT_URI,
        webOrigin: cloudConfig.dev.appUrl,
        webSessionMirrorOrigin: DESKTOP_WEB_RUNTIME_ORIGINS[base_RuntimeEnvironment.Development]
    },
    [base_RuntimeEnvironment.Staging]: {
        apiBaseUrl: cloudConfig.staging.apiBaseUrl,
        audience: cloudConfig.staging.tokenAudience,
        authBaseUrl: cloudConfig.staging.betterAuthUrl,
        authCookieDomains: resolveAuthCookieDomains(cloudConfig.staging.baseDomain, cloudConfig.staging.appUrl),
        oauthClientId: cloudConfig.staging.oidcClientId,
        oauthRedirectUri: OAUTH_REDIRECT_URI,
        webOrigin: cloudConfig.staging.appUrl,
        webSessionMirrorOrigin: DESKTOP_WEB_RUNTIME_ORIGINS[base_RuntimeEnvironment.Staging]
    },
    [base_RuntimeEnvironment.Production]: {
        apiBaseUrl: cloudConfig.prod.apiBaseUrl,
        audience: cloudConfig.prod.tokenAudience,
        authBaseUrl: cloudConfig.prod.betterAuthUrl,
        authCookieDomains: resolveAuthCookieDomains(cloudConfig.prod.baseDomain, cloudConfig.prod.appUrl),
        oauthClientId: cloudConfig.prod.oidcClientId,
        oauthRedirectUri: OAUTH_REDIRECT_URI,
        webOrigin: cloudConfig.prod.appUrl,
        webSessionMirrorOrigin: DESKTOP_WEB_RUNTIME_ORIGINS[base_RuntimeEnvironment.Production]
    }
};
