import { MAX_INLINE_IMAGE_BYTES, mimeForKind, sniffImageKind, } from "./image_bytes.js";
import { downscaleForContext } from "./image_downscale.js";
export const MAX_AGENT_IMAGES_PER_MESSAGE = 5;
export const MAX_SOURCE_IMAGE_BYTES = (() => {
    const configured = Number(process.env.YOKO_MAX_VISUAL_SOURCE_IMAGE_BYTES);
    return Number.isFinite(configured) && configured > 0
        ? configured
        : 50 * 1024 * 1024;
})();
function mb(bytes) {
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
export function attachedImageTag(filePath) {
    return `<attached_file path=${JSON.stringify(filePath)} />`;
}
/**
 * Decide which bytes may be persisted in conversation history. The original image stays on
 * disk; only the inline copy is resized or removed. This is shared by every inbound channel so
 * a large image cannot poison later turns in one channel while working correctly in another.
 */
export async function fitImageForContext(raw, savedPath, options = {}) {
    const limitBytes = options.limitBytes ?? MAX_INLINE_IMAGE_BYTES;
    const resize = options.downscale ?? downscaleForContext;
    const logPrefix = options.logPrefix || "ImageContext";
    const kind = sniffImageKind(raw) || undefined;
    const mime = kind ? mimeForKind(kind) : undefined;
    if (raw.length <= limitBytes) {
        return {
            dropped: false,
            note: "",
            originalBytes: raw.length,
            analyzedBytes: raw.length,
            resized: false,
            kind,
            mime,
        };
    }
    try {
        const shrunk = await resize(raw, limitBytes);
        if (shrunk) {
            console.log(`[${logPrefix}] Downscaled oversized image ${mb(shrunk.fromBytes)} -> ${mb(shrunk.toBytes)} `
                + `(${shrunk.width}x${shrunk.height}, ${shrunk.kind})`);
            return {
                dataUrl: `data:${shrunk.mime};base64,${shrunk.buffer.toString("base64")}`,
                dropped: false,
                note: "",
                originalBytes: raw.length,
                analyzedBytes: shrunk.buffer.length,
                resized: true,
                kind: shrunk.kind,
                mime: shrunk.mime,
            };
        }
    }
    catch (error) {
        console.error(`[${logPrefix}] Image downscale failed:`, error);
    }
    const where = savedPath ? `已保存在 ${savedPath}` : "未能保存到磁盘";
    console.warn(`[${logPrefix}] Image ${mb(raw.length)} exceeds inline limit ${mb(limitBytes)} and could not be downscaled `
        + `(kind=${kind || "unknown"}); sending path only.`);
    return {
        dropped: true,
        note: [
            attachedImageTag(savedPath || ""),
            `[系统提示] 用户上传的图片为 ${mb(raw.length)}，超过单张 ${mb(limitBytes)} 的上下文限制且无法自动压缩`,
            `（格式：${kind || "未识别"}），因此没有放进本次对话的可视内容里。原图${where}。`,
            "如果任务需要查看图片，请调用 visual_understanding 读取上述路径；不要假装已经看过图片。",
        ].join(""),
        originalBytes: raw.length,
        analyzedBytes: 0,
        resized: false,
        kind,
        mime,
    };
}
/**
 * Build the model-facing parts for an image that has already been saved below the workspace.
 * Vision-capable main models receive the safe inline copy. Text-only main models have that copy
 * stripped by the gateway but keep the attached_file path and can call visual_understanding.
 */
export async function prepareSavedImageForAgent(raw, savedPath, options = {}) {
    const maxSourceBytes = options.maxSourceBytes ?? MAX_SOURCE_IMAGE_BYTES;
    if (raw.length > maxSourceBytes) {
        throw new Error(`图片为 ${mb(raw.length)}，超过原图上限 ${mb(maxSourceBytes)}`);
    }
    const kind = sniffImageKind(raw);
    if (!kind)
        throw new Error("文件不是支持的图片格式（PNG/JPEG/GIF/WebP/BMP）");
    const fitted = await fitImageForContext(raw, savedPath, options);
    if (fitted.dropped) {
        return { content: [{ type: "text", text: fitted.note }], fitted };
    }
    const mime = fitted.mime || mimeForKind(kind);
    const dataUrl = fitted.dataUrl || `data:${mime};base64,${raw.toString("base64")}`;
    return {
        content: [
            {
                type: "image_url",
                image_url: { url: dataUrl, detail: "auto", path: savedPath },
            },
            { type: "text", text: attachedImageTag(savedPath) },
        ],
        fitted,
    };
}
