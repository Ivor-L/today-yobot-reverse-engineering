import { enforceInlineImageBudget, limitHistoryTurns, pruneOrphanToolMessages, pruneOversizedImages, pruneToolResultMessages, } from "./sanitization.js";
import { MAX_HISTORY_IMAGE_BYTES, MAX_REQUEST_IMAGE_BYTES } from "../../utils/image_bytes.js";
import { stripEmptyTextParts } from "./summarization_request.js";
import { countChangedBrowserResults } from "../harness/context_projection_trace.js";
/**
 * Resolve the rollout mode. The default is shadow; explicit `false` is the kill switch.
 *
 * Projection and provider cache controls are deliberately independent. Stable is a
 * history/correctness policy and is still useful with automatic-prefix caches used
 * by domestic OpenAI-compatible providers. Explicit long-retention wire parameters
 * remain capability-gated separately in the kernel.
 */
export function resolveContextProjectionMode(options) {
    const raw = (options.requested ?? "shadow").trim().toLowerCase();
    if (["false", "0", "off", "legacy"].includes(raw)) {
        return { mode: "legacy", requested: "legacy" };
    }
    if (["", "shadow"].includes(raw)) {
        return { mode: "shadow", requested: "shadow" };
    }
    if (["true", "1", "on", "stable", "enforce"].includes(raw)) {
        return { mode: "stable", requested: "stable" };
    }
    return { mode: "shadow", requested: "shadow", fallbackReason: "invalid_config" };
}
/**
 * Build both projections from the same already protocol-sanitized input.
 * `stableMessages` never rewrites an item merely because it aged or a turn was appended;
 * its only boundary is the canonical Pi history produced by compaction.
 */
export function buildContextProjectionMessages(inputMessages, legacyTurnLimit) {
    // 超限图片必须在两条投影分叉**之前**摘掉：它是会让整个会话每一轮都失败的历史污染，
    // 与 legacy/stable 的策略差异无关，两边都不能放行。
    //
    // 两道，缺一不可：
    //   1. 单张过大（22MiB 那种）——入口降采样也救不回来，只能直接丢。
    //   2. 单张都不超限、**加起来**撑爆——线上真实事故的形态（3 × ~650KB，一张都够不到
    //      单张阈值，合计却让该会话连续 13.5 小时每轮被顶回，含纯文本的「你好」）。
    //      第 1 道是逐张比对的，天生看不见这一种。
    const singlePruned = pruneOversizedImages(inputMessages, MAX_HISTORY_IMAGE_BYTES).messages;
    const adapterSanitizedMessages = enforceInlineImageBudget(singlePruned, MAX_REQUEST_IMAGE_BYTES).messages;
    const stableDeorphaned = pruneOrphanToolMessages(adapterSanitizedMessages);
    const stableMessages = stripEmptyTextParts(stableDeorphaned.messages);
    const toolPruned = pruneToolResultMessages(adapterSanitizedMessages);
    const limited = limitHistoryTurns(toolPruned, legacyTurnLimit);
    const legacyDeorphaned = pruneOrphanToolMessages(limited);
    const legacyMessages = stripEmptyTextParts(legacyDeorphaned.messages);
    return {
        legacyMessages,
        stableMessages,
        legacy: {
            limitedUserTurns: Math.max(0, toolPruned.filter((message) => message?.role === "user").length
                - limited.filter((message) => message?.role === "user").length),
            browserSnapshotsRewritten: countChangedBrowserResults(adapterSanitizedMessages, toolPruned),
            orphanToolMessagesRemoved: Math.max(0, limited.length - legacyDeorphaned.messages.length),
        },
        stable: {
            orphanToolMessagesRemoved: Math.max(0, adapterSanitizedMessages.length - stableDeorphaned.messages.length),
        },
    };
}
