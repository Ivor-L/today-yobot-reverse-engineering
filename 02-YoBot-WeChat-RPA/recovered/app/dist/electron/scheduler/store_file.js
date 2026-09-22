import * as fs from "fs";
import * as path from "path";
import { validateCronOutputContract } from "./outcome.js";
export class TaskStoreFormatError extends Error {
    constructor(message, options) {
        super(message, options);
        this.name = "TaskStoreFormatError";
    }
}
function parseTaskStoreContent(content) {
    if (!content.trim())
        throw new TaskStoreFormatError("任务文件为空或正在被写入，请重试");
    let parsed;
    try {
        parsed = JSON.parse(content);
    }
    catch (error) {
        throw new TaskStoreFormatError(`任务文件 JSON 无法解析：${String(error?.message || error)}`, { cause: error });
    }
    if (!parsed || !Array.isArray(parsed.jobs))
        throw new TaskStoreFormatError("任务文件格式无效：缺少 jobs 数组");
    return { jobs: parsed.jobs };
}
export function replaceTextFileAtomic(file, content) {
    const dir = path.dirname(file);
    fs.mkdirSync(dir, { recursive: true });
    const temp = path.join(dir, `.${path.basename(file)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);
    let fd;
    try {
        fd = fs.openSync(temp, "wx");
        fs.writeFileSync(fd, content, "utf8");
        fs.fsyncSync(fd);
        fs.closeSync(fd);
        fd = undefined;
        fs.renameSync(temp, file);
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
function archiveCorruptSnapshot(file, content, suffix = "") {
    const archive = `${file}${suffix}.corrupt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    replaceTextFileAtomic(archive, content);
    return archive;
}
function recoverEmptyTaskStore(file, corruptCopy, corruptBackupCopy) {
    const empty = { jobs: [] };
    replaceTextFileAtomic(file, JSON.stringify(empty, null, 2));
    console.error(`[Scheduler] Task store had no valid backup; started with an empty store. `
        + `Corrupt primary: ${corruptCopy}`
        + (corruptBackupCopy ? `; corrupt backup: ${corruptBackupCopy}` : ""));
    return empty;
}
export function readTaskStoreFile(file, options = {}) {
    let primary;
    try {
        primary = fs.readFileSync(file, "utf8");
    }
    catch (error) {
        if (error?.code !== "ENOENT")
            throw error;
        const backup = fs.readFileSync(`${file}.bak`, "utf8");
        const recovered = parseTaskStoreContent(backup);
        replaceTextFileAtomic(file, backup);
        console.warn(`[Scheduler] Restored missing task store from ${file}.bak`);
        return recovered;
    }
    try {
        return parseTaskStoreContent(primary);
    }
    catch (primaryError) {
        if (!(primaryError instanceof TaskStoreFormatError))
            throw primaryError;
        // Keep the corrupt bytes for diagnosis/recovery; the previous valid snapshot may be slightly
        // older and must not erase the only evidence of more recent tasks.
        const corruptCopy = archiveCorruptSnapshot(file, primary);
        let backup;
        try {
            backup = fs.readFileSync(`${file}.bak`, "utf8");
        }
        catch (backupReadError) {
            if (backupReadError?.code === "ENOENT" && options.recoverEmptyIfNoValidBackup) {
                return recoverEmptyTaskStore(file, corruptCopy);
            }
            // Permission/disk errors are not corruption and must remain fail-closed.
            throw backupReadError;
        }
        let recovered;
        try {
            recovered = parseTaskStoreContent(backup);
        }
        catch (backupError) {
            if (backupError instanceof TaskStoreFormatError && options.recoverEmptyIfNoValidBackup) {
                const corruptBackupCopy = archiveCorruptSnapshot(file, backup, ".bak");
                return recoverEmptyTaskStore(file, corruptCopy, corruptBackupCopy);
            }
            throw primaryError;
        }
        // A valid backup exists. Restore failures (permissions/disk) must propagate;
        // falling back to empty in that case would hide an infrastructure problem.
        replaceTextFileAtomic(file, backup);
        console.error(`[Scheduler] Task store was corrupt; restored previous valid snapshot. Corrupt copy: ${corruptCopy}`);
        return recovered;
    }
}
/**
 * Replace the task snapshot atomically so readers observe either the old complete JSON or the new
 * complete JSON, never a half-written file. The previous valid snapshot is atomically copied to
 * `.bak`; an already-corrupt primary is never overwritten by a later in-memory mutation.
 */
export function writeTaskStoreFileAtomic(file, data) {
    try {
        const current = fs.readFileSync(file, "utf8");
        parseTaskStoreContent(current);
        replaceTextFileAtomic(`${file}.bak`, current);
    }
    catch (error) {
        if (error?.code !== "ENOENT") {
            throw new Error(`拒绝覆盖无法解析的任务文件 ${file}：${String(error?.message || error)}`);
        }
    }
    replaceTextFileAtomic(file, JSON.stringify(data, null, 2));
}
export function setTaskEnabledInFile(file, jobId, enabled, expectedRevision) {
    const data = readTaskStoreFile(file);
    const index = data.jobs.findIndex(job => job.id === jobId);
    if (index < 0)
        return false;
    const current = data.jobs[index];
    const currentRevision = current.revision || 1;
    if (expectedRevision !== undefined && currentRevision !== expectedRevision) {
        throw new Error(`任务已被其它会话修改（当前 revision=${currentRevision}，提交基于 ${expectedRevision}），请刷新后重试`);
    }
    data.jobs[index] = {
        ...current,
        revision: (current.revision || 1) + 1,
        updatedAt: Date.now(),
        enabled,
        state: !enabled ? { ...current.state, nextRunAt: undefined } : current.state,
    };
    writeTaskStoreFileAtomic(file, { ...data, revision: (data.revision || 0) + 1 });
    return true;
}
export function deleteTaskFromFile(file, jobId, expectedRevision) {
    const data = readTaskStoreFile(file);
    const current = data.jobs.find(job => job.id === jobId);
    if (!current)
        return false;
    const currentRevision = current.revision || 1;
    if (expectedRevision !== undefined && currentRevision !== expectedRevision) {
        throw new Error(`任务已被其它会话修改（当前 revision=${currentRevision}，提交基于 ${expectedRevision}），请刷新后重试`);
    }
    const jobs = data.jobs.filter(job => job.id !== jobId);
    writeTaskStoreFileAtomic(file, { revision: (data.revision || 0) + 1, jobs });
    return true;
}
/** Electron 在 server 不在线时的单写者兜底；在线更新必须走运行中的 Scheduler。 */
export function updateTaskInFile(file, jobId, patch, expectedRevision) {
    if (patch.payload !== undefined && !String(patch.payload).trim())
        throw new Error("payload 不能为空");
    const contractErrors = validateCronOutputContract(patch.outputContract);
    if (contractErrors.length > 0)
        throw new Error(contractErrors.join("；"));
    const data = readTaskStoreFile(file);
    const index = data.jobs.findIndex(job => job.id === jobId);
    if (index < 0)
        return null;
    const current = data.jobs[index];
    const revision = current.revision || 1;
    if (revision !== expectedRevision) {
        throw new Error(`任务已被其它会话修改（当前 revision=${revision}，提交基于 ${expectedRevision}），请刷新后重试`);
    }
    const updated = {
        ...current,
        ...patch,
        revision: revision + 1,
        updatedAt: Date.now(),
    };
    const jobs = [...data.jobs];
    jobs[index] = updated;
    writeTaskStoreFileAtomic(file, { revision: (data.revision || 0) + 1, jobs });
    return updated;
}
