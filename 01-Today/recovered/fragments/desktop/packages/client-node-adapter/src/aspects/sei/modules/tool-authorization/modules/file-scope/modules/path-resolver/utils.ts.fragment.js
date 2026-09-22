// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/tool-authorization/modules/file-scope/modules/path-resolver/utils.ts.
// The original TypeScript and import graph are not restored.


const isWithinPath = (root, target)=>{
    const remainder = (0,external_node_path_namespaceObject.relative)(root, target);
    return remainder === '' || !remainder.startsWith(`..${external_node_path_namespaceObject.sep}`) && remainder !== '..' && !(0,external_node_path_namespaceObject.isAbsolute)(remainder);
};
/** Earlier roots win equal-path ties; deeper roots always win over their parent. */ const classifyNamedFileRoot = (path, boundaries)=>{
    let match = null;
    for (const boundary of boundaries){
        if (isWithinPath(boundary.path, path) && (!match || boundary.path.length > match.path.length)) {
            match = boundary;
        }
    }
    return match?.root ?? null;
};
