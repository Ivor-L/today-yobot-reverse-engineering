import { createHash, randomBytes, randomUUID } from "node:crypto";
import path from "node:path";
import fs from "fs-extra";
import { stableTraceHash } from "./context_projection_trace.js";
export const APPROVAL_RECEIPT_VERSION = "turn-bound-approval-v1";
export const DEFAULT_APPROVAL_TTL_MS = 10 * 60 * 1_000;
function hash(value) {
    return createHash("sha256").update(value).digest("hex");
}
function bindingHash(value, fallback) {
    return hash((value || fallback).trim());
}
export function parseApprovalCommand(userText) {
    const normalized = userText.trim();
    const approved = normalized.match(/^(?:确认执行|确认|approve)\s+([A-Z0-9_-]{10,80})$/i);
    if (approved)
        return { action: "approve", token: approved[1] };
    const denied = normalized.match(/^(?:取消执行|拒绝|deny)\s+([A-Z0-9_-]{10,80})$/i);
    if (denied)
        return { action: "deny", token: denied[1] };
    const simple = normalized.replace(/[。.!！]$/, "").trim().toLowerCase();
    if (new Set([
        "确认", "确认执行", "确认创建", "确认修改", "确认写入", "确认保存", "确认删除", "确认移动",
        "继续执行", "approve",
    ]).has(simple))
        return { action: "approve" };
    if (new Set(["取消", "取消执行", "拒绝", "不执行", "不要执行", "deny"]).has(simple)) {
        return { action: "deny" };
    }
    return undefined;
}
export class ApprovalChallengeStore {
    filePath;
    bootId;
    now;
    records = [];
    tokensById = new Map();
    /** Raw arguments stay process-local and are discarded on restart/expiry/branch invalidation. */
    argsById = new Map();
    loaded = false;
    tail = Promise.resolve();
    constructor(filePath = path.resolve(process.env.USER_DATA_PATH || process.cwd(), "data", "harness", "tool-approvals.json"), bootId = randomUUID(), now = Date.now) {
        this.filePath = filePath;
        this.bootId = bootId;
        this.now = now;
    }
    async load() {
        if (this.loaded)
            return;
        this.loaded = true;
        try {
            const saved = await fs.readJson(this.filePath);
            this.records = Array.isArray(saved?.records) ? saved.records : [];
        }
        catch (error) {
            if (error?.code !== "ENOENT")
                console.warn("[Approval] Failed to load approval audit store:", error);
            this.records = [];
        }
        let changed = false;
        for (const record of this.records) {
            if (record.status === "pending" && record.bootId !== this.bootId) {
                record.status = "restart_invalidated";
                record.decidedAt = this.now();
                this.argsById.delete(record.id);
                changed = true;
            }
            else if (record.status === "pending" && record.expiresAt <= this.now()) {
                record.status = "expired";
                record.decidedAt = this.now();
                this.argsById.delete(record.id);
                changed = true;
            }
        }
        if (changed)
            await this.persist();
    }
    async persist() {
        await fs.ensureDir(path.dirname(this.filePath));
        // Terminal audit history is bounded, but a still-valid approval must never disappear merely
        // because unrelated traffic crossed the retention limit.
        const pending = this.records.filter((record) => record.status === "pending");
        const terminal = this.records
            .filter((record) => record.status !== "pending")
            .slice(-Math.max(0, 1_000 - pending.length));
        const retained = [...terminal, ...pending].sort((a, b) => a.createdAt - b.createdAt);
        this.records = retained;
        const retainedIds = new Set(retained.map((record) => record.id));
        for (const id of this.argsById.keys()) {
            if (!retainedIds.has(id))
                this.argsById.delete(id);
        }
        const tempPath = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
        await fs.writeJson(tempPath, { schemaVersion: 1, records: retained }, { spaces: 2 });
        await fs.move(tempPath, this.filePath, { overwrite: true });
    }
    locked(operation) {
        const result = this.tail.then(operation, operation);
        this.tail = result.then(() => undefined, () => undefined);
        return result;
    }
    projectedBinding(binding) {
        return {
            channelHash: bindingHash(binding.channel, "unknown-channel"),
            sessionHash: bindingHash(binding.sessionId, "unknown-session"),
            userHash: bindingHash(binding.userId, `anonymous:${binding.channel}:${binding.sessionId}`),
            traceHash: bindingHash(binding.traceId, "missing-trace"),
        };
    }
    async decide(binding, request, signal, ttlMs = DEFAULT_APPROVAL_TTL_MS) {
        return this.locked(async () => {
            await this.load();
            if (signal?.aborted)
                return { decision: "denied", code: "aborted_by_user" };
            const projected = this.projectedBinding(binding);
            const argsHash = stableTraceHash(request.args);
            const command = parseApprovalCommand(binding.userText);
            if (command) {
                const boundPending = [...this.records].reverse().filter((item) => (item.status === "pending"
                    && item.bootId === this.bootId
                    && item.expiresAt > this.now()
                    && item.channelHash === projected.channelHash
                    && item.sessionHash === projected.sessionHash
                    && item.userHash === projected.userHash
                    && item.issuedTraceHash !== projected.traceHash
                    && item.toolName === request.toolName));
                const record = command.token
                    ? [...this.records].reverse().find((item) => item.tokenHash === hash(command.token))
                    : boundPending.length === 1 ? boundPending[0] : undefined;
                if (!record) {
                    return {
                        decision: "denied",
                        code: command.token ? "approval_token_unknown" : "approval_not_found_or_ambiguous",
                        message: command.token
                            ? "Approval token is unknown."
                            : "No single pending operation matches this confirmation in the current session.",
                    };
                }
                const approvedArgs = this.argsById.get(record.id);
                const valid = record.status === "pending"
                    && record.bootId === this.bootId
                    && record.expiresAt > this.now()
                    && record.channelHash === projected.channelHash
                    && record.sessionHash === projected.sessionHash
                    && record.userHash === projected.userHash
                    && record.issuedTraceHash !== projected.traceHash
                    && record.toolName === request.toolName
                    && (command.action === "deny" || approvedArgs !== undefined);
                if (!valid) {
                    return {
                        decision: "denied",
                        code: record.expiresAt <= this.now() ? "approval_expired" : "approval_binding_mismatch",
                        message: "Approval is expired, already used, or does not match this user, session, tool, and bound operation.",
                    };
                }
                record.status = command.action === "approve" ? "approved" : "denied";
                record.decidedAt = this.now();
                this.tokensById.delete(record.id);
                this.argsById.delete(record.id);
                await this.persist();
                return command.action === "approve"
                    ? { decision: "approved", code: "approval_granted", approvedArgs }
                    : { decision: "denied", code: "approval_denied", message: "User denied the tool call." };
            }
            const existing = [...this.records].reverse().find((item) => (item.status === "pending"
                && item.bootId === this.bootId
                && item.expiresAt > this.now()
                && item.channelHash === projected.channelHash
                && item.sessionHash === projected.sessionHash
                && item.userHash === projected.userHash
                && item.issuedTraceHash === projected.traceHash
                && item.toolName === request.toolName
                && item.argsHash === argsHash));
            if (existing) {
                const existingToken = this.tokensById.get(existing.id);
                if (existingToken) {
                    return {
                        decision: "pending",
                        code: "approval_pending",
                        challengeToken: existingToken,
                        expiresAt: existing.expiresAt,
                    };
                }
                existing.status = "restart_invalidated";
                existing.decidedAt = this.now();
                this.argsById.delete(existing.id);
            }
            const token = `APR-${randomBytes(12).toString("base64url").toUpperCase()}`;
            const createdAt = this.now();
            // A short “确认” reply is safe only when one pending operation exists for the bound user and
            // session. A newer request therefore supersedes older unconsumed requests in that scope.
            for (const pending of this.records) {
                if (pending.status === "pending"
                    && pending.bootId === this.bootId
                    && pending.channelHash === projected.channelHash
                    && pending.sessionHash === projected.sessionHash
                    && pending.userHash === projected.userHash) {
                    pending.status = "superseded";
                    pending.decidedAt = createdAt;
                    this.tokensById.delete(pending.id);
                    this.argsById.delete(pending.id);
                }
            }
            const record = {
                id: request.id,
                version: APPROVAL_RECEIPT_VERSION,
                bootId: this.bootId,
                status: "pending",
                tokenHash: hash(token),
                channelHash: projected.channelHash,
                sessionHash: projected.sessionHash,
                userHash: projected.userHash,
                issuedTraceHash: projected.traceHash,
                toolName: request.toolName,
                argsHash,
                createdAt,
                expiresAt: createdAt + Math.max(30_000, Math.min(ttlMs, 30 * 60_000)),
            };
            this.records.push(record);
            this.tokensById.set(record.id, token);
            this.argsById.set(record.id, structuredClone(request.args));
            await this.persist();
            return {
                decision: "pending",
                code: "approval_pending",
                challengeToken: token,
                expiresAt: record.expiresAt,
            };
        });
    }
    /** Consume an explicit user cancellation even when the model correctly chooses not to call a tool. */
    async cancelPending(binding) {
        return this.locked(async () => {
            await this.load();
            const command = parseApprovalCommand(binding.userText);
            if (command?.action !== "deny")
                return 0;
            const projected = this.projectedBinding(binding);
            const candidates = this.records.filter((record) => (record.status === "pending"
                && record.bootId === this.bootId
                && record.expiresAt > this.now()
                && record.channelHash === projected.channelHash
                && record.sessionHash === projected.sessionHash
                && record.userHash === projected.userHash
                && record.issuedTraceHash !== projected.traceHash
                && (!command.token || record.tokenHash === hash(command.token))));
            if (candidates.length !== 1)
                return 0;
            const record = candidates[0];
            record.status = "denied";
            record.decidedAt = this.now();
            this.tokensById.delete(record.id);
            this.argsById.delete(record.id);
            await this.persist();
            return 1;
        });
    }
    /** A rewind/branch change invalidates every pending receipt issued on the abandoned lineage. */
    async invalidateSessionBranch(sessionId) {
        return this.locked(async () => {
            await this.load();
            const sessionHash = bindingHash(sessionId, "unknown-session");
            let invalidated = 0;
            for (const record of this.records) {
                if (record.status !== "pending" || record.sessionHash !== sessionHash)
                    continue;
                record.status = "branch_invalidated";
                record.decidedAt = this.now();
                this.tokensById.delete(record.id);
                this.argsById.delete(record.id);
                invalidated += 1;
            }
            if (invalidated > 0)
                await this.persist();
            return invalidated;
        });
    }
}
let defaultApprovalStore;
export function getApprovalChallengeStore() {
    if (!defaultApprovalStore)
        defaultApprovalStore = new ApprovalChallengeStore();
    return defaultApprovalStore;
}
export function createTurnBoundApprovalHandler(binding, store = getApprovalChallengeStore()) {
    // A short confirmation authorizes exactly one receipt-bound operation. If the approved tool
    // succeeds and the model then reaches another protected step in the same turn, that new step
    // must create its own challenge instead of trying to consume the already-used confirmation.
    let approvalConsumed = false;
    return async (request, signal) => {
        const outcome = await store.decide(approvalConsumed ? { ...binding, userText: "" } : binding, request, signal);
        if (outcome.decision === "approved")
            approvalConsumed = true;
        return outcome;
    };
}
