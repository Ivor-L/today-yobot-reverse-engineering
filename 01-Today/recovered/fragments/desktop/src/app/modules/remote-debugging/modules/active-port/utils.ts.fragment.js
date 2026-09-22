// Compiled fragment from ./src/app/modules/remote-debugging/modules/active-port/utils.ts.
// The original TypeScript and import graph are not restored.

const isErrnoException = (error)=>{
    return error instanceof Error && 'code' in error;
};
const parseDevToolsActivePort = (contents)=>{
    const port = Number(contents.split(/\r?\n/u, 1)[0]);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        return undefined;
    }
    return port;
};
