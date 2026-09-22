import { spawn } from "child_process";
import { BillingManager } from "../../commercial/billing.js";
import { getContext } from "../../utils/context.js";
import { ConfigManager } from "../../core/config/manager.js";
import { UserInteractionRequiredError } from "../../agent/errors.js";
import { LLMManager } from "../../agent/llm/manager.js";
import { PythonEnvManager } from "../../utils/python_env.js";
import * as iconv from "iconv-lite";
import * as path from "path";
import * as os from "os";
import * as fsSync from "fs";
import { parseArtifacts, summarizeArtifacts } from "../utils/artifacts.js";
import { config } from "../../config/index.js";
import { isAgenticRun } from "../../agent/profile/agentic_guard.js";
import { resolveCommandShell } from "../../core/platform/shell_runtime.js";
// 定义允许执行的基础命令白名单，防止任意命令执行
// 注意：这只是一个基础的防护，本地 Agent 通常假设用户信任自己
const ALLOWED_COMMANDS = ["uv", "python", "node", "npm", "echo", "dir", "ls", "type", "cat"];
const SENSITIVE_ENV_NAME = /(?:token|secret|password|passwd|api[_-]?key|private[_-]?key|access[_-]?key|credential|cookie|authorization|auth[_-]?key|database[_-]?url|connection[_-]?string)/i;
// Shell 工具允许的根目录：项目根目录、Workspace、Skills
const USER_DATA_PATH = process.env.USER_DATA_PATH || process.cwd();
const SHELL_ALLOWED_ROOTS = [
    process.cwd(),
    path.resolve(USER_DATA_PATH, "workspace"),
    path.resolve(process.cwd(), "skills"),
    path.resolve(USER_DATA_PATH, "skills")
];
// 固定的高风险目录（黑名单）
const BLOCKED_ROOTS = [
    path.parse(process.cwd()).root.toLowerCase(), // 系统盘根目录 (e.g., C:\)
    os.homedir().toLowerCase(), // 用户目录 (e.g., C:\Users\Administrator)
    path.join(path.parse(process.cwd()).root, 'Windows').toLowerCase() // 系统目录
];
/**
 * 控制台输出解码。
 *
 * 此前 Windows 上**无条件**按 cp936(GBK)解码。对 `dir`/`type` 这类原生命令是对的
 * (控制台代码页 936),但对 UTF-8 内容就是灾难:本产品自己的日志是 UTF-8,
 * 被当作 GBK 解出来是 `鏉冮檺宸查噴鏀` 这种乱码。
 *
 * 真正致命的不是"难读",而是**乱码让中文关键词永远匹配不上,且静默返回空**:
 * 用 `Select-String` 按中文关键词查日志会稳定返回 "no output",Agent 据此得出
 * 「日志里根本没有这条记录」的错误结论,然后开始编造原因。
 *
 * 判据用"是否为合法 UTF-8"而不是猜代码页:GBK 编码的中文几乎不可能同时是合法 UTF-8
 * (GBK 尾字节 0x40-0xFE 大量落在 UTF-8 续字节合法区 0x80-0xBF 之外),
 * 而 UTF-8 文本必然合法。因此:
 *   · 合法 UTF-8  → 按 UTF-8 解(修好我们自己的日志/python/node 输出)
 *   · 不合法      → 回退 cp936(原生命令输出,行为与此前完全一致)
 * 容错阈值允许极少量坏字节(截断的多字节序列)仍判为 UTF-8,避免整段回退。
 */
function decodeConsoleOutput(buf) {
    if (!buf || buf.length === 0)
        return "";
    if (process.platform !== "win32")
        return buf.toString("utf-8");
    // 纯 ASCII:两种编码结果完全相同，直接返回，省掉一次解码
    let hasHighByte = false;
    for (const b of buf) {
        if (b >= 0x80) {
            hasHighByte = true;
            break;
        }
    }
    if (!hasHighByte)
        return buf.toString("latin1");
    const asUtf8 = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    const bad = (asUtf8.match(/�/g) || []).length;
    if (bad > 0 && bad / asUtf8.length >= 0.01)
        return iconv.decode(buf, "cp936");
    // "合法 UTF-8" 这个判据有个真实的漏网之鱼：部分 GBK 中文的字节对同时也是合法的
    // UTF-8 双字节序列。线上实例：用户名「庄园」GBK 是 D7 AF D4 B0，按 UTF-8 解出来是
    // `ׯ԰`（U+05EF 希伯来 + U+0530 亚美尼亚），零个替换字符，于是被判为 UTF-8 通过，
    // 中文路径就此静默变成乱码，Agent 后续拿它去匹配/拼路径全部落空。
    //
    // 这类误判有很稳的指纹：GBK 高位字节落进 UTF-8 后只会掉进 U+0080–U+07FF 这一段，
    // 而真实的控制台输出几乎不会出现希伯来/亚美尼亚/叙利亚/阿拉伯字母。反过来，同一段
    // 字节按 cp936 解如果是正经中日韩汉字，那答案就很清楚了。
    const suspicious = (asUtf8.match(/[԰-߿]/g) || []).length;
    if (suspicious > 0) {
        const asGbk = iconv.decode(buf, "cp936");
        const cjk = (asGbk.match(/[一-鿿　-〿＀-￯]/g) || []).length;
        if (cjk >= suspicious)
            return asGbk;
    }
    return asUtf8;
}
const getSafetyLevel = () => {
    // 1. Try ConfigManager (User Config)
    try {
        const config = ConfigManager.getInstance().getSystemConfig();
        if (config.shellSafetyLevel) {
            return config.shellSafetyLevel;
        }
    }
    catch (e) {
        // ConfigManager might fail if not initialized, ignore
    }
    // 2. Fallback to Environment Variable
    return process.env.SHELL_SAFETY_LEVEL || 'loose';
};
// 安全检查：防止在敏感目录执行高风险命令
const getShellSyntaxHint = (command) => {
    if (process.platform !== "win32")
        return "";
    const lowerCmd = command.toLowerCase();
    const unixSignals = [
        /\bfind\s+\//,
        /\|\s*head\b/,
        /\bhead\s+-/,
        /\|\s*grep\b/,
        /\bgrep\s+/,
        /\bsed\s+/,
        /\bawk\s+/,
        /(^|[;&|]\s*)\$[a-z_][a-z0-9_]*\s*=/i,
        /\bjoin-path\b/i,
        /\bselect-object\b/i,
    ];
    const hints = [];
    if (unixSignals.some(pattern => pattern.test(lowerCmd))) {
        hints.push("Shell hint: On Windows, shell_exec uses cmd.exe unless PowerShell is invoked explicitly. Use cmd.exe syntax, or prefix PowerShell commands with `powershell -NoProfile -NonInteractive -Command`. For non-trivial Python, write a temporary .py file instead of using multiline `python -c`.");
    }
    // 命令里带非 ASCII,或在跑 .ps1——这两种失败十有八九是编码而不是语法。
    // 注意:本函数只在命令**失败**时才被读取,所以这里兜不住"静默变问号"那一类
    // (那类命令是成功返回的),真正的护栏在 shell_exec 的 description 里。
    // 这里只负责让已经报错的那一类少绕几圈:线上实录里 agent 为 .ps1 的
    // 「字符串缺少终止符」连撞三次才想到是 UTF-8 无 BOM。
    if (/[^\x00-\x7F]/.test(command) || /\.ps1\b/i.test(lowerCmd)) {
        hints.push("Encoding hint (Windows): 失败很可能是编码而非语法。PowerShell 5.1 按 ANSI 解析 UTF-8 无 BOM 的 .ps1,中文会让它报「字符串缺少终止符」等诡异语法错;命令行传中文参数同样会损坏。改法:把非 ASCII 内容写进 UTF-8 文件,命令行只传文件路径(HTTP 体用 `curl --data-binary \"@文件\"`),或改用 python 重写这段脚本。");
    }
    return hints.join("\n");
};
const isSafeCommand = (command, cwd) => {
    const normalizedCwd = path.resolve(cwd).toLowerCase();
    const safetyLevel = getSafetyLevel();
    const lowerCmd = command.toLowerCase().trim();
    // System-level installers can modify the runtime YokoBot/Electron is using
    // and may terminate the running app mid-command. Guide users to run them
    // manually in a separate terminal after closing YokoBot.
    const systemInstallerPatterns = [
        /\bwinget\s+install\b/,
        /\bchoco\s+install\b/,
        /\bbrew\s+install\b/,
        /\bapt(?:-get)?\s+install\b/,
        /\byum\s+install\b/,
        /\bdnf\s+install\b/,
        /\bmsiexec(?:\.exe)?\b/,
        /\bpowershell(?:\.exe)?\b.*\b(start-process|invoke-webrequest|iwr|curl)\b.*\.(msi|exe)\b/,
        /\bnpm\s+install\s+-g\b/,
        /(^|\s)pip(?:\d+(?:\.\d+)?)?\s+install\b/,
        /\bpython(?:\d+(?:\.\d+)?)?(?:\.exe)?["']?\s+-m\s+pip\s+install\b/,
    ];
    if (systemInstallerPatterns.some(pattern => pattern.test(lowerCmd))) {
        return {
            safe: false,
            reason: "Safety Block: System-level installer commands must be run by the user outside the current client. " +
                "Installing or upgrading Node.js, FFmpeg, Chrome, or global Python/global packages while the current client is running can terminate the app or corrupt the user's environment. " +
                "Provide the command to the user and ask them to restart the client after installation."
        };
    }
    // RPA/YoBot 基础设施由专用工具管理。禁止 agent 用 shell 杀这些服务进程、起 service.exe、
    // 或对插件目录做重命名/移动/覆盖——历史上曾因此把调度器 DB 弄锁、任务丢失。
    // 窄口径：仅拦具名关键进程与插件目录，不影响 agent 正常的进程管理。
    const criticalProcessPatterns = [
        // 按进程名杀关键服务（taskkill /im、Stop-Process -Name、pkill/killall）
        /\b(taskkill|stop-process|pkill|killall)\b[^\n]*\b(service\.exe|service|yobot|weixin|wechat|openclaw|fireflow)\b/,
        // 手动拉起 RPA service.exe（start / Start-Process）
        /\b(start-process|start)\b[^\n]*service\.exe/,
        // 对插件目录做重命名/移动/覆盖
        /\b(rename-item|move-item|robocopy|xcopy|copy-item|move|ren|rename)\b[^\n]*wechat-rpa/,
    ];
    if (criticalProcessPatterns.some(pattern => pattern.test(lowerCmd))) {
        return {
            safe: false,
            reason: "Safety Block: 客户端/RPA 服务进程与插件目录由专用工具管理，禁止用 shell 杀进程、起 service.exe 或改插件目录。" +
                "诊断用 wechat_diagnose_rpa，重启用 wechat_restart_rpa，升级用 update_rpa_plugin。"
        };
    }
    // 1. 路径安全检查 (Path Security Check)
    if (safetyLevel === 'strict') {
        // 严格模式：只允许在项目相关目录
        const isAllowed = SHELL_ALLOWED_ROOTS.some(root => {
            const relative = path.relative(root, normalizedCwd);
            return !relative.startsWith("..") && !path.isAbsolute(relative);
        });
        if (!isAllowed) {
            return { safe: false, reason: `Security Block (Strict): Working directory '${cwd}' is outside allowed roots: ${SHELL_ALLOWED_ROOTS.join(', ')}` };
        }
    }
    else {
        // 宽松模式 (Risk/Loose)：只拦截固定黑名单
        // 检查是否直接在黑名单目录 (Exact Match)
        // 注意：这里我们拦截的是 "cwd === BlockedRoot"，即不允许直接在 C:\ 或 ~ 下执行命令
        // 但允许在 C:\Users\Admin\Desktop 下执行
        const isBlocked = BLOCKED_ROOTS.some(blocked => normalizedCwd === blocked);
        if (isBlocked) {
            return { safe: false, reason: `Security Block (Loose): Execution in high-risk directory '${cwd}' is prohibited.` };
        }
    }
    // 2. 命令内容检查 (Command Content Check) - 适用于所有模式
    // ... (保留原有的 isSafeCommand 逻辑) ...
    const homeDir = os.homedir().toLowerCase();
    const rootDir = path.parse(cwd).root.toLowerCase(); // e.g., "c:\"
    const systemDir = path.join(rootDir, 'windows').toLowerCase();
    // 识别当前目录是否高风险 (用于命令检查)
    const isHighRiskDir = normalizedCwd === rootDir ||
        normalizedCwd === homeDir ||
        normalizedCwd === systemDir;
    if (!isHighRiskDir)
        return { safe: true };
    // 识别高风险命令 (在这些目录下)
    const baseCmd = lowerCmd.split(' ')[0];
    // 规则 A: 禁止递归列出目录 (dir /s, ls -R, tree)
    if ((baseCmd === 'dir' && lowerCmd.includes('/s')) ||
        (baseCmd === 'ls' && lowerCmd.includes('-r')) ||
        baseCmd === 'tree') {
        return { safe: false, reason: `Safety Block: Recursive listing (${baseCmd}) is prohibited in root/home directories to prevent hanging.` };
    }
    // 规则 B: 禁止在根目录和系统目录直接列出文件 (dir, ls)
    if (baseCmd === 'dir' || baseCmd === 'ls') {
        return { safe: false, reason: `Safety Block: Listing files directly in ${cwd} is prohibited for performance and safety. Please target a specific subdirectory.` };
    }
    return { safe: true };
};
export function buildShellEnvironment(source = process.env, agentic = isAgenticRun()) {
    const env = {};
    for (const [key, value] of Object.entries(source)) {
        if (agentic && SENSITIVE_ENV_NAME.test(key))
            continue;
        env[key] = value;
    }
    env.FORCE_COLOR = "0";
    if (agentic) {
        delete env.YOKO_PLATFORM_TOKEN;
        delete env.YOKO_GATEWAY_URL;
        delete env.YOKO_CHANNEL_ID;
        return env;
    }
    const llmManager = LLMManager.getInstance();
    const token = llmManager.getAuthToken();
    if (token) {
        env.YOKO_PLATFORM_TOKEN = token;
        const port = process.env.PORT || 3000;
        env.YOKO_GATEWAY_URL = `http://localhost:${port}/v1`;
        const channelId = llmManager.getChannelId();
        if (channelId)
            env.YOKO_CHANNEL_ID = channelId;
    }
    else {
        console.warn(`[Shell] Warning: No YOKO_PLATFORM_TOKEN found. Skill execution requiring auth may fail.`);
    }
    return env;
}
function createAbortError() {
    const error = new Error("Command aborted");
    error.name = "AbortError";
    return error;
}
/**
 * Stop the command and its descendants.
 *
 * On Windows, child.kill() only terminates the cmd.exe wrapper created by
 * shell:true and can leave Python/uv/PowerShell descendants running. taskkill
 * with /T scopes termination to the exact spawned PID and its process tree.
 */
function terminateProcessTree(child) {
    if (child.exitCode !== null || child.signalCode !== null)
        return;
    if (process.platform === "win32" && child.pid) {
        const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
        killer.once("error", () => {
            try {
                child.kill();
            }
            catch {
                // The process may already have exited.
            }
        });
        return;
    }
    // runCommand creates a dedicated process group on POSIX. Signal that group,
    // not only the /bin/sh wrapper; otherwise Python/uv/nested shell descendants
    // can survive a timeout or user cancellation. Escalate only our own group.
    if (child.pid) {
        try {
            process.kill(-child.pid, "SIGTERM");
            const forceKill = setTimeout(() => {
                try {
                    process.kill(-child.pid, "SIGKILL");
                }
                catch {
                    // The process group has already exited.
                }
            }, 1_000);
            forceKill.unref();
            return;
        }
        catch {
            // Fall through when a platform cannot create/signal process groups.
        }
    }
    try {
        child.kill();
    }
    catch {
        // The process may already have exited.
    }
}
// Helper to execute command with spawn for better control (timeout, buffer size, encoding)
const runCommand = (command, cwd, signal) => {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(createAbortError());
            return;
        }
        // Limits
        const MAX_BUFFER = 1024 * 1024 * 2; // 2MB
        // How long buffered output may keep draining after the shell has exited (see `exit` below).
        const STDIO_DRAIN_AFTER_EXIT_MS = 1_000;
        const TIMEOUT = Number(process.env.SHELL_COMMAND_TIMEOUT_MS || 0) || 15 * 60 * 1000;
        // 注入平台上下文环境变量（参考 docs/design/skill_system_architecture.md Section 5.2）
        const env = { ...process.env, FORCE_COLOR: "0" };
        const llmManager = LLMManager.getInstance();
        const token = llmManager.getAuthToken();
        if (token) {
            env['YOKO_PLATFORM_TOKEN'] = token;
            const port = process.env.PORT || 3000;
            env['YOKO_GATEWAY_URL'] = `http://localhost:${port}/v1`;
            const channelId = llmManager.getChannelId();
            if (channelId) {
                env['YOKO_CHANNEL_ID'] = channelId;
            }
        }
        else {
            console.warn(`[Shell] Warning: No YOKO_PLATFORM_TOKEN found. Skill execution requiring auth may fail.`);
        }
        const child = spawn(command, {
            cwd,
            shell: resolveCommandShell(),
            // POSIX needs a dedicated group so cancellation cannot orphan nested
            // commands. Windows uses taskkill /T against the cmd.exe wrapper PID.
            detached: process.platform !== "win32",
            env: isAgenticRun() ? buildShellEnvironment() : env
        });
        let stdoutChunks = [];
        let stderrChunks = [];
        let stdoutLen = 0;
        let stderrLen = 0;
        let settled = false;
        let drainTimer;
        const timeoutId = setTimeout(() => {
            terminateAndReject(new Error(`Command timed out after ${TIMEOUT}ms`));
        }, TIMEOUT);
        const cleanup = () => {
            clearTimeout(timeoutId);
            if (drainTimer)
                clearTimeout(drainTimer);
            signal?.removeEventListener("abort", abortHandler);
        };
        const terminateAndReject = (error) => {
            if (settled)
                return;
            settled = true;
            cleanup();
            terminateProcessTree(child);
            reject(error);
        };
        const abortHandler = () => terminateAndReject(createAbortError());
        signal?.addEventListener("abort", abortHandler, { once: true });
        if (signal?.aborted) {
            abortHandler();
        }
        child.stdout.on("data", (chunk) => {
            if (settled)
                return;
            stdoutChunks.push(chunk);
            stdoutLen += chunk.length;
            if (stdoutLen > MAX_BUFFER) {
                terminateAndReject(new Error(`Output exceeded limit of ${MAX_BUFFER} bytes`));
            }
        });
        child.stderr.on("data", (chunk) => {
            if (settled)
                return;
            stderrChunks.push(chunk);
            stderrLen += chunk.length;
            if (stderrLen > MAX_BUFFER) {
                terminateAndReject(new Error(`Error output exceeded limit of ${MAX_BUFFER} bytes`));
            }
        });
        child.on("error", (err) => {
            if (settled)
                return;
            settled = true;
            cleanup();
            reject(err);
        });
        const finish = (code) => {
            if (settled)
                return;
            settled = true;
            cleanup();
            const stdoutBuffer = Buffer.concat(stdoutChunks);
            const stderrBuffer = Buffer.concat(stderrChunks);
            let stdout = decodeConsoleOutput(stdoutBuffer);
            let stderr = decodeConsoleOutput(stderrBuffer);
            if (code !== 0) {
                // Attach stderr to error for caller to handle
                const err = new Error(`Command failed with exit code ${code}`);
                err.stdout = stdout;
                err.stderr = stderr;
                reject(err);
            }
            else {
                resolve({ stdout, stderr });
            }
        };
        // `close` waits until every holder of our stdout/stderr pipes lets go. A command that
        // launches a long-lived program (`start "" msedge.exe ...`, `cmd & app &`) hands those
        // pipe handles to the program, so `close` only fires when the program exits: the tool
        // then hangs until the 15-minute timeout or the user stops the turn (2026-09-13: three
        // browser-automation turns stuck 111-227s and were stopped / the app was quit).
        //
        // The shell itself exiting is the command's real end. Give buffered output a short
        // window to drain; if the pipes are still held after that, settle with what we have and
        // release our end. The launched program keeps running, which is what the command asked for.
        child.on("exit", (code) => {
            if (settled || drainTimer)
                return;
            drainTimer = setTimeout(() => {
                drainTimer = undefined;
                if (settled)
                    return;
                try {
                    child.stdout?.destroy();
                }
                catch { /* already closed */ }
                try {
                    child.stderr?.destroy();
                }
                catch { /* already closed */ }
                finish(code);
            }, STDIO_DRAIN_AFTER_EXIT_MS);
        });
        child.on("close", (code) => finish(code));
    });
};
const shellExecTool = {
    definition: {
        name: "shell_exec",
        description: process.platform === "win32"
            ? "Execute a shell command using Windows cmd.exe; PowerShell must be invoked explicitly. "
                + "Automatically manages Python environment (uv) for 'python'/'uv' commands.\n"
                // 这条必须留在 description（始终在上下文）而不是失败提示里：编码损坏是**静默**的,
                // 命令返回 0、接口回 200,中文已经变成 ? 发出去了,失败提示根本不会触发。
                // 线上实录:好友验证消息发成 "??,???????" 且已投递给真实客户(不可撤回);
                // 公众号草稿标题乱码要删稿重推;写 UTF-8 无 BOM 的 .ps1 反复报「字符串缺少终止符」。
                + "WINDOWS + 非 ASCII 内容(中文等)铁律 —— 不遵守会静默产出乱码,而且可能已经发给了真实用户:\n"
                + "1. 绝不把非 ASCII 内容放进命令行参数,也绝不用 PowerShell 的 ConvertTo-Json / Invoke-RestMethod 发送它(会变成 ?)。\n"
                + "2. HTTP 请求体:先用 fs_write_file 写 UTF-8 文件,再 `curl --data-binary \"@文件路径\"`。\n"
                + "3. 要传给脚本的非 ASCII 参数:同样写进 UTF-8 文件,命令行只传文件路径,由脚本自己按 UTF-8 读。\n"
                + "4. 需要脚本时优先用 python(UTF-8 友好);确实要用 .ps1 且内容含非 ASCII,必须写成带 BOM 的 UTF-8,"
                + "否则 PowerShell 5.1 会按 ANSI 解析并报「字符串缺少终止符」之类的诡异语法错。\n"
                + "5. 涉及对外发送(消息/验证语/标题/推送正文)的非 ASCII 内容,发出前必须回读确认一次落地值没变成 ?。"
            : "Execute a shell command using the POSIX /bin/sh contract. "
                + "Use POSIX syntax and do not use cmd.exe or PowerShell commands. "
                + "Automatically manages Python environment (uv) for 'python'/'uv' commands.",
        parameters: {
            type: "object",
            properties: {
                command: {
                    type: "string",
                    description: "The full command line to execute (e.g., 'uv run scripts/generate.py ...')"
                },
                cwd: {
                    type: "string",
                    description: "Optional working directory. Defaults to the current client workspace directory."
                }
            },
            required: ["command"]
        },
        enterprise: {
            namespace: "system",
            capability: "shell_execute",
            sideEffect: "local",
            risk: "critical",
            reversible: false,
            idempotent: false,
            approval: "always",
            // Shell has ambient authority: arbitrary commands/scripts can create, overwrite, or delete files.
            // Until command-level confinement exists, file-mutation canaries must govern the whole tool.
            securityEffects: ["local_file_mutation"],
            requiredScopes: ["tool:shell-exec"],
            estimatedLatencyClass: "long",
            executionMode: "sequential",
        },
    },
    execute: async ({ command, cwd }, signal, context) => {
        // 0. 参数校验
        if (!command || typeof command !== 'string') {
            throw new Error("Missing or invalid 'command' parameter. Please provide a valid shell command string.");
        }
        // 默认在 workspace 里执行：技能写出的相对路径（如 `--filename out.png`）应该落在
        // 用户能找到的地方。用 process.cwd() 的话，开发态会落到仓库根、打包态落到安装目录。
        const safeCwd = cwd ? path.resolve(cwd) : config.workspaceDir;
        try {
            fsSync.mkdirSync(safeCwd, { recursive: true });
        }
        catch (e) {
            console.error(`[Shell] Failed to ensure cwd ${safeCwd}:`, e);
        }
        // 1. 安全检查 (Safety Check)
        // 包含路径沙箱检查和命令内容检查
        const safetyCheck = isSafeCommand(command, safeCwd);
        if (!safetyCheck.safe) {
            if (safetyCheck.reason?.includes("Strict")) {
                throw new UserInteractionRequiredError(`Access Denied: Execution in '${safeCwd}' is blocked by Strict Mode. ` +
                    `Please ask the user to switch to Loose Mode (System Permissions) to proceed.`);
            }
            throw new Error(safetyCheck.reason);
        }
        // 打印当前的执行模式，方便调试
        const safetyLevel = getSafetyLevel();
        console.log(`[Shell] Executing: ${command} (cwd: ${safeCwd}, mode: ${safetyLevel})`);
        // 1. 基础白名单检查
        const baseCommand = command.trim().split(" ")[0];
        if (!ALLOWED_COMMANDS.includes(baseCommand) && !command.startsWith(".")) {
            // 暂时放宽限制
        }
        let finalCommand = command;
        // 2. Python 环境自动管理 (Auto-install & Command Wrapping)
        //
        // 走 uv 是为了让脚本缺的依赖能自动装上。但 uv 装不上/没装时，此前会把
        // ensureEnv 的 "Tool 'uv' not found" 原样抛给模型——而模型敲的明明是
        // `python xxx.py`。它收到一个跟自己的命令对不上的错误，只能反复换姿势探测环境
        // （线上 trace 里连撞两次同样的墙），任务就这么跑偏了。
        // 所以：uv 不可用时，`python` 直接退回系统 Python；只有真的两样都没有才报错。
        if (baseCommand === 'python' || baseCommand === 'uv') {
            const args = command.trim().substring(baseCommand.length);
            let uvPath = null;
            try {
                uvPath = await PythonEnvManager.getInstance().ensureEnv();
            }
            catch {
                uvPath = null;
            }
            if (uvPath) {
                finalCommand = baseCommand === 'python'
                    // python script.py -> uv run python script.py
                    // Ensures dependencies in requirements.txt (if present) are respected
                    ? `"${uvPath}" run python${args}`
                    // uv run ... -> "path/to/uv" run ...
                    : `"${uvPath}"${args}`;
                console.log(`[Shell] Enhanced Python command: ${finalCommand}`);
            }
            else {
                const systemPython = PythonEnvManager.getInstance().findSystemPython();
                if (!systemPython) {
                    throw new Error("本机既没有 uv，也没有可用的 Python 解释器"
                        + "（Windows 上 `where python` 命中的 WindowsApps\\python.exe 是应用商店占位符，不能执行）。"
                        + "请先安装 Python 或 uv（https://github.com/astral-sh/uv），或者改用不依赖 Python 的方式完成这一步。");
                }
                if (baseCommand === 'uv') {
                    // 模型是照着技能手册写的 `uv run`。直接告诉它退路，别让它自己猜。
                    throw new Error(`uv 未安装，无法自动装依赖。本机可用的 Python 是 \`${systemPython}\`，`
                        + "如果脚本不需要额外依赖，直接用 `python 脚本路径` 重试即可。");
                }
                finalCommand = `${systemPython}${args}`;
                console.log(`[Shell] uv unavailable, falling back to system Python: ${finalCommand}`);
            }
        }
        try {
            const { stdout, stderr } = await runCommand(finalCommand, safeCwd, signal);
            // Parse Usage Metadata
            // Look for ::USAGE_METADATA::{"model": "...", "input": 100, "output": 20}
            let cleanStdout = stdout;
            const usageMatch = stdout.match(/::USAGE_METADATA::(\{.*\})/);
            if (usageMatch) {
                try {
                    const metadata = JSON.parse(usageMatch[1]);
                    const ctx = getContext();
                    const sessionId = ctx ? ctx.sessionId : "terminal";
                    if (metadata.model) {
                        BillingManager.getInstance().recordUsage(metadata.model, Number(metadata.input) || 0, Number(metadata.output) || 0, sessionId);
                        console.log(`[Shell] Recorded external usage for ${metadata.model}: In=${metadata.input}, Out=${metadata.output}`);
                        // Remove metadata line from output to avoid confusing LLM
                        cleanStdout = stdout.replace(usageMatch[0], "").trim();
                        // Also remove the newline if it left a gap
                        cleanStdout = cleanStdout.replace(/\n\s*\n/g, '\n');
                    }
                }
                catch (e) {
                    console.error("[Shell] Failed to parse usage metadata:", e);
                }
            }
            // 调试：始终打印输出，以便用户在终端看到工具的详细执行情况
            // if (stdout) console.log(`[Shell] stdout:\n${stdout}`);
            // if (stderr) console.log(`[Shell] stderr:\n${stderr}`);
            // 产物走结构化通道直达 UI，不经过模型；模型只拿到清理后的文本 + 一行摘要。
            const { text, artifacts } = parseArtifacts((cleanStdout || "").trim());
            for (const artifact of artifacts) {
                context?.onEvent?.({ type: 'artifact', payload: artifact });
            }
            const out = [text, summarizeArtifacts(artifacts)].filter(Boolean).join("\n\n");
            const err = (stderr || "").trim();
            return out || err || "Command executed successfully with no output.";
        }
        catch (error) {
            if (error?.name === "AbortError")
                throw error;
            // 发生错误时，也要打印详细日志到控制台
            if (error.stdout)
                console.log(`[Shell] stdout (failed):\n${error.stdout}`);
            if (error.stderr)
                console.error(`[Shell] stderr (failed):\n${error.stderr}`);
            const clip = (value) => {
                if (typeof value !== 'string' || !value.trim())
                    return '';
                const trimmed = value.trim();
                const maxLength = 24000;
                return trimmed.length > maxLength ? trimmed.slice(-maxLength) : trimmed;
            };
            const stdout = clip(error.stdout) || '(no stdout)';
            const stderr = clip(error.stderr) || '(no stderr)';
            const shellHint = getShellSyntaxHint(command);
            throw new Error(`Command execution failed: ${error.message}\nStdout: ${stdout}\nStderr: ${stderr}${shellHint ? `\n${shellHint}` : ''}`);
        }
    }
};
export const shellSkill = {
    name: "shell",
    description: "Execute shell commands to run external tools and scripts.",
    tools: [shellExecTool]
};
