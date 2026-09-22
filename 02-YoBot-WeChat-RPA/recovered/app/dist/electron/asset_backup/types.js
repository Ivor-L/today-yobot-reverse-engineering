export const SUBAGENT_PROFILE_ASSET_KIND = "subagent_profile";
export function assetStateKey(assetKind, assetKey) {
    return `${assetKind}:${assetKey}`;
}
