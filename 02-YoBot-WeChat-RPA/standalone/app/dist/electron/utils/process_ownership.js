import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as path from "node:path";
import * as fs from "node:fs";
/**
 * 按 PID 回收一个能证明属于本安装的进程。
 *
 * PID 会被操作系统复用，所以「PID 仍存在」不是归属证据。调用方即使从自己的 PID 文件
 * 读到它，也必须重新查询当前可执行文件路径；路径未知或已经指向别的软件时一律不杀。
 */
export async function reclaimOwnedProcess(pid, ownedRoots, probe, selfPid = process.pid) {
    const normalizedPid = Number(pid);
    if (!Number.isInteger(normalizedPid) || normalizedPid <= 0) {
        return { pid: normalizedPid, executablePath: null, disposition: "unknown" };
    }
    const paths = await probe.getExecutablePaths([normalizedPid]);
    const executablePath = paths.get(normalizedPid) ?? null;
    if (normalizedPid === selfPid) {
        return { pid: normalizedPid, executablePath, disposition: "self" };
    }
    if (!executablePath) {
        return { pid: normalizedPid, executablePath, disposition: "unknown" };
    }
    if (!isUnderAnyRoot(executablePath, ownedRoots)) {
        return { pid: normalizedPid, executablePath, disposition: "foreign" };
    }
    try {
        await probe.killTree(normalizedPid);
        return { pid: normalizedPid, executablePath, disposition: "killed" };
    }
    catch {
        return { pid: normalizedPid, executablePath, disposition: "unknown" };
    }
}
function absolutePathFlavor(value) {
    // A Windows drive or UNC path must keep Windows semantics even when a
    // cross-platform smoke/migration tool is running on Darwin. Reject
    // drive-relative forms (`C:foo`) and root-relative forms (`\\foo`) because
    // their absolute location depends on ambient process state.
    if (/^[a-z]:[\\/]/i.test(value) || /^\\\\[^\\]/.test(value))
        return "win32";
    if (path.posix.isAbsolute(value))
        return "posix";
    return null;
}
function normalizeAbsolutePath(value, flavor) {
    if (absolutePathFlavor(value) !== flavor)
        return null;
    const pathApi = flavor === "win32" ? path.win32 : path.posix;
    const normalized = pathApi.normalize(value).replace(/[\\/]+$/, "");
    return flavor === "win32" ? normalized.toLowerCase() : normalized;
}
/**
 * exePath 是否位于任一 root 目录之下（含 root 本身）。
 *
 * **只接受绝对路径。** 相对路径一律判为"不属于我们"——因为 normalizeDir 走的是
 * `path.resolve()`，一个裸进程名（Linux 上 `ps -o comm=` 返回的就是 `node` 这种短名）
 * 会被解析成 `<cwd>/node`；只要进程的 cwd 恰好落在自有目录下，**一个完全无关的进程
 * 就会被判成自有并被 killTree**。宁可漏杀，不可误杀：这个函数的唯一职责就是把
 * "对用户机器无差别开火"挡在外面。
 */
export function isUnderAnyRoot(exePath, roots) {
    if (!exePath)
        return false;
    const flavor = absolutePathFlavor(exePath);
    if (!flavor)
        return false;
    const target = normalizeAbsolutePath(exePath, flavor);
    if (!target)
        return false;
    const separator = flavor === "win32" ? "\\" : "/";
    return roots.some(root => {
        const normalized = normalizeAbsolutePath(root, flavor);
        if (!normalized)
            return false;
        return target === normalized || target.startsWith(normalized + separator);
    });
}
/**
 * 回收端口：只终结可执行文件位于 `ownedRoots` 之下的占用者。
 *
 * `selfPid` 是调用方自己的 PID，永远不杀。路径查不出来的（unknown）一律跳过：
 * 那通常意味着对方是系统进程或权限更高的进程，本来也不该由我们处置。
 */
export async function reclaimPort(port, ownedRoots, probe, selfPid = process.pid) {
    const owners = (await probe.listPortOwners(port)).filter(pid => Number.isInteger(pid) && pid > 0);
    if (owners.length === 0)
        return { port, entries: [], freed: true };
    const paths = await probe.getExecutablePaths(owners);
    const entries = [];
    for (const pid of owners) {
        const executablePath = paths.get(pid) ?? null;
        if (pid === selfPid) {
            entries.push({ pid, executablePath, disposition: "self" });
            continue;
        }
        if (!executablePath) {
            entries.push({ pid, executablePath, disposition: "unknown" });
            continue;
        }
        if (!isUnderAnyRoot(executablePath, ownedRoots)) {
            entries.push({ pid, executablePath, disposition: "foreign" });
            continue;
        }
        try {
            await probe.killTree(pid);
        }
        catch {
            // 已经退出 / 没权限。当作没杀掉处理，freed 会是 false。
            entries.push({ pid, executablePath, disposition: "unknown" });
            continue;
        }
        entries.push({ pid, executablePath, disposition: "killed" });
    }
    return {
        port,
        entries,
        freed: entries.every(entry => entry.disposition === "killed" || entry.disposition === "self"),
    };
}
/** 把回收结果翻译成一行能直接查问题的日志。 */
export function describeReclaim(result) {
    if (result.entries.length === 0)
        return `端口 ${result.port} 无人占用`;
    const parts = result.entries.map(entry => {
        const who = entry.executablePath || "可执行路径未知";
        switch (entry.disposition) {
            case "killed": return `已回收 PID ${entry.pid}（${who}）`;
            case "self": return `PID ${entry.pid} 是本进程，跳过`;
            case "foreign": return `PID ${entry.pid} 不属于本安装，未处理（${who}）`;
            case "unknown": return `PID ${entry.pid} 归属无法确认，未处理（${who}）`;
        }
    });
    return `端口 ${result.port}：${parts.join("；")}`;
}
// --- 真实探针 ---------------------------------------------------------------
const execFileAsync = promisify(execFile);
/**
 * 异步跑一条 PowerShell。
 *
 * 用 execFile 而不是 execFileSync：调用方之一是 Electron 主进程的 server 重启定时器，
 * 那时窗口还活着，同步实现会把 UI 和 IPC 一起冻住几秒。
 */
async function runPowerShellAsync(command) {
    const shell = process.env.SystemRoot
        ? path.join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
        : "powershell.exe";
    const { stdout } = await execFileAsync(shell, ["-NoProfile", "-NonInteractive", "-Command", command], { timeout: 15_000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
    return stdout.toString();
}
export function createSystemProbe() {
    const isWindows = process.platform === "win32";
    return {
        async listPortOwners(port) {
            try {
                const output = isWindows
                    ? await runPowerShellAsync(`Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue`
                        + ` | Select-Object -ExpandProperty OwningProcess | Sort-Object -Unique`)
                    : (await execFileAsync("lsof", ["-t", `-i:${port}`, "-sTCP:LISTEN"], {
                        timeout: 15_000,
                    })).stdout.toString();
                return output.split(/\r?\n/)
                    .map(line => parseInt(line.trim(), 10))
                    .filter(pid => Number.isInteger(pid) && pid > 0);
            }
            catch {
                return [];
            }
        },
        async getExecutablePaths(pids) {
            const result = new Map(pids.map(pid => [pid, null]));
            if (pids.length === 0)
                return result;
            try {
                if (isWindows) {
                    // 一次查完，避免每个 PID 拉起一次 PowerShell（单次启动就有几百毫秒）。
                    const filter = pids.map(pid => `ProcessId=${pid}`).join(" or ");
                    const output = await runPowerShellAsync(`Get-CimInstance Win32_Process -Filter '${filter}'`
                        + ` | ForEach-Object { "$($_.ProcessId)|$($_.ExecutablePath)" }`);
                    for (const line of output.split(/\r?\n/)) {
                        const [pidPart, ...rest] = line.trim().split("|");
                        const pid = parseInt(pidPart, 10);
                        const exePath = rest.join("|").trim();
                        if (Number.isInteger(pid) && result.has(pid) && exePath) {
                            result.set(pid, exePath);
                        }
                    }
                }
                else {
                    for (const pid of pids) {
                        // Linux 的 `ps -o comm=` 只给**短名**（`node`，还截断到 15 字符），
                        // 拿它做归属判定等于没判——isUnderAnyRoot 会因为不是绝对路径直接跳过，
                        // 于是端口永远回收不了、启动撞 EADDRINUSE。/proc/<pid>/exe 才是真路径。
                        // macOS 没有 /proc，但那边的 `ps -o comm=` 返回的本来就是完整路径。
                        let exePath = null;
                        try {
                            exePath = fs.readlinkSync(`/proc/${pid}/exe`);
                        }
                        catch {
                            exePath = null;
                        }
                        if (!exePath) {
                            try {
                                const output = (await execFileAsync("ps", ["-p", String(pid), "-o", "comm="], {
                                    timeout: 5_000,
                                })).stdout.toString().trim();
                                // 短名对判定无用，但留着能让日志说清"看到了谁却没动它"。
                                if (output)
                                    exePath = output;
                            }
                            catch {
                                // 进程已退出，保持 null
                            }
                        }
                        if (exePath)
                            result.set(pid, exePath);
                    }
                }
            }
            catch {
                // 整批查询失败：全部保持 null，调用方会因为"归属未知"而跳过。
            }
            return result;
        },
        async killTree(pid) {
            if (isWindows) {
                await execFileAsync("taskkill", ["/F", "/T", "/PID", String(pid)], {
                    timeout: 15_000,
                    windowsHide: true,
                });
            }
            else {
                process.kill(pid, "SIGKILL");
            }
        },
    };
}
