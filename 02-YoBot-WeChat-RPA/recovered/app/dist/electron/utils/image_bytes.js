/**
 * 图片字节的识别与落盘。
 *
 * 存在的理由：用户上传的图片过去只以 data URL 形式进入模型上下文，从不落盘。
 * 模型"看得见"图片，却拿不到可以交给命令行技能的文件路径——于是它会伪造一个
 * （实测它写过一个 22 字节的文本文件，取名 original_photo.jpg，内容是
 * "[保存用户上传的原始图片，此处为二进制占位]"），最终把这堆文本当图片送去生图接口。
 */
import * as fs from "fs";
import * as path from "path";
const EXT_BY_KIND = {
    png: ".png",
    jpeg: ".jpg",
    gif: ".gif",
    webp: ".webp",
    bmp: ".bmp",
};
const MIME_BY_KIND = {
    png: "image/png",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
};
/**
 * 按魔术字节判断真实图片类型。扩展名和 MIME 声明都可能撒谎，字节不会。
 */
export function sniffImageKind(buffer) {
    if (buffer.length < 12)
        return null;
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47)
        return "png";
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
        return "jpeg";
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46)
        return "gif";
    if (buffer[0] === 0x42 && buffer[1] === 0x4d)
        return "bmp";
    if (buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP")
        return "webp";
    return null;
}
export const extForKind = (kind) => EXT_BY_KIND[kind];
export const mimeForKind = (kind) => MIME_BY_KIND[kind];
/**
 * 单张图片进入模型上下文的字节上限。
 *
 * 背景（线上真实 trace，2026-08-20）：某用户 08-18 传了一张 22MiB 的图，**两天后**
 * 问一个与图片毫无关系的问题照样 400 ——
 *   "the size of the input image (22 MiB) exceeds the limit (10 MiB)"
 * 因为那张图还躺在会话历史里，每一轮都会被重新发给模型。会话被永久毒化，
 * 用户自己无法自救（换模型也没用，历史跟着走），只能弃用会话重开。
 *
 * 这条链路此前**没有任何一处**做过大小检查：sniffImageKind 只校验 `length < 12`
 * （够不够嗅探魔术字节），websocket 直接把原始 data URL 塞进 content。
 *
 * **2026-08-27 下调 5MB → 512KB**，原因是 5MB 这个数字只治住了 22MiB 那一种形态，没有泛化：
 *
 *   · 线上真实事故：三张 620–670KB 的手机照片进历史后，会话连续 13.5 小时每一轮都被顶回。
 *     每一张都远在 5MB 以下，**一张都不会被这条限额碰到**——护栏比墙高了整整一个数量级。
 *   · 5MB × 单条消息 5 张（MAX_AGENT_IMAGES_PER_MESSAGE）= 25MB，是任何上游都收不下的量。
 *   · 这个常量是**降采样目标**，不是丢弃阈值：超了会缩小后照常内联，不会丢失图片内容。
 *     所以调低它几乎不损失识别质量——主流视觉模型对超过约 1568px 的输入本来就会自行缩放，
 *     多出来的字节只是白白花在传输和上下文上。
 *
 * 真正"丢弃"用的是下面的 MAX_HISTORY_IMAGE_BYTES，两者刻意分开：缩小是无损降级，
 * 丢弃是有损的，不该共用一个数字。
 */
export const MAX_INLINE_IMAGE_BYTES = (() => {
    const raw = Number(process.env.YOKO_MAX_INLINE_IMAGE_BYTES);
    return Number.isFinite(raw) && raw > 0 ? raw : 512 * 1024;
})();
/**
 * 历史里的单张图**大到必须直接丢弃**的阈值（换成带路径的文本占位）。
 *
 * 与 MAX_INLINE_IMAGE_BYTES 分开：那个是"缩小到多少"，这个是"大到没法留"。缩小是无损降级，
 * 丢弃会让模型再也看不到这张图，代价完全不同，不能共用一个数字。
 * 保持 5MB —— 它要处理的是 22MiB 那种入口降采样也救不回来的极端情况。
 */
export const MAX_HISTORY_IMAGE_BYTES = (() => {
    const raw = Number(process.env.YOKO_MAX_HISTORY_IMAGE_BYTES);
    return Number.isFinite(raw) && raw > 0 ? raw : 5 * 1024 * 1024;
})();
/**
 * 一次请求里**所有**内联图片加起来的预算，按**线缆字节**（base64 后的 data URL 长度）计。
 *
 * 单张限额管不住"很多张都不超限"这种形态——线上就是这么撞的（3 × ~650KB）。
 * 超预算时按从旧到新摘图，见 sanitization.ts 的 enforceInlineImageBudget。
 *
 * 口径必须是线缆字节：撞上限的是 HTTP 请求体，而请求体里躺的是 base64（比原始字节大 4/3）。
 * 用解码后的口径算会稳定低估 33%。
 *
 * 取值必须明显低于服务端的 YOKO_MAX_REQUEST_BYTES（默认 8MB）：客户端先收敛，
 * 服务端只做存量老客户端的兜底。
 */
export const MAX_REQUEST_IMAGE_BYTES = (() => {
    const raw = Number(process.env.YOKO_MAX_REQUEST_IMAGE_BYTES);
    return Number.isFinite(raw) && raw > 0 ? raw : 3 * 1024 * 1024;
})();
/** base64 编码后的载荷大小（部分厂商按这个口径量上限）。 */
export const base64WireBytes = (rawBytes) => Math.ceil(rawBytes / 3) * 4;
/** 这张图是否必须先缩小才能进上下文。 */
export const exceedsInlineLimit = (rawBytes) => rawBytes > MAX_INLINE_IMAGE_BYTES;
/** 去掉路径分隔符与控制字符，避免附件名逃出目标目录。 */
function portableBaseName(name) {
    // Browser/remote clients may submit either separator regardless of the
    // Agent host OS. Strip both before using the host filesystem API.
    return String(name || "file").split(/[\\/]/).filter(Boolean).pop() || "file";
}
function sanitizeStem(name) {
    const stem = path.posix.parse(portableBaseName(name)).name;
    const cleaned = stem.replace(/[^\p{L}\p{N}_\- ]/gu, "_").trim();
    return (cleaned || "image").slice(0, 60);
}
function uniquePath(dir, stem, ext) {
    let candidate = path.join(dir, `${stem}${ext}`);
    let counter = 1;
    while (fs.existsSync(candidate)) {
        candidate = path.join(dir, `${stem}_${counter}${ext}`);
        counter += 1;
    }
    return candidate;
}
function sanitizeFileName(name) {
    const parsed = path.posix.parse(portableBaseName(name));
    let stem = parsed.name
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
        .trim()
        .replace(/[. ]+$/g, "")
        .slice(0, 100) || "file";
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(stem)) {
        stem = `_${stem}`;
    }
    const ext = parsed.ext
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
        .slice(0, 20);
    return { stem, ext };
}
export function saveUploadedFile(workspaceDir, buffer, originalName) {
    const day = new Date().toISOString().slice(0, 10);
    const dir = path.join(workspaceDir, "uploads", day);
    fs.mkdirSync(dir, { recursive: true });
    const { stem, ext } = sanitizeFileName(originalName);
    const target = uniquePath(dir, stem, ext);
    fs.writeFileSync(target, buffer, { mode: 0o600 });
    return { path: target, bytes: buffer.length };
}
/**
 * 把上传的图片写进 `<workspace>/uploads/<YYYY-MM-DD>/`，返回绝对路径。
 * 字节不是已知图片格式时返回 null —— 宁可不落盘，也不要制造一个假图片文件。
 */
export function saveUploadedImage(workspaceDir, buffer, originalName) {
    const kind = sniffImageKind(buffer);
    if (!kind)
        return null;
    const day = new Date().toISOString().slice(0, 10);
    const dir = path.join(workspaceDir, "uploads", day);
    fs.mkdirSync(dir, { recursive: true });
    const target = uniquePath(dir, sanitizeStem(originalName), extForKind(kind));
    fs.writeFileSync(target, buffer);
    return { path: target, kind, bytes: buffer.length };
}
