import { AsyncLocalStorage } from 'node:async_hooks';
export const contextStorage = new AsyncLocalStorage();
/**
 * Run a function within a specific request context.
 */
export function runWithContext(context, callback) {
    return contextStorage.run(context, callback);
}
/**
 * Get the current request context.
 * Returns undefined if called outside of a context.
 */
export function getContext() {
    return contextStorage.getStore();
}
/**
 * 工具声明"我这次执行就是本轮的终局，不需要再问一次模型"。
 *
 * 只在**执行成功**的分支上调用；退回/报错时调用会剥夺模型的更正机会。
 * 首个请求获胜：同一轮里若有多个工具都想终止，保留最早那条理由，排查时看得出是谁先要求的。
 * 不在请求上下文里（普通聊天、单测直调）时返回 false，调用方据此退化为原有行为。
 */
export function requestRunTermination(toolName, reason, context = getContext()) {
    if (!context)
        return false;
    if (!context.runTermination)
        context.runTermination = { toolName, reason };
    return true;
}
/** 读取本轮是否已有工具请求终止。纯读，不清除——PiKernel 在 run 结算后还要看它。 */
export function getRunTermination(context = getContext()) {
    return context?.runTermination;
}
