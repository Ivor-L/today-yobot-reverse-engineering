import * as fs from "fs";
import * as path from "path";
import { computeAgenticSkills } from "./builtins.js";
import { escapeNamespace } from "../../memory/vector.js";
const PROFILE_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;
/**
 * 解析 AGENT.md 的 knowledge 条目为**物理路径前缀**(§13.1 自包含 bundle + 共享引用)：
 *   裸名 `faq`      → agent 私有 `agents/<name>/knowledge/faq`（常见场景零配置、零冲突）
 *   `@shared/<ns>`  → 全局共享 `knowledge/<ns>`（跨 agent 复用）
 *
 * 每段过 escapeNamespace 白名单；非法即抛，由 load() 逐文件捕获跳过（不静默）。
 * 只定寻址，不碰 RAG 引擎：字节存本地目录还是线上，是 MemoryStore 的事。
 */
function resolveKnowledgeNamespace(agentName, entry) {
    const t = entry.trim();
    // `@wf/<kbId>` → fireflow 线上知识库引用(§17)。不是本地路径，标成 `wf:` 前缀，
    // kernel 检索时分流到 searchWorkflowKnowledge。kbId 过白名单防注入。
    const wf = t.match(/^@wf\/(.+)$/);
    if (wf) {
        return `wf:${escapeNamespace(wf[1].trim())}`;
    }
    const shared = t.match(/^@shared\/(.+)$/);
    if (shared) {
        return `knowledge/${escapeNamespace(shared[1].trim())}`;
    }
    return `agents/${escapeNamespace(agentName)}/knowledge/${escapeNamespace(t)}`;
}
/**
 * 块标量：`key: |` 后面缩进的多行文本（YAML literal block 的最小实现）。
 * 用于 `followUpPrompt` 这类可多行、可被用户手改的提示词。遇到第一行缩进量为准，
 * 后续缩进不低于它的行都算块内容；缩进降回则结束。
 */
function blockScalar(yaml, key) {
    const lines = yaml.split(/\r?\n/);
    const start = lines.findIndex((l) => new RegExp(`^${key}:\\s*\\|\\s*$`).test(l));
    if (start === -1)
        return undefined;
    const out = [];
    let indent = -1;
    for (let i = start + 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === "") {
            out.push("");
            continue;
        }
        const m = line.match(/^(\s+)\S/);
        if (!m)
            break; // 顶格行 → 块结束
        if (indent === -1)
            indent = m[1].length;
        if (m[1].length < indent)
            break;
        out.push(line.slice(indent));
    }
    // 去掉尾部空行
    while (out.length && out[out.length - 1] === "")
        out.pop();
    const text = out.join("\n").trim();
    return text.length ? text : undefined;
}
/** 标量：`key: value`，去掉包裹引号。 */
function scalar(yaml, key) {
    const m = yaml.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    if (!m)
        return undefined;
    const v = m[1].trim().replace(/^["']|["']$/g, "");
    return v.length ? v : undefined;
}
function bool(yaml, key, fallback) {
    const v = scalar(yaml, key);
    if (v === undefined)
        return fallback;
    return v.toLowerCase() === "true";
}
/** [0,1] 之外的值一律视为配置错误：静默钳制会让用户以为门控生效了。 */
function score(yaml, key) {
    const v = scalar(yaml, key);
    if (v === undefined)
        return undefined;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 1) {
        throw new Error(`${key} 必须是 0~1 之间的小数，实际为 ${JSON.stringify(v)}`);
    }
    return n;
}
/**
 * 列表：支持内联 `key: [a, b]` 与块式
 *   key:
 *     - a
 *     - b
 * 两种写法。空数组 `[]` 与省略是不同语义——前者显式声明"没有"。
 */
function list(yaml, key) {
    const inline = yaml.match(new RegExp(`^${key}:\\s*\\[(.*)\\]\\s*$`, "m"));
    if (inline) {
        return inline[1]
            .split(",")
            .map((s) => s.trim().replace(/^["']|["']$/g, ""))
            .filter(Boolean);
    }
    // 块式：逐行扫描。刻意不用正则的多行前瞻——JS 没有 `\Z` 锚点，
    // 写 `(?=^\S|\Z)` 会把 `\Z` 当成字面量 Z，静默匹配错位置。
    const lines = yaml.split(/\r?\n/);
    const start = lines.findIndex((l) => new RegExp(`^${key}:\\s*$`).test(l));
    if (start === -1)
        return undefined;
    const items = [];
    for (let i = start + 1; i < lines.length; i++) {
        const m = lines[i].match(/^\s+-\s*(.+)$/);
        if (!m)
            break; // 缩进列表结束
        items.push(m[1].trim().replace(/^["']|["']$/g, ""));
    }
    return items;
}
export class ProfileLoader {
    agentsDir;
    constructor(agentsDir) {
        this.agentsDir = agentsDir;
    }
    static defaultDir(workspaceDir) {
        return path.join(workspaceDir, "agents");
    }
    /**
     * 装载全部 profile。单个文件出错只跳过该文件并记日志——
     * 一个写坏的 AGENT.md 不应让整个客户端起不来。
     */
    /** 诊断用：配错 workspace 时，这是唯一能自证的信息。 */
    get dir() {
        return this.agentsDir;
    }
    load() {
        if (!fs.existsSync(this.agentsDir)) {
            console.log(`[ProfileLoader] agents 目录不存在，跳过: ${this.agentsDir}`);
            return [];
        }
        const out = [];
        for (const entry of fs.readdirSync(this.agentsDir, { withFileTypes: true })) {
            if (!entry.isDirectory())
                continue;
            const mdPath = path.join(this.agentsDir, entry.name, "AGENT.md");
            if (!fs.existsSync(mdPath))
                continue;
            try {
                out.push(this.parse(entry.name, mdPath));
            }
            catch (e) {
                console.error(`[ProfileLoader] 跳过 ${entry.name}: ${e?.message || e}`);
            }
        }
        return out;
    }
    parse(dirName, mdPath) {
        const raw = fs.readFileSync(mdPath, "utf-8").replace(/^﻿/, "");
        const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
        if (!fm)
            throw new Error("缺少 frontmatter");
        const [, yaml, body] = fm;
        const name = scalar(yaml, "name") ?? dirName;
        if (!PROFILE_NAME_PATTERN.test(name)) {
            // name 就是 profileId，RPA 侧按它绑定，也会进 sessionId。
            throw new Error(`非法 name: ${name}（只允许字母、数字、下划线、连字符）`);
        }
        const systemPrompt = body.trim();
        if (!systemPrompt)
            throw new Error("正文为空（正文即 system prompt）");
        const declaredSkills = list(yaml, "skills") ?? [];
        // §21 技能模块开关。默认关（风险模块，主人须显式开启并知情）。开启时 shell 随之放行、
        // 挂载 ≤3 个 SKILL.md 技能；关闭则 allowedSkills 空、全内建 deny —— 单一出处防漂移。
        const skillsEnabled = bool(yaml, "skillsEnabled", false);
        const { allowedSkills, deniedSkills, shellAllowed } = computeAgenticSkills(skillsEnabled, declaredSkills);
        // 裸名 → agent 私有前缀;@shared/x → 全局前缀。空数组保持"没有"语义。
        const knowledge = (list(yaml, "knowledge") ?? []).map((e) => resolveKnowledgeNamespace(name, e));
        const sessionPolicy = scalar(yaml, "sessionPolicy") === "persistent" ? "persistent" : "ephemeral";
        const runtime = scalar(yaml, "runtime") === "external" ? "external" : "inproc";
        // §13.3/§21 追答策略。never = 关闭智能追答(完整答完一次发)；auto/always = 开启。
        // **默认 never**：智能追答理解成本高，默认关闭以降低用户认知负担，需要时显式 opt-in。
        const followUpRaw = scalar(yaml, "followUp");
        const followUp = followUpRaw === "auto" ? "auto" : followUpRaw === "always" ? "always" : "never";
        return {
            name,
            displayName: scalar(yaml, "displayName") ?? name,
            version: scalar(yaml, "version") ?? "1",
            enabled: bool(yaml, "enabled", true),
            scene: scalar(yaml, "scene"),
            scope: "subagent",
            // hardenProfile() 会再用 deniedSkills + shellAllowed 复算一次 —— 纵深防御。
            allowedSkills,
            deniedSkills,
            shellAllowed,
            systemPrompt,
            model: scalar(yaml, "model"),
            knowledge,
            knowledgeMinScore: score(yaml, "knowledgeMinScore"),
            // 子 agent 一律不写记忆：RPA 会话里的 user role 是陌生客户。
            memoryNamespace: { read: null, write: null },
            sessionPolicy,
            runtime,
            followUp,
            // 空 = 用默认追答提示词（service 回落 DEFAULT_FOLLOWUP_PROMPT）。
            followUpPrompt: blockScalar(yaml, "followUpPrompt"),
            filePath: mdPath,
        };
    }
}
