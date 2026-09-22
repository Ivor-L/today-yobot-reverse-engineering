import * as fs from 'fs';
import * as path from 'path';
import { resolveRuntimeAgentLogsDirectory } from '../../core/platform/file_layout.js';
export class DebugLogger {
    logPath;
    sessionId;
    enabled;
    traceId = null;
    traceFilePath = null;
    /**
     * 已写入的【字节】数，不是字符数。
     *
     * 必须是字节：中文一个字 3 字节，用 str.length 记出来的偏移会严重前移，
     * 按它去切片读出来的是半个汉字组成的乱码，而且全程不抛异常。
     */
    bytesWritten = 0;
    constructor(sessionId, traceId) {
        this.sessionId = sessionId;
        this.enabled = true; // Always enabled if instantiated, or control via config
        const logDir = path.join(resolveRuntimeAgentLogsDirectory(), 'traces');
        try {
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");
            // traceId \u8FDB\u6587\u4EF6\u540D\uFF0C\u4E3B\u8FDB\u7A0B\u636E\u6B64\u5B9A\u4F4D\u300C\u8FD9\u4E00\u8F6E\u300D\u7684\u65E5\u5FD7\uFF08`__<traceId>.log` \u540E\u7F00\uFF09\u3002
            // \u4E3B\u804A\u5929\u91CC traceId \u5C31\u662F\u6E32\u67D3\u8FDB\u7A0B\u90A3\u6761\u7528\u6237\u6D88\u606F\u7684 id\uFF0C\u4E8E\u662F
            // \u6587\u4EF6\u540D \u2194 agent_user_questions.message_id \u2194 OSS \u5BF9\u8C61\u540D \u4E09\u8005\u5929\u7136\u5BF9\u9F50\u3002
            const safeTraceId = (traceId || '').replace(/[^a-zA-Z0-9_-]/g, "_");
            const suffix = safeTraceId ? `__${safeTraceId}` : '';
            this.logPath = path.join(logDir, `trace_${timestamp}_${safeSessionId}${suffix}.log`);
            // Write a UTF-8 BOM so Windows tools detect trace logs as UTF-8
            // instead of the local ANSI codepage.
            fs.writeFileSync(this.logPath, '\uFEFF', 'utf8');
            this.bytesWritten = Buffer.byteLength('\uFEFF', 'utf8');
            this.writeRaw(`=== Session Started: ${sessionId} ===\n`);
            this.writeRaw(`Timestamp: ${new Date().toISOString()}\n`);
        }
        catch (e) {
            console.error('[DebugLogger] Failed to initialize log file:', e);
            this.enabled = false;
            this.logPath = "";
        }
    }
    writeRaw(content) {
        if (!this.enabled)
            return;
        try {
            fs.appendFileSync(this.logPath, content, 'utf8');
            this.bytesWritten += Buffer.byteLength(content, 'utf8');
        }
        catch (e) {
            console.error('[DebugLogger] Failed to write to log:', e);
        }
    }
    /** 本轮日志文件的绝对路径；初始化失败时为空串。 */
    getLogPath() {
        return this.logPath;
    }
    /**
     * 已写入字节数。文件是 append-only 的，所以 [0, bytesWritten) 这段内容
     * 之后永远不会被改写——并发读取该区间是安全的。
     */
    getBytesWritten() {
        return this.bytesWritten;
    }
    formatSection(title, content) {
        const border = '='.repeat(80);
        let contentStr = '';
        if (typeof content === 'string') {
            contentStr = content;
        }
        else {
            try {
                contentStr = JSON.stringify(content, null, 2);
            }
            catch (e) {
                contentStr = `[Circular or Invalid JSON]: ${content}`;
            }
        }
        return `\n${border}\n[${new Date().toISOString()}] ${title}\n${border}\n${contentStr}\n`;
    }
    logEvent(event, details) {
        this.writeRaw(this.formatSection(`EVENT: ${event}`, details || {}));
    }
    logMemory(memories) {
        const simplified = memories.map(m => ({
            id: m.id,
            source: m.source,
            path: m.path,
            score: m.score, // If available
            text_preview: m.text.slice(0, 300) + (m.text.length > 300 ? '...' : '')
        }));
        this.writeRaw(this.formatSection('RETRIEVED MEMORIES', simplified));
    }
    logContext(state) {
        this.writeRaw(this.formatSection('RUNTIME STATE', state));
    }
    logPrompt(messages, model) {
        // Create a cleaner view of messages
        const debugMessages = messages.map(m => {
            if (m.role === 'system') {
                return {
                    role: 'system',
                    content_length: m.content?.length,
                    content_preview: typeof m.content === 'string' ? m.content.slice(0, 500) + '...' : '[Complex Content]'
                };
            }
            return m;
        });
        this.writeRaw(this.formatSection(`LLM REQUEST PREPARED (Model: ${model})`, debugMessages));
        // Also log the full prompt in a separate block if needed, but for now the preview is safer for huge system prompts
        // User asked for "detailed", so maybe I should log full system prompt once? 
        // Let's log full messages but maybe truncate the huge "Instructions" block inside system prompt if it's too repetitive.
        // For debugging "why agent calls tool", the full prompt is useful.
        // I will log the FULL JSON payload but maybe in a "Raw" section or just rely on the fact it's a file.
        // Let's log full content for non-system, and full content for system. It's a file log.
        // Wait, system prompt is huge.
        // I'll stick to full log. The user said "方便后续出现问题...排查".
        this.writeRaw(this.formatSection(`FULL LLM MESSAGES PAYLOAD`, messages));
    }
    logLlmResponse(response) {
        // Log choices
        const choices = response.choices?.map((c) => ({
            finish_reason: c.finish_reason,
            message: c.message
        }));
        const usage = response.usage;
        this.writeRaw(this.formatSection('LLM RESPONSE RECEIVED', { usage, choices }));
    }
    logToolStart(name, args) {
        this.writeRaw(this.formatSection(`TOOL START: ${name}`, args));
    }
    logToolResult(name, result) {
        this.writeRaw(this.formatSection(`TOOL RESULT: ${name}`, result));
    }
    logError(context, error) {
        this.writeRaw(this.formatSection(`ERROR in ${context}`, {
            message: error.message,
            stack: error.stack,
            raw: error
        }));
    }
    startTrace(traceId) {
        try {
            this.traceId = traceId;
            const rootDir = process.env.USER_DATA_PATH || process.cwd();
            const dateStr = new Date().toISOString().slice(0, 10);
            const traceDir = path.join(rootDir, 'data', 'traces', dateStr);
            fs.mkdirSync(traceDir, { recursive: true });
            this.traceFilePath = path.join(traceDir, `${traceId}.jsonl`);
        }
        catch {
            // Silently fail — trace setup must never break the agent
        }
    }
    writeEvent(type, payload) {
        if (!this.traceFilePath || !this.traceId)
            return;
        try {
            const event = {
                ts: Date.now(),
                sessionId: this.sessionId,
                traceId: this.traceId,
                type,
                payload
            };
            fs.appendFileSync(this.traceFilePath, JSON.stringify(event) + '\n', 'utf8');
        }
        catch {
            // Silently fail — trace writes must never break the agent
        }
    }
}
