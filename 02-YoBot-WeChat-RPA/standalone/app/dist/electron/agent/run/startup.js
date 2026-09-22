import { AgentRunService } from "./service.js";
/**
 * Reconcile active AgentRun state before exposing the runtime to any ingress.
 *
 * AgentRun metadata is supplemental: an unavailable/corrupt runtime directory must not make
 * the APP server unavailable or prevent existing RPA Agents from using the legacy Pi path.
 */
export async function initializeActiveAgentRunRuntime(mode, store, createExecutor, logger = console) {
    if (mode !== "active")
        return { interrupted: [], degraded: false };
    const runService = new AgentRunService(store);
    try {
        const interrupted = await runService.reconcileInterruptedRuns();
        return {
            runtime: { runService, executor: createExecutor() },
            interrupted,
            degraded: false,
        };
    }
    catch (error) {
        logger.error("[AgentRun] Active startup reconciliation failed; Agentic/Preview will use the legacy execution path for this process.", error);
        return { interrupted: [], degraded: true };
    }
}
