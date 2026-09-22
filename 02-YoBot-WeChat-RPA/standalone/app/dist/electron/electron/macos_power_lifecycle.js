/**
 * Darwin-only process driver for sleep/wake.
 *
 * It remembers only whether this Agent actually stopped an owned Control for
 * suspend.  Resume never starts a plugin that was already stopped, and auth or
 * manual-stop callers can cancel a pending recovery without introducing a new
 * business state outside the existing plugin service.
 */
export class MacOSPowerLifecycle {
    options;
    generation = 0;
    suspended = false;
    recoverAfterResume = false;
    lastSuspendResult = 'already-stopped';
    suspendTask = null;
    resumeTask = null;
    constructor(options) {
        this.options = options;
    }
    cancelRecovery() {
        this.generation += 1;
        this.recoverAfterResume = false;
    }
    suspend() {
        if (this.suspendTask)
            return this.suspendTask;
        if (this.suspended)
            return Promise.resolve(this.lastSuspendResult);
        this.suspended = true;
        const generation = ++this.generation;
        this.recoverAfterResume = false;
        const task = this.stopForSuspend(generation);
        this.suspendTask = task;
        void task.finally(() => {
            if (this.suspendTask === task)
                this.suspendTask = null;
        });
        return task;
    }
    resume() {
        if (this.resumeTask)
            return this.resumeTask;
        const generation = this.generation;
        const task = this.recoverAfterSuspend(generation);
        this.resumeTask = task;
        void task.finally(() => {
            if (this.resumeTask === task)
                this.resumeTask = null;
        });
        return task;
    }
    async stopForSuspend(generation) {
        try {
            const result = await this.options.stopOwnedRuntime();
            if (generation !== this.generation)
                return 'cancelled';
            if (!result.success) {
                this.lastSuspendResult = 'stop-failed';
                return this.lastSuspendResult;
            }
            if (!result.mode || result.mode === 'already-stopped') {
                this.lastSuspendResult = 'already-stopped';
                return this.lastSuspendResult;
            }
            this.recoverAfterResume = true;
            this.lastSuspendResult = 'stopped';
            return this.lastSuspendResult;
        }
        catch (error) {
            if (generation === this.generation)
                this.options.onError?.('suspend', error);
            if (generation !== this.generation)
                return 'cancelled';
            this.lastSuspendResult = 'stop-failed';
            return this.lastSuspendResult;
        }
    }
    async recoverAfterSuspend(generation) {
        if (this.suspendTask)
            await this.suspendTask;
        if (generation !== this.generation)
            return 'cancelled';
        this.suspended = false;
        if (!this.recoverAfterResume)
            return 'not-running-before-suspend';
        if (this.options.isQuitting()) {
            this.recoverAfterResume = false;
            return 'quitting';
        }
        // Consume the one-shot resume intent before awaiting recovery. A duplicate
        // resume event therefore shares this task instead of starting another owner.
        this.recoverAfterResume = false;
        try {
            await this.options.recoverOwnedRuntime();
            return generation === this.generation ? 'recovered' : 'cancelled';
        }
        catch (error) {
            if (generation === this.generation)
                this.options.onError?.('resume', error);
            return generation === this.generation ? 'recovery-failed' : 'cancelled';
        }
    }
}
