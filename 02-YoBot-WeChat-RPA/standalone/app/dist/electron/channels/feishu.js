import { ConfigManager } from '../core/config/manager.js';
import { config } from '../config/index.js';
import { saveUploadedImage } from '../utils/image_bytes.js';
import { MAX_SOURCE_IMAGE_BYTES, prepareSavedImageForAgent, } from '../utils/image_context.js';
import { makeTraceId } from '../utils/trace_id.js';
import * as lark from '@larksuiteoapi/node-sdk';
export class FeishuAdapter {
    name = "feishu";
    client;
    wsClient = null;
    messageHandler = null;
    processedMessageIds = new Set();
    startTime;
    workspaceDir;
    // Active Card State for Streaming Feedback
    activeCardIds = new Map(); // chatId -> messageId
    activeCardContent = new Map(); // chatId -> lines
    updateTimers = new Map(); // chatId -> timer
    constructor(options = {}) {
        this.workspaceDir = options.workspaceDir ?? config.workspaceDir;
        this.startTime = Date.now();
        this.initializeClient();
    }
    initializeClient() {
        const config = ConfigManager.getInstance().getConfig();
        const appId = config.channels?.feishu?.appId;
        const appSecret = config.channels?.feishu?.appSecret;
        if (!appId || !appSecret) {
            console.log('[Feishu] Config missing (AppID/Secret), skipping initialization.');
            return;
        }
        this.client = new lark.Client({
            appId: appId,
            appSecret: appSecret,
            appType: lark.AppType.SelfBuild,
            domain: lark.Domain.Feishu,
            loggerLevel: lark.LoggerLevel.error,
        });
    }
    async start(onMessage) {
        this.messageHandler = onMessage;
        // Reload config in case it changed
        this.initializeClient();
        const config = ConfigManager.getInstance().getConfig();
        const appId = config.channels?.feishu?.appId;
        const appSecret = config.channels?.feishu?.appSecret;
        if (!appId || !appSecret) {
            console.warn("[Feishu] AppID or AppSecret not configured, skipping start.");
            return;
        }
        console.log(`[Feishu] Starting WebSocket client... AppID: ${appId.slice(0, 5)}***`);
        // Connectivity Probe
        try {
            console.log(`[Feishu] Probing API connectivity (Domain: ${lark.Domain.Feishu})...`);
            // Attempt to get App Access Token to verify credentials and network
            const clientAny = this.client;
            // Use the internal method to request token directly
            const res = await clientAny.auth.appAccessToken.internal({
                data: {
                    app_id: appId,
                    app_secret: appSecret
                }
            });
            if (res.code !== 0) {
                console.error(`[Feishu] API Probe FAILED. Code: ${res.code}, Msg: ${res.msg}`);
                console.error(`[Feishu] Possible Cause: AppSecret is incorrect or expired.`);
            }
            else {
                console.log("[Feishu] API Probe Success. Token received.");
            }
        }
        catch (e) {
            console.error("[Feishu] API Probe Failed. This indicates Network or Auth issue.", e);
        }
        try {
            // Create WS Client
            // Define custom logger to suppress specific known errors (e.g. system busy 1000040345)
            const customLogger = {
                debug: (...args) => console.debug("[Feishu Debug]", ...args),
                trace: (...args) => console.log("[Feishu Trace]", ...args), // Enable trace
                info: (...args) => console.info("[Feishu Info]", ...args),
                warn: (...args) => console.warn("[Feishu Warn]", ...args),
                error: (...args) => {
                    const msg = args.map(a => String(a)).join(' ');
                    if (msg.includes('1000040345') || msg.includes('system busy')) {
                        return; // Suppress
                    }
                    if (msg.includes('Cannot read properties of undefined') && msg.includes('PingInterval')) {
                        return; // Suppress undefined PingInterval error
                    }
                    console.error("[Feishu Error]", ...args);
                }
            };
            // Silence the default logger of lark-ws-sdk
            this.wsClient = new lark.WSClient({
                appId: appId,
                appSecret: appSecret,
                loggerLevel: lark.LoggerLevel.debug, // Enable debug level
                logger: customLogger,
            });
            // Register Event Handler
            const eventDispatcher = new lark.EventDispatcher({}).register({
                'im.message.receive_v1': async (data) => {
                    console.log("[Feishu] Raw WebSocket Event Received:", JSON.stringify(data).slice(0, 100) + "...");
                    // Do not await the heavy processing to avoid blocking the WebSocket ack/heartbeat
                    // This prevents Feishu from thinking the message failed and resending it
                    this.handleFeishuMessage(data).catch(e => console.error("[Feishu] Error handling message:", e));
                }
            });
            await this.wsClient.start({
                eventDispatcher: eventDispatcher
            });
            console.log("[Feishu] WebSocket client started.");
        }
        catch (error) {
            console.error("[Feishu] Failed to start WebSocket client:", error);
        }
    }
    async stop() {
        console.log("[Feishu] Stopping...");
        // WSClient doesn't have a stop method exposed easily, usually relying on process exit
    }
    async send(message) {
        if (!message.metadata || !message.metadata.chat_id) {
            console.error("[Feishu] Cannot send message: missing chat_id in metadata");
            return;
        }
        const chatId = message.metadata.chat_id;
        if (!this.client) {
            console.error("[Feishu] Cannot send message: Client not initialized");
            return;
        }
        // Finish any active card for this chat
        if (this.activeCardIds.has(chatId)) {
            if (this.updateTimers.has(chatId)) {
                clearTimeout(this.updateTimers.get(chatId));
                this.updateTimers.delete(chatId);
            }
            await this.updateCard(chatId, 'completed');
        }
        try {
            await this.client.im.message.create({
                params: {
                    receive_id_type: 'chat_id',
                },
                data: {
                    receive_id: chatId,
                    msg_type: 'text',
                    content: JSON.stringify({
                        text: message.content
                    })
                }
            });
        }
        catch (e) {
            console.error("[Feishu] Failed to send message:", e);
        }
    }
    async sendEvent(event, metadata) {
        if (!metadata || !metadata.chat_id)
            return;
        const chatId = metadata.chat_id;
        // Only handle specific events
        if (!['think', 'tool_start', 'tool_result'].includes(event.type))
            return;
        let line = '';
        if (event.type === 'think') {
            // Filter empty descriptions
            if (!event.description || event.description.trim().length === 0)
                return;
            line = `> 💭 ${event.description}`;
        }
        else if (event.type === 'tool_start') {
            line = `> 🔧 调用工具: **${event.toolName}**`;
        }
        else if (event.type === 'tool_result') {
            const result = typeof event.toolResult === 'string' ? event.toolResult : JSON.stringify(event.toolResult);
            // Truncate result for display
            line = `> ✅ 工具结果: ${result.slice(0, 50)}${result.length > 50 ? '...' : ''}`;
        }
        if (!line)
            return;
        // Initialize content array if needed
        if (!this.activeCardContent.has(chatId)) {
            this.activeCardContent.set(chatId, []);
        }
        // Append new line
        const lines = this.activeCardContent.get(chatId);
        lines.push(line);
        // Keep only last 15 lines to avoid card getting too large and hitting limits
        if (lines.length > 15) {
            lines.shift();
        }
        // Check if we have an active card
        if (!this.activeCardIds.has(chatId)) {
            // Send new card immediately
            await this.sendInitialCard(chatId, lines);
        }
        else {
            // Schedule update (Debounce)
            this.scheduleCardUpdate(chatId);
        }
    }
    async sendInitialCard(chatId, lines) {
        if (!this.client)
            return;
        const card = this.buildCard(lines, "running");
        try {
            const response = await this.client.im.message.create({
                params: { receive_id_type: 'chat_id' },
                data: {
                    receive_id: chatId,
                    msg_type: 'interactive',
                    content: JSON.stringify(card)
                }
            });
            if (response.data && response.data.message_id) {
                this.activeCardIds.set(chatId, response.data.message_id);
            }
        }
        catch (e) {
            console.error("[Feishu] Failed to send initial card:", e);
        }
    }
    scheduleCardUpdate(chatId) {
        if (this.updateTimers.has(chatId))
            return;
        const timer = setTimeout(() => {
            this.updateTimers.delete(chatId);
            this.updateCard(chatId);
        }, 3000); // 3 seconds debounce (Throttle actually) to reduce API calls
        this.updateTimers.set(chatId, timer);
    }
    async updateCard(chatId, status = 'running') {
        const messageId = this.activeCardIds.get(chatId);
        const lines = this.activeCardContent.get(chatId);
        if (!messageId || !lines || !this.client)
            return;
        const card = this.buildCard(lines, status);
        try {
            await this.client.im.message.patch({
                path: { message_id: messageId },
                data: {
                    content: JSON.stringify(card)
                }
            });
            if (status === 'completed') {
                this.activeCardIds.delete(chatId);
                this.activeCardContent.delete(chatId);
            }
        }
        catch (e) {
            console.error(`[Feishu] Failed to update card ${messageId}:`, e);
            // Only clear active card if it's a "Message Not Found" error (meaning it was deleted)
            // or other fatal errors. For network timeouts, we should keep trying or let the next update succeed.
            const errStr = String(e);
            if (errStr.includes("message not found") || errStr.includes("deleted") || errStr.includes("1000040345")) {
                this.activeCardIds.delete(chatId);
                this.activeCardContent.delete(chatId);
            }
        }
    }
    buildCard(lines, status) {
        const color = status === 'running' ? 'blue' : 'green';
        const title = status === 'running' ? 'bot 思考中...' : 'bot 执行完成';
        const contentText = lines.join('\n');
        return {
            config: { wide_screen_mode: true },
            header: {
                template: color,
                title: { tag: 'plain_text', content: title }
            },
            elements: [
                {
                    tag: 'div',
                    text: {
                        tag: 'lark_md',
                        content: contentText
                    }
                }
            ]
        };
    }
    async handleFeishuMessage(data) {
        // Debug: Log raw data structure to understand what we receive
        // console.log("[Feishu] Raw event data:", JSON.stringify(data).slice(0, 200));
        // data structure depends on the event. For im.message.receive_v1:
        const event = data;
        const msg = event.message;
        if (!msg) {
            return;
        }
        if (msg.message_type !== 'text' && msg.message_type !== 'image') {
            console.log(`[Feishu] Unsupported message type ignored: ${msg.message_type} (msg_id: ${msg.message_id})`);
            return;
        }
        console.log(`[Feishu] Received message: ${msg.message_id} from ${msg.chat_id} (type: ${msg.message_type})`);
        // 0. 时效性检查：忽略过早的历史消息 (例如超过5分钟前的)
        // 飞书 create_time 是毫秒级时间戳字符串
        const msgTime = parseInt(msg.create_time);
        const now = Date.now();
        const MAX_AGE = 5 * 60 * 1000; // 5 minutes
        // 1. Ignore messages older than 5 minutes
        if (now - msgTime > MAX_AGE) {
            console.log(`[Feishu] Stale message ignored (Too Old): ${msg.message_id} (created at ${new Date(msgTime).toISOString()}, now ${new Date(now).toISOString()})`);
            return;
        }
        // 2. Ignore messages sent before the bot started (Backlog Flushing)
        // This prevents processing a pile of messages that accumulated while the bot was offline/restarting
        if (msgTime < this.startTime) {
            console.log(`[Feishu] Stale message ignored (Before Startup): ${msg.message_id} (created at ${new Date(msgTime).toISOString()}, startup at ${new Date(this.startTime).toISOString()})`);
            return;
        }
        // 幂等性检查：如果该消息已经被处理过，则忽略
        if (this.processedMessageIds.has(msg.message_id)) {
            console.log(`[Feishu] Duplicate message ignored: ${msg.message_id}`);
            return;
        }
        console.log(`[Feishu] Processing new message: ${msg.message_id}`);
        this.processedMessageIds.add(msg.message_id);
        // 简单的内存清理策略：超过1000条清理旧的
        if (this.processedMessageIds.size > 1000) {
            // Set保持插入顺序，清理最早的100条
            let count = 0;
            for (const id of this.processedMessageIds) {
                this.processedMessageIds.delete(id);
                count++;
                if (count >= 100)
                    break;
            }
        }
        const contentJson = JSON.parse(msg.content);
        let content = "";
        if (msg.message_type === 'text') {
            content = contentJson.text;
        }
        else if (msg.message_type === 'image') {
            const imageKey = contentJson.image_key;
            console.log(`[Feishu] Downloading image: ${imageKey}`);
            if (!this.client) {
                console.error("[Feishu] Client not initialized, cannot download image.");
                return;
            }
            try {
                // Use explicit casting to avoid type issues if definitions are missing
                const response = await this.client.im.messageResource.get({
                    path: {
                        message_id: msg.message_id,
                        file_key: imageKey,
                    },
                    params: {
                        type: 'image',
                    }
                });
                // Lark SDK returns the stream directly for binary downloads or inside data?
                // It seems strictly typed SDKs return a response wrapper.
                // If we use `await`, we get the response.
                // We assume response is the stream or contains it.
                // Actually, for `node-sdk`, `get` usually returns `Promise<response>`.
                // But for binary, it might be different. 
                // Let's assume it returns a stream-like object or Buffer.
                const imageBuffer = await this.streamToBuffer(response, MAX_SOURCE_IMAGE_BYTES);
                // Check if the buffer is actually a JSON error response
                // (Lark SDK might return a stream that contains the JSON error body)
                const startBytes = imageBuffer.subarray(0, 100).toString('utf8').trim();
                if (startBytes.startsWith('{') && startBytes.includes('"code"') && startBytes.includes('"msg"')) {
                    console.error(`[Feishu] Downloaded content is a JSON error, not an image: ${startBytes.slice(0, 200)}...`);
                    throw new Error("Downloaded content is a JSON error");
                }
                if (startBytes.startsWith('{') && startBytes.includes('"headers"')) {
                    console.error(`[Feishu] Downloaded content appears to be internal metadata/JSON: ${startBytes.slice(0, 200)}...`);
                    throw new Error("Downloaded content is invalid (JSON metadata)");
                }
                const saved = saveUploadedImage(this.workspaceDir, imageBuffer, `feishu-${imageKey}`);
                if (!saved)
                    throw new Error('下载内容不是支持的图片格式（PNG/JPEG/GIF/WebP/BMP）');
                const prepared = await prepareSavedImageForAgent(imageBuffer, saved.path, {
                    maxSourceBytes: MAX_SOURCE_IMAGE_BYTES,
                    logPrefix: 'Feishu',
                });
                content = [
                    { type: 'text', text: '用户通过飞书发送了一张图片，请根据图片完成用户任务。' },
                    ...prepared.content,
                ];
                console.log(`[Feishu] Image saved and prepared for the selected Agent model: ${saved.path} `
                    + `(original=${prepared.fitted.originalBytes}, analyzed=${prepared.fitted.analyzedBytes}, resized=${prepared.fitted.resized})`);
            }
            catch (e) {
                console.error(`[Feishu] Failed to download image ${imageKey}:`, e);
                content = `[Image Download Failed: ${imageKey}]`;
            }
        }
        const senderId = event.sender.sender_id.open_id;
        const chatId = msg.chat_id;
        // 过滤掉自己发送的消息 (sender_type === 'user' 才是用户消息)
        // 飞书机器人自己发的消息通常 sender.sender_type 是 'app'，但 receive_v1 事件通常只推送用户消息
        // 但为了保险，还是检查一下
        if (event.sender.sender_type !== 'user') {
            return;
        }
        const unifiedMsg = {
            id: msg.message_id, // 使用飞书 message_id 作为唯一标识
            role: "user",
            content: content,
            senderId: senderId,
            source: "feishu",
            metadata: {
                chat_id: chatId,
                raw_event: event,
                // 必须走 makeTraceId：原先的 `${chatId}::${msg.message_id}` 含 ':'，
                // 客户端找日志文件把它换成 '_'、服务端生成 object key 是直接删掉，
                // 两边算出的 key 对不上，事后按 traceId 反查会落空。
                traceId: makeTraceId('feishu', chatId, msg.message_id)
            },
            timestamp: parseInt(msg.create_time)
        };
        if (this.messageHandler) {
            await this.messageHandler(unifiedMsg);
        }
    }
    async streamToBuffer(stream, maxBytes = MAX_SOURCE_IMAGE_BYTES) {
        if (Buffer.isBuffer(stream)) {
            if (stream.length > maxBytes)
                throw new Error(`图片超过 ${(maxBytes / 1024 / 1024).toFixed(0)} MB 原图上限`);
            return stream;
        }
        // Check if it's the specific Lark SDK response object with getReadableStream
        // Based on logs: { writeFile: [Function], getReadableStream: [Function], ... }
        if (stream && typeof stream.getReadableStream === 'function') {
            stream = stream.getReadableStream();
        }
        // If it's a wrapper with 'data' as stream (Lark SDK pattern sometimes)
        else if (stream?.data && typeof stream.data.on === 'function') {
            stream = stream.data;
        }
        return new Promise((resolve, reject) => {
            const chunks = [];
            let totalBytes = 0;
            let settled = false;
            // Check if stream is readable
            if (!stream || typeof stream.on !== 'function') {
                // It might be an object that isn't a stream.
                console.warn("[Feishu] streamToBuffer received non-stream object:", stream);
                reject(new Error("Response is not a readable stream"));
                return;
            }
            const cleanup = () => {
                if (typeof stream.removeListener !== 'function')
                    return;
                stream.removeListener('data', onData);
                stream.removeListener('error', onError);
                stream.removeListener('end', onEnd);
            };
            const finishReject = (error) => {
                if (settled)
                    return;
                settled = true;
                cleanup();
                reject(error);
            };
            const onData = (chunk) => {
                if (settled)
                    return;
                const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                totalBytes += bytes.length;
                if (totalBytes > maxBytes) {
                    finishReject(new Error(`图片超过 ${(maxBytes / 1024 / 1024).toFixed(0)} MB 原图上限`));
                    if (typeof stream.destroy === 'function')
                        stream.destroy();
                    return;
                }
                chunks.push(bytes);
            };
            const onError = (error) => finishReject(error);
            const onEnd = () => {
                if (settled)
                    return;
                settled = true;
                cleanup();
                resolve(Buffer.concat(chunks, totalBytes));
            };
            stream.on('data', onData);
            stream.on('error', onError);
            stream.on('end', onEnd);
        });
    }
}
