// 多开场景下"这次操作用哪个微信号"的统一解析。
//
// 事故背景（线上 trace 实录，2026-08-11，客户同机多开 3 个号）：
// 客户反馈"发朋友圈总是发错号""定时任务明明选了第一个微信却发到第二个"。
// 根因不是某处把 account_id 写错了,而是这个维度在链路上被反复丢弃：
//   - 多个工具的 JSON Schema 里根本没有账号字段,模型传了也会被丢掉。日志实录：
//     模型连着两次调 wechat_get_effective_agents({account_id:"LISERVE197501"}),
//     两次都返回 lishengkejiao_1975 的配置,第三次它自己在 thinking 里写下
//     「说明工具调用的时候 account_id 参数没生效？」——然后花了三轮试图自救,
//     但工具层不收这个参数,它无论如何拿不到第二个号的状态。
//   - 有账号字段的路径又静默兜底到"当前活跃实例",而活跃实例失效时取的是
//     实例字典的插入顺序,每次 RPA 重启后由窗口枚举顺序决定。
//
// 所以这里的核心判断不是"填一个默认值",而是**多号且未指定时必须停下来问用户**：
// 兜底猜一个号 = 用错号给客户发消息/发朋友圈,是不可撤销的外部副作用。
// 单号时静默填充,多号时报错并列出候选,这条边界就是本模块存在的全部意义。
/** 账号级配置：落盘在 ~/.yokowebot/<account_id>/,必须按账号读写。 */
export const ACCOUNT_SCOPED_CONFIG_TYPES = new Set([
    'reply_strategy_v2',
    'reply_strategy',
    'friend_sync_time',
    'sync_time',
]);
/**
 * 全局配置：三个号共用一份 ~/.yokowebot/<file>.json,传账号也是同一份。
 * 列在这里是为了让工具能如实告诉用户"这一改是全账号生效"——
 * 用户以为在给某个号配转人工触发词、实际改的是所有号,是个真实的误解来源。
 */
export const GLOBAL_CONFIG_TYPES = new Set([
    'agents',
    'greeting_config',
    'chat_history_settings',
    'moment_settings',
    'friend_config',
    'alert_settings',
    'external_api_settings',
    'rest_time_settings',
    'feishu_settings',
    'sop_cache',
    'voice_settings',
    'operation_sops',
    'model_settings',
    'coze_settings',
    'dify_settings',
]);
export function isAccountScopedConfig(configType) {
    return ACCOUNT_SCOPED_CONFIG_TYPES.has(configType);
}
export class NoActiveWeChatError extends Error {
    code = 'NO_ACTIVE_WECHAT';
    constructor() {
        super('NO_ACTIVE_WECHAT: 当前没有已登录并完成初始化的微信实例。'
            + '请先让用户在客户端登录微信,再调 wechat_initialize,然后重试。'
            + '不要在无账号时硬写配置——那会落到全局默认文件,RPA 界面永远读不到。');
    }
}
/**
 * 多号但没说用哪个号。
 *
 * 这个错误是**故意**的,不要在调用方 catch 掉然后挑一个号继续：
 * 挑错号意味着用错微信身份给客户发消息或发朋友圈,不可撤销。
 * 正确处理是把 message 原样转达用户并等他选。
 */
export class AmbiguousAccountError extends Error {
    code = 'AMBIGUOUS_ACCOUNT';
    candidates;
    constructor(op, candidates) {
        const list = candidates
            .map(a => `- ${a.nickname}（account_id: ${a.accountId}）${a.isActive ? ' · 当前活跃' : ''}`)
            .join('\n');
        super(`AMBIGUOUS_ACCOUNT: 本机当前登录了 ${candidates.length} 个微信号,`
            + `而「${op}」没有指定用哪个号执行。\n`
            + `候选账号：\n${list}\n`
            + '请把这个列表念给用户、让他选一个,拿到答复后带 account_id 重新调用本工具。'
            + '**不要自己挑一个继续**——发错号是不可撤销的。'
            + '（"当前活跃"只表示 RPA 界面最后停在哪个号上,不代表用户想用它。）');
        this.candidates = candidates;
    }
}
export class UnknownAccountError extends Error {
    code = 'UNKNOWN_ACCOUNT';
    constructor(wanted, candidates) {
        const list = candidates.map(a => `${a.nickname}(${a.accountId})`).join('、') || '（无）';
        super(`UNKNOWN_ACCOUNT: 指定的 account_id「${wanted}」不在当前已登录的微信号里。`
            + `当前可用：${list}。\n`
            + '注意 wechat_list_local_users 列的是本机**历史**账号(含已退出登录的),'
            + '不能直接拿来当执行账号；要用 wechat_list_instances 的结果。');
    }
}
/** 从 /api/instances/active 的返回里提取账号列表。 */
export function parseInstances(raw) {
    const list = raw && Array.isArray(raw.instances) ? raw.instances : [];
    return list
        .filter(i => i && i.account_id)
        .map(i => ({
        accountId: String(i.account_id),
        nickname: String(i.nickname || i.account_id),
        isActive: i.is_active === true,
    }));
}
/**
 * 解析一次账号级操作的目标账号。
 *
 * @param op        操作名,只用于错误文案(让用户知道是哪一步在问他)
 * @param requested 调用方显式指定的 account_id
 * @param accounts  当前在线账号(由 listAccounts 提供)
 *
 * 规则：
 *   指定了      → 校验在线,不在线抛 UnknownAccountError
 *   没指定 + 1个 → 自动采用(单号用户完全无感)
 *   没指定 + 多个 → 抛 AmbiguousAccountError,由模型问用户
 *   一个都没有   → 抛 NoActiveWeChatError
 */
export function pickAccount(op, requested, accounts) {
    if (!accounts.length)
        throw new NoActiveWeChatError();
    if (requested) {
        const wanted = String(requested).trim();
        const hit = accounts.find(a => a.accountId === wanted)
            // 用户/模型常拿昵称当 id 传,能唯一匹配就认，避免为了一个称呼再问一轮。
            ?? (accounts.filter(a => a.nickname === wanted).length === 1
                ? accounts.find(a => a.nickname === wanted)
                : undefined);
        if (!hit)
            throw new UnknownAccountError(wanted, accounts);
        return { accountId: hit.accountId, nickname: hit.nickname, source: 'explicit' };
    }
    if (accounts.length === 1) {
        return { accountId: accounts[0].accountId, nickname: accounts[0].nickname, source: 'sole' };
    }
    throw new AmbiguousAccountError(op, accounts);
}
/** 给回包用的统一账号标识,形如「利生科教(lishengkejiao_1975)」。 */
export function describeAccount(a) {
    return `${a.nickname}(${a.accountId})`;
}
