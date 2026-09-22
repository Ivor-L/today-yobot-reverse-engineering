// Compiled fragment from ../../packages/client-node-adapter/src/base/interface-error/index.ts.
// The original TypeScript and import graph are not restored.



const InterfaceErrorClass = class InterfaceError extends Error {
    constructor(codeOrError, message = FALLBACK_MESSAGE, options = {}){
        if (isInterfaceErrorInstance(codeOrError, InterfaceError.prototype)) {
            return codeOrError;
        }
        const resolved = resolveInterfaceError(codeOrError, message, options);
        const { code, message: resolvedMessage, options: { cause, permissionId, retryAfterMs, status, terminal } } = resolved;
        super(resolvedMessage.trim() || FALLBACK_MESSAGE, {
            cause
        });
        Object.defineProperties(this, {
            name: {
                value: 'InterfaceError'
            },
            code: {
                value: code
            },
            permissionId: {
                value: permissionId
            },
            retryAfterMs: {
                value: retryAfterMs
            },
            status: {
                value: status
            },
            terminal: {
                value: terminal ?? false
            }
        });
    }
    toJSON() {
        const code = this.code;
        const message = this.message;
        const permissionId = this.permissionId;
        const data = {
            code,
            message
        };
        if (permissionId !== undefined) {
            data.permissionId = permissionId;
        }
        return data;
    }
};
const interface_error_InterfaceError = new Proxy(InterfaceErrorClass, {
    apply: (Target, _thisArg, args)=>Reflect.construct(Target, args)
});
Object.defineProperty(InterfaceErrorClass.prototype, 'constructor', {
    configurable: true,
    value: interface_error_InterfaceError,
    writable: true
});
