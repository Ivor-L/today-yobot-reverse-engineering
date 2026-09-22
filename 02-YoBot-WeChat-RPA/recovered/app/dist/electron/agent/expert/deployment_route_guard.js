import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
const ROUTE_GUARD_SCHEMA_VERSION = 1;
const SHA256 = /^sha256:[a-f0-9]{64}$/;
function hash(value) {
    return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
}
export function expertRpaRouteDigest(input) {
    return hash(JSON.stringify([
        "rpa",
        input.accountId,
        input.profileId,
        input.upstreamBindingId ?? null,
    ]));
}
function bindingRoute(binding) {
    return {
        accountId: binding.channel.accountId,
        profileId: binding.expertRef.profileId,
        upstreamBindingId: binding.channel.upstreamBindingId,
    };
}
function bindingIdDigest(bindingId) {
    return hash(bindingId);
}
function stateFor(binding) {
    if (binding.status === "active")
        return "active";
    if (binding.status === "retired")
        return "retired";
    if (binding.status !== "suspended")
        return undefined;
    return binding.suspension?.mode === "rollback_legacy" ? "rollback_legacy" : "fail_closed";
}
function isRecord(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return false;
    const record = value;
    const keys = Object.keys(record).sort();
    const expected = ["bindingIdDigest", "bindingRevision", "routeDigest", "state", "updatedAt"].sort();
    return JSON.stringify(keys) === JSON.stringify(expected)
        && typeof record.routeDigest === "string"
        && SHA256.test(record.routeDigest)
        && typeof record.bindingIdDigest === "string"
        && SHA256.test(record.bindingIdDigest)
        && ["active", "fail_closed", "rollback_legacy", "retired", "blocked"].includes(String(record.state))
        && Number.isInteger(record.bindingRevision)
        && Number(record.bindingRevision) >= 1
        && Number.isInteger(record.updatedAt)
        && Number(record.updatedAt) >= 1;
}
function sameRecord(left, right) {
    return Boolean(left
        && left.routeDigest === right.routeDigest
        && left.bindingIdDigest === right.bindingIdDigest
        && left.state === right.state
        && left.bindingRevision === right.bindingRevision
        && left.updatedAt === right.updatedAt);
}
/**
 * Privacy-safe continuity ledger stored separately from current deployment bindings. It records
 * only hashes and lifecycle state, so losing a current binding cannot silently reopen legacy.
 */
export class ExpertDeploymentRouteGuardStore {
    filePath;
    now;
    records = new Map();
    loaded = false;
    constructor(filePath, now = Date.now) {
        this.filePath = filePath;
        this.now = now;
    }
    load() {
        if (!fs.existsSync(this.filePath)) {
            this.records = new Map();
            this.loaded = true;
            return;
        }
        const raw = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
        if (raw.schemaVersion !== ROUTE_GUARD_SCHEMA_VERSION || !Array.isArray(raw.records)
            || Object.keys(raw).sort().join(",") !== ["records", "schemaVersion"].sort().join(",")) {
            throw new Error("Expert route guard has an unsupported or invalid shape.");
        }
        const next = new Map();
        for (const value of raw.records) {
            if (!isRecord(value) || next.has(value.routeDigest)) {
                throw new Error("Expert route guard contains an invalid or duplicate record.");
            }
            next.set(value.routeDigest, structuredClone(value));
        }
        this.records = next;
        this.loaded = true;
    }
    get(input) {
        return this.getByDigest(expertRpaRouteDigest(input));
    }
    getByDigest(routeDigest) {
        const record = this.records.get(routeDigest);
        return record ? structuredClone(record) : undefined;
    }
    list() {
        return [...this.records.values()]
            .sort((left, right) => left.routeDigest.localeCompare(right.routeDigest))
            .map((record) => structuredClone(record));
    }
    matches(record, binding) {
        const expectedState = stateFor(binding) ?? "blocked";
        return record.routeDigest === expertRpaRouteDigest(bindingRoute(binding))
            && record.bindingIdDigest === bindingIdDigest(binding.bindingId)
            && record.bindingRevision === binding.revision
            && record.state === expectedState;
    }
    /**
     * Reconcile guards after loading bindings. A guard that is newer or points at another binding
     * is never overwritten automatically; its route is returned as inconsistent and must block.
     */
    reconcile(bindings, historicallyProtectedBindingIds = new Set()) {
        this.assertLoaded();
        const next = new Map(this.records);
        const inconsistent = new Set();
        let changed = false;
        for (const binding of bindings) {
            const routeDigest = expertRpaRouteDigest(bindingRoute(binding));
            const existing = next.get(routeDigest);
            const desiredState = stateFor(binding)
                ?? ((existing || historicallyProtectedBindingIds.has(binding.bindingId)) ? "blocked" : undefined);
            if (!desiredState)
                continue;
            const digest = bindingIdDigest(binding.bindingId);
            if (existing && (existing.bindingIdDigest !== digest || existing.bindingRevision > binding.revision)) {
                inconsistent.add(routeDigest);
                continue;
            }
            if (existing
                && existing.bindingIdDigest === digest
                && existing.state === desiredState
                && existing.bindingRevision === binding.revision) {
                continue;
            }
            const desired = {
                routeDigest,
                bindingIdDigest: digest,
                state: desiredState,
                bindingRevision: binding.revision,
                updatedAt: Math.max(binding.updatedAt, this.now()),
            };
            if (!sameRecord(existing, desired)) {
                next.set(routeDigest, desired);
                changed = true;
            }
        }
        if (changed)
            this.commit(next);
        return [...inconsistent];
    }
    /** Commit guard state before the binding transition. A partial failure therefore blocks. */
    protectTransition(current, nextBinding) {
        this.assertLoaded();
        const next = new Map(this.records);
        const oldRouteDigest = current ? expertRpaRouteDigest(bindingRoute(current)) : undefined;
        const newRouteDigest = expertRpaRouteDigest(bindingRoute(nextBinding));
        const oldRecord = oldRouteDigest ? next.get(oldRouteDigest) : undefined;
        const wasProtected = Boolean(oldRecord
            || (current && (current.status === "active" || current.status === "suspended")));
        if (current && oldRouteDigest !== newRouteDigest && wasProtected) {
            next.set(oldRouteDigest, {
                routeDigest: oldRouteDigest,
                bindingIdDigest: bindingIdDigest(current.bindingId),
                state: "retired",
                bindingRevision: nextBinding.revision,
                updatedAt: Math.max(nextBinding.updatedAt, this.now()),
            });
        }
        const desiredState = stateFor(nextBinding) ?? (next.has(newRouteDigest) ? "blocked" : undefined);
        if (desiredState) {
            next.set(newRouteDigest, {
                routeDigest: newRouteDigest,
                bindingIdDigest: bindingIdDigest(nextBinding.bindingId),
                state: desiredState,
                bindingRevision: nextBinding.revision,
                updatedAt: Math.max(nextBinding.updatedAt, this.now()),
            });
        }
        if (desiredState || (oldRouteDigest !== newRouteDigest && wasProtected))
            this.commit(next);
    }
    assertLoaded() {
        if (!this.loaded)
            throw new Error("Expert route guard must be loaded before use.");
    }
    commit(records) {
        const payload = {
            schemaVersion: ROUTE_GUARD_SCHEMA_VERSION,
            records: [...records.values()].sort((left, right) => left.routeDigest.localeCompare(right.routeDigest)),
        };
        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
        const temporary = path.join(path.dirname(this.filePath), `.${path.basename(this.filePath)}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`);
        let descriptor;
        try {
            descriptor = fs.openSync(temporary, "wx", 0o600);
            fs.writeFileSync(descriptor, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
            fs.fsyncSync(descriptor);
            fs.closeSync(descriptor);
            descriptor = undefined;
            fs.renameSync(temporary, this.filePath);
            this.records = records;
        }
        finally {
            if (descriptor !== undefined)
                fs.closeSync(descriptor);
            try {
                if (fs.existsSync(temporary))
                    fs.unlinkSync(temporary);
            }
            catch { /* best effort */ }
        }
    }
}
