import { APP_PROTOCOL_VERSION, AgenticError, } from "./types.js";
import { AgenticDeliveryLedgerError } from "./delivery_ledger.js";
import { localDocumentInputCapability } from "./input_attachments.js";
const SCENES = [
    "auto_reply",
    "moment_comment",
    "follow_up",
    "greeting",
    "collect_analyze",
];
const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1", "localhost"]);
/**
 * 请求必须来自本机。RPA 与 Agent 同机运行(RPA 操作本机微信桌面),
 * 没有跨机场景;拒绝非环回来源可消除整类远程攻击面。
 */
function isLoopback(req) {
    const ip = (req.socket.remoteAddress || req.ip || "").trim();
    return LOOPBACK.has(ip);
}
/**
 * Bearer 校验。优先使用品牌无关的 `RPA_PRIVATE_AGENT_TOKEN`；旧环境变量继续兼容。
 * (本机单用户桌面场景),但会在日志里明确告警,避免"以为配了其实没配"。
 */
function checkAuth(req) {
    const expected = process.env.RPA_PRIVATE_AGENT_TOKEN || process.env.YOKO_AGENTIC_TOKEN;
    if (!expected)
        return;
    const header = req.header("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (token !== expected)
        throw new AgenticError("UNAUTHORIZED", "无效的 Bearer token");
}
function statusFor(code) {
    switch (code) {
        case "BAD_REQUEST": return 400;
        case "UNAUTHORIZED": return 401;
        case "UNKNOWN_PROFILE": return 404;
        case "BUSY": return 429;
        case "BUDGET_EXCEEDED": return 429;
        default: return 500;
    }
}
function unwrapAgenticError(error) {
    const seen = new Set();
    let current = error;
    while (current && !seen.has(current)) {
        if (current instanceof AgenticError || current.name === "AgenticError") {
            return current;
        }
        seen.add(current);
        current = current.cause;
    }
    return undefined;
}
/**
 * 挂载 Agentic Provider Protocol 端点。
 *
 * 纯增量:只新增 `/v1/*` 两条路由,不触碰任何既有 `/api/*` 或 `/health`。
 */
export function registerAgenticApi(app, service) {
    if (!process.env.RPA_PRIVATE_AGENT_TOKEN && !process.env.YOKO_AGENTIC_TOKEN) {
        console.warn("[Agentic] AGENTIC_TOKEN 未配置,/v1/* 仅依赖环回地址限制。");
    }
    const guard = (req, res) => {
        if (!isLoopback(req)) {
            res.status(403).json({ error: { code: "FORBIDDEN", message: "仅允许本机访问" } });
            return false;
        }
        try {
            checkAuth(req);
            return true;
        }
        catch (e) {
            const err = e;
            res.status(statusFor(err.code)).json({ error: { code: err.code, message: err.message } });
            return false;
        }
    };
    app.get("/v1/capabilities", (req, res) => {
        if (!guard(req, res))
            return;
        const profiles = service.listProfiles();
        const caps = {
            protocolVersion: APP_PROTOCOL_VERSION,
            stateless: true,
            twoPhase: profiles.some((p) => service.supportsTwoPhase(p.id)),
            scenes: SCENES,
            maxContextTokens: 32_000,
            senderAttribution: true,
            profiles,
            deliveryAcknowledgement: {
                pathTemplate: "/v1/deliveries/{deliveryId}/ack",
                itemLevel: true,
            },
        };
        // 本地路径只对同机 RPA 有意义，也绝不能向远程企业接入方承诺。
        const inputAttachments = isLoopback(req) ? localDocumentInputCapability() : undefined;
        if (inputAttachments)
            caps.inputAttachments = inputAttachments;
        res.json(caps);
    });
    app.post("/v1/chat", async (req, res) => {
        if (!guard(req, res))
            return;
        const body = req.body;
        const wantsStream = (req.header("accept") || "").includes("text/event-stream");
        // 非流式兼容路径:只回 Phase-1,body 就是那个 message 事件的 data。
        // 必须显式关掉 Phase-2 —— 调用方收不到,跑了纯属白烧 token。
        if (!wantsStream) {
            try {
                let first = null;
                const done = await service.run(body, (ev) => {
                    if (!first)
                        first = ev;
                }, {
                    allowTwoPhase: false,
                    allowLocalAttachments: isLoopback(req),
                });
                if (!first && done.outcome !== "already_delivered") {
                    throw new Error("provider 未产生任何 message 事件");
                }
                res.json(first ?? { action: "no_reply", segments: [], phase: 1, reason: "already_delivered" });
            }
            catch (e) {
                const domainError = unwrapAgenticError(e);
                const err = e;
                const code = domainError?.code ?? "INTERNAL";
                res.status(domainError ? statusFor(domainError.code) : 500)
                    .json({ error: { code, message: domainError?.message ?? err.message } });
            }
            return;
        }
        res.writeHead(200, {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        });
        const send = (event, data) => {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };
        // 客户端提前断开(RPA 侧 phase-1 拿到就走)不应让后台 phase-2 崩溃,
        // 但也没必要继续往已关闭的连接写 —— 标记后由 service 的 finally 收尾。
        //
        // ⚠️ 必须监听 res 而非 req:Node 的 `req.on('close')` 在**请求体读完时**就会触发
        // (不只是客户端断开)。express.json() 消费完 body 后立刻置位,会把整条 SSE 流吞掉。
        let aborted = false;
        res.on("close", () => { aborted = true; });
        try {
            // 2026-09-08：线上出现过一次「5ms 内返回 done、一条 message 都没有」，
            // 而 agent 侧同时没有 trace、没有调用记录、主日志一片空白——请求到了却没跑
            // 轮次。run() 里每条早退分支要么发事件要么抛错，事后无从复现，只能留观测点。
            // 两条日志都极低频（一次请求一条），不会污染日志。
            let sentMessages = 0;
            const done = await service.run(body, (ev) => {
                if (!aborted) {
                    send("message", ev);
                    sentMessages += 1;
                }
            }, { allowLocalAttachments: isLoopback(req) });
            if (sentMessages === 0 && !aborted && done.outcome !== "already_delivered") {
                console.warn("[Agentic] /v1/chat 本轮未产生任何 message 事件"
                    + `（profileId=${body?.profileId} scene=${body?.scene}`
                    + ` session=${body?.conversation?.sessionId}`
                    + ` idem=${String(body?.idempotencyKey ?? "").slice(0, 12)}`
                    + ` aborted=${aborted} phases=${done?.usage?.phases} `
                    + `elapsedMs=${done?.usage?.elapsedMs}）——客户本轮收不到任何回复`);
                throw new Error("provider 未产生任何 message 事件");
            }
            if (!aborted)
                send("done", done);
        }
        catch (e) {
            const domainError = unwrapAgenticError(e);
            const err = e;
            const code = domainError?.code ?? "INTERNAL";
            if (!aborted)
                send("error", { code, message: domainError?.message ?? err.message });
        }
        finally {
            res.end();
        }
    });
    app.post("/v1/deliveries/:deliveryId/ack", (req, res) => {
        if (!guard(req, res))
            return;
        const deliveryId = String(req.params.deliveryId || "").trim();
        const body = (req.body ?? {});
        if (!/^[a-f0-9]{64}$/.test(deliveryId) || (body.status !== "delivered" && body.status !== "failed")) {
            res.status(400).json({ error: { code: "BAD_REQUEST", message: "无效的投递确认请求" } });
            return;
        }
        if (body.itemIds !== undefined && (!Array.isArray(body.itemIds) || body.itemIds.some((id) => !/^[a-f0-9]{64}$/.test(String(id))))) {
            res.status(400).json({ error: { code: "BAD_REQUEST", message: "无效的投递项 ID" } });
            return;
        }
        try {
            const result = service.acknowledgeDelivery(deliveryId, {
                status: body.status,
                itemIds: body.itemIds?.map(String),
            });
            if (!result) {
                res.status(404).json({ error: { code: "NOT_FOUND", message: "投递记录不存在或已过期" } });
                return;
            }
            res.json(result);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            res.status(error instanceof AgenticDeliveryLedgerError ? 409 : 500)
                .json({ error: { code: "DELIVERY_STATE_ERROR", message } });
        }
    });
    console.log("[Agentic] Provider endpoints mounted: GET /v1/capabilities, POST /v1/chat, POST /v1/deliveries/:deliveryId/ack");
}
