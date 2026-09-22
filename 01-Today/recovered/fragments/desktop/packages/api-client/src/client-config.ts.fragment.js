// Compiled fragment from ../../packages/api-client/src/client-config.ts.
// The original TypeScript and import graph are not restored.


const createClientConfig = (config)=>({
        ...config,
        baseUrl: resolveApiBaseUrl()
    });
