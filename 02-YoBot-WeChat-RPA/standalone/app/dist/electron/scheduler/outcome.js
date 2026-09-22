import { getContext } from "../utils/context.js";
import { isModelErrorPlaceholder } from "../agent/pi/model_error.js";
export const CRON_RUN_CONTEXT_KEY = "cronRunControl";
/**
 * 交接状态上限。**这是唯一定义处**，落盘层（runs_store）复用它——
 * 两处各写一个 500 会让"提交时按 A 截、落盘时按 B 再截一次"，调高上限时白改。
 *
 * 1500 不是拍的：线上 24 次真实跑批的首次提交长度 p50=614、p75=704、p90=812、max=1186，
 * 原来的 500 **低于中位数**，意味着 75% 的跑批每次都在被截。而被截掉的尾部是待跟踪清单
 * （订单号、eventId、未闭环事项），不是废话——中文清单平铺追加，越靠后只是写得越晚，
 * 不代表越不重要。1500 能完整保留全部观测值，每轮多约 250 token。
 *
 * 之所以敢放宽：同一任务连续 18 次的长度是 628→688→743→…→317→565→401→431，**震荡无上升趋势**，
 * 模型每轮重写而非追加，不存在自我喂养式增长。这个限制从来不是在拦截失控，只是个当初拍的数字。
 *
 * 真正的结构性解法是"长期清单落文件、next_state 只放指针"（见 cron_run_complete 的字段说明），
 * 调大上限只是止血。
 */
export const MAX_CRON_NEXT_STATE_CHARS = 1500;
const MAX_AUDIT_SUMMARY_CHARS = 2_000;
/**
 * 字段分级——本文件所有校验强度都由它推导，不要按字段逐个拍脑袋。
 *
 * `cron_run_complete` 的定义划了一条线：**public_output 是唯一会交给投递器/用户的正文，
 * audit_summary / reason / next_state 只进入运行记录**。校验的严厉程度必须跟这条线对齐：
 *
 * - **投递面（public_output）**：内容会到达用户。违规必须 fail closed——宁可这轮不投，
 *   也不能把不合规的正文发出去。
 * - **记录面（audit_summary / reason / next_state）**：只进运行记录，写歪了的爆炸半径是零。
 *   harness 能确定性规整的（超长）就地规整，**绝不因此改变 status、更不关闭投递**。
 *
 * 之所以要写死这条规则：原实现里 audit_summary 超长走静默截断（见下方 clampChars），
 * next_state 超长却把整轮判成 failed 并关闭全部投递——两个同为记录面的字段待遇相反。
 * 线上后果（2026-08-10 单用户 92 次跑批）：21 次失败里 14 次是这么来的，其中 9 次任务
 * 本身已完整成功（41~42 个群扫完、载荷已推、HTTP 200），只因交接备注多了 8~80 个字被判死；
 * 另 5 次真实故障的原因被覆写成"输出契约校验失败"，把真因也一起埋了。
 */
export const CRON_DELIVERY_FIELDS = ["public_output"];
export const CRON_RECORD_FIELDS = ["audit_summary", "reason", "next_state"];
/**
 * 按**码点**裁剪。用 String.prototype.slice 会把 emoji 的代理对劈成半个字符，
 * 而这些字段里 emoji 很常见（群总结正文、审计摘要都带）。
 */
function clampChars(text, limit) {
    const chars = Array.from(text);
    return chars.length <= limit ? text : chars.slice(0, limit).join("");
}
function charLength(text) {
    return Array.from(text).length;
}
export function createCronRunControl(job) {
    return {
        jobId: job.id,
        outputContract: job.outputContract,
        validationAttempts: 0,
    };
}
export function cronRunControlFromContext(context = getContext()) {
    const value = context?.[CRON_RUN_CONTEXT_KEY];
    return value && typeof value === "object" ? value : undefined;
}
export function effectiveOutputContract(contract) {
    return contract ?? { mode: "free_text", onInvalid: "retry_once" };
}
function normalizeContract(contract) {
    const normalized = effectiveOutputContract(contract);
    return {
        ...normalized,
        mode: ["free_text", "text", "json"].includes(normalized.mode) ? normalized.mode : "free_text",
        onInvalid: normalized.onInvalid === "fail" ? "fail" : "retry_once",
        forbiddenSubstrings: Array.isArray(normalized.forbiddenSubstrings)
            ? normalized.forbiddenSubstrings.map(String).filter(Boolean).slice(0, 50)
            : undefined,
        jsonRequiredKeys: Array.isArray(normalized.jsonRequiredKeys)
            ? normalized.jsonRequiredKeys.map(String).filter(Boolean).slice(0, 50)
            : undefined,
    };
}
/** 纯函数，供工具入口、UI 更新校验和 smoke test 共用。 */
export function validateCronPublicOutput(output, contract) {
    const c = normalizeContract(contract);
    const errors = [];
    const length = Array.from(output).length;
    if (Number.isFinite(c.minChars) && length < Math.max(0, Number(c.minChars))) {
        errors.push(`公开产出少于最小长度 ${Math.max(0, Number(c.minChars))} 字`);
    }
    if (Number.isFinite(c.maxChars) && length > Math.max(0, Number(c.maxChars))) {
        errors.push(`公开产出超过最大长度 ${Math.max(0, Number(c.maxChars))} 字`);
    }
    if (c.mode === "text") {
        if (c.requiredPrefix && !output.startsWith(c.requiredPrefix)) {
            errors.push(`公开产出必须以「${c.requiredPrefix}」开头`);
        }
        if (c.requiredSuffix && !output.endsWith(c.requiredSuffix)) {
            errors.push(`公开产出必须以「${c.requiredSuffix}」结尾`);
        }
    }
    for (const forbidden of c.forbiddenSubstrings ?? []) {
        if (forbidden && output.includes(forbidden)) {
            errors.push(`公开产出不得包含「${forbidden}」`);
        }
    }
    if (c.mode === "json") {
        try {
            const parsed = JSON.parse(output);
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
                errors.push("公开产出必须是 JSON 对象");
            }
            else {
                for (const key of c.jsonRequiredKeys ?? []) {
                    if (!Object.prototype.hasOwnProperty.call(parsed, key)) {
                        errors.push(`JSON 顶层缺少必需字段「${key}」`);
                    }
                }
            }
        }
        catch (error) {
            errors.push(`公开产出不是合法 JSON：${String(error?.message || error)}`);
        }
    }
    return errors;
}
export function validateCronOutputContract(contract) {
    if (!contract)
        return [];
    const errors = [];
    if (!["free_text", "text", "json"].includes(contract.mode))
        errors.push("outputContract.mode 无效");
    for (const [name, value] of [["minChars", contract.minChars], ["maxChars", contract.maxChars]]) {
        if (value !== undefined && (!Number.isInteger(value) || value < 0 || value > 1_000_000)) {
            errors.push(`outputContract.${name} 必须是 0~1000000 的整数`);
        }
    }
    if (contract.minChars !== undefined && contract.maxChars !== undefined && contract.minChars > contract.maxChars) {
        errors.push("outputContract.minChars 不能大于 maxChars");
    }
    if (contract.onInvalid !== undefined && !["fail", "retry_once"].includes(contract.onInvalid)) {
        errors.push("outputContract.onInvalid 无效");
    }
    if (contract.mode !== "text" && (contract.requiredPrefix || contract.requiredSuffix)) {
        errors.push("requiredPrefix/requiredSuffix 仅可用于 text 模式");
    }
    if (contract.mode !== "json" && (contract.jsonRequiredKeys?.length ?? 0) > 0) {
        errors.push("jsonRequiredKeys 仅可用于 json 模式");
    }
    return errors;
}
function failedValidationOutcome(submission, attempts, errors) {
    return {
        status: "failed",
        publicOutput: typeof submission.public_output === "string" ? submission.public_output : undefined,
        auditSummary: clampChars(String(submission.audit_summary || "输出契约校验失败"), MAX_AUDIT_SUMMARY_CHARS),
        reason: `输出契约校验失败：${errors.map(e => e.message).join("；")}`,
        validationAttempts: attempts,
    };
}
/**
 * 接收 Agent 的结构化终态。契约错误第一次可返回工具错误让同一轮模型更正；
 * 第二次仍错误时写入 failed 终态，框架据此关闭所有对外投递。
 */
export function submitCronOutcome(submission, context = getContext()) {
    const control = cronRunControlFromContext(context);
    if (!control) {
        return {
            accepted: false,
            retryable: false,
            errors: [{ field: "context", message: "cron_run_complete 仅可在定时任务执行上下文中调用" }],
        };
    }
    if (control.outcome)
        return { accepted: true, outcome: control.outcome };
    control.validationAttempts += 1;
    const status = submission.status;
    const auditSummary = String(submission.audit_summary ?? "").trim();
    const reason = String(submission.reason ?? "").trim();
    const nextState = String(submission.next_state ?? "").trim();
    const publicOutput = typeof submission.public_output === "string"
        ? submission.public_output.trim()
        : submission.public_output == null
            ? ""
            : String(submission.public_output).trim();
    // --- 阻塞性校验：只针对投递面，外加"没有它就无法成记录"的必填项 ---
    const errors = [];
    if (!["success", "skipped", "failed"].includes(status)) {
        errors.push({ field: "status", message: `status 必须是 success、skipped 或 failed，收到的是「${String(status)}」` });
    }
    // 缺了它这条运行记录就没有可排查的内容，属于"不可规整"，只能退回。
    if (!auditSummary) {
        errors.push({ field: "audit_summary", message: "audit_summary 不能为空：请一句话写清本轮做了什么、结果如何" });
    }
    if ((status === "skipped" || status === "failed") && !reason) {
        errors.push({ field: "reason", message: `status=${status} 必须提供 reason：说明为什么没有产出/没有完成` });
    }
    if (status === "success") {
        // 「明显失败」的两条判定。刻意只有这两条,且都是确定性的、不含语义判断——
        // 严格校验的历史教训是:凡是要模型去"猜多少字算够"的规则,最后都在误杀正确产出
        // (2026-08-10 那次 21 次失败里 14 次是这么来的)。下面两条不需要任何判断力,
        // 谁看都是"这轮没产出",因此可以放心 fail;而且走的是常规 retry_once 通道,
        // 模型还有一次自己补上的机会,并不会一次就判死。
        //
        // 之所以必须拦:cron 无人值守,产出会**直接投递到客户群**。
        // status=success 且正文为空 → 记录成"✓ 成功"但用户什么都没收到,
        // 这正是"以为跑了、其实没跑"——线上真实发生过、也是用户最难自查的一类。
        if (!publicOutput) {
            errors.push({
                field: "public_output",
                message: "status=success 必须给出 public_output（这是唯一会交付给用户的正文）。"
                    + "若本轮查过了确实没有新内容，也要如实写一句（例如「已检查，无新增」），不要留空；"
                    + "若本轮本就不该产出，应改用 status=skipped 并写明 reason。",
            });
        }
        else if (isModelErrorPlaceholder(publicOutput)) {
            // 正文整段就是我们自己的模型失败占位符 = 这轮压根没生成出东西。
            // 判定收得很紧(见 isModelErrorPlaceholder),正常报告里引用这句话不会中招。
            errors.push({
                field: "public_output",
                message: "public_output 整段是系统的失败占位符，说明本轮并没有真正生成内容，不能当作成功交付。"
                    + "请重新产出真实正文；若确实无法完成，改用 status=failed 并在 reason 里写清卡在哪一步。",
            });
        }
        for (const message of validateCronPublicOutput(publicOutput, control.outputContract)) {
            errors.push({ field: "public_output", message });
        }
    }
    if (errors.length > 0) {
        const contract = normalizeContract(control.outputContract);
        const retryable = contract.onInvalid === "retry_once" && control.validationAttempts < 2;
        if (retryable)
            return { accepted: false, retryable: true, errors };
        const outcome = failedValidationOutcome(submission, control.validationAttempts, errors);
        control.outcome = outcome;
        return { accepted: false, retryable: false, errors, outcome };
    }
    // --- 记录面：能规整的就地规整，不退回给模型、不影响 status ---
    // 让模型精确数中文字数是它的已知弱项：线上 14 次"超长退回"里，模型 14 次都照做精简了，
    // 14 次仍然超限（508~742 字），没有一次靠重试救回来。harness 自己一行 slice 就能做完的事，
    // 不该拿去消耗模型的唯一一次更正机会，更不该因此判死整轮。
    const normalizations = [];
    const clampRecordField = (field, value, limit) => {
        const actual = charLength(value);
        if (actual <= limit)
            return value;
        normalizations.push({ field, note: `${field} 原 ${actual} 字，超过上限 ${limit} 字，已截断保留前 ${limit} 字` });
        return clampChars(value, limit);
    };
    const outcome = {
        status,
        publicOutput: publicOutput || undefined,
        auditSummary: clampRecordField("audit_summary", auditSummary, MAX_AUDIT_SUMMARY_CHARS),
        reason: reason || undefined,
        nextState: status === "success" && nextState
            ? clampRecordField("next_state", nextState, MAX_CRON_NEXT_STATE_CHARS)
            : undefined,
        validationAttempts: control.validationAttempts,
        normalizations: normalizations.length ? normalizations.map(n => n.note) : undefined,
    };
    control.outcome = outcome;
    return { accepted: true, outcome, normalizations: normalizations.length ? normalizations : undefined };
}
