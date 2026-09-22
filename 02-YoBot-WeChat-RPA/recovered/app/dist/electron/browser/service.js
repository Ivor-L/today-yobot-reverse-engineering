import { chromium } from 'playwright-core';
import { CDPSnapshot } from './cdp/snapshot.js';
import * as child_process from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { resolveBootstrapAgentFileLayout } from '../core/platform/file_layout.js';
import { config as appConfig } from '../config/index.js';
import { browserScreenshotPath } from './screenshot_path.js';
export class BrowserService {
    browser = null;
    context = null;
    page = null;
    cdpSnapshot = null;
    static instance;
    constructor() { }
    static getInstance() {
        if (!BrowserService.instance) {
            BrowserService.instance = new BrowserService();
        }
        return BrowserService.instance;
    }
    async close() {
        console.log('Closing browser...');
        // Attempt to close via CDP first (graceful shutdown of the process)
        if (this.cdpSnapshot) {
            try {
                const session = this.cdpSnapshot.getSession();
                if (session) {
                    console.log('Sending Browser.close via CDP...');
                    await session.send('Browser.close').catch(() => { });
                }
            }
            catch (e) {
                console.warn('Error sending Browser.close:', e);
            }
        }
        else if (this.page) {
            try {
                // Fallback: try to create a session just to close
                const session = await this.context?.newCDPSession(this.page).catch(() => null);
                if (session) {
                    console.log('Sending Browser.close via temp CDP session...');
                    await session.send('Browser.close').catch(() => { });
                }
            }
            catch (e) {
                // Ignore
            }
        }
        // Give it a moment to close
        await new Promise(r => setTimeout(r, 500));
        // Cleanup Playwright objects
        if (this.context) {
            try {
                await this.context.close().catch(() => { });
                if (this.browser) {
                    await this.browser.close().catch(() => { });
                }
            }
            catch (e) {
                console.error(`Error disconnecting browser: ${e.message}`);
            }
        }
        this.context = null;
        this.browser = null;
        this.page = null;
        if (this.cdpSnapshot) {
            await this.cdpSnapshot.detach().catch(() => { });
            this.cdpSnapshot = null;
        }
        console.log('Browser closed and disconnected.');
    }
    async connect(config = { chromeDebuggingPort: 9222, launchMode: 'attach' }, signal) {
        if (signal?.aborted)
            throw new Error("Aborted");
        try {
            if (config.launchMode === 'force_launch') {
                await this.killChrome();
                await this.launchChrome(config);
            }
            else if (config.launchMode === 'launch') {
                // Try connect, if fail, launch
                try {
                    await this.tryConnect(config);
                    return;
                }
                catch (e) {
                    console.log("Failed to attach, launching new instance...");
                    await this.launchChrome(config);
                }
            }
            await this.tryConnect(config);
        }
        catch (e) {
            console.error('Failed to connect to browser:', e);
            throw e;
        }
    }
    async tryConnect(config) {
        const port = config.chromeDebuggingPort || 9222;
        const host = config.chromeHost || '127.0.0.1';
        const httpEndpoint = `http://${host}:${port}`;
        try {
            // Fetch webSocketDebuggerUrl explicitly
            const response = await fetch(`${httpEndpoint}/json/version`);
            if (!response.ok)
                throw new Error(`Failed to fetch version info from ${httpEndpoint}: ${response.statusText}`);
            const data = await response.json();
            const wsEndpoint = data.webSocketDebuggerUrl;
            if (!wsEndpoint)
                throw new Error("No webSocketDebuggerUrl found in Chrome response");
            this.browser = await chromium.connectOverCDP(wsEndpoint);
            this.context = this.browser.contexts()[0];
            if (!this.context) {
                // Should not happen usually with connectOverCDP
                throw new Error("No context found");
            }
            // Get the first page or create new one
            const pages = this.context.pages();
            if (pages.length > 0) {
                this.page = pages[0];
            }
            else {
                this.page = await this.context.newPage();
            }
            // Attach CDP Snapshot
            this.cdpSnapshot = new CDPSnapshot();
            await this.cdpSnapshot.attach(this.page);
            console.log(`Connected to browser at ${wsEndpoint}`);
        }
        catch (e) {
            throw new Error(`Failed to connect to Chrome at ${httpEndpoint}: ${e}`);
        }
    }
    async getSnapshot(signal) {
        if (signal?.aborted)
            throw new Error("Aborted");
        if (!this.page || !this.cdpSnapshot)
            throw new Error("Not connected");
        try {
            const axTree = await this.cdpSnapshot.capture();
            const title = await this.page.title();
            const url = this.page.url();
            // Tab info
            const pages = this.context?.pages() || [];
            const tabs = await Promise.all(pages.map(async (p, index) => {
                let pTitle = "Loading...";
                try {
                    pTitle = await p.title();
                }
                catch (e) { }
                return {
                    title: pTitle,
                    url: p.url(),
                    id: String(index), // Playwright doesn't expose targetId easily in high level API, index is proxy
                    active: p === this.page
                };
            }));
            const domSignals = await this.page.evaluate(() => {
                const pageText = (document.body?.innerText || "").slice(0, 8000);
                const hasLoginKeyword = /扫码登录|请先登录|登录后|验证码登录|手机登录|账号登录|立即登录/.test(pageText);
                const hasPasswordInput = !!document.querySelector('input[type="password"]');
                const hasUserAvatar = !!document.querySelector('[class*="avatar"], [id*="avatar"], [class*="user-avatar"], [class*="profile"]');
                const authActionNodes = Array.from(document.querySelectorAll('button, a, [role="button"], [role="link"]'));
                const hasAuthAction = authActionNodes.some((node) => /登录|注册|验证码|手机号|账号/.test(node.innerText || ""));
                const modalNodes = Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"], [class*="login"], [class*="Login"], [id*="login"], [id*="Login"]'));
                const hasLoginModal = modalNodes.some((node) => {
                    const text = node.innerText || "";
                    return /扫码登录|请先登录|验证码|登录/.test(text);
                });
                return { hasLoginKeyword, hasPasswordInput, hasLoginModal, hasUserAvatar, hasAuthAction };
            });
            const isLoginUrl = /login|signin|auth|sso|passport/i.test(url);
            const hasPasswordInput = domSignals.hasPasswordInput || /type="password"|inputType="password"/i.test(axTree);
            const hasPopupLoginText = /扫码登录|请先登录|验证码登录|登录后继续|登录后可/.test(axTree);
            const hasPopupLoginSignal = domSignals.hasLoginModal ||
                (!domSignals.hasUserAvatar && ((domSignals.hasLoginKeyword && domSignals.hasAuthAction) ||
                    (hasPopupLoginText && (domSignals.hasAuthAction || hasPasswordInput))));
            return {
                title,
                url,
                summary: axTree, // The AXTree is the summary now
                suggestManualLogin: isLoginUrl || hasPasswordInput || hasPopupLoginSignal,
                tabs
            };
        }
        catch (e) {
            console.error("Snapshot failed", e);
            throw e;
        }
    }
    async act(action, signal) {
        if (signal?.aborted)
            throw new Error("Aborted");
        if (!this.page)
            throw new Error("Not connected");
        // Try CDP action first if targetId is present
        if (action.targetId && this.cdpSnapshot) {
            try {
                await this.performCDPAction(action);
                return;
            }
            catch (e) {
                console.warn(`CDP action failed for ${action.targetId}: ${e}. Falling back to Playwright selectors if possible.`);
                // Fallthrough to Playwright
            }
        }
        // Map actions to Playwright
        switch (action.kind) {
            case 'navigate':
                if (action.url)
                    await this.page.goto(action.url);
                break;
            case 'click':
                if (action.selector) {
                    // Playwright handles scrolling automatically
                    await this.page.click(action.selector);
                }
                break;
            case 'type':
                if (action.selector && action.text) {
                    await this.page.fill(action.selector, action.text);
                }
                break;
            case 'scroll':
                if (action.direction === 'down') {
                    await this.page.evaluate(() => window.scrollBy(0, window.innerHeight));
                }
                else {
                    await this.page.evaluate(() => window.scrollBy(0, -window.innerHeight));
                }
                break;
            case 'wait':
                await this.page.waitForTimeout(1000);
                break;
            case 'back':
                await this.page.goBack();
                break;
            case 'reload':
                await this.page.reload();
                break;
            case 'screenshot':
                const buffer = await this.page.screenshot();
                // 写进工作区：visual_understanding 只读工作区内的图片，放 tmpdir 两个工具接不上。
                const filepath = browserScreenshotPath(appConfig.workspaceDir);
                fs.mkdirSync(path.dirname(filepath), { recursive: true });
                fs.writeFileSync(filepath, buffer);
                return filepath;
            case 'get_cookies':
                const cookies = await this.context.cookies();
                return JSON.stringify(cookies, null, 2);
            case 'new_tab':
                this.page = await this.context.newPage();
                if (action.url)
                    await this.page.goto(action.url);
                // Re-attach CDP
                if (this.cdpSnapshot)
                    await this.cdpSnapshot.detach();
                this.cdpSnapshot = new CDPSnapshot();
                await this.cdpSnapshot.attach(this.page);
                break;
            case 'close_tab':
                await this.page.close();
                // Switch to another tab
                const pages = this.context.pages();
                if (pages.length > 0) {
                    this.page = pages[pages.length - 1];
                    if (this.cdpSnapshot)
                        await this.cdpSnapshot.detach();
                    this.cdpSnapshot = new CDPSnapshot();
                    await this.cdpSnapshot.attach(this.page);
                }
                else {
                    this.page = null;
                }
                break;
            case 'switch_tab':
                if (action.tabId) {
                    const pages = this.context.pages();
                    const index = parseInt(action.tabId);
                    if (pages[index]) {
                        this.page = pages[index];
                        await this.page.bringToFront();
                        if (this.cdpSnapshot)
                            await this.cdpSnapshot.detach();
                        this.cdpSnapshot = new CDPSnapshot();
                        await this.cdpSnapshot.attach(this.page);
                    }
                }
                break;
            case 'evaluate':
                if (action.script) {
                    // Execute raw JS in the context of the page
                    const result = await this.page.evaluate(action.script);
                    return result;
                }
                break;
        }
    }
    async performCDPAction(action) {
        if (!this.cdpSnapshot || !action.targetId)
            throw new Error("No snapshot or targetId");
        const node = this.cdpSnapshot.getNode(action.targetId);
        if (!node)
            throw new Error(`Node ${action.targetId} not found in snapshot`);
        // If node has no backendDOMNodeId, we can't interact via CDP DOM domain directly
        if (!node.backendDOMNodeId)
            throw new Error(`Node ${action.targetId} has no backendDOMNodeId (non-interactive?)`);
        const client = this.cdpSnapshot.getSession();
        if (!client)
            throw new Error("CDP session lost");
        switch (action.kind) {
            case 'click':
                try {
                    // Ensure element is in view before getting coordinates
                    const { object } = await client.send('DOM.resolveNode', { backendNodeId: node.backendDOMNodeId });
                    await client.send('Runtime.callFunctionOn', {
                        objectId: object.objectId,
                        functionDeclaration: 'function() { this.scrollIntoViewIfNeeded(); }'
                    });
                    await new Promise(r => setTimeout(r, 200)); // Wait for scroll
                    const { model } = await client.send('DOM.getBoxModel', { backendNodeId: node.backendDOMNodeId });
                    if (!model || !model.content)
                        throw new Error("No box model");
                    const content = model.content;
                    const targetX = (content[0] + content[2]) / 2;
                    const targetY = (content[1] + content[5]) / 2;
                    // Claude Code Inspired: Human-like mouse movement to bypass anti-bot
                    const steps = 10;
                    // Start from a random nearby point or 0,0 (simplification for this layer)
                    let currentX = targetX - (Math.random() * 50 + 50);
                    let currentY = targetY - (Math.random() * 50 + 50);
                    for (let i = 1; i <= steps; i++) {
                        const t = i / steps;
                        // Ease-out cubic formula
                        const easeOut = 1 - Math.pow(1 - t, 3);
                        const x = currentX + (targetX - currentX) * easeOut;
                        const y = currentY + (targetY - currentY) * easeOut;
                        await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
                        await new Promise(r => setTimeout(r, 10)); // tiny delay
                    }
                    // Final click
                    await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: targetX, y: targetY, button: 'left', clickCount: 1 });
                    await new Promise(r => setTimeout(r, Math.random() * 30 + 20)); // Human click hold time
                    await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: targetX, y: targetY, button: 'left', clickCount: 1 });
                }
                catch (e) {
                    // Fallback: try JS click via Runtime
                    const { object } = await client.send('DOM.resolveNode', { backendNodeId: node.backendDOMNodeId });
                    await client.send('Runtime.callFunctionOn', {
                        objectId: object.objectId,
                        functionDeclaration: 'function() { this.click(); }'
                    });
                }
                break;
            case 'type':
                if (action.text) {
                    const { object } = await client.send('DOM.resolveNode', { backendNodeId: node.backendDOMNodeId });
                    await client.send('Runtime.callFunctionOn', {
                        objectId: object.objectId,
                        functionDeclaration: 'function() { this.focus(); }'
                    });
                    // Claude Code Inspired: Fast clipboard typing to bypass character-by-character anti-bot detection and speed up large texts
                    if (action.text.length > 20) {
                        try {
                            // Focus node
                            await client.send('Runtime.callFunctionOn', {
                                objectId: object.objectId,
                                functionDeclaration: 'function() { this.focus(); this.select && this.select(); }'
                            });
                            // Write to system clipboard and paste via Playwright (which simulates OS level paste)
                            const clipboardy = require('child_process');
                            // Fallback to page.evaluate for clipboard if node is not available
                            await this.page?.evaluate((textToPaste) => {
                                return navigator.clipboard.writeText(textToPaste);
                            }, action.text).catch(() => { });
                            const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
                            await this.page?.keyboard.press(`${modifier}+V`);
                            await new Promise(r => setTimeout(r, 50));
                        }
                        catch (err) {
                            // Fallback to normal typing if clipboard trick fails
                            await this.page?.keyboard.type(action.text, { delay: 10 });
                        }
                    }
                    else {
                        // For short texts, typing normally is fine, but add a slight delay to mimic human
                        await this.page?.keyboard.type(action.text, { delay: Math.random() * 30 + 20 });
                    }
                }
                break;
            case 'scroll':
                const { object } = await client.send('DOM.resolveNode', { backendNodeId: node.backendDOMNodeId });
                await client.send('Runtime.callFunctionOn', {
                    objectId: object.objectId,
                    functionDeclaration: 'function() { this.scrollIntoViewIfNeeded(); }'
                });
                break;
            default:
                throw new Error(`Action ${action.kind} not supported via CDP targetId`);
        }
    }
    // --- Helper Methods ---
    async killChrome() {
        // Platform specific kill command
        const cmd = process.platform === 'win32'
            ? 'taskkill /F /IM chrome.exe'
            : 'pkill -f "Google Chrome"';
        try {
            child_process.execSync(cmd);
        }
        catch (e) {
            // Ignore if not running
        }
        await new Promise(r => setTimeout(r, 1000));
    }
    async launchChrome(config) {
        const chromePath = this.findChromePath();
        if (!chromePath)
            throw new Error("Chrome executable not found");
        const port = config.chromeDebuggingPort || 9222;
        const userDataDir = config.userDataDir || path.join(resolveBootstrapAgentFileLayout({
            userDataRoot: process.env.USER_DATA_PATH?.trim() || undefined,
        }).userData, 'browser_data');
        const args = [
            `--remote-debugging-port=${port}`,
            `--user-data-dir=${userDataDir}`,
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-infobars',
            '--start-maximized' // Playwright handles viewport, but this is good for visual
        ];
        if (config.headless)
            args.push('--headless=new');
        console.log(`Launching Chrome: ${chromePath} ${args.join(' ')}`);
        const child = child_process.spawn(chromePath, args, {
            detached: true,
            stdio: 'ignore'
        });
        child.unref();
        // Wait for port
        await new Promise(r => setTimeout(r, 3000));
    }
    findChromePath() {
        if (process.platform === 'win32') {
            const paths = [
                process.env.CHROME_PATH,
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe')
            ];
            for (const p of paths) {
                if (p && fs.existsSync(p))
                    return p;
            }
        }
        else if (process.platform === 'darwin') {
            return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        }
        else {
            // Linux
            return '/usr/bin/google-chrome';
        }
        return null;
    }
}
