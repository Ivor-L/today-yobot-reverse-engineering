import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { spawn, exec as execCb, execFile as execFileCb, execSync } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { DEFAULT_RPA_PORT, getPortFromUrl } from '../../utils/rpa_port.js';
import { cmpSemver } from '../utils/version_gate.js';
import { isUnderAnyRoot, } from '../../utils/process_ownership.js';
import { resolveBootstrapAgentFileLayout } from '../../core/platform/file_layout.js';
import { cleanupRpaProcesses, cleanupRpaProcessesSync, createRpaCleanupProbe, rpaCleanupRoots } from './process_cleanup.js';
import { checkWorkerIdentity, readWorkerIdentity, summarizePluginVersions } from './runtime_identity.js';
import { RpaSupervisorClient, getRpaSupervisorTransition, supervisorStartingSeconds } from './supervisor_client.js';
import { getRpaRuntimeGate } from './runtime_gate.js';
const exec = promisify(execCb);
const execFile = promisify(execFileCb);
// 插件(service.exe)自身的 stdout 会带绝对路径（含用户名与 .yokoagent 品牌目录）。
// 转发到日志前先脱敏，避免向代理商渠道泄露品牌与用户路径。
function sanitizeRpaLog(text) {
    return text
        .replace(/[A-Za-z]:\\Users\\[^\\\s]+\\\.yokoagent/gi, '<data>')
        .replace(/[A-Za-z]:\\Users\\[^\\\s]+/gi, '<home>')
        // 兜底：清掉残留的 yoko 品牌目录名（如 <home>\.yokowebot）
        .replace(/\.yokowebot/gi, '<config>')
        .replace(/\.yokoagent/gi, '<data>');
}
export class RPAServiceManager {
    process = null;
    windowsSyncCleanupComplete = false;
    pidFile = path.join(process.env.USER_DATA_PATH || process.cwd(), '.rpa_service.pid');
    apiClient;
    pythonPath;
    // Paths are now determined dynamically in getServicePath()
    serviceDir;
    startPromise = null;
    // Hotfix: ensures the proactive Defender exclusion runs at most once per process,
    // so a slow/policy-blocked Add-MpPreference call cannot repeatedly delay startup.
    defenderExclusionAttempted = false;
    // Serializes every service lifecycle operation (start / stop / restart / repair) so they
    // can never interleave. Before this, a restart's stop() could kill a process that a
    // concurrent start had just spawned. All public lifecycle methods run via runExclusive();
    // the internal _startInternal/_stopInternal helpers never acquire the lock themselves
    // (calling a locked method from inside a locked op would deadlock).
    opChain = Promise.resolve();
    // The YOKO_RPA_TOKEN value the currently-running service.exe was spawned with. Lets
    // applyAuthToken() skip a redundant restart when the running service already has it.
    spawnedToken = undefined;
    runtimeCheckPromise = null;
    automaticRepairPromise = null;
    runtimeFailure = null;
    unhealthySince = 0;
    lifecycleBusy = 0;
    // Queue occupancy is a concurrency guard, not evidence of failure or repair.
    // Set only while a mutating operation is actually executing.
    lifecycleActivity = null;
    verifiedIdentityKey = '';
    workerActivityAlive = false;
    observedSupervisor = null;
    processProbe = createRpaCleanupProbe();
    recoveryTimer = null;
    lastStartResult = {
        success: false,
        reason: 'timeout',
        message: 'RPA service has not been started yet.'
    };
    constructor(apiClient) {
        this.apiClient = apiClient;
        // Assume running from project root
        this.pythonPath = path.join(process.cwd(), '.venv', 'Scripts', 'python.exe');
        this.serviceDir = path.join(process.cwd(), 'services', 'wechat-rpa');
    }
    getLastStartResult() {
        return this.lastStartResult;
    }
    setStartResult(result) {
        this.lastStartResult = result;
        return result;
    }
    repairRecordPath() {
        return path.join(process.env.USER_DATA_PATH || process.cwd(), '.rpa_recovery.json');
    }
    saveRepairRecord(result) {
        this.cancelRecoveryTimer();
        this.runtimeFailure = result;
        try {
            const targetVersion = this.readPluginVersion(this.getServicePaths().plugin.dir);
            fs.writeFileSync(this.repairRecordPath(), JSON.stringify({ targetVersion, bootAt: Date.now() - os.uptime() * 1000, result }));
        }
        catch (error) {
            console.warn('[RPA Recovery] Could not persist result:', error);
        }
    }
    loadRepairRecord() {
        try {
            const record = JSON.parse(fs.readFileSync(this.repairRecordPath(), 'utf8'));
            // Discard false failures persisted by the earlier equality check. A
            // new manager must be allowed to start before it owns a Worker PID.
            if (record.result?.reason === 'version_mismatch'
                && typeof record.result.runningVersion === 'string'
                && typeof record.targetVersion === 'string'
                && cmpSemver(record.result.runningVersion, record.targetVersion) >= 0)
                return null;
            if (record.targetVersion === this.readPluginVersion(this.getServicePaths().plugin.dir)
                && Math.abs(record.bootAt - (Date.now() - os.uptime() * 1000)) < 120_000)
                return record.result;
        }
        catch { /* First use or no failed recovery. */ }
        return null;
    }
    clearRepairRecord() {
        this.cancelRecoveryTimer();
        this.runtimeFailure = null;
        this.unhealthySince = 0;
        try {
            fs.unlinkSync(this.repairRecordPath());
        }
        catch { }
    }
    cancelRecoveryTimer() {
        if (this.recoveryTimer)
            clearTimeout(this.recoveryTimer);
        this.recoveryTimer = null;
    }
    scheduleRecoveryCheck(delayMs) {
        if (this.recoveryTimer)
            return;
        // One finite delayed check, not a polling monitor. Leaving the page must
        // not cancel the recovery already promised to the user.
        this.recoveryTimer = setTimeout(() => {
            this.recoveryTimer = null;
            this.checkRuntime().catch(error => console.warn('[RPA Recovery] Delayed check failed:', error));
        }, Math.max(1, delayMs));
        this.recoveryTimer.unref();
    }
    recordStartFailure(error) {
        console.error('[RPA Recovery] Start failed:', error);
        this.setStartResult({ success: false, reason: 'runtime_failed', message: '微信 BOT 暂时无法连接，请重新检查。', details: { error: String(error), recovery: this.runtimeFailure } });
        return false;
    }
    async inspectRuntime() {
        const installedVersion = this.readPluginVersion(this.getServicePaths().plugin.dir);
        let worker = await readWorkerIdentity(this.apiClient.getApiUrl());
        if (!worker) {
            // Compatibility discovery is only a candidate; its health alone never
            // proves which executable/version is answering.
            await this.apiClient.checkHealth({ discover: true });
            worker = await readWorkerIdentity(this.apiClient.getApiUrl());
        }
        const supervisor = await new RpaSupervisorClient().getStatus();
        this.observedSupervisor = supervisor;
        const heartbeat = supervisor?.worker_heartbeat;
        const heartbeatAge = Date.now() - Number(heartbeat?.timestamp) * 1000;
        this.workerActivityAlive = heartbeat?.pid === supervisor?.worker_pid
            && Number.isFinite(heartbeatAge) && heartbeatAge >= 0 && heartbeatAge < 30_000;
        let reason = checkWorkerIdentity(worker, installedVersion, supervisor);
        if (!reason && worker && process.platform === 'win32' && process.env.NODE_ENV === 'production') {
            const key = `${this.process?.pid}:${worker.pid}:${worker.version}:${supervisor?.supervisor_pid}:${supervisor?.worker_generation}:${this.apiClient.getApiUrl()}`;
            if (!this.isProcessAlive())
                reason = 'identity_mismatch';
            else if (key !== this.verifiedIdentityKey) {
                try {
                    const snapshot = await this.processProbe.snapshot();
                    const info = snapshot.processes.find(p => p.pid === worker.pid);
                    const paths = this.getServicePaths();
                    let ancestor = info;
                    const seen = new Set();
                    while (ancestor && ancestor.pid !== this.process?.pid && !seen.has(ancestor.pid)) {
                        seen.add(ancestor.pid);
                        ancestor = snapshot.processes.find(p => p.pid === ancestor.parentPid);
                    }
                    const ownsEndpoint = snapshot.listeners.some(listener => listener.port === getPortFromUrl(this.apiClient.getApiUrl()) && listener.pid === worker.pid);
                    if (!info || !ownsEndpoint || !isUnderAnyRoot(info.executablePath, [paths.plugin.dir]) || !this.process?.pid || ancestor?.pid !== this.process.pid)
                        reason = 'identity_mismatch';
                    else
                        this.verifiedIdentityKey = key;
                }
                catch {
                    reason = 'inspection_failed';
                }
            }
        }
        return { state: reason ? 'waiting' : 'ready', reason: reason || undefined, installedVersion, runningVersion: worker?.version, apiUrl: this.apiClient.getApiUrl() };
    }
    /** Cheap normal polling; expensive cleanup occurs once per continuous fault. */
    async checkRuntime(options = {}) {
        const gate = getRpaRuntimeGate();
        if (gate.blocked && gate.action !== 'allow') {
            this.cancelRecoveryTimer();
            return { state: 'failed', reason: 'client_update_required' };
        }
        if (options.retry && !this.automaticRepairPromise)
            this.clearRepairRecord();
        if (this.lifecycleActivity)
            return { state: this.lifecycleActivity };
        if (this.runtimeCheckPromise)
            return this.runtimeCheckPromise;
        this.runtimeCheckPromise = (async () => {
            const current = await this.inspectRuntime();
            if (this.lifecycleActivity)
                return { state: this.lifecycleActivity };
            if (current.state === 'ready') {
                this.clearRepairRecord();
                this.setStartResult({ success: true, reason: 'running', message: '微信 BOT 已连接。', details: current });
                return current;
            }
            // A queued start/update may resolve this observation. Do not compete
            // with it, but do not claim it is repairing before it actually begins.
            if (this.lifecycleBusy || this.automaticRepairPromise)
                return { ...current, state: 'waiting' };
            const failed = this.loadRepairRecord();
            if (failed)
                return { ...current, ...failed, state: 'failed' };
            this.unhealthySince ||= Date.now();
            const explicitRepair = options.repair || options.retry;
            const transition = getRpaSupervisorTransition(this.observedSupervisor);
            const transitionSeconds = supervisorStartingSeconds(this.observedSupervisor)
                ?? (Date.now() - this.unhealthySince) / 1000;
            // Let the existing Supervisor finish a real spawn/restart. Its new
            // generation may briefly disagree with a response from the old Worker.
            if (transition && current.reason !== 'version_mismatch' && !explicitRepair && transitionSeconds < 120) {
                this.scheduleRecoveryCheck(120_000 - transitionSeconds * 1000);
                return { ...current, state: transition };
            }
            // main.py treats a fresh independent heartbeat as liveness. A slow
            // HTTP request must not turn a running task into a persisted failure.
            if (current.reason === 'unresponsive' && this.workerActivityAlive && !explicitRepair) {
                return { ...current, state: 'busy' };
            }
            if (current.reason === 'unresponsive' && this.observedSupervisor?.status === 'failed' && !explicitRepair) {
                return { ...current, state: 'failed' };
            }
            const immediate = current.reason === 'version_mismatch' || current.reason === 'identity_mismatch';
            if (!immediate && !options.repair && !options.retry && Date.now() - this.unhealthySince < 120_000) {
                this.scheduleRecoveryCheck(120_000 - (Date.now() - this.unhealthySince));
                return current;
            }
            // Save before repairing so a process crash/page reload cannot reset the budget.
            this.saveRepairRecord({ ...current, state: 'failed' });
            console.warn('[RPA Recovery] Repair requested:', JSON.stringify(current));
            this.automaticRepairPromise = this.runExclusive('runtime-recovery', async () => {
                try {
                    const latest = await this.inspectRuntime();
                    if (latest.state === 'ready') {
                        this.clearRepairRecord();
                        return latest;
                    }
                    this.lifecycleActivity = 'repairing';
                    if (current.reason === 'unresponsive' && this.isProcessAlive()) {
                        const request = await new RpaSupervisorClient().restartWorker();
                        if (request.success) {
                            const deadline = Date.now() + 40_000;
                            let identityChanged = false;
                            while (Date.now() < deadline) {
                                await new Promise(resolve => setTimeout(resolve, 1500));
                                const checked = await this.inspectRuntime();
                                if (checked.state === 'ready') {
                                    this.clearRepairRecord();
                                    return checked;
                                }
                                if (checked.reason === 'version_mismatch' || checked.reason === 'identity_mismatch') {
                                    identityChanged = true;
                                    break;
                                }
                            }
                            if (!identityChanged)
                                return { ...current, state: 'failed' };
                        }
                    }
                    // Version/ownership drift requires replacing the old Supervisor too.
                    if (!await this._startInternal())
                        throw new Error('RPA_START_VERIFICATION_FAILED');
                    const checked = await this.inspectRuntime();
                    if (checked.state !== 'ready')
                        throw new Error('RPA_IDENTITY_VERIFICATION_FAILED');
                    this.clearRepairRecord();
                    return checked;
                }
                catch (error) {
                    this.recordStartFailure(error);
                    return this.runtimeFailure || { ...current, state: 'failed' };
                }
            }).then(result => {
                if (result.state !== 'ready')
                    this.saveRepairRecord(result);
                return result;
            }).finally(() => { this.automaticRepairPromise = null; });
            return { ...current, state: this.lifecycleActivity || 'waiting' };
        })();
        try {
            return await this.runtimeCheckPromise;
        }
        finally {
            this.runtimeCheckPromise = null;
        }
    }
    /** Download/extraction happens first; stop, stage, swap and verified start share one queue. */
    async installPreparedUpdate(preparedDir, version) {
        const paths = this.getServicePaths();
        const binDir = path.dirname(paths.plugin.dir);
        const candidate = path.resolve(preparedDir);
        if (path.dirname(candidate) !== path.resolve(binDir) || !/^wechat-rpa_(?:n|ex_)[a-z0-9]+$/i.test(path.basename(candidate))
            || !/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(version)) {
            throw new Error('Invalid prepared RPA update');
        }
        let source = candidate;
        if (!fs.existsSync(path.join(source, 'service.exe'))) {
            const children = fs.readdirSync(candidate, { withFileTypes: true }).filter(item => item.isDirectory() && !item.isSymbolicLink());
            if (children.length !== 1 || !fs.existsSync(path.join(candidate, children[0].name, 'service.exe')))
                throw new Error('Invalid RPA archive layout');
            source = path.join(candidate, children[0].name);
        }
        return this.runExclusive('install-plugin', async () => {
            this.clearRepairRecord();
            try {
                await this._stopInternal();
                const pending = path.join(binDir, 'wechat-rpa_pending');
                if (fs.existsSync(pending))
                    await fs.promises.rm(pending, { recursive: true, force: true });
                await fs.promises.writeFile(path.join(source, 'version.json'), JSON.stringify({ version, updated_at: new Date().toISOString() }));
                await fs.promises.rename(source, pending);
                await this.applyPendingUpdateIfExists(paths.plugin.dir);
                if (!await this._startInternal())
                    throw new Error('Updated RPA did not start');
                const checked = await this.inspectRuntime();
                if (checked.state !== 'ready' || checked.runningVersion !== version)
                    throw new Error('Updated RPA identity did not match');
                this.clearRepairRecord();
                return this.lastStartResult;
            }
            catch (error) {
                if (!this.runtimeFailure)
                    this.saveRepairRecord({ state: 'failed', reason: 'update_failed' });
                this.recordStartFailure(error);
                return this.lastStartResult;
            }
        });
    }
    getServicePaths() {
        const rootDir = process.cwd();
        const isProd = process.env.NODE_ENV === 'production';
        // 1. Try User Data path (Plugin Mode - Priority)
        let pluginExePath;
        let pluginZipPath;
        let pluginDir;
        pluginDir = resolveBootstrapAgentFileLayout({
            userDataRoot: process.env.USER_DATA_PATH?.trim() || undefined,
        }).compatPluginDir;
        pluginExePath = path.join(pluginDir, 'service.exe');
        pluginZipPath = path.join(pluginDir, 'service.zip');
        // 2. Try Production/Resources path (Legacy / Built-in)
        const resourcesPath = process.env.RESOURCES_PATH || path.join(rootDir, 'resources');
        const prodExePath = path.join(resourcesPath, 'wechat-rpa', 'service.exe');
        // 3. Try Local/Dev Binary path
        const devDir = path.join(rootDir, 'services', 'wechat-rpa');
        const devExePath = path.join(devDir, 'service.exe');
        const devZipPath = path.join(devDir, 'service.zip');
        const devScriptPath = path.join(devDir, 'server.py');
        return {
            plugin: { dir: pluginDir, exe: pluginExePath, zip: pluginZipPath },
            prod: { dir: path.join(resourcesPath, 'wechat-rpa'), exe: prodExePath },
            dev: { dir: devDir, exe: devExePath, zip: devZipPath, script: devScriptPath }
        };
    }
    async applyPendingUpdateIfExists(pluginDir) {
        const binDir = path.dirname(pluginDir);
        const pluginName = path.basename(pluginDir);
        const pendingDir = path.join(binDir, `${pluginName}_pending`);
        if (!fs.existsSync(pendingDir))
            return;
        console.log('[WeChatRPASkill] Pending update found, applying...');
        // Carry over webot frontend if the pending dir doesn't include it (stale pending from old update).
        const webotDir = path.join(pluginDir, 'webot');
        const pendingWebotDir = path.join(pendingDir, 'webot');
        if (fs.existsSync(webotDir) && !fs.existsSync(pendingWebotDir)) {
            try {
                fs.cpSync(webotDir, pendingWebotDir, { recursive: true });
            }
            catch (e) {
                console.error('[WeChatRPASkill] Failed to copy webot to pending dir:', e);
            }
        }
        if (!fs.existsSync(path.join(pendingDir, 'service.exe')))
            throw new Error('Pending RPA executable missing');
        const dataDir = path.join(pluginDir, 'data');
        const dataBackupDir = path.join(binDir, `${pluginName}_data_backup_${Date.now()}`);
        let hasDataBackup = false;
        let trashDir = null;
        let installed = false;
        try {
            // Failure to preserve user data aborts the swap. Never delete the old
            // installation until the data has been restored successfully.
            if (fs.existsSync(dataDir)) {
                fs.renameSync(dataDir, dataBackupDir);
                hasDataBackup = true;
            }
            if (fs.existsSync(pluginDir)) {
                trashDir = path.join(binDir, `${pluginName}_trash_${Date.now()}`);
                fs.renameSync(pluginDir, trashDir);
            }
            fs.renameSync(pendingDir, pluginDir);
            installed = true;
            if (hasDataBackup) {
                const newDataDir = path.join(pluginDir, 'data');
                if (fs.existsSync(newDataDir))
                    fs.rmSync(newDataDir, { recursive: true, force: true });
                fs.renameSync(dataBackupDir, newDataDir);
            }
            if (trashDir)
                fs.promises.rm(trashDir, { recursive: true, force: true }).catch(() => { });
            console.log('[WeChatRPASkill] Pending update applied successfully.');
        }
        catch (error) {
            console.error('[WeChatRPASkill] Pending update failed:', error);
            try {
                if (installed)
                    fs.renameSync(pluginDir, pendingDir);
                if (trashDir && fs.existsSync(trashDir))
                    fs.renameSync(trashDir, pluginDir);
                if (hasDataBackup && fs.existsSync(dataBackupDir))
                    fs.renameSync(dataBackupDir, dataDir);
            }
            catch (rollbackError) {
                console.error('[WeChatRPASkill] Rollback incomplete; preserved installation/data for recovery:', rollbackError);
            }
            throw error;
        }
    }
    async cleanupOldProcesses() {
        if (process.platform !== 'win32')
            return;
        const paths = this.getServicePaths();
        const roots = rpaCleanupRoots([paths.plugin.dir, paths.prod.dir]);
        const result = await cleanupRpaProcesses(roots, this.processProbe);
        console.log('[WeChatRPASkill] RPA cleanup verification:', JSON.stringify(result));
        if (!result.success) {
            const failure = { state: 'failed', reason: result.reason };
            this.runtimeFailure = failure;
            this.saveRepairRecord(failure);
            throw new Error(`RPA_CLEANUP_FAILED:${result.reason}`);
        }
        this.process = null;
        this.verifiedIdentityKey = '';
        if (fs.existsSync(this.pidFile))
            fs.unlinkSync(this.pidFile);
    }
    async isPortBound(port) {
        if (process.platform !== 'win32')
            return false;
        try {
            const { stdout } = await exec(`powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Measure-Object | Select-Object -ExpandProperty Count"`);
            return parseInt(stdout.trim(), 10) > 0;
        }
        catch {
            return false;
        }
    }
    // Adds Windows Defender path exclusions for the RPA service directories.
    // Returns 'added' if verified, 'needs_elevation' if UAC required, 'unavailable' on non-Windows.
    async addDefenderExclusions(pluginDir) {
        if (process.platform !== 'win32')
            return 'unavailable';
        const webot_temp = 'C:\\Users\\Public\\webot_temp';
        // Wrap each cmdlet in PowerShell try/catch so the script always exits 0,
        // even when Add-MpPreference fails due to missing UAC elevation.
        const addScript = [
            `try { Add-MpPreference -ExclusionPath '${pluginDir}' -ErrorAction Stop } catch {}`,
            `try { Add-MpPreference -ExclusionPath '${webot_temp}' -ErrorAction Stop } catch {}`
        ].join('; ');
        try {
            await exec(`powershell -NoProfile -Command "${addScript}"`);
        }
        catch { }
        // Verify the exclusion was actually registered.
        // Defender normalizes paths by appending a trailing backslash, so we trim both sides before comparing.
        try {
            const { stdout } = await exec(`powershell -NoProfile -Command "$p = '${pluginDir}'.TrimEnd('\\'); $e = (Get-MpPreference -ErrorAction SilentlyContinue).ExclusionPath; if ($e) { ($e | % { $_.TrimEnd('\\') }) -contains $p } else { $false }"`);
            if (stdout.trim().toLowerCase() === 'true') {
                console.log(`[WeChatRPASkill] Defender exclusions verified: ${pluginDir}`);
                return 'added';
            }
        }
        catch { }
        console.log('[WeChatRPASkill] Defender exclusion not applied — likely not elevated or managed by policy.');
        return 'needs_elevation';
    }
    // Re-attempts Defender exclusion via UAC elevation (shows a one-time system dialog).
    // Only called when we have confirmed AV interference after the 30-second startup timeout.
    async addDefenderExclusionsElevated(pluginDir) {
        if (process.platform !== 'win32')
            return false;
        const webot_temp = 'C:\\Users\\Public\\webot_temp';
        const scriptPath = path.join(os.tmpdir(), 'yoko_defender_fix.ps1');
        const scriptContent = [
            `Add-MpPreference -ExclusionPath '${pluginDir}' -ErrorAction SilentlyContinue`,
            `Add-MpPreference -ExclusionPath '${webot_temp}' -ErrorAction SilentlyContinue`
        ].join('\r\n');
        try {
            fs.writeFileSync(scriptPath, scriptContent, 'utf8');
            // -Verb RunAs triggers a one-time UAC elevation dialog for the user.
            await exec(`powershell -NoProfile -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \\"${scriptPath}\\"' -Wait -WindowStyle Hidden"`);
            // Verify after elevation.
            const { stdout } = await exec(`powershell -NoProfile -Command "(Get-MpPreference -ErrorAction SilentlyContinue).ExclusionPath -contains '${pluginDir}'"`);
            if (stdout.trim().toLowerCase() === 'true') {
                console.log('[WeChatRPASkill] Defender exclusions added via UAC elevation.');
                return true;
            }
            console.warn('[WeChatRPASkill] UAC completed but exclusion not verified — may be group policy restricted.');
            return false;
        }
        catch (e) {
            console.warn('[WeChatRPASkill] UAC elevation failed or was denied by user:', e);
            return false;
        }
    }
    // Runs `fn` exclusively: waits for any in-progress lifecycle operation to finish first,
    // then blocks all later operations until `fn` settles. This is the core of the race fix.
    // IMPORTANT: `fn` must only call the unlocked _startInternal/_stopInternal helpers — never
    // the public locked methods — otherwise it deadlocks waiting on its own queue slot.
    runExclusive(label, fn) {
        this.lifecycleBusy++;
        const prev = this.opChain;
        let release;
        this.opChain = new Promise(res => { release = res; });
        const run = (async () => {
            await prev.catch(() => { });
            this.lifecycleActivity = label === 'repair' ? 'repairing'
                : label === 'install-plugin' ? 'updating'
                    : label === 'restart-worker' || label === 'restart' || label === 'stop' ? 'waiting'
                        : null;
            try {
                return await fn();
            }
            finally {
                this.lifecycleActivity = null;
            }
        })();
        // Release the queue once fn settles, regardless of success or failure.
        run.then(() => { this.lifecycleBusy--; release(); }, () => { this.lifecycleBusy--; release(); });
        return run;
    }
    isProcessAlive() {
        return !!this.process && this.process.exitCode === null;
    }
    async ensureServiceRunning() {
        // Coalesce concurrent callers (many tool handlers call this) onto one start op.
        if (this.startPromise) {
            console.log('[WeChatRPASkill] Waiting for existing start operation...');
            return this.startPromise;
        }
        this.startPromise = this.runExclusive('start', async () => {
            if (this.loadRepairRecord()) {
                const checked = await this.inspectRuntime();
                if (checked.state === 'ready') {
                    this.clearRepairRecord();
                    return true;
                }
                return this.recordStartFailure('Previous automatic recovery failed');
            }
            if (this.isProcessAlive()) {
                const identity = await this.inspectRuntime();
                if (identity.state === 'ready')
                    return true;
                // A busy automation can delay HTTP responses. Tool calls must never
                // turn one timeout into a restart; recovery owns the bounded retry.
                this.unhealthySince ||= Date.now();
                return this.recordStartFailure(`Runtime not ready: ${identity.reason}`);
            }
            try {
                return await this._startInternal();
            }
            catch (error) {
                return this.recordStartFailure(error);
            }
        });
        try {
            return await this.startPromise;
        }
        finally {
            this.startPromise = null;
        }
    }
    async runWorkerRestart(operation) {
        return this.runExclusive('restart-worker', operation);
    }
    async isRuntimeIdentityReady() {
        return (await this.inspectRuntime()).state === 'ready';
    }
    // Atomic stop-then-start for explicit restart requests (UI button / plugin install).
    async restart() {
        return this.runExclusive('restart', async () => {
            this.clearRepairRecord();
            try {
                await this._stopInternal();
                await this._startInternal();
            }
            catch (error) {
                this.recordStartFailure(error);
            }
            return this.lastStartResult;
        });
    }
    latestPluginVersionCache;
    /** 服务端当前发布版本。10 分钟缓存，查不到返回 undefined —— 诊断不能因为没网而失败。 */
    async readLatestPluginVersion() {
        const TTL_MS = 10 * 60_000;
        if (this.latestPluginVersionCache && Date.now() - this.latestPluginVersionCache.at < TTL_MS) {
            return this.latestPluginVersionCache.version;
        }
        const apiBase = process.env.REMOTE_SERVER_URL;
        if (!apiBase)
            return undefined;
        try {
            const resp = await axios.get(`${apiBase}/v1/app/plugin/version`, {
                params: { name: 'wechat-rpa', platform: 'win32' },
                timeout: 5_000,
            });
            const version = typeof resp.data?.version === 'string' ? resp.data.version : undefined;
            this.latestPluginVersionCache = { version, at: Date.now() };
            return version;
        }
        catch {
            this.latestPluginVersionCache = { version: undefined, at: Date.now() };
            return undefined;
        }
    }
    /**
     * 只读的插件版本快照，供诊断使用：**不升级、不碰服务**。
     *
     * 运行版本取自 RPA 自己的 /api/health，而不是本地 version.json —— 后者只是安装记录。
     */
    async readPluginVersions() {
        const installed = this.readPluginVersion(this.getServicePaths().plugin.dir);
        const [worker, latest] = await Promise.all([
            readWorkerIdentity(this.apiClient.getApiUrl()).catch(() => null),
            this.readLatestPluginVersion(),
        ]);
        return summarizePluginVersions({ running: worker?.version, installed, latest });
    }
    /** 读某个插件目录的版本号，缺失/损坏一律当 0.0.0。 */
    readPluginVersion(dir) {
        try {
            const p = path.join(dir, 'version.json');
            if (fs.existsSync(p))
                return JSON.parse(fs.readFileSync(p, 'utf-8')).version || '0.0.0';
        }
        catch { }
        return '0.0.0';
    }
    /**
     * 客户端侧升级 RPA 插件到最新版（等价于用户点 RPA 设置里的「更新」）。
     *
     * 版本比对、下载、目录交换、重启全在本类内统一管理，调用方（工具）只拿结构化结果：
     *   - 已是最新：{ updated:false, upToDate:true } —— 不碰服务、不重启。
     *   - 已更新：  { updated:true, fromVersion, toVersion }。
     *   - 失败：    { updated:false, error }。
     *
     * 交换复用既有 applyPendingUpdateIfExists，它会备份并还原 data/ 目录（调度器 DB、断点、任务），
     * 避免手工覆盖导致数据丢失/DB 锁死。升级后服务自动拉起，无需用户重启 YoBot。
     */
    async updatePlugin() {
        const paths = this.getServicePaths();
        const pluginDir = paths.plugin.dir;
        const currentVersion = this.readPluginVersion(pluginDir);
        // 1. 查最新版（与 UI 更新按钮同一接口，无鉴权）
        const apiBase = process.env.REMOTE_SERVER_URL;
        if (!apiBase)
            return { updated: false, error: '未配置服务端地址，无法检查更新' };
        let latest;
        try {
            const resp = await axios.get(`${apiBase}/v1/app/plugin/version`, {
                params: { name: 'wechat-rpa', platform: 'win32' },
                timeout: 15000,
            });
            latest = { version: resp.data?.version, download_url: resp.data?.download_url };
        }
        catch (e) {
            return { updated: false, error: `查询最新版本失败: ${e?.message || e}` };
        }
        if (!latest.version || !latest.download_url) {
            return { updated: false, error: '服务端未返回有效的版本信息' };
        }
        // 2. 已是最新：直接反馈，不做任何服务操作
        if (cmpSemver(latest.version, currentVersion) <= 0) {
            return { updated: false, upToDate: true, currentVersion };
        }
        const binDir = path.dirname(pluginDir);
        const tmpZip = path.join(binDir, `wechat-rpa_dl_${Date.now()}.zip`);
        const tmpExtract = path.join(binDir, `wechat-rpa_ex_${Date.now().toString(36)}`);
        try {
            await fs.promises.mkdir(binDir, { recursive: true });
            const dl = await axios.get(latest.download_url, { responseType: 'arraybuffer', timeout: 180000 });
            await fs.promises.writeFile(tmpZip, Buffer.from(dl.data));
            const extract = (await import('extract-zip')).default;
            await extract(tmpZip, { dir: tmpExtract });
            const result = await this.installPreparedUpdate(tmpExtract, latest.version);
            return result.success
                ? { updated: true, fromVersion: currentVersion, toVersion: latest.version }
                : { updated: false, error: result.message };
        }
        catch (error) {
            return { updated: false, error: `更新未能完成: ${error?.message || error}` };
        }
        finally {
            fs.promises.rm(tmpZip, { force: true }).catch(() => { });
        }
    }
    // Applies a new auth token. Runs as a single queued op, so the service state it observes
    // is definitive (no start can be mid-flight): if the running process was already spawned
    // with this exact token, it does nothing; otherwise it (re)starts the service so the child
    // picks up the new YOKO_RPA_TOKEN. This avoids a redundant restart at boot, where the
    // lazy-load start already spawns after the token env var has been set.
    async applyAuthToken(token) {
        return this.runExclusive('auth-token', async () => {
            if (this.loadRepairRecord()) {
                this.recordStartFailure('Previous automatic recovery failed');
                return this.lastStartResult;
            }
            if (this.isProcessAlive() && this.spawnedToken === token) {
                console.log('[WeChatRPASkill] Auth token unchanged for running service — no restart needed.');
                return this.lastStartResult;
            }
            if (this.isProcessAlive()) {
                console.log('[WeChatRPASkill] Auth token changed — restarting RPA service.');
                await this._stopInternal();
            }
            await this._startInternal();
            return this.lastStartResult;
        });
    }
    async _startInternal() {
        this.lifecycleActivity ||= 'waiting';
        this.windowsSyncCleanupComplete = false;
        const isProd = process.env.NODE_ENV === 'production';
        // In production, we MUST kill any existing RPA process before starting.
        // This prevents "zombie" processes from previous crashes from occupying the port
        // and ensures we always run the version of the RPA service bundled with this client update.
        if (isProd) {
            console.log('[WeChatRPASkill] Production mode: cleaning up old processes before start...');
            await this.cleanupOldProcesses();
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        // Try to connect to existing service first (regardless of whether we started it)
        let isRunning = !isProd && await this.apiClient.checkHealth({ discover: true });
        if (isRunning) {
            console.log('[WeChatRPASkill] Service already running (external).');
            this.setStartResult({
                success: true,
                reason: 'running',
                message: 'RPA service is already healthy.'
            });
            return true;
        }
        // Determine paths
        const paths = this.getServicePaths();
        // Apply any pending update now that all service processes are dead and no file locks exist
        if (isProd) {
            await this.applyPendingUpdateIfExists(paths.plugin.dir);
        }
        // Proactively add Defender exclusions on Windows to prevent port-binding interference.
        // Hotfix: run in the background (non-blocking). Add-MpPreference can take 10s+ — or hang
        // — on machines where Defender is policy-managed, and the service.exe starts fine without
        // the exclusion. Blocking spawn on this call needlessly inflates cold-start time and lets
        // the UI watchdog mistake a slow boot for a hung service. The post-timeout diagnostic
        // path still performs a proper awaited exclusion + retry if the port never binds.
        if (isProd && process.platform === 'win32' && !this.defenderExclusionAttempted) {
            this.defenderExclusionAttempted = true;
            this.addDefenderExclusions(paths.plugin.dir)
                .catch(e => console.warn('[WeChatRPASkill] Background Defender exclusion failed (non-critical):', e));
        }
        let cmd = '';
        let args = [];
        let cwd = '';
        const channelId = process.env.VITE_CHANNEL_ID || 'agent_generic';
        let env = {
            ...process.env,
            WEBOT_BACKEND_MODE: '1',
            YOKO_RPA_PORT: String(DEFAULT_RPA_PORT),
            PYTHONIOENCODING: 'utf-8',
            PYTHONUTF8: '1',
            YOKO_API_BASE: process.env.REMOTE_SERVER_URL,
            VITE_CHANNEL_ID: channelId,
            YOKO_CHANNEL_ID: channelId,
            // Per-spawn public correlation ID. New Control builds echo this in
            // /v1/rpa/auth/verify so the server can distinguish two runtimes on
            // the same Agent session without exposing a credential.
            YOKO_RPA_RUNTIME_ID: randomUUID(),
        };
        // Check Logic: 
        // 1. Dev (if not prod and exists) - Priority for development
        // 2. Plugin - Priority for production (User Data)
        // 3. Prod - Fallback for production (Built-in)
        // 1. Dev (Exe) - Priority in Dev
        if (!isProd && fs.existsSync(paths.dev.exe)) {
            console.log(`[WeChatRPASkill] Found local service.exe at: ${paths.dev.exe}`);
            cmd = paths.dev.exe;
            cwd = path.dirname(cmd);
            args = ['--no-ui', '--channel-id', channelId];
        }
        // 2. Dev (Script) - Priority in Dev
        else if (!isProd && fs.existsSync(paths.dev.script)) {
            if (!fs.existsSync(this.pythonPath)) {
                console.warn(`[WeChatRPASkill] venv python not found at ${this.pythonPath}, trying system python...`);
                this.pythonPath = 'python';
            }
            console.log(`[WeChatRPASkill] Found local server.py at: ${paths.dev.script}`);
            cmd = this.pythonPath;
            cwd = path.dirname(paths.dev.script);
            args = [paths.dev.script, '--no-ui', '--channel-id', channelId];
        }
        // Helper to get version from a directory
        const getVersion = (dir) => {
            try {
                const vPath = path.join(dir, 'version.json');
                if (fs.existsSync(vPath)) {
                    const data = JSON.parse(fs.readFileSync(vPath, 'utf8'));
                    return data.version || '0.0.0';
                }
            }
            catch (e) { }
            return '0.0.0';
        };
        const prodVersion = getVersion(paths.prod.dir);
        const pluginVersion = getVersion(paths.plugin.dir);
        // Seed or upgrade from bundled resources through the same data-preserving
        // swap. A same-version file-size difference is not evidence of an upgrade.
        if (fs.existsSync(paths.prod.exe) && (!fs.existsSync(paths.plugin.exe)
            || (prodVersion !== '0.0.0' && cmpSemver(prodVersion, pluginVersion) > 0))) {
            const pending = path.join(path.dirname(paths.plugin.dir), 'wechat-rpa_pending');
            await fs.promises.cp(paths.prod.dir, pending, { recursive: true });
            await this.applyPendingUpdateIfExists(paths.plugin.dir);
        }
        // 4. Plugin (always prefer plugin path after potential copy)
        if (fs.existsSync(paths.plugin.exe)) {
            console.log(`[WeChatRPASkill] Found plugin service.exe`);
            cmd = paths.plugin.exe;
            cwd = path.dirname(cmd);
            args = ['--no-ui', '--channel-id', channelId];
        }
        // 5. Prod fallback removed: We MUST NOT run service.exe directly from Program Files
        // due to read-only permission issues causing the RPA service to timeout.
        // If we reach here and plugin.exe is missing, it means the copy above failed.
        else if (isProd && fs.existsSync(paths.prod.exe)) {
            console.error(`[WeChatRPASkill] CRITICAL ERROR: Plugin service.exe not found at ${paths.plugin.exe} after copy attempt, and running from ${paths.prod.exe} is prohibited due to permissions. RPA service cannot start.`);
            this.setStartResult({
                success: false,
                reason: 'missing_binary',
                message: 'RPA service file is missing from the user plugin directory.',
                details: { pluginExe: paths.plugin.exe, prodExe: paths.prod.exe }
            });
            return false;
        }
        // 5. Zip fallback (Dev/Plugin)
        else {
            // Check zips
            if (fs.existsSync(paths.plugin.zip)) {
                console.log(`[WeChatRPASkill] Found plugin zip, extracting...`);
                try {
                    await execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command',
                        `Expand-Archive -Path '${paths.plugin.zip.replace(/'/g, "''")}' -DestinationPath '${paths.plugin.dir.replace(/'/g, "''")}' -Force`]);
                    if (fs.existsSync(paths.plugin.exe)) {
                        cmd = paths.plugin.exe;
                        cwd = path.dirname(cmd);
                        args = ['--no-ui', '--channel-id', channelId];
                    }
                }
                catch (e) {
                    console.error('Unzip failed:', e);
                }
            }
            else if (fs.existsSync(paths.dev.zip)) {
                console.log(`[WeChatRPASkill] Found dev zip, extracting...`);
                try {
                    await execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command',
                        `Expand-Archive -Path '${paths.dev.zip.replace(/'/g, "''")}' -DestinationPath '${paths.dev.dir.replace(/'/g, "''")}' -Force`]);
                    if (fs.existsSync(paths.dev.exe)) {
                        cmd = paths.dev.exe;
                        cwd = path.dirname(cmd);
                        args = ['--no-ui', '--channel-id', channelId];
                    }
                }
                catch (e) {
                    console.error('Unzip failed:', e);
                }
            }
        }
        if (!cmd) {
            console.warn(`[WeChatRPASkill] RPA service not found (checked plugin, prod, dev). Skipping start.`);
            this.setStartResult({
                success: false,
                reason: 'missing_binary',
                message: 'RPA service file was not found.',
                details: { pluginExe: paths.plugin.exe, devExe: paths.dev.exe }
            });
            return false;
        }
        // The online plugin zip is the source of truth for the webot frontend. Only seed it
        // from the bundled resources copy when the plugin has NO frontend at all (e.g. a legacy
        // install). Never overwrite (no mtime "newer wins"), so an online frontend update can't
        // be clobbered by a stale bundled copy on the next service start.
        if (cmd === paths.plugin.exe) {
            const pluginWebot = path.join(paths.plugin.dir, 'webot');
            const prodWebot = path.join(paths.prod.dir, 'webot');
            const pluginIndex = path.join(pluginWebot, 'dist', 'index.html');
            if (!fs.existsSync(pluginIndex) && fs.existsSync(prodWebot)) {
                console.log('[WeChatRPASkill] Plugin frontend missing, seeding from bundled resources...');
                try {
                    if (fs.existsSync(pluginWebot)) {
                        // Rename any partial webot dir to avoid EIO before reseeding
                        const tempOldWebot = pluginWebot + '_old_' + Date.now();
                        fs.renameSync(pluginWebot, tempOldWebot);
                        fs.promises.rm(tempOldWebot, { recursive: true, force: true }).catch(() => { });
                    }
                    fs.mkdirSync(pluginWebot, { recursive: true });
                    fs.cpSync(prodWebot, pluginWebot, { recursive: true });
                    console.log('[WeChatRPASkill] Webot frontend seeded successfully.');
                }
                catch (e) {
                    console.error('[WeChatRPASkill] Failed to seed webot frontend:', e);
                }
            }
        }
        // Start service
        console.log('[WeChatRPASkill] Starting RPA service...');
        if (!isProd)
            await this.cleanupOldProcesses();
        // Add a small delay to ensure OS releases file handles from killed processes
        // This prevents "DLL load failed" errors caused by race conditions in PyInstaller's temp folder
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Removed local file logging (rpa_service.log) to avoid permission issues in installation directory.
        // Logs are captured via stdout/stderr below and forwarded to the main application logger.
        try {
            console.log(`[WeChatRPASkill] Spawning RPA service`);
            // Record the token this process is being spawned with so applyAuthToken() can
            // tell whether a later token update actually requires a restart. `env` spreads
            // process.env without overriding this key, so the two values are identical;
            // we read process.env directly because it carries the typed index signature.
            this.spawnedToken = process.env.YOKO_RPA_TOKEN;
            this.process = spawn(cmd, args, {
                cwd: cwd,
                stdio: ['ignore', 'pipe', 'pipe'],
                detached: false,
                windowsHide: true,
                env: env
            });
            this.process.on('error', error => this.recordStartFailure(error));
            if (this.process.pid) {
                fs.writeFileSync(this.pidFile, this.process.pid.toString());
            }
            // Pipe to console for Main process logging
            this.process.stdout?.on('data', d => {
                const text = d.toString().trim();
                const match = text.match(/(?:端口|port)[^\d]{0,30}(\d{2,5})/i);
                if (match) {
                    const detectedPort = Number(match[1]);
                    if (detectedPort && detectedPort !== getPortFromUrl(this.apiClient.getApiUrl())) {
                        const detectedUrl = `http://127.0.0.1:${detectedPort}`;
                        console.warn(`[WeChatRPASkill] RPA reported backend port ${detectedPort}; updating API client from ${this.apiClient.getApiUrl()} to ${detectedUrl}.`);
                        this.apiClient.setApiUrl(detectedUrl);
                    }
                }
                console.log(`[RPA] ${sanitizeRpaLog(text)}`);
            });
            this.process.stderr?.on('data', d => console.error(`[RPA Error] ${sanitizeRpaLog(d.toString().trim())}`));
            // Verify the version and process lineage before publishing startup success.
            const deadline = Date.now() + 40_000;
            let checked = { state: 'waiting', reason: 'unresponsive' };
            while (Date.now() < deadline) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                checked = await this.inspectRuntime();
                if (checked.state === 'ready') {
                    console.log('[WeChatRPASkill] Verified RPA runtime:', JSON.stringify(checked));
                    this.setStartResult({ success: true, reason: 'started', message: '微信 BOT 已连接。', details: checked });
                    return true;
                }
                if (checked.reason === 'version_mismatch' || checked.reason === 'identity_mismatch')
                    break;
                if (this.process?.exitCode !== null)
                    break;
            }
            this.runtimeFailure = { ...checked, state: 'failed' };
            this.setStartResult({ success: false, reason: 'runtime_failed', message: '微信 BOT 暂时无法连接，请重新检查。', details: checked });
            return false;
        }
        catch (e) {
            console.error('[WeChatRPASkill] Failed to spawn RPA service:', e);
            this.setStartResult({
                success: false,
                reason: 'spawn_failed',
                message: 'Failed to spawn the RPA service process.',
                details: { error: e instanceof Error ? e.message : String(e) }
            });
            return false;
        }
    }
    async repairDefenderAndRestart() {
        return this.runExclusive('repair', async () => {
            const paths = this.getServicePaths();
            const elevated = await this.addDefenderExclusionsElevated(paths.plugin.dir);
            if (!elevated) {
                return this.setStartResult({
                    success: false,
                    reason: 'uac_denied',
                    message: 'Administrator approval was not completed, or Defender exclusions are restricted by policy.',
                    details: {
                        pluginDir: paths.plugin.dir,
                        tempDir: 'C:\\Users\\Public\\webot_temp',
                        port: 9922
                    }
                });
            }
            await this._stopInternal();
            await new Promise(r => setTimeout(r, 2000));
            await this._startInternal();
            return this.lastStartResult;
        });
    }
    // Public, serialized stop. Internal callers inside a locked op must use _stopInternal().
    async stop() {
        return this.runExclusive('stop', () => this._stopInternal());
    }
    async _stopInternal() {
        this.lifecycleActivity ||= 'waiting';
        this.cancelRecoveryTimer();
        if (process.platform === 'win32' && process.env.NODE_ENV === 'production') {
            await this.cleanupOldProcesses();
            return;
        }
        if (this.process) {
            const child = this.process;
            if (process.platform === 'win32' && child.pid) {
                await execFile('taskkill.exe', ['/F', '/T', '/PID', String(child.pid)]);
            }
            else {
                child.kill();
            }
            this.process = null;
        }
    }
    stopSync() {
        this.cancelRecoveryTimer();
        if (process.platform === 'win32' && this.windowsSyncCleanupComplete)
            return;
        const managedProcess = this.process;
        this.process = null;
        if (managedProcess) {
            console.log('[WeChatRPASkill] Stopping RPA service (Sync)...');
        }
        if (process.platform === 'win32' && process.env.NODE_ENV === 'production') {
            const paths = this.getServicePaths();
            const result = cleanupRpaProcessesSync(rpaCleanupRoots([paths.plugin.dir, paths.prod.dir]));
            this.windowsSyncCleanupComplete = result.success;
            console.log('[WeChatRPASkill] Synchronous RPA cleanup verification:', JSON.stringify(result));
        }
        else if (managedProcess) {
            try {
                if (process.platform === 'win32' && managedProcess.pid && managedProcess.exitCode === null) {
                    execSync(`taskkill /F /T /PID ${managedProcess.pid}`, { stdio: 'ignore', windowsHide: true, timeout: 10_000 });
                    this.windowsSyncCleanupComplete = true;
                }
                else
                    managedProcess.kill();
            }
            catch { }
        }
        if ((process.platform !== 'win32' || this.windowsSyncCleanupComplete) && fs.existsSync(this.pidFile)) {
            try {
                // Remove the ownership hint only after the synchronous tree/root/port cleanup.
                fs.unlinkSync(this.pidFile);
            }
            catch (e) { }
        }
    }
}
