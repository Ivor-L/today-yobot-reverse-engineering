import fs from 'node:fs';
import path from 'node:path';
import { ConfigManager } from '../../core/config/manager.js';
import { config } from '../../config/index.js';
import { DocConverter } from '../../skills/tools/doc_converter.js';
import { makeTraceId } from '../../utils/trace_id.js';
import { MAX_AGENT_IMAGES_PER_MESSAGE } from '../../utils/image_context.js';
import { WECHAT_ILINK_DEFAULT_BASE_URL, WECHAT_ILINK_MAX_MEDIA_BYTES, WechatIlinkApiError, WechatIlinkClient, validateWechatIlinkBaseUrl, } from './client.js';
import { WechatIlinkStateStore } from './state_store.js';
import { attachedFileTag, canUnderstandDocument, hasExpectedDocumentSignature, imageFileName, inferMimeType, sanitizeWechatFileName, saveWechatMedia, } from './media.js';
import { prepareWechatImage, } from './vision.js';
const USER_MESSAGE_TYPE = 1;
const TEXT_ITEM_TYPE = 1;
const IMAGE_ITEM_TYPE = 2;
const VOICE_ITEM_TYPE = 3;
const FILE_ITEM_TYPE = 4;
const VIDEO_ITEM_TYPE = 5;
const QR_TTL_MS = 5 * 60_000;
const MAX_TEXT_CHARS = 4000;
const MAX_ARTIFACTS_PER_REPLY = 5;
const MAX_EXTRACTED_FILE_CHARS = 150_000;
const MAX_DOCUMENT_PARSE_BYTES = 20 * 1024 * 1024;
export class WechatIlinkAdapter {
    name = 'wechat-ilink';
    client;
    credentialStore;
    statusListener;
    workspaceDir;
    imagePreparer;
    onMessage;
    requestHandler;
    credential = null;
    stateStore = null;
    activeLogin = null;
    loginPromise = null;
    monitorAbort = null;
    monitorPromise = null;
    contextTokensByUser = new Map();
    contextTokensByMessage = new Map();
    enabled = false;
    stopped = false;
    status = {
        state: 'disabled',
        enabled: false,
        bound: false,
        updatedAt: Date.now(),
    };
    constructor(options) {
        this.credentialStore = options.credentialStore;
        this.client = options.client ?? new WechatIlinkClient();
        this.statusListener = options.onStatusChange;
        this.workspaceDir = options.workspaceDir ?? config.workspaceDir;
        this.imagePreparer = options.imagePreparer ?? prepareWechatImage;
    }
    async start(onMessage, onRequest) {
        this.onMessage = onMessage;
        this.requestHandler = onRequest;
        this.stopped = false;
        await this.applyConfig();
    }
    async applyConfig() {
        const configured = ConfigManager.getInstance().getConfig().channels?.wechatIlink?.enabled === true;
        await this.setEnabled(configured);
    }
    async setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.cancelLogin(false);
            await this.stopMonitor();
            await this.ensureCredentialLoaded();
            this.publish({
                state: 'disabled',
                enabled: false,
                bound: Boolean(this.credential),
                accountId: this.credential?.accountId,
                accountDisplayName: maskOwner(this.credential?.ownerUserId),
                message: this.credential ? '微信 iLink 已停用，绑定信息仍保留。' : '微信 iLink 未启用。',
                qrContent: undefined,
                qrExpiresAt: undefined,
            });
            return this.getStatus();
        }
        await this.ensureCredentialLoaded();
        if (!this.credential) {
            this.publish({
                state: 'unbound',
                enabled: true,
                bound: false,
                accountId: undefined,
                accountDisplayName: undefined,
                message: '请使用微信扫码绑定 ClawBot。',
            });
            return this.getStatus();
        }
        this.startMonitor();
        return this.getStatus();
    }
    async startBinding() {
        this.enabled = true;
        this.stopped = false;
        this.cancelLogin(false);
        await this.stopMonitor();
        await this.ensureCredentialLoaded();
        this.publish({
            state: 'fetching_qr',
            enabled: true,
            bound: Boolean(this.credential),
            message: '正在向微信申请绑定二维码…',
            qrContent: undefined,
            qrExpiresAt: undefined,
        });
        try {
            const qr = await this.client.createQrCode(this.credential?.botToken ? [this.credential.botToken] : []);
            const login = {
                qrcode: qr.qrcode,
                qrContent: qr.qrContent,
                baseUrl: WECHAT_ILINK_DEFAULT_BASE_URL,
                abortController: new AbortController(),
            };
            this.activeLogin = login;
            this.publish({
                state: 'waiting_scan',
                enabled: true,
                bound: Boolean(this.credential),
                message: '请使用手机微信扫码，并在微信中确认绑定。',
                qrContent: qr.qrContent,
                qrExpiresAt: Date.now() + QR_TTL_MS,
            });
            this.loginPromise = this.pollLogin(login).finally(() => {
                if (this.activeLogin === login)
                    this.activeLogin = null;
                this.loginPromise = null;
            });
        }
        catch (error) {
            this.publishError('获取微信绑定二维码失败', error);
        }
        return this.getStatus();
    }
    submitVerifyCode(code) {
        const normalized = code.trim();
        if (!this.activeLogin)
            throw new Error('当前没有等待验证的微信绑定流程。');
        if (!/^\d{1,8}$/.test(normalized))
            throw new Error('请输入微信中显示的数字验证码。');
        this.activeLogin.pendingVerifyCode = normalized;
        this.publish({ state: 'confirming', message: '正在验证数字，请稍候…' });
        return this.getStatus();
    }
    async cancelBinding() {
        this.cancelLogin(false);
        await this.loginPromise?.catch(() => undefined);
        if (this.enabled && this.credential) {
            this.startMonitor();
        }
        else {
            this.publish({
                state: this.enabled ? 'unbound' : 'disabled',
                enabled: this.enabled,
                bound: Boolean(this.credential),
                message: this.credential ? '已取消重新绑定。' : '已取消微信绑定。',
                qrContent: undefined,
                qrExpiresAt: undefined,
            });
        }
        return this.getStatus();
    }
    async unbind() {
        this.enabled = false;
        this.cancelLogin(false);
        await this.stopMonitor();
        this.stateStore?.clear();
        await this.credentialStore.delete();
        this.credential = null;
        this.stateStore = null;
        this.contextTokensByUser.clear();
        this.contextTokensByMessage.clear();
        this.publish({
            state: 'unbound',
            enabled: false,
            bound: false,
            accountId: undefined,
            accountDisplayName: undefined,
            message: '已解除微信 iLink 绑定。',
            qrContent: undefined,
            qrExpiresAt: undefined,
            lastConnectedAt: undefined,
            lastInboundAt: undefined,
            lastOutboundAt: undefined,
        });
        return this.getStatus();
    }
    async stop() {
        this.stopped = true;
        this.cancelLogin(false);
        await this.stopMonitor();
    }
    async send(message) {
        if (!this.enabled || !this.credential) {
            throw new Error('微信 iLink 当前未连接。');
        }
        const target = message.metadata?.wechat_ilink_user_id || message.metadata?.chat_id || message.metadata?.session_id;
        if (!target || typeof target !== 'string') {
            throw new Error('微信 iLink 回复缺少目标用户。');
        }
        if (target !== this.credential.ownerUserId) {
            throw new Error('微信 iLink 拒绝向未绑定的用户发送消息。');
        }
        const contextKey = typeof message.metadata?.wechat_ilink_context_key === 'string'
            ? message.metadata.wechat_ilink_context_key
            : undefined;
        const contextToken = (contextKey ? this.contextTokensByMessage.get(contextKey) : undefined) ||
            this.contextTokensByUser.get(target);
        const text = contentToText(message.content).trim();
        const artifacts = Array.isArray(message.metadata?.artifacts)
            ? message.metadata.artifacts.slice(0, MAX_ARTIFACTS_PER_REPLY)
            : [];
        if (!text && artifacts.length === 0)
            return;
        if (text) {
            for (const chunk of splitText(text, MAX_TEXT_CHARS)) {
                try {
                    await this.client.sendText({
                        baseUrl: this.credential.baseUrl,
                        token: this.credential.botToken,
                        toUserId: target,
                        contextToken,
                        text: chunk,
                    });
                }
                catch (error) {
                    if (isCredentialExpired(error))
                        this.markExpired();
                    throw error;
                }
            }
        }
        for (const artifact of artifacts) {
            try {
                await this.sendArtifact(artifact, target, contextToken);
            }
            catch (error) {
                if (isCredentialExpired(error))
                    this.markExpired();
                const title = artifact.title || path.basename(String(artifact.path || '文件'));
                console.error(`[WechatIlink] Failed to send artifact ${title}:`, safeError(error));
                await this.client.sendText({
                    baseUrl: this.credential.baseUrl,
                    token: this.credential.botToken,
                    toUserId: target,
                    contextToken,
                    text: `文件“${title}”发送失败：${safeError(error)}`,
                });
            }
        }
        if (contextKey)
            this.contextTokensByMessage.delete(contextKey);
        this.publish({ lastOutboundAt: Date.now() });
    }
    async notifyQueued(message, position) {
        if (!this.enabled || !this.credential)
            return;
        const target = message.metadata?.wechat_ilink_user_id || message.metadata?.chat_id || message.metadata?.session_id;
        if (!target || target !== this.credential.ownerUserId)
            return;
        const contextKey = typeof message.metadata?.wechat_ilink_context_key === 'string'
            ? message.metadata.wechat_ilink_context_key
            : undefined;
        const contextToken = (contextKey ? this.contextTokensByMessage.get(contextKey) : undefined)
            || this.contextTokensByUser.get(target);
        await this.client.sendText({
            baseUrl: this.credential.baseUrl,
            token: this.credential.botToken,
            toUserId: target,
            contextToken,
            // 必须同时给出 /stop：此前只提 /queue，用户能看到卡住却没有任何出路，
            // 只好去重启客户端甚至重装系统。看得见 ≠ 管得着。
            text: `已加入等待队列，前面还有 ${position} 项。`
                + `发送 /queue 查看正在执行什么，/stop 中止当前任务。`,
        });
    }
    async sendArtifact(artifact, target, contextToken) {
        if (!artifact || typeof artifact.path !== 'string' || !artifact.path.trim()) {
            throw new Error('产物缺少本地文件路径。');
        }
        const filePath = path.resolve(artifact.path);
        const handle = await fs.promises.open(filePath, 'r');
        let buffer;
        try {
            const stat = await handle.stat();
            if (!stat.isFile())
                throw new Error('产物路径不是普通文件。');
            if (stat.size > WECHAT_ILINK_MAX_MEDIA_BYTES)
                throw new Error('文件超过 50 MB 微信发送上限。');
            buffer = await handle.readFile();
        }
        finally {
            await handle.close();
        }
        const fileName = sanitizeWechatFileName(artifact.title || path.basename(filePath));
        const mime = artifact.mime || inferMimeType(fileName);
        const image = artifact.type === 'image' || mime.startsWith('image/');
        if (image && imageFileName(buffer)) {
            await this.client.sendImage({
                baseUrl: this.credential.baseUrl,
                token: this.credential.botToken,
                toUserId: target,
                contextToken,
                buffer,
            });
            return;
        }
        await this.client.sendFile({
            baseUrl: this.credential.baseUrl,
            token: this.credential.botToken,
            toUserId: target,
            contextToken,
            buffer,
            fileName,
        });
    }
    getStatus() {
        return { ...this.status };
    }
    async ensureCredentialLoaded() {
        if (this.credential)
            return;
        try {
            this.credential = await this.credentialStore.load();
            if (this.credential) {
                this.credential.baseUrl = validateWechatIlinkBaseUrl(this.credential.baseUrl);
                this.stateStore = new WechatIlinkStateStore(this.credential.accountId);
            }
        }
        catch (error) {
            console.error('[WechatIlink] Failed to load local credentials:', safeError(error));
            this.credential = null;
        }
    }
    async pollLogin(login) {
        while (!login.abortController.signal.aborted && this.activeLogin === login) {
            try {
                const response = await this.client.pollQrStatus(login.baseUrl, login.qrcode, login.pendingVerifyCode, login.abortController.signal);
                if (login.abortController.signal.aborted)
                    return;
                switch (response.status) {
                    case 'wait':
                        break;
                    case 'scaned':
                        login.pendingVerifyCode = undefined;
                        this.publish({ state: 'scanned', message: '已扫码，请在手机微信中确认绑定。' });
                        break;
                    case 'need_verifycode':
                        {
                            const previousCodeRejected = Boolean(login.pendingVerifyCode);
                            login.pendingVerifyCode = undefined;
                            this.publish({
                                state: 'need_verify_code',
                                message: previousCodeRejected
                                    ? '验证码不匹配，请重新输入微信中显示的数字。'
                                    : '请输入手机微信中显示的数字验证码。',
                            });
                            while (!login.pendingVerifyCode && !login.abortController.signal.aborted) {
                                await delay(200, login.abortController.signal).catch(() => undefined);
                            }
                            break;
                        }
                    case 'verify_code_blocked':
                        this.publish({ state: 'error', message: '验证码错误次数过多，请重新生成二维码。' });
                        login.abortController.abort();
                        return;
                    case 'expired':
                        this.publish({
                            state: 'qr_expired',
                            message: '绑定二维码已过期，请重新生成。',
                            qrContent: undefined,
                            qrExpiresAt: undefined,
                        });
                        login.abortController.abort();
                        return;
                    case 'scaned_but_redirect':
                        if (!response.redirect_host)
                            throw new Error('微信扫码跳转缺少服务地址。');
                        login.baseUrl = validateWechatIlinkBaseUrl(`https://${response.redirect_host}`);
                        break;
                    case 'binded_redirect':
                        if (!this.credential)
                            throw new Error('微信账号已绑定，但本机没有可用的安全凭据。');
                        login.abortController.abort();
                        this.startMonitor();
                        return;
                    case 'confirmed': {
                        if (!response.bot_token || !response.ilink_bot_id || !response.ilink_user_id) {
                            throw new Error('微信确认成功，但返回的账号凭据不完整。');
                        }
                        const credential = {
                            accountId: response.ilink_bot_id,
                            botToken: response.bot_token,
                            baseUrl: validateWechatIlinkBaseUrl(response.baseurl),
                            ownerUserId: response.ilink_user_id,
                            savedAt: new Date().toISOString(),
                        };
                        await this.credentialStore.save(credential);
                        this.contextTokensByUser.clear();
                        this.contextTokensByMessage.clear();
                        this.credential = credential;
                        this.stateStore = new WechatIlinkStateStore(credential.accountId);
                        login.abortController.abort();
                        this.publish({
                            state: 'connecting',
                            enabled: true,
                            bound: true,
                            accountId: credential.accountId,
                            accountDisplayName: maskOwner(credential.ownerUserId),
                            message: '微信绑定成功，正在建立消息连接…',
                            qrContent: undefined,
                            qrExpiresAt: undefined,
                        });
                        this.startMonitor();
                        return;
                    }
                }
            }
            catch (error) {
                if (login.abortController.signal.aborted)
                    return;
                if (error instanceof Error && error.name === 'AbortError')
                    continue;
                this.publishError('微信扫码状态查询失败', error);
                return;
            }
            await delay(600, login.abortController.signal).catch(() => undefined);
        }
    }
    startMonitor() {
        if (this.monitorPromise || !this.enabled || !this.credential || this.stopped)
            return;
        const abortController = new AbortController();
        this.monitorAbort = abortController;
        this.publish({
            state: 'connecting',
            enabled: true,
            bound: true,
            accountId: this.credential.accountId,
            accountDisplayName: maskOwner(this.credential.ownerUserId),
            message: '正在连接微信 iLink…',
        });
        this.monitorPromise = this.monitorLoop(this.credential, abortController.signal)
            .catch((error) => {
            if (!abortController.signal.aborted)
                this.publishError('微信 iLink 连接异常', error);
        })
            .finally(() => {
            if (this.monitorAbort === abortController)
                this.monitorAbort = null;
            this.monitorPromise = null;
        });
    }
    async monitorLoop(credential, signal) {
        const stateStore = new WechatIlinkStateStore(credential.accountId);
        this.stateStore = stateStore;
        let state = stateStore.load();
        let suggestedTimeout = 38_000;
        let failures = 0;
        let lifecycleReady = true;
        try {
            await this.client.notifyStart(credential.baseUrl, credential.botToken);
        }
        catch (error) {
            if (isCredentialExpired(error)) {
                this.markExpired();
                return;
            }
            lifecycleReady = false;
            console.warn('[WechatIlink] notifyStart failed; continuing:', safeError(error));
        }
        this.publish({
            state: lifecycleReady ? 'connected' : 'reconnecting',
            enabled: true,
            bound: true,
            accountId: credential.accountId,
            accountDisplayName: maskOwner(credential.ownerUserId),
            message: lifecycleReady
                ? '微信 iLink 已连接，可以在微信 ClawBot 中给 Agent 下达任务。'
                : '正在确认微信 iLink 消息连接…',
            ...(lifecycleReady ? { lastConnectedAt: Date.now() } : {}),
        });
        while (!signal.aborted && this.enabled) {
            try {
                const response = await this.client.getUpdates({
                    baseUrl: credential.baseUrl,
                    token: credential.botToken,
                    cursor: state.cursor,
                    timeoutMs: Math.max(38_000, suggestedTimeout + 3000),
                    signal,
                });
                if (signal.aborted)
                    return;
                if ((response.ret ?? 0) !== 0) {
                    throw new WechatIlinkApiError(response.errmsg || '微信消息连接返回错误。', response.ret, response.errcode);
                }
                failures = 0;
                suggestedTimeout = response.longpolling_timeout_ms || suggestedTimeout;
                const nextCursor = typeof response.get_updates_buf === 'string' && response.get_updates_buf
                    ? response.get_updates_buf
                    : undefined;
                this.publish({
                    state: 'connected',
                    enabled: true,
                    bound: true,
                    accountId: credential.accountId,
                    accountDisplayName: maskOwner(credential.ownerUserId),
                    message: '微信 iLink 已连接，可以在微信 ClawBot 中给 Agent 下达任务。',
                    lastConnectedAt: Date.now(),
                });
                for (const incoming of response.msgs ?? []) {
                    if (incoming.message_type !== USER_MESSAGE_TYPE)
                        continue;
                    if (incoming.group_id) {
                        console.warn('[WechatIlink] Ignored a group message; this channel is direct-message only.');
                        continue;
                    }
                    if (!incoming.from_user_id || incoming.from_user_id !== credential.ownerUserId) {
                        console.warn('[WechatIlink] Ignored a message from an unbound user.');
                        continue;
                    }
                    if (incoming.context_token) {
                        this.contextTokensByUser.set(incoming.from_user_id, incoming.context_token);
                    }
                    await this.handleIncoming(incoming, credential).catch((error) => {
                        console.error('[WechatIlink] Failed to process incoming message:', safeError(error));
                    });
                }
                // Advance the cursor only after every eligible message in this batch has
                // been durably accepted (or explicitly rejected with a channel notice).
                if (nextCursor) {
                    state.cursor = nextCursor;
                    stateStore.save(state);
                }
            }
            catch (error) {
                if (signal.aborted)
                    return;
                if (error instanceof Error && error.name === 'AbortError')
                    continue;
                if (isCredentialExpired(error)) {
                    this.markExpired();
                    return;
                }
                failures += 1;
                const waitMs = Math.min(30_000, 1000 * 2 ** Math.min(failures, 5));
                this.publish({
                    state: 'reconnecting',
                    message: `微信网络连接中断，正在自动重连（${Math.round(waitMs / 1000)} 秒）…`,
                });
                await delay(waitMs, signal).catch(() => undefined);
            }
        }
    }
    async handleIncoming(incoming, credential) {
        const text = extractText(incoming);
        const fromUserId = incoming.from_user_id;
        this.publish({ lastInboundAt: Date.now() });
        if (await this.handleQueueCommand(text, incoming, credential)) {
            return;
        }
        const items = incoming.item_list ?? [];
        const voiceItems = items.filter((item) => item.type === VOICE_ITEM_TYPE);
        if (voiceItems.length > 0) {
            // iLink 正常会给转写（已实测）。保留这条日志是因为一旦哪天不给了，
            // 表象只是"语音消息没反应"，很难归因；有 transcript=no 就能一眼定位。
            for (const item of voiceItems) {
                const transcript = typeof item.voice_item?.text === 'string' ? item.voice_item.text.trim() : '';
                console.log(`[WechatIlink] Voice item received: transcript=${transcript ? `yes(${transcript.length} chars)` : 'no'}`
                    + `, hasMedia=${!!item.voice_item?.media}`);
            }
            // text 已包含语音转写（见 extractText）。取不到转写才退回拒收。
            if (!text) {
                await this.sendChannelNotice(credential, fromUserId, incoming.context_token, '这条语音没有附带文字转写，暂时无法处理，请改用文字、图片或文件发送任务。');
                return;
            }
        }
        const imageItems = items.filter((item) => item.type === IMAGE_ITEM_TYPE);
        const mediaItem = items.find((item) => item.type === FILE_ITEM_TYPE || item.type === VIDEO_ITEM_TYPE);
        if (imageItems.length === 0 && !mediaItem) {
            if (!text) {
                await this.sendChannelNotice(credential, fromUserId, incoming.context_token, '这条消息里没有可处理的文字、图片或文件，请换一种方式发送。');
                return;
            }
            await this.dispatchToAgent(incoming, credential, text);
            return;
        }
        try {
            if (imageItems.length > 0) {
                if (imageItems.length > MAX_AGENT_IMAGES_PER_MESSAGE) {
                    await this.sendChannelNotice(credential, fromUserId, incoming.context_token, `一次最多处理 ${MAX_AGENT_IMAGES_PER_MESSAGE} 张图片，当前消息包含 ${imageItems.length} 张，请分批发送。`);
                    return;
                }
                const content = [{
                        type: 'text',
                        text: text || (imageItems.length > 1 ? '请理解这些图片并说明其中的重要信息。' : '请理解这张图片并说明其中的重要信息。'),
                    }];
                const savedPaths = [];
                let resizedCount = 0;
                for (const imageItem of imageItems) {
                    const image = imageItem.image_item;
                    if (!image?.media)
                        throw new Error('图片消息缺少媒体信息');
                    const buffer = await this.client.downloadMedia({
                        media: image.media,
                        aesKeyHex: image.aeskey,
                        allowPlain: true,
                    });
                    const detected = imageFileName(buffer);
                    const filePath = await saveWechatMedia({
                        workspaceDir: this.workspaceDir,
                        buffer,
                        fileName: detected?.fileName || 'wechat-image.bin',
                    });
                    if (!detected) {
                        await this.sendUnsupportedFileNotice(credential, fromUserId, incoming.context_token, filePath, '图片');
                        return;
                    }
                    const prepared = await this.imagePreparer({
                        buffer,
                        filePath,
                    });
                    if (prepared.kind === 'unavailable') {
                        await this.sendChannelNotice(credential, fromUserId, incoming.context_token, `图片无法进入 Agent 处理（${prepared.reason}），原图已经保存在：${filePath}`);
                        return;
                    }
                    if (Array.isArray(prepared.content))
                        content.push(...prepared.content);
                    else
                        content.push({ type: 'text', text: prepared.content });
                    savedPaths.push(filePath);
                    if (prepared.resized)
                        resizedCount += 1;
                }
                console.log(`[WechatIlink] Prepared ${savedPaths.length} image(s) for the selected Agent model `
                    + `(resized=${resizedCount}, paths=${savedPaths.join(', ')})`);
                await this.dispatchToAgent(incoming, credential, content);
                return;
            }
            if (!mediaItem)
                return;
            if (mediaItem.type === VIDEO_ITEM_TYPE) {
                const media = mediaItem.video_item?.media;
                if (!media)
                    throw new Error('视频消息缺少媒体信息');
                const buffer = await this.client.downloadMedia({ media });
                const filePath = await saveWechatMedia({
                    workspaceDir: this.workspaceDir,
                    buffer,
                    fileName: 'wechat-video.mp4',
                });
                await this.sendUnsupportedFileNotice(credential, fromUserId, incoming.context_token, filePath, '视频');
                return;
            }
            const fileItem = mediaItem.file_item;
            if (!fileItem?.media)
                throw new Error('文件消息缺少媒体信息');
            const buffer = await this.client.downloadMedia({ media: fileItem.media });
            const fileName = sanitizeWechatFileName(fileItem.file_name, 'wechat-file.bin');
            const filePath = await saveWechatMedia({ workspaceDir: this.workspaceDir, buffer, fileName });
            const mime = inferMimeType(fileName);
            if (!canUnderstandDocument(fileName, mime)) {
                await this.sendUnsupportedFileNotice(credential, fromUserId, incoming.context_token, filePath, fileName);
                return;
            }
            if (buffer.length > MAX_DOCUMENT_PARSE_BYTES) {
                await this.sendChannelNotice(credential, fromUserId, incoming.context_token, `文件“${fileName}”已经保存在：${filePath}。由于文件超过 20 MB，为避免占用过多本机资源，暂时没有自动解析内容。`);
                return;
            }
            if (!hasExpectedDocumentSignature(buffer, fileName, mime)) {
                await this.sendUnsupportedFileNotice(credential, fromUserId, incoming.context_token, filePath, fileName);
                return;
            }
            let converted;
            try {
                converted = await DocConverter.convertToMarkdown(buffer, fileName, mime);
            }
            catch (error) {
                console.warn(`[WechatIlink] Cannot extract ${fileName}: ${safeError(error)}`);
                await this.sendUnsupportedFileNotice(credential, fromUserId, incoming.context_token, filePath, fileName);
                return;
            }
            const extracted = converted.content.length > MAX_EXTRACTED_FILE_CHARS
                ? `${converted.content.slice(0, MAX_EXTRACTED_FILE_CHARS)}\n\n[文件内容过长，已截断后续内容]`
                : converted.content;
            const content = [
                text || `请阅读并处理文件“${fileName}”。`,
                `微信文件已保存到：${filePath}`,
                attachedFileTag(filePath),
                `以下是从文件“${fileName}”提取的内容：\n\n${extracted}`,
            ].join('\n\n');
            await this.dispatchToAgent(incoming, credential, content);
        }
        catch (error) {
            console.error('[WechatIlink] Failed to receive media:', safeError(error));
            await this.sendChannelNotice(credential, fromUserId, incoming.context_token, `文件接收失败，暂时没有保存到本地：${safeError(error)}`);
        }
    }
    async handleQueueCommand(text, incoming, credential) {
        if (!this.requestHandler)
            return false;
        const parsed = parseQueueCommand(text);
        if (!parsed)
            return false;
        const sessionId = incoming.from_user_id;
        let reply = '';
        if (parsed.name === 'queue') {
            reply = formatQueueReport(await this.requestHandler('queue_get', { sessionId }));
        }
        else if (parsed.name === 'help' || parsed.name === '?') {
            reply = QUEUE_HELP_TEXT;
        }
        else if (parsed.name === 'stop') {
            // 先看有没有东西在跑：没有就别发 stop_generation，也别谎报"已请求中止"。
            const plan = planStopCommand(await this.requestHandler('queue_get', { sessionId }));
            if (plan.shouldStop)
                await this.requestHandler('stop_generation', { sessionId });
            reply = plan.reply;
        }
        else if (parsed.name === 'clear') {
            const snapshot = await this.requestHandler('queue_get', { sessionId });
            const cleared = Array.isArray(snapshot?.pending) ? snapshot.pending.length : 0;
            if (cleared === 0) {
                reply = '等待队列已经是空的。发送 /queue 可查看当前状态。';
            }
            else {
                await this.requestHandler('queue_clear', { sessionId });
                reply = `已清空等待队列（${cleared} 项）。正在执行的任务不受影响，需要中止请发送 /stop。`;
            }
        }
        else if (parsed.name === 'resume') {
            const snapshot = await this.requestHandler('queue_get', { sessionId });
            if (!snapshot?.paused) {
                reply = '队列当前没有暂停，无需恢复。发送 /queue 可查看当前状态。';
            }
            else {
                await this.requestHandler('queue_resume', { sessionId });
                reply = '已恢复队列，将继续执行等待中的任务。';
            }
        }
        else if (parsed.name === 'cancel') {
            // 参数缺失/非法时给提示，而不是把 "/cancel" 当聊天内容丢给 agent。
            const position = /^\d+$/.test(parsed.arg ?? '') ? Number(parsed.arg) : NaN;
            if (!Number.isInteger(position) || position < 1) {
                reply = '用法：/cancel N（N 是等待队列中的序号，例如 /cancel 2）。发送 /queue 可查看序号。';
            }
            else {
                const snapshot = await this.requestHandler('queue_get', { sessionId });
                const pending = Array.isArray(snapshot?.pending) ? snapshot.pending : [];
                const target = pending[position - 1];
                if (!target) {
                    reply = pending.length === 0
                        ? '等待队列为空，没有可取消的任务。'
                        : `等待队列只有 ${pending.length} 项，没有第 ${position} 项。发送 /queue 查看序号。`;
                }
                else {
                    await this.requestHandler('queue_cancel', { sessionId, turnId: target.turnId });
                    reply = `已取消第 ${position} 项：${clipPreview(target.preview)}`;
                }
            }
        }
        else {
            // 不认识的 /xxx 一律当普通消息交给 agent —— 用户可能真的在说以斜杠开头的内容。
            return false;
        }
        await this.sendChannelNotice(credential, sessionId, incoming.context_token, reply);
        return true;
    }
    async dispatchToAgent(incoming, credential, content) {
        if (!this.onMessage)
            return;
        const fromUserId = incoming.from_user_id;
        const stableMessageId = incoming.message_id ?? incoming.seq ?? incoming.create_time_ms ?? Date.now();
        const contextKey = `${credential.accountId}:${stableMessageId}`;
        if (incoming.context_token) {
            this.contextTokensByMessage.set(contextKey, incoming.context_token);
            while (this.contextTokensByMessage.size > 1000) {
                const oldest = this.contextTokensByMessage.keys().next().value;
                if (typeof oldest !== 'string')
                    break;
                this.contextTokensByMessage.delete(oldest);
            }
        }
        const message = {
            id: `wechat-ilink:${credential.accountId}:${stableMessageId}`,
            role: 'user',
            content,
            senderId: fromUserId,
            senderName: '微信用户',
            source: 'wechat-ilink',
            timestamp: incoming.create_time_ms ?? Date.now(),
            metadata: {
                chat_id: fromUserId,
                session_id: incoming.session_id,
                wechat_ilink_context_key: contextKey,
                wechat_ilink_user_id: fromUserId,
                wechat_ilink_account_id: credential.accountId,
                // 不给 traceId 的话 kernel 会回落到 crypto.randomUUID()：日志照写，
                // 但那个随机 id 只存在于文件名里，外部无从得知，事后完全没法反查。
                // 用 stableMessageId 保证它可由「账号 + 这条消息」推导出来。
                traceId: makeTraceId('ilink', credential.accountId, stableMessageId),
            },
        };
        await this.onMessage(message);
    }
    async sendUnsupportedFileNotice(credential, toUserId, contextToken, filePath, fileLabel) {
        await this.sendChannelNotice(credential, toUserId, contextToken, `诶呀，我目前还识别不了这些类型${fileLabel === '视频' ? '视频' : '文件'}，我已将他们保存：${filePath}`);
    }
    async sendChannelNotice(credential, toUserId, contextToken, text) {
        try {
            await this.client.sendText({
                baseUrl: credential.baseUrl,
                token: credential.botToken,
                toUserId,
                contextToken,
                text,
            });
            this.publish({ lastOutboundAt: Date.now() });
        }
        catch (error) {
            if (isCredentialExpired(error))
                this.markExpired();
            throw error;
        }
    }
    async stopMonitor() {
        const abortController = this.monitorAbort;
        const running = this.monitorPromise;
        abortController?.abort();
        if (running)
            await running.catch(() => undefined);
        if (this.credential) {
            await this.client
                .notifyStop(this.credential.baseUrl, this.credential.botToken)
                .catch(() => undefined);
        }
    }
    cancelLogin(publish = true) {
        this.activeLogin?.abortController.abort();
        this.activeLogin = null;
        if (publish) {
            this.publish({
                state: this.enabled ? 'unbound' : 'disabled',
                qrContent: undefined,
                qrExpiresAt: undefined,
            });
        }
    }
    markExpired() {
        this.monitorAbort?.abort();
        this.publish({
            state: 'expired',
            enabled: this.enabled,
            bound: true,
            message: '微信 iLink 登录状态已过期，请在设置中重新扫码绑定。',
        });
    }
    publishError(prefix, error) {
        this.publish({
            state: 'error',
            message: `${prefix}：${safeError(error)}`,
            qrContent: undefined,
            qrExpiresAt: undefined,
        });
    }
    publish(patch) {
        this.status = { ...this.status, ...patch, updatedAt: Date.now() };
        this.statusListener?.(this.getStatus());
    }
}
export function extractText(message) {
    return (message.item_list ?? [])
        .map((item) => {
        if (item.type === TEXT_ITEM_TYPE)
            return item.text_item?.text;
        // 语音：iLink 服务端会自动 ASR，转写结果放在 voice_item.text。已实测确认
        // （发送"你好，在吗"→ voice_item.text 得到 5 字符转写），协议文档也把 type 3
        // 描述为 "Silk-encoded with transcription"。
        // 仍然不假设它一定有值：取不到转写时由 handleIncoming 退回拒收提示，
        // 而不是产出空消息去打扰 agent。
        if (item.type === VOICE_ITEM_TYPE)
            return item.voice_item?.text;
        return undefined;
    })
        .filter((text) => typeof text === 'string')
        .map((text) => text.trim())
        .filter(Boolean)
        .join('\n');
}
export function contentToText(content) {
    if (typeof content === 'string')
        return content;
    return content
        .filter((part) => part.type === 'text' && typeof part.text === 'string')
        .map((part) => part.text)
        .join('\n');
}
/**
 * /queue 的输出预算。
 *
 * iLink 协议没有下发"最大文本长度"字段，社区实现普遍以 2000 字符作为保守兼容
 * 上限（见 docs 引用）。本仓的 MAX_TEXT_CHARS 是 4000，但队列报告不该去赌那个
 * 更宽的值：MAX_PENDING=20、单条 preview 上限 240 字符，原样罗列会到 4800+，
 * 既超本仓设置也远超保守线。所以这里自己截断，保证整份报告稳定在千字级。
 */
const QUEUE_PREVIEW_CHARS = 40;
const QUEUE_MAX_LISTED = 8;
const QUEUE_HELP_TEXT = [
    '可用命令：',
    '/queue  查看正在执行的任务和等待队列',
    '/stop   中止当前正在执行的任务',
    '/cancel N  取消等待队列中的第 N 项',
    '/clear  清空等待队列（不影响正在执行的）',
    // 没有"用户主动暂停"这个命令，所以不能只说"恢复已暂停的队列"—— 用户会疑惑
    // 自己何时暂停过。队列会在三种情况下自动暂停：某轮执行失败且后面还有排队、
    // 用户 /stop、客户端上次被强杀（recovery_required）。这里说明的是"何时需要它"。
    '/resume 队列因失败或异常中断而暂停时，用它继续',
    '/help   显示本说明',
].join('\n');
/**
 * 解析队列命令。
 *
 * 微信里手输命令有几种常见走样：中文输入法给出全角斜杠「／」、大小写不一致
 * （/Stop）、顺手带上句末标点（/stop。）。这些都该识别，否则用户会以为命令没实现。
 * 认不出来时返回 null，由调用方把消息原样交给 agent —— 用户可能真的在说以斜杠
 * 开头的内容（比如某个路径）。
 */
export function parseQueueCommand(text) {
    const trimmed = String(text ?? '').trim().replace(/^／/, '/');
    if (!trimmed.startsWith('/'))
        return null;
    let body = trimmed.slice(1);
    // 只在有实际内容时剥末尾标点，否则 "/?" 会被剥成空串。
    if (body.length > 1)
        body = body.replace(/[。，、；：！？.,;:!?]+$/, '');
    const parts = body.trim().split(/\s+/);
    const name = (parts.shift() || '').toLowerCase();
    if (!name)
        return null;
    const arg = parts.join(' ').trim();
    return arg ? { name, arg } : { name };
}
function clipPreview(preview) {
    const text = String(preview ?? '').replace(/\s+/g, ' ').trim();
    if (!text)
        return '[无内容]';
    return text.length > QUEUE_PREVIEW_CHARS ? `${text.slice(0, QUEUE_PREVIEW_CHARS)}…` : text;
}
function formatElapsed(elapsedMs) {
    const totalMinutes = Math.floor(elapsedMs / 60_000);
    if (totalMinutes < 1)
        return '不到 1 分钟';
    if (totalMinutes < 60)
        return `${totalMinutes} 分钟`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes === 0 ? `${hours} 小时` : `${hours} 小时 ${minutes} 分钟`;
}
/**
 * 把队列快照渲染成用户可读的任务栈报告。
 *
 * 关键是 activeTool 那一行：卡住时用户（和我们）此前只能看到自己发的那句话，
 * 根本判断不出是哪个环节在阻塞。有了"当前工具 + 已耗时"，才谈得上定位根因。
 */
export function formatQueueReport(snapshot) {
    const lines = [];
    const active = snapshot?.active;
    if (active) {
        const startedAt = typeof active.startedAt === 'number' ? active.startedAt : undefined;
        const age = startedAt ? `（已 ${formatElapsed(Date.now() - startedAt)}）` : '';
        lines.push(`正在执行${age}：${clipPreview(active.preview)}`);
        const tool = snapshot?.activeTool;
        if (tool && typeof tool.startedAt === 'number') {
            const concurrent = Number(tool.concurrent) > 1 ? `，共 ${tool.concurrent} 个并行` : '';
            lines.push(`└ 当前工具：${tool.name}，已 ${formatElapsed(Date.now() - tool.startedAt)}${concurrent}`);
        }
        else if (tool) {
            lines.push(`└ 当前工具：${tool.name}`);
        }
        else {
            lines.push('└ 当前未在调用工具（可能在等模型返回）');
        }
    }
    else {
        lines.push('当前没有正在执行的任务。');
    }
    const pending = Array.isArray(snapshot?.pending) ? snapshot.pending : [];
    if (pending.length === 0) {
        lines.push('等待队列为空。');
    }
    else {
        lines.push(`等待中 ${pending.length} 项：`);
        for (const [index, item] of pending.slice(0, QUEUE_MAX_LISTED).entries()) {
            lines.push(`${index + 1}. ${clipPreview(item?.preview)}`);
        }
        if (pending.length > QUEUE_MAX_LISTED) {
            lines.push(`…其余 ${pending.length - QUEUE_MAX_LISTED} 项已省略`);
        }
    }
    if (snapshot?.paused)
        lines.push('队列当前已暂停，发送 /resume 恢复。');
    lines.push('发送 /help 查看全部命令。');
    return lines.join('\n');
}
/**
 * 决定 /stop 该不该真的去中止，以及回什么。
 *
 * 拆成纯函数是因为这里全是"别对用户说假话"的边界：没有任务在跑时不能回"已请求
 * 中止"；pending 为空时 pause() 会把暂停态清掉（turn_queue.ts:267），所以也不能
 * 承诺"队列保持暂停"；恢复态的 active 是上次进程留下的僵尸，中止它没有意义。
 */
export function planStopCommand(snapshot) {
    const active = snapshot?.active;
    const pendingCount = Array.isArray(snapshot?.pending) ? snapshot.pending.length : 0;
    const pausedReason = snapshot?.paused?.reason;
    if (active && pausedReason === 'recovery_required') {
        const tail = pendingCount > 0 ? `，或 /clear 丢弃等待中的 ${pendingCount} 项` : '';
        return {
            shouldStop: false,
            reply: `当前没有正在执行的任务：上次执行被意外中断，队列处于暂停态。发送 /resume 继续${tail}。`,
        };
    }
    if (!active) {
        return {
            shouldStop: false,
            reply: pendingCount > 0
                ? `当前没有正在执行的任务，等待队列还有 ${pendingCount} 项。`
                    + `发送 /queue 查看，/resume 继续，或 /clear 清空。`
                : '当前没有正在执行的任务。发送 /queue 可查看任务队列。',
        };
    }
    if (pausedReason === 'user_stopped') {
        return {
            shouldStop: true,
            reply: `已再次请求中止：${clipPreview(active.preview)}。`
                + `若仍未结束，说明它卡在某个工具上，发送 /queue 可看是哪个。`,
        };
    }
    return {
        shouldStop: true,
        reply: `已请求中止：${clipPreview(active.preview)}。`
            + (pendingCount > 0
                ? `等待队列将保持暂停，发送 /resume 继续，或 /clear 清空 ${pendingCount} 项。`
                : ''),
    };
}
export function splitText(text, maxChars = MAX_TEXT_CHARS) {
    if (text.length <= maxChars)
        return [text];
    const chunks = [];
    let remaining = text;
    while (remaining.length > maxChars) {
        const candidate = remaining.slice(0, maxChars);
        const newline = candidate.lastIndexOf('\n');
        const splitAt = newline > maxChars * 0.6 ? newline : maxChars;
        chunks.push(remaining.slice(0, splitAt));
        remaining = remaining.slice(splitAt).replace(/^\n/, '');
    }
    if (remaining)
        chunks.push(remaining);
    return chunks;
}
function maskOwner(ownerUserId) {
    if (!ownerUserId)
        return undefined;
    const opaqueId = ownerUserId.trim().replace(/@im\.wechat$/i, '');
    if (!opaqueId)
        return '已绑定微信账号';
    return `已绑定微信账号（iLink 标识 ····${opaqueId.slice(-4)}）`;
}
function isCredentialExpired(error) {
    return (error instanceof WechatIlinkApiError &&
        (error.errcode === -14 || error.ret === -14));
}
function safeError(error) {
    const message = error instanceof Error ? error.message : String(error);
    return message
        .replace(/Bearer\s+[^\s]+/gi, 'Bearer ***')
        .replace(/bot_token["'=:\s]+[^\s,"']+/gi, 'bot_token=***')
        .slice(0, 300);
}
function delay(ms, signal) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new Error('aborted'));
            return;
        }
        const onAbort = () => {
            clearTimeout(timer);
            reject(new Error('aborted'));
        };
        const timer = setTimeout(() => {
            signal?.removeEventListener('abort', onAbort);
            resolve();
        }, ms);
        signal?.addEventListener('abort', onAbort, { once: true });
    });
}
