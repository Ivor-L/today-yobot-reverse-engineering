// Compiled fragment from ./src/app/modules/data-reset/modules/startup/modules/files/utils.ts.
// The original TypeScript and import graph are not restored.


const containsPath = (parent, child)=>{
    const path = (0,external_node_path_namespaceObject.relative)(parent, child);
    return path === '' || !(0,external_node_path_namespaceObject.isAbsolute)(path) && path !== '..' && !path.startsWith(`..${external_node_path_namespaceObject.sep}`);
};
