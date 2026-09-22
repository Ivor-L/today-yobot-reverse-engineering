import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
function emptyState() {
    return {
        schemaVersion: 1,
        deviceId: randomUUID(),
        assets: {},
    };
}
export class AssetBackupStateStore {
    statePath;
    constructor(statePath) {
        this.statePath = statePath;
    }
    async load() {
        try {
            if (!fs.existsSync(this.statePath))
                return emptyState();
            const raw = await fs.promises.readFile(this.statePath, "utf-8");
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object" || parsed.schemaVersion !== 1) {
                return emptyState();
            }
            return {
                schemaVersion: 1,
                deviceId: typeof parsed.deviceId === "string" && parsed.deviceId ? parsed.deviceId : randomUUID(),
                lastFullSyncAt: typeof parsed.lastFullSyncAt === "string" ? parsed.lastFullSyncAt : undefined,
                lastStatusAt: typeof parsed.lastStatusAt === "string" ? parsed.lastStatusAt : undefined,
                lastError: typeof parsed.lastError === "string" ? parsed.lastError : null,
                assets: parsed.assets && typeof parsed.assets === "object" ? parsed.assets : {},
            };
        }
        catch {
            return emptyState();
        }
    }
    async save(state) {
        await fs.promises.mkdir(path.dirname(this.statePath), { recursive: true });
        const tmp = `${this.statePath}.${process.pid}.${Date.now()}.tmp`;
        await fs.promises.writeFile(tmp, JSON.stringify(state, null, 2), "utf-8");
        await fs.promises.rename(tmp, this.statePath);
    }
    async update(mutator) {
        const state = await this.load();
        await mutator(state);
        await this.save(state);
        return state;
    }
    async upsertEntry(key, patch) {
        return this.update((state) => {
            const previous = state.assets[key];
            state.assets[key] = {
                ...previous,
                ...patch,
                status: patch.status || previous?.status || "pending_upload",
            };
            state.lastStatusAt = new Date().toISOString();
        });
    }
}
