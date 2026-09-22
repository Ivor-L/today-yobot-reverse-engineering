import fs from "fs-extra";
import * as path from "path";
const META_MARKER_PREFIX = "<!--YOKO_MEMORY_META:";
const META_MARKER_SUFFIX = "-->";
const DEFAULT_REGISTRY = {
    version: 1,
    records: {},
    activeByScopeKey: {},
};
class MemoryEvolutionManager {
    registryPath = path.join(process.env.USER_DATA_PATH || process.cwd(), "data", "memory-evolution.json");
    registry = null;
    normalizeScopeKey(key, userId) {
        return `${userId || "global"}::${key.trim().toLowerCase()}`;
    }
    async loadRegistry() {
        if (this.registry)
            return this.registry;
        try {
            const raw = await fs.readFile(this.registryPath, "utf-8");
            const parsed = JSON.parse(raw);
            this.registry = {
                version: parsed.version || 1,
                records: parsed.records || {},
                activeByScopeKey: parsed.activeByScopeKey || {},
            };
            return this.registry;
        }
        catch {
            this.registry = { ...DEFAULT_REGISTRY };
            return this.registry;
        }
    }
    async saveRegistry(registry) {
        await fs.ensureDir(path.dirname(this.registryPath));
        await fs.writeFile(this.registryPath, JSON.stringify(registry, null, 2), "utf-8");
        this.registry = registry;
    }
    async registerPreference(params) {
        const registry = await this.loadRegistry();
        const now = Date.now();
        const scopeKey = this.normalizeScopeKey(params.key, params.userId);
        const previousActiveId = registry.activeByScopeKey[scopeKey];
        const shouldSupersede = params.supersedePrevious !== false;
        if (shouldSupersede && previousActiveId && registry.records[previousActiveId]) {
            registry.records[previousActiveId] = {
                ...registry.records[previousActiveId],
                status: "obsolete",
                obsoleteAt: now,
            };
        }
        const ttlDays = params.ttlDays ?? (params.scope === "volatile" ? 30 : undefined);
        const validUntil = typeof ttlDays === "number" && ttlDays > 0
            ? now + ttlDays * 24 * 60 * 60 * 1000
            : undefined;
        const record = {
            entryId: params.entryId,
            key: params.key.trim(),
            scope: params.scope,
            createdAt: now,
            validUntil,
            supersedes: shouldSupersede ? previousActiveId : undefined,
            userId: params.userId,
            status: "active",
        };
        registry.records[params.entryId] = record;
        registry.activeByScopeKey[scopeKey] = params.entryId;
        await this.saveRegistry(registry);
        return {
            entryId: record.entryId,
            key: record.key,
            scope: record.scope,
            createdAt: record.createdAt,
            validUntil: record.validUntil,
            supersedes: record.supersedes,
            userId: record.userId,
        };
    }
    async isEntryActive(meta) {
        const registry = await this.loadRegistry();
        const record = registry.records[meta.entryId];
        if (!record)
            return true;
        if (record.status !== "active")
            return false;
        if (record.validUntil && record.validUntil < Date.now())
            return false;
        const scopeKey = this.normalizeScopeKey(record.key, record.userId);
        return registry.activeByScopeKey[scopeKey] === record.entryId;
    }
}
const manager = new MemoryEvolutionManager();
export async function registerMemoryPreference(params) {
    return manager.registerPreference(params);
}
export function embedMemoryMeta(content, meta) {
    if (!meta)
        return content;
    return `${content} ${META_MARKER_PREFIX}${JSON.stringify(meta)}${META_MARKER_SUFFIX}`;
}
export function parseMemoryMeta(text) {
    const start = text.indexOf(META_MARKER_PREFIX);
    if (start < 0)
        return null;
    const end = text.indexOf(META_MARKER_SUFFIX, start + META_MARKER_PREFIX.length);
    if (end < 0)
        return null;
    const raw = text.slice(start + META_MARKER_PREFIX.length, end).trim();
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
/**
 * Is this entry *standing context* rather than a retrievable fact?
 *
 * A keyed stable preference is one the user named as an overwritable slot
 * ("my X is Y"), it is durable rather than fast-changing, and the registry
 * keeps exactly one active entry per key. Identity, tone and output rules of
 * this shape apply to every turn, so query relevance is simply the wrong test
 * for them — asking "does this match the current question?" is how a correct
 * style rule ends up never being applied.
 *
 * Deliberately narrow: unkeyed notes, volatile preferences and auto-extracted
 * observations stay in the relevance-gated tier.
 */
export function isStandingPreference(meta) {
    return !!meta && meta.scope === "stable" && typeof meta.key === "string" && meta.key.trim().length > 0;
}
/** Standing *and* still the active entry for its key (not superseded/expired). */
export async function isActiveStandingPreference(meta) {
    if (!isStandingPreference(meta))
        return false;
    return manager.isEntryActive(meta);
}
export function stripMemoryMeta(text) {
    // Strip all occurrences (a file can have multiple entries each with its own marker)
    let result = text;
    while (true) {
        const start = result.indexOf(META_MARKER_PREFIX);
        if (start < 0)
            break;
        const end = result.indexOf(META_MARKER_SUFFIX, start + META_MARKER_PREFIX.length);
        if (end < 0)
            break;
        const left = result.slice(0, start).trimEnd();
        const right = result.slice(end + META_MARKER_SUFFIX.length).trimStart();
        result = `${left}${left && right ? '\n' : ''}${right}`.trim();
    }
    return result;
}
function getScopeRank(meta) {
    if (!meta)
        return 0;
    if (meta.scope === "volatile")
        return 2;
    if (meta.scope === "stable")
        return 1;
    return 0;
}
function getTimeRank(chunk, meta) {
    if (meta?.createdAt)
        return meta.createdAt;
    return chunk.createdAt || 0;
}
export async function filterAndSanitizeMemoryChunks(chunks) {
    const scored = [];
    for (const chunk of chunks) {
        const meta = parseMemoryMeta(chunk.text);
        if (meta) {
            const isActive = await manager.isEntryActive(meta);
            if (!isActive) {
                continue;
            }
        }
        scored.push({
            meta,
            chunk: {
                ...chunk,
                text: stripMemoryMeta(chunk.text),
            },
        });
    }
    scored.sort((a, b) => {
        const scopeDiff = getScopeRank(b.meta) - getScopeRank(a.meta);
        if (scopeDiff !== 0)
            return scopeDiff;
        return getTimeRank(b.chunk, b.meta) - getTimeRank(a.chunk, a.meta);
    });
    return scored.map((item) => item.chunk);
}
