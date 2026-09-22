/*! WeChat iLink protocol behavior is based on Tencent/openclaw-weixin (MIT).
 * Copyright (C) 2026 Tencent. All rights reserved.
 * https://github.com/Tencent/openclaw-weixin
 */
import crypto from 'node:crypto';
export const WECHAT_ILINK_DEFAULT_BASE_URL = 'https://ilinkai.weixin.qq.com';
export const WECHAT_ILINK_DEFAULT_CDN_URL = 'https://novac2c.cdn.weixin.qq.com/c2c';
export const WECHAT_ILINK_MAX_MEDIA_BYTES = 50 * 1024 * 1024;
export const WECHAT_ILINK_UPLOAD_MEDIA_TYPE = {
    IMAGE: 1,
    VIDEO: 2,
    FILE: 3,
    VOICE: 4,
};
const BOT_TYPE = '3';
const APP_VERSION = '1.2.0';
const ILINK_APP_ID = 'bot';
const BOT_AGENT = `YoBot/${APP_VERSION}`;
export class WechatIlinkApiError extends Error {
    ret;
    errcode;
    constructor(message, ret, errcode) {
        super(message);
        this.ret = ret;
        this.errcode = errcode;
        this.name = 'WechatIlinkApiError';
    }
}
function encodeClientVersion(version) {
    const [major = 0, minor = 0, patch = 0] = version
        .split('.')
        .map((part) => Number.parseInt(part, 10) || 0);
    return ((major & 0xff) << 16) | ((minor & 0xff) << 8) | (patch & 0xff);
}
function randomWechatUin() {
    const value = crypto.randomBytes(4).readUInt32BE(0);
    return Buffer.from(String(value), 'utf8').toString('base64');
}
function baseInfo() {
    return {
        channel_version: APP_VERSION,
        bot_agent: BOT_AGENT,
    };
}
export function validateWechatIlinkBaseUrl(value) {
    const candidate = value?.trim() || WECHAT_ILINK_DEFAULT_BASE_URL;
    const url = new URL(candidate);
    const trustedHost = url.hostname === 'ilinkai.weixin.qq.com' || url.hostname.endsWith('.weixin.qq.com');
    if (url.protocol !== 'https:' || !trustedHost || url.username || url.password) {
        throw new Error('微信 iLink 返回了不受信任的服务地址。');
    }
    url.pathname = url.pathname.replace(/\/+$/, '');
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
}
function commonHeaders() {
    return {
        'iLink-App-Id': ILINK_APP_ID,
        'iLink-App-ClientVersion': String(encodeClientVersion(APP_VERSION)),
    };
}
function authorizedHeaders(token) {
    return {
        ...commonHeaders(),
        'Content-Type': 'application/json',
        AuthorizationType: 'ilink_bot_token',
        'X-WECHAT-UIN': randomWechatUin(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}
function validateWechatCdnUrl(value) {
    const url = new URL(value);
    const trustedHost = url.hostname === 'weixin.qq.com' || url.hostname.endsWith('.weixin.qq.com');
    if (url.protocol !== 'https:' || !trustedHost || url.username || url.password) {
        throw new Error('微信 iLink 返回了不受信任的媒体地址。');
    }
    return url.toString();
}
function encryptAesEcb(plaintext, key) {
    const cipher = crypto.createCipheriv('aes-128-ecb', key, null);
    return Buffer.concat([cipher.update(plaintext), cipher.final()]);
}
function decryptAesEcb(ciphertext, key) {
    const decipher = crypto.createDecipheriv('aes-128-ecb', key, null);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
function aesEcbPaddedSize(plaintextSize) {
    return Math.ceil((plaintextSize + 1) / 16) * 16;
}
function parseMediaAesKey(base64Key) {
    const decoded = Buffer.from(base64Key, 'base64');
    if (decoded.length === 16)
        return decoded;
    if (decoded.length === 32 && /^[0-9a-fA-F]{32}$/.test(decoded.toString('ascii'))) {
        return Buffer.from(decoded.toString('ascii'), 'hex');
    }
    throw new Error('微信媒体密钥格式无效。');
}
async function fetchBufferWithLimit(url, init, maxBytes = WECHAT_ILINK_MAX_MEDIA_BYTES, timeoutMs = 60_000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...init, signal: controller.signal });
        if (!response.ok)
            throw new Error(`微信媒体请求失败（HTTP ${response.status}）。`);
        const declaredLength = Number(response.headers.get('content-length') || 0);
        if (declaredLength > maxBytes)
            throw new Error('微信媒体文件超过 50 MB 接收上限。');
        if (!response.body)
            return { buffer: Buffer.alloc(0), response };
        const chunks = [];
        let total = 0;
        for await (const chunk of response.body) {
            const next = Buffer.from(chunk);
            total += next.length;
            if (total > maxBytes) {
                controller.abort();
                throw new Error('微信媒体文件超过 50 MB 接收上限。');
            }
            chunks.push(next);
        }
        return { buffer: Buffer.concat(chunks, total), response };
    }
    finally {
        clearTimeout(timer);
    }
}
async function fetchWithTimeout(url, init, timeoutMs, externalSignal) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const abort = () => controller.abort();
    if (externalSignal?.aborted)
        controller.abort();
    externalSignal?.addEventListener('abort', abort, { once: true });
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    }
    finally {
        clearTimeout(timer);
        externalSignal?.removeEventListener('abort', abort);
    }
}
async function readJson(response, label) {
    const raw = await response.text();
    if (!response.ok) {
        throw new Error(`${label} 请求失败（HTTP ${response.status}）。`);
    }
    try {
        return JSON.parse(raw);
    }
    catch {
        throw new Error(`${label} 返回了无法识别的数据。`);
    }
}
export class WechatIlinkClient {
    async createQrCode(localTokens = []) {
        const endpoint = `${WECHAT_ILINK_DEFAULT_BASE_URL}/ilink/bot/get_bot_qrcode?bot_type=${BOT_TYPE}`;
        const response = await fetchWithTimeout(endpoint, {
            method: 'POST',
            headers: authorizedHeaders(),
            body: JSON.stringify({ local_token_list: localTokens.slice(0, 10) }),
        }, 15_000);
        const result = await readJson(response, '获取微信二维码');
        if (!result.qrcode || !result.qrcode_img_content) {
            throw new Error('微信服务未返回有效的绑定二维码。');
        }
        return { qrcode: result.qrcode, qrContent: result.qrcode_img_content };
    }
    async pollQrStatus(baseUrl, qrcode, verifyCode, signal) {
        const trustedBaseUrl = validateWechatIlinkBaseUrl(baseUrl);
        const url = new URL('/ilink/bot/get_qrcode_status', `${trustedBaseUrl}/`);
        url.searchParams.set('qrcode', qrcode);
        if (verifyCode)
            url.searchParams.set('verify_code', verifyCode);
        const response = await fetchWithTimeout(url.toString(), { method: 'GET', headers: commonHeaders() }, 38_000, signal);
        return readJson(response, '查询微信扫码状态');
    }
    async getUpdates(params) {
        const baseUrl = validateWechatIlinkBaseUrl(params.baseUrl);
        const response = await fetchWithTimeout(`${baseUrl}/ilink/bot/getupdates`, {
            method: 'POST',
            headers: authorizedHeaders(params.token),
            body: JSON.stringify({
                get_updates_buf: params.cursor,
                base_info: baseInfo(),
            }),
        }, params.timeoutMs ?? 38_000, params.signal);
        return readJson(response, '接收微信消息');
    }
    async sendText(params) {
        await this.sendItem({
            ...params,
            item: { type: 1, text_item: { text: params.text } },
            label: '发送微信消息',
        });
    }
    async sendImage(params) {
        const uploaded = await this.uploadMedia({ ...params, mediaType: WECHAT_ILINK_UPLOAD_MEDIA_TYPE.IMAGE });
        await this.sendItem({
            ...params,
            item: {
                type: 2,
                image_item: {
                    media: {
                        encrypt_query_param: uploaded.downloadEncryptedQueryParam,
                        aes_key: Buffer.from(uploaded.aeskey, 'utf8').toString('base64'),
                        encrypt_type: 1,
                    },
                    mid_size: uploaded.fileSizeCiphertext,
                },
            },
            label: '发送微信图片',
        });
    }
    async sendFile(params) {
        const uploaded = await this.uploadMedia({ ...params, mediaType: WECHAT_ILINK_UPLOAD_MEDIA_TYPE.FILE });
        await this.sendItem({
            ...params,
            item: {
                type: 4,
                file_item: {
                    media: {
                        encrypt_query_param: uploaded.downloadEncryptedQueryParam,
                        aes_key: Buffer.from(uploaded.aeskey, 'utf8').toString('base64'),
                        encrypt_type: 1,
                    },
                    file_name: params.fileName,
                    len: String(uploaded.fileSize),
                },
            },
            label: '发送微信文件',
        });
    }
    async downloadMedia(params) {
        const encryptedQueryParam = params.media.encrypt_query_param?.trim();
        let url;
        if (params.media.full_url?.trim()) {
            url = validateWechatCdnUrl(params.media.full_url.trim());
        }
        else if (encryptedQueryParam) {
            url = validateWechatCdnUrl(`${WECHAT_ILINK_DEFAULT_CDN_URL}/download?encrypted_query_param=${encodeURIComponent(encryptedQueryParam)}`);
        }
        else {
            throw new Error('微信消息没有可下载的媒体地址。');
        }
        const { buffer } = await fetchBufferWithLimit(url, { method: 'GET', redirect: 'error' });
        if (params.aesKeyHex && !/^[0-9a-fA-F]{32}$/.test(params.aesKeyHex)) {
            throw new Error('微信图片密钥格式无效。');
        }
        const key = params.aesKeyHex
            ? Buffer.from(params.aesKeyHex, 'hex')
            : params.media.aes_key
                ? parseMediaAesKey(params.media.aes_key)
                : undefined;
        if (key?.length === 16)
            return decryptAesEcb(buffer, key);
        if (params.allowPlain)
            return buffer;
        throw new Error('微信媒体缺少可用的解密密钥。');
    }
    async uploadMedia(params) {
        if (params.buffer.length > WECHAT_ILINK_MAX_MEDIA_BYTES) {
            throw new Error('文件超过 50 MB 微信发送上限。');
        }
        const rawsize = params.buffer.length;
        const rawfilemd5 = crypto.createHash('md5').update(params.buffer).digest('hex');
        const filesize = aesEcbPaddedSize(rawsize);
        const filekey = crypto.randomBytes(16).toString('hex');
        const aeskey = crypto.randomBytes(16);
        const upload = await this.postAuthorized(params.baseUrl, params.token, 'ilink/bot/getuploadurl', {
            filekey,
            media_type: params.mediaType,
            to_user_id: params.toUserId,
            rawsize,
            rawfilemd5,
            filesize,
            no_need_thumb: true,
            aeskey: aeskey.toString('hex'),
            base_info: baseInfo(),
        }, '申请微信媒体上传地址');
        if ((upload.ret ?? 0) !== 0) {
            throw new WechatIlinkApiError(upload.errmsg || '申请微信媒体上传地址失败。', upload.ret, upload.errcode);
        }
        const uploadUrl = upload.upload_full_url?.trim()
            ? validateWechatCdnUrl(upload.upload_full_url.trim())
            : upload.upload_param
                ? validateWechatCdnUrl(`${WECHAT_ILINK_DEFAULT_CDN_URL}/upload?encrypted_query_param=${encodeURIComponent(upload.upload_param)}&filekey=${encodeURIComponent(filekey)}`)
                : undefined;
        if (!uploadUrl)
            throw new Error('微信未返回可用的媒体上传地址。');
        const ciphertext = encryptAesEcb(params.buffer, aeskey);
        const { response } = await fetchBufferWithLimit(uploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: new Uint8Array(ciphertext),
            redirect: 'error',
        }, 1024 * 1024);
        const downloadEncryptedQueryParam = response.headers.get('x-encrypted-param')?.trim();
        if (!downloadEncryptedQueryParam)
            throw new Error('微信 CDN 未返回媒体下载参数。');
        return {
            filekey,
            downloadEncryptedQueryParam,
            aeskey: aeskey.toString('hex'),
            fileSize: rawsize,
            fileSizeCiphertext: ciphertext.length,
        };
    }
    async sendItem(params) {
        const message = {
            from_user_id: '',
            to_user_id: params.toUserId,
            client_id: crypto.randomUUID(),
            message_type: 2,
            message_state: 2,
            item_list: [params.item],
            context_token: params.contextToken,
        };
        const result = await this.postAuthorized(params.baseUrl, params.token, 'ilink/bot/sendmessage', { msg: message, base_info: baseInfo() }, params.label);
        if ((result.ret ?? 0) !== 0) {
            throw new WechatIlinkApiError(result.errmsg || `${params.label}失败。`, result.ret, result.errcode);
        }
    }
    async notifyStart(baseUrl, token) {
        await this.notifyLifecycle(baseUrl, token, 'ilink/bot/msg/notifystart');
    }
    async notifyStop(baseUrl, token) {
        await this.notifyLifecycle(baseUrl, token, 'ilink/bot/msg/notifystop');
    }
    async notifyLifecycle(baseUrl, token, endpoint) {
        const result = await this.postAuthorized(baseUrl, token, endpoint, { base_info: baseInfo() }, '更新微信连接状态');
        if ((result.ret ?? 0) !== 0) {
            throw new WechatIlinkApiError(result.errmsg || '更新微信连接状态失败。', result.ret, result.errcode);
        }
    }
    async postAuthorized(baseUrl, token, endpoint, body, label) {
        const trustedBaseUrl = validateWechatIlinkBaseUrl(baseUrl);
        const response = await fetchWithTimeout(`${trustedBaseUrl}/${endpoint}`, {
            method: 'POST',
            headers: authorizedHeaders(token),
            body: JSON.stringify(body),
        }, 15_000);
        return readJson(response, label);
    }
}
