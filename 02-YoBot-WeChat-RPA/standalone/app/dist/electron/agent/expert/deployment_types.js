import * as crypto from "node:crypto";
import { EXPERT_CAPABILITY_IDS, } from "./types.js";
export const EXPERT_DEPLOYMENT_SCHEMA_VERSION = 1;
export const EXPERT_TRUST_ZONES = [
    "local_owner",
    "parent_agent",
    "external_customer",
    "unattended",
];
export const EXPERT_DEPLOYMENT_STATUSES = [
    "draft",
    "disabled",
    "active",
    "suspended",
    "retired",
];
export class ExpertDeploymentValidationError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = "ExpertDeploymentValidationError";
    }
}
export const RPA_EXTERNAL_CUSTOMER_CAPABILITY_CEILING = ["knowledge.read"];
const BINDING_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const STABLE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const SHA256 = /^sha256:[a-f0-9]{64}$/;
function object(value, label) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new ExpertDeploymentValidationError(`${label} must be an object.`, "invalid_shape");
    }
    return value;
}
function exactKeys(value, allowed, label) {
    const known = new Set(allowed);
    const unknown = Object.keys(value).filter((key) => !known.has(key));
    if (unknown.length > 0) {
        throw new ExpertDeploymentValidationError(`${label} contains unsupported field(s): ${unknown.sort().join(", ")}.`, "invalid_shape");
    }
}
function text(value, label, maxLength = 512) {
    if (typeof value !== "string" || !value.trim() || value.length > maxLength || /[\u0000-\u001f]/.test(value)) {
        throw new ExpertDeploymentValidationError(`${label} must be a valid non-empty string.`, "invalid_shape");
    }
    return value.trim();
}
function stableId(value, label) {
    const result = text(value, label, 128);
    if (!STABLE_ID.test(result)) {
        throw new ExpertDeploymentValidationError(`${label} is invalid.`, "invalid_shape");
    }
    return result;
}
function integer(value, label, min, max = Number.MAX_SAFE_INTEGER) {
    if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) {
        throw new ExpertDeploymentValidationError(`${label} must be an integer in [${min}, ${max}].`, "invalid_shape");
    }
    return Number(value);
}
function literal(value, allowed, label) {
    if (typeof value !== "string" || !allowed.includes(value)) {
        throw new ExpertDeploymentValidationError(`${label} has an unsupported value.`, "invalid_shape");
    }
    return value;
}
function strings(value, label, maxItems = 100) {
    if (!Array.isArray(value) || value.length > maxItems) {
        throw new ExpertDeploymentValidationError(`${label} must be an array with at most ${maxItems} items.`, "invalid_shape");
    }
    const result = value.map((item, index) => text(item, `${label}[${index}]`));
    if (new Set(result).size !== result.length) {
        throw new ExpertDeploymentValidationError(`${label} must not contain duplicates.`, "invalid_shape");
    }
    return result.sort();
}
function stableDigest(value) {
    return `sha256:${crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}
function policyProjection(binding) {
    return {
        schemaVersion: binding.schemaVersion,
        bindingIdHash: stableDigest(binding.bindingId),
        expertRef: binding.expertRef,
        channel: {
            kind: binding.channel.kind,
            routeHash: stableDigest({
                upstreamBindingId: binding.channel.upstreamBindingId ?? null,
                accountId: binding.channel.accountId,
                botId: binding.channel.botId ?? null,
            }),
        },
        trustZone: binding.trustZone,
        contextPolicy: binding.contextPolicy,
        capabilityGrant: {
            capabilities: [...binding.capabilityGrant.capabilities].sort(),
            knowledgeNamespaces: [...binding.capabilityGrant.knowledgeNamespaces].sort(),
            resourceScopes: [...binding.capabilityGrant.resourceScopes].sort(),
            deniedTools: [...binding.capabilityGrant.deniedTools].sort(),
        },
        approvalPolicy: binding.approvalPolicy,
        deliveryPolicy: binding.deliveryPolicy,
    };
}
export function expertDeploymentPolicyDigest(binding) {
    return stableDigest(policyProjection(binding));
}
export function parseExpertDeploymentBinding(value) {
    const root = object(value, "deployment binding");
    exactKeys(root, [
        "schemaVersion", "bindingId", "revision", "status", "expertRef", "channel", "trustZone",
        "contextPolicy", "capabilityGrant", "approvalPolicy", "deliveryPolicy", "suspension", "policyDigest",
        "createdAt", "updatedAt",
    ], "deployment binding");
    if (root.schemaVersion !== EXPERT_DEPLOYMENT_SCHEMA_VERSION) {
        throw new ExpertDeploymentValidationError(`Unsupported deployment schemaVersion: ${String(root.schemaVersion)}.`, "unsupported_version");
    }
    const bindingId = text(root.bindingId, "bindingId", 128);
    if (!BINDING_ID.test(bindingId)) {
        throw new ExpertDeploymentValidationError("bindingId is invalid.", "invalid_shape");
    }
    const expertRef = object(root.expertRef, "expertRef");
    exactKeys(expertRef, ["definitionId", "definitionVersion", "profileId", "packageDigest"], "expertRef");
    const packageDigest = text(expertRef.packageDigest, "expertRef.packageDigest", 72);
    if (!SHA256.test(packageDigest)) {
        throw new ExpertDeploymentValidationError("expertRef.packageDigest must be a sha256 digest.", "invalid_shape");
    }
    const channel = object(root.channel, "channel");
    exactKeys(channel, ["kind", "upstreamBindingId", "accountId", "botId"], "channel");
    if (channel.kind !== "rpa") {
        throw new ExpertDeploymentValidationError("channel.kind must be rpa in schema v1.", "invalid_shape");
    }
    const context = object(root.contextPolicy, "contextPolicy");
    exactKeys(context, ["owner", "mode", "maxTurns", "maxTokens", "memoryRead", "memoryWrite"], "contextPolicy");
    if (context.owner !== "channel" || context.mode !== "conversation"
        || context.memoryRead !== null || context.memoryWrite !== null) {
        throw new ExpertDeploymentValidationError("RPA contextPolicy must be channel-owned conversation context with memory disabled.", "invalid_shape");
    }
    const grant = object(root.capabilityGrant, "capabilityGrant");
    exactKeys(grant, ["capabilities", "knowledgeNamespaces", "resourceScopes", "deniedTools"], "capabilityGrant");
    const knownCapabilities = new Set(EXPERT_CAPABILITY_IDS);
    const capabilities = strings(grant.capabilities, "capabilityGrant.capabilities")
        .map((item) => {
        if (!knownCapabilities.has(item)) {
            throw new ExpertDeploymentValidationError(`Unknown capability: ${item}.`, "invalid_shape");
        }
        return item;
    });
    const ceiling = new Set(RPA_EXTERNAL_CUSTOMER_CAPABILITY_CEILING);
    const unsafe = capabilities.filter((capability) => !ceiling.has(capability));
    if (unsafe.length > 0) {
        throw new ExpertDeploymentValidationError(`RPA external-customer deployment cannot grant: ${unsafe.join(", ")}.`, "unsafe_capability");
    }
    const knowledgeNamespaces = strings(grant.knowledgeNamespaces, "capabilityGrant.knowledgeNamespaces");
    const resourceScopes = strings(grant.resourceScopes, "capabilityGrant.resourceScopes");
    if (resourceScopes.length > 0) {
        throw new ExpertDeploymentValidationError("RPA external-customer deployment does not accept generic resource scopes.", "unsafe_capability");
    }
    if (capabilities.includes("knowledge.read") !== (knowledgeNamespaces.length > 0)) {
        throw new ExpertDeploymentValidationError("knowledge.read requires at least one namespace, and namespaces require knowledge.read.", "invalid_shape");
    }
    const approval = object(root.approvalPolicy, "approvalPolicy");
    exactKeys(approval, ["mode", "onBlocked"], "approvalPolicy");
    if (approval.mode !== "none") {
        throw new ExpertDeploymentValidationError("RPA approvalPolicy.mode must be none.", "invalid_shape");
    }
    const delivery = object(root.deliveryPolicy, "deliveryPolicy");
    exactKeys(delivery, ["owner", "requireIdempotencyKey"], "deliveryPolicy");
    if (delivery.owner !== "rpa_adapter" || delivery.requireIdempotencyKey !== true) {
        throw new ExpertDeploymentValidationError("RPA delivery must remain owned by the adapter and require idempotency.", "invalid_shape");
    }
    let suspension;
    if (root.suspension !== undefined) {
        const value = object(root.suspension, "suspension");
        exactKeys(value, ["mode", "reason", "at"], "suspension");
        suspension = {
            mode: literal(value.mode, ["rollback_legacy", "fail_closed"], "suspension.mode"),
            reason: text(value.reason, "suspension.reason", 256),
            at: integer(value.at, "suspension.at", 1),
        };
    }
    if (root.status !== "suspended" && suspension !== undefined) {
        throw new ExpertDeploymentValidationError("suspension metadata is valid only when status is suspended.", "invalid_shape");
    }
    const parsedWithoutDigest = {
        schemaVersion: EXPERT_DEPLOYMENT_SCHEMA_VERSION,
        bindingId,
        revision: integer(root.revision, "revision", 1),
        status: literal(root.status, EXPERT_DEPLOYMENT_STATUSES, "status"),
        expertRef: {
            definitionId: stableId(expertRef.definitionId, "expertRef.definitionId"),
            definitionVersion: text(expertRef.definitionVersion, "expertRef.definitionVersion", 128),
            profileId: stableId(expertRef.profileId, "expertRef.profileId"),
            packageDigest,
        },
        channel: {
            kind: "rpa",
            ...(channel.upstreamBindingId === undefined
                ? {}
                : { upstreamBindingId: text(channel.upstreamBindingId, "channel.upstreamBindingId", 256) }),
            accountId: text(channel.accountId, "channel.accountId", 256),
            ...(channel.botId === undefined ? {} : { botId: text(channel.botId, "channel.botId", 256) }),
        },
        trustZone: literal(root.trustZone, ["external_customer"], "trustZone"),
        contextPolicy: {
            owner: "channel",
            mode: "conversation",
            maxTurns: integer(context.maxTurns, "contextPolicy.maxTurns", 1, 100),
            maxTokens: integer(context.maxTokens, "contextPolicy.maxTokens", 256, 128_000),
            memoryRead: null,
            memoryWrite: null,
        },
        capabilityGrant: {
            capabilities,
            knowledgeNamespaces,
            resourceScopes,
            deniedTools: strings(grant.deniedTools, "capabilityGrant.deniedTools"),
        },
        approvalPolicy: {
            mode: "none",
            onBlocked: literal(approval.onBlocked, ["defer", "handoff"], "approvalPolicy.onBlocked"),
        },
        deliveryPolicy: { owner: "rpa_adapter", requireIdempotencyKey: true },
        ...(suspension ? { suspension } : {}),
        createdAt: integer(root.createdAt, "createdAt", 1),
        updatedAt: integer(root.updatedAt, "updatedAt", 1),
    };
    if (parsedWithoutDigest.updatedAt < parsedWithoutDigest.createdAt) {
        throw new ExpertDeploymentValidationError("updatedAt must not precede createdAt.", "invalid_shape");
    }
    const policyDigest = text(root.policyDigest, "policyDigest", 72);
    if (!SHA256.test(policyDigest) || policyDigest !== expertDeploymentPolicyDigest(parsedWithoutDigest)) {
        throw new ExpertDeploymentValidationError("Deployment policyDigest does not match the binding policy.", "invalid_policy_digest");
    }
    return { ...parsedWithoutDigest, policyDigest };
}
export function createRpaExpertDeploymentBinding(input) {
    const now = input.now ?? Date.now();
    const withoutDigest = {
        schemaVersion: EXPERT_DEPLOYMENT_SCHEMA_VERSION,
        bindingId: input.bindingId,
        revision: 1,
        status: input.status ?? "draft",
        expertRef: { ...input.expertRef },
        channel: { ...input.channel },
        trustZone: "external_customer",
        contextPolicy: {
            owner: "channel",
            mode: "conversation",
            maxTurns: input.maxTurns ?? 30,
            maxTokens: input.maxTokens ?? 12_000,
            memoryRead: null,
            memoryWrite: null,
        },
        capabilityGrant: {
            capabilities: [...(input.capabilityGrant?.capabilities ?? [])],
            knowledgeNamespaces: [...(input.capabilityGrant?.knowledgeNamespaces ?? [])],
            resourceScopes: [...(input.capabilityGrant?.resourceScopes ?? [])],
            deniedTools: [...(input.capabilityGrant?.deniedTools ?? [])],
        },
        approvalPolicy: { mode: "none", onBlocked: input.onBlocked ?? "defer" },
        deliveryPolicy: { owner: "rpa_adapter", requireIdempotencyKey: true },
        createdAt: now,
        updatedAt: now,
    };
    return parseExpertDeploymentBinding({
        ...withoutDigest,
        policyDigest: expertDeploymentPolicyDigest(withoutDigest),
    });
}
