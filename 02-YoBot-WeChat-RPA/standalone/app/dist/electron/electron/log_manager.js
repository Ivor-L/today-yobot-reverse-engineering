import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
export class LogManager {
    static instance;
    logDir;
    currentDate = '';
    logStream = null;
    logBuffer = []; // Temporary buffer for IPC flush
    historyBuffer = []; // History buffer for re-fetching
    flushInterval = null;
    retentionDays = 7;
    historyLimit = 2000; // Keep last 2000 logs in memory
    mainWindow = null;
    constructor() {
        // The bootstrap owner sets Electron's logs path before app.ready. On
        // macOS this is ~/Library/Logs/YoBot; Windows retains userData/logs.
        this.logDir = app.getPath('logs');
        process.stdout.write(`[LogManager] Logs directory: ${this.logDir}\n`);
        this.ensureLogDir();
        this.rotateLog();
        // Clean old logs on startup
        this.cleanOldLogs();
        // Start flush interval for IPC
        this.flushInterval = setInterval(() => this.flushLogsToWindow(), 500);
    }
    static getInstance() {
        if (!LogManager.instance) {
            LogManager.instance = new LogManager();
        }
        return LogManager.instance;
    }
    setWindow(window) {
        this.mainWindow = window;
    }
    ensureLogDir() {
        if (!fs.existsSync(this.logDir)) {
            try {
                fs.mkdirSync(this.logDir, { recursive: true });
            }
            catch (e) {
                process.stderr.write(`[LogManager] Failed to create log dir: ${e}\n`);
            }
        }
    }
    getTodayString() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    rotateLog() {
        const today = this.getTodayString();
        if (today !== this.currentDate) {
            if (this.logStream) {
                this.logStream.end();
            }
            this.currentDate = today;
            const logFile = path.join(this.logDir, `main-${this.currentDate}.log`);
            try {
                this.logStream = fs.createWriteStream(logFile, { flags: 'a' });
                this.logStream.on('error', (err) => {
                    process.stderr.write(`[LogManager] Log stream error: ${err}\n`);
                });
            }
            catch (err) {
                process.stderr.write(`[LogManager] Failed to create log stream: ${err}\n`);
            }
            // Trigger cleanup on rotation (new day)
            this.cleanOldLogs();
        }
    }
    cleanOldLogs() {
        try {
            if (!fs.existsSync(this.logDir))
                return;
            const files = fs.readdirSync(this.logDir);
            const now = Date.now();
            const maxAge = this.retentionDays * 24 * 60 * 60 * 1000;
            files.forEach(file => {
                if (file.startsWith('main-') && file.endsWith('.log')) {
                    const filePath = path.join(this.logDir, file);
                    const stats = fs.statSync(filePath);
                    if (now - stats.mtimeMs > maxAge) {
                        fs.unlinkSync(filePath);
                        process.stdout.write(`[LogManager] Deleted old log file: ${file}\n`);
                    }
                }
            });
        }
        catch (e) {
            process.stderr.write(`[LogManager] Failed to clean old logs: ${e}\n`);
        }
    }
    log(level, ...args) {
        this.rotateLog(); // Check rotation
        const timestamp = new Date().toISOString();
        const message = this.formatMessage(args);
        const logLine = `[${timestamp}] [${level}] ${message}\n`;
        // 1. Write to file
        if (this.logStream) {
            this.logStream.write(logLine);
        }
        // 2. Buffer for IPC
        let formattedLog = `[${level}] ${message}`;
        if (message.length >= 2000) {
            formattedLog = `[${level}] ${message.substring(0, 200)}... [Truncated]`;
        }
        // Add to temporary buffer for flush
        this.logBuffer.push(formattedLog);
        // Add to history buffer
        this.historyBuffer.push(formattedLog);
        if (this.historyBuffer.length > this.historyLimit) {
            this.historyBuffer.shift();
        }
        // Cap flush buffer size (just in case)
        if (this.logBuffer.length > 500) {
            this.logBuffer.shift();
        }
    }
    getRecentLogs() {
        return [...this.historyBuffer];
    }
    formatMessage(args) {
        return args.map(arg => {
            if (arg instanceof Error) {
                return arg.stack || arg.message;
            }
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg);
                }
                catch (e) {
                    return '[Circular/Unserializable]';
                }
            }
            return String(arg);
        }).join(' ');
    }
    flushLogsToWindow() {
        if (!this.mainWindow || this.mainWindow.isDestroyed() || this.logBuffer.length === 0) {
            return;
        }
        const logsToSend = [...this.logBuffer];
        this.logBuffer = [];
        try {
            this.mainWindow.webContents.send('console-log-batch', {
                logs: logsToSend
            });
        }
        catch (e) {
            // Ignore IPC errors
        }
    }
}
