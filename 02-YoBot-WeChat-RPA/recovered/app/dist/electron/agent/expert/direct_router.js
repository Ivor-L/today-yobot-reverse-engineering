import { AgentRunExecutionError } from "../run/service.js";
import { ExpertDirectError, } from "./direct_service.js";
import { guardLocalExpertRequest } from "./local_api_guard.js";
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/;
function sendError(res, error) {
    if (error instanceof ExpertDirectError) {
        res.status(error.httpStatus).json({ code: error.code, error: error.message });
        return;
    }
    if (error instanceof AgentRunExecutionError) {
        res.status(500).json({ code: error.code, error: error.message, retryable: error.retryable });
        return;
    }
    res.status(500).json({ code: "expert_runtime_failed", error: error instanceof Error ? error.message : String(error) });
}
export function registerExpertDirectApi(app, service) {
    app.get("/api/expert-runtime/catalog", (req, res) => {
        if (!guardLocalExpertRequest(req, res))
            return;
        res.json({ schemaVersion: 1, experts: service.catalog() });
    });
    app.post("/api/expert-runtime/preflight", (req, res) => {
        if (!guardLocalExpertRequest(req, res))
            return;
        try {
            const request = {
                definitionId: String(req.body?.definitionId || "").trim(),
                definitionVersion: String(req.body?.definitionVersion || "").trim(),
                ...(req.body?.jobId ? { jobId: String(req.body.jobId).trim() } : {}),
                ...(Array.isArray(req.body?.grantedCapabilities)
                    ? { grantedCapabilities: req.body.grantedCapabilities.map(String) }
                    : {}),
                workspaceAccess: req.body?.workspaceAccess === "current" ? "current" : "none",
                ...(Array.isArray(req.body?.deniedTools) ? { deniedTools: req.body.deniedTools.map(String) } : {}),
            };
            if (!SAFE_ID.test(request.definitionId) || !request.definitionVersion) {
                res.status(400).json({ code: "invalid_request", error: "definitionId and definitionVersion are required." });
                return;
            }
            res.json(service.preflight(request));
        }
        catch (error) {
            sendError(res, error);
        }
    });
    app.post("/api/expert-runtime/run", async (req, res) => {
        if (!guardLocalExpertRequest(req, res))
            return;
        const preflightId = String(req.body?.preflightId || "").trim();
        const conversationId = String(req.body?.conversationId || "").trim();
        const turnId = String(req.body?.turnId || "").trim();
        const text = String(req.body?.text || "");
        if (!SAFE_ID.test(preflightId) || !SAFE_ID.test(conversationId) || !SAFE_ID.test(turnId) || !text.trim()) {
            res.status(400).json({ code: "invalid_request", error: "preflightId, conversationId, turnId, and text are required." });
            return;
        }
        res.writeHead(200, {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        });
        const send = (event) => {
            if (!res.writableEnded)
                res.write(`${JSON.stringify(event)}\n`);
        };
        let finished = false;
        res.on("close", () => {
            if (!finished)
                service.stopConversation(conversationId);
        });
        try {
            await service.run({ preflightId, conversationId, turnId, text }, send);
        }
        catch (error) {
            const payload = error instanceof ExpertDirectError
                ? { type: "error", code: error.code, message: error.message }
                : error instanceof AgentRunExecutionError
                    ? { type: "error", code: error.code, message: error.message, retryable: error.retryable }
                    : { type: "error", code: "expert_runtime_failed", message: error instanceof Error ? error.message : String(error) };
            send(payload);
        }
        finally {
            finished = true;
            res.end();
        }
    });
    app.post("/api/expert-runtime/stop", (req, res) => {
        if (!guardLocalExpertRequest(req, res))
            return;
        const definitionId = String(req.body?.definitionId || "").trim();
        const conversationId = String(req.body?.conversationId || "").trim();
        if (!SAFE_ID.test(definitionId) || !SAFE_ID.test(conversationId)) {
            res.status(400).json({ code: "invalid_request", error: "definitionId and conversationId are required." });
            return;
        }
        res.json({ success: true, stopped: service.stop(definitionId, conversationId) });
    });
    app.post("/api/expert-runtime/reset", (req, res) => {
        if (!guardLocalExpertRequest(req, res))
            return;
        const definitionId = String(req.body?.definitionId || "").trim();
        const conversationId = String(req.body?.conversationId || "").trim();
        if (!SAFE_ID.test(definitionId) || !SAFE_ID.test(conversationId)) {
            res.status(400).json({ code: "invalid_request", error: "definitionId and conversationId are required." });
            return;
        }
        try {
            service.reset(definitionId, conversationId);
            res.json({ success: true });
        }
        catch (error) {
            sendError(res, error);
        }
    });
    console.log("[ExpertDirect] P1 runtime endpoints mounted");
}
