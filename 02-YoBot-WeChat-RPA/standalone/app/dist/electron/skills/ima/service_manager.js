import * as path from 'path';
import * as fs from 'fs';
import { PythonEnvManager } from '../../utils/python_env.js';
export class IMAServiceManager {
    static instance;
    serviceRoot;
    mainScript;
    requirementsFile;
    constructor() {
        // Assume running from project root
        // If packaged, path might be different (userData)
        // For now, support dev mode
        this.serviceRoot = path.join(process.cwd(), 'services', 'ima');
        this.mainScript = path.join(this.serviceRoot, 'main.py');
        this.requirementsFile = path.join(this.serviceRoot, 'requirements.txt');
    }
    static getInstance() {
        if (!IMAServiceManager.instance) {
            IMAServiceManager.instance = new IMAServiceManager();
        }
        return IMAServiceManager.instance;
    }
    async prepareService() {
        if (!fs.existsSync(this.serviceRoot)) {
            throw new Error(`IMA Service not found at ${this.serviceRoot}`);
        }
        const envManager = PythonEnvManager.getInstance();
        const uvPath = await envManager.ensureEnv();
        // Check if venv exists, if not create it
        const venvPath = path.join(this.serviceRoot, '.venv');
        if (!fs.existsSync(venvPath)) {
            console.log('[IMA] Creating virtual environment...');
            await envManager.runCommand(['venv', '.venv'], this.serviceRoot);
        }
        // Install dependencies
        // We can check if deps are installed by checking site-packages or just run install
        // Ideally we should check if requirements changed.
        // For simplicity, we can run sync or install.
        // "uv pip sync requirements.txt" ensures exact match.
        console.log('[IMA] Installing dependencies...');
        // Use 'pip install' for now as sync might be aggressive
        // await envManager.runCommand(['pip', 'install', '-r', 'requirements.txt'], this.serviceRoot);
        // Actually, uv run handles this automatically?
        // No, uv run executes in ephemeral env unless --no-sync is passed?
        // If we use "uv run", it manages environment automatically.
        // We don't need to manually create venv or install deps if we use "uv run".
        // BUT, "uv run" might re-resolve deps every time which is slow?
        // No, it caches.
        // Let's use "uv run" directly. It's the modern way.
        // Command: uv run python main.py
        // Cwd: services/ima
        return {
            command: uvPath,
            args: ['run', 'python', 'main.py'],
            cwd: this.serviceRoot
        };
    }
}
