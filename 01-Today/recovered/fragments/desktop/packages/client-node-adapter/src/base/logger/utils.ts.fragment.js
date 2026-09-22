// Compiled fragment from ../../packages/client-node-adapter/src/base/logger/utils.ts.
// The original TypeScript and import graph are not restored.

/**
 * 与 Native Host 日志逐字符一致的行格式。
 *
 * 两端都写 Electron 主进程的 stderr（Native 的 stderr 由 PlatformHostTransport
 * 转发过来），同格式意味着一次 `tail` 就能按时间顺序读完整条 Node → Native 链路。
 */ const formatLogLine = (level, category, message)=>`[${level}][${category}] ${message}\n`;
/**
 * 把错误压成一行可读摘要。
 *
 * 只取 code 与 message：`InterfaceError` 的 cause 链可能挂着响应体，
 * 而响应体里可能有 token。
 */ const describeError = (error)=>{
    if (typeof error !== 'object' || error === null) {
        return String(error);
    }
    const { code, message, name } = error;
    const label = typeof code === 'string' ? code : typeof name === 'string' ? name : 'Error';
    if (typeof message !== 'string' || message.length === 0) {
        return label;
    }
    return `${label}: ${message}`;
};
