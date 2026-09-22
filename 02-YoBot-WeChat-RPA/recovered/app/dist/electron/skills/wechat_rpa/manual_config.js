/**
 * 微信 4.1.7 安装包必须始终有可交付地址：渠道可覆盖，未配置时回退官方资料。
 * 与 UI 的 VITE_RPA_DOC_URL 不同，后者为空时应隐藏操作指南入口，不能复用。
 */
export const DEFAULT_WECHAT_BOT_KNOWLEDGE_BASE_URL = 'https://n2b8xxdgjx.feishu.cn/wiki/Nbauw9HWsihsQ7kgjYPcfZSCnKb';
export function resolveWechatBotKnowledgeBaseUrl(environment = process.env) {
    return environment.WECHAT_BOT_KNOWLEDGE_BASE_URL?.trim()
        || DEFAULT_WECHAT_BOT_KNOWLEDGE_BASE_URL;
}
/** 只替换本技能拥有的占位符，避免误处理 SOP 中用于示例的其它模板变量。 */
export function renderWechatRpaManual(content, environment = process.env) {
    const knowledgeBaseUrl = resolveWechatBotKnowledgeBaseUrl(environment);
    return content.replace(/\{\{WECHAT_BOT_KNOWLEDGE_BASE_URL\}\}/g, () => knowledgeBaseUrl);
}
