(() => {
"use strict";
var __webpack_exports__ = {};

;// CONCATENATED MODULE: external "electron"
const external_electron_namespaceObject = require("electron");
;// CONCATENATED MODULE: ../../modules/logs-debug-api.ts
const LOGS_DEBUG_CLOSE_CHANNEL = 'desktop-logs-debug:close';
const LOGS_DEBUG_EVENT_CHANNEL = 'desktop-logs-debug:event';
const LOGS_DEBUG_LIST_FILE_LOGS_CHANNEL = 'desktop-logs-debug:list-file-logs';
const LOGS_DEBUG_LIST_TARGETS_CHANNEL = 'desktop-logs-debug:list-targets';
const LOGS_DEBUG_SUBSCRIBE_CHANNEL = 'desktop-logs-debug:subscribe';
const LOGS_DEBUG_UNSUBSCRIBE_CHANNEL = 'desktop-logs-debug:unsubscribe';
const LOGS_DEBUG_UPLOAD_LOCAL_CHANNEL = 'desktop-logs-debug:upload-local';

;// CONCATENATED MODULE: ./preload.ts


const deliverEvent = async (listener, event)=>{
    try {
        await listener(event);
    } catch  {
    // A renderer observer must not break the isolated preload event bridge.
    }
};
const logsDebugAPI = {
    close: async ()=>{
        await external_electron_namespaceObject.ipcRenderer.invoke(LOGS_DEBUG_CLOSE_CHANNEL);
    },
    listFileLogs: (params)=>external_electron_namespaceObject.ipcRenderer.invoke(LOGS_DEBUG_LIST_FILE_LOGS_CHANNEL, params),
    listTargets: ()=>external_electron_namespaceObject.ipcRenderer.invoke(LOGS_DEBUG_LIST_TARGETS_CHANNEL),
    subscribe: async (listener)=>{
        if (typeof listener !== 'function') {
            throw new TypeError('Logs debug listener must be a function');
        }
        const ipcListener = (_event, debugEvent)=>{
            deliverEvent(listener, debugEvent);
        };
        external_electron_namespaceObject.ipcRenderer.on(LOGS_DEBUG_EVENT_CHANNEL, ipcListener);
        try {
            await external_electron_namespaceObject.ipcRenderer.invoke(LOGS_DEBUG_SUBSCRIBE_CHANNEL);
        } catch (error) {
            external_electron_namespaceObject.ipcRenderer.removeListener(LOGS_DEBUG_EVENT_CHANNEL, ipcListener);
            throw error;
        }
        let subscribed = true;
        return Object.freeze({
            unsubscribe: async ()=>{
                if (!subscribed) {
                    return;
                }
                subscribed = false;
                external_electron_namespaceObject.ipcRenderer.removeListener(LOGS_DEBUG_EVENT_CHANNEL, ipcListener);
                await external_electron_namespaceObject.ipcRenderer.invoke(LOGS_DEBUG_UNSUBSCRIBE_CHANNEL);
            }
        });
    },
    uploadLocal: async ()=>{
        await external_electron_namespaceObject.ipcRenderer.invoke(LOGS_DEBUG_UPLOAD_LOCAL_CHANNEL);
    }
};
external_electron_namespaceObject.contextBridge.exposeInMainWorld('ClientLogsDebugAPI', Object.freeze(logsDebugAPI));

module.exports = __webpack_exports__;
})()
;