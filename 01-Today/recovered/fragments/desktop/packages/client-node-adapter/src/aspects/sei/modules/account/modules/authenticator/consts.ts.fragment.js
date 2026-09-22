// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/authenticator/consts.ts.
// The original TypeScript and import graph are not restored.

const OAUTH_PROVIDER_IDS = [
    'google',
    'apple',
    'github',
    'microsoft'
];
const CLIENT_PLATFORMS = new Set([
    'linux-client',
    'macos-client',
    'windows-client'
]);
const NATIVE_REDIRECT_PROTOCOLS = new Set([
    'today:',
    'today-canary:',
    'today-connector:'
]);
const DEFAULT_OAUTH_TIMEOUT_MS = 5 * 60 * 1000;
const ACCESS_TOKEN_LIMIT = 16384;
const EMAIL_LIMIT = 254;
