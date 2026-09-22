export declare const DESKTOP_PUBLIC_ENVIRONMENT_KEYS: readonly string[];
export declare const DESKTOP_CLOUD_PUBLIC_CONFIG_DEFAULTS: Readonly<{
    dev: Readonly<{
        apiBaseUrl: "https://api.todayai.dev";
        appUrl: "https://todayai.dev";
        baseDomain: "todayai.dev";
        betterAuthUrl: "https://auth.todayai.dev";
        oidcAuthority: "https://auth.todayai.dev";
        oidcClientId: string;
        tokenAudience: "https://api.today.ai";
    }>;
    staging: Readonly<{
        apiBaseUrl: "https://api.today.ai";
        appUrl: "https://staging.today.ai";
        baseDomain: "today.ai";
        betterAuthUrl: "https://auth.today.ai";
        oidcAuthority: "https://auth.today.ai";
        oidcClientId: string;
        tokenAudience: "https://api.today.ai";
    }>;
    prod: Readonly<{
        apiBaseUrl: "https://api.today.ai";
        appUrl: "https://today.ai";
        baseDomain: "today.ai";
        betterAuthUrl: "https://auth.today.ai";
        oidcAuthority: "https://auth.today.ai";
        oidcClientId: string;
        tokenAudience: "https://api.today.ai";
    }>;
}>;
