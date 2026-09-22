export class MainProcessWechatIlinkCredentialStore {
    pending = new Map();
    constructor() {
        process.on('message', (message) => {
            if (message?.type !== 'wechat-ilink:credentials:result' || !message.requestId)
                return;
            const request = this.pending.get(message.requestId);
            if (!request)
                return;
            clearTimeout(request.timer);
            this.pending.delete(message.requestId);
            if (message.success)
                request.resolve(message.value);
            else
                request.reject(new Error(message.error || '微信 iLink 本地凭据操作失败。'));
        });
    }
    async load() {
        return this.request('load');
    }
    async save(credential) {
        await this.request('save', credential);
    }
    async delete() {
        await this.request('delete');
    }
    request(operation, value) {
        if (!process.send) {
            if (operation === 'load')
                return Promise.resolve(null);
            return Promise.reject(new Error('微信 iLink 凭据只能由桌面客户端安全保存。'));
        }
        const requestId = `wechat-ilink-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(requestId);
                reject(new Error('微信 iLink 本地凭据操作超时。'));
            }, 15_000);
            this.pending.set(requestId, { resolve, reject, timer });
            process.send?.({
                type: 'wechat-ilink:credentials',
                requestId,
                operation,
                ...(value ? { value } : {}),
            });
        });
    }
}
