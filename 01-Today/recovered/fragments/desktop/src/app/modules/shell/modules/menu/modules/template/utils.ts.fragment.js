// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/utils.ts.
// The original TypeScript and import graph are not restored.

const assertIdentifier = (kind, id)=>{
    if (!id.trim() || id.trim() !== id) {
        throw new Error(`The ${kind} ID must be a non-empty trimmed string.`);
    }
};
const assertPriority = (kind, priority)=>{
    if (!Number.isSafeInteger(priority) || priority <= 0) {
        throw new Error(`The ${kind} priority must be a positive safe integer.`);
    }
};
const validateShellMenuContributions = (groups, items)=>{
    const groupIds = new Set();
    const groupPriorities = new Set();
    for (const group of groups){
        assertIdentifier('menu group', group.id);
        assertPriority(`menu group "${group.id}"`, group.priority);
        if (groupIds.has(group.id)) {
            throw new Error(`Menu group ID "${group.id}" is registered more than once.`);
        }
        if (groupPriorities.has(group.priority)) {
            throw new Error(`Menu group priority ${group.priority} is registered more than once.`);
        }
        groupIds.add(group.id);
        groupPriorities.add(group.priority);
    }
    const itemIds = new Set();
    const itemPlacements = new Set();
    for (const item of items){
        assertIdentifier('menu item', item.id);
        assertIdentifier(`menu item "${item.id}" group`, item.groupId);
        assertPriority(`menu item "${item.id}" section`, item.sectionPriority);
        assertPriority(`menu item "${item.id}"`, item.priority);
        if (itemIds.has(item.id)) {
            throw new Error(`Menu item ID "${item.id}" is registered more than once.`);
        }
        if (!groupIds.has(item.groupId)) {
            throw new Error(`Menu item "${item.id}" references unknown group "${item.groupId}".`);
        }
        const placement = `${item.groupId}:${item.sectionPriority}:${item.priority}`;
        if (itemPlacements.has(placement)) {
            throw new Error(`Menu item priority ${item.priority} is registered more than once in group "${item.groupId}" section ${item.sectionPriority}.`);
        }
        itemIds.add(item.id);
        itemPlacements.add(placement);
    }
};
const compareShellMenuGroups = (left, right)=>{
    return left.priority - right.priority;
};
const compareRenderedShellMenuItems = (left, right)=>{
    const sectionOrder = left.item.sectionPriority - right.item.sectionPriority;
    if (sectionOrder !== 0) {
        return sectionOrder;
    }
    return left.item.priority - right.item.priority;
};
const assertShellMenuAction = (id, action)=>{
    if ('click' in action && typeof action.click === 'function' || 'role' in action && action.role) {
        return;
    }
    throw new Error(`Menu item "${id}" must define a click handler or Electron role.`);
};
const addSectionSeparators = (renderedItems)=>{
    const result = [];
    let previousSection;
    for (const rendered of renderedItems){
        const { sectionPriority } = rendered.item;
        if (previousSection !== undefined && sectionPriority !== previousSection) {
            result.push({
                type: 'separator'
            });
        }
        result.push(rendered.options);
        previousSection = sectionPriority;
    }
    return result;
};
