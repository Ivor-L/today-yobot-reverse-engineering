import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);
import { LLMManager } from "../../agent/llm/manager.js";
export class CLIAdapter {
    static createTool(def, baseDir) {
        const declaredEffects = def.enterprise?.securityEffects || [];
        const enterprise = def.enterprise ?? {
            namespace: "cli",
            capability: def.name,
            sideEffect: "local",
            risk: "critical",
            reversible: false,
            idempotent: false,
            approval: "always",
            requiredScopes: ["tool:cli-exec"],
            executionMode: "sequential",
        };
        return {
            definition: {
                name: def.name,
                description: def.description,
                parameters: def.parameters,
                // Every CLI adapter executes an arbitrary local command template. Even when a skill
                // declares other business effects, it remains an ambient local-file-mutation route.
                enterprise: {
                    ...enterprise,
                    securityEffects: [...new Set([...declaredEffects, "local_file_mutation"])],
                },
            },
            execute: async (args, signal, context) => {
                let cmd = def.command;
                // 1. Replace placeholders {{key}} with values from args
                for (const [key, value] of Object.entries(args)) {
                    // TODO: Sanitize/Quote values to prevent injection? 
                    // For now, we assume simple usage or trust the internal schema.
                    // Better: Use a proper template engine or array-based spawn if possible, 
                    // but 'command' string usually implies shell execution.
                    // Simple JSON stringify for safety if it's a string, to handle spaces/quotes
                    let safeValue = String(value);
                    if (typeof value === 'string' && (value.includes(' ') || value.includes('"'))) {
                        // Escape quotes
                        safeValue = `"${value.replace(/"/g, '\\"')}"`;
                    }
                    cmd = cmd.replace(new RegExp(`{{${key}}}`, 'g'), safeValue);
                }
                // 2. Replace system variables
                const normalizedBaseDir = baseDir.replace(/\\/g, "/");
                cmd = cmd.replace(/{baseDir}/g, normalizedBaseDir);
                console.log(`[CLIAdapter] Executing: ${cmd}`);
                try {
                    // Use the skill directory as CWD if not specified
                    const cwd = def.cwd ? path.resolve(baseDir, def.cwd) : baseDir;
                    // 注入平台上下文环境变量（参考 docs/design/skill_system_architecture.md Section 5.2）
                    const llmManager = LLMManager.getInstance();
                    const token = llmManager.getAuthToken();
                    const env = { ...process.env };
                    if (token) {
                        env['YOKO_PLATFORM_TOKEN'] = token;
                        const port = process.env.PORT || 3000;
                        env['YOKO_GATEWAY_URL'] = `http://localhost:${port}/v1`;
                        const channelId = llmManager.getChannelId();
                        if (channelId) {
                            env['YOKO_CHANNEL_ID'] = channelId;
                        }
                        if (context?.traceId) {
                            env['YOKO_TRACE_ID'] = context.traceId;
                        }
                    }
                    else {
                        console.warn(`[CLIAdapter] Warning: No YOKO_PLATFORM_TOKEN found. Skill execution requiring auth may fail.`);
                    }
                    const { stdout, stderr } = await execAsync(cmd, { cwd, env });
                    if (stdout)
                        console.log(`[CLIAdapter] stdout:\n${stdout}`);
                    if (stderr)
                        console.error(`[CLIAdapter] stderr:\n${stderr}`);
                    return stdout.trim() || stderr.trim() || "Command executed successfully.";
                }
                catch (error) {
                    console.error(`[CLIAdapter] Execution failed:`, error);
                    throw new Error(`Command failed: ${error.message}\n${error.stderr}`);
                }
            }
        };
    }
}
import * as path from "path";
