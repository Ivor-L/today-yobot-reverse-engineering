/**
 * WeRobotCore 发送类接口的**成败判定**。
 *
 * 为什么需要单独一个模块来干这件事
 * --------------------------------
 * 这个接口在业务失败时返回的是 **HTTP 200**，失败信息只在响应体里 —— 而
 * `RPAApiClient.sendMessage` 只在非 2xx 时抛错。于是"微信实例未初始化"这类失败
 * 一路静默通过，定时任务把它记成成功，聊天窗口还显示「✅ 已发送至微信」。
 * 这正是本轮要根除的「以为发了、其实没发」。
 *
 * 更阴的是字段名。内部函数返回 `success`，但 HTTP 路由把它**改名**了
 * （yokowebot/api_server.py:4793）：
 *
 *   return {
 *       "status": result.get("success", False),   # ← 布尔值，字段叫 status
 *       "message": result.get("message", "消息发送成功"),
 *       "data": { "messages": [...] }
 *   }
 *
 * 所以线上真实的失败响应长这样：
 *
 *   {"status": false, "message": "WeChat 实例未初始化, 请先初始化微信实例", "data": {...}}
 *
 * 两个坑叠在一起：
 *   1. 按内部函数的 `success` 去判，永远判不出来（字段是 `undefined`）；
 *   2. `status` 在别处几乎总是字符串（HTTP 状态、任务状态），这里却是**布尔**，
 *      写 `status === 'error'` 一样会漏。
 *
 * 判定采取"**要正面确认**"：只有明确看到 true 才算成功，明确看到 false 就是失败。
 * 两者都没看到时不假装成功，而是把原始响应体报出来 —— 上游再改一次字段名，
 * 我们要在第一次就发现，而不是几周后从用户的截图里发现。
 */
function pickMessage(res, fallback) {
    const msg = res?.message ?? res?.msg ?? res?.error ?? res?.detail;
    const text = typeof msg === "string" ? msg.trim() : "";
    return text || fallback;
}
export function verifyRpaSendResult(res) {
    if (res === null || res === undefined || typeof res !== "object") {
        const raw = JSON.stringify(res ?? null);
        return { ok: false, reason: `微信接口返回了无法确认的结果：${raw}`, unverified: true, raw };
    }
    const body = res;
    /*
     * 这里只适配“发送文本消息”的回执，不把它当成整个 RPA API 的统一协议：
     *
     * - 当前 REST 路由 `/api/chat/send_message` 把内部 `success` 政名为布尔 `status`；
     * - 旧实现/内部调用可能仍返回布尔 `success`；
     * - MCP gateway 会再包一层 `{ success: <HTTP 是否成功>, data: <REST body> }`。
     *
     * 因此需要看顶层和一层 `data`，但只认明确的布尔值。尤其要先收集所有
     * `false` 再接受任意 `true`：否则 MCP 的“HTTP 200”会把 data.status=false
     * 这种真实业务失败覆盖成成功。
     */
    const candidates = [];
    const collect = (owner) => {
        for (const key of ["status", "success", "ok"]) {
            candidates.push({ owner, value: owner[key] });
        }
    };
    // Deployed gateways may add transport envelopes. Traverse only known wrapper fields,
    // with a depth bound, so unrelated nested business objects cannot be mistaken for the
    // acknowledgement. A business false at any level wins over an outer HTTP-level true.
    const wrappers = ["data", "result", "response", "payload"];
    const queue = [{ owner: body, depth: 0 }];
    const seen = new Set();
    while (queue.length > 0) {
        const current = queue.shift();
        if (seen.has(current.owner))
            continue;
        seen.add(current.owner);
        collect(current.owner);
        if (current.depth >= 4)
            continue;
        for (const key of wrappers) {
            const nested = current.owner[key];
            if (nested && typeof nested === "object" && !Array.isArray(nested)) {
                queue.push({ owner: nested, depth: current.depth + 1 });
            }
        }
    }
    const explicitFailure = candidates.find((candidate) => candidate.value === false);
    if (explicitFailure) {
        const reason = pickMessage(explicitFailure.owner, pickMessage(body, "微信发送失败（接口未提供原因）"));
        // RPA 说"失败"，但有一类失败其实**不是失败**：UIA 超时。见 looksIndeterminate。
        // 必须降级成"结果未知"，否则调用方（含模型）会照常重试，把同一条消息发给客户两遍。
        if (looksIndeterminate(reason)) {
            let raw;
            try {
                raw = JSON.stringify(body).slice(0, 300);
            }
            catch {
                raw = String(body);
            }
            return { ok: false, reason: indeterminateSendReason(reason), unverified: true, raw };
        }
        return { ok: false, reason };
    }
    if (candidates.some((candidate) => candidate.value === true))
        return { ok: true };
    let raw;
    try {
        raw = JSON.stringify(body).slice(0, 300);
    }
    catch {
        raw = String(body);
    }
    return {
        ok: false,
        reason: `微信接口未返回明确的成功标志，无法确认消息已发出。原始响应：${raw}`,
        unverified: true,
        raw,
    };
}
/**
 * 这条"失败"其实是**结果未知**吗？
 *
 * `UIA发送超时` 是 RPA 报的失败，但它几乎肯定不是失败——消息通常已经发出去了。
 * 依据在 RPA 源码自己的注释里（`WeRobotCore/api/chat.py` 的 `submit_uia_work`）：
 *
 *   "Native UIA calls cannot be cancelled safely.  In particular, a timed-out
 *    call must keep owning this worker until it really returns"
 *
 * `_run_uia` 用 `asyncio.wait_for` 等 executor future，超时只取消**等待**，
 * 线程里的 `ChatWith()` + `SendMsg()` 会照跑到底。默认阈值只有 10 秒
 * （`_UIA_TIMEOUT_SEND_MESSAGE`），而一次发送要切窗口 + 定位输入框 + 发送。
 *
 * 更糟的是 UIA 是**进程级单 worker**：超时的那次仍然占着 worker，重试只能排在它后面，
 * 于是第二条必然在第一条真正发完之后再发一遍。「客户收到两条」是这个机制的确定性结果，
 * 不是偶发——线上实测 33 次调用超时 11 次，用户当场说「把多发一条撤掉」。
 *
 * 所以这类原因必须走"未确认"通道：不自动重试，也不告诉模型"发失败了"。
 */
export function looksIndeterminate(reason) {
    return /UIA\s*发送超时|UIA\s*超时|发送超时|操作超时|timed?\s*out/i.test(reason);
}
/** 把 UIA 超时翻译成调用方（含模型）能正确处置的说法。 */
export function indeterminateSendReason(reason) {
    return `${reason}——这是超时，不代表没发出去（RPA 的 UIA 调用无法安全取消，超时后底层仍会把消息发完）。`
        + `请勿直接重发，否则对方很可能收到两条。先去会话里确认是否已送达，再决定要不要补发。`;
}
/** 失败原因是否指向"微信实例还没起来"——这类可以初始化后重试一次。 */
export function looksUninitialized(reason) {
    return /未初始化|未登录|请先初始化|无法获取\s*WeChat\s*实例|not initialized|instance is null/i.test(reason);
}
