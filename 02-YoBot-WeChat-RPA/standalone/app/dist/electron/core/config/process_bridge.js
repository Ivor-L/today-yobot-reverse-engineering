import crypto from 'node:crypto';
import { ConfigManager } from './manager.js';
import { mergeConfigSecretPlaceholders } from './secret_projection.js';
export const CONFIG_PROCESS_PROTOCOL_VERSION = 1;
export const SECURE_CONFIG_IPC_ENV = 'YOKO_SECURE_CONFIG_IPC';
const MAX_CONFIG_MESSAGE_BYTES = 4 * 1024 * 1024;
const REQUEST_ID_PATTERN = /^[a-f0-9-]{16,64}$/i;
function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
function requireMessageSize(value) {
    let serialized;
    try {
        serialized = JSON.stringify(value);
    }
    catch {
        throw new Error('Config IPC message must be JSON-safe');
    }
    if (Buffer.byteLength(serialized, 'utf8') > MAX_CONFIG_MESSAGE_BYTES) {
        throw new Error('Config IPC message exceeds the size limit');
    }
}
function isConfigDocument(value) {
    if (!isObject(value))
        return false;
    try {
        requireMessageSize(value);
        return true;
    }
    catch {
        return false;
    }
}
export function parseConfigOwnerRequest(value) {
    if (!isObject(value) || value.protocol_version !== CONFIG_PROCESS_PROTOCOL_VERSION)
        return null;
    if (value.type === 'config:bootstrap-request') {
        return { type: value.type, protocol_version: CONFIG_PROCESS_PROTOCOL_VERSION };
    }
    if (value.type === 'config:persist-request'
        && typeof value.requestId === 'string'
        && REQUEST_ID_PATTERN.test(value.requestId)
        && isConfigDocument(value.document)) {
        return {
            type: value.type,
            protocol_version: CONFIG_PROCESS_PROTOCOL_VERSION,
            requestId: value.requestId,
            document: value.document,
        };
    }
    return null;
}
export function createConfigReplaceMessage(config) {
    requireMessageSize(config);
    return {
        type: 'config:replace',
        protocol_version: CONFIG_PROCESS_PROTOCOL_VERSION,
        config: config,
    };
}
export async function handleConfigOwnerRequest(value, deps) {
    const request = parseConfigOwnerRequest(value);
    if (!request)
        return false;
    if (request.type === 'config:bootstrap-request') {
        const config = deps.getConfig();
        requireMessageSize(config);
        deps.send({
            type: 'config:bootstrap-response',
            protocol_version: CONFIG_PROCESS_PROTOCOL_VERSION,
            config: config,
        });
        return true;
    }
    try {
        const config = await deps.persist(request.document);
        requireMessageSize(config);
        deps.send({
            type: 'config:persist-response',
            protocol_version: CONFIG_PROCESS_PROTOCOL_VERSION,
            requestId: request.requestId,
            success: true,
            config: config,
        });
    }
    catch (error) {
        deps.send({
            type: 'config:persist-response',
            protocol_version: CONFIG_PROCESS_PROTOCOL_VERSION,
            requestId: request.requestId,
            success: false,
            error: error instanceof Error ? error.message.slice(0, 500) : 'Config persistence failed',
        });
    }
    return true;
}
export class ConfigChildProcessBridge {
    port;
    manager;
    secureMode;
    initialized = false;
    disposed = false;
    bootstrapResolve = null;
    bootstrapReject = null;
    pending = new Map();
    onMessageBound = (message) => this.onMessage(message);
    onDisconnectBound = () => this.failAll(new Error('Config owner process disconnected'));
    constructor(port, manager, secureMode) {
        this.port = port;
        this.manager = manager;
        this.secureMode = secureMode;
    }
    isSecureMode() {
        return this.secureMode;
    }
    async initialize(timeoutMs = 15_000) {
        if (!this.secureMode || this.initialized)
            return;
        if (this.disposed || typeof this.port.send !== 'function') {
            throw new Error('Secure config IPC requires a connected parent process');
        }
        this.port.on('message', this.onMessageBound);
        this.port.on('disconnect', this.onDisconnectBound);
        try {
            await new Promise((resolve, reject) => {
                const request = {
                    type: 'config:bootstrap-request',
                    protocol_version: CONFIG_PROCESS_PROTOCOL_VERSION,
                };
                let retry;
                let timeout;
                const clear = () => {
                    clearInterval(retry);
                    clearTimeout(timeout);
                };
                this.bootstrapResolve = () => { clear(); resolve(); };
                this.bootstrapReject = (error) => { clear(); reject(error); };
                const send = () => {
                    if (this.initialized || this.disposed)
                        return;
                    try {
                        this.port.send?.(request);
                    }
                    catch (error) {
                        this.bootstrapReject?.(error instanceof Error ? error : new Error('Failed to request config bootstrap'));
                    }
                };
                retry = setInterval(send, 250);
                retry.unref?.();
                timeout = setTimeout(() => {
                    if (!this.initialized)
                        this.bootstrapReject?.(new Error('Timed out waiting for secure config bootstrap'));
                }, timeoutMs);
                send();
            });
        }
        catch (error) {
            this.port.off('message', this.onMessageBound);
            this.port.off('disconnect', this.onDisconnectBound);
            throw error;
        }
    }
    async persist(config, timeoutMs = 15_000) {
        const mergedConfig = mergeConfigSecretPlaceholders(config, this.manager.getConfig());
        if (!this.secureMode) {
            this.manager.saveConfig(mergedConfig);
            return this.manager.getConfig();
        }
        if (!this.initialized || this.disposed || typeof this.port.send !== 'function') {
            throw new Error('Secure config bridge is not initialized');
        }
        const requestId = crypto.randomUUID();
        const document = this.manager.getPersistableConfig(mergedConfig);
        requireMessageSize(document);
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pending.delete(requestId);
                reject(new Error('Timed out waiting for config persistence confirmation'));
            }, timeoutMs);
            this.pending.set(requestId, { resolve, reject, timeout });
            try {
                this.port.send?.({
                    type: 'config:persist-request',
                    protocol_version: CONFIG_PROCESS_PROTOCOL_VERSION,
                    requestId,
                    document,
                });
            }
            catch (error) {
                clearTimeout(timeout);
                this.pending.delete(requestId);
                reject(error instanceof Error ? error : new Error('Failed to send config persistence request'));
            }
        });
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.port.off('message', this.onMessageBound);
        this.port.off('disconnect', this.onDisconnectBound);
        this.failAll(new Error('Config process bridge disposed'));
    }
    onMessage(message) {
        if (!isObject(message) || message.protocol_version !== CONFIG_PROCESS_PROTOCOL_VERSION)
            return;
        if ((message.type === 'config:bootstrap-response' || message.type === 'config:replace')
            && isConfigDocument(message.config)) {
            try {
                this.manager.useExternalPersistence(message.config);
                this.initialized = true;
                this.bootstrapResolve?.();
                this.bootstrapResolve = null;
                this.bootstrapReject = null;
            }
            catch (error) {
                this.bootstrapReject?.(error instanceof Error ? error : new Error('Config bootstrap is invalid'));
            }
            return;
        }
        if (message.type !== 'config:persist-response'
            || typeof message.requestId !== 'string'
            || !REQUEST_ID_PATTERN.test(message.requestId)
            || typeof message.success !== 'boolean')
            return;
        const pending = this.pending.get(message.requestId);
        if (!pending)
            return;
        clearTimeout(pending.timeout);
        this.pending.delete(message.requestId);
        if (!message.success) {
            pending.reject(new Error(typeof message.error === 'string' ? message.error : 'Config persistence failed'));
            return;
        }
        if (!isConfigDocument(message.config)) {
            pending.reject(new Error('Config persistence response is invalid'));
            return;
        }
        try {
            this.manager.useExternalPersistence(message.config);
            pending.resolve(this.manager.getConfig());
        }
        catch (error) {
            pending.reject(error instanceof Error ? error : new Error('Config persistence response is invalid'));
        }
    }
    failAll(error) {
        this.bootstrapReject?.(error);
        this.bootstrapResolve = null;
        this.bootstrapReject = null;
        for (const pending of this.pending.values()) {
            clearTimeout(pending.timeout);
            pending.reject(error);
        }
        this.pending.clear();
    }
}
let runtimeBridge = null;
function defaultRuntimeBridge() {
    if (!runtimeBridge) {
        runtimeBridge = new ConfigChildProcessBridge(process, ConfigManager.getInstance(), process.env[SECURE_CONFIG_IPC_ENV] === '1');
    }
    return runtimeBridge;
}
export function initializeRuntimeConfigPersistence(timeoutMs) {
    return defaultRuntimeBridge().initialize(timeoutMs);
}
export function persistRuntimeConfig(config, timeoutMs) {
    return defaultRuntimeBridge().persist(config, timeoutMs);
}
export function runtimeConfigIsExternallyOwned() {
    return defaultRuntimeBridge().isSecureMode();
}
