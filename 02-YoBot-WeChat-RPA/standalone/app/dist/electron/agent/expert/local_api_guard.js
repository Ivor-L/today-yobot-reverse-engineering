import { LLMManager } from "../llm/manager.js";
const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1", "localhost"]);
/** Local Expert APIs are callable only by this desktop host/UI session. */
export function guardLocalExpertRequest(req, res) {
    const ip = (req.socket.remoteAddress || req.ip || "").trim();
    if (!LOOPBACK.has(ip)) {
        res.status(403).json({ code: "local_only", error: "Expert runtime is available only on the local device." });
        return false;
    }
    const expected = LLMManager.getInstance().getAuthToken();
    if (expected) {
        const header = req.header("authorization") || "";
        const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
        if (token !== expected) {
            res.status(401).json({ code: "unauthorized", error: "Expert runtime authentication failed." });
            return false;
        }
        return true;
    }
    const origin = (req.header("origin") || "").trim();
    if (!origin || origin === "null")
        return true;
    try {
        if (LOOPBACK.has(new URL(origin).hostname))
            return true;
    }
    catch { /* reject below */ }
    res.status(403).json({ code: "untrusted_origin", error: "Expert runtime rejected a non-local page." });
    return false;
}
