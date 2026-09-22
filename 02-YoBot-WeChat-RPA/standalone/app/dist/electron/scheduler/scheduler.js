import { Cron } from 'croner';
import { v4 as uuidv4 } from 'uuid';
import { TaskStore } from './store.js';
import { SCHEDULER_TIMEZONE, isValidTimeZone } from './types.js';
import { archiveRuns, pruneArchivedRuns } from './runs_store.js';
import { validateCronOutputContract } from './outcome.js';
import { validateCronExecutionPreset } from './execution_preset.js';
export class CronRunTimeoutError extends Error {
    timeoutMs;
    constructor(timeoutMs) {
        const duration = timeoutMs >= 60_000
            ? `${Math.ceil(timeoutMs / 60_000)} 分钟`
            : timeoutMs >= 1_000
                ? `${Math.ceil(timeoutMs / 1_000)} 秒`
                : `${timeoutMs} 毫秒`;
        super(`定时任务执行超过 ${duration}，已自动终止`);
        this.timeoutMs = timeoutMs;
        this.name = 'CronRunTimeoutError';
    }
}
export class CronRunCancelledError extends Error {
    constructor(message = '定时任务已取消') {
        super(message);
        this.name = 'CronRunCancelledError';
    }
}
export class CronJobRevisionConflictError extends Error {
    jobId;
    expectedRevision;
    actualRevision;
    constructor(jobId, expectedRevision, actualRevision) {
        super(`任务已被其它会话修改（当前 revision=${actualRevision}，提交基于 ${expectedRevision}），请重新读取 job_detail 后重试`);
        this.jobId = jobId;
        this.expectedRevision = expectedRevision;
        this.actualRevision = actualRevision;
        this.name = 'CronJobRevisionConflictError';
    }
}
export const DEFAULT_RUN_TIMEOUT_MS = 60 * 60_000;
export const MAX_JOB_RUN_TIMEOUT_MS = 24 * 60 * 60_000;
const DEFAULT_ABORT_DRAIN_MS = 5_000;
function positiveMs(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
export function resolveJobRunTimeoutMs(jobTimeoutMs, schedulerDefaultMs) {
    const parsed = Number(jobTimeoutMs);
    if (!Number.isFinite(parsed) || parsed <= 0)
        return schedulerDefaultMs;
    return Math.min(parsed, MAX_JOB_RUN_TIMEOUT_MS);
}
export class Scheduler {
    store;
    jobs = new Map();
    runningJobs = new Map();
    handler = null;
    runTimeoutMs;
    abortDrainMs;
    constructor(options = {}) {
        this.store = new TaskStore();
        this.runTimeoutMs = options.runTimeoutMs
            ?? positiveMs(process.env.YOKO_CRON_RUN_TIMEOUT_MS, DEFAULT_RUN_TIMEOUT_MS);
        this.abortDrainMs = options.abortDrainMs
            ?? positiveMs(process.env.YOKO_CRON_ABORT_DRAIN_MS, DEFAULT_ABORT_DRAIN_MS);
    }
    init(handler) {
        this.handler = handler;
        console.log("[Scheduler] Initializing...");
        pruneArchivedRuns();
        this.reload();
    }
    reload() {
        // Stop all running jobs
        for (const job of this.jobs.values()) {
            job.stop();
        }
        this.jobs.clear();
        // Load from store
        const storedJobs = this.store.getAll();
        console.log(`[Scheduler] Loaded ${storedJobs.length} jobs.`);
        const now = Date.now();
        const catchUpJobs = [];
        for (const job of storedJobs) {
            if (!job.enabled)
                continue;
            // Check if one-shot job is already past
            if (job.schedule.kind === 'at') {
                // Allow a small grace period (e.g. 5 seconds) for jobs that might be just triggered
                // But generally if it's in the past and not running, we check if it ran.
                if (job.schedule.atMs <= now) {
                    // Check state.lastRunAt to see if it actually finished
                    if (!job.state.lastRunAt) {
                        // It hasn't run yet, but time passed. 
                        // Maybe server was down. We can choose to run it now or discard.
                        // Let's run it now to be safe, but we need to mark it carefully.
                        console.log(`[Scheduler] Job ${job.id} (${job.name}) is past due, running catch-up.`);
                        catchUpJobs.push(job);
                    }
                    else {
                        // It has run. Since it's 'at', we should probably not schedule it again.
                        // In fact, we should probably delete it or archive it.
                        // For now, just don't schedule.
                    }
                    continue;
                }
            }
            this.scheduleJob(job);
        }
        // 启动补跑串行执行。服务停机一段时间后可能同时积压很多一次性任务；
        // 一股脑并发会在启动瞬间打满模型 API，也会把“不稳定”放大成雪崩。
        if (catchUpJobs.length > 0) {
            void this.runCatchUps(catchUpJobs);
        }
    }
    async runCatchUps(jobs) {
        for (const job of jobs) {
            await this.executeJob(job);
        }
    }
    scheduleJob(job) {
        let pattern;
        if (job.schedule.kind === 'at') {
            pattern = new Date(job.schedule.atMs);
        }
        else {
            pattern = job.schedule.expr;
        }
        try {
            // Check if job already exists/running to prevent duplicates (though map check above handles this, double check)
            if (this.jobs.has(job.id)) {
                this.jobs.get(job.id)?.stop();
            }
            // 时区必须显式声明。此前不传 = 跟随进程本地时区,而系统提示词的 Current Time
            // Pi runtime 与 get_current_time(utility.ts)都硬编码 Asia/Shanghai——
            // 三个时间出口两个显式、一个隐式,模型无从判断 cron 的小时字段按哪个时区解释。
            // 实测后果:模型按"cron 是 UTC"的常见先验写下 `0 7 * * *` 表示 15:00,
            // 而它实际在 07:00 触发;返回值又不带时区标注,两种假设下字面完全相同,
            // 于是这个错误先验**在反馈里无法被证伪**。
            // 对 UTC+8 用户行为不变(本地即为 +8),对其他时区用户则是与产品其余部分对齐。
            //
            // ⚠️ 只对 cron 表达式生效。`at` 的 pattern 是 Date——绝对时刻,
            // 若一并交给时区解释,等于把"某个瞬间"重新按墙上时钟读一遍,平白引入偏移。
            // timezone 用展开而非可变对象:后者会让 croner 的泛型从 `context` 上推断失败
            // (变成 Cron<undefined>,存不进 Map<string, Cron<CronJob>>)。
            // 任务自带 tz 则用之(用户明确声明了所在时区),否则回落默认。
            const cron = new Cron(pattern, {
                name: job.id,
                context: job,
                protect: true, // Prevent overlapping executions
                ...(job.schedule.kind === 'cron'
                    ? { timezone: job.schedule.tz || SCHEDULER_TIMEZONE }
                    : {}),
            }, () => {
                // 必须把 Promise 返回给 Croner。protect 只有看见异步执行的生命周期，
                // 才能阻止上一轮未结束时再次进入。
                return this.executeJob(job);
                // If it's a one-time job, mark it as completed effectively by not re-scheduling
                // Croner handles 'at' (Date object) by running once.
                // We can update state here.
            });
            this.jobs.set(job.id, cron);
            // Update next run time in store for UI display
            const nextRun = cron.nextRun();
            if (nextRun) {
                const current = this.store.get(job.id);
                if (!current)
                    throw new Error(`Cannot persist nextRunAt: job ${job.id} is missing from store`);
                this.store.update(job.id, {
                    state: {
                        ...current.state,
                        nextRunAt: nextRun.getTime()
                    }
                });
            }
            console.log(`[Scheduler] Scheduled job: ${job.name} (${job.id}) next run: ${nextRun}`);
            return null;
        }
        catch (e) {
            console.error(`[Scheduler] Failed to schedule job ${job.id}:`, e);
            // A Cron object may already have been installed before persisting nextRunAt failed. Stop it
            // before recording failure, otherwise the task can execute while the durable state says it
            // was never scheduled.
            this.jobs.get(job.id)?.stop();
            this.jobs.delete(job.id);
            const current = this.store.get(job.id);
            if (current) {
                this.store.update(job.id, {
                    enabled: false,
                    state: {
                        ...current.state,
                        nextRunAt: undefined,
                        lastStatus: 'error',
                        lastError: String(e)
                    }
                });
            }
            return e instanceof Error ? e : new Error(String(e));
        }
    }
    normalizeResult(result) {
        return result ?? { status: 'ok' };
    }
    resultFromError(error, signal) {
        const reason = signal.aborted ? signal.reason : error;
        if (reason instanceof CronRunTimeoutError) {
            return { status: 'timeout', error: reason.message };
        }
        if (signal.aborted) {
            return { status: 'skipped', error: String(reason?.message || reason || '定时任务已取消') };
        }
        return { status: 'error', error: String(error?.stack || error) };
    }
    finishJob(jobId, result) {
        // handler 执行期间任务可能被删除；删除必须是终态，绝不能由旧执行把任务“写活”。
        const current = this.store.get(jobId);
        if (!current)
            return;
        const state = {
            ...current.state,
            lastRunAt: Date.now(),
            lastStatus: result.status,
            lastError: result.status === 'ok' ? undefined : result.error,
        };
        const runningCron = this.jobs.get(jobId);
        const next = runningCron?.nextRun() ?? null;
        if (current.schedule.kind === 'at') {
            runningCron?.stop();
            this.jobs.delete(jobId);
            this.store.update(jobId, {
                enabled: false,
                state: { ...state, nextRunAt: undefined },
            });
            return;
        }
        this.store.update(jobId, {
            state: { ...state, nextRunAt: next?.getTime() },
        });
    }
    async executeJob(job) {
        // 排期时的 job 是快照，可能在触发前被暂停了（croner 的定时器已 stop，
        // 但 init 的补跑分支和进行中的回调都可能拿着旧快照走到这里）。
        // 以磁盘上的当前状态为准 —— 用户点了暂停之后还跑一次，是最难解释的那种 bug。
        const current = this.store.get(job.id);
        if (!current || !current.enabled) {
            console.log(`[Scheduler] Skip disabled job: ${job.name} (${job.id})`);
            return;
        }
        // Croner 的 protect 只覆盖它自己触发的同一个定时器；启动补跑、reload、
        // 以及未来的手动重跑都可能绕过它，所以调度器还必须有自己的单飞锁。
        if (this.runningJobs.has(job.id)) {
            console.warn(`[Scheduler] Skip overlapping execution: ${job.name} (${job.id})`);
            return;
        }
        console.log(`[Scheduler] Executing job: ${job.name}`);
        const controller = new AbortController();
        const running = { controller, handlerSettled: false };
        this.runningJobs.set(job.id, running);
        const timeoutMs = resolveJobRunTimeoutMs(current.runTimeoutMs, this.runTimeoutMs);
        const context = {
            runId: uuidv4(),
            startedAt: Date.now(),
            timeoutMs,
            signal: controller.signal,
        };
        let timer;
        const handlerPromise = (async () => {
            try {
                if (!this.handler)
                    return { status: 'ok' };
                return this.normalizeResult(await this.handler(current, context));
            }
            catch (error) {
                return this.resultFromError(error, controller.signal);
            }
            finally {
                running.handlerSettled = true;
            }
        })();
        const timeoutPromise = new Promise((resolve) => {
            timer = setTimeout(() => {
                const error = new CronRunTimeoutError(timeoutMs);
                controller.abort(error);
                resolve({ status: 'timeout', error: error.message });
            }, timeoutMs);
            timer.unref?.();
        });
        try {
            let result = await Promise.race([handlerPromise, timeoutPromise]);
            if (result.status === 'timeout') {
                console.error(`[Scheduler] Job timed out: ${job.name} (${job.id})`);
                // 给下层一个短窗口处理 abort、完成 finally 和执行记录落盘；不无限等。
                let drainTimer;
                await Promise.race([
                    handlerPromise,
                    new Promise(resolve => {
                        drainTimer = setTimeout(resolve, this.abortDrainMs);
                        drainTimer.unref?.();
                    }),
                ]);
                if (drainTimer)
                    clearTimeout(drainTimer);
                // 即便 handler 在收到 abort 后错误地回了 ok，监督层的最终事实仍是 timeout。
                result = { status: 'timeout', error: result.error };
            }
            this.finishJob(job.id, result);
            if (result.status !== 'ok') {
                console.error(`[Scheduler] Job ${job.id} finished with ${result.status}: ${result.error || 'unknown error'}`);
            }
        }
        finally {
            if (timer)
                clearTimeout(timer);
            // 未响应 abort 的下层仍然持有 single-flight 槽位，直到它真的退出；否则超时后
            // 下一轮立刻叠上去，会把一个泄漏变成无限多个泄漏。
            if (running.handlerSettled) {
                if (this.runningJobs.get(job.id) === running)
                    this.runningJobs.delete(job.id);
            }
            else {
                void handlerPromise.finally(() => {
                    if (this.runningJobs.get(job.id) === running)
                        this.runningJobs.delete(job.id);
                });
            }
        }
    }
    // Public API for creating jobs
    createJob(name, schedule, payload, metadata, options = {}) {
        const contractErrors = validateCronOutputContract(options.outputContract);
        if (contractErrors.length > 0)
            throw new Error(contractErrors.join('；'));
        const presetErrors = validateCronExecutionPreset(options.executionPreset);
        if (presetErrors.length > 0)
            throw new Error(presetErrors.join('；'));
        const job = {
            id: uuidv4(),
            revision: 1,
            name,
            enabled: true,
            schedule,
            payload,
            ...(options.accountId ? { accountId: options.accountId } : {}),
            ...(options.runTimeoutMs !== undefined ? { runTimeoutMs: options.runTimeoutMs } : {}),
            ...(options.outputContract !== undefined ? { outputContract: structuredClone(options.outputContract) } : {}),
            ...(options.executionPreset !== undefined ? { executionPreset: structuredClone(options.executionPreset) } : {}),
            metadata,
            createdAt: Date.now(),
            state: {}
        };
        this.store.add(job);
        if (schedule.kind === 'at' && schedule.atMs <= Date.now()) {
            // “现在执行”的一次性任务不能交给 Croner：过去的 Date 会得到 nextRun=null，
            // 任务看似创建成功却永远不触发。直接走同一套监督执行链。
            void this.executeJob(job);
        }
        else {
            const scheduleError = this.scheduleJob(job);
            if (scheduleError) {
                // Creation did not succeed. Do not leave a disabled ghost task behind while the caller is
                // told it failed; malformed jobs loaded from old storage are still retained as disabled.
                this.store.remove(job.id);
                throw scheduleError;
            }
        }
        return job;
    }
    /**
     * 暂停 / 恢复一个任务。
     *
     * 在此之前，想让一个循环任务停下来**只能删除它** —— 而删除会连带让它的执行记录
     * 从任务列表里消失（记录本身还在磁盘上，但没有入口能按任务查了）。
     * "想停一下"和"不要了"是两件事，不该共用一个动作。
     *
     * 暂停只摘掉定时器，不碰 `data/cron_runs/` 的任何一行：历史记录完整保留，
     * 恢复后接着往同一个文件追加，时间线是连续的。
     *
     * @returns 更新后的任务；找不到返回 null。
     */
    setJobEnabled(id, enabled) {
        const job = this.store.getAll().find(j => j.id === id);
        if (!job)
            return null;
        // 已经是目标状态就直接返回，避免重复 stop/schedule 把 nextRunAt 抖来抖去。
        if (job.enabled === enabled)
            return job;
        if (!enabled) {
            // Persist first. These operations are synchronous, so no callback can interleave before the
            // following stop(); if persistence fails, the existing timer remains consistent with disk.
            this.store.update(id, {
                enabled: false,
                revision: (job.revision || 1) + 1,
                updatedAt: Date.now(),
                state: { ...job.state, nextRunAt: undefined },
            });
            this.jobs.get(id)?.stop();
            this.jobs.delete(id);
            // nextRunAt 必须一并清掉。留着的话 UI 会显示一个永远不会到来的"下次执行"，
            // 而暂停状态下那个时间点确实不会触发 —— 展示一个假承诺比不展示更糟。
            console.log(`[Scheduler] Paused job: ${job.name} (${id})`);
            return this.store.getAll().find(j => j.id === id) || null;
        }
        this.store.update(id, {
            enabled: true,
            revision: (job.revision || 1) + 1,
            updatedAt: Date.now(),
        });
        const refreshed = this.store.getAll().find(j => j.id === id);
        if (!refreshed)
            return null;
        // 一次性任务的时刻已经过去：恢复它没有意义（croner 会立刻触发或直接拒绝），
        // 保持 enabled 但不排期，由用户改时间或删除。
        if (refreshed.schedule.kind === 'at' && refreshed.schedule.atMs <= Date.now()) {
            console.warn(`[Scheduler] Job ${id} 是已过期的一次性任务，恢复后不再排期。`);
            return refreshed;
        }
        const scheduleError = this.scheduleJob(refreshed);
        if (scheduleError)
            throw scheduleError;
        console.log(`[Scheduler] Resumed job: ${refreshed.name} (${id})`);
        return this.store.getAll().find(j => j.id === id) || null;
    }
    assertRevision(job, expectedRevision) {
        if (expectedRevision === undefined)
            return;
        const actual = job.revision || 1;
        if (!Number.isInteger(expectedRevision) || actual !== expectedRevision) {
            throw new CronJobRevisionConflictError(job.id, expectedRevision, actual);
        }
    }
    setJobEnabledCas(id, enabled, expectedRevision) {
        const job = this.store.get(id);
        if (!job)
            return null;
        this.assertRevision(job, expectedRevision);
        return this.setJobEnabled(id, enabled);
    }
    /**
     * 原位更新配置：ID、执行历史和 last successful next_state 全部保留。
     * expectedRevision 是跨会话 CAS；两个会话基于同一旧详情编辑时，后提交者会明确冲突。
     */
    updateJob(id, patch, expectedRevision) {
        const current = this.store.get(id);
        if (!current)
            return null;
        this.assertRevision(current, expectedRevision);
        if (patch.name !== undefined && !String(patch.name).trim())
            throw new Error('任务名称不能为空');
        if (patch.payload !== undefined && !String(patch.payload).trim())
            throw new Error('payload 不能为空');
        if (patch.runTimeoutMs !== undefined) {
            const timeout = Number(patch.runTimeoutMs);
            if (!Number.isFinite(timeout) || timeout <= 0 || timeout > MAX_JOB_RUN_TIMEOUT_MS) {
                throw new Error('runTimeoutMs 必须在 1ms~24h 之间');
            }
        }
        if (patch.schedule) {
            const tz = patch.schedule.tz || SCHEDULER_TIMEZONE;
            if (!isValidTimeZone(tz))
                throw new Error(`无效时区：${tz}`);
            if (patch.schedule.kind === 'at') {
                if (!Number.isFinite(patch.schedule.atMs))
                    throw new Error('一次性任务时间无效');
            }
            else {
                let probe = null;
                try {
                    probe = new Cron(patch.schedule.expr, { timezone: tz });
                }
                catch {
                    throw new Error(`无效 cron 表达式：${patch.schedule.expr}`);
                }
                finally {
                    try {
                        probe?.stop();
                    }
                    catch { /* validation only */ }
                }
            }
        }
        const contractErrors = validateCronOutputContract(patch.outputContract);
        if (contractErrors.length > 0)
            throw new Error(contractErrors.join('；'));
        const presetErrors = validateCronExecutionPreset(patch.executionPreset);
        if (presetErrors.length > 0)
            throw new Error(presetErrors.join('；'));
        const updated = {
            ...current,
            ...structuredClone(patch),
            id: current.id,
            revision: (current.revision || 1) + 1,
            createdAt: current.createdAt,
            updatedAt: Date.now(),
            state: { ...current.state, nextRunAt: undefined },
        };
        this.store.update(id, updated);
        const oldCron = this.jobs.get(id);
        oldCron?.stop();
        this.jobs.delete(id);
        if (updated.enabled) {
            const scheduleError = this.scheduleJob(updated);
            if (scheduleError) {
                // 预校验之外的落盘/运行时失败：恢复旧配置与旧排期，不能留下半更新状态。
                this.store.update(id, current);
                if (current.enabled) {
                    const rollbackError = this.scheduleJob(current);
                    if (rollbackError)
                        console.error(`[Scheduler] Failed to restore job ${id} after update error:`, rollbackError);
                }
                throw scheduleError;
            }
        }
        return this.store.get(id) ? structuredClone(this.store.get(id)) : null;
    }
    deleteJob(id, expectedRevision) {
        const current = this.store.get(id);
        if (!current)
            return false;
        this.assertRevision(current, expectedRevision);
        // Persist before stopping/aborting. A failed disk delete must not silently stop a task that
        // the UI and the next process restart still see as enabled.
        this.store.remove(id);
        const cron = this.jobs.get(id);
        if (cron) {
            cron.stop();
            this.jobs.delete(id);
        }
        // Keep bounded audit history, but remove deleted jobs from global run/failure views.
        // Marking happens before abort so a late in-flight finally is archived as well.
        archiveRuns(id);
        this.runningJobs.get(id)?.controller.abort(new CronRunCancelledError('定时任务已删除'));
        return true;
    }
    listJobs() {
        // Callers must not mutate the durable in-memory snapshot without TaskStore's atomic commit.
        return this.store.getAll().map(job => structuredClone(job));
    }
}
export const scheduler = new Scheduler();
