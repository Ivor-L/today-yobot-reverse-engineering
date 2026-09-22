import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
const SECRET_STORE_FORMAT_VERSION = 1;
const MAX_SECRET_STORE_BYTES = 4 * 1024 * 1024;
const MAX_SECRET_VALUE_BYTES = 1024 * 1024;
const MAX_SECRET_ENTRIES = 256;
const SECRET_KEY_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,127}$/i;
const CIPHER_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/i;
function requireSecretKey(key) {
    const normalized = key.trim();
    if (!SECRET_KEY_PATTERN.test(normalized)) {
        throw new Error('Secret key must be a namespaced identifier');
    }
    return normalized;
}
function requireCipherName(name) {
    const normalized = name.trim();
    if (!CIPHER_NAME_PATTERN.test(normalized)) {
        throw new Error('Secret cipher name is invalid');
    }
    return normalized;
}
function decodeCanonicalBase64(value, key) {
    if (typeof value !== 'string' || !value || !/^[a-z0-9+/]+={0,2}$/i.test(value)) {
        throw new Error(`Secret store entry is invalid: ${key}`);
    }
    const decoded = Buffer.from(value, 'base64');
    if (!decoded.length || decoded.toString('base64') !== value) {
        throw new Error(`Secret store entry is invalid: ${key}`);
    }
    return decoded;
}
export class EncryptedFileSecretStore {
    filePath;
    cipher;
    operationChain = Promise.resolve();
    cipherName;
    constructor(filePath, cipher) {
        this.filePath = filePath;
        this.cipher = cipher;
        if (!filePath || filePath.includes('\0') || !path.isAbsolute(filePath)) {
            throw new Error('Secret store path must be absolute');
        }
        this.cipherName = requireCipherName(cipher.name);
    }
    get(key) {
        return this.runExclusive(async () => {
            const normalizedKey = requireSecretKey(key);
            const document = await this.readDocument();
            const encoded = document.entries[normalizedKey];
            if (encoded === undefined)
                return null;
            this.requireEncryptionAvailable();
            const decrypted = this.cipher.decryptString(decodeCanonicalBase64(encoded, normalizedKey));
            if (Buffer.byteLength(decrypted, 'utf8') > MAX_SECRET_VALUE_BYTES) {
                throw new Error(`Decrypted secret is too large: ${normalizedKey}`);
            }
            return decrypted;
        });
    }
    set(key, value) {
        return this.runExclusive(async () => {
            const normalizedKey = requireSecretKey(key);
            if (typeof value !== 'string' || !value || Buffer.byteLength(value, 'utf8') > MAX_SECRET_VALUE_BYTES) {
                throw new Error('Secret value must be a non-empty string within the size limit');
            }
            this.requireEncryptionAvailable();
            const document = await this.readDocument();
            if (!(normalizedKey in document.entries) && Object.keys(document.entries).length >= MAX_SECRET_ENTRIES) {
                throw new Error('Secret store entry limit reached');
            }
            const encrypted = this.cipher.encryptString(value);
            if (!Buffer.isBuffer(encrypted) || !encrypted.length || encrypted.length > MAX_SECRET_VALUE_BYTES) {
                throw new Error('Secret cipher returned an invalid payload');
            }
            document.entries[normalizedKey] = encrypted.toString('base64');
            await this.writeDocument(document);
        });
    }
    delete(key) {
        return this.runExclusive(async () => {
            const normalizedKey = requireSecretKey(key);
            const document = await this.readDocument();
            if (!(normalizedKey in document.entries))
                return false;
            delete document.entries[normalizedKey];
            await this.writeDocument(document);
            return true;
        });
    }
    runExclusive(operation) {
        const result = this.operationChain.then(operation, operation);
        this.operationChain = result.then(() => undefined, () => undefined);
        return result;
    }
    requireEncryptionAvailable() {
        if (!this.cipher.isEncryptionAvailable()) {
            throw new Error('System encryption is unavailable; refusing secret storage operation');
        }
    }
    emptyDocument() {
        return {
            format_version: SECRET_STORE_FORMAT_VERSION,
            cipher: this.cipherName,
            entries: {},
        };
    }
    async readDocument() {
        let stat;
        try {
            stat = await fs.lstat(this.filePath);
        }
        catch (error) {
            if (error.code === 'ENOENT')
                return this.emptyDocument();
            throw error;
        }
        if (stat.isSymbolicLink() || !stat.isFile()) {
            throw new Error('Secret store path is not a regular file');
        }
        if (stat.size > MAX_SECRET_STORE_BYTES) {
            throw new Error('Secret store exceeds the size limit');
        }
        let parsed;
        try {
            parsed = JSON.parse(await fs.readFile(this.filePath, 'utf8'));
        }
        catch {
            throw new Error('Secret store is corrupt');
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Secret store is corrupt');
        }
        const candidate = parsed;
        if (candidate.format_version !== SECRET_STORE_FORMAT_VERSION
            || candidate.cipher !== this.cipherName
            || !candidate.entries
            || typeof candidate.entries !== 'object'
            || Array.isArray(candidate.entries)) {
            throw new Error('Secret store format or cipher is unsupported');
        }
        const keys = Object.keys(candidate.entries);
        if (keys.length > MAX_SECRET_ENTRIES)
            throw new Error('Secret store entry limit exceeded');
        for (const key of keys) {
            requireSecretKey(key);
            decodeCanonicalBase64(candidate.entries[key], key);
        }
        return {
            format_version: SECRET_STORE_FORMAT_VERSION,
            cipher: this.cipherName,
            entries: { ...candidate.entries },
        };
    }
    async writeDocument(document) {
        const directory = path.dirname(this.filePath);
        await fs.mkdir(directory, { recursive: true, mode: 0o700 });
        try {
            await fs.chmod(directory, 0o700);
        }
        catch { /* Windows ACLs are managed separately. */ }
        const tempPath = `${this.filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
        let handle = null;
        try {
            handle = await fs.open(tempPath, 'wx', 0o600);
            await handle.writeFile(`${JSON.stringify(document)}\n`, 'utf8');
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
    }
}
