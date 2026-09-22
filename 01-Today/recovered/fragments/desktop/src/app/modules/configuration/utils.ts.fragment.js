// Compiled fragment from ./src/app/modules/configuration/utils.ts.
// The original TypeScript and import graph are not restored.








const configuration_utils_isRuntimeEnvironment = (value)=>{
    return value === base_RuntimeEnvironment.Development || value === base_RuntimeEnvironment.Staging || value === base_RuntimeEnvironment.Production;
};
const utils_readMetadataValue = (metadata, key)=>{
    if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
        return undefined;
    }
    return metadata[key];
};
const readArgument = (arguments_, name)=>{
    const prefix = `--${name}=`;
    return arguments_.find((argument)=>argument.startsWith(prefix))?.slice(prefix.length);
};
const resolveBackendLane = (value)=>{
    const lane = value?.trim();
    if (!lane) {
        return undefined;
    }
    if (!BACKEND_LANE_PATTERN.test(lane)) {
        throw new Error('BACKEND_LANE must be a lowercase DNS label of at most 30 characters containing only letters, numbers, and hyphens');
    }
    return lane;
};
const resolveHttpProxy = (value)=>{
    const proxy = value?.trim();
    if (!proxy) {
        return undefined;
    }
    try {
        const hasHttpProtocol = /^http:\/\//iu.test(proxy);
        const addressWithOptionalRootPath = hasHttpProtocol ? proxy.slice('http://'.length) : proxy;
        const address = hasHttpProtocol && addressWithOptionalRootPath.endsWith('/') ? addressWithOptionalRootPath.slice(0, -1) : addressWithOptionalRootPath;
        const match = /^(?:\[[^\]]+\]|[^:[\]/?#\s]+):(\d+)$/u.exec(address);
        const port = Number(match?.[1]);
        if (!match || !Number.isInteger(port) || port < 1 || port > 65535) {
            throw new Error();
        }
        const url = new URL(`http://${address}`);
        const { hash, hostname, password, pathname, search, username } = url;
        if (!hostname || username.length > 0 || password.length > 0 || pathname !== '/' || search.length > 0 || hash.length > 0) {
            throw new Error();
        }
        return address;
    } catch  {
        throw new Error('HTTP_PROXY must use host:port or http://host:port format without credentials or a path');
    }
};
const resolveEnvironmentHttpProxy = (value)=>{
    try {
        return resolveHttpProxy(value);
    } catch  {
        console.warn('[desktop] ignoring invalid HTTP_PROXY environment variable');
        return undefined;
    }
};
const resolveInspectPort = (value)=>{
    const configuredPort = value?.trim();
    if (!configuredPort) {
        return (/* inlined export .DEFAULT_INSPECT_PORT */9222);
    }
    const port = Number(configuredPort);
    if (!/^\d+$/u.test(configuredPort) || !Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('INSPECT_PORT must be an integer from 1 to 65535');
    }
    return port;
};
const resolveLocalProfileId = (value)=>{
    const profileId = value?.trim();
    if (!profileId) {
        return undefined;
    }
    if (!/^[a-f0-9]{12}$/u.test(profileId)) {
        throw new Error('local-profile-id must be a 12-character lowercase hexadecimal value');
    }
    return profileId;
};
const resolveLocalWebOrigin = (value)=>{
    const configuredOrigin = value?.trim();
    if (!configuredOrigin) {
        return undefined;
    }
    try {
        const url = new URL(configuredOrigin);
        const { hash, hostname, password, pathname, port, protocol, search, username } = url;
        if (protocol !== 'http:' || hostname !== 'localhost' || !port || username || password || pathname !== '/' || search || hash) {
            throw new Error();
        }
        return url.origin;
    } catch  {
        throw new Error('local-web-origin must be an http://localhost:<port> origin');
    }
};
const parseDesktopLaunchOptions = (arguments_, environment, isPackaged, lane)=>{
    const { BACKEND_LANE: environmentBackendLane, HTTP_PROXY: httpProxyValue, INSPECTABLE: inspectableValue, INSPECT_PORT: inspectPortValue, TODAY_DESKTOP_ENV: desktopEnvironment, TODAY_ENV: configuredEnvironment } = environment;
    const argumentEnvironment = readArgument(arguments_, 'environment');
    const argumentLocalProfileId = readArgument(arguments_, 'local-profile-id');
    const argumentLocalWebOrigin = readArgument(arguments_, 'local-web-origin');
    const environmentValue = argumentEnvironment ?? configuredEnvironment ?? desktopEnvironment;
    const isDevelopment = arguments_.includes('--development');
    const developmentSupervisorDirectory = readArgument(arguments_, node_inspection_DESKTOP_DEVELOPMENT_SUPERVISOR_ARGUMENT_NAME);
    const localProfileId = resolveLocalProfileId(argumentLocalProfileId);
    const usesLocalWebProxy = arguments_.includes('--local-web-proxy');
    const localWebOrigin = resolveLocalWebOrigin(argumentLocalWebOrigin ?? (usesLocalWebProxy ? LOCAL_WEB_ORIGIN : undefined));
    const configuredBackendLane = isPackaged ? lane : environmentBackendLane;
    const backendLane = resolveBackendLane(configuredBackendLane);
    const httpProxy = resolveEnvironmentHttpProxy(httpProxyValue);
    const inspectable = inspectableValue?.trim() === 'true';
    const inspectPort = inspectable ? resolveInspectPort(inspectPortValue) : undefined;
    if (localWebOrigin && !isDevelopment) {
        throw new Error('Local Web origin requires --development');
    }
    if (localProfileId && !isDevelopment) {
        throw new Error('local-profile-id requires --development');
    }
    if (developmentSupervisorDirectory !== undefined && !isDesktopDevelopmentSupervisorDirectory(developmentSupervisorDirectory)) {
        throw new Error('development-supervisor must be a private Desktop temporary directory');
    }
    if (developmentSupervisorDirectory && !isDevelopment) {
        throw new Error('development-supervisor requires --development');
    }
    let environmentOverride;
    if (backendLane) {
        environmentOverride = base_RuntimeEnvironment.Development;
    } else if (configuration_utils_isRuntimeEnvironment(environmentValue)) {
        environmentOverride = environmentValue;
    } else if (localWebOrigin) {
        environmentOverride = base_RuntimeEnvironment.Development;
    } else if (isDevelopment) {
        environmentOverride = base_RuntimeEnvironment.Development;
    }
    return {
        ...backendLane ? {
            backendLane
        } : {},
        ...developmentSupervisorDirectory ? {
            developmentSupervisorDirectory
        } : {},
        ...environmentOverride ? {
            environmentOverride
        } : {},
        ...httpProxy ? {
            httpProxy
        } : {},
        ...inspectable ? {
            inspectable: true,
            inspectPort
        } : {},
        isDevelopment,
        ...localProfileId ? {
            localProfileId
        } : {},
        ...localWebOrigin ? {
            localWebOrigin
        } : {}
    };
};
const resolveBuildEnvironment = (metadata)=>{
    const value = utils_readMetadataValue(metadata, DESKTOP_BUILD_ENVIRONMENT_METADATA_KEY);
    if (configuration_utils_isRuntimeEnvironment(value)) {
        return value;
    }
    return base_RuntimeEnvironment.Production;
};
/**
 * 地区由打包期写入的元数据决定。与构建期不同，这里对非法值回落而不是抛错：
 * 包已出厂，抛错会让应用完全无法启动，比目录归属错误更严重；
 * 该元数据由构建脚本写入，不属于用户可改的输入。
 */ const resolveMacosRegion = (metadata)=>{
    const value = utils_readMetadataValue(metadata, MACOS_REGION_METADATA_KEY);
    if (isMacosRegion(value)) {
        return value;
    }
    return (/* inlined export .DEFAULT_MACOS_REGION */"global");
};
const resolveApplicationBuild = (metadata, fallbackVersion)=>{
    const value = utils_readMetadataValue(metadata, consts_DESKTOP_APPLICATION_BUILD_METADATA_KEY);
    return typeof value === 'string' && value.trim() ? value.trim() : fallbackVersion;
};
const resolveApplicationName = (launchOptions, buildEnvironment, platform)=>{
    const productName = platform === 'darwin' || platform === 'win32' ? DESKTOP_CHANNEL_PRODUCT_NAMES[buildEnvironment] : PRODUCT_IDENTITIES[buildEnvironment].productName;
    if (launchOptions.isDevelopment) {
        return `${productName} Local`;
    }
    return productName;
};
const resolveUserDataDirectoryName = (launchOptions, buildEnvironment, platform, macosRegion = (/* inlined export .DEFAULT_MACOS_REGION */"global"))=>{
    const productName = platform === 'darwin' ? MACOS_REGION_USER_DATA_NAMES[macosRegion][buildEnvironment] : PRODUCT_IDENTITIES[buildEnvironment].productName;
    const applicationName = launchOptions.isDevelopment ? `${productName} Local` : productName;
    if (!launchOptions.localProfileId) {
        return applicationName;
    }
    return `${applicationName}-${launchOptions.localProfileId}`;
};
const resolveClientRuntimePlatform = (platform)=>{
    if (platform === 'darwin') {
        return base_ClientRuntimePlatform.MacOS;
    }
    if (platform === 'win32') {
        return base_ClientRuntimePlatform.Windows;
    }
    return base_ClientRuntimePlatform.Linux;
};
const resolveClientNodeLogsConfig = (options)=>{
    const { appVersion, buildEnvironment, environment, environmentOverride, logs, platform, userDataPath } = options;
    const postHogHost = logs?.postHogHost?.trim() || environment['NEXT_PUBLIC_POSTHOG_HOST']?.trim() || 'https://us.i.posthog.com';
    const postHogTokenDev = logs?.postHogTokenDev?.trim() || environment['NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN_DEV']?.trim();
    const postHogTokenProd = logs?.postHogTokenProd?.trim() || environment['NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN_PROD']?.trim();
    const sentryDsn = logs?.sentryDsn?.trim() || environment['NEXT_PUBLIC_SENTRY_DSN']?.trim();
    const postHog = {};
    const sentry = {};
    if (postHogTokenDev) {
        postHog[base_RuntimeEnvironment.Development] = {
            host: postHogHost,
            projectToken: postHogTokenDev
        };
    }
    if (postHogTokenProd) {
        const profile = {
            host: postHogHost,
            projectToken: postHogTokenProd
        };
        postHog[base_RuntimeEnvironment.Staging] = profile;
        postHog[base_RuntimeEnvironment.Production] = profile;
    }
    if (sentryDsn) {
        const profile = {
            dsn: sentryDsn
        };
        sentry[base_RuntimeEnvironment.Development] = profile;
        sentry[base_RuntimeEnvironment.Staging] = profile;
        sentry[base_RuntimeEnvironment.Production] = profile;
    }
    return {
        filePath: (0,external_node_path_namespaceObject.join)(userDataPath, 'logs', 'client.ndjson'),
        appVersion,
        platform: resolveClientRuntimePlatform(platform),
        defaultEnvironment: environmentOverride ?? buildEnvironment,
        ...lodash_es_isEmpty(postHog) ? {} : {
            postHog
        },
        ...lodash_es_isEmpty(sentry) ? {} : {
            sentry
        }
    };
};
