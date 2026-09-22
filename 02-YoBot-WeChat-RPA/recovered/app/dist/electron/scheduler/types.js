/**
 * 定时任务的**默认**时区(用户没说时区时用它)。
 *
 * 与 Pi runtime 的系统提示词 Current Time、`utility.ts` 的 get_current_time 保持一致。
 * 三处共用一个口径,是"模型能算得准"的前提——只要有一处是隐式的,
 * 模型就得靠猜,而猜错时反馈里没有任何能纠正它的信息。
 *
 * ⚠️ 这是默认值,不是硬编码死值:用户明确说了自己在别的时区时,
 * 由 `CronSchedule.tz` 覆盖(见下)。
 */
export const SCHEDULER_TIMEZONE = "Asia/Shanghai";
/** 展示用的时区后缀。所有面向模型/用户的时间输出都必须带上它。 */
export function tzLabel(tz) {
    const zone = tz || SCHEDULER_TIMEZONE;
    return zone === SCHEDULER_TIMEZONE ? "北京时间 UTC+8" : zone;
}
/** IANA 时区名是否可用。用 Intl 实际构造一次,比维护白名单可靠。 */
export function isValidTimeZone(tz) {
    try {
        new Intl.DateTimeFormat("zh-CN", { timeZone: tz });
        return true;
    }
    catch {
        return false;
    }
}
/** The IANA timezone associated with a schedule, including one-shot jobs. */
export function scheduleTimeZone(schedule) {
    return schedule.tz || SCHEDULER_TIMEZONE;
}
function wallTimeParts(ms, timeZone) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
    }).formatToParts(new Date(ms));
    const value = (type) => Number(parts.find(part => part.type === type)?.value);
    const result = {
        year: value("year"),
        month: value("month"),
        day: value("day"),
        hour: value("hour"),
        minute: value("minute"),
        second: value("second"),
    };
    return Object.values(result).every(Number.isFinite) ? result : null;
}
/**
 * Parse an ISO timestamp for scheduler input.
 *
 * ISO values carrying Z/an explicit offset are absolute instants. A value with
 * no offset is a wall-clock time in `timeZone`, rather than the host process
 * timezone. Non-existent DST wall times are rejected instead of being silently
 * shifted by an hour.
 */
export function parseSchedulerDateTime(value, timeZone = SCHEDULER_TIMEZONE) {
    const input = String(value || "").trim();
    if (!input || !isValidTimeZone(timeZone))
        return null;
    const match = input.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?(Z|[+-]\d{2}:?\d{2})?$/i);
    if (!match)
        return null;
    const wanted = {
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
        hour: Number(match[4] || 0),
        minute: Number(match[5] || 0),
        second: Number(match[6] || 0),
    };
    const millis = Number((match[7] || "").padEnd(3, "0"));
    const wantedUtc = Date.UTC(wanted.year, wanted.month - 1, wanted.day, wanted.hour, wanted.minute, wanted.second, millis);
    const calendarCheck = new Date(wantedUtc);
    if (calendarCheck.getUTCFullYear() !== wanted.year
        || calendarCheck.getUTCMonth() + 1 !== wanted.month
        || calendarCheck.getUTCDate() !== wanted.day
        || calendarCheck.getUTCHours() !== wanted.hour
        || calendarCheck.getUTCMinutes() !== wanted.minute
        || calendarCheck.getUTCSeconds() !== wanted.second)
        return null;
    if (match[8]) {
        const parsed = Date.parse(input);
        return Number.isFinite(parsed) ? parsed : null;
    }
    // Resolve zone offset iteratively. This works for non-hour offsets too.
    let candidate = wantedUtc;
    for (let i = 0; i < 4; i++) {
        const actual = wallTimeParts(candidate, timeZone);
        if (!actual)
            return null;
        const actualUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second, millis);
        const correction = wantedUtc - actualUtc;
        if (correction === 0)
            break;
        candidate += correction;
    }
    const finalParts = wallTimeParts(candidate, timeZone);
    if (!finalParts || Object.keys(wanted).some(key => finalParts[key] !== wanted[key]))
        return null;
    return candidate;
}
/**
 * 定时任务执行会话的 sessionId 前缀。
 *
 * 这是**唯一**的真源：`server.ts` 拼 sessionId、`profile/resolver.ts` 据此
 * 挂上 ephemeral 的 schedulerProfile，两边必须同源。此前它是散落在
 * `server.ts` 里的一个字面量，靠 sessionId 恰好含 `sub_` 才落到 subagent
 * profile —— 而 subagent 是 **persistent** 的，于是每个定时任务都攒出一条
 * 永不清空的时间线。命名巧合不该决定会话是否落盘。
 */
export const SCHEDULER_SESSION_PREFIX = "system__sub_scheduler_";
export function schedulerSessionId(jobId) {
    return `${SCHEDULER_SESSION_PREFIX}${jobId}`;
}
export function isSchedulerSession(sessionId) {
    return !!sessionId && sessionId.startsWith(SCHEDULER_SESSION_PREFIX);
}
/**
 * 把任务绑定的微信号注入执行 prompt。
 *
 * 放在指令区**最前面**而不是末尾：定时任务的 payload 是用户自己写的一大段自然语言，
 * 模型的注意力会被它主导；账号这种"执行前提"跟在十几条通用规则后面很容易被忽略。
 *
 * 措辞上必须同时给出 account_id 和昵称：工具要的是 id，而模型向用户汇报时要说昵称，
 * 只给一个就会出现"用对了号但报错了名"或反过来。
 *
 * 无绑定时返回空串——单账号用户和存量任务不该看到任何多余约束。
 */
export function accountBindingBlock(job) {
    const accountId = (job.accountId || "").trim();
    if (!accountId)
        return "";
    return (`\n【本任务绑定的微信账号】${accountId}\n`
        + `本任务的所有微信操作（发消息/发朋友圈/群发/读消息/改该号配置）都必须作用在这个号上：`
        + `调用需要 account_id 的 RPA 工具时一律传 "${accountId}"，不要省略、不要换号、不要依赖"当前活跃账号"。`
        + `如果该号当前不在线（工具报 UNKNOWN_ACCOUNT），如实报告并终止，**不要改用别的号执行**。\n`);
}
