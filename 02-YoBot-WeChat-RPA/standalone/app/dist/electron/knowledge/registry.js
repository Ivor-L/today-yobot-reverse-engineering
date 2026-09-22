import * as fs from 'fs/promises';
import * as fssync from 'fs';
import * as path from 'path';
// 商业化限制（Phase 1 的增改/上传处强制；迁移旧数据不强制）
export const KB_MAX_DOCS = 10;
export const KB_MAX_CHARS = 2000;
const ID_PATTERN = /^[A-Za-z0-9_-]+$/;
export function genDocId() {
    return `doc-${Math.random().toString(36).slice(2, 8)}`;
}
/** 字数 = 去首尾空白后的 Unicode 码点数（对中文更贴近直觉）。 */
export function countChars(content) {
    return [...(content || '').trim()].length;
}
export class KnowledgeRegistry {
    knowledgeDir;
    constructor(knowledgeDir) {
        this.knowledgeDir = knowledgeDir;
    }
    get registryPath() { return path.join(this.knowledgeDir, '.registry.json'); }
    docDir(id) { return path.join(this.knowledgeDir, id); }
    get backupPath() { return `${this.registryPath}.bak`; }
    get tmpPath() { return `${this.registryPath}.tmp`; }
    /**
     * 读注册表。
     *
     * ⚠️ **文件损坏时绝不能静默返回空表。** 旧行为是 `catch { return {} }`——
     * 一次断电写坏 JSON，用户下次启动看到的是「所有知识文档都消失了」，
     * 而且 UI 上无法与「确实没有文档」区分。更糟的是：空表会被后续的
     * `save()` 覆盖回磁盘，把「暂时读不出来」变成「真的没有了」。
     *
     * 现在的策略：
     *   文件不存在 → 空表（首次运行的正常情况）
     *   解析失败   → 先尝试备份文件；备份也坏 → **抛出**，让调用方报错而不是造成静默数据丢失
     */
    async load() {
        const readOne = async (p) => {
            let raw;
            try {
                raw = await fs.readFile(p, 'utf-8');
            }
            catch {
                return null; // 不存在
            }
            try {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
                    return parsed;
            }
            catch { /* 落到下面按损坏处理 */ }
            throw new Error('CORRUPT');
        };
        try {
            const main = await readOne(this.registryPath);
            if (main)
                return main;
        }
        catch {
            // 主文件损坏 → 用备份救
            console.error(`[Knowledge] 注册表损坏，尝试从备份恢复: ${this.backupPath}`);
            try {
                const bak = await readOne(this.backupPath);
                if (bak) {
                    console.warn('[Knowledge] 已从备份恢复注册表');
                    return bak;
                }
            }
            catch { /* 备份也坏 */ }
            throw new Error(`知识库注册表已损坏且无可用备份（${this.registryPath}）。` +
                `文档文件本身仍在磁盘上，请勿删除；修复注册表后即可恢复。`);
        }
        // 主文件不存在：若有备份则说明上次写入中途崩过，用备份
        try {
            const bak = await readOne(this.backupPath);
            if (bak) {
                console.warn('[Knowledge] 注册表缺失但存在备份，已从备份恢复');
                return bak;
            }
        }
        catch { /* 备份坏了且主文件不存在 → 当作空表（首次运行） */ }
        return {};
    }
    /**
     * 原子写：tmp → rename，并在覆盖前留一份备份。
     *
     * 直接 `writeFile` 覆盖的问题是它**不是原子的**：断电可能留下半个 JSON，
     * 而注册表是「哪些文档存在、各自什么 scope」的唯一记录 —— 写坏等于整个知识库失联。
     * rename 在同一文件系统内是原子的，所以读者只会看到「旧的完整版」或「新的完整版」。
     */
    async save(map) {
        await fs.mkdir(this.knowledgeDir, { recursive: true });
        // 先备份当前版本（存在才备份）。备份失败不阻断保存——
        // 没有备份只是少了一层保险，而拒绝保存会让用户的改动直接丢失。
        try {
            await fs.copyFile(this.registryPath, this.backupPath);
        }
        catch { /* 首次保存时主文件还不存在，正常 */ }
        await fs.writeFile(this.tmpPath, JSON.stringify(map, null, 2), 'utf-8');
        await fs.rename(this.tmpPath, this.registryPath);
    }
    async list() {
        const map = await this.load();
        return Object.values(map).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    async count() {
        return Object.keys(await this.load()).length;
    }
    /** 生成一个在注册表和磁盘上都不冲突的 docId。 */
    uniqueId(map) {
        let id = genDocId();
        while (map[id] || fssync.existsSync(this.docDir(id)))
            id = genDocId();
        return id;
    }
}
/**
 * 主 Agent（及非 agentic 会话）应检索的知识库命名空间前缀：scope ∈ {main, all}。
 * 返回形如 `knowledge/<docId>`，直接喂给 MemoryStore.search 的 namespaces。
 * 读不到注册表（老库/未迁移）→ 返回空数组，调用方据此不注入本地知识（个人记忆仍走广播）。
 */
export async function mainScopeNamespaces(knowledgeDir) {
    try {
        const docs = await new KnowledgeRegistry(knowledgeDir).list();
        return docs.filter(d => d.scope === 'main' || d.scope === 'all').map(d => `knowledge/${d.id}`);
    }
    catch (e) {
        // 检索路径**故意降级为空**而不是上抛：注册表读不出来时，让这一轮对话
        // 没有知识注入，远好于把整轮回复打挂。
        //
        // 但一定要打日志。`load()` 现在会在注册表损坏时抛错，而这里如果静默吞掉，
        // 现场表现就只是「知识库突然不生效了」——没有任何线索。
        // （写路径不降级：main.ts 的 create/update 会把这个错直接报给用户，
        //   让他知道注册表需要修，而不是继续在坏账本上写新条目。）
        console.error('[Knowledge] 读取注册表失败，本轮不注入本地知识:', e instanceof Error ? e.message : e);
        return [];
    }
}
/**
 * 幂等迁移（每次启动可安全重跑，只处理尚未纳入注册表的项）：
 *  - 扁平 `knowledge/*.md`（旧账户弹窗的主 Agent 知识）→ 迁入 `knowledge/<docId>/`，scope=main。
 *  - 既有 `knowledge/<ns>/`（子 Agent 手建/上传的命名空间）→ 登记为 scope=all（安全默认，主子都不断）。
 *
 * 迁移会 rename 扁平文件，旧路径的向量 chunk 需由调用方 purge（传 purgeOldPath）。
 * 新路径的索引交给启动后的 fileMemory.syncAll()（登录后触发）。
 */
export async function migrateKnowledge(knowledgeDir, opts) {
    const reg = new KnowledgeRegistry(knowledgeDir);
    const map = await reg.load();
    const result = { migratedFlat: 0, registeredNs: 0, movedOldPaths: [] };
    let entries;
    try {
        entries = await fs.readdir(knowledgeDir, { withFileTypes: true });
    }
    catch {
        return result; // knowledge 目录还不存在
    }
    const known = new Set(Object.keys(map));
    for (const e of entries) {
        if (e.name.startsWith('.'))
            continue; // .registry.json 等点文件
        if (e.isFile() && (e.name.endsWith('.md') || e.name.endsWith('.txt'))) {
            // 扁平文件 -> 独立文档目录（scope=main，维持旧「主 Agent 可用」语义）
            //
            // 顺序必须是：**先原子写注册表，再 rename 文件，最后清旧向量。**
            //
            // 旧顺序是 rename -> purge -> 循环结束后才 save，中间任一步崩溃就留下
            // 「文件已移动、旧向量已删、注册表没写」的半迁移态。下次启动时该目录
            // 走下面的 else-if 分支被登记成 **scope=all** —— 原本只有主 Agent
            // 能读的文档变成子 Agent 也能读，**隔离语义被静默破坏**（安全问题，
            // 不只是数据问题）。
            //
            // 现在每篇文档是一个「先记账、后动手」的小事务：
            //   1. 注册表先落盘（原子 rename，且记 scope=main）
            //   2. 再 rename 文件；失败就回滚注册表条目
            //   3. 最后清旧向量（失败无妨：新路径的索引由 syncAll 建立，
            //      旧路径的残留向量只会造成一次重复命中，不会丢数据）
            // 崩溃后重跑：注册表已有该 id -> 不会被重新当成扁平文件，
            // 也不会被误登记成 scope=all。
            const id = reg.uniqueId(map);
            const dir = reg.docDir(id);
            const src = path.join(knowledgeDir, e.name);
            const dest = path.join(dir, e.name);
            const content = await fs.readFile(src, 'utf-8').catch(() => '');
            await fs.mkdir(dir, { recursive: true });
            map[id] = {
                id,
                title: e.name.replace(/\.(md|txt)$/i, ''),
                scope: 'main',
                chars: countChars(content),
                file: e.name,
                createdAt: Date.now(),
            };
            await reg.save(map); // (1) 先记账
            try {
                await fs.rename(src, dest); // (2) 再动文件
            }
            catch (err) {
                // 文件没搬成功 -> 注册表里那条是假的，必须撤掉，
                // 否则留下一个「登记了但文件不在」的空文档。
                delete map[id];
                await reg.save(map).catch(() => { });
                console.error(`[Knowledge] 迁移 ${e.name} 失败，已回滚注册表条目:`, err);
                continue;
            }
            result.migratedFlat++;
            const oldRel = `knowledge/${e.name}`;
            result.movedOldPaths.push(oldRel);
            // (3) 清旧向量：失败不影响正确性（见上方注释），故仍是 best-effort
            if (opts?.purgeOldPath) {
                try {
                    await opts.purgeOldPath(oldRel);
                }
                catch { /* best-effort */ }
            }
        }
        else if (e.isDirectory() && ID_PATTERN.test(e.name) && !known.has(e.name)) {
            // 既有命名空间目录（未登记）→ 登记 scope=all
            const dir = path.join(knowledgeDir, e.name);
            const files = (await fs.readdir(dir).catch(() => []))
                .filter(f => f.endsWith('.md') || f.endsWith('.txt'));
            if (files.length === 0)
                continue;
            let chars = 0;
            for (const f of files) {
                chars += countChars(await fs.readFile(path.join(dir, f), 'utf-8').catch(() => ''));
            }
            map[e.name] = {
                id: e.name,
                title: e.name,
                scope: 'all',
                chars,
                file: files[0],
                createdAt: Date.now(),
            };
            // 逐条落盘，不攒到循环结束：让已完成的部分立即固化。
            await reg.save(map);
            result.registeredNs++;
        }
    }
    // 上面每条都已独立落盘，无需在此统一 save（省掉一次多余的备份轮转）。
    return result;
}
