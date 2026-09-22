// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/credential-store/consts.ts.
// The original TypeScript and import graph are not restored.

const CREDENTIAL_VERSION = 1;
const MAX_CREDENTIAL_BYTES = 1024 * 1024;
const MAX_SECRET_LENGTH = 128 * 1024;
const SAFE_LINUX_BACKENDS = new Set([
    'gnome_libsecret',
    'kwallet',
    'kwallet5',
    'kwallet6'
]);
const STORAGE_UNAVAILABLE_MESSAGE = 'Secure credential storage is unavailable on this device.';
