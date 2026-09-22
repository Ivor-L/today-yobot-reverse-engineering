// Compiled fragment from ../../packages/socket/src/base/index.ts.
// The original TypeScript and import graph are not restored.



class BaseSocketClient {
    constructor(config){
        this.events = new node_modules_eventemitter3();
        this.config = config;
        this.fetcher = config.fetch ?? globalThis.fetch.bind(globalThis);
        this.SocketImpl = config.webSocket ?? globalThis.WebSocket;
        this.baseUrl = trimTrailingSlashes(config.baseUrl);
        this.deviceId = config.deviceId;
        this.origin = config.origin;
        this.userId = config.userId?.trim() || null;
    }
    destroy() {
        this.close();
        this.events.removeAllListeners();
    }
    on(eventName, listener) {
        this.events.on(eventName, listener);
        return this;
    }
    off(eventName, listener) {
        this.events.off(eventName, listener);
        return this;
    }
    emit(eventName, ...args) {
        return this.events.emit(eventName, ...args);
    }
}
