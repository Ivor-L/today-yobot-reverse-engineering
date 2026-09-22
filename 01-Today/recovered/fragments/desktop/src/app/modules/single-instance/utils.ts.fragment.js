// Compiled fragment from ./src/app/modules/single-instance/utils.ts.
// The original TypeScript and import graph are not restored.


const resolveDesktopDeepLink = (candidate, expectedScheme)=>{
    const value = candidate.trim();
    if (!value) {
        return undefined;
    }
    try {
        const url = new URL(value);
        if (url.protocol !== `${expectedScheme}:`) {
            return undefined;
        }
        if (isDesktopOAuthCallbackUrl(value, expectedScheme)) {
            return undefined;
        }
        return value;
    } catch  {
        return undefined;
    }
};
const resolveDesktopActivationRequest = (commandLine, expectedScheme)=>{
    for (const argument of commandLine){
        const value = argument.trim();
        if (isDesktopOAuthCallbackUrl(value, expectedScheme)) {
            return {};
        }
        const deepLink = resolveDesktopDeepLink(argument, expectedScheme);
        if (deepLink) {
            return {
                deepLink
            };
        }
    }
    return undefined;
};
const mergeDesktopActivationRequests = (current, incoming)=>{
    if (incoming.deepLink || !current) {
        return incoming;
    }
    return current;
};
