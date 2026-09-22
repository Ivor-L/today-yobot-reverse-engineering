/**
 * 一次性数据清理：把**历史遗留**的定时任务产出从会话上下文里摘出来。
 *
 * 为什么需要它
 * ------------
 * 本次重构前，cron 每跑完一次就 `sessionManager.addMessage('websocket', <会话>, 产出)`，
 * 而那个文件正是 PiKernel 读上下文的同一个文件（`data/sessions/websocket__<id>.json`）。
 * 于是 43 个任务、每天多次的产出被永久追加进用户的对话上下文——上下文被推到十几万
 * token，既持续烧积分，又撞上内核压缩的坑导致 agent 卡死。
 *
 * 代码侧已经改成写隔离存储（见 `server.ts`），但**改代码不会让存量文件变瘦**：
 * 老用户的会话文件里躺着几百条历史产出，下次打开照样全量进上下文。这个模块负责
 * 把它们搬走。
 *
 * 搬走而不是删掉
 * --------------
 * 产出会落到 `data/session_isolated/`——gateway 读会话给前端展示时会 merge 回来，
 * 模型组装上下文时不读。用户在聊天窗口里一条不少地看到历史任务产出，模型看不到。
 * 直接删会让用户觉得"我的记录丢了"，那是另一种事故。
 *
 * 安全边界
 * --------
 * · 只摘 `senderId === "scheduler"` **且没有 id** 的记录。有 id 的记录是 pi 自己写的
 *   树节点，可能被 compaction 的 `firstKeptEntryId` 或别的记录的 `parentId` 引用，
 *   摘掉会连带丢失整段历史——宁可漏摘，不可摘错。
 * · 改写前先把原文件整份备份到 `data/sessions_backup/`。
 * · 单个文件失败不影响其它文件；整体失败不影响启动。
 * · 幂等：跑第二遍找不到可摘的记录，什么都不做。
 *
 * ⚠️ 必须在 gateway / PiKernel 打开任何会话**之前**调用（server.ts 启动早期）。
 */
import * as fs from "fs";
import * as path from "path";
import { SCHEDULER_SESSION_PREFIX } from "./types.js";
/** 清理逻辑的版本号。改了摘取规则要 +1，否则老用户不会被重新扫描。 */
const CLEANUP_VERSION = 2;
const STAMP_FILE = ".cron_session_cleanup.json";
function isSchedulerMessage(msg) {
    return !!msg && typeof msg === "object" && msg.senderId === "scheduler";
}
function toGatewayMessage(msg, fallbackTs) {
    return {
        ...msg,
        timestamp: typeof msg?.timestamp === "number" ? msg.timestamp : fallbackTs,
    };
}
function parseTs(value, fallback) {
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    if (typeof value === "string") {
        const ms = new Date(value).getTime();
        if (!Number.isNaN(ms))
            return ms;
    }
    return fallback;
}
function writeTextAtomically(target, content) {
    const dir = path.dirname(target);
    fs.mkdirSync(dir, { recursive: true });
    const temp = path.join(dir, `.${path.basename(target)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);
    let fd;
    try {
        fd = fs.openSync(temp, "wx");
        fs.writeFileSync(fd, content, "utf-8");
        fs.fsyncSync(fd);
        fs.closeSync(fd);
        fd = undefined;
        fs.renameSync(temp, target);
    }
    catch (error) {
        if (fd !== undefined) {
            try {
                fs.closeSync(fd);
            }
            catch { /* best effort */ }
        }
        try {
            fs.unlinkSync(temp);
        }
        catch { /* temp may already have been renamed */ }
        throw error;
    }
}
/**
 * 把摘出来的产出并进隔离存储。
 *
 * 格式与 `SessionManager.addIsolatedMessage` 完全一致（`{messages, updatedAt}`），
 * 按 id 去重、按时间排序——重复跑不会产生重复条目。
 */
function appendToIsolated(isolatedDir, fileName, extracted) {
    if (extracted.length === 0)
        return;
    fs.mkdirSync(isolatedDir, { recursive: true });
    const target = path.join(isolatedDir, fileName);
    let existing = [];
    if (fs.existsSync(target)) {
        // 绝不能把损坏的既有隔离文件当空文件覆盖。sessions_backup 只备份原会话，
        // 并不包含这份隔离文件；旧逻辑会在这里静默丢掉用户已经迁出的全部历史产出。
        const raw = JSON.parse(fs.readFileSync(target, "utf-8"));
        if (Array.isArray(raw))
            existing = raw;
        else if (Array.isArray(raw?.messages))
            existing = raw.messages;
        else
            throw new Error(`隔离会话格式无效：${target}`);
    }
    const seen = new Set();
    const merged = [];
    for (const msg of [...existing, ...extracted]) {
        const key = msg?.id || JSON.stringify([
            msg?.senderId,
            msg?.role,
            msg?.timestamp,
            msg?.content,
            msg?.metadata?.cronRun,
        ]);
        if (seen.has(key))
            continue;
        seen.add(key);
        merged.push(msg);
    }
    merged.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    writeTextAtomically(target, JSON.stringify({ messages: merged, updatedAt: Date.now() }, null, 2));
}
/** JSONL 格式（pi 的原生格式）：逐行摘。 */
function stripFromJsonl(raw) {
    const lines = raw.split(/\r?\n/);
    const keptLines = [];
    const extracted = [];
    let sawEntry = false;
    for (const line of lines) {
        const clean = line.trim();
        if (!clean)
            continue;
        let obj;
        try {
            obj = JSON.parse(clean);
        }
        catch {
            // 有一行解析不了就整份放弃：宁可不清理，也不能拿半懂的文件去改写。
            return null;
        }
        sawEntry = true;
        const removable = obj?.type === "message" &&
            isSchedulerMessage(obj.message) &&
            !obj.id; // 有 id = pi 树节点，可能被 compaction / parentId 引用，不碰
        if (removable) {
            extracted.push(toGatewayMessage(obj.message, parseTs(obj.timestamp, Date.now())));
            continue;
        }
        keptLines.push(line);
    }
    if (!sawEntry)
        return null;
    return { kept: `${keptLines.join("\n")}\n`, extracted };
}
/** 单 JSON 对象格式（gateway 的 saveSession 走这条）：过滤 messages 数组。 */
function stripFromJsonObject(raw) {
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        return null;
    }
    const isArray = Array.isArray(parsed);
    const messages = isArray ? parsed : Array.isArray(parsed?.messages) ? parsed.messages : [];
    if (!isArray && !Array.isArray(parsed?.messages))
        return null;
    const extracted = [];
    const keptMessages = messages.filter((msg) => {
        if (!isSchedulerMessage(msg))
            return true;
        extracted.push(toGatewayMessage(msg, Date.now()));
        return false;
    });
    const next = isArray ? keptMessages : { ...parsed, messages: keptMessages };
    return { kept: JSON.stringify(next, null, 2), extracted };
}
export function cleanupLegacyCronSessions(userDataDir) {
    const result = {
        scanned: false,
        touchedFiles: 0,
        movedMessages: 0,
        archivedSchedulerSessions: 0,
        skippedUnparsable: 0,
        errors: [],
    };
    const dataDir = path.join(userDataDir, "data");
    const sessionsDir = path.join(dataDir, "sessions");
    const isolatedDir = path.join(dataDir, "session_isolated");
    const stampPath = path.join(dataDir, STAMP_FILE);
    if (!fs.existsSync(sessionsDir))
        return result;
    // 已经跑过同版本就跳过。这不是"省时间"，是避免每次启动都去读全部会话文件——
    // 重度用户那是几十兆的 I/O，压在启动路径上会让冷启动肉眼可见地变慢。
    try {
        if (fs.existsSync(stampPath)) {
            const stamp = JSON.parse(fs.readFileSync(stampPath, "utf-8"));
            if (typeof stamp?.version === "number" && stamp.version >= CLEANUP_VERSION)
                return result;
        }
    }
    catch {
        // 印记读不出来就当没跑过：重跑是幂等的，代价只是一次扫描。
    }
    result.scanned = true;
    const stampSuffix = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(dataDir, "sessions_backup", `cron_cleanup_${stampSuffix}`);
    const ensureBackupDir = () => {
        fs.mkdirSync(backupDir, { recursive: true });
        result.backupDir = backupDir;
    };
    let files = [];
    try {
        files = fs.readdirSync(sessionsDir).filter((f) => f.toLowerCase().endsWith(".json"));
    }
    catch (e) {
        result.errors.push(`读取会话目录失败: ${String(e)}`);
        return result;
    }
    for (const fileName of files) {
        const filePath = path.join(sessionsDir, fileName);
        try {
            // `system__sub_scheduler_*` 是每个定时任务自己的持久时间线——它们本该是
            // 跑完即弃的（现在由 schedulerProfile 的 ephemeral 保证），存量文件纯属死重量。
            // 归档而非删除：万一要回溯某个任务当时到底跟模型说了什么，还捞得回来。
            if (fileName.startsWith(SCHEDULER_SESSION_PREFIX)) {
                ensureBackupDir();
                fs.renameSync(filePath, path.join(backupDir, fileName));
                result.archivedSchedulerSessions++;
                continue;
            }
            const raw = fs.readFileSync(filePath, "utf-8");
            if (!raw.trim())
                continue;
            // 定时任务产出必然带 senderId=scheduler；整份文件里没有这个串就直接跳过，
            // 省掉对绝大多数会话的解析开销。
            if (!raw.includes('"scheduler"'))
                continue;
            const stripped = stripFromJsonObject(raw) ?? stripFromJsonl(raw);
            if (!stripped) {
                result.skippedUnparsable++;
                continue;
            }
            if (stripped.extracted.length === 0)
                continue;
            ensureBackupDir();
            fs.copyFileSync(filePath, path.join(backupDir, fileName));
            appendToIsolated(isolatedDir, fileName, stripped.extracted);
            writeTextAtomically(filePath, stripped.kept);
            result.touchedFiles++;
            result.movedMessages += stripped.extracted.length;
        }
        catch (e) {
            result.errors.push(`${fileName}: ${String(e)}`);
        }
    }
    // 有任一逐文件错误就不能盖“本版本已完成”的章。成功文件已经是幂等迁移，
    // 下次启动只会重试失败文件；旧逻辑仍写 stamp，瞬时错误会被永久冻结。
    if (result.errors.length === 0) {
        try {
            writeTextAtomically(stampPath, JSON.stringify({
                version: CLEANUP_VERSION,
                ranAt: Date.now(),
                touchedFiles: result.touchedFiles,
                movedMessages: result.movedMessages,
                archivedSchedulerSessions: result.archivedSchedulerSessions,
                skippedUnparsable: result.skippedUnparsable,
                backupDir: result.backupDir,
            }, null, 2));
        }
        catch (e) {
            // 印记写不下去只意味着下次启动会再扫一遍（幂等，无害），不该让清理算失败。
            result.errors.push(`写入清理印记失败: ${String(e)}`);
        }
    }
    return result;
}
export const __test = { stripFromJsonl, stripFromJsonObject, appendToIsolated, writeTextAtomically, CLEANUP_VERSION };
