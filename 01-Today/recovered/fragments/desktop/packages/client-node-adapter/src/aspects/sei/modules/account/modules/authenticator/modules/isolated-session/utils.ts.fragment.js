// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/authenticator/modules/isolated-session/utils.ts.
// The original TypeScript and import graph are not restored.

const configureAccountIsolatedSessionSecurity = (session)=>{
    session.on('will-download', (event)=>event.preventDefault());
    session.setPermissionCheckHandler(()=>false);
    session.setPermissionRequestHandler((_webContents, _permission, callback)=>{
        callback(false);
    });
    session.setDevicePermissionHandler(()=>false);
};
