// Compiled fragment from ./src/app/modules/web-access/consts.ts.
// The original TypeScript and import graph are not restored.

const WEB_ACCESS_STATE_FILE_NAMES = {
    dev: 'web-access-dev.bin',
    staging: 'web-access-staging.bin',
    prod: 'web-access-prod.bin'
};
const WEB_ACCESS_STATE_SCHEMA_VERSION = 1;
const MAX_WEB_ACCESS_STATE_BYTES = 64 * 1024;
const VERCEL_BYPASS_HEADER_NAME = 'x-vercel-protection-bypass';
const VERCEL_SET_BYPASS_COOKIE_HEADER_NAME = 'x-vercel-set-bypass-cookie';
