/**
 * One main-process recovery lane for the owned macOS Control runtime.
 *
 * Cold start, auth refresh, wake and renderer-requested repair must not race
 * each other through the plugin service. Concurrent callers share the exact
 * same promise; a settled attempt never poisons a later explicit retry.
 */
export class MacOSPluginRuntimeRecoveryCoordinator {
    options;
    inFlight = null;
    constructor(options) {
        this.options = options;
        if (!options || typeof options.recover !== 'function' || typeof options.isQuitting !== 'function') {
            throw new Error('macOS plugin runtime recovery dependencies are invalid');
        }
    }
    request(reason) {
        if (this.inFlight)
            return this.inFlight;
        if (this.options.isQuitting())
            return Promise.resolve(null);
        const task = Promise.resolve().then(() => this.options.recover(reason));
        this.inFlight = task;
        void task.then(() => { if (this.inFlight === task)
            this.inFlight = null; }, () => { if (this.inFlight === task)
            this.inFlight = null; });
        return task;
    }
    /** Wait for the attempt observed at call time without propagating its error. */
    async waitForCurrent() {
        const task = this.inFlight;
        if (!task)
            return;
        await task.then(() => undefined, () => undefined);
    }
}
