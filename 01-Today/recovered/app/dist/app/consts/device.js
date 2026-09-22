export const resolveSupportedDesktopPlatform = (platform) => {
    if (platform === 'darwin' || platform === 'linux' || platform === 'win32') {
        return platform;
    }
    throw new Error(`Unsupported desktop platform: ${platform}`);
};
