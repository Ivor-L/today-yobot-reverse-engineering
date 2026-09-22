import { RuntimeEnvironment } from '@todayai-labs/platform-interface';
import { DEFAULT_MACOS_REGION, DESKTOP_DEEP_LINK_BUILD_SCHEMES, } from '@todayai-labs/vars/desktop-identity';
const DEEP_LINK_BUILD_KEYS = {
    [RuntimeEnvironment.Development]: 'dev',
    [RuntimeEnvironment.Staging]: 'staging',
    [RuntimeEnvironment.Production]: 'prod',
};
/**
 * 地区缺省为国际版，非 macOS 平台（Linux/Windows）没有地区概念，直接用默认值。
 * macOS 调用方必须显式传入运行时解析出的地区，否则国区包会生成国际版 scheme
 * 的深链，点开后落到另一个安装上。
 */
export const resolveDesktopDeepLinkScheme = (buildEnvironment, macosRegion = DEFAULT_MACOS_REGION) => DESKTOP_DEEP_LINK_BUILD_SCHEMES[macosRegion][DEEP_LINK_BUILD_KEYS[buildEnvironment]];
const DESKTOP_OAUTH_CALLBACK_HOSTS = new Set(['connects', 'macos_channel']);
export const isDesktopOAuthCallbackUrl = (value, expectedScheme) => {
    try {
        const url = new URL(value);
        return (url.protocol === `${expectedScheme}:` &&
            DESKTOP_OAUTH_CALLBACK_HOSTS.has(url.hostname) &&
            url.pathname === '/callback');
    }
    catch {
        return false;
    }
};
