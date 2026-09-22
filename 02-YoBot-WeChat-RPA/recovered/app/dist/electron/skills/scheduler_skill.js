import { scheduler } from "../scheduler/scheduler.js";
import { getContext, requestRunTermination } from "../utils/context.js";
import { Cron } from "croner";
import { SCHEDULER_TIMEZONE, isSchedulerSession, isValidTimeZone, parseSchedulerDateTime, scheduleTimeZone, tzLabel, } from "../scheduler/types.js";
import { findRun, readAllRuns, readRuns } from "../scheduler/runs_store.js";
import { submitCronOutcome, validateCronOutputContract } from "../scheduler/outcome.js";
import { cronReadOnlyMutationError, isClearlyReadOnlyCronRequest, } from "../scheduler/mutation_intent.js";
import { SkillManualProvider } from "./utils/manual_provider.js";
const schedulerManualProvider = new SkillManualProvider("scheduler");
const schedulerManualBaseTool = schedulerManualProvider.getManualTool("In ordinary chat, before creating or changing a scheduled task whose user-visible output must obey a strict format, MUST read topic 'output_contract_sop'. Users describe the result in natural language; never ask them for payload/output_contract field names. Do not use this manual for immediate non-scheduled answers or during a scheduled run.");
const schedulerManualTool = {
    definition: schedulerManualBaseTool.definition,
    execute: async (args, signal, context) => {
        const callContext = getContext();
        if (callContext?.channel === "scheduler" || isSchedulerSession(callContext?.sessionId)) {
            return "Error: 定时任务执行期间不读取配置 SOP；请直接执行已保存的 payload 与公开产出契约。";
        }
        return schedulerManualBaseTool.execute(args, signal, context);
    },
};
/** 任务自身的时区；未声明则用默认。 */
/**
 * 面向模型/用户的时间格式化。**永远带时区标注**。
 *
 * 此前用的是裸 `toLocaleString()`:值本身没错(进程本地时区恰是 +8),
 * 但"07:00"这个字面量在「cron 按 UTC 解释」和「cron 按本地解释」两种假设下
 * 完全相同 —— 也就是说,这个返回值**无法证伪模型的错误先验**。
 * 实测中模型据此把自己算对的结论又推翻了一次。加上标注,歧义即消失。
 */
function fmtClock(ms, tz) {
    const safeTz = isValidTimeZone(tz) ? tz : SCHEDULER_TIMEZONE;
    return new Date(ms).toLocaleString("zh-CN", { timeZone: safeTz, hour12: false });
}
function fmtWhen(ms, tz) {
    if (!ms)
        return "未排期";
    return `${fmtClock(ms, tz)}（${tzLabel(tz)}）`;
}
/**
 * 未来几次触发时刻。
 *
 * 刻意**不自己把 cron 表达式翻译成中文** —— 那需要一个小解析器,而解析器写错时
 * 给出的是"看起来很确定的错话",比不给更糟。这里直接问调度引擎要答案:
 * 连续三次的墙上时钟一模一样,周期与时点一眼可辨,且不可能与真实行为不一致。
 */
function previewRuns(schedule, n = 3) {
    if (schedule.kind === "at")
        return [new Date(schedule.atMs)];
    let probe = null;
    try {
        // 不传回调 → croner 只做计算、不会真的排程,不会产生第二个执行源。
        // 时区必须与 scheduleJob 用的完全一致,否则预览与实际触发对不上。
        probe = new Cron(schedule.expr, { timezone: scheduleTimeZone(schedule) });
        return (probe.nextRuns(n) || []);
    }
    catch {
        return [];
    }
    finally {
        try {
            probe?.stop();
        }
        catch { /* 计算用实例,停不掉也无副作用 */ }
    }
}
function parseOutputContract(value) {
    if (value === undefined || value === null)
        return {};
    if (typeof value !== "object" || Array.isArray(value))
        return { error: "output_contract 必须是对象" };
    const raw = value;
    const contract = {
        mode: String(raw.mode || "free_text"),
        ...(raw.min_chars !== undefined ? { minChars: Number(raw.min_chars) } : {}),
        ...(raw.max_chars !== undefined ? { maxChars: Number(raw.max_chars) } : {}),
        ...(raw.required_prefix !== undefined ? { requiredPrefix: String(raw.required_prefix) } : {}),
        ...(raw.required_suffix !== undefined ? { requiredSuffix: String(raw.required_suffix) } : {}),
        ...(Array.isArray(raw.forbidden_substrings)
            ? { forbiddenSubstrings: raw.forbidden_substrings.map(String) }
            : {}),
        ...(Array.isArray(raw.json_required_keys)
            ? { jsonRequiredKeys: raw.json_required_keys.map(String) }
            : {}),
        ...(raw.on_invalid !== undefined ? { onInvalid: String(raw.on_invalid) } : {}),
    };
    const errors = validateCronOutputContract(contract);
    return errors.length > 0 ? { error: errors.join("；") } : { contract };
}
function outputContractForTool(contract) {
    const value = contract ?? { mode: "free_text", onInvalid: "retry_once" };
    return {
        mode: value.mode,
        ...(value.minChars !== undefined ? { min_chars: value.minChars } : {}),
        ...(value.maxChars !== undefined ? { max_chars: value.maxChars } : {}),
        ...(value.requiredPrefix !== undefined ? { required_prefix: value.requiredPrefix } : {}),
        ...(value.requiredSuffix !== undefined ? { required_suffix: value.requiredSuffix } : {}),
        ...(value.forbiddenSubstrings !== undefined ? { forbidden_substrings: value.forbiddenSubstrings } : {}),
        ...(value.jsonRequiredKeys !== undefined ? { json_required_keys: value.jsonRequiredKeys } : {}),
        on_invalid: value.onInvalid || "retry_once",
    };
}
function parseExecutionPreset(kind, lookbackMinutes, current) {
    if (kind === undefined && lookbackMinutes === undefined)
        return { provided: false };
    const resolvedKind = kind === undefined ? current?.kind : String(kind);
    if (resolvedKind === "general") {
        if (lookbackMinutes !== undefined)
            return { provided: true, error: "general 模式不能设置 lookback_minutes" };
        return { provided: true, preset: undefined };
    }
    if (resolvedKind !== "bounded_sync_v1") {
        return { provided: true, error: "execution_preset 仅支持 general 或 bounded_sync_v1" };
    }
    const resolvedLookback = lookbackMinutes === undefined ? current?.lookbackMinutes : Number(lookbackMinutes);
    if (!Number.isInteger(resolvedLookback) || Number(resolvedLookback) < 1 || Number(resolvedLookback) > 1440) {
        return { provided: true, error: "bounded_sync_v1 必须设置 1~1440 的整数 lookback_minutes" };
    }
    return {
        provided: true,
        preset: { kind: "bounded_sync_v1", lookbackMinutes: Number(resolvedLookback) },
    };
}
function revisionMap(args) {
    const map = new Map();
    if (Array.isArray(args.expected_revisions)) {
        for (const item of args.expected_revisions) {
            if (!item?.job_id)
                continue;
            const revision = Number(item.revision);
            if (Number.isInteger(revision))
                map.set(String(item.job_id), revision);
        }
    }
    if (args.job_id && Number.isInteger(Number(args.expected_revision))) {
        map.set(String(args.job_id), Number(args.expected_revision));
    }
    return map;
}
/** 执行记录摘要里输出正文的展示长度。**刻意很短**，理由见 `summarizeRun`。 */
const RUN_PREVIEW_CHARS = 200;
const RUN_STATUS_LABEL = {
    ok: "✓ 成功",
    error: "✗ 失败",
    timeout: "⏱ 超时",
    skipped: "— 跳过",
};
/**
 * 一条执行记录压成一行。
 *
 * **这里绝不能返回完整输出**：本次重构的目的就是把 cron 产出从上下文里摘出去，
 * 如果"查记录"顺手把 20 次全文拉回上下文，等于换个姿势重蹈覆辙。
 * 全文必须由模型显式 `run_detail` 单条拉取——按需、有界、粒度由它自己控制。
 */
function summarizeRun(run) {
    const requestedTz = run.timezone || SCHEDULER_TIMEZONE;
    const runTz = isValidTimeZone(requestedTz) ? requestedTz : SCHEDULER_TIMEZONE;
    const when = `${fmtClock(run.startedAt, runTz)}（${tzLabel(runTz)}）`;
    const status = RUN_STATUS_LABEL[run.status] || run.status;
    const cost = run.usage?.points ? ` · ${run.usage.points} 积分` : "";
    const dur = run.durationMs ? ` · ${(run.durationMs / 1000).toFixed(1)}s` : "";
    const parts = [`[${run.runId}] ${when} ${status}${dur}${cost}`];
    // 投递失败必须出现在摘要行：这是"以为发了、其实没发"的唯一早期信号。
    if (run.delivery && run.delivery.status === "error") {
        parts.push(`  投递失败 →「${run.delivery.target}」：${run.error || run.delivery.error || "未知原因"}`);
    }
    if (run.status !== "ok" && run.error) {
        parts.push(`  错误：${String(run.error).split("\n")[0].slice(0, 200)}`);
    }
    const body = String(run.output || "").replace(/\s+/g, " ").trim();
    if (body) {
        const clipped = body.length > RUN_PREVIEW_CHARS ? `${body.slice(0, RUN_PREVIEW_CHARS)}…` : body;
        parts.push(`  产出：${clipped}`);
    }
    return parts.join("\n");
}
/**
 * `update` 可以修改哪些字段。定位用的 `job_id` / `expected_revision` **不在其中**。
 * 报错文案要引用它，所以单独列出来，避免文案和实现漂移。
 */
export const CRON_UPDATABLE_FIELDS = [
    "name",
    "payload",
    "schedule_type+time_expr（须同时提供，可选 timezone）",
    "run_timeout_minutes",
    "output_contract",
    "execution_preset（可选 lookback_minutes）",
    "account_id",
    "deliver_to_channel+deliver_to_target（须同时提供）",
];
/**
 * `create` 缺参报错。**只报实际缺的那几个。**
 *
 * 曾经这里无条件复述全部四个必填项，线上后果是模型明明已经传了 name+payload、只差
 * schedule_type/time_expr，却从文案里读出"name 和 payload 也没传"，于是一遍遍重发同样的
 * 长 payload。报错文案的职责是让调用方**收敛**，不是让它原地打转。
 */
export function cronCreateMissingParamsError(args) {
    const spec = [
        [!args.name, "name", "name（任务名）"],
        [!args.schedule_type, "schedule_type", "schedule_type（'at' 一次性 / 'cron' 周期）"],
        [!args.time_expr, "time_expr", "time_expr（cron 表达式如 '*/10 * * * *'；'at' 用时间点或相对时间如 '30m'）"],
        [!args.payload, "payload", "payload（给 Agent 的自然语言指令）"],
    ];
    const missing = spec.filter(([absent]) => absent).map(([, , label]) => label).join("、");
    const received = spec.filter(([absent]) => !absent).map(([, key]) => key).join("、");
    return `Error: 'create' 缺少必填参数：${missing}。`
        + (received ? `已收到：${received}——这些不用重传。` : "");
}
/**
 * `update` 没给出任何可改字段时的报错。
 *
 * 只说"没有提供任何要修改的字段"时，调用方无从知道 `job_id` / `expected_revision` 只是定位
 * 参数、不算修改内容——线上实测模型带着这两个参数连撞 11 次、跨 15 分钟，每次都以为自己
 * 传了东西。所以必须把可改字段直接列出来，并明说定位参数不算。
 */
export function cronUpdateNoFieldsError() {
    return "Error: 'update' 没有提供任何要修改的字段。"
        + "job_id 与 expected_revision 只用于定位任务和并发校验，不算修改内容。"
        + `可修改的字段：${CRON_UPDATABLE_FIELDS.join("、")}。`
        + "请至少带上其中一个再调一次。";
}
/** 投递目标的人话描述。缺省时顺带告诉模型这个能力存在——在它正需要的时刻。 */
function describeDelivery(deliverTo) {
    if (deliverTo?.channel === "wechat-rpa")
        return `微信 RPA →「${deliverTo.target}」`;
    return "回到创建它的对话窗口（若要发到微信好友/群，创建时带 deliver_to_channel + deliver_to_target）";
}
const schedulerTool = {
    definition: {
        name: "cron_scheduler",
        description: "Schedule tasks to run later. Supports both one-time delays (e.g., 'in 5 minutes', 'at 10:00') and recurring schedules (cron). Use this for ANY delayed task instead of waiting in the shell. " +
            "定时任务的产出**不进本会话上下文**，只落在执行记录里：用户反馈「定时任务没执行 / 执行错了 / 昨天那条发出去了吗」时，" +
            "必须先用 action:'runs' 查最近执行记录（可加 status:'error' 只看失败），**不要凭印象猜、也不要翻聊天记录找**；" +
            "需要某次完整产出再用 action:'run_detail' 单条拉取。",
        parameters: {
            type: "object",
            properties: {
                action: {
                    type: "string",
                    enum: ["create", "list", "job_detail", "update", "delete", "pause", "resume", "runs", "run_detail"],
                    description: "create/list/job_detail/update/delete 管理任务本身；修改前先 job_detail 取得完整 payload 与 revision，再用 update 原位更新，禁止删后重建；" +
                        "把存量任务迁移到 bounded_sync_v1 时，必须在同一次 update 中保留原业务/输出规则并重写 payload 的执行流水线，不能只切预设；未显式传入的排期、投递目标、账号和历史状态会保持不变；" +
                        "'pause' 暂停一个循环任务（**用户说「先停一下 / 别再跑了 / 暂停」时用它，不要用 delete**：" +
                        "删除会把执行记录转入归档、不再出现在任务列表和全局记录中（只可凭原 job_id/run_id 审计），而暂停完整保留、随时可恢复）；" +
                        "'resume' 恢复暂停的任务；" +
                        "'runs' 查执行记录摘要（排查任务是否真的跑了/跑对了的第一步）；" +
                        "'run_detail' 按 run_id 取某一次的完整产出。"
                },
                status: {
                    type: "string",
                    enum: ["ok", "error", "timeout", "skipped"],
                    description: "配合 'runs'：只看某种结局。排查故障时用 'error' 可一步命中。"
                },
                limit: {
                    type: "number",
                    description: "配合 'runs'：返回条数，默认 10，最大 50。"
                },
                run_id: {
                    type: "string",
                    description: "配合 'run_detail'：来自 'runs' 结果里方括号中的 ID。"
                },
                name: {
                    type: "string",
                    description: "Name of the job (required for 'create')."
                },
                schedule_type: {
                    type: "string",
                    enum: ["at", "cron"],
                    description: "Type of schedule: 'at' for one-time, 'cron' for recurring (required for 'create')."
                },
                time_expr: {
                    type: "string",
                    description: "'at'：'30s'/'5m'/'2h' 或 ISO 串；ISO 带 Z/offset 时表示绝对时刻，不带时按 timezone 解释。" +
                        "'cron'：5 段 `分 时 日 月 周`，" +
                        "如 '0 15 * * *'=每天15:00、'30 9 * * 1'=每周一09:30。" +
                        "小时按 timezone 解释(默认北京)，勿换算 UTC。6 段(带秒)也收，勿与 5 段混用。"
                },
                timezone: {
                    type: "string",
                    description: "IANA 时区名(如 'Asia/Tokyo')。仅当用户明说在其它时区时传；不传=北京时间。"
                },
                payload: {
                    type: "string",
                    description: "触发时交给 Agent 的**自然语言**指令(非 shell/代码)。" +
                        "已设 deliver_to_* 时只写产出什么内容，别写「用某工具发出去」，否则发两遍。" +
                        "迁移受限增量任务时应保留领域判定与 public_output 模板，只把全量读取、环境探测和临时脚本步骤改成单一有界数据源及既有程序调用；" +
                        "稳定规则已在 payload 内完整表达时，删除每轮重复读取相同 SKILL/说明文件的步骤，但不得遗漏其中独有的个性化规则。"
                },
                output_contract: {
                    type: "object",
                    description: "可选的通用公开产出契约。它只约束最终 public_output，不包含任何微信群总结/RPA 专属语义。" +
                        "缺省为 free_text。更新时传完整对象覆盖旧契约。",
                    properties: {
                        mode: { type: "string", enum: ["free_text", "text", "json"] },
                        min_chars: { type: "number", description: "最少字符数" },
                        max_chars: { type: "number", description: "最多字符数" },
                        required_prefix: { type: "string", description: "仅 text：公开正文必须从此字符串开始" },
                        required_suffix: { type: "string", description: "仅 text：公开正文必须以此字符串结束" },
                        forbidden_substrings: { type: "array", items: { type: "string" } },
                        json_required_keys: { type: "array", items: { type: "string" }, description: "仅 json：顶层必需字段" },
                        on_invalid: { type: "string", enum: ["fail", "retry_once"] },
                    },
                    required: ["mode"],
                },
                run_timeout_minutes: {
                    type: "number",
                    description: "单次执行最长分钟数，仅在任务可能包含长研究/大量 RPA 操作时传。默认 60 分钟，范围 1~1440。"
                },
                execution_preset: {
                    type: "string",
                    enum: ["general", "bounded_sync_v1"],
                    description: "可选执行预设。general=现有通用 Agent；bounded_sync_v1=周期性增量读取/清洗/推送，使用有界窗口和精简工具集。" +
                        "只有用户明确要优化此类任务时才设置，禁止按任务名或用户自动推断。" +
                        "存量任务首次切换时必须同时传入改写后的 payload：保留业务规则、空窗口回执、输出格式和投递语义；" +
                        "删除全量历史读取、目录/解释器探测、源码读取和临时脚本流程；若已有本地聊天增量程序则指定唯一精确命令，否则使用一次批量聊天读取。",
                },
                lookback_minutes: {
                    type: "integer",
                    description: "bounded_sync_v1 的增量回看窗口，1~1440。应略大于触发周期以覆盖边界，例如每30分钟任务填35。",
                },
                deliver_to_channel: {
                    type: "string",
                    enum: ["wechat-rpa"],
                    description: "产出发到哪。不填=回创建它的对话窗口。" +
                        "'wechat-rpa'=框架经微信 RPA 插件发给 deliver_to_target(非 iLink 渠道，那是入口不是目标)。" +
                        "用户要「到点在某群/给某人发提醒」必须填，否则群里收不到。"
                },
                deliver_to_target: {
                    type: "string",
                    description: "配合 wechat-rpa：微信好友昵称或群名称，须与微信中显示的完全一致。"
                },
                account_id: {
                    type: "string",
                    // 只在"任务真的会操作微信"时才提示去查账号：绝大多数定时任务（提醒、查天气、
                    // 写日报）跟微信无关，让它们每次都先调一次 wechat_list_instances 是纯浪费。
                    description: "仅当任务会做微信操作（发消息/发圈/群发/读消息）时才需要考虑：绑定用哪个微信号执行。" +
                        "此时先调 wechat_list_instances，只有一个号可省略；多个号则问用户要哪个再传，不要自己挑。" +
                        "不传则执行时会落到 RPA 的「当前活跃账号」，可能不是用户想要的号。"
                },
                job_id: {
                    type: "string",
                    description: "ID of the job to delete (optional if job_ids is provided)."
                },
                expected_revision: {
                    type: "number",
                    description: "update/delete/pause/resume 的单任务 CAS 版本，来自 job_detail/list。缺失时拒绝修改。",
                },
                job_ids: {
                    type: "array",
                    items: { type: "string" },
                    description: "批量 pause/resume/delete 的任务 ID。"
                },
                expected_revisions: {
                    type: "array",
                    description: "批量修改的 CAS 版本表，每个 job_id 都必须有一项。",
                    items: {
                        type: "object",
                        properties: {
                            job_id: { type: "string" },
                            revision: { type: "number" },
                        },
                        required: ["job_id", "revision"],
                    },
                }
            },
            required: ["action"]
        }
    },
    execute: async (args) => {
        const { action, name, schedule_type, time_expr, payload, job_id, job_ids, deliver_to_channel, deliver_to_target, timezone, status, limit, run_id, run_timeout_minutes, output_contract, execution_preset, lookback_minutes, expected_revision, account_id } = args;
        try {
            const callContext = getContext();
            const isCronExecution = callContext?.channel === "scheduler" || isSchedulerSession(callContext?.sessionId);
            const mutationActions = ["create", "update", "delete", "pause", "resume"];
            if (isCronExecution && mutationActions.includes(String(action))) {
                return "Error: 定时任务执行期间禁止再次创建、更新、删除、暂停或恢复定时任务，以防递归排期和任务自修改。请直接完成当前 payload。";
            }
            if (mutationActions.includes(String(action))
                && typeof callContext?.userText === "string"
                && isClearlyReadOnlyCronRequest(callContext.userText)) {
                return cronReadOnlyMutationError(action);
            }
            if (action === "create") {
                if (!name || !schedule_type || !time_expr || !payload) {
                    return cronCreateMissingParamsError({ name, schedule_type, time_expr, payload });
                }
                if (schedule_type !== "at" && schedule_type !== "cron") {
                    return "Error: schedule_type 必须是 'at' 或 'cron'。";
                }
                let runTimeoutMs;
                if (run_timeout_minutes !== undefined) {
                    const minutes = Number(run_timeout_minutes);
                    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440) {
                        return "Error: run_timeout_minutes 必须是 1~1440 之间的数字。";
                    }
                    runTimeoutMs = Math.round(minutes * 60_000);
                }
                const parsedContract = parseOutputContract(output_contract);
                if (parsedContract.error)
                    return `Error: ${parsedContract.error}`;
                const parsedPreset = parseExecutionPreset(execution_preset, lookback_minutes);
                if (parsedPreset.error)
                    return `Error: ${parsedPreset.error}`;
                // VALIDATION: Check for common payload mistakes (Shell commands instead of Natural Language)
                const suspiciousCommands = ['python ', 'node ', 'npm ', 'pip ', 'bash ', 'cmd ', 'powershell '];
                const trimmedPayload = payload.trim();
                if (suspiciousCommands.some(cmd => trimmedPayload.toLowerCase().startsWith(cmd))) {
                    return `Error: The 'payload' parameter MUST be a natural language instruction for the Agent (e.g., "Send a message..."), NOT a shell command. The Scheduler triggers the Agent to think and act, not a raw shell. Please rewrite the payload as a prompt.`;
                }
                let tz;
                if (timezone !== undefined && String(timezone).trim() !== "") {
                    tz = String(timezone).trim();
                    if (!isValidTimeZone(tz)) {
                        return `Error: 无效的时区 '${tz}'。请使用 IANA 时区名，如 'Asia/Shanghai'、'Asia/Tokyo'、'America/New_York'。`;
                    }
                }
                let schedule;
                if (schedule_type === "at") {
                    // Simple parsing for "1m", "10s", etc.
                    let targetTime = Date.now();
                    const relativeMatch = time_expr.match(/^(\d+)([smh])$/);
                    if (relativeMatch) {
                        const val = parseInt(relativeMatch[1]);
                        const unit = relativeMatch[2];
                        if (unit === 's')
                            targetTime += val * 1000;
                        if (unit === 'm')
                            targetTime += val * 60 * 1000;
                        if (unit === 'h')
                            targetTime += val * 60 * 60 * 1000;
                    }
                    else {
                        // Try parsing as date string
                        const parsed = parseSchedulerDateTime(time_expr, tz || SCHEDULER_TIMEZONE);
                        if (parsed !== null) {
                            if (parsed < Date.now() - 5_000) {
                                return "Error: 一次性任务的目标时间已经过去，请确认时区并提供未来时间。";
                            }
                            targetTime = parsed;
                        }
                        else {
                            return "Error: Invalid time format for 'at'. Use relative (e.g., '1m') or ISO date.";
                        }
                    }
                    schedule = tz
                        ? { kind: "at", atMs: targetTime, tz }
                        : { kind: "at", atMs: targetTime };
                }
                else {
                    // VALIDATION: Validate Cron Expression format before creating job
                    let probe = null;
                    try {
                        probe = new Cron(time_expr, { timezone: tz || SCHEDULER_TIMEZONE });
                    }
                    catch (e) {
                        return `Error: Invalid Cron expression '${time_expr}'. Please use standard cron syntax (e.g. '0 30 8 * * *' for 08:30:00). Do not use ISO time strings.`;
                    }
                    finally {
                        try {
                            probe?.stop();
                        }
                        catch { /* validation-only instance */ }
                    }
                    // 时区：不传 → 走默认(北京)；传了就必须是合法 IANA 名。
                    // 拼错时宁可报错也不能静默回落——回落等于"用户说了东京、系统按北京跑"，
                    // 而这个偏差在返回值里看不出来（两地墙上时钟都是合法值），无从发现。
                    schedule = tz
                        ? { kind: "cron", expr: time_expr, tz }
                        : { kind: "cron", expr: time_expr };
                }
                // 投递目标校验:两个参数必须成对。只给一个通常意味着模型写漏了,
                // 静默忽略会让"以为发到群里了、其实没发"再次发生——正是本次要修的病。
                let deliverTo;
                if (deliver_to_channel || deliver_to_target) {
                    if (deliver_to_channel !== "wechat-rpa") {
                        return `Error: deliver_to_channel 目前仅支持 'wechat-rpa'（微信 RPA 插件），收到 '${deliver_to_channel}'。`;
                    }
                    if (!String(deliver_to_target || "").trim()) {
                        return "Error: 指定了 deliver_to_channel='wechat-rpa' 就必须同时给 deliver_to_target（微信好友昵称或群名称）。";
                    }
                    deliverTo = { channel: "wechat-rpa", target: String(deliver_to_target).trim() };
                }
                // Get current context (if any) to store metadata
                const ctx = getContext();
                const metadata = ctx ? { channel: ctx.channel, sessionId: ctx.sessionId } : {};
                if (deliverTo)
                    metadata.deliverTo = deliverTo;
                const boundAccount = String(account_id || "").trim() || undefined;
                const job = scheduler.createJob(name, schedule, payload, Object.keys(metadata).length ? metadata : undefined, {
                    runTimeoutMs,
                    outputContract: parsedContract.contract,
                    accountId: boundAccount,
                    executionPreset: parsedPreset.preset,
                });
                // 返回值要能让人（和模型）当场发现"我的意图和实际排期对不上"。
                // 连续三次触发时刻是关键的消歧观测量:三次墙上时钟一致 → 周期与时点无可争辩。
                const jobTz = scheduleTimeZone(schedule);
                const runs = previewRuns(schedule, 3);
                const rule = schedule.kind === "cron"
                    ? `cron "${schedule.expr}"（小时按 ${tzLabel(jobTz)} 解释）`
                    : `一次性`;
                const lines = [
                    `定时任务已创建：${name}`,
                    `  ID: ${job.id}`,
                    `  规则: ${rule}`,
                    `  下次执行: ${fmtWhen(runs[0]?.getTime() ?? job.state.nextRunAt, jobTz)}`,
                ];
                if (runs.length > 1) {
                    lines.push(`  随后: ${runs.slice(1).map(d => fmtClock(d.getTime(), jobTz)).join(" / ")}`);
                }
                lines.push(`  产出投递: ${describeDelivery(deliverTo)}`);
                // 账号绑定要出现在回执里：这是用户唯一能当场发现"绑错号了"的机会，
                // 等到定时触发才发现发错号已经来不及了。
                if (job.accountId)
                    lines.push(`  执行微信号: ${job.accountId}`);
                if (job.runTimeoutMs)
                    lines.push(`  单次执行超时: ${Math.round(job.runTimeoutMs / 60_000)} 分钟`);
                if (job.outputContract)
                    lines.push(`  公开产出契约: ${job.outputContract.mode}（不合格：${job.outputContract.onInvalid || "retry_once"}）`);
                if (job.executionPreset)
                    lines.push(`  执行预设: ${job.executionPreset.kind}（回看 ${job.executionPreset.lookbackMinutes} 分钟）`);
                return lines.join("\n");
            }
            if (action === "list") {
                const jobs = scheduler.listJobs();
                if (jobs.length === 0)
                    return "No scheduled jobs found.";
                // 表头交代默认时区;个别任务若声明了别的时区,在该行单独标注,避免误读。
                const head = `已排期的定时任务（未标注者为 ${tzLabel()}）：`;
                const rows = jobs.map(j => {
                    const requestedTz = scheduleTimeZone(j.schedule);
                    const invalidTz = !isValidTimeZone(requestedTz);
                    const jTz = invalidTz ? SCHEDULER_TIMEZONE : requestedTz;
                    const kind = j.schedule.kind === "at" ? "One-time" : "Recurring";
                    const expr = j.schedule.kind === "cron" ? ` cron="${j.schedule.expr}"` : "";
                    const next = j.state.nextRunAt ? fmtClock(j.state.nextRunAt, jTz) : "未排期";
                    const tzMark = invalidTz
                        ? ` [无效时区 ${requestedTz}，任务不会执行]`
                        : (jTz === SCHEDULER_TIMEZONE ? "" : ` [${jTz}]`);
                    const dst = j.metadata?.deliverTo?.channel === "wechat-rpa"
                        ? ` → 微信RPA「${j.metadata.deliverTo.target}」`
                        : "";
                    const timeout = j.runTimeoutMs ? ` - Timeout: ${Math.round(j.runTimeoutMs / 60_000)}m` : "";
                    const contract = j.outputContract ? ` - Output: ${j.outputContract.mode}` : "";
                    const preset = j.executionPreset ? ` - Exec: ${j.executionPreset.kind}(${j.executionPreset.lookbackMinutes}m)` : "";
                    return `[${j.id}] rev=${j.revision || 1} ${j.name} - ${kind}${expr}${tzMark} - Next: ${next}${timeout}${contract}${preset}${dst}`;
                });
                return [head, ...rows].join("\n");
            }
            if (action === "job_detail") {
                if (!job_id)
                    return "Error: 'job_detail' 需要 job_id。";
                const job = scheduler.listJobs().find(item => item.id === String(job_id));
                if (!job)
                    return `没有找到 job_id=${job_id} 的定时任务。`;
                return JSON.stringify({
                    id: job.id,
                    revision: job.revision || 1,
                    name: job.name,
                    description: job.description,
                    enabled: job.enabled,
                    schedule: job.schedule,
                    payload: job.payload,
                    execution_preset: job.executionPreset?.kind || "general",
                    lookback_minutes: job.executionPreset?.lookbackMinutes,
                    run_timeout_minutes: job.runTimeoutMs ? job.runTimeoutMs / 60_000 : undefined,
                    output_contract: outputContractForTool(job.outputContract),
                    account_id: job.accountId,
                    deliver_to: job.metadata?.deliverTo,
                    created_at: job.createdAt,
                    updated_at: job.updatedAt,
                    state: job.state,
                }, null, 2);
            }
            if (action === "update") {
                if (!job_id)
                    return "Error: 'update' 需要 job_id。";
                if (!Number.isInteger(Number(expected_revision))) {
                    return "Error: 'update' 需要 expected_revision。请先 action:'job_detail' 读取最新配置与 revision。";
                }
                const current = scheduler.listJobs().find(item => item.id === String(job_id));
                if (!current)
                    return `没有找到 job_id=${job_id} 的定时任务。`;
                const patch = {};
                if (name !== undefined)
                    patch.name = String(name).trim();
                if (payload !== undefined) {
                    const value = String(payload).trim();
                    const suspiciousCommands = ['python ', 'node ', 'npm ', 'pip ', 'bash ', 'cmd ', 'powershell '];
                    if (suspiciousCommands.some(cmd => value.toLowerCase().startsWith(cmd))) {
                        return "Error: payload 必须是给 Agent 的自然语言指令，不能是 shell 命令。";
                    }
                    patch.payload = value;
                }
                if (run_timeout_minutes !== undefined) {
                    const minutes = Number(run_timeout_minutes);
                    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440) {
                        return "Error: run_timeout_minutes 必须是 1~1440 之间的数字。";
                    }
                    patch.runTimeoutMs = Math.round(minutes * 60_000);
                }
                if (output_contract !== undefined) {
                    const parsed = parseOutputContract(output_contract);
                    if (parsed.error)
                        return `Error: ${parsed.error}`;
                    patch.outputContract = parsed.contract;
                }
                const parsedPreset = parseExecutionPreset(execution_preset, lookback_minutes, current.executionPreset);
                if (parsedPreset.error)
                    return `Error: ${parsedPreset.error}`;
                if (parsedPreset.preset?.kind === "bounded_sync_v1"
                    && current.executionPreset?.kind !== "bounded_sync_v1"
                    && payload === undefined) {
                    return "Error: 存量任务首次迁移到 bounded_sync_v1 时必须在同一次 update 传入改写后的 payload；"
                        + "请保留原业务规则、空窗口回执和输出格式，只替换为单一有界取数/既有程序流水线。";
                }
                if (parsedPreset.provided)
                    patch.executionPreset = parsedPreset.preset;
                // 允许原位改绑账号（含传空串解绑）。发现绑错号时不该被迫删任务重建——
                // 重建会丢掉执行记录和交接状态。
                if (account_id !== undefined) {
                    patch.accountId = String(account_id || "").trim() || undefined;
                }
                if (schedule_type !== undefined || time_expr !== undefined || timezone !== undefined) {
                    if (!schedule_type || !time_expr) {
                        return "Error: 更新排期时 schedule_type 与 time_expr 必须同时提供。";
                    }
                    // 未显式改时区时保留原任务时区；修改时间不应顺手把东京任务重置成北京。
                    let tz = current.schedule.tz;
                    if (timezone !== undefined && String(timezone).trim()) {
                        tz = String(timezone).trim();
                        if (!isValidTimeZone(tz))
                            return `Error: 无效的时区 '${tz}'。`;
                    }
                    if (schedule_type === "at") {
                        const relativeMatch = String(time_expr).match(/^(\d+)([smh])$/);
                        let atMs;
                        if (relativeMatch) {
                            const value = Number(relativeMatch[1]);
                            const unit = relativeMatch[2];
                            atMs = Date.now() + value * (unit === "s" ? 1_000 : unit === "m" ? 60_000 : 3_600_000);
                        }
                        else {
                            const parsed = parseSchedulerDateTime(String(time_expr), tz || SCHEDULER_TIMEZONE);
                            if (parsed === null)
                                return "Error: Invalid time format for 'at'.";
                            atMs = parsed;
                        }
                        if (atMs < Date.now() - 5_000)
                            return "Error: 一次性任务的目标时间已经过去。";
                        patch.schedule = tz ? { kind: "at", atMs, tz } : { kind: "at", atMs };
                    }
                    else if (schedule_type === "cron") {
                        let probe = null;
                        try {
                            probe = new Cron(String(time_expr), { timezone: tz || SCHEDULER_TIMEZONE });
                        }
                        catch {
                            return `Error: Invalid Cron expression '${time_expr}'.`;
                        }
                        finally {
                            try {
                                probe?.stop();
                            }
                            catch { /* validation only */ }
                        }
                        patch.schedule = tz
                            ? { kind: "cron", expr: String(time_expr), tz }
                            : { kind: "cron", expr: String(time_expr) };
                    }
                    else {
                        return "Error: schedule_type 必须是 'at' 或 'cron'。";
                    }
                }
                if (deliver_to_channel !== undefined || deliver_to_target !== undefined) {
                    if (deliver_to_channel !== "wechat-rpa" || !String(deliver_to_target || "").trim()) {
                        return "Error: deliver_to_channel='wechat-rpa' 与非空 deliver_to_target 必须同时提供。";
                    }
                    patch.metadata = {
                        ...(current.metadata || {}),
                        deliverTo: { channel: "wechat-rpa", target: String(deliver_to_target).trim() },
                    };
                }
                if (Object.keys(patch).length === 0)
                    return cronUpdateNoFieldsError();
                const updated = scheduler.updateJob(String(job_id), patch, Number(expected_revision));
                if (!updated)
                    return `没有找到 job_id=${job_id} 的定时任务。`;
                return [
                    `定时任务已原位更新：${updated.name}`,
                    `  ID: ${updated.id}`,
                    `  revision: ${updated.revision}`,
                    `  下次执行: ${fmtWhen(updated.state.nextRunAt, scheduleTimeZone(updated.schedule))}`,
                    `  公开产出契约: ${updated.outputContract?.mode || "free_text"}`,
                    `  执行预设: ${updated.executionPreset
                        ? `${updated.executionPreset.kind}（回看 ${updated.executionPreset.lookbackMinutes} 分钟）`
                        : "general"}`,
                    `  执行微信号: ${updated.accountId || "未绑定（多账号时会落到当前活跃账号）"}`,
                    "  执行历史与 next_state 均已保留。",
                ].join("\n");
            }
            if (action === "runs") {
                const cap = Math.min(Math.max(Number(limit) || 10, 1), 50);
                const wanted = status ? String(status) : undefined;
                if (wanted && !["ok", "error", "timeout", "skipped"].includes(wanted)) {
                    return `Error: 无效的执行状态 '${wanted}'。`;
                }
                // job_id 优先；否则按名字模糊定位；都没有就跨任务查（"只看失败"的全局视图）。
                let targetJob = job_id ? scheduler.listJobs().find(j => j.id === job_id) : undefined;
                // 给了 job_id 却没匹配上：**绝不能静默退化成全局查询**——那会把别的任务的
                // 记录当成这个任务的答复回去，是"看起来很正常的错答案"，比报错危险得多。
                // 但记录会比任务活得久（任务删了记录仍在），所以先直接按 id 找记录。
                if (job_id && !targetJob) {
                    const orphaned = readRuns(String(job_id), 50)
                        .filter(r => !wanted || r.status === wanted)
                        .slice(0, cap);
                    if (orphaned.length > 0) {
                        const head = `任务 ${job_id}（**该任务已不在排期列表中**，以下为其历史记录）最近 ${orphaned.length} 次执行：`;
                        return [head, ...orphaned.map(summarizeRun), "", "如需完整产出，用 action:'run_detail' + run_id。"].join("\n");
                    }
                    return `没有找到 job_id=${job_id} 的定时任务，也没有它的历史执行记录。可先用 action:'list' 确认任务 ID。`;
                }
                if (!targetJob && name) {
                    const key = String(name).trim();
                    const matches = scheduler.listJobs().filter(j => j.name.includes(key));
                    if (matches.length === 0) {
                        return `没有找到名称包含「${key}」的定时任务。可先用 action:'list' 看现有任务。`;
                    }
                    if (matches.length > 1) {
                        // 不猜：选错任务会让排查结论整个跑偏，且错得毫无迹象。
                        return [
                            `名称包含「${key}」的任务有多个，请指定 job_id 后重试：`,
                            ...matches.map(j => `  [${j.id}] ${j.name}`),
                        ].join("\n");
                    }
                    targetJob = matches[0];
                }
                const runs = targetJob
                    ? readRuns(targetJob.id, 50).filter(r => !wanted || r.status === wanted).slice(0, cap)
                    : readAllRuns(cap, r => !wanted || r.status === wanted);
                const scope = targetJob ? `任务「${targetJob.name}」` : "全部定时任务";
                if (runs.length === 0) {
                    // 空结果有两种截然不同的含义，必须区分——否则模型会把"从没跑过"
                    // 说成"跑了但没问题"，或者反过来。
                    const hint = wanted
                        ? `${scope}最近没有状态为 ${wanted} 的执行记录。`
                        : `${scope}还没有任何执行记录（可能尚未到首次触发时间，或任务是在本次升级前创建的）。`;
                    return hint;
                }
                const head = `${scope}最近 ${runs.length} 次执行（每条标注任务时区，新→旧）：`;
                const tail = "如需某次的完整产出，用 action:'run_detail' + 上面方括号里的 run_id。";
                return [head, ...runs.map(summarizeRun), "", tail].join("\n");
            }
            if (action === "run_detail") {
                if (!run_id)
                    return "Error: 'run_detail' 需要 run_id（来自 action:'runs' 的结果）。";
                const run = findRun(String(run_id));
                if (!run)
                    return `没有找到 run_id=${run_id} 的执行记录（可能已被保留策略清理）。`;
                const lines = [
                    `任务：${run.jobName}（job_id=${run.jobId}）`,
                    `开始：${fmtClock(run.startedAt, run.timezone || SCHEDULER_TIMEZONE)}（${tzLabel(run.timezone && isValidTimeZone(run.timezone) ? run.timezone : SCHEDULER_TIMEZONE)}）`,
                    `结局：${RUN_STATUS_LABEL[run.status] || run.status} · 耗时 ${(run.durationMs / 1000).toFixed(1)}s` +
                        (run.usage?.points ? ` · 消耗 ${run.usage.points} 积分` : "") +
                        (run.usage?.tokens ? `（${run.usage.tokens} tokens）` : ""),
                    `触发：${run.trigger === "manual" ? "手动" : "定时"}`,
                ];
                if (run.delivery) {
                    lines.push(`投递：${run.delivery.channel} →「${run.delivery.target}」 ` +
                        `${run.delivery.status === "ok" ? "成功" : `失败（${run.delivery.error || "未知原因"}）`}`);
                }
                if (run.outcome) {
                    lines.push(`结构化终态：${run.outcome.status} · 契约 ${run.outcome.contractMode}` +
                        ` · 校验 ${run.outcome.validationAttempts} 次`, `审计摘要：${run.outcome.auditSummary}`);
                }
                if (run.error)
                    lines.push("", `错误：\n${run.error}`);
                lines.push("", `产出：\n${run.output || "（本次没有产出任何文本）"}`);
                if (run.nextState)
                    lines.push("", `交接给下次的状态：\n${run.nextState}`);
                return lines.join("\n");
            }
            if (action === "pause" || action === "resume") {
                const enable = action === "resume";
                const ids = job_ids && Array.isArray(job_ids) && job_ids.length > 0
                    ? job_ids.map(String)
                    : (job_id ? [String(job_id)] : []);
                if (ids.length === 0)
                    return `Error: '${action}' 需要 job_id 或 job_ids（可先用 action:'list' 取）。`;
                const expected = revisionMap(args);
                const currentById = new Map(scheduler.listJobs().map(job => [job.id, job]));
                const staleOrMissing = ids.flatMap(id => {
                    const current = currentById.get(id);
                    const revision = expected.get(id);
                    if (!current)
                        return [`${id}: 没有找到任务`];
                    if (!Number.isInteger(revision))
                        return [`${id}: 缺少 expected revision`];
                    if ((current.revision || 1) !== revision)
                        return [`${id}: 当前 revision=${current.revision || 1}，提交基于 ${revision}`];
                    return [];
                });
                if (staleOrMissing.length > 0) {
                    return `Error: 未执行任何修改，请先重新读取任务详情：${staleOrMissing.join("；")}`;
                }
                const done = [];
                const missing = [];
                for (const id of ids) {
                    const updated = scheduler.setJobEnabledCas(id, enable, expected.get(id));
                    if (updated)
                        done.push(`${updated.name}(${id})`);
                    else
                        missing.push(id);
                }
                const verb = enable ? "已恢复" : "已暂停";
                const lines = [];
                if (done.length > 0) {
                    lines.push(`${verb} ${done.length} 个任务：${done.join("、")}`);
                    // 用户暂停任务时最担心的就是"记录是不是也没了"，这句必须主动讲，
                    // 别等他问 —— 之前只能靠 delete 停任务，记录确实会跟着看不到。
                    if (!enable)
                        lines.push("历史执行记录完整保留，用 action:'runs' 仍可查；需要时用 action:'resume' 恢复。");
                }
                if (missing.length > 0) {
                    lines.push(`没有找到这些任务：${missing.join("、")}。可先用 action:'list' 确认 ID。`);
                }
                return lines.join("\n");
            }
            if (action === "delete") {
                const rawIds = job_ids && Array.isArray(job_ids) && job_ids.length > 0
                    ? job_ids.map(String)
                    : (job_id ? [String(job_id)] : []);
                const ids = [...new Set(rawIds)];
                if (ids.length === 0)
                    return "Error: Missing job_id or job_ids for 'delete'.";
                const expected = revisionMap(args);
                const currentById = new Map(scheduler.listJobs().map(job => [job.id, job]));
                const staleOrMissing = ids.flatMap(id => {
                    const current = currentById.get(id);
                    const revision = expected.get(id);
                    if (!current)
                        return [`${id}: 没有找到任务`];
                    if (!Number.isInteger(revision))
                        return [`${id}: 缺少 expected revision`];
                    if ((current.revision || 1) !== revision)
                        return [`${id}: 当前 revision=${current.revision || 1}，提交基于 ${revision}`];
                    return [];
                });
                if (staleOrMissing.length > 0) {
                    return `Error: 未删除任何任务，请先重新读取任务详情：${staleOrMissing.join("；")}`;
                }
                const deleted = [];
                const missing = [];
                for (const id of ids) {
                    if (scheduler.deleteJob(id, expected.get(id)))
                        deleted.push(id);
                    else
                        missing.push(id);
                }
                const lines = [];
                if (deleted.length > 0)
                    lines.push(`已删除 ${deleted.length} 个任务：${deleted.join("、")}`);
                if (missing.length > 0)
                    lines.push(`没有找到这些任务，未执行删除：${missing.join("、")}`);
                return lines.join("\n");
            }
            return "Error: Unknown action.";
        }
        catch (e) {
            return `Error executing scheduler action: ${e.message}`;
        }
    }
};
const cronCompletionTool = {
    definition: {
        name: "cron_run_complete",
        description: "[仅定时任务执行] 提交结构化终态。public_output 是唯一会交给投递器/用户的正文；" +
            "audit_summary、reason、next_state 只进入运行记录。任务结束前必须调用一次，不能用普通 final 文本代替。",
        parameters: {
            type: "object",
            properties: {
                status: {
                    type: "string",
                    enum: ["success", "skipped", "failed"],
                    description: "按事实判定，三选一，不要凭'我尽力了'给 success：" +
                        "success=本轮该做的都做完了（含'查过了、确实没有新内容'）；" +
                        "skipped=前置条件不满足、本轮本就不该产出（数据未覆盖该时间段、窗口内无事件、目标不存在），**这不是失败**；" +
                        "failed=本轮应当完成却没完成（外部依赖不可用、接口持续报错、数据损坏、投递未送达）。" +
                        "关键分界：**外部依赖不可用导致产出没送达 = failed**，哪怕识别、生成等前置步骤都已完成；" +
                        "而'检查后确认无事可做'是 success，'没有数据可据以判断'是 skipped。",
                },
                public_output: {
                    type: "string",
                    description: "只放用户应看到的最终正文；不要放核验说明、过程、思考、审计信息。这是唯一会被投递的字段，不合规会导致本轮不投递。"
                        + "**status=success 时必填且不能为空**：查过了确实没有新内容也要如实写一句（如「已检查，无新增」），"
                        + "留空会被判为本轮没有产出；本就不该产出请改用 status=skipped。",
                },
                audit_summary: {
                    type: "string",
                    description: "内部审计摘要：做了什么、用了哪些数据、结果如何；不会投递给用户。超长会被自动截断，不会导致失败。",
                },
                reason: { type: "string", description: "skipped/failed 必填的原因，不会投递给外部目标。" },
                next_state: {
                    type: "string",
                    description: "可选，给下次执行的事实状态，建议 1500 字以内。**超长由框架自动截断，不会导致本轮失败**，" +
                        "写不下时按重要性排序、最关键的放前面，不要为了压字数反复重写。" +
                        "注意：截断是从末尾砍，所以**不要把长期待办清单直接铺在这里**——" +
                        "清单、台账、待跟踪项应落到 workspace 下的文件，next_state 只写文件路径 + 本轮变化的少量易变事实。" +
                        "这样既不会因截断丢事项，下一轮也能读到完整清单。",
                },
            },
            required: ["status", "audit_summary"],
        },
    },
    execute: async (args) => {
        const result = submitCronOutcome(args);
        if (result.accepted) {
            // 提交被接受 = 本轮终局已定，框架到此就能收口。
            //
            // 下面那句"现在停止调用工具并结束本轮"从来没能省下什么：模型要"结束"也得先发一条
            // 消息，于是每次运行都白付一整轮满上下文请求，去写一段框架根本不读的旁白
            // （投递正文取自 structured.publicOutput）。线上 74/74 次运行都付了这一轮，
            // 占定时任务全部积分 3.2%，短任务里到 10.1%。所以在这里显式请求终止循环。
            //
            // 只在 accepted 分支请求：被退回时模型还需要它那唯一一次更正机会。
            requestRunTermination("cron_run_complete", "定时任务结构化终态已提交，本轮无需再问模型");
            // 规整只是留痕，不是错误：说清楚被动了什么就行，别让模型以为自己搞砸了要重来。
            const note = result.normalizations?.length
                ? `（记录面已自动规整：${result.normalizations.map(n => n.note).join("；")}，无需重新提交）`
                : "";
            return `结构化终态已提交。${note}本轮到此结束；最终自然语言回复不会被投递。`;
        }
        // 退回时必须让模型知道：**哪个**字段、**为什么**、**改哪几个就够**。
        // 原文案把所有违规都说成"公开产出未通过校验"并要求"只更正 public_output"，
        // 违规字段是别的时就是在把模型往错的方向指。
        const detail = result.errors.map(e => `- [${e.field}] ${e.message}`).join("\n");
        const fields = Array.from(new Set(result.errors.map(e => e.field))).join("、");
        if (result.retryable) {
            return `Error: 结构化终态未通过契约校验：\n${detail}\n` +
                `只需更正 ${fields}，其余字段原样重传，然后再次调用 cron_run_complete；这是唯一一次更正机会。`;
        }
        return `Error: 结构化终态已按 failed 关闭，禁止对外投递：\n${detail}\n现在结束本轮。`;
    },
};
export const schedulerSkill = {
    name: "scheduler",
    description: "Advanced scheduling capabilities for creating and managing cron jobs.",
    instructions: "普通聊天中，如果用户为定时任务提出只发正文、不要过程说明、固定开头/结尾、长度限制或 JSON 结构等严格输出要求，" +
        "先调用 scheduler_read_manual({topic:'output_contract_sop'})，再把自然语言要求转换为最小必要的 payload 与 output_contract；" +
        "不要要求用户提供内部字段。实时或非定时输出不走该 SOP。" +
        "定时任务执行上下文必须用 cron_run_complete 结束：public_output 只放公开正文，" +
        "audit_summary/reason/next_state 只放内部信息。普通聊天不要调用该工具。",
    tools: [schedulerTool, schedulerManualTool, cronCompletionTool]
};
