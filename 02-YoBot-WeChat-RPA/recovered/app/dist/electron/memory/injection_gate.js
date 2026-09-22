/**
 * Confidence floor for injecting a memory into the prompt.
 *
 * Chunks below this line are "candidates": stored, searchable via the explicit
 * knowledge_search tool, visible in the Memory UI — but NOT injected into the
 * conversation. In the append-only cache architecture an injected fact is
 * permanent for the session, so the injection gate is the only place where a
 * wrong or unverified memory can still be stopped (see
 * docs/MEMORY_INJECTION_V2_DESIGN.md §2).
 *
 * Aligned with the session ledger's INJECT_CONFIDENCE_THRESHOLD.
 */
export const INJECT_MIN_CONFIDENCE = 0.5;
/**
 * Initial confidence for auto-extracted candidate memories (below the gate).
 * Applied at index time inside MemoryStore.add for observation-file chunks so
 * there is NO window where a fresh candidate carries the injectable default
 * (0.6) before being downgraded.
 */
export const CANDIDATE_CONFIDENCE = 0.35;
/** Path marker for auto-extracted candidate memory files. */
export function isCandidateMemoryPath(path) {
    return !!path && path.replace(/\\/g, "/").endsWith("/observations.md");
}
/**
 * Drop chunks that are not eligible for prompt injection.
 *
 * Eligible: user-confirmed, no metadata at all (legacy chunks), or
 * confidence >= INJECT_MIN_CONFIDENCE. This also gates chunks whose
 * confidence was pushed down by correction signals.
 */
export function filterInjectableMemoryChunks(chunks) {
    const injectable = [];
    const gated = [];
    for (const chunk of chunks) {
        const meta = chunk.meta;
        if (!meta || meta.confirmedByUser || meta.confidence >= INJECT_MIN_CONFIDENCE) {
            injectable.push(chunk);
        }
        else {
            gated.push(chunk);
        }
    }
    return { injectable, gated };
}
