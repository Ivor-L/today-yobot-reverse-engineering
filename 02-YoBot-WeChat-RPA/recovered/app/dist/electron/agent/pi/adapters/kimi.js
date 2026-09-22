import { BaseAdapter } from "./base.js";
export class KimiAdapter extends BaseAdapter {
    id = "kimi";
    matches(provider, model) {
        const p = provider.toLowerCase();
        const m = model.toLowerCase();
        return p.includes("moonshot") || m.includes("kimi") || m.includes("moonshot");
    }
    processThinkingChunk(delta, state) {
        let { isThinking, buffer, currentTag } = state;
        let thinkingDelta = "";
        let contentDelta = "";
        let toolDelta = "";
        buffer += delta;
        let processed = true;
        while (processed && buffer.length > 0) {
            processed = false;
            if (currentTag) {
                if (currentTag === "json_block") {
                    // Special handling for markdown block
                    const closeMatch = /```/.exec(buffer);
                    if (closeMatch) {
                        const closeIdx = closeMatch.index;
                        const closeLen = 3;
                        const fullBlock = buffer.substring(0, closeIdx + closeLen);
                        toolDelta += fullBlock;
                        buffer = buffer.substring(closeIdx + closeLen);
                        currentTag = undefined;
                        processed = true;
                    }
                }
                else {
                    // Existing XML tag logic
                    const closeTagRegex = new RegExp(`</${currentTag}>`, 'i');
                    const closeMatch = closeTagRegex.exec(buffer);
                    if (closeMatch) {
                        const closeIdx = closeMatch.index;
                        const closeTagStr = closeMatch[0];
                        const content = buffer.substring(0, closeIdx);
                        const fullBlock = buffer.substring(0, closeIdx + closeTagStr.length);
                        if (currentTag === "thinking") {
                            thinkingDelta += content;
                            isThinking = false;
                        }
                        else {
                            toolDelta += fullBlock;
                        }
                        buffer = buffer.substring(closeIdx + closeTagStr.length);
                        currentTag = undefined;
                        processed = true;
                    }
                    else {
                        // Closing tag not found
                        if (currentTag === "thinking") {
                            const maxTagLen = 20;
                            const safeLen = buffer.length - maxTagLen;
                            if (safeLen > 0) {
                                thinkingDelta += buffer.substring(0, safeLen);
                                buffer = buffer.substring(safeLen);
                            }
                        }
                    }
                }
            }
            else {
                // Not in tag
                const tagRegex = /<(thinking|function_calls|function_call|tool_code|invoke)/i;
                const match = tagRegex.exec(buffer);
                // Support ```json and ``` json (case insensitive)
                const jsonMatch = /```\s*json/i.exec(buffer);
                let firstMatch = null;
                let isJson = false;
                if (match && jsonMatch) {
                    if (match.index < jsonMatch.index) {
                        firstMatch = match;
                    }
                    else {
                        firstMatch = jsonMatch;
                        isJson = true;
                    }
                }
                else if (match) {
                    firstMatch = match;
                }
                else if (jsonMatch) {
                    firstMatch = jsonMatch;
                    isJson = true;
                }
                if (firstMatch) {
                    const firstIdx = firstMatch.index;
                    contentDelta += buffer.substring(0, firstIdx);
                    buffer = buffer.substring(firstIdx);
                    if (isJson) {
                        const startTag = firstMatch[0]; // "```json"
                        toolDelta += startTag;
                        buffer = buffer.substring(startTag.length);
                        currentTag = "json_block";
                        processed = true;
                    }
                    else {
                        const tagName = firstMatch[1].toLowerCase();
                        if (tagName === "invoke")
                            currentTag = "invoke";
                        else if (tagName === "function_calls" || tagName === "function_call")
                            currentTag = tagName;
                        else if (tagName === "tool_code")
                            currentTag = "tool_code";
                        else if (tagName === "thinking") {
                            currentTag = "thinking";
                            isThinking = true;
                            // Strip start tag logic
                            const endOfTag = buffer.indexOf('>');
                            if (endOfTag !== -1) {
                                buffer = buffer.substring(endOfTag + 1);
                            }
                            else {
                                processed = false; // Wait for '>'
                                break;
                            }
                        }
                        processed = true;
                    }
                }
                else {
                    // No start tag
                    // Cleanup stray closing tags (e.g. </thinking> after nested JSON)
                    const strayClosingTag = /^<\/(thinking|function_calls|function_call|tool_code|invoke)>/i.exec(buffer);
                    if (strayClosingTag) {
                        buffer = buffer.substring(strayClosingTag[0].length);
                        processed = true;
                        continue;
                    }
                    const lastLt = buffer.lastIndexOf("<");
                    const lastTick = buffer.lastIndexOf("`");
                    const potentialTag = (lastLt !== -1 && buffer.length - lastLt < 20);
                    const potentialJson = (lastTick !== -1 && buffer.length - lastTick < 10);
                    if (potentialTag || potentialJson) {
                        const safeIdx = Math.min(lastLt !== -1 ? lastLt : buffer.length, lastTick !== -1 ? lastTick : buffer.length);
                        contentDelta += buffer.substring(0, safeIdx);
                        buffer = buffer.substring(safeIdx);
                    }
                    else {
                        contentDelta += buffer;
                        buffer = "";
                    }
                }
            }
        }
        return { thinkingDelta, contentDelta, toolDelta, newState: { isThinking, buffer, currentTag } };
    }
    parsePseudoToolCalls(content) {
        // 1. Try Kimi's XML format: <invoke name="...">...</invoke>
        const invokeRegex = /<invoke\s+name="([^"]+)">([\s\S]*?)<\/invoke>/g;
        let invokeMatch;
        const xmlCalls = [];
        while ((invokeMatch = invokeRegex.exec(content)) !== null) {
            const toolName = invokeMatch[1].trim();
            const paramsInner = invokeMatch[2];
            const params = {};
            // Regex to find parameters (support both 'parameter' and 'arg' tags)
            const paramRegex = /<(parameter|arg)\s+name="([^"]+)">([\s\S]*?)<\/\1>/g;
            let paramMatch;
            while ((paramMatch = paramRegex.exec(paramsInner)) !== null) {
                const paramName = paramMatch[2];
                const paramValue = paramMatch[3];
                params[paramName] = paramValue;
            }
            xmlCalls.push({
                name: toolName,
                parameters: params
            });
        }
        if (xmlCalls.length > 0) {
            // Fix Kimi hallucination: Map 'command' to 'action' for browser_action
            xmlCalls.forEach(call => {
                if (call.name === "browser_action") {
                    if (call.parameters.command && !call.parameters.action) {
                        call.parameters.action = call.parameters.command;
                        delete call.parameters.command;
                    }
                }
            });
            return xmlCalls;
        }
        // 2. Try Markdown JSON block (Fallback)
        // Regex: ```json (or just ```) + content + ```
        // Support case-insensitive and optional language identifier
        const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
        let jsonMatch;
        const jsonCalls = [];
        // Debug Log
        console.log(`[KimiAdapter] Parsing content for tools (len=${content.length}): ${content.substring(0, 50)}...`);
        while ((jsonMatch = jsonRegex.exec(content)) !== null) {
            try {
                const jsonStr = jsonMatch[1];
                console.log(`[KimiAdapter] Found potential JSON block: ${jsonStr.substring(0, 50)}...`);
                // Try to parse the content as JSON
                // If the content contains multiple JSON objects (e.g. separated by newlines),
                // JSON.parse might fail. We should try to find valid JSON objects.
                let parsed;
                try {
                    parsed = JSON.parse(jsonStr);
                }
                catch (e) {
                    console.warn(`[KimiAdapter] JSON parse failed: ${e.message}`);
                    // Fallback 1: Try to sanitize newlines (common issue in LLM JSON output)
                    try {
                        console.log(`[KimiAdapter] Retrying with newline sanitization...`);
                        // Use regex to identify JSON strings and escape newlines ONLY inside them
                        // Regex explanation: matches a double-quoted string, handling escaped quotes
                        const sanitized = jsonStr.replace(/"(?:[^"\\]|\\.)*"/g, (match) => {
                            return match.replace(/\n/g, "\\n").replace(/\r/g, "");
                        });
                        parsed = JSON.parse(sanitized);
                        // If successful, break out of catch
                        const calls = Array.isArray(parsed) ? parsed : [parsed];
                        console.log(`[KimiAdapter] Successfully parsed with sanitization.`);
                        // Process calls here to avoid code duplication or re-throw to outer
                        calls.forEach((c) => {
                            const name = c.name || c.tool;
                            if (name)
                                jsonCalls.push({ name, parameters: c.parameters || {}, id: c.id });
                        });
                        continue; // Continue to next match
                    }
                    catch (sanitizeE) {
                        // Ignore
                    }
                    // Fallback 2: Inner JSON extraction
                    // If direct parse fails, try to find { ... } pattern
                    // This helps if there is extra text inside the block
                    const innerJsonMatch = /\{[\s\S]*\}/.exec(jsonStr);
                    if (innerJsonMatch) {
                        console.log(`[KimiAdapter] Retrying with inner JSON extraction...`);
                        try {
                            parsed = JSON.parse(innerJsonMatch[0]);
                        }
                        catch (innerE) {
                            // Fallback 3: Inner JSON + Sanitization
                            try {
                                // Smart sanitization: escape newlines ONLY inside JSON strings
                                const innerSanitized = innerJsonMatch[0].replace(/"(?:[^"\\]|\\.)*"/g, (match) => {
                                    return match.replace(/\n/g, "\\n").replace(/\r/g, "");
                                });
                                parsed = JSON.parse(innerSanitized);
                            }
                            catch (innerSanitizeE) {
                                console.warn(`[KimiAdapter] Inner JSON parse failed: ${innerE.message}`);
                                throw innerE;
                            }
                        }
                    }
                    else {
                        throw e;
                    }
                }
                const calls = Array.isArray(parsed) ? parsed : [parsed];
                console.log(`[KimiAdapter] Successfully parsed ${calls.length} calls.`);
                calls.forEach((c) => {
                    // Support both "name" and "tool"
                    const name = c.name || c.tool;
                    if (name) {
                        jsonCalls.push({
                            name: name.trim(),
                            parameters: c.parameters || {},
                            id: c.id
                        });
                    }
                });
            }
            catch (e) {
                // ignore
            }
        }
        if (jsonCalls.length > 0)
            return jsonCalls;
        // 3. Try Doubao-style special tags: <|FunctionCallBegin|>...<|FunctionCallEnd|>
        // Kimi might mimic this if it sees it in the history (from previous Doubao turns)
        const doubaoRegex = /<\|FunctionCallBegin\|>([\s\S]*?)<\|FunctionCallEnd\|>/;
        const doubaoMatch = content.match(doubaoRegex);
        if (doubaoMatch) {
            try {
                console.warn("[KimiAdapter] Detected Doubao-style tool call format (mimicry). Parsing as pseudo tool.");
                const parsed = JSON.parse(doubaoMatch[1]);
                const calls = Array.isArray(parsed) ? parsed : [parsed];
                return calls.map((c) => ({
                    name: c.name,
                    parameters: c.parameters,
                    id: c.id
                }));
            }
            catch (e) {
                console.warn("[KimiAdapter] Failed to parse mimic Doubao tool call", e);
            }
        }
        // 3. Try Python/JS-style function calls: func_name(arg1="val", arg2=123)
        // This is a common hallucination/fallback format for Kimi/Moonshot
        const funcCallRegex = /([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\)/g;
        let funcMatch;
        const textCalls = [];
        // Avoid matching common English words followed by parenthesis if possible, 
        // but Kimi usually outputs these on separate lines or clearly distinct.
        // We'll filter by checking if the name looks like a tool name (snake_case usually)
        while ((funcMatch = funcCallRegex.exec(content)) !== null) {
            const name = funcMatch[1];
            const argsStr = funcMatch[2];
            // Heuristic: valid tool names are usually snake_case or contain underscores, or at least 4 chars
            if (name.length < 3)
                continue;
            // Heuristic: check if it looks like code.
            // If the content is just "I will call func()", it might match.
            // We'll try to parse args as JSON or key=value pairs.
            try {
                let params = {};
                // Case A: valid JSON inside parenthesis? e.g. func({"a": 1})
                if (argsStr.trim().startsWith('{') && argsStr.trim().endsWith('}')) {
                    try {
                        // Try to sanitize single quotes to double quotes for JSON
                        const jsonStr = argsStr.replace(/'/g, '"');
                        params = JSON.parse(jsonStr);
                    }
                    catch (e) {
                        // Parsing failed, try manual extraction
                    }
                }
                // Case B: key="value" or key='value' or key=123
                if (Object.keys(params).length === 0 && argsStr.includes('=')) {
                    const argRegex = /([a-zA-Z0-9_]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([0-9.]+))/g;
                    let argMatch;
                    while ((argMatch = argRegex.exec(argsStr)) !== null) {
                        const key = argMatch[1];
                        const val = argMatch[2] || argMatch[3] || argMatch[4];
                        params[key] = val;
                    }
                }
                // Case C: Single string argument without key? e.g. func("hello")
                // Difficult to map to named parameter without schema. 
                // We will skip implicit positional args for now to be safe, 
                // unless we want to map to 'input' or similar generic name?
                // Let's stick to Case A and B.
                // If we found params or it's a no-arg call
                if (Object.keys(params).length > 0 || argsStr.trim().length === 0) {
                    textCalls.push({ name, parameters: params });
                }
            }
            catch (e) {
                // ignore
            }
        }
        // 4. Try ReAct-style: Action: ... Action Input: ...
        const reactRegex = /Action:\s*([a-zA-Z0-9_]+)\s*\n?Action Input:\s*(\{[\s\S]*?\}|[\s\S]*?)(?=\n|$)/g;
        let reactMatch;
        while ((reactMatch = reactRegex.exec(content)) !== null) {
            const name = reactMatch[1];
            const argsStr = reactMatch[2];
            try {
                // Try to parse JSON first
                let params = {};
                try {
                    params = JSON.parse(argsStr.trim());
                }
                catch (e) {
                    // Fallback to text if not JSON
                    params = { input: argsStr.trim() };
                }
                textCalls.push({ name, parameters: params });
            }
            catch (e) { }
        }
        // 5. Try "Tool: ... Args: ..." format
        const toolArgsRegex = /Tool:\s*([a-zA-Z0-9_]+)\s*\n?Args:\s*(\{[\s\S]*?\}|[\s\S]*?)(?=\n|$)/g;
        let toolArgsMatch;
        while ((toolArgsMatch = toolArgsRegex.exec(content)) !== null) {
            const name = toolArgsMatch[1];
            const argsStr = toolArgsMatch[2];
            try {
                let params = {};
                try {
                    params = JSON.parse(argsStr.trim());
                }
                catch (e) {
                    params = { input: argsStr.trim() };
                }
                textCalls.push({ name, parameters: params });
            }
            catch (e) { }
        }
        // 6. Try "Call: ... with ..." format (Loose parameter mention)
        // e.g. "I will call wechat_send_message with parameters {"name": "Alex"}"
        // 7. Try "tool_name:0{json}" format (seen in Kimi logs)
        const colonIdRegex = /([a-zA-Z0-9_]{3,}):\d+(\{[\s\S]*?\})/g;
        let colonMatch;
        while ((colonMatch = colonIdRegex.exec(content)) !== null) {
            const name = colonMatch[1];
            const jsonStr = colonMatch[2];
            try {
                const params = JSON.parse(jsonStr);
                textCalls.push({ name, parameters: params });
            }
            catch (e) {
                console.warn(`[KimiAdapter] Failed to parse colon-style tool call: ${name}`, e);
            }
        }
        // 8. Try "Tool:ID>JSON" format (Specific Kimi/Moonshot hallucination/fallback)
        // Example: fs_write_file:0>{"file_path": "..."}
        // Regex: Name + Colon + ID + ">" + JSON
        const toolIdRegex = /([a-zA-Z0-9_]+):(\d+)>(\{[\s\S]*?\})/g;
        let toolIdMatch;
        while ((toolIdMatch = toolIdRegex.exec(content)) !== null) {
            const name = toolIdMatch[1];
            const jsonStr = toolIdMatch[3];
            try {
                const params = JSON.parse(jsonStr);
                textCalls.push({ name, parameters: params });
            }
            catch (e) {
                console.warn(`[KimiAdapter] Failed to parse tool-id style call: ${name}`, e);
            }
        }
        // 9. Try <|tool_call_begin|> format (SGLang/vLLM raw token leak)
        // Example: <|tool_call_begin|>functions.get_weather:2<|tool_call_argument_begin|>{"location": "Beijing"}<|tool_call_end|>
        const rawTokenRegex = /<\|tool_call_begin\|>(?:functions\.)?([a-zA-Z0-9_]+):\d+<\|tool_call_argument_begin\|>(\{[\s\S]*?\})<\|tool_call_end\|>/g;
        let rawTokenMatch;
        while ((rawTokenMatch = rawTokenRegex.exec(content)) !== null) {
            const name = rawTokenMatch[1];
            const jsonStr = rawTokenMatch[2];
            try {
                const params = JSON.parse(jsonStr);
                textCalls.push({ name, parameters: params });
            }
            catch (e) {
                console.warn(`[KimiAdapter] Failed to parse raw token style call: ${name}`, e);
            }
        }
        if (textCalls.length > 0) {
            return textCalls;
        }
        // 7. Fallback to base (Markdown JSON)
        return super.parsePseudoToolCalls(content);
    }
}
