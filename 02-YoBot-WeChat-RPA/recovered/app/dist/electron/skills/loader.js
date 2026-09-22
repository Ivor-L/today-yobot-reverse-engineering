import fs from "fs-extra";
import * as path from "path";
const OPENAI_TOOL_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
/**
 * 标准 Skill 加载器
 * 负责解析 skills/ 目录下的 OpenClaw/Anthropic 标准技能包 (SKILL.md)
 *
 * 架构模式: Lazy Loading (V1 Optimized)
 * 1. 扫描 skills/ 目录下的 SKILL.md
 * 2. 仅读取 Frontmatter (Name, Description) 到 System Prompt
 * 3. 不注入具体 Usage/Examples，而是提供文件路径
 * 4. Agent 需要使用时，主动调用 fs_read_file 读取 SKILL.md 学习用法
 *
 * Update: Auto-Wrapper
 * 为了防止模型直接“幻觉”调用技能名称（如 screen-vision），我们自动注册同名工具。
 * 该工具被调用时，直接返回 SKILL.md 内容，引导模型进入正确的 CLI 调用流程。
 */
export class StandardSkillLoader {
    skillsDir;
    constructor(skillsDir) {
        this.skillsDir = skillsDir;
    }
    /**
     * 扫描并加载所有标准技能
     */
    async loadSkills() {
        const loadedSkills = [];
        if (!await fs.pathExists(this.skillsDir)) {
            console.warn(`[SkillLoader] Skills directory not found: ${this.skillsDir}`);
            return [];
        }
        const entries = await fs.readdir(this.skillsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const skillPath = path.join(this.skillsDir, entry.name);
                const skillMdPath = path.join(skillPath, "SKILL.md");
                try {
                    // 仅处理 SKILL.md，忽略 tools.json
                    if (await fs.pathExists(skillMdPath)) {
                        const skill = await this.parseSkillMd(entry.name, skillPath, skillMdPath);
                        console.log(`[SkillLoader] Loaded skill '${skill.name}' from '${entry.name}'`);
                        loadedSkills.push(skill);
                    }
                }
                catch (err) {
                    console.error(`[SkillLoader] Failed to load skill '${entry.name}':`, err);
                }
            }
        }
        return loadedSkills;
    }
    normalizeToolName(candidate) {
        const raw = (candidate || "").trim();
        if (!raw)
            return "";
        if (OPENAI_TOOL_NAME_PATTERN.test(raw))
            return raw;
        const normalized = raw
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9_-]+/g, "_")
            .replace(/^[_-]+|[_-]+$/g, "")
            .replace(/[_-]{2,}/g, "_")
            .toLowerCase();
        if (!normalized)
            return "";
        return OPENAI_TOOL_NAME_PATTERN.test(normalized) ? normalized : "";
    }
    createStableToolNameFallback(input) {
        let hash = 2166136261;
        for (let i = 0; i < input.length; i++) {
            hash ^= input.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return `skill_${(hash >>> 0).toString(16)}`;
    }
    resolveWrapperToolName(skillName, dirName) {
        const fromSkillName = this.normalizeToolName(skillName);
        if (fromSkillName)
            return fromSkillName;
        const fromDirName = this.normalizeToolName(dirName);
        if (fromDirName)
            return fromDirName;
        return this.createStableToolNameFallback(`${skillName}|${dirName}`);
    }
    /**
     * 解析 SKILL.md (Lazy Loading Mode)
     */
    async parseSkillMd(dirName, baseDir, mdPath) {
        let content = await fs.readFile(mdPath, "utf-8");
        // Strip BOM if present
        content = content.replace(/^\uFEFF/, '');
        // Frontmatter 解析
        // Robust regex to handle both LF (\n) and CRLF (\r\n)
        const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        let name = dirName;
        let description = "Standard external skill";
        let metadata = undefined;
        if (frontmatterMatch) {
            const yamlContent = frontmatterMatch[1];
            const nameMatch = yamlContent.match(/^name:\s*(.+)$/m);
            const descMatch = yamlContent.match(/^description:\s*(.+)$/m);
            if (nameMatch)
                name = nameMatch[1].trim().replace(/^["']|["']$/g, '');
            if (descMatch)
                description = descMatch[1].trim().replace(/^["']|["']$/g, '');
            // 简单的 Metadata 解析 (Regex-based, no external yaml dependency)
            // Supports both JSON (single line) and YAML (legacy) format
            // 1. Try JSON format
            const metadataJsonMatch = yamlContent.match(/^metadata:\s*(\{.*\})$/m);
            if (metadataJsonMatch) {
                try {
                    metadata = JSON.parse(metadataJsonMatch[1]);
                }
                catch (e) {
                    // ignore invalid json
                }
            }
            // 2. Fallback to YAML format
            if (!metadata) {
                const metadataMatch = yamlContent.match(/^metadata:\s*\n([\s\S]*?)(?=\n\w+:|\n$)/m);
                if (metadataMatch) {
                    const metadataBlock = metadataMatch[1];
                    // `skill` 是中性命名空间；`yobot` 是存量技能的旧写法，保留兜底。
                    const nsMatch = metadataBlock.match(/(?:skill|yobot):\s*\n([\s\S]*?)(?=\n\s*\w+:|\n$)/);
                    if (nsMatch) {
                        const nsBlock = nsMatch[1];
                        const emoji = nsBlock.match(/emoji:\s*["'](.+)["']/)?.[1];
                        const primaryEnv = nsBlock.match(/primaryEnv:\s*["'](.+)["']/)?.[1];
                        const binsMatch = nsBlock.match(/bins:\s*\[(.*?)\]/);
                        const bins = binsMatch ? binsMatch[1].split(',').map(s => s.trim().replace(/['"]/g, '')) : [];
                        const envMatch = nsBlock.match(/env:\s*\[(.*?)\]/);
                        const env = envMatch ? envMatch[1].split(',').map(s => s.trim().replace(/['"]/g, '')) : [];
                        metadata = {
                            skill: {
                                emoji,
                                requires: {
                                    bins,
                                    env
                                },
                                primaryEnv
                            }
                        };
                    }
                }
            }
            // 两个命名空间互为镜像：解析出哪个都让 metadata.skill 和 metadata.yobot 同时可读，
            // 免得消费方需要各自判断技能包用的是新写法还是旧写法。
            if (metadata) {
                const ns = metadata.skill ?? metadata.yobot;
                if (ns) {
                    metadata.skill = ns;
                    metadata.yobot = ns;
                }
            }
        }
        // 路径标准化 (Windows Backslash -> Forward Slash)
        const normalizedMdPath = mdPath.replace(/\\/g, "/");
        const normalizedBaseDir = baseDir.replace(/\\/g, "/");
        // 构造 Lazy Loading 指令 (XML Format for Pi Kernel)
        // 关键点: 提供结构化数据供 System Prompt 的 <available_skills> 块使用
        const lazyInstructions = `<skill>
<name>${name}</name>
<description>${description}</description>
<location>${normalizedMdPath}</location>
</skill>`;
        // Auto-Wrapper Tool
        // 当模型尝试直接调用技能名称时，返回文档内容
        const wrapperToolName = this.resolveWrapperToolName(name, dirName);
        const wrapperTool = {
            definition: {
                name: wrapperToolName,
                description: `[Abstract Skill] ${description}. Call this tool to retrieve usage instructions.`,
                parameters: {
                    type: "object",
                    properties: {
                        reason: {
                            type: "string",
                            description: "The reason for calling this skill."
                        }
                    },
                    required: ["reason"]
                },
                enterprise: {
                    namespace: "skill",
                    capability: "read_instructions",
                    sideEffect: "none",
                    risk: "low",
                    reversible: true,
                    idempotent: true,
                    approval: "never",
                    estimatedCostClass: "free",
                    executionMode: "parallel",
                },
            },
            execute: async () => {
                let fullContent = await fs.readFile(mdPath, "utf-8");
                // Replace {baseDir} placeholder with actual absolute path
                fullContent = fullContent.replace(/{baseDir}/g, normalizedBaseDir);
                return `[System] You called the abstract skill '${name}'. 
Here is the usage documentation (SKILL.md). 
Please read it and use the most appropriate available tools to perform the actual action.

${fullContent}`;
            }
        };
        // 单一注册：每个工具只注册一次
        // 命名适配通过 tool_interceptor.ts 的运行时模糊匹配处理
        const tools = [wrapperTool];
        return {
            name: name,
            description: description,
            tools: tools, // 单一注册，无别名
            instructions: lazyInstructions,
            metadata: metadata
        };
    }
}
