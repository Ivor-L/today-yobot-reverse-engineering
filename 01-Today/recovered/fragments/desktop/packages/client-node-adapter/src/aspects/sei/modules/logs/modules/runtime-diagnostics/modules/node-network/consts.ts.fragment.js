// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/runtime-diagnostics/modules/node-network/consts.ts.
// The original TypeScript and import graph are not restored.

const NODE_NETWORK_REQUEST_EVENT_ID = 'network_request';
const NODE_NETWORK_CHANNELS = Object.freeze({
    httpError: 'http.client.request.error',
    httpFinish: 'http.client.response.finish',
    httpStart: 'http.client.request.start',
    undiciCreate: 'undici:request:create',
    undiciError: 'undici:request:error',
    undiciHeaders: 'undici:request:headers',
    undiciTrailers: 'undici:request:trailers'
});
