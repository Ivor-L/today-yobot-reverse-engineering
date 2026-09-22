// Compiled fragment from ../../packages/client-node-adapter/src/aspects/wei/modules/shell/modules/web-authentication/utils.ts.
// The original TypeScript and import graph are not restored.


const isAllowedWebAuthenticationAuthorizationUrl = (value)=>{
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && url.hostname.length > 0 && url.username.length === 0 && url.password.length === 0;
    } catch  {
        return false;
    }
};
const isExpectedWebAuthenticationCallback = (value, target)=>{
    try {
        const callback = new URL(value);
        const expected = WEB_AUTHENTICATION_CALLBACK_ROUTES[target];
        const flowValues = callback.searchParams.getAll('flow');
        return callback.protocol === `${WEB_AUTHENTICATION_CALLBACK_SCHEME}:` && callback.hostname === expected.host && callback.pathname === expected.pathname && callback.port.length === 0 && callback.username.length === 0 && callback.password.length === 0 && callback.hash.length === 0 && flowValues.length === 1 && flowValues[0] === WEB_AUTHENTICATION_CALLBACK_FLOW;
    } catch  {
        return false;
    }
};
