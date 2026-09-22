(() => {
"use strict";
var __webpack_exports__ = {};

;// CONCATENATED MODULE: external "electron"
const external_electron_namespaceObject = require("electron");
;// CONCATENATED MODULE: ../../modules/log-upload-api.ts
const LOG_UPLOAD_CLOSE_CHANNEL = 'desktop-log-upload:close';
const LOG_UPLOAD_COPY_ID_CHANNEL = 'desktop-log-upload:copy-id';
const LOG_UPLOAD_EVENT_CHANNEL = 'desktop-log-upload:state';
const LOG_UPLOAD_GET_STATE_CHANNEL = 'desktop-log-upload:get-state';
const LOG_UPLOAD_START_CHANNEL = 'desktop-log-upload:start';
const LOG_UPLOAD_SUBSCRIBE_CHANNEL = 'desktop-log-upload:subscribe';
const LOG_UPLOAD_UNSUBSCRIBE_CHANNEL = 'desktop-log-upload:unsubscribe';

;// CONCATENATED MODULE: ./preload.ts


const deliver = async (listener, state)=>{
    try {
        await listener(state);
    } catch  {
    // An observer must not break the isolated event bridge.
    }
};
const api = {
    close: async ()=>{
        await external_electron_namespaceObject.ipcRenderer.invoke(LOG_UPLOAD_CLOSE_CHANNEL);
    },
    copyUploadId: async ()=>{
        await external_electron_namespaceObject.ipcRenderer.invoke(LOG_UPLOAD_COPY_ID_CHANNEL);
    },
    getState: ()=>external_electron_namespaceObject.ipcRenderer.invoke(LOG_UPLOAD_GET_STATE_CHANNEL),
    startUpload: async ()=>{
        await external_electron_namespaceObject.ipcRenderer.invoke(LOG_UPLOAD_START_CHANNEL);
    },
    subscribe: async (listener)=>{
        if (typeof listener !== 'function') {
            throw new TypeError('Log upload listener must be a function');
        }
        const ipcListener = (_event, state)=>{
            deliver(listener, state);
        };
        external_electron_namespaceObject.ipcRenderer.on(LOG_UPLOAD_EVENT_CHANNEL, ipcListener);
        try {
            await external_electron_namespaceObject.ipcRenderer.invoke(LOG_UPLOAD_SUBSCRIBE_CHANNEL);
        } catch (error) {
            external_electron_namespaceObject.ipcRenderer.removeListener(LOG_UPLOAD_EVENT_CHANNEL, ipcListener);
            throw error;
        }
        let subscribed = true;
        return Object.freeze({
            unsubscribe: async ()=>{
                if (!subscribed) {
                    return;
                }
                subscribed = false;
                external_electron_namespaceObject.ipcRenderer.removeListener(LOG_UPLOAD_EVENT_CHANNEL, ipcListener);
                await external_electron_namespaceObject.ipcRenderer.invoke(LOG_UPLOAD_UNSUBSCRIBE_CHANNEL);
            }
        });
    }
};
external_electron_namespaceObject.contextBridge.exposeInMainWorld('ClientLogUploadAPI', Object.freeze(api));

module.exports = __webpack_exports__;
})()
;