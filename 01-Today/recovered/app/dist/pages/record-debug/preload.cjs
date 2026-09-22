(() => {
"use strict";
var __webpack_exports__ = {};

;// CONCATENATED MODULE: external "electron"
const external_electron_namespaceObject = require("electron");
;// CONCATENATED MODULE: ../../modules/record-debug-api/consts.ts
const RECORD_DEBUG_GET_DEFAULTS_CHANNEL = 'desktop-record-debug:get-defaults';
const RECORD_DEBUG_TRIGGER_CHANNEL = 'desktop-record-debug:trigger';

;// CONCATENATED MODULE: ./preload.ts


const recordDebugAPI = {
    getDefaults: async ()=>{
        return await external_electron_namespaceObject.ipcRenderer.invoke(RECORD_DEBUG_GET_DEFAULTS_CHANNEL);
    },
    trigger: async (offer)=>{
        await external_electron_namespaceObject.ipcRenderer.invoke(RECORD_DEBUG_TRIGGER_CHANNEL, offer);
    }
};
external_electron_namespaceObject.contextBridge.exposeInMainWorld('ClientRecordDebugAPI', Object.freeze(recordDebugAPI));

module.exports = __webpack_exports__;
})()
;