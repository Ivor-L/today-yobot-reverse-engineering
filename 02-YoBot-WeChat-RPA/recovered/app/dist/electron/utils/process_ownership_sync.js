import { execFileSync } from 'node:child_process';
import * as path from 'node:path';
import { isUnderAnyRoot } from './process_ownership.js';
function validPid(value) {
    return typeof value === 'number' && Number.isInteger(value) && value > 0;
}
function uniquePids(values) {
    return [...new Set(values.filter(validPid))];
}
/**
 * Synchronous Windows shutdown path used immediately before the Node process exits.
 *
 * The managed supervisor is stopped first, while it can still terminate its worker
 * as part of the same process tree. A directory-scoped sweep then catches an orphan
 * worker, and the port pass closes the race where a worker starts during shutdown.
 * Only the manager-owned PID is trusted directly; every discovered process must have
 * an executable below one of the supplied owned roots.
 */
export function shutdownOwnedProcessesSync(options) {
    const { port, ownedRoots, probe } = options;
    const selfPid = options.selfPid ?? process.pid;
    const killed = new Set();
    const failed = new Set();
    const kill = (pid) => {
        if (!validPid(pid) || pid === selfPid || killed.has(pid))
            return;
        try {
            probe.killTree(pid);
            killed.add(pid);
            failed.delete(pid);
        }
        catch {
            failed.add(pid);
        }
    };
    if (validPid(options.managedPid) && options.managedPid !== selfPid) {
        let stillExists = false;
        try {
            stillExists = probe.getProcess(options.managedPid) !== null;
        }
        catch {
            // The ChildProcess handle is authoritative. If inspection fails, retain
            // the previous behavior of attempting to terminate that exact PID.
            stillExists = true;
        }
        if (stillExists)
            kill(options.managedPid);
    }
    let processSnapshot = [];
    try {
        processSnapshot = probe.listProcesses();
    }
    catch {
        // Port ownership remains as a narrower fallback when process enumeration fails.
    }
    const processByPid = new Map();
    for (const info of processSnapshot) {
        if (!validPid(info.pid))
            continue;
        processByPid.set(info.pid, info);
        if (info.pid !== selfPid
            && info.executablePath
            && isUnderAnyRoot(info.executablePath, ownedRoots)) {
            kill(info.pid);
        }
    }
    let firstPortOwners = [];
    try {
        firstPortOwners = uniquePids(probe.listPortOwners(port));
    }
    catch {
        // The final verification below will report whether the port could be inspected.
    }
    for (const pid of firstPortOwners) {
        if (pid === selfPid || killed.has(pid))
            continue;
        let info = processByPid.get(pid) ?? null;
        if (!info) {
            try {
                info = probe.getProcess(pid);
            }
            catch {
                info = null;
            }
        }
        if (info?.executablePath && isUnderAnyRoot(info.executablePath, ownedRoots)) {
            kill(pid);
        }
    }
    let remainingPortOwners;
    let portVerified = true;
    try {
        remainingPortOwners = uniquePids(probe.listPortOwners(port));
    }
    catch {
        portVerified = false;
        remainingPortOwners = firstPortOwners.filter((pid) => !killed.has(pid));
    }
    const foreignPortOwners = [];
    const unknownPortOwners = [];
    for (const pid of remainingPortOwners) {
        let info = processByPid.get(pid) ?? null;
        if (!info) {
            try {
                info = probe.getProcess(pid);
            }
            catch {
                info = null;
            }
        }
        if (!info?.executablePath) {
            unknownPortOwners.push(pid);
        }
        else if (!isUnderAnyRoot(info.executablePath, ownedRoots)) {
            foreignPortOwners.push(pid);
        }
    }
    return {
        port,
        killedPids: [...killed],
        failedPids: [...failed].filter((pid) => !killed.has(pid)),
        remainingPortOwners,
        foreignPortOwners,
        unknownPortOwners,
        portVerified,
        portReleased: portVerified && remainingPortOwners.length === 0,
    };
}
function runPowerShell(command) {
    const shell = process.env.SystemRoot
        ? path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
        : 'powershell.exe';
    return execFileSync(shell, ['-NoProfile', '-NonInteractive', '-Command', command], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 10_000,
        windowsHide: true,
    });
}
function parseProcessRows(output) {
    const result = [];
    for (const rawLine of output.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line)
            continue;
        const separator = line.indexOf('|');
        const pidText = separator >= 0 ? line.slice(0, separator) : line;
        const pid = Number.parseInt(pidText.trim(), 10);
        if (!validPid(pid))
            continue;
        const executablePath = separator >= 0 ? line.slice(separator + 1).trim() : '';
        result.push({ pid, executablePath: executablePath || null });
    }
    return result;
}
function parsePidRows(output) {
    return uniquePids(output
        .split(/\r?\n/)
        .map((line) => Number.parseInt(line.trim(), 10)));
}
export function createSystemSyncProbe() {
    if (process.platform !== 'win32') {
        throw new Error('Synchronous process ownership probing is only supported on Windows');
    }
    const utf8Prefix = '[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new(); ';
    return {
        getProcess(pid) {
            if (!validPid(pid))
                return null;
            const output = runPowerShell(`${utf8Prefix}Get-CimInstance Win32_Process -Filter \"ProcessId = ${pid}\" `
                + `-ErrorAction SilentlyContinue | ForEach-Object { \"$($_.ProcessId)|$($_.ExecutablePath)\" }`);
            return parseProcessRows(output)[0] ?? null;
        },
        listProcesses() {
            const output = runPowerShell(`${utf8Prefix}Get-CimInstance Win32_Process -ErrorAction SilentlyContinue `
                + '| ForEach-Object { "$($_.ProcessId)|$($_.ExecutablePath)" }');
            return parseProcessRows(output);
        },
        listPortOwners(port) {
            if (!Number.isInteger(port) || port < 1 || port > 65535)
                return [];
            const output = runPowerShell(`${utf8Prefix}try { `
                + `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction Stop `
                + '| Select-Object -ExpandProperty OwningProcess -Unique '
                + '} catch { '
                + "if ($_.FullyQualifiedErrorId -like 'CmdletizationQuery_NotFound*') { exit 0 }; "
                + 'throw '
                + '}');
            return parsePidRows(output);
        },
        killTree(pid) {
            if (!validPid(pid))
                return;
            execFileSync('taskkill.exe', ['/F', '/T', '/PID', String(pid)], {
                stdio: 'ignore',
                timeout: 10_000,
                windowsHide: true,
            });
        },
    };
}
export function describeSyncShutdown(result) {
    const stopped = result.killedPids.length > 0
        ? `stopped owned PIDs ${result.killedPids.join(', ')}`
        : 'no owned process found';
    if (!result.portVerified) {
        return `${stopped}; port ${result.port} release could not be verified`;
    }
    if (result.portReleased) {
        return `${stopped}; port ${result.port} is released`;
    }
    return `${stopped}; port ${result.port} is still owned by PIDs ${result.remainingPortOwners.join(', ')}`;
}
