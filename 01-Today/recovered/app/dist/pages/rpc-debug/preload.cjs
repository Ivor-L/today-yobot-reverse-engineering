(() => {
"use strict";
var __webpack_exports__ = {};

;// CONCATENATED MODULE: external "electron"
const external_electron_namespaceObject = require("electron");
;// CONCATENATED MODULE: ../../modules/rpc-debug-api.ts
const RPC_DEBUG_CLOSE_CHANNEL = 'desktop-rpc-debug:close';
const RPC_DEBUG_RECORD_CHANNEL = 'desktop-rpc-debug:record';
const RPC_DEBUG_SUBSCRIBE_CHANNEL = 'desktop-rpc-debug:subscribe';
const RPC_DEBUG_UNSUBSCRIBE_CHANNEL = 'desktop-rpc-debug:unsubscribe';

;// CONCATENATED MODULE: ./preload.ts


const deliverRecord = async (listener, record)=>{
    try {
        await listener(record);
    } catch  {
    // A renderer observer must not break the isolated preload event bridge.
    }
};
const rpcDebugAPI = {
    close: async ()=>{
        await external_electron_namespaceObject.ipcRenderer.invoke(RPC_DEBUG_CLOSE_CHANNEL);
    },
    subscribe: async (listener)=>{
        if (typeof listener !== 'function') {
            throw new TypeError('RPC debug listener must be a function');
        }
        const ipcListener = (_event, record)=>{
            deliverRecord(listener, record);
        };
        external_electron_namespaceObject.ipcRenderer.on(RPC_DEBUG_RECORD_CHANNEL, ipcListener);
        try {
            await external_electron_namespaceObject.ipcRenderer.invoke(RPC_DEBUG_SUBSCRIBE_CHANNEL);
        } catch (error) {
            external_electron_namespaceObject.ipcRenderer.removeListener(RPC_DEBUG_RECORD_CHANNEL, ipcListener);
            throw error;
        }
        let subscribed = true;
        return Object.freeze({
            unsubscribe: async ()=>{
                if (!subscribed) {
                    return;
                }
                subscribed = false;
                external_electron_namespaceObject.ipcRenderer.removeListener(RPC_DEBUG_RECORD_CHANNEL, ipcListener);
                await external_electron_namespaceObject.ipcRenderer.invoke(RPC_DEBUG_UNSUBSCRIBE_CHANNEL);
            }
        });
    }
};
external_electron_namespaceObject.contextBridge.exposeInMainWorld('ClientRpcDebugAPI', Object.freeze(rpcDebugAPI));

module.exports = __webpack_exports__;
})()
;