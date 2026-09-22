// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/node-devtools/modules/window/utils.ts.
// The original TypeScript and import graph are not restored.


const resolveNodeDevToolsFrontendUrl = (inspectorUrl)=>{
    const inspector = new URL(inspectorUrl);
    if (inspector.protocol !== 'ws:' || !inspector.host || !inspector.port || inspector.pathname === '/' || inspector.username || inspector.password || inspector.search || inspector.hash) {
        throw new Error('Electron Node inspector returned an invalid debugger URL');
    }
    const frontend = new URL(NODE_DEVTOOLS_FRONTEND_URL);
    let inspectorHostname = inspector.hostname;
    if (inspectorHostname === '0.0.0.0') {
        inspectorHostname = '127.0.0.1';
    } else if (inspectorHostname === '[::]') {
        inspectorHostname = '[::1]';
    }
    frontend.searchParams.set('experiments', 'true');
    frontend.searchParams.set('v8only', 'true');
    frontend.searchParams.set('ws', `${inspectorHostname}:${inspector.port}${inspector.pathname}`);
    return frontend.toString();
};
