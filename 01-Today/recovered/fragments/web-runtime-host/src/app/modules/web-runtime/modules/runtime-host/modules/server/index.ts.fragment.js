// Compiled fragment from ./src/app/modules/web-runtime/modules/runtime-host/modules/server/index.ts.
// The original TypeScript and import graph are not restored.











class DesktopWebRuntimeHostServer {
    async launch(message) {
        for (const [key, value] of Object.entries(message.environment)){
            process.env[key] = value;
        }
        const runtimeDirectory = (0,external_node_path_namespaceObject.dirname)(message.serverPath);
        const nextConfig = await this.configuration.read(runtimeDirectory);
        const requireRuntime = (0,external_node_module_namespaceObject.createRequire)(message.serverPath);
        process.env.BUILD_INFO_FILE_PATH = (0,external_node_path_namespaceObject.join)(runtimeDirectory, 'public', 'build-info.json');
        process.env.DESKTOP_WEB_RUNTIME_ROOT = runtimeDirectory;
        process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(nextConfig);
        this.installServerGuard(message);
        requireRuntime('next');
        const { startServer } = requireRuntime('next/dist/server/lib/start-server');
        await startServer({
            allowRetry: false,
            config: nextConfig,
            dir: runtimeDirectory,
            hostname: consts_DESKTOP_WEB_RUNTIME_BIND_HOST,
            isDev: false,
            keepAliveTimeout: this.readKeepAliveTimeout(),
            port: 0
        });
    }
    installServerGuard(message) {
        const originalCreateServer = (external_node_http_default()).createServer;
        (external_node_http_default()).createServer = (...arguments_)=>{
            const requestListenerIndex = arguments_.findIndex((argument)=>typeof argument === 'function');
            const requestListener = arguments_[requestListenerIndex];
            if (!requestListener) {
                throw new Error('The packaged Next runtime did not provide an HTTP request listener.');
            }
            arguments_[requestListenerIndex] = createAuthenticatedRequestListener(requestListener, message.token, message.nonce, message.surfaceOrigin);
            const server = Reflect.apply(originalCreateServer, (external_node_http_default()), arguments_);
            const originalListen = server.listen.bind(server);
            process.title = 'Today Web Runtime';
            server.listen = (..._arguments)=>{
                return originalListen(0, consts_DESKTOP_WEB_RUNTIME_BIND_HOST);
            };
            server.prependListener('upgrade', (request, socket)=>{
                if (!hasMatchingDesktopWebRuntimeSecret(request.headers[DESKTOP_WEB_RUNTIME_AUTH_HEADER], message.token)) {
                    socket.destroy();
                }
            });
            server.once('listening', ()=>{
                const address = server.address();
                if (!address || typeof address === 'string') {
                    throw new Error('The packaged Next runtime did not bind a private TCP endpoint.');
                }
                const listeningMessage = {
                    type: 'listening',
                    nonce: message.nonce,
                    port: address.port
                };
                this.parentPort.postMessage(listeningMessage);
            });
            (external_node_http_default()).createServer = originalCreateServer;
            return server;
        };
    }
    readKeepAliveTimeout() {
        const keepAliveTimeout = Number(process.env.KEEP_ALIVE_TIMEOUT);
        if (!Number.isFinite(keepAliveTimeout) || keepAliveTimeout < 0) {
            return undefined;
        }
        return keepAliveTimeout;
    }
}
__decorate([
    inject(DESKTOP_WEB_RUNTIME_HOST_PARENT_PORT),
    __metadata("design:type", typeof DesktopWebRuntimeHostParentPort === "undefined" ? Object : DesktopWebRuntimeHostParentPort)
], DesktopWebRuntimeHostServer.prototype, "parentPort", void 0);
__decorate([
    inject(DesktopWebRuntimeServerConfiguration),
    __metadata("design:type", typeof DesktopWebRuntimeServerConfiguration === "undefined" ? Object : DesktopWebRuntimeServerConfiguration)
], DesktopWebRuntimeHostServer.prototype, "configuration", void 0);
DesktopWebRuntimeHostServer = __decorate([
    injectable()
], DesktopWebRuntimeHostServer);
