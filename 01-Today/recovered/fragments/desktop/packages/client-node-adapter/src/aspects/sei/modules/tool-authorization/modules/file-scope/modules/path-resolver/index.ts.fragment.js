// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/tool-authorization/modules/file-scope/modules/path-resolver/index.ts.
// The original TypeScript and import graph are not restored.








class FileAuthorizationPathResolver {
    rootPath(root) {
        if (root === base_ToolFileRoot.OtherFiles) {
            return this.homePath();
        }
        return external_electron_.app.getPath(root);
    }
    homePath() {
        return external_electron_.app.getPath('home');
    }
    async rootPaths(root, platform) {
        const configured = [
            this.rootPath(root)
        ];
        if (root === base_ToolFileRoot.OtherFiles && platform === cpi_SystemPlatform.MacOS) {
            configured.push('/Applications');
        }
        const paths = [];
        for (const path of configured){
            paths.push(path);
            try {
                paths.push(await (0,promises_namespaceObject.realpath)(path));
            } catch  {}
        }
        return [
            ...new Set(paths)
        ];
    }
    async otherFileExclusions() {
        return (await this.namedRootBoundaries()).map((boundary)=>boundary.path);
    }
    async namedRootBoundaries() {
        const paths = [];
        for (const root of [
            base_ToolFileRoot.Documents,
            base_ToolFileRoot.Downloads,
            base_ToolFileRoot.Desktop
        ]){
            paths.push(...(await this.rootPaths(root)).map((path)=>({
                    root,
                    path
                })));
        }
        return paths;
    }
    async excludedRootPaths(root) {
        const boundaries = await this.namedRootBoundaries();
        if (root === base_ToolFileRoot.OtherFiles) {
            return boundaries.map((boundary)=>boundary.path);
        }
        const selectedPaths = await this.rootPaths(root);
        return boundaries.filter((boundary)=>boundary.root !== root && classifyNamedFileRoot(boundary.path, boundaries) === boundary.root && selectedPaths.some((path)=>isWithinPath(path, boundary.path))).map((boundary)=>boundary.path);
    }
    async isWithin(path, root, relativeRoot, platform, allowRootListing = false) {
        if (path.includes('\0') || path.split(/[\\/]/u).includes('..')) {
            return false;
        }
        let expanded = path;
        if (path.startsWith('~/')) {
            expanded = (0,external_node_path_namespaceObject.join)(this.homePath(), path.slice(2));
        } else if (!(0,external_node_path_namespaceObject.isAbsolute)(path) && relativeRoot) {
            expanded = (0,external_node_path_namespaceObject.resolve)(this.rootPath(relativeRoot), path);
        }
        if (!(0,external_node_path_namespaceObject.isAbsolute)(expanded)) {
            return false;
        }
        try {
            const target = (0,external_node_path_namespaceObject.resolve)(expanded);
            const targetPath = await this.resolveExistingAncestor(target);
            const boundaries = await this.namedRootBoundaries();
            if (root !== base_ToolFileRoot.OtherFiles) {
                if (classifyNamedFileRoot(target, boundaries) !== root || classifyNamedFileRoot(targetPath, boundaries) !== root) {
                    return false;
                }
                if (!allowRootListing && boundaries.some((boundary)=>boundary.root !== root && classifyNamedFileRoot(boundary.path, boundaries) === boundary.root && (isWithinPath(target, boundary.path) || isWithinPath(targetPath, boundary.path)))) {
                    return false;
                }
            }
            if (root === base_ToolFileRoot.OtherFiles) {
                for (const { path: excluded } of boundaries){
                    if (isWithinPath(excluded, target) || isWithinPath(excluded, targetPath) || !allowRootListing && (isWithinPath(target, excluded) || isWithinPath(targetPath, excluded))) {
                        return false;
                    }
                }
            }
            for (const configuredRoot of (await this.rootPaths(root, platform))){
                const rootPath = await (0,promises_namespaceObject.realpath)(configuredRoot);
                // Both the path acted on and its target must remain in the same permitted root.
                if ((isWithinPath(configuredRoot, target) || isWithinPath(rootPath, target)) && isWithinPath(rootPath, targetPath)) {
                    return true;
                }
            }
            return false;
        } catch  {
            return false;
        }
    }
    async resolveExistingAncestor(path) {
        try {
            return await (0,promises_namespaceObject.realpath)(path);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
            // A dangling link must not be mistaken for a safe, newly created descendant.
            try {
                const metadata = await (0,promises_namespaceObject.lstat)(path);
                if (metadata.isSymbolicLink()) {
                    throw error;
                }
            } catch (inspectionError) {
                if (inspectionError === error || inspectionError.code !== 'ENOENT') {
                    throw inspectionError;
                }
            }
            const parent = (0,external_node_path_namespaceObject.dirname)(path);
            if (parent === path) {
                throw error;
            }
            return (0,external_node_path_namespaceObject.join)(await this.resolveExistingAncestor(parent), (0,external_node_path_namespaceObject.relative)(parent, path));
        }
    }
}
FileAuthorizationPathResolver = __decorate([
    injectable()
], FileAuthorizationPathResolver);
