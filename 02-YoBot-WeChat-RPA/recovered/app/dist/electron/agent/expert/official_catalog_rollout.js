/**
 * Product-discovery kill switch, deliberately separate from Worker execution mode. Turning the
 * shelf off never deletes packages or changes legacy Agent/RPA/Cron behavior.
 */
export function resolveOfficialExpertCatalogMode(env = process.env) {
    return env.YOKO_OFFICIAL_EXPERT_CATALOG_MODE?.trim().toLowerCase() === "off" ? "off" : "on";
}
