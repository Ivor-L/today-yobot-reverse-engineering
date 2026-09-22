// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/auth-cookie/consts.ts.
// The original TypeScript and import graph are not restored.

const PRIMARY_COOKIE_NAMES = new Set([
    'better-auth.session_token',
    '__Secure-better-auth.session_token'
]);
const MULTI_COOKIE_PATTERN = /^(?:__Secure-)?better-auth\.session_token_multi-[a-z0-9_-]{1,256}$/u;
