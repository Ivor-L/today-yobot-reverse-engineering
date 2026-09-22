// Supervisor `action_required` 的界面文案，按 reason_code 分流。
//
// 这里以前是 RPA.tsx 里写死的三句话：「微信需要人工登录或重新连接」/
// 「此状态不会通过重启 RPA 解决，请先在微信客户端完成登录。」/「我已登录，重新连接」——
// 不管 reason_code 是什么都照发。
//
// 线上真实后果（2026-09-04）：一个客户托管 3 个微信号，其中 2 个的微信进程被关掉，
// RPA 报的是 WECHAT_INSTANCE_NOT_FOUND，界面却让他去微信客户端完成登录。他的微信
// 开着、也登录着，照做没有任何用，只能反复重启客户端。
//
// 判定权在 RPA：reason_code 由 wechat_runtime_probe / account_online_monitor /
// 重启后账号核对三处产出（见 yokowebot supervisor_contract.py 的同名映射）。UI 只负责
// 把它翻译成一句能动手的话。
export const ACTION_REQUIRED_COPY = {
    // 只有这个码背后有确定性证据（RPA 用 mmui::LoginWindow 实测），
    // 也只有它可以让用户去扫码。其余任何码都不许提「扫码」。
    WECHAT_LOGIN_REQUIRED: {
        title: '微信未登录',
        detail: '请在微信客户端扫码登录；要换号就直接登录新的微信号。登录完成后点下面的按钮，'
            + 'BOT 会按当前登录的微信号重新连接（重启 RPA 解决不了这个状态）。',
        action: '已登录，连接微信',
    },
    WECHAT_INSTANCE_NOT_FOUND: {
        title: '有托管的微信号找不到对应的微信窗口',
        detail: '重启 RPA 不会让微信自己回来。请把这些微信重新打开，并保持窗口显示在桌面上；'
            + '如果是退出了登录或换了号，登录好微信再点下面的按钮。',
        action: '微信已就绪，重新连接',
    },
    WECHAT_INSTANCE_LOST: {
        title: '托管的微信窗口已关闭或进程已退出',
        detail: '重启 RPA 不会让微信自己回来。请重新打开该微信并保持窗口显示在桌面上；'
            + '如果是退出了登录或换了号，登录好微信再点下面的按钮。',
        action: '微信已就绪，重新连接',
    },
    WECHAT_WINDOW_LOST: {
        title: '托管的微信窗口已关闭',
        detail: '重启 RPA 不会让微信自己回来。请重新打开该微信并保持窗口显示在桌面上；'
            + '如果是退出了登录或换了号，登录好微信再点下面的按钮。',
        action: '微信已就绪，重新连接',
    },
    // 换号登录：微信开着、也登录着，只是登的是另一个号。让他「切回原账号」没有意义——
    // 换号的人本来就是要用新号（2026-09-09 线上，用户照着旧文案折腾了 2.5 小时）。
    // 出路只有一条：重新登录（重新初始化）。RPA 会把旧号退出托管，自动回复不跟着走。
    WECHAT_ACCOUNT_MISMATCH: {
        title: '当前登录的微信号与托管的不一致',
        detail: '点下面的按钮会让原来托管的微信号退出托管，改用当前登录的这个号；'
            + '自动回复不会自动跟过来，需要你之后自己重新开启。',
        action: '改用当前微信号',
    },
    // 多托管一个号（个人号顺手挂上去）不是"账号对不上"：绑定的号都在、也在线。
    // 自动回复对所有托管实例统一生效，所以必须拦——但拦的理由是"授权范围少了一个号"，
    // 说成让用户去重新登录，用户怎么做都出不来（2026-09-07 线上故障）。
    WECHAT_UNEXPECTED_ACCOUNT: {
        title: '有新托管的微信号还没纳入自动回复',
        detail: '自动回复对所有托管的微信号统一生效。请在本页重新开启一次自动回复以把它包含进来，或退出该微信号的托管。',
        action: '已处理，重新连接',
    },
    WECHAT_PARTIAL_ACCOUNTS_UNAVAILABLE: {
        title: '部分托管的微信号当前不可用',
        detail: '请逐个确认托管的微信都已打开并登录，窗口不要最小化或被完全遮挡。',
        action: '已处理，重新连接',
    },
    WECHAT_STATUS_UNKNOWN: {
        title: '暂时读不到微信的运行状态',
        detail: '请确认微信已打开并登录；若微信一切正常，稍后重试即可。',
        action: '重新连接',
    },
};
/** 未知 reason_code 的兜底：只说「需要人工处理」，不替 RPA 断言到底是哪一种。 */
export const ACTION_REQUIRED_FALLBACK = {
    title: '微信需要人工处理',
    detail: '此状态不会通过重启 RPA 解决，请按上面的提示在微信客户端处理后重试。',
    action: '已处理，重新连接',
};
/**
 * 已知码一律用本地文案，**不用** Supervisor 的 message：老版本 RPA 对所有 reason_code
 * 都只会发那句写死的「微信需要人工登录或重新连接」，认它就等于继续说错话。这样即使
 * 用户只升级 Agent、不升级 RPA 插件，文案也是对的。
 *
 * 未知码才回落到 message —— 新码是随 RPA 版本增加的，UI 不认识时应当转述 RPA 的原话，
 * 而不是自己编一个可能相反的结论。
 */
export function actionRequiredCopy(status) {
    const known = ACTION_REQUIRED_COPY[status?.reason_code || ''];
    if (known)
        return known;
    return { ...ACTION_REQUIRED_FALLBACK, title: status?.message || ACTION_REQUIRED_FALLBACK.title };
}
/**
 * 同一套判定压成一行，供工具报错 / 诊断证据使用。
 *
 * 界面能把 title / detail / action 分三处摆，模型上下文里只有一句话的位置，
 * 所以这里把 title 与 detail 接起来，并带上 reason_code —— 模型据此才能
 * 在追问时说清「是哪一种」，而不是笼统地让用户"重启试试"。
 */
export function rpaActionRequiredMessage(status) {
    const copy = actionRequiredCopy(status);
    const code = status?.reason_code ? `[${status.reason_code}] ` : '';
    return `${code}${copy.title}。${copy.detail}`;
}
