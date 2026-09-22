import * as fs from "node:fs";
import * as path from "node:path";
import { expertDeploymentPolicyDigest, parseExpertDeploymentBinding, } from "./deployment_types.js";
import { ExpertDeploymentRouteGuardStore, expertRpaRouteDigest, } from "./deployment_route_guard.js";
export class ExpertDeploymentRevisionConflictError extends Error {
    bindingId;
    expectedRevision;
    actualRevision;
    constructor(bindingId, expectedRevision, actualRevision) {
        super(`Expert deployment ${bindingId} revision conflict: expected ${expectedRevision}, actual ${actualRevision}.`);
        this.bindingId = bindingId;
        this.expectedRevision = expectedRevision;
        this.actualRevision = actualRevision;
        this.name = "ExpertDeploymentRevisionConflictError";
    }
}
export class ExpertDeploymentLifecycleError extends Error {
    from;
    to;
    constructor(from, to) {
        super(`Expert deployment status cannot transition from ${from} to ${to}.`);
        this.from = from;
        this.to = to;
        this.name = "ExpertDeploymentLifecycleError";
    }
}
function routeKey(binding) {
    return JSON.stringify([
        binding.channel.kind,
        binding.channel.accountId,
        binding.expertRef.profileId,
        binding.channel.upstreamBindingId ?? null,
    ]);
}
function clone(value) {
    return structuredClone(value);
}
/**
 * Versioned, physically isolated deployment store. A bad file is reported, retained and excluded
 * fail-closed; refresh never rewrites it or prevents unrelated valid bindings from loading.
 */
export class ExpertDeploymentStore {
    baseDir;
    now;
    generation = 0;
    loadedAt = 0;
    availability = "ready";
    byId = new Map();
    stagedById = new Map();
    blockedRouteDigests = new Set();
    issues = [];
    routeGuards;
    constructor(baseDir = path.join(process.env.USER_DATA_PATH || process.cwd(), "data", "expert_deployments", "v1"), now = Date.now, routeGuardFile = path.join(path.dirname(baseDir), "active-routes.v1.json")) {
        this.baseDir = baseDir;
        this.now = now;
        this.routeGuards = new ExpertDeploymentRouteGuardStore(routeGuardFile, now);
    }
    file(bindingId) {
        if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(bindingId)) {
            throw new Error(`Invalid Expert deployment binding id: ${bindingId}`);
        }
        return path.join(this.baseDir, `${bindingId}.json`);
    }
    historyFile(bindingId, revision) {
        if (!Number.isInteger(revision) || revision < 1)
            throw new Error(`Invalid Expert deployment revision: ${revision}`);
        return path.join(this.baseDir, "history", bindingId, `revision-${revision}.json`);
    }
    stagedFile(bindingId) {
        return path.join(this.baseDir, "staged", `${bindingId}.json`);
    }
    abandonedFile(binding) {
        return path.join(this.baseDir, "history", binding.bindingId, `abandoned-revision-${binding.revision}-${this.now()}.json`);
    }
    atomicWrite(target, binding) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        const temporary = path.join(path.dirname(target), `.${path.basename(target)}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`);
        let descriptor;
        try {
            descriptor = fs.openSync(temporary, "wx", 0o600);
            fs.writeFileSync(descriptor, `${JSON.stringify(binding, null, 2)}\n`, "utf8");
            fs.fsyncSync(descriptor);
            fs.closeSync(descriptor);
            descriptor = undefined;
            fs.renameSync(temporary, target);
        }
        finally {
            if (descriptor !== undefined)
                fs.closeSync(descriptor);
            try {
                if (fs.existsSync(temporary))
                    fs.unlinkSync(temporary);
            }
            catch {
                // A stale temp file cannot make a valid binding disappear; the next write uses a
                // unique name and refresh ignores dot/tmp files.
            }
        }
    }
    bindingRouteDigest(binding) {
        return expertRpaRouteDigest({
            accountId: binding.channel.accountId,
            profileId: binding.expertRef.profileId,
            upstreamBindingId: binding.channel.upstreamBindingId,
        });
    }
    hasProtectedHistory(bindingId) {
        const directory = path.dirname(this.historyFile(bindingId, 1));
        if (!fs.existsSync(directory))
            return false;
        for (const name of fs.readdirSync(directory)) {
            if (!/^revision-\d+\.json$/.test(name))
                continue;
            try {
                const historical = parseExpertDeploymentBinding(JSON.parse(fs.readFileSync(path.join(directory, name), "utf8")));
                if (historical.status === "active" || historical.status === "suspended")
                    return true;
            }
            catch {
                // History is rollback evidence, never live authority. An unreadable entry cannot
                // prove safety and therefore cannot remove an existing route guard.
            }
        }
        return false;
    }
    markUnavailable(error) {
        this.availability = "unavailable";
        this.byId = new Map();
        this.stagedById = new Map();
        this.blockedRouteDigests = new Set();
        this.issues = [{
                fileName: path.basename(this.baseDir) || "expert_deployments",
                code: "deployment_store_unavailable",
                message: error instanceof Error ? error.message : String(error),
            }];
        this.loadedAt = this.now();
        this.generation += 1;
        return this.snapshot();
    }
    refresh() {
        try {
            this.routeGuards.load();
        }
        catch (error) {
            this.availability = "unavailable";
            this.byId = new Map();
            this.stagedById = new Map();
            this.blockedRouteDigests = new Set();
            this.issues = [{
                    fileName: path.basename(this.routeGuards.filePath),
                    code: "route_guard_unavailable",
                    message: error instanceof Error ? error.message : String(error),
                }];
            this.loadedAt = this.now();
            this.generation += 1;
            return this.snapshot();
        }
        if (!fs.existsSync(this.baseDir)) {
            this.availability = "ready";
            this.byId = new Map();
            this.stagedById = new Map();
            this.blockedRouteDigests = new Set();
            this.issues = [];
            this.loadedAt = this.now();
            this.generation += 1;
            return this.snapshot();
        }
        const next = new Map();
        const nextIssues = [];
        const blockedRouteDigests = new Set();
        const routes = new Map();
        let files;
        try {
            files = fs.readdirSync(this.baseDir, { withFileTypes: true })
                .filter((entry) => entry.isFile() && entry.name.endsWith(".json") && !entry.name.startsWith("."))
                .map((entry) => entry.name)
                .sort();
        }
        catch (error) {
            return this.markUnavailable(error);
        }
        for (const fileName of files) {
            let raw;
            try {
                raw = JSON.parse(fs.readFileSync(path.join(this.baseDir, fileName), "utf8"));
            }
            catch (error) {
                nextIssues.push({
                    fileName,
                    code: "invalid_json",
                    message: error instanceof Error ? error.message : String(error),
                });
                continue;
            }
            let binding;
            try {
                binding = parseExpertDeploymentBinding(raw);
            }
            catch (error) {
                nextIssues.push({
                    fileName,
                    code: "invalid_binding",
                    message: error instanceof Error ? error.message : String(error),
                });
                continue;
            }
            const digest = this.bindingRouteDigest(binding);
            if (fileName !== `${binding.bindingId}.json`) {
                blockedRouteDigests.add(digest);
                nextIssues.push({
                    fileName,
                    code: "invalid_binding_filename",
                    message: "Binding filename must exactly match its bindingId.",
                });
                continue;
            }
            if (next.has(binding.bindingId)) {
                blockedRouteDigests.add(digest);
                blockedRouteDigests.add(this.bindingRouteDigest(next.get(binding.bindingId)));
                nextIssues.push({
                    fileName,
                    code: "duplicate_binding_id",
                    message: `Duplicate bindingId ${binding.bindingId}; every affected route is blocked.`,
                });
                continue;
            }
            const route = routeKey(binding);
            const previousRouteOwner = routes.get(route);
            if (binding.status !== "retired" && previousRouteOwner) {
                blockedRouteDigests.add(digest);
                nextIssues.push({
                    fileName,
                    code: "duplicate_rpa_route",
                    message: `RPA route collides with binding ${previousRouteOwner}; the route is blocked.`,
                });
                continue;
            }
            next.set(binding.bindingId, binding);
            if (binding.status !== "retired")
                routes.set(route, binding.bindingId);
        }
        const nextStaged = new Map();
        const stagedDir = path.join(this.baseDir, "staged");
        if (fs.existsSync(stagedDir)) {
            let stagedFiles;
            try {
                stagedFiles = fs.readdirSync(stagedDir, { withFileTypes: true })
                    .filter((entry) => entry.isFile() && entry.name.endsWith(".json") && !entry.name.startsWith("."))
                    .map((entry) => entry.name)
                    .sort();
            }
            catch (error) {
                return this.markUnavailable(error);
            }
            for (const fileName of stagedFiles) {
                try {
                    const staged = parseExpertDeploymentBinding(JSON.parse(fs.readFileSync(path.join(stagedDir, fileName), "utf8")));
                    const current = next.get(staged.bindingId);
                    if (!current || current.status === "retired" || staged.status !== "disabled"
                        || staged.revision !== current.revision + 1
                        || fileName !== `${staged.bindingId}.json`
                        || nextStaged.has(staged.bindingId)) {
                        throw new Error("Staged binding must be disabled and exactly one revision ahead of current.");
                    }
                    nextStaged.set(staged.bindingId, staged);
                }
                catch (error) {
                    nextIssues.push({
                        fileName: `staged/${fileName}`,
                        code: "invalid_staged_binding",
                        message: error instanceof Error ? error.message : String(error),
                    });
                }
            }
        }
        const historicallyProtected = new Set([...next.values()]
            .filter((binding) => this.hasProtectedHistory(binding.bindingId))
            .map((binding) => binding.bindingId));
        try {
            const inconsistent = this.routeGuards.reconcile([...next.values()], historicallyProtected);
            for (const digest of inconsistent) {
                blockedRouteDigests.add(digest);
                nextIssues.push({
                    fileName: path.basename(this.routeGuards.filePath),
                    code: "route_guard_inconsistent",
                    message: `Route guard ${digest} is newer than or belongs to a different current binding.`,
                });
            }
        }
        catch (error) {
            return this.markUnavailable(error);
        }
        this.availability = "ready";
        this.byId = next;
        this.stagedById = nextStaged;
        this.blockedRouteDigests = blockedRouteDigests;
        this.issues = nextIssues;
        this.loadedAt = this.now();
        this.generation += 1;
        return this.snapshot();
    }
    snapshot() {
        return {
            generation: this.generation,
            loadedAt: this.loadedAt,
            availability: this.availability,
            bindings: this.list({ includeRetired: true }),
            stagedBindings: this.listStaged(),
            guardedRouteCount: this.routeGuards.list().length,
            issues: clone(this.issues),
        };
    }
    list(options = {}) {
        return [...this.byId.values()]
            .filter((binding) => options.includeRetired || binding.status !== "retired")
            .sort((left, right) => left.bindingId.localeCompare(right.bindingId))
            .map(clone);
    }
    get(bindingId) {
        const binding = this.byId.get(bindingId);
        return binding ? clone(binding) : undefined;
    }
    getStaged(bindingId) {
        const binding = this.stagedById.get(bindingId);
        return binding ? clone(binding) : undefined;
    }
    listStaged() {
        return [...this.stagedById.values()]
            .sort((left, right) => left.bindingId.localeCompare(right.bindingId))
            .map(clone);
    }
    /** Immutable history enables a tested rollback revision without rewriting an old snapshot. */
    getRevision(bindingId, revision) {
        const target = this.historyFile(bindingId, revision);
        if (!fs.existsSync(target)) {
            const current = this.byId.get(bindingId);
            return current?.revision === revision ? clone(current) : undefined;
        }
        return parseExpertDeploymentBinding(JSON.parse(fs.readFileSync(target, "utf8")));
    }
    listRevisions(bindingId) {
        const directory = path.dirname(this.historyFile(bindingId, 1));
        const revisions = fs.existsSync(directory)
            ? fs.readdirSync(directory)
                .map((name) => /^revision-(\d+)\.json$/.exec(name)?.[1])
                .filter((value) => value !== undefined)
                .map(Number)
            : [];
        const current = this.byId.get(bindingId);
        if (current)
            revisions.push(current.revision);
        return [...new Set(revisions)].sort((left, right) => left - right);
    }
    resolveRpa(input) {
        if (this.availability === "unavailable")
            return { kind: "unavailable" };
        const routeDigest = expertRpaRouteDigest(input);
        if (this.blockedRouteDigests.has(routeDigest)) {
            return { kind: "guarded", state: "integrity_error" };
        }
        let matches = [...this.byId.values()].filter((binding) => binding.status !== "retired"
            && binding.channel.kind === "rpa"
            && binding.channel.accountId === input.accountId
            && binding.expertRef.profileId === input.profileId);
        if (input.upstreamBindingId) {
            matches = matches.filter((binding) => binding.channel.upstreamBindingId === input.upstreamBindingId);
        }
        if (matches.length > 1)
            return { kind: "ambiguous", count: matches.length };
        const guard = this.routeGuards.getByDigest(routeDigest);
        if (!guard) {
            if (matches.length === 0)
                return { kind: "missing" };
            const binding = matches[0];
            if (binding.status === "active" || binding.status === "suspended") {
                return { kind: "guarded", state: "integrity_error" };
            }
            return { kind: "matched", binding: clone(binding) };
        }
        if (matches.length === 0) {
            return guard.state === "rollback_legacy"
                ? { kind: "missing" }
                : { kind: "guarded", state: guard.state };
        }
        const binding = matches[0];
        if (!this.routeGuards.matches(guard, binding)) {
            return { kind: "guarded", state: "integrity_error" };
        }
        return { kind: "matched", binding: clone(binding) };
    }
    create(binding) {
        const parsed = parseExpertDeploymentBinding(binding);
        if (this.byId.has(parsed.bindingId) || fs.existsSync(this.file(parsed.bindingId))) {
            throw new Error(`Expert deployment ${parsed.bindingId} already exists.`);
        }
        const route = routeKey(parsed);
        const collision = [...this.byId.values()].find((candidate) => candidate.status !== "retired" && routeKey(candidate) === route);
        if (parsed.status !== "retired" && collision) {
            throw new Error(`Expert deployment route already belongs to ${collision.bindingId}.`);
        }
        this.routeGuards.protectTransition(undefined, parsed);
        this.atomicWrite(this.file(parsed.bindingId), parsed);
        this.byId.set(parsed.bindingId, parsed);
        this.loadedAt = this.now();
        this.generation += 1;
        return clone(parsed);
    }
    /** Persist a disabled candidate while the current active revision continues serving traffic. */
    stage(binding, expectedCurrentRevision) {
        const parsed = parseExpertDeploymentBinding(binding);
        const current = this.byId.get(parsed.bindingId);
        if (!current)
            throw new Error(`Expert deployment ${parsed.bindingId} was not found.`);
        if (current.status === "retired")
            throw new Error("A retired Expert deployment cannot be staged.");
        if (current.revision !== expectedCurrentRevision) {
            throw new ExpertDeploymentRevisionConflictError(parsed.bindingId, expectedCurrentRevision, current.revision);
        }
        if (parsed.status !== "disabled" || parsed.revision !== current.revision + 1
            || parsed.createdAt !== current.createdAt || parsed.updatedAt < current.updatedAt) {
            throw new Error("A staged deployment must be disabled, preserve createdAt, and be exactly one revision ahead.");
        }
        const existing = this.stagedById.get(parsed.bindingId);
        if (existing)
            throw new Error(`Expert deployment ${parsed.bindingId} already has staged revision ${existing.revision}.`);
        const collision = [...this.byId.values()].find((candidate) => candidate.bindingId !== parsed.bindingId
            && candidate.status !== "retired"
            && routeKey(candidate) === routeKey(parsed));
        if (collision)
            throw new Error(`Expert deployment route already belongs to ${collision.bindingId}.`);
        this.atomicWrite(this.stagedFile(parsed.bindingId), parsed);
        this.stagedById.set(parsed.bindingId, parsed);
        this.loadedAt = this.now();
        this.generation += 1;
        return clone(parsed);
    }
    discardStaged(bindingId, archive = true) {
        const staged = this.stagedById.get(bindingId);
        if (!staged)
            return undefined;
        if (archive)
            this.atomicWrite(this.abandonedFile(staged), staged);
        const target = this.stagedFile(bindingId);
        try {
            if (fs.existsSync(target))
                fs.unlinkSync(target);
        }
        catch (error) {
            // Current activation/suspension may already be committed. Keep it authoritative; a
            // stale staged file is rejected on refresh because it no longer leads by one revision.
            console.error(`[ExpertDeployment] Failed to remove stale staged file for ${bindingId}:`, error);
        }
        this.stagedById.delete(bindingId);
        this.loadedAt = this.now();
        this.generation += 1;
        return clone(staged);
    }
    /** Atomically replaces current with the already-tested staged revision, then clears staging. */
    promoteStaged(binding, expectedCurrentRevision) {
        const staged = this.stagedById.get(binding.bindingId);
        if (!staged || binding.status !== "active" || binding.suspension !== undefined
            || staged.revision !== binding.revision || staged.policyDigest !== binding.policyDigest) {
            throw new Error(`Expert deployment ${binding.bindingId} staged revision no longer matches activation input.`);
        }
        const promoted = this.replace(binding, expectedCurrentRevision);
        this.discardStaged(binding.bindingId, false);
        return promoted;
    }
    replace(binding, expectedRevision) {
        const parsed = parseExpertDeploymentBinding(binding);
        const current = this.byId.get(parsed.bindingId);
        if (!current)
            throw new Error(`Expert deployment ${parsed.bindingId} was not found.`);
        if (current.revision !== expectedRevision) {
            throw new ExpertDeploymentRevisionConflictError(parsed.bindingId, expectedRevision, current.revision);
        }
        const transitions = {
            draft: new Set(["draft", "disabled", "active", "retired"]),
            disabled: new Set(["disabled", "active", "retired"]),
            active: new Set(["active", "disabled", "suspended", "retired"]),
            suspended: new Set(["suspended", "active", "disabled", "retired"]),
            retired: new Set(),
        };
        if (!transitions[current.status].has(parsed.status)) {
            throw new ExpertDeploymentLifecycleError(current.status, parsed.status);
        }
        if (parsed.revision !== current.revision + 1
            || parsed.createdAt !== current.createdAt
            || parsed.updatedAt < current.updatedAt) {
            throw new Error("Replacement must increment revision, preserve createdAt, and not move updatedAt backwards.");
        }
        const route = routeKey(parsed);
        const collision = [...this.byId.values()].find((candidate) => candidate.bindingId !== parsed.bindingId
            && candidate.status !== "retired"
            && routeKey(candidate) === route);
        if (parsed.status !== "retired" && collision) {
            throw new Error(`Expert deployment route already belongs to ${collision.bindingId}.`);
        }
        this.routeGuards.protectTransition(current, parsed);
        const history = this.historyFile(current.bindingId, current.revision);
        if (!fs.existsSync(history))
            this.atomicWrite(history, current);
        this.atomicWrite(this.file(parsed.bindingId), parsed);
        this.byId.set(parsed.bindingId, parsed);
        this.loadedAt = this.now();
        this.generation += 1;
        return clone(parsed);
    }
}
/** Recomputes the digest after a deliberate revision/status/configuration change. */
export function reviseExpertDeploymentBinding(current, patch, now = Date.now()) {
    const withoutDigest = {
        ...current,
        ...patch,
        revision: current.revision + 1,
        updatedAt: Math.max(now, current.updatedAt),
    };
    return parseExpertDeploymentBinding({
        ...withoutDigest,
        policyDigest: expertDeploymentPolicyDigest(withoutDigest),
    });
}
