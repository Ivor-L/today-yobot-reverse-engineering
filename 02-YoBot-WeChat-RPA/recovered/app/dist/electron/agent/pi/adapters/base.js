export class BaseAdapter {
    id = "base";
    matches(provider, model) {
        return false;
    }
    processThinkingChunk(delta, state) {
        return {
            thinkingDelta: "",
            contentDelta: delta,
            newState: state
        };
    }
    parsePseudoToolCalls(content) {
        // Generic Markdown JSON block parsing as fallback
        const markdownRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
        let match;
        while ((match = markdownRegex.exec(content)) !== null) {
            const inner = match[1];
            // Support both "name" (standard) and "tool" (legacy prompt instruction)
            if ((inner.includes('"name"') || inner.includes('"tool"')) && inner.includes('"parameters"')) {
                try {
                    const parsed = JSON.parse(inner);
                    const calls = Array.isArray(parsed) ? parsed : [parsed];
                    const validCalls = calls.map((c) => {
                        // Standardize on 'name' or 'tool' key
                        const name = c.tool || c.name || c.function;
                        if (name && c.parameters) {
                            return {
                                name: name,
                                parameters: c.parameters,
                                id: c.id
                            };
                        }
                        return null;
                    }).filter((c) => c !== null);
                    if (validCalls.length > 0) {
                        return validCalls;
                    }
                }
                catch (e) {
                    // Ignore
                }
            }
        }
        return null;
    }
    sanitizeMessages(messages) {
        return messages;
    }
    normalizeError(error) {
        return error instanceof Error ? error : new Error(String(error));
    }
}
