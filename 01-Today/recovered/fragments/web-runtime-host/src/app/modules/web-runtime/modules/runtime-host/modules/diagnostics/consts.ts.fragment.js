// Compiled fragment from ./src/app/modules/web-runtime/modules/runtime-host/modules/diagnostics/consts.ts.
// The original TypeScript and import graph are not restored.

const DESKTOP_WEB_RUNTIME_HOST_DIAGNOSTIC_CHANNELS = Object.freeze({
    httpError: 'http.client.request.error',
    httpFinish: 'http.client.response.finish',
    httpStart: 'http.client.request.start',
    undiciCreate: 'undici:request:create',
    undiciError: 'undici:request:error',
    undiciHeaders: 'undici:request:headers',
    undiciTrailers: 'undici:request:trailers'
});
const DESKTOP_WEB_RUNTIME_HOST_ERROR_CODE_PATTERN = /^(?:E[A-Z0-9_]{1,63}|ABORT_ERR|CERT_[A-Z0-9_]{1,58}|HPE_[A-Z0-9_]{1,59}|UND_ERR_[A-Z0-9_]{1,55}|net::ERR_[A-Z0-9_]{1,55})$/u;
const DESKTOP_WEB_RUNTIME_HOST_ERROR_NAMES = Object.freeze([
    'AbortError',
    'Error',
    'SystemError',
    'TimeoutError',
    'TypeError'
]);
const DESKTOP_WEB_RUNTIME_HOST_TELEMETRY_SUFFIXES = Object.freeze([
    'posthog.com',
    'sentry.io'
]);
