// Compiled fragment from ./src/app/modules/adjust/modules/installation/modules/transport/index.ts.
// The original TypeScript and import graph are not restored.











class DesktopAdjustInstallationTransport {
    async send(context, report) {
        const runtime = this.nodeAdapter.sei.account.runtimeSnapshot;
        if (runtime.environment !== context.environment) {
            return {
                kind: 'retry'
            };
        }
        const trafficLane = this.nodeAdapter.sei.preferences.trafficLane.value;
        const abortController = new AbortController();
        const timeout = setTimeout(()=>{
            abortController.abort();
        }, (/* inlined export .ADJUST_REQUEST_TIMEOUT_MS */10000));
        this.abortController = abortController;
        let response;
        let responseText;
        try {
            response = await fetch(new URL(ADJUST_INSTALLATION_ENDPOINT, runtime.apiBaseUrl), {
                body: JSON.stringify({
                    externalDeviceId: context.externalDeviceId,
                    occurredAt: report.occurredAt
                }),
                headers: {
                    'Accept-Language': await this.requestLanguage.get(),
                    'Content-Type': 'application/json',
                    'Idempotency-Key': report.idempotencyKey,
                    'X-App-Version': this.configuration.application.getVersion(),
                    'X-Client-Platform': context.platform,
                    ...trafficLane ? {
                        'X-Traffic-Lane': trafficLane
                    } : {}
                },
                method: 'POST',
                redirect: 'error',
                signal: abortController.signal
            });
            responseText = await response.text();
        } catch  {
            return {
                kind: 'retry'
            };
        } finally{
            clearTimeout(timeout);
            if (this.abortController === abortController) {
                this.abortController = undefined;
            }
        }
        if (response.ok && isDesktopAdjustAcceptedResponse(responseText)) {
            return {
                kind: 'completed'
            };
        }
        if (response.ok) {
            return {
                kind: 'retry'
            };
        }
        if (response.status === 429) {
            return {
                kind: 'retry',
                retryAfterMs: parseDesktopAdjustRetryAfter(response.headers.get('Retry-After'), Date.now())
            };
        }
        if (response.status === 409) {
            return readDesktopAdjustErrorCode(responseText) === 'campaign.idempotency_conflict' ? {
                kind: 'completed'
            } : {
                kind: 'retry'
            };
        }
        if (response.status >= 500) {
            return {
                kind: 'retry'
            };
        }
        return {
            kind: 'completed'
        };
    }
    stop() {
        this.abortController?.abort();
        this.abortController = undefined;
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], DesktopAdjustInstallationTransport.prototype, "nodeAdapter", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], DesktopAdjustInstallationTransport.prototype, "configuration", void 0);
__decorate([
    inject(DesktopRequestLanguage),
    __metadata("design:type", typeof DesktopRequestLanguage === "undefined" ? Object : DesktopRequestLanguage)
], DesktopAdjustInstallationTransport.prototype, "requestLanguage", void 0);
DesktopAdjustInstallationTransport = __decorate([
    injectable()
], DesktopAdjustInstallationTransport);
