// Compiled fragment from ./src/consts/device.ts.
// The original TypeScript and import graph are not restored.

const resolveSupportedDesktopPlatform = (platform)=>{
    if (platform === 'darwin' || platform === 'linux' || platform === 'win32') {
        return platform;
    }
    throw new Error(`Unsupported desktop platform: ${platform}`);
};
