// Compiled fragment from ./src/app/modules/configuration/profile.ts.
// The original TypeScript and import graph are not restored.







const PROFILE_SCHEMA_FILE_NAME = '.today-profile-schema.json';
const PROFILE_SCHEMA_VERSION = 1;
const profileHasDurableData = (profilePath)=>{
    try {
        return (0,external_node_fs_namespaceObject.readdirSync)(profilePath).length > 0;
    } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            return false;
        }
        // An unreadable existing profile must never be treated as a fresh installation.
        return true;
    }
};
/** Capture durable profile evidence before startup migrations create or move files. */ const desktopProfileExists = (options)=>{
    const { appDataPath, buildEnvironment, isDevelopment, isPackaged, localProfileId, macosRegion = (/* inlined export .DEFAULT_MACOS_REGION */"global"), platform, sharedProfileName } = options;
    const sharedProfilePath = (0,external_node_path_namespaceObject.join)(appDataPath, sharedProfileName);
    if (profileHasDurableData(sharedProfilePath)) {
        return true;
    }
    /**
   * 迁移源固定是国际版的 Electron staging 目录，因此只有国际版能据它
   * 判断"已有安装"。国区是独立主体的全新安装，若沿用该判断，首启会被
   * 误判成升级路径。
   */ const mayMigrateLegacyStagingProfile = platform === 'darwin' && isPackaged && !isDevelopment && !localProfileId && macosRegion === (/* inlined export .DEFAULT_MACOS_REGION */"global") && buildEnvironment !== base_RuntimeEnvironment.Development;
    if (!mayMigrateLegacyStagingProfile) {
        return false;
    }
    const legacyStagingProfilePath = (0,external_node_path_namespaceObject.join)(appDataPath, PRODUCT_IDENTITIES[base_RuntimeEnvironment.Staging].productName);
    if (legacyStagingProfilePath === sharedProfilePath) {
        return false;
    }
    return profileHasDurableData(legacyStagingProfilePath);
};
const readProfileSchemaVersion = (path)=>{
    let value;
    try {
        value = JSON.parse((0,external_node_fs_namespaceObject.readFileSync)(path, 'utf8'));
    } catch  {
        throw new Error(`The shared Today profile schema marker is unreadable: ${path}`);
    }
    const schemaVersion = value?.schemaVersion;
    if (!Number.isSafeInteger(schemaVersion) || Number(schemaVersion) < 1) {
        throw new Error(`The shared Today profile schema marker is invalid: ${path}`);
    }
    return Number(schemaVersion);
};
const writeProfileSchemaVersion = (profilePath, schemaVersion)=>{
    const markerPath = (0,external_node_path_namespaceObject.join)(profilePath, PROFILE_SCHEMA_FILE_NAME);
    const temporaryPath = `${markerPath}.${process.pid}.${(0,external_node_crypto_namespaceObject.randomUUID)()}.tmp`;
    try {
        (0,external_node_fs_namespaceObject.writeFileSync)(temporaryPath, `${JSON.stringify({
            schemaVersion
        })}\n`, {
            encoding: 'utf8',
            flag: 'wx',
            mode: 384
        });
        (0,external_node_fs_namespaceObject.renameSync)(temporaryPath, markerPath);
    } finally{
        (0,external_node_fs_namespaceObject.rmSync)(temporaryPath, {
            force: true
        });
    }
};
/**
 * Beta and release intentionally share the native-aligned macOS profile. Move
 * the old Electron staging profile only when no release profile exists, then
 * guard the shared directory against silent forward or backward schema use.
 */ const prepareMacOSSharedProfile = ({ appDataPath, buildEnvironment, isDevelopment, isPackaged, localProfileId, macosRegion = (/* inlined export .DEFAULT_MACOS_REGION */"global"), platform, sharedProfileName, supportedSchemaVersion = PROFILE_SCHEMA_VERSION })=>{
    if (platform !== 'darwin' || !isPackaged || isDevelopment || localProfileId || buildEnvironment === base_RuntimeEnvironment.Development) {
        return;
    }
    if (!sharedProfileName.trim()) {
        throw new Error('The shared Today profile name is missing');
    }
    if (!Number.isSafeInteger(supportedSchemaVersion) || supportedSchemaVersion < 1) {
        throw new Error(`Invalid supported Today profile schema: ${supportedSchemaVersion}`);
    }
    const sharedProfilePath = (0,external_node_path_namespaceObject.join)(appDataPath, sharedProfileName);
    const legacyStagingProfilePath = (0,external_node_path_namespaceObject.join)(appDataPath, PRODUCT_IDENTITIES[base_RuntimeEnvironment.Staging].productName);
    /**
   * 迁移只在国际版内部发生。跨地区搬运会把国际版的登录态整体交给国区包，
   * 且 renameSync 会让国际版目录直接消失——这是数据劫持，不是共享。
   * 国区仍需走下面的 schema 初始化，因此这里只跳过迁移本身。
   */ if (macosRegion === (/* inlined export .DEFAULT_MACOS_REGION */"global") && !(0,external_node_fs_namespaceObject.existsSync)(sharedProfilePath) && (0,external_node_fs_namespaceObject.existsSync)(legacyStagingProfilePath)) {
        (0,external_node_fs_namespaceObject.renameSync)(legacyStagingProfilePath, sharedProfilePath);
    }
    (0,external_node_fs_namespaceObject.mkdirSync)(sharedProfilePath, {
        recursive: true
    });
    const markerPath = (0,external_node_path_namespaceObject.join)(sharedProfilePath, PROFILE_SCHEMA_FILE_NAME);
    if (!(0,external_node_fs_namespaceObject.existsSync)(markerPath)) {
        writeProfileSchemaVersion(sharedProfilePath, supportedSchemaVersion);
        return;
    }
    const existingSchemaVersion = readProfileSchemaVersion(markerPath);
    if (existingSchemaVersion > supportedSchemaVersion) {
        throw new Error(`Today profile schema ${existingSchemaVersion} is incompatible with this application (schema ${supportedSchemaVersion})`);
    }
    if (existingSchemaVersion < supportedSchemaVersion) {
        writeProfileSchemaVersion(sharedProfilePath, supportedSchemaVersion);
    }
};
