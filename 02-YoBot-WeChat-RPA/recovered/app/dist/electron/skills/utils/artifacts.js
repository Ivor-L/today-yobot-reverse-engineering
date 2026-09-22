import * as path from "path";
import { pathToFileURL } from "url";
export const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"]);
const ARTIFACT_LINE = /^::ARTIFACT::\s*(\{.*\})\s*$/gm;
// 旧约定：技能直接打印 `MEDIA: <path>`。继续识别，映射成 Artifact。
const MEDIA_LINE = /^MEDIA:\s*(.+)$/gm;
const MIME_BY_EXT = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
};
export const isImagePath = (p) => IMAGE_EXTENSIONS.has(path.extname(p).toLowerCase());
export const toFileUrl = (p) => {
    try {
        return pathToFileURL(p).href;
    }
    catch {
        return p;
    }
};
const normalize = (raw) => {
    const p = String(raw.path || "").trim();
    if (!p)
        return null;
    const image = raw.type ? raw.type === "image" : isImagePath(p);
    return {
        type: image ? "image" : "file",
        path: p,
        mime: raw.mime || MIME_BY_EXT[path.extname(p).toLowerCase()],
        title: raw.title || path.basename(p),
        bytes: raw.bytes,
    };
};
/**
 * 从工具 stdout 中抽出产物标记，返回结构化产物与清理后的文本。
 *
 * 支持两种标记，都必须独占一行：
 *   ::ARTIFACT:: {"type":"image","path":"C:/a/b.png","title":"柴犬"}
 *   MEDIA: C:/a/b.png
 */
export function parseArtifacts(output) {
    if (!output)
        return { text: "", artifacts: [] };
    const artifacts = [];
    for (const match of output.matchAll(ARTIFACT_LINE)) {
        try {
            const parsed = JSON.parse(match[1]);
            const artifact = normalize(parsed);
            if (artifact)
                artifacts.push(artifact);
        }
        catch (e) {
            // 标记写坏了不该让整个工具调用失败。但也不能静默 —— 否则症状是"图片凭空消失"，
            // 而技能作者永远看不到原因（最常见的是 Windows 路径的反斜杠没转义）。
            console.warn(`[Artifacts] Malformed ::ARTIFACT:: line, skipped: ${match[1].slice(0, 120)}`, e);
        }
    }
    for (const match of output.matchAll(MEDIA_LINE)) {
        const artifact = normalize({ path: match[1].trim() });
        if (artifact)
            artifacts.push(artifact);
    }
    // 同一路径可能既被 ::ARTIFACT:: 也被 MEDIA: 报告，去重时保留信息更全的前者。
    const deduped = new Map();
    for (const a of artifacts) {
        if (!deduped.has(a.path))
            deduped.set(a.path, a);
    }
    const text = output
        .split(/\r?\n/)
        .filter(line => !/^::ARTIFACT::/.test(line) && !/^MEDIA:\s*.+$/.test(line))
        .join("\n")
        .trim();
    return { text, artifacts: [...deduped.values()] };
}
/**
 * 给模型看的一行摘要，并明确要求它把路径告诉用户。
 *
 * 产物卡片是增强，不是唯一出口：卡片渲染失败、或用户在非 GUI 渠道（飞书、CLI）时，
 * 一句"已完成"而不给路径就等于什么都没交付。图片由 UI 负责显示，路径由模型负责说。
 */
export function summarizeArtifacts(artifacts) {
    if (artifacts.length === 0)
        return "";
    const lines = artifacts.map(a => `  - ${a.path}`).join("\n");
    const noun = artifacts.length === 1 ? "file" : "files";
    return [
        `[System] Produced ${artifacts.length} ${noun}:`,
        lines,
        `Tell the user where the ${noun} ${artifacts.length === 1 ? "is" : "are"} saved (the full path above).`,
        `Images are already displayed to the user, so do not embed them as markdown.`,
    ].join("\n");
}
