// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/authenticator/modules/isolated-session/modules/authorization-window/index.ts.
// The original TypeScript and import graph are not restored.








class AccountAuthorizationWindow {
    async open(BrowserWindowConstructor, session, request) {
        try {
            const expectedCallback = new URL(request.callbackUrl);
            const oauthWindow = new BrowserWindowConstructor({
                width: 520,
                height: 720,
                show: false,
                autoHideMenuBar: true,
                webPreferences: {
                    session,
                    contextIsolation: true,
                    nodeIntegration: false,
                    sandbox: true,
                    webSecurity: true
                }
            });
            const webContents = oauthWindow.webContents;
            webContents.setWindowOpenHandler(()=>({
                    action: 'deny'
                }));
            return await this.waitForResult(oauthWindow, webContents, request, expectedCallback);
        } catch (error) {
            throw interface_error_InterfaceError(error, 'The OAuth authorization window could not be opened.');
        }
    }
    async waitForResult(oauthWindow, webContents, request, expectedCallback) {
        return await new Promise((resolve, reject)=>{
            let settled = false;
            let authorizationStarted = false;
            let resolveLoadingPaint;
            const loadingPaint = new Promise((resolve)=>{
                resolveLoadingPaint = resolve;
            });
            let timer;
            let loadTimer;
            const allowedHostPatterns = request.allowedNavigationHostPatterns.map((pattern)=>pattern.toLowerCase());
            const clearLoadTimer = ()=>{
                if (loadTimer !== undefined) {
                    clearTimeout(loadTimer);
                    loadTimer = undefined;
                }
            };
            const cleanup = ()=>{
                clearLoadTimer();
                resolveLoadingPaint();
                if (timer !== undefined) {
                    clearTimeout(timer);
                    timer = undefined;
                }
                try {
                    webContents.removeListener('will-navigate', handleNavigation);
                    webContents.removeListener('will-redirect', handleNavigation);
                    webContents.removeListener('dom-ready', handleDocumentReady);
                } catch  {
                // Electron can destroy WebContents before the BrowserWindow closed event is delivered.
                }
                try {
                    oauthWindow.removeListener('closed', handleClosed);
                    oauthWindow.removeListener('ready-to-show', handleReady);
                    if (!oauthWindow.isDestroyed()) {
                        oauthWindow.destroy();
                    }
                } catch  {
                // Cleanup is best effort and must never block Promise settlement.
                }
            };
            const finish = (settle, value)=>{
                if (settled) {
                    return;
                }
                settled = true;
                settle(value);
                cleanup();
            };
            const handleNavigation = (event)=>{
                const { isMainFrame, url: navigationUrl } = event;
                if (!isMainFrame) {
                    return;
                }
                let url;
                try {
                    url = new URL(navigationUrl);
                } catch (error) {
                    event.preventDefault();
                    finish(reject, interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'OAuth attempted to navigate to an invalid URL.', {
                        cause: error
                    }));
                    return;
                }
                if (matchesCallback(url, expectedCallback)) {
                    event.preventDefault();
                    finish(resolve, url.href);
                    return;
                }
                const trusted = url.protocol === 'https:' && allowedHostPatterns.some((pattern)=>matchesAllowedNavigationHost(url.hostname, pattern));
                if (!trusted) {
                    event.preventDefault();
                    finish(reject, interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'OAuth attempted to leave the trusted authorization flow.'));
                }
            };
            const handleClosed = ()=>{
                finish(reject, interface_error_InterfaceError(base_InterfaceErrorCode.Cancelled, 'OAuth authorization was cancelled.'));
            };
            const handleReady = ()=>{
                resolveLoadingPaint();
            };
            const handleDocumentReady = ()=>{
                if (authorizationStarted) {
                    clearLoadTimer();
                }
            };
            const loadAuthorization = async ()=>{
                try {
                    await oauthWindow.loadURL(AUTHORIZATION_LOADING_URL);
                    if (settled || this.isDestroyed(oauthWindow)) {
                        return;
                    }
                    await loadingPaint;
                    if (settled || this.isDestroyed(oauthWindow)) {
                        return;
                    }
                    oauthWindow.show();
                    authorizationStarted = true;
                    await oauthWindow.loadURL(request.authorizationUrl);
                } catch (error) {
                    if (this.isDestroyed(oauthWindow)) {
                        finish(reject, interface_error_InterfaceError(base_InterfaceErrorCode.Cancelled, 'OAuth authorization was cancelled.'));
                        return;
                    }
                    finish(reject, interface_error_InterfaceError(base_InterfaceErrorCode.NetworkError, 'The OAuth authorization page could not be opened.', {
                        cause: error
                    }));
                } finally{
                    clearLoadTimer();
                }
            };
            timer = setTimeout(()=>{
                finish(reject, interface_error_InterfaceError(base_InterfaceErrorCode.DeadlineExceeded, 'OAuth authorization timed out.'));
            }, request.timeoutMs);
            loadTimer = setTimeout(()=>{
                finish(reject, interface_error_InterfaceError(base_InterfaceErrorCode.DeadlineExceeded, 'The OAuth authorization page took too long to load.'));
            }, (/* inlined export .AUTHORIZATION_PAGE_LOAD_TIMEOUT_MS */30000));
            try {
                webContents.on('will-navigate', handleNavigation);
                webContents.on('will-redirect', handleNavigation);
                webContents.on('dom-ready', handleDocumentReady);
                oauthWindow.once('closed', handleClosed);
                oauthWindow.once('ready-to-show', handleReady);
                loadAuthorization();
            } catch (error) {
                finish(reject, interface_error_InterfaceError(error, 'The OAuth authorization window could not be opened.'));
            }
        });
    }
    isDestroyed(oauthWindow) {
        try {
            return oauthWindow.isDestroyed();
        } catch  {
            return true;
        }
    }
}
AccountAuthorizationWindow = __decorate([
    injectable()
], AccountAuthorizationWindow);
