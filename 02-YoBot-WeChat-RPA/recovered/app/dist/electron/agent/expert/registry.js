import { resolveExpertComponents } from "./component_registry.js";
import { adaptLegacyProfileToExpert } from "./legacy_adapter.js";
import { ExpertSidecarError, expertSidecarPath, loadBundledOfficialExpert, loadExpertSidecar, } from "./sidecar.js";
function registered(profile, definition, source, components = []) {
    return {
        definition,
        profile,
        enabled: profile.enabled,
        source,
        components,
        ...(source !== "legacy_adapter" ? { sidecarPath: expertSidecarPath(profile) } : {}),
    };
}
/**
 * Read-only product registry for P0. Existing execution continues to resolve AgentProfile through
 * ProfileLoader/AgenticService; this registry must not mutate profiles, files, bindings or tools.
 */
export class ExpertRegistry {
    loader;
    options;
    generation = 0;
    byDefinitionId = new Map();
    byProfileId = new Map();
    issues = [];
    loadedAt = 0;
    constructor(loader, options = {}) {
        this.loader = loader;
        this.options = options;
    }
    refresh() {
        const nextByDefinitionId = new Map();
        const nextByProfileId = new Map();
        const nextIssues = [];
        const componentSnapshot = this.options.bundledComponentRegistry?.refresh();
        for (const issue of componentSnapshot?.issues ?? []) {
            nextIssues.push({
                profileId: `@component:${issue.directory}`,
                code: "invalid_trusted_package",
                message: issue.message,
            });
        }
        const officialProfiles = [...(this.options.bundledOfficialLoader?.load() ?? [])]
            .sort((left, right) => left.name.localeCompare(right.name));
        for (const profile of officialProfiles) {
            try {
                const definition = loadBundledOfficialExpert(profile);
                if (!definition)
                    throw new Error("Bundled expert package is missing expert.json.");
                if (nextByDefinitionId.has(definition.definitionId)) {
                    nextIssues.push({
                        profileId: profile.name,
                        code: "duplicate_definition_id",
                        message: `Duplicate bundled expert definitionId: ${definition.definitionId}.`,
                        sidecarPath: expertSidecarPath(profile),
                    });
                    continue;
                }
                if (nextByProfileId.has(profile.name)) {
                    nextIssues.push({
                        profileId: profile.name,
                        code: "duplicate_profile_id",
                        message: `Duplicate bundled expert profileId: ${profile.name}.`,
                        sidecarPath: expertSidecarPath(profile),
                    });
                    continue;
                }
                const components = resolveExpertComponents(definition.components ?? [], this.options.bundledComponentRegistry);
                const entry = registered(profile, definition, "bundled_official", components);
                nextByDefinitionId.set(definition.definitionId, entry);
                nextByProfileId.set(profile.name, entry);
            }
            catch (error) {
                const sidecarError = error instanceof ExpertSidecarError ? error : undefined;
                nextIssues.push({
                    profileId: profile.name,
                    code: sidecarError?.code === "invalid_json" ? "invalid_json" : "invalid_trusted_package",
                    message: error instanceof Error ? error.message : String(error),
                    sidecarPath: expertSidecarPath(profile),
                });
            }
        }
        const profiles = [...this.loader.load()].sort((left, right) => left.name.localeCompare(right.name));
        for (const profile of profiles) {
            let definition = adaptLegacyProfileToExpert(profile);
            let source = "legacy_adapter";
            try {
                const sidecar = loadExpertSidecar(profile);
                if (sidecar) {
                    definition = sidecar;
                    source = "sidecar";
                }
            }
            catch (error) {
                const sidecarError = error instanceof ExpertSidecarError ? error : undefined;
                nextIssues.push({
                    profileId: profile.name,
                    code: sidecarError?.code ?? "invalid_sidecar",
                    message: error instanceof Error ? error.message : String(error),
                    sidecarPath: expertSidecarPath(profile),
                });
            }
            if (nextByDefinitionId.has(definition.definitionId)) {
                nextIssues.push({
                    profileId: profile.name,
                    code: "duplicate_definition_id",
                    message: `Duplicate expert definitionId: ${definition.definitionId}. Falling back to the legacy adapter.`,
                    ...(source === "sidecar" ? { sidecarPath: expertSidecarPath(profile) } : {}),
                });
                definition = adaptLegacyProfileToExpert(profile);
                source = "legacy_adapter";
            }
            const entry = registered(profile, definition, source);
            nextByDefinitionId.set(definition.definitionId, entry);
            if (nextByProfileId.has(profile.name)) {
                nextIssues.push({
                    profileId: profile.name,
                    code: "duplicate_profile_id",
                    message: `Workspace profileId ${profile.name} collides with a bundled official profile; the official catalog binding is retained.`,
                    ...(source === "sidecar" ? { sidecarPath: expertSidecarPath(profile) } : {}),
                });
            }
            else {
                nextByProfileId.set(profile.name, entry);
            }
        }
        // Commit only after a complete successful scan. If ProfileLoader itself throws, callers
        // retain the previous generation and the live Agentic execution registry is unaffected.
        this.byDefinitionId = nextByDefinitionId;
        this.byProfileId = nextByProfileId;
        this.issues = nextIssues;
        this.loadedAt = Date.now();
        this.generation += 1;
        return this.snapshot();
    }
    getByDefinitionId(definitionId) {
        return this.byDefinitionId.get(definitionId);
    }
    getByProfileId(profileId) {
        return this.byProfileId.get(profileId);
    }
    list(options = {}) {
        return [...this.byDefinitionId.values()]
            .filter((entry) => options.includeDisabled || entry.enabled)
            .sort((left, right) => left.definition.display.name.localeCompare(right.definition.display.name));
    }
    snapshot() {
        const experts = this.list({ includeDisabled: true });
        const legacy = experts.filter((entry) => entry.source === "legacy_adapter").length;
        const sidecar = experts.filter((entry) => entry.source === "sidecar").length;
        const bundledOfficial = experts.filter((entry) => entry.source === "bundled_official").length;
        return {
            generation: this.generation,
            loadedAt: this.loadedAt,
            experts,
            issues: [...this.issues],
            summary: {
                total: experts.length,
                enabled: experts.filter((entry) => entry.enabled).length,
                disabled: experts.filter((entry) => !entry.enabled).length,
                legacy,
                sidecar,
                bundledOfficial,
                issues: this.issues.length,
            },
        };
    }
}
