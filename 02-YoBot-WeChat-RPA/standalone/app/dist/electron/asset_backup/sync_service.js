import { randomUUID } from "crypto";
import { AssetBackupHttpClient } from "./http_client.js";
import { AssetBackupStateStore } from "./state_store.js";
import { assetStateKey, SUBAGENT_PROFILE_ASSET_KIND, } from "./types.js";
import { parseSubagentSnapshot, SubagentBackupAdapter, } from "../agent/profile/backup_adapter.js";
const RETRY_INTERVAL_MS = 5 * 60 * 1000;
function nowIso() {
    return new Date().toISOString();
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
function isPending(status) {
    return status === "pending_upload" || status === "pending_delete" || status === "uploading" || status === "deleting";
}
export class SubagentProfileBackupSyncService {
    options;
    adapter;
    stateStore;
    http;
    syncTimer = null;
    retryTimer = null;
    inFlight = false;
    queued = false;
    constructor(options) {
        this.options = options;
        this.adapter = new SubagentBackupAdapter(options.agentsDir);
        this.stateStore = new AssetBackupStateStore(options.statePath);
        this.http = new AssetBackupHttpClient({
            apiBase: options.apiBase,
            getToken: options.getToken,
            getChannelId: options.getChannelId,
        });
    }
    start() {
        this.requestSync("startup");
        const retryEvery = Math.max(30_000, this.options.retryIntervalMs || RETRY_INTERVAL_MS);
        this.retryTimer = setInterval(() => {
            void this.stateStore.load().then((state) => {
                const needsRetry = Object.values(state.assets).some(entry => entry.status === "error_retrying" || entry.status === "pending_upload" || entry.status === "pending_delete");
                if (needsRetry)
                    this.requestSync("retry");
            }).catch(() => { });
        }, retryEvery);
        this.retryTimer.unref?.();
    }
    dispose() {
        if (this.syncTimer)
            clearTimeout(this.syncTimer);
        if (this.retryTimer)
            clearInterval(this.retryTimer);
        this.syncTimer = null;
        this.retryTimer = null;
    }
    requestSync(reason) {
        if (this.syncTimer)
            clearTimeout(this.syncTimer);
        this.syncTimer = setTimeout(() => {
            this.syncTimer = null;
            void this.syncNow(reason).catch((error) => {
                console.warn(`[AssetBackup] sync failed (${reason}): ${errorMessage(error)}`);
            });
        }, 250);
        this.syncTimer.unref?.();
    }
    handleFsEvent(event, changedPath) {
        if (event === "unlink" || event === "unlinkDir") {
            const assetKey = changedPath ? this.adapter.extractDeletedAssetKey(event, changedPath) : null;
            if (assetKey) {
                void this.markDeletedAndSync(assetKey).catch((error) => {
                    console.warn(`[AssetBackup] delete marker failed: ${errorMessage(error)}`);
                });
            }
            return;
        }
        if (event === "add" || event === "change" || event === "addDir") {
            this.requestSync(`fs:${event}`);
        }
    }
    async getSummary() {
        return this.summaryFromState(await this.stateStore.load());
    }
    async syncNow(reason = "manual") {
        if (this.inFlight) {
            this.queued = true;
            return {
                ...(await this.getSummary()),
                syncing: true,
            };
        }
        this.inFlight = true;
        try {
            const summary = await this.performFullSync(reason);
            return summary;
        }
        finally {
            this.inFlight = false;
            if (this.queued) {
                this.queued = false;
                this.requestSync("queued");
            }
        }
    }
    async restoreSubagent(profileId, overwrite = false) {
        try {
            if (!this.http.isAvailable())
                return { success: false, error: "未登录或未配置远程服务器" };
            const remote = await this.http.getSubagentBackup(profileId);
            const result = await this.adapter.restore(profileId, remote.agent_md, overwrite);
            if (!result.restored) {
                return { success: false, restored: false, error: result.reason || "恢复失败" };
            }
            const local = parseSubagentSnapshot(remote.agent_md, profileId, "", undefined);
            await this.stateStore.upsertEntry(assetStateKey(SUBAGENT_PROFILE_ASSET_KIND, profileId), {
                assetKind: SUBAGENT_PROFILE_ASSET_KIND,
                assetKey: profileId,
                displayName: remote.display_name || local?.displayName || profileId,
                cloudRevision: Number(remote.current_revision || remote.revision || 0),
                cloudContentSha256: remote.current_content_sha256 || local?.contentSha256 || null,
                lastUploadedSha256: remote.current_content_sha256 || local?.contentSha256,
                lastSeenLocalSha256: local?.contentSha256,
                cloudUpdatedAt: remote.updated_at,
                status: "synced",
                lastError: null,
                lastSuccessAt: nowIso(),
            });
            return { success: true, restored: true, backupPath: result.backupPath };
        }
        catch (error) {
            return { success: false, error: errorMessage(error) };
        }
    }
    async performFullSync(reason) {
        let state = await this.stateStore.load();
        if (!this.http.isAvailable()) {
            state.lastError = "未登录或未配置远程服务器";
            state.lastStatusAt = nowIso();
            await this.stateStore.save(state);
            return this.summaryFromState(state);
        }
        try {
            const [cloud, local] = await Promise.all([
                this.http.listSubagentBackups(),
                this.adapter.scan(),
            ]);
            const cloudByKey = new Map(cloud.map(item => [item.asset_key, item]));
            const localByKey = new Map(local.map(item => [item.assetKey, item]));
            for (const snapshot of local) {
                await this.syncLocalSnapshot(state, snapshot, cloudByKey.get(snapshot.assetKey));
            }
            for (const [key, entry] of Object.entries(state.assets)) {
                if (entry.assetKind !== SUBAGENT_PROFILE_ASSET_KIND)
                    continue;
                if (entry.status === "pending_delete" && !localByKey.has(entry.assetKey)) {
                    await this.deleteRemoteAsset(state, key, entry);
                }
            }
            for (const cloudItem of cloud) {
                if (localByKey.has(cloudItem.asset_key))
                    continue;
                const key = assetStateKey(SUBAGENT_PROFILE_ASSET_KIND, cloudItem.asset_key);
                const current = state.assets[key];
                if (current?.status === "pending_delete" || current?.status === "deleted")
                    continue;
                state.assets[key] = {
                    ...current,
                    assetKind: SUBAGENT_PROFILE_ASSET_KIND,
                    assetKey: cloudItem.asset_key,
                    displayName: cloudItem.display_name || cloudItem.asset_key,
                    cloudRevision: Number(cloudItem.current_revision || 0),
                    cloudContentSha256: cloudItem.current_content_sha256 || null,
                    cloudUpdatedAt: cloudItem.updated_at,
                    status: "restore_available",
                    lastError: null,
                };
            }
            state.lastFullSyncAt = nowIso();
            state.lastStatusAt = state.lastFullSyncAt;
            state.lastError = null;
            await this.stateStore.save(state);
            return this.summaryFromState(state);
        }
        catch (error) {
            state = await this.stateStore.load();
            state.lastError = errorMessage(error);
            state.lastStatusAt = nowIso();
            await this.stateStore.save(state);
            return this.summaryFromState(state);
        }
        finally {
            if (reason === "manual") {
                // 手动刷新只影响备份状态，不向调用方泄露任何 prompt 内容。
            }
        }
    }
    async syncLocalSnapshot(state, snapshot, cloudItem) {
        const key = assetStateKey(snapshot.assetKind, snapshot.assetKey);
        const previous = state.assets[key];
        if (cloudItem?.current_content_sha256 === snapshot.contentSha256) {
            state.assets[key] = {
                ...previous,
                assetKind: snapshot.assetKind,
                assetKey: snapshot.assetKey,
                displayName: snapshot.displayName,
                cloudRevision: Number(cloudItem.current_revision || 0),
                cloudContentSha256: cloudItem.current_content_sha256 || null,
                lastUploadedSha256: snapshot.contentSha256,
                lastSeenLocalSha256: snapshot.contentSha256,
                cloudUpdatedAt: cloudItem.updated_at,
                status: "synced",
                pendingDelete: false,
                lastError: null,
                lastSuccessAt: previous?.lastSuccessAt || nowIso(),
            };
            return;
        }
        if (previous?.status === "conflict" &&
            previous.lastSeenLocalSha256 === snapshot.contentSha256 &&
            previous.cloudRevision === Number(cloudItem?.current_revision || previous.cloudRevision || 0)) {
            return;
        }
        state.assets[key] = {
            ...previous,
            assetKind: snapshot.assetKind,
            assetKey: snapshot.assetKey,
            displayName: snapshot.displayName,
            lastSeenLocalSha256: snapshot.contentSha256,
            status: "uploading",
            lastAttemptAt: nowIso(),
            lastError: null,
        };
        try {
            const result = await this.http.putSubagentBackup(snapshot.assetKey, {
                agent_md: snapshot.agentMd,
                content_sha256: snapshot.contentSha256,
                base_revision: previous?.cloudRevision,
                base_content_sha256: previous?.cloudContentSha256 || undefined,
                client_operation_id: randomUUID(),
                client_version: this.options.clientVersion,
                source_device_id: state.deviceId,
                local_updated_at: snapshot.localUpdatedAt,
                metadata: {
                    display_name: snapshot.displayName,
                    enabled: snapshot.enabled,
                    knowledge_refs: snapshot.knowledgeRefs,
                },
            });
            const data = result.data;
            if (result.conflict || !result.success) {
                state.assets[key] = {
                    ...state.assets[key],
                    cloudRevision: Number(data?.current_revision || cloudItem?.current_revision || previous?.cloudRevision || 0),
                    cloudContentSha256: data?.current_content_sha256 || cloudItem?.current_content_sha256 || previous?.cloudContentSha256 || null,
                    conflictRevision: Number(data?.revision || 0) || undefined,
                    cloudUpdatedAt: cloudItem?.updated_at,
                    status: "conflict",
                    lastError: "云端已有更新，已保留本地版本为冲突候选",
                    lastAttemptAt: nowIso(),
                };
                return;
            }
            state.assets[key] = {
                ...state.assets[key],
                cloudRevision: Number(data?.current_revision || data?.revision || cloudItem?.current_revision || 0),
                cloudContentSha256: data?.current_content_sha256 || snapshot.contentSha256,
                lastUploadedSha256: snapshot.contentSha256,
                lastSeenLocalSha256: snapshot.contentSha256,
                status: "synced",
                pendingDelete: false,
                lastError: null,
                lastSuccessAt: nowIso(),
            };
        }
        catch (error) {
            state.assets[key] = {
                ...state.assets[key],
                status: "error_retrying",
                lastError: errorMessage(error),
                lastAttemptAt: nowIso(),
            };
        }
    }
    async markDeletedAndSync(assetKey) {
        const key = assetStateKey(SUBAGENT_PROFILE_ASSET_KIND, assetKey);
        const state = await this.stateStore.load();
        const existing = state.assets[key];
        if (!existing?.cloudRevision)
            return;
        state.assets[key] = {
            ...existing,
            status: "pending_delete",
            pendingDelete: true,
            lastAttemptAt: nowIso(),
            lastError: null,
        };
        await this.stateStore.save(state);
        this.requestSync("fs:delete");
    }
    async deleteRemoteAsset(state, key, entry) {
        if (!entry.cloudRevision) {
            state.assets[key] = { ...entry, status: "deleted", pendingDelete: false, lastError: null };
            return;
        }
        state.assets[key] = {
            ...entry,
            status: "deleting",
            lastAttemptAt: nowIso(),
            lastError: null,
        };
        try {
            const result = await this.http.deleteSubagentBackup(entry.assetKey, {
                base_revision: entry.cloudRevision,
                base_content_sha256: entry.cloudContentSha256 || undefined,
                client_operation_id: randomUUID(),
                client_version: this.options.clientVersion,
                source_device_id: state.deviceId,
            });
            const data = result.data;
            if (result.conflict || !result.success) {
                state.assets[key] = {
                    ...state.assets[key],
                    cloudRevision: Number(data?.current_revision || entry.cloudRevision),
                    cloudContentSha256: data?.current_content_sha256 || entry.cloudContentSha256 || null,
                    status: "conflict",
                    pendingDelete: false,
                    lastError: "云端已有更新，本地删除未同步",
                };
                return;
            }
            state.assets[key] = {
                ...state.assets[key],
                cloudRevision: Number(data?.current_revision || entry.cloudRevision),
                cloudContentSha256: data?.current_content_sha256 || entry.cloudContentSha256 || null,
                status: "deleted",
                pendingDelete: false,
                lastError: null,
                lastSuccessAt: nowIso(),
            };
        }
        catch (error) {
            state.assets[key] = {
                ...state.assets[key],
                status: "pending_delete",
                pendingDelete: true,
                lastError: errorMessage(error),
                lastAttemptAt: nowIso(),
            };
        }
    }
    summaryFromState(state) {
        const entries = Object.values(state.assets).filter(entry => entry.assetKind === SUBAGENT_PROFILE_ASSET_KIND);
        return {
            available: this.http.isAvailable(),
            syncing: this.inFlight,
            lastFullSyncAt: state.lastFullSyncAt,
            lastError: state.lastError || null,
            pending: entries.filter(entry => isPending(entry.status)).length,
            failed: entries.filter(entry => entry.status === "error_retrying").length,
            conflicts: entries.filter(entry => entry.status === "conflict").length,
            restoreAvailable: entries.filter(entry => entry.status === "restore_available").length,
            items: entries.map(entry => ({
                assetKind: entry.assetKind,
                assetKey: entry.assetKey,
                displayName: entry.displayName,
                status: entry.status,
                cloudRevision: entry.cloudRevision,
                lastError: entry.lastError,
                lastSuccessAt: entry.lastSuccessAt,
                cloudUpdatedAt: entry.cloudUpdatedAt,
            })),
        };
    }
}
