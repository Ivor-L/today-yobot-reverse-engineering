// Compiled fragment from ../../packages/vars/src/desktop-identity.ts.
// The original TypeScript and import graph are not restored.

/**
 * Desktop 发布身份中需要跨 app / package 共享的公共常量：macOS 发布地区与产品 URL scheme。
 *
 * 本文件不得引入任何 node 依赖，也不得经 index.ts 转出：它会进入 apps/web 的客户端 bundle，
 * 并被 apps/desktop-client 的 .mjs 构建脚本在纯 Node 下直接 import（依赖 Node 24 type stripping），
 * 因此只能使用可擦除的 TypeScript 语法——禁止 enum / namespace / 参数属性。
 */ /** 只有 macOS 存在第二个 Apple 发布主体（国区）；Windows/Linux 始终视为 global。 */ const MACOS_REGIONS = [
    'global',
    'cn'
];
const DEFAULT_MACOS_REGION = 'global';
const isMacosRegion = (value)=>MACOS_REGIONS.includes(value);
/** 打包时写入 package.json 元数据，运行时据此判定自身地区。 */ const MACOS_REGION_METADATA_KEY = 'todayDesktopMacRegion';
const DESKTOP_BUILD_ENVIRONMENTS = [
    'dev',
    'staging',
    'prod'
];
/**
 * 产品 URL scheme 的唯一真相源：Info.plist 注册、运行时协议注册、内嵌 Web runtime
 * 生成深链、Web 侧回调与链接白名单全部由此派生。两地不得共用任何一个 scheme，
 * 否则并存安装时深链会被系统随机派发给另一个包。
 */ const DESKTOP_DEEP_LINK_BUILD_SCHEMES = {
    global: {
        dev: 'today-canary',
        staging: 'today',
        prod: 'today'
    },
    cn: {
        dev: 'today-cn-canary',
        staging: 'today-cn',
        prod: 'today-cn'
    }
};
const DESKTOP_DEEP_LINK_SCHEMES = [
    ...new Set(MACOS_REGIONS.flatMap((region)=>DESKTOP_BUILD_ENVIRONMENTS.map((environment)=>DESKTOP_DEEP_LINK_BUILD_SCHEMES[region][environment])))
];
const isDesktopDeepLinkScheme = (value)=>DESKTOP_DEEP_LINK_SCHEMES.includes(value);
/** `URL.protocol` 形式（带冒号），供 Web 侧直接比对。 */ const DESKTOP_DEEP_LINK_PROTOCOLS = new Set(DESKTOP_DEEP_LINK_SCHEMES.map((scheme)=>`${scheme}:`));
