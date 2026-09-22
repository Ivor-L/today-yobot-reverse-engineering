import WebSocket from 'ws';
import * as crypto from 'crypto';
import { discoverRpaHttpUrl, getRpaHttpUrl, getRpaWsUrl, getRuntimeRpaApiKey, httpToWsUrl } from '../utils/rpa_port.js';
import { makeTraceId } from '../utils/trace_id.js';
export class WeChatAdapter {
    name = 'wechat';
    ws = null;
    onMessage;
    config;
    reconnectTimer = null;
    autoDiscover;
    constructor(config = {}) {
        this.autoDiscover = !config.wsUrl && !config.apiUrl;
        this.config = {
            wsUrl: config.wsUrl || getRpaWsUrl(),
            apiUrl: config.apiUrl || getRpaHttpUrl(),
        };
    }
    async start(onMessage) {
        this.onMessage = onMessage;
        this.connect();
    }
    async stop() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
    async send(msg) {
        // Send message via HTTP API
        // Endpoint: /api/chat/send_message
        // Body: { user: "Friend Name", message: "Hello" }
        // We assume msg.senderId is the friend's name/ID
        const targetUser = msg.senderId;
        try {
            const response = await fetch(`${this.config.apiUrl}/api/chat/send_message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': getRuntimeRpaApiKey()
                },
                body: JSON.stringify({
                    user: targetUser,
                    message: msg.content
                })
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to send message: ${response.status} ${errorText}`);
            }
        }
        catch (error) {
            if (this.autoDiscover && await this.refreshDiscoveredEndpoint()) {
                return this.send(msg);
            }
            console.error('[WeChatAdapter] Send error:', error);
            throw error;
        }
    }
    async refreshDiscoveredEndpoint() {
        if (!this.autoDiscover)
            return false;
        const discoveredHttpUrl = await discoverRpaHttpUrl(this.config.apiUrl);
        if (!discoveredHttpUrl || discoveredHttpUrl === this.config.apiUrl)
            return false;
        this.config.apiUrl = discoveredHttpUrl;
        this.config.wsUrl = httpToWsUrl(discoveredHttpUrl);
        console.warn(`[WeChatAdapter] RPA endpoint moved to ${this.config.apiUrl}; reconnecting WebSocket to ${this.config.wsUrl}.`);
        return true;
    }
    async connect() {
        if (this.ws)
            return;
        await this.refreshDiscoveredEndpoint();
        console.log(`[WeChatAdapter] Connecting to ${this.config.wsUrl}...`);
        this.ws = new WebSocket(this.config.wsUrl);
        this.ws.on('open', () => {
            console.log('[WeChatAdapter] Connected');
            // Start heartbeat if necessary, but server sends pings usually
        });
        this.ws.on('message', async (data) => {
            try {
                const text = data.toString();
                const json = JSON.parse(text);
                if (json.type === 'ping') {
                    this.ws?.send(JSON.stringify({ type: 'pong' }));
                    return;
                }
                if (json.type === 'new_message' && this.onMessage) {
                    await this.handleNewMessage(json.data);
                }
            }
            catch (err) {
                // Ignore parse errors or non-json messages
            }
        });
        this.ws.on('close', () => {
            console.log('[WeChatAdapter] Disconnected. Reconnecting in 5s...');
            this.ws = null;
            this.reconnectTimer = setTimeout(() => this.connect(), 5000);
        });
        this.ws.on('error', (err) => {
            console.error('[WeChatAdapter] Error:', err.message);
            this.ws?.close();
        });
    }
    async handleNewMessage(data) {
        // data structure from python side:
        // {
        //     "session_id": session_id,
        //     "session_name": session.get('name'),
        //     "content": content,
        //     "time": session.get('lastTime', ''),
        //     "is_group": session.get('isGroup', False),
        //     "is_at": is_at,
        //     "sender_id": session.get('name'), 
        //     "account_id": self.account_id
        // }
        // Ignore messages from self?
        // The python side logic: isSelf = session.get('isGroup', False) and '：' not in content
        // But here we just get raw content.
        // We assume we want to process all incoming messages that are NOT from us.
        // For now, pass everything to Agent, let Agent decide or just reply.
        // TODO: Filter self-messages if possible.
        const msg = {
            id: crypto.randomUUID(),
            role: 'user',
            content: data.content,
            senderId: data.session_name, // Use session name as sender ID (Friend Nickname)
            source: 'wechat',
            metadata: {
                isGroup: data.is_group,
                isAt: data.is_at,
                sessionId: data.session_id,
                accountId: data.account_id,
                // 与其它渠道同理：不给 traceId 会回落到 kernel 的随机 uuid，事后查不到。
                // RPA 侧没有下发消息 id，只能用「账号+会话+时间」拼——虽不能精确反推，
                // 但带上这三段就足以按用户/会话/时间在 OSS 里定位到，比裸 uuid 强得多。
                traceId: makeTraceId('wechat', data.account_id, data.session_id, Date.now())
            }
        };
        if (this.onMessage) {
            await this.onMessage(msg);
        }
    }
}
