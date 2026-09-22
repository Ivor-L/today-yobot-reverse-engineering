import * as path from "path";
import { config } from "../../config/index.js";
import { DocConverter } from "../../skills/tools/doc_converter.js";
import { saveUploadedFile, saveUploadedImage } from "../../utils/image_bytes.js";
import { LLMManager } from "../llm/manager.js";
const PROFILE_ID = /^[A-Za-z0-9_-]+$/;
const REQUEST_ID = /^[A-Za-z0-9_-]{1,128}$/;
const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1", "localhost"]);
const MAX_FILES = 5;
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_TOTAL_FILE_BYTES = 70 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp",
    ".pdf", ".docx", ".xlsx", ".txt", ".md", ".json",
    ".fireflow", ".js", ".ts", ".tsx",
]);
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"]);
function isLoopback(req) {
    const ip = (req.socket.remoteAddress || req.ip || "").trim();
    return LOOPBACK.has(ip);
}
function isTrustedLocalOrigin(req) {
    const origin = (req.header("origin") || "").trim();
    if (!origin || origin === "null")
        return true;
    try {
        return LOOPBACK.has(new URL(origin).hostname);
    }
    catch {
        return false;
    }
}
function guardPreviewRequest(req, res) {
    if (!isLoopback(req)) {
        res.status(403).json({ error: "试聊接口仅允许本机访问" });
        return false;
    }
    const expected = LLMManager.getInstance().getAuthToken();
    if (expected) {
        const header = req.header("authorization") || "";
        const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
        if (token !== expected) {
            res.status(401).json({ error: "试聊鉴权失败" });
            return false;
        }
        return true;
    }
    if (!isTrustedLocalOrigin(req)) {
        res.status(403).json({ error: "试聊接口拒绝非本机页面调用" });
        return false;
    }
    return true;
}
function decodeAttachment(attachment) {
    const encoded = String(attachment.content || "").replace(/^data:.*?;base64,/, "");
    if (!encoded)
        throw new Error(`文件 ${attachment.name || ""} 内容为空`);
    const buffer = Buffer.from(encoded, "base64");
    if (buffer.length === 0)
        throw new Error(`文件 ${attachment.name || ""} 内容为空`);
    if (buffer.length > MAX_FILE_BYTES)
        throw new Error(`文件 ${attachment.name || ""} 超过 50 MB`);
    return buffer;
}
async function prepareAttachments(raw) {
    const items = Array.isArray(raw) ? raw : [];
    if (items.length > MAX_FILES)
        throw new Error("一次最多添加 5 个文件");
    const prepared = [];
    let totalBytes = 0;
    for (const item of items) {
        const name = path.basename(String(item.name || "").trim());
        const extension = path.extname(name).toLowerCase();
        if (!name || !ALLOWED_EXTENSIONS.has(extension)) {
            throw new Error(`暂不支持文件 ${name || "未知文件"}`);
        }
        const buffer = decodeAttachment(item);
        totalBytes += buffer.length;
        if (totalBytes > MAX_TOTAL_FILE_BYTES) {
            throw new Error("单次添加的文件总大小不能超过 70 MB");
        }
        if (IMAGE_EXTENSIONS.has(extension)) {
            const saved = saveUploadedImage(config.workspaceDir, buffer, name);
            if (!saved)
                throw new Error(`图片 ${name} 无法识别`);
            prepared.push({
                name,
                path: saved.path,
                mediaType: "image",
                dataUrl: String(item.content || ""),
                modelContent: `[File: ${name}]\n<attached_file path=${JSON.stringify(saved.path)} />`,
            });
            continue;
        }
        const saved = saveUploadedFile(config.workspaceDir, buffer, name);
        const converted = await DocConverter.convertToMarkdown(buffer, name, item.type);
        prepared.push({
            name,
            path: saved.path,
            mediaType: "file",
            modelContent: [
                `[File: ${name}]`,
                `<attached_file path=${JSON.stringify(saved.path)} />`,
                `<yoko-document-context name=${JSON.stringify(name)}>`,
                converted.content,
                "</yoko-document-context>",
            ].join("\n"),
        });
    }
    return prepared;
}
export function registerAgentPreviewApi(app, service) {
    app.post("/api/agent-preview/run", async (req, res) => {
        if (!guardPreviewRequest(req, res))
            return;
        const profileId = String(req.body?.profileId || "").trim();
        const conversationId = String(req.body?.conversationId || "").trim();
        const turnId = String(req.body?.turnId || "").trim();
        const text = String(req.body?.text || "");
        if (!PROFILE_ID.test(profileId) || !REQUEST_ID.test(conversationId) || !REQUEST_ID.test(turnId)) {
            res.status(400).json({ error: "试聊请求参数不完整" });
            return;
        }
        if (!text.trim() && (!Array.isArray(req.body?.attachments) || req.body.attachments.length === 0)) {
            res.status(400).json({ error: "请输入消息或添加文件" });
            return;
        }
        res.writeHead(200, {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        });
        const send = (event) => {
            if (!res.writableEnded)
                res.write(`${JSON.stringify(event)}\n`);
        };
        let finished = false;
        res.on("close", () => {
            if (!finished)
                service.stop(profileId, conversationId);
        });
        try {
            const attachments = await prepareAttachments(req.body?.attachments);
            if (res.destroyed || res.writableEnded)
                return;
            const request = {
                profileId,
                conversationId,
                turnId,
                text,
                attachments,
            };
            await service.run(request, send);
        }
        catch (error) {
            send({ type: "error", message: error?.message || "试聊失败" });
        }
        finally {
            finished = true;
            res.end();
        }
    });
    app.post("/api/agent-preview/stop", (req, res) => {
        if (!guardPreviewRequest(req, res))
            return;
        const profileId = String(req.body?.profileId || "").trim();
        const conversationId = String(req.body?.conversationId || "").trim();
        if (!PROFILE_ID.test(profileId) || !REQUEST_ID.test(conversationId)) {
            res.status(400).json({ error: "试聊请求参数不完整" });
            return;
        }
        const stopped = service.stop(profileId, conversationId);
        res.json({ success: true, stopped });
    });
    app.post("/api/agent-preview/reset", (req, res) => {
        if (!guardPreviewRequest(req, res))
            return;
        const profileId = String(req.body?.profileId || "").trim();
        const conversationId = String(req.body?.conversationId || "").trim();
        if (!PROFILE_ID.test(profileId) || !REQUEST_ID.test(conversationId)) {
            res.status(400).json({ error: "试聊请求参数不完整" });
            return;
        }
        service.reset(profileId, conversationId);
        res.json({ success: true });
    });
    console.log("[AgentPreview] Preview endpoints mounted");
}
