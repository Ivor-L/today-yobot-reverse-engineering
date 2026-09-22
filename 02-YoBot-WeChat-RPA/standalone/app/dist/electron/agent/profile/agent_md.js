/**
 * AGENT.md 的**唯一**序列化器（frontmatter + 正文）。
 *
 * 之前 composeAgentMd 内联在 electron/main.ts 里，只有 UI 保存走它。现在 agent_builder 技能
 * 也要在服务端写 AGENT.md（让主 Agent 帮用户建子 Agent），两处必须产出**逐字一致**的格式，
 * 否则字段漂移会导致 loader 解析不一致。抽到这里做单一出处。
 *
 * 纯字符串函数、零 I/O、零重依赖 —— electron 主进程与服务端都能安全导入。
 * 解析端权威在 `loader.ts`；本文件只负责「写」，字段口径与 loader.parse 一一对应。
 */
const oneLine = (s) => String(s ?? "").replace(/\r?\n/g, " ").trim();
const arr = (xs) => `[${(xs || []).map((x) => JSON.stringify(String(x))).join(", ")}]`;
const owns = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
export function composeAgentMd(a) {
    const fu = ["auto", "never", "always"].includes(a.followUp)
        ? a.followUp
        : "never";
    const enabled = a.skillsEnabled === true;
    // followUpPrompt 块：非空才写，缩进 2 空格（loader.blockScalar 按此缩进还原）。
    const promptBlock = () => {
        const t = String(a.followUpPrompt || "").replace(/\r?\n/g, "\n").trim();
        if (!t)
            return [];
        return ["followUpPrompt: |", ...t.split("\n").map((l) => "  " + l)];
    };
    return [
        "---",
        `name: ${a.name}`,
        ...(a.version && String(a.version).trim() ? [`version: ${oneLine(a.version)}`] : []),
        `displayName: ${oneLine(a.displayName || a.name)}`,
        `enabled: ${a.enabled === false ? "false" : "true"}`,
        ...(a.scene ? [`scene: ${oneLine(a.scene)}`] : []),
        // model 为空则不写：让 kernel 跟随全局默认模型，避免把某个具体模型 id 焊死。
        ...(a.model && String(a.model).trim() ? [`model: ${oneLine(a.model)}`] : []),
        `skillsEnabled: ${enabled ? "true" : "false"}`,
        // 技能模块关时不写具体技能，避免残留误导；shell 由运行时自动放行，不进列表。
        `skills: ${arr(enabled ? a.skills : [])}`,
        `knowledge: ${arr(a.knowledge)}`,
        `followUp: ${fu}`,
        ...promptBlock(),
        "---",
        "",
        String(a.systemPrompt || "").trim(),
        "",
    ].join("\n");
}
export function patchAgentMd(raw, patch) {
    const source = String(raw || "").replace(/^﻿/, "");
    const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match)
        throw new Error("缺少 frontmatter");
    const eol = source.includes("\r\n") ? "\r\n" : "\n";
    const lines = match[1].split(/\r?\n/);
    const replaceField = (key, replacement) => {
        const start = lines.findIndex((line) => new RegExp(`^${key}:\\s*`).test(line));
        if (start === -1) {
            if (replacement)
                lines.push(...replacement);
            return;
        }
        let end = start + 1;
        if (new RegExp(`^${key}:\\s*(?:\\||)\\s*$`).test(lines[start])) {
            while (end < lines.length && (lines[end].trim() === "" || /^\s+/.test(lines[end])))
                end++;
        }
        lines.splice(start, end - start, ...(replacement || []));
    };
    if (owns(patch, "displayName"))
        replaceField("displayName", [`displayName: ${oneLine(patch.displayName)}`]);
    if (owns(patch, "version")) {
        const value = oneLine(patch.version);
        replaceField("version", value ? [`version: ${value}`] : null);
    }
    if (owns(patch, "enabled"))
        replaceField("enabled", [`enabled: ${patch.enabled === false ? "false" : "true"}`]);
    if (owns(patch, "scene")) {
        const value = oneLine(patch.scene);
        replaceField("scene", value ? [`scene: ${value}`] : null);
    }
    if (owns(patch, "model")) {
        const value = oneLine(patch.model);
        replaceField("model", value ? [`model: ${value}`] : null);
    }
    if (owns(patch, "skillsEnabled")) {
        replaceField("skillsEnabled", [`skillsEnabled: ${patch.skillsEnabled === true ? "true" : "false"}`]);
    }
    if (owns(patch, "skills"))
        replaceField("skills", [`skills: ${arr(patch.skills)}`]);
    if (owns(patch, "knowledge"))
        replaceField("knowledge", [`knowledge: ${arr(patch.knowledge)}`]);
    if (owns(patch, "followUp")) {
        const value = ["auto", "always"].includes(patch.followUp)
            ? patch.followUp
            : "never";
        replaceField("followUp", [`followUp: ${value}`]);
    }
    if (owns(patch, "followUpPrompt")) {
        const value = String(patch.followUpPrompt || "").replace(/\r?\n/g, "\n").trim();
        replaceField("followUpPrompt", value ? ["followUpPrompt: |", ...value.split("\n").map((line) => `  ${line}`)] : null);
    }
    const systemPrompt = owns(patch, "systemPrompt")
        ? String(patch.systemPrompt || "").trim()
        : match[2].trim();
    return ["---", ...lines, "---", "", systemPrompt, ""].join(eol);
}
