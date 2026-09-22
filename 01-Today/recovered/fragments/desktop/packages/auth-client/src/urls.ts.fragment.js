// Compiled fragment from ../../packages/auth-client/src/urls.ts.
// The original TypeScript and import graph are not restored.

const DOMAINS = {
    development: 'todayai.dev',
    preview: 'todayai.dev',
    production: 'today.ai'
};
// Each function branches on whether a custom `env` was provided (tests) vs
// the default path (production).  The default path uses literal
// `process.env.NEXT_PUBLIC_*` expressions so that webpack's DefinePlugin can
// statically inline the values into client bundles.  Accessing env vars through
// a function parameter (`env.NEXT_PUBLIC_*`) defeats this optimisation and
// leaves them undefined on the client.
function resolveEnvironment(env) {
    if (env) {
        if (env.NODE_ENV === 'development') return 'development';
        if ((env.VERCEL_ENV ?? env.NEXT_PUBLIC_VERCEL_ENV) === 'production') return 'production';
        return 'preview';
    }
    if (false) {}
    if ((process.env.VERCEL_ENV ?? process.env.NEXT_PUBLIC_VERCEL_ENV) === 'production') return 'production';
    return 'preview';
}
function resolveDomain(env) {
    if (env) return env.NEXT_PUBLIC_BASE_DOMAIN || DOMAINS[resolveEnvironment(env)];
    return process.env.NEXT_PUBLIC_BASE_DOMAIN || DOMAINS[resolveEnvironment()];
}
function resolveAuthBaseUrl(env) {
    if (env) {
        return env.OIDC_INTERNAL_AUTHORITY || env.NEXT_PUBLIC_OIDC_AUTHORITY || `https://auth.${resolveDomain(env)}`;
    }
    return process.env.OIDC_INTERNAL_AUTHORITY || process.env.NEXT_PUBLIC_OIDC_AUTHORITY || `https://auth.${resolveDomain()}`;
}
function resolveApiBaseUrl(env) {
    if (env) return env.NEXT_PUBLIC_API_URL || `https://api.${resolveDomain(env)}`;
    return process.env.NEXT_PUBLIC_API_URL || `https://api.${resolveDomain()}`;
}
function resolveAppBaseUrl(env) {
    if (env) return env.NEXT_PUBLIC_APP_URL || `https://${resolveDomain(env)}`;
    return process.env.NEXT_PUBLIC_APP_URL || `https://${resolveDomain()}`;
}
