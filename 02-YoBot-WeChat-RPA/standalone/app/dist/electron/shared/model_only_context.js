const LEGACY_DOCUMENT_BLOCK = /(?:\r?\n)*=== Document:\s*[^\r\n]*?\s*===\r?\n[\s\S]*?=== End Document ===(?:\r?\n)*/g;
const DOCUMENT_CONTEXT_BLOCK = /(?:\r?\n)*<yoko-document-context\b[^>]*>[\s\S]*?<\/yoko-document-context>(?:\r?\n)*/gi;
const FILE_PLACEHOLDER = /\[File:\s*[^\]]+\]/gi;
function escapeAttribute(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
export function buildDocumentContext(fileName, content) {
    return [
        `<yoko-document-context name="${escapeAttribute(fileName)}">`,
        content,
        "</yoko-document-context>",
    ].join("\n");
}
export function stripModelOnlyContext(text) {
    if (!text)
        return text;
    return text
        .replace(DOCUMENT_CONTEXT_BLOCK, "\n")
        .replace(LEGACY_DOCUMENT_BLOCK, "\n")
        .replace(/\n*<session_context>[\s\S]*?<\/session_context>\s*/g, "")
        .replace(/\n*<!--\s*yoko-ctx-ids:[\s\S]*?-->\s*/g, "")
        .replace(/\n*<attached_file\b[^>]*\/>\s*/g, "")
        .replace(/\[Historical tool observation - reference only\][\s\S]*?(?:\n\n|$)/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
export function visibleTextFromContent(content) {
    const textParts = typeof content === "string"
        ? [content]
        : Array.isArray(content)
            ? content
                .filter((part) => part?.type === "text" && typeof part.text === "string")
                .map((part) => part.text)
            : [];
    return textParts
        .map(stripModelOnlyContext)
        .filter(Boolean)
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
export function titleTextFromContent(content) {
    const visible = visibleTextFromContent(content);
    const question = visible.replace(FILE_PLACEHOLDER, "").replace(/\n{2,}/g, "\n").trim();
    return question || visible;
}
