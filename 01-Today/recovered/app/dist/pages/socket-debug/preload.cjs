(() => {
"use strict";
var __webpack_exports__ = {};

;// CONCATENATED MODULE: external "electron"
const external_electron_namespaceObject = require("electron");
;// CONCATENATED MODULE: ../../modules/socket-debug-api.ts
const SOCKET_DEBUG_CLOSE_CHANNEL = 'desktop-socket-debug:close';
const SOCKET_DEBUG_GET_STATE_CHANNEL = 'desktop-socket-debug:get-state';
const SOCKET_DEBUG_RECORD_CHANNEL = 'desktop-socket-debug:record';
const SOCKET_DEBUG_SUBSCRIBE_CHANNEL = 'desktop-socket-debug:subscribe';
const SOCKET_DEBUG_UNSUBSCRIBE_CHANNEL = 'desktop-socket-debug:unsubscribe';
const MAX_SOCKET_DEBUG_RECORDS = 500;

;// CONCATENATED MODULE: ./preload.ts


const deliverRecord = async (listener, event)=>{
    try {
        await listener(event);
    } catch  {
    // A renderer observer must not break the isolated preload event bridge.
    }
};
const socketDebugAPI = {
    close: async ()=>{
        await external_electron_namespaceObject.ipcRenderer.invoke(SOCKET_DEBUG_CLOSE_CHANNEL);
    },
    getState: ()=>external_electron_namespaceObject.ipcRenderer.invoke(SOCKET_DEBUG_GET_STATE_CHANNEL),
    subscribe: async (listener)=>{
        if (typeof listener !== 'function') {
            throw new TypeError('Socket debug listener must be a function');
        }
        const ipcListener = (_event, packetEvent)=>{
            deliverRecord(listener, packetEvent);
        };
        external_electron_namespaceObject.ipcRenderer.on(SOCKET_DEBUG_RECORD_CHANNEL, ipcListener);
        try {
            await external_electron_namespaceObject.ipcRenderer.invoke(SOCKET_DEBUG_SUBSCRIBE_CHANNEL);
        } catch (error) {
            external_electron_namespaceObject.ipcRenderer.removeListener(SOCKET_DEBUG_RECORD_CHANNEL, ipcListener);
            throw error;
        }
        let subscribed = true;
        return Object.freeze({
            unsubscribe: async ()=>{
                if (!subscribed) {
                    return;
                }
                subscribed = false;
                external_electron_namespaceObject.ipcRenderer.removeListener(SOCKET_DEBUG_RECORD_CHANNEL, ipcListener);
                await external_electron_namespaceObject.ipcRenderer.invoke(SOCKET_DEBUG_UNSUBSCRIBE_CHANNEL);
            }
        });
    }
};
external_electron_namespaceObject.contextBridge.exposeInMainWorld('ClientSocketDebugAPI', Object.freeze(socketDebugAPI));

module.exports = __webpack_exports__;
})()
;