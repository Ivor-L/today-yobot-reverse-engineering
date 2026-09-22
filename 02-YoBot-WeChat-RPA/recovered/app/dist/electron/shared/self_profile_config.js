/** 产品自述文档的官方在线更新渠道。非官方渠道即使误配 online 也会失败关闭。 */
export const OFFICIAL_SELF_PROFILE_CHANNEL_ID = "agent_generic";
export function isSelfProfileEnabled(env = process.env) {
    return env.VITE_SELF_PROFILE_ENABLED === "true";
}
/**
 * 运行时采用失败关闭策略：只有官方渠道显式声明 online 才允许读取在线 overlay；
 * 缺失、拼写错误、OEM 误配 online 一律按 bundled 处理，避免共享 userData 串文档。
 * 构建脚本会对这些误配直接报错，运行时兜底则不能依赖构建一定来自该脚本。
 */
export function getSelfProfileDocsMode(env = process.env) {
    return env.SELF_PROFILE_DOCS_MODE === "online"
        && env.VITE_CHANNEL_ID === OFFICIAL_SELF_PROFILE_CHANNEL_ID
        ? "online"
        : "bundled";
}
export function selfProfileUsesOnlineDocs(env = process.env) {
    return isSelfProfileEnabled(env) && getSelfProfileDocsMode(env) === "online";
}
/** 保留其他 SOP 文档的在线更新，只按渠道规则移除 self_profile。 */
export function filterUpdatableDocsSkills(skills, env = process.env) {
    return selfProfileUsesOnlineDocs(env)
        ? [...skills]
        : skills.filter((skill) => skill !== "self_profile");
}
