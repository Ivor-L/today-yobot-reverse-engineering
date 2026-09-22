// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/socket/modules/notifications/modules/remote-push/modules/registration/utils.ts.
// The original TypeScript and import graph are not restored.

const isSameRemotePushRegistrationOwner = (left, right)=>left.accountId === right.accountId && left.environment === right.environment;
const toPushTokenBody = (deviceId, registration)=>({
        apnsToken: registration.token,
        deviceId,
        platform: registration.platform
    });
