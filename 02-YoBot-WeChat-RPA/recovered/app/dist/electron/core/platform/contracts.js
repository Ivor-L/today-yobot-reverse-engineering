export const SUPPORTED_DESKTOP_PLATFORMS = ['win32', 'darwin'];
export const SUPPORTED_DESKTOP_ARCHITECTURES = ['x64', 'arm64'];
export function resolvePlatformTarget(platform = process.platform, arch = process.arch) {
    if (!SUPPORTED_DESKTOP_PLATFORMS.includes(platform)) {
        throw new Error(`Unsupported desktop platform: ${platform}`);
    }
    if (!SUPPORTED_DESKTOP_ARCHITECTURES.includes(arch)) {
        throw new Error(`Unsupported desktop architecture: ${arch}`);
    }
    return {
        platform: platform,
        arch: arch,
    };
}
export function platformTargetKey(target) {
    return `${target.platform}-${target.arch}`;
}
