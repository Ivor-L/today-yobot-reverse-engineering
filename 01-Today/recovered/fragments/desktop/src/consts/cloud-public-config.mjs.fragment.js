// Compiled fragment from ./src/consts/cloud-public-config.mjs.
// The original TypeScript and import graph are not restored.


const DESKTOP_PUBLIC_ENVIRONMENT_KEYS = Object.freeze([
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_BASE_DOMAIN',
    'NEXT_PUBLIC_BETTER_AUTH_URL',
    'NEXT_PUBLIC_MOBILE_DOWNLOAD_LINK',
    'NEXT_PUBLIC_OIDC_AUTHORITY',
    'NEXT_PUBLIC_OIDC_CLIENT_ID',
    'NEXT_PUBLIC_TOKEN_AUDIENCE'
]);
const DESKTOP_CLOUD_PUBLIC_CONFIG_DEFAULTS = Object.freeze({
    dev: Object.freeze({
        apiBaseUrl: 'https://api.todayai.dev',
        appUrl: 'https://todayai.dev',
        baseDomain: 'todayai.dev',
        betterAuthUrl: 'https://auth.todayai.dev',
        oidcAuthority: 'https://auth.todayai.dev',
        oidcClientId: DESKTOP_OAUTH_CLIENT_IDS.dev,
        tokenAudience: 'https://api.today.ai'
    }),
    staging: Object.freeze({
        apiBaseUrl: 'https://api.today.ai',
        appUrl: 'https://staging.today.ai',
        baseDomain: 'today.ai',
        betterAuthUrl: 'https://auth.today.ai',
        oidcAuthority: 'https://auth.today.ai',
        oidcClientId: DESKTOP_OAUTH_CLIENT_IDS.staging,
        tokenAudience: 'https://api.today.ai'
    }),
    prod: Object.freeze({
        apiBaseUrl: 'https://api.today.ai',
        appUrl: 'https://today.ai',
        baseDomain: 'today.ai',
        betterAuthUrl: 'https://auth.today.ai',
        oidcAuthority: 'https://auth.today.ai',
        oidcClientId: DESKTOP_OAUTH_CLIENT_IDS.prod,
        tokenAudience: 'https://api.today.ai'
    })
});
