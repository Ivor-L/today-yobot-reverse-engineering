import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
const JSON_EXTENSIONS = new Set([".json", ".jsonl"]);
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function replaceIgnoreCase(value, source, target) {
    if (!source || source.toLowerCase() === target.toLowerCase())
        return value;
    return value.replace(new RegExp(escapeRegExp(source), "gi"), target);
}
function rewriteString(value, mappings) {
    let next = value;
    let count = 0;
    for (const mapping of mappings) {
        const variants = [
            { source: mapping.source, target: mapping.target },
            { source: mapping.source.replace(/\\/g, "/"), target: mapping.target.replace(/\\/g, "/") },
            { source: pathToFileURL(mapping.source).href, target: pathToFileURL(mapping.target).href },
        ];
        for (const variant of variants) {
            const before = next;
            next = replaceIgnoreCase(next, variant.source, variant.target);
            if (next !== before)
                count += 1;
        }
    }
    return { value: next, count };
}
function rewriteValue(value, mappings) {
    if (typeof value === "string")
        return rewriteString(value, mappings);
    if (Array.isArray(value)) {
        let count = 0;
        const next = value.map((item) => {
            const rewritten = rewriteValue(item, mappings);
            count += rewritten.count;
            return rewritten.value;
        });
        return { value: next, count };
    }
    if (value && typeof value === "object") {
        let count = 0;
        const next = {};
        for (const [key, item] of Object.entries(value)) {
            const rewritten = rewriteValue(item, mappings);
            count += rewritten.count;
            next[key] = rewritten.value;
        }
        return { value: next, count };
    }
    return { value, count: 0 };
}
function rewriteJsonText(raw, mappings) {
    try {
        const parsed = JSON.parse(raw);
        const rewritten = rewriteValue(parsed, mappings);
        return { text: `${JSON.stringify(rewritten.value, null, 2)}\n`, count: rewritten.count };
    }
    catch {
        // Session files use a .json extension but may contain JSONL.
    }
    const lines = raw.split(/\r?\n/);
    const output = [];
    let count = 0;
    let parsedAny = false;
    for (const line of lines) {
        if (!line.trim())
            continue;
        try {
            const parsed = JSON.parse(line);
            const rewritten = rewriteValue(parsed, mappings);
            output.push(JSON.stringify(rewritten.value));
            count += rewritten.count;
            parsedAny = true;
        }
        catch {
            return null;
        }
    }
    return parsedAny ? { text: `${output.join("\n")}\n`, count } : null;
}
async function walkFiles(root) {
    const files = [];
    const visit = async (dir) => {
        let entries;
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isSymbolicLink())
                continue;
            if (entry.isDirectory())
                await visit(fullPath);
            else if (entry.isFile())
                files.push(fullPath);
        }
    };
    await visit(root);
    return files;
}
export async function rewritePayloadPaths(payloadRoot, sourceRoots, targetRoots) {
    const mappings = Object.keys(sourceRoots)
        .map((key) => ({ source: sourceRoots[key], target: targetRoots[key] }))
        .sort((a, b) => b.source.length - a.source.length);
    let rewritten = 0;
    const skippedInvalid = [];
    for (const filePath of await walkFiles(payloadRoot)) {
        if (!JSON_EXTENSIONS.has(path.extname(filePath).toLowerCase()))
            continue;
        const raw = await fs.readFile(filePath, "utf8").catch(() => null);
        if (raw === null)
            continue;
        const result = rewriteJsonText(raw, mappings);
        if (!result) {
            skippedInvalid.push(path.relative(payloadRoot, filePath).replace(/\\/g, "/"));
            continue;
        }
        if (result.count > 0) {
            await fs.writeFile(filePath, result.text, "utf8");
            rewritten += result.count;
        }
    }
    return { rewritten, skippedInvalid };
}
export const __test = { rewriteString, rewriteValue, rewriteJsonText };
