// 抖音线索采集 —— 原生驱动工具
//
// Agent 通过本工具直接驱动用户「自己浏览器里」的采集扩展（经本地 WS 桥），
// 全程不使用 browser_action（避免拉起没有扩展的新 Chrome 窗口）。
// 该工具仅在用户已安装 yoko-collector 技能时由 server.ts 条件注册。
import * as path from "path";
import * as fs from "fs";
import { YokoBridgeHost } from "./bridge_host.js";
import { checkEntitlement, consumeEntitlement } from "./entitlement_client.js";
const LEAD_COLUMNS = [
    ["nickname", "昵称"], ["unique_id", "抖音号"], ["wechat", "微信号"], ["phone", "电话"],
    ["verify", "认证/蓝V"], ["follower_count", "粉丝数"], ["region", "地区"], ["signature", "简介"],
    ["homepage", "主页链接"], ["sec_uid", "sec_uid"], ["source_url", "来源接口"], ["captured_at", "采集时间"],
];
function extDir() {
    const base = process.env.USER_DATA_PATH || "";
    return base ? path.join(base, "skills", "yoko-collector", "extension").replace(/\\/g, "/") : "<USER_DATA>/skills/yoko-collector/extension";
}
function installGuidance(reason) {
    return JSON.stringify({
        connected: false,
        reason,
        extensionDir: extDir(),
        guidance: [
            "未检测到采集扩展连接。常见原因：① 浏览器没装/没启用扩展；② 扩展是旧版本（未内置桥接，需更新到最新包）；③ 浏览器刚开还没连上（等几秒重试 check）。",
            `安装/更新：在 Chrome 或 Edge 打开 chrome://extensions（Edge 为 edge://extensions）→ 打开右上角「开发者模式」→「加载已解压的扩展程序」→ 选择目录：${extDir()}`,
            "装好后保持该浏览器开启即可——无需打开扩展弹窗、无需任何点击，几秒内会自动连上。再让我重试。",
            "登录：在该浏览器打开 douyin.com 并登录抖音（采集依赖登录态）。",
        ],
    }, null, 2);
}
const MAX_RETURN_LEADS = 200;
let pendingTrialCharge = null;
function isTerminalState(state) {
    return state === "done" || state === "stopped" || state === "paused_risk" || state === "failed";
}
async function settlePendingTrialCharge(st) {
    if (!pendingTrialCharge || !st || !isTerminalState(st.state))
        return undefined;
    if (pendingTrialCharge.jobId && st.jobId && pendingTrialCharge.jobId !== st.jobId)
        return undefined;
    const pending = pendingTrialCharge;
    pendingTrialCharge = null;
    if (st.state !== "done") {
        return "本次采集未正常完成，未扣除免费试用次数。";
    }
    try {
        const used = await consumeEntitlement();
        if (used.type === "trial" && typeof used.remaining === "number") {
            return `本次有效采集已消耗 1 次免费试用，之后还剩 ${used.remaining} 次；用完需购买（¥99/年）。`;
        }
        if (used.type === "active")
            return undefined;
        if (used.type === "free")
            return undefined;
        return `本次有效采集已完成；试用额度状态已变化，请以技能商店显示为准。`;
    }
    catch {
        pendingTrialCharge = pending;
        return "本次采集已完成，但试用扣减服务暂不可达；请稍后检查技能商店额度。";
    }
}
async function settlePendingFromExtensionStatus(host) {
    if (!pendingTrialCharge)
        return undefined;
    const sr = await host.request("collect.status", {});
    if (!sr.ok)
        return undefined;
    return settlePendingTrialCharge(sr.data || {});
}
export const yokoCollectorBridgeSkill = {
    name: "yoko_collector_bridge",
    description: "抖音线索采集的原生驱动通道（经本地桥控制用户浏览器内的采集扩展）。当用户要在抖音按关键词批量找潜在客户的公开微信/电话时，用本工具直接驱动，不要用 browser_action。",
    metadata: { yobot: { emoji: "📇" } },
    tools: [
        {
            definition: {
                name: "yoko_collect",
                description: "驱动用户浏览器内的采集扩展进行抖音线索采集（在用户自己的 Chrome/Edge 中运行，复用其登录态、拟人滚动防风控）。" +
                    "标准流程：check 确认扩展已连接+抖音已登录 → start 传入关键词开始采集 → 反复 wait（阻塞等进度，约每 30 秒返回一次，切勿用 status 高频轮询）→ done 后 get_leads 取结构化线索。" +
                    "每个关键词的终止规则：前 3 次滚动不因相关性提前停；第 4 次起若连续 2 页相关率低于 25% 则提前切词；最多滚动 10 次，遇验证/风控自动暂停。" +
                    "★每次 start 都是一个全新任务，只采集本次传入的 keywords，并会替换掉上一个未完成的任务；用户说『再采集 X』就只传 X，不要把会话里更早的历史关键词一起带上，除非用户明确要『继续/把之前的也一起』。" +
                    "★用户中断任务或说『停止/暂停/不采了』时，立刻调用 action=stop（中断 wait 也会自动给扩展推停止）。" +
                    "严禁用 browser_action 打开浏览器去操作本扩展（会拉起没有扩展的新窗口）。采集发生在用户当前浏览器，无需用户点任何按钮。",
                parameters: {
                    type: "object",
                    properties: {
                        action: {
                            type: "string",
                            enum: ["check", "start", "wait", "status", "get_leads", "export", "stop"],
                            description: "check=检测扩展连接与抖音登录状态；start=开始采集（需 keywords）；wait=阻塞等待进度/完成（推荐，替代轮询）；status=单次查询当前进度（非阻塞，仅在需要即时快照时用）；get_leads=取已采集线索的 JSON（仅在你需要在对话里分析时用）；export=★把线索直接导出成 Excel/CSV 文件并返回路径（用户要文件就用这个，不要自己写 Python/调 shell）；stop=停止采集。",
                        },
                        format: {
                            type: "string",
                            enum: ["xlsx", "csv"],
                            description: "action=export 时的文件格式，默认 xlsx（Excel）。",
                        },
                        keywords: {
                            type: "array",
                            items: { type: "string" },
                            description: "action=start 时必填：抖音搜索关键词列表（由你把用户诉求拆成的一组词，如 ['餐饮加盟','餐饮创业']）。扩展会逐词自动搜索「用户」结果并采集。",
                        },
                        mode: {
                            type: "string",
                            enum: ["broad", "precise"],
                            description: "broad=批量铺量（默认）；precise=精准找少量账号（滚动上限更小）。",
                        },
                        maxScrollsPerKeyword: {
                            type: "number",
                            description: "可选：每个关键词的滚动上限，范围 3~10。不填时 broad=10、precise=3；第 4 次起会按相关性自动提前停止。",
                        },
                        onlyContact: {
                            type: "boolean",
                            description: "action=get_leads 时可选：true 只返回含微信或电话的线索。",
                        },
                    },
                    required: ["action"],
                },
            },
            execute: async (args, signal, context) => {
                const host = YokoBridgeHost.getInstance();
                const action = args?.action;
                switch (action) {
                    case "check": {
                        const r = await host.request("checkEnvironment", {});
                        if (!r.ok)
                            return installGuidance(r.error?.code || "EXTENSION_NOT_CONNECTED");
                        const env = r.data || {};
                        // 顺带读权益（只读不消耗），让 Agent 能告知用户试用剩余/是否需购买
                        let entitlement;
                        try {
                            const g = await checkEntitlement();
                            entitlement = g.type === "trial" ? { plan: "trial", remaining: g.remaining }
                                : g.type === "active" ? { plan: "paid" }
                                    : g.type === "blocked" ? { plan: "expired", needPurchase: true }
                                        : { plan: "free" };
                        }
                        catch { /* 忽略 */ }
                        return JSON.stringify({
                            connected: true,
                            browser: env.browser,
                            onDouyin: env.onDouyin,
                            douyinLoggedIn: env.douyinLoggedIn,
                            ready: env.ready,
                            unmet: env.unmet || [],
                            entitlement,
                            // 【门控】只有 ready 才放行 start。ready=false 时一律先让用户补齐前置条件、重新 check 到
                            // ready 后再 start——绝不能在 ready=false 时引导 start：登录态为 "unknown"（通常因未在
                            // douyin.com 页面，无法确认登录）时若贸然 start，抖音搜索页出不来，会静默卡在「等待搜索结果
                            // 加载」而不报错，用户干等数分钟以为坏了。宁可多一步登录确认，也不能踩这个静默卡死的坑。
                            guidance: env.ready
                                ? "环境就绪。可直接 action=start 传入关键词开始采集，无需用户操作。"
                                : (env.douyinLoggedIn === "no"
                                    ? "扩展已连接，但抖音未登录。请用户在该浏览器打开 douyin.com 登录，然后再次 action=check 确认 ready 为 true 后再 start。不要直接 start。"
                                    : "扩展已连接，但环境尚未就绪（未在抖音页面、登录态未确认，unmet 见上）。请让用户在该浏览器打开并登录 douyin.com，然后再次 action=check；确认返回 ready 为 true 后再 start。切勿在 ready=false 时直接 start——那样采集会静默卡在「等待搜索结果加载」，用户会误以为没在采集。"),
                        }, null, 2);
                    }
                    case "start": {
                        const keywords = Array.isArray(args.keywords)
                            ? args.keywords.map((s) => String(s).trim()).filter(Boolean)
                            : [];
                        if (!keywords.length) {
                            return JSON.stringify({ ok: false, error: "keywords 不能为空：请先把用户诉求拆成一组抖音搜索关键词再调用 start。" });
                        }
                        // 付费门控（服务端为准；云端不可达/未登录则放行）。免费/已购恒放行；试用用尽 → paywall。
                        const gate = await checkEntitlement();
                        if (!gate.allowed) {
                            return JSON.stringify({
                                ok: false, paywall: true,
                                error: "免费试用次数已用完，需购买后继续采集。",
                                pricing: gate.paywall?.pricing ?? null,
                                promo: gate.paywall?.promo ?? null,
                                hint: "明确告诉用户：抖音线索采集的免费试用已用完，请在客户端「技能商店」→ 抖音线索采集 详情页购买后再采。不要继续调用 start。",
                            }, null, 2);
                        }
                        const mode = args.mode === "precise" ? "precise" : "broad";
                        // 每词滚动上限限制在 3~10；第 4 次起由扩展按 25% 相关性阈值自动提前停止。
                        const requestedMaxScrolls = (typeof args.maxScrollsPerKeyword === "number" && args.maxScrollsPerKeyword > 0)
                            ? args.maxScrollsPerKeyword
                            : (mode === "precise" ? 3 : 10);
                        const maxScrolls = Math.min(10, Math.max(3, requestedMaxScrolls));
                        // 开新任务会替换上一任务；上一任务若尚未正常完成，不扣试用。
                        pendingTrialCharge = null;
                        host.resetStatus(); // 清掉上次任务的终止态，避免 wait 立即命中
                        const r = await host.request("collect.start", {
                            keywords, mode, maxScrollsPerKeyword: maxScrolls,
                            source: "yokoagent", user_id: context?.userId,
                        });
                        if (!r.ok) {
                            if (r.error?.code === "EXTENSION_NOT_CONNECTED")
                                return installGuidance(r.error.code);
                            return JSON.stringify({ ok: false, error: r.error });
                        }
                        let trialNote = "";
                        if (gate.type === "trial") {
                            pendingTrialCharge = { jobId: r.data?.jobId ?? null, remainingAtStart: gate.remaining };
                            trialNote = `本次为免费试用任务，当前还剩 ${gate.remaining ?? 0} 次；只有采集正常完成后才扣 1 次，未登录/风控/中断不扣。`;
                        }
                        return JSON.stringify({
                            ok: true,
                            jobId: r.data?.jobId,
                            keywords,
                            maxScrollsPerKeyword: maxScrolls,
                            trial: trialNote || undefined,
                            terminationRule: `每个关键词先至少滚动 3 次；第 4 次起若连续 2 页相关率低于 25% 会提前切词；最多滚动 ${maxScrolls} 次；${keywords.length} 个词依次采；遇验证/风控自动暂停。`,
                            next: `先用一句话把上面的终止规则和大致耗时${trialNote ? "、以及试用剩余次数" : ""}告诉用户（让用户安心，不必干等），然后调用 action=wait 等待进度——不要用 status 高频轮询。期间提醒用户不要操作该浏览器。`,
                        }, null, 2);
                    }
                    case "wait": {
                        // 关键：用户中断(abort)时,Agent 循环会被打断,但扩展是自驱动的、不会自己停。
                        // 这里监听 abort → 主动给扩展推 collect.stop,实现"终止任务即停止采集"。
                        let userAborted = false;
                        const onAbort = () => { userAborted = true; host.request("collect.stop").catch(() => { }); };
                        if (signal) {
                            if (signal.aborted)
                                onAbort();
                            else
                                signal.addEventListener("abort", onAbort, { once: true });
                        }
                        const { timedOut, status, aborted } = await host.waitForTerminal(30000, signal);
                        if (signal)
                            signal.removeEventListener("abort", onAbort);
                        if (userAborted || aborted) {
                            pendingTrialCharge = null;
                            return JSON.stringify({
                                done: true, state: "stopped", aborted: true, leads: status?.leads ?? 0,
                                billing: "本次采集已中断，未扣除免费试用次数。",
                                hint: "已收到中断,已向扩展推送停止指令,采集已停。已采集部分可用 action=get_leads 取回。",
                            }, null, 2);
                        }
                        const st = status || {};
                        const kwProg = (st.keywordTotal && st.keywordIndex != null)
                            ? `第 ${st.keywordIndex + 1}/${st.keywordTotal} 个关键词「${st.keyword || ""}」`
                            : "";
                        if (!timedOut) {
                            // 进入终止态
                            let hint = "";
                            const isLogin = /未登录|登录抖音/.test(st.message || "");
                            const billing = await settlePendingTrialCharge(st);
                            if (st.state === "done")
                                hint = "全部关键词采集完成。用 action=get_leads 取结果并向用户汇报。";
                            else if (st.state === "paused_risk" && isLogin)
                                hint = "抖音未登录，采集已自动停止。请明确提示用户在采集用的浏览器里打开 douyin.com 登录后，再重新发起采集。不要反复重试。";
                            else if (st.state === "paused_risk")
                                hint = "检测到验证/风控已自动暂停。请用户在浏览器完成验证或稍后再采，可重新 start；已采部分可 get_leads。";
                            else if (st.state === "stopped")
                                hint = "采集已停止。可用 action=get_leads 取已采集部分。";
                            else
                                hint = "任务结束。";
                            return JSON.stringify({ done: true, state: st.state, leads: st.leads ?? 0, progress: kwProg, message: st.message, billing, hint }, null, 2);
                        }
                        // 仍在进行：返回进度，让 Agent 向用户播报一次，再继续 wait
                        return JSON.stringify({
                            done: false,
                            state: st.state || "running",
                            leads: st.leads ?? 0,
                            progress: kwProg,
                            scrolls: st.scrolls ?? 0,
                            message: st.message,
                            hint: `仍在采集（${kwProg}，已采 ${st.leads ?? 0} 条）。请把这条进度简短播报给用户，然后再次 action=wait 继续等待。如需提前结束用 action=stop。`,
                        }, null, 2);
                    }
                    case "status": {
                        const r = await host.request("collect.status", {});
                        if (!r.ok) {
                            if (r.error?.code === "EXTENSION_NOT_CONNECTED")
                                return installGuidance(r.error.code);
                            return JSON.stringify({ ok: false, error: r.error });
                        }
                        const st = r.data || {};
                        const billing = isTerminalState(st.state) ? await settlePendingTrialCharge(st) : undefined;
                        let hint = "";
                        if (st.state === "running")
                            hint = "采集进行中，稍后再次 status 轮询。";
                        else if (st.state === "paused_risk")
                            hint = "扩展检测到风控/验证已自动暂停。请用户在浏览器完成验证或稍后再采，然后可重新 start。";
                        else if (st.state === "done")
                            hint = "采集完成，用 action=get_leads 取结果。";
                        else if (st.state === "stopped")
                            hint = "已停止，可用 action=get_leads 取已采集部分。";
                        else
                            hint = "当前空闲。";
                        return JSON.stringify({ ...st, billing, hint }, null, 2);
                    }
                    case "get_leads": {
                        const billing = await settlePendingFromExtensionStatus(host);
                        const r = await host.request("collect.getLeads", { onlyContact: !!args.onlyContact });
                        if (!r.ok) {
                            if (r.error?.code === "EXTENSION_NOT_CONNECTED")
                                return installGuidance(r.error.code);
                            return JSON.stringify({ ok: false, error: r.error });
                        }
                        const rows = Array.isArray(r.data) ? r.data : [];
                        const truncated = rows.length > MAX_RETURN_LEADS;
                        return JSON.stringify({
                            count: rows.length,
                            truncated,
                            leads: truncated ? rows.slice(0, MAX_RETURN_LEADS) : rows,
                            billing,
                            note: (truncated
                                ? `线索较多，仅返回前 ${MAX_RETURN_LEADS} 条用于预览/处理。`
                                : "已返回全部线索。") + " ★若用户要的是文件（Excel/CSV），不要用这些 JSON 自己写 Python/调 shell，直接调用 action=export 一步导出并把文件路径给用户。",
                        }, null, 2);
                    }
                    case "export": {
                        const billing = await settlePendingFromExtensionStatus(host);
                        const r = await host.request("collect.getLeads", { onlyContact: !!args.onlyContact });
                        if (!r.ok) {
                            if (r.error?.code === "EXTENSION_NOT_CONNECTED")
                                return installGuidance(r.error.code);
                            return JSON.stringify({ ok: false, error: r.error });
                        }
                        const rows = Array.isArray(r.data) ? r.data : [];
                        if (!rows.length)
                            return JSON.stringify({ ok: false, error: "暂无可导出的线索，请先采集后再导出。" });
                        const fmt = args.format === "csv" ? "csv" : "xlsx";
                        const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
                        const workspace = path.resolve(process.env.USER_DATA_PATH || process.cwd(), "workspace");
                        try {
                            await fs.promises.mkdir(workspace, { recursive: true });
                        }
                        catch { /* ignore */ }
                        const filePath = path.join(workspace, `yoko-leads-${ts}.${fmt}`);
                        const header = LEAD_COLUMNS.map((c) => c[1]);
                        const matrix = rows.map((row) => LEAD_COLUMNS.map((c) => row[c[0]] ?? ""));
                        try {
                            if (fmt === "csv") {
                                const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
                                const csv = "﻿" + [header, ...matrix].map((rw) => rw.map(esc).join(",")).join("\r\n");
                                await fs.promises.writeFile(filePath, csv, "utf-8");
                            }
                            else {
                                const mod = await import("xlsx");
                                const XLSX = mod.utils ? mod : (mod.default || mod);
                                const ws = XLSX.utils.aoa_to_sheet([header, ...matrix]);
                                const wb = XLSX.utils.book_new();
                                XLSX.utils.book_append_sheet(wb, ws, "线索");
                                XLSX.writeFile(wb, filePath);
                            }
                        }
                        catch (e) {
                            return JSON.stringify({ ok: false, error: `导出失败：${String(e?.message || e)}` });
                        }
                        const withContact = rows.filter((r2) => r2.wechat || r2.phone).length;
                        return JSON.stringify({
                            ok: true,
                            file: filePath,
                            format: fmt,
                            count: rows.length,
                            withContact,
                            billing,
                            hint: `已把 ${rows.length} 条线索（含联系方式 ${withContact} 条）导出到文件：${filePath}。直接把这个文件路径告诉用户即可，不要再用 Python/shell 二次处理。`,
                        }, null, 2);
                    }
                    case "stop": {
                        const r = await host.request("collect.stop", {});
                        if (!r.ok)
                            return JSON.stringify({ ok: false, error: r.error });
                        pendingTrialCharge = null;
                        return JSON.stringify({ ok: true, stopped: true, billing: "采集已停止，未扣除免费试用次数。" });
                    }
                    default:
                        return JSON.stringify({ ok: false, error: `未知 action: ${action}。可用：check / start / status / get_leads / stop。` });
                }
            },
        },
    ],
};
