export class WebSocketClient {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;  // 增加最大重连次数
    private reconnectTimeout = 1000;    // 减少重连间隔
    private isReconnecting = false;     // 添加重连状态标记
    private heartbeatInterval: number | null = null;
    private heartbeatTimeout: number | null = null;  // 添加心跳超时属性声明
    
    constructor() {
        this.connect();
    }
    // 添加连接检查方法
    public checkConnection() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.debug('WebSocket 连接已断开，尝试重新连接...');
            this.connect();
        }
    }
    private connect() {
        if (this.ws?.readyState === WebSocket.OPEN) return;
        
        this.ws = new WebSocket(`ws://${window.location.host}/ws`);
        
        this.ws.onopen = () => {
            console.debug('WebSocket已连接...');
            this.reconnectAttempts = 0;
            this.isReconnecting = false;
            this.startHeartbeat();
        };
        // 在onmessage处理中添加心跳超时清除
        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.debug('收到WebSocket消息:', message);  // 添加详细日志
                
                // 处理心跳响应
                if (message.type === 'pong' || message.type === 'ping') {
                    console.debug('收到心跳响应');
                    // 清除心跳超时计时器
                    if (this.heartbeatTimeout) {
                        clearTimeout(this.heartbeatTimeout);
                        this.heartbeatTimeout = null;
                    }
                    return;
                }
                
                this.handleMessage(message);
            } catch (error) {
                console.error('解析WebSocket消息失败:', error, '原始消息:', event.data);
            }
        };
        
        this.ws.onclose = (event) => {
            console.debug('WebSocket断开连接...', event.code, event.reason);
            this.stopHeartbeat();
            if (!this.isReconnecting) {
                this.reconnect();
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket连接报错:', error);
            this.stopHeartbeat();
            if (!this.isReconnecting) {
                this.reconnect();
            }
        };
    }
    // 添加心跳检测
    // 在WebSocketClient类中的startHeartbeat方法中添加日志
private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = window.setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify({ type: 'ping' }));
                console.debug('发送心跳包');
                
                // 添加心跳超时检测
                this.heartbeatTimeout = window.setTimeout(() => {
                    console.warn('心跳响应超时，尝试重连...');
                    this.reconnect();
                }, 10000); // 10秒内没有收到响应则重连
            } catch (error) {
                console.error('发送心跳包失败:', error);
                this.reconnect();
            }
        } else {
            console.debug('WebSocket未连接，尝试重连...');
            this.reconnect();
        }
    }, 30000);
}

    private stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    private reconnect() {
        if (this.isReconnecting) return;
        
        this.isReconnecting = true;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.isReconnecting = false;
            // 重置重连次数，允许后续重新尝试
            setTimeout(() => {
                this.reconnectAttempts = 0;
                this.reconnect();
            }, 30000);
            return;
        }
        
        this.reconnectAttempts++;
        console.debug(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        
        // 使用指数退避策略，随着重试次数增加等待时间
        const delay = this.reconnectTimeout * Math.pow(1.5, Math.min(this.reconnectAttempts, 8));
        setTimeout(() => {
            this.connect();
        }, delay); // 指数增长但有上限
    }
    
    private handleMessage(message: any) {
        console.debug('接收到广播消息:', message.type, '数据:', message.data); 
        switch (message.type) {
            case 'mass_sending_tasks':
                this.handleMassSendingTasks(message.data);
                break;
            case 'task_status':
                if (!message.data?.task_id) {
                    console.error('收到无效的任务状态消息:', message);
                    return;
                }
                this.handleTaskStatus(message.data);
                break;
            case 'monitor_status':
                console.debug('Received monitor monitor_status:', message.data);
                window.dispatchEvent(new CustomEvent('monitor-status', {
                    detail: message.data
                }));
                break;
            case 'task_session':
                console.debug('Received monitor task_session:', message.data);
                window.dispatchEvent(new CustomEvent('task-session', {
                    detail: message.data
                }));
                break;
            case 'session_list':
                console.debug('Received monitor session_list:', message.data);
                window.dispatchEvent(new CustomEvent('session-list', {
                    detail: message.data
                }));
                break;
            case 'scheduler_status':
                this.handleSchedulerStatus(message.data);
                break;
            case 'task_progress':
                this.handleTaskProgress(message.data);
                break;
            case 'auto_reply_task':
                this.handleAutoReplyTask(message.data);
                break;
            case 'pending_reply':
                console.debug('收到待确认回复:', message.data);
                window.dispatchEvent(new CustomEvent('pending-reply', {
                    detail: message.data
                }));
                break;
            case 'auto_config_progress':
                console.debug('Received auto_config_progress:', message.data);
                window.dispatchEvent(new CustomEvent('auto-config-progress', {
                    detail: message.data
                }));
                break;
            case 'error_task':
                // console.debug('收到任务报错:', message.data);
                window.dispatchEvent(new CustomEvent('error-task', {
                    detail: message.data
                }));
                break;
            case 'server_alert':
            case 'ui_alert':
                window.dispatchEvent(new CustomEvent('server-alert', {
                    detail: message.data || message.payload || message
                }));
                break;
        }
    }
    private handleMassSendingTasks(data: any) {
        window.dispatchEvent(new CustomEvent('massSendingTasks', {
            detail: data
        }));
    }
    
    private handleTaskStatus(data: any) {
        // 发布事件通知
        if(data.type === 'mass_sending'){
            //群发任务
            window.dispatchEvent(new CustomEvent('taskStatus', {
                detail: data
            }));
        } else if(data.type === 'chat_collection'){
            //聊天采集任务
            window.dispatchEvent(new CustomEvent('taskStatus', {
                detail: data
            }));
        }
    }
    private handleSchedulerStatus(data: any) {
        // 发布事件通知
        window.dispatchEvent(new CustomEvent('scheduler-status-update', {
            detail: data
        }));
    }
    
    private handleTaskProgress(data: any) {
        window.dispatchEvent(new CustomEvent('task-progress-update', {
            detail: data
        }));
    }
    
    private handleAutoReplyTask(data: any) {
        window.dispatchEvent(new CustomEvent('auto-reply-task-update', {
            detail: data
        }));
    }
}

// 创建全局实例
export const wsClient = new WebSocketClient();
