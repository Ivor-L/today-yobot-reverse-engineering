// Compiled fragment from ./src/app/modules/shell/modules/error-page/utils.ts.
// The original TypeScript and import graph are not restored.


const hasExactFileUrl = (value, expectedPath)=>{
    try {
        const url = new URL(value);
        const expected = (0,external_node_url_namespaceObject.pathToFileURL)(expectedPath);
        url.hash = '';
        url.search = '';
        expected.hash = '';
        expected.search = '';
        return url.href === expected.href;
    } catch  {
        return false;
    }
};
