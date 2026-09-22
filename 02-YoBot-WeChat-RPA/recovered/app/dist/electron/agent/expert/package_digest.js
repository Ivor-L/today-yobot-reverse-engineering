import * as crypto from "node:crypto";
import { expertCompositionLock } from "./composition.js";
/**
 * Stable identity for the executable parts of an installed Expert package.
 * Installation paths are excluded; executable prompt/profile drift invalidates receipts.
 */
export function expertPackageDigest(entry) {
    const value = JSON.stringify({
        definition: entry.definition,
        profile: {
            name: entry.profile.name,
            version: entry.profile.version,
            systemPrompt: entry.profile.systemPrompt ?? "",
            model: entry.profile.model ?? null,
            knowledge: entry.profile.knowledge ?? [],
            memoryNamespace: entry.profile.memoryNamespace,
            runtime: entry.profile.runtime,
        },
        composition: expertCompositionLock(entry),
    });
    return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
}
