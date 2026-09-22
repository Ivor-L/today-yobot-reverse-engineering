// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/record/modules/start-requests/index.ts.
// The original TypeScript and import graph are not restored.








class RecordStartRequests {
    get active() {
        return this.batch !== undefined;
    }
    add(type) {
        const batch = this.batch ?? {
            requests: new Set(),
            settled: Promise.withResolvers(),
            permissionActions: new Map(),
            captured: false,
            cancelled: false,
            closed: false
        };
        if (batch.closed) {
            return Promise.reject(interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'Recording startup is finishing.'));
        }
        const observation = Promise.withResolvers();
        const request = {
            type,
            completion: Promise.withResolvers(),
            controller: new AbortController(),
            initiallyFocused: this.shell.isFocused(),
            observed: observation.promise,
            blurred: false,
            refocused: false,
            observedPermissionBlur: false,
            focusRevision: 0
        };
        this.batch = batch;
        batch.requests.add(request);
        // Install the listener before storage preparation or a platform permission action can blur us.
        this.observeFocus(request, observation);
        if (batch.params && !batch.captured && !batch.cancelled) {
            this.runRequest(batch, request);
        }
        return request.completion.promise;
    }
    async capture(params) {
        const batch = this.batch;
        if (!batch || batch.cancelled) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Cancelled, 'Recording startup was cancelled.');
        }
        batch.params = params;
        for (const request of batch.requests){
            this.runRequest(batch, request);
        }
        await batch.settled.promise;
    }
    cancel() {
        const batch = this.batch;
        if (!batch) {
            return;
        }
        batch.cancelled = true;
        batch.closed = true;
        for (const request of batch.requests){
            request.controller.abort();
        }
        // An in-flight native start must settle before the owner's stop-confirmation barrier runs.
        if (batch.params && !batch.captureTask) {
            batch.settled.reject(interface_error_InterfaceError(base_InterfaceErrorCode.Cancelled, 'Recording startup was cancelled.'));
        }
    }
    finish(error) {
        const batch = this.batch;
        if (!batch) {
            return;
        }
        this.batch = undefined;
        const failure = error ?? (batch.cancelled ? interface_error_InterfaceError(base_InterfaceErrorCode.Cancelled, 'Recording startup was cancelled.') : undefined);
        for (const request of batch.requests){
            request.controller.abort();
            clearTimeout(request.timeout);
            this.releaseFocus(request);
            if (failure) {
                request.completion.reject(failure);
            } else {
                request.completion.resolve();
            }
        }
    }
    async observeFocus(request, observed) {
        try {
            if (request.type === base_RecordStartType.WaitRefocused && request.initiallyFocused) {
                request.subscription = await this.shell.subscribe('focusChanged', (present)=>{
                    request.focusRevision += 1;
                    if (!present) {
                        request.blurred = true;
                        request.refocused = false;
                        request.observedPermissionBlur = true;
                    } else if (request.blurred) {
                        request.refocused = true;
                    }
                    request.wake?.();
                });
                if (!this.shell.isFocused()) {
                    request.blurred = true;
                }
            }
        } catch (error) {
            request.observationError = error;
        } finally{
            observed.resolve();
            if (request.controller.signal.aborted) {
                await this.releaseFocus(request);
            }
        }
    }
    async runRequest(batch, request) {
        try {
            await request.observed;
            if (request.observationError) {
                throw request.observationError;
            }
            let permissionError;
            while(this.isCurrent(batch, request)){
                if (permissionError) {
                    await this.waitForPermission(batch, request, permissionError);
                }
                if (!this.isCurrent(batch, request)) {
                    return;
                }
                if (permissionError && performance.now() >= request.deadline) {
                    throw permissionError;
                }
                const focusRevision = request.focusRevision;
                try {
                    await this.acquire(batch);
                    return;
                } catch (error) {
                    const failure = interface_error_InterfaceError(error);
                    if (![
                        base_InterfaceErrorCode.PermissionDenied,
                        base_InterfaceErrorCode.PermissionRequired
                    ].includes(failure.code)) {
                        throw failure;
                    }
                    const samePermission = permissionError !== undefined && permissionError.permissionId === failure.permissionId;
                    const shouldWait = request.type !== base_RecordStartType.Direct && (request.type !== base_RecordStartType.WaitRefocused || request.initiallyFocused);
                    if (request.type === base_RecordStartType.WaitRefocused && samePermission) {
                        if (request.focusRevision !== focusRevision) {
                            continue;
                        }
                        if (!request.observedPermissionBlur && performance.now() < request.blurDeadline) {
                            // The app was already blurred at dispatch. A queued microphone refocus can arrive
                            // before Settings takes focus; an ungranted provisional retry must not end the wait.
                            request.blurred = false;
                            request.refocused = false;
                            continue;
                        }
                        // A completed authorization cycle still denied this permission. Do not trap the user
                        // in another Settings/refocus cycle; return the original permission failure.
                        throw failure;
                    }
                    permissionError = failure;
                    request.waitingPermissionId = this.permissionId(failure);
                    if (shouldWait && request.deadline === undefined) {
                        request.deadline = performance.now() + (/* inlined export .RECORD_PERMISSION_TIMEOUT_MS */90000);
                        request.timeout = setTimeout(()=>{
                            this.expireRequest(batch, request, permissionError);
                        }, (/* inlined export .RECORD_PERMISSION_TIMEOUT_MS */90000));
                    }
                    if (!samePermission) {
                        this.resetPermissionFocus(request);
                        const opening = this.openPermissionSettings(batch, failure);
                        if (!shouldWait) {
                            const opened = await opening;
                            if (!this.isCurrent(batch, request)) {
                                return;
                            }
                            if (opened) {
                                throw interface_error_InterfaceError(base_InterfaceErrorCode.PermissionSettingsOpened, 'Recording permission settings were opened.', {
                                    permissionId: failure.permissionId
                                });
                            }
                            throw failure;
                        }
                        if (request.type === base_RecordStartType.WaitRefocused) {
                            // Permission lookup/presentation can itself be asynchronous. Its old focus events
                            // must not end this wait before the new authorization action has been dispatched.
                            await opening;
                        }
                    }
                }
            }
        } catch (error) {
            if (this.isCurrent(batch, request)) {
                const failure = interface_error_InterfaceError(error);
                if (request.deadline !== undefined && performance.now() >= request.deadline && [
                    base_InterfaceErrorCode.PermissionDenied,
                    base_InterfaceErrorCode.PermissionRequired
                ].includes(failure.code)) {
                    await this.expireRequest(batch, request, failure);
                } else {
                    this.failRequest(batch, request, failure);
                }
            }
        } finally{
            clearTimeout(request.timeout);
            await this.releaseFocus(request);
        }
    }
    async expireRequest(batch, request, error) {
        // Acquisition admitted before the deadline retains ownership until native acknowledges it.
        // A passive permission query, however, never extends this request's 90-second deadline.
        try {
            await batch.captureTask;
        } catch  {
        // A failed in-flight acquisition must still settle an already-expired permission waiter.
        }
        if (this.isCurrent(batch, request)) {
            this.failRequest(batch, request, error);
        }
    }
    failRequest(batch, request, error) {
        request.error = error;
        request.controller.abort();
        this.releaseFocus(request);
        if ([
            ...batch.requests
        ].every((candidate)=>candidate.error)) {
            batch.closed = true;
            batch.settled.reject(error);
        } else {
            request.completion.reject(error);
        }
    }
    async releaseFocus(request) {
        const subscription = request.subscription;
        request.subscription = undefined;
        try {
            await subscription?.unsubscribe();
        } catch  {
        // Completion must not be changed by an already-disconnected shell subscription.
        }
    }
    isCurrent(batch, request) {
        return this.batch === batch && !batch.captured && !batch.cancelled && !batch.closed && !request.error;
    }
    async acquire(batch) {
        if (!batch.captureTask) {
            batch.captureTask = this.cpi.audio.startCapture(batch.params);
        }
        const captureTask = batch.captureTask;
        try {
            await captureTask;
            batch.captured = true;
            batch.settled.resolve();
        } finally{
            if (batch.captureTask === captureTask) {
                batch.captureTask = undefined;
            }
            if (batch.cancelled) {
                batch.settled.reject(interface_error_InterfaceError(base_InterfaceErrorCode.Cancelled, 'Recording startup was cancelled.'));
            }
        }
    }
    async waitForPermission(batch, request, error) {
        const deadline = request.deadline;
        while(this.isCurrent(batch, request)){
            const now = performance.now();
            if (now >= deadline) {
                throw error;
            }
            if (request.type === base_RecordStartType.WaitRefocused) {
                if (request.refocused) {
                    return;
                }
                if (!request.blurred && now >= request.blurDeadline) {
                    throw error;
                }
                await this.wait(request, (request.blurred ? deadline : request.blurDeadline) - now);
                continue;
            }
            await this.wait(request, Math.min((/* inlined export .RECORD_PERMISSION_POLL_INTERVAL_MS */1000), deadline - now));
            if (!this.isCurrent(batch, request) || performance.now() >= deadline) {
                continue;
            }
            const permissionId = this.permissionId(error);
            if (!permissionId) {
                return;
            }
            try {
                const permission = await this.cpi.permissions.getPermissionInfo({
                    permissionId
                });
                if (permission.state === (/* inlined export .PermissionState.Granted */"granted")) {
                    return;
                }
            } catch (failure) {
                const code = interface_error_InterfaceError(failure).code;
                if (code === base_InterfaceErrorCode.NotFound || code === base_InterfaceErrorCode.Unsupported) {
                    // Providers without a permission registry recheck through their atomic capture API.
                    return;
                }
                throw failure;
            }
        }
    }
    permissionId(error) {
        if (error.permissionId === 'systemAudio') {
            return 'macos_screen';
        }
        return error.permissionId;
    }
    async openPermissionSettings(batch, error) {
        const permissionId = this.permissionId(error);
        if (!permissionId) {
            return false;
        }
        const active = batch.permissionActions.get(permissionId);
        if (active) {
            return await active;
        }
        const opening = this.performPermissionAction(batch, permissionId);
        batch.permissionActions.set(permissionId, opening);
        try {
            return await opening;
        } finally{
            if (batch.permissionActions.get(permissionId) === opening) {
                batch.permissionActions.delete(permissionId);
            }
        }
    }
    resetPermissionFocus(request) {
        if (request.type !== base_RecordStartType.WaitRefocused || !request.initiallyFocused) {
            return;
        }
        // Microphone's native prompt may already have blurred and refocused the app. Observe the
        // newly opened permission panel instead, including synchronous blur during its dispatch.
        request.blurred = !this.shell.isFocused();
        request.refocused = false;
        request.observedPermissionBlur = false;
        request.focusRevision += 1;
        request.blurDeadline = performance.now() + (/* inlined export .RECORD_PERMISSION_BLUR_TIMEOUT_MS */5000);
    }
    async performPermissionAction(batch, permissionId) {
        try {
            const permission = await this.cpi.permissions.getPermissionInfo({
                permissionId
            });
            const action = [
                (/* inlined export .PermissionAction.Request */"request"),
                (/* inlined export .PermissionAction.OpenSettings */"open-settings")
            ].find((candidate)=>permission.supportedActions.includes(candidate));
            const requests = [
                ...batch.requests
            ].filter((request)=>request.waitingPermissionId === permissionId && this.isCurrent(batch, request));
            if (action && requests.length > 0) {
                for (const request of requests){
                    this.resetPermissionFocus(request);
                }
                await this.cpi.permissions.performPermissionAction({
                    permissionId,
                    action
                });
                return true;
            }
        } catch  {
        // Waiting still permits a manual Settings change; preserve the original permission failure.
        }
        return false;
    }
    async wait(request, delayMs) {
        await new Promise((resolve)=>{
            const done = ()=>{
                clearTimeout(timer);
                request.controller.signal.removeEventListener('abort', done);
                request.wake = undefined;
                resolve();
            };
            const timer = setTimeout(done, Math.max(0, delayMs));
            request.wake = done;
            request.controller.signal.addEventListener('abort', done, {
                once: true
            });
            if (request.controller.signal.aborted) {
                done();
            }
        });
    }
}
__decorate([
    inject(CROSS_PLATFORM_INTERFACE),
    __metadata("design:type", typeof ICrossPlatformInterface === "undefined" ? Object : ICrossPlatformInterface)
], RecordStartRequests.prototype, "cpi", void 0);
__decorate([
    inject(CLIENT_NODE_SHELL),
    __metadata("design:type", typeof ClientNodeShellFacade === "undefined" ? Object : ClientNodeShellFacade)
], RecordStartRequests.prototype, "shell", void 0);
RecordStartRequests = __decorate([
    injectable()
], RecordStartRequests);
