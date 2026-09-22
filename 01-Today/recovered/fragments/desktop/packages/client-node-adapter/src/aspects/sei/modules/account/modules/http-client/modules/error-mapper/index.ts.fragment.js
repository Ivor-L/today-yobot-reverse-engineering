// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/http-client/modules/error-mapper/index.ts.
// The original TypeScript and import graph are not restored.









class AccountErrorMapper {
    async map(response, { invalidArgumentOnBadRequest, recognizeRegistrationRestriction, terminalOnInvalidCredential } = {}) {
        const status = response.status;
        if (recognizeRegistrationRestriction && (status === 400 || status === 403)) {
            const message = await readRegistrationRestrictionMessage(response, this.reader);
            if (message) {
                return interface_error_InterfaceError(base_InterfaceErrorCode.AuthRequired, message, {
                    status
                });
            }
        }
        if (status === 429) {
            return interface_error_InterfaceError(base_InterfaceErrorCode.ResourceExhausted, 'Too many account requests were made. Try again later.', {
                retryAfterMs: readRetryAfterMs(response),
                status
            });
        }
        if (status === 401) {
            return interface_error_InterfaceError(base_InterfaceErrorCode.AuthRequired, 'The account session is no longer valid.', {
                status,
                terminal: terminalOnInvalidCredential ?? false
            });
        }
        if (status === 403) {
            return interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The account operation is not currently available.', {
                status
            });
        }
        let body = '';
        if (status === 400 && terminalOnInvalidCredential) {
            try {
                body = (await this.reader.readText(response)).toLowerCase();
            } catch  {
                body = '';
            }
        }
        const terminal = status === 400 && terminalOnInvalidCredential === true && TERMINAL_REFRESH_MARKERS.some((marker)=>body.includes(marker));
        if (terminal) {
            return interface_error_InterfaceError(base_InterfaceErrorCode.AuthRequired, 'The account session is no longer valid.', {
                status,
                terminal: true
            });
        }
        if (status === 400 && invalidArgumentOnBadRequest) {
            return interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'The account request was not accepted.', {
                status
            });
        }
        if (status >= 500) {
            return interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The account service is temporarily unavailable.', {
                status
            });
        }
        return interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'The account service rejected the request.', {
            status
        });
    }
}
__decorate([
    inject(AccountResponseReader),
    __metadata("design:type", typeof AccountResponseReader === "undefined" ? Object : AccountResponseReader)
], AccountErrorMapper.prototype, "reader", void 0);
AccountErrorMapper = __decorate([
    injectable()
], AccountErrorMapper);
