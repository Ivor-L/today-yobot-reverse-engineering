import { buildCapabilityManifest } from "../agent/harness/capability_manifest.js";
/**
 * 根据 session id 判断当前 agent 的 scope。
 * 子 session id 由 SessionManager.createSubSession 生成,统一含 "sub_" 子串。
 */
export function inferAgentScope(sessionId) {
    if (sessionId && sessionId.includes('sub_'))
        return 'subagent';
    return 'main';
}
/** Skill 是否对当前 agentScope 可见 */
function skillVisibleTo(skill, agentScope) {
    const s = skill.scope ?? 'both';
    if (s === 'both')
        return true;
    return s === agentScope;
}
export class SkillRegistry {
    skills = new Map();
    tools = new Map();
    // tool name → skill name 的反向索引,scope 过滤时用
    toolOwner = new Map();
    /** Capture an in-memory registry generation so a failed hot reload can be rolled back. */
    snapshot() {
        return {
            skills: new Map(this.skills),
            tools: new Map(this.tools),
            toolOwner: new Map(this.toolOwner),
        };
    }
    /** Restore a previously complete generation without re-running skill lifecycle hooks. */
    restore(snapshot) {
        this.skills = new Map(snapshot.skills);
        this.tools = new Map(snapshot.tools);
        this.toolOwner = new Map(snapshot.toolOwner);
    }
    normalizeToolName(tool) {
        const originalName = tool.definition.name;
        const validNamePattern = /^[a-zA-Z0-9_-]+$/;
        if (validNamePattern.test(originalName))
            return originalName;
        console.warn(`[Warning] 检测到非法工具名称: "${originalName}". 正在尝试自动修复...`);
        let normalized = originalName
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9_-]+/g, "_")
            .replace(/^[_-]+|[_-]+$/g, "")
            .replace(/[_-]{2,}/g, "_")
            .toLowerCase();
        if (!normalized || !validNamePattern.test(normalized)) {
            let hash = 0;
            for (let i = 0; i < originalName.length; i++) {
                hash = ((hash << 5) - hash) + originalName.charCodeAt(i);
                hash |= 0;
            }
            normalized = `skill_tool_${Math.abs(hash).toString(16)}`;
        }
        console.log(`[Skills] 工具名称自动重命名: "${originalName}" -> "${normalized}"`);
        tool.definition.name = normalized;
        return normalized;
    }
    // 注册一个技能包
    async registerSkill(skill) {
        console.log(`[Skills] 正在加载技能: ${skill.name}...`);
        // Normalize first, then perform admission before onEnable or registry mutation. A rejected
        // native/dynamic skill must not get a chance to start a process or partially expose tools.
        for (const tool of skill.tools)
            this.normalizeToolName(tool);
        const admission = buildCapabilityManifest(skill.tools.map((tool) => ({ owner: skill.name, definition: tool.definition }))).fileMutationAdmission;
        if (!admission.ok) {
            const details = admission.violations.map((item) => `${item.name}:${item.code}`).join(", ");
            throw new Error(`Skill '${skill.name}' rejected by file-mutation admission: ${details}`);
        }
        // 执行初始化 (如果有)
        if (skill.onEnable) {
            await skill.onEnable();
        }
        this.skills.set(skill.name, skill);
        // 将技能里的所有工具注册到平铺的工具池中
        for (const tool of skill.tools) {
            const toolName = tool.definition.name;
            if (this.tools.has(toolName)) {
                console.warn(`[Warning] 工具名称冲突: ${toolName} (将被覆盖)`);
            }
            this.tools.set(toolName, tool);
            this.toolOwner.set(toolName, skill.name);
        }
    }
    // 注销一个技能包及其工具(动态 MCP 增删用)。onDisable 由调用方负责触发。
    // 只删 toolOwner 仍指向本技能的工具,避免误删被同名覆盖后已改属他人的工具。
    unregisterSkill(name) {
        const skill = this.skills.get(name);
        if (!skill)
            return false;
        for (const tool of skill.tools) {
            const tn = tool.definition.name;
            if (this.toolOwner.get(tn) === name) {
                this.tools.delete(tn);
                this.toolOwner.delete(tn);
            }
        }
        this.skills.delete(name);
        return true;
    }
    // 获取指定技能
    getSkill(name) {
        return this.skills.get(name);
    }
    // 工具名 → 所属技能名。任务记忆读端用它在工具执行时定位技能备忘
    // (skill_notes.ts)；找不到时返回 undefined（如动态注销后的残留调用）。
    getToolOwner(toolName) {
        if (this.toolOwner.has(toolName))
            return this.toolOwner.get(toolName);
        const lowerName = toolName.toLowerCase().trim();
        for (const [key, owner] of this.toolOwner.entries()) {
            if (key.toLowerCase() === lowerName)
                return owner;
        }
        return undefined;
    }
    // 工具自带的参数规整函数（Tool.prepareArguments），供 convertTools 挂到 pi 的校验前钩子上。
    getToolArgumentPreparer(toolName) {
        return this.tools.get(toolName)?.prepareArguments;
    }
    // 技能目录 (name + description)，供任务记忆蒸馏做教训归属白名单
    // (task_outcome_extractor.ts)：skill_id 不在目录内的教训会被丢弃。
    listSkillCatalog(agentScope = 'main') {
        const result = [];
        for (const skill of this.skills.values()) {
            if (!skillVisibleTo(skill, agentScope))
                continue;
            result.push({ name: skill.name, description: skill.description });
        }
        return result;
    }
    // 获取所有技能的 System Prompt 指令 (按 scope 过滤)
    // allowedSkills: 可选的正向白名单(技能名)。传入时只保留白名单内技能,用于对外 MCP 会话收口。
    getSkillInstructions(agentScope = 'main', allowedSkills) {
        let instructions = "";
        for (const skill of this.skills.values()) {
            if (!skillVisibleTo(skill, agentScope))
                continue;
            if (allowedSkills && !allowedSkills.has(skill.name))
                continue;
            // 优先使用 instructions，如果未定义则回退到 description
            const content = skill.instructions || skill.description;
            if (content) {
                instructions += `### Skill: ${skill.name}\n${content}\n\n`;
            }
        }
        return instructions;
    }
    // 获取所有工具定义 (给 LLM 看的菜单) - 按 scope 过滤
    // 不传 agentScope 时默认 'main',与历史行为兼容(历史代码看到所有 scope='both' 的工具)。
    // allowedSkills: 可选的正向白名单(技能名)。传入时只保留 owner 在白名单内的工具,
    // 用于对外 MCP 会话收口(默认仅 wechat-rpa,shell/filesystem 等永不外露)。
    getToolDefinitions(agentScope = 'main', allowedSkills) {
        const result = [];
        for (const [name, tool] of this.tools) {
            const ownerName = this.toolOwner.get(name);
            const owner = ownerName ? this.skills.get(ownerName) : undefined;
            if (owner && !skillVisibleTo(owner, agentScope))
                continue;
            if (allowedSkills && (!ownerName || !allowedSkills.has(ownerName)))
                continue;
            result.push({ type: "function", function: tool.definition });
        }
        return result;
    }
    /** Harness-only inventory. Unlike provider schemas, this preserves ownership and enterprise metadata. */
    getToolCapabilityDefinitions(agentScope = 'main', allowedSkills) {
        const result = [];
        for (const [name, tool] of this.tools) {
            const ownerName = this.toolOwner.get(name);
            const owner = ownerName ? this.skills.get(ownerName) : undefined;
            if (owner && !skillVisibleTo(owner, agentScope))
                continue;
            if (allowedSkills && (!ownerName || !allowedSkills.has(ownerName)))
                continue;
            result.push({ owner: ownerName || "unknown", definition: tool.definition });
        }
        return result;
    }
    // 检查工具是否存在
    has(name) {
        return this.findTool(name) !== undefined;
    }
    findTool(name) {
        if (this.tools.has(name))
            return this.tools.get(name);
        // 1. Case-insensitive check
        const lowerName = name.toLowerCase().trim();
        for (const [key, tool] of this.tools.entries()) {
            if (key.toLowerCase() === lowerName)
                return tool;
        }
        // 2. Robust check (ignore hyphens/underscores)
        // "official_image_gen" should match "official-image-gen"
        const normalize = (s) => s.toLowerCase().replace(/[-_]/g, '');
        const normalizedName = normalize(name);
        for (const [key, tool] of this.tools.entries()) {
            if (normalize(key) === normalizedName)
                return tool;
        }
        return undefined;
    }
    // 执行工具
    async execute(name, args, signal, context) {
        const tool = this.findTool(name);
        if (!tool) {
            console.error(`[SkillRegistry] Tool not found: ${name}. Available tools: ${Array.from(this.tools.keys()).join(", ")}`);
            throw new Error(`Tool not found: ${name}`);
        }
        try {
            let result = await tool.execute(args, signal, context);
            // 确保返回字符串
            if (typeof result !== "string") {
                result = JSON.stringify(result, null, 2);
            }
            // --- Auto Image Embedder ---
            // DISABLED: Embedding base64 images causes "Total tokens exceed max message tokens" error in LLM.
            // The image path is already in the text result. The Frontend should handle local file display if needed.
            /*
            // 如果结果中包含本地图片路径，尝试读取并嵌入 Base64 以便前端显示
            // 匹配常见图片扩展名，且看起来像绝对路径的字符串
            const imagePathRegex = /([a-zA-Z]:\\[^:\n\r]+\.(png|jpg|jpeg|gif|bmp))/gi;
            let match;
            const processedResult = result; // Keep original text mostly intact
      
            // 我们只处理找到的第一张图片，避免过大
            if ((match = imagePathRegex.exec(result)) !== null) {
                const imagePath = match[1];
                try {
                    if (await fs.pathExists(imagePath)) {
                        const imageBuffer = await fs.readFile(imagePath);
                        const base64Image = imageBuffer.toString('base64');
                        const ext = path.extname(imagePath).toLowerCase().replace('.', '');
                        const mimeType = ext === 'jpg' ? 'jpeg' : ext;
                        
                        // 在结果末尾追加 Markdown 图片
                        return result + `\n\n![Result Image](data:image/${mimeType};base64,${base64Image})`;
                    }
                } catch (e) {
                    console.warn(`[SkillRegistry] Failed to embed image from path: ${imagePath}`, e);
                }
            }
            */
            return result;
        }
        catch (error) {
            return `Error executing tool ${name}: ${error.message}`;
        }
    }
    // Clear all skills and tools
    clear() {
        this.skills.clear();
        this.tools.clear();
        this.toolOwner.clear();
    }
}
