// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/tool-authorization/modules/file-scope/consts.ts.
// The original TypeScript and import graph are not restored.

/** Only fields consumed by the actual filesystem implementation can establish scope. */ const FILE_TOOL_PATH_FIELDS = {
    'fs.copy': [
        'source',
        'destination'
    ],
    'fs.find': [
        'directory'
    ],
    'fs.grep': [
        'path'
    ],
    'fs.list': [
        'path'
    ],
    'fs.mkdir': [
        'path'
    ],
    'fs.move': [
        'source',
        'destination'
    ],
    'fs.ocr': [
        'path'
    ],
    'fs.patch': [
        'path'
    ],
    'fs.read': [
        'path'
    ],
    'fs.stat': [
        'path'
    ],
    'fs.tags': [
        'path'
    ],
    'fs.trash': [
        'path'
    ],
    'fs.write': [
        'path'
    ],
    'fs.xattr': [
        'path'
    ]
};
const FILE_ROOT_TOOL_IDS = new Set([
    'fs.list',
    'fs.read',
    'fs.stat'
]);
