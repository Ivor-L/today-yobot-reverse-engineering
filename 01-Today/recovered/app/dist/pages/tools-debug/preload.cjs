(() => {
"use strict";
var __webpack_exports__ = {};

;// CONCATENATED MODULE: external "electron"
const external_electron_namespaceObject = require("electron");
;// CONCATENATED MODULE: ../../modules/tools-debug-api.ts
const TOOLS_DEBUG_CLOSE_CHANNEL = 'desktop-tools-debug:close';
const TOOLS_DEBUG_OPEN_TOOL_PERMISSIONS_CHANNEL = 'desktop-tools-debug:open-tool-permissions';
const TOOLS_DEBUG_RECORD_CHANNEL = 'desktop-tools-debug:record';
const TOOLS_DEBUG_SUBSCRIBE_CHANNEL = 'desktop-tools-debug:subscribe';
const TOOLS_DEBUG_UNSUBSCRIBE_CHANNEL = 'desktop-tools-debug:unsubscribe';

;// CONCATENATED MODULE: ./preload.ts


const deliverRecord = async (listener, record)=>{
    try {
        await listener(record);
    } catch  {
    // A renderer observer must not break the isolated preload event bridge.
    }
};
const toolsDebugAPI = {
    openToolPermissions: async ()=>{
        await external_electron_namespaceObject.ipcRenderer.invoke(TOOLS_DEBUG_OPEN_TOOL_PERMISSIONS_CHANNEL);
    },
    close: async ()=>{
        await external_electron_namespaceObject.ipcRenderer.invoke(TOOLS_DEBUG_CLOSE_CHANNEL);
    },
    subscribe: async (listener)=>{
        if (typeof listener !== 'function') {
            throw new TypeError('Tools debug listener must be a function');
        }
        const ipcListener = (_event, record)=>{
            deliverRecord(listener, record);
        };
        external_electron_namespaceObject.ipcRenderer.on(TOOLS_DEBUG_RECORD_CHANNEL, ipcListener);
        try {
            await external_electron_namespaceObject.ipcRenderer.invoke(TOOLS_DEBUG_SUBSCRIBE_CHANNEL);
        } catch (error) {
            external_electron_namespaceObject.ipcRenderer.removeListener(TOOLS_DEBUG_RECORD_CHANNEL, ipcListener);
            throw error;
        }
        let subscribed = true;
        return Object.freeze({
            unsubscribe: async ()=>{
                if (!subscribed) {
                    return;
                }
                subscribed = false;
                external_electron_namespaceObject.ipcRenderer.removeListener(TOOLS_DEBUG_RECORD_CHANNEL, ipcListener);
                await external_electron_namespaceObject.ipcRenderer.invoke(TOOLS_DEBUG_UNSUBSCRIBE_CHANNEL);
            }
        });
    }
};
external_electron_namespaceObject.contextBridge.exposeInMainWorld('ClientToolsDebugAPI', Object.freeze(toolsDebugAPI));

module.exports = __webpack_exports__;
})()
;