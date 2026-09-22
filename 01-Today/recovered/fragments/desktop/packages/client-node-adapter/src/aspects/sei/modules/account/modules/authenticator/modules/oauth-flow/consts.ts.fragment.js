// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/authenticator/modules/oauth-flow/consts.ts.
// The original TypeScript and import graph are not restored.

const ACCOUNT_OAUTH_LOG_CATEGORY = 'account.oauth';
const OAUTH_SCOPE = 'openid profile email offline_access';
const OAUTH_CALLBACK_LIMIT = 32 * 1024;
const OAUTH_CODE_LIMIT = 4096;
const OAUTH_CALLBACK_PARAMETERS = [
    'state',
    'code',
    'error',
    'error_description'
];
const OAUTH_PROVIDER_NAVIGATION_HOSTS = {
    google: [
        'accounts.google.*',
        'accounts.youtube.com'
    ],
    apple: [
        'appleid.apple.com'
    ],
    github: [
        'github.com'
    ],
    microsoft: [
        'login.microsoftonline.com',
        'login.live.com'
    ]
};
