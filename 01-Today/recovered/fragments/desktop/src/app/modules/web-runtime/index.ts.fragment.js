// Compiled fragment from ./src/app/modules/web-runtime/index.ts.
// The original TypeScript and import graph are not restored.

















class DesktopWebRuntime {
    get origin() {
        if (!this.ready) {
            return this.teardownOrigin;
        }
        return this.endpoint?.origin;
    }
    async start() {
        if (!this.configuration.application.isPackaged || this.configuration.current.launchOptions.localWebOrigin || this.child) {
            return;
        }
        const environment = this.nodeAdapter.sei.preferences.environment.value;
        const { buildEnvironment, launchOptions } = this.configuration.current;
        if (buildEnvironment === base_RuntimeEnvironment.Production && environment !== buildEnvironment) {
            throw new Error(`Packaged Web runtime targets ${buildEnvironment}, but the active environment is ${environment}.`);
        }
        const endpoint = DESKTOP_WEB_RUNTIME_ENDPOINTS[environment];
        const profile = this.configuration.accountConfig[environment];
        const manifestEntry = await this.readManifestEntry(this.assets.webRuntimeManifestPath, buildEnvironment, environment);
        const serverPath = this.assets.webRuntimeServerPath(environment);
        const buildInfoPath = this.assets.webRuntimeBuildInfoPath(environment);
        const runtimeHostPath = this.assets.webRuntimeHostPath;
        await this.assertServer(serverPath);
        await this.assertServer(runtimeHostPath);
        const buildIdentity = await this.readBuildIdentity(buildInfoPath, endpoint, manifestEntry.buildId, manifestEntry.deepLinkScheme);
        this.endpoint = endpoint;
        this.ready = false;
        this.stopping = false;
        this.teardownOrigin = undefined;
        const processEnvironment = buildDesktopWebRuntimeProcessEnvironment(launchOptions.httpProxy, this.configuration.environment);
        const nonce = (0,external_node_crypto_namespaceObject.randomBytes)(24).toString('base64url');
        const token = (0,external_node_crypto_namespaceObject.randomBytes)(32).toString('base64url');
        const child = external_electron_.utilityProcess.fork(runtimeHostPath, [], {
            env: processEnvironment,
            serviceName: this.diagnostics.serviceName,
            stdio: 'pipe'
        });
        this.child = child;
        this.diagnostics.attach(child, nonce);
        child.once('exit', this.handleExit);
        this.configuration.application.prependOnceListener('before-quit', this.handleBeforeQuit);
        try {
            const listening = this.waitUntilListening(child, nonce);
            const launchMessage = {
                type: 'launch',
                environment: buildDesktopWebRuntimeEnvironment(endpoint, profile),
                nonce,
                serverPath,
                surfaceOrigin: endpoint.origin,
                token
            };
            child.postMessage(launchMessage);
            const port = await listening;
            const backendOrigin = buildDesktopWebRuntimeBackendOrigin(port);
            await this.assertReady(endpoint, backendOrigin, token, nonce, buildIdentity);
            this.backendOrigin = backendOrigin;
            this.token = token;
            this.handleSurfaceProtocol();
            this.ready = true;
            this.diagnostics.markRunning(child);
            console.info(`[desktop] private Web runtime ready for ${endpoint.origin}`);
        } catch (error) {
            this.diagnostics.recordLaunchFailure(child, error);
            this.stop();
            throw error;
        }
    }
    stop() {
        this.stopRuntime(false);
    }
    stopRuntime(preserveOrigin) {
        this.configuration.application.removeListener('before-quit', this.handleBeforeQuit);
        this.stopping = true;
        this.teardownOrigin = preserveOrigin && this.ready ? this.endpoint?.origin : undefined;
        this.ready = false;
        this.endpoint = undefined;
        this.backendOrigin = undefined;
        this.token = undefined;
        if (this.protocolHandled) {
            external_electron_.session.defaultSession.protocol.unhandle('http');
            this.protocolHandled = false;
        }
        const child = this.child;
        this.child = undefined;
        if (child) {
            this.diagnostics.stop(child);
            child.removeListener('exit', this.handleExit);
            child.kill();
        }
    }
    async assertServer(serverPath) {
        let metadata;
        try {
            metadata = await (0,promises_namespaceObject.stat)(serverPath);
        } catch (error) {
            throw new Error(`Packaged Web runtime is unavailable: ${serverPath}`, {
                cause: error
            });
        }
        if (!metadata.isFile()) {
            throw new Error(`Packaged Web runtime entry is not a file: ${serverPath}`);
        }
    }
    async readBuildIdentity(buildInfoPath, endpoint, manifestBuildId, manifestDeepLinkScheme) {
        let buildInfo;
        try {
            buildInfo = JSON.parse(await (0,promises_namespaceObject.readFile)(buildInfoPath, 'utf8'));
        } catch (error) {
            throw new Error(`Packaged Web runtime build identity is unavailable: ${buildInfoPath}`, {
                cause: error
            });
        }
        if (buildInfo.desktopRuntimeBuildEnvironment !== endpoint.environment) {
            throw new Error(`Packaged Web runtime build identity targets ${String(buildInfo.desktopRuntimeBuildEnvironment)}, expected ${endpoint.environment}.`);
        }
        if (typeof buildInfo.desktopRuntimeBuildId !== 'string' || buildInfo.desktopRuntimeBuildId.length < 16) {
            throw new Error('Packaged Web runtime build identity has an invalid build ID.');
        }
        if (buildInfo.desktopRuntimeBuildId !== manifestBuildId) {
            throw new Error('Packaged Web runtime build identity does not match its manifest.');
        }
        if (buildInfo.desktopRuntimeDeepLinkScheme !== manifestDeepLinkScheme) {
            throw new Error('Packaged Web runtime deep-link scheme does not match its manifest.');
        }
        return {
            buildEnvironment: endpoint.environment,
            buildId: buildInfo.desktopRuntimeBuildId,
            deepLinkScheme: manifestDeepLinkScheme
        };
    }
    async readManifestEntry(manifestPath, buildEnvironment, environment) {
        let manifest;
        try {
            manifest = JSON.parse(await (0,promises_namespaceObject.readFile)(manifestPath, 'utf8'));
        } catch (error) {
            throw new Error(`Packaged Web runtime manifest is unavailable: ${manifestPath}`, {
                cause: error
            });
        }
        if (manifest.schemaVersion !== 2 || manifest.defaultEnvironment !== buildEnvironment) {
            throw new Error('Packaged Web runtime manifest does not match the application build.');
        }
        const entry = manifest.runtimes?.[environment];
        const expectedScheme = resolveDesktopDeepLinkScheme(buildEnvironment, this.configuration.current.macosRegion);
        if (entry?.environment !== environment || entry.archive !== `${environment}.asar` || entry.deepLinkScheme !== expectedScheme || typeof entry.buildId !== 'string' || entry.buildId.length < 16) {
            throw new Error(`Packaged Web runtime manifest does not declare ${environment}.`);
        }
        return entry;
    }
    async assertReady(endpoint, backendOrigin, token, nonce, expectedBuildIdentity) {
        const response = await fetch(buildDesktopWebRuntimeHealthUrl(backendOrigin), {
            cache: 'no-store',
            headers: {
                [DESKTOP_WEB_RUNTIME_AUTH_HEADER]: token,
                [DESKTOP_WEB_RUNTIME_PROBE_HEADER]: nonce
            },
            signal: AbortSignal.timeout((/* inlined export .DESKTOP_WEB_RUNTIME_START_TIMEOUT_MS */15000))
        });
        if (!response.ok) {
            throw new Error(`Packaged Web runtime health check returned HTTP ${response.status}.`);
        }
        if (response.headers.get(DESKTOP_WEB_RUNTIME_PROBE_RESPONSE_HEADER) !== nonce) {
            throw new Error('Packaged Web runtime did not return the expected process proof.');
        }
        const buildInfo = await response.json();
        const expectedVercelEnvironment = endpoint.environment === 'prod' ? 'production' : 'preview';
        if (buildInfo.vercelEnv !== expectedVercelEnvironment) {
            throw new Error(`Packaged Web runtime reported ${String(buildInfo.vercelEnv)}, expected ${expectedVercelEnvironment}.`);
        }
        if (buildInfo.desktopRuntimeBuildEnvironment !== expectedBuildIdentity.buildEnvironment) {
            throw new Error(`Packaged Web runtime reported build environment ${String(buildInfo.desktopRuntimeBuildEnvironment)}, expected ${expectedBuildIdentity.buildEnvironment}.`);
        }
        if (buildInfo.desktopRuntimeBuildId !== expectedBuildIdentity.buildId) {
            throw new Error('Packaged Web runtime reported an unexpected build ID.');
        }
        if (buildInfo.desktopRuntimeDeepLinkScheme !== expectedBuildIdentity.deepLinkScheme) {
            throw new Error('Packaged Web runtime reported an unexpected deep-link scheme.');
        }
    }
    handleSurfaceProtocol() {
        const browserProtocol = external_electron_.session.defaultSession.protocol;
        if (browserProtocol.isProtocolHandled('http')) {
            throw new Error('The HTTP protocol already has a handler in the Desktop browser session.');
        }
        browserProtocol.handle('http', this.handleProtocolRequest);
        this.protocolHandled = true;
    }
    async waitUntilListening(child, nonce) {
        return new Promise((resolvePromise, reject)=>{
            const timeout = setTimeout(()=>{
                cleanup();
                reject(new Error('Packaged Web runtime did not report a listening endpoint in time.'));
            }, (/* inlined export .DESKTOP_WEB_RUNTIME_START_TIMEOUT_MS */15000));
            const cleanup = ()=>{
                clearTimeout(timeout);
                child.removeListener('exit', handleEarlyExit);
                child.removeListener('message', handleMessage);
            };
            const handleEarlyExit = (code)=>{
                cleanup();
                reject(new Error(`Packaged Web runtime exited before listening with code ${code}.`));
            };
            const handleMessage = (message)=>{
                const candidate = message;
                if (candidate.type !== 'listening' || candidate.nonce !== nonce || typeof candidate.port !== 'number' || !Number.isInteger(candidate.port) || candidate.port < 1 || candidate.port > 65535) {
                    return;
                }
                cleanup();
                resolvePromise(candidate.port);
            };
            child.once('exit', handleEarlyExit);
            child.on('message', handleMessage);
        });
    }
    constructor(){
        this.protocolHandled = false;
        this.ready = false;
        this.stopping = false;
        this.handleExit = (code)=>{
            const wasReady = this.ready;
            const wasStopping = this.stopping;
            this.child = undefined;
            this.backendOrigin = undefined;
            this.endpoint = undefined;
            this.ready = false;
            this.token = undefined;
            if (this.protocolHandled) {
                external_electron_.session.defaultSession.protocol.unhandle('http');
                this.protocolHandled = false;
            }
            if (!wasStopping && wasReady) {
                console.error(`[desktop] local Web runtime exited unexpectedly with code ${code}`);
                this.configuration.application.quit();
            }
        };
        this.handleBeforeQuit = ()=>{
            // The platform host can delay final quit while it disconnects an active device. Stop the Utility
            // Process on the first request, but preserve the verified origin for pending WebContents teardown.
            this.stopRuntime(true);
        };
        this.handleProtocolRequest = async (request)=>{
            const endpoint = this.endpoint;
            const backendOrigin = this.backendOrigin;
            const token = this.token;
            const requestUrl = new URL(request.url);
            if (!endpoint || !backendOrigin || !token || requestUrl.origin !== endpoint.origin) {
                // The global HTTP handler cannot recover the renderer's original credentials mode.
                // Keep non-product HTTP passthrough credentialless instead of accidentally turning
                // an `omit` request into an ambient default-Session request. HTTPS bypasses this handler.
                const headers = new Headers(request.headers);
                headers.delete('cookie');
                headers.delete('authorization');
                headers.delete(DESKTOP_WEB_RUNTIME_LOGICAL_ORIGIN_HEADER);
                const response = await external_electron_.net.fetch(request, {
                    bypassCustomProtocolHandlers: true,
                    credentials: 'omit',
                    headers
                });
                return this.cookies.stripResponseCookies(response);
            }
            const backendUrl = new URL(`${requestUrl.pathname}${requestUrl.search}`, backendOrigin);
            const headers = new Headers(request.headers);
            headers.set('Accept-Language', await this.requestLanguage.get());
            await this.cookies.prepareRequestHeaders(request, headers);
            headers.set(DESKTOP_WEB_RUNTIME_AUTH_HEADER, token);
            headers.set('x-forwarded-host', requestUrl.host);
            headers.set('x-forwarded-proto', requestUrl.protocol.slice(0, -1));
            const requestInit = {
                headers,
                method: request.method,
                redirect: 'manual'
            };
            if (request.method !== 'GET' && request.method !== 'HEAD') {
                requestInit.body = request.body;
                requestInit.duplex = 'half';
            }
            const backendRequest = new Request(backendUrl, requestInit);
            const response = await external_electron_.net.fetch(backendRequest, {
                bypassCustomProtocolHandlers: true,
                credentials: 'omit',
                redirect: 'manual'
            });
            const processedResponse = await this.cookies.processResponse(request, response);
            return processedResponse;
        };
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], DesktopWebRuntime.prototype, "nodeAdapter", void 0);
__decorate([
    inject(DesktopAssets),
    __metadata("design:type", typeof DesktopAssets === "undefined" ? Object : DesktopAssets)
], DesktopWebRuntime.prototype, "assets", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], DesktopWebRuntime.prototype, "configuration", void 0);
__decorate([
    inject(DesktopRequestLanguage),
    __metadata("design:type", typeof DesktopRequestLanguage === "undefined" ? Object : DesktopRequestLanguage)
], DesktopWebRuntime.prototype, "requestLanguage", void 0);
__decorate([
    inject(DesktopWebRuntimeCookieBridge),
    __metadata("design:type", typeof DesktopWebRuntimeCookieBridge === "undefined" ? Object : DesktopWebRuntimeCookieBridge)
], DesktopWebRuntime.prototype, "cookies", void 0);
__decorate([
    inject(DesktopWebRuntimeDiagnostics),
    __metadata("design:type", typeof DesktopWebRuntimeDiagnostics === "undefined" ? Object : DesktopWebRuntimeDiagnostics)
], DesktopWebRuntime.prototype, "diagnostics", void 0);
DesktopWebRuntime = __decorate([
    injectable()
], DesktopWebRuntime);
