export const AGENT_DEVICE_CONTEXT_SCHEMA_VERSION = 2;
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const LEGACY_MACHINE_CODE_PATTERN = /^[0-9A-F]{4}(?:-[0-9A-F]{4}){3}$/;
const APP_VERSION_PATTERN = /^[0-9A-Za-z][0-9A-Za-z.+_-]{0,63}$/;
function requireAppVersion(value) {
    const version = value.trim();
    if (version !== value || !APP_VERSION_PATTERN.test(version)) {
        throw new Error('Agent app version is invalid');
    }
    return version;
}
function requireLegacyMachineCode(value) {
    if (!LEGACY_MACHINE_CODE_PATTERN.test(value)) {
        throw new Error('Legacy machine code is invalid');
    }
    return value;
}
/**
 * Builds the explicit login identity owned by Electron main. The identifier is
 * an association/audit key, not an authenticator; server sessions and leases
 * remain the authority that prevents concurrent use.
 */
export function createAgentDeviceContext(input) {
    const appVersion = requireAppVersion(input.appVersion);
    const legacyMachineCode = requireLegacyMachineCode(input.legacyMachineCode);
    if (input.installationIdentity) {
        const deviceId = input.installationIdentity.id;
        if (!UUID_V4_PATTERN.test(deviceId))
            throw new Error('Installation device UUID is invalid');
        return Object.freeze({
            schema_version: AGENT_DEVICE_CONTEXT_SCHEMA_VERSION,
            device_id: deviceId,
            device_id_kind: 'installation_uuid_v2',
            platform: input.platform,
            arch: input.arch,
            app_version: appVersion,
            legacy_machine_code: legacyMachineCode,
        });
    }
    return Object.freeze({
        schema_version: AGENT_DEVICE_CONTEXT_SCHEMA_VERSION,
        device_id: legacyMachineCode,
        device_id_kind: 'legacy_machine_code_v1',
        platform: input.platform,
        arch: input.arch,
        app_version: appVersion,
        legacy_machine_code: legacyMachineCode,
    });
}
