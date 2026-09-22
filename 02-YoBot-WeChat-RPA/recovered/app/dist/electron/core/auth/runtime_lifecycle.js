/**
 * Shared login/logout contract. Clearing auth must stop the automation runtime;
 * it must never be translated into "restart with an empty token".
 */
export async function reconcileAuthBoundRuntime(token, runtime) {
    if (!token) {
        await runtime.stop();
        return { action: 'stopped' };
    }
    return { action: 'applied', result: await runtime.applyAuthToken(token) };
}
