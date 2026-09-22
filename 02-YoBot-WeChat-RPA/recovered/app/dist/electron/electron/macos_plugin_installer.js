import * as fs from 'node:fs';
import * as path from 'node:path';
import { downloadPluginArtifact, PluginArtifactIntegrityError, } from './plugin_artifact_download.js';
import { extractPluginArchiveSecurely, PluginArchiveValidationError, } from './plugin_archive.js';
import { MacOSPluginIdentityError, verifyMacOSPluginIdentity, } from './macos_plugin_identity.js';
import { PluginStoreError, } from './macos_plugin_store.js';
import { RPA_MACOS_BUNDLE_NAME, RPA_MACOS_CONTROL_BUNDLE_ID, RPA_MACOS_HELPER_BUNDLE_ID, RPA_MACOS_TEAM_ID, } from './plugin_manifest.js';
export class MacOSPluginInstallerError extends Error {
    code;
    causeCode;
    constructor(code, message, causeCode) {
        super(message);
        this.name = 'MacOSPluginInstallerError';
        this.code = code;
        this.causeCode = causeCode;
    }
    toJSON() {
        return {
            name: this.name,
            code: this.code,
            ...(this.causeCode ? { causeCode: this.causeCode } : {}),
            message: this.message,
        };
    }
}
const RESUMABLE_STAGES = new Set([
    'resolving',
    'downloading',
    'downloaded',
    'extracting',
    'extracted',
    'verifying',
    'verified',
]);
function safeSegment(value, label) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._+-]{0,127}$/.test(value) || value === '.' || value === '..') {
        throw installerError('MACOS_PLUGIN_INSTALLER_MANIFEST_INVALID', `${label} 无效`);
    }
    return value;
}
function boundedCauseCode(error) {
    if (error instanceof MacOSPluginInstallerError)
        return error.code;
    if (error instanceof PluginArtifactIntegrityError)
        return 'PLUGIN_ARTIFACT_INTEGRITY_ERROR';
    if (error instanceof PluginArchiveValidationError)
        return 'PLUGIN_ARCHIVE_VALIDATION_ERROR';
    if (error instanceof MacOSPluginIdentityError)
        return error.code;
    if (error instanceof PluginStoreError)
        return 'MACOS_PLUGIN_STORE_ERROR';
    if (error && typeof error === 'object') {
        const value = error.code;
        if (typeof value === 'string' && /^[A-Z0-9_]{1,64}$/.test(value))
            return value;
    }
    return undefined;
}
function installerError(code, message, cause) {
    return new MacOSPluginInstallerError(code, message, boundedCauseCode(cause));
}
function exactEnvelopePayload(manifest) {
    const encoded = manifest.envelope?.payload;
    if (typeof encoded !== 'string' || encoded.length === 0 || encoded.length > 96 * 1024
        || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))
        return false;
    try {
        const bytes = Buffer.from(encoded, 'base64');
        if (bytes.length === 0 || bytes.length > 64 * 1024
            || bytes.toString('base64').replace(/=+$/, '') !== encoded.replace(/=+$/, ''))
            return false;
        const signedPayload = JSON.parse(bytes.toString('utf8'));
        return JSON.stringify(signedPayload) === JSON.stringify(manifest.payload);
    }
    catch {
        return false;
    }
}
function requireVerifiedMacManifest(manifest) {
    const envelope = manifest?.envelope;
    const payload = manifest?.payload;
    const signature = typeof envelope?.signature === 'string'
        && /^[A-Za-z0-9+/]+={0,2}$/.test(envelope.signature)
        ? Buffer.from(envelope.signature, 'base64')
        : null;
    if (!envelope || envelope.format_version !== 2 || envelope.algorithm !== 'Ed25519'
        || typeof envelope.key_id !== 'string' || !/^[a-z0-9._-]{1,64}$/i.test(envelope.key_id)
        || !signature || signature.length !== 64
        || signature.toString('base64').replace(/=+$/, '') !== envelope.signature.replace(/=+$/, '')
        || !payload || !exactEnvelopePayload(manifest)) {
        throw installerError('MACOS_PLUGIN_INSTALLER_MANIFEST_INVALID', '已验签插件清单在进入安装事务前发生漂移');
    }
    const identity = payload.macos_identity;
    if (payload.schema_version !== 2 || payload.plugin_name !== 'wechat-rpa'
        || payload.channel_id !== 'agent_generic' || payload.platform !== 'darwin'
        || payload.architecture !== 'arm64' || payload.archive_format !== 'zip'
        || payload.artifact_type !== 'macos-app-bundle' || payload.entrypoint !== RPA_MACOS_BUNDLE_NAME
        || payload.runtime_contract_version !== '1.0' || payload.release_status !== 'active'
        || !identity || identity.bundle_name !== RPA_MACOS_BUNDLE_NAME
        || identity.control_bundle_identifier !== RPA_MACOS_CONTROL_BUNDLE_ID
        || identity.helper_bundle_identifier !== RPA_MACOS_HELPER_BUNDLE_ID
        || identity.team_identifier !== RPA_MACOS_TEAM_ID
        || identity.build_channel !== 'production' || identity.capability_wave !== 'none') {
        throw installerError('MACOS_PLUGIN_INSTALLER_MANIFEST_INVALID', '已验签插件清单不属于官方 macOS RPA 发布目标');
    }
    safeSegment(payload.version, '插件版本');
    return payload;
}
function requireCurrentManifest(manifest, now) {
    const issuedAt = Date.parse(manifest.issued_at);
    const expiresAt = Date.parse(manifest.expires_at);
    if (!Number.isFinite(now) || !Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)
        || issuedAt > now + 10 * 60 * 1000 || expiresAt <= now) {
        throw installerError('MACOS_PLUGIN_INSTALLER_MANIFEST_INVALID', '已验签插件清单在安装事务期间已失效');
    }
}
async function ensurePrivateDirectory(directory, label) {
    if (!path.isAbsolute(directory)) {
        throw installerError('MACOS_PLUGIN_INSTALLER_STATE_INVALID', `${label} 必须是绝对路径`);
    }
    await fs.promises.mkdir(directory, { recursive: true, mode: 0o700 });
    const stat = await fs.promises.lstat(directory).catch(() => null);
    if (!stat?.isDirectory() || stat.isSymbolicLink()) {
        throw installerError('MACOS_PLUGIN_INSTALLER_STATE_INVALID', `${label} 不是受管目录`);
    }
    await fs.promises.chmod(directory, 0o700).catch(() => { });
}
async function resetTransactionStaging(stagingRoot, target) {
    if (path.dirname(target) !== stagingRoot) {
        throw installerError('MACOS_PLUGIN_INSTALLER_STATE_INVALID', '插件 staging 路径越出受管目录');
    }
    const stat = await fs.promises.lstat(target).catch((error) => {
        if (error.code === 'ENOENT')
            return null;
        throw error;
    });
    if (!stat)
        return;
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
        throw installerError('MACOS_PLUGIN_INSTALLER_STATE_INVALID', '插件 staging 被非目录或 symlink 占用');
    }
    await fs.promises.rm(target, { recursive: true, force: true });
}
function journalMatchesManifest(journal, manifest) {
    return journal.plugin_name === manifest.plugin_name
        && journal.channel_id === manifest.channel_id
        && journal.platform === manifest.platform
        && journal.architecture === manifest.architecture
        && journal.version === manifest.version
        && journal.version_code === manifest.version_code
        && journal.artifact_sha256 === manifest.artifact_sha256
        && journal.artifact_size_bytes === manifest.artifact_size_bytes
        && journal.entrypoint === manifest.entrypoint;
}
function reportProgress(request, progress) {
    try {
        request.onProgress?.(progress);
    }
    catch {
        // UI/event observers do not own the durable install transaction.
    }
}
function throwIfCancelled(request) {
    if (request.signal?.aborted) {
        throw installerError('MACOS_PLUGIN_INSTALLER_CANCELLED', 'macOS RPA 插件安装已取消，可从当前安全阶段继续');
    }
}
async function cleanupAndThrowIfCancelled(request, stagingRoot, transactionStaging) {
    if (!request.signal?.aborted)
        return;
    await resetTransactionStaging(stagingRoot, transactionStaging).catch(() => { });
    throwIfCancelled(request);
}
function requireJournal(begin, recovery) {
    const journal = recovery.journal ?? begin.journal;
    if (!journal || !begin.journal || journal.transaction_id !== begin.journal.transaction_id
        || recovery.action !== 'resume' || !RESUMABLE_STAGES.has(journal.stage)) {
        throw installerError('MACOS_PLUGIN_INSTALLER_STATE_INVALID', '插件安装恢复状态与当前事务不一致');
    }
    return journal;
}
function requireDownloadResult(result, destinationPath, manifest) {
    if (result.path !== destinationPath || result.sha256 !== manifest.artifact_sha256
        || result.bytes !== manifest.artifact_size_bytes) {
        throw installerError('MACOS_PLUGIN_INSTALLER_DOWNLOAD_FAILED', '插件下载结果与已验签清单不一致', new PluginArtifactIntegrityError('download result mismatch'));
    }
}
function requireExtractResult(result, stagingDir, manifest) {
    if (result.stagingDir !== stagingDir
        || result.entrypointPath !== path.join(stagingDir, manifest.entrypoint)) {
        throw installerError('MACOS_PLUGIN_INSTALLER_EXTRACT_FAILED', '插件解包结果越出当前安装事务', new PluginArchiveValidationError('extract result mismatch'));
    }
}
function requireIdentityResult(identity, manifest) {
    const expected = manifest.macos_identity;
    if (!expected || identity.controlBundleIdentifier !== expected.control_bundle_identifier
        || identity.helperBundleIdentifier !== expected.helper_bundle_identifier
        || identity.teamIdentifier !== expected.team_identifier || identity.version !== manifest.version
        || identity.controlBundleVersion !== expected.control_bundle_version
        || identity.helperBundleVersion !== expected.helper_bundle_version
        || identity.architecture !== 'arm64' || !Number.isSafeInteger(identity.machoFileCount)
        || identity.machoFileCount <= 0 || identity.hardenedRuntime !== true
        || identity.gatekeeperAccepted !== true || identity.notarizationStapled !== true) {
        throw installerError('MACOS_PLUGIN_INSTALLER_IDENTITY_FAILED', '插件身份验证结果与已验签清单不一致', new MacOSPluginIdentityError('identity result mismatch'));
    }
}
/**
 * Main-process-only coordinator for the Darwin install half of the RPA lifecycle.
 * It accepts only the capability returned by verifySignedPluginManifestV2; it
 * never resolves URLs or trusts archive paths supplied by a renderer.
 */
export class MacOSPluginInstallerCoordinator {
    store;
    downloadsDir;
    stagingDir;
    fetchFn;
    downloadArtifact;
    extractArchive;
    verifyIdentity;
    now;
    operationActive = false;
    constructor(options) {
        if ((options.platform ?? process.platform) !== 'darwin') {
            throw installerError('MACOS_PLUGIN_INSTALLER_STATE_INVALID', 'macOS 插件安装协调器只能在 Darwin 使用');
        }
        if (!path.isAbsolute(options.downloadsDir) || !path.isAbsolute(options.stagingDir)
            || path.resolve(options.downloadsDir) === path.resolve(options.stagingDir)) {
            throw installerError('MACOS_PLUGIN_INSTALLER_STATE_INVALID', '插件下载和 staging 必须是不同的绝对路径');
        }
        this.store = options.store;
        this.downloadsDir = path.resolve(options.downloadsDir);
        this.stagingDir = path.resolve(options.stagingDir);
        this.fetchFn = options.fetchFn ?? fetch;
        this.downloadArtifact = options.downloadArtifact ?? downloadPluginArtifact;
        this.extractArchive = options.extractArchive ?? extractPluginArchiveSecurely;
        this.now = options.now ?? Date.now;
        this.verifyIdentity = options.verifyIdentity ?? ((bundlePath, manifest) => verifyMacOSPluginIdentity(bundlePath, manifest, { ...options.identityDependencies, platform: 'darwin' }));
    }
    async advance(journal, nextStage, request) {
        try {
            const updated = await this.store.advanceInstall(journal.transaction_id, nextStage);
            reportProgress(request, { stage: updated.stage });
            return updated;
        }
        catch (error) {
            throw installerError('MACOS_PLUGIN_INSTALLER_STATE_INVALID', '插件安装状态推进失败', error);
        }
    }
    async installExclusive(verifiedManifest, request) {
        const manifest = requireVerifiedMacManifest(verifiedManifest);
        requireCurrentManifest(manifest, this.now());
        throwIfCancelled(request);
        try {
            await ensurePrivateDirectory(this.downloadsDir, '插件下载目录');
            await ensurePrivateDirectory(this.stagingDir, '插件 staging 根目录');
        }
        catch (error) {
            if (error instanceof MacOSPluginInstallerError)
                throw error;
            throw installerError('MACOS_PLUGIN_INSTALLER_STATE_INVALID', '无法准备 macOS 插件安装目录', error);
        }
        let begin;
        try {
            begin = await this.store.beginInstall(manifest);
        }
        catch (error) {
            throw installerError('MACOS_PLUGIN_INSTALLER_STATE_INVALID', '无法建立插件安装事务', error);
        }
        if (begin.mode === 'already-installed' && begin.installed) {
            let completed;
            try {
                completed = await this.store.inspectRecovery();
                if (completed.journal && completed.action === 'committed'
                    && journalMatchesManifest(completed.journal, manifest)) {
                    const completedStaging = path.join(this.stagingDir, `${safeSegment(manifest.plugin_name, '插件名称')}-${safeSegment(manifest.version, '插件版本')}-${safeSegment(completed.journal.transaction_id, '事务 ID')}`);
                    await resetTransactionStaging(this.stagingDir, completedStaging);
                }
            }
            catch (error) {
                if (error instanceof MacOSPluginInstallerError)
                    throw error;
                throw installerError('MACOS_PLUGIN_INSTALLER_STATE_INVALID', '无法收口已完成插件安装事务', error);
            }
            return { mode: 'already-installed', installed: begin.installed };
        }
        let recovery;
        try {
            recovery = await this.store.inspectRecovery();
        }
        catch (error) {
            throw installerError('MACOS_PLUGIN_INSTALLER_STATE_INVALID', '无法恢复插件安装事务', error);
        }
        let journal = requireJournal(begin, recovery);
        reportProgress(request, { stage: journal.stage });
        if (journal.stage === 'resolving')
            journal = await this.advance(journal, 'downloading', request);
        const artifactName = [
            safeSegment(manifest.plugin_name, '插件名称'),
            safeSegment(manifest.version, '插件版本'),
            manifest.artifact_sha256,
        ].join('-');
        const artifactPath = path.join(this.downloadsDir, `${artifactName}.zip`);
        const transactionStaging = path.join(this.stagingDir, `${safeSegment(manifest.plugin_name, '插件名称')}-${safeSegment(manifest.version, '插件版本')}-${safeSegment(journal.transaction_id, '事务 ID')}`);
        let artifact;
        try {
            artifact = await this.downloadArtifact({
                artifactUrl: manifest.artifact_url,
                expectedSha256: manifest.artifact_sha256,
                expectedSizeBytes: manifest.artifact_size_bytes,
                destinationPath: artifactPath,
                fetchFn: this.fetchFn,
                signal: request.signal,
                onProgress: (progress) => reportProgress(request, { stage: 'downloading', ...progress }),
            });
            requireDownloadResult(artifact, artifactPath, manifest);
        }
        catch (error) {
            if (error instanceof MacOSPluginInstallerError)
                throw error;
            throw installerError('MACOS_PLUGIN_INSTALLER_DOWNLOAD_FAILED', 'macOS RPA 插件下载或摘要验证失败', error);
        }
        if (journal.stage === 'downloading')
            journal = await this.advance(journal, 'downloaded', request);
        if (journal.stage === 'downloaded')
            journal = await this.advance(journal, 'extracting', request);
        throwIfCancelled(request);
        try {
            await resetTransactionStaging(this.stagingDir, transactionStaging);
        }
        catch (error) {
            if (error instanceof MacOSPluginInstallerError)
                throw error;
            throw installerError('MACOS_PLUGIN_INSTALLER_STATE_INVALID', '无法清理当前插件安装 staging', error);
        }
        let extracted;
        try {
            extracted = await this.extractArchive({
                zipPath: artifactPath,
                stagingDir: transactionStaging,
                expectedEntrypoint: manifest.entrypoint,
            });
            requireExtractResult(extracted, transactionStaging, manifest);
        }
        catch (error) {
            await resetTransactionStaging(this.stagingDir, transactionStaging).catch(() => { });
            if (error instanceof MacOSPluginInstallerError)
                throw error;
            throw installerError('MACOS_PLUGIN_INSTALLER_EXTRACT_FAILED', 'macOS RPA 插件安全解包失败', error);
        }
        if (journal.stage === 'extracting')
            journal = await this.advance(journal, 'extracted', request);
        if (journal.stage === 'extracted')
            journal = await this.advance(journal, 'verifying', request);
        await cleanupAndThrowIfCancelled(request, this.stagingDir, transactionStaging);
        try {
            requireCurrentManifest(manifest, this.now());
        }
        catch (error) {
            await resetTransactionStaging(this.stagingDir, transactionStaging).catch(() => { });
            throw error;
        }
        let identity;
        try {
            identity = await this.verifyIdentity(extracted.entrypointPath, manifest);
            requireIdentityResult(identity, manifest);
        }
        catch (error) {
            await resetTransactionStaging(this.stagingDir, transactionStaging).catch(() => { });
            if (error instanceof MacOSPluginInstallerError)
                throw error;
            throw installerError('MACOS_PLUGIN_INSTALLER_IDENTITY_FAILED', 'macOS RPA 插件签名、公证或产品身份验证失败', error);
        }
        if (journal.stage === 'verifying')
            journal = await this.advance(journal, 'verified', request);
        if (journal.stage !== 'verified') {
            await resetTransactionStaging(this.stagingDir, transactionStaging).catch(() => { });
            throw installerError('MACOS_PLUGIN_INSTALLER_STATE_INVALID', '插件安装事务未处于可提交阶段');
        }
        await cleanupAndThrowIfCancelled(request, this.stagingDir, transactionStaging);
        try {
            requireCurrentManifest(manifest, this.now());
        }
        catch (error) {
            await resetTransactionStaging(this.stagingDir, transactionStaging).catch(() => { });
            throw error;
        }
        let committed;
        try {
            committed = await this.store.commitVerifiedVersion(journal.transaction_id, extracted.entrypointPath, verifiedManifest.envelope, async (copiedBundlePath) => {
                const copiedIdentity = await this.verifyIdentity(copiedBundlePath, manifest);
                requireIdentityResult(copiedIdentity, manifest);
            });
        }
        catch (error) {
            await resetTransactionStaging(this.stagingDir, transactionStaging).catch(() => { });
            throw installerError('MACOS_PLUGIN_INSTALLER_COMMIT_FAILED', 'macOS RPA 插件不可变版本提交失败', error);
        }
        try {
            await resetTransactionStaging(this.stagingDir, transactionStaging);
        }
        catch (error) {
            if (error instanceof MacOSPluginInstallerError)
                throw error;
            throw installerError('MACOS_PLUGIN_INSTALLER_STATE_INVALID', '插件已提交，但安装 staging 尚未安全清理', error);
        }
        reportProgress(request, { stage: 'committed' });
        return {
            mode: 'installed',
            installed: committed.installed,
            artifact: {
                bytes: artifact.bytes,
                sha256: artifact.sha256,
                resumed: artifact.resumed,
                reused: artifact.reused,
            },
            identity,
            commitReused: committed.reused,
        };
    }
    async install(verifiedManifest, request = {}) {
        if (this.operationActive) {
            throw installerError('MACOS_PLUGIN_INSTALLER_STATE_INVALID', '已有 macOS 插件安装操作正在运行');
        }
        this.operationActive = true;
        try {
            return await this.installExclusive(verifiedManifest, request);
        }
        finally {
            this.operationActive = false;
        }
    }
}
