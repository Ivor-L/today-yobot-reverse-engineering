// Compiled fragment from ./src/app/modules/shell/modules/security/index.ts.
// The original TypeScript and import graph are not restored.

















const POPUP_PARTITION_PREFIX = 'today-shell-popup-';
class ShellSecurity {
    configure(window) {
        this.configureWindow(window, 'application');
    }
    configureWindow(window, navigationPolicy) {
        const browserSession = window.webContents.session;
        const localWebOrigin = this.localWebOrigin;
        browserSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin, details)=>{
            const { isMainFrame, mediaType, requestingUrl, securityOrigin } = details;
            const sourceUrl = securityOrigin ?? requestingUrl ?? requestingOrigin;
            const mediaTypes = mediaType ? [
                mediaType
            ] : [];
            return isAllowedAudioPermission(permission, sourceUrl, mediaTypes, isMainFrame, localWebOrigin) || isAllowedClipboardWritePermission(permission, sourceUrl, isMainFrame, navigationPolicy, localWebOrigin) || this.artifactWindows.allowsClipboardWrite(browserSession, permission, requestingUrl ?? '', isMainFrame);
        });
        browserSession.setPermissionRequestHandler((_webContents, permission, callback, details)=>{
            const { isMainFrame, requestingUrl } = details;
            const mediaTypes = 'mediaTypes' in details ? details.mediaTypes ?? [] : [];
            const securityOrigin = 'securityOrigin' in details ? details.securityOrigin : undefined;
            const sourceUrl = securityOrigin || requestingUrl;
            const allowed = isAllowedAudioPermission(permission, sourceUrl, mediaTypes, isMainFrame, localWebOrigin) || isAllowedClipboardWritePermission(permission, sourceUrl, isMainFrame, navigationPolicy, localWebOrigin) || this.artifactWindows.allowsClipboardWrite(browserSession, permission, requestingUrl, isMainFrame);
            callback(allowed);
        });
        this.configureWebContents(window, navigationPolicy);
    }
    configureWebContents(window, navigationPolicy) {
        const { webContents } = window;
        webContents.on('will-attach-webview', (event)=>{
            event.preventDefault();
        });
        webContents.on('will-navigate', (event, url)=>{
            if (this.isOAuthCallback(url, navigationPolicy)) {
                event.preventDefault();
                window.close();
                return;
            }
            if (this.isNavigationAllowed(url, navigationPolicy)) {
                return;
            }
            event.preventDefault();
        });
        webContents.on('will-redirect', (event, url)=>{
            if (this.isOAuthCallback(url, navigationPolicy)) {
                event.preventDefault();
                window.close();
                return;
            }
            if (this.isNavigationAllowed(url, navigationPolicy)) {
                return;
            }
            event.preventDefault();
        });
        webContents.setWindowOpenHandler(({ frameName, url })=>{
            if (false) {}
            if (navigationPolicy !== 'popup' && this.artifactWindows.matches(url)) {
                if (this.artifactWindows.matchesOpenIntent(url, frameName)) {
                    return {
                        action: 'allow',
                        overrideBrowserWindowOptions: this.artifactWindows.getWindowOptions()
                    };
                }
                return {
                    action: 'deny'
                };
            }
            if (navigationPolicy === 'artifact') {
                if (this.artifactWindows.matchesExternalBrowserIntent(frameName)) {
                    this.externalBrowser.tryOpen(url);
                }
                return {
                    action: 'deny'
                };
            }
            const isApplicationSurface = navigationPolicy === 'application' || navigationPolicy === 'brief';
            const isBriefWindow = navigationPolicy === 'application' && isBriefWindowOpenAllowed(url, frameName, this.context.current.webOrigin);
            const isProductWindow = isBriefWindow || navigationPolicy === 'application' && isProductWindowOpenAllowed(url, frameName, this.context.current.webOrigin);
            if (isApplicationSurface && !isProductWindow) {
                this.externalBrowser.tryOpen(url);
                return {
                    action: 'deny'
                };
            }
            if (!isProductWindow && !this.isWindowOpenAllowed(url, navigationPolicy)) {
                return {
                    action: 'deny'
                };
            }
            const popupPartition = isBriefWindow ? undefined : `${POPUP_PARTITION_PREFIX}${(0,external_node_crypto_namespaceObject.randomUUID)()}`;
            const popupSession = popupPartition ? external_electron_.session.fromPartition(popupPartition) : external_electron_.session.defaultSession;
            const isPaywallWindow = navigationPolicy === 'application' && isProductWindow && PAYWALL_POPUP_WINDOW_NAMES.has(frameName);
            const isChromelessWindow = isBriefWindow || isPaywallWindow;
            const titleBarStyle = isChromelessWindow ? this.configuration.platform === 'darwin' ? 'hiddenInset' : 'hidden' : 'default';
            this.requestHeaders.configure(popupSession);
            return {
                action: 'allow',
                overrideBrowserWindowOptions: {
                    autoHideMenuBar: true,
                    backgroundColor: '#ffffff',
                    height: 720,
                    show: false,
                    ...isChromelessWindow && this.configuration.platform !== 'darwin' ? {
                        titleBarOverlay: {
                            color: '#00000000',
                            height: (/* inlined export .CHILD_WINDOW_TITLE_BAR_HEIGHT */48),
                            symbolColor: '#1A1A1A'
                        }
                    } : {},
                    titleBarStyle,
                    width: 560,
                    webPreferences: {
                        contextIsolation: true,
                        nodeIntegration: false,
                        sandbox: true,
                        ...popupPartition ? {
                            partition: popupPartition
                        } : {
                            session: popupSession
                        },
                        webviewTag: false
                    }
                }
            };
        });
        webContents.on('did-create-window', (childWindow, details)=>{
            const isArtifactWindow = childWindow.webContents.session === external_electron_.session.defaultSession && this.artifactWindows.matchesOpenIntent(details.url, details.frameName);
            const isBriefWindow = childWindow.webContents.session === external_electron_.session.defaultSession && isBriefWindowOpenAllowed(details.url, details.frameName, this.context.current.webOrigin);
            const isPaywallWindow = navigationPolicy === 'application' && PAYWALL_POPUP_WINDOW_NAMES.has(details.frameName) && isProductWindowOpenAllowed(details.url, details.frameName, this.context.current.webOrigin);
            const presentation = isArtifactWindow ? 'artifact' : isBriefWindow ? 'brief' : isPaywallWindow ? 'paywall' : 'default';
            this.childWindowLoading.open(childWindow, {
                initialUrl: details.url,
                presentation,
                waitForNonBlank: details.frameName === 'today_billing_management' && details.url === 'about:blank'
            });
            if (isArtifactWindow || isBriefWindow) {
                const childContents = childWindow.webContents;
                this.trust.attachHttpSurface(childContents, isArtifactWindow ? 'artifact' : 'brief');
                childContents.on('destroyed', ()=>{
                    this.trust.detach(childContents);
                });
            }
            if (isArtifactWindow) {
                this.configureWebContents(childWindow, 'artifact');
                return;
            }
            if (isBriefWindow) {
                this.configureWebContents(childWindow, 'brief');
                return;
            }
            this.configureWindow(childWindow, 'popup');
        });
    }
    isOAuthCallback(url, navigationPolicy) {
        if (navigationPolicy !== 'popup') {
            return false;
        }
        const { buildEnvironment, macosRegion } = this.configuration.current;
        const scheme = resolveDesktopDeepLinkScheme(buildEnvironment, macosRegion);
        return isDesktopOAuthCallbackUrl(url, scheme);
    }
    isNavigationAllowed(url, navigationPolicy) {
        if (navigationPolicy === 'artifact') {
            return this.artifactWindows.matches(url);
        }
        return isNavigationAllowed(url, navigationPolicy, this.context.current.webOrigin);
    }
    isWindowOpenAllowed(url, navigationPolicy) {
        if (navigationPolicy === 'artifact') {
            return this.artifactWindows.matches(url);
        }
        return isWindowOpenAllowed(url, navigationPolicy, this.context.current.webOrigin);
    }
    get localWebOrigin() {
        const { webOrigin } = this.context.current;
        if (isLocalWebOrigin(webOrigin)) {
            return webOrigin;
        }
        return undefined;
    }
}
__decorate([
    inject(ShellArtifactWindows),
    __metadata("design:type", typeof ShellArtifactWindows === "undefined" ? Object : ShellArtifactWindows)
], ShellSecurity.prototype, "artifactWindows", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellSecurity.prototype, "configuration", void 0);
__decorate([
    inject(ShellChildWindowLoading),
    __metadata("design:type", typeof ShellChildWindowLoading === "undefined" ? Object : ShellChildWindowLoading)
], ShellSecurity.prototype, "childWindowLoading", void 0);
__decorate([
    inject(ShellExternalBrowser),
    __metadata("design:type", typeof ShellExternalBrowser === "undefined" ? Object : ShellExternalBrowser)
], ShellSecurity.prototype, "externalBrowser", void 0);
__decorate([
    inject(ShellRequestHeaders),
    __metadata("design:type", typeof ShellRequestHeaders === "undefined" ? Object : ShellRequestHeaders)
], ShellSecurity.prototype, "requestHeaders", void 0);
__decorate([
    inject(ShellWebContentsTrust),
    __metadata("design:type", typeof ShellWebContentsTrust === "undefined" ? Object : ShellWebContentsTrust)
], ShellSecurity.prototype, "trust", void 0);
__decorate([
    inject(ShellWebContext),
    __metadata("design:type", typeof ShellWebContext === "undefined" ? Object : ShellWebContext)
], ShellSecurity.prototype, "context", void 0);
ShellSecurity = __decorate([
    injectable()
], ShellSecurity);
