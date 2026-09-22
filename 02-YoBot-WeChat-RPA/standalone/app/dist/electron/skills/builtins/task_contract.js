import { randomUUID } from "node:crypto";
import { TaskContractStore } from "../../agent/harness/task_contract.js";
import { getContext } from "../../utils/context.js";
function normalizeApprovalOutcome(outcome) {
    return typeof outcome === "string" ? { decision: outcome } : outcome;
}
export class TaskContractSkill {
    name = "task-contract";
    description = "Create a structured task contract before artifact, multi-step, or write operations.";
    scope = "both";
    tools = [{
            definition: {
                name: "task_contract_set",
                description: "Set the task goal, scope, deliverables, success criteria, evidence requirements, assumptions, and risk. "
                    + "Use before local/external writes or artifact-producing multi-step work. This updates deterministic state and makes no LLM call.",
                parameters: {
                    type: "object",
                    additionalProperties: false,
                    required: [
                        "goal", "deliverables", "scope", "constraints", "successCriteria",
                        "evidenceRequirements", "assumptions", "risk",
                    ],
                    properties: {
                        goal: { type: "string", minLength: 3, maxLength: 2000 },
                        deliverables: {
                            type: "array", minItems: 1, maxItems: 20,
                            items: {
                                type: "object", additionalProperties: false,
                                required: ["type", "description"],
                                properties: {
                                    type: { type: "string" }, description: { type: "string" }, target: { type: "string" },
                                },
                            },
                        },
                        scope: {
                            type: "object", additionalProperties: false, required: ["included", "excluded"],
                            properties: {
                                included: { type: "array", items: { type: "string" } },
                                excluded: { type: "array", items: { type: "string" } },
                            },
                        },
                        constraints: { type: "array", items: { type: "string" } },
                        successCriteria: {
                            type: "array", minItems: 1, maxItems: 30,
                            items: {
                                type: "object", additionalProperties: false,
                                required: ["id", "description", "verification"],
                                properties: {
                                    id: { type: "string" }, description: { type: "string" },
                                    verification: { type: "string", enum: ["assertion", "read_back", "artifact", "evidence", "model"] },
                                },
                            },
                        },
                        evidenceRequirements: { type: "array", items: { type: "string" } },
                        assumptions: {
                            type: "array", maxItems: 30,
                            items: {
                                type: "object", additionalProperties: false,
                                required: ["text", "confidence", "requiresConfirmation"],
                                properties: {
                                    text: { type: "string" }, confidence: { type: "number", minimum: 0, maximum: 1 },
                                    requiresConfirmation: { type: "boolean" },
                                },
                            },
                        },
                        // type 不可省：Moonshot/Kimi 严格校验 JSON Schema，裸 enum 会让整个请求 400
                        // （线上实录：`At path 'properties.risk': type is not defined` → 选 kimi 的每一轮都必然失败，
                        // 与用户问什么无关）。Claude/DeepSeek 容忍裸 enum，所以这个坑只在切换模型时才暴露。
                        risk: { type: "string", enum: ["low", "medium", "high", "critical"] },
                        budget: {
                            type: "object", additionalProperties: false,
                            properties: {
                                maxToolCalls: { type: "number", minimum: 1 },
                                maxDurationMs: { type: "number", minimum: 1 },
                                maxCostUsd: { type: "number", minimum: 0 },
                            },
                        },
                    },
                },
                enterprise: {
                    namespace: "harness",
                    capability: "task_contract",
                    sideEffect: "local",
                    risk: "low",
                    reversible: true,
                    idempotent: true,
                    approval: "never",
                    executionMode: "sequential",
                },
            },
            execute: async (args, _signal, context) => {
                const sessionId = context?.sessionId || "unknown";
                const store = TaskContractStore.getInstance();
                const result = store.set(sessionId, args);
                if (result.error)
                    return `Error: ${JSON.stringify(result.error)}`;
                let record = result.record;
                let confirmation;
                if (record.state === "needs_user_confirmation") {
                    const approvalHandler = getContext()?.toolApprovalHandler;
                    if (!approvalHandler) {
                        confirmation = {
                            required: true,
                            code: "task_contract_confirmation_unavailable",
                            message: "A real user confirmation channel is required before this task scope can become active.",
                        };
                    }
                    else {
                        const outcome = normalizeApprovalOutcome(await approvalHandler({
                            id: randomUUID(),
                            toolName: "task_contract_confirm",
                            risk: record.contract.risk,
                            sideEffect: "local",
                            capability: "task_contract_scope_confirmation",
                            args: {
                                contractId: record.id,
                                contractHash: record.contractHash,
                                reason: record.reason,
                            },
                            createdAt: Date.now(),
                            approvalCategory: "task_scope",
                        }, _signal));
                        if (outcome.decision === "approved") {
                            const boundArgs = outcome.approvedArgs && typeof outcome.approvedArgs === "object"
                                ? outcome.approvedArgs
                                : undefined;
                            const boundContractId = typeof boundArgs?.contractId === "string"
                                ? boundArgs.contractId
                                : record.id;
                            // A receipt authorizes the original contract expansion. If the model regenerates a
                            // different contract on the confirmation turn, confirm the receipt-bound record only.
                            const confirmed = store.confirm(sessionId, boundContractId);
                            if (confirmed.error)
                                return `Error: ${JSON.stringify(confirmed.error)}`;
                            record = confirmed.record;
                            confirmation = { required: false, code: outcome.code || "approval_granted" };
                        }
                        else {
                            confirmation = {
                                required: true,
                                decision: outcome.decision,
                                code: outcome.code || (outcome.decision === "pending" ? "approval_pending" : "approval_denied"),
                                message: outcome.message,
                                challengeToken: outcome.challengeToken,
                                expiresAt: outcome.expiresAt,
                                ...(outcome.challengeToken
                                    ? { confirmationCommand: "确认" }
                                    : {}),
                            };
                        }
                    }
                }
                try {
                    context?.logger?.writeEvent("task_contract", {
                        schemaVersion: 1,
                        contractId: record.id,
                        contractHash: record.contractHash,
                        version: record.version,
                        state: record.state,
                        risk: record.contract.risk,
                        criteriaCount: record.contract.successCriteria.length,
                        deliverableCount: record.contract.deliverables.length,
                        idempotent: result.idempotent === true,
                    });
                }
                catch {
                    // Contract state does not depend on diagnostics.
                }
                return JSON.stringify({
                    contractId: record.id,
                    version: record.version,
                    state: record.state,
                    risk: record.contract.risk,
                    criteriaCount: record.contract.successCriteria.length,
                    idempotent: result.idempotent === true,
                    ...(confirmation ? { confirmation } : {}),
                });
            },
        }];
}
