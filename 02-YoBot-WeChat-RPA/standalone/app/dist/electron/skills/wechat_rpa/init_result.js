function objectOrUndefined(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : undefined;
}
function textField(owner, keys) {
    if (!owner)
        return undefined;
    for (const key of keys) {
        const value = owner[key];
        if (typeof value === "string" && value.trim())
            return value.trim();
    }
    return undefined;
}
function failureReason(owner, root) {
    const code = textField(owner, ["code", "error_code"])
        ?? textField(root, ["code", "error_code"]);
    const message = textField(owner, ["message", "msg", "error", "detail", "error_detail"])
        ?? textField(root, ["message", "msg", "error", "detail", "error_detail"])
        ?? "微信 RPA 初始化失败（接口未提供原因）";
    const nextAction = objectOrUndefined(owner.next_action) ?? objectOrUndefined(root.next_action);
    const guidance = objectOrUndefined(owner.guidance) ?? objectOrUndefined(root.guidance);
    const hint = textField(nextAction, ["hint"])
        ?? textField(guidance, ["reason", "title"]);
    const prefix = code ? `[${code}] ` : "";
    return { code, reason: `${prefix}${message}${hint && !message.includes(hint) ? `；${hint}` : ""}` };
}
/**
 * `/api/init/multi` currently uses boolean `success`, while some RPA wrappers
 * rename it to `status`/`ok` or nest the REST body in `data`. Accept those
 * known transport variants without assuming that every RPA endpoint shares a
 * single response schema. Any explicit false wins over a wrapper's true.
 */
export function verifyRpaInitializeResult(response) {
    const root = objectOrUndefined(response);
    if (!root) {
        return { ok: false, reason: "微信 RPA 初始化接口返回了无法识别的响应", unverified: true };
    }
    const owners = [root];
    const nested = objectOrUndefined(root.data);
    if (nested)
        owners.push(nested);
    const candidates = owners.flatMap((owner) => ["success", "status", "ok"].map((key) => ({ owner, value: owner[key] })));
    const explicitFailure = candidates.find(({ value }) => value === false);
    if (explicitFailure) {
        return { ok: false, ...failureReason(explicitFailure.owner, root) };
    }
    if (candidates.some(({ value }) => value === true))
        return { ok: true };
    let raw = "";
    try {
        raw = JSON.stringify(root).slice(0, 300);
    }
    catch {
        raw = String(root);
    }
    return {
        ok: false,
        reason: `微信 RPA 初始化接口未返回明确的成功标志。原始响应：${raw}`,
        unverified: true,
    };
}
export class RpaInitializationError extends Error {
    code;
    response;
    unverified;
    constructor(verdict, response) {
        super(verdict.reason);
        this.name = "RpaInitializationError";
        this.code = verdict.code;
        this.response = response;
        this.unverified = verdict.unverified === true;
    }
}
export function assertRpaInitializeResult(response) {
    const verdict = verifyRpaInitializeResult(response);
    if (!verdict.ok)
        throw new RpaInitializationError(verdict, response);
}
