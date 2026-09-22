import * as fs from "node:fs";
import * as path from "node:path";
import { EXPERT_CAPABILITY_IDS, EXPERT_CHANNELS, EXPERT_DEFINITION_SCHEMA_VERSION, } from "./types.js";
export const EXPERT_SIDECAR_FILE = "expert.json";
export class ExpertSidecarError extends Error {
    code;
    constructor(message, code = "invalid_sidecar") {
        super(message);
        this.code = code;
        this.name = "ExpertSidecarError";
    }
}
function record(value, label) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new ExpertSidecarError(`${label} must be an object.`);
    }
    return value;
}
function text(value, label) {
    if (typeof value !== "string" || !value.trim()) {
        throw new ExpertSidecarError(`${label} must be a non-empty string.`);
    }
    return value.trim();
}
function optionalText(value, label) {
    if (value === undefined)
        return undefined;
    return text(value, label);
}
function strings(value, label) {
    if (!Array.isArray(value))
        throw new ExpertSidecarError(`${label} must be an array.`);
    const result = value.map((item, index) => text(item, `${label}[${index}]`));
    if (new Set(result).size !== result.length) {
        throw new ExpertSidecarError(`${label} must not contain duplicates.`);
    }
    return result;
}
function nonNegativeInteger(value, label) {
    if (value === undefined)
        return undefined;
    if (!Number.isInteger(value) || Number(value) < 0) {
        throw new ExpertSidecarError(`${label} must be a non-negative integer.`);
    }
    return Number(value);
}
function requiredNonNegativeInteger(value, label) {
    const parsed = nonNegativeInteger(value, label);
    if (parsed === undefined)
        throw new ExpertSidecarError(`${label} is required.`);
    return parsed;
}
function parseJobs(value) {
    if (!Array.isArray(value))
        throw new ExpertSidecarError("jobs must be an array.");
    const jobs = value.map((item, index) => {
        const job = record(item, `jobs[${index}]`);
        return {
            id: text(job.id, `jobs[${index}].id`),
            title: text(job.title, `jobs[${index}].title`),
            description: text(job.description, `jobs[${index}].description`),
            ...(job.requiredInputs === undefined
                ? {}
                : { requiredInputs: strings(job.requiredInputs, `jobs[${index}].requiredInputs`) }),
            ...(job.deliverables === undefined
                ? {}
                : { deliverables: strings(job.deliverables, `jobs[${index}].deliverables`) }),
        };
    });
    if (new Set(jobs.map((job) => job.id)).size !== jobs.length) {
        throw new ExpertSidecarError("jobs[].id must be unique.");
    }
    return jobs;
}
function parseCapabilities(value) {
    const input = record(value, "capabilityRequest");
    if (input.mode !== "semantic") {
        throw new ExpertSidecarError("capabilityRequest.mode must be semantic for expert.json.");
    }
    const known = new Set(EXPERT_CAPABILITY_IDS);
    const parse = (key) => {
        const result = strings(input[key] ?? [], `capabilityRequest.${key}`);
        const unknown = result.filter((item) => !known.has(item));
        if (unknown.length) {
            throw new ExpertSidecarError(`Unknown capability in ${key}: ${unknown.join(", ")}.`);
        }
        return result;
    };
    const required = parse("required");
    const optional = parse("optional");
    const forbidden = parse("forbidden");
    const memberships = new Map();
    for (const [group, values] of Object.entries({ required, optional, forbidden })) {
        for (const capability of values) {
            const previous = memberships.get(capability);
            if (previous) {
                throw new ExpertSidecarError(`Capability ${capability} appears in both ${previous} and ${group}.`);
            }
            memberships.set(capability, group);
        }
    }
    return { mode: "semantic", required, optional, forbidden };
}
function parseChannels(value) {
    const result = strings(value, "channels");
    const known = new Set(EXPERT_CHANNELS);
    const unknown = result.filter((item) => !known.has(item));
    if (unknown.length)
        throw new ExpertSidecarError(`Unknown channel: ${unknown.join(", ")}.`);
    if (!result.length)
        throw new ExpertSidecarError("channels must not be empty.");
    return result;
}
function parseProviderBindings(value) {
    const input = record(value, "providerBindings");
    const required = strings(input.required ?? [], "providerBindings.required");
    const optional = strings(input.optional ?? [], "providerBindings.optional");
    const memberships = new Set(required);
    const overlap = optional.filter((providerId) => memberships.has(providerId));
    if (overlap.length) {
        throw new ExpertSidecarError(`Provider appears in both required and optional: ${overlap.join(", ")}.`);
    }
    if (required.length + optional.length === 0) {
        throw new ExpertSidecarError("providerBindings must declare at least one required or optional provider.");
    }
    return { required, optional };
}
function parseComponents(value) {
    if (value === undefined)
        return [];
    if (!Array.isArray(value))
        throw new ExpertSidecarError("components must be an array.");
    const components = value.map((item, index) => {
        const input = record(item, `components[${index}]`);
        if (input.required !== true && input.required !== false) {
            throw new ExpertSidecarError(`components[${index}].required must be a boolean.`);
        }
        if (input.activation !== "eager") {
            throw new ExpertSidecarError(`components[${index}].activation must be eager in component schema v1.`);
        }
        return {
            componentId: text(input.componentId, `components[${index}].componentId`),
            componentVersion: text(input.componentVersion, `components[${index}].componentVersion`),
            required: input.required,
            activation: "eager",
        };
    });
    const coordinates = components.map((item) => `${item.componentId}@${item.componentVersion}`);
    if (new Set(coordinates).size !== coordinates.length) {
        throw new ExpertSidecarError("components must not contain duplicate coordinates.");
    }
    return components;
}
function parseOrigin(value) {
    if (value === "official" || value === "local" || value === "partner")
        return value;
    throw new ExpertSidecarError("origin must be official, local, or partner.");
}
export function expertSidecarPath(profile) {
    return path.join(path.dirname(profile.filePath), EXPERT_SIDECAR_FILE);
}
function loadExpertDefinition(profile, provenance) {
    const file = expertSidecarPath(profile);
    if (!fs.existsSync(file))
        return undefined;
    let parsed;
    try {
        parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    }
    catch (error) {
        throw new ExpertSidecarError(`Cannot parse ${EXPERT_SIDECAR_FILE}: ${error instanceof Error ? error.message : String(error)}`, "invalid_json");
    }
    const root = record(parsed, "expert.json");
    if (root.schemaVersion !== EXPERT_DEFINITION_SCHEMA_VERSION) {
        throw new ExpertSidecarError(`Unsupported expert schemaVersion: ${String(root.schemaVersion)}.`);
    }
    const definitionId = text(root.definitionId, "definitionId");
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(definitionId) || definitionId.startsWith("legacy.")) {
        throw new ExpertSidecarError("definitionId is invalid or uses the reserved legacy namespace.");
    }
    const origin = parseOrigin(root.origin);
    // A workspace sidecar is user-controlled data, not publication provenance. Only a loader
    // rooted in the packaged application resources may admit the official namespace.
    if (provenance === "workspace" && (origin !== "local" || !definitionId.startsWith("local."))) {
        throw new ExpertSidecarError("Workspace expert.json must use origin=local and a local.* definitionId; official/partner claims require trusted installation provenance.");
    }
    if (provenance === "bundled_official" && (origin !== "official" || !definitionId.startsWith("official."))) {
        throw new ExpertSidecarError("Bundled expert.json must use origin=official and an official.* definitionId.");
    }
    const profileId = text(root.profileId, "profileId");
    if (profileId !== profile.name) {
        throw new ExpertSidecarError(`expert.json profileId ${profileId} does not match AGENT.md profileId ${profile.name}.`, "profile_id_mismatch");
    }
    const definitionVersion = text(root.definitionVersion, "definitionVersion");
    if (definitionVersion !== profile.version) {
        throw new ExpertSidecarError(`expert.json definitionVersion ${definitionVersion} does not match AGENT.md version ${profile.version}.`);
    }
    const publisher = record(root.publisher, "publisher");
    if (typeof publisher.verified !== "boolean") {
        throw new ExpertSidecarError("publisher.verified must be a boolean.");
    }
    if (provenance === "workspace" && publisher.verified) {
        throw new ExpertSidecarError("Workspace expert.json cannot self-assert publisher verification.");
    }
    if (provenance === "bundled_official" && !publisher.verified) {
        throw new ExpertSidecarError("Bundled official expert publisher must be verified by the package trust root.");
    }
    const display = record(root.display, "display");
    const icon = optionalText(display.icon, "display.icon");
    const defaults = root.defaults === undefined ? undefined : record(root.defaults, "defaults");
    const maxTurns = defaults ? nonNegativeInteger(defaults.maxTurns, "defaults.maxTurns") : undefined;
    const maxToolCalls = defaults ? nonNegativeInteger(defaults.maxToolCalls, "defaults.maxToolCalls") : undefined;
    const estimated = defaults?.estimatedPoints === undefined
        ? undefined
        : record(defaults.estimatedPoints, "defaults.estimatedPoints");
    const estimatedPoints = estimated === undefined ? undefined : {
        min: requiredNonNegativeInteger(estimated.min, "defaults.estimatedPoints.min"),
        max: requiredNonNegativeInteger(estimated.max, "defaults.estimatedPoints.max"),
    };
    if (estimatedPoints && estimatedPoints.min > estimatedPoints.max) {
        throw new ExpertSidecarError("defaults.estimatedPoints.min must not exceed max.");
    }
    const jobs = parseJobs(root.jobs ?? []);
    if (provenance === "bundled_official" && jobs.length === 0) {
        throw new ExpertSidecarError("Bundled official expert must declare at least one job.");
    }
    const components = parseComponents(root.components);
    if (provenance === "workspace" && components.length > 0) {
        throw new ExpertSidecarError("Workspace Expert components are not supported by the trusted declarative component MVP.");
    }
    return {
        schemaVersion: EXPERT_DEFINITION_SCHEMA_VERSION,
        definitionId,
        profileId,
        definitionVersion,
        origin,
        publisher: {
            id: text(publisher.id, "publisher.id"),
            name: text(publisher.name, "publisher.name"),
            verified: publisher.verified,
        },
        display: {
            name: text(display.name, "display.name"),
            summary: text(display.summary, "display.summary"),
            category: text(display.category, "display.category"),
            ...(icon ? { icon } : {}),
            samplePrompts: strings(display.samplePrompts ?? [], "display.samplePrompts"),
        },
        jobs,
        ...(components.length ? { components } : {}),
        providerBindings: parseProviderBindings(root.providerBindings),
        capabilityRequest: parseCapabilities(root.capabilityRequest),
        channels: parseChannels(root.channels),
        ...(defaults ? {
            defaults: {
                ...(maxTurns === undefined ? {} : { maxTurns }),
                ...(maxToolCalls === undefined ? {} : { maxToolCalls }),
                ...(estimatedPoints ? { estimatedPoints } : {}),
            },
        } : {}),
    };
}
export function loadExpertSidecar(profile) {
    return loadExpertDefinition(profile, "workspace");
}
/**
 * Parse a definition only after its profile has been loaded from the application-controlled
 * bundled expert directory. The JSON bytes do not create trust; the caller-owned root does.
 */
export function loadBundledOfficialExpert(profile) {
    return loadExpertDefinition(profile, "bundled_official");
}
