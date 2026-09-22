import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { INTERACTION_SCHEMA_VERSION, toPublicInteraction, } from "./types.js";
const MAX_RECORDS_PER_SESSION = 50;
const MAX_PROMPT_LENGTH = 1_000;
const MAX_LABEL_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 240;
const MAX_CUSTOM_TEXT_LENGTH = 2_000;
const DEFAULT_INTERACTION_TTL_MS = 24 * 60 * 60 * 1_000;
const DEFAULT_INTERACTION_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;
function boundedText(value, field, maxLength, required = true) {
    const text = typeof value === "string" ? value.trim() : "";
    if (required && !text)
        throw new Error(`${field} is required`);
    if (text.length > maxLength)
        throw new Error(`${field} exceeds ${maxLength} characters`);
    return text;
}
function normalizeId(value, field) {
    const id = boundedText(value, field, 80);
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(id)) {
        throw new Error(`${field} must contain only letters, numbers, '_' or '-'`);
    }
    return id;
}
function normalizeQuestion(question) {
    const options = Array.isArray(question?.options) ? question.options : [];
    if (options.length > 5)
        throw new Error("An interaction supports at most 5 options");
    if (options.length < 2 && !question?.customInput?.enabled) {
        throw new Error("Provide at least 2 options, or enable custom input");
    }
    const seen = new Set();
    const normalizedOptions = options.map((option, index) => {
        const id = normalizeId(option?.id || `option_${index + 1}`, `options[${index}].id`);
        if (seen.has(id))
            throw new Error(`Duplicate option id: ${id}`);
        seen.add(id);
        return {
            id,
            label: boundedText(option?.label, `options[${index}].label`, MAX_LABEL_LENGTH),
            value: boundedText(option?.value ?? id, `options[${index}].value`, MAX_LABEL_LENGTH),
            description: boundedText(option?.description, `options[${index}].description`, MAX_DESCRIPTION_LENGTH, false) || undefined,
        };
    });
    const customInput = question?.customInput?.enabled
        ? {
            enabled: true,
            label: boundedText(question.customInput.label || "其他补充", "customInput.label", MAX_LABEL_LENGTH),
            placeholder: boundedText(question.customInput.placeholder, "customInput.placeholder", MAX_DESCRIPTION_LENGTH, false) || undefined,
            required: Boolean(question.customInput.required),
            maxLength: Math.max(1, Math.min(Number(question.customInput.maxLength) || 500, MAX_CUSTOM_TEXT_LENGTH)),
        }
        : undefined;
    return {
        id: normalizeId(question?.id || "primary", "question.id"),
        prompt: boundedText(question?.prompt, "question.prompt", MAX_PROMPT_LENGTH),
        selection: question?.selection === "multiple" ? "multiple" : "single",
        options: normalizedOptions,
        customInput,
    };
}
export class InteractionStore {
    rootDir;
    now;
    defaultTtlMs;
    retentionMs;
    runtimeId = crypto.randomUUID();
    transactionTails = new Map();
    listeners = new Set();
    expiryIndex = new Map();
    expiryTimer;
    constructor(options = {}) {
        const dataRoot = process.env.USER_DATA_PATH || process.cwd() || os.homedir();
        this.rootDir = options.rootDir || path.join(dataRoot, "data", "interactions");
        this.now = options.now || (() => Date.now());
        this.defaultTtlMs = options.defaultTtlMs ?? DEFAULT_INTERACTION_TTL_MS;
        this.retentionMs = options.retentionMs ?? DEFAULT_INTERACTION_RETENTION_MS;
        fs.mkdirSync(this.rootDir, { recursive: true });
        this.rebuildExpiryIndex();
        if (options.startExpiryTimer !== false) {
            this.expiryTimer = setInterval(() => void this.expireDue(), 30_000);
            this.expiryTimer.unref?.();
        }
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    close() {
        if (this.expiryTimer)
            clearInterval(this.expiryTimer);
        this.expiryTimer = undefined;
    }
    async create(input) {
        const sessionId = boundedText(input.sessionId, "sessionId", 300);
        const question = normalizeQuestion(input.question);
        let emitted = [];
        const created = await this.transaction(sessionId, state => {
            const now = this.now();
            const superseded = [];
            for (const record of state.records) {
                if (record.status !== "pending")
                    continue;
                record.status = "superseded";
                record.updatedAt = now;
                record.version += 1;
                superseded.push(structuredClone(record));
            }
            const request = {
                schemaVersion: INTERACTION_SCHEMA_VERSION,
                id: crypto.randomUUID(),
                version: 1,
                sessionId,
                turnId: boundedText(input.turnId, "turnId", 160, false) || undefined,
                traceId: boundedText(input.traceId, "traceId", 200, false) || undefined,
                kind: input.kind,
                origin: input.origin,
                question,
                status: "pending",
                createdAt: now,
                updatedAt: now,
                expiresAt: input.expiresAt && input.expiresAt > now
                    ? input.expiresAt
                    : now + this.defaultTtlMs,
                continuation: input.continuation
                    ? {
                        ...structuredClone(input.continuation),
                        ...(input.continuation.mode === "harness_approval" ? { runtimeId: this.runtimeId } : {}),
                    }
                    : undefined,
            };
            state.records.push(request);
            state.records = state.records.slice(-MAX_RECORDS_PER_SESSION);
            emitted = [...superseded, structuredClone(request)];
            return { value: structuredClone(request), changed: true };
        });
        for (const request of emitted)
            this.emit(request);
        return created;
    }
    async getPending(sessionId) {
        await this.expireSession(sessionId);
        return this.transaction(sessionId, state => ({
            value: structuredClone([...state.records].reverse().find(item => item.status === "pending")),
            changed: false,
        }));
    }
    async resolve(input) {
        const sessionId = boundedText(input.sessionId, "sessionId", 300);
        let emitted;
        const result = await this.transaction(sessionId, state => {
            const record = state.records.find(item => item.id === input.interactionId);
            if (!record)
                throw new Error("INTERACTION_NOT_FOUND");
            if (record.status !== "pending") {
                if (input.clientRequestId && record.resolution?.clientRequestId === input.clientRequestId) {
                    return { value: { request: structuredClone(record), changed: false }, changed: false };
                }
                throw new Error("INTERACTION_ALREADY_RESOLVED");
            }
            if (record.version !== input.version)
                throw new Error("INTERACTION_VERSION_CONFLICT");
            const now = this.now();
            const outcome = record.expiresAt && record.expiresAt <= now ? "expired" : input.outcome;
            const selected = [...new Set((input.selectedOptionIds || []).map(String))];
            const optionIds = new Set(record.question.options.map(option => option.id));
            if (outcome === "submitted") {
                if (selected.some(id => !optionIds.has(id)))
                    throw new Error("INTERACTION_INVALID_OPTION");
                if (record.question.selection === "single" && selected.length > 1) {
                    throw new Error("INTERACTION_TOO_MANY_OPTIONS");
                }
                const customText = boundedText(input.customText, "customText", record.question.customInput?.maxLength || MAX_CUSTOM_TEXT_LENGTH, false);
                if (record.question.customInput?.required && !customText)
                    throw new Error("INTERACTION_CUSTOM_TEXT_REQUIRED");
                if (selected.length === 0 && !customText)
                    throw new Error("INTERACTION_ANSWER_REQUIRED");
            }
            record.status = outcome;
            record.version += 1;
            record.updatedAt = now;
            record.resolution = {
                outcome,
                selectedOptionIds: selected.length > 0 ? selected : undefined,
                customText: boundedText(input.customText, "customText", record.question.customInput?.maxLength || MAX_CUSTOM_TEXT_LENGTH, false) || undefined,
                clientRequestId: boundedText(input.clientRequestId, "clientRequestId", 160, false) || undefined,
                resolvedAt: now,
            };
            emitted = structuredClone(record);
            return { value: { request: structuredClone(record), changed: true }, changed: true };
        });
        if (emitted)
            this.emit(emitted);
        return result;
    }
    async expireDue() {
        const expired = [];
        const dueSessions = [...this.expiryIndex.entries()]
            .filter(([, expiresAt]) => expiresAt <= this.now())
            .map(([sessionId]) => sessionId);
        for (const sessionId of dueSessions) {
            try {
                const request = await this.expireSession(sessionId);
                if (request)
                    expired.push(toPublicInteraction(request));
            }
            catch (error) {
                console.error(`[InteractionStore] Failed to expire ${sessionId}`, error);
            }
        }
        return expired;
    }
    async delete(sessionId) {
        await this.withKeyLock(sessionId, async () => {
            try {
                fs.unlinkSync(this.filePath(sessionId));
            }
            catch (error) {
                if (error?.code !== "ENOENT")
                    throw error;
            }
            this.expiryIndex.delete(sessionId);
        });
    }
    async expireSession(sessionId) {
        let emitted;
        const result = await this.transaction(sessionId, state => {
            const record = [...state.records].reverse().find(item => item.status === "pending");
            const approvalLostOnRestart = record?.continuation?.mode === "harness_approval"
                && record.continuation.runtimeId !== this.runtimeId;
            if (!record || (!approvalLostOnRestart && (!record.expiresAt || record.expiresAt > this.now()))) {
                return { value: undefined, changed: false };
            }
            const now = this.now();
            record.status = approvalLostOnRestart ? "cancelled" : "expired";
            record.version += 1;
            record.updatedAt = now;
            record.resolution = { outcome: approvalLostOnRestart ? "cancelled" : "expired", resolvedAt: now };
            emitted = structuredClone(record);
            return { value: structuredClone(record), changed: true };
        });
        if (emitted)
            this.emit(emitted);
        return result;
    }
    emit(request) {
        const publicRequest = toPublicInteraction(request);
        for (const listener of this.listeners) {
            try {
                listener(publicRequest);
            }
            catch (error) {
                console.error("[InteractionStore] Listener failed", error);
            }
        }
    }
    async transaction(sessionId, mutate) {
        return this.withKeyLock(sessionId, async () => {
            const state = this.load(sessionId);
            const normalized = this.normalizeState(state);
            const result = mutate(state);
            if (result.changed || normalized) {
                if (state.records.length > 0)
                    this.save(state);
                else
                    this.removeFile(state.sessionId);
            }
            else {
                this.updateExpiryIndex(state);
            }
            return result.value;
        });
    }
    async withKeyLock(key, operation) {
        const previous = this.transactionTails.get(key) || Promise.resolve();
        let release;
        const current = new Promise(resolve => { release = resolve; });
        const tail = previous.catch(() => undefined).then(() => current);
        this.transactionTails.set(key, tail);
        await previous.catch(() => undefined);
        try {
            return await operation();
        }
        finally {
            release();
            if (this.transactionTails.get(key) === tail)
                this.transactionTails.delete(key);
        }
    }
    load(sessionId) {
        const filePath = this.filePath(sessionId);
        if (!fs.existsSync(filePath))
            return { schemaVersion: 1, sessionId, records: [] };
        const state = JSON.parse(fs.readFileSync(filePath, "utf8"));
        if (state.sessionId !== sessionId)
            throw new Error(`Interaction key mismatch in ${filePath}`);
        return state;
    }
    normalizeState(state) {
        let changed = false;
        const cutoff = this.now() - this.retentionMs;
        const retained = state.records.filter((record) => {
            if (record.status === "pending") {
                if (!record.expiresAt) {
                    record.expiresAt = Math.max(this.now(), record.updatedAt) + this.defaultTtlMs;
                    changed = true;
                }
                return true;
            }
            const keep = record.updatedAt > cutoff;
            if (!keep)
                changed = true;
            return keep;
        });
        if (retained.length !== state.records.length)
            state.records = retained;
        return changed;
    }
    updateExpiryIndex(state) {
        const nextExpiry = state.records
            .filter((record) => record.status === "pending" && record.expiresAt !== undefined)
            .reduce((earliest, record) => (earliest === undefined ? record.expiresAt : Math.min(earliest, record.expiresAt)), undefined);
        if (nextExpiry === undefined)
            this.expiryIndex.delete(state.sessionId);
        else
            this.expiryIndex.set(state.sessionId, nextExpiry);
    }
    rebuildExpiryIndex() {
        if (!fs.existsSync(this.rootDir))
            return;
        for (const name of fs.readdirSync(this.rootDir)) {
            if (!name.endsWith(".json"))
                continue;
            const file = path.join(this.rootDir, name);
            try {
                const state = JSON.parse(fs.readFileSync(file, "utf8"));
                if (!state?.sessionId || !Array.isArray(state.records))
                    continue;
                if (this.normalizeState(state)) {
                    if (state.records.length > 0)
                        this.save(state);
                    else
                        this.removeFile(state.sessionId);
                }
                else {
                    this.updateExpiryIndex(state);
                }
            }
            catch (error) {
                console.error(`[InteractionStore] Failed to recover ${name}`, error);
            }
        }
    }
    save(state) {
        fs.mkdirSync(this.rootDir, { recursive: true });
        const filePath = this.filePath(state.sessionId);
        const tempPath = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
        let descriptor;
        try {
            descriptor = fs.openSync(tempPath, "wx", 0o600);
            fs.writeFileSync(descriptor, JSON.stringify(state, null, 2), "utf8");
            fs.fsyncSync(descriptor);
            fs.closeSync(descriptor);
            descriptor = undefined;
            fs.renameSync(tempPath, filePath);
            try {
                const directoryDescriptor = fs.openSync(this.rootDir, "r");
                try {
                    fs.fsyncSync(directoryDescriptor);
                }
                finally {
                    fs.closeSync(directoryDescriptor);
                }
            }
            catch { /* directory fsync is unavailable on some Windows filesystems */ }
            this.updateExpiryIndex(state);
        }
        catch (error) {
            if (descriptor !== undefined) {
                try {
                    fs.closeSync(descriptor);
                }
                catch { /* best effort */ }
            }
            try {
                fs.unlinkSync(tempPath);
            }
            catch { /* best effort */ }
            throw error;
        }
    }
    removeFile(sessionId) {
        try {
            fs.unlinkSync(this.filePath(sessionId));
        }
        catch (error) {
            if (error?.code !== "ENOENT")
                throw error;
        }
        this.expiryIndex.delete(sessionId);
    }
    filePath(sessionId) {
        return path.join(this.rootDir, `${crypto.createHash("sha256").update(sessionId).digest("hex")}.json`);
    }
}
let defaultInteractionStore;
export function getInteractionStore() {
    if (!defaultInteractionStore)
        defaultInteractionStore = new InteractionStore();
    return defaultInteractionStore;
}
