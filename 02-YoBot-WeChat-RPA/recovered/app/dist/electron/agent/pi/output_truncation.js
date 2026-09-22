/** 精确标记必须稳定：cron 执行器据此把“有正文但被截断”记为失败，而不是成功。 */
export const OUTPUT_TRUNCATION_NOTICE = "⚠️ 本次回答达到模型单次输出长度上限，内容可能不完整。请回复“继续”让我接着完成。";
export function isLengthStopReason(reason) {
    return reason === "length" || reason === "max_tokens" || reason === "max_output_tokens";
}
export function appendOutputTruncationNotice(text) {
    if (text.includes(OUTPUT_TRUNCATION_NOTICE))
        return text;
    return `${text}${text.trim() ? "\n\n" : ""}${OUTPUT_TRUNCATION_NOTICE}`;
}
export function hasOutputTruncationNotice(text) {
    return typeof text === "string" && text.includes(OUTPUT_TRUNCATION_NOTICE);
}
