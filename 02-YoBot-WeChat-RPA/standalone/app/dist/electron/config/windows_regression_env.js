export const WINDOWS_REGRESSION_MODE_ENV = "YOKO_WINDOWS_REGRESSION_MODE";
export const WINDOWS_REGRESSION_REMOTE_ENV = "YOKO_REGRESSION_REMOTE_SERVER_URL";
export const WINDOWS_REGRESSION_ACTIVE_ENV = "YOKO_WINDOWS_REGRESSION_ACTIVE";
function isPrivateOrLoopbackIpv4(hostname) {
    const octets = hostname.split(".");
    if (octets.length !== 4 || octets.some((part) => !/^\d{1,3}$/.test(part)))
        return false;
    const values = octets.map(Number);
    if (values.some((value) => value < 0 || value > 255))
        return false;
    return values[0] === 127
        || values[0] === 10
        || (values[0] === 172 && values[1] >= 16 && values[1] <= 31)
        || (values[0] === 192 && values[1] === 168);
}
function isAllowedLocalHostname(hostname) {
    const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
    return normalized === "localhost"
        || normalized === "::1"
        || isPrivateOrLoopbackIpv4(normalized);
}
/**
 * Applies the Windows-only local regression Server override after channel env loading.
 * The explicit two-variable gate and private-address restriction prevent a packaged build
 * or an accidentally leaked environment value from redirecting production credentials.
 */
export function applyWindowsRegressionRemoteServer(environment = process.env, options = {}) {
    const enabled = environment[WINDOWS_REGRESSION_MODE_ENV]?.trim().toLowerCase() === "true";
    const rawRemote = environment[WINDOWS_REGRESSION_REMOTE_ENV]?.trim() ?? "";
    delete environment[WINDOWS_REGRESSION_ACTIVE_ENV];
    if (!enabled) {
        if (rawRemote) {
            throw new Error(`${WINDOWS_REGRESSION_REMOTE_ENV} requires ${WINDOWS_REGRESSION_MODE_ENV}=true`);
        }
        return null;
    }
    const platform = options.platform ?? process.platform;
    if (platform !== "win32") {
        throw new Error("Windows regression Server override is only available on win32");
    }
    if (environment.NODE_ENV !== "development" || options.isPackaged === true) {
        throw new Error("Windows regression Server override is restricted to an unpackaged development process");
    }
    if (!rawRemote) {
        throw new Error(`${WINDOWS_REGRESSION_REMOTE_ENV} is required when regression mode is enabled`);
    }
    let target;
    try {
        target = new URL(rawRemote);
    }
    catch {
        throw new Error(`${WINDOWS_REGRESSION_REMOTE_ENV} must be a valid HTTP(S) origin`);
    }
    if (target.protocol !== "http:" && target.protocol !== "https:") {
        throw new Error("Windows regression Server must use HTTP or HTTPS");
    }
    if (target.username || target.password || target.pathname !== "/" || target.search || target.hash) {
        throw new Error("Windows regression Server must be an origin without credentials, path, query, or fragment");
    }
    if (!target.port) {
        throw new Error("Windows regression Server must declare an explicit non-default port");
    }
    if (!isAllowedLocalHostname(target.hostname)) {
        throw new Error("Windows regression Server host must be localhost, loopback, or a private IPv4 address");
    }
    environment.REMOTE_SERVER_URL = target.origin;
    environment[WINDOWS_REGRESSION_ACTIVE_ENV] = "true";
    return { origin: target.origin, source: "windows-regression" };
}
