export function selectActiveSessionBranch(entries) {
    const indexed = entries.filter(entry => typeof entry.id === "string" && entry.id.length > 0);
    if (indexed.length === 0)
        return entries;
    if (!indexed.some(entry => typeof entry.parentId === "string" && entry.parentId.length > 0)) {
        return entries;
    }
    const byId = new Map(indexed.map(entry => [entry.id, entry]));
    const activeIds = new Set();
    let cursor = indexed[indexed.length - 1];
    while (cursor?.id && !activeIds.has(cursor.id)) {
        activeIds.add(cursor.id);
        cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
    }
    return entries.filter(entry => !entry.id || activeIds.has(entry.id));
}
