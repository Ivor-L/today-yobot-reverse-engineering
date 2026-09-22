/**
 * 群发间隔的解析与回显。
 *
 * 为什么值得单独一个模块
 * ----------------------
 * `send_interval` 是一个**没有单位的字符串**（"3-8"），而 RPA 一律按**秒**解释
 * （`mass_sending_task.py`：`min_delay = float(parts[0])` → `asyncio.sleep(...)`）。
 * 单位只写在工具描述里，靠模型自觉换算——线上就换算错了：
 *
 *   用户： 「发送20个人力资源类的微信群，时间在 **15 到 18 分钟** 一条」
 *   agent：request_user_input(prompt: "…（发送间隔按 **15-18 秒/条**，总时长 15-18 分钟）")
 *
 * 用户要的是 5 小时慢发，agent 理解成 5 分钟发完。20 个群 15 秒一条是典型的高风控节奏，
 * 而这批用户最在意的恰恰就是封号——**这类错误的后果不可逆**，消息发出去撤不回来。
 *
 * 所以单位不能留给模型自由裁量：这里显式接受单位后缀，并把解析结果用**人话回显**，
 * 让换算错误在发出去之前就暴露在对话里。
 */
export class SendIntervalError extends Error {
}
const SECONDS_PER_UNIT = {
    s: 1, sec: 1, secs: 1, second: 1, seconds: 1, "秒": 1,
    m: 60, min: 60, mins: 60, minute: 60, minutes: 60, "分": 60, "分钟": 60,
    h: 3600, hr: 3600, hour: 3600, hours: 3600, "小时": 3600, "时": 3600,
};
const describe = (seconds) => {
    if (seconds < 60)
        return `${seconds} 秒`;
    if (seconds % 3600 === 0)
        return `${seconds / 3600} 小时`;
    if (seconds % 60 === 0)
        return `${seconds / 60} 分钟`;
    return `${(seconds / 60).toFixed(1)} 分钟`;
};
/**
 * 解析 `send_interval`。
 *
 * 接受 "3-8"（秒，向后兼容）、"15-18m"、"15-18 分钟"、"1-2h"。
 * 不带单位时按秒——这是历史契约，改掉会让存量调用静默变慢 720 倍。
 */
export function parseSendInterval(raw) {
    if (raw === undefined || raw === null)
        return undefined;
    const text = String(raw).trim();
    if (!text)
        return undefined;
    const match = text.match(/^(\d+(?:\.\d+)?)\s*[-~到至]\s*(\d+(?:\.\d+)?)\s*([a-zA-Z一-鿿]*)$/);
    if (!match) {
        throw new SendIntervalError(`send_interval 格式不对：「${text}」。用 "最小-最大"，可带单位，例如 "3-8"（秒）、"15-18m"、"15-18分钟"。`);
    }
    const [, minRaw, maxRaw, unitRaw] = match;
    const unit = (unitRaw || "s").toLowerCase();
    const factor = SECONDS_PER_UNIT[unit];
    if (!factor) {
        throw new SendIntervalError(`send_interval 的单位「${unitRaw}」不认识。可用：s/秒、m/分钟、h/小时（不写单位按秒）。`);
    }
    const minSeconds = Math.round(Number(minRaw) * factor);
    const maxSeconds = Math.round(Number(maxRaw) * factor);
    if (!(minSeconds > 0) || !(maxSeconds > 0)) {
        throw new SendIntervalError(`send_interval 必须大于 0：「${text}」。`);
    }
    if (minSeconds > maxSeconds) {
        throw new SendIntervalError(`send_interval 的最小值不能大于最大值：「${text}」。`);
    }
    return {
        wire: `${minSeconds}-${maxSeconds}`,
        minSeconds,
        maxSeconds,
        explicitUnit: Boolean(unitRaw),
        human: `每条间隔 ${describe(minSeconds)}～${describe(maxSeconds)}`,
    };
}
/**
 * 节奏太快时的风控提醒。
 *
 * 这批用户最怕的就是封号，而"发太快"是他们唯一能提前控制的变量。数字不是精确阈值，
 * 只是一条"明显偏快"的线：给模型和用户一个在发出去之前刹车的机会。
 */
export function rateLimitWarning(interval, targetCount, hasUnresolvedTags = false) {
    if (!interval)
        return undefined;
    const count = Number(targetCount);
    if (interval.minSeconds >= 60)
        return undefined;
    if (hasUnresolvedTags) {
        return `⚠️ 标签会在 RPA 中展开，当前无法预先确定目标总数；${interval.human}，节奏偏快，容易触发微信风控。`;
    }
    if (!Number.isFinite(count) || count < 10)
        return undefined;
    return `⚠️ ${count} 个目标、${interval.human}，节奏偏快，容易触发微信风控。`
        + `执行前必须把目标范围和间隔单位展示给用户确认。`;
}
