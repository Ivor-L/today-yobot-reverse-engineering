import { expertWorkerResultMetadata } from "../../agent/expert/worker_types.js";
import { getContext } from "../../utils/context.js";
export class ExpertInvokeSkill {
    provider;
    name = "expert-runtime";
    description = "把明确、适合某个已安装专家的子任务委派给一个受限 Expert Worker，并把结构化结果带回当前主对话。";
    scope = "main";
    get instructions() {
        const catalog = this.provider.listAvailable?.() ?? [];
        return [
            "Use invoke_expert only when a specific installed Expert is a materially better fit for a bounded subtask.",
            "Pass a complete standalone objective and only the minimum context the Expert needs.",
            "Do not use it for ordinary questions you can answer directly, and never invent definition ids or versions.",
            "A blocked/failed Expert result is not success: explain the limitation or continue safely without claiming completion.",
            `Available pinned Experts (runtime-authoritative catalog): ${JSON.stringify(catalog)}`,
        ].join("\n");
    }
    constructor(provider) {
        this.provider = provider;
    }
    tools = [{
            definition: {
                name: "invoke_expert",
                description: "Invoke one pinned installed Expert as an isolated depth-1 worker. The worker receives the objective and optional bounded context, not the full chat history.",
                parameters: {
                    type: "object",
                    additionalProperties: false,
                    required: ["definition_id", "definition_version", "objective"],
                    properties: {
                        definition_id: { type: "string", description: "Pinned Expert definition id from the installed Expert catalog." },
                        definition_version: { type: "string", description: "Pinned installed Expert definition version." },
                        job_id: { type: "string", description: "Optional declared job id; defaults to the Expert's first job." },
                        objective: { type: "string", minLength: 1, maxLength: 20_000, description: "A standalone bounded objective for the worker." },
                        projected_context: { type: "string", maxLength: 6_000, description: "Optional minimum parent-produced context. It is treated as untrusted data." },
                    },
                },
                enterprise: {
                    namespace: "agent",
                    capability: "invoke_expert",
                    sideEffect: "none",
                    risk: "low",
                    reversible: true,
                    idempotent: false,
                    approval: "never",
                    estimatedLatencyClass: "long",
                    estimatedCostClass: "high",
                    executionMode: "sequential",
                },
            },
            execute: async (args) => {
                const context = getContext();
                if (!context?.sessionId || !context.traceId) {
                    throw new Error("invoke_expert requires a trusted main Agent request context.");
                }
                const parentDepth = Number(context.expertInvocationDepth ?? 0);
                if (context.agenticRun === true || parentDepth >= 1) {
                    throw new Error("invoke_expert is unavailable inside Agent/Expert worker runs.");
                }
                const ref = {
                    definitionId: String(args?.definition_id ?? "").trim(),
                    definitionVersion: String(args?.definition_version ?? "").trim(),
                    ...(String(args?.job_id ?? "").trim() ? { jobId: String(args.job_id).trim() } : {}),
                };
                const parentSessionId = context.sessionId.includes("__")
                    ? context.sessionId
                    : `${context.channel || "websocket"}__${context.sessionId}`;
                const traceId = `${context.traceId}:expert`;
                const authority = this.provider.issueAuthority({
                    parentSessionId,
                    traceId,
                    channel: context.channel || "websocket",
                    subjectId: context.userId || "anonymous",
                    ...(typeof context.tenantId === "string" && context.tenantId.trim()
                        ? { tenantId: context.tenantId.trim() }
                        : {}),
                    capabilities: context.expertWorkerCapabilities ?? [],
                    resourceScopes: context.toolPolicyScopes ?? [],
                    workspaceRoots: context.expertWorkerWorkspaceRoots ?? [],
                    knowledgeNamespaces: context.expertWorkerKnowledgeNamespaces ?? [],
                    deniedTools: context.expertWorkerDeniedTools ?? [],
                });
                const result = await this.provider.invoke({
                    expertRef: ref,
                    objective: String(args?.objective ?? ""),
                    projectedContext: String(args?.projected_context ?? "").slice(0, 6_000) || undefined,
                    invocation: "tool",
                    parentSessionId,
                    parentRunId: context.agentRunId,
                    traceId,
                    parentDepth,
                    authority,
                    onEvent: context.onEvent,
                });
                return JSON.stringify({
                    ...expertWorkerResultMetadata(result),
                    ...(result.status === "completed"
                        ? { text: result.text, artifacts: result.artifacts, degraded: result.degraded }
                        : {
                            message: result.message,
                            ...(result.status !== "needs_input" && result.retryable !== undefined
                                ? { retryable: result.retryable }
                                : {}),
                        }),
                });
            },
        }];
}
