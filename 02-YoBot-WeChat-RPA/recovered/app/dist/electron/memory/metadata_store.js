import * as fs from 'fs';
import * as path from 'path';
import { decayedGroundedSupport } from './recall.js';
const DEFAULT_META = {
    memoryType: 'preference',
    confidence: 0.6,
    hitCount: 0,
    usedCount: 0,
    injectedCount: 0,
    groundedCount: 0,
    recallPolicy: 'relevant',
    confirmedByUser: false,
    sourceTraceIds: [],
    tags: []
};
const TYPE_RANK_WEIGHTS = {
    insight: 1.2,
    entity: 1.1,
    preference: 1.0,
    pattern: 1.0,
    failure: 0.9,
    session_summary: 0.8
};
export class MemoryMetadataStore {
    metaPath;
    migrationsPath;
    cache = new Map();
    saveTimer = null;
    dirty = false;
    constructor() {
        const rootDir = process.platform === 'win32'
            ? path.join(process.env.ProgramData || 'C:\\ProgramData', 'YokoAgent', 'VectorDB')
            : path.join(process.env.USER_DATA_PATH || process.cwd(), 'data');
        this.metaPath = path.join(rootDir, 'memory-meta.json');
        this.migrationsPath = path.join(rootDir, 'memory-meta.migrations.json');
    }
    normalizeMeta(meta) {
        const legacyInjected = typeof meta?.usedCount === 'number' ? meta.usedCount : 0;
        return {
            ...DEFAULT_META,
            ...meta,
            hitCount: typeof meta?.hitCount === 'number' ? meta.hitCount : 0,
            usedCount: legacyInjected,
            injectedCount: typeof meta?.injectedCount === 'number' ? meta.injectedCount : legacyInjected,
            groundedCount: typeof meta?.groundedCount === 'number' ? meta.groundedCount : 0,
            lastInjectedAt: meta?.lastInjectedAt ?? meta?.lastUsedAt,
            recallPolicy: meta?.recallPolicy || 'relevant',
            sourceTraceIds: Array.isArray(meta?.sourceTraceIds) ? [...meta.sourceTraceIds] : [],
            tags: Array.isArray(meta?.tags) ? [...meta.tags] : [],
        };
    }
    async init() {
        try {
            if (fs.existsSync(this.metaPath)) {
                const raw = fs.readFileSync(this.metaPath, 'utf-8');
                const parsed = JSON.parse(raw);
                for (const [id, meta] of Object.entries(parsed)) {
                    this.cache.set(id, this.normalizeMeta(meta));
                }
                console.log(`[MetaStore] Loaded ${this.cache.size} memory metadata entries`);
            }
        }
        catch (e) {
            // Starting fresh here used to mean silent, permanent data loss: the
            // empty cache is written back on the next scheduleSave(), taking every
            // confidence / confirmedByUser / recallPolicy value with it. Keep the
            // unreadable file so it can be recovered by hand.
            const salvaged = `${this.metaPath}.corrupt-${Date.now()}`;
            try {
                fs.renameSync(this.metaPath, salvaged);
                console.error(`[MetaStore] 元数据无法解析，已保留原文件到 ${salvaged}，本次以空表启动:`, e);
            }
            catch (renameErr) {
                console.error('[MetaStore] 元数据无法解析且无法备份，请勿覆盖原文件:', e, renameErr);
            }
        }
    }
    getOrDefault(id) {
        return this.cache.get(id) ?? this.normalizeMeta();
    }
    /** How many chunks currently carry a given recall policy. */
    countByRecallPolicy(policy) {
        let count = 0;
        for (const meta of this.cache.values()) {
            if ((meta.recallPolicy || 'relevant') === policy)
                count++;
        }
        return count;
    }
    /**
     * One-shot migration bookkeeping, kept in a sidecar of its own so the
     * `{id: meta}` shape of memory-meta.json stays free of reserved keys.
     * Backfills must not re-run: a user who deliberately downgrades a memory
     * in the Memory UI would otherwise have it silently re-promoted.
     */
    hasRunMigration(id) {
        try {
            if (!fs.existsSync(this.migrationsPath))
                return false;
            const applied = JSON.parse(fs.readFileSync(this.migrationsPath, 'utf-8'));
            return Array.isArray(applied?.applied) && applied.applied.includes(id);
        }
        catch {
            return false;
        }
    }
    markMigrationDone(id) {
        try {
            let applied = [];
            if (fs.existsSync(this.migrationsPath)) {
                const parsed = JSON.parse(fs.readFileSync(this.migrationsPath, 'utf-8'));
                if (Array.isArray(parsed?.applied))
                    applied = parsed.applied;
            }
            if (applied.includes(id))
                return;
            applied.push(id);
            const dir = path.dirname(this.migrationsPath);
            if (!fs.existsSync(dir))
                fs.mkdirSync(dir, { recursive: true });
            const tmpPath = `${this.migrationsPath}.tmp`;
            fs.writeFileSync(tmpPath, JSON.stringify({ applied }, null, 2));
            fs.renameSync(tmpPath, this.migrationsPath);
        }
        catch (e) {
            console.warn('[MetaStore] Failed to record migration marker:', e);
        }
    }
    initChunk(id) {
        if (!this.cache.has(id)) {
            this.cache.set(id, this.normalizeMeta());
            this.scheduleSave();
        }
    }
    incrementRetrieved(ids) {
        const now = Date.now();
        for (const id of ids) {
            const meta = this.getOrDefault(id);
            meta.hitCount += 1;
            meta.lastHitAt = now;
            this.cache.set(id, meta);
        }
        if (ids.length > 0)
            this.scheduleSave();
    }
    /** Backward-compatible alias. */
    incrementHit(ids) {
        this.incrementRetrieved(ids);
    }
    incrementInjected(ids) {
        const now = Date.now();
        for (const id of ids) {
            const meta = this.getOrDefault(id);
            meta.usedCount += 1;
            meta.lastUsedAt = now;
            meta.injectedCount = (meta.injectedCount || 0) + 1;
            meta.lastInjectedAt = now;
            this.cache.set(id, meta);
        }
        if (ids.length > 0)
            this.scheduleSave();
    }
    /** Backward-compatible alias; injection is not evidence of answer use. */
    incrementUsed(ids) {
        this.incrementInjected(ids);
    }
    incrementGrounded(ids) {
        const now = Date.now();
        for (const id of ids) {
            const meta = this.getOrDefault(id);
            meta.groundedCount = (meta.groundedCount || 0) + 1;
            meta.lastGroundedAt = now;
            this.cache.set(id, meta);
        }
        if (ids.length > 0)
            this.scheduleSave();
    }
    setMeta(id, patch) {
        const meta = this.getOrDefault(id);
        this.cache.set(id, this.normalizeMeta({ ...meta, ...patch }));
        this.scheduleSave();
    }
    updateConfidence(id, delta) {
        const meta = this.getOrDefault(id);
        meta.confidence = Math.max(0, Math.min(1, meta.confidence + delta));
        this.cache.set(id, meta);
        this.scheduleSave();
    }
    confirmChunk(id) {
        const meta = this.getOrDefault(id);
        meta.confirmedByUser = true;
        meta.confidence = Math.max(meta.confidence, 0.95);
        this.cache.set(id, meta);
        this.scheduleSave();
    }
    deleteMany(ids) {
        for (const id of ids) {
            this.cache.delete(id);
        }
        if (ids.length > 0)
            this.scheduleSave();
    }
    computeRankScore(id, rrfScore) {
        const meta = this.getOrDefault(id);
        const groundedSupport = decayedGroundedSupport(meta);
        const confidenceAdjustment = (meta.confidence - 0.5) * 0.12;
        const confirmationBoost = meta.confirmedByUser ? 0.04 : 0;
        const typeWeight = TYPE_RANK_WEIGHTS[meta.memoryType] ?? 1;
        const typeAdjustment = (typeWeight - 1) * 0.15;
        // RRF remains dominant so low-confidence records stay discoverable in
        // the broad candidate pool. Metadata is only a bounded tie-breaker.
        // Retrieval and prompt injection frequency deliberately do not rank.
        return rrfScore * (1
            + confidenceAdjustment
            + confirmationBoost
            + typeAdjustment
            + Math.min(0.06, groundedSupport * 0.02));
    }
    scheduleSave() {
        this.dirty = true;
        if (this.saveTimer)
            return;
        this.saveTimer = setTimeout(() => {
            this.flush();
            this.saveTimer = null;
        }, 2000);
    }
    flush() {
        if (!this.dirty)
            return;
        try {
            const dir = path.dirname(this.metaPath);
            if (!fs.existsSync(dir))
                fs.mkdirSync(dir, { recursive: true });
            const obj = {};
            for (const [id, meta] of this.cache.entries()) {
                obj[id] = meta;
            }
            // Atomic replace. A crash or power loss during a plain writeFileSync
            // leaves a truncated file, which fails to parse on the next boot and
            // (before the init() guard above) wiped every memory's metadata.
            const tmpPath = `${this.metaPath}.tmp`;
            fs.writeFileSync(tmpPath, JSON.stringify(obj, null, 2));
            fs.renameSync(tmpPath, this.metaPath);
            this.dirty = false;
        }
        catch (e) {
            console.warn('[MetaStore] Failed to save metadata:', e);
        }
    }
}
