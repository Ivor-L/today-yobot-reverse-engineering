import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { configSecretSnapshot, hydrateConfigSecrets, hydrateConfigSecretsFromSnapshot, projectConfigSecrets, } from '../../core/config/secret_projection.js';
const CONFIG_PROTECTION_FORMAT_VERSION = 1;
const CONFIG_PROTECTION_FIELD = '__yoko_protected';
const CONFIG_SECRET_BUNDLE_PREFIX = 'config.secret-bundle.';
const MAX_CONFIG_BYTES = 4 * 1024 * 1024;
const MAX_SECRET_BUNDLE_BYTES = 2 * 1024 * 1024;
const SECRET_KEY_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,127}$/i;
function cloneObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Secure config requires a JSON object');
    }
    try {
        return JSON.parse(JSON.stringify(value));
    }
    catch {
        throw new Error('Secure config requires JSON-safe data');
    }
}
function withoutProtectionMetadata(value) {
    const config = cloneObject(value);
    delete config[CONFIG_PROTECTION_FIELD];
    return config;
}
function requireBundleKey(value) {
    if (typeof value !== 'string'
        || !value.startsWith(CONFIG_SECRET_BUNDLE_PREFIX)
        || !SECRET_KEY_PATTERN.test(value)) {
        throw new Error('Secure config secret bundle reference is invalid');
    }
    return value;
}
function readMetadata(value) {
    if (!Object.prototype.hasOwnProperty.call(value, CONFIG_PROTECTION_FIELD))
        return null;
    const raw = value[CONFIG_PROTECTION_FIELD];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new Error('Secure config protection metadata is invalid');
    }
    if (raw.format_version !== CONFIG_PROTECTION_FORMAT_VERSION) {
        throw new Error('Secure config protection format is unsupported');
    }
    return {
        format_version: CONFIG_PROTECTION_FORMAT_VERSION,
        secret_bundle_key: requireBundleKey(raw.secret_bundle_key),
    };
}
function decodeSnapshot(serialized) {
    if (Buffer.byteLength(serialized, 'utf8') > MAX_SECRET_BUNDLE_BYTES) {
        throw new Error('Secure config secret bundle exceeds the size limit');
    }
    let parsed;
    try {
        parsed = JSON.parse(serialized);
    }
    catch {
        throw new Error('Secure config secret bundle is corrupt');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Secure config secret bundle is corrupt');
    }
    const snapshot = Object.create(null);
    for (const [key, value] of Object.entries(parsed)) {
        if (!SECRET_KEY_PATTERN.test(key) || typeof value !== 'string' || !value) {
            throw new Error('Secure config secret bundle is corrupt');
        }
        snapshot[key] = value;
    }
    return Object.freeze(snapshot);
}
async function readRegularConfig(configPath) {
    let stat;
    try {
        stat = await fs.lstat(configPath);
    }
    catch (error) {
        if (error.code === 'ENOENT')
            return null;
        throw error;
    }
    if (!stat.isFile() || stat.isSymbolicLink()) {
        throw new Error('Secure config path is not a regular file');
    }
    if (stat.size > MAX_CONFIG_BYTES)
        throw new Error('Secure config exceeds the size limit');
    try {
        return cloneObject(JSON.parse(await fs.readFile(configPath, 'utf8')));
    }
    catch (error) {
        if (error instanceof Error && error.message.startsWith('Secure config'))
            throw error;
        throw new Error('Secure config is corrupt');
    }
}
async function writePrivateAtomic(configPath, value) {
    const serialized = `${JSON.stringify(value, null, 2)}\n`;
    if (Buffer.byteLength(serialized, 'utf8') > MAX_CONFIG_BYTES) {
        throw new Error('Secure config exceeds the size limit');
    }
    const directory = path.dirname(configPath);
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    try {
        await fs.chmod(directory, 0o700);
    }
    catch { /* Best effort on filesystems without POSIX modes. */ }
    try {
        const current = await fs.lstat(configPath);
        if (!current.isFile() || current.isSymbolicLink()) {
            throw new Error('Secure config path is not a regular file');
        }
    }
    catch (error) {
        if (error.code !== 'ENOENT')
            throw error;
    }
    const tempPath = `${configPath}.${process.pid}.${crypto.randomUUID()}.tmp`;
    let handle = null;
    try {
        handle = await fs.open(tempPath, 'wx', 0o600);
        await handle.writeFile(serialized, 'utf8');
        await handle.sync();
        await handle.close();
        handle = null;
        await fs.rename(tempPath, configPath);
        try {
            await fs.chmod(configPath, 0o600);
        }
        catch { /* Best effort. */ }
    }
    finally {
        if (handle)
            await handle.close().catch(() => undefined);
        await fs.rm(tempPath, { force: true }).catch(() => undefined);
    }
}
/**
 * Owns the physical config/secret boundary. Each write creates a new encrypted
 * generation, then atomically points config.json at it. The previous generation
 * is deleted only after the new public document is durable.
 */
export class SecureConfigRepository {
    options;
    operationChain = Promise.resolve();
    configPath;
    createGeneration;
    constructor(options) {
        this.options = options;
        if (!options.configPath || options.configPath.includes('\0') || !path.isAbsolute(options.configPath)) {
            throw new Error('Secure config path must be absolute');
        }
        this.configPath = path.resolve(options.configPath);
        this.createGeneration = options.createGeneration ?? (() => crypto.randomUUID().replace(/-/g, ''));
    }
    read() {
        return this.runExclusive(async () => {
            const physical = await readRegularConfig(this.configPath);
            if (!physical)
                return null;
            const metadata = readMetadata(physical);
            const publicConfig = withoutProtectionMetadata(physical);
            if (!metadata) {
                // Supports the migration staging format and a one-time conversion from
                // per-entry projected secrets without ever accepting plaintext fallback.
                return hydrateConfigSecrets(publicConfig, this.options.secretStore);
            }
            const bundle = await this.options.secretStore.get(metadata.secret_bundle_key);
            if (bundle === null)
                throw new Error('Secure config secret bundle is missing');
            return hydrateConfigSecretsFromSnapshot(publicConfig, decodeSnapshot(bundle));
        });
    }
    isProtected() {
        return this.runExclusive(async () => {
            const physical = await readRegularConfig(this.configPath);
            return physical !== null && readMetadata(physical) !== null;
        });
    }
    write(value) {
        return this.runExclusive(async () => {
            const businessConfig = withoutProtectionMetadata(value);
            const projection = projectConfigSecrets(businessConfig);
            const snapshot = configSecretSnapshot(projection);
            const serializedSnapshot = JSON.stringify(snapshot);
            if (Buffer.byteLength(serializedSnapshot, 'utf8') > MAX_SECRET_BUNDLE_BYTES) {
                throw new Error('Secure config secret bundle exceeds the size limit');
            }
            const generation = this.createGeneration().trim().toLowerCase();
            if (!/^[a-z0-9]{16,64}$/.test(generation)) {
                throw new Error('Secure config generation is invalid');
            }
            const nextBundleKey = requireBundleKey(`${CONFIG_SECRET_BUNDLE_PREFIX}${generation}`);
            const currentPhysical = await readRegularConfig(this.configPath);
            const previousBundleKey = currentPhysical ? readMetadata(currentPhysical)?.secret_bundle_key : undefined;
            const physicalConfig = {
                ...projection.config,
                [CONFIG_PROTECTION_FIELD]: {
                    format_version: CONFIG_PROTECTION_FORMAT_VERSION,
                    secret_bundle_key: nextBundleKey,
                },
            };
            await this.options.secretStore.set(nextBundleKey, serializedSnapshot);
            try {
                await writePrivateAtomic(this.configPath, physicalConfig);
            }
            catch (error) {
                await this.options.secretStore.delete(nextBundleKey).catch(() => undefined);
                throw error;
            }
            if (previousBundleKey && previousBundleKey !== nextBundleKey) {
                await this.options.secretStore.delete(previousBundleKey).catch(() => undefined);
            }
        });
    }
    runExclusive(operation) {
        const result = this.operationChain.then(operation, operation);
        this.operationChain = result.then(() => undefined, () => undefined);
        return result;
    }
}
export const secureConfigFormat = Object.freeze({
    formatVersion: CONFIG_PROTECTION_FORMAT_VERSION,
    metadataField: CONFIG_PROTECTION_FIELD,
    secretBundlePrefix: CONFIG_SECRET_BUNDLE_PREFIX,
});
