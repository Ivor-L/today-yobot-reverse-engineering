import { execSync, spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
export class PythonEnvManager {
    static instance;
    uvPath = null;
    /** undefined = 还没探测过；null = 探测过且本机没有可用的 Python。 */
    systemPython = undefined;
    constructor() { }
    static getInstance() {
        if (!PythonEnvManager.instance) {
            PythonEnvManager.instance = new PythonEnvManager();
        }
        return PythonEnvManager.instance;
    }
    async ensureEnv() {
        if (this.uvPath)
            return this.uvPath;
        // Check if uv is in PATH
        try {
            const cmd = process.platform === 'win32' ? 'where uv' : 'which uv';
            const output = execSync(cmd, { stdio: 'pipe' }).toString().trim();
            if (output) {
                this.uvPath = output.split('\n')[0].trim();
                return this.uvPath;
            }
        }
        catch (e) {
            // Ignore
        }
        // Check common locations
        const commonPaths = process.platform === 'win32'
            ? [
                path.join(os.homedir(), '.cargo', 'bin', 'uv.exe'),
                path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Links', 'uv.exe'),
            ]
            : [
                path.join(os.homedir(), '.cargo', 'bin', 'uv'),
                path.join(os.homedir(), '.local', 'bin', 'uv'),
                '/opt/homebrew/bin/uv',
                '/usr/local/bin/uv',
            ];
        for (const p of commonPaths) {
            if (fs.existsSync(p)) {
                this.uvPath = p;
                return p;
            }
        }
        // If not found, try to install via pip (if python exists) or throw
        // For now, throw and ask user to install uv
        throw new Error("Tool 'uv' not found. Please install uv (https://github.com/astral-sh/uv) or ensure it is in your PATH.");
    }
    /**
     * 找一个真的能跑的系统 Python。
     *
     * Windows 上 `where python` 常常命中 `…\AppData\Local\Microsoft\WindowsApps\python.exe`——
     * 那是应用商店的占位符，执行它只会退出码 9009 并弹商店，`where` 却认为它存在。
     * 所以判据只能是"真的跑一次 --version 且成功"，不能只看路径存不存在。
     */
    findSystemPython() {
        if (this.systemPython !== undefined)
            return this.systemPython;
        const candidates = process.platform === 'win32'
            ? ['python', 'python3', 'py -3']
            : ['python3', 'python'];
        for (const candidate of candidates) {
            try {
                const version = execSync(`${candidate} --version`, {
                    stdio: 'pipe',
                    timeout: 10_000,
                }).toString();
                if (/Python\s+3\./.test(version)) {
                    this.systemPython = candidate;
                    return candidate;
                }
            }
            catch {
                // 占位符 exe、缺失、超时都走到这里，继续试下一个候选。
            }
        }
        this.systemPython = null;
        return null;
    }
    async runCommand(args, cwd) {
        const uv = await this.ensureEnv();
        return new Promise((resolve, reject) => {
            const proc = spawn(uv, args, {
                cwd: cwd || process.cwd(),
                stdio: ['ignore', 'pipe', 'pipe'],
                // `uv` is already a resolved executable and args are structured.
                // Avoid a second platform shell and its quoting differences.
                shell: false
            });
            let stdout = '';
            let stderr = '';
            proc.stdout.on('data', (d) => stdout += d.toString());
            proc.stderr.on('data', (d) => stderr += d.toString());
            proc.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout.trim());
                }
                else {
                    reject(new Error(`Command failed with code ${code}: ${stderr}`));
                }
            });
        });
    }
}
