import * as fs from "fs";
import * as path from "path";
import { createHash } from "crypto";
import { SUBAGENT_PROFILE_ASSET_KIND } from "../../asset_backup/types.js";
export const AGENT_PROFILE_ID_RE = /^[A-Za-z0-9_-]{1,80}$/;
function sha256(text) {
    return createHash("sha256").update(text, "utf8").digest("hex");
}
function scalar(frontmatter, key) {
    const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    return match ? match[1].trim().replace(/^["']|["']$/g, "") : undefined;
}
function list(frontmatter, key) {
    const inline = frontmatter.match(new RegExp(`^${key}:\\s*\\[(.*)\\]\\s*$`, "m"));
    if (inline) {
        return inline[1]
            .split(",")
            .map(item => item.trim().replace(/^["']|["']$/g, ""))
            .filter(Boolean)
            .slice(0, 100);
    }
    const lines = frontmatter.split(/\r?\n/);
    const start = lines.findIndex(line => new RegExp(`^${key}:\\s*$`).test(line));
    if (start === -1)
        return [];
    const out = [];
    for (let i = start + 1; i < lines.length; i++) {
        const item = lines[i].match(/^\s+-\s*(.+)$/);
        if (!item)
            break;
        out.push(item[1].trim().replace(/^["']|["']$/g, ""));
        if (out.length >= 100)
            break;
    }
    return out;
}
export function parseSubagentSnapshot(agentMd, dirName, filePath, mtimeMs) {
    const normalized = agentMd.replace(/^\uFEFF/, "");
    const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match)
        return null;
    const frontmatter = match[1];
    const body = (match[2] || "").trim();
    const name = scalar(frontmatter, "name") || dirName;
    if (!AGENT_PROFILE_ID_RE.test(name) || name !== dirName || !body)
        return null;
    const enabledRaw = scalar(frontmatter, "enabled");
    return {
        assetKind: SUBAGENT_PROFILE_ASSET_KIND,
        assetKey: name,
        filePath,
        agentMd,
        contentSha256: sha256(agentMd),
        displayName: scalar(frontmatter, "displayName") || name,
        enabled: enabledRaw === undefined ? undefined : enabledRaw.toLowerCase() !== "false",
        knowledgeRefs: list(frontmatter, "knowledge"),
        localUpdatedAt: typeof mtimeMs === "number" && Number.isFinite(mtimeMs)
            ? new Date(mtimeMs).toISOString()
            : undefined,
    };
}
export class SubagentBackupAdapter {
    agentsDir;
    constructor(agentsDir) {
        this.agentsDir = agentsDir;
    }
    getAgentsDir() {
        return this.agentsDir;
    }
    async scan() {
        if (!fs.existsSync(this.agentsDir))
            return [];
        const entries = await fs.promises.readdir(this.agentsDir, { withFileTypes: true });
        const snapshots = [];
        for (const entry of entries) {
            if (!entry.isDirectory())
                continue;
            if (!AGENT_PROFILE_ID_RE.test(entry.name))
                continue;
            const filePath = path.join(this.agentsDir, entry.name, "AGENT.md");
            if (!fs.existsSync(filePath))
                continue;
            try {
                const [raw, stat] = await Promise.all([
                    fs.promises.readFile(filePath, "utf-8"),
                    fs.promises.stat(filePath),
                ]);
                const snapshot = parseSubagentSnapshot(raw, entry.name, filePath, stat.mtimeMs);
                if (snapshot)
                    snapshots.push(snapshot);
            }
            catch {
                // 单个文件损坏或正在被写入时跳过，后续 watcher/定时重试会再处理。
            }
        }
        return snapshots;
    }
    extractAssetKeyFromPath(changedPath) {
        const relative = path.relative(this.agentsDir, changedPath);
        if (!relative || relative.startsWith(".."))
            return null;
        const first = relative.split(/[\\/]/)[0];
        return AGENT_PROFILE_ID_RE.test(first) ? first : null;
    }
    extractDeletedAssetKey(event, changedPath) {
        const relative = path.relative(this.agentsDir, changedPath);
        if (!relative || relative.startsWith(".."))
            return null;
        const parts = relative.split(/[\\/]/).filter(Boolean);
        if (event === "unlink" && parts.length === 2 && parts[1].toLowerCase() === "agent.md") {
            return AGENT_PROFILE_ID_RE.test(parts[0]) ? parts[0] : null;
        }
        if (event === "unlinkDir" && parts.length === 1) {
            return AGENT_PROFILE_ID_RE.test(parts[0]) ? parts[0] : null;
        }
        return null;
    }
    async restore(profileId, agentMd, overwrite) {
        if (!AGENT_PROFILE_ID_RE.test(profileId))
            return { restored: false, reason: "非法的智能体标识" };
        const agentDir = path.join(this.agentsDir, profileId);
        const filePath = path.join(agentDir, "AGENT.md");
        const snapshot = parseSubagentSnapshot(agentMd, profileId, filePath);
        if (!snapshot)
            return { restored: false, reason: "云端 AGENT.md 格式无效" };
        await fs.promises.mkdir(agentDir, { recursive: true });
        let backupPath;
        if (fs.existsSync(filePath)) {
            const current = await fs.promises.readFile(filePath, "utf-8");
            if (sha256(current) !== snapshot.contentSha256) {
                if (!overwrite)
                    return { restored: false, reason: "local_exists" };
                const stamp = new Date().toISOString().replace(/[:.]/g, "-");
                backupPath = path.join(agentDir, `AGENT.before-cloud-restore.${stamp}.md`);
                await fs.promises.copyFile(filePath, backupPath);
            }
        }
        const tmp = path.join(agentDir, `AGENT.md.${process.pid}.${Date.now()}.tmp`);
        await fs.promises.writeFile(tmp, agentMd, "utf-8");
        await fs.promises.rename(tmp, filePath);
        return { restored: true, backupPath };
    }
}
