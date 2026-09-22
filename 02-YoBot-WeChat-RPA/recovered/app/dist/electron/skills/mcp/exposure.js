import { ConfigManager } from "../../core/config/manager.js";
/**
 * 外部 MCP 暴露的安全边界(P1-1)。
 *
 * 设计:MCP 网关用 MCP_EXTERNAL_PARENT 作为子会话的 parentId,生成的 sessionId 会同时含
 * `sub_`(→ subagent scope)与 `mcpext`(→ 外部会话标记)。kernel 据此对该会话施加
 * **正向白名单**:只暴露 exposedSkills 内的技能,其余(含 shell/filesystem/scheduler)一律不可见。
 *
 * 注意:本模块刻意只依赖 ConfigManager,不引入 express/SDK,以便 kernel 轻量导入。
 */
export const MCP_EXTERNAL_PARENT = "mcpext";
/**
 * 永不对外暴露的高危技能(即使被误配进 allowlist 也强制剔除,纵深防御)。
 *
 * ⚠️ 这里的字符串必须与 `Skill.name` **逐字**一致,否则该条 deny 静默失效。
 * 历史上 `task-group` / `task-subagent`(连字符)从未匹配到真实的
 * `task_group` / `task_subagent`(下划线)。两种拼写都保留,防止再次踩空。
 *
 * 为什么 task_group / task_subagent 必须禁:它们能 spawn 子会话,而子会话的
 * profile 是 `subagent`(allowedSkills=undefined,不过滤)——等于绕过白名单提权到
 * 全量技能,包括 wechat-rpa。见 `gateway/index.ts` 后台会话的 context 重建。
 */
const NEVER_EXPOSE = new Set([
    "shell",
    "filesystem",
    "scheduler",
    "session",
    "task_group",
    "task_subagent",
    // 历史拼写,留作兼容
    "task-group",
    "task-subagent",
    // 跨客户读所有子 Agent 对话记录 —— 绝不能对外或对子 agent 暴露
    "agent_records",
    // 接入外部 MCP = 引入可执行代码(stdio 即本机 RCE),绝不能对外暴露
    "mcp",
]);
/**
 * 对任意技能白名单施加高危剔除。
 *
 * 供 AgentProfile 装载期复用:profile 的 `allowedSkills` 是**声明值**,不可信任。
 * 与 `getExposedSkills()` 同源,确保"声明里写了 shell 也拿不到 shell"。
 *
 * @param extraDenied 额外禁用项。rpa 场景须传 ["wechat-rpa"] —— 否则客户发一句话
 *   就能让 bot 递归调用 RPA 给别人群发(RPA → Agent → RPA)。
 * @param exempt   **信任边界内**才可传:从 NEVER_EXPOSE 里放行的技能名。仅用于
 *   「设备主人显式开启、已知情风险」的 agentic 子 Agent(见 AgentProfile.shellAllowed)。
 *   MCP 对外网关路径**永不**传此参数——对外暴露 shell 等于给陌生人 RCE。
 */
export function sanitizeSkillAllowlist(names, extraDenied = [], exempt = []) {
    const denied = new Set([...NEVER_EXPOSE, ...extraDenied]);
    for (const e of exempt)
        denied.delete(e); // 放行优先于 NEVER_EXPOSE 与 extraDenied
    const result = new Set();
    for (const name of names) {
        if (typeof name === "string" && !denied.has(name))
            result.add(name);
    }
    return result;
}
/** 当 exposedSkills 未配置时的默认对外集合。 */
const DEFAULT_EXPOSED = ["wechat-rpa"];
export function isExternalMcpSession(sessionId) {
    return !!sessionId && sessionId.includes(MCP_EXTERNAL_PARENT);
}
/**
 * 返回当前允许对外暴露的技能名集合(正向白名单)。
 * 读 config.mcpGateway.exposedSkills,缺省回退到 DEFAULT_EXPOSED,并强制剔除 NEVER_EXPOSE。
 */
export function getExposedSkills() {
    let base = DEFAULT_EXPOSED;
    try {
        const cfg = ConfigManager.getInstance().getConfig();
        const list = cfg?.mcpGateway?.exposedSkills;
        if (Array.isArray(list) && list.length > 0)
            base = list;
    }
    catch {
        // 配置不可用时回退到默认
    }
    return base.filter((s) => typeof s === "string" && !NEVER_EXPOSE.has(s));
}
/** 给定会话 id,返回该会话应施加的 allowlist(非外部会话返回 undefined = 不过滤)。 */
export function resolveAllowedSkills(sessionId) {
    if (!isExternalMcpSession(sessionId))
        return undefined;
    return new Set(getExposedSkills());
}
