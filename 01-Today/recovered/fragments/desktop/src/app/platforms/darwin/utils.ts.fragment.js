// Compiled fragment from ./src/app/platforms/darwin/utils.ts.
// The original TypeScript and import graph are not restored.




const darwin_utils_assertNonEmpty = (value, name)=>{
    if (value.trim().length === 0) {
        throw new TypeError(`${name} must not be empty`);
    }
    return value;
};
const resolvePlatformHostPath = ({ appPath, environment = process.env, isPackaged, resourcesPath })=>{
    if (!isPackaged) {
        const configuredPath = environment['TODAY_MAC_PLATFORM_HOST_PATH']?.trim();
        if (configuredPath) {
            return configuredPath;
        }
    }
    let basePath = (0,external_node_path_namespaceObject.join)(appPath, 'dist', 'native', 'macos');
    if (isPackaged) {
        basePath = (0,external_node_path_namespaceObject.join)(resourcesPath, 'tools', 'macos');
    }
    return (0,external_node_path_namespaceObject.join)(basePath, PLATFORM_HOST_RESOURCE_NAME);
};
const assertPlatformHostExecutable = (binaryPath, { checkAccess = external_node_fs_namespaceObject.accessSync, readStats = external_node_fs_namespaceObject.statSync } = {})=>{
    const resolvedBinaryPath = darwin_utils_assertNonEmpty(binaryPath, 'binaryPath');
    try {
        const stats = readStats(resolvedBinaryPath);
        if (!stats.isFile()) {
            throw new Error('path is not a regular file');
        }
        checkAccess(resolvedBinaryPath, external_node_fs_namespaceObject.constants.X_OK);
    } catch (error) {
        throw new Error(`macOS platform host is unavailable or not executable: ${resolvedBinaryPath}`, {
            cause: error
        });
    }
};
