/**
 * read_manual 「未找到」结果的判定标记。
 *
 * 为什么要单独抽一个常量：反馈上报里的 `read_manual_calls[].found` 是靠匹配工具返回文本
 * 得出的（渲染进程拿不到 agent 子进程的内部状态，只有工具结果字符串）。
 * 如果判定串写死在两处，改文案时漏改一处不会报错——只会让所有调用都被记成 found=true，
 * 于是「文档缺口」这个最有价值的信号永久消失且无人察觉。
 *
 * 本文件刻意不 import 任何东西：渲染进程要用它，不能把 node 的 fs 拖进浏览器包。
 */
export const MANUAL_NOT_FOUND_MARKER = 'Error: Document topic';
/** 工具名形如 `wechat_rpa_read_manual` */
export const READ_MANUAL_TOOL_SUFFIX = '_read_manual';
export function isReadManualTool(toolName) {
    return !!toolName && toolName.endsWith(READ_MANUAL_TOOL_SUFFIX);
}
/** 从工具名反推技能名：`wechat_rpa_read_manual` → `wechat_rpa` */
export function skillFromReadManualTool(toolName) {
    return toolName.slice(0, -READ_MANUAL_TOOL_SUFFIX.length);
}
export function isManualNotFound(result) {
    return typeof result === 'string' && result.startsWith(MANUAL_NOT_FOUND_MARKER);
}
