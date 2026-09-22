// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/update/modules/electron-updater/utils.ts.
// The original TypeScript and import graph are not restored.


const readMetadataValue = (metadata, key)=>{
    if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
        return undefined;
    }
    return metadata[key];
};
const resolveElectronUpdatePackageMetadata = (metadata)=>{
    const buildValue = readMetadataValue(metadata, DESKTOP_APPLICATION_BUILD_METADATA_KEY);
    const build = typeof buildValue === 'string' ? buildValue.trim() : '';
    const updateEnabled = readMetadataValue(metadata, DESKTOP_UPDATE_ENABLED_METADATA_KEY) === true;
    return {
        ...build ? {
            build
        } : {},
        updateEnabled
    };
};
const resolveAvailableVersion = (info)=>{
    const buildValue = info.build;
    const build = typeof buildValue === 'string' ? buildValue.trim() : '';
    return {
        build: build || info.version,
        version: info.version
    };
};
const resolveTargetPackageBytes = (info, platform = process.platform)=>{
    const targetExtension = platform === 'darwin' ? '.zip' : platform === 'win32' ? '.exe' : platform === 'linux' ? '.appimage' : null;
    const platformFiles = targetExtension ? info.files.filter(({ url })=>url.toLowerCase().replace(/[?#].*$/, '').endsWith(targetExtension)) : [];
    const candidateFiles = platformFiles.length > 0 ? platformFiles : info.files;
    const candidateSizes = new Set(candidateFiles.map(({ size })=>size).filter((size)=>typeof size === 'number' && Number.isFinite(size) && size > 0));
    if (candidateSizes.size !== 1) {
        return undefined;
    }
    return candidateSizes.values().next().value;
};
const resolveDownloadProgress = (info)=>{
    const normalizeNonNegativeNumber = (value)=>{
        return Number.isFinite(value) && value >= 0 ? value : undefined;
    };
    const percent = Number.isFinite(info.percent) ? Math.min(100, Math.max(0, info.percent)) : 0;
    const transferredBytes = normalizeNonNegativeNumber(info.transferred);
    const totalBytes = normalizeNonNegativeNumber(info.total);
    const bytesPerSecond = normalizeNonNegativeNumber(info.bytesPerSecond);
    return {
        percent,
        ...transferredBytes === undefined ? {} : {
            transferredBytes
        },
        ...totalBytes === undefined ? {} : {
            totalBytes
        },
        ...bytesPerSecond === undefined ? {} : {
            bytesPerSecond
        }
    };
};
