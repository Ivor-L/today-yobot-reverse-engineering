import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
export const AGENT_AUTH_ACCESS_TOKEN_KEY = 'auth.access-token';
const MAX_AUTH_FILE_BYTES = 128 * 1024;
const MAX_ACCESS_TOKEN_BYTES = 64 * 1024;
export function normalizeAuthAccessToken(value) {
    if (typeof value !== 'string')
        throw new Error('Auth access token must be a string');
    const token = value.trim();
    if (!token
        || token !== value
        || /[\u0000-\u001f\u007f\s]/u.test(token)
        || Buffer.byteLength(token, 'utf8') > MAX_ACCESS_TOKEN_BYTES) {
        throw new Error('Auth access token is invalid');
    }
    return token;
}
/** macOS backend: the token is encrypted by the shared Agent SecretStore. */
export class SecretStoreAuthTokenRepository {
    store;
    constructor(store) {
        this.store = store;
    }
    async read() {
        const token = await this.store.get(AGENT_AUTH_ACCESS_TOKEN_KEY);
        return token === null ? null : normalizeAuthAccessToken(token);
    }
    async write(token) {
        await this.store.set(AGENT_AUTH_ACCESS_TOKEN_KEY, normalizeAuthAccessToken(token));
    }
    clear() {
        return this.store.delete(AGENT_AUTH_ACCESS_TOKEN_KEY);
    }
}
async function readRegularAuthFile(filePath) {
    let stat;
    try {
        stat = await fs.lstat(filePath);
    }
    catch (error) {
        if (error.code === 'ENOENT')
            return null;
        throw error;
    }
    if (!stat.isFile() || stat.isSymbolicLink())
        throw new Error('Auth token path is not a regular file');
    if (stat.size > MAX_AUTH_FILE_BYTES)
        throw new Error('Auth token file exceeds the size limit');
    try {
        const value = JSON.parse(await fs.readFile(filePath, 'utf8'));
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error('Auth token file is corrupt');
        }
        return value;
    }
    catch (error) {
        if (error instanceof Error && error.message.startsWith('Auth token'))
            throw error;
        throw new Error('Auth token file is corrupt');
    }
}
/** Windows/explicit-root compatibility backend. Keeps the existing auth.json shape. */
export class LegacyFileAuthTokenRepository {
    filePath;
    operationChain = Promise.resolve();
    constructor(filePath) {
        this.filePath = filePath;
        if (!filePath || filePath.includes('\0') || !path.isAbsolute(filePath)) {
            throw new Error('Auth token path must be absolute');
        }
    }
    read() {
        return this.runExclusive(async () => {
            const document = await readRegularAuthFile(this.filePath);
            if (!document)
                return null;
            return normalizeAuthAccessToken(document.token);
        });
    }
    write(token) {
        return this.runExclusive(async () => {
            const normalized = normalizeAuthAccessToken(token);
            const directory = path.dirname(this.filePath);
            await fs.mkdir(directory, { recursive: true, mode: 0o700 });
            try {
                await fs.chmod(directory, 0o700);
            }
            catch { /* Windows ACLs are managed separately. */ }
            try {
                const current = await fs.lstat(this.filePath);
                if (!current.isFile() || current.isSymbolicLink()) {
                    throw new Error('Auth token path is not a regular file');
                }
            }
            catch (error) {
                if (error.code !== 'ENOENT')
                    throw error;
            }
            const tempPath = `${this.filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
            let handle = null;
            try {
                handle = await fs.open(tempPath, 'wx', 0o600);
                await handle.writeFile(`${JSON.stringify({
                    token: normalized,
                    updated_at: new Date().toISOString(),
                }, null, 2)}\n`, 'utf8');
                await handle.sync();
                await handle.close();
                handle = null;
                await fs.rename(tempPath, this.filePath);
                try {
                    await fs.chmod(this.filePath, 0o600);
                }
                catch { /* Best effort on Windows. */ }
            }
            finally {
                if (handle)
                    await handle.close().catch(() => undefined);
                await fs.rm(tempPath, { force: true }).catch(() => undefined);
            }
        });
    }
    clear() {
        return this.runExclusive(async () => {
            try {
                const stat = await fs.lstat(this.filePath);
                if (!stat.isFile() || stat.isSymbolicLink()) {
                    throw new Error('Auth token path is not a regular file');
                }
                await fs.unlink(this.filePath);
                return true;
            }
            catch (error) {
                if (error.code === 'ENOENT')
                    return false;
                throw error;
            }
        });
    }
    runExclusive(operation) {
        const result = this.operationChain.then(operation, operation);
        this.operationChain = result.then(() => undefined, () => undefined);
        return result;
    }
}
/**
 * Imports a valid plaintext legacy token only after the encrypted write is
 * confirmed. The source is then removed; invalid/missing legacy files are left
 * untouched so callers can choose whether to warn, retry or require login.
 */
export async function migrateLegacyAuthToken(source, target) {
    const existing = await target.read();
    if (existing) {
        await source.clear();
        return 'already-secure';
    }
    const token = await source.read();
    if (!token)
        return 'source-missing';
    await target.write(token);
    if (await target.read() !== token)
        throw new Error('Encrypted auth token verification failed');
    await source.clear();
    return 'migrated';
}
