import { AsyncLocalStorage } from 'node:async_hooks';
import * as fs from 'node:fs';
import * as path from 'node:path';
import extractZip from 'extract-zip';
const DEFAULT_MAX_ENTRIES = 20_000;
const DEFAULT_MAX_UNCOMPRESSED_BYTES = 8 * 1024 * 1024 * 1024;
const DEFAULT_MAX_ENTRY_BYTES = 2 * 1024 * 1024 * 1024;
const DEFAULT_MAX_COMPRESSION_RATIO = 200;
const MAX_PATH_BYTES = 1024;
const MAX_COMPONENT_BYTES = 255;
const FILE_TYPE_MASK = 0o170000;
const SYMBOLIC_LINK_TYPE = 0o120000;
const FORBIDDEN_UNICODE = /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u;
// Electron treats every path segment ending in `.asar` as a virtual archive.
// Agent and RPA app bundles contain Resources/app.asar as a regular file, so
// extraction must use raw filesystem mode. The switch is process-wide: keep
// this transaction serialized and always restore the caller's previous mode.
let rawArchiveExtractionTail = Promise.resolve();
const rawArchiveFilesystemContext = new AsyncLocalStorage();
export async function withRawArchiveFilesystem(operation) {
    if (rawArchiveFilesystemContext.getStore() === true)
        return operation();
    const predecessor = rawArchiveExtractionTail;
    let release = () => undefined;
    rawArchiveExtractionTail = new Promise((resolve) => {
        release = resolve;
    });
    await predecessor;
    const previousNoAsar = process.noAsar;
    process.noAsar = true;
    try {
        return await rawArchiveFilesystemContext.run(true, operation);
    }
    finally {
        process.noAsar = previousNoAsar;
        release();
    }
}
export class PluginArchiveValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'PluginArchiveValidationError';
    }
}
/**
 * Remove a transaction-owned archive directory without letting Electron treat
 * a regular `app.asar` file inside it as a virtual directory. Callers must
 * establish ownership before invoking this helper.
 */
export async function removeOwnedPluginArchiveStaging(stagingDir, removeDirectory = (target) => fs.promises.rm(target, { recursive: true, force: true })) {
    if (!path.isAbsolute(stagingDir)
        || path.resolve(stagingDir) !== stagingDir
        || path.dirname(stagingDir) === stagingDir) {
        throw new PluginArchiveValidationError('插件 staging 清理路径无效');
    }
    await withRawArchiveFilesystem(() => removeDirectory(stagingDir));
}
function safePositiveInteger(value, fallback) {
    return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : fallback;
}
function portableCollisionKey(parts) {
    return parts.join('/').normalize('NFD').toLocaleLowerCase('en-US');
}
function validateEntrypointName(value) {
    if (!value || value !== path.posix.basename(value) || !value.endsWith('.app')
        || value.normalize('NFC') !== value || FORBIDDEN_UNICODE.test(value)
        || Buffer.byteLength(value, 'utf8') > MAX_COMPONENT_BYTES) {
        throw new PluginArchiveValidationError('插件 ZIP 的预期入口名称无效');
    }
}
function validateEntryPath(fileName, expectedEntrypoint) {
    if (!fileName || fileName.includes('\\') || fileName.startsWith('/') || /^[a-z]:/i.test(fileName)
        || fileName.normalize('NFC') !== fileName || FORBIDDEN_UNICODE.test(fileName)
        || Buffer.byteLength(fileName, 'utf8') > MAX_PATH_BYTES) {
        throw new PluginArchiveValidationError('插件 ZIP 包含非法、未归一化或过长路径');
    }
    const withoutDirectorySuffix = fileName.endsWith('/') ? fileName.slice(0, -1) : fileName;
    const parts = withoutDirectorySuffix.split('/');
    if (parts.length === 0 || parts.some((part) => !part || part === '.' || part === '..'
        || Buffer.byteLength(part, 'utf8') > MAX_COMPONENT_BYTES)) {
        throw new PluginArchiveValidationError('插件 ZIP 包含空段、越界段或过长文件名');
    }
    if (parts[0] !== expectedEntrypoint) {
        throw new PluginArchiveValidationError('插件 ZIP 必须只包含签名清单指定的顶层入口');
    }
    return parts;
}
function isSymlinkEntry(entry) {
    const mode = (entry.externalFileAttributes >>> 16) & 0xffff;
    return (mode & FILE_TYPE_MASK) === SYMBOLIC_LINK_TYPE;
}
async function defaultExtract(zipPath, options) {
    await extractZip(zipPath, options);
}
function isPathInside(root, candidate) {
    const relative = path.relative(root, candidate);
    return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}
async function validateExtractedSymlinks(stagingDir) {
    const canonicalRoot = await fs.promises.realpath(stagingDir);
    const pending = [canonicalRoot];
    while (pending.length > 0) {
        const current = pending.pop();
        const entries = await fs.promises.readdir(current, { withFileTypes: true });
        for (const entry of entries) {
            const candidate = path.join(current, entry.name);
            const stat = await fs.promises.lstat(candidate);
            if (stat.isSymbolicLink()) {
                const link = await fs.promises.readlink(candidate);
                if (path.isAbsolute(link))
                    throw new PluginArchiveValidationError('插件 ZIP 包含绝对 symlink');
                let resolved;
                try {
                    resolved = await fs.promises.realpath(candidate);
                }
                catch {
                    throw new PluginArchiveValidationError('插件 ZIP 包含断裂 symlink');
                }
                if (!isPathInside(canonicalRoot, resolved)) {
                    throw new PluginArchiveValidationError('插件 ZIP 包含越界 symlink');
                }
            }
            else if (stat.isDirectory()) {
                pending.push(candidate);
            }
            else if (!stat.isFile()) {
                throw new PluginArchiveValidationError('插件 ZIP 解包后包含不支持的文件类型');
            }
        }
    }
}
/** Extract a signed macOS RPA ZIP into a newly-created, disposable staging directory. */
export async function extractPluginArchiveSecurely(options) {
    if (!path.isAbsolute(options.zipPath) || !path.isAbsolute(options.stagingDir)) {
        throw new PluginArchiveValidationError('插件 ZIP 和 staging 必须使用绝对路径');
    }
    validateEntrypointName(options.expectedEntrypoint);
    const zipStat = await fs.promises.lstat(options.zipPath).catch((error) => {
        if (error.code === 'ENOENT')
            return null;
        throw error;
    });
    if (!zipStat?.isFile() || zipStat.isSymbolicLink()) {
        throw new PluginArchiveValidationError('插件 ZIP 必须是现有普通文件');
    }
    const stagingStat = await fs.promises.lstat(options.stagingDir).catch((error) => {
        if (error.code === 'ENOENT')
            return null;
        throw error;
    });
    if (stagingStat)
        throw new PluginArchiveValidationError('插件 staging 必须由本事务全新创建');
    const maxEntries = safePositiveInteger(options.limits?.maxEntries, DEFAULT_MAX_ENTRIES);
    const maxUncompressedBytes = safePositiveInteger(options.limits?.maxUncompressedBytes, DEFAULT_MAX_UNCOMPRESSED_BYTES);
    const maxEntryBytes = safePositiveInteger(options.limits?.maxEntryBytes, DEFAULT_MAX_ENTRY_BYTES);
    const maxCompressionRatio = safePositiveInteger(options.limits?.maxCompressionRatio, DEFAULT_MAX_COMPRESSION_RATIO);
    const collisionKeys = new Set();
    let entryCount = 0;
    let uncompressedBytes = 0;
    let compressedBytes = 0;
    let symlinkEntries = 0;
    let createdStaging = false;
    try {
        await fs.promises.mkdir(options.stagingDir, { recursive: false, mode: 0o700 });
        createdStaging = true;
        const extractFn = options.extractFn ?? defaultExtract;
        await withRawArchiveFilesystem(() => extractFn(options.zipPath, {
            dir: options.stagingDir,
            defaultDirMode: 0o755,
            defaultFileMode: 0o644,
            onEntry: (entry) => {
                entryCount += 1;
                if (entryCount > maxEntries)
                    throw new PluginArchiveValidationError('插件 ZIP 文件数量超过限制');
                if ((Number(entry.generalPurposeBitFlag) & 1) === 1) {
                    throw new PluginArchiveValidationError('插件 ZIP 不允许加密条目');
                }
                const parts = validateEntryPath(entry.fileName, options.expectedEntrypoint);
                const collisionKey = portableCollisionKey(parts);
                if (collisionKeys.has(collisionKey)) {
                    throw new PluginArchiveValidationError('插件 ZIP 包含大小写或 Unicode 冲突路径');
                }
                collisionKeys.add(collisionKey);
                if (!Number.isSafeInteger(entry.uncompressedSize) || entry.uncompressedSize < 0
                    || !Number.isSafeInteger(entry.compressedSize) || entry.compressedSize < 0
                    || entry.uncompressedSize > maxEntryBytes) {
                    throw new PluginArchiveValidationError('插件 ZIP 条目大小无效或超过限制');
                }
                uncompressedBytes += entry.uncompressedSize;
                compressedBytes += entry.compressedSize;
                if (!Number.isSafeInteger(uncompressedBytes) || uncompressedBytes > maxUncompressedBytes) {
                    throw new PluginArchiveValidationError('插件 ZIP 解压总大小超过限制');
                }
                if (entry.uncompressedSize > 1024 * 1024
                    && (entry.compressedSize === 0 || entry.uncompressedSize / entry.compressedSize > maxCompressionRatio)) {
                    throw new PluginArchiveValidationError('插件 ZIP 条目压缩比异常');
                }
                if (uncompressedBytes > 1024 * 1024
                    && (compressedBytes === 0 || uncompressedBytes / compressedBytes > maxCompressionRatio)) {
                    throw new PluginArchiveValidationError('插件 ZIP 总压缩比异常');
                }
                // Symlinks are required by some signed .app Framework layouts. Their targets
                // are validated after extraction and must resolve inside this private staging.
                if (isSymlinkEntry(entry))
                    symlinkEntries += 1;
            },
        }));
        if (entryCount === 0)
            throw new PluginArchiveValidationError('插件 ZIP 为空');
        await validateExtractedSymlinks(options.stagingDir);
        const entrypointPath = path.join(options.stagingDir, options.expectedEntrypoint);
        const entrypointStat = await fs.promises.lstat(entrypointPath).catch(() => null);
        if (!entrypointStat?.isDirectory() || entrypointStat.isSymbolicLink()
            || !fs.existsSync(path.join(entrypointPath, 'Contents', 'Info.plist'))
            || !fs.existsSync(path.join(entrypointPath, 'Contents', 'MacOS'))) {
            throw new PluginArchiveValidationError('插件 ZIP 缺少有效的 macOS App Bundle 基本结构');
        }
        return {
            stagingDir: options.stagingDir,
            entrypointPath,
            entryCount,
            declaredUncompressedBytes: uncompressedBytes,
            declaredSymlinkCount: symlinkEntries,
        };
    }
    catch (error) {
        if (createdStaging)
            await removeOwnedPluginArchiveStaging(options.stagingDir);
        throw error;
    }
}
