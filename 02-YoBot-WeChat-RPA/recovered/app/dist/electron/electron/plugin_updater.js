import * as fs from 'fs';
import * as path from 'path';
import { exec as execCb } from 'child_process';
import { promisify } from 'util';
const exec = promisify(execCb);
function getPowerShellPath() {
    const systemRoot = process.env.SystemRoot || process.env.windir || 'C:\\Windows';
    return path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function killProcessesInDir(targetDir) {
    if (process.platform !== 'win32') {
        return;
    }
    const escapedDir = (path.resolve(targetDir) + path.sep).replace(/'/g, "''");
    const psCmd = `$procs = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.ExecutablePath -and $_.ExecutablePath.StartsWith('${escapedDir}', [StringComparison]::OrdinalIgnoreCase) }; foreach ($p in $procs) { try { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue } catch {} }`;
    await exec(`"${getPowerShellPath()}" -NoProfile -Command "${psCmd}"`);
}
async function listPidsInDir(targetDir) {
    if (process.platform !== 'win32') {
        return [];
    }
    const escapedDir = (path.resolve(targetDir) + path.sep).replace(/'/g, "''");
    const psCmd = `Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.ExecutablePath -and $_.ExecutablePath.StartsWith('${escapedDir}', [StringComparison]::OrdinalIgnoreCase) } | Select-Object -ExpandProperty ProcessId`;
    const { stdout } = await exec(`"${getPowerShellPath()}" -NoProfile -Command "${psCmd}"`);
    return stdout
        .split(/\r?\n/)
        .map(line => parseInt(line.trim(), 10))
        .filter(pid => Number.isFinite(pid) && pid > 0);
}
// Probe whether the directory itself can be renamed (the real gate before a swap).
// Windows Defender / AV scanners hold directory-level locks even after the process is dead.
async function isDirRenameable(targetDir) {
    if (!fs.existsSync(targetDir)) {
        return true;
    }
    const parentDir = path.dirname(targetDir);
    const probeName = path.join(parentDir, `${path.basename(targetDir)}.__dirprobe__`);
    try {
        await fs.promises.rename(targetDir, probeName);
        await fs.promises.rename(probeName, targetDir);
        return true;
    }
    catch {
        if (fs.existsSync(probeName) && !fs.existsSync(targetDir)) {
            try {
                await fs.promises.rename(probeName, targetDir);
            }
            catch { }
        }
        return false;
    }
}
async function waitForUnlocked(targetDir, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    let killedThisRound = false;
    while (Date.now() < deadline) {
        const pids = await listPidsInDir(targetDir);
        if (pids.length > 0) {
            killedThisRound = true;
            await killProcessesInDir(targetDir);
            for (const pid of pids) {
                try {
                    await exec(`taskkill /F /T /PID ${pid}`);
                }
                catch { }
            }
            await sleep(1500);
            continue;
        }
        // Processes are gone — give Windows time to release DLL memory-map handles,
        // and wait out any AV scanner that may be holding a lock on the directory.
        if (killedThisRound) {
            await sleep(3000);
            killedThisRound = false;
        }
        if (await isDirRenameable(targetDir)) {
            return;
        }
        // Directory still locked (likely AV scan) — keep waiting
        await sleep(1500);
    }
    const remain = await listPidsInDir(targetDir);
    const renameable = await isDirRenameable(targetDir);
    throw new Error(`Updater timeout: plugin dir still in use. PIDs=${remain.join(',') || 'none'}, dirRenameable=${renameable}`);
}
async function savePendingUpdate(tempExtractDir, binDir, pluginName) {
    const pendingDir = path.join(binDir, `${pluginName}_pending`);
    if (fs.existsSync(pendingDir)) {
        await fs.promises.rm(pendingDir, { recursive: true, force: true });
    }
    await fs.promises.rename(tempExtractDir, pendingDir);
}
async function runSwap(payload) {
    const { pluginDir, tempExtractDir, binDir, pluginName } = payload;
    if (!fs.existsSync(tempExtractDir)) {
        throw new Error(`Temp extract dir missing: ${tempExtractDir}`);
    }
    // Carry over webot frontend if the downloaded zip doesn't include it.
    // The service runs in "API-Only" mode when webot/dist/index.html is missing.
    const webotSrcDir = path.join(pluginDir, 'webot');
    const webotDstDir = path.join(tempExtractDir, 'webot');
    if (fs.existsSync(webotSrcDir) && !fs.existsSync(webotDstDir)) {
        try {
            fs.cpSync(webotSrcDir, webotDstDir, { recursive: true });
        }
        catch { }
    }
    const dataDir = path.join(pluginDir, 'data');
    const tempDataDir = path.join(binDir, `${pluginName}_data_backup_${Date.now()}`);
    let hasDataBackup = false;
    if (fs.existsSync(dataDir)) {
        try {
            await fs.promises.rename(dataDir, tempDataDir);
            hasDataBackup = true;
        }
        catch { }
    }
    if (fs.existsSync(pluginDir)) {
        // Give Windows/AV up to 15s to release file locks after process termination,
        // then attempt the rename regardless (timeout just means AV is still scanning).
        await waitForUnlocked(pluginDir, 15000);
        let swapped = false;
        const trashDir = path.join(binDir, `${pluginName}_trash_${Date.now()}`);
        try {
            await fs.promises.rename(pluginDir, trashDir);
            fs.promises.rm(trashDir, { recursive: true, force: true }).catch(() => { });
            swapped = true;
        }
        catch { }
        if (!swapped) {
            // Directory still locked. Restore data backup and save new version as pending.
            // service_manager will apply it on the next service start (when no locks exist).
            if (hasDataBackup) {
                try {
                    await fs.promises.rename(tempDataDir, dataDir);
                }
                catch { }
            }
            await savePendingUpdate(tempExtractDir, binDir, pluginName);
            return { pendingUpdate: true };
        }
    }
    await fs.promises.rename(tempExtractDir, pluginDir);
    if (hasDataBackup) {
        const newDataDir = path.join(pluginDir, 'data');
        try {
            if (fs.existsSync(newDataDir)) {
                await fs.promises.rm(newDataDir, { recursive: true, force: true });
            }
            await fs.promises.rename(tempDataDir, newDataDir);
        }
        catch { }
    }
    return { pendingUpdate: false };
}
process.on('message', async (msg) => {
    if (!msg || msg.type !== 'plugin-updater:run') {
        return;
    }
    try {
        const payload = msg.payload;
        const result = await runSwap(payload);
        if (process.send) {
            process.send({ type: 'plugin-updater:done', pendingUpdate: result.pendingUpdate });
        }
        process.exit(0);
    }
    catch (e) {
        if (process.send) {
            process.send({ type: 'plugin-updater:error', error: e?.message || String(e) });
        }
        process.exit(1);
    }
});
