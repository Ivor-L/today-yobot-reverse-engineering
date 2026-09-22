// Compiled fragment from ./src/app/modules/notification-agent/modules/process/index.ts.
// The original TypeScript and import graph are not restored.





class NotificationAgentProcess {
    run(executablePath, args) {
        return new Promise((resolve, reject)=>{
            (0,external_node_child_process_namespaceObject.execFile)(executablePath, [
                ...args
            ], {
                encoding: 'utf8',
                timeout: (/* inlined export .NOTIFICATION_AGENT_TIMEOUT_MS */8000)
            }, (error, stdout)=>{
                if (!error) {
                    resolve({
                        exitCode: 0,
                        stdout
                    });
                    return;
                }
                // 代理失败时先输出 JSON 再以非零退出；这不是启动失败，stdout 仍可信。
                // 只有连进程都没起来（ENOENT / EACCES，`code` 是字符串）或被超时
                // SIGTERM 掉的（带 `signal`）才当作错误。
                if (typeof error.code !== 'number' || error.signal) {
                    reject(error);
                    return;
                }
                resolve({
                    exitCode: error.code,
                    stdout
                });
            });
        });
    }
}
NotificationAgentProcess = __decorate([
    injectable()
], NotificationAgentProcess);
