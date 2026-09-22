import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { stableTraceHash } from "./context_projection_trace.js";
const RISK_ORDER = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3,
};
function nonEmptyStrings(value, maxItems, maxLength) {
    return Array.isArray(value)
        && value.length <= maxItems
        && value.every((item) => typeof item === "string" && item.trim().length > 0 && item.length <= maxLength);
}
export function validateTaskContract(input) {
    const errors = [];
    const value = input;
    if (!value || typeof value !== "object")
        return ["contract must be an object"];
    if (typeof value.goal !== "string" || value.goal.trim().length < 3 || value.goal.length > 2_000) {
        errors.push("goal must contain 3-2000 characters");
    }
    if (!Array.isArray(value.deliverables) || value.deliverables.length < 1 || value.deliverables.length > 20) {
        errors.push("deliverables must contain 1-20 items");
    }
    else if (value.deliverables.some((item) => (!item || typeof item.type !== "string" || !item.type.trim()
        || typeof item.description !== "string" || !item.description.trim()
        || item.description.length > 1_000))) {
        errors.push("each deliverable requires type and description");
    }
    if (!value.scope || !nonEmptyStrings(value.scope.included, 50, 500) || value.scope.included.length < 1) {
        errors.push("scope.included must be a bounded non-empty string array");
    }
    if (!value.scope || !nonEmptyStrings(value.scope.excluded, 50, 500)) {
        errors.push("scope.excluded must be a bounded string array");
    }
    if (!nonEmptyStrings(value.constraints, 50, 1_000))
        errors.push("constraints must be a bounded string array");
    if (!Array.isArray(value.successCriteria) || value.successCriteria.length < 1 || value.successCriteria.length > 30) {
        errors.push("successCriteria must contain 1-30 items");
    }
    else if (value.successCriteria.some((item) => (!item || typeof item.id !== "string" || !item.id.trim()
        || typeof item.description !== "string" || !item.description.trim()
        || !["assertion", "read_back", "artifact", "evidence", "model"].includes(item.verification)))) {
        errors.push("successCriteria items require id, description and a supported verification method");
    }
    if (!nonEmptyStrings(value.evidenceRequirements, 30, 1_000)) {
        errors.push("evidenceRequirements must be a bounded string array");
    }
    if (!Array.isArray(value.assumptions) || value.assumptions.length > 30 || value.assumptions.some((item) => (!item || typeof item.text !== "string" || !item.text.trim()
        || typeof item.confidence !== "number" || item.confidence < 0 || item.confidence > 1
        || typeof item.requiresConfirmation !== "boolean"))) {
        errors.push("assumptions must contain valid confidence and confirmation fields");
    }
    if (!value.risk || !(value.risk in RISK_ORDER))
        errors.push("risk is invalid");
    return errors;
}
function sessionFileName(sessionId) {
    return `${createHash("sha256").update(sessionId).digest("hex").slice(0, 32)}.jsonl`;
}
function expandedScope(previous, next) {
    const previousIncluded = new Set(previous.scope.included);
    return next.scope.included.some((item) => !previousIncluded.has(item));
}
export class TaskContractStore {
    baseDir;
    static instance;
    records = new Map();
    static getInstance() {
        if (!TaskContractStore.instance)
            TaskContractStore.instance = new TaskContractStore();
        return TaskContractStore.instance;
    }
    static resetForTests() {
        TaskContractStore.instance = undefined;
    }
    constructor(baseDir = path.join(process.env.USER_DATA_PATH || process.cwd(), "data", "task-contracts")) {
        this.baseDir = baseDir;
    }
    load(sessionId) {
        const cached = this.records.get(sessionId);
        if (cached)
            return cached;
        const file = path.join(this.baseDir, sessionFileName(sessionId));
        const loaded = [];
        try {
            const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
            for (const line of lines) {
                try {
                    const record = JSON.parse(line);
                    if (record?.schemaVersion === 1 && record.sessionId === sessionId)
                        loaded.push(record);
                }
                catch {
                    // One corrupt tail line must not hide earlier valid contract events.
                }
            }
        }
        catch {
            // New session.
        }
        this.records.set(sessionId, loaded);
        return loaded;
    }
    append(record) {
        fs.mkdirSync(this.baseDir, { recursive: true });
        fs.appendFileSync(path.join(this.baseDir, sessionFileName(record.sessionId)), `${JSON.stringify(record)}\n`, "utf8");
        this.load(record.sessionId).push(record);
    }
    latest(sessionId) {
        return this.load(sessionId).at(-1);
    }
    active(sessionId) {
        const records = this.load(sessionId);
        const invalidated = new Set(records.filter((record) => ["active", "superseded", "completed", "blocked"].includes(record.state) && record.supersedes).map((record) => record.supersedes));
        return [...records].reverse().find((record) => record.state === "active" && !invalidated.has(record.id));
    }
    confirm(sessionId, pendingId) {
        const latest = this.latest(sessionId);
        if (!latest || latest.id !== pendingId || latest.state !== "needs_user_confirmation") {
            return {
                error: {
                    code: "task_contract_confirmation_stale",
                    message: "The task contract confirmation no longer matches the latest pending contract.",
                },
            };
        }
        const previousActive = this.active(sessionId);
        const record = {
            schemaVersion: 1,
            id: randomUUID(),
            sessionId,
            version: latest.version + 1,
            state: "active",
            contract: structuredClone(latest.contract),
            contractHash: latest.contractHash,
            createdAt: Date.now(),
            ...(previousActive ? { supersedes: previousActive.id } : {}),
            reason: `user_confirmed:${latest.id}`,
        };
        this.append(record);
        return { record };
    }
    invalidateSessionBranch(sessionId) {
        const active = this.active(sessionId);
        if (!active)
            return undefined;
        const latest = this.latest(sessionId);
        const record = {
            schemaVersion: 1,
            id: randomUUID(),
            sessionId,
            version: (latest?.version || 0) + 1,
            state: "blocked",
            contract: structuredClone(active.contract),
            contractHash: active.contractHash,
            createdAt: Date.now(),
            supersedes: active.id,
            reason: "branch_invalidated",
        };
        this.append(record);
        return record;
    }
    set(sessionId, input) {
        const errors = validateTaskContract(input);
        if (errors.length > 0) {
            return { error: { code: "task_contract_invalid", message: errors.join("; ") } };
        }
        const contract = structuredClone(input);
        const contractHash = stableTraceHash(contract);
        const latest = this.latest(sessionId);
        if (latest?.contractHash === contractHash
            && ["active", "needs_user_confirmation"].includes(latest.state)) {
            return { record: latest, idempotent: true };
        }
        const active = this.active(sessionId);
        if (active && RISK_ORDER[contract.risk] < RISK_ORDER[active.contract.risk]) {
            return {
                record: active,
                error: {
                    code: "task_contract_risk_downgrade_denied",
                    message: "An active contract cannot be updated to a lower risk classification.",
                },
            };
        }
        const requiresConfirmation = contract.assumptions.some((item) => item.requiresConfirmation)
            || (active ? expandedScope(active.contract, contract) : false);
        const record = {
            schemaVersion: 1,
            id: randomUUID(),
            sessionId,
            version: (latest?.version || 0) + 1,
            state: requiresConfirmation ? "needs_user_confirmation" : "active",
            contract,
            contractHash,
            createdAt: Date.now(),
            ...(active ? { supersedes: active.id } : {}),
            ...(requiresConfirmation ? { reason: "scope_expansion_or_unconfirmed_assumption" } : {}),
        };
        this.append(record);
        return { record };
    }
}
export function resolveTaskContractMode(value = process.env.YOKO_TASK_CONTRACT) {
    const normalized = String(value ?? "shadow").trim().toLowerCase();
    if (["off", "false", "0"].includes(normalized))
        return "off";
    if (["enforce", "true", "1", "on"].includes(normalized))
        return "enforce";
    return "shadow";
}
export function taskContractRequiredForTool(toolName, sideEffect) {
    if (toolName === "task_contract_set")
        return false;
    return sideEffect !== "none";
}
