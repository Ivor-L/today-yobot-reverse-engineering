// Compiled fragment from ./src/app/modules/adjust/modules/installation/utils.ts.
// The original TypeScript and import graph are not restored.




const parsePendingReport = (value)=>{
    if (!adjust_utils_isRecord(value) || value['status'] !== 'pending' || !Number.isSafeInteger(value['attempt']) || Number(value['attempt']) < 0 || typeof value['idempotencyKey'] !== 'string' || !ADJUST_INSTALLATION_IDEMPOTENCY_KEY_PATTERN.test(value['idempotencyKey']) || typeof value['nextAttemptAtMs'] !== 'number' || !Number.isFinite(value['nextAttemptAtMs']) || value['nextAttemptAtMs'] < 0 || typeof value['occurredAt'] !== 'string' || Number.isNaN(Date.parse(value['occurredAt']))) {
        throw new Error('The persisted Adjust installation request is invalid.');
    }
    return {
        attempt: Number(value['attempt']),
        idempotencyKey: value['idempotencyKey'],
        nextAttemptAtMs: value['nextAttemptAtMs'],
        occurredAt: value['occurredAt'],
        status: 'pending'
    };
};
const parseDesktopAdjustInstallationState = (value)=>{
    if (!adjust_utils_isRecord(value) || value['schemaVersion'] !== (/* inlined export .ADJUST_INSTALLATION_STATE_SCHEMA_VERSION */1) || typeof value['externalDeviceId'] !== 'string' || !ADJUST_INSTALLATION_DEVICE_ID_PATTERN.test(value['externalDeviceId'])) {
        throw new Error('The persisted Adjust installation state is invalid.');
    }
    if (value['rollout'] === 'legacy-excluded') {
        return {
            externalDeviceId: value['externalDeviceId'],
            rollout: 'legacy-excluded',
            schemaVersion: (/* inlined export .ADJUST_INSTALLATION_STATE_SCHEMA_VERSION */1)
        };
    }
    if (value['rollout'] !== 'eligible' || !adjust_utils_isRecord(value['report'])) {
        throw new Error('The persisted Adjust installation state is invalid.');
    }
    let report;
    if (value['report']['status'] === 'completed') {
        report = {
            status: 'completed'
        };
    } else {
        report = parsePendingReport(value['report']);
    }
    return {
        externalDeviceId: value['externalDeviceId'],
        report,
        rollout: 'eligible',
        schemaVersion: (/* inlined export .ADJUST_INSTALLATION_STATE_SCHEMA_VERSION */1)
    };
};
const createDesktopAdjustInstallationState = (externalDeviceId, occurredAtMs)=>{
    return parseDesktopAdjustInstallationState({
        externalDeviceId,
        report: {
            attempt: 0,
            idempotencyKey: (0,external_node_crypto_namespaceObject.randomUUID)(),
            nextAttemptAtMs: 0,
            occurredAt: toDesktopAdjustOccurredAt(occurredAtMs),
            status: 'pending'
        },
        rollout: 'eligible',
        schemaVersion: (/* inlined export .ADJUST_INSTALLATION_STATE_SCHEMA_VERSION */1)
    });
};
const createLegacyExcludedDesktopAdjustInstallationState = (externalDeviceId)=>{
    return parseDesktopAdjustInstallationState({
        externalDeviceId,
        rollout: 'legacy-excluded',
        schemaVersion: (/* inlined export .ADJUST_INSTALLATION_STATE_SCHEMA_VERSION */1)
    });
};
