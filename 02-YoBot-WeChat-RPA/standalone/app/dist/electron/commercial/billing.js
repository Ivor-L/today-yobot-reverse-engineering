import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
// Configuration: How many Platform Tokens per 1000 native tokens?
// Base Rate: 1000 DeepSeek Input Tokens = 1 Platform Token
const BASE_RATE = 1.0;
// Model Weights (Multiplier relative to Base Rate)
const MODEL_WEIGHTS = {
    // DeepSeek V3 (Baseline)
    "deepseek-chat": { inputMultiplier: 1.0, outputMultiplier: 2.0 },
    "deepseek-reasoner": { inputMultiplier: 4.0, outputMultiplier: 12.0 }, // R1 is expensive
    // OpenAI (Expensive)
    "gpt-4o": { inputMultiplier: 15.0, outputMultiplier: 45.0 },
    // Default Fallback
    "default": { inputMultiplier: 1.0, outputMultiplier: 2.0 }
};
const USAGE_FILE = path.join(process.env.USER_DATA_PATH || process.cwd(), 'workspace', 'token_usage.json');
export class BillingManager {
    static instance;
    records = [];
    constructor() {
        this.init();
    }
    static getInstance() {
        if (!BillingManager.instance) {
            BillingManager.instance = new BillingManager();
        }
        return BillingManager.instance;
    }
    init() {
        const dir = path.dirname(USAGE_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
    // NOTE: This now only supports writing. 
    // Reading back all history for getUsageStats is expensive and removed from critical path.
    // We can implement a separate "Analysis" tool for that.
    async appendLog(record) {
        try {
            const line = JSON.stringify(record) + '\n';
            await fs.promises.appendFile(USAGE_FILE, line, 'utf-8');
        }
        catch (e) {
            console.error("[Billing] Failed to append usage log:", e);
        }
    }
    calculatePlatformTokens(model, input, output) {
        const weights = MODEL_WEIGHTS[model] || MODEL_WEIGHTS["default"];
        // Formula: (Input / 1000 * Base * InputWeight) + (Output / 1000 * Base * OutputWeight)
        // Result is rounded to 4 decimal places
        const inputCost = (input / 1000) * BASE_RATE * weights.inputMultiplier;
        const outputCost = (output / 1000) * BASE_RATE * weights.outputMultiplier;
        return parseFloat((inputCost + outputCost).toFixed(4));
    }
    /**
     * Non-blocking record usage.
     * Fire-and-forget async write.
     */
    recordUsage(model, input, output, sessionId) {
        const platformTokens = this.calculatePlatformTokens(model, input, output);
        const record = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            model,
            inputTokens: input,
            outputTokens: output,
            platformTokens,
            sessionId
        };
        // Do NOT await here to avoid blocking the agent loop
        this.appendLog(record);
    }
    /**
     * Reads the log file to calculate stats.
     * Warning: Heavy operation if file is large.
     */
    async getUsageStats(sessionId) {
        if (!fs.existsSync(USAGE_FILE)) {
            return { totalInput: 0, totalOutput: 0, totalPlatformTokens: 0, recordCount: 0 };
        }
        try {
            const content = await fs.promises.readFile(USAGE_FILE, 'utf-8');
            const lines = content.trim().split('\n');
            let totalInput = 0;
            let totalOutput = 0;
            let totalPlatformTokens = 0;
            let count = 0;
            for (const line of lines) {
                if (!line.trim())
                    continue;
                try {
                    const r = JSON.parse(line);
                    if (sessionId && r.sessionId !== sessionId)
                        continue;
                    totalInput += r.inputTokens;
                    totalOutput += r.outputTokens;
                    totalPlatformTokens += r.platformTokens;
                    count++;
                }
                catch (e) {
                    // Ignore malformed lines
                }
            }
            return {
                totalInput,
                totalOutput,
                totalPlatformTokens: parseFloat(totalPlatformTokens.toFixed(4)),
                recordCount: count
            };
        }
        catch (e) {
            console.error("[Billing] Failed to read usage stats:", e);
            return { totalInput: 0, totalOutput: 0, totalPlatformTokens: 0, recordCount: 0 };
        }
    }
}
