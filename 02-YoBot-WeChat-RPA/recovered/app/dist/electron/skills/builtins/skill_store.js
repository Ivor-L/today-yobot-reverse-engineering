// 技能商店感知工具（常驻，无条件注册）
//
// 解决的死路：未安装的技能对 agent 完全不可见（SkillRegistry 只暴露已安装技能的工具/说明）。
// 用户说「帮我用 X 采集/做 Y」而本地没装 X 时，agent 手上没有任何工具，只能瞎凑或答做不了。
//
// 本工具给 agent 两个能力：
//   find(intent)    —— 查云端商店目录，按意图匹配，返回候选技能（含是否已装/是否付费/是否需浏览器扩展）。
//   install(id)     —— 拉取该技能最新版（服务端签名下载 URL），委托 Electron 主进程下载/校验/解压/热重载。
//
// 安装本身免费、不触发付费；付费技能（如 yoko-collector）的权益门控仍在各自工具的 start 环节。
// fail-soft：云端未配置/未登录/不可用时返回可读错误，让 agent 退化为「引导用户去技能商店」。
import path from "path";
import fs from "fs-extra";
import { LLMManager } from "../../agent/llm/manager.js";
function ctx() {
    const base = process.env.REMOTE_SERVER_URL;
    const llm = LLMManager.getInstance();
    return { base, token: llm.getAuthToken(), channelId: llm.getChannelId() };
}
/** 本地已安装的技能目录名集合（userData/skills/<id>） */
function installedSkillIds() {
    const set = new Set();
    try {
        const root = process.env.USER_DATA_PATH ? path.join(process.env.USER_DATA_PATH, "skills") : "";
        if (root && fs.existsSync(root)) {
            for (const e of fs.readdirSync(root, { withFileTypes: true })) {
                if (e.isDirectory())
                    set.add(e.name);
            }
        }
    }
    catch { }
    return set;
}
async function fetchCatalog() {
    const { base, channelId } = ctx();
    if (!base)
        throw new Error("REMOTE_SERVER_URL 未配置（需在桌面客户端中运行）");
    const q = channelId ? `?channel_id=${encodeURIComponent(channelId)}` : "";
    const res = await fetch(`${base}/v1/store/catalog${q}`, {
        headers: { ...(channelId ? { "x-channel-id": channelId } : {}) },
    });
    if (!res.ok)
        throw new Error(`商店目录请求失败 http_${res.status}`);
    const d = await res.json();
    return Array.isArray(d.items) ? d.items : [];
}
async function fetchLatest(id) {
    const { base, channelId } = ctx();
    if (!base)
        throw new Error("REMOTE_SERVER_URL 未配置（需在桌面客户端中运行）");
    const res = await fetch(`${base}/v1/store/skill/${encodeURIComponent(id)}/latest`, {
        headers: { ...(channelId ? { "x-channel-id": channelId } : {}) },
    });
    if (!res.ok)
        throw new Error(`技能版本请求失败 http_${res.status}`);
    return res.json();
}
/** 把候选技能裁剪成给 agent 看的精简结构 */
function toBrief(item, installed) {
    const isPaid = item?.entitlement?.type === "paid" || item?.entitlement?.type === "quota";
    const needsExtension = !!(item?.latest?.requires?.extension);
    return {
        id: item.id,
        name: item.name,
        tagline: item.tagline || "",
        category: item.category || "",
        scenarios: item.scenarios || [],
        sample_prompts: item.sample_prompts || [],
        installed: installed.has(item.id),
        paid: isPaid,
        needs_browser_extension: needsExtension,
        latest_version: item?.latest?.version || null,
    };
}
/** 朴素意图打分：命中 name/tagline/category/scenarios/sample_prompts 计分 */
function scoreItem(item, terms) {
    if (!terms.length)
        return 0;
    const hay = [
        item.name, item.tagline, item.category,
        ...(item.scenarios || []), ...(item.sample_prompts || []), item.id,
    ].filter(Boolean).join(" ").toLowerCase();
    let s = 0;
    for (const t of terms)
        if (t && hay.includes(t))
            s += 1;
    return s;
}
/** 委托 Electron 主进程执行安装（server 进程经 IPC） */
function requestInstall(item) {
    if (typeof process.send !== "function") {
        return Promise.resolve({ success: false, error: "当前环境无法自动安装（需在桌面客户端中运行），请引导用户到「技能商店」手动安装。" });
    }
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return new Promise((resolve) => {
        let settled = false;
        const finish = (v) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            process.off("message", handler);
            resolve(v);
        };
        const handler = (msg) => {
            if (msg && msg.type === "store:install-request:done" && msg.requestId === requestId) {
                finish(msg.result || { success: false, error: "安装无响应" });
            }
        };
        const timer = setTimeout(() => finish({ success: false, error: "安装超时（120s）" }), 120000);
        process.on("message", handler);
        process.send({ type: "store:install-request", requestId, item });
    });
}
export const skillStoreSkill = {
    name: "skill-store",
    description: "技能商店访问能力：当用户的需求没有现成工具可满足时，用它查询线上技能商店是否有合适技能并按需安装。",
    // 关键指令：放进 system prompt，告诉 agent「缺工具不是死路」。
    instructions: `当用户请求的能力你当前**没有对应工具**时（例如「帮我去抖音采集线索」「用 xxx 技能做 yyy」而工具列表里没有相关工具），**不要直接回复做不了，也不要用浏览器/截图等通用工具硬凑**。正确流程：

1. 调用 \`skill_store\` 工具 action=\`find\`，intent 传用户意图关键词（如「抖音 线索 采集」），查商店是否有合适技能。
2. 命中后：
   - 若 \`installed=false\` → 调 \`skill_store\` action=\`install\`，id 传命中技能 id，自动安装（免费、不扣费）。安装成功后会热重载，**新工具随即出现在你的工具列表里**，继续用它完成任务。
   - 若 \`needs_browser_extension=true\`（如 yoko-collector）→ 安装只落文件，还需引导用户在 Chrome 打开 chrome://extensions →「加载已解压」→ 指向技能安装目录加载扩展；之后再用该技能的工具检查连接。
   - 若 \`paid=true\` → 安装免费，真正使用时该技能自身会做试用/付费门控，按其提示走即可。
3. 若 \`find\` 没命中或商店不可用 → 如实告诉用户「商店里暂无能满足该需求的技能」，不要编造。`,
    tools: [
        {
            definition: {
                name: "skill_store",
                description: "查询线上技能商店并按需安装技能。仅在用户需求没有现成工具可用时调用：先 find 找技能，再对未安装的技能 install。",
                parameters: {
                    type: "object",
                    properties: {
                        action: {
                            type: "string",
                            enum: ["find", "install"],
                            description: "find=按意图查商店候选技能；install=安装指定技能（id）。",
                        },
                        intent: {
                            type: "string",
                            description: "action=find 时必填：用户意图关键词，如「抖音 线索 采集」。",
                        },
                        id: {
                            type: "string",
                            description: "action=install 时必填：要安装的技能 id（来自 find 结果）。",
                        },
                    },
                    required: ["action"],
                },
            },
            execute: async (args) => {
                const action = String(args?.action || "").trim();
                try {
                    if (action === "find") {
                        const installed = installedSkillIds();
                        const items = await fetchCatalog();
                        const terms = String(args?.intent || "")
                            .toLowerCase()
                            .split(/[\s,，、/]+/)
                            .map((t) => t.trim())
                            .filter(Boolean);
                        const ranked = items
                            .map((it) => ({ it, score: scoreItem(it, terms) }))
                            .sort((a, b) => b.score - a.score);
                        // 有意图时优先命中项；命中为空则回退展示全部（让 agent 自行判断）
                        const hits = terms.length ? ranked.filter((r) => r.score > 0) : ranked;
                        const list = (hits.length ? hits : ranked).slice(0, 8).map((r) => toBrief(r.it, installed));
                        return JSON.stringify({
                            ok: true,
                            matched: hits.length,
                            total: items.length,
                            skills: list,
                            hint: list.length
                                ? "对未安装(installed=false)且合适的技能调用 action=install 安装；needs_browser_extension=true 的还需引导用户在浏览器加载扩展。"
                                : "商店里暂无匹配技能，请如实告知用户。",
                        });
                    }
                    if (action === "install") {
                        const id = String(args?.id || "").trim();
                        if (!id)
                            return JSON.stringify({ ok: false, error: "缺少参数 id" });
                        const latest = await fetchLatest(id);
                        if (!latest || !latest.artifact_url) {
                            return JSON.stringify({ ok: false, error: `技能 ${id} 暂无可安装版本` });
                        }
                        const r = await requestInstall({
                            id,
                            backend: latest.backend || "skillmd",
                            version: latest.version,
                            artifact_url: latest.artifact_url,
                            sha256: latest.sha256 || undefined,
                        });
                        if (!r.success)
                            return JSON.stringify({ ok: false, error: r.error || "安装失败" });
                        const needsExt = !!(latest.requires && latest.requires.extension);
                        return JSON.stringify({
                            ok: true,
                            installed: id,
                            version: latest.version,
                            needs_browser_extension: needsExt,
                            next: needsExt
                                ? "安装成功（已热重载，新工具应已可用）。该技能依赖浏览器扩展：请引导用户在 Chrome 打开 chrome://extensions →「加载已解压」→ 指向技能安装目录，再用该技能工具检查连接。"
                                : "安装成功（已热重载，新工具应已可用），可直接继续用该技能完成任务。",
                        });
                    }
                    return JSON.stringify({ ok: false, error: `未知 action: ${action}` });
                }
                catch (e) {
                    return JSON.stringify({ ok: false, error: e?.message || String(e) });
                }
            },
        },
    ],
};
