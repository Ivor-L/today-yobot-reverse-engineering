import { stableTraceHash } from "./context_projection_trace.js";
function projectTool(tool) {
    const value = tool && typeof tool === "object" ? tool : {};
    return {
        name: value.name ?? value.definition?.name,
        description: value.description ?? value.definition?.description,
        parameters: value.parameters ?? value.definition?.parameters,
        executionMode: value.executionMode,
    };
}
/** One content-free, deterministic version coordinate for each run. */
export function buildHarnessManifest(input) {
    return {
        schemaVersion: 1,
        harnessVersion: "enterprise-harness-v1",
        runtimeDriver: "pi",
        runtimeVersion: "0.83.0",
        model: String(input.model.id || "unknown"),
        provider: String(input.model.provider || "unknown"),
        api: String(input.model.api || "unknown"),
        promptVersion: `sha256:${stableTraceHash(input.systemPrompt)}`,
        profileId: input.profile.id,
        profileVersion: input.profile.version,
        toolsetHash: stableTraceHash(input.tools.map(projectTool)),
        skillsetHash: stableTraceHash(input.skills.map((skill) => ({
            name: skill.name,
            description: skill.description,
        }))),
        policyVersion: `tool-policy-v1:${input.modes.toolPolicy}`,
        projectionVersion: `prefix-projection-v1:${input.modes.projection}`,
        routerVersion: "static-router-v1",
        verifierVersion: `tool-verifier-v1:${input.modes.verifier}`,
        taskContractVersion: `task-contract-v1:${input.modes.taskContract}`,
        platform: `${process.platform}-${process.arch}`,
        nodeVersion: process.versions.node,
    };
}
