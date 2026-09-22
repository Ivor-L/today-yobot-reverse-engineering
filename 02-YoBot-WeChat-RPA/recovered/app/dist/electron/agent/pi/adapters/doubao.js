import { BaseAdapter } from "./base.js";
import { parseSeedToolCalls, stripSeedToolCalls } from "./seed_tool_call.js";
export class DoubaoAdapter extends BaseAdapter {
    id = "doubao";
    matches(provider, model) {
        const p = provider.toLowerCase();
        const m = model.toLowerCase();
        return p.includes("doubao") || m.includes("doubao") || m.includes("ep-");
    }
    processThinkingChunk(delta, state) {
        let thinkingDelta = "";
        let contentDelta = "";
        let toolDelta = "";
        let { isThinking, buffer } = state;
        // 1. JSON Unwrapping (Hoist from processStandardContent)
        // Handle case where Doubao returns JSON-wrapped content in the stream
        let effectiveDelta = delta;
        const trimmedDelta = delta.trim();
        if (trimmedDelta.startsWith('{"type":"')) {
            try {
                const obj = JSON.parse(delta);
                if (obj.type === 'thinking' && obj.thinking) {
                    return {
                        thinkingDelta: obj.thinking,
                        contentDelta: "",
                        toolDelta: "",
                        newState: { isThinking: true, buffer: "" }
                    };
                }
                if (obj.type === 'text' && obj.text) {
                    effectiveDelta = obj.text;
                    // Force switch to non-thinking state if we receive text JSON
                    isThinking = false;
                }
            }
            catch (e) {
                // ignore partial JSON
            }
        }
        // Combine buffer with new delta
        let currentText = buffer + effectiveDelta;
        buffer = ""; // Reset buffer, will be refilled if needed
        // --- Naked JSON Detection (Streaming) ---
        const trimmed = currentText.trimStart();
        if (!isThinking && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
            // Heuristic: If it starts with {"name" or [{"name" (with optional whitespace), treat as potential tool call
            const objectRegex = /^\{\s*"(?:name|tool)"/;
            const arrayRegex = /^\[\s*\{\s*"(?:name|tool)"/;
            const isToolObject = objectRegex.test(trimmed);
            const isToolArray = arrayRegex.test(trimmed);
            if (isToolObject || isToolArray) {
                try {
                    JSON.parse(currentText);
                    // It is complete JSON. Flush as toolDelta.
                    console.log("[DoubaoAdapter] Streaming naked JSON tool call");
                    return {
                        thinkingDelta: "",
                        contentDelta: "",
                        toolDelta: currentText,
                        newState: { isThinking, buffer: "" }
                    };
                }
                catch (e) {
                    // Incomplete. Buffer it.
                    // Verify it's not getting too huge (safety)
                    if (currentText.length < 4000) {
                        return {
                            thinkingDelta: "",
                            contentDelta: "",
                            toolDelta: "",
                            newState: { isThinking, buffer: currentText }
                        };
                    }
                }
            }
            else if (trimmed.length < 20) {
                // Buffer short starts just in case (e.g. just "[" or "[{")
                return {
                    thinkingDelta: "",
                    contentDelta: "",
                    toolDelta: "",
                    newState: { isThinking, buffer: currentText }
                };
            }
        }
        // -----------------------------
        const startTag = "<|FunctionCallBegin|>";
        const endTag = "<|FunctionCallEnd|>";
        let processed = false;
        // Loop to handle multiple blocks in one chunk (unlikely but possible)
        while (!processed && currentText.length > 0) {
            const startIndex = currentText.indexOf(startTag);
            if (startIndex !== -1) {
                // We have a start tag
                const endIndex = currentText.indexOf(endTag, startIndex);
                if (endIndex !== -1) {
                    // We have a COMPLETE tool call
                    const preText = currentText.substring(0, startIndex);
                    const toolCallText = currentText.substring(startIndex, endIndex + endTag.length);
                    const postText = currentText.substring(endIndex + endTag.length);
                    // Process preText
                    if (preText) {
                        const res = this.processStandardContent(preText, isThinking);
                        thinkingDelta += res.thinkingDelta;
                        contentDelta += res.contentDelta;
                        isThinking = res.newState.isThinking;
                    }
                    // Process toolCallText -> toolDelta
                    console.log("[DoubaoAdapter] Captured hidden tool call block (length=" + toolCallText.length + ")");
                    toolDelta += toolCallText;
                    // Continue with postText
                    currentText = postText;
                }
                else {
                    // Start tag exists but NO end tag -> Buffer everything from start tag
                    const preText = currentText.substring(0, startIndex);
                    if (preText) {
                        const res = this.processStandardContent(preText, isThinking);
                        thinkingDelta += res.thinkingDelta;
                        contentDelta += res.contentDelta;
                        isThinking = res.newState.isThinking;
                    }
                    buffer = currentText.substring(startIndex);
                    processed = true;
                }
            }
            else {
                // No start tag found.
                // Check for partial start tag at the end
                let partialMatch = false;
                for (let i = 1; i < startTag.length; i++) {
                    if (currentText.endsWith(startTag.substring(0, i))) {
                        // Found partial match at the end
                        const safePart = currentText.substring(0, currentText.length - i);
                        const bufferedPart = currentText.substring(currentText.length - i);
                        if (safePart) {
                            const res = this.processStandardContent(safePart, isThinking);
                            thinkingDelta += res.thinkingDelta;
                            contentDelta += res.contentDelta;
                            isThinking = res.newState.isThinking;
                        }
                        buffer = bufferedPart;
                        partialMatch = true;
                        break;
                    }
                }
                if (!partialMatch) {
                    // Safe to process all
                    const res = this.processStandardContent(currentText, isThinking);
                    thinkingDelta += res.thinkingDelta;
                    contentDelta += res.contentDelta;
                    isThinking = res.newState.isThinking;
                }
                processed = true;
            }
        }
        return {
            thinkingDelta,
            contentDelta,
            toolDelta,
            newState: { isThinking, buffer }
        };
    }
    processStandardContent(delta, isThinking) {
        let thinkingDelta = "";
        let contentDelta = "";
        let newIsThinking = isThinking;
        // 2. Standard Tag Processing
        if (!isThinking && delta.includes("<thinking>")) {
            newIsThinking = true;
            const parts = delta.split("<thinking>");
            if (parts[0])
                contentDelta += parts[0];
            if (parts[1])
                thinkingDelta += parts[1];
        }
        else if (isThinking && delta.includes("</thinking>")) {
            newIsThinking = false;
            const parts = delta.split("</thinking>");
            if (parts[0])
                thinkingDelta += parts[0];
            if (parts[1])
                contentDelta += parts[1];
        }
        else {
            if (isThinking) {
                thinkingDelta = delta;
            }
            else {
                contentDelta = delta;
            }
        }
        return {
            thinkingDelta,
            contentDelta,
            newState: { isThinking: newIsThinking, buffer: "" }
        };
    }
    /**
     * doubao-seed 会把工具调用写进 reasoning_content 而不是 tool_calls（见 seed_tool_call.ts）。
     * 单独开一个钩子、且只认 `<seed:tool_call>` 显式标记：思考链里模型盘算
     * 「我可以调 xxx」是常态，绝不能用宽松匹配把盘算变成真实副作用。
     */
    parseLeakedToolCalls(thinking) {
        return parseSeedToolCalls(thinking);
    }
    stripLeakedToolCalls(thinking) {
        return stripSeedToolCalls(thinking);
    }
    parsePseudoToolCalls(content) {
        // 0. Seed XML（同样可能漏进正文）
        const seedCalls = parseSeedToolCalls(content);
        if (seedCalls)
            return seedCalls;
        // 1. Specialized tags
        const specializedRegex = /<\|FunctionCallBegin\|>([\s\S]*?)<\|FunctionCallEnd\|>/;
        const specializedMatch = content.match(specializedRegex);
        if (specializedMatch) {
            try {
                const parsed = JSON.parse(specializedMatch[1]);
                const calls = Array.isArray(parsed) ? parsed : [parsed];
                return calls.map((c) => ({
                    name: c.name,
                    parameters: c.parameters,
                    id: c.id
                }));
            }
            catch (e) {
                console.warn("[DoubaoAdapter] Failed to parse specialized tool call", e);
            }
        }
        // 2. Base Adapter (Markdown blocks)
        const baseCalls = super.parsePseudoToolCalls(content);
        if (baseCalls)
            return baseCalls;
        // 3. Naked JSON (Fallback for models leaking raw JSON)
        // Only attempt if we see "name" and "parameters" to avoid false positives
        if (content.includes('"name"') && content.includes('"parameters"')) {
            // Priority: Try to find a JSON Array first
            const firstBracket = content.indexOf('[');
            const lastBracket = content.lastIndexOf(']');
            if (firstBracket !== -1 && lastBracket > firstBracket) {
                const potentialArray = content.substring(firstBracket, lastBracket + 1);
                try {
                    const parsed = JSON.parse(potentialArray);
                    if (Array.isArray(parsed) && parsed.every((c) => c.name && c.parameters)) {
                        console.log("[DoubaoAdapter] Captured naked JSON tool call array");
                        return parsed.map((c) => ({
                            name: c.name,
                            parameters: c.parameters,
                            id: c.id
                        }));
                    }
                }
                catch (e) {
                    // Ignore
                }
            }
            // Fallback: Try to find a JSON Object
            const firstBrace = content.indexOf('{');
            const lastBrace = content.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace > firstBrace) {
                const potentialJson = content.substring(firstBrace, lastBrace + 1);
                try {
                    const parsed = JSON.parse(potentialJson);
                    // Check for single tool call object
                    if (parsed.name && parsed.parameters) {
                        console.log("[DoubaoAdapter] Captured naked JSON tool call");
                        return [{
                                name: parsed.name,
                                parameters: parsed.parameters,
                                id: parsed.id
                            }];
                    }
                }
                catch (e) {
                    // Ignore JSON parse errors
                }
            }
        }
        return null;
    }
}
