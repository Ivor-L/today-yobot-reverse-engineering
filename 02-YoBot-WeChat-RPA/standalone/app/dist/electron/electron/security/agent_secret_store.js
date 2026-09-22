import path from 'node:path';
import { ElectronSafeStorageCipher } from './electron_safe_storage_cipher.js';
import { EncryptedFileSecretStore } from './encrypted_file_secret_store.js';
export const AGENT_SECRET_STORE_FILENAME = 'agent-secrets.v1.json';
export function createAgentSecretStoreAt(protectedDir) {
    return new EncryptedFileSecretStore(path.join(protectedDir, AGENT_SECRET_STORE_FILENAME), new ElectronSafeStorageCipher());
}
export function createAgentSecretStore(layout) {
    return createAgentSecretStoreAt(layout.protectedDir);
}
