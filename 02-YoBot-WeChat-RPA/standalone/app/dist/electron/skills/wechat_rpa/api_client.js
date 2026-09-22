import { discoverRpaHttpUrl, getRpaHttpUrl, getRuntimeRpaApiKey, getRuntimeRpaPort, isRpaHealthy, setRuntimeRpaPort } from '../../utils/rpa_port.js';
import { assertRpaInitializeResult, RpaInitializationError } from './init_result.js';
import { assertRpaApplicationSuccess } from '../../shared/rpa_application_response.js';
export class RPAApiClient {
    apiUrl;
    explicitApiKey;
    constructor(apiUrl = getRpaHttpUrl(getRuntimeRpaPort()), apiKey) {
        this.apiUrl = apiUrl;
        this.explicitApiKey = apiKey;
    }
    get apiKey() {
        return this.explicitApiKey ?? getRuntimeRpaApiKey();
    }
    getApiUrl() {
        return this.apiUrl;
    }
    setApiUrl(apiUrl) {
        this.apiUrl = apiUrl.replace(/\/$/, '');
        const port = new URL(this.apiUrl).port;
        if (port)
            setRuntimeRpaPort(Number(port));
    }
    async checkHealth(options = {}) {
        if (await isRpaHealthy(this.apiUrl))
            return true;
        if (options.discover) {
            const discoveredUrl = await discoverRpaHttpUrl(this.apiUrl);
            if (discoveredUrl) {
                if (discoveredUrl !== this.apiUrl) {
                    console.warn(`[RPAApiClient] RPA service discovered at ${discoveredUrl}; updating client base URL from ${this.apiUrl}.`);
                }
                this.setApiUrl(discoveredUrl);
                return true;
            }
        }
        return false;
    }
    async checkAuthenticatedHealth(options = {}) {
        if (!(await this.checkHealth(options)))
            return false;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2_000);
        try {
            const response = await fetch(`${this.apiUrl}/api/license/machine-code`, {
                method: 'GET',
                headers: { 'X-API-Key': this.apiKey },
                signal: controller.signal,
            });
            if (!response.ok)
                return false;
            const value = await response.json();
            return typeof value?.machine_code === 'string'
                && /^[0-9A-F]{4}(?:-[0-9A-F]{4}){3}$/.test(value.machine_code);
        }
        catch {
            return false;
        }
        finally {
            clearTimeout(timeout);
        }
    }
    async initialize(options = {}) {
        try {
            const response = await fetch(`${this.apiUrl}/api/init/multi`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify({ timestamp: Date.now() }),
                signal: options.signal,
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Initialize failed: ${response.status} ${text}`);
            }
            const result = await response.json();
            // This endpoint reports business failures as HTTP 200. Transport success
            // alone must not authorize a follow-up send.
            assertRpaInitializeResult(result);
            return result;
        }
        catch (error) {
            if (error instanceof RpaInitializationError)
                throw error;
            throw new Error(`Failed to initialize WeChat RPA: ${error.message}`);
        }
    }
    async autoConfig() {
        try {
            const response = await fetch(`${this.apiUrl}/api/system/wechat41/auto_config`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify({ timestamp: Date.now() })
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Auto config failed: ${response.status} ${text}`);
            }
            return await response.json();
        }
        catch (error) {
            throw new Error(`Failed to auto configure WeChat RPA: ${error.message}`);
        }
    }
    /**
     * 上传一份名单表格到 RPA 的待添加名单。
     *
     * 这是全客户端唯一一处 multipart 上传：`/api/friend/import` 收的是
     * `UploadFile`，不像 sendFile 那样接受本地路径。RPA 与客户端同机，
     * 但接口签名就是这么定的，只能按它来。
     *
     * ⚠️ 文件内容必须已经符合 RPA 的表头规范（必填列名一字不差是
     * `微信号/手机号`）。调用方负责改表头——`parse_friend_list` 是精确字符串匹配，
     * 表头不对会直接 400「缺少必填字段」，而不会做任何模糊匹配。
     */
    async importFriendList(filePath, fileName) {
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const buf = await fs.readFile(filePath);
            const name = fileName || path.basename(filePath);
            const form = new FormData();
            // Node 的 Buffer 不能直接塞进 FormData，要包成 Blob；
            // 文件名必须带正确的扩展名——服务端是按扩展名分派 xlsx / csv 解析器的。
            form.append('file', new Blob([new Uint8Array(buf)]), name);
            const response = await fetch(`${this.apiUrl}/api/friend/import`, {
                method: 'POST',
                // 【不要】自己设 Content-Type：multipart 的 boundary 由 fetch 按 FormData 生成，
                // 手写一个会导致服务端解析不出文件。
                headers: { 'X-API-Key': this.apiKey },
                body: form,
            });
            const text = await response.text();
            if (!response.ok) {
                // FastAPI 的报错在 detail 里，直接透出去——那几句（缺少必填字段 /
                // 文件中没有有效的好友数据 / 单次最多导入20000条数据）都是可执行的提示。
                let detail = text;
                try {
                    detail = JSON.parse(text)?.detail ?? text;
                }
                catch { /* 原样 */ }
                throw new Error(`导入名单失败: ${detail}`);
            }
            return JSON.parse(text);
        }
        catch (error) {
            throw new Error(error?.message?.startsWith('导入名单失败')
                ? error.message
                : `导入名单失败: ${error.message}`);
        }
    }
    async launchWechat(params = {}) {
        try {
            const response = await fetch(`${this.apiUrl}/api/system/wechat/launch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey,
                },
                body: JSON.stringify({
                    count: params.count ?? 1,
                    // Typed Agent calls are non-destructive by default. Multi-open callers must
                    // explicitly acknowledge that existing WeChat processes will be closed.
                    close_existing: params.close_existing ?? false,
                    enable_narrator: false,
                }),
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Launch WeChat failed: ${response.status} ${text}`);
            }
            return await response.json();
        }
        catch (error) {
            throw new Error(`Failed to launch WeChat: ${error.message}`);
        }
    }
    async sendMessage(user, message, accountId, options = {}) {
        try {
            const body = { user, message };
            if (accountId)
                body.account_id = accountId;
            const response = await fetch(`${this.apiUrl}/api/chat/send_message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify(body),
                signal: options.signal,
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Send message failed: ${response.status} ${text}`);
            }
            return await response.json();
        }
        catch (error) {
            throw new Error(`Failed to send message: ${error.message}`);
        }
    }
    /**
     * @param accountId 由哪个微信号发圈。
     *
     * 这个参数是补上去的：此前整条链路（工具 Schema → 这里 → RPA 的 AgentPostMomentRequest
     * → task_params → MomentPostTask）都没有账号字段，发圈 100% 落到"当前活跃实例"，
     * 客户的现象就是"发朋友圈总是发错号"。RPA 侧用 Pydantic 接收，旧版模型未声明该字段时
     * 默认 extra='ignore'，因此新客户端打到旧 RPA 上只是退化，不会报错。
     */
    async postMoment(content, files, accountId) {
        try {
            const body = { content, files };
            if (accountId)
                body.account_id = accountId;
            const response = await fetch(`${this.apiUrl}/api/agent/post_moment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Post moment failed: ${response.status} ${text}`);
            }
            return await response.json();
        }
        catch (error) {
            throw new Error(`Failed to post moment: ${error.message}`);
        }
    }
    async getChatMessages(sessionName, accountId) {
        try {
            const url = new URL(`${this.apiUrl}/api/chat/messages/${encodeURIComponent(sessionName)}`);
            if (accountId) {
                url.searchParams.append('account_id', accountId);
            }
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                }
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Get chat messages failed: ${response.status} ${text}`);
            }
            return await response.json();
        }
        catch (error) {
            throw new Error(`Failed to get chat messages: ${error.message}`);
        }
    }
    async sendFile(user, filePath, accountId) {
        try {
            const response = await fetch(`${this.apiUrl}/api/agent/chat/send_file`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify({ user, file_path: filePath, account_id: accountId })
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Send file failed: ${response.status} ${text}`);
            }
            return await response.json();
        }
        catch (error) {
            throw new Error(`Failed to send file: ${error.message}`);
        }
    }
    /**
     * Send a voice message via RPA. Three mutually-exclusive input modes (priority order):
     *   1) audioPath:     absolute path of a local mp3 the Agent has prepared.
     *   2) audioFilename: basename of an mp3 previously stored in the RPA voice_greetings
     *                     directory (via the upload/tts greeting APIs).
     *   3) text + voiceId: synthesize on-the-fly. Backend creates a temp mp3, sends it,
     *                      then deletes it. `speed` (0.5~2.0, default 1.0) is optional.
     *
     * Prerequisites: WeChat 4.1.9+ AND VB-Cable virtual audio driver installed on the
     * user machine. Failures (version too low, VB-Cable missing, file absent) return
     * { success: false, error: ... } — the Agent should fall back to text.
     */
    async sendVoice(params) {
        try {
            const body = { user: params.user };
            if (params.audioPath)
                body.audioPath = params.audioPath;
            if (params.audioFilename)
                body.audioFilename = params.audioFilename;
            if (params.text)
                body.text = params.text;
            if (params.voiceId)
                body.voiceId = params.voiceId;
            if (params.speed !== undefined)
                body.speed = params.speed;
            if (params.accountId)
                body.accountId = params.accountId;
            const response = await fetch(`${this.apiUrl}/api/agent/chat/send_voice`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Send voice failed: ${response.status} ${text}`);
            }
            return await response.json();
        }
        catch (error) {
            throw new Error(`Failed to send voice: ${error.message}`);
        }
    }
    /**
     * List available cloned voices (only status=active ones).
     *
     * Returns structured payload (never throws on HTTP errors — Agent should distinguish
     *   "service unavailable" from "no voices cloned"):
     *   - { success: true, data: [{ voiceId, displayName, language, createdAt }], count }
     *   - { success: false, error, httpStatus }   ← HTTP 4xx/5xx (e.g. 404 = endpoint missing)
     *   - { success: false, error }               ← network error / RPA backend down
     *
     * Use this BEFORE sendVoice when the user hasn't specified a voiceId — show the
     * displayName list to the user, then pass the chosen voiceId to sendVoice.
     * IMPORTANT: success:false with non-zero httpStatus means the RPA backend
     * endpoint is missing/broken — DO NOT tell the user "you have no voices".
     */
    async listVoices() {
        try {
            const response = await fetch(`${this.apiUrl}/api/agent/voice/voices`, {
                method: 'GET',
                headers: {
                    'X-API-Key': this.apiKey
                }
            });
            if (!response.ok) {
                const text = await response.text();
                return {
                    success: false,
                    error: `RPA backend returned HTTP ${response.status}. The /api/agent/voice/voices endpoint is missing or broken — likely the RPA service needs a restart to load the new route. Detail: ${text}`,
                    httpStatus: response.status,
                };
            }
            return await response.json();
        }
        catch (error) {
            return {
                success: false,
                error: `Cannot reach RPA backend at ${this.apiUrl}: ${error.message}. Is the RPA service running?`,
            };
        }
    }
    async massSending(params) {
        // Validation: tags or targets must be provided
        if ((!params.tags || params.tags.length === 0) && (!params.targets || params.targets.length === 0)) {
            throw new Error('Either tags or targets must be provided for mass sending.');
        }
        // Validation: greeting_group or text must be provided (exactly one)
        const hasText = !!(params.text && params.text.trim());
        const hasGroup = !!(params.greeting_group && params.greeting_group.trim());
        if (!hasText && !hasGroup) {
            throw new Error('Either greeting_group or text must be provided for mass sending.');
        }
        if (hasText && hasGroup) {
            throw new Error('Provide either greeting_group or text, not both.');
        }
        try {
            const response = await fetch(`${this.apiUrl}/api/agent/mass_sending`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify({
                    tags: params.tags,
                    targets: params.targets,
                    greeting_group: params.greeting_group,
                    text: params.text,
                    schedule_time: params.schedule_time,
                    batch_size: params.batch_size ?? 10,
                    account_id: params.account_id,
                    send_interval: params.send_interval
                })
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Mass sending failed: ${response.status} ${text}`);
            }
            return await response.json();
        }
        catch (error) {
            throw new Error(`Failed to create mass sending task: ${error.message}`);
        }
    }
    async getTasks() {
        try {
            const response = await fetch(`${this.apiUrl}/api/agent/tasks`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                }
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Get tasks failed: ${response.status} ${text}`);
            }
            return await response.json();
        }
        catch (error) {
            throw new Error(`Failed to get tasks: ${error.message}`);
        }
    }
    async getBackendStatus() {
        try {
            await this.checkHealth({ discover: true });
            const response = await fetch(`${this.apiUrl}/api/agent/backend_status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                }
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Get backend status failed: ${response.status} ${text}`);
            }
            return await response.json();
        }
        catch (error) {
            throw new Error(`Failed to get backend status: ${error.message}`);
        }
    }
    /**
     * 让 **RPA 自己** 试拨一次这个智能体。
     *
     * 为什么要问 RPA 而不是我们自己推断：真正会去调这个智能体的是 RPA 的回复链路，
     * 它认哪些 platform、能不能连上 apiUrl、profileId 在不在对端的 capabilities 里，
     * 只有它说了算。线上出过整整三天"绑定成功但一条都不回"——AutoReplyTask 收到消息后
     * 0.1 秒就 "completed successfully"，不调 AI、不报错、不留日志，而我们这边
     * `wechat_bind_agent` 只是写完配置就返回 success。一次试拨就能当场戳破。
     *
     * ⚠️ **只对 `agentic` 自动跑。** 看 RPA v1.9.10 的 `/api/agent/test`：
     *   - `agentic` 分支 → `probe_capabilities()`，就是一个 `GET /v1/capabilities`，
     *     不碰大模型、不花钱、无副作用；
     *   - fireflow / coze / coze3 / dify 分支 → 落到
     *     `AIServiceFactory.create_service(...).start_chat(message="你好")`，
     *     **真的发一轮对话给大模型**，走用户的额度。
     * 绑定是个高频动作，不能每绑一次就偷偷花用户一次钱，所以其余平台一律跳过、
     * 回 `verified: null`，由用户自己决定要不要在界面上点测试。
     *
     * 永不抛异常：验证失败不该把已经写好的绑定推翻，调用方按 `verified` 如实汇报即可。
     * 旧版 RPA（1.9.10 之前）对 agentic 会返回"不支持的服务类型"，那是**测试接口**没有
     * 该分支，不代表回复链路不支持（`ai_service_factory` 从 1.8.7 起就支持）——
     * 这种情况回 `verified: null`，不许当成"绑坏了"。
     */
    async testAgent(agentId, platform) {
        const normalized = String(platform || '').toLowerCase();
        if (normalized !== 'agentic') {
            return {
                verified: null,
                message: `${platform} 平台的连通性测试会真的发一轮对话给大模型（消耗额度），不自动执行；如需验证请在 RPA 界面上手动点测试。`,
            };
        }
        try {
            const response = await fetch(`${this.apiUrl}/api/agent/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify({ agent_id: agentId, platform })
            });
            const text = await response.text();
            let body = null;
            try {
                body = JSON.parse(text);
            }
            catch { /* 非 JSON 一律按不可验证处理 */ }
            if (response.status === 404 || response.status === 405) {
                return { verified: null, message: '当前 RPA 版本没有智能体连通性测试接口，无法验证。' };
            }
            if (!body || typeof body !== 'object') {
                return { verified: null, message: `连通性测试返回了无法解析的内容（HTTP ${response.status}）。` };
            }
            if (body.success === true) {
                return { verified: true, message: String(body.message || '连通性测试通过。') };
            }
            const detail = String(body.error || body.detail || body.message || `HTTP ${response.status}`);
            if (/不支持的服务类型/.test(detail)) {
                return { verified: null, message: `当前 RPA 版本的测试接口不认识 ${platform} 平台，无法验证（不代表不可用，建议升级 RPA 插件后再测）。` };
            }
            return { verified: false, message: detail };
        }
        catch (error) {
            return { verified: null, message: `连通性测试没跑起来：${error?.message || String(error)}` };
        }
    }
    async syncContacts(type, accountId) {
        try {
            const response = await fetch(`${this.apiUrl}/api/contact/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify({ type, account_id: accountId })
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Sync contacts failed: ${response.status} ${text}`);
            }
            return await response.json();
        }
        catch (error) {
            throw new Error(`Failed to sync contacts: ${error.message}`);
        }
    }
    /**
     * 已同步的**群聊**列表。
     *
     * 和 `getContacts()` 是两个不同的后端表：`GET /api/contacts` 走 `format_and_filter_friends`，
     * **只有好友**；群在 `GET /api/contacts/groups`（RPA `api_server.py`，读
     * `db_manager.get_groups(account_id)`）。这条链路以前客户端从没包过——线上后果是
     * `wechat_sync_contacts(type='group')` 明明返回"同步群聊数据成功"，agent 却一个群也读不回来：
     * `wechat_list_sessions` 只给本地有聊天记录落盘的十来个，于是 agent 去翻文件系统猜 sqlite
     * 路径（全落空），用户连问四遍"我微信里几百个群你检测不到吗"。
     */
    async getGroups(params) {
        try {
            const url = new URL(`${this.apiUrl}/api/contacts/groups`);
            if (params?.keyword)
                url.searchParams.append('keyword', params.keyword);
            if (params?.account_id)
                url.searchParams.append('account_id', params.account_id);
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                }
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Get groups failed: ${response.status} ${text}`);
            }
            return await response.json();
        }
        catch (error) {
            throw new Error(`Failed to get groups: ${error.message}`);
        }
    }
    async getContacts(params) {
        try {
            const url = new URL(`${this.apiUrl}/api/contacts`);
            if (params?.tag)
                url.searchParams.append('tag', params.tag);
            if (params?.keyword)
                url.searchParams.append('keyword', params.keyword);
            if (params?.account_id)
                url.searchParams.append('account_id', params.account_id);
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                }
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Get contacts failed: ${response.status} ${text}`);
            }
            return await response.json();
        }
        catch (error) {
            throw new Error(`Failed to get contacts: ${error.message}`);
        }
    }
    // --- Moment Post Plan APIs (scheduled auto-post moments) ---
    /**
     * Create a moment-post "plan" folder under the RPA `moment_material/` directory.
     * Returns the absolute path of the created folder; the Agent then builds material
     * groups (one subfolder per moment) inside this path using its own file tools.
     */
    async createMomentPlan(planName) {
        try {
            const response = await fetch(`${this.apiUrl}/api/moment-material/create-folder`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify({ plan_name: planName })
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Create moment plan failed: ${response.status} ${text}`);
            }
            return await response.json();
        }
        catch (error) {
            throw new Error(`Failed to create moment plan: ${error.message}`);
        }
    }
    /**
     * Create a scheduled auto-post-moment task. `settings` is passed through verbatim
     * to POST /api/moment/post-task (name/execMode/cycle/materialFolder/publishMode/account...).
     */
    async createMomentPostTask(settings) {
        try {
            const response = await fetch(`${this.apiUrl}/api/moment/post-task`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify(settings)
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Create moment post task failed: ${response.status} ${text}`);
            }
            return await response.json();
        }
        catch (error) {
            throw new Error(`Failed to create moment post task: ${error.message}`);
        }
    }
    async cancelMomentPostTask(taskId) {
        try {
            const response = await fetch(`${this.apiUrl}/api/moment/post-task/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify({ task_id: taskId })
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Cancel moment post task failed: ${response.status} ${text}`);
            }
            return await response.json();
        }
        catch (error) {
            throw new Error(`Failed to cancel moment post task: ${error.message}`);
        }
    }
    // --- Configuration APIs (For Agent usage) ---
    /**
     * @param accountId 读哪个微信号的配置。只对账号级配置（reply_strategy_v2 等）有意义。
     *
     * 走 query 而不是 body：GET 本来就没有 body，且旧版 RPA 会直接忽略未声明的 query 参数
     * （FastAPI 默认行为），因此新版客户端打到旧 RPA 上只会退化成原来的"活跃实例"行为，不会报错。
     */
    async getConfig(configType, accountId) {
        try {
            const url = new URL(`${this.apiUrl}/api/config/${configType}`);
            if (accountId)
                url.searchParams.append('account_id', accountId);
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                }
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Get config failed: ${response.status} ${text}`);
            }
            const payload = await response.json();
            return assertRpaApplicationSuccess(payload, `读取配置 ${configType}`);
        }
        catch (error) {
            throw new Error(`Failed to get config '${configType}': ${error.message}`);
        }
    }
    /**
     * @param accountId 写进哪个微信号的配置目录。只对账号级配置（reply_strategy_v2 等）有意义。
     *
     * ⚠ 必须走 **query**，绝不能塞进 body：本接口的整个 body 就是配置内容本身
     * （RPA 侧 `config: dict` 原样落盘），多一个 account_id 字段会被当成配置项写进 json。
     * 走 query 还顺带拿到向后兼容——旧版 RPA 未声明该参数，FastAPI 会直接忽略。
     */
    async updateConfig(configType, data, accountId) {
        try {
            // Pre-processing the data to prevent hallucination structure from the Agent
            let cleanData = data;
            if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
                cleanData = data.data; // Unwrap if agent mistakenly wrapped it
            }
            // Wrap the array in { agents: [...] } if it's the agents config and data is an array
            // Based on backend requirements for POST /api/config/agents
            let bodyData = cleanData;
            if (configType === 'agents' && Array.isArray(cleanData)) {
                bodyData = { agents: cleanData };
            }
            const url = new URL(`${this.apiUrl}/api/config/${configType}`);
            if (accountId)
                url.searchParams.append('account_id', accountId);
            const response = await fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify(bodyData)
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Update config failed: ${response.status} ${text}`);
            }
            const payload = await response.json();
            return assertRpaApplicationSuccess(payload, `更新配置 ${configType}`);
        }
        catch (error) {
            throw new Error(`Failed to update config '${configType}': ${error.message}`);
        }
    }
    /**
     * List active (bound + logged-in) WeChat instances.
     * Returns { success, instances: [{ instance_id, nickname, account_id, is_active }] }.
     * When `instances` is empty there is NO bound account — config read/write would
     * silently fall back to the GLOBAL ~/.yokowebot config instead of a real account.
     */
    async getActiveInstances() {
        await this.checkHealth({ discover: true });
        const response = await fetch(`${this.apiUrl}/api/instances/active`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': this.apiKey
            }
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Get active instances failed: ${response.status} ${text}`);
        }
        return await response.json();
    }
    // --- Feature Toggle APIs (For UI usage) ---
    async getFeaturesStatus() {
        try {
            await this.checkHealth({ discover: true });
            const response = await fetch(`${this.apiUrl}/api/agent/features_status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                }
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Get features status failed: ${response.status} ${text}`);
            }
            return await response.json();
        }
        catch (error) {
            throw new Error(`Failed to get features status: ${error.message}`);
        }
    }
    async toggleAiSales(enabled) {
        try {
            await this.checkHealth({ discover: true });
            const endpoint = enabled ? '/api/chat/multi-monitor/start' : '/api/chat/monitor/stop';
            const response = await fetch(`${this.apiUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                // The original API might expect empty body or no body for these
                body: JSON.stringify({})
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Toggle AI Sales failed: ${response.status} ${text}`);
            }
            return await response.json();
        }
        catch (error) {
            throw new Error(`Failed to toggle AI Sales: ${error.message}`);
        }
    }
    /**
     * Toggle the AI moment auto-comment task. When enabling, `settings` should carry
     * the required fields (interactionMode, agentId) and any optional tuning fields;
     * they are flattened alongside `enabled` in the request body as the RPA API expects.
     */
    async toggleAiMoment(enabled, settings) {
        try {
            await this.checkHealth({ discover: true });
            const body = enabled ? { ...(settings || {}), enabled } : { enabled };
            const response = await fetch(`${this.apiUrl}/api/moment/toggle-auto-comment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Toggle AI Moment failed: ${response.status} ${text}`);
            }
            return await response.json();
        }
        catch (error) {
            throw new Error(`Failed to toggle AI Moment: ${error.message}`);
        }
    }
    async toggleAutoAddFriend(enabled) {
        try {
            await this.checkHealth({ discover: true });
            const response = await fetch(`${this.apiUrl}/api/friend/auto-add-new/toggle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify({ enabled })
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Toggle Auto Add Friend failed: ${response.status} ${text}`);
            }
            return await response.json();
        }
        catch (error) {
            throw new Error(`Failed to toggle Auto Add Friend: ${error.message}`);
        }
    }
}
