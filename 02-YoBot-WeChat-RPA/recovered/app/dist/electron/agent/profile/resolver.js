import { inferAgentScope } from "../../skills/registry.js";
import { resolveAllowedSkills, isExternalMcpSession, sanitizeSkillAllowlist } from "../../skills/mcp/exposure.js";
import { isAgenticRun } from "./agentic_guard.js";
import { mainProfile, subagentProfile, mcpextProfile, schedulerProfile } from "./builtins.js";
import { isSchedulerSession } from "../../scheduler/types.js";
/**
 * sessionId → AgentProfile。
 *
 * P1 契约:**零行为变更**。scope 与 allowedSkills 一律委托给既有的
 * `inferAgentScope` / `resolveAllowedSkills`,而非复制它们的 substring 规则——
 * 委托而非复制,使"重构后行为漂移"在数学上不可能发生。
 *
 * 三个内建 profile 对应此前的三个隐式身份:
 *   main     — 主 agent(默认)
 *   subagent — task 框架的子任务会话(sessionId 含 `sub_`)
 *   mcpext   — 对外 MCP 网关会话(sessionId 含 `mcpext`,带正向技能白名单)
 *
 * 一个 profile 验证不了抽象;三个都能被同一组字段表达,抽象才成立。
 *
 * P2 起,显式绑定表(sessionId → profileName)优先于此处的 fallback 推断。
 */
/** 显式绑定优先于 substring 推断。P2 用于把 rpa-reply 等新 profile 挂上来。 */
const explicitBindings = new Map();
const registry = new Map();
export function bindSessionProfile(sessionId, profileName) {
    explicitBindings.set(sessionId, profileName);
}
export function unbindSessionProfile(sessionId) {
    explicitBindings.delete(sessionId);
}
export function registerProfile(name, factory) {
    registry.set(name, factory);
}
/**
 * 注销 profile。**每个 per-run 的临时 profile 都必须成对调用**,否则 registry 会随
 * 请求数无界增长(agentic 路径每个 phase 注册一次)。
 */
export function unregisterProfile(name) {
    registry.delete(name);
}
/** 诊断用:当前注册的 profile 数量。用于断言临时 profile 已被回收。 */
export function registeredProfileCount() {
    return registry.size;
}
/** 测试用:清空显式绑定与自定义 profile,回到纯内建状态。 */
export function resetProfileRegistry() {
    explicitBindings.clear();
    registry.clear();
}
/**
 * allowedSkills 每次现算,不缓存:`getExposedSkills()` 读 config,用户在
 * "对外开放"页改白名单后必须立即生效。此前 kernel 在建会话和每次 run 时
 * 各调一次 resolveAllowedSkills,行为保持一致。
 */
/**
 * 纵深防御:对**任何**来源的 profile 强制施加技能硬边界。
 *
 * 作用于 resolveProfile 的每一条返回路径,而不只是 profile 的构造函数——
 * P3 的 `agents/*.md` 装载器、P2-b 的运行时绑定、未来的配置页,都无法绕过。
 *
 * allowedSkills === undefined 表示"不过滤"(main / subagent 的合法状态),此时
 * 不注入白名单;硬边界由技能自身的 scope 与运行时守卫负责。
 */
function hardenProfile(profile) {
    if (!profile.allowedSkills)
        return profile;
    // shellAllowed 才把 shell 放行(从 NEVER_EXPOSE 豁免)。这是设备主人显式开启的本地授权,
    // 绝不用于 MCP 对外网关(其 profile 恒 shellAllowed=false)。
    const expertExemptions = profile.trustedCapabilityProjection?.source === "expert-capability-resolver"
        && profile.trustedCapabilityProjection.policyDigest.trim()
        ? profile.trustedCapabilityProjection.builtinSkillExemptions.filter((name) => name === "filesystem")
        : [];
    const exempt = profile.shellAllowed ? ["shell", ...expertExemptions] : expertExemptions;
    return {
        ...profile,
        allowedSkills: sanitizeSkillAllowlist(profile.allowedSkills, profile.deniedSkills ?? [], exempt),
    };
}
export function resolveProfile(sessionId) {
    if (sessionId) {
        const boundName = explicitBindings.get(sessionId);
        const factory = boundName ? registry.get(boundName) : undefined;
        if (factory)
            return hardenProfile(factory());
    }
    // 独立计算两个维度,而不是先归类再赋值——保证与旧代码在所有 sessionId 组合下
    // 逐位一致,包括 `mcpext` 不含 `sub_` 这类理论上不会出现的组合。
    const scope = inferAgentScope(sessionId);
    const allowedSkills = resolveAllowedSkills(sessionId);
    if (isExternalMcpSession(sessionId)) {
        return hardenProfile({ ...mcpextProfile(allowedSkills), scope });
    }
    // 必须排在 subagent 之前：定时任务的 sessionId 含 `sub_`，靠 substring 会落到
    // persistent 的 subagent profile —— 那正是"每个任务攒一条无限时间线"的成因。
    // 显式前缀优先于命名巧合。
    if (isSchedulerSession(sessionId)) {
        return schedulerProfile();
    }
    if (scope === "subagent") {
        return subagentProfile();
    }
    return mainProfile();
}
/**
 * 记忆写入是否被允许。
 *
 * 迁移前由 `turn_extractor.ts` / `task_outcome_extractor.ts` 里的
 * `sessionId.includes("sub_") || sessionId.includes("mcpext")` 实现。
 * 现在改由 profile 声明——语义等价,但 `rpa-reply` 这类新 profile 无需依赖命名巧合。
 *
 * **两道防线,因为写错的代价是不可逆的**(客户的话被抽成主人的用户画像):
 *
 * 1. profile 的 `memoryNamespace.write === null` —— 声明式,但依赖 sessionId 仍处于
 *    绑定状态。`AgenticService` 在 run 结束的 finally 里解绑,而抽取器是 fire-and-forget:
 *    只要有人把抽取器的门控挪到第一个 `await` 之后,解绑就已经发生,
 *    `resolveProfile` 会 fallback 到 substring 规则,而 `rpa__acc__sess__run` 里
 *    **不含 `sub_`**,会被判成 `main` —— 静默放行。
 *
 * 2. `isAgenticRun()` —— 与时序无关。AsyncLocalStorage 的 context 会随异步续体传播,
 *    因此哪怕门控在 await 之后才求值,只要仍在这条调用链里就会被拦住。
 */
export function isMemoryWriteAllowed(sessionId) {
    // 防线 2:agentic 服务路径下永不写记忆,与 sessionId 绑定状态无关
    if (isAgenticRun())
        return false;
    if (!sessionId)
        return false;
    return resolveProfile(sessionId).memoryNamespace.write !== null;
}
