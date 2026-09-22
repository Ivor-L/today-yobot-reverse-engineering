// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/socket/modules/remote-log-upload/index.ts.
// The original TypeScript and import graph are not restored.








class RemoteLogUpload extends readonly_events_ReadonlyEvents {
    dispose() {
        this.cancelActive();
    }
    cancelActive() {
        const active = this.active;
        if (!active || active.cancelled) {
            return;
        }
        active.cancelled = true;
        active.controller.abort();
    }
    handleEventPush(message) {
        const result = parseClientLogUploadCommand(message);
        if (result.status === 'unrelated') {
            return false;
        }
        if (result.status === 'invalid') {
            return true;
        }
        if (result.command.event === socketEventNames.clientLog.upload.cancelledV1) {
            this.handleCancelled(result.command.requestId);
            return true;
        }
        this.handleRequested(result.command.requestId);
        return true;
    }
    handleRequested(requestId) {
        const active = this.active;
        if (active?.requestId === requestId && active.cancelled) {
            return;
        }
        this.emit('outbound', {
            type: CLIENT_LOG_UPLOAD_ACCEPTED_FRAME_TYPE,
            requestId
        });
        if (active) {
            if (active.requestId === requestId) {
                this.emit('outbound', {
                    type: CLIENT_LOG_UPLOAD_PROGRESS_FRAME_TYPE,
                    requestId,
                    progress: active.progress
                });
                return;
            }
            this.emit('outbound', {
                type: CLIENT_LOG_UPLOAD_FAILED_FRAME_TYPE,
                requestId,
                errorCode: base_InterfaceErrorCode.Conflict
            });
            return;
        }
        const next = {
            cancelled: false,
            controller: new AbortController(),
            progress: 0,
            requestId
        };
        this.active = next;
        this.run(next);
    }
    handleCancelled(requestId) {
        if (this.active?.requestId !== requestId) {
            return;
        }
        this.cancelActive();
    }
    async run(active) {
        try {
            const logId = await this.logs.uploadRemote(active.requestId, active.controller.signal, (progress)=>{
                if (this.active !== active || active.cancelled) {
                    return;
                }
                active.progress = progress;
                this.emit('outbound', {
                    type: CLIENT_LOG_UPLOAD_PROGRESS_FRAME_TYPE,
                    requestId: active.requestId,
                    progress
                });
            });
            if (!this.canPublishTerminal(active)) {
                return;
            }
            this.emit('outbound', {
                type: CLIENT_LOG_UPLOAD_COMPLETED_FRAME_TYPE,
                requestId: active.requestId,
                ...logId ? {
                    logId
                } : {}
            });
        } catch (error) {
            if (!this.canPublishTerminal(active)) {
                return;
            }
            this.emit('outbound', {
                type: CLIENT_LOG_UPLOAD_FAILED_FRAME_TYPE,
                requestId: active.requestId,
                errorCode: interface_error_InterfaceError(error, 'The remote log upload failed.').code
            });
        } finally{
            if (this.active === active) {
                this.active = null;
            }
        }
    }
    canPublishTerminal(active) {
        return this.active === active && !active.cancelled && !active.controller.signal.aborted;
    }
    constructor(...args){
        super(...args), this.active = null;
    }
}
__decorate([
    inject(LogsShellService),
    __metadata("design:type", typeof LogsShellService === "undefined" ? Object : LogsShellService)
], RemoteLogUpload.prototype, "logs", void 0);
RemoteLogUpload = __decorate([
    injectable()
], RemoteLogUpload);
