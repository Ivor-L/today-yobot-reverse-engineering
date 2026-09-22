// Compiled fragment from ../../packages/client-node-adapter/src/decorators/rpc-call-logger/index.ts.
// The original TypeScript and import graph are not restored.




const RpcLogTarget = Object.freeze({
    Noop: RPC_LOG_TARGET_NOOP
});
const hasOwnMarker = (value, marker)=>Object.prototype.hasOwnProperty.call(value, marker);
const mark = (value, marker)=>{
    Object.defineProperty(value, marker, {
        value: true
    });
};
const injectReporter = (prototype)=>{
    const constructor = prototype.constructor;
    if (hasOwnMarker(constructor, RPC_CALL_REPORTER_INJECTED)) {
        return;
    }
    decorate(inject(RPC_CALL_REPORTER), constructor, 'rpcCallReporter');
    decorate(optional_optional(), constructor, 'rpcCallReporter');
    mark(constructor, RPC_CALL_REPORTER_INJECTED);
};
const createObserver = (instance, methodName, target, request, startedAt, started)=>({
        succeeded: (response)=>{
            const durationMs = performance.now() - started;
            instance.rpcCallReporter?.recordMethod({
                instance,
                methodName,
                target,
                status: 'success',
                request,
                response: createRpcSnapshot(response ?? null),
                startedAt,
                durationMs
            });
        },
        failed: (error)=>{
            const durationMs = performance.now() - started;
            instance.rpcCallReporter?.recordMethod({
                instance,
                methodName,
                target,
                status: 'failure',
                request,
                error,
                startedAt,
                durationMs
            });
        }
    });
const createSubscriptionWrapper = (method, target)=>{
    return async function(...args) {
        if (target === RPC_LOG_TARGET_NOOP) {
            return await method.apply(this, args);
        }
        const startedAt = Date.now();
        const request = createRpcRequestSnapshot(args.slice(0, 1));
        const started = performance.now();
        const observer = createObserver(this, 'subscribe', target, request, startedAt, started);
        const [eventName, listener] = args;
        const reporter = this.rpcCallReporter;
        try {
            const response = reporter !== undefined && typeof eventName === 'string' && typeof listener === 'function' ? await reporter.subscribe({
                instance: this,
                eventName,
                target,
                listener: listener,
                subscribe: async (eventListener)=>await method.call(this, eventName, eventListener)
            }) : await method.apply(this, args);
            observer.succeeded(null);
            return response;
        } catch (error) {
            observer.failed(error);
            throw error;
        }
    };
};
const createCallWrapper = (methodName, method, target)=>{
    return async function(...args) {
        if (target === RPC_LOG_TARGET_NOOP) {
            return await method.apply(this, args);
        }
        const startedAt = Date.now();
        const request = createRpcRequestSnapshot(args);
        const started = performance.now();
        const observer = createObserver(this, methodName, target, request, startedAt, started);
        try {
            const response = await method.apply(this, args);
            observer.succeeded(response);
            return response;
        } catch (error) {
            observer.failed(error);
            throw error;
        }
    };
};
const decorateRpcMethod = (prototype, propertyKey, descriptor, target)=>{
    const method = descriptor.value;
    if (typeof method !== 'function' || hasOwnMarker(method, RPC_CALL_LOGGED_METHOD)) {
        return;
    }
    injectReporter(prototype);
    mark(prototype, RPC_CALL_LOGGED_PROTOTYPE);
    const methodName = String(propertyKey);
    const wrapped = methodName === 'subscribe' ? createSubscriptionWrapper(method, target) : createCallWrapper(methodName, method, target);
    mark(wrapped, RPC_CALL_LOGGED_METHOD);
    descriptor.value = wrapped;
};
const decorateRpcClass = (constructor, target)=>{
    const prototype = constructor.prototype;
    injectReporter(prototype);
    mark(prototype, RPC_CALL_LOGGED_PROTOTYPE);
    for (const propertyKey of Reflect.ownKeys(prototype)){
        if (propertyKey === 'constructor') {
            continue;
        }
        const descriptor = Object.getOwnPropertyDescriptor(prototype, propertyKey);
        if (descriptor === undefined) {
            continue;
        }
        decorateRpcMethod(prototype, propertyKey, descriptor, target);
        Object.defineProperty(prototype, propertyKey, descriptor);
    }
};
const logCalls = (target)=>{
    return (constructor)=>{
        decorateRpcClass(constructor, target);
    };
};
const logCall = (target)=>{
    return (prototype, propertyKey, descriptor)=>{
        decorateRpcMethod(prototype, propertyKey, descriptor, target);
    };
};
const isRpcLoggedInstance = (value)=>{
    let prototype = Object.getPrototypeOf(value);
    while(prototype !== null){
        if (hasOwnMarker(prototype, RPC_CALL_LOGGED_PROTOTYPE)) {
            return true;
        }
        prototype = Object.getPrototypeOf(prototype);
    }
    return false;
};
