import { isRpaBusinessDegradation } from '../../shared/rpa_recovery.js';
export { RPA_TRANSPORT_RECOVERY_REASON_CODES, isRpaBusinessDegradation, getRpaSupervisorTransition } from '../../shared/rpa_recovery.js';
/**
 * Worker 停在 starting/recovering 多久算"卡住不会自愈"。
 *
 * 阈值不是拍的，是从 Supervisor 自己的节拍推出来的（yokowebot main.py，v1.9.10）：
 *
 *   WEBOT_WORKER_STARTUP_GRACE          默认 90s   —— 宽限期内不做任何健康判定
 *   WEBOT_WATCHDOG_FAILURE_CONFIRMATIONS 默认 3
 *   WEBOT_SUPERVISOR_CHECK_INTERVAL      默认 5s
 *   → Supervisor 自己最晚 90 + 3×5 = 105s 就该动作（转 degraded 或重启 Worker）
 *
 * 所以过了 120s 还停在 starting/recovering，说明它**不会**再动了。这不是猜测，
 * 是 v1.9.10 健康循环里一个明确的死区：
 *
 *   if http_ok and heartbeat_fresh:      -> 更新为 healthy/degraded/action_required
 *   elif not in_startup_grace:
 *       liveness_failures = advance_liveness_failure_count(http_ok, heartbeat_fresh)
 *       if liveness_failures:            -> degraded，累计 3 次后重启 Worker
 *
 * `advance_liveness_failure_count` 在"两个信号只丢了一个"时**返回 0**（设计如此：
 * 任一信号新鲜就认为 Worker 还能推进，避免长任务被误杀）。于是这种半死不活的状态
 * 走进 `elif` 又被 `if liveness_failures:` 挡住——**既不更新状态，也不重启**，
 * 状态就永远停在 spawn 时设的 starting。线上有用户因此卡了 4 小时。
 *
 * 注意这三个都是环境变量，用户可以调大。判定只用于"停止让用户干等"，不会自己重启，
 * 所以偏早一点是安全的。
 */
export const WORKER_STARTING_STALL_SECONDS = 120;
/**
 * Worker 在 starting/recovering 状态待了多少秒。
 *
 * `worker_started_at` / `recovery_started_at` 是 Supervisor 侧 Python `time.time()`，
 * 秒级 epoch。旧版 Supervisor 不返回这两个字段，此时返回 `null`——**判不出来就不判**，
 * 保持原有结论，绝不凭猜测提前放弃等待或建议用户重启。
 */
export function supervisorStartingSeconds(status, nowMs = Date.now()) {
    if (!status)
        return null;
    const candidates = [status.recovery_started_at, status.worker_started_at]
        .map((v) => Number(v))
        .filter((v) => Number.isFinite(v) && v > 0);
    if (candidates.length === 0)
        return null;
    // 两个都在时取更晚的：recovery 重新拉起过 Worker 的话，要从那一刻起算。
    const startedAtSeconds = Math.max(...candidates);
    const elapsed = Math.floor(nowMs / 1000 - startedAtSeconds);
    // 时钟回拨、或字段是毫秒而非秒时会算出负数，一律当作不可判定。
    if (!Number.isFinite(elapsed) || elapsed < 0)
        return null;
    return elapsed;
}
const DEFAULT_SUPERVISOR_URL = 'http://127.0.0.1:9921';
function abortError(signal) {
    if (!signal?.aborted)
        return null;
    return signal.reason instanceof Error
        ? signal.reason
        : new Error(String(signal.reason || 'RPA readiness wait aborted'));
}
async function sleepAbortably(ms, signal) {
    const existing = abortError(signal);
    if (existing)
        throw existing;
    if (!signal) {
        await new Promise(resolve => setTimeout(resolve, ms));
        return;
    }
    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            signal.removeEventListener('abort', onAbort);
            resolve();
        }, ms);
        const onAbort = () => {
            clearTimeout(timer);
            reject(abortError(signal) || new Error('RPA readiness wait aborted'));
        };
        signal.addEventListener('abort', onAbort, { once: true });
    });
}
function unwrapStatus(payload) {
    const data = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
    if (!data || typeof data !== 'object' || typeof data.status !== 'string')
        return null;
    return data;
}
export function isRpaSupervisorTransitioning(status) {
    return status === 'starting' || status === 'recovering' || status === 'degraded' || status === 'stopping';
}
/**
 * Reason codes that mean the Worker **transport** is in trouble, as opposed to the
 * business/auto-reply layer. Closed set, taken from the Supervisor loop in yokowebot main.py:
 * `WORKER_HEALTH_INCOMPLETE` comes from the liveness branch and `WORKER_RESTARTING` is set
 * while a respawn is in flight. Everything else reaching `degraded`/`recovering` is produced
 * by the semantic classifier, which only runs inside `if http_ok and heartbeat_fresh:`.
 */
export function isRpaSupervisorTerminal(status) {
    return status === 'action_required' || status === 'failed';
}
export class RpaSupervisorClient {
    baseUrl;
    fetchImpl;
    constructor(baseUrl = DEFAULT_SUPERVISOR_URL, fetchImpl = fetch) {
        this.baseUrl = baseUrl;
        this.fetchImpl = fetchImpl;
    }
    getBaseUrl() {
        return this.baseUrl;
    }
    async request(path, init = {}, timeoutMs = 1_500) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
            return await this.fetchImpl(`${this.baseUrl}${path}`, {
                ...init,
                signal: controller.signal,
                headers: {
                    Accept: 'application/json',
                    // Contract v2 understands action_required as business readiness and has a
                    // transport-only remediation path. Old Agent builds omit this header and the
                    // new plugin returns a compatible idle transport snapshot to them.
                    'X-Yoko-RPA-Supervisor-Contract': '2',
                    ...(init.headers || {}),
                },
            });
        }
        catch {
            return null;
        }
        finally {
            clearTimeout(timeout);
        }
    }
    async getStatus(timeoutMs = 1_500) {
        const response = await this.request('/status', { method: 'GET' }, timeoutMs);
        if (!response?.ok)
            return null;
        try {
            return unwrapStatus(await response.json());
        }
        catch {
            return null;
        }
    }
    async restartWorker(timeoutMs = 2_000) {
        const response = await this.request('/restart-worker', { method: 'POST' }, timeoutMs);
        if (!response) {
            return { success: false, reachable: false, status: 0, error: 'RPA Supervisor is unreachable.' };
        }
        let data = null;
        try {
            data = await response.json();
        }
        catch { /* response body is optional */ }
        return {
            success: response.ok && data?.success !== false,
            reachable: true,
            status: response.status,
            data: data && typeof data === 'object' ? data : undefined,
            error: response.ok ? undefined : String(data?.error || data?.message || `HTTP ${response.status}`),
        };
    }
}
/**
 * Wait for the Worker transport and the Supervisor lifecycle to become stable.
 *
 * Old RPA packages have no port-9921 Supervisor. In that case this helper returns
 * `legacy_unreachable` immediately and leaves the caller's legacy lifecycle path intact.
 */
export async function waitForRpaWorkerReady(options) {
    const timeoutMs = Math.max(0, options.timeoutMs ?? 180_000);
    const stallSeconds = options.stallSeconds ?? WORKER_STARTING_STALL_SECONDS;
    const pollIntervalMs = Math.max(25, options.pollIntervalMs ?? 2_000);
    const deadline = Date.now() + timeoutMs;
    let lastStatus = null;
    let observedSupervisor = false;
    while (true) {
        const aborted = abortError(options.signal);
        if (aborted)
            throw aborted;
        const workerReady = await options.checkWorker();
        const supervisorStatus = await options.getSupervisorStatus();
        if (supervisorStatus) {
            observedSupervisor = true;
            lastStatus = supervisorStatus;
            options.onStatus?.(supervisorStatus);
        }
        if (!supervisorStatus && !observedSupervisor) {
            return {
                ready: workerReady,
                supervisorReachable: false,
                supervisorStatus: null,
                reason: workerReady ? 'ready' : 'legacy_unreachable',
            };
        }
        // Supervisor terminal states describe business readiness, not merely whether port 9922
        // responds. A logged-out WeChat Worker can still answer its health endpoint, so terminal
        // state must win over transport readiness.
        if (isRpaSupervisorTerminal(supervisorStatus?.status)) {
            return {
                ready: false,
                supervisorReachable: true,
                supervisorStatus,
                reason: 'terminal',
            };
        }
        // A Worker may bind 9922 before hot attachment and feature restoration finish.
        // Once a Supervisor has been observed, require a current stable snapshot before releasing
        // business calls. A transient 9921 timeout must not turn an earlier recovery state into ready.
        // A business degradation is a stable snapshot, not a transition: the Worker answered both
        // probes and no recovery is pending. Holding business calls until the occluded window or
        // locked session clears would just burn the full timeout on a healthy Worker.
        if (workerReady
            && supervisorStatus
            && (!isRpaSupervisorTransitioning(supervisorStatus.status) || isRpaBusinessDegradation(supervisorStatus))) {
            return {
                ready: true,
                supervisorReachable: true,
                supervisorStatus,
                reason: 'ready',
            };
        }
        // Waiting out the full timeout is pointless once the Supervisor has been parked in
        // starting/recovering past its own decision point (see WORKER_STARTING_STALL_SECONDS):
        // in that dead zone it neither updates the status nor restarts the Worker, so every
        // further poll returns the same snapshot the first one did.
        //
        // Deliberately narrower than isRpaSupervisorTransitioning(). `stopping` is a normal
        // shutdown and must never be reported as stalled.
        //
        // `degraded` is excluded for a different reason, and NOT because it self-heals — an
        // earlier version of this comment claimed it did, which was wrong. Re-read against
        // main.py: only the `unhealthy` classification counts confirmations and then restarts the
        // Worker. The `degraded` branch resets `semantic_failures = 0` every pass and never
        // escalates. It is excluded here because a business degradation is already released as
        // `ready` above, so reaching this point with `degraded` means the transport is genuinely
        // down and the liveness branch (WORKER_HEALTH_INCOMPLETE) owns the restart decision.
        if (stallSeconds > 0
            && supervisorStatus
            && (supervisorStatus.status === 'starting' || supervisorStatus.status === 'recovering')
            && (supervisorStartingSeconds(supervisorStatus) ?? -1) >= stallSeconds) {
            return {
                ready: false,
                supervisorReachable: true,
                supervisorStatus,
                reason: 'stalled',
            };
        }
        if (Date.now() >= deadline) {
            return {
                ready: false,
                supervisorReachable: observedSupervisor,
                supervisorStatus: supervisorStatus || lastStatus,
                reason: 'timeout',
            };
        }
        await sleepAbortably(Math.min(pollIntervalMs, Math.max(1, deadline - Date.now())), options.signal);
    }
}
