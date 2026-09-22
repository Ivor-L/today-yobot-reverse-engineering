import * as fs from 'fs';
import * as path from 'path';
import { applyVersionGate, getRpaVersion } from './version_gate.js';
import { MANUAL_NOT_FOUND_MARKER, READ_MANUAL_TOOL_SUFFIX } from '../../shared/manual_marker.js';
export class SkillManualProvider {
    skillName;
    folderName;
    options;
    /**
     * @param skillName The name of the skill (e.g. 'wechat-rpa')
     * @param folderName The actual folder name in src/skills/ (e.g. 'wechat_rpa'). If omitted, defaults to skillName.
     * @param options Controls whether the shared overlay and repo-source fallback participate in resolution.
     */
    constructor(skillName, folderName, options = {}) {
        this.skillName = skillName;
        this.folderName = folderName;
        this.options = options;
        if (!this.folderName) {
            this.folderName = skillName;
        }
    }
    /**
     * Candidate docs roots, highest precedence first.
     *
     * 1. USER_DATA/skills_docs/<folder>/docs — hot-update overlay
     * 2. RESOURCES_PATH/skills_docs/<folder>/docs — shipped inside the packaged client
     * 3. src/skills/<folder>/docs — repo source (development)
     *
     * Tiers that do not exist simply fall through, so no NODE_ENV branching is needed.
     */
    getDocsRoots() {
        const roots = [];
        // USER_DATA_PATH / RESOURCES_PATH are injected by the main process; the agent runs
        // in a separate process and cannot call app.getPath('userData') itself.
        if (this.options.includeOverlay !== false && process.env.USER_DATA_PATH) {
            roots.push(path.join(process.env.USER_DATA_PATH, 'skills_docs', this.folderName, 'docs'));
        }
        if (process.env.RESOURCES_PATH) {
            roots.push(path.join(process.env.RESOURCES_PATH, 'skills_docs', this.folderName, 'docs'));
        }
        if (this.options.includeSource !== false) {
            roots.push(path.join(process.cwd(), 'src', 'skills', this.folderName, 'docs'));
        }
        return roots;
    }
    /**
     * Locate a topic file across the docs roots.
     *
     * Resolution is PER FILE rather than per directory: a docs package may contain only
     * the topics it changed, and every other topic keeps resolving to the bundled copy
     * (docs/SOP_DOCS_MAINTENANCE_AND_RELEASE.md §4.4).
     */
    resolveTopicFile(topic) {
        for (const root of this.getDocsRoots()) {
            const candidate = path.join(root, `${topic}.md`);
            if (fs.existsSync(candidate))
                return candidate;
        }
        return null;
    }
    /**
     * Read the topic markdown file from the docs directory.
     */
    async readManualTopic(topic) {
        try {
            // Basic path traversal prevention
            const safeTopic = path.basename(topic);
            const filePath = this.resolveTopicFile(safeTopic);
            if (!filePath) {
                // 前缀必须来自 MANUAL_NOT_FOUND_MARKER：反馈上报据此判定 found=false，
                // 这是「文档缺口」信号的唯一来源（见 src/shared/manual_marker.ts）。
                return `${MANUAL_NOT_FOUND_MARKER} '${safeTopic}' not found for skill '${this.skillName}'. Please try reading 'index' topic first to see available documents.`;
            }
            const content = await fs.promises.readFile(filePath, 'utf-8');
            // Rewrite sections the installed RPA is too old to serve, so the agent never
            // walks the user through a feature that is not there (docs/SOP_DOCS_MAINTENANCE_AND_RELEASE.md §2).
            const versionGated = applyVersionGate(content, { rpa: getRpaVersion() });
            return this.options.transformContent
                ? this.options.transformContent(versionGated)
                : versionGated;
        }
        catch (error) {
            return `Error reading manual for topic '${topic}': ${error.message}`;
        }
    }
    /**
     * 该 topic 能否在任一 docs 根下解析到。
     *
     * 注册完整性门控用：固定文档缺失时不应注入任何相关指针/工具，
     * 否则 agent 被触发去读却读到空 → 幻觉或直接跟用户说"没有"，体感差。
     * 调用方据此决定"整块要不要注册"，从而保证缺文档时 system prompt 与今天逐字节一致。
     */
    hasTopic(topic) {
        return this.resolveTopicFile(path.basename(topic)) !== null;
    }
    /**
     * 直接读取某个固定 topic 的正文（供"无参、固定 topic"的工具用，如自述文档的 self_describe）。
     * 与 getManualTool 走同一套解析/版本门控逻辑。
     */
    async getTopic(topic) {
        return this.readManualTopic(topic);
    }
    /**
     * Generate a Tool that can be registered in the Skill to allow the Agent to read the manual.
     */
    /**
     * @param extraDescription 追加到工具描述末尾的技能专属引导（尽量一句话——这段常驻 system prompt）。
     */
    getManualTool(extraDescription) {
        const baseDescription = `Read detailed manual for ${this.skillName}. Use this to understand complex schemas, task types, or error solutions.`;
        return {
            definition: {
                name: `${this.skillName.replace(/-/g, '_')}${READ_MANUAL_TOOL_SUFFIX}`,
                description: extraDescription ? `${baseDescription} ${extraDescription}` : baseDescription,
                parameters: {
                    type: 'object',
                    properties: {
                        topic: {
                            type: 'string',
                            description: 'The document topic to read (e.g. "task_schema", "index"). If unsure, use "index" to list all available docs.'
                        }
                    },
                    required: ['topic']
                }
            },
            execute: async (args) => {
                return await this.readManualTopic(args.topic);
            }
        };
    }
}
