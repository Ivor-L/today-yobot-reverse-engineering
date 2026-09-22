import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { SkillManualProvider } from "../utils/manual_provider.js";
import { AgenticContextStore } from "../../agent/agentic/context.js";
import { composeAgentMd, patchAgentMd } from "../../agent/profile/agent_md.js";
import { LLMManager } from "../../agent/llm/manager.js";
/**
 * 让**主 Agent** 帮用户搭建业务子 Agent（§22）。
 *
 * 定位：把「创建智能体」页的 IPC 能力（列知识库/列技能/写 AGENT.md）搬到服务端，做成主 Agent
 * 可调用的工具，配合 `create_agent_sop` 文档，实现"一句话建一个客服子 Agent"，降低用户认知成本。
 *
 * ⚠️ `scope: 'main'` + 进 `AGENT_BUILTIN_SKILLS`(deny)：**子 Agent 绝不可挂载**。它能创建/覆盖
 * 任意子 Agent 定义，等于配置提权——只能给主 Agent（受设备主人直接指挥）用。
 *
 * 与 UI「创建智能体」页**同源**：写的是同一个 `workspace/agents/<name>/AGENT.md`，
 * chokidar 监听后自动 reload，下一条客户消息起生效；UI 列表也会看到。
 */
const AGENT_NAME_RE = /^[A-Za-z0-9_-]+$/;
/**
 * 正式 Prompt 里绝不该出现的占位符。SOP 的"创建前自检"要求过，但检查靠模型自觉，
 * 真实翻车样本就是带着 `{{业务名}}` 直接落地。这里做成硬闸门：写进 AGENT.md 就等于
 * 客户会看到它。
 */
const PLACEHOLDER_RE = /\{\{[^}]{0,40}\}\}|【[^】]{0,16}(待填|待补|待定|占位|TBD)[^】]{0,16}】/i;
/**
 * 业务关键词 → 英文词根。用于自动生成标识，只覆盖高频业务，命中不了就退到 `agent`。
 * 行业词排在角色词前面：`美缝剂售前顾问` 要得出 `sealant-presales`，而不是 `presales-sealant`。
 */
const NAME_KEYWORDS = [
    [/美缝/, 'sealant'], [/建材|瓷砖|地板|涂料/, 'material'], [/家装|装修|全案/, 'reno'],
    [/家居|家具/, 'furniture'], [/服装|女装|男装|童装/, 'apparel'], [/美妆|护肤|化妆/, 'beauty'],
    [/医美|整形/, 'medbeauty'], [/健康|养生|理疗/, 'health'], [/母婴|奶粉/, 'baby'],
    [/宠物/, 'pet'], [/食品|生鲜|零食/, 'food'], [/餐饮|门店|加盟/, 'catering'],
    [/汽车|车行|试驾/, 'auto'], [/地产|楼盘|房源/, 'estate'], [/保险/, 'insurance'],
    [/金融|贷款|理财/, 'finance'], [/法律|律所/, 'legal'], [/物流|快递|货运/, 'logistics'],
    [/教育|学校/, 'edu'], [/课程|培训|讲师/, 'course'], [/招生/, 'enroll'],
    [/旅游|旅行|门票/, 'travel'], [/婚庆|婚礼/, 'wedding'], [/摄影|写真/, 'photo'],
    [/招聘|人事|HR/i, 'hr'], [/电商|网店|店铺/, 'ecom'], [/直播/, 'live'],
    [/软件|系统|SaaS|技术/i, 'tech'],
    [/售前/, 'presales'], [/售后/, 'aftersales'], [/客服|接待/, 'cs'],
    [/销售|销冠|带货/, 'sales'], [/顾问/, 'advisor'], [/咨询/, 'consult'],
    [/线索|获客/, 'leads'], [/回访|跟单|跟进/, 'followup'], [/预约/, 'booking'],
    [/群聊|社群/, 'group'], [/助理|助手/, 'assistant'], [/支持|运维/, 'support'],
];
/**
 * 自动生成子 Agent 英文标识。
 *
 * 标识是纯技术需要（目录名 + profileId），对用户没有任何意义，却是最招人烦的一问——
 * 用户要的是"建个销售客服"，不是给变量取名。所以模型没给、或给了非法值（中文名最常见），
 * 都由这里按规则算一个，**绝不回头找用户要英文名**。
 */
function deriveAgentName(displayName, scene, taken) {
    // 1) 展示名里本就有英文/数字（`Anna 客服`）→ 直接拿它做词根，最贴近用户的叫法
    const ascii = (displayName.match(/[A-Za-z0-9]+/g) || []).join('-').toLowerCase();
    let base = ascii.length >= 2 ? ascii.slice(0, 24) : '';
    // 2) 否则按业务关键词表拼（`美缝剂售前顾问` → `sealant-presales`）
    if (!base) {
        const src = `${displayName} ${scene || ''}`;
        const hits = [];
        for (const [re, word] of NAME_KEYWORDS) {
            if (hits.length >= 3)
                break;
            if (re.test(src) && !hits.includes(word))
                hits.push(word);
        }
        base = hits.join('-');
    }
    if (!base)
        base = 'agent';
    if (!taken(base))
        return base;
    for (let i = 2; i < 100; i++) {
        if (!taken(`${base}-${i}`))
            return `${base}-${i}`;
    }
    return `${base}-${Date.now().toString(36)}`;
}
function fireflowBase() {
    const raw = process.env.FIREFLOW_BASE_URL || process.env.VITE_FIREFLOW_BASE_URL || "https://fireflow.yokoagi.com";
    return raw.replace(/\/+$/, "");
}
/** 轻量读 AGENT.md frontmatter 标量（列表用，不做完整解析、不因坏文件抛错）。 */
function liteScalar(fm, key) {
    const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    return m ? m[1].trim().replace(/^["']|["']$/g, "") : undefined;
}
export function createAgentBuilderSkill(opts) {
    const agentsDir = () => path.join(opts.workspaceDir, "agents");
    const knowledgeDir = () => path.join(opts.workspaceDir, "knowledge");
    const manual = new SkillManualProvider("agent_builder", "agent_builder");
    const listTool = {
        definition: {
            name: "agent_list",
            description: "列出已存在的业务子 Agent（名称/标识/是否启用/简介）。创建前**必须先调**，避免重名或重复创建；也用于回答“我有哪些子 Agent”。",
            parameters: { type: "object", properties: {} },
        },
        execute: async () => {
            const dir = agentsDir();
            if (!fs.existsSync(dir))
                return "当前还没有任何子 Agent。";
            const rows = [];
            for (const e of await fs.promises.readdir(dir, { withFileTypes: true })) {
                if (!e.isDirectory())
                    continue;
                const md = path.join(dir, e.name, "AGENT.md");
                if (!fs.existsSync(md))
                    continue;
                const raw = (await fs.promises.readFile(md, "utf-8")).replace(/^﻿/, "");
                const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
                const enabled = (liteScalar(fm, "enabled") ?? "true").toLowerCase() !== "false";
                rows.push(`- ${liteScalar(fm, "displayName") || e.name}（标识 ${e.name}，${enabled ? "已启用" : "已停用"}）` +
                    `${liteScalar(fm, "scene") ? "：" + liteScalar(fm, "scene") : ""}`);
            }
            return rows.length ? `已存在的子 Agent：\n${rows.join("\n")}` : "当前还没有任何子 Agent。";
        },
    };
    const getTool = {
        definition: {
            name: "agent_get",
            description: "读取已有子Agent的完整配置。修改前先调，再用 agent_update 局部更新。",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string", description: "子 Agent 标识(agent_list 里的标识)。" },
                },
                required: ["name"],
            },
        },
        execute: async (a) => {
            const name = String(a?.name || "").trim();
            if (!AGENT_NAME_RE.test(name))
                return `读取失败：标识 "${name}" 非法。`;
            const md = path.join(agentsDir(), name, "AGENT.md");
            if (!fs.existsSync(md))
                return `没有找到子 Agent「${name}」。先用 agent_list 确认标识。`;
            const raw = (await fs.promises.readFile(md, "utf-8")).replace(/^﻿/, "");
            return `子 Agent「${name}」的 AGENT.md：\n\n${raw}`;
        },
    };
    const updateTool = {
        definition: {
            name: "agent_update",
            description: "局部修改已有子Agent；未传字段保持不变。修改前先 agent_get。",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string", description: "agent_list 返回的标识" },
                    displayName: { type: "string", description: "展示名" },
                    enabled: { type: "boolean", description: "启用状态" },
                    scene: { type: "string", description: "简介；空串清除" },
                    systemPrompt: { type: "string", description: "新的完整人设" },
                    model: { type: "string", description: "模型ID；空串=跟随全局" },
                    knowledge: { type: "array", items: { type: "string" }, description: "知识库ref；[]=清空" },
                    skillsEnabled: { type: "boolean", description: "技能开关" },
                    skills: { type: "array", items: { type: "string" }, description: "技能名；最多3个" },
                    followUp: { type: "string", enum: ["never", "auto", "always"], description: "追答策略" },
                    followUpPrompt: { type: "string", description: "追答提示；空串清除" },
                },
                required: ["name"],
            },
            enterprise: {
                namespace: "agent_builder",
                capability: "update_agent_profile",
                sideEffect: "local",
                risk: "critical",
                reversible: false,
                idempotent: true,
                approval: "always",
                securityEffects: ["local_file_mutation"],
                executionMode: "sequential",
            },
        },
        execute: async (a) => {
            const name = String(a?.name || "").trim();
            if (!AGENT_NAME_RE.test(name))
                return `修改失败：标识 "${name}" 非法。`;
            const md = path.join(agentsDir(), name, "AGENT.md");
            if (!fs.existsSync(md))
                return `没有找到子 Agent「${name}」。先用 agent_list 确认标识。`;
            const editable = [
                "displayName", "enabled", "scene", "systemPrompt", "model", "knowledge",
                "skillsEnabled", "skills", "followUp", "followUpPrompt",
            ];
            const changed = editable.filter((key) => Object.prototype.hasOwnProperty.call(a || {}, key));
            if (!changed.length)
                return "修改失败：没有传入要修改的字段。";
            if (Object.prototype.hasOwnProperty.call(a, "displayName") && !String(a.displayName || "").trim()) {
                return "修改失败：展示名不能为空。";
            }
            if (Object.prototype.hasOwnProperty.call(a, "systemPrompt")) {
                const prompt = String(a.systemPrompt || "").trim();
                if (!prompt)
                    return "修改失败：人设正文不能为空。";
                const placeholder = prompt.match(PLACEHOLDER_RE);
                if (placeholder)
                    return `修改失败：人设里还留着占位符「${placeholder[0]}」。`;
            }
            if (Object.prototype.hasOwnProperty.call(a, "skills") && (!Array.isArray(a.skills) || a.skills.length > 3)) {
                return "修改失败：skills 必须是最多 3 个技能名的数组。";
            }
            if (Object.prototype.hasOwnProperty.call(a, "knowledge") && !Array.isArray(a.knowledge)) {
                return "修改失败：knowledge 必须是知识库 ref 数组。";
            }
            const patch = {};
            for (const key of changed)
                patch[key] = a[key];
            if (Array.isArray(patch.skills))
                patch.skills = patch.skills.map(String);
            if (Array.isArray(patch.knowledge))
                patch.knowledge = patch.knowledge.map(String);
            const raw = await fs.promises.readFile(md, "utf-8");
            let next;
            try {
                next = patchAgentMd(raw, patch);
            }
            catch (error) {
                return `修改失败：${error?.message || error}`;
            }
            if (next === raw.replace(/^﻿/, ""))
                return `子 Agent「${name}」配置未变化。`;
            const temp = `${md}.tmp-${process.pid}-${Date.now()}`;
            try {
                await fs.promises.writeFile(temp, next, "utf-8");
                await fs.promises.rename(temp, md);
            }
            catch (error) {
                await fs.promises.rm(temp, { force: true }).catch(() => { });
                return `修改失败：${error?.message || error}`;
            }
            const labels = {
                displayName: "展示名",
                enabled: "启用状态",
                scene: "简介",
                systemPrompt: "人设",
                model: "模型",
                knowledge: "知识库",
                skillsEnabled: "技能开关",
                skills: "技能",
                followUp: "追答策略",
                followUpPrompt: "追答提示",
            };
            return `已更新子 Agent「${name}」：${changed.map((key) => labels[key]).join("、")}；其他配置保持不变，下一条消息起生效。`;
        },
    };
    const listKbTool = {
        definition: {
            name: "agent_list_knowledge_bases",
            description: "列出可挂载的知识库：线上 Fireflow 库（数据在云端、支持图片如付款码）+ 本地共享库（存本机、适合合规/离线）。" +
                "返回每个库的挂载引用 ref（`@wf/<id>` 或 `@shared/<名>`）、名称、文档数。创建/修改子 Agent 的知识库前先调它拿到 ref。" +
                "注意：你只能列库与按 ref 挂载，【不能新建知识库或写入内容】。用户要给知识库加资料时，引导其手动录入——本地库走「账户→本地知识库」、线上库走 Fireflow；严禁用 shell/文件工具改 workspace/knowledge 或 .registry.json。",
            parameters: { type: "object", properties: {} },
        },
        execute: async () => {
            const out = [];
            // 线上 Fireflow：用用户登录 JWT 调 /v1/agent/knowledge-bases。失败降级，不阻断。
            const token = LLMManager.getInstance().getAuthToken?.();
            if (token) {
                const ctrl = new AbortController();
                const timer = setTimeout(() => ctrl.abort(), 10000);
                try {
                    const res = await fetch(`${fireflowBase()}/v1/agent/knowledge-bases`, {
                        headers: { Authorization: `Bearer ${token}` },
                        signal: ctrl.signal,
                    });
                    if (res.ok) {
                        const json = await res.json();
                        const kbs = Array.isArray(json?.data) ? json.data : [];
                        if (kbs.length) {
                            out.push("线上知识库（Fireflow）：");
                            for (const k of kbs) {
                                const docs = Array.isArray(k.documents) ? k.documents.length : 0;
                                out.push(`  - ref=@wf/${k.id}  名称：${k.name}  文档 ${docs} 份`);
                            }
                        }
                    }
                    else {
                        out.push(`（线上知识库获取失败：HTTP ${res.status}，可稍后重试）`);
                    }
                }
                catch (e) {
                    out.push(`（线上知识库获取失败：${e?.name === "AbortError" ? "超时" : e?.message || e}）`);
                }
                finally {
                    clearTimeout(timer);
                }
            }
            else {
                out.push("（未取到登录令牌，暂无法列出线上知识库；用户已登录时可重试）");
            }
            // 本地共享库：扫 workspace/knowledge/*
            const kdir = knowledgeDir();
            if (fs.existsSync(kdir)) {
                const locals = [];
                for (const e of await fs.promises.readdir(kdir, { withFileTypes: true })) {
                    if (!e.isDirectory())
                        continue;
                    const docs = (await fs.promises.readdir(path.join(kdir, e.name))).filter((f) => f.endsWith(".md")).length;
                    locals.push(`  - ref=@shared/${e.name}  名称：${e.name}  文档 ${docs} 份`);
                }
                if (locals.length) {
                    out.push("本地共享知识库：");
                    out.push(...locals);
                }
            }
            return out.length ? out.join("\n") : "暂无可挂载的知识库。用户可在 Fireflow 建线上库，或在「记忆」页加本地库。";
        },
    };
    const listSkillsTool = {
        definition: {
            name: "agent_list_skills",
            description: "列出子 Agent 可挂载的技能（仅技能商店安装的 SKILL.md 技能，内建高危技能不可挂）。返回技能名+简介。" +
                "**注意**：技能模块有风险（靠 shell 在本机执行），默认关闭；只有用户明确要求给子 Agent 加技能时才启用并挂载（≤3 个）。",
            parameters: { type: "object", properties: {} },
        },
        execute: async () => {
            const list = opts.listMountableSkills();
            if (!list.length)
                return "暂无可挂载技能。用户可先到「技能」页安装 SKILL.md 技能。";
            return "可挂载技能（SKILL.md）：\n" + list.map((s) => `- ${s.name}${s.description ? "：" + s.description : ""}`).join("\n");
        },
    };
    const createTool = {
        definition: {
            name: "agent_create",
            description: "创建业务子Agent；overwrite=true 会整份替换，普通修改用 agent_update。" +
                "调用前**必须**：1) 已和用户确认好人设/知识库；2) 已 agent_list 检查不重名；" +
                "3) 知识库用 agent_list_knowledge_bases 拿到的 ref。技能默认不挂（有风险），除非用户明确要。",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string", description: "英文标识（字母/数字/下划线/连字符），如 sales-cs。**可省略**：省略或非法时按业务自动生成。绝对不要为此询问用户。" },
                    displayName: { type: "string", description: "中文展示名，如「售前客服」。" },
                    scene: { type: "string", description: "一句话简介/场景，如「回答产品、价格、试用咨询」。" },
                    systemPrompt: { type: "string", description: "人设正文（system prompt）：它是谁、怎么说话、边界、不知道怎么办。微信客服建议口语化、别输出 markdown。" },
                    knowledge: {
                        type: "array",
                        items: { type: "string" },
                        description: "挂载的知识库 ref 列表（来自 agent_list_knowledge_bases），如 [\"@wf/xxx\", \"@shared/faq\"]。可空。",
                    },
                    skillsEnabled: { type: "boolean", description: "是否启用技能模块（默认 false，有风险；仅用户明确要求时 true）。" },
                    skills: { type: "array", items: { type: "string" }, description: "挂载的 SKILL.md 技能名（≤3；仅 skillsEnabled=true 时生效）。" },
                    model: { type: "string", description: "回复模型 id（省略=跟随全局默认；一般不用填）。" },
                    followUp: { type: "string", enum: ["never", "auto", "always"], description: "智能追答，默认 never（关闭，完整答完一次发）。用户没特别要求就用 never。" },
                    overwrite: { type: "boolean", description: "整份替换同标识Agent；普通修改勿用" },
                },
                required: ["displayName", "systemPrompt"],
            },
            enterprise: {
                namespace: "agent_builder",
                capability: "create_agent_profile",
                sideEffect: "local",
                risk: "critical",
                reversible: false,
                idempotent: false,
                approval: "always",
                securityEffects: ["local_file_mutation"],
                executionMode: "sequential",
            },
        },
        execute: async (a) => {
            const systemPrompt = String(a?.systemPrompt || "").trim();
            if (!systemPrompt)
                return "创建失败：人设正文（systemPrompt）不能为空。";
            const ph = systemPrompt.match(PLACEHOLDER_RE);
            if (ph) {
                return (`创建失败：人设里还留着占位符「${ph[0]}」。这会原样发给客户。` +
                    `先把它替换成用户确认过的真实内容，再重新调用（见 prompt_framework 的一票否决清单）。`);
            }
            const displayName = String(a?.displayName || "").trim();
            const asked = String(a?.name || "").trim();
            const isTaken = (n) => fs.existsSync(path.join(agentsDir(), n, "AGENT.md"));
            // 标识非法/缺失不是错误，是"这事不该麻烦用户"——按业务自动生成一个。
            const autoNamed = !AGENT_NAME_RE.test(asked);
            const name = autoNamed
                ? deriveAgentName(displayName || "agent", a?.scene ? String(a.scene) : undefined, isTaken)
                : asked;
            const agentDir = path.join(agentsDir(), name);
            const md = path.join(agentDir, "AGENT.md");
            if (fs.existsSync(md) && a?.overwrite !== true) {
                return `子 Agent "${name}" 已存在。如果确认要覆盖它，请先与用户确认，再带 overwrite=true 重新调用；或换一个标识。`;
            }
            const followUp = ["auto", "always"].includes(a?.followUp) ? a.followUp : "never";
            const skillsEnabled = a?.skillsEnabled === true;
            const existed = fs.existsSync(md);
            const content = composeAgentMd({
                name,
                displayName: displayName || name,
                enabled: true,
                scene: a?.scene ? String(a.scene) : undefined,
                model: a?.model ? String(a.model) : undefined,
                skillsEnabled,
                skills: Array.isArray(a?.skills) ? a.skills.map(String).slice(0, 3) : [],
                knowledge: Array.isArray(a?.knowledge) ? a.knowledge.map(String) : [],
                followUp,
                systemPrompt,
            });
            await fs.promises.mkdir(agentDir, { recursive: true });
            await fs.promises.writeFile(md, content, "utf-8");
            const kbNote = Array.isArray(a?.knowledge) && a.knowledge.length ? `，挂载 ${a.knowledge.length} 个知识库` : "，未挂知识库";
            const skNote = skillsEnabled && a?.skills?.length ? `，启用技能：${a.skills.slice(0, 3).join("、")}` : "";
            // 转人工是接入微信 RPA 后最容易"看起来配了、其实永不触发"的一环：RPA 只认
            // 回复正文里出现的转人工触发词，人设里没有固定话术就等于没有转人工。
            const transferNote = /转人工/.test(systemPrompt)
                ? ""
                : `\n⚠️ 人设里没有任何转人工规则。若这个子 Agent 要接入微信 RPA 自动回复，` +
                    `先读 wechat_rpa 手册 transfer_to_human_sop，把固定触发词写进人设并在 RPA 侧登记，否则永远不会转人工。`;
            return (`已${existed ? "保存" : "创建"}子 Agent「${displayName || name}」（标识 ${name}）${kbNote}${skNote}。` +
                (autoNamed ? `标识由系统按业务自动生成，无需告知用户、也不要让用户改。` : "") +
                `几秒后在「智能体」页可见，下一条客户消息起生效。` +
                `接下来按 SOP Step 7 问用户要不要让微信RPA 用上它、用在哪（自动回复/AI朋友圈），` +
                `再用 wechat_bind_agent 落地；只“登记”不指定用途，功能不会改用它。` +
                transferNote);
        },
    };
    // ===== 子 Agent 会话上下文（agentic_contexts）=====
    //
    // 子 Agent 的对话历史存在**客户端自己的** data/agentic_contexts/<sha256(key)>.json，
    // 不是 RPA 那份聊天记录的投影：RPA 每次递交的历史只是"同步输入"，合并进本地 store 后，
    // 真正注入模型的窗口是从本地 store 全量里取的（30 轮 / 12000 token）。
    // 后果是：调 RPA 的 contextCount、删 ~/.webot 的聊天记录，**都清不掉**这里的历史
    // （线上真实误判：主 Agent 曾据此给出三个"清空方案"，无一生效）。
    // 存储层早就有 delete()，但一直只被试聊面板调用，生产会话没有任何入口——这两个工具补上它。
    const contextStore = new AgenticContextStore();
    /** 清空是不可逆的删除，必须跨轮确认：令牌只在预览时签发，且必须换一个 trace 才能兑现。 */
    const clearConfirmations = new Map();
    const fmtTime = (ts) => (ts ? new Date(ts).toLocaleString("zh-CN", { hour12: false }) : "—");
    const contextListTool = {
        definition: {
            name: "agent_context_list",
            description: "列出子 Agent 已保存的客户会话上下文（客户会话标识、消息数、时间跨度、最近一条摘要）。" +
                "用户问「它记得多久之前的事」「上下文里有什么」「怎么清掉之前的对话」时先调这个。" +
                "清空前**必须**先调它让用户指认要清哪个会话。",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string", description: "子 Agent 标识（agent_list 里的标识）。省略=列出全部子 Agent 的会话。" },
                },
            },
        },
        execute: async (args) => {
            const profileId = String(args?.name || "").trim();
            const rows = contextStore.list(profileId ? { profileId } : undefined);
            if (!rows.length) {
                return profileId
                    ? `子 Agent「${profileId}」还没有任何已保存的客户会话上下文。`
                    : "还没有任何已保存的子 Agent 会话上下文。";
            }
            const lines = rows.map((r) => {
                const scene = r.key.source === "desktop-agent-preview" ? "试聊" : r.key.source;
                return `- [${scene}] 子Agent=${r.key.profileId} 账号=${r.key.scopeId} 会话=${r.key.conversationId}\n` +
                    `    ${r.messageCount} 条消息 · ${fmtTime(r.firstAt)} → ${fmtTime(r.lastAt)}\n` +
                    `    最近：${r.preview || "（空）"}`;
            });
            return `已保存的子 Agent 会话上下文（共 ${rows.length} 个）：\n${lines.join("\n")}\n\n` +
                "注意：注入模型的窗口是最近 30 轮 / 12000 token，**没有时间限制**——只要总量没溢出，" +
                "几周前的消息每轮都会被重新注入。要清掉某个会话用 agent_context_clear（会先出预览等用户确认）。";
        },
    };
    const contextClearTool = {
        definition: {
            name: "agent_context_clear",
            description: "清空子 Agent 的客户会话上下文（删除已保存的对话历史，不可恢复）。" +
                "**两段式**：不带 confirmToken 只出预览、不删任何东西；把预览逐条念给用户，" +
                "等用户下一条消息明确同意后，再带 confirmToken 调一次才真正删除。" +
                "绝不允许在同一轮里自己预览再自己确认。",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string", description: "子 Agent 标识。必填，避免跨 Agent 误删。" },
                    conversationId: { type: "string", description: "只清某个客户会话（取自 agent_context_list）。省略=该子 Agent 的全部会话，风险更高，务必让用户明确点头。" },
                    confirmToken: { type: "string", description: "上一轮预览返回的令牌。" },
                },
                required: ["name"],
            },
        },
        execute: async (args, _signal, context) => {
            const sessionId = context?.sessionId || "unknown";
            const traceId = context?.traceId || "";
            const profileId = String(args?.name || "").trim();
            const conversationId = String(args?.conversationId || "").trim();
            if (!profileId)
                return "Error: 缺少 name（子 Agent 标识），拒绝执行以免跨 Agent 误删。";
            // 兑现阶段
            const token = String(args?.confirmToken || "").trim();
            if (token) {
                const rec = clearConfirmations.get(token);
                if (!rec || rec.expiresAt < Date.now()) {
                    clearConfirmations.delete(token);
                    return "Error: 清空确认已失效，请重新调用本工具出一次预览。";
                }
                if (rec.sessionId !== sessionId)
                    return "Error: 该确认属于另一个会话。";
                if (!traceId || traceId === rec.issuedTraceId) {
                    return "Error: 不能在预览的同一轮里就删除。先把要删的内容讲给用户，等用户回话同意后再调。";
                }
                clearConfirmations.delete(token);
                for (const key of rec.keys)
                    contextStore.clear(key);
                return `已清空${rec.label}。这些会话的历史不再注入，下一条客户消息起子 Agent 从零开始对话。` +
                    `（注意：微信里的聊天记录不受影响，本次删的只是子 Agent 的上下文。）`;
            }
            // 预览阶段
            const all = contextStore.list({ profileId });
            const targets = conversationId ? all.filter((r) => r.key.conversationId === conversationId) : all;
            if (!targets.length) {
                return conversationId
                    ? `子 Agent「${profileId}」下没有会话 ${conversationId}，无需清空。先用 agent_context_list 确认标识。`
                    : `子 Agent「${profileId}」没有任何已保存的会话上下文，无需清空。`;
            }
            if (!traceId) {
                return "Error: 当前上下文缺少 traceId，无法做跨轮确认，拒绝删除。请让用户在「智能体」页手动处理。";
            }
            const confirmToken = crypto.randomUUID();
            const label = conversationId
                ? `子 Agent「${profileId}」的会话 ${conversationId}`
                : `子 Agent「${profileId}」的全部 ${targets.length} 个会话`;
            clearConfirmations.set(confirmToken, {
                sessionId, issuedTraceId: traceId, expiresAt: Date.now() + 10 * 60_000,
                keys: targets.map((t) => t.key), label,
            });
            const detail = targets.map((r) => `- 账号=${r.key.scopeId} 会话=${r.key.conversationId}：${r.messageCount} 条 · ${fmtTime(r.firstAt)} → ${fmtTime(r.lastAt)}\n    最近：${r.preview || "（空）"}`);
            return JSON.stringify({
                preview: true,
                willDelete: label,
                conversations: detail.join("\n"),
                confirmToken,
                expires_in_seconds: 600,
                instruction: "尚未删除任何内容。把 conversations 逐条念给用户（尤其是消息数和时间跨度），" +
                    "明确告诉他这是不可恢复的删除、且只影响子 Agent 的上下文不影响微信聊天记录，" +
                    "等用户下一条消息明确同意后，再带 confirmToken 调一次本工具。用户没点头就不要调。",
            }, null, 2);
        },
    };
    return {
        name: "agent_builder",
        description: "帮用户创建/配置业务子 Agent（查知识库、查技能、写 AGENT.md）。",
        scope: "main",
        tools: [listTool, getTool, updateTool, listKbTool, listSkillsTool, createTool, contextListTool, contextClearTool, manual.getManualTool()],
        // 常驻指令只做「识别意图 + 指向 SOP」，其余（步骤、平台细节、接入流程、与工作流的区别）
        // 全部下沉到按需读取的 create_agent_sop，保持轻量与可扩展（two-level docs 的初衷）。
        instructions: "【创建/修改子 Agent】用户要创建、调优或修改业务子 Agent 时用本技能" +
            "（区别于把一次性任务拆给后台 worker 的 task_group）：" +
            "先 `agent_builder_read_manual({ topic: \"create_agent_sop\" })` 读标准流程，再按流程落地。\n" +
            "子 Agent 是可配人设/知识库、且**能调用技能**的智能体，建好后可接入微信 BOT 使用" +
            "（“能调技能”也是它区别于 Fireflow 工作流之处）——细节都在该 SOP 里。\n" +
            "【上下文/记忆问题】用户问「它能记住多久之前的事」「上下文里有什么」「怎么清掉之前的对话/污染的上下文」时，" +
            "先 `agent_builder_read_manual({ topic: \"agentic_context\" })`" +
            "清空一律用 agent_context_clear，先预览、经用户确认后的下一轮才真删。",
    };
}
