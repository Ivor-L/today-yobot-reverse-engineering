import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
const SUPPORTED_DOCUMENT_EXTENSIONS = new Set([
    '.pdf', '.docx', '.xlsx', '.txt', '.md', '.json', '.fireflow', '.js', '.ts', '.tsx',
]);
const TEXT_DOCUMENT_EXTENSIONS = new Set([
    '.txt', '.md', '.json', '.fireflow', '.js', '.ts', '.tsx',
]);
const MIME_BY_EXTENSION = {
    '.bmp': 'image/bmp',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.fireflow': 'application/json',
    '.gif': 'image/gif',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.json': 'application/json',
    '.md': 'text/markdown',
    '.mp4': 'video/mp4',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.txt': 'text/plain',
    '.webp': 'image/webp',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
const EXTENSION_BY_IMAGE_MIME = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/bmp': '.bmp',
};
export function sanitizeWechatFileName(fileName, fallback = 'wechat-file.bin') {
    const base = path.basename((fileName || fallback).replace(/\0/g, '')).trim();
    const safe = base
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
        .replace(/[. ]+$/g, '')
        .slice(0, 180);
    return safe && safe !== '.' && safe !== '..' ? safe : fallback;
}
export function inferMimeType(fileName) {
    return MIME_BY_EXTENSION[path.extname(fileName).toLowerCase()] || 'application/octet-stream';
}
export function sniffImageMime(buffer) {
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
        return 'image/png';
    }
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return 'image/jpeg';
    }
    if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))) {
        return 'image/gif';
    }
    if (buffer.length >= 12 &&
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
        return 'image/webp';
    }
    if (buffer.length >= 2 && buffer.subarray(0, 2).toString('ascii') === 'BM')
        return 'image/bmp';
    return undefined;
}
export function imageFileName(buffer) {
    const mime = sniffImageMime(buffer);
    if (!mime)
        return undefined;
    return { fileName: `wechat-image${EXTENSION_BY_IMAGE_MIME[mime]}`, mime };
}
export function canUnderstandDocument(fileName, mimeType) {
    const ext = path.extname(fileName).toLowerCase();
    return SUPPORTED_DOCUMENT_EXTENSIONS.has(ext) || mimeType === 'text/plain';
}
/** 避免仅靠扩展名把二进制文件当文本塞进 Agent，也尽早拒绝伪装的 Office/PDF。 */
export function hasExpectedDocumentSignature(buffer, fileName, mimeType) {
    const ext = path.extname(fileName).toLowerCase();
    if (ext === '.pdf' || mimeType === 'application/pdf') {
        return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    }
    if (ext === '.docx' || ext === '.xlsx') {
        return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
    }
    if (TEXT_DOCUMENT_EXTENSIONS.has(ext) || mimeType === 'text/plain') {
        if (buffer.includes(0))
            return false;
        try {
            new TextDecoder('utf-8', { fatal: true }).decode(buffer);
            return true;
        }
        catch {
            return false;
        }
    }
    return false;
}
export async function saveWechatMedia(params) {
    const date = new Date().toISOString().slice(0, 10);
    const targetDir = path.join(params.workspaceDir, 'uploads', 'wechat-ilink', date);
    await fs.promises.mkdir(targetDir, { recursive: true });
    const safeName = sanitizeWechatFileName(params.fileName);
    const ext = path.extname(safeName);
    const stem = path.basename(safeName, ext).slice(0, 120) || 'wechat-file';
    const target = path.join(targetDir, `${stem}-${crypto.randomUUID().slice(0, 8)}${ext}`);
    await fs.promises.writeFile(target, params.buffer, { flag: 'wx', mode: 0o600 });
    return target;
}
export function attachedFileTag(filePath) {
    return `<attached_file path=${JSON.stringify(filePath)} />`;
}
