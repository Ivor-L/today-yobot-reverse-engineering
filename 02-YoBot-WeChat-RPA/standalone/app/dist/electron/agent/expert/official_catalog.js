/**
 * P1 growth catalog. The registry intentionally retains every bundled package so saved references
 * and internal evaluation remain valid; this allowlist controls only what the MVP shelf exposes.
 */
export const OFFICIAL_EXPERT_MVP_CATALOG_ORDER = [
    "official.content-creator",
    "official.xiaohongshu-operations",
    "official.wechat-content",
    "official.china-ecommerce-operations",
    "official.cross-border-ecommerce",
    "official.sales-coach",
];
const OFFICIAL_EXPERT_MVP_CATALOG_IDS = new Set(OFFICIAL_EXPERT_MVP_CATALOG_ORDER);
const OFFICIAL_EXPERT_MVP_CATALOG_RANK = new Map(OFFICIAL_EXPERT_MVP_CATALOG_ORDER.map((definitionId, index) => [definitionId, index]));
function isCatalogExpert(entry) {
    return entry.source === "bundled_official"
        && entry.enabled
        && entry.definition.origin === "official"
        && entry.definition.publisher.verified
        && OFFICIAL_EXPERT_MVP_CATALOG_IDS.has(entry.definition.definitionId)
        && entry.definition.channels.includes("worker")
        && entry.definition.capabilityRequest.mode === "semantic"
        && entry.definition.jobs.length > 0;
}
/**
 * Read-only product catalog for explicit main-chat Expert selection.
 *
 * It is deliberately independent from Direct Expert: product discovery must remain available
 * when the internal Direct test runtime is disabled, and no prompt/provider/path data crosses
 * this public boundary.
 */
export class OfficialExpertCatalogService {
    registry;
    options;
    constructor(registry, options) {
        this.registry = registry;
        this.options = options;
    }
    catalog() {
        if (!this.options.available) {
            return { schemaVersion: 1, available: false, experts: [] };
        }
        const experts = this.registry.list()
            .filter(isCatalogExpert)
            .sort((left, right) => ((OFFICIAL_EXPERT_MVP_CATALOG_RANK.get(left.definition.definitionId) ?? Number.MAX_SAFE_INTEGER)
            - (OFFICIAL_EXPERT_MVP_CATALOG_RANK.get(right.definition.definitionId) ?? Number.MAX_SAFE_INTEGER)))
            .map((entry) => {
            const job = entry.definition.jobs[0];
            return {
                ref: {
                    definitionId: entry.definition.definitionId,
                    definitionVersion: entry.definition.definitionVersion,
                    jobId: job.id,
                },
                display: structuredClone(entry.definition.display),
                publisher: {
                    id: entry.definition.publisher.id,
                    name: entry.definition.publisher.name,
                    verified: true,
                },
            };
        });
        return { schemaVersion: 1, available: true, experts };
    }
}
