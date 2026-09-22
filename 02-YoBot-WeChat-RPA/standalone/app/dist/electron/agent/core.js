import { PiKernel } from "./pi/kernel.js";
export class Agent {
    kernel;
    constructor(memory, tools, stateProvider) {
        this.kernel = new PiKernel(memory, tools, stateProvider);
    }
    /**
     * Core Run Loop
     * Now delegated to Pi Kernel (OpenClaw Core)
     * @param userMessage Latest user input (or raw Message object)
     * @param history Short-term conversation history
     */
    async run(userMessage, history, sessionId = "default", onEvent) {
        return this.kernel.run(userMessage, history, sessionId, onEvent);
    }
    /**
     * Stop the running agent for a specific session
     */
    stop(sessionId, reason) {
        this.kernel.stop(sessionId, reason);
    }
    evictSession(sessionId) {
        return this.kernel.evict(sessionId);
    }
    rewindLastStoppedTurn(sessionId) {
        return this.kernel.rewindLastStoppedTurn(sessionId);
    }
}
