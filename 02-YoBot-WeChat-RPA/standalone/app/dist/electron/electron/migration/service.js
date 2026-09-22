import fs from "node:fs";
import fsp from "node:fs/promises";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { ZipArchive } from "archiver";
import extract from "extract-zip";
import { rewritePayloadPaths } from "./path_rewriter.js";
import { MIGRATION_FORMAT_VERSION, } from "./types.js";
const YOKO_DATA_EXCLUDES = [
    "traces",
    "context_cache",
    "memory-db",
    "turn_queues",
    // Runtime lifecycle/idempotency state is machine-local and short-lived. Migrating
    // it can replay a stale response or leave a new install blocked by an old claim.
    "agent_runs",
    "agentic_idempotency",
    "agentic_deliveries",
    "rpa_delivery_ledger",
];
const YOKOWEBOT_EXCLUDES = [
    "logs",
    "comtypes_gen",
];
const YOKOWEBOT_DEVICE_FILES = new Set([".key", "license.dat", "mcp_token.dat"]);
const MAX_ARCHIVE_FILES = 100_000;
const MAX_ARCHIVE_UNCOMPRESSED_BYTES = 20 * 1024 * 1024 * 1024;
function toPortable(relativePath) {
    return relativePath.replace(/\\/g, "/");
}
function isExcluded(relativePath, topLevelExcludes) {
    const top = toPortable(relativePath).split("/")[0].toLowerCase();
    return topLevelExcludes.some((value) => value.toLowerCase() === top);
}
async function exists(filePath) {
    try {
        await fsp.access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
async function copyTree(source, destination, filter = () => true) {
    const root = path.resolve(source);
    const visit = async (current) => {
        const relative = path.relative(root, current);
        if (relative && !filter(relative))
            return;
        const stat = await fsp.lstat(current);
        if (stat.isSymbolicLink())
            return;
        const target = relative ? path.join(destination, relative) : destination;
        if (stat.isDirectory()) {
            await fsp.mkdir(target, { recursive: true });
            const entries = await fsp.readdir(current);
            for (const entry of entries)
                await visit(path.join(current, entry));
            return;
        }
        if (!stat.isFile())
            return;
        await fsp.mkdir(path.dirname(target), { recursive: true });
        await fsp.copyFile(current, target);
    };
    if (await exists(root))
        await visit(root);
}
async function walkFiles(root) {
    const files = [];
    const visit = async (dir) => {
        let entries;
        try {
            entries = await fsp.readdir(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isSymbolicLink())
                continue;
            if (entry.isDirectory())
                await visit(fullPath);
            else if (entry.isFile())
                files.push(fullPath);
        }
    };
    await visit(root);
    return files;
}
async function hashFile(filePath) {
    const hash = crypto.createHash("sha256");
    await pipeline(fs.createReadStream(filePath), hash);
    return hash.digest("hex");
}
function sourceRoots(layout) {
    return {
        yokoagent: layout.yokoagent,
        webot: layout.webot,
        yokowebot: layout.yokowebot,
    };
}
async function countFiles(root, predicate = () => true) {
    return (await walkFiles(root)).filter(predicate).length;
}
async function buildSummary(payloadRoot, files) {
    const yoko = path.join(payloadRoot, "yokoagent");
    const workspace = path.join(yoko, "workspace");
    const sessions = path.join(yoko, "data", "sessions");
    const skills = path.join(yoko, "skills");
    const webot = path.join(payloadRoot, "webot");
    const yokowebot = path.join(payloadRoot, "yokowebot");
    return {
        agents: await countFiles(path.join(workspace, "agents"), (file) => path.basename(file).toLowerCase() === "agent.md"),
        sessions: await countFiles(sessions, (file) => path.extname(file).toLowerCase() === ".json"),
        skills: await countFiles(skills, (file) => path.basename(file).toLowerCase() === "skill.md"),
        workspaceFiles: await countFiles(workspace),
        wechatBotFiles: (await countFiles(webot)) + (await countFiles(yokowebot)),
        totalFiles: files.length,
        totalBytes: files.reduce((sum, file) => sum + file.size, 0),
    };
}
async function createZip(sourceDir, destination) {
    await fsp.mkdir(path.dirname(destination), { recursive: true });
    await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(destination);
        const archive = new ZipArchive({ zlib: { level: 6 } });
        output.on("close", resolve);
        output.on("error", reject);
        archive.on("warning", (error) => {
            if (error.code !== "ENOENT")
                reject(error);
        });
        archive.on("error", reject);
        archive.pipe(output);
        archive.directory(sourceDir, false);
        void archive.finalize();
    });
}
function validateRelativePackagePath(relativePath) {
    const normalized = toPortable(relativePath);
    if (!normalized || normalized.startsWith("/") || /^[a-z]:/i.test(normalized)) {
        throw new Error(`迁移包包含非法绝对路径：${relativePath}`);
    }
    if (normalized.split("/").some((part) => part === "..")) {
        throw new Error(`迁移包包含越界路径：${relativePath}`);
    }
}
function canonicalPackagePath(relativePath) {
    const portable = toPortable(relativePath);
    validateRelativePackagePath(portable);
    const normalized = path.posix.normalize(portable);
    if (normalized !== portable || normalized.split("/").some((part) => !part || part === ".")) {
        throw new Error(`迁移包包含非规范路径：${relativePath}`);
    }
    return normalized.normalize("NFC").toLowerCase();
}
function validateSourceRoots(roots) {
    const expected = {
        yokoagent: ".yokoagent",
        webot: ".webot",
        yokowebot: ".yokowebot",
    };
    const seen = new Set();
    for (const key of Object.keys(expected)) {
        const root = roots[key];
        if (typeof root !== "string" || !root)
            throw new Error(`迁移包缺少源目录：${key}`);
        const portable = toPortable(root).replace(/\/$/, "");
        if (!path.posix.isAbsolute(portable) && !path.win32.isAbsolute(root)) {
            throw new Error(`迁移包源目录不是绝对路径：${key}`);
        }
        if (path.posix.basename(portable).toLowerCase() !== expected[key]) {
            throw new Error(`迁移包源目录与组件不匹配：${key}`);
        }
        const canonical = portable.normalize("NFC").toLowerCase();
        if (seen.has(canonical))
            throw new Error("迁移包源目录相互冲突");
        seen.add(canonical);
    }
}
function isArchiveDirectory(entry) {
    const mode = (entry.externalFileAttributes >> 16) & 0xffff;
    return (mode & 0xf000) === 0x4000
        || entry.fileName.endsWith("/")
        || ((entry.versionMadeBy >> 8) === 0 && entry.externalFileAttributes === 16);
}
function validateArchiveEntry(entry, state) {
    const portable = toPortable(entry.fileName);
    const pathWithoutSlash = portable.endsWith("/") ? portable.slice(0, -1) : portable;
    const canonical = canonicalPackagePath(pathWithoutSlash);
    const mode = (entry.externalFileAttributes >> 16) & 0xffff;
    if ((mode & 0xf000) === 0xa000)
        throw new Error(`迁移包不允许符号链接：${entry.fileName}`);
    if (state.paths.has(canonical))
        throw new Error(`迁移包包含大小写或规范化冲突的重复路径：${entry.fileName}`);
    state.paths.add(canonical);
    const directory = isArchiveDirectory(entry);
    const allowed = pathWithoutSlash === "manifest.json"
        || pathWithoutSlash === "payload"
        || pathWithoutSlash === "payload/yokoagent"
        || pathWithoutSlash === "payload/webot"
        || pathWithoutSlash === "payload/yokowebot"
        || /^payload\/(yokoagent|webot|yokowebot)\/.+/.test(pathWithoutSlash);
    if (!allowed || (!directory && ["payload", "payload/yokoagent", "payload/webot", "payload/yokowebot"].includes(pathWithoutSlash))) {
        throw new Error(`迁移包包含未授权路径：${entry.fileName}`);
    }
    if (!directory) {
        if (!Number.isSafeInteger(entry.uncompressedSize) || entry.uncompressedSize < 0) {
            throw new Error(`迁移包条目大小无效：${entry.fileName}`);
        }
        state.files += 1;
        state.bytes += entry.uncompressedSize;
        if (state.files > MAX_ARCHIVE_FILES || state.bytes > MAX_ARCHIVE_UNCOMPRESSED_BYTES) {
            throw new Error("迁移包展开后过大，已停止导入");
        }
    }
}
async function readManifest(stagingRoot) {
    const manifestPath = path.join(stagingRoot, "manifest.json");
    const raw = await fsp.readFile(manifestPath, "utf8").catch(() => {
        throw new Error("不是有效的迁移包：缺少 manifest.json");
    });
    const manifest = JSON.parse(raw);
    if (manifest.formatVersion !== MIGRATION_FORMAT_VERSION) {
        throw new Error(`不支持的迁移包版本：${String(manifest.formatVersion ?? "未知")}`);
    }
    if (!manifest.sourceRoots || !manifest.summary || !Array.isArray(manifest.files)) {
        throw new Error("迁移包清单不完整");
    }
    if (manifest.files.length === 0
        || manifest.files.length > MAX_ARCHIVE_FILES
        || !manifest.files.some((file) => typeof file?.path === "string" && file.path.startsWith("payload/yokoagent/"))) {
        throw new Error("迁移包中没有可导入的客户端业务数据");
    }
    validateSourceRoots(manifest.sourceRoots);
    const seenPaths = new Set();
    for (const file of manifest.files) {
        if (!file || typeof file.path !== "string")
            throw new Error("迁移包文件清单无效：路径缺失");
        const canonical = canonicalPackagePath(file.path);
        if (seenPaths.has(canonical))
            throw new Error(`迁移包包含重复文件：${file.path}`);
        seenPaths.add(canonical);
        if (!/^payload\/(yokoagent|webot|yokowebot)\/.+/.test(file.path)
            || !Number.isSafeInteger(file.size) || file.size < 0
            || !/^[a-f0-9]{64}$/i.test(file.sha256)) {
            throw new Error(`迁移包文件清单无效：${file.path}`);
        }
    }
    const summary = manifest.summary;
    const totalBytes = manifest.files.reduce((sum, file) => sum + file.size, 0);
    if (summary.totalFiles !== manifest.files.length || summary.totalBytes !== totalBytes) {
        throw new Error("迁移包摘要与文件清单不一致");
    }
    return manifest;
}
async function validateExtractedPayload(stagingRoot, manifest) {
    const actual = new Set((await walkFiles(path.join(stagingRoot, "payload")))
        .map(file => toPortable(path.relative(stagingRoot, file))));
    const declared = new Set(manifest.files.map(file => file.path));
    for (const file of actual) {
        if (!declared.has(file))
            throw new Error(`迁移包包含未列入校验清单的文件：${file}`);
    }
    for (const file of declared) {
        if (!actual.has(file))
            throw new Error(`迁移包缺少清单文件：${file}`);
    }
}
async function applyReplacement(source, target, backup, applied) {
    if (!(await exists(source)))
        return false;
    const hadOriginal = await exists(target);
    await fsp.mkdir(path.dirname(backup), { recursive: true });
    if (hadOriginal)
        await fsp.rename(target, backup);
    // Register immediately after the destructive rename. If copy fails halfway, outer rollback
    // knows about this target instead of restoring only the earlier components.
    applied.push({ target, backup, hadOriginal });
    await copyTree(source, target);
    return true;
}
async function applyMergedDirectory(source, target, backup, applied) {
    if (!(await exists(source)))
        return false;
    const hadOriginal = await exists(target);
    await fsp.mkdir(path.dirname(backup), { recursive: true });
    if (hadOriginal)
        await fsp.rename(target, backup);
    applied.push({ target, backup, hadOriginal });
    if (hadOriginal)
        await copyTree(backup, target);
    await copyTree(source, target);
    return true;
}
async function rollback(applied) {
    const errors = [];
    for (const item of [...applied].reverse()) {
        try {
            await fsp.rm(item.target, { recursive: true, force: true });
            if (item.hadOriginal) {
                if (!(await exists(item.backup)))
                    throw new Error(`备份不存在：${item.backup}`);
                await fsp.rename(item.backup, item.target);
            }
        }
        catch (error) {
            errors.push(`${item.target}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    return errors;
}
export class MigrationService {
    layout;
    appVersion;
    tempRoot;
    onProgress;
    constructor(options) {
        this.layout = options.layout;
        this.appVersion = options.appVersion;
        this.tempRoot = options.tempRoot || os.tmpdir();
        this.onProgress = options.onProgress;
    }
    progress(operation, stage, percent, message) {
        this.onProgress?.({ operation, stage, percent, message });
    }
    async exportTo(destination) {
        const stagingRoot = await fsp.mkdtemp(path.join(this.tempRoot, "yoko-migration-export-"));
        const payloadRoot = path.join(stagingRoot, "payload");
        const partialPath = `${destination}.partial`;
        try {
            this.progress("export", "collecting", 8, "正在收集子智能体、聊天记录和工作区文件…");
            const yokoPayload = path.join(payloadRoot, "yokoagent");
            await copyTree(path.join(this.layout.yokoagent, "workspace"), path.join(yokoPayload, "workspace"));
            this.progress("export", "collecting", 25, "正在收集本地记忆和聊天记录…");
            await copyTree(path.join(this.layout.yokoagent, "data"), path.join(yokoPayload, "data"), (relative) => !isExcluded(relative, YOKO_DATA_EXCLUDES));
            await copyTree(path.join(this.layout.yokoagent, "skills"), path.join(yokoPayload, "skills"));
            if (await exists(path.join(this.layout.yokoagent, "config.json"))) {
                await fsp.mkdir(yokoPayload, { recursive: true });
                await fsp.copyFile(path.join(this.layout.yokoagent, "config.json"), path.join(yokoPayload, "config.json"));
            }
            this.progress("export", "collecting", 42, "正在收集微信 BOT 配置、素材和聊天历史…");
            await copyTree(path.join(this.layout.webot, "data"), path.join(payloadRoot, "webot", "data"), (relative) => !isExcluded(relative, ["runtime"]));
            await copyTree(path.join(this.layout.webot, "file_cache"), path.join(payloadRoot, "webot", "file_cache"));
            await copyTree(this.layout.yokowebot, path.join(payloadRoot, "yokowebot"), (relative) => {
                if (isExcluded(relative, YOKOWEBOT_EXCLUDES))
                    return false;
                if (YOKOWEBOT_DEVICE_FILES.has(toPortable(relative).toLowerCase()))
                    return false;
                return !/\.bak\.\d+$/i.test(toPortable(relative));
            });
            this.progress("export", "hashing", 55, "正在校验已收集的数据…");
            const payloadFiles = await walkFiles(payloadRoot);
            const files = [];
            for (let index = 0; index < payloadFiles.length; index += 1) {
                const filePath = payloadFiles[index];
                const stat = await fsp.stat(filePath);
                files.push({
                    path: toPortable(path.relative(stagingRoot, filePath)),
                    size: stat.size,
                    sha256: await hashFile(filePath),
                });
                if (index % 25 === 0 && payloadFiles.length > 0) {
                    this.progress("export", "hashing", 55 + Math.round((index / payloadFiles.length) * 20), "正在生成文件校验信息…");
                }
            }
            const summary = await buildSummary(payloadRoot, files);
            const manifest = {
                formatVersion: MIGRATION_FORMAT_VERSION,
                appVersion: this.appVersion,
                platform: process.platform,
                exportedAt: new Date().toISOString(),
                sourceRoots: sourceRoots(this.layout),
                summary,
                components: ["子智能体", "聊天记录", "本地记忆与知识库", "用户技能", "生成内容", "微信 BOT 配置与数据"],
                files,
            };
            await fsp.writeFile(path.join(stagingRoot, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
            this.progress("export", "compressing", 80, "正在生成迁移压缩包…");
            await fsp.rm(partialPath, { force: true });
            await createZip(stagingRoot, partialPath);
            // Do not delete a previous backup before the completed replacement is ready. rename either
            // atomically replaces it on the supported platform or fails while leaving it intact.
            await fsp.rename(partialPath, destination);
            this.progress("export", "completed", 100, "全部数据已打包完成");
            return { success: true, filePath: destination, summary };
        }
        catch (error) {
            await fsp.rm(partialPath, { force: true }).catch(() => undefined);
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
        finally {
            await fsp.rm(stagingRoot, { recursive: true, force: true }).catch(() => undefined);
        }
    }
    async importFrom(archivePath) {
        const stagingRoot = await fsp.mkdtemp(path.join(this.tempRoot, "yoko-migration-import-"));
        const applied = [];
        let backupRoot = "";
        try {
            this.progress("import", "validating", 8, "正在解压并校验迁移文件…");
            const archiveState = { files: 0, bytes: 0, paths: new Set() };
            await extract(archivePath, {
                dir: stagingRoot,
                onEntry: (entry) => validateArchiveEntry(entry, archiveState),
            });
            const manifest = await readManifest(stagingRoot);
            const payloadRoot = path.join(stagingRoot, "payload");
            await validateExtractedPayload(stagingRoot, manifest);
            for (let index = 0; index < manifest.files.length; index += 1) {
                const entry = manifest.files[index];
                const absolute = path.resolve(stagingRoot, entry.path);
                if (!absolute.startsWith(`${path.resolve(stagingRoot)}${path.sep}`)) {
                    throw new Error(`迁移包路径越界：${entry.path}`);
                }
                const stat = await fsp.lstat(absolute).catch(() => null);
                if (!stat?.isFile() || stat.size !== entry.size || await hashFile(absolute) !== entry.sha256) {
                    throw new Error(`迁移文件校验失败：${entry.path}`);
                }
                if (index % 25 === 0 && manifest.files.length > 0) {
                    this.progress("import", "validating", 8 + Math.round((index / manifest.files.length) * 28), "正在验证文件完整性…");
                }
            }
            this.progress("import", "rewriting", 40, "正在适配新电脑的用户目录…");
            const rewritten = await rewritePayloadPaths(payloadRoot, manifest.sourceRoots, sourceRoots(this.layout));
            const stamp = new Date().toISOString().replace(/[:.]/g, "-");
            backupRoot = path.join(this.layout.userHome, ".yoko-migration", "backups", stamp);
            this.progress("import", "backing_up", 52, "正在备份当前客户端数据…");
            const replacements = [
                [path.join(payloadRoot, "yokoagent", "workspace"), path.join(this.layout.yokoagent, "workspace"), path.join(backupRoot, "yokoagent", "workspace")],
                [path.join(payloadRoot, "yokoagent", "data"), path.join(this.layout.yokoagent, "data"), path.join(backupRoot, "yokoagent", "data")],
                [path.join(payloadRoot, "yokoagent", "skills"), path.join(this.layout.yokoagent, "skills"), path.join(backupRoot, "yokoagent", "skills")],
                [path.join(payloadRoot, "yokoagent", "config.json"), path.join(this.layout.yokoagent, "config.json"), path.join(backupRoot, "yokoagent", "config.json")],
                [path.join(payloadRoot, "webot", "data"), path.join(this.layout.webot, "data"), path.join(backupRoot, "webot", "data")],
                [path.join(payloadRoot, "webot", "file_cache"), path.join(this.layout.webot, "file_cache"), path.join(backupRoot, "webot", "file_cache")],
            ];
            for (let index = 0; index < replacements.length; index += 1) {
                await applyReplacement(...replacements[index], applied);
                this.progress("import", "importing", 58 + index * 5, "正在导入子智能体、聊天记录和生成内容…");
            }
            await applyMergedDirectory(path.join(payloadRoot, "yokowebot"), this.layout.yokowebot, path.join(backupRoot, "yokowebot"), applied);
            this.progress("import", "completed", 100, "全部数据导入完成");
            return {
                success: true,
                backupPath: backupRoot,
                rewrittenPaths: rewritten.rewritten,
                summary: manifest.summary,
                restartRequired: true,
            };
        }
        catch (error) {
            const rollbackErrors = await rollback(applied);
            const reason = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: rollbackErrors.length > 0
                    ? `${reason}；回滚也未完整完成：${rollbackErrors.join("；")}`
                    : reason,
                backupPath: backupRoot || undefined,
            };
        }
        finally {
            await fsp.rm(stagingRoot, { recursive: true, force: true }).catch(() => undefined);
        }
    }
}
export const __test = {
    copyTree,
    validateRelativePackagePath,
    validateArchiveEntry,
    validateExtractedPayload,
    readManifest,
    buildSummary,
};
