import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
export const EXPERT_COMPONENT_SCHEMA_VERSION = 1;
export const EXPERT_COMPONENT_MANIFEST_FILE = "component.json";
export const EXPERT_COMPONENT_MAX_INSTRUCTION_BYTES = 64 * 1024;
const COMPONENT_ID_PATTERN = /^official\.[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;
const COMPONENT_VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/;
const COMPONENT_KINDS = new Set(["method", "template", "validator"]);
export class ExpertComponentRegistryError extends Error {
    constructor(message) {
        super(message);
        this.name = "ExpertComponentRegistryError";
    }
}
function record(value, label) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new ExpertComponentRegistryError(`${label} must be an object.`);
    }
    return value;
}
function text(value, label) {
    if (typeof value !== "string" || !value.trim()) {
        throw new ExpertComponentRegistryError(`${label} must be a non-empty string.`);
    }
    return value.trim();
}
function stableValue(value) {
    if (Array.isArray(value))
        return value.map(stableValue);
    if (!value || typeof value !== "object")
        return value;
    return Object.fromEntries(Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]));
}
function componentDigest(manifest, instructions) {
    const value = JSON.stringify({ manifest: stableValue(manifest), instructions });
    return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
}
function inside(directory, candidate) {
    const relative = path.relative(path.resolve(directory), path.resolve(candidate));
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
function parseManifest(value) {
    const root = record(value, "component.json");
    if (root.schemaVersion !== EXPERT_COMPONENT_SCHEMA_VERSION) {
        throw new ExpertComponentRegistryError(`Unsupported component schemaVersion: ${String(root.schemaVersion)}.`);
    }
    const componentId = text(root.componentId, "componentId");
    if (!COMPONENT_ID_PATTERN.test(componentId)) {
        throw new ExpertComponentRegistryError("Bundled componentId must use the official.* namespace.");
    }
    const componentVersion = text(root.componentVersion, "componentVersion");
    if (!COMPONENT_VERSION_PATTERN.test(componentVersion)) {
        throw new ExpertComponentRegistryError("componentVersion is invalid.");
    }
    const kind = text(root.kind, "kind");
    if (!COMPONENT_KINDS.has(kind))
        throw new ExpertComponentRegistryError(`Unknown component kind: ${kind}.`);
    const publisher = record(root.publisher, "publisher");
    if (publisher.verified !== true) {
        throw new ExpertComponentRegistryError("Bundled component publisher must be verified.");
    }
    const display = record(root.display, "display");
    const entry = text(root.entry, "entry");
    if (path.isAbsolute(entry) || entry.split(/[\\/]/).includes("..")) {
        throw new ExpertComponentRegistryError("component entry must remain inside its package directory.");
    }
    return {
        schemaVersion: EXPERT_COMPONENT_SCHEMA_VERSION,
        componentId,
        componentVersion,
        kind,
        publisher: {
            id: text(publisher.id, "publisher.id"),
            name: text(publisher.name, "publisher.name"),
            verified: true,
        },
        display: {
            name: text(display.name, "display.name"),
            description: text(display.description, "display.description"),
        },
        entry,
    };
}
function key(componentId, componentVersion) {
    return `${componentId}@${componentVersion}`;
}
/** Read-only loader for application-controlled, declarative Expert components. */
export class ExpertComponentRegistry {
    root;
    generation = 0;
    loadedAt = 0;
    byCoordinate = new Map();
    issues = [];
    constructor(root) {
        this.root = root;
    }
    refresh() {
        const next = new Map();
        const issues = [];
        if (fs.existsSync(this.root)) {
            const entries = fs.readdirSync(this.root, { withFileTypes: true })
                .filter((entry) => entry.isDirectory())
                .sort((left, right) => left.name.localeCompare(right.name));
            for (const entry of entries) {
                const directory = path.join(this.root, entry.name);
                const manifestPath = path.join(directory, EXPERT_COMPONENT_MANIFEST_FILE);
                try {
                    if (!fs.existsSync(manifestPath)) {
                        throw new ExpertComponentRegistryError(`Missing ${EXPERT_COMPONENT_MANIFEST_FILE}.`);
                    }
                    const manifest = parseManifest(JSON.parse(fs.readFileSync(manifestPath, "utf8")));
                    const entryPath = path.resolve(directory, manifest.entry);
                    if (!inside(directory, entryPath) || !fs.existsSync(entryPath) || !fs.statSync(entryPath).isFile()) {
                        throw new ExpertComponentRegistryError("Component entry is missing or escapes its package directory.");
                    }
                    const realDirectory = fs.realpathSync(directory);
                    const realEntryPath = fs.realpathSync(entryPath);
                    if (!inside(realDirectory, realEntryPath)) {
                        throw new ExpertComponentRegistryError("Component entry symlink escapes its package directory.");
                    }
                    const bytes = fs.statSync(entryPath).size;
                    if (bytes <= 0 || bytes > EXPERT_COMPONENT_MAX_INSTRUCTION_BYTES) {
                        throw new ExpertComponentRegistryError(`Component instructions must be 1-${EXPERT_COMPONENT_MAX_INSTRUCTION_BYTES} bytes.`);
                    }
                    const instructions = fs.readFileSync(entryPath, "utf8").replace(/^\uFEFF/, "").trim();
                    if (!instructions)
                        throw new ExpertComponentRegistryError("Component instructions are empty.");
                    const coordinate = key(manifest.componentId, manifest.componentVersion);
                    if (next.has(coordinate)) {
                        issues.push({
                            directory,
                            code: "duplicate_component",
                            message: `Duplicate bundled component coordinate: ${coordinate}.`,
                        });
                        continue;
                    }
                    const ref = {
                        componentId: manifest.componentId,
                        componentVersion: manifest.componentVersion,
                        required: true,
                        activation: "eager",
                    };
                    next.set(coordinate, {
                        ref,
                        manifest,
                        instructions,
                        digest: componentDigest(manifest, instructions),
                        source: "bundled_official",
                        manifestPath,
                        entryPath: realEntryPath,
                    });
                }
                catch (error) {
                    issues.push({
                        directory,
                        code: "invalid_manifest",
                        message: error instanceof Error ? error.message : String(error),
                    });
                }
            }
        }
        this.byCoordinate = next;
        this.issues = issues;
        this.loadedAt = Date.now();
        this.generation += 1;
        return this.snapshot();
    }
    get(componentId, componentVersion) {
        return this.byCoordinate.get(key(componentId, componentVersion));
    }
    snapshot() {
        return {
            generation: this.generation,
            loadedAt: this.loadedAt,
            components: [...this.byCoordinate.values()],
            issues: [...this.issues],
        };
    }
}
export function resolveExpertComponents(refs, registry) {
    const resolved = [];
    for (const ref of refs) {
        const component = registry?.get(ref.componentId, ref.componentVersion);
        if (!component) {
            if (ref.required) {
                throw new ExpertComponentRegistryError(`Required Expert component is unavailable: ${ref.componentId}@${ref.componentVersion}.`);
            }
            continue;
        }
        resolved.push({ ...component, ref: { ...ref } });
    }
    return resolved;
}
