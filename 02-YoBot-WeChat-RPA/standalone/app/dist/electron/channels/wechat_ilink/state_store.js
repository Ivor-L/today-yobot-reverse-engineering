import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { resolveBootstrapAgentFileLayout } from '../../core/platform/file_layout.js';
export class WechatIlinkStateStore {
    accountId;
    constructor(accountId) {
        this.accountId = accountId;
    }
    load() {
        try {
            const parsed = JSON.parse(fs.readFileSync(this.filePath(), 'utf8'));
            return {
                cursor: typeof parsed.cursor === 'string' ? parsed.cursor : '',
            };
        }
        catch {
            return { cursor: '' };
        }
    }
    save(state) {
        const filePath = this.filePath();
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        const tempPath = `${filePath}.tmp`;
        fs.writeFileSync(tempPath, JSON.stringify(state), { encoding: 'utf8', mode: 0o600 });
        fs.renameSync(tempPath, filePath);
        try {
            fs.chmodSync(filePath, 0o600);
        }
        catch {
            // Windows permissions are best-effort; credentials are stored separately by Electron safeStorage.
        }
    }
    clear() {
        try {
            fs.unlinkSync(this.filePath());
        }
        catch {
            // Already absent.
        }
    }
    filePath() {
        const root = resolveBootstrapAgentFileLayout({
            userDataRoot: process.env.USER_DATA_PATH?.trim() || undefined,
        }).userData;
        const safeId = crypto.createHash('sha256').update(this.accountId).digest('hex').slice(0, 24);
        return path.join(root, 'channels', 'wechat-ilink', `${safeId}.state.json`);
    }
}
