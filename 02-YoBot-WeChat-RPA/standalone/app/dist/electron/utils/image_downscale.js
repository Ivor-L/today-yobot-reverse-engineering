/**
 * 把超限图片缩到能进模型上下文的大小。
 *
 * 为什么走 IPC 到主进程，而不是在这里直接解码：
 *   server 是被 Electron 主进程 `fork` 出来的**普通 Node 进程**
 *   （Electron 的 fork 会给子进程置 ELECTRON_RUN_AS_NODE），`require("electron")`
 *   在这里拿不到 nativeImage。而主进程有 nativeImage —— 原生解码/缩放，
 *   零新增依赖，也就零打包风险。
 *
 * 为什么不引 sharp / jimp：
 *   · sharp 是原生模块，要按平台带预编译二进制、asar unpack、每个渠道包各构建一次，
 *     对现有的多渠道打包流水线是实打实的风险，收益只是「快一点」；
 *   · jimp 纯 JS 可用，但解一张 20MB 的图在 JS 里是秒级且吃内存，
 *     而这条路径在用户发消息的同步链路上。
 *   两者都留作后备：nativeImage 解不了的格式（WebP/GIF 等）会走 `null` 分支，
 *   由调用方降级成「不内联、只给路径」，行为是安全的。
 */
import { MAX_INLINE_IMAGE_BYTES, mimeForKind, sniffImageKind, } from "./image_bytes.js";
const REQUEST = "image:downscale-request";
const RESPONSE = "image:downscale-request:done";
const TIMEOUT_MS = 20000;
/** 主进程不可用（开发态独立跑 server、或未来的纯服务端形态）时为 false。 */
export const canDownscale = () => typeof process.send === "function";
/**
 * 缩到 `limitBytes` 以内。做不到时返回 null —— 调用方必须有不内联的降级路径，
 * 绝不能把原图硬塞进上下文（那正是要消灭的故障）。
 */
export async function downscaleForContext(buffer, limitBytes = MAX_INLINE_IMAGE_BYTES) {
    const kind = sniffImageKind(buffer);
    if (!kind)
        return null;
    if (buffer.length <= limitBytes) {
        return null; // 没超限，调用方按原样内联
    }
    if (!canDownscale())
        return null;
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return new Promise((resolve) => {
        let settled = false;
        const finish = (v) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            process.off("message", handler);
            resolve(v);
        };
        const handler = (msg) => {
            if (!msg || msg.type !== RESPONSE || msg.requestId !== requestId)
                return;
            const b64 = msg.result?.base64;
            if (!msg.result?.success || typeof b64 !== "string" || !b64) {
                if (msg.result?.error) {
                    console.warn(`[ImageDownscale] main process could not resize: ${msg.result.error}`);
                }
                return finish(null);
            }
            const out = Buffer.from(b64, "base64");
            // 主进程理论上已经压到限额内，但它是另一个进程——不复核就等于把
            // 「会话被毒化」的可能性留在了信任边界外面。
            if (out.length > limitBytes) {
                console.warn(`[ImageDownscale] resized image still over limit (${out.length} > ${limitBytes}); not inlining.`);
                return finish(null);
            }
            const outKind = msg.result.kind === "png" ? "png" : "jpeg";
            finish({
                buffer: out,
                kind: outKind,
                mime: mimeForKind(outKind),
                fromBytes: buffer.length,
                toBytes: out.length,
                width: Number(msg.result.width) || 0,
                height: Number(msg.result.height) || 0,
            });
        };
        const timer = setTimeout(() => {
            console.warn("[ImageDownscale] timed out waiting for main process; not inlining.");
            finish(null);
        }, TIMEOUT_MS);
        process.on("message", handler);
        process.send({
            type: REQUEST,
            requestId,
            base64: buffer.toString("base64"),
            kind,
            limitBytes,
        });
    });
}
export function resizeWithNativeImage(image, limitBytes) {
    if (image.isEmpty())
        return null;
    const { width, height } = image.getSize();
    if (!width || !height)
        return null;
    const longest = Math.max(width, height);
    // 逐档缩长边。1568 这一档是特意加的：主流视觉模型对超过约 1568px 的输入本来就会自行缩放，
    // 所以从原图直接落到这一档几乎不损失识别质量，却能砍掉大部分字节。
    //
    // 尾部的 512/400 档与 q=40 是 2026-08-27 补的：限额从 5MB 降到 512KB 之后，原来止步于
    // 640px/q=55 的阶梯在最坏情况下够不到新目标，只能返回 null——而返回 null 意味着**整张图
    // 被丢弃**。多几档低质量总比丢掉整张图强，所以高质量档永远先试，这几档只是兜底。
    const edges = [2048, 1568, 1280, 1024, 800, 640, 512, 400].filter((e) => e < longest);
    const ladder = [longest, ...edges];
    for (const edge of ladder) {
        const scale = edge / longest;
        const target = scale >= 1
            ? image
            : image.resize({
                width: Math.max(1, Math.round(width * scale)),
                height: Math.max(1, Math.round(height * scale)),
                quality: "good",
            });
        for (const q of [85, 70, 55, 40]) {
            const buf = target.toJPEG(q);
            if (buf.length > 0 && buf.length <= limitBytes) {
                const size = target.getSize();
                return { buffer: buf, kind: "jpeg", width: size.width, height: size.height };
            }
        }
    }
    return null;
}
