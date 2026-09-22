/**
 * selected is the upgrade-safe default: existing chats see no new tool, while an explicit pinned
 * selectedExpertRef can use the new runtime. active additionally exposes invoke_expert to main.
 */
export function resolveExpertWorkerMode(env = process.env) {
    const value = env.YOKO_EXPERT_WORKER_MODE?.trim().toLowerCase();
    if (value === "off" || value === "active" || value === "selected")
        return value;
    return "selected";
}
