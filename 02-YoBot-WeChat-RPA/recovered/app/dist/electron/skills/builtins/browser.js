import { BrowserService } from "../../browser/service.js";
import { SCREENSHOT_RESULT_HINT } from "../../browser/screenshot_path.js";
import { UserInteractionRequiredError } from "../../agent/errors.js";
const browserService = BrowserService.getInstance();
export const browserSkill = {
    name: "browser",
    description: "The INTERNET INTERFACE. Use this for ANY interaction with websites (Twitter, WeChat, etc.). Supports 'launch' mode to auto-start Chrome. IMPORTANT: Once you have started a browser session, you MUST use this tool for ALL subsequent actions (clicking, typing, scrolling, NAVIGATING to new URLs). CRITICAL TOKEN SAVING RULE: You MUST batch consecutive actions (e.g., click then type then click) using `action='run_script'` instead of calling `act` multiple times. PREFER this over 'web_fetch' for dynamic sites. RESTRICTION: Do NOT use this skill for WeChat RPA configuration or local file management.",
    instructions: "This skill provides a full browser environment (Chrome). \nTypical Workflow: \n1. Launch/Connect: `browser_action(action='connect', launchMode='launch')`\n2. Interact: `browser_action(action='act', kind='click'|'type'|'navigate'...)`\n   - The 'act' action AUTOMATICALLY returns a fresh snapshot of the page (interactive elements, text, inputs). You do NOT need to call 'snapshot' separately after each action.\n   - Use the element IDs (e.g., [12]) from the snapshot to target elements.\n   - Supports file uploads (including via button triggers) and screenshots.\n3. Login: If a login page is detected, the tool will pause and ask you to log in manually.\n4. ADVANCED (DSL Script): To save tokens and execute multiple steps instantly, use `action='run_script'` and provide a `script` string. Supported commands: `CLICK <id>`, `TYPE <id> \"text\"`, `WAIT <ms>`, `NAVIGATE <url>`, `SCROLL <up|down>`, `SWITCH_TAB <id>`, `CLOSE_TAB`, `BACK`, `RELOAD`, `EVAL <js_code>`. Example: `CLICK 12\\nWAIT 2000\\nEVAL document.querySelector('.comment-icon').click()`.\n5. RESTRICTION: Do NOT use this skill for WeChat RPA configuration or local file management. Use 'wechat-rpa' skill instead.",
    tools: [
        {
            definition: {
                name: "browser_close",
                description: "Close the browser instance and release resources. Use this when the browser task is complete or if you need to restart the browser.",
                parameters: {
                    type: "object",
                    properties: {},
                    required: []
                },
                enterprise: {
                    namespace: "browser",
                    capability: "close",
                    sideEffect: "local",
                    risk: "low",
                    reversible: false,
                    idempotent: true,
                    approval: "never",
                    executionMode: "sequential",
                },
            },
            execute: async (args, signal) => {
                await browserService.close();
                return "Browser closed.";
            }
        },
        {
            definition: {
                name: "browser_action",
                description: "Perform browser actions. CRITICAL: To save tokens and execute multiple steps instantly, ALWAYS prefer using `action='run_script'` instead of calling `act` multiple times sequentially.",
                parameters: {
                    type: "object",
                    properties: {
                        action: {
                            type: "string",
                            enum: ["connect", "snapshot", "act", "launch", "run_script"],
                            description: "The action to perform."
                        },
                        // Connect params
                        port: { type: "number", description: "Chrome remote debugging port (default: 9222)" },
                        host: { type: "string", description: "Chrome host (default: 127.0.0.1)" },
                        launchMode: {
                            type: "string",
                            enum: ["attach", "launch", "force_launch"],
                            description: "Connection mode: 'attach' (default) connects to existing; 'launch' tries to launch if connect fails; 'force_launch' kills existing chrome and restarts with debugging enabled (Use with caution!)"
                        },
                        useTempProfile: { type: "boolean", description: "If true, uses a fresh temporary profile. Use this if default profile fails to launch/connect. Warning: You will lose saved logins!" },
                        profileName: { type: "string", description: "Name of the persistent profile to use (e.g., 'marketing_account'). Saves under the Agent user-data directory." },
                        mobile: { type: "boolean", description: "If true, emulate mobile device." },
                        headless: { type: "boolean", description: "If true, runs in headless mode (default: false)." },
                        // Act params
                        kind: {
                            type: "string",
                            enum: ["click", "type", "navigate", "scroll", "wait", "back", "reload", "screenshot", "switch_tab", "close_tab", "new_tab", "upload", "get_cookies"],
                            description: "Type of action to perform. Note: 'upload' supports both file inputs and buttons that trigger file selection."
                        },
                        targetId: { type: "string", description: "The ID of the element to interact with (from snapshot)" },
                        text: { type: "string", description: "Text to type (for type action)" },
                        url: { type: "string", description: "URL to navigate to (for navigate action OR connect action)" },
                        direction: { type: "string", enum: ["up", "down"], description: "Scroll direction" },
                        tabId: { type: "string", description: "Tab ID for switch_tab or close_tab" },
                        files: { type: "array", items: { type: "string" }, description: "List of absolute file paths to upload (for upload action). Supports both <input type='file'> and buttons that trigger file selection." },
                        script: { type: "string", description: "DSL script to run (for run_script action). Commands separated by newline." },
                        snapshotMode: {
                            type: "string",
                            enum: ["compact", "full"],
                            description: "Snapshot detail level. 'compact' keeps key actionable nodes with strong truncation. 'full' keeps a larger snapshot."
                        }
                    },
                    required: ["action"]
                },
                enterprise: {
                    namespace: "browser",
                    capability: "interact",
                    sideEffect: "external",
                    risk: "high",
                    reversible: false,
                    idempotent: false,
                    approval: "policy",
                    requiredScopes: ["browser:interactive"],
                    workspacePathArrayParams: ["files"],
                    executionMode: "sequential",
                },
            },
            execute: async (args, signal) => {
                // Auto-correct: if action is a valid kind but not a top-level action, remap it
                const validKinds = ["click", "type", "navigate", "scroll", "wait", "back", "reload", "screenshot", "switch_tab", "close_tab", "new_tab", "upload", "get_cookies"];
                // Handle case where LLM uses 'kind' as 'action' (e.g. action='navigate')
                if (!["connect", "snapshot", "act", "launch", "run_script"].includes(args.action) && validKinds.includes(args.action)) {
                    args.kind = args.action;
                    args.action = "act";
                }
                // Handle case where LLM uses 'act' but forgets 'kind', but provides 'action' as 'navigate' in a nested way or mixed up
                // This is tricky, but let's stick to the main auto-correction.
                if (args.action === 'execute') {
                    return "Error: The 'execute' action is not supported. Please use standard actions: click, type, navigate, scroll, wait, back, reload, screenshot, run_script.";
                }
                const { action, port, host, launchMode, useTempProfile, profileName, mobile, headless, kind, targetId: _targetId, elementId, text, url, direction, tabId, selector, files, script, snapshotMode } = args;
                // Robustness: Map 'selector' or 'elementId' to 'targetId' if possible, to handle LLM hallucinations
                // The LLM might output selector: "#38" or "#\38" instead of targetId: 38
                let targetId = _targetId || elementId;
                if (!targetId && selector) {
                    // Match number, #number, or escaped #\number
                    const match = String(selector).match(/^#?\\?(\d+)\s*$/);
                    if (match) {
                        targetId = match[1];
                    }
                }
                if (signal?.aborted)
                    throw new Error("Aborted");
                try {
                    // Handle 'launch' alias
                    if (action === "connect" || action === "launch") {
                        let userDataDir = undefined;
                        if (useTempProfile) {
                            const os = await import('os');
                            const path = await import('path');
                            userDataDir = path.join(os.tmpdir(), `chrome-agent-${Date.now()}`);
                        }
                        // If action is explicitly 'launch', force the launch mode
                        const effectiveLaunchMode = (action === "launch") ? "launch" : (launchMode || 'attach');
                        await browserService.connect({
                            chromeDebuggingPort: port || 9222,
                            chromeHost: host || "127.0.0.1",
                            launchMode: effectiveLaunchMode,
                            userDataDir,
                            profileName,
                            mobile,
                            headless
                        }, signal);
                        let msg = "Connected to browser successfully.";
                        // Auto-navigate if URL is provided during connect
                        if (url) {
                            await browserService.act({ kind: 'navigate', url }, signal);
                            msg += ` Navigated to ${url}.`;
                        }
                        return msg + " You can now use 'snapshot' to view the page.";
                    }
                    // Helper to format snapshot
                    const compactInteractiveSummary = (summary, mode = "compact", pageUrl = "") => {
                        const isSearchPage = /\/search\/|type=general|enter_from=discover|discover/i.test(pageUrl);
                        const isDouyinPage = /douyin\.com/i.test(pageUrl);
                        const isModalPage = /modal_id=/i.test(pageUrl);
                        const maxChars = mode === "full" ? 50000 : (isSearchPage ? 24000 : 12000);
                        if (!summary) {
                            return summary;
                        }
                        if (mode === "full") {
                            if (summary.length <= maxChars) {
                                return summary;
                            }
                            return summary.slice(0, maxChars) + "\n\n... [Snapshot Truncated due to length] ...";
                        }
                        if (summary.length <= maxChars && !isSearchPage) {
                            return summary;
                        }
                        const lines = summary.split('\n');
                        const actionRegex = /<(textbox|searchbox|button|link|combobox|dialog|menuitem|tab|listitem|checkbox|radio|switch|textarea|input)\b|name="[^"]*(登录|扫码|搜索|评论|发布|提交|发送|下一步|继续|确认|关闭)[^"]*"/i;
                        const resultRegex = /<(image|link|button|article|listitem|heading)\b/i;
                        const resultSignalRegex = /name="[^"]{4,}"|url="[^"]+"/i;
                        const modalActionRegex = /name="[^"]*(评论|发送|留下你的精彩评论吧|feed-comment-icon|发布)[^"]*"|value="[^"]+"/i;
                        const searchSignalRegex = /name="[^"]*(openclaw|教程|搜索|视频)[^"]*"|url="https?:\/\/[^"]+"/i;
                        const ranked = lines
                            .map((line, idx) => {
                            const trimmed = line.trim();
                            if (!trimmed || /<InlineTextBox\b/i.test(trimmed)) {
                                return null;
                            }
                            let score = 0;
                            const isAction = actionRegex.test(trimmed);
                            const isResult = resultRegex.test(trimmed) && resultSignalRegex.test(trimmed);
                            if (isAction)
                                score += 80;
                            if (isResult)
                                score += 35;
                            if (/name="/i.test(trimmed))
                                score += 15;
                            if (/value="[^"]+"/i.test(trimmed))
                                score += 18;
                            if (/url="[^"]+"/i.test(trimmed))
                                score += 12;
                            if (isSearchPage && searchSignalRegex.test(trimmed))
                                score += 45;
                            if (isModalPage && modalActionRegex.test(trimmed))
                                score += 80;
                            if (isDouyinPage && /评论|发送|搜索|留下你的精彩评论吧|feed-comment-icon/i.test(trimmed))
                                score += 30;
                            if (isModalPage)
                                score += Math.floor((idx / Math.max(lines.length, 1)) * 24);
                            if (score <= 0) {
                                return null;
                            }
                            return { line: trimmed, score, idx };
                        })
                            .filter((item) => !!item)
                            .sort((a, b) => b.score - a.score || b.idx - a.idx);
                        const seen = new Set();
                        const focused = [];
                        const maxFocused = isModalPage ? 180 : (isSearchPage ? 170 : 130);
                        for (const item of ranked) {
                            if (seen.has(item.line))
                                continue;
                            seen.add(item.line);
                            focused.push(item.line);
                            if (focused.length >= maxFocused)
                                break;
                        }
                        const head = summary.slice(0, isSearchPage ? 2200 : 3200);
                        const tail = summary.slice(-(isSearchPage ? 1800 : 2200));
                        const focusedBlock = focused.length > 0 ? focused.join('\n') : summary.slice(3200, isSearchPage ? 12000 : 7600);
                        let compacted = `${head}\n\n... [Focused Interactive Elements] ...\n${focusedBlock}\n\n... [Tail Context] ...\n${tail}\n\n... [Snapshot Compacted: original ${summary.length} chars] ...`;
                        if (compacted.length > maxChars) {
                            compacted = compacted.slice(0, maxChars) + "\n\n... [Snapshot Truncated due to compact limit] ...";
                        }
                        return compacted;
                    };
                    const formatSnapshot = (snapshot, mode = "compact") => {
                        if (snapshot.suggestManualLogin) {
                            throw new UserInteractionRequiredError(`Login Page Detected (${snapshot.url}). Please log in manually in the opened browser window. Once you have logged in, reply "continue" to resume the task.`);
                        }
                        let tabsInfo = "";
                        if (snapshot.tabs && snapshot.tabs.length > 0) {
                            tabsInfo = "\n\n### Open Tabs:\n" + snapshot.tabs.map((t) => `- [${t.id}] ${t.title} ${t.active ? '(Active)' : ''}`).join('\n');
                        }
                        const normalizedMode = mode === "full" ? "full" : "compact";
                        const summary = compactInteractiveSummary(snapshot.summary, normalizedMode, snapshot.url);
                        return `## Browser Snapshot\n**Title**: ${snapshot.title}\n**URL**: ${snapshot.url}${tabsInfo}\n\n### Interactive Elements:\n${summary}`;
                    };
                    if (action === "snapshot") {
                        const snapshot = await browserService.getSnapshot(signal);
                        return formatSnapshot(snapshot, snapshotMode === "full" ? "full" : "compact");
                    }
                    if (action === "run_script") {
                        if (!script)
                            throw new Error("Missing 'script' parameter for 'run_script' action.");
                        const lines = script.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
                        let executionLog = "Executed Script:\n";
                        let stepCount = 0;
                        for (const line of lines) {
                            stepCount++;
                            try {
                                // Match commands like: CLICK 12, TYPE 15 "hello", WAIT 1000, SCROLL down, BACK
                                // Added support for raw CSS selectors in CLICK and TYPE (e.g., CLICK input[type="search"])
                                const clickMatch = line.match(/^CLICK\s+(.+)/i);
                                const typeMatch = line.match(/^TYPE\s+([^"]+)\s+"(.*)"/i) || line.match(/^TYPE\s+([^']+)\s+'(.*)'/i) || line.match(/^TYPE\s+(\S+)\s+(.+)/i);
                                const waitMatch = line.match(/^WAIT\s+(\d+)/i);
                                const navigateMatch = line.match(/^NAVIGATE\s+(.+)/i);
                                const scrollMatch = line.match(/^SCROLL\s+(up|down)/i);
                                const switchTabMatch = line.match(/^SWITCH_TAB\s+(\d+)/i);
                                const closeTabMatch = line.match(/^CLOSE_TAB/i);
                                const evalMatch = line.match(/^EVAL\s+(.+)/i);
                                let waitMs = 0;
                                if (clickMatch && !/^CLICK/i.test(clickMatch[1])) {
                                    const target = clickMatch[1].trim();
                                    // If it's a number (ID), use targetId, else use selector
                                    const isId = /^\[?\d+\]?$/.test(target);
                                    if (isId) {
                                        await browserService.act({ kind: 'click', targetId: target.replace(/[\[\]]/g, '') }, signal);
                                    }
                                    else {
                                        await browserService.act({ kind: 'click', selector: target }, signal);
                                    }
                                    executionLog += `[Step ${stepCount}] CLICK ${target} -> Success\n`;
                                    waitMs = 900;
                                }
                                else if (typeMatch) {
                                    const target = typeMatch[1].trim();
                                    let text = typeMatch[2];
                                    const isId = /^\[?\d+\]?$/.test(target);
                                    if (isId) {
                                        await browserService.act({ kind: 'type', targetId: target.replace(/[\[\]]/g, ''), text }, signal);
                                    }
                                    else {
                                        await browserService.act({ kind: 'type', selector: target, text }, signal);
                                    }
                                    executionLog += `[Step ${stepCount}] TYPE ${target} "${text}" -> Success\n`;
                                    waitMs = 800;
                                }
                                else if (waitMatch) {
                                    const ms = parseInt(waitMatch[1], 10);
                                    await new Promise(r => setTimeout(r, ms));
                                    executionLog += `[Step ${stepCount}] WAIT ${ms} -> Success\n`;
                                }
                                else if (navigateMatch) {
                                    const url = navigateMatch[1].replace(/^["']|["']$/g, '');
                                    await browserService.act({ kind: 'navigate', url }, signal);
                                    executionLog += `[Step ${stepCount}] NAVIGATE ${url} -> Success\n`;
                                    waitMs = 2000;
                                }
                                else if (scrollMatch) {
                                    const direction = scrollMatch[1].toLowerCase();
                                    await browserService.act({ kind: 'scroll', direction }, signal);
                                    executionLog += `[Step ${stepCount}] SCROLL ${direction} -> Success\n`;
                                    waitMs = 350;
                                }
                                else if (switchTabMatch) {
                                    const tabId = switchTabMatch[1];
                                    await browserService.act({ kind: 'switch_tab', tabId }, signal);
                                    executionLog += `[Step ${stepCount}] SWITCH_TAB ${tabId} -> Success\n`;
                                    waitMs = 1500;
                                }
                                else if (closeTabMatch) {
                                    await browserService.act({ kind: 'close_tab' }, signal);
                                    executionLog += `[Step ${stepCount}] CLOSE_TAB -> Success\n`;
                                    waitMs = 1000;
                                }
                                else if (evalMatch) {
                                    const script = evalMatch[1];
                                    await browserService.act({ kind: 'evaluate', script }, signal);
                                    executionLog += `[Step ${stepCount}] EVAL -> Success\n`;
                                    waitMs = 500;
                                }
                                else if (/^BACK/i.test(line)) {
                                    await browserService.act({ kind: 'back' }, signal);
                                    executionLog += `[Step ${stepCount}] BACK -> Success\n`;
                                    waitMs = 900;
                                }
                                else if (/^RELOAD/i.test(line)) {
                                    await browserService.act({ kind: 'reload' }, signal);
                                    executionLog += `[Step ${stepCount}] RELOAD -> Success\n`;
                                    waitMs = 1800;
                                }
                                else {
                                    throw new Error(`Unknown DSL command: ${line}`);
                                }
                                if (waitMs > 0) {
                                    await new Promise(r => setTimeout(r, waitMs));
                                }
                            }
                            catch (stepError) {
                                if (stepError instanceof UserInteractionRequiredError) {
                                    throw stepError;
                                }
                                executionLog += `[Step ${stepCount}] FAILED: ${line} -> Error: ${stepError.message}\n`;
                                // Circuit Breaker: Stop execution on first failure
                                try {
                                    const snapshot = await browserService.getSnapshot(signal);
                                    const snapshotText = formatSnapshot(snapshot, snapshotMode === "full" ? "full" : "compact");
                                    return `${executionLog}\nScript execution ABORTED at step ${stepCount} due to error. Please review the snapshot and try again.\n\n${snapshotText}`;
                                }
                                catch (snapErr) {
                                    return `${executionLog}\nScript execution ABORTED at step ${stepCount} due to error: ${stepError.message}. (Also failed to get follow-up snapshot)`;
                                }
                            }
                        }
                        // All steps succeeded
                        try {
                            const snapshot = await browserService.getSnapshot(signal);
                            const snapshotText = formatSnapshot(snapshot, snapshotMode === "full" ? "full" : "compact");
                            return `${executionLog}\nScript executed successfully.\n\n${snapshotText}`;
                        }
                        catch (e) {
                            if (e instanceof UserInteractionRequiredError)
                                throw e;
                            return `${executionLog}\nScript executed successfully. (Failed to get follow-up snapshot: ${e})`;
                        }
                    }
                    if (action === "act") {
                        if (!kind)
                            throw new Error("Missing 'kind' parameter for 'act' action.");
                        const result = await browserService.act({
                            kind: kind,
                            targetId,
                            selector,
                            text,
                            url,
                            direction: direction,
                            tabId,
                            files
                        }, signal);
                        if (kind === 'screenshot') {
                            return `Screenshot saved: ${result}
${SCREENSHOT_RESULT_HINT}`;
                        }
                        if (kind === 'get_cookies') {
                            return `Cookies retrieved: ${result}`;
                        }
                        // Wait for SPA loading if navigated
                        const waitMsByKind = {
                            navigate: 2000,
                            click: 900,
                            type: 800,
                            scroll: 350,
                            wait: 1000,
                            back: 900,
                            reload: 1800
                        };
                        const waitMs = waitMsByKind[kind] || 300;
                        if (waitMs > 0) {
                            await new Promise(r => setTimeout(r, waitMs));
                        }
                        // Optimization: Auto-return snapshot after action
                        try {
                            const snapshot = await browserService.getSnapshot(signal);
                            const snapshotText = formatSnapshot(snapshot, snapshotMode === "full" ? "full" : "compact");
                            return `Action '${kind}' performed successfully.\n\n${snapshotText}`;
                        }
                        catch (e) {
                            if (e instanceof UserInteractionRequiredError) {
                                throw e;
                            }
                            return `Action '${kind}' performed successfully. (Failed to get follow-up snapshot: ${e})`;
                        }
                    }
                    throw new Error(`Unknown action: ${action}`);
                }
                catch (error) {
                    if (error.message === 'Aborted')
                        throw error;
                    if (error instanceof UserInteractionRequiredError)
                        throw error;
                    // Enhanced Heuristic Error Message (Educational Mode)
                    // Purpose: Teach the LLM how to fix the error without a long system prompt, saving tokens.
                    let helpMsg = "";
                    const msg = error.message.toLowerCase();
                    if (msg.includes("waiting for selector") || msg.includes("timeout")) {
                        helpMsg = `\n[System Hint] The element (Target ID) was not found on the current page. The page structure may have changed. Please call action='snapshot' to get fresh IDs.`;
                    }
                    else if (msg.includes("target id") || msg.includes("selector")) {
                        helpMsg = `\n[System Hint] For 'click' or 'type', you MUST provide 'targetId' (from snapshot) or 'selector'.\nCorrect Example: { "action": "act", "kind": "click", "targetId": "12" }`;
                    }
                    else if (msg.includes("kind")) {
                        helpMsg = `\n[System Hint] 'act' action requires 'kind' (click, type, navigate, scroll, wait, back...).`;
                    }
                    else if (msg.includes("unknown action")) {
                        helpMsg = `\n[System Hint] Valid actions are: connect, snapshot, act. Did you mean 'act' with kind='${args.action}'?`;
                    }
                    return `Browser Error: ${error.message}${helpMsg}`;
                }
            }
        }
    ]
};
