// Compiled fragment from ./src/app/platforms/_base/modules/serial-task/index.ts.
// The original TypeScript and import graph are not restored.



class DesktopPlatformSerialTask {
    async run(operation) {
        const previous = this.tail;
        let release;
        this.tail = new Promise((resolve)=>{
            release = resolve;
        });
        await previous;
        try {
            return await operation();
        } finally{
            release();
        }
    }
    constructor(){
        this.tail = Promise.resolve();
    }
}
DesktopPlatformSerialTask = __decorate([
    injectable()
], DesktopPlatformSerialTask);
