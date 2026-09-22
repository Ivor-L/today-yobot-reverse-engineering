import { getContext } from "../../utils/context.js";
/**
 * agentic 路径的运行时再入守卫。
 *
 * 背景:RPA 已经作为 skill 被 Agent 调用(Agent → RPA)。P2-b 之后 RPA 又会调 Agent
 * 的 AI 服务(RPA → Agent)。若 Agent 在服务 RPA 请求的过程中再去调 wechat-rpa,
 * 就形成 RPA → Agent → RPA 的递归——最坏情况是客户发一句话触发对全部好友群发。
 *
 * 三层防御,本文件是第三层:
 *   1. `rpa-reply` profile 的正向白名单不含 wechat-rpa(配置层)
 *   2. `hardenProfile()` 对每个 profile 强制剔除 deniedSkills(装载层,防误配)
 *   3. **本守卫**:agentic 请求期间,wechat-rpa 的工具一律拒绝执行(运行时层)
 *
 * 为什么需要第三层:子会话会**重建 RequestContext**(`gateway/index.ts` 后台会话用
 * `channel:'system'` 新建 context),且其 profile 是 allowedSkills=undefined 的
 * `subagent`——白名单不被继承。前两层依赖"不能 spawn 子会话"这一前提;本层不依赖
 * 任何前提,只要 agenticRun 标记随 context 传下去就成立。
 *
 * 因此 gateway 在派生后台 context 时必须**透传 agenticRun**(见 `inheritAgenticFlag`)。
 */
export const AGENTIC_RUN_FLAG = "agenticRun";
export function isAgenticRun() {
    return getContext()?.[AGENTIC_RUN_FLAG] === true;
}
/** 派生新 context 时把 agentic 标记继承下去,避免子会话逃逸出守卫。 */
export function inheritAgenticFlag(next) {
    return isAgenticRun() ? { ...next, [AGENTIC_RUN_FLAG]: true } : next;
}
export class AgenticRecursionError extends Error {
    constructor(toolName) {
        super(`工具 ${toolName} 在 agentic 服务路径中不可用:Agent 为 RPA 生成回复时不得反向调用 RPA。` +
            `请直接返回回复文本,由 RPA 负责发送。`);
        this.name = "AgenticRecursionError";
    }
}
/** 包裹一组工具的 execute,使其在 agentic 请求期间拒绝执行。 */
export function guardToolsAgainstAgenticRecursion(tools) {
    return tools.map((tool) => {
        const toolName = tool.definition?.name ??
            tool.definition?.function?.name ??
            "unknown";
        const original = tool.execute;
        return {
            ...tool,
            execute: (...args) => {
                if (isAgenticRun())
                    throw new AgenticRecursionError(toolName);
                return original(...args);
            },
        };
    });
}
