import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
function loopbackHost(hostname) {
    return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '[::1]';
}
/** Reject child frames, auxiliary windows and navigated-away main renderers. */
export function isTrustedMacOSPluginIpcSender(expectation) {
    if (!Number.isSafeInteger(expectation.senderWebContentsId)
        || expectation.senderWebContentsId <= 0
        || expectation.mainWindowWebContentsId !== expectation.senderWebContentsId
        || !expectation.senderFrameIsMainFrame) {
        return false;
    }
    let senderUrl;
    try {
        senderUrl = new URL(expectation.senderFrameUrl);
    }
    catch {
        return false;
    }
    if (expectation.mode === 'development') {
        let developmentUrl;
        try {
            developmentUrl = new URL(expectation.developmentUrl ?? 'http://localhost:9988');
        }
        catch {
            return false;
        }
        if (!['http:', 'https:'].includes(developmentUrl.protocol)
            || !loopbackHost(developmentUrl.hostname)
            || developmentUrl.username || developmentUrl.password
            || !['http:', 'https:'].includes(senderUrl.protocol)
            || senderUrl.username || senderUrl.password) {
            return false;
        }
        return senderUrl.origin === developmentUrl.origin;
    }
    if (senderUrl.protocol !== 'file:' || senderUrl.username || senderUrl.password
        || senderUrl.search) {
        return false;
    }
    const expectedPath = expectation.packagedIndexPath;
    if (!expectedPath || !path.isAbsolute(expectedPath))
        return false;
    try {
        return path.resolve(fileURLToPath(senderUrl)) === path.resolve(expectedPath);
    }
    catch {
        return false;
    }
}
