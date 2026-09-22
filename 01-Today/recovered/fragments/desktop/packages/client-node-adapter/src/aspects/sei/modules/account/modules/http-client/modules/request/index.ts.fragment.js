// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/http-client/modules/request/index.ts.
// The original TypeScript and import graph are not restored.








class AccountRequest {
    async send(fetcher, input, init) {
        const controller = new AbortController();
        const signal = init?.signal ? AbortSignal.any([
            controller.signal,
            init.signal
        ]) : controller.signal;
        const timer = setTimeout(()=>controller.abort(), (/* inlined export .DEFAULT_REQUEST_TIMEOUT_MS */15000));
        try {
            const headers = await this.language.headers(input, {
                ...init,
                signal
            });
            signal.throwIfAborted();
            return await fetcher(input, {
                ...init,
                headers,
                signal
            });
        } catch (error) {
            if (init?.signal?.aborted) {
                throw interface_error_InterfaceError(base_InterfaceErrorCode.Cancelled, 'The account request was cancelled.', {
                    cause: error
                });
            }
            if (controller.signal.aborted) {
                throw interface_error_InterfaceError(base_InterfaceErrorCode.DeadlineExceeded, 'The account request timed out.', {
                    cause: error
                });
            }
            if (error instanceof interface_error_InterfaceError) {
                throw interface_error_InterfaceError(error);
            }
            throw interface_error_InterfaceError(base_InterfaceErrorCode.NetworkError, 'The account service could not be reached.', {
                cause: error
            });
        } finally{
            clearTimeout(timer);
        }
    }
}
__decorate([
    inject(AccountRequestLanguage),
    __metadata("design:type", typeof AccountRequestLanguage === "undefined" ? Object : AccountRequestLanguage)
], AccountRequest.prototype, "language", void 0);
AccountRequest = __decorate([
    injectable()
], AccountRequest);
