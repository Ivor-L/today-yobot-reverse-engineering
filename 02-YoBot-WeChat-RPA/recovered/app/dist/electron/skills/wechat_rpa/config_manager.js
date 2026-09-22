import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
export class LocalConfigManager {
    configRoot;
    constructor() {
        this.configRoot = path.join(os.homedir(), '.yokowebot');
    }
    getWeChatConfigPath(wechatId, filename) {
        return path.join(this.configRoot, wechatId, filename);
    }
    getCommonConfigPath(filename) {
        return path.join(this.configRoot, filename);
    }
    async getAgentsConfig(wechatId) {
        let filePath = path.join(this.configRoot, 'agents.json');
        if (wechatId) {
            // Check if user specific overrides exist
            const userPath = this.getWeChatConfigPath(wechatId, 'agents.json');
            if (fs.existsSync(userPath)) {
                filePath = userPath;
            }
        }
        if (!fs.existsSync(filePath)) {
            throw new Error(`Agents config not found at ${filePath}`);
        }
        const content = await fs.promises.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    }
    async getReplyStrategy(wechatId) {
        const filePath = this.getWeChatConfigPath(wechatId, 'reply_strategy_v2.json');
        if (!fs.existsSync(filePath)) {
            throw new Error(`Reply strategy config not found for wechatId: ${wechatId}`);
        }
        const content = await fs.promises.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    }
    async getGreetingConfig(wechatId) {
        let filePath = this.getCommonConfigPath('greeting_config.json');
        if (wechatId) {
            const userPath = this.getWeChatConfigPath(wechatId, 'greeting_config.json');
            if (fs.existsSync(userPath)) {
                filePath = userPath;
            }
        }
        if (!fs.existsSync(filePath)) {
            throw new Error(`Greeting config not found at ${filePath}`);
        }
        const content = await fs.promises.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    }
    async updateReplyStrategy(wechatId, config) {
        const filePath = this.getWeChatConfigPath(wechatId, 'reply_strategy_v2.json');
        await fs.promises.writeFile(filePath, JSON.stringify(config, null, 2), 'utf-8');
    }
    /**
     * ~/.yokowebot 下不是微信账号的子目录。
     *
     * 这份黑名单是必需的：该目录同时放着运行时缓存和账号配置,而此前这里只排除了
     * file_cache,于是 comtypes_gen / task_logs 被当成"微信账号"喂给了模型。线上实录：
     *   wechat_list_local_users →
     *     ["comtypes_gen","LISERVE197501","lishengkejiao_1975","task_logs","zzls15036071975"]
     * 而 moment_post_sop 当时正指引模型从这个列表里挑发圈账号——一个决定"哪个微信发圈"
     * 的必填字段,取值源里混着缓存目录和已退出登录的号。
     */
    static NON_ACCOUNT_DIRS = new Set([
        'file_cache',
        'comtypes_gen',
        'task_logs',
        'logs',
        'moment_material',
        'voice_greetings',
        'temp',
        'tmp',
        'backup',
        '__pycache__',
    ]);
    /**
     * 列出本机**历史**微信账号（曾在本机托管过、留下了配置目录的号）。
     *
     * ⚠ 这不是"当前可执行任务的账号"：已退出登录的号也会留在这里。要拿执行账号,
     * 用 wechat_list_instances（读 RPA 在线实例）。
     */
    async listLocalWeChatUsers() {
        if (!fs.existsSync(this.configRoot)) {
            return [];
        }
        const entries = await fs.promises.readdir(this.configRoot, { withFileTypes: true });
        return entries
            .filter(dirent => dirent.isDirectory()
            && !LocalConfigManager.NON_ACCOUNT_DIRS.has(dirent.name)
            && !dirent.name.startsWith('.')
            // 账号目录里一定有账号级配置；纯运行时目录没有。这条比黑名单更耐新增目录。
            && fs.existsSync(path.join(this.configRoot, dirent.name, 'reply_strategy_v2.json')))
            .map(dirent => dirent.name);
    }
}
