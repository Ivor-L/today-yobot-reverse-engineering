// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/authenticator/modules/auth-client/modules/session-client/modules/phone-otp/disabled.ts.
// The original TypeScript and import graph are not restored.





const disabled_unavailable = ()=>{
    throw interface_error_InterfaceError(base_InterfaceErrorCode.Unsupported, 'Phone login is unavailable in this regional build.');
};
class DisabledAccountPhoneOtpClient {
    async requestCode(_phoneNumber) {
        return disabled_unavailable();
    }
    async verifyCode(_fetcher, _phoneNumber, _code) {
        return disabled_unavailable();
    }
}
DisabledAccountPhoneOtpClient = __decorate([
    injectable()
], DisabledAccountPhoneOtpClient);
