import fs from "node:fs/promises";
import path from "node:path";
import { acquireSessionWriteLock } from "./lock.js";
export class SessionManager {
    baseDir;
    constructor(options) {
        this.baseDir = options.baseDir;
    }
    getSessionPath(sessionId) {
        // Sanitize sessionId to prevent directory traversal
        const safeId = sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");
        return path.join(this.baseDir, `${safeId}.json`);
    }
    async loadSession(sessionId) {
        const filePath = this.getSessionPath(sessionId);
        try {
            const content = await fs.readFile(filePath, "utf-8");
            return JSON.parse(content);
        }
        catch (error) {
            if (error.code === "ENOENT") {
                // Create new session if not exists
                const newSession = {
                    id: sessionId,
                    type: 'main', // Default to main
                    status: 'idle',
                    messages: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    metadata: {},
                };
                return newSession;
            }
            throw error;
        }
    }
    async createSubSession(parentSessionId, metadata = {}, timeoutMs) {
        // Check parent depth
        const parentSession = await this.loadSession(parentSessionId);
        const parentDepth = parentSession.depth || 0;
        if (parentDepth >= 1) {
            throw new Error(`Maximum sub-agent depth of 1 reached. Cannot spawn from depth ${parentDepth}.`);
        }
        const uniqueSuffix = Math.random().toString(36).substring(2, 9);
        const subSessionId = `sub_${parentSessionId}_${Date.now()}_${uniqueSuffix}`;
        const newSession = {
            id: subSessionId,
            type: 'sub',
            parentId: parentSessionId,
            status: 'idle',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            metadata: { ...metadata },
            timeoutMs: timeoutMs,
            depth: parentDepth + 1
        };
        await this.saveSession(newSession);
        return newSession;
    }
    async updateSessionStatus(sessionId, status) {
        await this.transaction(sessionId, async (session) => {
            session.status = status;
        });
    }
    async saveSession(session) {
        const filePath = this.getSessionPath(session.id);
        session.updatedAt = Date.now();
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(session, null, 2), "utf-8");
    }
    /**
     * Executes a callback within a locked transaction for a specific session.
     * This ensures that no other process modifies the session file while we are working on it.
     */
    async transaction(sessionId, callback) {
        const filePath = this.getSessionPath(sessionId);
        const lock = await acquireSessionWriteLock({ sessionFile: filePath });
        try {
            const session = await this.loadSession(sessionId);
            const result = await callback(session);
            await this.saveSession(session);
            return result;
        }
        finally {
            await lock.release();
        }
    }
}
