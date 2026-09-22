import { RPAApiClient } from "./api_client.js";
import { looksUninitialized, verifyRpaSendResult } from "./send_result.js";
import { assertRpaInitializeResult } from "./init_result.js";
import { RpaDeliveryLedger } from "./delivery_ledger.js";
export class RpaDeliveryBlockedError extends Error {
    deliveryId;
    state;
    constructor(message, deliveryId, state) {
        super(message);
        this.deliveryId = deliveryId;
        this.state = state;
        this.name = "RpaDeliveryBlockedError";
    }
}
let defaultLedger;
let defaultLedgerRoot = "";
function resolveDefaultLedger() {
    const root = `${process.env.USER_DATA_PATH || process.cwd()}::rpa_delivery_ledger`;
    if (!defaultLedger || defaultLedgerRoot !== root) {
        defaultLedgerRoot = root;
        defaultLedger = new RpaDeliveryLedger();
    }
    return defaultLedger;
}
function abortReason(signal) {
    if (!signal?.aborted)
        return undefined;
    return signal.reason instanceof Error
        ? signal.reason
        : new Error(String(signal.reason || "微信投递已取消"));
}
async function waitAbortably(promise, signal) {
    if (!signal)
        return promise;
    const existingReason = abortReason(signal);
    if (existingReason)
        throw existingReason;
    return new Promise((resolve, reject) => {
        const onAbort = () => reject(abortReason(signal) ?? new Error("微信投递已取消"));
        signal.addEventListener("abort", onAbort, { once: true });
        promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
    });
}
/**
 * Sends one cron-produced text through the RPA REST endpoint and verifies the endpoint-specific
 * business result. Retries only after an explicit "instance not initialized" result; ambiguous
 * network failures are never retried because the first request may already have produced the
 * external side effect.
 */
export async function deliverRpaText(options) {
    const target = String(options.target || "").trim();
    const text = String(options.text || "").trim();
    if (!target)
        throw new Error("微信投递目标为空");
    if (!text)
        throw new Error("任务未产出任何文本内容");
    // Wait before the request crosses the RPA boundary. During Supervisor recovery this is a
    // provably side-effect-free place to retry; after sendMessage starts, a transport failure is
    // ambiguous and must continue to fail closed to avoid duplicate WeChat messages.
    let serviceEnsured = false;
    if (options.ensureService) {
        await waitAbortably(Promise.resolve(options.ensureService()), options.signal);
        serviceEnsured = true;
    }
    const client = options.client ?? new RPAApiClient();
    const idempotencyKey = options.idempotencyKey?.trim();
    const ledger = idempotencyKey ? (options.ledger ?? resolveDefaultLedger()) : undefined;
    let deliveryId;
    let confirmedResponse;
    let ledgerClaimed = false;
    let deliveryUncertain = false;
    if (idempotencyKey && ledger) {
        const claim = ledger.claim(idempotencyKey, {
            channel: "wechat-rpa",
            accountId: options.accountId,
            target,
            text,
        });
        deliveryId = claim.deliveryId;
        if (claim.state === "completed")
            return { deliveryId, deduplicated: true };
        if (claim.state === "conflict") {
            throw new RpaDeliveryBlockedError("同一微信投递幂等键对应了不同内容，已拒绝发送。", deliveryId, "conflict");
        }
        if (claim.state === "busy") {
            throw new RpaDeliveryBlockedError(claim.status === "uncertain"
                ? "上一次微信投递结果不确定，为避免重复发送，本次已阻止。"
                : "相同微信投递正在执行，本次已阻止。", deliveryId, claim.status === "uncertain" ? "uncertain" : "busy");
        }
        ledgerClaimed = true;
    }
    const throwIfAborted = () => {
        const reason = abortReason(options.signal);
        if (reason)
            throw reason;
    };
    const sendOnce = async () => {
        throwIfAborted();
        if (idempotencyKey && ledger)
            ledger.noteAttempt(idempotencyKey);
        let response;
        try {
            response = await client.sendMessage(target, text, options.accountId, { signal: options.signal });
        }
        catch (error) {
            // Once the request crossed the RPA boundary, transport cancellation/failure cannot prove
            // whether WeChat accepted the message. Never retry this logical send automatically.
            deliveryUncertain = true;
            throw error;
        }
        const verdict = verifyRpaSendResult(response);
        if (!verdict.ok) {
            if ("unverified" in verdict && verdict.unverified)
                deliveryUncertain = true;
            throw new Error(verdict.reason);
        }
        confirmedResponse = response;
        if (idempotencyKey && ledger) {
            try {
                ledger.complete(idempotencyKey);
            }
            catch (error) {
                // RPA explicitly confirmed success but the durable completion write failed. The send
                // happened, so the only safe state is uncertain/fail-closed.
                deliveryUncertain = true;
                throw error;
            }
        }
    };
    try {
        try {
            await sendOnce();
            return { deliveryId, deduplicated: false, response: confirmedResponse };
        }
        catch (error) {
            throwIfAborted();
            const reason = String(error?.message || error);
            if (!looksUninitialized(reason) || deliveryUncertain)
                throw error;
            try {
                // The service bootstrap does not expose AbortSignal. Race our wait against cancellation so
                // a stuck bootstrap cannot keep the scheduler's single-flight slot locked forever. Its own
                // best-effort startup may continue, but the cancelled call will never proceed to send.
                if (options.ensureService && !serviceEnsured) {
                    await waitAbortably(Promise.resolve(options.ensureService()), options.signal);
                    serviceEnsured = true;
                }
                throwIfAborted();
                const initResult = await client.initialize({ signal: options.signal });
                throwIfAborted();
                // Keep the delivery layer defensive: injected clients and older client
                // implementations may not yet validate HTTP-200 business failures.
                assertRpaInitializeResult(initResult);
            }
            catch (initError) {
                throwIfAborted();
                throw new Error(`${reason}；自动初始化也失败了：${String(initError?.message || initError)}`);
            }
            // Exactly one retry, and only after the server explicitly reported an uninitialized instance.
            await sendOnce();
            return { deliveryId, deduplicated: false, response: confirmedResponse };
        }
    }
    catch (error) {
        if (idempotencyKey && ledger && ledgerClaimed) {
            try {
                if (deliveryUncertain)
                    ledger.markUncertain(idempotencyKey, error);
                else
                    ledger.releaseSafeFailure(idempotencyKey);
            }
            catch (ledgerError) {
                console.error("[RPA Delivery] Failed to finalize durable ledger:", ledgerError);
            }
        }
        throw error;
    }
}
