import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { ConfigManager } from '../core/config/manager.js';
export async function loadSkillsList(appRoot) {
    // In dev: appRoot/skills
    // In prod: appRoot/resources/skills or similar, need to verify. 
    // For now assuming standard dev structure or copied structure.
    // Try to find skills directory
    // If running from dist/electron/main.js, appRoot might be project root if passed correctly, 
    // or we derive it.
    // Let's check common locations
    // 用户安装目录（技能商店安装的技能落在这里，可写）—— 优先级最高，覆盖同名内置技能
    const potentialPaths = [];
    try {
        if (app?.getPath)
            potentialPaths.push(path.join(app.getPath('userData'), 'skills'));
    }
    catch { /* 非 Electron 环境忽略 */ }
    potentialPaths.push(path.join(appRoot, 'skills'), path.join(appRoot, '../skills'), // if appRoot is dist/electron
    path.join(process.cwd(), 'skills'), path.join(process.resourcesPath || '', 'skills') // Electron production resources
    );
    const config = ConfigManager.getInstance().getSafeConfig();
    const disabledSkills = new Set(config.disabledSkills || []);
    const skills = [];
    const seen = new Set(); // 跨目录去重（内置优先）
    for (const skillsDir of potentialPaths) {
        if (!fs.existsSync(skillsDir) || !fs.statSync(skillsDir).isDirectory())
            continue;
        const entries = await fs.promises.readdir(skillsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory())
                continue;
            const skillMdPath = path.join(skillsDir, entry.name, 'SKILL.md');
            if (!fs.existsSync(skillMdPath))
                continue;
            try {
                const content = await fs.promises.readFile(skillMdPath, 'utf-8');
                const info = parseSkillMd(content);
                const skillName = info.name || entry.name;
                if (seen.has(skillName))
                    continue;
                seen.add(skillName);
                // 商店安装的技能写 version.json；内置/旧版本技能没有 → 统一默认为 1.0.0，
                // 否则版本缺失会被当成低版本，更新客户端后所有技能都误报"需更新"。
                let version = '1.0.0';
                try {
                    const vp = path.join(skillsDir, entry.name, 'version.json');
                    if (fs.existsSync(vp))
                        version = JSON.parse(await fs.promises.readFile(vp, 'utf-8')).version || '1.0.0';
                }
                catch { /* ignore */ }
                skills.push({
                    id: skillName,
                    name: skillName,
                    description: info.description || '',
                    emoji: info.emoji || '📦',
                    path: skillMdPath,
                    disabled: disabledSkills.has(skillName),
                    version,
                });
            }
            catch (e) {
                console.error(`Failed to load skill ${entry.name}`, e);
            }
        }
    }
    return skills;
}
function parseSkillMd(content) {
    const result = {};
    // Simple frontmatter parser
    // Extract content between first --- and second ---
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match)
        return result;
    const frontmatter = match[1];
    const lines = frontmatter.split(/\r?\n/);
    for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1)
            continue;
        const key = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1).trim();
        if (key === 'name') {
            result.name = value.replace(/^["']|["']$/g, '');
        }
        else if (key === 'description') {
            result.description = value.replace(/^["']|["']$/g, '');
        }
        else if (key === 'metadata') {
            try {
                const json = JSON.parse(value);
                // `skill` 是中性命名空间；`yobot` 是存量技能的旧写法，保留兜底。
                const ns = json.skill ?? json.yobot;
                if (ns && ns.emoji) {
                    result.emoji = ns.emoji;
                }
            }
            catch (e) {
                // ignore invalid json
            }
        }
    }
    return result;
}
