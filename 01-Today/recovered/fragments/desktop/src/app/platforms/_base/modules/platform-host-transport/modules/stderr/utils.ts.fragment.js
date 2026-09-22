// Compiled fragment from ./src/app/platforms/_base/modules/platform-host-transport/modules/stderr/utils.ts.
// The original TypeScript and import graph are not restored.


const formatPlatformHostStderrLine = (line, logPrefix)=>{
    const bounded = Buffer.from(line, 'utf8').subarray(0, (/* inlined export .PLATFORM_HOST_MAX_STDERR_LINE_BYTES */8192)).toString('utf8').trimEnd();
    if (!bounded) {
        return undefined;
    }
    return `[${logPrefix}] ${bounded}`;
};
