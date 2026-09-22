// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/authenticator/utils.ts.
// The original TypeScript and import graph are not restored.






const REGISTRATION_RESTRICTION_MARKERS = [
    'private beta with limited access',
    'not allowed to register',
    'not in the allowlist',
    'not on the allowlist',
    'cannot be used here',
    '@todayai.email'
];
const SAFE_REGISTRATION_RESTRICTION_MESSAGE = "We're in private beta with limited access. Thanks for your interest—stay tuned!";
const isAccountOAuthProviderId = (value)=>OAUTH_PROVIDER_IDS.includes(value);
const utils_isJsonObject = (value)=>lodash_es_isPlainObject(value);
const asNonEmptyString = (value)=>{
    if (!lodash_es_isString(value)) {
        return undefined;
    }
    const normalized = value.trim();
    if (lodash_es_isEmpty(normalized)) {
        return undefined;
    }
    return normalized;
};
const readRegistrationRestrictionMessages = (value)=>{
    const message = asNonEmptyString(value);
    if (message) {
        return [
            message
        ];
    }
    if (!utils_isJsonObject(value)) {
        return [];
    }
    const data = utils_isJsonObject(value['data']) ? value['data'] : undefined;
    const body = utils_isJsonObject(value['body']) ? value['body'] : undefined;
    const cause = utils_isJsonObject(value['cause']) ? value['cause'] : undefined;
    return [
        value['message'],
        data?.['message'],
        body?.['message'],
        cause?.['message']
    ].flatMap((candidate)=>{
        const normalized = asNonEmptyString(candidate);
        return normalized ? [
            normalized
        ] : [];
    });
};
const getSafeRegistrationRestrictionMessage = (...values)=>{
    for (const value of values){
        for (const message of readRegistrationRestrictionMessages(value)){
            if (REGISTRATION_RESTRICTION_MARKERS.some((marker)=>message.toLowerCase().includes(marker))) {
                return SAFE_REGISTRATION_RESTRICTION_MESSAGE;
            }
        }
    }
    return null;
};
const normalizeEmail = (email)=>{
    const normalized = email.trim().toLowerCase();
    const separator = normalized.indexOf('@');
    if (lodash_es_isEmpty(normalized) || normalized.length > (/* inlined export .EMAIL_LIMIT */254) || separator <= 0 || separator !== normalized.lastIndexOf('@') || separator === normalized.length - 1 || /\s/u.test(normalized)) {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'Enter a valid email address.');
    }
    return normalized;
};
const normalizeEmailCode = (code)=>{
    const normalized = code.trim();
    if (!/^\d{6}$/u.test(normalized)) {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'Enter the six-digit verification code.');
    }
    return normalized;
};
const normalizePhoneNumber = (phoneNumber)=>{
    const normalized = phoneNumber.trim();
    if (!/^\+[1-9]\d{1,14}$/u.test(normalized)) {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'Enter a valid E.164 phone number.');
    }
    return normalized;
};
const matchesCallback = (candidate, expected)=>candidate.protocol === expected.protocol && !candidate.username && !candidate.password && candidate.hostname === expected.hostname && candidate.port === expected.port && candidate.pathname === expected.pathname;
const base64Url = (value)=>Buffer.from(value).toString('base64url');
const defaultSha256 = async (value)=>new Uint8Array((0,external_node_crypto_namespaceObject.createHash)('sha256').update(value).digest());
const readJwtExpiry = (token)=>{
    const parts = token.split('.');
    const payload = parts[1];
    if (parts.length !== 3 || !payload) {
        return undefined;
    }
    try {
        const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (!utils_isJsonObject(decoded) || !lodash_es_isNumber(decoded['exp'])) {
            return undefined;
        }
        const expiresAt = decoded['exp'] * 1000;
        if (!lodash_es_isSafeInteger(expiresAt) || expiresAt <= 0) {
            return undefined;
        }
        return expiresAt;
    } catch  {
        return undefined;
    }
};
const resolveTokenExpiry = (accessToken, expiresInSeconds, now)=>{
    if (!lodash_es_isFinite(expiresInSeconds) || expiresInSeconds <= 0 || expiresInSeconds > 60 * 60 * 24 * 30) {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'The authentication service returned an invalid token lifetime.');
    }
    const declaredExpiry = now + Math.floor(expiresInSeconds * 1000);
    const jwtExpiry = readJwtExpiry(accessToken);
    let expiresAt = declaredExpiry;
    if (jwtExpiry) {
        expiresAt = Math.min(declaredExpiry, jwtExpiry);
    }
    if (!lodash_es_isSafeInteger(expiresAt) || expiresAt <= now) {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.AuthRequired, 'The authentication service returned an expired access token.', {
            terminal: true
        });
    }
    return expiresAt;
};
const assertAccessToken = (value)=>{
    const token = asNonEmptyString(value);
    if (!token || token.length > (/* inlined export .ACCESS_TOKEN_LIMIT */16384)) {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'The authentication service returned invalid credentials.');
    }
    return token;
};
const assertRefreshCredential = (value, source, terminal = false)=>{
    const credential = asNonEmptyString(value);
    if (!credential || credential.length > (/* inlined export .ACCESS_TOKEN_LIMIT */16384)) {
        if (terminal) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.AuthRequired, 'The stored account session is no longer valid.', {
                terminal: true
            });
        }
        throw interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'The authentication service returned incomplete credentials.');
    }
    if (source === 'better-auth-session' && credential.split('.').length === 3) {
        if (terminal) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.AuthRequired, 'The stored account session is no longer valid.', {
                terminal: true
            });
        }
        throw interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'The authentication service returned an invalid session credential.');
    }
    return credential;
};
