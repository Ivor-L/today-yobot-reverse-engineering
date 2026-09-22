import * as crypto from "node:crypto";
export function expertCompositionLock(entry) {
    const components = (entry.components ?? []).map((component) => ({
        componentId: component.manifest.componentId,
        componentVersion: component.manifest.componentVersion,
        digest: component.digest,
        kind: component.manifest.kind,
        activation: component.ref.activation,
    }));
    const digest = `sha256:${crypto.createHash("sha256").update(JSON.stringify(components)).digest("hex")}`;
    return { schemaVersion: 1, components, digest };
}
/** Compose only trusted package instructions. User/projected data is appended by the caller. */
export function composeExpertSystemPrompt(entry, job, runtimeRules, turnContract) {
    const componentBlocks = (entry.components ?? []).map((component) => [
        `[Trusted Expert component: ${component.manifest.display.name} | ${component.manifest.componentId}@${component.manifest.componentVersion}]`,
        component.instructions,
    ].join("\n"));
    return [
        entry.profile.systemPrompt?.trim(),
        ...componentBlocks,
        turnContract
            ? `[Expert capability entry: ${job.title}]\n${job.description}\nThis package job describes available expertise. Its default artifact or deliverables apply only when the current turn explicitly requests them.`
            : `[Selected job: ${job.title}]\n${job.description}`,
        turnContract,
        runtimeRules,
    ].filter(Boolean).join("\n\n---\n");
}
