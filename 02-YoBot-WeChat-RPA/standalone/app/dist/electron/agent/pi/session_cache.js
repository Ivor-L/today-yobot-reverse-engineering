/**
 * 活跃会话缓存(LRU + TTL)。
 *
 * 此前是一个裸 `Map`,只在全局 reset 时 clear。主 agent 场景下会话数天然有限,
 * 所以不痛;但 RPA 接入后每个微信会话都可能建一个 session,几百个好友就是几百个
 * 常驻 AgentSession(各带完整消息历史)——内存会缓慢爆掉,且症状难以归因。
 *
 * 淘汰规则:
 *   - 永不淘汰**正在运行**的会话(busy)。运行中的 agent 被踢出缓存会导致
 *     stop() 找不到实例、abort 失效。
 *   - TTL 过期优先淘汰,其次按最近访问时间(LRU)。
 *   - 只在 set() 时清扫,不起定时器(避免打包环境里的悬挂 handle)。
 */
const DEFAULT_MAX_SIZE = 50;
const DEFAULT_TTL_MS = 30 * 60 * 1000;
function readPositiveInt(raw, fallback) {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}
export class SessionCache {
    maxSize;
    ttlMs;
    entries = new Map();
    constructor(maxSize = readPositiveInt(process.env.YOKO_SESSION_CACHE_MAX, DEFAULT_MAX_SIZE), ttlMs = readPositiveInt(process.env.YOKO_SESSION_CACHE_TTL_MS, DEFAULT_TTL_MS)) {
        this.maxSize = maxSize;
        this.ttlMs = ttlMs;
    }
    get(sessionId) {
        const entry = this.entries.get(sessionId);
        if (!entry)
            return undefined;
        entry.lastAccess = Date.now();
        return entry.value;
    }
    set(sessionId, value) {
        const existing = this.entries.get(sessionId);
        this.entries.set(sessionId, {
            value,
            lastAccess: Date.now(),
            busy: existing?.busy ?? false,
        });
        this.sweep(sessionId);
    }
    delete(sessionId) {
        this.entries.delete(sessionId);
    }
    clear() {
        this.entries.clear();
    }
    get size() {
        return this.entries.size;
    }
    /** 运行期间钉住会话,防止被淘汰。PiKernel 在 run 前后成对调用。 */
    markBusy(sessionId) {
        const entry = this.entries.get(sessionId);
        if (entry)
            entry.busy = true;
    }
    markIdle(sessionId) {
        const entry = this.entries.get(sessionId);
        if (entry) {
            entry.busy = false;
            entry.lastAccess = Date.now();
        }
    }
    /**
     * @param protectedId 本次 set() 刚写入的 key。必须豁免——否则当容量被 busy
     *   会话占满时,新建会话会在 set() 里被自己触发的清扫立刻淘汰,导致
     *   紧随其后的 get() 必然 miss、会话被反复重建。
     */
    sweep(protectedId) {
        const now = Date.now();
        for (const [id, entry] of this.entries) {
            if (id === protectedId)
                continue;
            if (!entry.busy && now - entry.lastAccess > this.ttlMs) {
                this.entries.delete(id);
            }
        }
        if (this.entries.size <= this.maxSize)
            return;
        const evictable = [...this.entries.entries()]
            .filter(([id, e]) => !e.busy && id !== protectedId)
            .sort((a, b) => a[1].lastAccess - b[1].lastAccess);
        let overflow = this.entries.size - this.maxSize;
        for (const [id] of evictable) {
            if (overflow <= 0)
                break;
            this.entries.delete(id);
            overflow--;
        }
        // overflow 仍 > 0 说明 busy 会话(或本次新建的会话)已占满容量。
        // 不强制淘汰——宁可短暂超限,也不能踢掉运行中的 agent。
    }
}
