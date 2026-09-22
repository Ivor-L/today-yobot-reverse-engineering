import { getInteractionStore } from "../../agent/interaction/store.js";
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1_000;
export const requestUserInputSkill = {
    name: "request-user-input",
    description: "向用户发起结构化选择或简短补充问题，并等待用户在聊天输入区确认后再继续。",
    scope: "main",
    instructions: [
        "Use request_user_input only when information is genuinely required before continuing.",
        "Options are dynamic and must be mutually distinct. Use stable short ids such as has_credentials.",
        "Do not request passwords, tokens, AppSecret, private keys, or other secrets through this interaction.",
        "After the tool returns WAITING_FOR_USER_INPUT, stop the current turn immediately. Do not invent the user's answer and do not repeat the question in a long response.",
    ].join("\n"),
    tools: [{
            definition: {
                name: "request_user_input",
                description: "Pause the current workflow and ask the user one structured question with dynamic options and optional short free-text input.",
                parameters: {
                    type: "object",
                    additionalProperties: false,
                    required: ["prompt"],
                    properties: {
                        prompt: { type: "string", description: "The concise confirmation or clarification question." },
                        options: {
                            type: "array",
                            minItems: 0,
                            maxItems: 5,
                            items: {
                                type: "object",
                                additionalProperties: false,
                                required: ["id", "label"],
                                properties: {
                                    id: { type: "string", pattern: "^[a-zA-Z0-9][a-zA-Z0-9_-]*$" },
                                    label: { type: "string" },
                                    value: { type: "string" },
                                    description: { type: "string" },
                                },
                            },
                        },
                        allow_multiple: { type: "boolean", default: false },
                        custom_input: {
                            type: "object",
                            additionalProperties: false,
                            properties: {
                                enabled: { type: "boolean", default: true },
                                label: { type: "string", default: "其他补充" },
                                placeholder: { type: "string" },
                                required: { type: "boolean", default: false },
                                max_length: { type: "integer", minimum: 1, maximum: 2000, default: 500 },
                            },
                        },
                        expires_in_seconds: { type: "integer", minimum: 60, maximum: 86400, default: 86400 },
                    },
                },
                enterprise: {
                    namespace: "interaction",
                    capability: "request_user_input",
                    sideEffect: "none",
                    risk: "low",
                    reversible: true,
                    idempotent: false,
                    approval: "never",
                    estimatedLatencyClass: "instant",
                    estimatedCostClass: "free",
                },
            },
            execute: async (args, _signal, context) => {
                if (!context?.sessionId)
                    throw new Error("request_user_input requires a session context");
                const unifiedSessionId = context.sessionId.includes("__")
                    ? context.sessionId
                    : `${context.channel || "websocket"}__${context.sessionId}`;
                const options = Array.isArray(args?.options) ? args.options : [];
                const custom = args?.custom_input;
                const ttlMs = Math.max(60_000, Math.min(Number(args?.expires_in_seconds) * 1_000 || DEFAULT_TTL_MS, DEFAULT_TTL_MS));
                const request = await getInteractionStore().create({
                    sessionId: unifiedSessionId,
                    turnId: context.traceId,
                    traceId: context.traceId,
                    kind: options.length > 0 ? "choice" : "short_input",
                    origin: "agent",
                    question: {
                        id: "primary",
                        prompt: args?.prompt,
                        selection: args?.allow_multiple ? "multiple" : "single",
                        options: options.map((option, index) => ({
                            id: option?.id || `option_${index + 1}`,
                            label: option?.label,
                            value: option?.value || option?.id || `option_${index + 1}`,
                            description: option?.description,
                        })),
                        customInput: custom?.enabled === false ? undefined : {
                            enabled: Boolean(custom),
                            label: custom?.label || "其他补充",
                            placeholder: custom?.placeholder,
                            required: Boolean(custom?.required),
                            maxLength: Number(custom?.max_length) || 500,
                        },
                    },
                    expiresAt: Date.now() + ttlMs,
                    continuation: { mode: "agent_answer", channel: context.channel, userId: context.userId },
                });
                return JSON.stringify({
                    status: "WAITING_FOR_USER_INPUT",
                    interactionId: request.id,
                    instruction: "Stop this turn now. The user's structured response will arrive in a new turn.",
                });
            },
        }],
};
