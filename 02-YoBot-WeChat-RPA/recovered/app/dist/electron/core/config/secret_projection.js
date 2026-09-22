import crypto from 'node:crypto';
export const CONFIG_SECRET_MASK = '********';
function cloneConfig(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Config secret projection requires an object');
    }
    try {
        return JSON.parse(JSON.stringify(value));
    }
    catch {
        throw new Error('Config secret projection requires JSON-safe data');
    }
}
function asObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : null;
}
function stableSegment(value) {
    return crypto.createHash('sha256').update(value, 'utf8').digest('hex').slice(0, 20);
}
function identifiedSegment(value, fallback) {
    return stableSegment(typeof value === 'string' && value.trim() ? value.trim() : fallback);
}
function fixedSlot(parent, field, key) {
    if (!parent || !Object.prototype.hasOwnProperty.call(parent, field))
        return null;
    return {
        key,
        read: () => parent[field],
        write: (value) => { parent[field] = value; },
    };
}
function recordSlots(parent, field, keyPrefix) {
    const record = asObject(parent?.[field]);
    if (!record)
        return [];
    return Object.keys(record).sort().map((name) => ({
        key: `${keyPrefix}.${stableSegment(name)}`,
        read: () => record[name],
        write: (value) => { record[name] = value; },
    }));
}
function collectSecretSlots(config) {
    const slots = [];
    const llm = asObject(config.llm);
    const providers = Array.isArray(llm?.providers) ? llm.providers : [];
    providers.forEach((rawProvider, index) => {
        const provider = asObject(rawProvider);
        const slot = fixedSlot(provider, 'apiKey', `config.llm-provider.${identifiedSegment(provider?.id, `index-${index}`)}.api-key`);
        if (slot)
            slots.push(slot);
    });
    const mcpServers = Array.isArray(config.mcpServers) ? config.mcpServers : [];
    mcpServers.forEach((rawServer, index) => {
        const server = asObject(rawServer);
        if (!server)
            return;
        const prefix = `config.mcp-server.${identifiedSegment(server.id, `index-${index}`)}`;
        slots.push(...recordSlots(server, 'env', `${prefix}.env`));
        slots.push(...recordSlots(server, 'headers', `${prefix}.header`));
    });
    const mcpGateway = fixedSlot(asObject(config.mcpGateway), 'token', 'config.mcp-gateway.token');
    if (mcpGateway)
        slots.push(mcpGateway);
    const channels = asObject(config.channels);
    const feishuSecret = fixedSlot(asObject(channels?.feishu), 'appSecret', 'config.channel.feishu.app-secret');
    if (feishuSecret)
        slots.push(feishuSecret);
    const keys = new Set();
    for (const slot of slots) {
        if (keys.has(slot.key))
            throw new Error(`Config secret key collision: ${slot.key}`);
        keys.add(slot.key);
    }
    return slots;
}
export function projectConfigSecrets(value) {
    const config = cloneConfig(value);
    const secrets = [];
    for (const slot of collectSecretSlots(config)) {
        const current = slot.read();
        if (typeof current === 'string' && current) {
            secrets.push({ key: slot.key, value: current });
        }
        // Even malformed recognized values must not leak into the physical JSON.
        slot.write('');
    }
    return { config, secrets };
}
export async function hydrateConfigSecrets(value, store) {
    const config = cloneConfig(value);
    for (const slot of collectSecretSlots(config)) {
        const secret = await store.get(slot.key);
        if (secret !== null)
            slot.write(secret);
    }
    return config;
}
export function hydrateConfigSecretsFromSnapshot(value, snapshot) {
    const config = cloneConfig(value);
    for (const slot of collectSecretSlots(config)) {
        const secret = snapshot[slot.key];
        if (typeof secret === 'string' && secret)
            slot.write(secret);
    }
    return config;
}
export function configSecretSnapshot(projection) {
    const snapshot = Object.create(null);
    for (const secret of projection.secrets) {
        if (Object.prototype.hasOwnProperty.call(snapshot, secret.key)) {
            throw new Error(`Config secret key collision: ${secret.key}`);
        }
        snapshot[secret.key] = secret.value;
    }
    return Object.freeze(snapshot);
}
function isSecretMask(value) {
    return value === CONFIG_SECRET_MASK
        || (typeof value === 'string' && /^.{3}\*{4}.{4}$/u.test(value));
}
export function maskConfigSecrets(value) {
    const config = cloneConfig(value);
    for (const slot of collectSecretSlots(config)) {
        const current = slot.read();
        slot.write(typeof current === 'string' && current ? CONFIG_SECRET_MASK : '');
    }
    return config;
}
export function mergeConfigSecretPlaceholders(incomingValue, currentValue) {
    const incoming = cloneConfig(incomingValue);
    const current = cloneConfig(currentValue);
    const currentSecrets = new Map();
    for (const slot of collectSecretSlots(current)) {
        const value = slot.read();
        if (typeof value === 'string' && value)
            currentSecrets.set(slot.key, value);
    }
    for (const slot of collectSecretSlots(incoming)) {
        if (!isSecretMask(slot.read()))
            continue;
        slot.write(currentSecrets.get(slot.key) ?? '');
    }
    return incoming;
}
export async function persistProjectedSecrets(projection, store) {
    for (const secret of projection.secrets) {
        await store.set(secret.key, secret.value);
    }
}
