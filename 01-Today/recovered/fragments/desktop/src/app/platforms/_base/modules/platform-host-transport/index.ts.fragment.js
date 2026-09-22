// Compiled fragment from ./src/app/platforms/_base/modules/platform-host-transport/index.ts.
// The original TypeScript and import graph are not restored.













class PlatformHostTransport {
    get processId() {
        const pid = this.child?.pid;
        if (this.disposed || this.stopped || this.hasChildExited() || !pid) {
            throw new Error('The platform host process is unavailable.');
        }
        return pid;
    }
    get connection() {
        if (!this.connectionValue) {
            throw new Error('The platform host transport has not started.');
        }
        return this.connectionValue;
    }
    start({ binaryPath, environment, logPrefix }) {
        if (this.connectionValue) {
            return;
        }
        const resolvedBinaryPath = utils_assertNonEmpty(binaryPath, 'binaryPath');
        const resolvedLogPrefix = utils_assertNonEmpty(logPrefix, 'logPrefix');
        const child = this.process.spawn({
            binaryPath: resolvedBinaryPath,
            environment
        });
        this.reader.connect(child.stdout);
        this.stderr.connect(child.stderr, resolvedLogPrefix);
        this.writer.connect(child.stdin);
        const connection = (0,node_main.createMessageConnection)(this.reader, this.writer);
        this.childExitPromise = new Promise((resolve)=>{
            this.resolveChildExit = resolve;
        });
        this.child = child;
        this.connectionValue = connection;
        this.logPrefix = resolvedLogPrefix;
        this.reader.onError((error)=>{
            this.fail(error);
        });
        this.writer.onError(([error])=>{
            this.fail(error);
        });
        this.reader.onClose(()=>{
            this.handleTransportClose();
        });
        this.writer.onClose(()=>{
            this.handleTransportClose();
        });
        child.once('error', (error)=>{
            this.fail(error);
            this.resolveChildExit?.();
        });
        child.once('exit', ()=>{
            this.clearGracefulShutdown();
            this.clearForceKill();
            this.disposeConnection();
            this.resolveChildExit?.();
        });
        connection.listen();
    }
    stop() {
        if (this.stopPromise) {
            return this.stopPromise;
        }
        this.stopped = true;
        try {
            this.connectionValue?.end();
        } finally{
            this.disposeConnection();
            this.child?.stdin.end();
            this.scheduleTermination();
        }
        this.stopPromise = this.waitForChildExit();
        return this.stopPromise;
    }
    clearGracefulShutdown() {
        if (!this.gracefulShutdownTimer) {
            return;
        }
        clearTimeout(this.gracefulShutdownTimer);
        this.gracefulShutdownTimer = undefined;
    }
    clearForceKill() {
        if (!this.forceKillTimer) {
            return;
        }
        clearTimeout(this.forceKillTimer);
        this.forceKillTimer = undefined;
    }
    disposeConnection() {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        this.connectionValue?.dispose();
    }
    fail(error) {
        if (error) {
            this.logger.warn(`[${this.logPrefix}] ${asError(error).message}`);
        }
        this.disposeConnection();
        this.child?.stdin.end();
        this.terminateChild();
    }
    handleTransportClose() {
        this.disposeConnection();
        if (this.stopped) {
            this.scheduleTermination();
            return;
        }
        this.terminateChild();
    }
    hasChildExited() {
        const child = this.child;
        if (!child) {
            return true;
        }
        if (child.exitCode !== null && child.exitCode !== undefined) {
            return true;
        }
        return child.signalCode !== null && child.signalCode !== undefined;
    }
    terminateChild() {
        this.clearGracefulShutdown();
        const child = this.child;
        if (!child || this.hasChildExited()) {
            return;
        }
        child.kill('SIGTERM');
        if (this.forceKillTimer) {
            return;
        }
        this.forceKillTimer = setTimeout(()=>{
            this.forceKillTimer = undefined;
            if (!this.hasChildExited()) {
                child.kill('SIGKILL');
            }
        }, (/* inlined export .PLATFORM_HOST_FORCE_KILL_DELAY_MS */1000));
        this.forceKillTimer.unref();
    }
    scheduleTermination() {
        if (this.hasChildExited() || this.gracefulShutdownTimer) {
            return;
        }
        this.gracefulShutdownTimer = setTimeout(()=>{
            this.gracefulShutdownTimer = undefined;
            this.terminateChild();
        }, (/* inlined export .PLATFORM_HOST_GRACEFUL_SHUTDOWN_DELAY_MS */6000));
        this.gracefulShutdownTimer.unref();
    }
    async waitForChildExit() {
        await Promise.race([
            this.childExitPromise,
            (0,external_node_timers_promises_namespaceObject.setTimeout)((/* inlined export .PLATFORM_HOST_EXIT_WAIT_DELAY_MS */8000), undefined, {
                ref: false
            })
        ]);
    }
    constructor(){
        this.childExitPromise = Promise.resolve();
        this.disposed = false;
        this.logPrefix = 'platform-host';
        this.stopped = false;
    }
}
__decorate([
    inject(PlatformHostLogger),
    __metadata("design:type", typeof PlatformHostLogger === "undefined" ? Object : PlatformHostLogger)
], PlatformHostTransport.prototype, "logger", void 0);
__decorate([
    inject(PlatformHostProcess),
    __metadata("design:type", typeof PlatformHostProcess === "undefined" ? Object : PlatformHostProcess)
], PlatformHostTransport.prototype, "process", void 0);
__decorate([
    inject(NdjsonMessageReader),
    __metadata("design:type", typeof NdjsonMessageReader === "undefined" ? Object : NdjsonMessageReader)
], PlatformHostTransport.prototype, "reader", void 0);
__decorate([
    inject(PlatformHostStderr),
    __metadata("design:type", typeof PlatformHostStderr === "undefined" ? Object : PlatformHostStderr)
], PlatformHostTransport.prototype, "stderr", void 0);
__decorate([
    inject(NdjsonMessageWriter),
    __metadata("design:type", typeof NdjsonMessageWriter === "undefined" ? Object : NdjsonMessageWriter)
], PlatformHostTransport.prototype, "writer", void 0);
PlatformHostTransport = __decorate([
    injectable()
], PlatformHostTransport);
