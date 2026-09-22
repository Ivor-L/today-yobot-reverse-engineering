import crypto from 'node:crypto';
export const AGENT_DEVICE_IDENTITY_V2_KEY = 'device.identity-v2';
export const DEVICE_IDENTITY_V2_ENV = 'YOKO_DEVICE_ID_V2';
const MAX_DEVICE_IDENTITY_BYTES = 4 * 1024;
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const LEGACY_MACHINE_CODE_PATTERN = /^[0-9A-F]{4}(?:-[0-9A-F]{4}){3}$/;
const DEVICE_IDENTITY_KEYS = new Set(['version', 'id', 'source', 'legacyMachineCode']);
function freezeIdentity(identity) {
    return Object.freeze({ ...identity });
}
function requireLegacyMachineCode(value) {
    if (value === undefined)
        return undefined;
    if (!LEGACY_MACHINE_CODE_PATTERN.test(value)) {
        throw new Error('Legacy RPA machine code is invalid');
    }
    return value;
}
export function parseDeviceIdentityV2(value) {
    if (!value || Buffer.byteLength(value, 'utf8') > MAX_DEVICE_IDENTITY_BYTES) {
        throw new Error('Device identity store is corrupt');
    }
    let parsed;
    try {
        parsed = JSON.parse(value);
    }
    catch {
        throw new Error('Device identity store is corrupt');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Device identity store is corrupt');
    }
    const candidate = parsed;
    if (Object.keys(candidate).some((key) => !DEVICE_IDENTITY_KEYS.has(key))) {
        throw new Error('Device identity store contains unsupported fields');
    }
    if (candidate.version !== 2) {
        throw new Error('Device identity version is unsupported');
    }
    if (typeof candidate.id !== 'string' || !UUID_V4_PATTERN.test(candidate.id)) {
        throw new Error('Device identity UUID is invalid');
    }
    if (candidate.source !== 'generated' && candidate.source !== 'migrated') {
        throw new Error('Device identity source is invalid');
    }
    if (candidate.legacyMachineCode !== undefined && typeof candidate.legacyMachineCode !== 'string') {
        throw new Error('Legacy RPA machine code is invalid');
    }
    const legacyMachineCode = requireLegacyMachineCode(candidate.legacyMachineCode);
    return freezeIdentity({
        version: 2,
        id: candidate.id,
        source: candidate.source,
        ...(legacyMachineCode ? { legacyMachineCode } : {}),
    });
}
/**
 * Installation-scoped identity owned by Electron main. It intentionally does
 * not replace the legacy RPA machine code used by existing seat entitlements.
 */
export class SecretStoreDeviceIdentityProvider {
    store;
    getLegacyMachineCode;
    pending = null;
    constructor(store, getLegacyMachineCode) {
        this.store = store;
        this.getLegacyMachineCode = getLegacyMachineCode;
    }
    getOrCreate() {
        if (this.pending)
            return this.pending;
        const operation = this.loadOrCreate();
        const guarded = operation.catch((error) => {
            if (this.pending === guarded)
                this.pending = null;
            throw error;
        });
        this.pending = guarded;
        return guarded;
    }
    async loadOrCreate() {
        const existing = await this.store.get(AGENT_DEVICE_IDENTITY_V2_KEY);
        if (existing !== null)
            return parseDeviceIdentityV2(existing);
        const legacyMachineCode = requireLegacyMachineCode(this.getLegacyMachineCode?.());
        const generated = freezeIdentity({
            version: 2,
            id: crypto.randomUUID(),
            source: 'generated',
            ...(legacyMachineCode ? { legacyMachineCode } : {}),
        });
        const serialized = JSON.stringify(generated);
        await this.store.set(AGENT_DEVICE_IDENTITY_V2_KEY, serialized);
        const committed = await this.store.get(AGENT_DEVICE_IDENTITY_V2_KEY);
        if (committed === null)
            throw new Error('Device identity disappeared after persistence');
        const verified = parseDeviceIdentityV2(committed);
        if (verified.id !== generated.id)
            throw new Error('Device identity verification failed');
        return verified;
    }
}
