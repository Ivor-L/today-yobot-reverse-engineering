// Compiled fragment from ./src/app/modules/shell/modules/security/modules/child-window-loading/index.ts.
// The original TypeScript and import graph are not restored.








class ShellChildWindowLoading {
    open(window, options) {
        window.hide();
        const loadingView = new external_electron_.WebContentsView({
            webPreferences: {
                backgroundThrottling: false,
                contextIsolation: true,
                nodeIntegration: false,
                partition: CHILD_WINDOW_LOADING_PARTITION,
                sandbox: true,
                transparent: true,
                webviewTag: false
            }
        });
        const loadingContents = loadingView.webContents;
        const parentView = window.contentView;
        const targetContents = window.webContents;
        const targetBackgroundThrottling = targetContents.backgroundThrottling;
        let disposed = false;
        let loadingComplete = false;
        let loadingReady = false;
        let targetTracking = true;
        let targetLoadReady = false;
        let targetPaintRequest = 0;
        let targetPresentationReady = Promise.resolve();
        loadingView.setBackgroundColor(CHILD_WINDOW_LOADING_BACKGROUND_COLOR);
        targetContents.backgroundThrottling = false;
        const resizeLoadingView = ()=>{
            const parentBounds = parentView.getBounds();
            const bounds = loadingComplete ? toChildWindowDragBounds(parentBounds, options.presentation) : toChildWindowLoadingBounds(parentBounds);
            loadingView.setBounds(bounds);
        };
        const removeLoadingView = ()=>{
            if (!window.isDestroyed()) {
                parentView.removeChildView(loadingView);
            }
            if (!loadingContents.isDestroyed()) {
                loadingContents.close();
            }
        };
        const stopTargetTracking = ()=>{
            if (!targetTracking) {
                return;
            }
            targetTracking = false;
            targetContents.off('did-fail-load', handleTargetLoadFailure);
            targetContents.off('did-start-navigation', handleTargetNavigationStarted);
            targetContents.off('did-stop-loading', handleTargetLoadStopped);
            if (!targetContents.isDestroyed()) {
                targetContents.backgroundThrottling = targetBackgroundThrottling;
            }
        };
        const dispose = ()=>{
            if (disposed) {
                return;
            }
            disposed = true;
            window.off('closed', handleWindowClosed);
            parentView.off('bounds-changed', resizeLoadingView);
            targetContents.off('dom-ready', handleTargetDocumentReady);
            stopTargetTracking();
            removeLoadingView();
        };
        const completeLoading = async (request)=>{
            if (disposed || request !== targetPaintRequest || !targetLoadReady) {
                return;
            }
            if (!hasPersistentChildWindowDragRegion(options.presentation)) {
                dispose();
                return;
            }
            loadingComplete = true;
            stopTargetTracking();
            try {
                await loadingContents.executeJavaScript(toChildWindowDragReadyScript());
            } catch (error) {
                if (disposed) {
                    return;
                }
                console.error('[desktop] failed to activate child window drag region', error);
                dispose();
                if (!window.isDestroyed()) {
                    window.destroy();
                }
                return;
            }
            if (disposed) {
                return;
            }
            loadingView.setBackgroundColor(CHILD_WINDOW_DRAG_TRANSPARENT_COLOR);
            resizeLoadingView();
        };
        const waitForTargetPaint = async (request)=>{
            try {
                await targetPresentationReady;
                await this.waitForPaint(targetContents);
            } catch (error) {
                if (disposed || request !== targetPaintRequest || !targetLoadReady) {
                    return;
                }
                console.error('[desktop] failed to wait for child window paint', error);
                return;
            }
            if (disposed || request !== targetPaintRequest || !targetLoadReady) {
                return;
            }
            await completeLoading(request);
        };
        const revealTargetWhenReady = ()=>{
            if (disposed || !targetLoadReady) {
                return;
            }
            if (!loadingReady) {
                return;
            }
            targetPaintRequest += 1;
            waitForTargetPaint(targetPaintRequest);
        };
        const reconcileTargetLoad = (url = targetContents.getURL())=>{
            targetLoadReady = !targetContents.isLoadingMainFrame() && !isPendingChildWindowUrl(url, options);
            revealTargetWhenReady();
        };
        const handleTargetLoadStopped = ()=>{
            reconcileTargetLoad();
        };
        const handleTargetDocumentReady = ()=>{
            targetPresentationReady = this.applyPaywallInsets(targetContents);
        };
        const handleTargetNavigationStarted = (details)=>{
            if (!details.isMainFrame || details.isSameDocument) {
                return;
            }
            targetLoadReady = false;
            targetPaintRequest += 1;
        };
        const handleTargetLoadFailure = (_event, errorCode, _errorDescription, validatedUrl, isMainFrame)=>{
            if (!isMainFrame) {
                return;
            }
            if (errorCode === -3) {
                reconcileTargetLoad();
                return;
            }
            reconcileTargetLoad(validatedUrl);
        };
        const handleWindowClosed = ()=>{
            dispose();
        };
        const loadLoadingView = async ()=>{
            try {
                await loadingContents.loadFile(this.assets.childWindowLoadingPagePath);
                await this.waitForLoadingDocument(loadingContents);
            } catch (error) {
                if (disposed) {
                    return;
                }
                console.error('[desktop] failed to load child window loading view', error);
                dispose();
                if (!window.isDestroyed()) {
                    window.destroy();
                }
                return;
            }
            if (disposed) {
                return;
            }
            loadingReady = true;
            this.reveal(window);
            revealTargetWhenReady();
        };
        loadingContents.setWindowOpenHandler(()=>({
                action: 'deny'
            }));
        parentView.addChildView(loadingView);
        resizeLoadingView();
        parentView.on('bounds-changed', resizeLoadingView);
        window.once('closed', handleWindowClosed);
        targetContents.on('did-fail-load', handleTargetLoadFailure);
        targetContents.on('did-start-navigation', handleTargetNavigationStarted);
        targetContents.on('did-stop-loading', handleTargetLoadStopped);
        if (options.presentation === 'paywall') {
            targetContents.on('dom-ready', handleTargetDocumentReady);
            if (!targetContents.isLoadingMainFrame()) {
                handleTargetDocumentReady();
            }
        }
        reconcileTargetLoad();
        loadLoadingView();
    }
    async applyPaywallInsets(webContents) {
        try {
            await webContents.insertCSS(CHILD_WINDOW_PAYWALL_INSET_STYLES, {
                cssOrigin: 'user'
            });
        } catch (error) {
            if (webContents.isDestroyed()) {
                return;
            }
            console.error('[desktop] failed to apply child paywall insets', error);
        }
    }
    async waitForPaint(webContents) {
        await webContents.executeJavaScript(CHILD_WINDOW_PAINT_BARRIER_SCRIPT);
    }
    async waitForLoadingDocument(webContents) {
        await webContents.executeJavaScript(CHILD_WINDOW_LOADING_READY_SCRIPT);
    }
    reveal(window) {
        if (window.isDestroyed() || window.isVisible()) {
            return;
        }
        window.show();
        window.focus();
    }
}
__decorate([
    inject(DesktopAssets),
    __metadata("design:type", typeof DesktopAssets === "undefined" ? Object : DesktopAssets)
], ShellChildWindowLoading.prototype, "assets", void 0);
ShellChildWindowLoading = __decorate([
    injectable()
], ShellChildWindowLoading);
