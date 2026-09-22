const HTTP_TIMEOUT_MS = 8_000;
export class AssetBackupHttpClient {
    options;
    constructor(options) {
        this.options = options;
    }
    isAvailable() {
        return !!this.base() && !!this.options.getToken();
    }
    base() {
        return String(this.options.apiBase || "").replace(/\/+$/, "");
    }
    headers() {
        const token = this.options.getToken();
        if (!token)
            throw new Error("未登录，暂无法备份");
        const headers = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "X-Source": "agent",
        };
        const channelId = this.options.getChannelId();
        if (channelId)
            headers["X-Channel-ID"] = channelId;
        return headers;
    }
    async request(path, init) {
        const base = this.base();
        if (!base)
            throw new Error("未配置远程服务器");
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), HTTP_TIMEOUT_MS);
        try {
            const res = await fetch(`${base}${path}`, {
                ...init,
                headers: {
                    ...this.headers(),
                    ...(init?.headers || {}),
                },
                signal: ctrl.signal,
            });
            const text = await res.text();
            let json = null;
            if (text) {
                try {
                    json = JSON.parse(text);
                }
                catch {
                    json = null;
                }
            }
            if (!res.ok) {
                const error = json?.error || json?.message || `HTTP ${res.status}`;
                const err = new Error(error);
                err.status = res.status;
                err.body = json;
                throw err;
            }
            return json;
        }
        catch (error) {
            if (error?.name === "AbortError")
                throw new Error("备份请求超时");
            throw error;
        }
        finally {
            clearTimeout(timer);
        }
    }
    async listSubagentBackups() {
        const json = await this.request("/v1/agent/backups");
        return Array.isArray(json?.data) ? json.data : [];
    }
    async getSubagentBackup(profileId) {
        const json = await this.request(`/v1/agent/backups/${encodeURIComponent(profileId)}`);
        if (!json?.data)
            throw new Error("云端备份不存在");
        return json.data;
    }
    async putSubagentBackup(profileId, body) {
        try {
            const json = await this.request(`/v1/agent/backups/${encodeURIComponent(profileId)}`, {
                method: "PUT",
                body: JSON.stringify(body),
            });
            return json;
        }
        catch (error) {
            if (error?.status === 409 && error.body)
                return error.body;
            throw error;
        }
    }
    async deleteSubagentBackup(profileId, body) {
        try {
            const json = await this.request(`/v1/agent/backups/${encodeURIComponent(profileId)}/delete`, {
                method: "POST",
                body: JSON.stringify(body),
            });
            return json;
        }
        catch (error) {
            if (error?.status === 409 && error.body)
                return error.body;
            throw error;
        }
    }
}
