// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/authenticator/modules/isolated-session/modules/session/index.ts.
// The original TypeScript and import graph are not restored.



class ElectronAccountIsolatedSession {
    constructor(WindowClass, session, authorizationWindow){
        this.openAuthorizationWindow = async (request)=>await this.authorizationWindow.open(this.windowClass, this.session, request);
        this.dispose = async ()=>{
            try {
                await Promise.allSettled([
                    this.session.closeAllConnections(),
                    this.session.clearCache(),
                    this.session.clearStorageData()
                ]);
            } catch (error) {
                throw interface_error_InterfaceError(error, 'The isolated account session could not be disposed.');
            }
        };
        this.session = session;
        this.windowClass = WindowClass;
        this.authorizationWindow = authorizationWindow;
        this.fetch = async (input, init)=>{
            try {
                let sessionInput = input;
                let sessionInit = init;
                if (input instanceof URL) {
                    sessionInput = input.href;
                }
                if (init?.headers) {
                    const headers = new Headers(init.headers);
                    headers.delete('Origin');
                    sessionInit = {
                        ...init,
                        headers
                    };
                }
                return await this.session.fetch(sessionInput, sessionInit);
            } catch (error) {
                throw interface_error_InterfaceError(base_InterfaceErrorCode.NetworkError, 'The isolated account service could not be reached.', {
                    cause: error
                });
            }
        };
    }
}
