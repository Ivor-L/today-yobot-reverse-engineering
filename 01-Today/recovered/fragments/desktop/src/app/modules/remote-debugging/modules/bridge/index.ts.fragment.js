// Compiled fragment from ./src/app/modules/remote-debugging/modules/bridge/index.ts.
// The original TypeScript and import graph are not restored.





class RemoteDebuggingBridge {
    address() {
        const address = this.server?.address();
        if (!address || typeof address === 'string') {
            return null;
        }
        return address;
    }
    async start(options) {
        if (!this.startPromise) {
            this.startPromise = this.listen(options);
        }
        await this.startPromise;
    }
    async close() {
        if (!this.server) {
            this.startPromise = undefined;
            return;
        }
        if (!this.closePromise) {
            this.closePromise = this.closeServer(this.server);
        }
        try {
            await this.closePromise;
        } finally{
            this.closePromise = undefined;
            this.server = undefined;
            this.startPromise = undefined;
        }
    }
    closeServer(server) {
        return new Promise((resolve, reject)=>{
            server.close((error)=>{
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
            for (const socket of this.sockets){
                socket.destroy();
            }
        });
    }
    async listen({ host = REMOTE_DEBUGGING_HOST, onError, port, targetHost = REMOTE_DEBUGGING_TARGET_HOST, targetPort }) {
        const server = (0,external_node_net_namespaceObject.createServer)((clientSocket)=>{
            this.forward(clientSocket, targetHost, targetPort);
        });
        await new Promise((resolve, reject)=>{
            const handleError = (error)=>{
                server.off('listening', handleListening);
                reject(error);
            };
            const handleListening = ()=>{
                server.off('error', handleError);
                resolve();
            };
            server.once('error', handleError);
            server.once('listening', handleListening);
            server.listen(port, host);
        });
        server.on('error', onError ?? this.reportError);
        server.unref();
        this.server = server;
    }
    forward(clientSocket, targetHost, targetPort) {
        const debuggerSocket = this.track((0,external_node_net_namespaceObject.connect)({
            host: targetHost,
            port: targetPort
        }));
        this.track(clientSocket);
        clientSocket.pipe(debuggerSocket);
        debuggerSocket.pipe(clientSocket);
        clientSocket.on('error', ()=>{
            debuggerSocket.destroy();
        });
        clientSocket.on('close', ()=>{
            debuggerSocket.destroy();
        });
        debuggerSocket.on('error', ()=>{
            clientSocket.destroy();
        });
        debuggerSocket.on('close', ()=>{
            clientSocket.destroy();
        });
    }
    track(socket) {
        this.sockets.add(socket);
        socket.once('close', ()=>{
            this.sockets.delete(socket);
        });
        return socket;
    }
    constructor(){
        this.sockets = new Set();
        this.reportError = (error)=>{
            console.error('[desktop] remote debugging bridge failed', error);
        };
    }
}
RemoteDebuggingBridge = __decorate([
    injectable()
], RemoteDebuggingBridge);
