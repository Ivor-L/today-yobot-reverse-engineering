import dotenv from "dotenv";
/** Operational rollout controls must remain overridable outside a packaged channel file. */
export const OPERATOR_ENV_KEYS = [
    "YOKO_WINDOWS_REGRESSION_MODE",
    "YOKO_REGRESSION_REMOTE_SERVER_URL",
    "YOKO_AGENT_RUN_MODE",
    "YOKO_AGENT_RUN_PROFILES",
    "YOKO_AGENT_RUN_ACCOUNTS",
    "YOKO_AGENT_RUN_SOURCES",
    "YOKO_EXPERT_CAPABILITY_MODE",
    "YOKO_EXPERT_SHADOW_GRANTS",
    "YOKO_EXPERT_SHADOW_RESOURCE_SCOPES",
    "YOKO_EXPERT_SHADOW_PROFILES",
    "YOKO_EXPERT_SHADOW_SOURCES",
    "YOKO_EXPERT_DIRECT_MODE",
    "YOKO_EXPERT_WORKER_MODE",
    "YOKO_OFFICIAL_EXPERT_CATALOG_MODE",
    "YOKO_EXPERT_DEPLOYMENT_MODE",
    "YOKO_EXPERT_DEPLOYMENT_SHADOW_PROFILES",
    "YOKO_EXPERT_DEPLOYMENT_SHADOW_ACCOUNTS",
];
/**
 * Channel files intentionally override ordinary branding/provider defaults. Runtime rollout
 * controls are different: an inherited/system value is an operational kill switch and wins.
 */
export function loadChannelRuntimeEnv(filePath, environment = process.env) {
    const operatorValues = new Map();
    for (const key of OPERATOR_ENV_KEYS) {
        if (Object.prototype.hasOwnProperty.call(environment, key)) {
            operatorValues.set(key, environment[key] ?? "");
        }
    }
    dotenv.config({
        path: filePath,
        override: true,
        quiet: true,
        processEnv: environment,
    });
    for (const [key, value] of operatorValues)
        environment[key] = value;
}
