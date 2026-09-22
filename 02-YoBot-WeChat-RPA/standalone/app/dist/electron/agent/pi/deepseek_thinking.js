import { ConfigManager } from "../../core/config/manager.js";
/** 网关据此把上游请求体改成 `thinking: {type:"disabled"}`，见 server 的 proxy controller。 */
export const THINKING_HEADER = "x-yoko-thinking";
export const THINKING_OFF = "off";
/**
 * 用户是否在配置页关掉了 DeepSeek 深度思考。
 *
 * **省略 = 开启**，和历史行为一致：老配置文件里没有这个字段，绝不能因为读不到就
 * 把所有人的思考关掉。所以这里只认显式的 `false`。
 *
 * 为什么由客户端发头、而不是客户端直接发参数：网关（server/src/modules/proxy/controller.ts）
 * 对上游请求体是**白名单重建**的，只透传 model / messages / stream / tools / tool_choice，
 * 客户端塞在 body 里的 `thinking` 到不了 DeepSeek。而 `x-yoko-trace-id` 这条请求头
 * 是已经跑通的通道，复用它最省事，也让「翻译成哪个上游参数」这件事留在服务端——
 * 以后 DeepSeek 改参数名，改服务端即可，不用让所有客户端重新发版。
 *
 * 读配置失败一律按「开启」处理：省 token 永远不值得拿一次请求的正确性去换。
 *
 * `cfg` 只为可测：ConfigManager 是绑定运行态 userData 的单例，测试若走它会真的改用户
 * 的配置文件（第一版测试就干过这事）。判定逻辑本身是纯的，注入进来测最安全。
 */
export function isDeepSeekThinkingDisabled(cfg) {
    try {
        const resolved = cfg ?? ConfigManager.getInstance().getConfig();
        return resolved.models?.deepseekThinking === false;
    }
    catch {
        return false;
    }
}
