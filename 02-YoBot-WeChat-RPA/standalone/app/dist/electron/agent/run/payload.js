import { extractText } from "../../utils/content.js";
export class PayloadBuilder {
    /**
     * Builds the dual-stream payload for the LATEST turn (after the last user message).
     */
    static buildLatestTurn(session) {
        const messages = session.messages;
        if (messages.length === 0) {
            return { thinking: [], response: "", isComplete: true };
        }
        // 1. Find the last User message index
        let lastUserIndex = -1;
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {
                lastUserIndex = i;
                break;
            }
        }
        if (lastUserIndex === -1) {
            // No user message found, maybe just system logs?
            // Treat everything as "thinking" since start?
            lastUserIndex = 0;
        }
        const turnMessages = messages.slice(lastUserIndex + 1);
        const thinking = [];
        let response = "";
        let isComplete = false; // We can't really know if it's complete unless we have a flag, but we assume if last is text, it might be.
        let toolsUsed = 0;
        let errors = 0;
        // 2. Process messages in the turn
        for (const msg of turnMessages) {
            const text = extractText(msg.content);
            if (msg.role === 'system') {
                // System notifications (e.g. extension limits)
                thinking.push({
                    type: 'system',
                    content: text,
                    timestamp: msg.timestamp
                });
            }
            else if (msg.role === 'assistant') {
                const anyMsg = msg;
                if (anyMsg.tool_calls && anyMsg.tool_calls.length > 0) {
                    // It's a tool call (Thought)
                    toolsUsed += anyMsg.tool_calls.length;
                    // Add thought about tool usage
                    // We can extract "Reasoning" if the model output text before tool calls?
                    if (text) {
                        thinking.push({
                            type: 'thought',
                            content: text, // The "Thought" before the action
                            timestamp: msg.timestamp
                        });
                    }
                    for (const call of anyMsg.tool_calls) {
                        thinking.push({
                            type: 'tool_call',
                            content: `Calling ${call.function.name}...`,
                            meta: {
                                id: call.id,
                                name: call.function.name,
                                args: call.function.arguments // Keep raw string or parse?
                            },
                            timestamp: msg.timestamp
                        });
                    }
                }
                else {
                    // It's a text response (Content)
                    // If this is the FINAL message, it's the response.
                    // But sometimes models output partial thoughts as text? 
                    // In our Runtime loop, we treat text response as final break.
                    response += text;
                    isComplete = true; // Assuming text response means done in our current loop
                }
            }
            else if (msg.role === 'tool') {
                // Tool Result
                const anyMsg = msg;
                const isError = text.startsWith("Error:");
                if (isError)
                    errors++;
                // De-duplication / Hiding Logic
                // If the result is huge, maybe truncate in UI, but here we pass it.
                // We can mark "Error" types specifically.
                thinking.push({
                    type: isError ? 'error' : 'tool_result',
                    content: isError ? text : `Result from tool`, // Hide actual content in summary? Or show it?
                    // For "Transparent Thinking", we usually show the result but maybe collapsed.
                    meta: {
                        callId: anyMsg.tool_call_id,
                        fullOutput: text
                    },
                    timestamp: msg.timestamp,
                    isCollapsed: !isError // Collapse success results by default to reduce noise
                });
            }
        }
        return {
            thinking,
            response,
            isComplete,
            stats: {
                toolsUsed,
                errors,
                steps: thinking.length
            }
        };
    }
    /**
     * Builds a structured view of the thinking process, grouping tool calls with their results.
     * This enables "Tool De-duplication" and cleaner UI.
     */
    static buildStructuredThoughts(session) {
        const raw = this.buildLatestTurn(session);
        const steps = [];
        const toolMap = new Map();
        for (const item of raw.thinking) {
            if (item.type === 'tool_call') {
                const step = {
                    id: item.meta.id,
                    type: 'tool',
                    name: item.meta.name,
                    args: item.meta.args,
                    status: 'running', // Default
                    result: undefined,
                    timestamp: item.timestamp
                };
                steps.push(step);
                toolMap.set(item.meta.id, step);
            }
            else if (item.type === 'tool_result' || item.type === 'error') {
                const callId = item.meta.callId;
                const step = toolMap.get(callId);
                if (step) {
                    step.status = item.type === 'error' ? 'failed' : 'success';
                    step.result = item.content; // Or meta.fullOutput
                    // For de-duplication: we successfully merged result into the call step!
                }
                else {
                    // Orphaned result? Just add as log
                    steps.push({
                        id: `log-${item.timestamp}`,
                        type: 'log',
                        content: item.content,
                        level: item.type === 'error' ? 'error' : 'info',
                        timestamp: item.timestamp
                    });
                }
            }
            else if (item.type === 'thought' || item.type === 'system') {
                steps.push({
                    id: `msg-${item.timestamp}`,
                    type: 'message',
                    role: item.type,
                    content: item.content,
                    timestamp: item.timestamp
                });
            }
        }
        return {
            steps,
            response: raw.response,
            isComplete: raw.isComplete
        };
    }
}
