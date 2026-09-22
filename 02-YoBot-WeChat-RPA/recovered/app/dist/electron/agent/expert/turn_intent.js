export const EXPERT_TURN_MODES = [
    "consult",
    "diagnose",
    "plan",
    "create",
    "revise",
    "execute",
    "ambiguous",
];
export function expertTurnIntentForMode(mode) {
    if (mode === "create" || mode === "execute") {
        return { mode, budgetClass: "long", useJobDeliverables: mode === "create" };
    }
    if (mode === "plan" || mode === "revise") {
        return { mode, budgetClass: "standard", useJobDeliverables: true };
    }
    return { mode, budgetClass: "short", useJobDeliverables: false };
}
const POLITE_PREFIX = String.raw `(?:请|请你|帮我|麻烦|劳烦|给我|替我|帮忙)?\s*`;
const EXECUTE_INTENT = new RegExp(String.raw `^${POLITE_PREFIX}(?:直接)?(?:发布|发送|上架|投放|提交|保存到|写入|删除|操作|登录|代发|群发)`, "i");
const REVISE_INTENT = new RegExp(String.raw `^${POLITE_PREFIX}(?:优化|修改|改写|润色|校对|审阅|重写|调整)`, "i");
const CREATE_INTENT = new RegExp(String.raw `^${POLITE_PREFIX}(?:写|撰写|生成|创建|制作|起草|输出|产出|设计)(?:一|这|一个|一份|一篇|一套|一组|一版|个|份|篇|套|组|版)?`, "i");
const PLAN_INTENT = new RegExp(String.raw `^${POLITE_PREFIX}(?:规划|策划|制定|安排|设计)(?:一个|一份|一套|一组|本周|下周|本月|下月)?(?:.*(?:计划|方案|策略|选题|日历|路径|节奏))?`, "i");
const AMBIGUOUS_INTENT = new RegExp(String.raw `^${POLITE_PREFIX}(?:做|搞|弄|看|处理)(?:一下|一个|个)?(?:这个|那个|公众号|小红书|电商|销售|内容|运营|项目)?[。.!！?？]?$`, "i");
const DIAGNOSE_INTENT = /(?:为什么|什么原因|原因是什么|怎么回事|哪里(?:有|出)问题|问题在哪|诊断|不稳定|忽高忽低|波动|下降|下滑|不涨|没转化|转化低|效果差|数据异常|复盘一下|分析(?:一下)?(?:原因|问题|现状|数据))/i;
const CONSULT_INTENT = /(?:如何|怎么|怎样|是否|能否|可以吗|可不可以|有什么建议|怎么看|解释一下|区别是什么|值不值得|应该怎么)/i;
/**
 * Low-regret host hint for one Expert turn.
 *
 * This is deliberately not a domain classifier and never grants tools. The Expert still checks
 * scope and may correct the hint. Its job is to stop a broad package job such as
 * "wechat-article" from silently turning a clear diagnostic question into a full artifact.
 */
export function resolveExpertTurnIntent(objective) {
    const text = objective.trim();
    let mode;
    if (EXECUTE_INTENT.test(text))
        mode = "execute";
    else if (REVISE_INTENT.test(text))
        mode = "revise";
    else if (CREATE_INTENT.test(text) || /(?:写一篇|写成(?:一篇)?[^，。！？\n]{0,12}(?:文章|笔记|文案|稿件)|整理成(?:一篇)?[^，。！？\n]{0,12}(?:文章|笔记|文案|稿件)|生成一份|给我一份|出一份|做一份|完整成稿)/i.test(text))
        mode = "create";
    else if (PLAN_INTENT.test(text) || /(?:选题规划|内容日历|运营方案|增长方案|执行计划)/i.test(text))
        mode = "plan";
    else if (AMBIGUOUS_INTENT.test(text))
        mode = "ambiguous";
    else if (DIAGNOSE_INTENT.test(text))
        mode = "diagnose";
    else if (CONSULT_INTENT.test(text) || /[?？]\s*$/.test(text))
        mode = "consult";
    else
        mode = "consult"; // Least-commitment fallback: answer instead of manufacturing an artifact.
    return expertTurnIntentForMode(mode);
}
export function expertTurnContract(intent, continuation) {
    const modeRules = {
        consult: "Answer the question directly at the requested granularity. Do not create a full plan or artifact unless explicitly requested.",
        diagnose: "Diagnose the stated problem directly. Give likely causes and actionable checks; do not turn the diagnosis into a full article or campaign.",
        plan: "Produce the requested plan, using explicit assumptions for optional missing details.",
        create: "Produce the explicitly requested artifact. Job deliverables apply only to this creation request.",
        revise: "Revise or review the supplied material rather than replacing it with an unrelated full deliverable.",
        execute: "Respect the visible capability boundary and never claim an external action completed without a successful tool result and required confirmation.",
        ambiguous: "The requested outcome is materially ambiguous. Ask exactly one concise choice question and do not use tools first.",
    };
    return [
        "[Current Expert turn contract]",
        `Host intent hint: ${intent.mode} (a bounded hint, not authority).`,
        modeRules[intent.mode],
        "The user's explicit wording and requested granularity are authoritative over broad package examples or default job deliverables.",
        "First check whether the request belongs to this Expert's domain. A clearly out-of-domain request requires one concise route-confirmation question, not a fabricated answer.",
        "If useful work can be provided with reasonable assumptions, provide it now and make any follow-up request optional rather than blocking.",
        continuation
            ? "This turn already contains the user's clarification. Do not ask another blocking question; proceed with stated assumptions."
            : "Use needs_input only when different plausible answers would produce materially different work and no useful first answer is possible.",
    ].join("\n");
}
const NEW_TASK_PREFIX = /^(?:另外|换个(?:问题|话题)|再问(?:一个|下)|新问题|顺便|先不|不用了|取消|退出|切换|回到)|^(?:请|帮我|麻烦|给我|替我)\s*(?:分析|诊断|写|生成|创建|制作|规划|策划|制定|优化|修改|解释|看看)/i;
/**
 * A pending clarification is intentionally narrow. A clear new request must start a fresh turn
 * under the same selected Expert instead of being spliced into the old objective.
 */
export function shouldConsumeExpertClarification(answer) {
    const text = answer.trim();
    if (!text)
        return false;
    if (NEW_TASK_PREFIX.test(text))
        return false;
    const intent = resolveExpertTurnIntent(text);
    if (/[?？]\s*$/.test(text) && (intent.mode === "consult" || intent.mode === "diagnose"))
        return false;
    return true;
}
