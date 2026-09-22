// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/record/modules/backend/index.ts.
// The original TypeScript and import graph are not restored.
















class RecordBackend {
    async getProcessingOutcome({ job, run }) {
        const context = await this.getRequestContext(job);
        const client = await this.account.createApiClient(context.accessToken);
        const remote = this.requireRemote(recordCapture(job, run).remote);
        this.assertCurrentRequestContext(context);
        const result = await getV1RecordingNotesByRecordingId({
            client,
            path: {
                recordingId: remote.captureId
            },
            signal: AbortSignal.timeout(10000)
        });
        this.assertCurrentRequestContext(context);
        // The lifecycle row may not be visible immediately after a successful seal.
        if (result.response.status === 404) {
            return 'pending';
        }
        const note = result.data?.data;
        if (!result.response.ok || !result.data?.success || note?.recordingId !== remote.captureId) {
            throw new RecordBackendError(base_InterfaceErrorCode.Unavailable, 'Recording processing status could not be loaded.', {
                retryable: true
            });
        }
        if (note.state === 'skipped' && note.skipReason === 'no_usable_speech') {
            return 'no-usable-speech';
        }
        if (note.state === 'skipped') {
            return 'failed';
        }
        if (note.state === 'ready' || note.state === 'failed') {
            return note.state;
        }
        return 'pending';
    }
    async createCapture(params) {
        const { job, run } = params;
        const capture = recordCapture(job, run);
        const response = await this.post(job, '/v1/voice-captures', capture.createIdempotencyKey, {
            schemaVersion: 1,
            startedAtEpochMs: toWireMilliseconds(capture.startedAtEpochMs),
            deviceMonotonicStartMs: toWireMilliseconds(capture.deviceMonotonicStartMs),
            startTrigger: 'user',
            timezone: job.timezone,
            audioFormat: {
                container: 'flac',
                codec: 'flac',
                sampleFormat: 's16',
                sampleRateHz: 48000,
                channels: 1
            }
        }, params.signal);
        return parseCreatedCapture(response);
    }
    async cancelRemoteCapture(params) {
        const { idempotencyKey, job, run } = params;
        const remote = this.requireRemote(recordCapture(job, run).remote);
        const response = await this.post(job, `/v1/voice-captures/${encodeURIComponent(remote.captureId)}/cancel`, idempotencyKey, {
            streamId: remote.streamId
        });
        return parseCancelledCapture(response, remote.captureId);
    }
    async uploadSegment(params) {
        const { job, run, segment } = params;
        const remote = this.requireRemote(recordCapture(job, run).remote);
        const sequenceNo = recordUploadSequenceNo(job, run, segment.sequenceNo);
        this.assertUploadActive(params.signal);
        let stage = 'prepare';
        const startedAt = Date.now();
        try {
            // Re-enter prepare with the persisted keys after ambiguous PUT/commit failures.
            // A lost commit ACK can then recover as alreadyCommitted without duplicating audio.
            const response = await this.post(job, `/v1/voice-captures/${encodeURIComponent(remote.captureId)}/segment-batches`, segment.prepareIdempotencyKey, {
                streamId: remote.streamId,
                segments: [
                    {
                        sequenceNo,
                        capturedAtEpochMs: toWireMilliseconds(segment.capturedAtEpochMs),
                        deviceMonotonicStartMs: toWireMilliseconds(segment.deviceMonotonicStartMs),
                        contentType: segment.contentType,
                        contentLength: segment.contentLength,
                        contentSha256: segment.contentSha256
                    }
                ]
            }, params.signal);
            const prepared = parsePreparedSegment(response, sequenceNo);
            if (prepared.status === 'alreadyCommitted') {
                return;
            }
            if (prepared.status === 'conflict') {
                throw new RecordBackendError(base_InterfaceErrorCode.Conflict, 'The recording service found conflicting audio segment data.', {
                    businessCode: 'voice_capture.segment_conflict',
                    retryable: false
                });
            }
            stage = 'put';
            await this.putSegment(prepared, params, 1);
            stage = 'commit';
            this.assertUploadActive(params.signal);
            const commitResponse = await this.post(job, `/v1/voice-captures/${encodeURIComponent(remote.captureId)}/segment-batches/${encodeURIComponent(prepared.batchId)}/commit`, segment.commitIdempotencyKey, {
                items: [
                    {
                        segmentId: prepared.segmentId,
                        contentSha256: segment.contentSha256
                    }
                ]
            }, params.signal);
            assertCommittedSegment(commitResponse, prepared.segmentId);
            return;
        } catch (error) {
            const fields = {
                sequenceNo: segment.sequenceNo,
                bytes: segment.contentLength,
                uploadGeneration: segment.uploadGeneration,
                attempt: 1,
                stage,
                durationMs: Date.now() - startedAt,
                httpStatus: error instanceof RecordBackendError ? error.httpStatus : undefined,
                error
            };
            this.diagnostics.record('segment_failed', {
                job,
                run
            }, fields);
            throw error;
        }
    }
    assertUploadActive(signal) {
        if (signal?.aborted) {
            throw new RecordBackendError(base_InterfaceErrorCode.NetworkError, 'The audio upload could not reach storage.', {
                retryable: true
            });
        }
    }
    async sealCapture(params) {
        const { job, run } = params;
        const capture = recordCapture(job, run);
        const remote = this.requireRemote(capture.remote);
        const lastRun = job.capture ? job.runs.findLast((candidate)=>candidate.segments.length > 0) : run;
        const endedAtEpochMs = lastRun?.endedAtEpochMs;
        const deviceMonotonicEndMs = lastRun?.deviceMonotonicEndMs;
        const endReason = job.capture ? job.runs.at(-1)?.endReason : run.endReason;
        const lastSegment = lastRun?.segments.at(-1);
        if (endedAtEpochMs === undefined || deviceMonotonicEndMs === undefined || endReason === undefined || lastRun === undefined || lastSegment === undefined) {
            throw new RecordBackendError(base_InterfaceErrorCode.Internal, 'The recording capture is not ready to be sealed.', {
                retryable: false
            });
        }
        try {
            await this.post(job, `/v1/voice-captures/${encodeURIComponent(remote.captureId)}/seal`, capture.sealIdempotencyKey, {
                streamId: remote.streamId,
                lastSequenceNo: recordUploadSequenceNo(job, lastRun, lastSegment.sequenceNo),
                endedAtEpochMs: toWireMilliseconds(endedAtEpochMs),
                deviceMonotonicEndMs: toWireMilliseconds(deviceMonotonicEndMs),
                endReason
            }, params.signal);
        } catch (error) {
            if (error instanceof RecordBackendError && error.businessCode === 'voice_capture.capture_sealed') {
                return;
            }
            throw error;
        }
    }
    async post(job, path, idempotencyKey, body, signal) {
        const context = await this.getRequestContext(job);
        const headers = await this.http.headers({
            bearerToken: context.accessToken,
            contentType: 'application/json',
            target: 'api'
        });
        headers.set('X-Device-Id', context.deviceId);
        headers.set('Idempotency-Key', idempotencyKey);
        this.assertCurrentRequestContext(context);
        this.assertUploadActive(signal);
        let response;
        try {
            response = await this.http.request(globalThis.fetch, new URL(path, context.apiBaseUrl), {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal
            });
        } catch (error) {
            throw this.transportError(error);
        }
        let payload;
        try {
            payload = await this.http.readJson(response);
        } catch (error) {
            // A response can lose its connection after headers, including a successful commit ACK.
            // Preserve malformed JSON/domain errors; only transport failures enter network recovery.
            if (error instanceof TypeError || error instanceof DOMException && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
                throw this.transportError(error);
            }
            throw error;
        }
        this.assertUploadActive(signal);
        this.assertCurrentRequestContext(context);
        if (!response.ok) {
            throw this.responseError(response.status, payload);
        }
        return payload;
    }
    async getRequestContext(job) {
        const auth = await this.account.getFreshUserSocketAuthContext();
        if (!auth || !this.matchesJob(auth, job)) {
            throw new RecordBackendError(base_InterfaceErrorCode.AuthRequired, 'Sign in to the account that created this recording to continue.', {
                retryable: true
            });
        }
        const registeredDeviceId = this.socket.getRegisteredDeviceId(auth);
        if (!registeredDeviceId) {
            throw new RecordBackendError(base_InterfaceErrorCode.Unavailable, 'This device is not ready to send recordings.', {
                retryable: true
            });
        }
        const runtime = this.account.runtimeSnapshot;
        const context = {
            accessToken: auth.accessToken,
            accountId: auth.accountId,
            apiBaseUrl: runtime.apiBaseUrl,
            deviceId: registeredDeviceId,
            environment: auth.environment,
            sessionGeneration: auth.sessionGeneration
        };
        this.assertCurrentRequestContext(context);
        return context;
    }
    assertCurrentRequestContext(context) {
        const runtime = this.account.runtimeSnapshot;
        if (!this.account.isCurrentUserSocketAuthContext(context) || runtime.environment !== context.environment || runtime.apiBaseUrl !== context.apiBaseUrl) {
            throw new RecordBackendError(base_InterfaceErrorCode.AuthRequired, 'The account changed before the recording request could be sent.', {
                retryable: true
            });
        }
    }
    matchesJob(auth, job) {
        return auth.accountId === job.accountId && auth.environment === job.environment;
    }
    requireRemote(remote) {
        if (remote) {
            return remote;
        }
        throw new RecordBackendError(base_InterfaceErrorCode.Internal, 'The recording capture has not been created.', {
            retryable: true
        });
    }
    async putSegment(prepared, { bytes, job, run, segment, signal }, attempt) {
        const upload = prepared.upload;
        if (!upload) {
            throw new RecordBackendError(base_InterfaceErrorCode.Internal, 'The recording service omitted the audio upload target.', {
                retryPrepare: true,
                retryable: true
            });
        }
        const actualSha256 = (0,external_node_crypto_namespaceObject.createHash)('sha256').update(bytes).digest('hex');
        if (bytes.byteLength !== segment.contentLength || actualSha256 !== segment.contentSha256) {
            throw new RecordBackendError(base_InterfaceErrorCode.Conflict, 'A local recording segment did not pass its integrity check.', {
                retryable: false,
                segmentIntegrityFailure: true
            });
        }
        // A prepare may finish after an account switch; do not start its signed PUT then.
        await this.getRequestContext(job);
        this.assertUploadActive(signal);
        const startedAt = Date.now();
        const fields = {
            sequenceNo: segment.sequenceNo,
            bytes: segment.contentLength,
            uploadGeneration: segment.uploadGeneration,
            attempt,
            stage: 'put',
            timeoutMs: (/* inlined export .RECORD_SEGMENT_UPLOAD_TIMEOUT_MS */300000)
        };
        this.diagnostics.record('put_started', {
            job,
            run
        }, fields);
        const heartbeat = setInterval(()=>{
            // fetch exposes no reliable byte progress; report elapsed time only while awaiting S3.
            this.diagnostics.record('put_waiting', {
                job,
                run
            }, {
                ...fields,
                durationMs: Date.now() - startedAt
            });
        }, (/* inlined export .RECORD_SEGMENT_UPLOAD_HEARTBEAT_MS */30000));
        heartbeat.unref?.();
        let response;
        try {
            const timeout = AbortSignal.timeout((/* inlined export .RECORD_SEGMENT_UPLOAD_TIMEOUT_MS */300000));
            response = await globalThis.fetch(upload.url, {
                method: upload.method,
                headers: new Headers(upload.requiredHeaders),
                body: new Blob([
                    new Uint8Array(bytes)
                ]),
                signal: signal ? AbortSignal.any([
                    timeout,
                    signal
                ]) : timeout
            });
        } catch (error) {
            this.diagnostics.record('put_failed', {
                job,
                run
            }, {
                ...fields,
                durationMs: Date.now() - startedAt,
                error
            });
            throw new RecordBackendError(base_InterfaceErrorCode.NetworkError, 'The audio upload could not reach storage.', {
                retryable: true,
                cause: error
            });
        } finally{
            clearInterval(heartbeat);
        }
        this.diagnostics.record(response.ok ? 'put_completed' : 'put_failed', {
            job,
            run
        }, {
            ...fields,
            durationMs: Date.now() - startedAt,
            httpStatus: response.status
        });
        if (response.ok) {
            return;
        }
        if (response.status === 400 || response.status === 403) {
            throw new RecordBackendError(base_InterfaceErrorCode.Unavailable, 'The audio upload target expired.', {
                httpStatus: response.status,
                retryPrepare: true,
                retryable: true
            });
        }
        throw new RecordBackendError(base_InterfaceErrorCode.Unavailable, 'The audio upload was rejected by storage.', {
            httpStatus: response.status,
            retryable: isRetryableHttpStatus(response.status)
        });
    }
    transportError(error) {
        const code = typeof error === 'object' && error !== null ? Reflect.get(error, 'code') : undefined;
        if (code === base_InterfaceErrorCode.AuthRequired) {
            return new RecordBackendError(base_InterfaceErrorCode.AuthRequired, 'The recording session must be refreshed before sending.', {
                retryable: true,
                cause: error
            });
        }
        return new RecordBackendError(base_InterfaceErrorCode.NetworkError, 'The recording service could not be reached.', {
            retryable: true,
            cause: error
        });
    }
    responseError(status, payload) {
        const businessCode = readBusinessCode(payload);
        const requestDefinitelyRejected = [
            400,
            401,
            403,
            404,
            409
        ].includes(status);
        const options = {
            businessCode,
            httpStatus: status,
            requestDefinitelyRejected
        };
        if (status === 401) {
            return new RecordBackendError(base_InterfaceErrorCode.AuthRequired, 'The recording session must be refreshed before sending.', {
                ...options,
                retryable: true
            });
        }
        if (status === 429) {
            return new RecordBackendError(base_InterfaceErrorCode.ResourceExhausted, 'The recording service is busy. Try again shortly.', {
                ...options,
                retryable: true
            });
        }
        if (isRetryableHttpStatus(status)) {
            return new RecordBackendError(base_InterfaceErrorCode.Unavailable, 'The recording service is temporarily unavailable.', {
                ...options,
                retryable: true
            });
        }
        if (status === 409) {
            return new RecordBackendError(base_InterfaceErrorCode.Conflict, 'The recording service rejected conflicting capture data.', {
                ...options,
                retryable: false
            });
        }
        if (status === 403) {
            return new RecordBackendError(base_InterfaceErrorCode.Unavailable, 'Recording is not enabled for this account.', {
                ...options,
                retryable: false
            });
        }
        if (status === 404) {
            return new RecordBackendError(base_InterfaceErrorCode.NotFound, 'The recording capture no longer exists.', {
                ...options,
                retryable: false
            });
        }
        return new RecordBackendError(base_InterfaceErrorCode.Internal, 'The recording service rejected the request.', {
            ...options,
            retryable: false
        });
    }
}
__decorate([
    inject(AccountShellService),
    __metadata("design:type", typeof AccountShellService === "undefined" ? Object : AccountShellService)
], RecordBackend.prototype, "account", void 0);
__decorate([
    inject(AccountHttpClient),
    __metadata("design:type", typeof AccountHttpClient === "undefined" ? Object : AccountHttpClient)
], RecordBackend.prototype, "http", void 0);
__decorate([
    inject(SocketShellService),
    __metadata("design:type", typeof Pick === "undefined" ? Object : Pick)
], RecordBackend.prototype, "socket", void 0);
__decorate([
    inject(RecordDiagnostics),
    __metadata("design:type", typeof RecordDiagnostics === "undefined" ? Object : RecordDiagnostics)
], RecordBackend.prototype, "diagnostics", void 0);
RecordBackend = __decorate([
    injectable()
], RecordBackend);
