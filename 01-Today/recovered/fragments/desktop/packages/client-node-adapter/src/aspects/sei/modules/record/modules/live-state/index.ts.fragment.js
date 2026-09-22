// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/record/modules/live-state/index.ts.
// The original TypeScript and import graph are not restored.



const LIVE_UPDATE_INTERVAL_MS = 250;
const CLOCK_INTERVAL_MS = 1000;
class RecordLiveState {
    get active() {
        return this.publish !== undefined;
    }
    start(level, publish) {
        this.stop();
        this.level = level;
        this.publish = publish;
        this.lastPublishedAt = performance.now();
        this.heartbeat = setInterval(()=>this.schedule(), CLOCK_INTERVAL_MS);
        this.heartbeat.unref();
    }
    accept(level) {
        const nextLevel = Math.round(Math.max(0, Math.min(1, level)) * 100) / 100;
        if (!this.publish || nextLevel === this.level) {
            return;
        }
        this.level = nextLevel;
        this.schedule();
    }
    stop() {
        clearTimeout(this.pending);
        clearInterval(this.heartbeat);
        this.pending = undefined;
        this.heartbeat = undefined;
        this.publish = undefined;
    }
    schedule() {
        if (!this.publish || this.pending !== undefined) {
            return;
        }
        const remaining = LIVE_UPDATE_INTERVAL_MS - (performance.now() - this.lastPublishedAt);
        if (remaining <= 0) {
            this.flush();
            return;
        }
        this.pending = setTimeout(()=>this.flush(), remaining);
        this.pending.unref();
    }
    flush() {
        this.pending = undefined;
        this.lastPublishedAt = performance.now();
        this.publish?.(this.level);
    }
    constructor(){
        this.level = 0;
        this.lastPublishedAt = 0;
    }
}
RecordLiveState = __decorate([
    injectable()
], RecordLiveState);
