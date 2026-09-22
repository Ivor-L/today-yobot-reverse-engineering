import { execFile as execFileCallback } from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { RPA_MACOS_BUNDLE_NAME, RPA_MACOS_CONTROL_BUNDLE_ID, } from './plugin_manifest.js';
const execFileAsync = promisify(execFileCallback);
const RUNTIME_SCHEMA_VERSION = 1;
const MAX_RUNTIME_STATE_BYTES = 32 * 1024;
const CONTROL_EXECUTABLE_NAME = 'YokoWebotRpaControl';
const LOOPBACK_SECRET_KEY = 'rpa.wechat-rpa.loopback-key.current';
const MANAGED_ENVIRONMENT_KEYS = [
    'AGENT_SESSION_V2_MODE',
    'WEBOT_BACKEND_MODE',
    'WEBOT_API_KEY',
    'YOKO_API_BASE',
    'YOKO_CHANNEL_ID',
    'VITE_CHANNEL_ID',
    'YOKO_RPA_PORT',
    'YOKO_RPA_MACHINE_CODE',
    'YOKO_RPA_TOKEN',
    'YOKO_RPA_RUNTIME_ID',
    'RPA_PRIVATE_AGENT_TOKEN',
];
const RUNNING_APPLICATIONS_SCRIPT = `
ObjC.import('AppKit');
function unwrapPath(url) {
  if (!url) return null;
  return ObjC.unwrap(url.path);
}
function run(argv) {
  const bundleIdentifier = argv[0];
  const applications = $.NSRunningApplication
    .runningApplicationsWithBundleIdentifier(bundleIdentifier).js;
  return JSON.stringify(applications.map(function (application) {
    return {
      pid: Number(application.processIdentifier),
      bundle_identifier: ObjC.unwrap(application.bundleIdentifier),
      bundle_path: unwrapPath(application.bundleURL),
      executable_path: unwrapPath(application.executableURL),
      terminated: Boolean(application.terminated),
    };
  }));
}`;
// `/usr/bin/open` is itself launched with `env`, but LaunchServices does not
// forward that process environment to the application it opens. Passing
// credentials through `open --env` would expose them in process argv. Use the
// native configuration environment instead. Keep the JXA main run loop alive
// briefly so the asynchronous request leaves the short-lived launcher, then let
// the driver verify the exact Bundle ID, bundle path, executable path, PID, and
// process start token. This preserves the app's LaunchServices/TCC identity
// without putting secrets in argv, runtime.json, or logs.
const LAUNCH_APPLICATION_SCRIPT = `
ObjC.import('AppKit');
ObjC.import('Foundation');
function run(argv) {
  if (argv.length !== 2) throw new Error('invalid launch arguments');
  const configuration = $.NSWorkspaceOpenConfiguration.configuration;
  configuration.activates = false;
  configuration.addsToRecentItems = false;
  configuration.createsNewApplicationInstance = false;
  configuration.arguments = $(['--no-ui', '--channel-id', argv[1]]);
  configuration.environment = $.NSProcessInfo.processInfo.environment;
  const runLoop = $.NSRunLoop.currentRunLoop;
  $.NSWorkspace.sharedWorkspace.openApplicationAtURLConfigurationCompletionHandler(
    $.NSURL.fileURLWithPath(argv[0]),
    configuration,
    null,
  );
  runLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(1));
  return 'submitted';
}`;
export class MacOSControlDriverError extends Error {
    constructor(message) {
        super(message);
        this.name = 'MacOSControlDriverError';
    }
}
/** Main-only credential wrapper whose string/JSON representation is always redacted. */
export class MacOSControlLoopbackCredential {
    #value;
    constructor(value) {
        if (!/^[A-Za-z0-9_-]{43}$/.test(value)) {
            throw new MacOSControlDriverError('Control loopback credential 无效');
        }
        this.#value = value;
    }
    read() {
        return this.#value;
    }
    toJSON() {
        return '[REDACTED]';
    }
    toString() {
        return '[REDACTED]';
    }
}
function safeSegment(value, label) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value) || value === '.' || value === '..') {
        throw new MacOSControlDriverError(`${label} 不是安全值`);
    }
    return value;
}
function nonSecretText(value, label, maximum = 2048) {
    if (typeof value !== 'string' || value.length === 0 || value.length > maximum || /[\0\r\n]/.test(value)) {
        throw new MacOSControlDriverError(`${label} 无效`);
    }
    return value;
}
function secretText(value, label) {
    if (value === undefined)
        return undefined;
    if (typeof value !== 'string' || value.length === 0 || value.length > 16 * 1024 || /[\0\r\n]/.test(value)) {
        throw new MacOSControlDriverError(`${label} 无效`);
    }
    return value;
}
function validRuntimeId(value) {
    return typeof value === 'string'
        && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function validTimestamp(value) {
    return typeof value === 'string' && Number.isFinite(Date.parse(value));
}
function canonicalPath(value) {
    return path.resolve(value);
}
function pathsEqual(left, right) {
    return canonicalPath(left) === canonicalPath(right);
}
function validateApiBase(value) {
    if (value === undefined)
        return undefined;
    nonSecretText(value, 'apiBase', 2048);
    let parsed;
    try {
        parsed = new URL(value);
    }
    catch {
        throw new MacOSControlDriverError('apiBase 无效');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)
        || parsed.username || parsed.password || parsed.search || parsed.hash
        || (parsed.pathname !== '/' && parsed.pathname !== '')) {
        throw new MacOSControlDriverError('apiBase 必须是 HTTP(S) 根地址');
    }
    return parsed.toString().replace(/\/$/, '');
}
async function defaultExecFile(file, args, options = {}) {
    const result = await execFileAsync(file, [...args], {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024,
        timeout: 30_000,
        ...(options.env ? { env: options.env } : {}),
    });
    return { stdout: result.stdout, stderr: result.stderr };
}
async function readJson(filePath) {
    const stat = await fs.promises.lstat(filePath).catch((error) => {
        if (error.code === 'ENOENT')
            return null;
        throw error;
    });
    if (!stat)
        return null;
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size <= 0 || stat.size > MAX_RUNTIME_STATE_BYTES) {
        throw new MacOSControlDriverError('Control runtime 状态文件类型或大小无效');
    }
    try {
        const value = JSON.parse(await fs.promises.readFile(filePath, 'utf8'));
        if (!value || typeof value !== 'object' || Array.isArray(value))
            throw new Error('not an object');
        return value;
    }
    catch {
        throw new MacOSControlDriverError('Control runtime 状态不是有效 JSON');
    }
}
async function atomicWriteJson(filePath, value) {
    const temporary = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`);
    const handle = await fs.promises.open(temporary, 'wx', 0o600);
    try {
        await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
        await handle.sync();
    }
    finally {
        await handle.close();
    }
    try {
        await fs.promises.rename(temporary, filePath);
    }
    catch (error) {
        await fs.promises.rm(temporary, { force: true });
        throw error;
    }
}
function validateOwnership(value) {
    if (value.schema_version !== RUNTIME_SCHEMA_VERSION
        || !['launching', 'running', 'stopping'].includes(String(value.phase))
        || !validRuntimeId(value.runtime_id)
        || (value.pid !== null && (!Number.isSafeInteger(value.pid) || Number(value.pid) <= 0))
        || (value.process_start_token !== null
            && (typeof value.process_start_token !== 'string'
                || value.process_start_token.length === 0
                || value.process_start_token.length > 256))
        || value.bundle_identifier !== RPA_MACOS_CONTROL_BUNDLE_ID
        || typeof value.bundle_path !== 'string'
        || !path.isAbsolute(value.bundle_path)
        || typeof value.executable_path !== 'string'
        || !path.isAbsolute(value.executable_path)
        || typeof value.version !== 'string'
        || typeof value.channel_id !== 'string'
        || !Number.isSafeInteger(value.port)
        || Number(value.port) < 1
        || Number(value.port) > 65535
        || !validTimestamp(value.requested_at)
        || !validTimestamp(value.updated_at)) {
        throw new MacOSControlDriverError('Control runtime 状态字段无效');
    }
    safeSegment(value.version, 'version');
    safeSegment(value.channel_id, 'channelId');
    if (value.phase === 'launching' && (value.pid !== null || value.process_start_token !== null)) {
        throw new MacOSControlDriverError('Control launching 状态不能提前绑定 PID');
    }
    if ((value.phase === 'running' || value.phase === 'stopping')
        && (value.pid === null || value.process_start_token === null)) {
        throw new MacOSControlDriverError('Control 已绑定状态缺少进程身份');
    }
    return value;
}
function processIsAlive(pid) {
    if (!Number.isSafeInteger(pid) || pid <= 0)
        return false;
    try {
        process.kill(pid, 0);
        return true;
    }
    catch (error) {
        return error.code === 'EPERM';
    }
}
function validateLaunchRequest(request) {
    const version = safeSegment(request.version, 'version');
    const channelId = safeSegment(request.channelId, 'channelId');
    if (!Number.isSafeInteger(request.port) || request.port < 1 || request.port > 65535) {
        throw new MacOSControlDriverError('port 无效');
    }
    if (!/^[0-9A-F]{4}(?:-[0-9A-F]{4}){3}$/.test(request.machineCode)) {
        throw new MacOSControlDriverError('machineCode 无效');
    }
    return {
        version,
        channelId,
        port: request.port,
        machineCode: request.machineCode,
        rpaToken: secretText(request.rpaToken, 'rpaToken'),
        apiBase: validateApiBase(request.apiBase),
        privateAgentToken: secretText(request.privateAgentToken, 'privateAgentToken'),
    };
}
function parseLoopbackSecret(value) {
    let parsed;
    try {
        parsed = JSON.parse(value);
    }
    catch {
        throw new MacOSControlDriverError('Control loopback credential 记录损坏');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new MacOSControlDriverError('Control loopback credential 记录损坏');
    }
    const record = parsed;
    if (record.schema_version !== 1
        || !validRuntimeId(record.runtime_id)
        || typeof record.key !== 'string'
        || !/^[A-Za-z0-9_-]{43}$/.test(record.key)) {
        throw new MacOSControlDriverError('Control loopback credential 记录损坏');
    }
    return record;
}
export class MacOSControlDriver {
    pluginRoot;
    versionsRoot;
    stateRoot;
    runtimePath;
    runtimeLockPath;
    execFile;
    executableModeProbe;
    secretStore;
    now;
    randomUUID;
    randomBytes;
    sleep;
    forceStopAttempts;
    gracefulStopAttempts;
    maxPendingLaunchAgeMs;
    maxProbeAttempts;
    probeIntervalMs;
    // A persisted owner proves which process may be stopped, not that its
    // inherited private Agent token belongs to this Electron main process.
    // LaunchServices cannot re-key a running app after an Agent crash/relaunch.
    sessionOwnedRuntimeIds = new Set();
    /** Revoke the current Agent session before an auth/stop boundary. Exact persisted
     * ownership can still be stopped, but no loopback bridge may adopt old tokens. */
    revokeSessionOwnership() {
        this.sessionOwnedRuntimeIds.clear();
    }
    // The file lock protects lifecycle state from other processes. Calls made by
    // this single Electron main process must queue behind one another instead of
    // interpreting their own live PID as an external lock owner. Dashboard load
    // performs several authenticated reads concurrently, so rejecting same-process
    // contention would turn healthy loopback requests into synthetic 503s.
    runtimeOperationQueue = Promise.resolve();
    constructor(options) {
        if ((options.platform ?? process.platform) !== 'darwin') {
            throw new MacOSControlDriverError('macOS Control driver 只能在 Darwin 使用');
        }
        if (!path.isAbsolute(options.pluginRoot))
            throw new MacOSControlDriverError('pluginRoot 必须是绝对路径');
        this.pluginRoot = canonicalPath(options.pluginRoot);
        this.versionsRoot = path.join(this.pluginRoot, 'versions');
        this.stateRoot = path.join(this.pluginRoot, 'state');
        this.runtimePath = path.join(this.stateRoot, 'runtime.json');
        this.runtimeLockPath = path.join(this.stateRoot, 'runtime.lock');
        this.execFile = options.execFile ?? defaultExecFile;
        this.executableModeProbe = options.executableModeProbe
            ?? ((_filePath, stat) => (stat.mode & 0o111) !== 0);
        if (!options.secretStore
            || typeof options.secretStore.get !== 'function'
            || typeof options.secretStore.set !== 'function'
            || typeof options.secretStore.delete !== 'function') {
            throw new MacOSControlDriverError('secretStore 无效');
        }
        this.secretStore = options.secretStore;
        this.now = options.now ?? (() => new Date());
        this.randomUUID = options.randomUUID ?? (() => crypto.randomUUID());
        this.randomBytes = options.randomBytes ?? ((size) => crypto.randomBytes(size));
        this.sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
        this.forceStopAttempts = options.forceStopAttempts ?? 20;
        this.gracefulStopAttempts = options.gracefulStopAttempts ?? 40;
        this.maxPendingLaunchAgeMs = options.maxPendingLaunchAgeMs ?? 120_000;
        this.maxProbeAttempts = options.maxProbeAttempts ?? 40;
        this.probeIntervalMs = options.probeIntervalMs ?? 250;
        if (!Number.isSafeInteger(this.maxProbeAttempts) || this.maxProbeAttempts < 1 || this.maxProbeAttempts > 240) {
            throw new MacOSControlDriverError('maxProbeAttempts 无效');
        }
        for (const [label, attempts] of [
            ['gracefulStopAttempts', this.gracefulStopAttempts],
            ['forceStopAttempts', this.forceStopAttempts],
        ]) {
            if (!Number.isSafeInteger(attempts) || attempts < 1 || attempts > 240) {
                throw new MacOSControlDriverError(`${label} 无效`);
            }
        }
        if (!Number.isSafeInteger(this.probeIntervalMs) || this.probeIntervalMs < 0 || this.probeIntervalMs > 5_000) {
            throw new MacOSControlDriverError('probeIntervalMs 无效');
        }
        if (!Number.isSafeInteger(this.maxPendingLaunchAgeMs)
            || this.maxPendingLaunchAgeMs < 1_000
            || this.maxPendingLaunchAgeMs > 10 * 60_000) {
            throw new MacOSControlDriverError('maxPendingLaunchAgeMs 无效');
        }
    }
    bundlePath(version) {
        return path.join(this.versionsRoot, safeSegment(version, 'version'), RPA_MACOS_BUNDLE_NAME);
    }
    executablePath(version) {
        return path.join(this.bundlePath(version), 'Contents', 'MacOS', CONTROL_EXECUTABLE_NAME);
    }
    async requireManagedBundle(version) {
        for (const directory of [this.pluginRoot, this.versionsRoot, this.stateRoot, path.join(this.versionsRoot, version)]) {
            const stat = await fs.promises.lstat(directory).catch(() => null);
            if (!stat?.isDirectory() || stat.isSymbolicLink()) {
                throw new MacOSControlDriverError('Control 受管版本仓库目录无效');
            }
        }
        const bundlePath = this.bundlePath(version);
        const executablePath = this.executablePath(version);
        const bundleStat = await fs.promises.lstat(bundlePath).catch(() => null);
        const executableStat = await fs.promises.lstat(executablePath).catch(() => null);
        if (!bundleStat?.isDirectory() || bundleStat.isSymbolicLink()
            || !executableStat?.isFile() || executableStat.isSymbolicLink()
            || !await this.executableModeProbe(executablePath, executableStat)) {
            throw new MacOSControlDriverError('待启动 Control 不是受管可执行 App Bundle');
        }
        return { bundlePath, executablePath };
    }
    withRuntimeLock(operation) {
        const result = this.runtimeOperationQueue.then(() => this.withCrossProcessRuntimeLock(operation), () => this.withCrossProcessRuntimeLock(operation));
        this.runtimeOperationQueue = result.then(() => undefined, () => undefined);
        return result;
    }
    async withCrossProcessRuntimeLock(operation) {
        const token = crypto.randomUUID();
        for (let attempt = 0; attempt < 4; attempt += 1) {
            let acquired = false;
            try {
                const handle = await fs.promises.open(this.runtimeLockPath, 'wx', 0o600);
                try {
                    await handle.writeFile(`${JSON.stringify({
                        pid: process.pid,
                        token,
                        created_at: this.now().toISOString(),
                    })}\n`);
                    await handle.sync();
                }
                finally {
                    await handle.close();
                }
                acquired = true;
            }
            catch (error) {
                if (error.code !== 'EEXIST')
                    throw error;
                const lock = await readJson(this.runtimeLockPath);
                const pid = Number(lock?.pid);
                if (!lock || !validRuntimeId(lock.token) || !validTimestamp(lock.created_at)) {
                    throw new MacOSControlDriverError('Control runtime 锁损坏，拒绝自动删除');
                }
                if (processIsAlive(pid))
                    throw new MacOSControlDriverError('另一个 Control 生命周期操作仍在运行');
                const stale = `${this.runtimeLockPath}.stale.${crypto.randomUUID()}`;
                try {
                    await fs.promises.rename(this.runtimeLockPath, stale);
                    await fs.promises.rm(stale, { force: true });
                }
                catch (renameError) {
                    if (renameError.code !== 'ENOENT')
                        throw renameError;
                }
            }
            if (acquired) {
                try {
                    return await operation();
                }
                finally {
                    const lock = await readJson(this.runtimeLockPath).catch(() => null);
                    if (lock?.token === token)
                        await fs.promises.rm(this.runtimeLockPath, { force: true });
                }
            }
        }
        throw new MacOSControlDriverError('无法取得 Control runtime 锁');
    }
    async readOwnership() {
        const value = await readJson(this.runtimePath);
        if (!value)
            return null;
        const ownership = validateOwnership(value);
        const expectedBundle = this.bundlePath(ownership.version);
        const expectedExecutable = this.executablePath(ownership.version);
        if (!pathsEqual(ownership.bundle_path, expectedBundle)
            || !pathsEqual(ownership.executable_path, expectedExecutable)) {
            throw new MacOSControlDriverError('Control runtime 状态逃离受管版本目录');
        }
        return ownership;
    }
    async readLoopbackCredential(runtimeId) {
        const encoded = await this.secretStore.get(LOOPBACK_SECRET_KEY);
        if (encoded === null)
            throw new MacOSControlDriverError('Control loopback credential 缺失');
        const record = parseLoopbackSecret(encoded);
        if (record.runtime_id !== runtimeId) {
            throw new MacOSControlDriverError('Control loopback credential owner 不匹配');
        }
        return new MacOSControlLoopbackCredential(record.key);
    }
    async createLoopbackCredential(runtimeId) {
        const bytes = this.randomBytes(32);
        if (!Buffer.isBuffer(bytes) || bytes.length !== 32) {
            throw new MacOSControlDriverError('Control loopback credential 生成器无效');
        }
        const credential = new MacOSControlLoopbackCredential(bytes.toString('base64url'));
        const encoded = JSON.stringify({
            schema_version: 1,
            runtime_id: runtimeId,
            key: credential.read(),
        });
        await this.secretStore.set(LOOPBACK_SECRET_KEY, encoded);
        const confirmed = await this.secretStore.get(LOOPBACK_SECRET_KEY);
        if (confirmed !== encoded)
            throw new MacOSControlDriverError('Control loopback credential 持久化确认失败');
        return credential;
    }
    async deleteLoopbackCredential(runtimeId) {
        const encoded = await this.secretStore.get(LOOPBACK_SECRET_KEY);
        if (encoded === null)
            return;
        const record = parseLoopbackSecret(encoded);
        if (record.runtime_id !== runtimeId) {
            throw new MacOSControlDriverError('Control loopback credential owner 已变化，拒绝删除');
        }
        await this.secretStore.delete(LOOPBACK_SECRET_KEY);
    }
    async probeRunningApplications() {
        let raw;
        try {
            const result = await this.execFile('/usr/bin/osascript', [
                '-l',
                'JavaScript',
                '-e',
                RUNNING_APPLICATIONS_SCRIPT,
                RPA_MACOS_CONTROL_BUNDLE_ID,
            ]);
            raw = JSON.parse(result.stdout);
        }
        catch {
            throw new MacOSControlDriverError('无法查询 Control 的 LaunchServices 状态');
        }
        if (!Array.isArray(raw) || raw.length > 16) {
            throw new MacOSControlDriverError('Control LaunchServices 查询结果无效');
        }
        const applications = [];
        for (const item of raw) {
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
                throw new MacOSControlDriverError('Control LaunchServices 进程字段无效');
            }
            const record = item;
            if (record.terminated === true)
                continue;
            if (!Number.isSafeInteger(record.pid) || Number(record.pid) <= 0
                || record.bundle_identifier !== RPA_MACOS_CONTROL_BUNDLE_ID
                || typeof record.bundle_path !== 'string' || !path.isAbsolute(record.bundle_path)
                || typeof record.executable_path !== 'string' || !path.isAbsolute(record.executable_path)) {
                throw new MacOSControlDriverError('Control LaunchServices 进程字段无效');
            }
            let startToken;
            try {
                const start = await this.execFile('/bin/ps', [
                    '-p',
                    String(record.pid),
                    '-o',
                    'lstart=',
                ]);
                startToken = start.stdout.trim();
            }
            catch {
                if (!processIsAlive(Number(record.pid)))
                    continue;
                throw new MacOSControlDriverError('无法确认 Control 进程启动身份');
            }
            if (!startToken || startToken.length > 256) {
                throw new MacOSControlDriverError('Control 进程启动身份无效');
            }
            applications.push({
                pid: Number(record.pid),
                processStartToken: startToken,
                bundleIdentifier: RPA_MACOS_CONTROL_BUNDLE_ID,
                bundlePath: canonicalPath(record.bundle_path),
                executablePath: canonicalPath(record.executable_path),
            });
        }
        return applications;
    }
    ownershipMatchesApplication(ownership, application) {
        return ownership.phase !== 'launching'
            && ownership.pid === application.pid
            && ownership.process_start_token === application.processStartToken
            && pathsEqual(ownership.bundle_path, application.bundlePath)
            && pathsEqual(ownership.executable_path, application.executablePath);
    }
    requestMatchesOwnership(request, ownership) {
        return ownership.version === request.version
            && ownership.channel_id === request.channelId
            && ownership.port === request.port;
    }
    async discover(request) {
        const validated = validateLaunchRequest(request);
        const managed = await this.requireManagedBundle(validated.version);
        const [ownership, applications] = await Promise.all([
            this.readOwnership(),
            this.probeRunningApplications(),
        ]);
        if (applications.length === 0)
            return { status: 'none', ownership, applications };
        if (applications.length !== 1)
            return { status: 'conflict', ownership, applications };
        const application = applications[0];
        if (!pathsEqual(application.bundlePath, managed.bundlePath)
            || !pathsEqual(application.executablePath, managed.executablePath)) {
            return { status: 'conflict', ownership, applications };
        }
        if (!ownership || !this.requestMatchesOwnership(validated, ownership)) {
            return { status: 'unowned', ownership, applications };
        }
        if (this.ownershipMatchesApplication(ownership, application)) {
            return {
                status: ownership.phase === 'stopping' ? 'stopping' : 'owned',
                ownership,
                applications,
            };
        }
        const pendingAge = this.now().getTime() - Date.parse(ownership.requested_at);
        if (ownership.phase === 'launching' && pendingAge >= 0 && pendingAge <= this.maxPendingLaunchAgeMs) {
            return { status: 'recoverable', ownership, applications };
        }
        return { status: 'unowned', ownership, applications };
    }
    /**
     * Prove that the exact Control owner recorded by this driver is still alive.
     *
     * Health retries use this as a fail-fast guard: a short-lived LaunchServices
     * process must not be reported as a forty-second loopback timeout. The probe
     * never adopts a process and never scans for alternate plugin versions.
     */
    async isOwnedControlRunning(ownership) {
        const validated = validateOwnership(ownership);
        if (validated.phase !== 'running')
            return false;
        if (!this.sessionOwnedRuntimeIds.has(validated.runtime_id))
            return false;
        const managed = await this.requireManagedBundle(validated.version);
        if (!pathsEqual(validated.bundle_path, managed.bundlePath)
            || !pathsEqual(validated.executable_path, managed.executablePath))
            return false;
        const applications = await this.probeRunningApplications();
        return applications.length === 1
            && this.ownershipMatchesApplication(validated, applications[0]);
    }
    launchEnvironment(request, runtimeId, loopbackCredential) {
        const environment = { ...process.env };
        for (const key of MANAGED_ENVIRONMENT_KEYS)
            delete environment[key];
        environment.WEBOT_BACKEND_MODE = '1';
        environment.WEBOT_API_KEY = loopbackCredential.read();
        environment.YOKO_CHANNEL_ID = request.channelId;
        environment.VITE_CHANNEL_ID = request.channelId;
        environment.YOKO_RPA_PORT = String(request.port);
        environment.YOKO_RPA_MACHINE_CODE = request.machineCode;
        environment.YOKO_RPA_RUNTIME_ID = runtimeId;
        const sessionV2Mode = process.env.AGENT_SESSION_V2_MODE;
        if (sessionV2Mode !== undefined) {
            if (!['disabled', 'optional', 'required'].includes(sessionV2Mode)) {
                throw new MacOSControlDriverError('AGENT_SESSION_V2_MODE 无效');
            }
            environment.AGENT_SESSION_V2_MODE = sessionV2Mode;
        }
        if (request.rpaToken !== undefined)
            environment.YOKO_RPA_TOKEN = request.rpaToken;
        if (request.apiBase !== undefined)
            environment.YOKO_API_BASE = request.apiBase;
        if (request.privateAgentToken !== undefined) {
            environment.RPA_PRIVATE_AGENT_TOKEN = request.privateAgentToken;
        }
        return environment;
    }
    runningOwnership(launching, application) {
        return {
            ...launching,
            phase: 'running',
            pid: application.pid,
            process_start_token: application.processStartToken,
            updated_at: this.now().toISOString(),
        };
    }
    async startOrAdopt(request) {
        return this.withRuntimeLock(async () => {
            const validated = validateLaunchRequest(request);
            const managed = await this.requireManagedBundle(validated.version);
            const initial = await this.discover(validated);
            if (initial.status === 'conflict') {
                throw new MacOSControlDriverError('发现同 Bundle ID 的其他路径或多个 Control，拒绝重复启动');
            }
            if (initial.status === 'unowned') {
                throw new MacOSControlDriverError('发现无法证明 runtime owner 的 Control，拒绝收养或重复启动');
            }
            if (initial.status === 'owned') {
                const ownership = initial.ownership;
                if (!this.sessionOwnedRuntimeIds.has(ownership.runtime_id)) {
                    throw new MacOSControlDriverError('Control 属于上一 Agent 进程，必须精确停止后重新启动');
                }
                return {
                    mode: 'adopted',
                    ownership,
                    credential: await this.readLoopbackCredential(ownership.runtime_id),
                };
            }
            if (initial.status === 'stopping') {
                throw new MacOSControlDriverError('Control 正在停止，拒绝并发启动');
            }
            if (initial.status === 'recoverable') {
                const pendingOwnership = initial.ownership;
                if (!this.sessionOwnedRuntimeIds.has(pendingOwnership.runtime_id)) {
                    throw new MacOSControlDriverError('Control 启动来自上一 Agent 进程，拒绝继承旧凭据');
                }
                const credential = await this.readLoopbackCredential(pendingOwnership.runtime_id);
                const running = this.runningOwnership(pendingOwnership, initial.applications[0]);
                await atomicWriteJson(this.runtimePath, running);
                return {
                    mode: 'recovered',
                    ownership: running,
                    credential,
                };
            }
            const previous = initial.ownership;
            const previousAge = previous ? this.now().getTime() - Date.parse(previous.requested_at) : Infinity;
            const reusePending = previous?.phase === 'launching'
                && this.sessionOwnedRuntimeIds.has(previous.runtime_id)
                && previousAge >= 0
                && previousAge <= this.maxPendingLaunchAgeMs
                && this.requestMatchesOwnership(validated, previous)
                && pathsEqual(previous.bundle_path, managed.bundlePath)
                && pathsEqual(previous.executable_path, managed.executablePath);
            const timestamp = this.now().toISOString();
            const launching = reusePending
                ? { ...previous, updated_at: timestamp }
                : {
                    schema_version: RUNTIME_SCHEMA_VERSION,
                    phase: 'launching',
                    runtime_id: this.randomUUID(),
                    pid: null,
                    process_start_token: null,
                    bundle_identifier: RPA_MACOS_CONTROL_BUNDLE_ID,
                    bundle_path: managed.bundlePath,
                    executable_path: managed.executablePath,
                    version: validated.version,
                    channel_id: validated.channelId,
                    port: validated.port,
                    requested_at: timestamp,
                    updated_at: timestamp,
                };
            if (!validRuntimeId(launching.runtime_id)) {
                throw new MacOSControlDriverError('runtime ID 生成器返回无效值');
            }
            const credential = reusePending
                ? await this.readLoopbackCredential(launching.runtime_id)
                : await this.createLoopbackCredential(launching.runtime_id);
            await atomicWriteJson(this.runtimePath, launching);
            this.sessionOwnedRuntimeIds.add(launching.runtime_id);
            try {
                await this.execFile('/usr/bin/osascript', [
                    '-l',
                    'JavaScript',
                    '-e',
                    LAUNCH_APPLICATION_SCRIPT,
                    '--',
                    managed.bundlePath,
                    validated.channelId,
                ], { env: this.launchEnvironment(validated, launching.runtime_id, credential) });
            }
            catch {
                throw new MacOSControlDriverError('LaunchServices 未接受 Control 启动请求');
            }
            for (let attempt = 0; attempt < this.maxProbeAttempts; attempt += 1) {
                if (attempt > 0)
                    await this.sleep(this.probeIntervalMs);
                const applications = await this.probeRunningApplications();
                if (applications.length > 1
                    || applications.some((application) => !pathsEqual(application.bundlePath, managed.bundlePath)
                        || !pathsEqual(application.executablePath, managed.executablePath))) {
                    throw new MacOSControlDriverError('Control 启动后出现同 Bundle ID 冲突');
                }
                if (applications.length === 1) {
                    const running = this.runningOwnership(launching, applications[0]);
                    await atomicWriteJson(this.runtimePath, running);
                    return { mode: 'started', ownership: running, credential };
                }
            }
            throw new MacOSControlDriverError('Control 未在 LaunchServices 等待窗口内出现');
        });
    }
    /** Resolve a currently running, exact managed owner for main-process HTTP bridging. */
    async resolveOwnedLoopback() {
        return this.withRuntimeLock(async () => {
            const ownership = await this.readOwnership();
            if (!ownership || ownership.phase !== 'running') {
                throw new MacOSControlDriverError('Control runtime owner 未运行');
            }
            if (!this.sessionOwnedRuntimeIds.has(ownership.runtime_id)) {
                throw new MacOSControlDriverError('Control 属于上一 Agent 进程，拒绝复用旧私域凭据');
            }
            const managed = await this.requireManagedBundle(ownership.version);
            if (!pathsEqual(ownership.bundle_path, managed.bundlePath)
                || !pathsEqual(ownership.executable_path, managed.executablePath)) {
                throw new MacOSControlDriverError('Control runtime owner 不属于当前托管版本');
            }
            const application = this.assertOwnedApplication(ownership, await this.probeRunningApplications(), false);
            if (!application)
                throw new MacOSControlDriverError('Control runtime owner 未运行');
            return Object.freeze({
                apiBaseUrl: `http://127.0.0.1:${ownership.port}`,
                ownership: Object.freeze({ ...ownership }),
                credential: await this.readLoopbackCredential(ownership.runtime_id),
            });
        });
    }
    assertOwnedApplication(ownership, applications, allowLaunching) {
        if (applications.length === 0)
            return null;
        if (applications.length !== 1) {
            throw new MacOSControlDriverError('发现多个同 Bundle ID Control，拒绝停止');
        }
        const application = applications[0];
        if (!pathsEqual(ownership.bundle_path, application.bundlePath)
            || !pathsEqual(ownership.executable_path, application.executablePath)) {
            throw new MacOSControlDriverError('Control 路径与 runtime owner 不匹配，拒绝停止');
        }
        if (ownership.phase === 'launching') {
            const pendingAge = this.now().getTime() - Date.parse(ownership.requested_at);
            if (!allowLaunching || pendingAge < 0 || pendingAge > this.maxPendingLaunchAgeMs) {
                throw new MacOSControlDriverError('Control launching owner 已过期，拒绝破坏性操作');
            }
            return application;
        }
        if (!this.ownershipMatchesApplication(ownership, application)) {
            throw new MacOSControlDriverError('Control PID/start token 与 runtime owner 不匹配，拒绝停止');
        }
        return application;
    }
    async waitUntilOwnedProcessGone(ownership, attempts) {
        for (let attempt = 0; attempt < attempts; attempt += 1) {
            if (attempt > 0)
                await this.sleep(this.probeIntervalMs);
            const applications = await this.probeRunningApplications();
            if (applications.length === 0)
                return true;
            this.assertOwnedApplication(ownership, applications, false);
        }
        return false;
    }
    async clearStoppedOwnership(expected) {
        const current = await this.readOwnership();
        if (!current
            || current.runtime_id !== expected.runtime_id
            || current.phase !== 'stopping'
            || current.pid !== expected.pid
            || current.process_start_token !== expected.process_start_token) {
            throw new MacOSControlDriverError('Control runtime owner 已变化，拒绝清理状态');
        }
        await this.deleteLoopbackCredential(expected.runtime_id);
        await fs.promises.rm(this.runtimePath);
        this.sessionOwnedRuntimeIds.delete(expected.runtime_id);
    }
    /** Gracefully stop only the exact persisted runtime owner, then escalate only after re-verification. */
    async stopOwnedControl() {
        const stateRoot = await fs.promises.lstat(this.stateRoot).catch((error) => {
            if (error.code === 'ENOENT')
                return null;
            throw error;
        });
        if (!stateRoot) {
            // This installation has never committed runtime ownership. Do not scan or
            // terminate a same-Bundle-ID process that could belong to another install.
            await this.secretStore.delete(LOOPBACK_SECRET_KEY);
            return { mode: 'already-stopped', ownership: null };
        }
        if (!stateRoot.isDirectory() || stateRoot.isSymbolicLink()) {
            throw new MacOSControlDriverError('Control runtime 状态目录无效');
        }
        return this.withRuntimeLock(async () => {
            let ownership = await this.readOwnership();
            let applications = await this.probeRunningApplications();
            if (!ownership) {
                if (applications.length === 0) {
                    await this.secretStore.delete(LOOPBACK_SECRET_KEY);
                    return { mode: 'already-stopped', ownership: null };
                }
                throw new MacOSControlDriverError('存在无 runtime owner 的 Control，拒绝按名称或 Bundle ID 停止');
            }
            await this.requireManagedBundle(ownership.version);
            if (ownership.phase === 'launching' && applications.length === 0) {
                for (let attempt = 1; attempt < this.maxProbeAttempts; attempt += 1) {
                    await this.sleep(this.probeIntervalMs);
                    applications = await this.probeRunningApplications();
                    if (applications.length > 0)
                        break;
                }
                if (applications.length === 0) {
                    const current = await this.readOwnership();
                    if (!current || current.runtime_id !== ownership.runtime_id || current.phase !== 'launching') {
                        throw new MacOSControlDriverError('Control launching owner 已变化，拒绝清理状态');
                    }
                    await this.deleteLoopbackCredential(ownership.runtime_id);
                    await fs.promises.rm(this.runtimePath);
                    this.sessionOwnedRuntimeIds.delete(ownership.runtime_id);
                    return { mode: 'already-stopped', ownership };
                }
            }
            const application = this.assertOwnedApplication(ownership, applications, true);
            if (!application) {
                await this.deleteLoopbackCredential(ownership.runtime_id);
                await fs.promises.rm(this.runtimePath);
                this.sessionOwnedRuntimeIds.delete(ownership.runtime_id);
                return { mode: 'already-stopped', ownership };
            }
            if (ownership.phase === 'launching')
                ownership = this.runningOwnership(ownership, application);
            const stopping = {
                ...ownership,
                phase: 'stopping',
                pid: application.pid,
                process_start_token: application.processStartToken,
                updated_at: this.now().toISOString(),
            };
            await atomicWriteJson(this.runtimePath, stopping);
            try {
                await this.execFile('/bin/kill', ['-TERM', String(application.pid)]);
            }
            catch {
                const afterFailure = await this.probeRunningApplications();
                if (afterFailure.length !== 0) {
                    this.assertOwnedApplication(stopping, afterFailure, false);
                    throw new MacOSControlDriverError('Control SIGTERM 请求失败');
                }
            }
            if (await this.waitUntilOwnedProcessGone(stopping, this.gracefulStopAttempts)) {
                await this.clearStoppedOwnership(stopping);
                return { mode: 'graceful', ownership: stopping };
            }
            // Re-query above has just proven the same PID/start/path owner is alive.
            // Pass PID as a separate argument; never use killall, pkill, shell, or name matching.
            try {
                await this.execFile('/bin/kill', ['-KILL', String(application.pid)]);
            }
            catch {
                const afterFailure = await this.probeRunningApplications();
                if (afterFailure.length !== 0) {
                    this.assertOwnedApplication(stopping, afterFailure, false);
                    throw new MacOSControlDriverError('Control SIGKILL 请求失败');
                }
            }
            if (!await this.waitUntilOwnedProcessGone(stopping, this.forceStopAttempts)) {
                throw new MacOSControlDriverError('Control 在精确强停后仍未退出');
            }
            await this.clearStoppedOwnership(stopping);
            return { mode: 'forced', ownership: stopping };
        });
    }
}
