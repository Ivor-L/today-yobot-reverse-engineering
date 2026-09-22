import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
const STORE_SCHEMA_VERSION = 1;
const MAX_STATE_BYTES = 64 * 1024;
const MAX_SIGNED_MANIFEST_BYTES = 128 * 1024;
const PLUGIN_BUNDLE_NAME = 'YokoWebot RPA Control.app';
const PLUGIN_MANIFEST_NAME = 'manifest.v2.json';
export class PluginStoreError extends Error {
    constructor(message) {
        super(message);
        this.name = 'PluginStoreError';
    }
}
const NEXT_STAGES = {
    resolving: ['downloading'],
    downloading: ['downloaded'],
    downloaded: ['extracting'],
    extracting: ['extracted'],
    extracted: ['verifying'],
    verifying: ['verified'],
    verified: ['committing'],
    committing: ['committed'],
    committed: [],
};
function safeSegment(value, label) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(value) || value === '.' || value === '..') {
        throw new PluginStoreError(`${label} 不是安全路径段`);
    }
    return value;
}
function stateMatchesManifest(state, manifest) {
    return state.plugin_name === manifest.plugin_name
        && state.channel_id === manifest.channel_id
        && state.platform === manifest.platform
        && state.architecture === manifest.architecture
        && state.version === manifest.version
        && state.version_code === manifest.version_code
        && state.artifact_sha256 === manifest.artifact_sha256
        && state.artifact_size_bytes === manifest.artifact_size_bytes
        && state.entrypoint === manifest.entrypoint;
}
function journalToInstalled(journal, committedAt) {
    return {
        schema_version: STORE_SCHEMA_VERSION,
        plugin_name: journal.plugin_name,
        channel_id: journal.channel_id,
        platform: journal.platform,
        architecture: journal.architecture,
        version: journal.version,
        version_code: journal.version_code,
        artifact_sha256: journal.artifact_sha256,
        artifact_size_bytes: journal.artifact_size_bytes,
        entrypoint: journal.entrypoint,
        committed_at: committedAt,
    };
}
function validStage(value) {
    return typeof value === 'string' && Object.prototype.hasOwnProperty.call(NEXT_STAGES, value);
}
async function ensureOwnedDirectory(directory) {
    const stat = await fs.promises.lstat(directory).catch((error) => {
        if (error.code === 'ENOENT')
            return null;
        throw error;
    });
    if (!stat) {
        await fs.promises.mkdir(directory, { recursive: false, mode: 0o700 });
        return;
    }
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
        throw new PluginStoreError('插件版本仓库目录不是受管普通目录');
    }
}
async function readJson(filePath, maxBytes = MAX_STATE_BYTES) {
    const stat = await fs.promises.lstat(filePath).catch((error) => {
        if (error.code === 'ENOENT')
            return null;
        throw error;
    });
    if (!stat)
        return null;
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size <= 0 || stat.size > maxBytes) {
        throw new PluginStoreError('插件状态文件类型或大小无效');
    }
    try {
        const value = JSON.parse(await fs.promises.readFile(filePath, 'utf8'));
        if (!value || typeof value !== 'object' || Array.isArray(value))
            throw new Error('not an object');
        return value;
    }
    catch {
        throw new PluginStoreError('插件状态文件不是有效 JSON');
    }
}
function canonicalBase64(value, expectedBytes) {
    if (typeof value !== 'string' || !value || !/^[A-Za-z0-9+/]+={0,2}$/.test(value))
        return null;
    const bytes = Buffer.from(value, 'base64');
    if ((expectedBytes !== undefined && bytes.length !== expectedBytes)
        || bytes.toString('base64').replace(/=+$/, '') !== value.replace(/=+$/, ''))
        return null;
    return bytes;
}
function validateSignedManifestEnvelope(value) {
    const keys = Object.keys(value).sort();
    const expectedKeys = ['algorithm', 'format_version', 'key_id', 'payload', 'signature'];
    const payload = canonicalBase64(value.payload);
    const signature = canonicalBase64(value.signature, 64);
    if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])
        || value.format_version !== 2 || value.algorithm !== 'Ed25519'
        || typeof value.key_id !== 'string' || !/^[a-z0-9._-]{1,64}$/i.test(value.key_id)
        || !payload || payload.length === 0 || payload.length > MAX_STATE_BYTES || !signature) {
        throw new PluginStoreError('不可变插件版本的签名清单 envelope 无效');
    }
    return value;
}
function payloadFactsFromEnvelope(envelope) {
    try {
        const value = JSON.parse(Buffer.from(envelope.payload, 'base64').toString('utf8'));
        if (!value || typeof value !== 'object' || Array.isArray(value))
            throw new Error('not an object');
        const payload = value;
        if (typeof payload.plugin_name !== 'string' || typeof payload.channel_id !== 'string'
            || payload.platform !== 'darwin' || payload.architecture !== 'arm64'
            || typeof payload.version !== 'string' || !Number.isSafeInteger(payload.version_code)
            || typeof payload.artifact_sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(payload.artifact_sha256)
            || !Number.isSafeInteger(payload.artifact_size_bytes) || Number(payload.artifact_size_bytes) <= 0
            || payload.entrypoint !== PLUGIN_BUNDLE_NAME) {
            throw new Error('invalid target facts');
        }
        return payload;
    }
    catch {
        throw new PluginStoreError('不可变插件版本的签名清单 payload 无效');
    }
}
async function atomicWriteJson(filePath, value) {
    const temporary = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`);
    const handle = await fs.promises.open(temporary, 'wx', 0o600);
    try {
        await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
        await handle.sync();
    }
    finally {
        await handle.close();
    }
    try {
        await fs.promises.rename(temporary, filePath);
    }
    catch (error) {
        await fs.promises.rm(temporary, { force: true });
        throw error;
    }
}
function validateJournal(value) {
    if (value.schema_version !== STORE_SCHEMA_VERSION
        || typeof value.transaction_id !== 'string'
        || !/^[a-f0-9-]{36}$/.test(value.transaction_id)
        || typeof value.plugin_name !== 'string'
        || typeof value.channel_id !== 'string'
        || value.platform !== 'darwin'
        || value.architecture !== 'arm64'
        || typeof value.version !== 'string'
        || !Number.isSafeInteger(value.version_code)
        || typeof value.artifact_sha256 !== 'string'
        || !/^[a-f0-9]{64}$/.test(value.artifact_sha256)
        || !Number.isSafeInteger(value.artifact_size_bytes)
        || Number(value.artifact_size_bytes) <= 0
        || value.entrypoint !== PLUGIN_BUNDLE_NAME
        || !validStage(value.stage)
        || typeof value.created_at !== 'string'
        || !Number.isFinite(Date.parse(value.created_at))
        || typeof value.updated_at !== 'string'
        || !Number.isFinite(Date.parse(value.updated_at))) {
        throw new PluginStoreError('插件安装 journal 字段无效');
    }
    safeSegment(value.plugin_name, 'plugin_name');
    safeSegment(value.channel_id, 'channel_id');
    safeSegment(value.version, 'version');
    if (value.last_error_code !== undefined
        && (typeof value.last_error_code !== 'string' || !/^[A-Z0-9_]{1,64}$/.test(value.last_error_code))) {
        throw new PluginStoreError('插件安装 journal 错误码无效');
    }
    return value;
}
function validateInstalled(value) {
    const journalShape = {
        ...value,
        transaction_id: '00000000-0000-4000-8000-000000000000',
        stage: 'committed',
        created_at: value.committed_at,
        updated_at: value.committed_at,
    };
    const validated = validateJournal(journalShape);
    if (typeof value.committed_at !== 'string' || !Number.isFinite(Date.parse(value.committed_at))) {
        throw new PluginStoreError('插件版本 marker 提交时间无效');
    }
    return journalToInstalled(validated, value.committed_at);
}
function installedState(value, label) {
    if (value === null)
        return null;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new PluginStoreError(`插件激活状态 ${label} 无效`);
    }
    return validateInstalled(value);
}
function validTransitionId(value) {
    return typeof value === 'string' && /^[a-f0-9-]{36}$/.test(value);
}
function validTimestamp(value) {
    return typeof value === 'string' && Number.isFinite(Date.parse(value));
}
function validateActivationState(value) {
    if (value.schema_version !== STORE_SCHEMA_VERSION
        || typeof value.plugin_name !== 'string'
        || value.platform !== 'darwin'
        || value.architecture !== 'arm64'
        || !Number.isSafeInteger(value.generation)
        || Number(value.generation) <= 0
        || !['healthy', 'pending-health', 'rollback-pending-health', 'inactive'].includes(String(value.phase))
        || !validTimestamp(value.updated_at)) {
        throw new PluginStoreError('插件激活状态字段无效');
    }
    safeSegment(value.plugin_name, 'plugin_name');
    const active = installedState(value.active, 'active');
    const previous = installedState(value.previous, 'previous');
    const lastFailed = value.last_failed === undefined
        ? undefined
        : installedState(value.last_failed, 'last_failed') ?? undefined;
    const failureCode = value.last_failure_code;
    if (failureCode !== undefined
        && (typeof failureCode !== 'string' || !/^[A-Z0-9_]{1,64}$/.test(failureCode))) {
        throw new PluginStoreError('插件激活状态错误码无效');
    }
    if ((lastFailed === undefined) !== (failureCode === undefined)) {
        throw new PluginStoreError('插件激活状态失败信息不完整');
    }
    if (active && previous && stateMatchesManifest(active, previous)) {
        throw new PluginStoreError('插件激活状态 active/previous 不能相同');
    }
    const phase = value.phase;
    const hasTransition = value.transition_id !== undefined
        || value.transition_kind !== undefined
        || value.transition_started_at !== undefined;
    if (phase === 'healthy') {
        if (!active || hasTransition)
            throw new PluginStoreError('healthy 激活状态无效');
    }
    else if (phase === 'inactive') {
        if (active || previous || hasTransition)
            throw new PluginStoreError('inactive 激活状态无效');
    }
    else {
        if (!active
            || !validTransitionId(value.transition_id)
            || !validTimestamp(value.transition_started_at)) {
            throw new PluginStoreError('插件激活过渡状态无效');
        }
        if (phase === 'pending-health'
            && !['activate', 'manual-rollback'].includes(String(value.transition_kind))) {
            throw new PluginStoreError('插件激活过渡类型无效');
        }
        if (phase === 'rollback-pending-health'
            && (value.transition_kind !== 'automatic-rollback' || previous || !lastFailed)) {
            throw new PluginStoreError('插件自动回滚状态无效');
        }
    }
    return {
        schema_version: STORE_SCHEMA_VERSION,
        plugin_name: value.plugin_name,
        platform: 'darwin',
        architecture: 'arm64',
        generation: Number(value.generation),
        phase,
        active,
        previous,
        ...(value.transition_id === undefined ? {} : { transition_id: value.transition_id }),
        ...(value.transition_kind === undefined
            ? {}
            : { transition_kind: value.transition_kind }),
        ...(value.transition_started_at === undefined
            ? {}
            : { transition_started_at: value.transition_started_at }),
        ...(lastFailed === undefined ? {} : { last_failed: lastFailed }),
        ...(failureCode === undefined ? {} : { last_failure_code: failureCode }),
        updated_at: value.updated_at,
    };
}
function processIsAlive(pid) {
    if (!Number.isSafeInteger(pid) || pid <= 0)
        return false;
    try {
        process.kill(pid, 0);
        return true;
    }
    catch (error) {
        return error.code === 'EPERM';
    }
}
export class MacOSPluginVersionStore {
    pluginName;
    pluginRoot;
    versionsRoot;
    stateRoot;
    journalPath;
    activePath;
    lockPath;
    now;
    // Serialize callers from this Electron main process before taking the
    // cross-process install lock. Status and update discovery legitimately run in
    // parallel in the renderer; they must not fail merely because the lock file is
    // currently owned by this same live PID.
    operationQueue = Promise.resolve();
    constructor(options) {
        if ((options.platform ?? process.platform) !== 'darwin') {
            throw new PluginStoreError('macOS 插件版本仓库只能在 Darwin 使用');
        }
        if (!path.isAbsolute(options.pluginsDir))
            throw new PluginStoreError('pluginsDir 必须是绝对路径');
        this.pluginName = safeSegment(options.pluginName ?? 'wechat-rpa', 'plugin_name');
        this.pluginRoot = path.join(options.pluginsDir, this.pluginName);
        this.versionsRoot = path.join(this.pluginRoot, 'versions');
        this.stateRoot = path.join(this.pluginRoot, 'state');
        this.journalPath = path.join(this.stateRoot, 'transaction.json');
        this.activePath = path.join(this.stateRoot, 'active.json');
        this.lockPath = path.join(this.stateRoot, 'install.lock');
        this.now = options.now ?? (() => new Date());
    }
    async initialize() {
        const roots = [path.dirname(this.pluginRoot), this.pluginRoot, this.versionsRoot, this.stateRoot];
        for (const directory of roots)
            await ensureOwnedDirectory(directory);
    }
    versionRoot(version) {
        return path.join(this.versionsRoot, safeSegment(version, 'version'));
    }
    /** Truthful main-owned status for the signed Control frontend, not a renderer guess. */
    async hasInstalledFrontend(installed) {
        const bundleRoot = path.join(this.versionRoot(installed.version), installed.entrypoint);
        const indexPath = path.join(bundleRoot, 'Contents', 'Resources', 'webot', 'dist', 'index.html');
        try {
            const [bundleRealPath, indexRealPath, indexStat] = await Promise.all([
                fs.promises.realpath(bundleRoot),
                fs.promises.realpath(indexPath),
                fs.promises.lstat(indexPath),
            ]);
            return indexStat.isFile() && !indexStat.isSymbolicLink()
                && indexRealPath.startsWith(`${bundleRealPath}${path.sep}`);
        }
        catch (error) {
            if (error.code === 'ENOENT')
                return false;
            throw error;
        }
    }
    markerPath(version) {
        return path.join(this.versionRoot(version), 'version.json');
    }
    manifestPath(version) {
        return path.join(this.versionRoot(version), PLUGIN_MANIFEST_NAME);
    }
    incomingRoot(journal) {
        return path.join(this.versionsRoot, `.incoming-${journal.version}-${journal.transaction_id}`);
    }
    withLock(operation) {
        const result = this.operationQueue.then(() => this.withCrossProcessLock(operation), () => this.withCrossProcessLock(operation));
        this.operationQueue = result.then(() => undefined, () => undefined);
        return result;
    }
    async withCrossProcessLock(operation) {
        await this.initialize();
        const token = crypto.randomUUID();
        for (let attempt = 0; attempt < 4; attempt += 1) {
            let acquired = false;
            try {
                const handle = await fs.promises.open(this.lockPath, 'wx', 0o600);
                try {
                    await handle.writeFile(`${JSON.stringify({ pid: process.pid, token, created_at: this.now().toISOString() })}\n`);
                    await handle.sync();
                }
                finally {
                    await handle.close();
                }
                acquired = true;
            }
            catch (error) {
                if (error.code !== 'EEXIST')
                    throw error;
                const lock = await readJson(this.lockPath);
                const pid = Number(lock?.pid);
                if (!lock || typeof lock.token !== 'string' || typeof lock.created_at !== 'string') {
                    throw new PluginStoreError('插件安装锁损坏，拒绝自动删除');
                }
                if (processIsAlive(pid))
                    throw new PluginStoreError('另一个插件安装事务仍在运行');
                const stale = `${this.lockPath}.stale.${crypto.randomUUID()}`;
                try {
                    await fs.promises.rename(this.lockPath, stale);
                    await fs.promises.rm(stale, { force: true });
                }
                catch (renameError) {
                    if (renameError.code !== 'ENOENT')
                        throw renameError;
                }
            }
            if (acquired) {
                try {
                    return await operation();
                }
                finally {
                    const lock = await readJson(this.lockPath).catch(() => null);
                    if (lock?.token === token)
                        await fs.promises.rm(this.lockPath, { force: true });
                }
            }
        }
        throw new PluginStoreError('无法取得插件安装事务锁');
    }
    async readJournalUnlocked() {
        const value = await readJson(this.journalPath);
        return value ? validateJournal(value) : null;
    }
    async readInstalledUnlocked(version) {
        const versionRoot = this.versionRoot(version);
        const rootStat = await fs.promises.lstat(versionRoot).catch((error) => {
            if (error.code === 'ENOENT')
                return null;
            throw error;
        });
        if (!rootStat)
            return null;
        if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
            throw new PluginStoreError('不可变插件版本路径不是受管目录');
        }
        const value = await readJson(this.markerPath(version));
        if (!value)
            throw new PluginStoreError('不可变插件版本目录缺少 marker');
        const installed = validateInstalled(value);
        const bundleStat = await fs.promises.lstat(path.join(versionRoot, installed.entrypoint)).catch(() => null);
        if (!bundleStat?.isDirectory() || bundleStat.isSymbolicLink()) {
            throw new PluginStoreError('不可变插件版本目录缺少固定 App Bundle');
        }
        const manifestValue = await readJson(this.manifestPath(version), MAX_SIGNED_MANIFEST_BYTES);
        if (!manifestValue)
            throw new PluginStoreError('不可变插件版本目录缺少签名清单');
        const envelope = validateSignedManifestEnvelope(manifestValue);
        if (!stateMatchesManifest(installed, payloadFactsFromEnvelope(envelope))) {
            throw new PluginStoreError('不可变插件版本签名清单与 marker 不匹配');
        }
        return installed;
    }
    async assertInstalledReferenceUnlocked(reference) {
        const installed = await this.readInstalledUnlocked(reference.version);
        if (!installed || !stateMatchesManifest(installed, reference)
            || installed.committed_at !== reference.committed_at) {
            throw new PluginStoreError('插件激活状态引用的不可变版本缺失或不匹配');
        }
    }
    async readActivationUnlocked() {
        const value = await readJson(this.activePath);
        if (!value)
            return null;
        const state = validateActivationState(value);
        if (state.plugin_name !== this.pluginName) {
            throw new PluginStoreError('插件激活状态指向其他插件');
        }
        const references = [state.active, state.previous, state.last_failed].filter((reference) => Boolean(reference));
        for (const reference of references)
            await this.assertInstalledReferenceUnlocked(reference);
        return state;
    }
    async writeActivationUnlocked(state) {
        await atomicWriteJson(this.activePath, state);
    }
    assertActivationGeneration(state, expectedGeneration) {
        if (!Number.isSafeInteger(expectedGeneration) || expectedGeneration < 0) {
            throw new PluginStoreError('expectedGeneration 必须是非负安全整数');
        }
        if ((state?.generation ?? 0) !== expectedGeneration) {
            throw new PluginStoreError('插件激活状态已变化，拒绝陈旧写入');
        }
    }
    activationBase(generation, timestamp) {
        return {
            schema_version: STORE_SCHEMA_VERSION,
            plugin_name: this.pluginName,
            platform: 'darwin',
            architecture: 'arm64',
            generation,
            updated_at: timestamp,
        };
    }
    async failPendingActivationUnlocked(state, failureCode) {
        if (!/^[A-Z0-9_]{1,64}$/.test(failureCode)) {
            throw new PluginStoreError('插件激活失败错误码无效');
        }
        if (state.phase !== 'pending-health' && state.phase !== 'rollback-pending-health') {
            throw new PluginStoreError('当前没有等待健康确认的插件激活');
        }
        const failed = state.active;
        if (!failed)
            throw new PluginStoreError('插件激活过渡缺少 active 版本');
        const timestamp = this.now().toISOString();
        if (!state.previous) {
            const inactive = {
                ...this.activationBase(state.generation + 1, timestamp),
                phase: 'inactive',
                active: null,
                previous: null,
                last_failed: failed,
                last_failure_code: failureCode,
            };
            await this.writeActivationUnlocked(inactive);
            return { action: 'deactivated', state: inactive };
        }
        const rolledBack = {
            ...this.activationBase(state.generation + 1, timestamp),
            phase: 'rollback-pending-health',
            active: state.previous,
            previous: null,
            transition_id: crypto.randomUUID(),
            transition_kind: 'automatic-rollback',
            transition_started_at: timestamp,
            last_failed: failed,
            last_failure_code: failureCode,
        };
        await this.writeActivationUnlocked(rolledBack);
        return { action: 'rollback-required', state: rolledBack };
    }
    async writeJournalUnlocked(journal) {
        await atomicWriteJson(this.journalPath, journal);
    }
    async beginInstall(manifest) {
        if (manifest.plugin_name !== this.pluginName || manifest.platform !== 'darwin'
            || manifest.architecture !== 'arm64' || manifest.entrypoint !== PLUGIN_BUNDLE_NAME
            || !/^[a-f0-9]{64}$/.test(manifest.artifact_sha256)
            || !Number.isSafeInteger(manifest.artifact_size_bytes) || manifest.artifact_size_bytes <= 0) {
            throw new PluginStoreError('Manifest 不能进入 macOS 插件版本仓库');
        }
        safeSegment(manifest.channel_id, 'channel_id');
        safeSegment(manifest.version, 'version');
        return this.withLock(async () => {
            const installed = await this.readInstalledUnlocked(manifest.version);
            if (installed) {
                if (!stateMatchesManifest(installed, manifest)) {
                    throw new PluginStoreError('不可变版本目录已被不同制品占用');
                }
                const active = await this.readJournalUnlocked();
                if (active && active.stage !== 'committed' && stateMatchesManifest(active, manifest)) {
                    const committedJournal = {
                        ...active,
                        stage: 'committed',
                        updated_at: this.now().toISOString(),
                    };
                    delete committedJournal.last_error_code;
                    await this.writeJournalUnlocked(committedJournal);
                }
                return { mode: 'already-installed', journal: null, installed };
            }
            const active = await this.readJournalUnlocked();
            if (active && active.stage !== 'committed') {
                if (!stateMatchesManifest(active, manifest)) {
                    throw new PluginStoreError('存在另一个未完成的插件安装事务');
                }
                return { mode: 'resume', journal: active, installed: null };
            }
            const timestamp = this.now().toISOString();
            const journal = {
                schema_version: STORE_SCHEMA_VERSION,
                transaction_id: crypto.randomUUID(),
                plugin_name: manifest.plugin_name,
                channel_id: manifest.channel_id,
                platform: 'darwin',
                architecture: 'arm64',
                version: manifest.version,
                version_code: manifest.version_code,
                artifact_sha256: manifest.artifact_sha256,
                artifact_size_bytes: manifest.artifact_size_bytes,
                entrypoint: manifest.entrypoint,
                stage: 'resolving',
                created_at: timestamp,
                updated_at: timestamp,
            };
            await this.writeJournalUnlocked(journal);
            return { mode: 'new', journal, installed: null };
        });
    }
    async advanceInstall(transactionId, nextStage) {
        return this.withLock(async () => {
            const journal = await this.readJournalUnlocked();
            if (!journal || journal.transaction_id !== transactionId)
                throw new PluginStoreError('插件安装事务不存在或 ID 不匹配');
            if (!NEXT_STAGES[journal.stage].includes(nextStage)) {
                throw new PluginStoreError(`插件安装阶段不能从 ${journal.stage} 跳到 ${nextStage}`);
            }
            const updated = {
                ...journal,
                stage: nextStage,
                updated_at: this.now().toISOString(),
            };
            delete updated.last_error_code;
            await this.writeJournalUnlocked(updated);
            return updated;
        });
    }
    async commitVerifiedVersion(transactionId, sourceBundlePath, signedManifest, verifyCopiedBundle) {
        return this.withLock(async () => {
            let journal = await this.readJournalUnlocked();
            if (!journal || journal.transaction_id !== transactionId)
                throw new PluginStoreError('插件安装事务不存在或 ID 不匹配');
            if (journal.stage !== 'verified' && journal.stage !== 'committing') {
                throw new PluginStoreError('只有 verified/committing 事务可以提交不可变版本');
            }
            const sourceStat = await fs.promises.lstat(sourceBundlePath).catch(() => null);
            if (!sourceStat?.isDirectory() || sourceStat.isSymbolicLink()
                || path.basename(sourceBundlePath) !== journal.entrypoint) {
                throw new PluginStoreError('待提交插件 Bundle 路径无效');
            }
            const envelope = validateSignedManifestEnvelope(signedManifest);
            if (!stateMatchesManifest(journal, payloadFactsFromEnvelope(envelope))) {
                throw new PluginStoreError('待提交签名清单与插件安装事务不匹配');
            }
            const existing = await this.readInstalledUnlocked(journal.version);
            if (existing) {
                if (!stateMatchesManifest(existing, journal)) {
                    throw new PluginStoreError('不可变版本目录已被不同制品占用');
                }
                journal = { ...journal, stage: 'committed', updated_at: this.now().toISOString() };
                await this.writeJournalUnlocked(journal);
                return { installed: existing, reused: true };
            }
            if (journal.stage === 'verified') {
                journal = { ...journal, stage: 'committing', updated_at: this.now().toISOString() };
                await this.writeJournalUnlocked(journal);
            }
            const incomingRoot = this.incomingRoot(journal);
            const copiedBundle = path.join(incomingRoot, journal.entrypoint);
            try {
                await fs.promises.rm(incomingRoot, { recursive: true, force: true });
                await fs.promises.mkdir(incomingRoot, { mode: 0o700 });
                await fs.promises.cp(sourceBundlePath, copiedBundle, {
                    recursive: true,
                    dereference: false,
                    errorOnExist: true,
                    force: false,
                    verbatimSymlinks: true,
                });
                await verifyCopiedBundle(copiedBundle);
                const committedAt = this.now().toISOString();
                const installed = journalToInstalled(journal, committedAt);
                await atomicWriteJson(path.join(incomingRoot, PLUGIN_MANIFEST_NAME), envelope);
                await atomicWriteJson(path.join(incomingRoot, 'version.json'), installed);
                await fs.promises.rename(incomingRoot, this.versionRoot(journal.version));
                journal = { ...journal, stage: 'committed', updated_at: committedAt };
                delete journal.last_error_code;
                await this.writeJournalUnlocked(journal);
                return { installed, reused: false };
            }
            catch (error) {
                await fs.promises.rm(incomingRoot, { recursive: true, force: true }).catch(() => { });
                const retryable = {
                    ...journal,
                    stage: 'verified',
                    updated_at: this.now().toISOString(),
                    last_error_code: 'VERSION_COMMIT_FAILED',
                };
                await this.writeJournalUnlocked(retryable).catch(() => { });
                throw error;
            }
        });
    }
    async inspectRecovery() {
        return this.withLock(async () => {
            let journal = await this.readJournalUnlocked();
            if (!journal)
                return { action: 'none', journal: null };
            if (journal.stage === 'committed')
                return { action: 'committed', journal };
            const installed = await this.readInstalledUnlocked(journal.version);
            if (installed && stateMatchesManifest(installed, journal)) {
                journal = { ...journal, stage: 'committed', updated_at: this.now().toISOString() };
                delete journal.last_error_code;
                await this.writeJournalUnlocked(journal);
                await fs.promises.rm(this.incomingRoot(journal), { recursive: true, force: true });
                return { action: 'committed', journal };
            }
            if (journal.stage === 'committing') {
                await fs.promises.rm(this.incomingRoot(journal), { recursive: true, force: true });
                journal = {
                    ...journal,
                    stage: 'verified',
                    updated_at: this.now().toISOString(),
                    last_error_code: 'COMMIT_INTERRUPTED',
                };
                await this.writeJournalUnlocked(journal);
            }
            return { action: 'resume', journal };
        });
    }
    async readInstalledVersion(version) {
        return this.withLock(() => this.readInstalledUnlocked(version));
    }
    async readInstalledManifestEnvelope(version) {
        return this.withLock(async () => {
            const installed = await this.readInstalledUnlocked(version);
            if (!installed)
                return null;
            const value = await readJson(this.manifestPath(version), MAX_SIGNED_MANIFEST_BYTES);
            if (!value)
                throw new PluginStoreError('不可变插件版本目录缺少签名清单');
            return validateSignedManifestEnvelope(value);
        });
    }
    /**
     * Atomically selects an immutable version, but leaves it pending until the
     * process driver proves health. expectedGeneration=0 means no active.json.
     */
    async activateInstalledVersion(version, expectedGeneration) {
        return this.withLock(async () => {
            const current = await this.readActivationUnlocked();
            this.assertActivationGeneration(current, expectedGeneration);
            if (current && current.phase !== 'healthy' && current.phase !== 'inactive') {
                throw new PluginStoreError('插件激活过渡尚未完成');
            }
            const target = await this.readInstalledUnlocked(version);
            if (!target)
                throw new PluginStoreError('待激活的不可变插件版本不存在');
            if (current?.phase === 'healthy' && current.active) {
                if (stateMatchesManifest(current.active, target)
                    && current.active.committed_at === target.committed_at) {
                    return { changed: false, state: current };
                }
                if (target.version_code <= current.active.version_code) {
                    throw new PluginStoreError('常规激活禁止降级或复用 version_code，请使用 previous 回滚');
                }
            }
            const timestamp = this.now().toISOString();
            const next = {
                ...this.activationBase(expectedGeneration + 1, timestamp),
                phase: 'pending-health',
                active: target,
                previous: current?.phase === 'healthy' ? current.active : null,
                transition_id: crypto.randomUUID(),
                transition_kind: 'activate',
                transition_started_at: timestamp,
            };
            await this.writeActivationUnlocked(next);
            return { changed: true, state: next };
        });
    }
    /** Begin an explicit rollback without allowing callers to name an arbitrary older version. */
    async rollbackToPrevious(expectedGeneration) {
        return this.withLock(async () => {
            const current = await this.readActivationUnlocked();
            this.assertActivationGeneration(current, expectedGeneration);
            if (!current || current.phase !== 'healthy' || !current.active || !current.previous) {
                throw new PluginStoreError('当前没有可回滚的上一健康版本');
            }
            const timestamp = this.now().toISOString();
            const next = {
                ...this.activationBase(current.generation + 1, timestamp),
                phase: 'pending-health',
                active: current.previous,
                previous: current.active,
                transition_id: crypto.randomUUID(),
                transition_kind: 'manual-rollback',
                transition_started_at: timestamp,
            };
            await this.writeActivationUnlocked(next);
            return next;
        });
    }
    /** Commit health for the exact transition owner; stale process callbacks are rejected. */
    async confirmActivationHealthy(transitionId, expectedGeneration) {
        return this.withLock(async () => {
            const current = await this.readActivationUnlocked();
            this.assertActivationGeneration(current, expectedGeneration);
            if (!current
                || (current.phase !== 'pending-health' && current.phase !== 'rollback-pending-health')
                || current.transition_id !== transitionId
                || !current.active) {
                throw new PluginStoreError('插件健康确认不属于当前激活过渡');
            }
            const timestamp = this.now().toISOString();
            const healthy = {
                ...this.activationBase(current.generation + 1, timestamp),
                phase: 'healthy',
                active: current.active,
                previous: current.previous,
                ...(current.last_failed ? { last_failed: current.last_failed } : {}),
                ...(current.last_failure_code ? { last_failure_code: current.last_failure_code } : {}),
            };
            await this.writeActivationUnlocked(healthy);
            return healthy;
        });
    }
    /** Record health failure and atomically point back to the known fallback, if any. */
    async failPendingActivation(transitionId, expectedGeneration, failureCode) {
        return this.withLock(async () => {
            const current = await this.readActivationUnlocked();
            this.assertActivationGeneration(current, expectedGeneration);
            if (!current || current.transition_id !== transitionId) {
                throw new PluginStoreError('插件激活失败不属于当前激活过渡');
            }
            return this.failPendingActivationUnlocked(current, failureCode);
        });
    }
    /**
     * Conservative crash recovery: an unconfirmed candidate is never promoted.
     * The pointer is restored once; a second restart returns the same rollback
     * transition so the future LaunchServices driver can verify it.
     */
    async recoverInterruptedActivation() {
        return this.withLock(async () => {
            const current = await this.readActivationUnlocked();
            if (!current || current.phase === 'healthy' || current.phase === 'inactive') {
                return { action: 'none', state: current };
            }
            if (current.phase === 'rollback-pending-health') {
                return { action: 'verify-rollback', state: current };
            }
            return this.failPendingActivationUnlocked(current, 'ACTIVATION_INTERRUPTED');
        });
    }
    async readActivationState() {
        return this.withLock(() => this.readActivationUnlocked());
    }
}
