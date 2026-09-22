// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/record/modules/diagnostics/index.ts.
// The original TypeScript and import graph are not restored.









class RecordDiagnostics {
    async reportFault(id, reason, issue = true) {
        try {
            await this.logs.push({
                id: `${id}: ${reason}`,
                issue,
                target: (/* inlined export .PushTarget.Sentry */"sentry"),
                level: base_LogLevel.Error,
                payload: {
                    reason
                }
            });
        } catch  {
        // Reporting must not interrupt finalization or attempt to log its own failure.
        }
    }
    hasReportedFailure(event, sessionId) {
        return this.reportedFailures.has(`${sessionId}:${event}`);
    }
    record(event, context, fields = {}) {
        this.push(event, context, fields);
    }
    async push(event, { job, run }, fields) {
        try {
            const payload = {
                event,
                job_id_hash: hashRecordDiagnosticValue(job.sessionId),
                run_id_hash: hashRecordDiagnosticValue(run.runId)
            };
            const remote = recordCapture(job, run).remote;
            if (remote) {
                payload['capture_id_hash'] = hashRecordDiagnosticValue(remote.captureId);
            }
            for (const name of NUMBER_FIELDS){
                const value = fields[name];
                if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
                    payload[name] = value;
                }
            }
            if (fields.stage !== undefined) {
                payload['stage'] = fields.stage;
            }
            Object.assign(payload, recordErrorMetadata(fields.error));
            const issue = isRecordDiagnosticIssue(fields, payload);
            // Expected or forwarded observations must not consume a later failure's Issue slot.
            const reportKey = `${job.sessionId}:${event}${issue ? '' : ':log'}`;
            const severe = [
                'processing_failed',
                'capture_failed',
                'capture_stop_failed',
                'storage_failed'
            ].includes(event);
            const report = severe && !this.reportedFailures.has(reportKey);
            if (report) {
                if (this.reportedFailures.size >= 256) {
                    this.reportedFailures.clear();
                }
                this.reportedFailures.add(reportKey);
            }
            if (fields.failureReason && Object.values(base_RecordFailureReason).includes(fields.failureReason)) {
                payload['failureReason'] = fields.failureReason;
            }
            await this.logs.push({
                id: 'record_upload',
                ...report && issue ? {
                    issue: true
                } : {},
                level: event.endsWith('failed') || event === 'segment_retry' ? base_LogLevel.Warning : base_LogLevel.Info,
                target: report ? (/* inlined export .PushTarget.Sentry */"sentry") : (/* inlined export .PushTarget.File */"file"),
                payload
            });
        } catch  {
        // Diagnostics must never delay or change recording recovery, or recursively log failures.
        }
    }
    constructor(){
        this.reportedFailures = new Set();
    }
}
__decorate([
    inject(LogsShellService),
    __metadata("design:type", typeof Pick === "undefined" ? Object : Pick)
], RecordDiagnostics.prototype, "logs", void 0);
RecordDiagnostics = __decorate([
    injectable()
], RecordDiagnostics);
