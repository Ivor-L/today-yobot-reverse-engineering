import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MCP_EXTERNAL_PARENT } from "../exposure.js";
import { taskStore } from "./task_store.js";
const text = (s) => ({ content: [{ type: "text", text: s }] });
const errText = (s) => ({ content: [{ type: "text", text: s }], isError: true });
// 归因与话术统一收敛到 skills/wechat_rpa/errors.ts —— 主聊天与本网关必须说同一句话。
// 此处曾有一份独立实现，导致同一种失败在两条路径上措辞不同；
// 导入后再重导出：本文件内部多处要直接调用，只 re-export 不会引入本地绑定。
import { humanizeWeChatError } from '../../wechat_rpa/errors.js';
export { humanizeWeChatError };
/**
 * 构造一个面向外部宿主的 MCP Server。暴露两层粒度(设计文档 §3):
 *  - 意图级子 Agent:wechat_run_task(同步/异步)+ wechat_get_task_status + wechat_cancel_task
 *  - 确定性原子工具:wechat_send_message / wechat_fetch_latest_messages(跳过 agent 循环,零 LLM 开销)
 *
 * 安全边界(P1-1):子会话以 MCP_EXTERNAL_PARENT 作为 parentId,sessionId 含 `mcpext` 标记,
 * kernel 据此施加正向技能白名单(默认仅 wechat-rpa)。原子工具本身就是 wechat 能力,与白名单一致。
 */
export function buildMcpServer(deps) {
    const server = new McpServer({
        // 暴露给第三方宿主的服务名，按渠道区分，不写死品牌
        name: `${process.env.VITE_MCP_SERVER_NAME || 'assistant'}-wechat`,
        version: "0.2.0",
    });
    // 原子工具确保 WeChat 实例已初始化(agent 路径由 SOP 负责,原子路径必须自己保证)。
    // 幂等:本会话成功后缓存;若动作因"未初始化"失败则重置并重试一次(WeChat 中途解绑的兜底)。
    let wechatInited = false;
    const ensureInit = async () => {
        if (wechatInited)
            return;
        try {
            const result = await deps.skillRegistry.execute("wechat_initialize", {});
            const textResult = typeof result === "string" ? result : JSON.stringify(result);
            const lower = textResult.toLowerCase();
            let ready = !(lower.includes("environment not configured")
                || lower.includes("uia activation failed")
                || lower.includes("awaiting_user_login")
                || lower.includes("needs_narrator"));
            try {
                const parsed = JSON.parse(textResult);
                if (parsed?.success === false || parsed?.status === "awaiting_user_login")
                    ready = false;
            }
            catch {
                // Tool results may be explanatory text rather than JSON.
            }
            wechatInited = ready;
        }
        catch {
            // 忽略:动作本身会给出更明确的错误
        }
    };
    const runWechatTool = async (toolName, args) => {
        await ensureInit();
        let r = await deps.skillRegistry.execute(toolName, args);
        if (typeof r === "string" && r.includes("未初始化")) {
            wechatInited = false;
            await ensureInit();
            r = await deps.skillRegistry.execute(toolName, args);
        }
        return r;
    };
    // ---- 意图级:子 Agent ----
    server.registerTool("wechat_run_task", {
        title: "微信任务(微信 RPA 子 Agent)",
        description: "把一个自然语言目标委托给微信 RPA 子 Agent 执行,例如『给备注为“客户”的好友发本周问候』『看看张三最近发了什么并总结』。" +
            "内部自动处理初始化/SOP/生命周期。长任务建议 async=true,返回 task_id 后用 wechat_get_task_status 轮询。",
        inputSchema: {
            goal: z.string().describe("要完成的微信相关目标,自然语言描述,越具体越好。"),
            context: z.string().optional().describe("可选补充背景(收件人、语气、参考内容等)。"),
            async: z
                .boolean()
                .optional()
                .describe("true=异步:立即返回 task_id,用 wechat_get_task_status 轮询;false/省略=同步等待结果。"),
        },
    }, async ({ goal, context, async: isAsync }, extra) => {
        const prompt = context ? `${context}\n\n任务:${goal}` : goal;
        const sub = await deps.sessionManager.createSubSession(MCP_EXTERNAL_PARENT, {
            source: "mcp",
        });
        // 异步:立即返回 task_id,后台跑
        if (isAsync) {
            const task = taskStore.create(goal, sub.id);
            deps.agent
                .run(prompt, [], sub.id)
                .then((r) => taskStore.complete(task.id, r ?? ""))
                .catch((e) => {
                const msg = e?.message || String(e);
                taskStore.fail(task.id, humanizeWeChatError(msg) || msg);
            });
            return text(JSON.stringify({
                task_id: task.id,
                status: "running",
                hint: "用 wechat_get_task_status({ task_id }) 轮询结果。",
            }));
        }
        // 同步:best-effort 进度通知(宿主在请求 _meta 带 progressToken 时生效)
        const progressToken = extra?._meta?.progressToken;
        let progress = 0;
        const onEvent = progressToken
            ? (ev) => {
                const label = ev?.type === "tool_start"
                    ? `调用 ${ev.toolName}`
                    : ev?.type === "tool_result"
                        ? `完成 ${ev.toolName}`
                        : ev?.description || "";
                if (!label)
                    return;
                extra
                    .sendNotification({
                    method: "notifications/progress",
                    params: { progressToken, progress: ++progress, message: label },
                })
                    .catch(() => { });
            }
            : undefined;
        try {
            const result = await deps.agent.run(prompt, [], sub.id, onEvent);
            return text(result ?? "");
        }
        catch (e) {
            const msg = e?.message || String(e);
            return errText(humanizeWeChatError(msg) || `任务执行失败: ${msg}`);
        }
    });
    server.registerTool("wechat_get_task_status", {
        title: "查询微信任务状态",
        description: "轮询 wechat_run_task(async=true)返回的 task_id 的状态与结果。",
        inputSchema: { task_id: z.string().describe("wechat_run_task 异步返回的 task_id。") },
    }, async ({ task_id }) => {
        const t = taskStore.get(task_id);
        if (!t)
            return errText(JSON.stringify({ error: "task not found", task_id }));
        return text(JSON.stringify({
            task_id: t.id,
            status: t.status,
            summary: t.result,
            error: t.error,
            elapsedMs: (t.finishedAt || Date.now()) - t.startedAt,
        }));
    });
    server.registerTool("wechat_cancel_task", {
        title: "取消微信任务",
        description: "取消一个仍在运行的异步任务(尽力而为)。",
        inputSchema: { task_id: z.string().describe("要取消的 task_id。") },
    }, async ({ task_id }) => {
        const t = taskStore.get(task_id);
        if (!t)
            return errText(JSON.stringify({ error: "task not found", task_id }));
        if (t.status === "running") {
            try {
                deps.agent.stop?.(t.sessionId);
            }
            catch {
                // ignore
            }
            taskStore.cancel(task_id);
        }
        return text(JSON.stringify({ task_id, status: t.status }));
    });
    // ---- 原子工具:跳过 agent 循环,确定且零 LLM 开销 ----
    server.registerTool("wechat_send_message", {
        title: "发送微信消息(原子)",
        description: "直接给指定好友/群发送一条文本消息,不经过 agent 推理。适合宿主自己编排、要精确控制的场景。",
        inputSchema: {
            user: z.string().describe("收件人:好友昵称/备注或群名(不是发送账号)。"),
            message: z.string().describe("要发送的文本内容。"),
            account_id: z.string().optional().describe("多开时指定发送账号实例,单开可省略。"),
        },
    }, async ({ user, message, account_id }) => {
        try {
            const r = await runWechatTool("wechat_send_message", { user, message, account_id });
            const friendly = humanizeWeChatError(r);
            return friendly ? errText(friendly) : text(r);
        }
        catch (e) {
            const msg = e?.message || String(e);
            return errText(humanizeWeChatError(msg) || `发送失败: ${msg}`);
        }
    });
    server.registerTool("wechat_fetch_latest_messages", {
        title: "拉取实时微信消息(原子)",
        description: "读取指定会话的最新实时消息,不经过 agent 推理。",
        inputSchema: {
            sessionName: z.string().describe("会话名:好友昵称/备注或群名。"),
            accountId: z.string().optional().describe("多开时指定读取账号实例。"),
        },
    }, async ({ sessionName, accountId }) => {
        try {
            const r = await runWechatTool("wechat_fetch_latest_messages", { sessionName, accountId });
            const friendly = humanizeWeChatError(r);
            return friendly ? errText(friendly) : text(r);
        }
        catch (e) {
            const msg = e?.message || String(e);
            return errText(humanizeWeChatError(msg) || `拉取失败: ${msg}`);
        }
    });
    return server;
}
