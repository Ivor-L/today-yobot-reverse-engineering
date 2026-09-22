import { BaseAdapter } from "./base.js";
export class DeepSeekAdapter extends BaseAdapter {
    id = "deepseek";
    matches(provider, model) {
        // Match deepseek provider or models
        return provider.toLowerCase() === "deepseek" || model.toLowerCase().includes("deepseek");
    }
    processThinkingChunk(delta, state) {
        let { isThinking, buffer, currentTag } = state;
        let contentDelta = "";
        let thinkingDelta = "";
        let toolDelta = "";
        // Ensure buffer is string
        if (typeof buffer !== 'string')
            buffer = "";
        // Append current delta to buffer for processing
        buffer += delta;
        // Loop to process buffer as much as possible
        while (buffer.length > 0) {
            if (currentTag === 'thinking_block') {
                const closeTag = state.expectedCloseTag || '</think>';
                const closeIdx = buffer.indexOf(closeTag);
                if (closeIdx !== -1) {
                    // Found end of thinking block
                    thinkingDelta += buffer.substring(0, closeIdx);
                    buffer = buffer.substring(closeIdx + closeTag.length); // Skip length of closing tag
                    currentTag = undefined;
                    isThinking = false;
                    // Continue loop to process remaining buffer
                }
                else {
                    // No end tag found yet
                    // To be safe, keep the last few chars in buffer in case of split tag
                    if (buffer.length > 20) {
                        const safeChunk = buffer.substring(0, buffer.length - 10);
                        thinkingDelta += safeChunk;
                        buffer = buffer.substring(buffer.length - 10);
                    }
                    break; // Wait for more data
                }
            }
            else if (currentTag === 'code_block') {
                // Code block processing
                // Note: buffer already contains the opening ``` from previous state
                const closeIdx = buffer.indexOf('```', 3);
                if (closeIdx !== -1) {
                    // Block is complete
                    const blockContent = buffer.substring(0, closeIdx + 3);
                    buffer = buffer.substring(closeIdx + 3);
                    // Parse to see if it's a tool call
                    const calls = this.parsePseudoToolCalls(blockContent, true);
                    if (calls && calls.length > 0) {
                        // It IS a tool call block
                        // Add to toolDelta so kernel can execute it
                        toolDelta += blockContent;
                        // Do NOT add to contentDelta (suppress from UI)
                    }
                    else {
                        // Not a tool call, emit as regular content
                        contentDelta += blockContent;
                    }
                    currentTag = undefined;
                    // Continue loop
                }
                else {
                    // Block not closed yet
                    // Keep in buffer, but if very long, maybe flush?
                    // Code blocks can be long, but we must wait for close to check if it's a tool call.
                    // To prevent memory issues with massive code blocks that are NOT tool calls:
                    if (buffer.length > 10000) {
                        // Force flush if too large (likely not a tool call or malformed)
                        contentDelta += buffer;
                        buffer = "";
                        currentTag = undefined;
                    }
                    break; // Wait for more data
                }
            }
            else {
                // Normal text mode
                // Look for start of tags
                const thinkTag = '<think>';
                const altThinkTag = '<thinking>';
                let thinkStart = buffer.indexOf(thinkTag);
                let currentThinkTag = thinkTag;
                if (thinkStart === -1) {
                    thinkStart = buffer.indexOf(altThinkTag);
                    currentThinkTag = altThinkTag;
                }
                else {
                    // Check if alt tag appears earlier (unlikely but possible)
                    const altStart = buffer.indexOf(altThinkTag);
                    if (altStart !== -1 && altStart < thinkStart) {
                        thinkStart = altStart;
                        currentThinkTag = altThinkTag;
                    }
                }
                const codeStart = buffer.indexOf('```');
                if (thinkStart !== -1 && (codeStart === -1 || thinkStart < codeStart)) {
                    // Found thinking start tag
                    contentDelta += buffer.substring(0, thinkStart);
                    buffer = buffer.substring(thinkStart + currentThinkTag.length); // Skip tag
                    currentTag = 'thinking_block';
                    isThinking = true;
                    // Store the closing tag we expect
                    state.expectedCloseTag = currentThinkTag.replace('<', '</');
                }
                else if (codeStart !== -1) {
                    // Found ```
                    contentDelta += buffer.substring(0, codeStart);
                    buffer = buffer.substring(codeStart); // Keep ``` in buffer for code_block logic
                    currentTag = 'code_block';
                }
                else {
                    // No tags found
                    // Flush buffer but keep tail for potential split tags
                    if (buffer.length > 20) {
                        const safeChunk = buffer.substring(0, buffer.length - 10);
                        contentDelta += safeChunk;
                        buffer = buffer.substring(buffer.length - 10);
                    }
                    break; // Wait for more data
                }
            }
        }
        return {
            thinkingDelta,
            contentDelta,
            toolDelta,
            newState: { isThinking, buffer, currentTag }
        };
    }
    /**
     * Try to parse function-call style syntax (e.g. tool_name('arg'))
     */
    tryParseFunctionCall(text) {
        // Matches: name ( quote content quote )
        const match = text.trim().match(/^(\w+)\s*\((['"])([\s\S]*)\2\)\s*;?$/);
        if (!match)
            return null;
        const name = match[1];
        const quote = match[2];
        const rawContent = match[3];
        // Basic unescape
        let content = rawContent;
        if (quote === "'") {
            content = content.replace(/\\'/g, "'");
        }
        else {
            content = content.replace(/\\"/g, '"');
        }
        // Unescape backslashes (e.g. \\n -> \n, \\ -> \)
        // We only handle common escapes to avoid corrupting paths
        content = content.replace(/\\([\\nrt])/g, (m, c) => {
            switch (c) {
                case 'n': return "\n";
                case 'r': return "\r";
                case 't': return "\t";
                case '\\': return "\\";
                default: return c;
            }
        });
        // Map known tools
        if (name === 'shell_exec') {
            return { name: 'shell_exec', parameters: { command: content } };
        }
        if (name.startsWith('fs_')) {
            return { name: name, parameters: { path: content } };
        }
        return null;
    }
    /**
     * Safely parse JSON, attempting to fix common issues like unescaped Windows paths.
     */
    safeJsonParse(jsonString) {
        try {
            return JSON.parse(jsonString);
        }
        catch (e) {
            // Attempt to fix Windows paths: replace single backslashes with double backslashes
            // Matches backslashes that are NOT followed by valid escape chars or another backslash
            const fixed = jsonString.replace(/\\(?![/\\"bfnrtu])/g, "\\\\");
            try {
                return JSON.parse(fixed);
            }
            catch (e2) {
                throw e; // Throw original error if fix fails
            }
        }
    }
    parsePseudoToolCalls(content, silent = false) {
        if (!silent)
            console.log(`[DeepSeekAdapter] Parsing content length: ${content.length}`);
        const calls = [];
        // Helper to normalize and validate calls
        const normalizeCall = (c) => {
            const name = c.name || c.tool_name || c.function || c.tool; // Support aliases like tool_name, tool
            const parameters = c.parameters || c.arguments || c.args;
            if (name && parameters) {
                return {
                    name: name,
                    parameters: parameters,
                    id: c.id
                };
            }
            // Case 2: Simplified Action/Query format
            if (c.action && c.action !== 'text_response') {
                const { action, ...params } = c;
                return {
                    name: action,
                    parameters: params,
                    id: c.id
                };
            }
            return null;
        };
        // 1. Try Markdown Code Blocks with Language Filter
        const markdownRegex = /```(\w*)\s*([\s\S]*?)\s*```/g;
        let match;
        while ((match = markdownRegex.exec(content)) !== null) {
            const lang = (match[1] || "").toLowerCase();
            const inner = match[2];
            // Skip known non-JSON/non-Script blocks
            if (['html', 'css', 'c', 'cpp', 'java', 'go', 'rust', 'markdown', 'text'].includes(lang)) {
                console.log(`[DeepSeekAdapter] Skipping code block with language: ${lang}`);
                continue;
            }
            let parsed = null;
            try {
                parsed = this.safeJsonParse(inner);
            }
            catch (e) {
                // JSON parse failed. Try function call parsing for script languages
                if (['python', 'js', 'javascript', 'ts', 'typescript', 'bash', 'shell'].includes(lang)) {
                    parsed = this.tryParseFunctionCall(inner);
                }
            }
            if (parsed) {
                const list = Array.isArray(parsed) ? parsed : [parsed];
                list.forEach(item => {
                    const normalized = normalizeCall(item);
                    if (normalized)
                        calls.push(normalized);
                });
            }
        }
        // 2. Naked JSON Detection (Fallback)
        // Only attempt if we haven't found calls yet OR if we want to be exhaustive.
        // DeepSeek often outputs naked JSON at the end.
        if (calls.length === 0 && (content.includes('tool_name') || content.includes('"name"')) && (content.includes('parameters') || content.includes('arguments'))) {
            // Strategy: Find the LAST valid JSON object/array in the text
            const firstBrace = content.indexOf('{');
            const lastBrace = content.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace > firstBrace) {
                // Try parsing the whole substring first (clean case)
                const potentialJson = content.substring(firstBrace, lastBrace + 1);
                try {
                    const parsed = this.safeJsonParse(potentialJson);
                    const list = Array.isArray(parsed) ? parsed : [parsed];
                    list.forEach(item => {
                        const normalized = normalizeCall(item);
                        if (normalized)
                            calls.push(normalized);
                    });
                }
                catch (e) {
                    // If full parse fails (likely due to mixed content), try to find the LAST JSON object
                    const lastJsonStart = content.lastIndexOf('{');
                    if (lastJsonStart !== -1 && lastJsonStart < lastBrace) {
                        try {
                            const lastJson = content.substring(lastJsonStart, lastBrace + 1);
                            const parsed = this.safeJsonParse(lastJson);
                            const normalized = normalizeCall(parsed);
                            if (normalized)
                                calls.push(normalized);
                        }
                        catch (e2) {
                            // Ignore
                        }
                    }
                }
            }
        }
        if (calls.length > 0) {
            console.log(`[DeepSeekAdapter] Detected ${calls.length} tool calls: ${JSON.stringify(calls)}`);
            return calls;
        }
        return super.parsePseudoToolCalls(content);
    }
}
