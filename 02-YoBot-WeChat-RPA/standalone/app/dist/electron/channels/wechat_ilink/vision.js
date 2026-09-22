import { MAX_SOURCE_IMAGE_BYTES, prepareSavedImageForAgent, } from "../../utils/image_context.js";
export const WECHAT_ILINK_MAX_VISION_BYTES = MAX_SOURCE_IMAGE_BYTES;
/**
 * Prepare an iLink image for the normal Agent turn without choosing or calling another model.
 * The gateway keeps the inline image for a vision-capable main model and strips it for a
 * text-only main model; the attached_file part survives either way, allowing the latter to call
 * the shared visual_understanding tool while preserving the user's selected model.
 */
export async function prepareWechatImage(params) {
    try {
        const prepared = await prepareSavedImageForAgent(params.buffer, params.filePath, {
            maxSourceBytes: WECHAT_ILINK_MAX_VISION_BYTES,
            logPrefix: "WechatIlink",
        });
        return {
            kind: "agent",
            content: prepared.content,
            originalBytes: prepared.fitted.originalBytes,
            analyzedBytes: prepared.fitted.analyzedBytes,
            resized: prepared.fitted.resized,
        };
    }
    catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.warn(`[WechatIlink] Cannot prepare image for Agent: ${reason.slice(0, 200)}`);
        return { kind: "unavailable", reason };
    }
}
