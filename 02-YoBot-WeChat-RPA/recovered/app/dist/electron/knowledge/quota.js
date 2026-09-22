/**
 * 知识库四道闸的判定与账本。
 *
 * 闸门本身的定位是**风控**，不是收费项（设计见 docs/ENTERPRISE_KNOWLEDGE_BASE_DESIGN.md §5.4）：
 * 容量的本质成本极低，限它是为了防恶意灌入把平台的 embedding 配额打爆。
 * 所以阈值取法是「正常用户永远碰不到，恶意灌入很快撞上」。
 *
 * ⚠️ 这一层是**产品体验层**：客户端在用户手里，Agent 的文件工具也能直接往
 * workspace/knowledge/ 写文件。真正不可绕过的闸门在服务端 /v1/embeddings 的按用户限流。
 * 这里的价值是「友好提示 + 配额条」，以及拦住绝大多数非恶意的超量。
 */
import * as fs from 'fs/promises';
import * as path from 'path';
const ALLOW = { allowed: true };
function mb(bytes) {
    if (bytes >= 1024 * 1024 * 1024)
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    return `${Math.max(1, Math.round(bytes / (1024 * 1024)))} MB`;
}
/**
 * 用**本地日期**而不是 UTC：用户理解的「今天」是自己时区的今天，
 * 用 UTC 会出现「明明是早上，额度却还没重置」的困惑。
 */
function localDateKey(now = new Date()) {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
/**
 * 日增量账本的文件路径 —— **全仓只能有这一份定义。**
 *
 * 主进程（Electron 上传 IPC）与 server 子进程（syncFile 索引入口）都要读写它。
 * 两边各拼一次路径就会出现「一边记账、另一边看不到」，日增量闸等于半失效。
 * 两个进程都拿得到 `USER_DATA_PATH`（main.ts fork 时注入），所以口径天然一致。
 */
export function kbLedgerPath() {
    const base = process.env.USER_DATA_PATH || process.cwd();
    return path.join(base, 'data', 'kb_daily_quota.json');
}
export class KbQuotaLedger {
    ledgerPath;
    constructor(ledgerPath = kbLedgerPath()) {
        this.ledgerPath = ledgerPath;
    }
    async read() {
        const today = localDateKey();
        try {
            const parsed = JSON.parse(await fs.readFile(this.ledgerPath, 'utf-8'));
            if (parsed?.date === today && typeof parsed.bytes === 'number' && parsed.bytes >= 0) {
                return { date: today, bytes: parsed.bytes };
            }
        }
        catch { /* 首次运行 / 文件损坏 → 视作今天从 0 开始 */ }
        return { date: today, bytes: 0 };
    }
    async todayBytes() {
        return (await this.read()).bytes;
    }
    /** 记入今日新增。失败只警告不抛：账本坏了不该让用户传不了文档。 */
    async add(bytes) {
        if (bytes <= 0)
            return;
        try {
            const cur = await this.read();
            await fs.mkdir(path.dirname(this.ledgerPath), { recursive: true });
            await fs.writeFile(this.ledgerPath, JSON.stringify({ date: cur.date, bytes: cur.bytes + bytes }), 'utf-8');
        }
        catch (e) {
            console.warn('[KbQuota] 日增量账本写入失败（不阻断上传）:', e?.message || e);
        }
    }
}
// ---------------------------------------------------------------
// 并发索引计数（进程内即可：索引任务不跨进程）
// ---------------------------------------------------------------
let _activeIndexJobs = 0;
export function activeIndexJobs() {
    return _activeIndexJobs;
}
/**
 * 占一个索引槽位。返回 release 函数。
 * 用 try/finally 包住调用，漏 release 会让并发数只增不减、最终永久拒绝。
 */
export function acquireIndexSlot() {
    _activeIndexJobs++;
    let released = false;
    return () => {
        if (released)
            return; // 幂等：重复 release 会把计数带负
        released = true;
        _activeIndexJobs--;
    };
}
/** 仅供测试重置。 */
export function resetIndexJobs() {
    _activeIndexJobs = 0;
}
// ---------------------------------------------------------------
// 闸门判定
// ---------------------------------------------------------------
/**
 * 产品**有能力解析**、但只对付费档开放的格式。
 *
 * 存在的意义是把「我们不支持这个格式」和「你这一档用不了这个格式」分开说。
 * 两句话对用户的含义完全不同：前者是死路，后者是升级即可。
 * 免费档只有 txt/md，而老版本所有人都能传 PDF —— 说成「不支持」既不准确
 * （官网写着支持），也白白丢掉了那个升级时刻。
 *
 * 必须与 server/src/config/kb_limits.ts 的 PAID.formats 减去 FREE.formats 一致。
 */
const PAID_ONLY_FORMATS = ['pdf', 'docx', 'xlsx'];
export function checkFormat(filename, limits) {
    const ext = path.extname(filename).replace('.', '').toLowerCase();
    if (!ext || !limits.formats.includes(ext)) {
        const upgradable = ext && PAID_ONLY_FORMATS.includes(ext);
        return {
            allowed: false,
            gate: 'format',
            reason: upgradable
                ? `.${ext} 需要付费版（当前可用：${limits.formats.map((f) => '.' + f).join('、')}）`
                : `不支持 .${ext || '?'} 格式（当前可用：${limits.formats.map((f) => '.' + f).join('、')}）`,
        };
    }
    return ALLOW;
}
export function checkFileSize(bytes, limits) {
    if (bytes > limits.maxFileBytes) {
        return {
            allowed: false,
            gate: 'file_size',
            reason: `单个文件不超过 ${mb(limits.maxFileBytes)}（当前 ${mb(bytes)}）`,
        };
    }
    return ALLOW;
}
export function checkTotalCapacity(currentBytes, addBytes, limits) {
    if (currentBytes + addBytes > limits.maxTotalBytes) {
        const left = Math.max(0, limits.maxTotalBytes - currentBytes);
        return {
            allowed: false,
            gate: 'total_capacity',
            reason: `知识库容量已用 ${mb(currentBytes)} / ${mb(limits.maxTotalBytes)}，剩余 ${mb(left)} 放不下这份内容`,
        };
    }
    return ALLOW;
}
/**
 * 「替换一篇已有文档」时的容量校验。
 *
 * 单独成函数是因为这条算式已经算错过两次，而它藏在 main.ts 的闭包里、测不到。
 *
 * 正确形式：`(总量 - 这篇的旧体积) + 这篇的新体积`
 *
 * 两种典型错法：
 *   - `总量 + 新体积`      → 旧体积被算了两遍，等量替换也可能被误拦
 *   - `(总量 - 旧) + 净增` → **少算一次旧体积**。总量 190MB、旧 10MB、新 30MB 时
 *                            算出 (190-10)+20 = 200MB 放行，实际 180+30 = 210MB，超了没拦。
 *
 * 注意「净增量」只属于**日增量**账本（避免反复微调长文档飞快吃光当天额度），
 * 容量永远要按完整新体积算。两个量不能共用一个变量 —— 那正是第二种错法的来源。
 */
export function checkCapacityForReplace(currentTotalBytes, existingBytes, newBytes, limits) {
    const others = Math.max(0, currentTotalBytes - existingBytes);
    return checkTotalCapacity(others, newBytes, limits);
}
export function checkDailyIncrement(todayBytes, addBytes, limits) {
    if (todayBytes + addBytes > limits.maxDailyBytes) {
        return {
            allowed: false,
            gate: 'daily_increment',
            reason: `今日新增已达 ${mb(limits.maxDailyBytes)} 上限，明天可继续（已有文档不受影响）`,
        };
    }
    return ALLOW;
}
export function checkConcurrency(limits) {
    if (_activeIndexJobs >= limits.maxConcurrentIndexJobs) {
        return {
            allowed: false,
            gate: 'concurrency',
            reason: `同时最多处理 ${limits.maxConcurrentIndexJobs} 个文件，请等当前文件处理完`,
        };
    }
    return ALLOW;
}
/** 累计单个目录树里可索引文本的字节数（跳过点目录与 raw/ 原件）。 */
async function walkTextBytes(dir) {
    let total = 0;
    let entries;
    try {
        entries = await fs.readdir(dir, { withFileTypes: true });
    }
    catch {
        return 0;
    }
    for (const e of entries) {
        if (e.name.startsWith('.'))
            continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
            // 原件不计入：闸门管的是「索引成本」，而 raw/ 不进索引。
            // 计入会让同一份内容被算两遍（用户传了 100MB 却显示用掉 200MB）。
            if (e.name === 'raw')
                continue;
            total += await walkTextBytes(full);
        }
        else if (e.name.endsWith('.md') || e.name.endsWith('.txt')) {
            try {
                total += (await fs.stat(full)).size;
            }
            catch { /* 文件刚被删掉，忽略 */ }
        }
    }
    return total;
}
/**
 * `raw/` 原件的总量上限（字节）。
 *
 * 为什么需要一套**独立**配额：embedding 成本和本地磁盘是两笔不同的账。
 * 容量闸按「规范化后的文本」算（原件不进索引，计入会让同一份内容算两遍），
 * 但原件仍然实实在在占磁盘 —— 用户反复上传接近 50MB、正文极少的扫描版
 * PDF/Office，文本几乎不增长而磁盘无限膨胀，最终填满用户的盘。
 *
 * 取 4× 文本容量上限：正常文档（Word/PDF）原件通常是纯文本的 3~10 倍，
 * 4 倍能容下绝大多数正常使用；只有「正文极少的大文件」才会先撞上它。
 */
export const RAW_QUOTA_MULTIPLIER = 4;
/** 统计 `raw/` 原件占用的磁盘字节数（不限后缀 —— 原件是什么格式都占盘）。 */
export async function measureRawBytes(workspaceDir) {
    const walkRaw = async (dir) => {
        let total = 0;
        let entries;
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        }
        catch {
            return 0;
        }
        for (const e of entries) {
            if (e.name.startsWith('.'))
                continue;
            const full = path.join(dir, e.name);
            if (e.isDirectory()) {
                total += e.name === 'raw' ? await sumAllFiles(full) : await walkRaw(full);
            }
        }
        return total;
    };
    let total = await walkRaw(path.join(workspaceDir, 'knowledge'));
    const agentsDir = path.join(workspaceDir, 'agents');
    let agents = [];
    try {
        agents = await fs.readdir(agentsDir, { withFileTypes: true });
    }
    catch { /* 没有 agents 目录 */ }
    for (const a of agents) {
        if (!a.isDirectory() || a.name.startsWith('.'))
            continue;
        total += await walkRaw(path.join(agentsDir, a.name, 'knowledge'));
    }
    return total;
}
/** 递归累计目录下**所有**文件的字节数（不筛后缀）。 */
async function sumAllFiles(dir) {
    let total = 0;
    let entries;
    try {
        entries = await fs.readdir(dir, { withFileTypes: true });
    }
    catch {
        return 0;
    }
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory())
            total += await sumAllFiles(full);
        else {
            try {
                total += (await fs.stat(full)).size;
            }
            catch { /* 刚被删，忽略 */ }
        }
    }
    return total;
}
/** 原件磁盘闸。超限时**不阻断上传**，只是不再保留原件（见调用点注释）。 */
export function checkRawQuota(currentRawBytes, addBytes, limits) {
    const cap = limits.maxTotalBytes * RAW_QUOTA_MULTIPLIER;
    if (currentRawBytes + addBytes > cap) {
        return {
            allowed: false,
            gate: 'raw_storage',
            reason: `上传原件占用已达 ${mb(cap)} 上限，本次不再保留原件（知识内容正常入库）`,
        };
    }
    return ALLOW;
}
/**
 * 统计**整个 workspace 的知识库**已占用字节数。
 *
 * ⚠️ 必须同时统计两处，与 `isKnowledgeDocPath` 的口径严格一致：
 *   - 全局共享：`<workspace>/knowledge/**`
 *   - 子 Agent 私有：`<workspace>/agents/<name>/knowledge/**`
 *
 * 只统计前者会留下一个绕过口：配额入口承认 `agents/*​/knowledge/**` 是知识库
 * （所以会拦它的单文件大小），但总容量却不把它算进去 —— 子 Agent 私有知识库
 * 可以无限增长而永远不触发总容量闸。
 */
export async function measureKnowledgeBytes(workspaceDir) {
    let total = await walkTextBytes(path.join(workspaceDir, 'knowledge'));
    // agents/<name>/knowledge/ —— 逐个 agent 目录看有没有 knowledge 子目录
    const agentsDir = path.join(workspaceDir, 'agents');
    let agents = [];
    try {
        agents = await fs.readdir(agentsDir, { withFileTypes: true });
    }
    catch { /* 没有 agents 目录 */ }
    for (const a of agents) {
        if (!a.isDirectory() || a.name.startsWith('.'))
            continue;
        total += await walkTextBytes(path.join(agentsDir, a.name, 'knowledge'));
    }
    return total;
}
