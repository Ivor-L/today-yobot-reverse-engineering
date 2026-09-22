/**
 * 知识库配额的客户端读取。
 *
 * 配额由服务端通过 Entitlement Bundle 下发（`features.knowledge_base.limits`），
 * 这样改档位只需改服务端配置 + 重启，**客户端不用发版**。
 *
 * 三条设计约束：
 *
 * 1. **不验签。** 与 bundle_writer 的定位一致：Agent 是投递员不是判定点。
 *    而且客户端这层配额本质是**产品体验层**（友好提示、配额条）——客户端在用户手里，
 *    真正不可绕过的闸门是服务端 `/v1/embeddings` 的按用户限流
 *    （见 server/src/modules/proxy/embedding_rate_limit.ts）。
 *    为一道体验层的墙做本地验签是错配。
 *
 * 2. **读不到就回落免费档，绝不放行。** 新客户端 + 旧服务端时 Bundle 里没有
 *    `knowledge_base` 这一项，此时必须按最紧的档位走 —— 宁可少给，不能白送。
 *    但要**大声打日志**：静默降级比报错更难排查（部署顺序必须服务端先上）。
 *
 * 3. **带缓存。** syncFile 对每个文件都会问一次配额，不能每次都读盘 + 解 base64。
 */
import fs from 'fs/promises';
import { getBundlePath } from '../shared/credentials_path.js';
const MB = 1024 * 1024;
/**
 * 免费档兜底值。**必须与服务端 `server/src/config/kb_limits.ts` 的 FREE 一致。**
 * 两边不一致时用户会看到"客户端说能传、服务端拦下来"这类无法解释的现象。
 */
export const FREE_FALLBACK = {
    maxFileBytes: 5 * MB,
    maxTotalBytes: 10 * MB,
    maxDailyBytes: 10 * MB,
    maxConcurrentIndexJobs: 1,
    formats: ['txt', 'md'],
};
/** 逐字段校验服务端下发的 limits。任何一项不合法 → 整份丢弃回落免费档。 */
export function parseKbLimits(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const o = raw;
    const num = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;
    const maxFileBytes = num(o.maxFileBytes);
    const maxTotalBytes = num(o.maxTotalBytes);
    const maxDailyBytes = num(o.maxDailyBytes);
    const maxConcurrentIndexJobs = num(o.maxConcurrentIndexJobs);
    const formats = Array.isArray(o.formats)
        ? o.formats.filter((f) => typeof f === 'string' && !!f).map((f) => f.toLowerCase())
        : null;
    if (!maxFileBytes || !maxTotalBytes || !maxDailyBytes || !maxConcurrentIndexJobs)
        return null;
    if (!formats || formats.length === 0)
        return null;
    // 单文件上限大于总容量说明服务端配置写错了，宁可回落也不要按错的闸门放行
    if (maxFileBytes > maxTotalBytes)
        return null;
    return { maxFileBytes, maxTotalBytes, maxDailyBytes, maxConcurrentIndexJobs, formats };
}
const CACHE_TTL_MS = 60_000;
let _cache = null;
let _warnedFallback = false;
/** 从共享 Bundle 里取知识库配额。带 60s 缓存；任何异常都回落免费档。 */
export async function getKbEntitlement() {
    const now = Date.now();
    if (_cache && now - _cache.at < CACHE_TTL_MS)
        return _cache.value;
    const result = await readFromBundle();
    _cache = { value: result, at: now };
    // 回落只在第一次（和每次进程重启后）警告一次，避免刷满日志 ——
    // 但一定要警告：静默降级到免费档是「新客户端 + 旧服务端」的典型症状，
    // 不打日志的话现场只会表现为「用户说配额不对」，没人能定位。
    if (result.fallback && !_warnedFallback) {
        _warnedFallback = true;
        console.warn('[KbLimits] 未能从 Entitlement Bundle 读到 knowledge_base 配额，已回落免费档。' +
            '若服务端已部署新版本，请检查 Bundle 是否已续期（部署顺序应为服务端先上）。');
    }
    return result;
}
async function readFromBundle() {
    try {
        const raw = await fs.readFile(getBundlePath(), 'utf8');
        const envelope = JSON.parse(raw);
        if (!envelope?.payload)
            return fallback();
        const payload = JSON.parse(Buffer.from(String(envelope.payload), 'base64url').toString('utf8'));
        const kb = payload?.features?.knowledge_base;
        if (!kb)
            return fallback();
        // exp 是硬墙（ENTITLEMENT_BUNDLE.md §5）：过期就当没有这项权益，回落免费档。
        // 服务端给免费档的 exp 是一年滚动值，所以正常情况下不会走到这里。
        const nowSec = Math.floor(Date.now() / 1000);
        if (typeof kb.exp === 'number' && kb.exp <= nowSec)
            return fallback();
        const limits = parseKbLimits(kb.limits);
        if (!limits)
            return fallback();
        const tier = kb.tier === 'paid' ? 'paid' : 'free';
        return { tier, limits, fallback: false };
    }
    catch {
        return fallback();
    }
}
function fallback() {
    return { tier: 'free', limits: FREE_FALLBACK, fallback: true };
}
/** 仅供测试/登录态变更后强制重读。 */
export function invalidateKbEntitlementCache() {
    _cache = null;
}
