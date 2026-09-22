// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/runtime-diagnostics/modules/web-network/consts.ts.
// The original TypeScript and import graph are not restored.

const WEB_NETWORK_REQUEST_EVENT_ID = 'network_request';
const WEB_NETWORK_REQUEST_FILTER = Object.freeze({
    urls: [
        'http://*/*',
        'https://*/*'
    ]
});
const WEB_NETWORK_RESOURCE_TYPES = new Set([
    'mainFrame',
    'other',
    'subFrame',
    'xhr'
]);
