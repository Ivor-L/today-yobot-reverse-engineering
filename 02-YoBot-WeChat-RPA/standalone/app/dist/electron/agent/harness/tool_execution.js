import { createHash, randomUUID } from "node:crypto";
const REQUIRED_METADATA_FIELDS = [
    "namespace",
    "capability",
    "sideEffect",
    "risk",
    "reversible",
    "idempotent",
    "approval",
];
export function resolveEnterpriseToolMetadata(definition) {
    const input = definition && typeof definition === "object"
        ? definition
        : {};
    const candidate = input.enterprise ?? input.metadata?.enterprise;
    if (!candidate || typeof candidate !== "object") {
        return {
            declared: false,
            missingFields: [...REQUIRED_METADATA_FIELDS],
            validationIssues: ["enterprise:not_object"],
        };
    }
    const missingFields = REQUIRED_METADATA_FIELDS
        .filter((field) => candidate[field] === undefined || candidate[field] === null)
        .map(String);
    const validationIssues = [];
    const validateEnum = (field, allowed) => {
        if (candidate[field] !== undefined && !allowed.includes(candidate[field])) {
            validationIssues.push(`${field}:invalid_enum`);
        }
    };
    for (const field of ["namespace", "capability"]) {
        if (candidate[field] !== undefined && (typeof candidate[field] !== "string" || candidate[field].trim().length === 0))
            validationIssues.push(`${field}:non_empty_string_required`);
    }
    validateEnum("sideEffect", ["none", "local", "external"]);
    validateEnum("risk", ["low", "medium", "high", "critical"]);
    validateEnum("approval", ["never", "policy", "always"]);
    validateEnum("executionMode", ["parallel", "sequential"]);
    validateEnum("estimatedLatencyClass", ["instant", "short", "long"]);
    validateEnum("estimatedCostClass", ["free", "low", "medium", "high"]);
    for (const field of ["reversible", "idempotent", "supportsDryRun"]) {
        if (candidate[field] !== undefined && typeof candidate[field] !== "boolean") {
            validationIssues.push(`${field}:boolean_required`);
        }
    }
    if (candidate.requiredScopes !== undefined && (!Array.isArray(candidate.requiredScopes)
        || candidate.requiredScopes.some((scope) => typeof scope !== "string" || !scope.trim())))
        validationIssues.push("requiredScopes:non_empty_string_array_required");
    if (candidate.securityEffects !== undefined && (!Array.isArray(candidate.securityEffects)
        || candidate.securityEffects.length === 0
        || candidate.securityEffects.some((effect) => effect !== "local_file_mutation")
        || new Set(candidate.securityEffects).size !== candidate.securityEffects.length))
        validationIssues.push("securityEffects:known_unique_non_empty_array_required");
    for (const field of ["workspacePathParams", "workspacePathArrayParams"]) {
        if (candidate[field] !== undefined && (!Array.isArray(candidate[field])
            || candidate[field].length === 0
            || candidate[field].some((name) => typeof name !== "string" || !name.trim())
            || new Set(candidate[field]).size !== candidate[field].length))
            validationIssues.push(`${field}:unique_non_empty_string_array_required`);
    }
    if (candidate.retryPolicy !== undefined) {
        const retry = candidate.retryPolicy;
        if (!retry || typeof retry !== "object") {
            validationIssues.push("retryPolicy:object_required");
        }
        else {
            if (!Number.isInteger(retry.maxAttempts) || retry.maxAttempts < 1 || retry.maxAttempts > 5) {
                validationIssues.push("retryPolicy.maxAttempts:integer_1_to_5_required");
            }
            if (!Array.isArray(retry.retryableCodes)
                || retry.retryableCodes.some((code) => typeof code !== "string" || !code.trim())) {
                validationIssues.push("retryPolicy.retryableCodes:string_array_required");
            }
        }
    }
    if (candidate.risk === "critical" && candidate.approval !== "always") {
        validationIssues.push("critical:approval_always_required");
    }
    if (candidate.executionMode === "parallel"
        && (candidate.sideEffect !== "none" || candidate.idempotent !== true)) {
        validationIssues.push("parallel:read_only_idempotent_required");
    }
    return {
        declared: missingFields.length === 0 && validationIssues.length === 0,
        metadata: candidate,
        missingFields,
        validationIssues,
    };
}
function byteLength(value) {
    try {
        const serialized = typeof value === "string" ? value : JSON.stringify(value);
        return Buffer.byteLength(serialized ?? "", "utf8");
    }
    catch {
        return undefined;
    }
}
export function rawToolResultRef(rawResult) {
    try {
        const value = typeof rawResult === "string" ? rawResult : JSON.stringify(rawResult);
        if (value === undefined)
            return undefined;
        return `sha256:${createHash("sha256").update(value).digest("hex")}`;
    }
    catch {
        return undefined;
    }
}
export function buildToolExecutionRecord(input) {
    const endedAt = input.endedAt ?? Date.now();
    const sideEffect = input.metadata.metadata?.sideEffect === "none"
        ? { occurred: false }
        : { occurred: "unknown" };
    return {
        schemaVersion: 1,
        recordId: randomUUID(),
        toolName: input.toolName,
        ...(input.toolCallId ? { toolCallId: input.toolCallId } : {}),
        status: input.status,
        code: input.code,
        ...(input.rawResult !== undefined ? { rawResultRef: rawToolResultRef(input.rawResult) } : {}),
        ...(input.message ? { message: input.message } : {}),
        ...(input.retryable !== undefined ? { retryable: input.retryable } : {}),
        sideEffect,
        metadata: input.metadata,
        metrics: {
            latencyMs: Math.max(0, endedAt - input.startedAt),
            ...(byteLength(input.params) !== undefined ? { bytesIn: byteLength(input.params) } : {}),
            ...(input.rawResult !== undefined && byteLength(input.rawResult) !== undefined
                ? { bytesOut: byteLength(input.rawResult) }
                : {}),
        },
    };
}
/** Content-free event projection; raw result, params and error message never enter the trace. */
export function toolExecutionRecordTrace(record) {
    return {
        schemaVersion: record.schemaVersion,
        recordId: record.recordId,
        toolName: record.toolName,
        ...(record.toolCallId ? { toolCallId: record.toolCallId } : {}),
        status: record.status,
        code: record.code,
        ...(record.rawResultRef ? { rawResultRef: record.rawResultRef } : {}),
        retryable: record.retryable ?? null,
        sideEffectOccurred: record.sideEffect?.occurred ?? "unknown",
        metadataDeclared: record.metadata.declared,
        missingMetadataFields: record.metadata.missingFields,
        metadataValidationIssues: record.metadata.validationIssues,
        namespace: record.metadata.metadata?.namespace ?? "unknown",
        capability: record.metadata.metadata?.capability ?? "unknown",
        sideEffect: record.metadata.metadata?.sideEffect ?? "unknown",
        risk: record.metadata.metadata?.risk ?? "unknown",
        approval: record.metadata.metadata?.approval ?? "unknown",
        securityEffects: record.metadata.metadata?.securityEffects ?? [],
        verificationStatus: record.verification?.status ?? null,
        metrics: record.metrics,
    };
}
