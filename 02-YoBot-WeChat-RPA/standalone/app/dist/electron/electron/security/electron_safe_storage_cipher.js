import { safeStorage } from 'electron';
export class ElectronSafeStorageCipher {
    name = 'electron-safe-storage-v1';
    isEncryptionAvailable() {
        return safeStorage.isEncryptionAvailable();
    }
    encryptString(value) {
        return safeStorage.encryptString(value);
    }
    decryptString(value) {
        return safeStorage.decryptString(value);
    }
}
