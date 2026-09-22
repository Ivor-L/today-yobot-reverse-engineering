/**
 * Attempts to parse a JSON string, applying repairs for common LLM formatting errors
 * such as invalid escape characters (e.g., Windows paths, regex patterns), unescaped newlines,
 * and unescaped double quotes inside strings.
 */
export function safeJsonParse(jsonString) {
    try {
        return JSON.parse(jsonString);
    }
    catch (error) {
        // Strategy 1: Fix unescaped control characters (newlines, tabs) AND unescaped quotes inside strings
        try {
            const sanitized = repairJsonString(jsonString);
            return JSON.parse(sanitized);
        }
        catch (e2) {
            // Strategy 2: Fix invalid backslashes (often Windows paths or regex)
            // Apply this ON TOP of the repair logic
            try {
                const sanitized = repairJsonString(jsonString);
                const fixedBackslashes = sanitized.replace(/\\(?![/\\bfnrtu"])/g, "\\\\");
                return JSON.parse(fixedBackslashes);
            }
            catch (e3) {
                // Strategy 3: Just fix backslashes on original (in case our state machine broke something)
                try {
                    const fixedString = jsonString.replace(/\\(?![/\\bfnrtu"])/g, "\\\\");
                    return JSON.parse(fixedString);
                }
                catch (e4) {
                    console.warn("[SafeJsonParse] Failed to repair JSON:", jsonString.slice(0, 100) + "...");
                    throw error; // Throw original error
                }
            }
        }
    }
}
/**
 * Helper to repair JSON strings by:
 * 1. Escaping control characters (newlines, tabs) inside string literals.
 * 2. Escaping unescaped double quotes inside string literals (heuristic based on lookahead).
 *
 * This preserves formatting whitespace outside of strings (which is valid JSON).
 */
function repairJsonString(str) {
    let result = '';
    let i = 0;
    let inString = false;
    let isEscaped = false;
    while (i < str.length) {
        const char = str[i];
        if (inString) {
            if (isEscaped) {
                // Previous char was backslash, so this char is escaped.
                isEscaped = false;
                result += char;
                i++;
            }
            else {
                if (char === '\\') {
                    isEscaped = true;
                    result += char;
                    i++;
                }
                else if (char === '"') {
                    // Potential end of string?
                    // Check lookahead for structural markers (skipping whitespace)
                    let j = i + 1;
                    while (j < str.length && /\s/.test(str[j]))
                        j++;
                    const nextChar = str[j];
                    // Heuristic: If followed by : , } ] it is likely structural (End of String).
                    // Otherwise it is likely an internal unescaped quote.
                    const isStructural = nextChar === ':' || nextChar === ',' || nextChar === '}' || nextChar === ']';
                    if (isStructural) {
                        // It's the end of the string
                        inString = false;
                        result += char;
                        i++;
                    }
                    else {
                        // It's an internal unescaped quote, escape it
                        result += '\\"';
                        i++;
                    }
                }
                else {
                    const code = char.charCodeAt(0);
                    if (code < 32) {
                        // Control characters need escaping
                        if (char === '\n')
                            result += '\\n';
                        else if (char === '\r')
                            result += '\\r';
                        else if (char === '\t')
                            result += '\\t';
                        else if (char === '\b')
                            result += '\\b';
                        else if (char === '\f')
                            result += '\\f';
                        else
                            result += '\\u' + code.toString(16).padStart(4, '0');
                        i++;
                    }
                    else {
                        result += char;
                        i++;
                    }
                }
            }
        }
        else {
            // Not in string
            if (char === '"') {
                inString = true;
            }
            result += char;
            i++;
        }
    }
    return result;
}
