// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/context/modules/upload-diagnostics/index.ts.
// The original TypeScript and import graph are not restored.








class LogUploadDiagnosticsCollector {
    async collect() {
        const [system, device] = await Promise.all([
            this.readBeforeDeadline(async ()=>await this.cpi.system.getSystemInfo()),
            this.readBeforeDeadline(async ()=>await this.cpi.system.getDeviceInfo())
        ]);
        const unavailable = [];
        if (system === undefined) {
            unavailable.push('system');
        }
        if (device === undefined) {
            unavailable.push('device');
        }
        return {
            ...system === undefined ? {} : {
                system: {
                    os_name: boundDiagnosticString(system.osName),
                    os_version: boundDiagnosticString(system.osVersion),
                    architecture: boundDiagnosticString(system.architecture),
                    locale: boundDiagnosticString(system.locale),
                    time_zone: boundDiagnosticString(system.timeZone)
                }
            },
            ...device === undefined ? {} : {
                device: {
                    model: boundDiagnosticString(device.model)
                }
            },
            ...unavailable.length === 0 ? {} : {
                diagnostics_unavailable: unavailable
            }
        };
    }
    async readBeforeDeadline(read) {
        let timeout;
        try {
            const timedOut = new Promise((resolve)=>{
                const timer = (0,external_node_timers_namespaceObject.setTimeout)(resolve, (/* inlined export .DEVICE_ID_WAIT_TIMEOUT_MS */1000));
                timer.unref();
                timeout = timer;
            });
            const result = await Promise.race([
                read(),
                timedOut
            ]);
            if (result === null || typeof result !== 'object' || Array.isArray(result)) {
                return undefined;
            }
            return result;
        } catch  {
            // Optional Native diagnostics must not block an otherwise valid upload or leak raw errors.
            return undefined;
        } finally{
            if (timeout !== undefined) {
                clearTimeout(timeout);
            }
        }
    }
}
__decorate([
    inject(CROSS_PLATFORM_INTERFACE),
    __metadata("design:type", typeof ICrossPlatformInterface === "undefined" ? Object : ICrossPlatformInterface)
], LogUploadDiagnosticsCollector.prototype, "cpi", void 0);
LogUploadDiagnosticsCollector = __decorate([
    injectable()
], LogUploadDiagnosticsCollector);
