import * as fs from 'fs';
import * as path from 'path';
import { resolveBootstrapAgentFileLayout } from '../../core/platform/file_layout.js';
/** Compare two dotted numeric versions. Returns 1 / 0 / -1. */
export function cmpSemver(a, b) {
    const pa = a.split('.').map((n) => parseInt(n, 10));
    const pb = b.split('.').map((n) => parseInt(n, 10));
    for (let i = 0; i < 3; i++) {
        const x = pa[i] || 0;
        const y = pb[i] || 0;
        if (x > y)
            return 1;
        if (x < y)
            return -1;
    }
    return 0;
}
/**
 * Resolve the installed RPA plugin directory.
 *
 * Must stay in lockstep with WeChatRPASkill.getServicePaths() — the agent runs in a
 * different process from Electron main, so it cannot call app.getPath('userData')
 * and relies on the USER_DATA_PATH the main process injects.
 */
function candidatePluginDirs() {
    const dirs = [resolveBootstrapAgentFileLayout({
            userDataRoot: process.env.USER_DATA_PATH?.trim() || undefined,
        }).compatPluginDir];
    if (process.env.RESOURCES_PATH) {
        dirs.push(path.join(process.env.RESOURCES_PATH, 'wechat-rpa'));
    }
    return dirs;
}
let cached = null;
const CACHE_TTL_MS = 60_000;
/**
 * Read the installed RPA version from version.json.
 * Returns null when it cannot be determined — callers must treat that as "unknown",
 * never as "unsupported" (see applyVersionGate).
 */
export function getRpaVersion() {
    if (cached && Date.now() - cached.at < CACHE_TTL_MS)
        return cached.value;
    const value = readRpaVersionAt(candidatePluginDirs());
    cached = { value, at: Date.now() };
    return value;
}
/**
 * Probe version.json in the given directories, first hit wins.
 *
 * Split out from getRpaVersion() because the Electron main process must pass its
 * paths explicitly: USER_DATA_PATH / RESOURCES_PATH are injected into the agent
 * child process only, so main would otherwise fall through to the homedir guess
 * and report a wrong (or absent) version.
 */
export function readRpaVersionAt(dirs) {
    for (const dir of dirs) {
        try {
            const vPath = path.join(dir, 'version.json');
            if (!fs.existsSync(vPath))
                continue;
            const data = JSON.parse(fs.readFileSync(vPath, 'utf-8'));
            if (typeof data.version === 'string' && data.version.trim()) {
                return data.version.trim();
            }
        }
        catch {
            // Unreadable/corrupt version.json is treated as "not found" — fall through
            // to the next candidate, and ultimately to "unknown".
        }
    }
    return null;
}
/** Test seam: drop the memoized version so a smoke test can vary it. */
export function __resetVersionCache() {
    cached = null;
}
const SINCE_RE = /^(#{1,6})\s+(.*?)\s*<!--\s*since:\s*rpa\s*>=\s*(\d+(?:\.\d+)*)\s*-->\s*$/;
const HEADING_RE = /^(#{1,6})\s/;
const FENCE_RE = /^\s*(```|~~~)/;
/** Mark lines that sit inside a fenced code block, so `#` there is not read as a heading. */
function computeFenceMask(lines) {
    const mask = new Array(lines.length).fill(false);
    let open = false;
    for (let i = 0; i < lines.length; i++) {
        if (FENCE_RE.test(lines[i])) {
            // The fence line itself is not gate-able content either way.
            mask[i] = true;
            open = !open;
            continue;
        }
        mask[i] = open;
    }
    return mask;
}
/**
 * Rewrite version-gated sections of a manual for the installed RPA version.
 *
 * A gated section spans from its annotated heading to the next heading of the same
 * or higher level (headings inside code fences do not count).
 */
export function applyVersionGate(content, ctx) {
    if (!content.includes('<!--'))
        return content;
    const lines = content.split(/\r?\n/);
    const inFence = computeFenceMask(lines);
    const out = [];
    let i = 0;
    while (i < lines.length) {
        const match = inFence[i] ? null : SINCE_RE.exec(lines[i]);
        if (!match) {
            out.push(lines[i]);
            i++;
            continue;
        }
        const [, hashes, title, required] = match;
        const level = hashes.length;
        // Scan to the end of this section.
        let end = i + 1;
        while (end < lines.length) {
            if (!inFence[end]) {
                const h = HEADING_RE.exec(lines[end]);
                if (h && h[1].length <= level)
                    break;
            }
            end++;
        }
        const body = lines.slice(i + 1, end);
        out.push(`${hashes} ${title}`);
        if (ctx.rpa === null) {
            // Unknown version: keep the content but flag the uncertainty. Hiding docs
            // because a probe failed would silently break far more than it protects.
            out.push('');
            out.push(`> ℹ️ 此功能需 RPA ≥${required}。当前未能探测到已安装的 RPA 版本，执行前请先向用户确认版本。`);
            out.push(...body);
        }
        else if (cmpSemver(ctx.rpa, required) >= 0) {
            out.push(...body);
        }
        else {
            out.push('');
            out.push(`> ⚠️ 此功能需 RPA ≥${required}，当前安装版本为 ${ctx.rpa}，**不可调用**。`);
            out.push(`> 若用户需要此能力，请引导其更新 RPA 插件，不要尝试执行本节步骤。`);
            out.push('');
        }
        i = end;
    }
    return out.join('\n');
}
