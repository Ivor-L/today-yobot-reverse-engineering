// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/credential-store/modules/codec/index.ts.
// The original TypeScript and import graph are not restored.








class AccountCredentialCodec {
    assertAvailable() {
        let available = false;
        try {
            available = external_electron_.safeStorage.isEncryptionAvailable();
        } catch (error) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, STORAGE_UNAVAILABLE_MESSAGE, {
                cause: error
            });
        }
        if (!available) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, STORAGE_UNAVAILABLE_MESSAGE);
        }
        if (process.platform !== 'linux') {
            return;
        }
        let backend;
        try {
            backend = external_electron_.safeStorage.getSelectedStorageBackend();
        } catch (error) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, STORAGE_UNAVAILABLE_MESSAGE, {
                cause: error
            });
        }
        if (!SAFE_LINUX_BACKENDS.has(backend)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, STORAGE_UNAVAILABLE_MESSAGE);
        }
    }
    encode(record, generation, slotIndex) {
        if (!isStoredAccountRecord(record)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'Refusing to persist an invalid account credential record.');
        }
        const slot = {
            formatVersion: (/* inlined export .CREDENTIAL_VERSION */1),
            generation,
            record
        };
        const head = {
            formatVersion: (/* inlined export .CREDENTIAL_VERSION */1),
            state: 'signed-in',
            slotIndex,
            generation
        };
        let encryptedSlot;
        let encryptedHead;
        try {
            encryptedSlot = external_electron_.safeStorage.encryptString(JSON.stringify(slot));
            encryptedHead = external_electron_.safeStorage.encryptString(JSON.stringify(head));
        } catch (error) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, STORAGE_UNAVAILABLE_MESSAGE, {
                cause: error
            });
        }
        if (!this.isPayloadValid(encryptedSlot) || !this.isPayloadValid(encryptedHead)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'The encrypted account credential payload has an invalid size.');
        }
        return {
            head: encryptedHead,
            slot: encryptedSlot
        };
    }
    decodeHead(encrypted) {
        if (!this.isPayloadValid(encrypted)) {
            return null;
        }
        try {
            const decrypted = external_electron_.safeStorage.decryptString(encrypted);
            if (Buffer.byteLength(decrypted, 'utf8') > MAX_CREDENTIAL_BYTES) {
                return null;
            }
            const parsed = JSON.parse(decrypted);
            if (!isPersistedHead(parsed)) {
                return null;
            }
            return parsed;
        } catch  {
            return null;
        }
    }
    decodeSlot(encrypted, index) {
        if (!this.isPayloadValid(encrypted)) {
            return null;
        }
        try {
            const decrypted = external_electron_.safeStorage.decryptString(encrypted);
            if (Buffer.byteLength(decrypted, 'utf8') > MAX_CREDENTIAL_BYTES) {
                return null;
            }
            const parsed = JSON.parse(decrypted);
            if (!isPersistedSlot(parsed)) {
                return null;
            }
            return {
                index,
                generation: parsed.generation,
                record: parsed.record
            };
        } catch  {
            return null;
        }
    }
    isPayloadValid(payload) {
        if (payload.length === 0) {
            return false;
        }
        return payload.length <= MAX_CREDENTIAL_BYTES;
    }
}
AccountCredentialCodec = __decorate([
    injectable()
], AccountCredentialCodec);
