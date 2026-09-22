// Compiled fragment from ./src/app/platforms/_base/modules/platform-host-transport/consts.ts.
// The original TypeScript and import graph are not restored.

const PLATFORM_HOST_FORCE_KILL_DELAY_MS = 1000;
const PLATFORM_HOST_GRACEFUL_SHUTDOWN_DELAY_MS = 6000;
const PLATFORM_HOST_EXIT_WAIT_DELAY_MS = PLATFORM_HOST_GRACEFUL_SHUTDOWN_DELAY_MS + PLATFORM_HOST_FORCE_KILL_DELAY_MS + 1000;
const PLATFORM_HOST_MAX_MESSAGE_BYTES = 32 * 1024 * 1024;
