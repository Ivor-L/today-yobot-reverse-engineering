// Compiled fragment from ../../packages/client-node-adapter/src/aspects/wei/modules/shell/modules/web-authentication/consts.ts.
// The original TypeScript and import graph are not restored.

const WEB_AUTHENTICATION_CALLBACK_SCHEME = 'today-connector';
const WEB_AUTHENTICATION_TIMEOUT_MS = 10 * 60 * 1000;
const WEB_AUTHENTICATION_CALLBACK_FLOW = 'auth_session';
const WEB_AUTHENTICATION_CALLBACK_ROUTES = {
    'connects/callback': {
        host: 'connects',
        pathname: '/callback'
    },
    'macos_channel/callback': {
        host: 'macos_channel',
        pathname: '/callback'
    }
};
