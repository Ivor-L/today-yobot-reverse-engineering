// Compiled fragment from ./src/app/modules/web-runtime/utils.ts.
// The original TypeScript and import graph are not restored.



const APP_ENVIRONMENTS = {
    dev: 'development',
    staging: 'staging',
    prod: 'production'
};
const REQUIRED_NO_PROXY_HOSTS = [
    '127.0.0.1',
    'localhost',
    '.localhost',
    '::1'
];
const WINDOWS_RUNTIME_ENVIRONMENT_KEYS = [
    'APPDATA',
    'LOCALAPPDATA',
    'SystemDrive',
    'SystemRoot',
    'TEMP',
    'TMP',
    'USERPROFILE',
    'windir'
];
const readEnvironmentValue = (environment, ...keys)=>{
    for (const key of keys){
        const value = environment[key]?.trim();
        if (value) {
            return value;
        }
    }
};
const buildNoProxyValue = (environment)=>{
    const configuredEntries = [
        environment.NO_PROXY,
        environment.no_proxy
    ].flatMap((value)=>value ? value.split(',').map((entry)=>entry.trim()).filter(Boolean) : []);
    return [
        ...new Set([
            ...configuredEntries,
            ...REQUIRED_NO_PROXY_HOSTS
        ])
    ].join(',');
};
const buildDesktopWebRuntimeProcessEnvironment = (httpProxy, environment)=>{
    const processEnvironment = {
        NEXT_TELEMETRY_DISABLED: '1',
        NODE_ENV: 'production'
    };
    for (const key of WINDOWS_RUNTIME_ENVIRONMENT_KEYS){
        const value = environment[key]?.trim();
        if (value) {
            processEnvironment[key] = value;
        }
    }
    const extraCaCertificates = readEnvironmentValue(environment, 'NODE_EXTRA_CA_CERTS');
    if (extraCaCertificates) {
        if (!(0,external_node_path_namespaceObject.isAbsolute)(extraCaCertificates)) {
            throw new Error('NODE_EXTRA_CA_CERTS must be an absolute file path');
        }
        processEnvironment.NODE_EXTRA_CA_CERTS = extraCaCertificates;
    }
    if (!httpProxy) {
        return processEnvironment;
    }
    const proxyUrl = `http://${httpProxy}`;
    return {
        ...processEnvironment,
        HTTP_PROXY: proxyUrl,
        HTTPS_PROXY: proxyUrl,
        NODE_USE_ENV_PROXY: '1',
        NO_PROXY: buildNoProxyValue(environment)
    };
};
const buildDesktopWebRuntimeEnvironment = (endpoint, profile)=>({
        APP_ENV: APP_ENVIRONMENTS[endpoint.environment],
        HOSTNAME: DESKTOP_WEB_RUNTIME_BIND_HOST,
        LOCALHOST_BFF: 'true',
        NEXT_PUBLIC_API_URL: profile.apiBaseUrl,
        NEXT_PUBLIC_APP_URL: profile.webOrigin,
        NEXT_PUBLIC_BASE_DOMAIN: profile.authCookieDomains[0] ?? new URL(profile.webOrigin).hostname,
        NEXT_PUBLIC_BETTER_AUTH_URL: profile.authBaseUrl,
        NEXT_PUBLIC_OIDC_AUTHORITY: profile.authBaseUrl,
        NEXT_PUBLIC_OIDC_CLIENT_ID: profile.oauthClientId,
        NEXT_PUBLIC_TOKEN_AUDIENCE: profile.audience,
        NEXT_TELEMETRY_DISABLED: '1',
        NODE_ENV: 'production',
        OIDC_INTERNAL_AUTHORITY: profile.authBaseUrl,
        PORT: '0',
        VERCEL_ENV: endpoint.environment === 'prod' ? 'production' : 'preview'
    });
const buildDesktopWebRuntimeBackendOrigin = (port)=>{
    return `http://${DESKTOP_WEB_RUNTIME_BIND_HOST}:${port}`;
};
const buildDesktopWebRuntimeHealthUrl = (backendOrigin)=>{
    return `${backendOrigin}${DESKTOP_WEB_RUNTIME_HEALTH_PATH}`;
};
const takeDesktopWebRuntimeTextPrefix = (value, maxBytes = (/* inlined export .DESKTOP_WEB_RUNTIME_DIAGNOSTIC_TEXT_MAX_BYTES */8192))=>{
    const bytes = Buffer.from(value);
    if (bytes.byteLength <= maxBytes) {
        return {
            message: value,
            truncated: false
        };
    }
    let end = maxBytes;
    while(end > 0 && (bytes[end] ?? 0) >= 0x80 && (bytes[end] ?? 0) < 0xc0){
        end -= 1;
    }
    return {
        message: bytes.subarray(0, end).toString('utf8'),
        truncated: true
    };
};
