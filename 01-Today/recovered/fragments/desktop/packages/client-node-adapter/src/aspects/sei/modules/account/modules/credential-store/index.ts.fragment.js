// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/credential-store/index.ts.
// The original TypeScript and import graph are not restored.












class EncryptedAccountCredentialStore {
    assertAvailable() {
        this.codec.assertAvailable();
    }
    async load() {
        return await this.queue.run(async ()=>{
            if (await this.files.hasTombstone()) {
                const reset = await this.files.hasCredentials();
                await this.files.clear();
                if (reset) {
                    this.tracer.pushSessionReset({
                        cause: 'store'
                    });
                }
                return null;
            }
            const encryptedHead = await this.files.readHead();
            if (!encryptedHead) {
                const reset = await this.files.hasCredentials();
                await this.files.clear();
                if (reset) {
                    this.tracer.pushSessionReset({
                        cause: 'store',
                        issue: true
                    });
                }
                return null;
            }
            this.assertAvailable();
            const head = this.codec.decodeHead(encryptedHead);
            if (!head) {
                await this.files.clear();
                this.tracer.pushSessionReset({
                    cause: 'store',
                    issue: true
                });
                return null;
            }
            const encryptedSlot = await this.files.readSlot(head.slotIndex);
            if (!encryptedSlot) {
                await this.files.clear();
                this.tracer.pushSessionReset({
                    cause: 'store',
                    issue: true
                });
                return null;
            }
            const slot = this.codec.decodeSlot(encryptedSlot, head.slotIndex);
            if (!slot || slot.generation !== head.generation) {
                await this.files.clear();
                this.tracer.pushSessionReset({
                    cause: 'store',
                    ...slot === null ? {} : {
                        issue: true
                    }
                });
                return null;
            }
            return slot.record;
        });
    }
    async save(record) {
        if (!isStoredAccountRecord(record)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'Refusing to persist an invalid account credential record.');
        }
        await this.queue.run(async ()=>{
            this.assertAvailable();
            const slots = await this.readSlots();
            const generation = getNextGeneration(slots);
            const index = selectSlot(slots);
            const encoded = this.codec.encode(record, generation, index);
            await this.files.ensureTombstone();
            await this.files.writeSlot(index, encoded.slot);
            await this.files.writeHead(encoded.head);
            await this.files.removeTombstone();
        });
    }
    async clear() {
        await this.queue.run(async ()=>{
            await this.files.clear();
        });
    }
    async readSlots() {
        const indexes = [
            0,
            1
        ];
        const slots = await Promise.all(indexes.map(async (index)=>{
            const encrypted = await this.files.readSlot(index);
            if (!encrypted) {
                return null;
            }
            return this.codec.decodeSlot(encrypted, index);
        }));
        return lodash_es_compact(slots);
    }
}
__decorate([
    inject(AccountCredentialCodec),
    __metadata("design:type", typeof AccountCredentialCodec === "undefined" ? Object : AccountCredentialCodec)
], EncryptedAccountCredentialStore.prototype, "codec", void 0);
__decorate([
    inject(AccountCredentialFiles),
    __metadata("design:type", typeof AccountCredentialFiles === "undefined" ? Object : AccountCredentialFiles)
], EncryptedAccountCredentialStore.prototype, "files", void 0);
__decorate([
    inject(AccountTracer),
    __metadata("design:type", typeof AccountTracer === "undefined" ? Object : AccountTracer)
], EncryptedAccountCredentialStore.prototype, "tracer", void 0);
__decorate([
    inject(SerialTask),
    __metadata("design:type", typeof SerialTask === "undefined" ? Object : SerialTask)
], EncryptedAccountCredentialStore.prototype, "queue", void 0);
EncryptedAccountCredentialStore = __decorate([
    injectable()
], EncryptedAccountCredentialStore);
