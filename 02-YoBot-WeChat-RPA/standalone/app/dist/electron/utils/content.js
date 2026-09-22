export function extractText(content) {
    if (typeof content === "string") {
        return content;
    }
    if (Array.isArray(content)) {
        return content
            .filter((part) => part.type === "text")
            .map((part) => part.text || "")
            .join("\n");
    }
    return "";
}
export function extractTextWithImages(content) {
    if (typeof content === "string") {
        return content;
    }
    if (Array.isArray(content)) {
        return content
            .map((part) => {
            if (part.type === "text")
                return part.text || "";
            if (part.type === "image_url")
                return "[Image]";
            return "";
        })
            .join("\n");
    }
    return "";
}
