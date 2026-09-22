// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/authenticator/modules/isolated-session/modules/authorization-window/utils.ts.
// The original TypeScript and import graph are not restored.


const matchesAllowedNavigationHost = (hostname, pattern)=>{
    const normalizedHostname = hostname.trim().toLowerCase();
    const normalizedPattern = pattern.trim().toLowerCase();
    if (!normalizedPattern.endsWith('.*')) {
        return normalizedHostname === normalizedPattern;
    }
    const wildcardBase = normalizedPattern.slice(0, -2);
    if (!wildcardBase || wildcardBase.includes('*')) {
        return false;
    }
    const wildcardLabels = wildcardBase.split('.');
    const expectedDomainLabel = wildcardLabels.pop();
    if (!expectedDomainLabel || wildcardLabels.some((label)=>!label)) {
        return false;
    }
    const parsedHostname = es6_parse(normalizedHostname);
    if (!parsedHostname.domain || !parsedHostname.publicSuffix) {
        return false;
    }
    const expectedDomain = `${expectedDomainLabel}.${parsedHostname.publicSuffix}`;
    const expectedSubdomain = wildcardLabels.join('.');
    return parsedHostname.domain === expectedDomain && (parsedHostname.subdomain ?? '') === expectedSubdomain;
};
