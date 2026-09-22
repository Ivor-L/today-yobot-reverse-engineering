/** Direct is an internal ingress and remains closed until a channel explicitly enables it. */
export function resolveExpertDirectMode(env = process.env) {
    const value = String(env.YOKO_EXPERT_DIRECT_MODE || "off").trim().toLowerCase();
    return value === "active" || value === "on" || value === "true" || value === "1"
        ? "active"
        : "off";
}
