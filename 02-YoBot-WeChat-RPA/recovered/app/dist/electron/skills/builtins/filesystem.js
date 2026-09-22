import fs from "fs-extra";
import * as path from "path";
import { createHash } from "node:crypto";
import { createReadTool, createWriteTool, createLsTool } from "@earendil-works/pi-coding-agent";
import { SecurePathUtils } from "../../utils/fs-secure.js";
import { ConfigManager } from "../../core/config/manager.js";
import { FILESYSTEM_ALLOWED_ROOTS, FILESYSTEM_SKILLS_ROOT, FILESYSTEM_USER_SKILLS_ROOT, FILESYSTEM_WORKSPACE_ROOT, resolveFilesystemTarget, } from "./filesystem_policy.js";
// 定义工作目录
const WORKSPACE_ROOT = FILESYSTEM_WORKSPACE_ROOT;
const SKILLS_ROOT = FILESYSTEM_SKILLS_ROOT;
const USER_SKILLS_ROOT = FILESYSTEM_USER_SKILLS_ROOT;
const ALLOWED_ROOTS = FILESYSTEM_ALLOWED_ROOTS;
// 确保工作区存在
fs.ensureDirSync(WORKSPACE_ROOT);
// console.log removed here
// --- Operations Adapters (Bridge to SecurePathUtils) ---
const secureReadOps = {
    access: async (p) => {
        await SecurePathUtils.assertSandbox(p, ALLOWED_ROOTS);
        await fs.access(p);
    },
    readFile: async (p) => {
        await SecurePathUtils.assertSandbox(p, ALLOWED_ROOTS);
        return fs.readFile(p);
    },
    // 使用默认的 detectImageMimeType
};
const secureWriteOps = {
    mkdir: async (dir) => {
        await SecurePathUtils.assertSandbox(dir, ALLOWED_ROOTS);
        await fs.ensureDir(dir);
    },
    writeFile: async (p, content) => {
        await SecurePathUtils.assertSandbox(p, ALLOWED_ROOTS);
        await fs.writeFile(p, content, "utf-8");
    }
};
const secureLsOps = {
    exists: (p) => {
        if (!SecurePathUtils.isAllowed(p, ALLOWED_ROOTS))
            return false;
        return fs.existsSync(p);
    },
    stat: (p) => {
        if (!SecurePathUtils.isAllowed(p, ALLOWED_ROOTS))
            throw new Error(`Access Denied: ${p}`);
        return fs.statSync(p);
    },
    readdir: (p) => {
        if (!SecurePathUtils.isAllowed(p, ALLOWED_ROOTS))
            throw new Error(`Access Denied: ${p}`);
        return fs.readdirSync(p);
    }
};
// --- Instantiate Pi Tools ---
// Note: We pass process.cwd() as base, but our Ops enforce strict sandbox.
const piReadTool = createReadTool(process.cwd(), { operations: secureReadOps });
const piWriteTool = createWriteTool(process.cwd(), { operations: secureWriteOps });
const piLsTool = createLsTool(process.cwd(), { operations: secureLsOps });
// --- Helper to execute Pi Tool and format output ---
async function executePiTool(tool, args) {
    const result = await tool.execute("fs-adapter", args);
    let output = "";
    // Pi Tool returns { content: [ { type: 'text', text: '...' }, { type: 'image', ... } ] }
    if (result.content && Array.isArray(result.content)) {
        for (const part of result.content) {
            if (part.type === "text") {
                output += part.text + "\n";
            }
            else if (part.type === "image") {
                output += `\n![Result Image](data:${part.mimeType};base64,${part.data})\n`;
            }
        }
    }
    else {
        output = JSON.stringify(result);
    }
    return output.trim();
}
// --- YokoAgent Tool Definitions (Wrappers) ---
const writeFileTool = {
    definition: {
        name: "fs_write_file",
        description: "将内容写入文件。适用于：1. 用户明确要求保存文件；2. 需要持久化保存的长文本/代码/报告。",
        parameters: {
            type: "object",
            properties: {
                file_path: { type: "string", description: "文件名或绝对路径" },
                content: { type: "string", description: "要写入的文本内容" }
            },
            required: ["file_path", "content"]
        },
        paramAliases: { file_path: ["filename", "path"] },
        enterprise: {
            namespace: "filesystem",
            capability: "write_file",
            sideEffect: "local",
            risk: "medium",
            reversible: false,
            idempotent: true,
            approval: "policy",
            securityEffects: ["local_file_mutation"],
            workspacePathParams: ["file_path", "filename", "path"],
            verifierId: "local-file-write-v1",
            executionMode: "sequential",
        },
    },
    execute: async (args) => {
        const { file_path, filename, path, content } = args;
        const targetPath = file_path || filename || path;
        if (!targetPath)
            throw new Error("缺少必要参数: file_path");
        // Call Pi Tool
        return executePiTool(piWriteTool, { path: targetPath, content });
    }
};
function fileHash(content) {
    return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}
const deleteFileTool = {
    definition: {
        name: "fs_delete_file",
        description: "删除一个明确指定的文件（不删除目录）。这是不可恢复操作，必须先获得用户对该精确路径的审批。",
        parameters: {
            type: "object",
            additionalProperties: false,
            properties: {
                file_path: { type: "string", description: "要删除的文件绝对路径或工作区相对路径" },
            },
            required: ["file_path"],
        },
        enterprise: {
            namespace: "filesystem",
            capability: "delete_file",
            sideEffect: "local",
            risk: "high",
            reversible: false,
            idempotent: false,
            approval: "always",
            securityEffects: ["local_file_mutation"],
            workspacePathParams: ["file_path", "path"],
            verifierId: "local-file-delete-v1",
            executionMode: "sequential",
        },
    },
    execute: async (args) => {
        const input = args?.file_path ?? args?.path;
        if (typeof input !== "string" || !input.trim())
            throw new Error("缺少必要参数: file_path");
        const target = resolveFilesystemTarget(input);
        await SecurePathUtils.assertSandbox(target, ALLOWED_ROOTS);
        const stat = await fs.lstat(target);
        if (!stat.isFile())
            throw new Error("删除失败：目标不是普通文件；该工具不会删除目录或符号链接。");
        const before = await fs.readFile(target);
        await fs.unlink(target);
        return {
            success: true,
            deleted: true,
            bytes: before.byteLength,
            contentHash: fileHash(before),
        };
    },
};
const moveFileTool = {
    definition: {
        name: "fs_move_file",
        description: "移动或重命名一个明确指定的文件。为避免数据丢失，目标已存在时始终拒绝覆盖。",
        parameters: {
            type: "object",
            additionalProperties: false,
            properties: {
                source_path: { type: "string", description: "源文件绝对路径或工作区相对路径" },
                target_path: { type: "string", description: "目标文件绝对路径或工作区相对路径；父目录必须已存在" },
            },
            required: ["source_path", "target_path"],
        },
        enterprise: {
            namespace: "filesystem",
            capability: "move_file",
            sideEffect: "local",
            risk: "high",
            reversible: false,
            idempotent: false,
            approval: "always",
            securityEffects: ["local_file_mutation"],
            workspacePathParams: ["source_path", "target_path"],
            verifierId: "local-file-move-v1",
            executionMode: "sequential",
        },
    },
    execute: async (args) => {
        const sourceInput = args?.source_path;
        const targetInput = args?.target_path;
        if (typeof sourceInput !== "string" || !sourceInput.trim())
            throw new Error("缺少必要参数: source_path");
        if (typeof targetInput !== "string" || !targetInput.trim())
            throw new Error("缺少必要参数: target_path");
        const source = resolveFilesystemTarget(sourceInput);
        const target = resolveFilesystemTarget(targetInput);
        if (source === target)
            throw new Error("移动失败：源路径和目标路径相同。");
        await SecurePathUtils.assertSandbox(source, ALLOWED_ROOTS);
        await SecurePathUtils.assertSandbox(target, ALLOWED_ROOTS);
        const sourceStat = await fs.lstat(source);
        if (!sourceStat.isFile())
            throw new Error("移动失败：源目标不是普通文件；该工具不会移动目录或符号链接。");
        const parentStat = await fs.stat(path.dirname(target));
        if (!parentStat.isDirectory())
            throw new Error("移动失败：目标父路径不是目录。");
        const before = await fs.readFile(source);
        const targetExists = await fs.pathExists(target);
        if (targetExists)
            throw new Error("移动失败：目标已存在；该工具不会覆盖已有文件。");
        await fs.rename(source, target);
        return {
            success: true,
            moved: true,
            bytes: before.byteLength,
            contentHash: fileHash(before),
            overwritten: false,
        };
    },
};
const readFileTool = {
    definition: {
        name: "fs_read_file",
        description: "读取文件内容。支持大文件自动截断。",
        parameters: {
            type: "object",
            properties: {
                file_path: { type: "string", description: "文件名或绝对路径" },
                offset: { type: "number", description: "起始行号 (可选)" },
                limit: { type: "number", description: "读取行数限制 (可选)" }
            },
            required: ["file_path"]
        },
        paramAliases: { file_path: ["filename", "path"] },
        enterprise: {
            namespace: "filesystem",
            capability: "read_file",
            sideEffect: "none",
            risk: "low",
            reversible: true,
            idempotent: true,
            approval: "never",
            workspacePathParams: ["file_path", "filename", "path"],
            estimatedCostClass: "free",
            executionMode: "parallel",
        },
    },
    execute: async (args) => {
        const { file_path, filename, path, offset, limit } = args;
        const targetPath = file_path || filename || path;
        if (!targetPath)
            throw new Error("缺少必要参数: file_path");
        // Call Pi Tool
        return executePiTool(piReadTool, { path: targetPath, offset, limit });
    }
};
const listDirTool = {
    definition: {
        name: "fs_list_directory",
        description: "列出指定目录的所有文件",
        parameters: {
            type: "object",
            properties: {
                dir_path: { type: "string", description: "目录路径" },
                path: { type: "string", description: "兼容参数" },
                dir: { type: "string", description: "兼容参数" },
                limit: { type: "number", description: "返回条目数量限制" }
            },
        },
        enterprise: {
            namespace: "filesystem",
            capability: "list_directory",
            sideEffect: "none",
            risk: "low",
            reversible: true,
            idempotent: true,
            approval: "never",
            workspacePathParams: ["dir_path", "path", "dir"],
            estimatedCostClass: "free",
            executionMode: "parallel",
        },
    },
    execute: async (args) => {
        const { dir_path, path: pathArg, dir, limit } = args || {};
        const targetPath = dir_path || pathArg || dir || WORKSPACE_ROOT;
        // Call Pi Tool
        return executePiTool(piLsTool, { path: targetPath, limit });
    }
};
// 导出为 Skill
export const fileSystemSkill = {
    name: "filesystem",
    description: "提供增强的本地文件管理能力 (基于 Pi Kernel)",
    tools: [writeFileTool, deleteFileTool, moveFileTool, readFileTool, listDirTool],
    onEnable: async () => {
        try {
            const config = ConfigManager.getInstance().getSystemConfig();
            const mode = config.shellSafetyLevel === 'loose' ? 'Loose (Unrestricted)' : 'Secure (Sandboxed)';
            console.log(`[FileSystem] Loaded. Mode: ${mode}. (${ALLOWED_ROOTS.length} sandbox roots)`);
        }
        catch (e) {
            console.warn(`[FileSystem] Loaded. Failed to read config:`, e);
        }
    }
};
