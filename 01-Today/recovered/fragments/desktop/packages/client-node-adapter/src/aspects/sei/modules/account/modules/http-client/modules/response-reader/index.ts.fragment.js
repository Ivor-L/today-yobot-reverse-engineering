// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/http-client/modules/response-reader/index.ts.
// The original TypeScript and import graph are not restored.






class AccountResponseReader {
    async readJson(response) {
        const text = await this.readText(response);
        if (!text) {
            return {};
        }
        try {
            return JSON.parse(text);
        } catch (error) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'The authentication service returned an invalid response.', {
                cause: error
            });
        }
    }
    async readText(response) {
        const text = await response.text();
        if (text.length > (/* inlined export .JSON_RESPONSE_LIMIT */65536)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'The authentication service returned an invalid response.');
        }
        return text;
    }
}
AccountResponseReader = __decorate([
    injectable()
], AccountResponseReader);
