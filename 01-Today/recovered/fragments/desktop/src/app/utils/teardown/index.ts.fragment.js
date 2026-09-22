// Compiled fragment from ./src/app/utils/teardown/index.ts.
// The original TypeScript and import graph are not restored.

const tryCloseRemoteDebugging = async (remoteDebugging)=>{
    try {
        await remoteDebugging.close();
    } catch (error) {
        console.error('[desktop] failed to close remote debugging bridge', error);
    }
};
const cleanupAfterFailure = async (params)=>{
    const { networkInspector, nodeAdapter, platform, remoteDebugging } = params;
    if (nodeAdapter) {
        try {
            await nodeAdapter.dispose();
        } catch (error) {
            console.error('[desktop] failed to dispose the client Node adapter', error);
        }
    }
    await tryCloseRemoteDebugging(remoteDebugging);
    try {
        await platform.stop();
    } catch (error) {
        console.error('[desktop] failed to stop the platform host', error);
    }
    networkInspector.dispose();
};
