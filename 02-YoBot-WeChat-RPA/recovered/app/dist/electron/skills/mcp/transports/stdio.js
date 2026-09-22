import { spawn } from "child_process";
export class StdioTransport {
    options;
    process = null;
    buffer = "";
    messageHandler = null;
    constructor(options) {
        this.options = options;
    }
    async start() {
        console.log(`[MCP] Starting stdio server: ${this.options.command} ${this.options.args?.join(" ") || ""}`);
        this.process = spawn(this.options.command, this.options.args || [], {
            stdio: ["pipe", "pipe", "inherit"], // Write to stdin, read from stdout, log stderr
            cwd: this.options.cwd,
            env: { ...process.env, ...this.options.env }
        });
        this.process.stdout?.on("data", (data) => this.handleData(data));
        this.process.on('error', (err) => {
            console.error(`[MCP] Process error: ${err.message}`);
        });
        this.process.on('exit', (code) => {
            if (code !== 0 && code !== null) {
                console.error(`[MCP] Process exited with code ${code}`);
            }
        });
    }
    async stop() {
        this.process?.kill();
        this.process = null;
    }
    async send(message) {
        if (this.process?.stdin) {
            const msg = JSON.stringify(message) + "\n";
            this.process.stdin.write(msg);
        }
        else {
            throw new Error("Process not running");
        }
    }
    onMessage(handler) {
        this.messageHandler = handler;
    }
    handleData(data) {
        this.buffer += data.toString();
        const lines = this.buffer.split("\n");
        this.buffer = lines.pop() || ""; // Keep incomplete line
        for (const line of lines) {
            if (!line.trim())
                continue;
            try {
                const msg = JSON.parse(line);
                if (this.messageHandler) {
                    this.messageHandler(msg);
                }
            }
            catch (e) {
                console.error(`[MCP] Failed to parse message: ${line}`, e);
            }
        }
    }
}
