import path from 'node:path';
import { MACOS_AGENT_BUNDLE_ID, MACOS_AGENT_CHANNEL_ID, } from './macos_app_update_driver.js';
import { MacOSZipUpdateDriver } from './macos_zip_update_driver.js';
import { WindowsNsisUpdateDriver } from './windows_app_update_driver.js';
/**
 * Compose only the platform execution driver. Policy, Manifest verification,
 * download state and install retry semantics remain owned by the shared
 * DesktopUpdateManager.
 */
export function composeAppUpdateInstallDriver(options) {
    const target = options.target;
    if (!target)
        return null;
    if (target.platform === 'win32'
        && target.architecture === 'x64'
        && target.artifactType === 'nsis') {
        return new WindowsNsisUpdateDriver();
    }
    if (target.platform !== 'darwin'
        || target.architecture !== 'arm64'
        || target.artifactType !== 'zip'
        || options.appId !== MACOS_AGENT_BUNDLE_ID
        || options.channelId !== MACOS_AGENT_CHANNEL_ID
        || typeof options.macOSInstallWithSquirrel !== 'function'
        || typeof options.macOSStagingRoot !== 'string'
        || options.macOSStagingRoot.includes('\0')
        || !path.posix.isAbsolute(options.macOSStagingRoot)) {
        return null;
    }
    return new MacOSZipUpdateDriver({
        platform: 'darwin',
        architecture: 'arm64',
        stagingRoot: path.posix.normalize(options.macOSStagingRoot),
        installWithSquirrel: options.macOSInstallWithSquirrel,
    });
}
