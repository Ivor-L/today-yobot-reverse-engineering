// 微信 RPA 错误的统一归因与话术。
//
// 背景（来自真实用户 trace，2026-07-20）：
//   同一个新用户、同一台机器、同一个问题问了两遍，agent 给出了互相矛盾的诊断——
//     10:57  底层返回 403 LICENSE_INVALID  → agent 说「未激活，请输入激活码」
//     11:37  底层返回 RPA_NOT_INSTALLED    → agent 说「未安装，请去插件市场安装」
//   用户按第一条去找激活入口，而插件根本没装，必然找不到。
//
//   根因不是模型幻觉，而是：底层错误文案本身就不统一，且主聊天路径上
//   【没有任何归一化】——humanizeWeChatError 当时只挂在 MCP 对外网关上。
//   模型每次拿到的是原始报错，只能临场措辞，两次自然不一样。
//
// 所以这里做两件事：
//   1. 把分类逻辑与话术集中到一处，主聊天与 MCP 网关共用同一份；
//   2. 话术写死。这类提示必须逐字稳定——用户会照着字面去找入口，
//      措辞每次不同就等于每次给一条不同的操作指引。
import { rpaEnvironmentFailureMessage } from '../../shared/rpa_platform_copy.js';
/**
 * 判定顺序即优先级，不能调换：
 *
 * 「未安装」必须先于「未激活」和「服务未运行」判断。
 * 没装插件时底层也可能返回 403/LICENSE_INVALID（授权接口拿不到本机信息），
 * 若先命中未激活分支，就会让用户去找一个根本不存在的激活入口——
 * 这正是线上真实发生过的事。
 *
 * 同理，`env_not_configured` 必须先于 `not_ready`。RPA 驱动层在读不到界面时抛的是
 * `WeChatUIAError("未找到导航工具栏（微信可能未登录或在登录页）")`（pyweixin.py），
 * 那句话里的「未登录」只是**猜测**，真实原因同样可能是 UIA/辅助功能没激活。
 * RPA 自己在 api_server.py 里是分得清的（accessibility_bootstrap 成功 → INIT_FAILED，
 * 失败 → ENV_NOT_CONFIGURED「需执行一次讲述人回退」），但这个区分不总能传到这里。
 * 若让 `/未登录/` 先命中，就会对着一个**微信开着、也确实登录了**的用户说
 * 「请确认本机已登录微信桌面版」——线上真实发生过，用户照做也没用。
 */
export function classifyRpaError(raw) {
    const s = raw || '';
    if (/RPA_NOT_INSTALLED|插件未安装|未安装.{0,6}插件|RPA.{0,8}not.?installed/i.test(s)) {
        return 'not_installed';
    }
    if (/LICENSE_INVALID|软件未激活|授权已过期|未激活|无可用席位|seat/i.test(s)) {
        return 'not_activated';
    }
    // RPA 现在会用 mmui::LoginWindow 给出确定性的登录证据（wechat_runtime_probe）。
    // 这一句必须排在 env 之前：确定性的登录结论里同样带着「未找到导航工具栏」，
    // 被 env 分支先吃掉就会把真的没扫码的用户引去开讲述人。
    // 注意匹配「停留在登录窗口」而不是裸的「登录窗口」——RPA 的反面结论
    // 「未检测到登录窗口」也含这三个字。
    if (/停留在登录窗口|请先完成扫码登录|WECHAT_LOGIN_REQUIRED/i.test(s)) {
        return 'not_ready';
    }
    if (/ENV_NOT_CONFIGURED|未找到导航工具栏|讲述人|UIA 激活失败|辅助功能/i.test(s)) {
        return 'env_not_configured';
    }
    if (/实例未初始化|未初始化|未登录|请登录|not.?logged.?in/i.test(s)) {
        return 'not_ready';
    }
    if (/Cannot reach RPA|RPA service|未启动|service is running|ECONNREFUSED|fetch failed|未运行/i.test(s)) {
        return 'not_running';
    }
    return null;
}
/**
 * 面向用户的固定话术。
 *
 * 逐字固定，不要改成"大意相同"的其它写法：用户是照着这句话去界面上找入口的。
 */
export function rpaFailureMessagesForPlatform(platform) {
    return {
        not_installed: '微信 RPA 插件尚未安装：请进入「微信 BOT」页面，下载并安装 RPA 插件后重试。',
        not_activated: '您还未激活微信 BOT：请前往「微信 BOT」页面购买并完成激活后重试。',
        // 这条不能断言"没登录"：命中它时用户往往正开着已登录的微信。只描述现象 + 给可执行步骤。
        env_not_configured: rpaEnvironmentFailureMessage(platform),
        not_ready: '微信未就绪：请确认本机已登录微信桌面版，并在「微信 BOT」页面完成初始化后重试。',
        not_running: '微信服务未运行：请确认客户端已启动（可在后台运行）后重试。',
    };
}
export const RPA_FAILURE_MESSAGES = rpaFailureMessagesForPlatform(process.platform);
/** 命中则返回统一话术，否则 null（调用方保留原始错误）。 */
export function humanizeWeChatError(raw, platform = process.platform) {
    const kind = classifyRpaError(raw);
    return kind ? rpaFailureMessagesForPlatform(platform)[kind] : null;
}
/**
 * 把任意底层错误规整成给模型看的最终文案。
 *
 * 命中已知分类时【只返回话术本身】，不再拼接原始报错——
 * 原文里那句 "403 LICENSE_INVALID" 会诱导模型自己发挥去解释错误码，
 * 而我们要的是它原样把这句话转达给用户。
 */
export function toUserFacingRpaError(raw) {
    return humanizeWeChatError(raw) ?? raw;
}
