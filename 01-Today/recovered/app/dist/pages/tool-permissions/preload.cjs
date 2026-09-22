(() => {
"use strict";
var __webpack_exports__ = {};

;// CONCATENATED MODULE: external "electron"
const external_electron_namespaceObject = require("electron");
;// CONCATENATED MODULE: ../../modules/tool-permissions-api.ts
const TOOL_PERMISSIONS_GET_CHANNEL = 'desktop-tool-permissions:get';
const TOOL_PERMISSIONS_SET_CHANNEL = 'desktop-tool-permissions:set';
const TOOL_PERMISSIONS_SET_REJECTION_CODE_CHANNEL = 'desktop-tool-permissions:set-rejection-code';
const TOOL_PERMISSIONS_SET_MODE_CHANNEL = 'desktop-tool-permissions:set-mode';
const TOOL_PERMISSIONS_RESET_CHANNEL = 'desktop-tool-permissions:reset';
const TOOL_PERMISSIONS_CLOSE_CHANNEL = 'desktop-tool-permissions:close';

;// CONCATENATED MODULE: ./preload.ts


const toolPermissionsAPI = {
    close: ()=>external_electron_namespaceObject.ipcRenderer.invoke(TOOL_PERMISSIONS_CLOSE_CHANNEL),
    getPermissions: ()=>external_electron_namespaceObject.ipcRenderer.invoke(TOOL_PERMISSIONS_GET_CHANNEL),
    setPermissions: (params)=>external_electron_namespaceObject.ipcRenderer.invoke(TOOL_PERMISSIONS_SET_CHANNEL, params),
    setRejectionCode: (params)=>external_electron_namespaceObject.ipcRenderer.invoke(TOOL_PERMISSIONS_SET_REJECTION_CODE_CHANNEL, params),
    setMode: (params)=>external_electron_namespaceObject.ipcRenderer.invoke(TOOL_PERMISSIONS_SET_MODE_CHANNEL, params),
    resetPermissions: (params)=>external_electron_namespaceObject.ipcRenderer.invoke(TOOL_PERMISSIONS_RESET_CHANNEL, params)
};
external_electron_namespaceObject.contextBridge.exposeInMainWorld('ClientToolPermissionsAPI', Object.freeze(toolPermissionsAPI));

module.exports = __webpack_exports__;
})()
;