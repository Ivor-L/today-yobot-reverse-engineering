// Compiled fragment from ./src/consts/deep-link.ts.
// The original TypeScript and import graph are not restored.



const DEEP_LINK_BUILD_KEYS = {
    [base_RuntimeEnvironment.Development]: 'dev',
    [base_RuntimeEnvironment.Staging]: 'staging',
    [base_RuntimeEnvironment.Production]: 'prod'
};
/**
 * 地区缺省为国际版，非 macOS 平台（Linux/Windows）没有地区概念，直接用默认值。
 * macOS 调用方必须显式传入运行时解析出的地区，否则国区包会生成国际版 scheme
 * 的深链，点开后落到另一个安装上。
 */ const resolveDesktopDeepLinkScheme = (buildEnvironment, macosRegion = (/* inlined export .DEFAULT_MACOS_REGION */"global"))=>DESKTOP_DEEP_LINK_BUILD_SCHEMES[macosRegion][DEEP_LINK_BUILD_KEYS[buildEnvironment]];
const DESKTOP_OAUTH_CALLBACK_HOSTS = new Set([
    'connects',
    'macos_channel'
]);
const isDesktopOAuthCallbackUrl = (value, expectedScheme)=>{
    try {
        const url = new URL(value);
        return url.protocol === `${expectedScheme}:` && DESKTOP_OAUTH_CALLBACK_HOSTS.has(url.hostname) && url.pathname === '/callback';
    } catch  {
        return false;
    }
};
