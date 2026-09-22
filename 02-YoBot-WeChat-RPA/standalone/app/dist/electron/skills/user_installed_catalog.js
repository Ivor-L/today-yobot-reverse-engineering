import fs from "node:fs";
import path from "node:path";
import { resolveBootstrapAgentFileLayout } from "../core/platform/file_layout.js";
function unquote(value) {
    return value.trim().replace(/^["']|["']$/g, "");
}
function parseFrontmatter(content) {
    const normalized = content.replace(/^\uFEFF/, "");
    const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const frontmatter = match?.[1] || "";
    const pick = (key) => {
        const field = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
        return field ? unquote(field[1]) : "";
    };
    let emoji = "📦";
    const metadata = frontmatter.match(/^metadata:\s*(\{.*\})$/m)?.[1];
    if (metadata) {
        try {
            const parsed = JSON.parse(metadata);
            const namespace = parsed?.skill ?? parsed?.yobot;
            if (typeof namespace?.emoji === "string" && namespace.emoji.trim()) {
                emoji = namespace.emoji.trim();
            }
        }
        catch {
            // 非法 metadata 不影响技能出现在列表中。
        }
    }
    return { name: pick("name"), description: pick("description"), emoji };
}
function readVersion(skillDir) {
    try {
        const versionPath = path.join(skillDir, "version.json");
        if (!fs.existsSync(versionPath))
            return "1.0.0";
        const parsed = JSON.parse(fs.readFileSync(versionPath, "utf8"));
        return typeof parsed?.version === "string" && parsed.version.trim()
            ? parsed.version.trim()
            : "1.0.0";
    }
    catch {
        return "1.0.0";
    }
}
export function resolveUserSkillsRoot(userDataPath) {
    return resolveBootstrapAgentFileLayout({
        userDataRoot: userDataPath?.trim() || process.env.USER_DATA_PATH?.trim() || undefined,
    }).skillsDir;
}
export function listUserInstalledSkills(userDataPath, disabledSkills = []) {
    const root = resolveUserSkillsRoot(userDataPath);
    if (!fs.existsSync(root) || !fs.statSync(root).isDirectory())
        return [];
    const disabled = new Set(disabledSkills);
    const result = [];
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        if (!entry.isDirectory())
            continue;
        const skillDir = path.join(root, entry.name);
        const skillMdPath = path.join(skillDir, "SKILL.md");
        if (!fs.existsSync(skillMdPath) || !fs.statSync(skillMdPath).isFile())
            continue;
        try {
            const content = fs.readFileSync(skillMdPath, "utf8");
            const parsed = parseFrontmatter(content);
            const name = parsed.name || entry.name;
            result.push({
                id: entry.name,
                name,
                description: parsed.description,
                emoji: parsed.emoji,
                disabled: disabled.has(name),
                version: readVersion(skillDir),
            });
        }
        catch (error) {
            console.warn(`[UserSkillCatalog] Failed to read ${entry.name}:`, error);
        }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
}
export function loadUserInstalledSkill(id, userDataPath, disabledSkills = []) {
    if (!id || id === "." || id === ".." || id.includes("/") || id.includes("\\") || id.includes("\0"))
        return null;
    const info = listUserInstalledSkills(userDataPath, disabledSkills).find(skill => skill.id === id);
    if (!info)
        return null;
    const root = resolveUserSkillsRoot(userDataPath);
    const skillMdPath = path.join(root, info.id, "SKILL.md");
    const resolvedRoot = path.resolve(root) + path.sep;
    const resolvedPath = path.resolve(skillMdPath);
    if (!resolvedPath.startsWith(resolvedRoot))
        return null;
    try {
        return {
            ...info,
            baseDir: path.dirname(resolvedPath),
            path: resolvedPath,
            content: fs.readFileSync(resolvedPath, "utf8").replace(/^\uFEFF/, ""),
        };
    }
    catch {
        return null;
    }
}
