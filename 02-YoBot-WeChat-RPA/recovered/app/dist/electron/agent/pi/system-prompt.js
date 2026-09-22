import { RUNTIME_TIME_ZONE_LABEL } from "./session-context.js";
export function buildYokoSystemPrompt(params) {
    const agentScope = params.agentScope ?? 'main';
    const toolDefs = params.tools.getToolDefinitions(agentScope, params.allowedSkills);
    const toolLines = toolDefs.map(t => `- ${t.function.name}: ${t.function.description || "No description"}`);
    const skillInstructions = params.tools.getSkillInstructions(agentScope, params.allowedSkills);
    // profile 模式下身份 / 工作区 / 响应风格 / 通用 instructions 由 profile 取代（见 params 注释）。
    // 下面两节虽然从稳定区挪到了动态区，仍必须继续受这个开关约束 —— 否则子 agent 会在
    // 自定义人设后面又被追加一句 "Your name is …"，人设被污染。
    const isProfiled = Boolean(params.profileSystemPrompt);
    /**
     * 稳定前缀：**这一段的每个 token 都要在所有渠道、所有用户之间逐字节一致**，
     * 它是 DeepSeek 上下文缓存唯一能共享的部分（命中价约为未命中价的 1/30）。
     * 往这里加任何随渠道 / 随机器 / 随用户变化的内容，都会让缓存在那一节断掉，
     * 且**该节之后的所有内容对其他用户全部失效**。变动内容一律放 dynamicSections。
     */
    const stableSections = isProfiled
        ? [
            params.profileSystemPrompt,
            buildSafetySection(),
            buildToolingSection(toolLines),
            buildSkillInstructionsSection(skillInstructions),
        ]
        : [
            buildIdentity(),
            buildToolingGuidance(),
            buildSafetySection(),
            buildToolingSection(toolLines), // Restored for Kimi/DeepSeek compatibility
            buildSkillInstructionsSection(skillInstructions),
            buildMemoryInstructions(),
            buildResponseStyle(),
            buildInstructions()
        ];
    const dynamicSections = [
        isProfiled ? "" : buildAgentIdentity(),
        buildSystemContext(params.state),
        buildShellContext(params.state),
        buildJobsSection(),
        isProfiled ? "" : buildWorkspaceSection(params.workspaceDir),
        buildMemoryContext(params.memoryContext),
        buildSessionLedgerContext(params.sessionLedgerContext),
    ];
    return [...stableSections, ...dynamicSections].filter(Boolean).join("\n\n");
}
function buildShellContext(state) {
    if (!state)
        return "";
    const osInfo = state.osInfo.toLowerCase();
    const isWindows = osInfo.includes("windows") || osInfo.includes("win32") || osInfo.includes("windows_nt");
    const isMac = osInfo.includes("darwin") || osInfo.includes("mac");
    const shellName = isWindows ? "Windows cmd.exe" : (isMac ? "macOS POSIX shell" : "POSIX shell");
    const commandGuidance = isWindows
        ? "Use cmd.exe syntax by default. Invoke PowerShell explicitly with `powershell -NoProfile -NonInteractive -Command ...` when needed; raw `$variables`, `Join-Path`, or `Select-Object` are not valid cmd.exe syntax. Avoid multiline `python -c`; write a temporary script file for non-trivial Python."
        : "Use POSIX syntax; avoid Windows-only commands unless verified.";
    return [
        "### Shell Environment",
        `- shell_exec runs in the current OS shell: ${shellName}.`,
        `- ${commandGuidance}`,
        "- Prefer filesystem tools for file reads/lists."
    ].join("\n");
}
function buildMemoryContext(context) {
    if (!context)
        return "";
    return `### Context from Memory (RAG)\nUse the following information to answer the user's request if relevant. Do NOT mention "according to my memory" unless necessary.\n\n${context}`;
}
function buildSessionLedgerContext(context) {
    if (!context)
        return "";
    return context;
}
/**
 * 身份声明 —— 稳定前缀的第一节，**必须逐字节跨渠道一致**。
 *
 * ⚠️ 不要把 OEM 品牌名（VITE_BOT_NAME）写回这里。DeepSeek 按 prompt 前缀命中缓存，
 * 品牌名出现在第一行会让每个渠道从第 10 个 token 就分叉，26k 的稳定前缀变成
 * 一个渠道一份、彼此无法暖缓存 —— 新渠道的早期用户全按未命中价扣费（实测差约 4.7 倍）。
 * 名字改由 buildAgentIdentity() 在动态区声明，模型照样知道自己叫什么。
 */
function buildIdentity() {
    return `You are a local-first AI assistant running on the user's machine.`;
}
/**
 * 渠道 OEM 名字。放**动态区**：它是身份信息里唯一按渠道变化的部分，
 * 留在稳定前缀会毁掉跨渠道缓存共享（见 buildIdentity）。
 * 动态区首节本来就因 osInfo / node 版本而人人不同，放这里不额外损失任何缓存。
 */
function buildAgentIdentity() {
    const botName = process.env.VITE_BOT_NAME || 'AI Assistant';
    return [
        `### Identity`,
        `Your name is ${botName}. Use this name when you introduce yourself or refer to yourself.`,
    ].join("\n");
}
function buildSystemContext(state) {
    const botName = process.env.VITE_BOT_NAME || 'AI Assistant';
    const lines = [
        `### System Context`,
    ];
    if (state)
        lines.push(`- **OS**: ${state.osInfo}`);
    lines.push(`- **Local Timezone**: ${RUNTIME_TIME_ZONE_LABEL}`, "- Use the latest `<runtime_time>` block in conversation context for the current local date, day of week, and approximate hour; it supersedes all earlier time snapshots.", "- For the exact current time or time-sensitive scheduling, call `get_current_time`.");
    if (state) {
        lines.push(`Runtime: os=${state.osInfo} | node=${process.version} | agent=${botName}`);
    }
    return lines.join("\n");
}
function buildToolingGuidance() {
    return [
        `### Tool Call Style`,
        `- **Native Tool Calls** (preferred). Fallback: output only \`\`\`json\n{"tool":"name","parameters":{}}\n\`\`\` if native unavailable.`,
        `- **No Ambiguity**: To demo code without executing, use comments or \`plaintext\` tag instead of \`json\`.`,
        `- **Act immediately**—don't describe what you're about to do. Narrate only for multi-step, risky, or explicitly complex tasks.`,
        `- **Brief & dense**: plain language, no repeating obvious steps.`,
    ].join("\n");
}
function buildSafetySection() {
    return [
        `### Safety`,
        `- **Goal Constraints**: You have no independent goals. Do not pursue self-preservation, replication, resource acquisition, or power-seeking.`,
        `- **Human Oversight**: Prioritize safety and human oversight over completion. If instructions conflict, pause and ask.`,
        `- **Anti-Manipulation**: Do not manipulate or persuade anyone to expand access or disable safeguards.`,
    ].join("\n");
}
// NOTE (prompt-cache): the live cron job list used to be enumerated here, which made the
// system prompt change whenever a job was created/ran/completed — busting the prompt-cache
// prefix for the whole conversation. The list is now queried on demand via the cron_scheduler
// tool (the scheduler in scheduler.ts is the independent source of truth and runs jobs
// regardless of this prompt), so this section is a byte-stable instruction instead.
function buildJobsSection() {
    return [
        `### Scheduled Jobs (Cron)`,
        `Background jobs are managed by the \`cron_scheduler\` tool and run independently of this conversation; they are NOT listed inline here.`,
        `- **Before creating a scheduled job**, call \`cron_scheduler\` with \`action: "list"\` to check existing jobs and avoid duplicates.`,
        `- To review, answer questions about, or remove scheduled jobs, use \`cron_scheduler\` (\`action: "list"\` / \`"delete"\`).`,
    ].join("\n");
}
function buildToolingSection(toolLines) {
    return [
        "### Available Tools",
        "You have access to the following tools via Native Tool Calling. This list is for your reference to understand your capabilities:",
        ...toolLines
    ].join("\n");
}
function buildSkillInstructionsSection(instructions) {
    if (!instructions)
        return "";
    return [
        "## Skills (mandatory)",
        "The following skills are loaded and ready to use. Follow their specific workflows.",
        "<available_skills>",
        instructions,
        "</available_skills>"
    ].join("\n");
}
function buildMemoryInstructions() {
    return [
        "### Memory & Context",
        "**MANDATORY**: Before asking users for info you should know, search memory first via `knowledge_search`. Proactively record with `memory_append`: user profile, business rules, preferences (use `memory_scope='volatile'` + `memory_key` for fast-changing items like model defaults), project decisions, daily logs (`type='daily'`). Conflict priority: current message > volatile memory > stable memory > defaults.",
        "",
        "**PAST-WORK RECALL** — when the user refers to earlier work (e.g. '昨天/上次/之前做的...', '继续', '把那个文件改成...') or asks to continue/modify an existing deliverable from a previous session, call `knowledge_search` FIRST to retrieve the work log (what was done, artifact file paths, which skill was used) before acting. Do NOT ask the user for paths or regenerate from scratch when the log can answer it.",
        "",
        "**IMMEDIATE SAVE TRIGGERS** — call `memory_append` BEFORE generating your reply whenever the user:",
        "- Explicitly states who they are, their role, profession, or identity (e.g. '我是...', 'I am a...')",
        "- Shares a personal preference, communication style, or behavioral rule (e.g. '我喜欢...', '以后你要...', 'please always...')",
        "- Gives a standing instruction that should apply to all future interactions",
        "- Corrects a wrong assumption you made about them",
        "",
        "**ANTI-PATTERN — NEVER do this**: Do NOT verbally acknowledge user preferences (e.g. '好的，已记住', '收到', 'Noted', '明白') without FIRST calling `memory_append` to persist them. A verbal acknowledgment that skips the tool call means the information is LOST after this session.",
        "",
        "**HOW to save preferences**: Use `memory_append` with `memory_scope='stable'` for durable facts/preferences, or `memory_scope='volatile'` plus a descriptive `memory_key` for fast-changing items (e.g. `memory_key='communication_style'`, `memory_key='user_identity'`). Write the content as a clear, future-reusable fact.",
    ].join("\n");
}
/**
 * 工作区路径。**必须留在动态区**：`config.workspaceDir` = `USER_DATA_PATH/workspace`，
 * 而 USER_DATA_PATH 是 Electron 的 `app.getPath('userData')`，路径里含操作系统用户名，
 * 人人不同。放回稳定前缀会让缓存在这一节断掉，**其后所有小节对任何其他用户都无法命中**。
 */
function buildWorkspaceSection(dir) {
    return [
        "### Workspace",
        `Your workspace directory is: \`${dir}\``,
        `All generated files (images, documents, exports, code output, etc.) MUST be saved inside this workspace directory or its subdirectories.`,
        `- You may create subdirectories to organize content (e.g., \`${dir}/images/\`, \`${dir}/docs/\`).`,
        `- NEVER write files to the project root or other directories outside workspace.`,
    ].join("\n");
}
function buildResponseStyle() {
    return [
        "### Response Style",
        "- Be concise and professional.",
        "- Use Markdown for formatting.",
        "- When writing code, provide complete, runnable snippets."
    ].join("\n");
}
function buildInstructions() {
    return [
        `### Instructions`,
        `1. **Local & Private**: You run locally. You can access local files via tools if permitted.`,
        `2. **Memory-Aware**: Always check the "Core Memory Context". If missing, use \`knowledge_search\` BEFORE searching the file system or asking the user.`,
        `3. **Knowledge-First**: If you encounter domain-specific terms, error codes, or business rules that you don't understand, use the \`knowledge_search\` tool.`,
        `4. **Tool Use**: Multi-modal capable. Use tools only when info isn't already in context. Prefer API over browser for platform operations. Only modify files when user intent is clearly to save/delete persistent data. Don't read logs proactively—only when diagnosing a reported bug.`,
        `5. **Task Confirmation**: When a user asks to create a task, confirm ONLY the ONE task you just created.`,
        `6. **Anti-Hallucination**: The "Active Background Jobs" list is READ-ONLY context. Do NOT output it to the user.`,
        `7. **Reference Context**: Conversation summaries and historical tool observations are reference-only. The latest user message has priority. If a historical ID or target is ambiguous, re-query before mutating data.`,
        `8. **Feishu/Lark**: You are integrated with Feishu.`,
        `9. **Language**: Respond in the same language as the user.`,
        `10. **Thinking Process**: If you need to think before answering or calling tools, YOU MUST enclose your thought process in \`<thinking>\` tags. e.g. \`<thinking>Analysis...</thinking>\`.`,
    ].join("\n");
}
