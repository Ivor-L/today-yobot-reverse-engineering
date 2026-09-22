import { runWithContext } from "../../utils/context.js";
import { guardTurnResponse } from "../harness/turn_guard.js";
import { resolveFileMutationPolicyModeForChannel } from "../harness/tool_policy_gateway.js";
import { AGENTIC_RUN_FLAG } from "../profile/agentic_guard.js";
import { AGENTIC_SHELL_SKILL } from "../profile/builtins.js";
import { bindSessionProfile, registerProfile, unbindSessionProfile, unregisterProfile, } from "../profile/resolver.js";
import { AgentRunBudgetExceededError, assertAgentRunInputBudget, createAgentRunRuntimeBudget, estimateAgentRunTokens, } from "./budget.js";
function channelFor(spec) {
    if (spec.source === "rpa")
        return "agentic";
    if (spec.source === "preview")
        return "agent-preview";
    if (spec.source === "main")
        return "system";
    return spec.source;
}
function restrictProfile(profile, spec) {
    if (profile.trustedCapabilityProjection
        && spec.source !== "direct"
        && spec.source !== "rpa"
        && !(spec.source === "main" && spec.invocationRole === "worker")) {
        throw new Error("Trusted Expert capability projections are valid only for Direct, RPA, or main Worker AgentRuns.");
    }
    if (profile.trustedCapabilityProjection
        && profile.trustedCapabilityProjection.policyDigest !== spec.harness.policyDigest) {
        throw new Error("Trusted Expert capability projection does not match the immutable AgentRun policy digest.");
    }
    const ceiling = spec.capabilities.allowedSkills === null
        ? undefined
        : new Set(spec.capabilities.allowedSkills);
    const allowedSkills = profile.allowedSkills === undefined
        ? ceiling
        : ceiling === undefined
            ? new Set(profile.allowedSkills)
            : new Set([...profile.allowedSkills].filter((skill) => ceiling.has(skill)));
    return {
        ...profile,
        allowedSkills,
        deniedSkills: [...new Set(profile.deniedSkills ?? [])],
        ...(profile.trustedCapabilityProjection ? {
            trustedCapabilityProjection: {
                ...profile.trustedCapabilityProjection,
                builtinSkillExemptions: profile.trustedCapabilityProjection.builtinSkillExemptions
                    .filter((skill) => allowedSkills === undefined || allowedSkills.has(skill)),
            },
        } : {}),
        shellAllowed: profile.shellAllowed === true
            && (allowedSkills === undefined || allowedSkills.has(AGENTIC_SHELL_SKILL)),
    };
}
function abortError() {
    const error = new Error("AgentRun was aborted.");
    error.name = "AbortError";
    return error;
}
/**
 * The only adapter allowed to translate a resolved AgentRun into a PiKernel call.
 * It binds a unique session/profile, applies capability ceilings and propagates cancellation.
 */
export class PiInprocExecutorAdapter {
    agent;
    constructor(agent) {
        this.agent = agent;
    }
    createExecutor(input) {
        return async ({ spec, signal }) => {
            if (input.profile.runtime !== "inproc") {
                throw new Error(`Profile ${input.profile.name} requires runtime=${input.profile.runtime}, not Pi in-process.`);
            }
            if (input.profile.name !== spec.profile.id || input.profile.version !== spec.profile.version) {
                throw new Error(`Resolved AgentRun profile ${spec.profile.id}@${spec.profile.version} does not match `
                    + `${input.profile.name}@${input.profile.version}.`);
            }
            const sessionId = input.sessionId || `agentrun__${spec.runId}`;
            const profileKey = `agent-run:${spec.runId}`;
            const profile = restrictProfile(input.profile, spec);
            const harnessEvents = [];
            let observedToolStarts = 0;
            const startedAt = Date.now();
            const channel = channelFor(spec);
            const runtimeBudget = createAgentRunRuntimeBudget(spec.limits);
            const inputTokens = assertAgentRunInputBudget(input.userMessage, input.history, spec.limits.maxInputTokens);
            if (spec.limits.maxTurns !== undefined && spec.limits.maxTurns < 1) {
                throw new AgentRunBudgetExceededError("max_turns_exceeded", spec.limits.maxTurns, 1);
            }
            const requestContext = {
                ...input.requestContext,
                channel,
                sessionId,
                traceId: input.requestContext?.traceId || spec.runId,
                toolPolicyScopes: [...spec.capabilities.resourceScopes],
                toolPolicyScopeSource: "resolved-agent-run",
                agentRunAllowedTools: spec.capabilities.allowedTools
                    ? [...spec.capabilities.allowedTools]
                    : undefined,
                agentRunDeniedTools: [...spec.capabilities.deniedTools],
                agentRunBudget: runtimeBudget,
                fileMutationPolicyMode: input.requestContext?.fileMutationPolicyMode
                    ?? resolveFileMutationPolicyModeForChannel(channel),
                harnessEventSink: (type, payload) => {
                    harnessEvents.push({ type, payload });
                    input.requestContext?.harnessEventSink?.(type, payload);
                },
                finalResponseGuard: (content) => guardTurnResponse(content, [], harnessEvents).content,
                agentRunId: spec.runId,
                parentAgentRunId: spec.parentRunId,
                ...(spec.harness.agenticInbound ? { [AGENTIC_RUN_FLAG]: true } : {}),
            };
            const stop = () => this.agent.stop?.(sessionId, signal.reason);
            input.onContextReady?.(requestContext);
            if (signal.aborted) {
                stop();
                throw abortError();
            }
            signal.addEventListener("abort", stop, { once: true });
            registerProfile(profileKey, () => profile);
            bindSessionProfile(sessionId, profileKey);
            try {
                const output = await runWithContext(requestContext, () => this.agent.run(input.userMessage, input.history, sessionId, (event) => {
                    if (event.type === "tool_start")
                        observedToolStarts++;
                    input.onEvent?.(event);
                }));
                const outputTokens = estimateAgentRunTokens(output);
                if (spec.limits.maxOutputTokens !== undefined
                    && outputTokens > spec.limits.maxOutputTokens) {
                    throw new AgentRunBudgetExceededError("max_output_tokens_exceeded", spec.limits.maxOutputTokens, outputTokens);
                }
                return {
                    output: output ?? "",
                    summary: "PiKernel in-process run completed.",
                    usage: {
                        inputTokens,
                        outputTokens,
                        toolCalls: Math.max(runtimeBudget.toolCalls, observedToolStarts),
                        turns: Math.max(runtimeBudget.turns, 1),
                    },
                    artifacts: [],
                };
            }
            finally {
                signal.removeEventListener("abort", stop);
                unbindSessionProfile(sessionId);
                unregisterProfile(profileKey);
                if (profile.sessionPolicy === "ephemeral")
                    this.agent.evictSession?.(sessionId);
            }
        };
    }
}
