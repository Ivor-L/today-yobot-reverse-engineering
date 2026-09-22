import { EXPERT_DEFINITION_SCHEMA_VERSION, } from "./types.js";
export const LEGACY_EXPERT_DEFINITION_PREFIX = "legacy.local.";
export function legacyExpertDefinitionId(profileId) {
    return `${LEGACY_EXPERT_DEFINITION_PREFIX}${profileId}`;
}
/**
 * Present an existing AGENT.md as an expert product asset without changing its execution policy.
 * No file is written and no semantic capability is inferred from the legacy tool allow-list.
 */
export function adaptLegacyProfileToExpert(profile) {
    const scene = profile.scene?.trim();
    return {
        schemaVersion: EXPERT_DEFINITION_SCHEMA_VERSION,
        definitionId: legacyExpertDefinitionId(profile.name),
        profileId: profile.name,
        definitionVersion: profile.version,
        origin: "legacy",
        publisher: {
            id: "local-user",
            name: "本地用户",
            verified: false,
        },
        display: {
            name: profile.displayName?.trim() || profile.name,
            summary: scene ? `沿用旧业务 Agent 配置：${scene}` : "沿用旧业务 Agent 配置",
            category: "我的专家",
            samplePrompts: [],
        },
        jobs: scene
            ? [{ id: "legacy-default", title: scene, description: "沿用旧业务 Agent 的任务场景" }]
            : [],
        // Legacy execution remains governed by the exact AgentProfile allow-list. Do not infer or
        // duplicate those bindings into the semantic runtime until the user explicitly upgrades.
        providerBindings: { required: [], optional: [] },
        capabilityRequest: { mode: "legacy_profile" },
        // The current product uses these profiles through Agentic/RPA. New invocation surfaces are
        // added only after an explicit runtime migration and therefore are not advertised here.
        channels: ["rpa"],
    };
}
