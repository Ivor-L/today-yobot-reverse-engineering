import { BrowserService } from "../../browser/service.js";
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as child_process from 'child_process';
import { UserInteractionRequiredError } from "../../agent/errors.js";
import { resolveBootstrapAgentFileLayout } from '../../core/platform/file_layout.js';
const browserService = BrowserService.getInstance();
// --- Token Persistence Helper ---
const TOKEN_FILE = path.join(resolveBootstrapAgentFileLayout({
    userDataRoot: process.env.USER_DATA_PATH?.trim() || undefined,
}).userData, 'tokens.json');
function getStoredCookie() {
    try {
        if (fs.existsSync(TOKEN_FILE)) {
            const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
            return data.xhs_cookie || null;
        }
    }
    catch (e) {
        console.warn("[XHS] Failed to read token file:", e);
    }
    return null;
}
function saveStoredCookie(cookie) {
    try {
        const dir = path.dirname(TOKEN_FILE);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        let data = {};
        if (fs.existsSync(TOKEN_FILE)) {
            try {
                data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
            }
            catch { }
        }
        data.xhs_cookie = cookie;
        fs.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2));
        console.log("[XHS] Cookie saved to persistent storage.");
    }
    catch (e) {
        console.warn("[XHS] Failed to save token file:", e);
    }
}
// -------------------------------
const PYTHON_SCRIPT = `
import sys
import os
import json
import argparse
import traceback

try:
    from xhs import XhsClient, DataFetchError
    from xhs.help import sign as local_sign
except ImportError:
    print(json.dumps({"error": "DEPENDENCY_MISSING", "message": "'xhs' library not found"}))
    sys.exit(1)

def sign(uri, data=None, a1="", web_session=""):
    return local_sign(uri, data, a1=a1)

def main():
    cookie = os.environ.get('XHS_COOKIE')
    if not cookie:
        print(json.dumps({"error": "CONFIG_ERROR", "message": "XHS_COOKIE env var not set"}))
        sys.exit(1)

    parser = argparse.ArgumentParser()
    parser.add_argument('--title', required=True)
    parser.add_argument('--desc', required=True)
    parser.add_argument('--images', nargs='+', required=True)
    args = parser.parse_args()

    # Parse a1 from cookie
    cookies = {}
    try:
        for item in cookie.split(';'):
            item = item.strip()
            if '=' in item:
                k, v = item.split('=', 1)
                cookies[k.strip()] = v.strip()
    except Exception as e:
         print(json.dumps({"error": "COOKIE_INVALID", "message": f"Cookie parsing failed: {str(e)}"}))
         sys.exit(1)
    
    a1 = cookies.get('a1')
    web_session = cookies.get('web_session')

    if not a1 or not web_session:
        print(json.dumps({"error": "COOKIE_INVALID", "message": "Cookie missing 'a1' or 'web_session' field. Please ensure you are logged in."}))
        sys.exit(1)

    # Issue #1 Fix: Use a1 from cookie for signing
    def sign_callback(uri, data=None, a1="", web_session=""):
        # We ignore the passed a1/web_session from client and use our robustly parsed one from cookie
        return sign(uri, data, a1=cookies.get('a1', ''))

    client = XhsClient(cookie=cookie, sign=sign_callback)
    
    try:
        # Verify cookie validity lightly (get self info)
        # Note: This might consume API quota or be risky, but good for validation
        # client.get_self_info() 
        pass
    except DataFetchError as e:
        print(json.dumps({"error": "AUTH_FAILED", "message": f"Cookie invalid or expired: {str(e)}"}))
        sys.exit(1)

    try:
        res = client.create_image_note(args.title, args.desc, args.images)
        print(json.dumps({"status": "success", "data": res}))
    except DataFetchError as e:
        # Handle specific XHS errors
        err_msg = str(e)
        if "登录" in err_msg or "验证" in err_msg or "401" in err_msg:
             print(json.dumps({"error": "AUTH_FAILED", "message": f"Authentication failed during publish: {err_msg}"}))
        else:
             print(json.dumps({"error": "API_ERROR", "message": f"API Error: {err_msg}"}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": "UNKNOWN_ERROR", "message": f"Unexpected error: {str(e)}", "trace": traceback.format_exc()}))
        sys.exit(1)

if __name__ == '__main__':
    main()
`;
export const xhsPublisherSkill = {
    name: "xhs_publisher",
    description: "Publishes notes to Xiaohongshu (Redbook) via API, bypassing browser upload limitations. Robustly handles cookies and errors.",
    instructions: "Use this skill to publish image notes to Xiaohongshu (Redbook) via API. \n\n## Auto-Login Feature\n- This skill automatically manages cookies.\n- If the user is NOT logged in, it will open the browser to the login page and ask the user to log in.\n- Once logged in, it saves the cookie for future use.\n\n## Usage\n- User: \"Help me publish a note...\"\n- Action: Call xhs_publish with title, description, and images.\n\n## Prerequisite\n- None. The skill handles authentication automatically.",
    tools: [
        {
            definition: {
                name: "xhs_publish",
                description: "Publish an image note to Xiaohongshu. Handles login automatically.",
                parameters: {
                    type: "object",
                    properties: {
                        title: { type: "string", description: "Note title" },
                        description: { type: "string", description: "Note description" },
                        images: { type: "array", items: { type: "string" }, description: "List of absolute file paths to images" },
                        cookie: { type: "string", description: "Optional. Manually provided cookie." }
                    },
                    required: ["title", "description", "images"]
                }
            },
            execute: async (args, signal) => {
                const { title, description, images, cookie: providedCookie } = args;
                // 1. Resolve Cookie Strategy
                // Priority: Provided > Persistent Store > Active Browser Session
                let cookie = providedCookie;
                if (!cookie) {
                    cookie = getStoredCookie();
                    if (cookie)
                        console.log("[XHS] Using cached cookie from tokens.json");
                }
                // Helper to validate if a cookie string looks like an XHS cookie
                const isValidXhsCookie = (c) => typeof c === 'string' && c.includes('a1=') && c.includes('web_session=');
                // If no valid cookie yet, try to fetch from browser
                if (!cookie || !isValidXhsCookie(cookie)) {
                    console.log("[XHS] No valid cookie found. Attempting to fetch from Browser Service...");
                    // Ensure browser is connected
                    try {
                        await browserService.connect({ launchMode: 'attach' }, signal);
                    }
                    catch (e) {
                        // If attach fails, we might need to launch, but let's try to just get_cookies first if connected
                        console.log("[XHS] Browser connect warning (might already be connected):", e);
                    }
                    try {
                        const cookieStr = await browserService.act({ kind: 'get_cookies' }, signal);
                        if (isValidXhsCookie(cookieStr)) {
                            cookie = cookieStr;
                            console.log("[XHS] Successfully retrieved fresh cookies from browser.");
                            // Save for future
                            saveStoredCookie(cookie);
                        }
                        else {
                            console.log("[XHS] Browser cookies retrieved but missing 'a1' or 'web_session'. User likely not logged in.");
                            // --- AUTO-LOGIN FLOW ---
                            // 1. Open Login Page
                            console.log("[XHS] Initiating Auto-Login Flow...");
                            await browserService.connect({ launchMode: 'force_launch' }, signal); // Ensure we have a window
                            await browserService.act({ kind: 'navigate', url: 'https://www.xiaohongshu.com' }, signal);
                            // 2. Pause for User Interaction
                            throw new UserInteractionRequiredError("I have opened the Xiaohongshu login page in the browser.\n\n" +
                                "**Please log in to your account now.**\n\n" +
                                "Once you have successfully logged in, reply with 'Continue' or 'Done', and I will automatically save your session and publish the note.");
                        }
                    }
                    catch (e) {
                        if (e instanceof UserInteractionRequiredError)
                            throw e;
                        // If browser communication fails completely
                        console.log(`[XHS] Failed to communicate with browser: ${e}`);
                        return `Error: Failed to connect to browser for auto-login. Please ensure Chrome is closed and try again, or provide a cookie manually. Details: ${e.message}`;
                    }
                }
                // ... (Proceed to Python Execution) ...
                for (const img of images) {
                    if (!fs.existsSync(img))
                        return `Error: Image file not found: ${img}`;
                }
                // 3. Prepare Python Environment
                const tempScriptPath = path.join(os.tmpdir(), `xhs_pub_${Date.now()}.py`);
                fs.writeFileSync(tempScriptPath, PYTHON_SCRIPT);
                try {
                    // Check dependencies
                    await new Promise((resolve, reject) => {
                        child_process.exec('python -c "import xhs"', (err) => {
                            if (err) {
                                console.log("[XHS] 'xhs' library missing. Installing...");
                                child_process.exec('pip install xhs', (err2) => {
                                    if (err2)
                                        reject(new Error("Failed to install 'xhs' library. Please run 'pip install xhs' manually."));
                                    else
                                        resolve();
                                });
                            }
                            else {
                                resolve();
                            }
                        });
                    });
                    // 4. Run Script
                    console.log(`[XHS] Executing python script with ${images.length} images...`);
                    return await new Promise((resolve, reject) => {
                        const processEnv = { ...process.env, XHS_COOKIE: cookie };
                        const pythonProcess = child_process.spawn('python', [
                            tempScriptPath,
                            '--title', title,
                            '--desc', description,
                            '--images', ...images
                        ], { env: processEnv });
                        let stdout = '';
                        let stderr = '';
                        pythonProcess.stdout.on('data', (data) => stdout += data.toString());
                        pythonProcess.stderr.on('data', (data) => stderr += data.toString());
                        pythonProcess.on('close', (code) => {
                            fs.unlinkSync(tempScriptPath); // Cleanup
                            // Parse JSON output from Python
                            let result;
                            try {
                                // Find the last line that looks like JSON in stdout (ignore logs)
                                const lines = stdout.trim().split('\n');
                                const jsonLine = lines[lines.length - 1];
                                result = JSON.parse(jsonLine);
                            }
                            catch (e) {
                                // Fallback if not JSON
                                if (code !== 0) {
                                    resolve(`Execution Failed (Exit Code ${code}).\nStderr: ${stderr}\nStdout: ${stdout}`);
                                    return;
                                }
                            }
                            if (result) {
                                if (result.status === 'success') {
                                    resolve(`Note published successfully!\nResult: ${JSON.stringify(result.data)}`);
                                }
                                else if (result.error) {
                                    // Handle structured errors
                                    if (result.error === 'AUTH_FAILED' || result.error === 'COOKIE_INVALID') {
                                        // Throw special error to pause Agent if needed, or just return detailed message
                                        resolve(`[Authentication Error] ${result.message}\nAction Required: Please refresh your login in the browser window (xhs.com) and try again.`);
                                    }
                                    else {
                                        resolve(`[Publish Error] ${result.error}: ${result.message}`);
                                    }
                                }
                                else {
                                    resolve(`Unknown result format: ${stdout}`);
                                }
                            }
                            else {
                                if (code === 0)
                                    resolve(`Success (Raw Output): ${stdout}`);
                                else
                                    resolve(`Failed (Raw Output): ${stdout}\nStderr: ${stderr}`);
                            }
                        });
                    });
                }
                catch (e) {
                    if (fs.existsSync(tempScriptPath))
                        fs.unlinkSync(tempScriptPath);
                    return `Error executing XHS script: ${e.message}`;
                }
            }
        }
    ]
};
