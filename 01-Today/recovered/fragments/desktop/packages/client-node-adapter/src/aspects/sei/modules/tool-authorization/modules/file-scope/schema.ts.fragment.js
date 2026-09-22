// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/tool-authorization/modules/file-scope/schema.ts.
// The original TypeScript and import graph are not restored.


const hasNestedResource = (schema, document)=>schema !== document && (typeof schema['$id'] === 'string' || typeof schema['id'] === 'string');
const resolvePointer = (document, reference)=>{
    if (!reference.startsWith('#')) {
        return null;
    }
    let pointer;
    try {
        pointer = decodeURIComponent(reference.slice(1));
    } catch  {
        return null;
    }
    if (pointer !== '' && !pointer.startsWith('/')) {
        return null;
    }
    const tokens = pointer === '' ? [] : pointer.slice(1).split('/');
    if (tokens.some((token)=>/~(?![01])/u.test(token))) {
        return null;
    }
    const path = tokens.map((token)=>token.replace(/~1/gu, '/').replace(/~0/gu, '~'));
    let value = document;
    for (const token of path){
        const object = asObject(value);
        // A fragment under an embedded resource no longer refers to this document.
        if (object && hasNestedResource(object, document)) {
            return null;
        }
        if (Array.isArray(value)) {
            if (!/^(?:0|[1-9][0-9]*)$/u.test(token) || !Object.hasOwn(value, token)) {
                return null;
            }
            value = value[Number(token)];
        } else {
            if (!object || !Object.hasOwn(object, token)) {
                return null;
            }
            value = object[token];
        }
    }
    const schema = asObject(value);
    if (!schema || hasNestedResource(schema, document)) {
        return null;
    }
    return {
        schema,
        path
    };
};
/** Resolves document-local aliases for shape discovery without flattening the schema. */ const resolveFileSchema = (document, value = document)=>{
    let schema = asObject(value);
    let path = [];
    const visited = new Set();
    while(schema){
        if (visited.has(schema) || hasNestedResource(schema, document)) {
            return null;
        }
        visited.add(schema);
        const reference = schema['$ref'];
        if (reference === undefined) {
            return {
                schema,
                path
            };
        }
        if (typeof reference !== 'string') {
            return null;
        }
        const resolved = resolvePointer(document, reference);
        if (!resolved) {
            return null;
        }
        schema = resolved.schema;
        path = resolved.path;
    }
    return null;
};
/** Keeps references and their targets at the same locations, including in draft-07. */ const replaceFileSchema = (document, path, schema)=>{
    const ancestors = [];
    let current = document;
    for (const key of path){
        ancestors.push(current);
        if (Array.isArray(current)) {
            current = current[Number(key)];
        } else {
            current = current[key];
        }
    }
    let replacement = schema;
    for(let index = path.length - 1; index >= 0; index -= 1){
        const parent = ancestors[index];
        const key = path[index];
        if (Array.isArray(parent)) {
            const copy = [
                ...parent
            ];
            copy[Number(key)] = replacement;
            replacement = copy;
        } else {
            replacement = {
                ...parent,
                [key]: replacement
            };
        }
    }
    return replacement;
};
const referencedPathScope = (document, value, pattern, ancestors = new Set())=>{
    const resolved = resolveFileSchema(document, value);
    if (!resolved || ancestors.has(resolved.schema)) {
        return null;
    }
    const { schema } = resolved;
    const visited = new Set([
        ...ancestors,
        schema
    ]);
    if (schema['type'] === 'string') {
        return {
            type: 'string',
            pattern
        };
    }
    if (schema['type'] === 'array') {
        const items = referencedPathScope(document, schema['items'] ?? null, pattern, visited);
        if (!items) {
            return null;
        }
        return {
            type: 'array',
            items,
            minItems: 1
        };
    }
    for (const union of [
        'anyOf',
        'oneOf'
    ]){
        const alternatives = schema[union];
        if (!Array.isArray(alternatives) || alternatives.length === 0) {
            continue;
        }
        const restricted = alternatives.map((alternative)=>referencedPathScope(document, alternative, pattern, visited));
        if (restricted.some((alternative)=>alternative === null)) {
            return null;
        }
        // The original reference still enforces oneOf. Scope-only branches may overlap.
        return {
            anyOf: restricted
        };
    }
    return null;
};
/** Retains original constraints while restricting every string/array alternative. */ const restrictPathSchema = (value, pattern, document)=>{
    const property = asObject(value);
    if (!property || hasNestedResource(property, document)) {
        return null;
    }
    if (property['$ref'] !== undefined) {
        const scope = referencedPathScope(document, property, pattern);
        if (!scope) {
            return null;
        }
        // draft-07 ignores siblings of $ref, so scope must be a separate conjunct.
        return {
            allOf: [
                property,
                scope
            ]
        };
    }
    if (property['type'] === 'string') {
        if (typeof property['pattern'] === 'string') {
            const allOf = Array.isArray(property['allOf']) ? property['allOf'] : [];
            return {
                ...property,
                allOf: [
                    ...allOf,
                    {
                        pattern
                    }
                ]
            };
        }
        return {
            ...property,
            pattern
        };
    }
    if (property['type'] === 'array') {
        const items = restrictPathSchema(property['items'], pattern, document);
        if (!items) {
            return null;
        }
        const minItems = typeof property['minItems'] === 'number' ? property['minItems'] : 0;
        return {
            ...property,
            items,
            minItems: Math.max(1, minItems)
        };
    }
    for (const union of [
        'anyOf',
        'oneOf'
    ]){
        const alternatives = property[union];
        if (!Array.isArray(alternatives) || alternatives.length === 0) {
            continue;
        }
        const restricted = alternatives.map((alternative)=>restrictPathSchema(alternative, pattern, document));
        if (restricted.some((alternative)=>alternative === null)) {
            return null;
        }
        return {
            ...property,
            [union]: restricted
        };
    }
    return null;
};
