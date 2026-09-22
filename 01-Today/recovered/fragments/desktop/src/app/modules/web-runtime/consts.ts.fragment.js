// Compiled fragment from ./src/app/modules/web-runtime/consts.ts.
// The original TypeScript and import graph are not restored.



const DESKTOP_WEB_RUNTIME_BIND_HOST = '127.0.0.1';
const DESKTOP_WEB_RUNTIME_AUTH_HEADER = 'x-today-desktop-runtime-token';
const DESKTOP_WEB_RUNTIME_HEALTH_PATH = '/build-info.json';
const DESKTOP_WEB_RUNTIME_LOGICAL_ORIGIN_HEADER = 'x-today-desktop-logical-origin';
const DESKTOP_WEB_RUNTIME_PROBE_HEADER = 'x-today-desktop-runtime-probe';
const DESKTOP_WEB_RUNTIME_PROBE_RESPONSE_HEADER = 'x-today-desktop-runtime-proof';
const DESKTOP_WEB_RUNTIME_START_TIMEOUT_MS = 15000;
const DESKTOP_WEB_RUNTIME_DIAGNOSTIC_MESSAGE_TYPE = 'diagnostic';
const DESKTOP_WEB_RUNTIME_DIAGNOSTIC_CONTENT_TYPE_MAX_BYTES = 512;
const DESKTOP_WEB_RUNTIME_DIAGNOSTIC_ERROR_CODE_MAX_BYTES = 128;
const DESKTOP_WEB_RUNTIME_DIAGNOSTIC_EVENT_LIMIT = 240;
const DESKTOP_WEB_RUNTIME_DIAGNOSTIC_EVENT_WINDOW_MS = 60000;
const DESKTOP_WEB_RUNTIME_DIAGNOSTIC_METHOD_MAX_BYTES = 64;
const DESKTOP_WEB_RUNTIME_DIAGNOSTIC_TEXT_MAX_BYTES = 8 * 1024;
const DESKTOP_WEB_RUNTIME_DIAGNOSTIC_URL_MAX_BYTES = 4 * 1024;
const DESKTOP_WEB_RUNTIME_ENDPOINTS = {
    [base_RuntimeEnvironment.Development]: {
        environment: base_RuntimeEnvironment.Development,
        origin: DESKTOP_WEB_RUNTIME_ORIGINS[base_RuntimeEnvironment.Development]
    },
    [base_RuntimeEnvironment.Staging]: {
        environment: base_RuntimeEnvironment.Staging,
        origin: DESKTOP_WEB_RUNTIME_ORIGINS[base_RuntimeEnvironment.Staging]
    },
    [base_RuntimeEnvironment.Production]: {
        environment: base_RuntimeEnvironment.Production,
        origin: DESKTOP_WEB_RUNTIME_ORIGINS[base_RuntimeEnvironment.Production]
    }
};
