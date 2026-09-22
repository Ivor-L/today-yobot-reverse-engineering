// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/tool-authorization/modules/file-scope/index.ts.
// The original TypeScript and import graph are not restored.











class FileToolAuthorization {
    async allows(toolId, input, roots) {
        if (!toolId.startsWith('fs.')) {
            return true;
        }
        const args = asObject(input);
        const fields = FILE_TOOL_PATH_FIELDS[toolId];
        if (!args || roots.length === 0 || !fields) {
            return false;
        }
        const { platform } = await this.cpi.system.getSystemInfo();
        const usesNamedRoot = platform !== cpi_SystemPlatform.MacOS && FILE_ROOT_TOOL_IDS.has(toolId);
        if (usesNamedRoot) {
            const root = roots.find((candidate)=>candidate === args['root']);
            const path = args['path'] ?? '';
            if (!root || typeof path !== 'string' || (0,external_node_path_namespaceObject.isAbsolute)(path) || path.startsWith('~/')) {
                return false;
            }
            if (toolId === 'fs.read' && path.length === 0) {
                return false;
            }
            return await this.paths.isWithin(path, root, root, platform, toolId === 'fs.list');
        }
        for (const field of fields){
            const value = args[field];
            const requestedPaths = typeof value === 'string' ? [
                value
            ] : value;
            if (!Array.isArray(requestedPaths) || requestedPaths.length === 0 || !requestedPaths.every((path)=>typeof path === 'string' && path.length > 0) || Array.isArray(value) && toolId !== 'fs.trash') {
                return false;
            }
            for (const path of requestedPaths){
                if (platform !== cpi_SystemPlatform.MacOS && path.startsWith('~/')) {
                    return false;
                }
                let allowed = false;
                const relativeRoot = platform === cpi_SystemPlatform.MacOS ? undefined : base_ToolFileRoot.Documents;
                for (const root of roots){
                    if (await this.paths.isWithin(path, root, relativeRoot, platform)) {
                        allowed = true;
                        break;
                    }
                }
                if (!allowed) {
                    return false;
                }
            }
        }
        return true;
    }
    async restrictRegistration(registration, roots) {
        if (!registration.id.startsWith('fs.')) {
            return registration;
        }
        const fields = FILE_TOOL_PATH_FIELDS[registration.id];
        if (!fields || roots.length === 0) {
            return {
                ...registration,
                enabled: false
            };
        }
        const resolved = resolveFileSchema(registration.inputSchema);
        const properties = asObject(resolved?.schema['properties']);
        if (!resolved || !properties) {
            return {
                ...registration,
                enabled: false
            };
        }
        const inputSchema = resolved.schema;
        const { platform } = await this.cpi.system.getSystemInfo();
        const usesNamedRoot = platform !== cpi_SystemPlatform.MacOS && FILE_ROOT_TOOL_IDS.has(registration.id);
        const scopedProperties = {
            ...properties
        };
        const required = new Set(Array.isArray(inputSchema['required']) ? inputSchema['required'] : []);
        const pattern = await this.pathPattern(roots, platform, usesNamedRoot);
        const allOf = Array.isArray(inputSchema['allOf']) ? [
            ...inputSchema['allOf']
        ] : [];
        if (usesNamedRoot) {
            const rootProperty = asObject(properties['root']);
            const rootSchema = rootProperty ? resolveFileSchema(registration.inputSchema, rootProperty)?.schema : null;
            if (!rootProperty || !rootSchema) {
                return {
                    ...registration,
                    enabled: false
                };
            }
            const declaredRoots = rootSchema['enum'];
            const allowedRoots = roots.filter((root)=>!Array.isArray(declaredRoots) || declaredRoots.includes(root));
            if (rootProperty['$ref'] !== undefined) {
                scopedProperties['root'] = {
                    allOf: [
                        rootProperty,
                        {
                            enum: allowedRoots
                        }
                    ]
                };
            } else {
                scopedProperties['root'] = {
                    ...rootProperty,
                    enum: allowedRoots
                };
            }
            required.add('root');
            if (allowedRoots.length === 0) {
                return {
                    ...registration,
                    enabled: false
                };
            }
            for (const root of allowedRoots){
                allOf.push({
                    if: {
                        properties: {
                            root: {
                                const: root
                            }
                        }
                    },
                    then: {
                        properties: {
                            path: {
                                pattern: await this.rootRelativePattern(root, platform)
                            }
                        }
                    }
                });
            }
        }
        for (const field of fields){
            if (usesNamedRoot && properties[field] === undefined && registration.id !== 'fs.read') {
                continue;
            }
            const restricted = restrictPathSchema(properties[field], pattern, registration.inputSchema);
            if (!restricted) {
                return {
                    ...registration,
                    enabled: false
                };
            }
            scopedProperties[field] = restricted;
            if (!usesNamedRoot) {
                required.add(field);
            }
        }
        return {
            ...registration,
            inputSchema: replaceFileSchema(registration.inputSchema, resolved.path, {
                ...inputSchema,
                properties: scopedProperties,
                required: [
                    ...required
                ],
                ...allOf.length === 0 ? {} : {
                    allOf
                }
            })
        };
    }
    async pathPattern(roots, platform, usesNamedRoot) {
        const windows = platform === cpi_SystemPlatform.Windows;
        const separator = windows ? '[\\\\/]' : '/';
        const noTraversal = `(?!.*(?:^|${separator})\\.\\.(?:${separator}|$))`;
        const relativePath = `(?!${separator}|[A-Za-z]:|~(?:${separator}|$))[^\\u0000]*`;
        if (usesNamedRoot) {
            return `^${noTraversal}${relativePath}$`;
        }
        const prefixes = [];
        for (const root of roots){
            const rootPath = this.paths.rootPath(root);
            const values = [
                ...await this.paths.rootPaths(root, platform)
            ];
            if (platform === cpi_SystemPlatform.MacOS) {
                if (root === base_ToolFileRoot.OtherFiles) {
                    values.push('~');
                }
                const homeRelative = (0,external_node_path_namespaceObject.relative)(this.paths.homePath(), rootPath);
                if (homeRelative && !homeRelative.startsWith(`..${external_node_path_namespaceObject.sep}`) && homeRelative !== '..' && !(0,external_node_path_namespaceObject.isAbsolute)(homeRelative)) {
                    values.push(`~/${homeRelative}`);
                }
            }
            const scoped = values.map((value)=>pathPrefixPattern(value, windows));
            const excludedPaths = await this.paths.excludedRootPaths(root);
            if (excludedPaths.length > 0) {
                const excluded = [
                    ...excludedPaths
                ];
                const home = this.paths.homePath();
                if (platform === cpi_SystemPlatform.MacOS) {
                    for (const path of excludedPaths){
                        const homeRelative = (0,external_node_path_namespaceObject.relative)(home, path);
                        if (homeRelative && !homeRelative.startsWith(`..${external_node_path_namespaceObject.sep}`) && !(0,external_node_path_namespaceObject.isAbsolute)(homeRelative)) {
                            excluded.push(`~/${homeRelative}`);
                        }
                    }
                }
                const exclusions = excluded.map((value)=>pathPrefixPattern(value, windows)).join('|');
                const ancestors = new Set();
                for (const path of (await this.paths.rootPaths(root, platform))){
                    if (excludedPaths.some((excludedPath)=>{
                        const remainder = (0,external_node_path_namespaceObject.relative)(path, excludedPath);
                        return remainder && !remainder.startsWith(`..${external_node_path_namespaceObject.sep}`) && !(0,external_node_path_namespaceObject.isAbsolute)(remainder);
                    })) {
                        ancestors.add(path);
                        if (platform === cpi_SystemPlatform.MacOS) {
                            const homeRelative = (0,external_node_path_namespaceObject.relative)(home, path);
                            if (homeRelative === '') {
                                ancestors.add('~');
                            } else if (!homeRelative.startsWith(`..${external_node_path_namespaceObject.sep}`) && !(0,external_node_path_namespaceObject.isAbsolute)(homeRelative)) {
                                ancestors.add(`~/${homeRelative}`);
                            }
                        }
                    }
                }
                for (const excludedPath of excludedPaths){
                    const homeRelative = (0,external_node_path_namespaceObject.relative)(home, excludedPath);
                    if (homeRelative.startsWith(`..${external_node_path_namespaceObject.sep}`) || (0,external_node_path_namespaceObject.isAbsolute)(homeRelative)) {
                        continue;
                    }
                    const components = homeRelative.split(external_node_path_namespaceObject.sep);
                    while(components.length > 1){
                        components.pop();
                        ancestors.add(`${home}${external_node_path_namespaceObject.sep}${components.join(external_node_path_namespaceObject.sep)}`);
                        if (platform === cpi_SystemPlatform.MacOS) {
                            ancestors.add(`~/${components.join('/')}`);
                        }
                    }
                }
                if (platform === cpi_SystemPlatform.MacOS && root === base_ToolFileRoot.OtherFiles) {
                    ancestors.add('~');
                }
                const ancestorPattern = [
                    ...ancestors
                ].map((value)=>pathPrefixPattern(value, windows)).join('|');
                const ancestorExclusion = ancestorPattern ? `(?!(?:${ancestorPattern})${separator}?$)` : '';
                const exclusion = `(?!(?:${exclusions})(?:${separator}|$))${ancestorExclusion}`;
                prefixes.push(`${exclusion}(?:${scoped.join('|')})`);
            } else {
                prefixes.push(...scoped);
            }
        }
        const absolutePath = `(?:${prefixes.join('|')})(?:${separator}[^\\u0000]*)?`;
        if (platform !== cpi_SystemPlatform.MacOS && roots.includes(base_ToolFileRoot.Documents)) {
            const scopedRelativePattern = await this.rootRelativePattern(base_ToolFileRoot.Documents, platform);
            return `^${noTraversal}(?:${absolutePath}|${scopedRelativePattern.slice(1, -1)})$`;
        }
        return `^${noTraversal}${absolutePath}$`;
    }
    async rootRelativePattern(root, platform) {
        const windows = platform === cpi_SystemPlatform.Windows;
        const separator = windows ? '[\\\\/]' : '/';
        const prefixes = [];
        const excludedPaths = await this.paths.excludedRootPaths(root);
        for (const rootPath of (await this.paths.rootPaths(root))){
            for (const path of excludedPaths){
                const rootRelative = (0,external_node_path_namespaceObject.relative)(rootPath, path);
                if (rootRelative === '') {
                    return '(?!)';
                }
                if (!rootRelative.startsWith(`..${external_node_path_namespaceObject.sep}`) && !(0,external_node_path_namespaceObject.isAbsolute)(rootRelative)) {
                    prefixes.push(pathPrefixPattern(rootRelative, windows));
                }
            }
        }
        const exclusion = prefixes.length > 0 ? `(?!(?:${prefixes.join('|')})(?:${separator}|$))` : '';
        return `^${exclusion}(?!.*(?:^|${separator})\\.\\.(?:${separator}|$))(?!${separator}|[A-Za-z]:|~(?:${separator}|$))[^\\u0000]*$`;
    }
}
__decorate([
    inject(CROSS_PLATFORM_INTERFACE),
    __metadata("design:type", typeof ICrossPlatformInterface === "undefined" ? Object : ICrossPlatformInterface)
], FileToolAuthorization.prototype, "cpi", void 0);
__decorate([
    inject(FileAuthorizationPathResolver),
    __metadata("design:type", typeof FileAuthorizationPathResolver === "undefined" ? Object : FileAuthorizationPathResolver)
], FileToolAuthorization.prototype, "paths", void 0);
FileToolAuthorization = __decorate([
    injectable()
], FileToolAuthorization);
