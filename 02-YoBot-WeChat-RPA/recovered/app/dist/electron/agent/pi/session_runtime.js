/**
 * pi 0.83 迁移：系统提示词的接管方式。
 *
 * 背景：0.83 起 `AgentSession.prompt()` 每轮都会把 `agent.state.systemPrompt`
 * 强制回写成它自己算出来的 `_baseSystemPrompt`（agent-session.ts 的
 * `before_agent_start` 分支）。也就是说旧代码里"直接给 state.systemPrompt 赋值"
 * 在新版本里会被**静默丢弃**，模型收到的是 pi 自带的 coding-agent 人设，
 * 还会把宿主机的技能清单和 AGENTS.md 一起塞进上下文。
 *
 * 官方契约是两层：
 *  - 静态：`DefaultResourceLoader({ systemPromptOverride })` 决定基线提示词；
 *  - 每轮：inline 扩展的 `before_agent_start` 钩子返回 `{ systemPrompt }`。
 *
 * YokoAgent 的提示词是每轮重算的（运行时状态 / profile / attached skill），
 * 所以真正生效的是钩子那条；`systemPromptOverride` 只作为钩子未赋值时的兜底。
 *
 * `noSkills/noContextFiles/noPromptTemplates/noThemes` 一定要开：否则 pi 会去扫
 * 宿主机的 `~/.agents/skills` 和 cwd 下的 AGENTS.md，把与本产品无关的内容
 * 追加到系统提示词里（实测会泄露技能名和绝对路径）。
 */
import { DefaultResourceLoader } from "@earendil-works/pi-coding-agent";
import * as fs from "fs";
import * as path from "path";
/**
 * 会话 → 提示词槽位。用 WeakMap 而不是 sessionId 索引，避免会话被逐出缓存后
 * 槽位还留在表里，也避免 sessionId 复用时读到上一代的提示词。
 */
const promptHolders = new WeakMap();
export function bindPromptHolder(session, holder) {
    promptHolders.set(session, holder);
}
/**
 * 设置本轮系统提示词。必须在 `session.prompt()` 之前调用。
 * 返回 false 表示这个会话没有绑定槽位（不该发生，调用方应记日志）。
 */
export function setTurnSystemPrompt(session, systemPrompt) {
    const holder = promptHolders.get(session);
    if (!holder)
        return false;
    holder.systemPrompt = systemPrompt;
    return true;
}
export function getTurnSystemPrompt(session) {
    return promptHolders.get(session)?.systemPrompt;
}
/**
 * 把槽位里的提示词直接同步到 `agent.state.systemPrompt`。
 *
 * 只有 `AgentSession.prompt()` 会触发 `before_agent_start`，从而把槽位的值
 * 交给 pi。工具结果回灌走的是底层 `agent.prompt()`，绕过了那个钩子，用的是
 * `state.systemPrompt` 里**上一轮**留下的值。
 *
 * 这在 YokoAgent 上是实打实的错误而不只是不整洁：工具清单是写进系统提示词的，
 * 而工具每轮都会按 profile / scope 重新生成（kernel 里的 latestTools）。提示词
 * 滞后一轮 = 模型看到的是上一轮的工具集。
 *
 * 所以底层路径发车前必须手动同步一次。
 */
export function syncStateSystemPrompt(session) {
    const holder = promptHolders.get(session);
    if (!holder?.systemPrompt)
        return false;
    session.agent.state.systemPrompt = holder.systemPrompt;
    return true;
}
/**
 * 接管工具循环里的系统提示词。
 *
 * `AgentSession` 在构造时装了一个 `prepareNextTurnWithContext`，它在**第 2 轮起**
 * 的每一轮都会把 context 的 systemPrompt 强制改成 `_systemPromptOverride ?? _baseSystemPrompt`
 * （agent-session 里那段 `context: { ...previousContext, systemPrompt: ..., tools: ... }`）。
 *
 * 这带来两个问题：
 *  - `_systemPromptOverride` 来自最近一次 `before_agent_start`，也就是最近一次
 *    `session.prompt()`。工具结果回灌走的是底层 `agent.prompt()`，不触发那个钩子，
 *    于是它的工具循环第 2 轮起会退回**上一轮**的提示词；
 *  - `_baseSystemPrompt` 只在初始化和工具变更时重算，同样可能是陈旧的。
 *
 * 由于工具清单是写进系统提示词的、而工具每轮按 profile/scope 重新生成，提示词滞后
 * 就等于把旧工具集告诉模型。
 *
 * pi 自己也是"包装上一个"的写法，所以在会话建好后再包一层就能拿到最终决定权。
 * 只覆盖 systemPrompt，tools / model / thinkingLevel 全部沿用 pi 的结果。
 */
export function installTurnPromptGuard(session) {
    const agent = session.agent;
    if (agent.__yokoTurnPromptGuardInstalled)
        return;
    const previous = agent.prepareNextTurnWithContext;
    agent.prepareNextTurnWithContext = async (turn, signal) => {
        const update = await previous?.(turn, signal);
        const systemPrompt = promptHolders.get(session)?.systemPrompt;
        if (!systemPrompt)
            return update;
        const baseContext = update?.context ?? turn?.context ?? {};
        return { ...(update ?? {}), context: { ...baseContext, systemPrompt } };
    };
    agent.__yokoTurnPromptGuardInstalled = true;
}
/**
 * 生产环境哨兵：判断这条系统提示词是不是 YokoAgent 自己的。
 *
 * 提示词被 pi 换掉是**静默**故障——不报错、不掉测试，只是模型突然看不见任何
 * 工具（工具描述都在提示词里），表现为"agent 变傻了"。这个函数给 streamWithAdapter
 * 做发车前的最后一道校验。
 *
 * 用 pi 自带人设的特征串做反向判定，而不是正向匹配 Yoko 的提示词：后者会随
 * profile / 人设自定义而千变万化，正向匹配必然误报。
 *
 * 注意**不能**把 `<available_skills>` 当特征：YokoAgent 自己的系统提示词
 * （system-prompt.ts 的 buildSkillsSection）也输出同名标签，用它做判据会让每一个
 * 带技能的正常请求都打印"严重：提示词被覆盖"，真事故反而淹没在噪声里。
 * 只保留 pi 内置人设独有的措辞。
 */
const PI_BUILTIN_PROMPT_MARKERS = [
    "operating inside pi",
    "a coding agent harness",
    "You are an expert coding assistant",
];
export function looksLikePiBuiltinPrompt(systemPrompt) {
    if (typeof systemPrompt !== "string" || !systemPrompt)
        return false;
    // A custom Yoko profile may legitimately contain one generic fragment such as
    // "expert coding assistant". Require the complete Pi fingerprint to avoid noisy alerts.
    return PI_BUILTIN_PROMPT_MARKERS.every((marker) => systemPrompt.includes(marker));
}
/**
 * Pi ignores non-standard `AgentToolResult.isError`. Propagate the Harness execution
 * status through Pi's supported `afterToolCall` hook so persisted ToolResultMessage.isError
 * and tool_execution_end agree with the actual adapter outcome.
 */
export function installToolResultErrorGuard(session) {
    const agent = session.agent;
    if (agent.__yokoToolResultErrorGuardInstalled)
        return;
    const previous = agent.afterToolCall;
    agent.afterToolCall = async (turn, signal) => {
        const priorResult = await previous?.(turn, signal);
        const status = priorResult?.details?.executionRecord?.status
            ?? turn?.result?.details?.executionRecord?.status;
        if (status !== "error" && status !== "aborted")
            return priorResult;
        return {
            ...(priorResult ?? {}),
            isError: true,
        };
    };
    agent.__yokoToolResultErrorGuardInstalled = true;
}
/**
 * pi 的资源目录。不能用宿主机默认的 `~/.pi/agent`：那是 pi CLI 自己的配置目录，
 * 终端用户机器上可能存在无关的 settings/扩展，读进来会影响本产品行为。
 */
function resolvePiAgentDir() {
    const baseDir = process.env.USER_DATA_PATH || process.cwd();
    const dir = path.join(baseDir, "data", "pi_agent");
    try {
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
    }
    catch {
        // 建不出来也不致命：DefaultResourceLoader 读不到就用默认值。
    }
    return dir;
}
/**
 * 建一个只服务 YokoAgent 的 ResourceLoader。
 *
 * @param holder 提示词槽位，调用方持有并逐轮更新
 * @param fallbackSystemPrompt 槽位为空时的基线（会话刚建、还没跑第一轮时用）
 */
export async function createYokoResourceLoader(holder, fallbackSystemPrompt) {
    const agentDir = resolvePiAgentDir();
    const loader = new DefaultResourceLoader({
        cwd: process.cwd(),
        agentDir,
        // 全部关掉：这些资源属于 pi CLI 的使用场景，本产品自己管技能和上下文。
        // noExtensions 只屏蔽**磁盘上发现的**外部扩展（终端用户机器上可能存在
        // 与本产品无关的 pi 扩展），不影响下面 extensionFactories 里的 inline 扩展
        // —— 两者在 DefaultResourceLoader 里是各自独立的字段。
        noExtensions: true,
        noSkills: true,
        noContextFiles: true,
        noPromptTemplates: true,
        noThemes: true,
        systemPromptOverride: () => holder.systemPrompt || fallbackSystemPrompt,
        extensionFactories: [
            {
                name: "yoko-runtime",
                factory: (pi) => {
                    // 每轮开跑前把槽位里的提示词交给 pi。返回 undefined 时
                    // pi 回落到 systemPromptOverride，不会掉进它自带的人设。
                    pi.on("before_agent_start", async () => {
                        const sp = holder.systemPrompt;
                        return sp ? { systemPrompt: sp } : undefined;
                    });
                },
            },
        ],
    });
    await loader.reload();
    return loader;
}
