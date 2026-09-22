/** Observe only a Control launched by this Agent main process. No process scan or kill. */
export class MacOSControlCrashMonitor {
    options;
    ownership = null;
    timer = null;
    polling = false;
    lastAttemptAt = 0;
    attempts = 0;
    now;
    intervalMs;
    cooldownMs;
    maxAttemptsPerOwner;
    constructor(options) {
        this.options = options;
        this.now = options.now ?? Date.now;
        this.intervalMs = options.intervalMs ?? 15_000;
        this.cooldownMs = options.cooldownMs ?? 60_000;
        this.maxAttemptsPerOwner = options.maxAttemptsPerOwner ?? 3;
        if (!Number.isSafeInteger(this.intervalMs) || this.intervalMs < 1
            || !Number.isSafeInteger(this.cooldownMs) || this.cooldownMs < 0
            || !Number.isSafeInteger(this.maxAttemptsPerOwner) || this.maxAttemptsPerOwner < 1) {
            throw new Error('macOS Control crash monitor limits are invalid');
        }
    }
    observe(ownership) {
        if (ownership.phase !== 'running' || !Number.isSafeInteger(ownership.pid)) {
            throw new Error('macOS Control crash monitor requires a running owner');
        }
        const changed = this.ownership?.runtime_id !== ownership.runtime_id
            || this.ownership?.pid !== ownership.pid
            || this.ownership?.process_start_token !== ownership.process_start_token;
        this.ownership = { ...ownership };
        if (changed) {
            this.lastAttemptAt = 0;
            this.attempts = 0;
        }
        if (!this.timer) {
            this.timer = setInterval(() => { void this.pollNow(); }, this.intervalMs);
            this.timer.unref?.();
        }
    }
    clear() {
        this.ownership = null;
        this.lastAttemptAt = 0;
        this.attempts = 0;
        if (this.timer)
            clearInterval(this.timer);
        this.timer = null;
    }
    async pollNow() {
        if (this.polling || this.options.isPaused() || !this.ownership)
            return;
        const observed = this.ownership;
        this.polling = true;
        try {
            let running;
            try {
                running = await this.options.isOwnedControlRunning(observed);
            }
            catch {
                // An inspection error does not prove exit; never repair on uncertainty.
                return;
            }
            if (running || this.options.isPaused() || this.ownership?.runtime_id !== observed.runtime_id
                || this.ownership?.pid !== observed.pid
                || this.ownership?.process_start_token !== observed.process_start_token)
                return;
            const current = this.now();
            if (this.attempts >= this.maxAttemptsPerOwner
                || (this.attempts > 0 && current - this.lastAttemptAt < this.cooldownMs))
                return;
            const previousAttemptAt = this.lastAttemptAt;
            this.attempts += 1;
            this.lastAttemptAt = current;
            try {
                const result = await this.options.recoverExitedOwner(observed);
                if (result === 'deferred' && this.ownership?.runtime_id === observed.runtime_id
                    && this.ownership?.pid === observed.pid) {
                    this.attempts -= 1;
                    this.lastAttemptAt = previousAttemptAt;
                }
            }
            catch {
                // Preserve the owner for a bounded, cooled-down retry. The caller logs.
            }
        }
        finally {
            this.polling = false;
        }
    }
}
