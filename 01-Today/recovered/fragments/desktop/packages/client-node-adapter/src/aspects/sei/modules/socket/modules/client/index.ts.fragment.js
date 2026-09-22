// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/socket/modules/client/index.ts.
// The original TypeScript and import graph are not restored.




class UserSocketClientProvider {
    create(config) {
        return new ClassicSocketClient(config);
    }
}
UserSocketClientProvider = __decorate([
    injectable()
], UserSocketClientProvider);
