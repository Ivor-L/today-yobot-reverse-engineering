// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/authenticator/modules/oauth-flow/utils.ts.
// The original TypeScript and import graph are not restored.





const readOAuthCallbackCode = (value, callbackUrl, expectedState)=>{
    if (typeof value !== 'string' || value.length === 0 || value.length > (/* inlined export .OAUTH_CALLBACK_LIMIT */32768)) {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'OAuth returned an invalid callback.');
    }
    let callback;
    let expected;
    try {
        callback = new URL(value);
        expected = new URL(callbackUrl);
    } catch  {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'OAuth returned an invalid callback.');
    }
    if (!matchesCallback(callback, expected) || callback.hash) {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'OAuth returned to an unexpected callback.');
    }
    const parameters = callback.searchParams;
    if (OAUTH_CALLBACK_PARAMETERS.some((name)=>parameters.getAll(name).length > 1)) {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'OAuth returned an ambiguous callback.');
    }
    const state = parameters.get('state');
    if (!state || state !== expectedState) {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'OAuth state validation failed.');
    }
    const error = parameters.get('error');
    if (parameters.has('error') && parameters.has('code')) {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'OAuth returned an ambiguous callback.');
    }
    if (error === 'access_denied' || error === 'cancelled') {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.Cancelled, 'OAuth authorization was cancelled.');
    }
    if (parameters.has('error')) {
        const restriction = getSafeRegistrationRestrictionMessage(parameters.get('error_description'), error);
        if (restriction) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.AuthRequired, restriction);
        }
        throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'OAuth authorization was not completed.');
    }
    const code = parameters.get('code');
    if (!code || code.length > (/* inlined export .OAUTH_CODE_LIMIT */4096) || /\s/u.test(code)) {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'OAuth did not return an authorization code.');
    }
    return code;
};
