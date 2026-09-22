export const APP_UPDATE_REQUEST_TIMEOUT_CODE = 'REQUEST_TIMEOUT';
export class AppUpdateRequestTimeoutError extends Error {
    code = APP_UPDATE_REQUEST_TIMEOUT_CODE;
    constructor() {
        super('update request exceeded its hard deadline');
        this.name = 'AppUpdateRequestTimeoutError';
    }
}
/**
 * Abort is advisory for Electron/Chromium requests, so do not await the fetch
 * promise after the deadline. The explicit race guarantees startup can always
 * leave the policy-refresh stage even if net.fetch never settles on abort.
 */
export async function runWithAppUpdateRequestDeadline(operation, timeoutMs) {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 50 || timeoutMs > 30_000) {
        throw new Error('update request timeout is out of range');
    }
    const controller = new AbortController();
    let timer = null;
    try {
        return await new Promise((resolve, reject) => {
            let settled = false;
            const finish = (callback) => {
                if (settled)
                    return;
                settled = true;
                if (timer)
                    clearTimeout(timer);
                timer = null;
                callback();
            };
            timer = setTimeout(() => {
                controller.abort();
                finish(() => reject(new AppUpdateRequestTimeoutError()));
            }, timeoutMs);
            Promise.resolve()
                .then(() => operation(controller.signal))
                .then((value) => finish(() => resolve(value)), (error) => finish(() => reject(error)));
        });
    }
    finally {
        if (timer)
            clearTimeout(timer);
    }
}
