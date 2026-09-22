import { app, autoUpdater as nativeAutoUpdater, net } from 'electron';
import electronUpdater from 'electron-updater';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { appUpdatePolicyTargetQuery, createInitialSnapshot, isAppUpdateRuntimeConfigured, normalizeClientPolicy, reconcilePolicyForCurrentVersion, resolveAppUpdateTarget, resolveAppUpdateSnapshotTarget, shouldAutoDownload, shouldBlockRpa, shouldOfferUpdate, versionToCode, } from './app_update_contract.js';
import { MAX_APP_UPDATE_MANIFEST_BYTES, parseTrustedAppUpdateKeys, resolveUpdateArtifactUrl, verifySignedAppUpdateManifest, } from './app_update_manifest.js';
import { composeAppUpdateInstallDriver } from './app_update_install_driver_composition.js';
import { installMacOSUpdateWithSquirrel } from './macos_squirrel_update_installer.js';
import { APP_UPDATE_REQUEST_TIMEOUT_CODE, AppUpdateRequestTimeoutError, runWithAppUpdateRequestDeadline, } from './app_update_request_deadline.js';
// electron-updater 6.x is CommonJS. A runtime named import passes TypeScript
// but crashes packaged Electron ESM before app.ready; use the CJS default
// namespace and extract the getter-backed autoUpdater from it.
const { autoUpdater } = electronUpdater;
const UPDATE_REQUEST_TIMEOUT_MS = 5_000;
const MAX_APP_UPDATE_POLICY_BYTES = 256 * 1024;
const MAX_INSTALL_ATTEMPTS = 3;
function classifyPolicyRefreshFailure(error, stage) {
    if (error instanceof AppUpdateRequestTimeoutError)
        return APP_UPDATE_REQUEST_TIMEOUT_CODE;
    if (error && typeof error === 'object') {
        const name = 'name' in error ? String(error.name || '') : '';
        if (name === 'AbortError')
            return 'REQUEST_ABORTED';
        const rawCode = 'code' in error ? String(error.code || '') : '';
        if (/^[A-Z0-9_-]{1,48}$/.test(rawCode))
            return `NETWORK_${rawCode}`;
    }
    if (stage === 'configuration')
        return 'POLICY_CONFIGURATION_INVALID';
    if (stage === 'policy-url')
        return 'POLICY_URL_REJECTED';
    if (stage === 'policy-response')
        return 'POLICY_RESPONSE_INVALID';
    if (stage === 'manifest')
        return 'MANIFEST_REFRESH_FAILED';
    if (stage === 'state-commit')
        return 'POLICY_STATE_COMMIT_FAILED';
    return 'POLICY_NETWORK_ERROR';
}
function safeSegment(value) {
    return value.replace(/[^a-z0-9_.-]/gi, '_').slice(0, 100) || 'unknown';
}
function publisherNamesFromAppUpdateConfig() {
    try {
        const content = fs.readFileSync(path.join(process.resourcesPath, 'app-update.yml'), 'utf8');
        const lines = content.split(/\r?\n/);
        const index = lines.findIndex((line) => /^publisherName\s*:/i.test(line.trim()));
        if (index < 0)
            return [];
        const inline = lines[index].replace(/^\s*publisherName\s*:\s*/i, '').trim();
        if (inline) {
            return inline.replace(/^\[|\]$/g, '').split(',').map((item) => item.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
        }
        const names = [];
        for (let i = index + 1; i < lines.length; i++) {
            const match = lines[i].match(/^\s+-\s+(.+?)\s*$/);
            if (!match)
                break;
            names.push(match[1].replace(/^['"]|['"]$/g, ''));
        }
        return names.filter(Boolean);
    }
    catch {
        return [];
    }
}
function manifestKeysFromPackagedEnvironment() {
    if (!app.isPackaged)
        return '';
    try {
        const content = fs.readFileSync(path.join(process.resourcesPath, '.env'), 'utf8');
        for (const line of content.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#'))
                continue;
            const separator = trimmed.indexOf('=');
            if (separator <= 0)
                continue;
            if (trimmed.slice(0, separator).trim() === 'APP_UPDATE_ED25519_PUBLIC_KEYS') {
                return trimmed.slice(separator + 1).trim();
            }
        }
    }
    catch {
        // Missing/corrupt packaged trust roots disable automatic installation.
    }
    return '';
}
export class DesktopUpdateManager {
    options;
    stateDir;
    statePath;
    persisted;
    checking = null;
    updaterConfiguredFeed = null;
    trustedManifestKeys;
    manifestKeyConfigurationError;
    trustedPublisherNames;
    updateTarget;
    installDriver;
    constructor(options) {
        this.options = options;
        this.updateTarget = resolveAppUpdateTarget();
        const stateBaseDirectory = options.stateBaseDirectory
            || process.env.LOCALAPPDATA
            || app.getPath('appData');
        if (!path.isAbsolute(stateBaseDirectory) || stateBaseDirectory.includes('\0')) {
            throw new Error('应用更新状态根目录必须是绝对路径');
        }
        this.stateDir = path.join(stateBaseDirectory, 'YokoUpdater', safeSegment(options.appId), safeSegment(options.channelId));
        this.statePath = path.join(this.stateDir, 'state.json');
        this.installDriver = options.installDriver
            ?? composeAppUpdateInstallDriver({
                target: this.updateTarget,
                appId: options.appId,
                channelId: options.channelId,
                macOSStagingRoot: options.macOSStagingRoot,
                macOSInstallWithSquirrel: (downloadedFile) => installMacOSUpdateWithSquirrel({
                    downloadedFile,
                    bundleIdentifier: options.appId,
                    nativeUpdater: nativeAutoUpdater,
                }),
            });
        let trustedManifestKeys = new Map();
        let manifestKeyConfigurationError = null;
        try {
            const configuredKeys = app.isPackaged
                ? manifestKeysFromPackagedEnvironment()
                : String(options.trustedManifestKeys || '');
            trustedManifestKeys = parseTrustedAppUpdateKeys(configuredKeys);
        }
        catch (error) {
            manifestKeyConfigurationError = error instanceof Error ? error.message : String(error);
            console.error('[AppUpdater] Invalid Ed25519 public key configuration:', error);
        }
        this.trustedManifestKeys = trustedManifestKeys;
        this.manifestKeyConfigurationError = manifestKeyConfigurationError;
        this.persisted = this.readPersisted();
        this.trustedPublisherNames = Array.from(new Set([
            ...(options.publisherNames || []),
            ...publisherNamesFromAppUpdateConfig(),
        ]));
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = false;
        autoUpdater.allowDowngrade = false;
        autoUpdater.allowPrerelease = false;
        autoUpdater.logger = {
            info: (message) => console.log('[AppUpdater]', message),
            warn: (message) => console.warn('[AppUpdater]', message),
            error: (message) => console.error('[AppUpdater]', message),
            debug: (message) => console.debug('[AppUpdater]', message),
        };
        this.bindUpdaterEvents();
    }
    readPersisted() {
        const initial = createInitialSnapshot(this.options.channelId, app.getVersion());
        try {
            const parsed = JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
            const snapshot = { ...initial, ...(parsed.snapshot || {}) };
            snapshot.channelId = this.options.channelId;
            snapshot.currentVersion = app.getVersion();
            snapshot.currentVersionCode = initial.currentVersionCode;
            snapshot.policy = reconcilePolicyForCurrentVersion(normalizeClientPolicy(parsed.snapshot?.policy), snapshot.currentVersionCode, snapshot.targetVersionCode);
            if (snapshot.phase === 'checking' || snapshot.phase === 'downloading' || snapshot.phase === 'installing') {
                snapshot.phase = snapshot.downloadedFile && fs.existsSync(snapshot.downloadedFile) ? 'ready' : 'idle';
            }
            return {
                cohort: Number.isInteger(parsed.cohort) ? Math.max(0, Math.min(99, parsed.cohort)) : crypto.randomInt(0, 100),
                snapshot,
                release: parsed.release || null,
                artifactVersion: parsed.artifactVersion || null,
                artifactSha512: parsed.artifactSha512 || null,
                manifestEnvelope: parsed.manifestEnvelope || null,
                policyFetchedAt: parsed.policyFetchedAt || null,
            };
        }
        catch {
            return {
                cohort: crypto.randomInt(0, 100),
                snapshot: initial,
                release: null,
                artifactVersion: null,
                artifactSha512: null,
                manifestEnvelope: null,
                policyFetchedAt: null,
            };
        }
    }
    persist() {
        const temp = `${this.statePath}.${process.pid}.tmp`;
        try {
            fs.mkdirSync(this.stateDir, { recursive: true });
            fs.writeFileSync(temp, JSON.stringify(this.persisted, null, 2), 'utf8');
            fs.renameSync(temp, this.statePath);
        }
        catch (error) {
            try {
                fs.unlinkSync(temp);
            }
            catch { /* best effort */ }
            console.warn('[AppUpdater] Failed to persist update state; continuing without durable pending state:', error);
        }
    }
    updateSnapshot(patch, policyChanged = false) {
        this.persisted.snapshot = {
            ...this.persisted.snapshot,
            ...patch,
            updatedAt: new Date().toISOString(),
        };
        this.persist();
        const snapshot = this.getSnapshot();
        this.options.onStateChange?.(snapshot);
        if (policyChanged)
            this.options.onPolicyChange?.(snapshot);
    }
    reportLifecycle(event, details) {
        try {
            this.options.onLifecycleEvent?.(event, details);
        }
        catch (error) {
            console.warn('[AppUpdater] Lifecycle reporter failed:', error);
        }
    }
    getSnapshot() {
        return JSON.parse(JSON.stringify(this.persisted.snapshot));
    }
    getRpaEnvironment() {
        const snapshot = this.persisted.snapshot;
        return {
            RPA_UPDATE_BLOCKED: shouldBlockRpa(snapshot.policy) ? 'true' : 'false',
            RPA_UPDATE_ACTION: snapshot.policy.rpa_action,
            RPA_UPDATE_REQUIRED_VERSION: snapshot.targetVersion || '',
            RPA_UPDATE_REQUIRED_VERSION_CODE: String(snapshot.policy.min_rpa_version_code || 0),
        };
    }
    validatedArtifactUrl(raw, label) {
        let parsed;
        try {
            parsed = new URL(raw);
        }
        catch {
            throw new Error(`${label}不是有效 URL`);
        }
        if (parsed.protocol !== 'https:' && app.isPackaged) {
            throw new Error(`生产环境${label}必须使用 HTTPS`);
        }
        const allowed = (this.options.allowedFeedHosts || []).map((host) => host.toLowerCase());
        if (allowed.length > 0 && !allowed.includes(parsed.hostname.toLowerCase())) {
            throw new Error(`${label}域名不在渠道白名单中：${parsed.hostname}`);
        }
        return parsed;
    }
    verifyManifestEnvelope(envelope, release) {
        const verified = verifySignedAppUpdateManifest(envelope, this.trustedManifestKeys, {
            channelId: this.options.channelId,
            appId: this.options.appId,
            version: release.version,
            versionCode: Number(release.version_code),
            ...(this.updateTarget ? { target: this.updateTarget } : {}),
            bundleId: this.options.appId,
            ...(this.options.minimumOsVersion
                ? { minimumOsVersion: this.options.minimumOsVersion }
                : {}),
            ...(this.options.signingIdentity
                ? { signingIdentity: this.options.signingIdentity }
                : {}),
        });
        const payload = verified.payload;
        this.validatedArtifactUrl(payload.feed_url, '更新 feed');
        this.validatedArtifactUrl(payload.artifact_url, '更新安装包地址');
        if (payload.blockmap_url)
            this.validatedArtifactUrl(payload.blockmap_url, '更新 blockmap 地址');
        if ((release.feed_url && release.feed_url !== payload.feed_url)
            || (release.artifact_url && release.artifact_url !== payload.artifact_url)
            || (release.sha512 && release.sha512 !== payload.sha512)
            || (Number(release.file_size) > 0 && Number(release.file_size) !== payload.file_size)
            || (release.blockmap_url && release.blockmap_url !== payload.blockmap_url)) {
            throw new Error('更新发布清单与服务器登记的产物元数据不一致');
        }
        return payload;
    }
    async fetchTextWithDeadline(url, headers) {
        return runWithAppUpdateRequestDeadline(async (signal) => {
            const response = await net.fetch(url.toString(), {
                signal,
                redirect: 'error',
                cache: 'no-store',
                credentials: 'omit',
                headers,
            });
            const text = await response.text();
            return { ok: response.ok, status: response.status, text };
        }, UPDATE_REQUEST_TIMEOUT_MS);
    }
    async fetchVerifiedManifest(release, reason, attempt) {
        if (this.manifestKeyConfigurationError)
            throw new Error(this.manifestKeyConfigurationError);
        if (this.trustedManifestKeys.size === 0)
            throw new Error('客户端未配置可信 Ed25519 更新公钥');
        if (!release.manifest_url)
            throw new Error('服务器版本记录缺少签名发布清单 manifest_url');
        const manifestUrl = this.validatedArtifactUrl(release.manifest_url, '更新发布清单地址');
        this.reportLifecycle('policy-refresh-request', {
            reason,
            attempt,
            requestKind: 'manifest',
            host: manifestUrl.hostname,
            protocol: manifestUrl.protocol,
        });
        const response = await this.fetchTextWithDeadline(manifestUrl, { 'X-Channel-ID': this.options.channelId });
        this.reportLifecycle('policy-refresh-response', {
            reason,
            attempt,
            requestKind: 'manifest',
            status: response.status,
        });
        if (!response.ok)
            throw new Error(`更新发布清单 HTTP ${response.status}`);
        const { text } = response;
        if (!text || Buffer.byteLength(text, 'utf8') > MAX_APP_UPDATE_MANIFEST_BYTES) {
            throw new Error('更新发布清单为空或超过大小限制');
        }
        let envelope;
        try {
            envelope = JSON.parse(text);
        }
        catch {
            throw new Error('更新发布清单不是有效 JSON');
        }
        return { envelope, payload: this.verifyManifestEnvelope(envelope, release) };
    }
    bindUpdaterEvents() {
        autoUpdater.on('checking-for-update', () => this.updateSnapshot({ phase: 'checking', error: null }));
        autoUpdater.on('update-available', (info) => this.updateSnapshot({
            phase: 'available',
            targetVersion: info.version,
            progress: 0,
            error: null,
        }));
        autoUpdater.on('update-not-available', () => this.updateSnapshot({ phase: 'idle', progress: 0, error: null }));
        autoUpdater.on('download-progress', (info) => this.updateSnapshot({
            phase: 'downloading',
            progress: Math.max(0, Math.min(100, info.percent || 0)),
            transferred: info.transferred || 0,
            total: info.total || 0,
            bytesPerSecond: info.bytesPerSecond || 0,
            error: null,
        }));
        autoUpdater.on('update-downloaded', (event) => this.handleDownloadedUpdate(event));
        autoUpdater.on('error', (error) => this.updateSnapshot({
            phase: 'error',
            error: error.message || String(error),
        }));
    }
    handleDownloadedUpdate(event) {
        const release = this.persisted.release;
        const envelope = this.persisted.manifestEnvelope;
        const expectedExtension = this.updateTarget?.artifactType === 'zip' ? '.zip' : '.exe';
        const artifact = event.files?.find((file) => file.url.toLowerCase().endsWith(expectedExtension)) || event.files?.[0];
        const manifestSha512 = artifact?.sha512 || '';
        const releaseSha512 = release?.sha512 || '';
        if (!release || !envelope || event.version !== release.version) {
            this.discardPendingUpdate('下载完成的版本与服务器当前目标版本不一致，已停止自动安装。');
            return;
        }
        let signedPayload;
        try {
            signedPayload = this.verifyManifestEnvelope(envelope, release);
        }
        catch (error) {
            this.discardPendingUpdate(`更新发布清单复验失败：${error instanceof Error ? error.message : String(error)}`);
            return;
        }
        if (!manifestSha512 || !releaseSha512 || manifestSha512 !== releaseSha512) {
            this.discardPendingUpdate('更新清单与服务器登记的 SHA512 不一致，已停止自动安装。');
            return;
        }
        try {
            const downloadedArtifactUrl = artifact
                ? resolveUpdateArtifactUrl(signedPayload.feed_url, artifact.url)
                : '';
            if (!downloadedArtifactUrl
                || downloadedArtifactUrl !== new URL(signedPayload.artifact_url).toString()) {
                this.discardPendingUpdate('实际下载地址与签名发布清单不一致，已停止自动安装。');
                return;
            }
        }
        catch {
            this.discardPendingUpdate('无法校验实际下载地址，已停止自动安装。');
            return;
        }
        try {
            const expectedSize = Number(release.file_size) || 0;
            const actualSize = fs.statSync(event.downloadedFile).size;
            if (expectedSize > 0 && actualSize !== expectedSize) {
                this.discardPendingUpdate('更新包大小与服务器登记信息不一致，已停止自动安装。');
                return;
            }
        }
        catch (error) {
            this.discardPendingUpdate(`无法读取已下载更新包：${error instanceof Error ? error.message : String(error)}`);
            return;
        }
        this.persisted.artifactVersion = event.version;
        this.persisted.artifactSha512 = manifestSha512;
        this.updateSnapshot({
            phase: 'ready',
            targetVersion: event.version,
            downloadedFile: event.downloadedFile,
            progress: 100,
            transferred: this.persisted.snapshot.total,
            installAttempts: 0,
            requiresElevation: false,
            error: null,
        });
        this.reportLifecycle('download-ready', {
            targetVersion: event.version,
            installAttempts: 0,
        });
        this.options.onUpdateReady?.(this.getSnapshot());
    }
    async fetchReleaseAndPolicy(reason, attempt = 1) {
        this.reportLifecycle('policy-refresh-start', { reason, attempt });
        const apiBase = this.options.apiBaseUrl.replace(/\/+$/, '');
        let failureStage = 'configuration';
        try {
            if (!apiBase)
                throw new Error('更新策略接口未配置');
            failureStage = 'policy-url';
            const url = new URL(`${apiBase}/v1/app/version`);
            if (url.protocol !== 'https:' && app.isPackaged) {
                throw new Error('生产环境更新策略接口必须使用 HTTPS');
            }
            const allowedPolicyHosts = (this.options.allowedPolicyHosts || []).map((host) => host.toLowerCase());
            if (allowedPolicyHosts.length > 0 && !allowedPolicyHosts.includes(url.hostname.toLowerCase())) {
                throw new Error(`更新策略接口域名不在渠道白名单中：${url.hostname}`);
            }
            url.searchParams.set('channel_id', this.options.channelId);
            url.searchParams.set('current_version', app.getVersion());
            url.searchParams.set('current_version_code', String(this.persisted.snapshot.currentVersionCode));
            url.searchParams.set('cohort', String(this.persisted.cohort));
            if (this.updateTarget?.platform === 'darwin' && this.isRuntimeConfigured()) {
                for (const [key, value] of Object.entries(appUpdatePolicyTargetQuery(this.updateTarget))) {
                    url.searchParams.set(key, value);
                }
            }
            failureStage = 'policy-request';
            this.reportLifecycle('policy-refresh-request', {
                reason,
                attempt,
                requestKind: 'policy',
                host: url.hostname,
                protocol: url.protocol,
            });
            const response = await this.fetchTextWithDeadline(url, { 'X-Channel-ID': this.options.channelId });
            this.reportLifecycle('policy-refresh-response', {
                reason,
                attempt,
                requestKind: 'policy',
                status: response.status,
            });
            failureStage = 'policy-response';
            if (!response.ok)
                throw new Error(`HTTP ${response.status}`);
            if (!response.text || Buffer.byteLength(response.text, 'utf8') > MAX_APP_UPDATE_POLICY_BYTES) {
                throw new Error('更新策略响应为空或超过大小限制');
            }
            let release;
            try {
                release = JSON.parse(response.text);
            }
            catch {
                throw new Error('更新策略响应不是有效 JSON');
            }
            if (!release || typeof release.version !== 'string' || !Number.isFinite(Number(release.version_code))) {
                throw new Error('更新策略响应缺少有效版本信息');
            }
            if (versionToCode(release.version) !== Number(release.version_code)) {
                throw new Error('更新策略中的版本号与 version_code 不一致');
            }
            if (release.channel_id && release.channel_id !== this.options.channelId) {
                throw new Error(`更新策略返回了错误渠道：${release.channel_id}`);
            }
            if (release.release_status && release.release_status !== 'active') {
                throw new Error(`更新策略返回了非 active 版本：${release.release_status}`);
            }
            const policy = reconcilePolicyForCurrentVersion(normalizeClientPolicy(release.policy), this.persisted.snapshot.currentVersionCode, Number(release.version_code) || 0);
            const snapshotTarget = resolveAppUpdateSnapshotTarget(policy, release.version, Number(release.version_code) || 0);
            let verifiedManifest = null;
            if (policy.enabled && policy.update_available) {
                failureStage = 'manifest';
                verifiedManifest = await this.fetchVerifiedManifest(release, reason, attempt);
            }
            const authoritativeRelease = verifiedManifest
                ? {
                    ...release,
                    feed_url: verifiedManifest.payload.feed_url,
                    artifact_url: verifiedManifest.payload.artifact_url,
                    sha512: verifiedManifest.payload.sha512,
                    file_size: verifiedManifest.payload.file_size,
                    blockmap_url: verifiedManifest.payload.blockmap_url,
                }
                : release;
            const pendingArtifactInvalid = Boolean(this.persisted.snapshot.downloadedFile) && (!verifiedManifest
                || this.persisted.artifactVersion !== authoritativeRelease.version
                || !this.persisted.artifactSha512
                || !authoritativeRelease.sha512
                || this.persisted.artifactSha512 !== authoritativeRelease.sha512);
            if (pendingArtifactInvalid) {
                this.persisted.artifactVersion = null;
                this.persisted.artifactSha512 = null;
            }
            this.persisted.release = authoritativeRelease;
            this.persisted.manifestEnvelope = verifiedManifest?.envelope || null;
            this.persisted.policyFetchedAt = new Date().toISOString();
            failureStage = 'state-commit';
            this.updateSnapshot({
                policy,
                ...snapshotTarget,
                title: authoritativeRelease.title || '',
                content: authoritativeRelease.content || '',
                manualFallbackUrl: authoritativeRelease.download_url || null,
                phase: policy.enabled
                    ? pendingArtifactInvalid ? 'idle' : this.persisted.snapshot.phase
                    : 'disabled',
                downloadedFile: pendingArtifactInvalid ? null : this.persisted.snapshot.downloadedFile,
                installAttempts: pendingArtifactInvalid ? 0 : this.persisted.snapshot.installAttempts,
                requiresElevation: pendingArtifactInvalid ? false : this.persisted.snapshot.requiresElevation,
                error: pendingArtifactInvalid ? '服务器目标版本已变化，旧的待安装包已作废并将重新下载。' : null,
            }, true);
            this.reportLifecycle('policy-refresh-succeeded', {
                reason,
                attempt,
                policyEnabled: policy.enabled,
                updateAvailable: policy.update_available,
                pendingArtifactInvalid,
            });
            return true;
        }
        catch (error) {
            const failureCode = classifyPolicyRefreshFailure(error, failureStage);
            this.reportLifecycle('policy-refresh-failed', {
                reason,
                attempt,
                failureStage,
                failureCode,
            });
            console.warn('[AppUpdater] Update policy refresh failed; using last-known policy:', error);
            this.options.onPolicyChange?.(this.getSnapshot());
            return false;
        }
    }
    resolveFeedUrl() {
        const fallbackFeed = this.options.defaultFeedUrl && this.persisted.release?.version
            ? `${this.options.defaultFeedUrl.replace(/\/+$/, '')}/${this.persisted.release.version}`
            : this.options.defaultFeedUrl || '';
        const feed = this.persisted.release?.feed_url || fallbackFeed;
        if (!feed)
            throw new Error('该渠道尚未配置自动更新 feed_url');
        const parsed = new URL(feed);
        if (parsed.protocol !== 'https:' && app.isPackaged) {
            throw new Error('生产环境自动更新地址必须使用 HTTPS');
        }
        const allowed = (this.options.allowedFeedHosts || []).map((host) => host.toLowerCase());
        if (allowed.length > 0 && !allowed.includes(parsed.hostname.toLowerCase())) {
            throw new Error(`更新地址域名不在渠道白名单中：${parsed.hostname}`);
        }
        return parsed.toString().replace(/\/+$/, '');
    }
    configureUpdater() {
        const feed = this.resolveFeedUrl();
        if (this.updaterConfiguredFeed === feed)
            return;
        autoUpdater.setFeedURL({ provider: 'generic', url: feed });
        this.updaterConfiguredFeed = feed;
    }
    isRuntimeConfigured() {
        return isAppUpdateRuntimeConfigured(app.isPackaged, this.updateTarget, this.installDriver?.target || null);
    }
    async initializeBeforeServices() {
        this.reportLifecycle('startup-initialize', {
            phase: this.persisted.snapshot.phase,
            installAttempts: this.persisted.snapshot.installAttempts,
            packaged: app.isPackaged,
            platform: process.platform,
        });
        if (!this.isRuntimeConfigured()) {
            this.updateSnapshot({ phase: 'disabled' });
            return false;
        }
        if (this.persisted.snapshot.targetVersionCode > 0
            && this.persisted.snapshot.currentVersionCode >= this.persisted.snapshot.targetVersionCode) {
            this.persisted.release = null;
            this.persisted.artifactVersion = null;
            this.persisted.artifactSha512 = null;
            this.persisted.manifestEnvelope = null;
            this.updateSnapshot({
                phase: 'idle',
                targetVersion: null,
                targetVersionCode: 0,
                downloadedFile: null,
                installAttempts: 0,
                requiresElevation: false,
                error: null,
            });
        }
        let refreshed = false;
        const startupRefreshAttempts = this.persisted.snapshot.phase === 'ready'
            && Boolean(this.persisted.snapshot.downloadedFile)
            ? 2
            : 1;
        for (let attempt = 1; attempt <= startupRefreshAttempts; attempt += 1) {
            refreshed = await this.fetchReleaseAndPolicy('startup', attempt);
            if (refreshed)
                break;
            if (attempt < startupRefreshAttempts) {
                this.reportLifecycle('policy-refresh-retry', {
                    reason: 'startup',
                    attempt,
                    nextAttempt: attempt + 1,
                    delayMs: 250,
                });
                await new Promise((resolve) => setTimeout(resolve, 250));
            }
        }
        if (!refreshed) {
            this.reportLifecycle('policy-refresh-exhausted', {
                reason: 'startup',
                attempts: startupRefreshAttempts,
            });
        }
        const snapshot = this.persisted.snapshot;
        if (!refreshed || snapshot.phase !== 'ready' || !snapshot.downloadedFile)
            return false;
        if (!snapshot.policy.enabled || this.persisted.release?.release_status === 'revoked') {
            this.discardPendingUpdate('更新已被服务器暂停或撤回。');
            return false;
        }
        if (snapshot.targetVersion !== this.persisted.release?.version
            || this.persisted.artifactVersion !== this.persisted.release?.version) {
            this.discardPendingUpdate('已下载版本不再是当前渠道的目标版本。');
            return false;
        }
        if (snapshot.policy.install_mode !== 'next_launch' && !snapshot.policy.force_update_required)
            return false;
        this.reportLifecycle('startup-ready-install', {
            targetVersion: snapshot.targetVersion || '',
            installAttempts: snapshot.installAttempts,
        });
        return this.installReadyUpdate(false, true);
    }
    async checkForUpdates(manual = false) {
        if (this.checking)
            return this.checking;
        this.checking = this.doCheckForUpdates(manual).finally(() => { this.checking = null; });
        return this.checking;
    }
    async doCheckForUpdates(manual) {
        if (!this.isRuntimeConfigured()) {
            this.updateSnapshot({ phase: 'disabled', error: '开发环境不执行桌面客户端自动更新。' });
            return this.getSnapshot();
        }
        await this.fetchReleaseAndPolicy('background');
        const policy = this.persisted.snapshot.policy;
        if (!shouldOfferUpdate(policy)) {
            this.updateSnapshot({ phase: policy.enabled ? 'idle' : 'disabled' });
            return this.getSnapshot();
        }
        if (this.persisted.snapshot.phase === 'ready'
            && this.persisted.snapshot.downloadedFile
            && fs.existsSync(this.persisted.snapshot.downloadedFile)) {
            return this.getSnapshot();
        }
        try {
            this.configureUpdater();
            this.updateSnapshot({ phase: 'checking', error: null });
            const result = await autoUpdater.checkForUpdates();
            if (!result?.isUpdateAvailable) {
                this.updateSnapshot({ phase: 'idle', error: null });
                return this.getSnapshot();
            }
            if (manual || shouldAutoDownload(policy)) {
                this.updateSnapshot({ phase: 'downloading', error: null });
                await autoUpdater.downloadUpdate();
            }
        }
        catch (error) {
            this.updateSnapshot({ phase: 'error', error: error instanceof Error ? error.message : String(error) });
        }
        return this.getSnapshot();
    }
    async downloadAvailableUpdate() {
        return this.checkForUpdates(true);
    }
    discardPendingUpdate(reason) {
        this.persisted.artifactVersion = null;
        this.persisted.artifactSha512 = null;
        this.persisted.manifestEnvelope = null;
        this.updateSnapshot({
            phase: 'error',
            downloadedFile: null,
            installAttempts: 0,
            requiresElevation: false,
            error: reason,
        });
    }
    async installReadyUpdate(allowElevation, policyAlreadyRefreshed = false) {
        if (!policyAlreadyRefreshed) {
            const refreshed = await this.fetchReleaseAndPolicy('install');
            if (!refreshed) {
                this.updateSnapshot({ phase: 'error', error: '暂时无法重新确认服务器更新策略，已停止本次自动安装。' });
                return false;
            }
        }
        const snapshot = this.persisted.snapshot;
        const downloadedFile = snapshot.downloadedFile;
        if (!downloadedFile || snapshot.phase !== 'ready')
            return false;
        if (snapshot.installAttempts >= MAX_INSTALL_ATTEMPTS) {
            this.updateSnapshot({ phase: 'error', error: '自动安装已连续失败 3 次，请使用手动修复安装。' });
            return false;
        }
        const release = this.persisted.release;
        if (!release
            || this.persisted.artifactVersion !== release.version
            || snapshot.targetVersion !== release.version) {
            this.discardPendingUpdate('待安装包已经不是服务器当前目标版本，请重新下载。');
            return false;
        }
        const envelope = this.persisted.manifestEnvelope;
        if (!envelope) {
            this.discardPendingUpdate('待安装包缺少经过签名的发布清单，已停止自动安装。');
            return false;
        }
        let signedPayload;
        try {
            signedPayload = this.verifyManifestEnvelope(envelope, release);
        }
        catch (error) {
            this.discardPendingUpdate(`安装前发布清单复验失败：${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
        const installDriver = this.installDriver;
        if (!installDriver || !this.updateTarget
            || installDriver.target.platform !== this.updateTarget.platform
            || installDriver.target.architecture !== this.updateTarget.architecture
            || installDriver.target.artifactType !== this.updateTarget.artifactType) {
            this.updateSnapshot({ phase: 'error', error: '当前平台尚未配置匹配的应用更新安装 driver。' });
            return false;
        }
        const preflight = await installDriver.inspectEnvironment({
            downloadedFile,
            expectedSize: Number(this.persisted.release?.file_size) || 0,
            appId: this.options.appId,
        });
        if (!preflight.ok) {
            this.updateSnapshot({ phase: 'error', error: preflight.error || '安装环境预检失败。' });
            return false;
        }
        if (preflight.requiresElevation && !allowElevation) {
            this.updateSnapshot({
                phase: 'ready',
                requiresElevation: true,
                error: '更新已下载，此安装范围需要管理员授权，请在客户端中确认升级。',
            });
            return false;
        }
        const expectedSha512 = this.persisted.artifactSha512 || '';
        if (!expectedSha512 || expectedSha512 !== signedPayload.sha512 || release.sha512 !== signedPayload.sha512) {
            this.updateSnapshot({ phase: 'error', error: '更新包缺少 SHA512 校验值，已停止自动安装。' });
            return false;
        }
        const artifactVerification = await installDriver.verifyArtifact({
            downloadedFile,
            expectedSha512,
            trustedPublisherNames: this.trustedPublisherNames,
            currentVersion: snapshot.currentVersion,
            manifest: signedPayload,
        });
        if (!artifactVerification.ok) {
            const error = artifactVerification.error || '更新安装包验证失败。';
            if (artifactVerification.discardArtifact)
                this.discardPendingUpdate(error);
            else
                this.updateSnapshot({ phase: 'error', error });
            return false;
        }
        let rollbackInstallPreparation;
        try {
            // Stop the full local server/RPA tree before NSIS starts. The generated
            // updater waits only briefly before force-closing the app, which is not
            // long enough for the RPA worker's graceful 9922 shutdown.
            const attempt = snapshot.installAttempts + 1;
            this.reportLifecycle('install-attempt-start', {
                targetVersion: snapshot.targetVersion || '',
                installAttempt: attempt,
            });
            this.reportLifecycle('before-install-start', { installAttempt: attempt });
            const preparationResult = await this.options.beforeInstall?.();
            this.reportLifecycle('before-install-complete', { installAttempt: attempt });
            rollbackInstallPreparation = typeof preparationResult === 'function' ? preparationResult : undefined;
            this.updateSnapshot({
                phase: 'installing',
                installAttempts: attempt,
                requiresElevation: preflight.requiresElevation === true,
                error: null,
            });
            this.reportLifecycle('installer-launch-start', { installAttempt: attempt });
            const launchResult = await installDriver.launchInstaller({
                downloadedFile,
                requiresElevation: preflight.requiresElevation,
            });
            this.reportLifecycle('installer-launch-complete', {
                installAttempt: attempt,
                quitHandledByDriver: launchResult.quitHandledByDriver,
            });
            if (!launchResult.quitHandledByDriver)
                setImmediate(() => app.quit());
            return true;
        }
        catch (error) {
            this.reportLifecycle('install-attempt-failed');
            this.updateSnapshot({
                phase: 'error',
                error: `启动更新安装器失败：${error instanceof Error ? error.message : String(error)}`,
            });
            if (rollbackInstallPreparation) {
                try {
                    await rollbackInstallPreparation();
                }
                catch (rollbackError) {
                    console.error('[AppUpdater] Failed to restore services after installer launch failure:', rollbackError);
                }
            }
            return false;
        }
    }
}
