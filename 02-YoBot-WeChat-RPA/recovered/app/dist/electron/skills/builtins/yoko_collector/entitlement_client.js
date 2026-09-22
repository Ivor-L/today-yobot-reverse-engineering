// yoko_collector 付费门控客户端（P4b 步骤2，方案 A）
// 本地 agent server 进程复用 LLMManager 持有的用户 token（与 websocket.ts proxy 同一份），
// 直接调云端 /v1/store/entitlement/*。授权以服务端为准；客户端只是发起方，改不动结果。
//
// fail-open 原则：云端未配置 / 未登录 / 接口不可用 → 放行（不因基础设施问题挡住用户）；
// 真正的付费兜底在「购买」环节，门控只做最佳努力。
import { LLMManager } from "../../../agent/llm/manager.js";
const SKILL_ID = "yoko-collector";
function ctx() {
    const base = process.env.REMOTE_SERVER_URL;
    const llm = LLMManager.getInstance();
    return { base, token: llm.getAuthToken(), channelId: llm.getChannelId() };
}
async function call(path) {
    const { base, token, channelId } = ctx();
    if (!base || !token)
        return { allowed: true, reason: "no_remote_or_token" };
    try {
        const res = await fetch(`${base}${path}`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                authorization: `Bearer ${token}`,
                ...(channelId ? { "x-channel-id": channelId } : {}),
            },
            body: JSON.stringify({ skill_id: SKILL_ID }),
        });
        if (!res.ok)
            return { allowed: true, reason: `http_${res.status}` }; // 未部署/404/5xx → 放行
        const d = await res.json();
        return { allowed: !!d.allowed, type: d.type, remaining: d.remaining, paywall: d.paywall ?? null };
    }
    catch (e) {
        return { allowed: true, reason: "fetch_error" };
    }
}
/** 只读权益状态（不消耗）——用于 check 动作展示剩余次数 */
export function checkEntitlement() {
    return call("/v1/store/entitlement/check");
}
/** 门控并消耗 1 次（计量=1 个采集任务）——start 成功后调用 */
export function consumeEntitlement() {
    return call("/v1/store/entitlement/consume");
}
