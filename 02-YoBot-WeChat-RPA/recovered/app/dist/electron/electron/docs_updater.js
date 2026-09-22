// SOP 文档热更新 —— 启动时静默拉取最新文档包。
//
// 设计见 docs/SOP_DOCS_MAINTENANCE_AND_RELEASE.md §5.2–§5.5。
//
// 本模块刻意不 import electron：所有外部依赖（路径、客户端版本、fetch、日志）
// 都从 deps 传入，因此可以在 node 里直接跑 smoke 测试。
// 主进程只负责在 app ready 后把真实依赖喂进来。
//
// 三条不可动摇的约束：
//   1) 任何失败都静默降级，绝不阻塞启动 —— 文档旧一版远好过软件起不来。
//   2) overlay 的切换必须原子 —— 「解压到一半」的混合版本比任何干净状态都糟。
//   3) 版本判定用「不一致」而非「本地更旧」—— 否则回滚永远退不回去。
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
// --- 路径 --------------------------------------------------------------------
/** 热更覆盖层：manual_provider 的 tier1 */
function overlayDocsDir(deps, skill) {
    return path.join(deps.userDataPath, 'skills_docs', skill, 'docs');
}
/** 切换标记放在 docs/ 之外，否则清空 docs/ 时会把它一起删掉，崩溃恢复就失效了 */
function swappingMarker(deps, skill) {
    return path.join(deps.userDataPath, 'skills_docs', skill, '.swapping');
}
/** 记录 overlay 是「在哪个客户端版本下装上的」，供 §5.3 仲裁区分陈旧遮蔽与主动回滚 */
function appliedMarker(deps, skill) {
    return path.join(deps.userDataPath, 'skills_docs', skill, '.applied.json');
}
function readAppliedClientVersion(deps, skill) {
    try {
        const raw = fs.readFileSync(appliedMarker(deps, skill), 'utf-8');
        const v = JSON.parse(raw)?.client_version;
        return typeof v === 'string' ? v : null;
    }
    catch {
        return null;
    }
}
/** 安装包内置：manual_provider 的 tier2，更新机制从不写它 */
function bundledDocsDir(deps, skill) {
    if (!deps.resourcesPath)
        return null;
    return path.join(deps.resourcesPath, 'skills_docs', skill, 'docs');
}
function stagingRoot(deps) {
    return path.join(deps.userDataPath, 'skills_docs', '.staging');
}
// --- 版本 --------------------------------------------------------------------
const DOCS_VERSION_RE = /^(\d{4})\.(\d{2})\.(\d{2})\.(\d+)$/;
/**
 * docs_version 是日期序列 YYYY.MM.DD.N，不是 semver。
 * 不能直接比字符串：'2026.07.19.10' 的字典序小于 '2026.07.19.9'。
 */
export function docsVersionCode(v) {
    const m = DOCS_VERSION_RE.exec(v || '');
    if (!m)
        return 0;
    return Number(`${m[1]}${m[2]}${m[3]}`) * 1000 + Number(m[4]);
}
export function readDocsVersion(docsDir) {
    try {
        const raw = fs.readFileSync(path.join(docsDir, 'docs.meta.json'), 'utf-8');
        const v = JSON.parse(raw)?.docs_version;
        return typeof v === 'string' ? v : null;
    }
    catch {
        return null;
    }
}
// --- §5.3 overlay 与内置的版本仲裁 ---------------------------------------------
/**
 * 在任何网络动作之前执行。返回本次启动「当前生效」的版本号。
 *
 * 处理两件事：
 *   1) 崩溃恢复：残留 .swapping 说明上次切换未完成，overlay 处于未知混合状态 → 整个删掉。
 *   2) 陈旧遮蔽：overlay 不比内置新时删除 overlay。
 *      tier1 永远盖过 tier2，所以客户端升级后，旧 overlay 会静默遮蔽更新的内置文档——
 *      不报错、不崩溃，只是内容悄悄变旧，是本机制里最难被发现的故障。
 *
 * 仲裁必须整目录进行。逐文件比较会产生「这篇来自 07.25、那篇来自 07.18」的混合版本，
 * 事后无法推理用户当时究竟读到了什么。
 */
/** 删除 overlay 时必须连同 .applied.json 一起删，否则残留标记会误导下一次仲裁 */
function dropOverlay(deps, skill) {
    fs.rmSync(overlayDocsDir(deps, skill), { recursive: true, force: true });
    fs.rmSync(appliedMarker(deps, skill), { force: true });
}
export function reconcileOverlay(deps, skill) {
    const log = deps.log || (() => { });
    const overlay = overlayDocsDir(deps, skill);
    const marker = swappingMarker(deps, skill);
    if (fs.existsSync(marker)) {
        log(`[DocsUpdater] ${skill}: 检测到 .swapping 残留，上次切换未完成，删除 overlay 回落内置`);
        dropOverlay(deps, skill);
        fs.rmSync(marker, { force: true });
    }
    const bundledDir = bundledDocsDir(deps, skill);
    const bundled = bundledDir ? readDocsVersion(bundledDir) : null;
    const overlayVersion = fs.existsSync(overlay) ? readDocsVersion(overlay) : null;
    if (fs.existsSync(overlay) && !overlayVersion) {
        // overlay 存在但读不出版本号 —— 无法参与仲裁，也无法向服务端表达「我是哪一版」。
        // 留着它只会让状态不可推理。
        log(`[DocsUpdater] ${skill}: overlay 缺少可解析的 docs.meta.json，删除`);
        dropOverlay(deps, skill);
        return bundled;
    }
    if (overlayVersion && bundled) {
        const cmp = docsVersionCode(overlayVersion) - docsVersionCode(bundled);
        if (cmp === 0) {
            // 冗余：内容与内置同版，删掉后生效版本不变，少一份状态。
            log(`[DocsUpdater] ${skill}: overlay 与内置同为 ${bundled}，删除冗余 overlay`);
            dropOverlay(deps, skill);
            return bundled;
        }
        if (cmp < 0) {
            // overlay 比内置旧。两种成因，处理方式相反：
            //
            //  (a) 客户端升级后内置文档反超了 overlay —— 旧 overlay 会静默遮蔽新内置，必须删。
            //  (b) 服务端主动回滚到了比内置更旧的版本 —— 这是我们要的状态，删了会导致
            //      每次启动「删除 → 重新下载」无限循环，且每次启动都有一段时间读的是内置版本。
            //
            // 用「装上它时的客户端版本」区分：与当前客户端一致说明客户端没升级过，
            // 那它只可能是 (b)。读不到该标记时按 (a) 处理（保守，与旧行为一致）。
            const appliedUnder = readAppliedClientVersion(deps, skill);
            if (appliedUnder && appliedUnder === deps.clientVersion) {
                log(`[DocsUpdater] ${skill}: overlay(${overlayVersion}) 旧于内置(${bundled})，但系本客户端主动应用（回滚），保留`);
                return overlayVersion;
            }
            log(`[DocsUpdater] ${skill}: overlay(${overlayVersion}) 不比内置(${bundled}) 新且非本客户端应用，删除 overlay`);
            dropOverlay(deps, skill);
            return bundled;
        }
    }
    return overlayVersion || bundled;
}
// --- §5.4 staging 校验 ---------------------------------------------------------
/**
 * staging 完整性校验。不通过即视为无效包，overlay 不动。
 * 特别是 docs_version 必须与服务端声明一致——不一致意味着 OSS 上的产物
 * 与 catalog 记录对不上（发布时传错文件），这种包装上去会让版本号彻底失去意义。
 */
export function validateStaging(dir, expectedVersion) {
    if (!fs.existsSync(dir))
        return 'staging 目录不存在';
    const entries = fs.readdirSync(dir).filter(n => n !== '.' && n !== '..');
    if (!entries.length)
        return 'staging 为空';
    const actual = readDocsVersion(dir);
    if (!actual)
        return 'docs.meta.json 缺失或无法解析';
    if (actual !== expectedVersion)
        return `版本不符：包内 ${actual}，服务端声明 ${expectedVersion}`;
    if (!fs.existsSync(path.join(dir, 'index.md')))
        return 'index.md 缺失';
    return null;
}
// --- §5.4 原子切换 --------------------------------------------------------------
/**
 * 把 staging 内容切换为生效的 overlay。
 *
 * 不用「重命名整个目录」来切换：installSkillPackage 曾因目录被资源管理器/杀软占用而 EPERM。
 * docs 都是 .md/.json，不会被长期持有句柄，逐文件替换是安全的；
 * 中途失败由 .swapping 标记兜住——下次启动会发现它并整体回落到内置版本。
 */
function commitSwap(deps, skill, stagingDir, version) {
    const overlay = overlayDocsDir(deps, skill);
    const marker = swappingMarker(deps, skill);
    fs.mkdirSync(path.dirname(marker), { recursive: true });
    fs.writeFileSync(marker, new Date().toISOString(), 'utf-8');
    fs.rmSync(overlay, { recursive: true, force: true });
    fs.mkdirSync(overlay, { recursive: true });
    for (const name of fs.readdirSync(stagingDir)) {
        fs.renameSync(path.join(stagingDir, name), path.join(overlay, name));
    }
    // 记录「是哪个客户端版本装上的」。仲裁靠它区分「客户端升级后被内置反超」
    // 与「服务端主动回滚到比内置更旧的版本」——两者的 overlay 都比内置旧，处理方式却相反。
    fs.writeFileSync(appliedMarker(deps, skill), JSON.stringify({ docs_version: version, client_version: deps.clientVersion, at: new Date().toISOString() }, null, 2), 'utf-8');
    // 只有全部搬完才删标记。中途抛异常则标记保留，下次启动会据此把 overlay 整个删掉、回落内置。
    fs.rmSync(marker, { force: true });
}
// --- 单个包的安装 ---------------------------------------------------------------
export async function applyDocsPackage(deps, pkg) {
    const log = deps.log || (() => { });
    const staging = path.join(stagingRoot(deps), `${pkg.skill}_${pkg.docs_version}_${Date.now().toString(36)}`);
    const tmpZip = `${staging}.zip`;
    try {
        fs.mkdirSync(stagingRoot(deps), { recursive: true });
        // 1. 下载
        const resp = await deps.fetchFn(pkg.artifact_url);
        if (!resp.ok)
            throw new Error(`下载失败 http_${resp.status} ${resp.statusText}`);
        const buf = Buffer.from(await resp.arrayBuffer());
        fs.writeFileSync(tmpZip, buf);
        // 2. sha256 校验（docs 包必校验：文档直接驱动 agent 行为，被篡改的后果不亚于代码）
        const digest = crypto.createHash('sha256').update(buf).digest('hex');
        if (digest.toLowerCase() !== (pkg.sha256 || '').toLowerCase()) {
            throw new Error('sha256 不匹配，丢弃');
        }
        // 3. 解压到 staging —— 全程不触碰正在生效的 overlay
        fs.mkdirSync(staging, { recursive: true });
        const extract = deps.extractFn || (async (zip, dir) => {
            // 用 JS 原生解压，不 shell 出 PowerShell Expand-Archive：
            // 后者的 stderr 用控制台代码页编码，被本进程按 UTF-8 解码会乱码甚至被 NUL 截断。
            const mod = await import('extract-zip');
            await mod.default(zip, { dir });
        });
        await extract(tmpZip, staging);
        // 打包时若多套了一层目录，取该子目录
        let srcDir = staging;
        const top = fs.readdirSync(staging, { withFileTypes: true });
        if (!top.some(e => e.isFile() && e.name === 'docs.meta.json')) {
            const onlyDir = top.find(e => e.isDirectory());
            if (onlyDir)
                srcDir = path.join(staging, onlyDir.name);
        }
        // 4. 完整性校验
        const invalid = validateStaging(srcDir, pkg.docs_version);
        if (invalid)
            throw new Error(`包校验不通过：${invalid}`);
        // 5. 原子切换
        commitSwap(deps, pkg.skill, srcDir, pkg.docs_version);
        log(`[DocsUpdater] ${pkg.skill}: 已更新至 ${pkg.docs_version}`);
        return { skill: pkg.skill, action: 'updated', to: pkg.docs_version };
    }
    catch (e) {
        const reason = e?.message || String(e);
        log(`[DocsUpdater] ${pkg.skill}: 更新失败（overlay 未改动）: ${reason}`);
        return { skill: pkg.skill, action: 'failed', to: pkg.docs_version, reason };
    }
    finally {
        fs.rmSync(tmpZip, { force: true });
        fs.rmSync(staging, { recursive: true, force: true });
    }
}
// --- 技能发现 -------------------------------------------------------------------
/**
 * 哪些技能参与热更，由「内置里有没有 docs.meta.json」决定，而不是写死一份名单。
 * 名单一旦写死，新技能接入热更时就多了一处必须记得改的地方——漏改不会报错，
 * 只是那个技能的文档永远停在打包时的版本。
 */
export function discoverDocsSkills(deps) {
    const root = deps.resourcesPath ? path.join(deps.resourcesPath, 'skills_docs') : null;
    if (!root || !fs.existsSync(root))
        return [];
    const out = [];
    for (const e of fs.readdirSync(root, { withFileTypes: true })) {
        if (!e.isDirectory())
            continue;
        if (fs.existsSync(path.join(root, e.name, 'docs', 'docs.meta.json')))
            out.push(e.name);
    }
    return out;
}
/**
 * 只读：当前每个技能实际生效的 docs 版本（overlay 优先，否则内置）。
 *
 * §5.6 要求这个信息在诊断里可见并随反馈上报。没有它，看到一条「agent 说错了」的反馈时
 * 无法确定用户当时读的是哪一版文档，反馈也就失去了大半价值。
 */
export function readEffectiveVersions(deps, overlayEnabled = () => true) {
    const out = {};
    for (const skill of discoverDocsSkills(deps)) {
        const overlay = overlayDocsDir(deps, skill);
        const bundledDir = bundledDocsDir(deps, skill);
        out[skill] = (overlayEnabled(skill) && fs.existsSync(overlay) ? readDocsVersion(overlay) : null)
            ?? (bundledDir ? readDocsVersion(bundledDir) : null);
    }
    return out;
}
// --- 启动时序总入口 -------------------------------------------------------------
async function fetchManifest(deps, skills) {
    const q = new URLSearchParams({ skills: skills.join(','), client_version: deps.clientVersion });
    const resp = await deps.fetchFn(`${deps.apiBaseUrl}/v1/docs/manifest?${q}`);
    if (!resp.ok)
        throw new Error(`manifest 请求失败 http_${resp.status}`);
    const data = await resp.json();
    return Array.isArray(data?.items) ? data.items : [];
}
/**
 * 启动时序（§5.2）：仲裁 → 查 catalog → 比对 → 下载切换。任一步失败静默降级。
 */
export async function updateDocs(deps, skills) {
    const log = deps.log || (() => { });
    const results = [];
    // ① 仲裁必须无条件执行，且早于网络请求：
    //    即使离线、即使服务端挂了，陈旧 overlay 遮蔽新内置文档的问题也必须被修掉。
    const localVersions = new Map();
    for (const skill of skills) {
        try {
            localVersions.set(skill, reconcileOverlay(deps, skill));
        }
        catch (e) {
            log(`[DocsUpdater] ${skill}: 仲裁失败: ${e?.message || e}`);
            localVersions.set(skill, null);
        }
    }
    if (!deps.apiBaseUrl) {
        log('[DocsUpdater] 未配置 REMOTE_SERVER_URL，跳过在线检查');
        return skills.map(s => ({ skill: s, action: 'skipped', from: localVersions.get(s) ?? null, reason: 'no api base' }));
    }
    // ② 查「本客户端可用的最高 docs 版本」
    let manifest;
    try {
        manifest = await fetchManifest(deps, skills);
    }
    catch (e) {
        log(`[DocsUpdater] manifest 查询失败，沿用当前版本: ${e?.message || e}`);
        return skills.map(s => ({ skill: s, action: 'skipped', from: localVersions.get(s) ?? null, reason: 'manifest unavailable' }));
    }
    const bySkill = new Map(manifest.map(p => [p.skill, p]));
    for (const skill of skills) {
        const local = localVersions.get(skill) ?? null;
        const remote = bySkill.get(skill);
        if (!remote) {
            // 该技能尚未发布过 docs 包，或其最新版的 min_client_version 高于本客户端。
            // 这是常态而非故障——措辞上要能一眼看出「无需处理」，否则每次启动都像在报错。
            results.push({ skill, action: 'skipped', from: local, reason: '服务端暂无已发布版本' });
            continue;
        }
        // ③ 判定用「不一致」而非「本地更旧」：必须支持回滚。
        //    若 catalog 被指回 07.18.1 而本地是 07.20.1，只有 ≠ 才会触发回退下载。
        if (local === remote.docs_version) {
            results.push({ skill, action: 'up-to-date', from: local });
            continue;
        }
        log(`[DocsUpdater] ${skill}: ${local || '(无)'} → ${remote.docs_version}`);
        const r = await applyDocsPackage(deps, remote);
        results.push({ ...r, from: local });
    }
    return results;
}
