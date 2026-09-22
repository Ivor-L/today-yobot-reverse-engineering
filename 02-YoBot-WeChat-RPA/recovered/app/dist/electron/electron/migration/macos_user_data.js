import crypto from 'node:crypto';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { AGENT_AUTH_ACCESS_TOKEN_KEY, LegacyFileAuthTokenRepository } from '../security/auth_token_repository.js';
import { SecureConfigRepository } from '../security/secure_config_repository.js';
export const MACOS_USER_DATA_MIGRATION_VERSION = 1;
export const MACOS_USER_DATA_MANIFEST = '.macos-migration-manifest.v1.json';
export const MACOS_USER_DATA_ACTIVATION = '.macos-migration-active.v1.json';
const MAX_FILES = 100_000;
const MAX_BYTES = 20 * 1024 * 1024 * 1024;
const MAX_CONFIG_BYTES = 4 * 1024 * 1024;
const ALLOWED_DIRECTORIES = ['workspace', 'data', 'skills', 'skills_docs', 'channels'];
const EXCLUDED_DATA_ROOTS = new Set([
    'agent_runs',
    'agentic_idempotency',
    'agentic_deliveries',
    'cache',
    'context_cache',
    'memory-db',
    'rpa_delivery_ledger',
    'traces',
    'turn_queues',
]);
function portable(relativePath) {
    return relativePath.split(path.sep).join('/').normalize('NFC');
}
function isInside(parent, child) {
    const relative = path.relative(parent, child);
    return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}
function requireSeparateRoots(sourceRoot, targetRoot) {
    if (!path.isAbsolute(sourceRoot) || !path.isAbsolute(targetRoot)) {
        throw new Error('macOS migration roots must be absolute');
    }
    const source = path.resolve(sourceRoot);
    const target = path.resolve(targetRoot);
    if (source === target || isInside(source, target) || isInside(target, source)) {
        throw new Error('macOS migration roots must be separate');
    }
}
async function exists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
async function hashFile(filePath) {
    const hash = crypto.createHash('sha256');
    await pipeline(fsSync.createReadStream(filePath), hash);
    return hash.digest('hex');
}
async function writePrivateJson(filePath, value) {
    const directory = path.dirname(filePath);
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    try {
        await fs.chmod(directory, 0o700);
    }
    catch { /* Best effort on filesystems without POSIX modes. */ }
    const handle = await fs.open(filePath, 'wx', 0o600);
    try {
        await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
        await handle.sync();
    }
    finally {
        await handle.close();
    }
}
function shouldCopy(relativePath) {
    const normalized = portable(relativePath);
    const parts = normalized.split('/');
    if (parts[0] === 'data' && parts[1] && EXCLUDED_DATA_ROOTS.has(parts[1].toLowerCase())) {
        return false;
    }
    if (parts[0] === 'channels') {
        return normalized.toLowerCase().endsWith('.state.json');
    }
    return true;
}
async function collectAllowedFiles(sourceRoot) {
    const files = [];
    const skippedSymlinks = [];
    const canonicalPaths = new Set();
    let totalBytes = 0;
    const visit = async (absolutePath) => {
        const relativePath = path.relative(sourceRoot, absolutePath);
        const normalized = portable(relativePath);
        const stat = await fs.lstat(absolutePath);
        if (stat.isSymbolicLink()) {
            skippedSymlinks.push(normalized);
            return;
        }
        if (stat.isDirectory()) {
            const entries = await fs.readdir(absolutePath);
            for (const entry of entries)
                await visit(path.join(absolutePath, entry));
            return;
        }
        if (!stat.isFile() || !shouldCopy(relativePath))
            return;
        const canonical = normalized.toLowerCase();
        if (canonicalPaths.has(canonical)) {
            throw new Error(`macOS migration path collision: ${normalized}`);
        }
        canonicalPaths.add(canonical);
        files.push(absolutePath);
        totalBytes += stat.size;
        if (files.length > MAX_FILES || totalBytes > MAX_BYTES) {
            throw new Error('macOS migration source exceeds safety limits');
        }
    };
    for (const directory of ALLOWED_DIRECTORIES) {
        const absolutePath = path.join(sourceRoot, directory);
        if (await exists(absolutePath))
            await visit(absolutePath);
    }
    files.sort((left, right) => portable(path.relative(sourceRoot, left)).localeCompare(portable(path.relative(sourceRoot, right))));
    skippedSymlinks.sort();
    return { files, skippedSymlinks };
}
async function copyVerifiedFile(sourceRoot, targetRoot, sourcePath) {
    const relativePath = path.relative(sourceRoot, sourcePath);
    const targetPath = path.resolve(targetRoot, relativePath);
    if (!isInside(targetRoot, targetPath))
        throw new Error(`macOS migration path escaped: ${relativePath}`);
    const sourceStat = await fs.lstat(sourcePath);
    if (!sourceStat.isFile() || sourceStat.isSymbolicLink()) {
        throw new Error(`macOS migration source changed during copy: ${relativePath}`);
    }
    await fs.mkdir(path.dirname(targetPath), { recursive: true, mode: 0o700 });
    await fs.copyFile(sourcePath, targetPath);
    try {
        await fs.chmod(targetPath, sourceStat.mode & 0o777);
    }
    catch { /* Best effort. */ }
    const targetStat = await fs.lstat(targetPath);
    if (!targetStat.isFile() || targetStat.size !== sourceStat.size) {
        throw new Error(`macOS migration copy verification failed: ${relativePath}`);
    }
    const [sourceHash, targetHash] = await Promise.all([hashFile(sourcePath), hashFile(targetPath)]);
    if (sourceHash !== targetHash) {
        throw new Error(`macOS migration hash verification failed: ${relativePath}`);
    }
}
async function projectConfig(sourceLayout, stagingRoot, store) {
    const sourcePath = sourceLayout.configFile;
    if (!(await exists(sourcePath)))
        return;
    const stat = await fs.lstat(sourcePath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_CONFIG_BYTES) {
        throw new Error('macOS migration config is not a safe regular file');
    }
    let parsed;
    try {
        parsed = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
    }
    catch {
        throw new Error('macOS migration config is corrupt');
    }
    const repository = new SecureConfigRepository({
        configPath: path.join(stagingRoot, 'config.json'),
        secretStore: store,
    });
    await repository.write(parsed);
}
async function projectLegacyAuthToken(sourceLayout, store) {
    const repository = new LegacyFileAuthTokenRepository(path.join(sourceLayout.userData, 'auth.json'));
    try {
        const token = await repository.read();
        if (token)
            await store.set(AGENT_AUTH_ACCESS_TOKEN_KEY, token);
    }
    catch {
        // A stale/corrupt legacy login must not block migration of user business
        // data. It remains untouched in the recoverable source and the user logs in
        // again after activation.
    }
}
async function buildManifest(stagingRoot, sourceRoot, targetRoot, createdAt, skippedSymlinks) {
    const entries = [];
    let bytes = 0;
    const visit = async (directory) => {
        for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
            const absolutePath = path.join(directory, entry.name);
            if (entry.isSymbolicLink())
                throw new Error('macOS migration staging contains a symlink');
            if (entry.isDirectory()) {
                await visit(absolutePath);
                continue;
            }
            if (!entry.isFile())
                throw new Error('macOS migration staging contains a special file');
            const relativePath = portable(path.relative(stagingRoot, absolutePath));
            if (relativePath === MACOS_USER_DATA_MANIFEST || relativePath === MACOS_USER_DATA_ACTIVATION)
                continue;
            const stat = await fs.lstat(absolutePath);
            entries.push({ path: relativePath, size: stat.size, sha256: await hashFile(absolutePath) });
            bytes += stat.size;
            if (entries.length > MAX_FILES || bytes > MAX_BYTES) {
                throw new Error('macOS migration staging exceeds safety limits');
            }
        }
    };
    await visit(stagingRoot);
    entries.sort((left, right) => left.path.localeCompare(right.path));
    return {
        manifest: {
            format_version: MACOS_USER_DATA_MIGRATION_VERSION,
            source_root: path.resolve(sourceRoot),
            target_root: path.resolve(targetRoot),
            created_at: createdAt,
            files: entries,
            skipped_symlinks: skippedSymlinks,
        },
        bytes,
    };
}
export function inspectMacOSUserDataMigration(sourceRoot, targetRoot) {
    try {
        requireSeparateRoots(sourceRoot, targetRoot);
        const targetStat = fsSync.lstatSync(targetRoot);
        if (!targetStat.isDirectory() || targetStat.isSymbolicLink()) {
            return { active: false, reason: 'target-not-directory' };
        }
        const activationPath = path.join(targetRoot, MACOS_USER_DATA_ACTIVATION);
        const manifestPath = path.join(targetRoot, MACOS_USER_DATA_MANIFEST);
        for (const filePath of [activationPath, manifestPath]) {
            const stat = fsSync.lstatSync(filePath);
            if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_CONFIG_BYTES) {
                return { active: false, reason: 'activation-files-invalid' };
            }
        }
        const activation = JSON.parse(fsSync.readFileSync(activationPath, 'utf8'));
        if (activation.format_version !== MACOS_USER_DATA_MIGRATION_VERSION
            || activation.status !== 'complete'
            || path.resolve(activation.source_root) !== path.resolve(sourceRoot)
            || path.resolve(activation.target_root) !== path.resolve(targetRoot)
            || !Number.isSafeInteger(activation.file_count)
            || activation.file_count < 0
            || !Number.isSafeInteger(activation.total_bytes)
            || activation.total_bytes < 0
            || !/^[a-f0-9]{64}$/.test(activation.manifest_sha256)) {
            return { active: false, reason: 'activation-invalid' };
        }
        const manifestBytes = fsSync.readFileSync(manifestPath);
        const manifestHash = crypto.createHash('sha256').update(manifestBytes).digest('hex');
        if (manifestHash !== activation.manifest_sha256) {
            return { active: false, reason: 'manifest-hash-mismatch' };
        }
        const manifest = JSON.parse(manifestBytes.toString('utf8'));
        const manifestBytesTotal = Array.isArray(manifest.files)
            ? manifest.files.reduce((sum, entry) => sum + (Number.isSafeInteger(entry?.size) ? entry.size : -MAX_BYTES), 0)
            : -1;
        if (manifest.format_version !== MACOS_USER_DATA_MIGRATION_VERSION
            || path.resolve(manifest.source_root) !== path.resolve(sourceRoot)
            || path.resolve(manifest.target_root) !== path.resolve(targetRoot)
            || !Array.isArray(manifest.files)
            || manifest.files.length !== activation.file_count
            || manifestBytesTotal !== activation.total_bytes) {
            return { active: false, reason: 'manifest-invalid' };
        }
        return { active: true, reason: 'active', activation };
    }
    catch (error) {
        const code = error.code;
        return { active: false, reason: code === 'ENOENT' ? 'not-migrated' : 'inspection-failed' };
    }
}
export async function migrateMacOSUserData(options) {
    const sourceRoot = path.resolve(options.sourceLayout.userData);
    const targetRoot = path.resolve(options.targetLayout.userData);
    requireSeparateRoots(sourceRoot, targetRoot);
    if (options.targetLayout.platform !== 'darwin') {
        throw new Error('macOS migration target must use the darwin layout');
    }
    const active = inspectMacOSUserDataMigration(sourceRoot, targetRoot);
    if (active.active) {
        return {
            status: 'already-active',
            restartRequired: false,
            files: active.activation?.file_count ?? 0,
            bytes: active.activation?.total_bytes ?? 0,
            skippedSymlinks: [],
        };
    }
    if (!(await exists(sourceRoot))) {
        return { status: 'source-missing', restartRequired: false, files: 0, bytes: 0, skippedSymlinks: [] };
    }
    const sourceStat = await fs.lstat(sourceRoot);
    if (!sourceStat.isDirectory() || sourceStat.isSymbolicLink()) {
        throw new Error('macOS migration source must be a regular directory');
    }
    const parent = path.dirname(targetRoot);
    await fs.mkdir(parent, { recursive: true, mode: 0o700 });
    const transactionId = `${process.pid}-${crypto.randomUUID()}`;
    const stagingRoot = path.join(parent, `.${path.basename(targetRoot)}.migration-${transactionId}`);
    const failedRoot = path.join(parent, `.${path.basename(targetRoot)}.failed-${transactionId}`);
    const now = options.now?.() ?? new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(parent, `${path.basename(targetRoot)}.pre-migration-${timestamp}-${crypto.randomUUID()}`);
    let existingTargetBackedUp = false;
    let stagingActivated = false;
    try {
        await fs.mkdir(stagingRoot, { mode: 0o700 });
        const collected = await collectAllowedFiles(sourceRoot);
        for (const sourcePath of collected.files) {
            await copyVerifiedFile(sourceRoot, stagingRoot, sourcePath);
        }
        const stagingSecretStore = options.createSecretStore(path.join(stagingRoot, 'protected'));
        await projectConfig(options.sourceLayout, stagingRoot, stagingSecretStore);
        await projectLegacyAuthToken(options.sourceLayout, stagingSecretStore);
        const createdAt = now.toISOString();
        const { manifest, bytes } = await buildManifest(stagingRoot, sourceRoot, targetRoot, createdAt, collected.skippedSymlinks);
        const manifestPath = path.join(stagingRoot, MACOS_USER_DATA_MANIFEST);
        await writePrivateJson(manifestPath, manifest);
        const manifestHash = await hashFile(manifestPath);
        const activation = {
            format_version: MACOS_USER_DATA_MIGRATION_VERSION,
            status: 'complete',
            source_root: sourceRoot,
            target_root: targetRoot,
            activated_at: createdAt,
            manifest_sha256: manifestHash,
            file_count: manifest.files.length,
            total_bytes: bytes,
        };
        await writePrivateJson(path.join(stagingRoot, MACOS_USER_DATA_ACTIVATION), activation);
        if (await exists(targetRoot)) {
            const targetStat = await fs.lstat(targetRoot);
            if (!targetStat.isDirectory() || targetStat.isSymbolicLink()) {
                throw new Error('macOS migration target must be a regular directory');
            }
            await fs.rename(targetRoot, backupPath);
            existingTargetBackedUp = true;
        }
        await fs.rename(stagingRoot, targetRoot);
        stagingActivated = true;
        const inspection = inspectMacOSUserDataMigration(sourceRoot, targetRoot);
        if (!inspection.active)
            throw new Error(`macOS migration activation verification failed: ${inspection.reason}`);
        return {
            status: 'migrated',
            restartRequired: true,
            files: manifest.files.length,
            bytes,
            skippedSymlinks: collected.skippedSymlinks,
            ...(existingTargetBackedUp ? { backupPath } : {}),
        };
    }
    catch (error) {
        if (stagingActivated && await exists(targetRoot)) {
            await fs.rename(targetRoot, failedRoot).catch(() => undefined);
        }
        if (existingTargetBackedUp && !(await exists(targetRoot))) {
            await fs.rename(backupPath, targetRoot).catch(() => undefined);
        }
        throw error;
    }
    finally {
        await fs.rm(stagingRoot, { recursive: true, force: true }).catch(() => undefined);
    }
}
