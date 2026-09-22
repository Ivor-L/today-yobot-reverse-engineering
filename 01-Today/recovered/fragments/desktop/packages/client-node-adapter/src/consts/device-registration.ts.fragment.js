// Compiled fragment from ../../packages/client-node-adapter/src/consts/device-registration.ts.
// The original TypeScript and import graph are not restored.


const DEVICE_REGISTRATION_PLATFORM_METADATA = {
    [cpi_SystemPlatform.MacOS]: {
        clientPlatform: 'macos',
        nodePlatform: 'darwin'
    },
    [cpi_SystemPlatform.Windows]: {
        clientPlatform: 'windows',
        nodePlatform: 'win32'
    },
    [cpi_SystemPlatform.Linux]: {
        clientPlatform: 'linux',
        nodePlatform: 'linux'
    }
};
/** Server-owned client types used by the unified Desktop Socket registration. */ const DEVICE_CONNECTOR_CLIENT_TYPE_BY_PLATFORM = {
    [cpi_SystemPlatform.MacOS]: 'macos-connector',
    [cpi_SystemPlatform.Windows]: 'windows-connector',
    [cpi_SystemPlatform.Linux]: 'linux-connector'
};
