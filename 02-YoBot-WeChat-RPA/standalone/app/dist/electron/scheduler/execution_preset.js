export const BOUNDED_SYNC_PRESET = "bounded_sync_v1";
export const MIN_SYNC_LOOKBACK_MINUTES = 1;
export const MAX_SYNC_LOOKBACK_MINUTES = 24 * 60;
/** Exact tool ceiling for the opt-in bounded sync path. The scheduler Harness itself is unchanged. */
export const BOUNDED_SYNC_ALLOWED_TOOLS = Object.freeze([
    "shell_exec",
    "fs_read_file",
    "fs_write_file",
    "get_current_time",
    "read_cached_detail",
    "wechat_get_session_messages_batch",
    "cron_run_complete",
]);
export function validateCronExecutionPreset(preset) {
    if (preset === undefined)
        return [];
    if (!preset || typeof preset !== "object" || Array.isArray(preset)) {
        return ["executionPreset 必须是对象"];
    }
    const candidate = preset;
    if (candidate.kind !== BOUNDED_SYNC_PRESET) {
        return [`executionPreset.kind 仅支持 ${BOUNDED_SYNC_PRESET}`];
    }
    const lookback = Number(candidate.lookbackMinutes);
    if (!Number.isInteger(lookback)
        || lookback < MIN_SYNC_LOOKBACK_MINUTES
        || lookback > MAX_SYNC_LOOKBACK_MINUTES) {
        return [`executionPreset.lookbackMinutes 必须是 ${MIN_SYNC_LOOKBACK_MINUTES}~${MAX_SYNC_LOOKBACK_MINUTES} 的整数`];
    }
    return [];
}
function formatMinuteInTimeZone(ms, timeZone) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(new Date(ms));
    const value = (type) => parts.find(part => part.type === type)?.value || "";
    return `${value("year")}-${value("month")}-${value("day")} ${value("hour")}:${value("minute")}`;
}
/**
 * Resolve the run-local policy. Invalid persisted config fails before entering the Agent instead
 * of silently falling back to an unrestricted run.
 */
export function resolveCronExecutionPolicy(job, startedAt, dataTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC") {
    const preset = job.executionPreset;
    if (preset === undefined)
        return { promptBlock: "" };
    const errors = validateCronExecutionPreset(preset);
    if (errors.length > 0)
        throw new Error(`定时任务执行预设无效：${errors.join("；")}`);
    const windowStart = formatMinuteInTimeZone(startedAt - preset.lookbackMinutes * 60_000, dataTimeZone);
    const windowEnd = formatMinuteInTimeZone(startedAt, dataTimeZone);
    return {
        allowedTools: [...BOUNDED_SYNC_ALLOWED_TOOLS],
        promptBlock: `\n【受限增量同步执行预设 ${BOUNDED_SYNC_PRESET}】\n`
            + `本次唯一数据窗口：${windowStart} 至 ${windowEnd}（本机聊天数据时区 ${dataTimeZone}，含 ${preset.lookbackMinutes} 分钟回看重叠）。\n`
            + `1. 原任务 payload 是业务规则、状态语义和 public_output 格式的唯一准则；本预设只约束取数和执行成本。`
            + `不得把 payload 规定的成功回执改成 skipped，不得改写用户要求的字段、顺序、措辞模板或投递目标。\n`
            + `2. 数据源二选一，禁止对同一批聊天重复取数：`
            + `若 payload 明确给出了已有的本地聊天增量扫描程序或精确命令，只按该 pipeline 执行一次，不再调用微信聊天读取工具；`
            + `否则只调用一次 wechat_get_session_messages_batch，since 必须精确传 "${windowStart}"，可按 payload 指定 sessionNames。`
            + `原始聊天清洗/转发用默认 clean_fields；只有个性化提取确实依赖额外元数据时才用 full。`
            + `按 payload 拉取一次任务状态或去重台账不算重复读取聊天，但不得用它扩展聊天时间窗口。`
            + `禁止改成今天、全天、任务创建时间或全历史。\n`
            + `3. 禁止探测式执行：不要枚举目录，不要调用 where/--help 猜环境，不要读取既有程序源码，`
            + `不要创建或修改 .py/.js/.bat/.ps1 等脚本，也不要为同一步尝试多种命令变体。`
            + `只有 payload 明确要求既有推送程序读取业务载荷时，才可写一次最终 .json/.csv 数据文件；不得写调试文件。\n`
            + `4. 工具或既有程序失败时只允许一次针对原命令的纠正重试；仍失败就如实提交 failed。`
            + `工具结果被长文本缓存时可调用 read_cached_detail 一次读取所需完整数据，不要改走其它取数路径。\n`
            + `5. 只对窗口内的新数据做 payload 要求的个性化提取、原始字段清洗或投递。`
            + `数据源成功覆盖并检查完窗口但没有新增，表示本轮已执行：优先按 payload 的空窗口模板提交 success；`
            + `payload 明确要求空窗口 skipped 时才照做。只有数据未覆盖、目标不存在或其它前置条件不满足时，才自行判为 skipped。\n`,
    };
}
