// 进度文本来源映射 (v2 20.5)
// 1) 子 agent 主动 task_progress_update → 直接落 progressText
// 2) 工具 tool_start → 通过本表映射为人话短句
// 3) 兜底: "正在执行 <toolName>"
/**
 * 工具名 → 人话短句模板。
 * 模板中的 {arg1} / {arg2} 等占位符由 buildProgressFromTool 根据 args 填充。
 * 找不到映射时回落到兜底。
 */
const TOOL_PROGRESS_MAP = {
    // 浏览器
    browser_navigate: "正在打开网页",
    browser_search: "正在搜索",
    browser_click: "正在点击页面元素",
    browser_screenshot: "正在截屏",
    browser_extract: "正在提取页面内容",
    browser_fill: "正在填写表单",
    // 文件
    file_read: "正在读取文件",
    file_write: "正在写入文件",
    file_search: "正在搜索文件",
    filesystem_read: "正在读取文件",
    filesystem_write: "正在写入文件",
    filesystem_list: "正在浏览目录",
    // 网络
    web_fetch: "正在抓取网页",
    web_search: "正在联网搜索",
    search: "正在搜索",
    // 记忆
    memory_search: "正在检索知识",
    memory_recall: "正在检索知识",
    memory_save: "正在写入记忆",
    // 飞书
    feishu_send_message: "正在发送飞书消息",
    feishu_write_sheet: "正在写入飞书表格",
    feishu_read_sheet: "正在读取飞书表格",
    feishu_search_chat: "正在搜索飞书聊天",
    feishu_create_doc: "正在创建飞书文档",
    feishu_read_doc: "正在读取飞书文档",
    // 微信
    wechat_send_message: "正在发送微信消息",
    wechat_search_chat: "正在搜索微信聊天",
    wechat_get_contacts: "正在获取微信联系人",
    wechat_rpa_send: "正在发送微信消息",
    // 文档转换
    doc_convert: "正在转换文档",
    // 子 agent 通讯
    task_progress_update: "进度更新",
    task_request_approval: "等待用户授权",
    task_submit_result: "正在提交结果",
    // 通用
    shell: "正在执行命令",
    python: "正在执行脚本",
};
/**
 * 根据工具名 + 部分 args 生成进度短句。
 * 不抛错,失败回落到兜底文本。
 */
export function buildProgressFromTool(toolName, args) {
    const base = TOOL_PROGRESS_MAP[toolName];
    if (!base) {
        return `正在执行 ${toolName}`;
    }
    // 部分工具加上参数线索使更有信息量
    if (args && typeof args === "object") {
        if (toolName === "browser_navigate" && args.url) {
            const host = safeHost(args.url);
            return host ? `正在打开 ${host}` : base;
        }
        if (toolName === "browser_search" && args.query) {
            return `正在搜索: ${truncate(String(args.query), 30)}`;
        }
        if (toolName === "web_search" && args.query) {
            return `正在联网搜索: ${truncate(String(args.query), 30)}`;
        }
        if (toolName === "search" && args.query) {
            return `正在搜索: ${truncate(String(args.query), 30)}`;
        }
        if (toolName === "file_read" && args.path) {
            return `正在读取 ${pathTail(String(args.path))}`;
        }
        if (toolName === "filesystem_read" && args.path) {
            return `正在读取 ${pathTail(String(args.path))}`;
        }
        if (toolName === "memory_search" && args.query) {
            return `正在检索: ${truncate(String(args.query), 30)}`;
        }
    }
    return base;
}
function safeHost(url) {
    try {
        return new URL(url).hostname;
    }
    catch {
        return null;
    }
}
function truncate(s, n) {
    if (s.length <= n)
        return s;
    return s.slice(0, n) + "…";
}
function pathTail(p) {
    const parts = p.split(/[\\/]/);
    return parts[parts.length - 1] || p;
}
/**
 * 给一个 tool_result 事件用的"完成"短句。第一版只在工具失败时使用。
 */
export function buildProgressFromToolError(toolName, errorMsg) {
    return `${TOOL_PROGRESS_MAP[toolName] ?? toolName} 出错: ${truncate(errorMsg, 50)}`;
}
