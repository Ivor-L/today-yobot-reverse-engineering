import { sanitizeSkillAllowlist } from "../../skills/mcp/exposure.js";
/**
 * 内建 profile 定义。
 *
 * 设计哲学参考 Claude Code 的 `.claude/agents/*.md`:agent 定义是**数据**,不是代码分支。
 * 这里先用 TS 字面量承载,P3 再迁到 `agents/<name>/AGENT.md`(frontmatter + 正文即 prompt)。
 * 因此本文件的每个字段都必须能被 markdown frontmatter 表达——不要引入闭包、函数、类实例。
 *
 * ⚠️ memoryNamespace.write 语义(P2-a 的正确性核心):
 *   - `"default"` = 写入主记忆库(等价于旧代码里"不含 sub_/mcpext 的会话才抽取")
 *   - `null`      = 不抽取(等价于旧代码的 substring 拦截)
 *   迁移前 `turn_extractor.ts:191` / `task_outcome_extractor.ts:290` 用 substring 实现同一语义。
 *   把 main 的 write 设成 null 会**静默关掉主 agent 的记忆写入** —— 这是本阶段最容易踩的回归。
 */
export const MAIN_MEMORY_NAMESPACE = "default";
/** 主 agent:保持迁移前的一切行为。 */
export function mainProfile() {
    return {
        name: "main",
        version: "1",
        scope: "main",
        allowedSkills: undefined,
        memoryNamespace: { read: null, write: MAIN_MEMORY_NAMESPACE },
        sessionPolicy: "persistent",
        runtime: "inproc",
    };
}
/** task 框架的子任务会话。写端隔离在迁移前就已存在(靠 `sub_` 子串)。 */
export function subagentProfile() {
    return {
        name: "subagent",
        version: "1",
        scope: "subagent",
        allowedSkills: undefined,
        memoryNamespace: { read: null, write: null },
        sessionPolicy: "persistent",
        runtime: "inproc",
    };
}
/**
 * 定时任务执行会话。
 *
 * 与 `subagentProfile` **只差 sessionPolicy**：scope / 技能 / 记忆命名空间全部保持一致，
 * 确保这次改动只影响"要不要落盘",不顺带改任何别的行为。
 *
 * 为什么必须是 ephemeral：定时任务是**单向执行**,没有用户在对话,天然不需要多轮记忆。
 * 而此前它靠 sessionId 含 `sub_` 落到 persistent 的 subagent profile,于是每个任务
 * 攒出一条永不清空的时间线 —— 跑得越勤、上下文越长、每次越贵,最终把上下文推到
 * 十几万 token 并撞上内核压缩的坑。需要跨次连续性的任务改用**有界的显式交接状态**
 * (`<next_state>`,见 scheduler/runs_store.ts),而不是靠对话历史隐式携带:
 * 被随机截断的半截历史比没有历史更容易致幻。
 */
export function schedulerProfile() {
    return {
        name: "scheduler",
        version: "3",
        scope: "subagent",
        allowedSkills: undefined,
        memoryNamespace: { read: null, write: null },
        contextPolicy: { memoryRetrieval: false, sessionLedger: false },
        // 定时任务是回灌思考链最亏的一条链路（纯回灌占其成本 16.0%，交互会话只有 6.7%），
        // 也是唯一有机器可读质量信号的一条：checks / outcome / 轮数 / 单次积分每次运行
        // 都随 trace 上报。所以先在这里验。是否真的可裁由模型白名单决定，见
        // pi/reasoning_replay.ts。
        pruneReplayedReasoning: true,
        sessionPolicy: "ephemeral",
        runtime: "inproc",
    };
}
/** 对外 MCP 网关会话。allowedSkills 由 resolver 现算(读 config,用户改白名单要立即生效)。 */
export function mcpextProfile(allowedSkills) {
    return {
        name: "mcpext",
        version: "1",
        scope: "subagent",
        allowedSkills,
        memoryNamespace: { read: null, write: null },
        sessionPolicy: "persistent",
        runtime: "inproc",
    };
}
/**
 * RPA 回复子 agent —— 第一个"新"profile,也是 AgentProfile 抽象的第一个真实用例。
 *
 * 四条约束各自有据:
 *   - ephemeral:  一个客户一条无限长时间线,持久会话在 append-only + 30 轮滑窗下
 *                 结构性拿不到 prompt cache(设计文档 §4 反转二)。
 *   - write=null: RPA 会话里 user role 是**陌生客户**,写端会把客户的话抽成用户画像。
 *   - allowedSkills 过 sanitize 且额外禁 wechat-rpa:防 RPA → Agent → RPA 递归。
 *   - systemPrompt 替换 Yoko 身份:客服人设不该带"local-first coding assistant"的框架。
 *
 * 仅通过 `bindSessionProfile()` 显式绑定命中,不参与 substring 推断。
 */
export const RPA_REPLY_PROFILE_NAME = "rpa-reply";
/**
 * agentic 路径上所有 profile 的额外禁用项。
 *
 * `wechat-rpa`:Agent 在这条路径上只返回 segments 交给 RPA 发送,自己绝不发微信。
 * 允许它 = 客户一句话触发 RPA → Agent → RPA 递归群发。
 *
 * 注意 NEVER_EXPOSE 已覆盖 session / task_group / task_subagent —— 它们能 spawn
 * 子会话,而子会话 profile 的 allowedSkills 为 undefined(不过滤),等于白名单提权。
 */
/**
 * 子 agent 绝不可挂载的技能 = **全部内建 TS 技能**（跟随 agent 启动的高权限技能：
 * 操作电脑/文件/浏览器/小红书/装技能/写主人记忆…）。子 agent 只能挂 `skills/` 目录里
 * 用户自己安装的 SKILL.md 技能。
 *
 * 双重强制：声明层（AGENT.md `skills:`）+ 装载层（`hardenProfile`）。且 prompt 无法绕过
 * —— 工具按 hardened `allowedSkills` 发给模型，白名单外的 tool 根本不在 session 里，
 * 人设里怎么诱导都调不到。
 *
 * 新增内建技能默认应落进此列表（deny）；`verify_agentic_skills` 有漂移守卫兜底：
 * 枚举真实内建技能对象的 name，断言全部在此。
 */
export const AGENT_BUILTIN_SKILLS = [
    "browser", "filesystem", "memory", "search", "shell", "skill-store",
    "utility", "visual-understanding", "web_fetch", "xhs_publisher", "yoko_collector_bridge",
    "agent_records", "task_group", "task_subagent", "task-contract", "session", "scheduler",
    "wechat-rpa", "agent_builder", "self_profile", "request-user-input", "mcp", "expert-runtime",
];
/** 子 agent 可挂载技能数量上限（前期限制，避免过于复杂；后续按需调整）。 */
export const MAX_AGENTIC_SKILLS = 3;
/** SKILL.md 技能靠 shell 执行；开启技能模块时 shell 随之放行（唯一被豁免的内建）。 */
export const AGENTIC_SHELL_SKILL = "shell";
/**
 * agentic 技能白名单净化：剔除全部内建（不可信声明值），再截断到上限。
 * 装载器与 rpaReplyProfile 统一走这里，杜绝逻辑漂移。
 */
export function sanitizeAgenticSkills(declared) {
    const clean = sanitizeSkillAllowlist(declared, AGENT_BUILTIN_SKILLS);
    return new Set([...clean].slice(0, MAX_AGENTIC_SKILLS));
}
/**
 * 由「技能模块开关 + 用户勾选的 SKILL.md 技能」推导出授权三元组（§21）。
 *
 *  - 模块关（默认）：allowedSkills 空、全内建 deny、shell 不放行 —— 等于当前隐藏态。
 *  - 模块开：allowedSkills = {shell} ∪ ≤3 个 SKILL.md 技能；shell 从 deny 摘出并置
 *    shellAllowed=true，交由 hardenProfile 的 exempt 放行；其余内建仍全 deny。
 *
 * 单一出处：loader 与 rpaReplyProfile 都走这里，杜绝「声明里写了 filesystem 也拿不到」的漂移。
 */
export function computeAgenticSkills(skillsEnabled, declared) {
    if (!skillsEnabled) {
        return { allowedSkills: new Set(), deniedSkills: [...AGENT_BUILTIN_SKILLS], shellAllowed: false };
    }
    const picks = sanitizeAgenticSkills(declared); // 剔除全部内建(含 shell)、截断到 3
    return {
        allowedSkills: new Set([AGENTIC_SHELL_SKILL, ...picks]),
        deniedSkills: AGENT_BUILTIN_SKILLS.filter((s) => s !== AGENTIC_SHELL_SKILL),
        shellAllowed: true,
    };
}
/** 兼容旧引用名：语义即"全部内建技能"。 */
export const AGENTIC_DENIED_SKILLS = AGENT_BUILTIN_SKILLS;
export function rpaReplyProfile(overrides) {
    return {
        name: RPA_REPLY_PROFILE_NAME,
        version: overrides?.version ?? "1",
        scope: "subagent",
        allowedSkills: sanitizeAgenticSkills(overrides?.allowedSkills ?? []),
        deniedSkills: [...AGENT_BUILTIN_SKILLS], // resolveProfile 会再 harden 一次
        systemPrompt: overrides?.systemPrompt ?? DEFAULT_RPA_REPLY_PROMPT,
        model: overrides?.model,
        memoryNamespace: { read: overrides?.memoryRead ?? null, write: null },
        sessionPolicy: "ephemeral",
        runtime: "inproc",
    };
}
/**
 * 智能追答的**默认**自评提示词（§21）。做成数据、可被 AGENT.md `followUpPrompt:` 覆盖，
 * 用户嫌逻辑不合理时改文案即可，无需改代码。
 *
 * 仅当 followUp !== "never" 且 profile 有可用技能时，由 `AgenticService` 追加到 **Phase-1**
 * 的 systemPrompt 末尾（Phase-2 不加）。让模型按「现在能不能答准」自评，而非关键词/长度死规则。
 * 标记 `[[ESCALATE]]` 在净化出口（sanitize.ts）被剥掉，客户看不到。
 */
export const DEFAULT_FOLLOWUP_PROMPT = [
    "[追答判定] 如果你现在就能完整、准确地回答客户，请直接正常回复。",
    "如果这个问题需要查资料、核对数据，或需要动用你挂载的技能才能完成，请先给客户一句简短的过渡安抚"
        + "（例如“稍等，我帮你确认一下”），",
    "然后在回复的最末尾另起一行、单独输出标记 [[ESCALATE]]（客户不会看到它）。",
    "如果客户的需求能用你挂载的技能完成，即使看起来不完全属于你平时的角色范围，也不要说自己做不了——"
        + "同样先安抚、再输出这个标记去调用。",
    "能当场答全时，绝对不要输出这个标记。",
].join("\n");
/** 兼容旧引用名。追加时前置分隔符，语义等价于旧的 Phase-1 追发指令。 */
export const PHASE1_ESCALATION_INSTRUCTION = "\n\n---\n" + DEFAULT_FOLLOWUP_PROMPT;
const DEFAULT_RPA_REPLY_PROMPT = [
    "You are a customer-facing assistant replying inside a WeChat conversation.",
    "",
    "- Reply in the language the customer used.",
    "- Keep replies short and conversational, the way a person types on WeChat.",
    "- Never mention that you are an AI, a bot, or that you used any tool.",
    "- Never output markdown, code fences, bullet lists, or headings.",
    "- If you cannot help, say so plainly and briefly.",
].join("\n");
