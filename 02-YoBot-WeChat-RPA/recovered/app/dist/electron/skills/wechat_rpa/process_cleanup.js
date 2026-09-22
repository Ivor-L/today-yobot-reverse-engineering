import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs';
import { isUnderAnyRoot } from '../../utils/process_ownership.js';
// Do not sweep all of bin/ or all service.exe processes. Include only the active
// installation and exact historical directories created by our updater.
export function rpaCleanupRoots(activeRoots) {
    const roots = [...activeRoots];
    for (const root of activeRoots) {
        try {
            const parent = path.dirname(root), name = path.basename(root);
            for (const entry of fs.readdirSync(parent, { withFileTypes: true })) {
                if (entry.isDirectory() && new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_(?:trash|old|backup)_\\d+$`).test(entry.name)) {
                    roots.push(path.join(parent, entry.name));
                }
            }
        }
        catch { /* No previous installation. */ }
    }
    return [...new Set(roots)];
}
export function isOwnedRpaProcess(proc, roots) {
    return proc.pid !== process.pid && !!proc.executablePath
        && path.basename(proc.executablePath).toLowerCase() === 'service.exe'
        && isUnderAnyRoot(proc.executablePath, roots);
}
function uninspectableListenerPids(snapshot) {
    const listening = new Set(snapshot.listeners.map(item => item.pid));
    return snapshot.processes.filter(item => listening.has(item.pid) && !item.executablePath
        && item.name?.toLowerCase() === 'service.exe').map(item => item.pid);
}
export async function cleanupRpaProcesses(roots, probe) {
    const errors = [];
    let permissionDenied = false;
    const deadline = Date.now() + 45_000;
    try {
        // Two bounded passes catch an already-spawning Worker. Kill only individual
        // verified RPA executables: /T could include a WeChat launched by that Worker.
        for (let pass = 0; pass < 2; pass++) {
            const snapshot = await probe.snapshot();
            const owners = snapshot.processes.filter(p => isOwnedRpaProcess(p, roots));
            const supervisorPids = new Set(snapshot.listeners.filter(p => p.port === 9921).map(p => p.pid));
            owners.sort((a, b) => Number(supervisorPids.has(b.pid)) - Number(supervisorPids.has(a.pid)));
            if (!owners.length)
                break;
            for (const proc of owners) {
                if (Date.now() >= deadline) {
                    errors.push('Cleanup deadline exceeded');
                    break;
                }
                try {
                    await probe.terminate(proc);
                }
                catch (error) {
                    const message = String(error?.stderr || error?.message || error);
                    permissionDenied ||= /RPA_ACCESS_DENIED|access.*denied|拒绝访问|访问被拒绝/i.test(message);
                    errors.push(`${proc.pid}: ${message.slice(0, 400)}`);
                }
            }
        }
        const final = await probe.snapshot();
        const remaining = final.processes.filter(p => isOwnedRpaProcess(p, roots));
        // Old ports are inspected too. Foreign services on optional fallback ports
        // do not prevent our fixed-port startup; never terminate them.
        const blocking = final.listeners.filter(p => p.port === 9921 || p.port === 9922);
        if (remaining.length)
            return { success: false, reason: permissionDenied ? 'permission_denied' : 'cleanup_failed', remainingPids: remaining.map(p => p.pid), errors };
        const unknown = uninspectableListenerPids(final);
        if (unknown.length)
            return { success: false, reason: 'inspection_failed', remainingPids: unknown, errors };
        if (blocking.length)
            return { success: false, reason: 'port_conflict', remainingPids: blocking.map(p => p.pid), errors };
        return { success: true, reason: 'stopped', remainingPids: [], errors };
    }
    catch (error) {
        return { success: false, reason: 'inspection_failed', remainingPids: [], errors: [...errors, String(error?.message || error)] };
    }
}
const execFileAsync = promisify(execFile);
async function powershell(script) {
    const shell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const { stdout } = await execFileAsync(shell, ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], {
        timeout: 10_000, windowsHide: true, maxBuffer: 4 * 1024 * 1024,
    });
    return stdout;
}
const snapshotScript = `
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$rows = @(Get-CimInstance Win32_Process | ForEach-Object {
    @{ pid = [int]$_.ProcessId; parentPid = [int]$_.ParentProcessId; name = $_.Name; executablePath = $_.ExecutablePath; createdAt = $(if ($_.CreationDate) { $_.CreationDate.ToUniversalTime().ToString('o') } else { '' }) }
})
$ports = @(Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -ge 9921 -and $_.LocalPort -le 9930 } | ForEach-Object {
    @{ port = [int]$_.LocalPort; pid = [int]$_.OwningProcess }
})
@{ processes = $rows; listeners = $ports } | ConvertTo-Json -Depth 4 -Compress
`;
function terminationScript(proc) {
    if (!Number.isInteger(proc.pid) || proc.pid <= 0 || !proc.executablePath || !proc.createdAt)
        throw new Error('Invalid RPA process identity');
    const literal = (value) => "'" + value.replace(/'/g, "''") + "'";
    return `
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$p = Get-CimInstance Win32_Process -Filter 'ProcessId = ${proc.pid}'
if (-not $p) { exit 0 }
if ($p.ExecutablePath -ne ${literal(proc.executablePath)} -or $p.CreationDate.ToUniversalTime().ToString('o') -ne ${literal(proc.createdAt)}) { throw 'RPA_PROCESS_IDENTITY_CHANGED' }
try { Stop-Process -Id ${proc.pid} -Force -ErrorAction Stop }
catch { if ($_.Exception.NativeErrorCode -eq 5 -or $_.CategoryInfo.Category -eq 'PermissionDenied') { throw 'RPA_ACCESS_DENIED' }; throw }
`;
}
export function createRpaCleanupProbe() {
    return {
        async snapshot() { return JSON.parse(await powershell(snapshotScript)); },
        async terminate(proc) { await powershell(terminationScript(proc)); },
    };
}
// Exit hooks cannot await promises. Use the same identity checks and scripts,
// without a helper service or a process-tree kill that could terminate WeChat.
export function cleanupRpaProcessesSync(roots, probe = createRpaCleanupSyncProbe()) {
    const errors = [];
    const deadline = Date.now() + 20_000;
    let permissionDenied = false;
    try {
        for (let pass = 0; pass < 2 && Date.now() < deadline; pass++) {
            const snapshot = probe.snapshot();
            const supervisors = new Set(snapshot.listeners.filter(p => p.port === 9921).map(p => p.pid));
            const owned = snapshot.processes.filter(p => isOwnedRpaProcess(p, roots));
            owned.sort((a, b) => Number(supervisors.has(b.pid)) - Number(supervisors.has(a.pid)));
            if (!owned.length)
                break;
            for (const proc of owned) {
                if (Date.now() >= deadline)
                    break;
                try {
                    probe.terminate(proc);
                }
                catch (error) {
                    const message = String(error?.stderr || error?.message || error);
                    permissionDenied ||= /RPA_ACCESS_DENIED|access.*denied|拒绝访问|访问被拒绝/i.test(message);
                    errors.push(`${proc.pid}: ${message.slice(0, 400)}`);
                }
            }
        }
        const final = probe.snapshot();
        const remaining = final.processes.filter(p => isOwnedRpaProcess(p, roots));
        if (remaining.length)
            return { success: false, reason: permissionDenied ? 'permission_denied' : 'cleanup_failed', remainingPids: remaining.map(p => p.pid), errors };
        const unknown = uninspectableListenerPids(final);
        if (unknown.length)
            return { success: false, reason: 'inspection_failed', remainingPids: unknown, errors };
        const blocking = final.listeners.filter(p => p.port === 9921 || p.port === 9922);
        if (blocking.length)
            return { success: false, reason: 'port_conflict', remainingPids: blocking.map(p => p.pid), errors };
        return { success: true, reason: 'stopped', remainingPids: [], errors };
    }
    catch (error) {
        return { success: false, reason: 'inspection_failed', remainingPids: [], errors: [...errors, String(error)] };
    }
}
function createRpaCleanupSyncProbe() {
    const run = (script) => execFileSync(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'), ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', timeout: 10_000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
    return {
        snapshot: () => JSON.parse(run(snapshotScript)),
        terminate: (proc) => { run(terminationScript(proc)); },
    };
}
