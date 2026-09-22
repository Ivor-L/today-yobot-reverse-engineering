(() => {
"use strict";
var __webpack_exports__ = {};

;// CONCATENATED MODULE: external "electron"
const external_electron_namespaceObject = require("electron");
;// CONCATENATED MODULE: ../../modules/deep-link-debug-api.ts
const DEEP_LINK_DEBUG_GET_SCHEME_CHANNEL = 'desktop-deep-link-debug:get-scheme';
const DEEP_LINK_DEBUG_OPEN_CHANNEL = 'desktop-deep-link-debug:open';

;// CONCATENATED MODULE: ./preload.ts


const deepLinkDebugAPI = {
    getScheme: async ()=>{
        return await external_electron_namespaceObject.ipcRenderer.invoke(DEEP_LINK_DEBUG_GET_SCHEME_CHANNEL);
    },
    open: async (url)=>{
        await external_electron_namespaceObject.ipcRenderer.invoke(DEEP_LINK_DEBUG_OPEN_CHANNEL, url);
    }
};
external_electron_namespaceObject.contextBridge.exposeInMainWorld('ClientDeepLinkDebugAPI', Object.freeze(deepLinkDebugAPI));

module.exports = __webpack_exports__;
})()
;