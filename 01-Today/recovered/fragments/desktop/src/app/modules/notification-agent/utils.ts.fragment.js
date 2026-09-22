// Compiled fragment from ./src/app/modules/notification-agent/utils.ts.
// The original TypeScript and import graph are not restored.




/**
 * 代理与主可执行文件同在 `Contents/MacOS/`：它必须共享 App 的 `Bundle.main`
 * 并以 App 的签名标识签名，其他位置都拿不到通知系统的身份。
 */ const resolveNotificationAgentPath = ({ executablePath })=>(0,external_node_path_namespaceObject.join)((0,external_node_path_namespaceObject.dirname)(executablePath), NOTIFICATION_AGENT_EXECUTABLE_NAME);
const BADGE_STATES = new Set([
    'cleared',
    'failed',
    'noBundleIdentifier',
    'timeout'
]);
/**
 * 解析代理的单行 JSON 输出。代理失败时同样会输出 JSON 再以非零退出，
 * 所以这里只看 stdout；任何不合契约的内容都归为 `unknown`，不抛错。
 */ const parseNotificationAgentBadgeOutput = (stdout)=>{
    let parsed;
    try {
        parsed = JSON.parse(stdout.trim());
    } catch  {
        return {
            state: 'unknown'
        };
    }
    if (!lodash_es_isPlainObject(parsed)) {
        return {
            state: 'unknown'
        };
    }
    const record = parsed;
    const badge = record['badge'];
    if (!lodash_es_isString(badge) || !BADGE_STATES.has(badge)) {
        return {
            state: 'unknown'
        };
    }
    const reason = record['reason'];
    return {
        state: badge,
        // 原因来自系统错误描述，长度不受控；截断后仅作诊断用。
        ...lodash_es_isString(reason) && reason.length > 0 ? {
            reason: reason.slice(0, 200)
        } : {}
    };
};
