/**
 * wechat_update_config 的参数规整，在 pi 按 schema 校验参数【之前】执行（AgentTool.prepareArguments）。
 *
 * 为什么需要：模型按手册做 read-modify-write——wechat_get_config({config_type:"agents"}) 读回的是
 * 智能体【数组】，改完原样传回 data。config_schema / agentic_channel_sop / ai_moment_sop 三份手册
 * 也都写的是传数组，api_client.updateConfig 本来就会把数组包成 RPA 要的 { agents: [...] }。
 * 但工具 schema 声明 data 为 object，pi 在业务代码之前就按声明拒绝了数组
 * （"data: must be object"），这条路从来走不通（2026-09-10/11 线上两次，均为官方 DeepSeek 线路）。
 *
 * 为什么不改 schema：schema 原样发给各家模型，anyOf / 类型数组在严格校验的线路上会让整次请求 400。
 * 为什么不改 RPA：RPA 落盘格式不动，这里产出的仍是它一直接收的 { agents: [...] }。
 */
export function normalizeUpdateConfigArguments(args) {
    if (!args || typeof args !== "object" || Array.isArray(args))
        return args;
    const candidate = args;
    if (candidate.config_type !== "agents" || !Array.isArray(candidate.data))
        return args;
    return { ...candidate, data: { agents: candidate.data } };
}
