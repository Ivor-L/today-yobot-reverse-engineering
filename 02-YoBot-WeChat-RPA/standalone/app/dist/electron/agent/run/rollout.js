import { AGENT_RUN_SOURCES } from "./contract.js";
function values(input) {
    const source = Array.isArray(input) ? input : String(input || "").split(",");
    return [...new Set(source.map((value) => value.trim()).filter((value) => value && value !== "*"))];
}
function modeOf(value) {
    const normalized = String(value || "off").trim().toLowerCase();
    return normalized === "shadow" || normalized === "active" ? normalized : "off";
}
/**
 * Immutable admission policy for AgentRun rollout. Selectors are allow-lists and
 * compose with AND semantics: when both are configured, both must match.
 */
export class AgentRunRolloutPolicy {
    mode;
    profiles;
    accounts;
    sources;
    configurationIssues;
    constructor(options = {}) {
        this.mode = modeOf(options.mode);
        this.profiles = new Set(values(options.profiles));
        this.accounts = new Set(values(options.accounts));
        const requestedSources = values(options.sources).map((value) => value.toLowerCase());
        const knownSources = new Set(AGENT_RUN_SOURCES);
        const invalidSources = requestedSources.filter((source) => !knownSources.has(source));
        this.sources = new Set(requestedSources.filter((source) => knownSources.has(source)));
        this.configurationIssues = invalidSources.length > 0
            ? [`unknown_source_count:${invalidSources.length}`]
            : [];
    }
    resolve(target) {
        if (this.mode === "off")
            return "off";
        if (this.configurationIssues.length > 0)
            return "off";
        if (this.profiles.size > 0 && !this.profiles.has(target.profileId))
            return "off";
        if (this.sources.size > 0) {
            if (!target.source || !this.sources.has(target.source))
                return "off";
        }
        if (this.accounts.size > 0) {
            if (!target.accountId || !this.accounts.has(target.accountId))
                return "off";
        }
        return this.mode;
    }
    get enabled() {
        return this.mode !== "off";
    }
    summary() {
        const profiles = this.profiles.size ? [...this.profiles].join(",") : "*";
        const accounts = this.accounts.size ? [...this.accounts].join(",") : "*";
        const sources = this.sources.size ? [...this.sources].join(",") : "*";
        const issues = this.configurationIssues.length ? `, issues=${this.configurationIssues.join("|")}` : "";
        return `mode=${this.mode}, sources=${sources}, profiles=${profiles}, accounts=${accounts}${issues}`;
    }
}
export function resolveAgentRunRolloutPolicy(env = process.env) {
    return new AgentRunRolloutPolicy({
        mode: env.YOKO_AGENT_RUN_MODE,
        profiles: env.YOKO_AGENT_RUN_PROFILES,
        accounts: env.YOKO_AGENT_RUN_ACCOUNTS,
        sources: env.YOKO_AGENT_RUN_SOURCES,
    });
}
