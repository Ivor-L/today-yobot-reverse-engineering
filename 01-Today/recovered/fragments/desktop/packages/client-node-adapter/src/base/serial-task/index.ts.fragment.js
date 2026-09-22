// Compiled fragment from ../../packages/client-node-adapter/src/base/serial-task/index.ts.
// The original TypeScript and import graph are not restored.



class SerialTask {
    run(task) {
        const result = this.runAfter(this.tail, task);
        this.tail = this.settle(result);
        return result;
    }
    async runAfter(previous, task) {
        try {
            await previous;
        } catch  {}
        return await task();
    }
    async settle(task) {
        try {
            await task;
        } catch  {}
    }
    constructor(){
        this.tail = Promise.resolve();
    }
}
SerialTask = __decorate([
    injectable('Transient')
], SerialTask);
