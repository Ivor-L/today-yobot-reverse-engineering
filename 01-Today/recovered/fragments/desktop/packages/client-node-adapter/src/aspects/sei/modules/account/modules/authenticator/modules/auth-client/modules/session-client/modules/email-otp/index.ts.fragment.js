// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/authenticator/modules/auth-client/modules/session-client/modules/email-otp/index.ts.
// The original TypeScript and import graph are not restored.










class AccountEmailOtpClient {
    async requestCode(email) {
        const config = this.config.current;
        const response = await this.http.request(globalThis.fetch, new URL('/api/auth/email-otp/send-verification-otp', config.authBaseUrl), {
            method: 'POST',
            headers: await this.http.headers({
                contentType: 'application/json',
                includeOrigin: true
            }),
            body: JSON.stringify({
                email,
                type: 'sign-in'
            }),
            redirect: 'error'
        });
        if (!response.ok) {
            throw interface_error_InterfaceError(await this.http.responseError(response, {
                invalidArgumentOnBadRequest: true,
                recognizeRegistrationRestriction: true
            }));
        }
    }
    async verifyCode(fetcher, email, code) {
        const config = this.config.current;
        const response = await this.http.request(fetcher, new URL('/api/auth/sign-in/email-otp', config.authBaseUrl), {
            method: 'POST',
            headers: await this.http.headers({
                contentType: 'application/json',
                includeOrigin: true
            }),
            body: JSON.stringify({
                email,
                otp: code
            }),
            credentials: 'include',
            redirect: 'error'
        });
        if (!response.ok) {
            throw await this.verificationError(response);
        }
        const payload = await this.http.readJson(response);
        if (!utils_isJsonObject(payload)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'The authentication service returned invalid credentials.');
        }
        let session;
        if (utils_isJsonObject(payload['session'])) {
            session = payload['session'];
        }
        let rawSessionToken = payload['token'];
        if (rawSessionToken === undefined && session) {
            rawSessionToken = session['token'];
        }
        const sessionToken = assertRefreshCredential(rawSessionToken, 'better-auth-session');
        return await this.token.establish(fetcher, sessionToken);
    }
    async verificationError(response) {
        const status = response.status;
        if (status === 400 || status === 403) {
            let payload;
            try {
                payload = await this.http.readJson(response.clone());
            } catch  {
            // Unknown responses retain the shared account error policy below.
            }
            if (utils_isJsonObject(payload)) {
                // Only this endpoint and its known error codes identify an OTP failure.
                // Session establishment can fail later with the same HTTP status.
                const code = payload['code'];
                if (status === 400 && code === 'INVALID_OTP') {
                    return interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'Invalid OTP', {
                        status
                    });
                }
                if (status === 400 && code === 'OTP_EXPIRED') {
                    return interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'OTP expired', {
                        status
                    });
                }
                if (status === 403 && code === 'TOO_MANY_ATTEMPTS') {
                    return interface_error_InterfaceError(base_InterfaceErrorCode.ResourceExhausted, 'Too many attempts', {
                        status
                    });
                }
            }
        }
        return await this.http.responseError(response, {
            invalidArgumentOnBadRequest: true,
            recognizeRegistrationRestriction: true
        });
    }
}
__decorate([
    inject(AccountConfig),
    __metadata("design:type", typeof AccountConfig === "undefined" ? Object : AccountConfig)
], AccountEmailOtpClient.prototype, "config", void 0);
__decorate([
    inject(AccountHttpClient),
    __metadata("design:type", typeof AccountHttpClient === "undefined" ? Object : AccountHttpClient)
], AccountEmailOtpClient.prototype, "http", void 0);
__decorate([
    inject(AccountSessionTokenClient),
    __metadata("design:type", typeof AccountSessionTokenClient === "undefined" ? Object : AccountSessionTokenClient)
], AccountEmailOtpClient.prototype, "token", void 0);
AccountEmailOtpClient = __decorate([
    injectable()
], AccountEmailOtpClient);
