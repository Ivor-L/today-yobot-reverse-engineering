// Compiled fragment from ../../packages/client-node-adapter/src/base/logger/index.ts.
// The original TypeScript and import graph are not restored.




class AdapterLogger {
    debug(category, message) {
        this.write('DEBUG', category, message);
    }
    info(category, message) {
        this.write('INFO', category, message);
    }
    warn(category, message) {
        this.write('WARN', category, message);
    }
    error(category, message) {
        this.write('ERROR', category, message);
    }
    write(level, category, message) {
        if (!this.enabled) {
            return;
        }
        this.sink.write(formatLogLine(level, category, message));
    }
    constructor(){
        this.sink = {
            write: (line)=>{
                process.stderr.write(line);
            }
        };
        /**
   * 单测下静音。
   *
   * 这些日志都挂在生命周期路径上（初始化、登录、注册、激活），单测会密集地
   * 反复触发它们；不静音的话 183 个用例的输出会被淹没。
   */ this.enabled = process.env['VITEST'] === undefined;
    }
}
AdapterLogger = __decorate([
    injectable()
], AdapterLogger);
