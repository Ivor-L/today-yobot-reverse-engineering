import { SkillManualProvider } from "../utils/manual_provider.js";
import { LLMManager } from "../../agent/llm/manager.js";
import { isSelfProfileEnabled, selfProfileUsesOnlineDocs } from "../../shared/self_profile_config.js";
/**
 * 产品「自述」技能：给主 Agent 一个**衔接自我销售的能力**（§ agent-profile）。
 *
 * 定位：agent 平时靠已注册的工具就能说清自己是谁、能干什么（这些能力已进系统提示词），
 * 所以自述**不做身份灌输**；它只在用户进入**商务话题**（价格/收费/演示/试用/续费/开通/
 * 代理/OEM/合作）时被触发，作为"自我介绍 + 产品推介"的底稿。平时零营销动作，避免打扰用户。
 *
 * ⚠️ 渠道门控（两道闸，任一不满足即返回 null → 不注册 → system prompt 与今天逐字节一致）：
 *   1) **环境开关** `VITE_SELF_PROFILE_ENABLED === 'true'`：**默认关闭**，渠道必须在 .env 显式开启。
 *      构建期只携带当前渠道的一份 about.md；官方 `agent_generic` 可读在线 overlay，OEM bundled
 *      只读包内文档并拒绝回退官方源码。默认关 = OEM 不显式 opt-in 就不注册营销能力（与
 *      brandedThinkingAnimation / brandedEcosystem 同款"OEM 默认关"纪律）。
 *   2) **文档存在** `self_profile/about` 可解析：完整性兜底；缺文档时不注册，避免读空后幻觉。
 *
 * ⚠️ `scope: 'main'`：只给受设备主人直接指挥的主 Agent。微信客服子 Agent 有自己的人设，
 * 不该带着 YoBot 的自述/推销口径说话（`profileSystemPrompt` 会替换主身份，天然不含本技能）。
 */
const REMOTE_BASE = () => (process.env.REMOTE_SERVER_URL || "").replace(/\/+$/, "");
const NON_MARKETABLE_SKILLS = new Set([
    "self_profile",
    "shell",
    "utility",
    "agent_records",
    "task_group",
    "task_subagent",
    "session",
]);
function cleanInline(value, maxLength = 200) {
    return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}
function normalizePlans(value) {
    if (!Array.isArray(value))
        return null;
    const plans = [];
    for (const raw of value) {
        if (!raw || typeof raw !== "object")
            continue;
        const p = raw;
        const name = cleanInline(p.name, 80);
        const price = p.price;
        const days = p.days;
        if (!name || typeof price !== "number" || !Number.isFinite(price) || price < 0)
            continue;
        if (typeof days !== "number" || !Number.isFinite(days) || days <= 0)
            continue;
        const originalPrice = typeof p.original_price === "number" && Number.isFinite(p.original_price)
            ? p.original_price
            : undefined;
        const giftPoints = typeof p.gift_points === "number" && Number.isFinite(p.gift_points) && p.gift_points >= 0
            ? p.gift_points
            : 0;
        const benefits = Array.isArray(p.benefits)
            ? p.benefits.map((item) => cleanInline(item)).filter(Boolean).slice(0, 20)
            : [];
        plans.push({
            id: cleanInline(p.id, 80),
            name,
            price,
            original_price: originalPrice,
            days,
            gift_points: giftPoints,
            gift_valid_days: typeof p.gift_valid_days === "number" ? p.gift_valid_days : undefined,
            benefits,
        });
        if (plans.length >= 20)
            break;
    }
    return plans;
}
function formatPlans(plans, fetchedAt) {
    if (!plans.length)
        return "暂未获取到套餐信息，可引导用户到软件「账户」页查看，或加官方客服咨询。";
    const lines = plans.map((p) => {
        const orig = p.original_price && p.original_price > p.price ? `（原价 ¥${p.original_price}）` : "";
        const gift = p.gift_points ? `，赠 ${p.gift_points} 积分` : "";
        const benefits = Array.isArray(p.benefits) && p.benefits.length ? `\n  权益：${p.benefits.join(" / ")}` : "";
        return `- ${p.name}：¥${p.price}${orig}，${p.days} 天${gift}${benefits}`;
    });
    return `当前席位套餐（实时）：\n${lines.join("\n")}\n\n数据获取时间：${fetchedAt}`;
}
function renderSelfProfile(content) {
    const values = {
        PRODUCT_NAME: process.env.SELF_PROFILE_PRODUCT_NAME ||
            process.env.VITE_BOT_NAME ||
            process.env.VITE_APP_TITLE ||
            "本产品",
        WEBSITE_URL: process.env.SELF_PROFILE_WEBSITE_URL || "（请在软件内查看）",
        DEMO_URL: process.env.SELF_PROFILE_DEMO_URL || "（请在软件内查看）",
    };
    return content.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_match, key) => values[key] ?? "（未配置）");
}
function formatCapabilities(list) {
    const seen = new Set();
    const items = list.filter((item) => {
        const name = cleanInline(item?.name, 80);
        if (!name || seen.has(name) || NON_MARKETABLE_SKILLS.has(name))
            return false;
        seen.add(name);
        return true;
    });
    if (!items.length)
        return "当前没有可对外介绍的已加载能力；不要据此编造功能。";
    const lines = items.map((item) => {
        const description = cleanInline(item.description, 240);
        return `- ${cleanInline(item.name, 80)}${description ? `：${description}` : ""}`;
    });
    return ("当前主 Agent 已加载的能力（实时）：\n" +
        lines.join("\n") +
        "\n\n请基于上述描述概括用户价值，不要逐字展示内部技能标识，也不要补充列表之外的功能。");
}
/**
 * @returns 自述文档存在则返回技能；否则 null（调用方跳过注册，实现动态门控）。
 */
export function createSelfProfileSkill(options = {}) {
    // 闸门 1：渠道环境开关（默认关；仅官方渠道 .env 显式 VITE_SELF_PROFILE_ENABLED=true）。
    if (!isSelfProfileEnabled())
        return null;
    // 闸门 2：自述文档存在（完整性兜底）。
    const onlineDocs = selfProfileUsesOnlineDocs();
    const manual = new SkillManualProvider("self_profile", "self_profile", {
        // 所有渠道共用 userData；OEM/bundled 必须完全忽略官方在线 overlay。
        includeOverlay: onlineDocs,
        // bundled 包只能读取 resources 中构建期选中的渠道文档，禁止回退仓库里的官方源码。
        includeSource: onlineDocs,
    });
    if (!manual.hasTopic("about"))
        return null;
    const selfDescribeTool = {
        definition: {
            name: "self_describe",
            description: "读取本产品「自述文档」（定位、官网、资料/演示链接、价格与政策）。" +
                "仅在用户问到价格 / 收费 / 演示 / 试用 / 续费 / 开通 / 代理 / OEM / 合作这类商务话题时调用，用于自我介绍与产品推介；" +
                '用户问积分（怎么算 / 费不费钱 / 要不要额外充值）时，传 topic:"points" 读积分规则，不要臆想。',
            parameters: {
                type: "object",
                properties: {
                    topic: {
                        type: "string",
                        description: '要读的自述子文档，默认 "about"（产品定位与政策）。' +
                            '积分相关问题传 "points"。可用主题见 "index"。',
                    },
                },
            },
        },
        execute: async (args = {}) => {
            const topic = String(args?.topic || "about").trim() || "about";
            return renderSelfProfile(await manual.getTopic(topic));
        },
    };
    const queryPointsBalanceTool = {
        definition: {
            name: "query_points_balance",
            description: "查询当前登录用户的**实时积分余额**。用户问「我还剩多少积分 / 看下余额」时调用，" +
                "只会返回余额；本工具不返回明细，" +
                "更详细的积分规则见 `self_describe({ topic: \"points\" })`。",
            parameters: { type: "object", properties: {} },
        },
        execute: async (_args, signal) => {
            const base = REMOTE_BASE();
            const llm = LLMManager.getInstance();
            const token = llm.getAuthToken();
            if (!base) {
                return "暂时无法查询积分余额（服务地址未配置）。可引导用户到软件「账户」页面查看。";
            }
            if (!token) {
                return "查询积分余额需要用户先登录。请引导用户登录后重试，或到软件「账户」页面查看。";
            }
            const ctrl = new AbortController();
            let timedOut = false;
            const onAbort = () => ctrl.abort();
            if (signal?.aborted)
                ctrl.abort();
            else
                signal?.addEventListener("abort", onAbort, { once: true });
            const timer = setTimeout(() => {
                timedOut = true;
                ctrl.abort();
            }, 10000);
            try {
                const channelId = llm.getChannelId();
                const headers = { Authorization: `Bearer ${token}` };
                if (channelId)
                    headers["X-Channel-ID"] = channelId;
                const res = await fetch(`${base}/v1/user/profile`, { headers, signal: ctrl.signal });
                if (!res.ok) {
                    return `积分余额获取失败（HTTP ${res.status}）。请不要猜测余额，可引导用户到软件「账户」页面查看。`;
                }
                const json = await res.json();
                const balance = json?.balance;
                if (typeof balance !== "number" || !Number.isFinite(balance)) {
                    console.warn("[SelfProfile] Balance response has an invalid shape.");
                    return "积分余额数据格式异常。请不要报数字，可引导用户到软件「账户」页面查看。";
                }
                // 只回余额，不外带 profile 里的手机号/昵称等身份字段。
                return (`当前积分余额（实时）：${balance} 积分\n\n` +
                    "说明：每日登录赠送的积分当天失效，不累积；逐笔消耗明细请用户在软件「账户」页面查看。");
            }
            catch (e) {
                const aborted = e?.name === "AbortError" || ctrl.signal.aborted;
                const why = aborted ? (timedOut ? "超时" : "请求已取消") : "网络异常";
                if (!aborted)
                    console.warn("[SelfProfile] Balance request failed:", e);
                return `积分余额获取失败（${why}）。请不要猜测余额，可引导用户到软件「账户」页面查看或稍后重试。`;
            }
            finally {
                clearTimeout(timer);
                signal?.removeEventListener("abort", onAbort);
            }
        },
    };
    const queryCapabilitiesTool = {
        definition: {
            name: "query_product_capabilities",
            description: "读取当前主 Agent 实际已加载的技能目录，用于在已进入产品商务咨询后，事实化回答具体有哪些能力。" +
                "不要在普通任务或非商务场景调用。",
            parameters: { type: "object", properties: {} },
        },
        execute: async () => {
            try {
                return formatCapabilities(options.listCapabilities?.() ?? []);
            }
            catch (error) {
                console.warn("[SelfProfile] Failed to list capabilities:", error);
                return "暂时无法读取当前能力目录；请不要凭记忆罗列功能，可引导用户稍后重试。";
            }
        },
    };
    const queryPricingTool = {
        definition: {
            name: "query_pricing",
            description: "查询本产品的实时席位套餐与价格（季卡/半年/年卡/企业套餐、优惠价、赠送积分、权益等）。" +
                "用户问价格 / 多少钱 / 怎么收费 / 开通 / 续费时调用，拿到权威数字再回答，**不要凭记忆报价**。",
            parameters: { type: "object", properties: {} },
        },
        execute: async (_args, signal) => {
            const base = REMOTE_BASE();
            const llm = LLMManager.getInstance();
            const token = llm.getAuthToken();
            if (!base) {
                return "暂时无法查询实时价格（服务地址未配置）。可引导用户到软件「账户」页查看套餐，或加官方客服咨询。";
            }
            if (!token) {
                return "查询实时价格需要用户先登录。请引导用户登录后重试，或到软件「账户」页查看套餐、加官方客服咨询。";
            }
            const ctrl = new AbortController();
            let timedOut = false;
            const onAbort = () => ctrl.abort();
            if (signal?.aborted)
                ctrl.abort();
            else
                signal?.addEventListener("abort", onAbort, { once: true });
            const timer = setTimeout(() => {
                timedOut = true;
                ctrl.abort();
            }, 10000);
            try {
                const channelId = llm.getChannelId();
                const headers = { Authorization: `Bearer ${token}` };
                if (channelId)
                    headers["X-Channel-ID"] = channelId;
                const res = await fetch(`${base}/v1/rpa/seat-plans`, {
                    headers,
                    signal: ctrl.signal,
                });
                if (!res.ok) {
                    return `实时价格获取失败（HTTP ${res.status}）。可引导用户到软件「账户」页查看，或稍后重试。`;
                }
                const json = await res.json();
                if (json?.success === false) {
                    return "实时价格服务暂时不可用。可引导用户到软件「账户」页查看，或稍后重试。";
                }
                const plans = normalizePlans(json?.data);
                if (!plans) {
                    console.warn("[SelfProfile] Pricing response has an invalid data shape.");
                    return "实时价格数据格式异常。请不要报价，可引导用户到软件「账户」页查看或稍后重试。";
                }
                if (json.data.length > 0 && plans.length === 0) {
                    console.warn("[SelfProfile] Pricing response contained no valid plans.");
                    return "实时价格数据暂时无法解析。请不要报价，可引导用户到软件「账户」页查看或稍后重试。";
                }
                return formatPlans(plans, new Date().toISOString());
            }
            catch (e) {
                const aborted = e?.name === "AbortError" || ctrl.signal.aborted;
                const why = aborted ? (timedOut ? "超时" : "请求已取消") : "网络异常";
                if (!aborted)
                    console.warn("[SelfProfile] Pricing request failed:", e);
                return `实时价格获取失败（${why}）。可引导用户到软件「账户」页查看，或稍后重试。`;
            }
            finally {
                clearTimeout(timer);
                signal?.removeEventListener("abort", onAbort);
            }
        },
    };
    return {
        name: "self_profile",
        description: "产品自述与实时报价：在商务话题里做自我介绍与产品推介。",
        scope: "main",
        tools: [selfDescribeTool, queryCapabilitiesTool, queryPricingTool, queryPointsBalanceTool],
        // 常驻指针（进 system prompt 的 skill instructions，缓存友好）：只描述"何时触发 + 触发后做什么"，
        // 不灌身份、不硬禁 web_search。纯商务触发，其余情况一律不启动营销动作。
        instructions: "【产品自述 / 自我销售】你有一份「自述文档」，用 `self_describe` 获取" +
            "（含产品定位、官网、资料/演示、价格与政策口径）。" +
            "**仅当**用户问到价格 / 收费 / 演示 / 续费 / 开通 / 试用 / 代理 / OEM / 合作这类**商务话题**时，" +
            "先调 `self_describe`（涉及价格再配合 `query_pricing` 取实时数字；" +
            "用户在该商务对话中追问具体能力时，用 `query_product_capabilities` 读取当前真实能力）后再组织回答；" +
            "**其余情况一律不触发**，照常用你已有的工具回答。" +
            '问到**积分**（怎么算/费不费钱/要不要充值/还剩多少）时，读 `self_describe({ topic: "points" })`，' +
            "余额用 `query_points_balance`；这些工具查不到的产品规则**一律引导加官方客服，不要推理补全**。",
    };
}
