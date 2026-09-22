(() => {
"use strict";
var __webpack_exports__ = {};

;// CONCATENATED MODULE: external "electron"
const external_electron_namespaceObject = require("electron");
;// CONCATENATED MODULE: ../../modules/debug-api.ts
const APP_ENVIRONMENTS = (/* unused pure expression or super */ null && ([
    'dev',
    'staging',
    'prod'
]));
const isAppEnvironment = (value)=>{
    return typeof value === 'string' && APP_ENVIRONMENTS.includes(value);
};
const DEBUG_CLEAR_ALL_DATA_CHANNEL = 'desktop-debug:clear-all-data';
const DEBUG_GET_STATE_CHANNEL = 'desktop-debug:get-state';
const DEBUG_OPEN_TOOL_PERMISSIONS_CHANNEL = 'desktop-debug:open-tool-permissions';
const DEBUG_OPEN_DEEP_LINK_DEBUG_CHANNEL = 'desktop-debug:open-deep-link-debug';
const DEBUG_OPEN_DEVTOOLS_CHANNEL = 'desktop-debug:open-devtools';
const DEBUG_OPEN_LOGS_DEBUG_CHANNEL = 'desktop-debug:open-logs-debug';
const DEBUG_OPEN_LOGS_DIRECTORY_CHANNEL = 'desktop-debug:open-logs-directory';
const DEBUG_UPLOAD_LOCAL_LOGS_CHANNEL = 'desktop-debug:upload-local-logs';
const DEBUG_OPEN_NODE_DEVTOOLS_CHANNEL = 'desktop-debug:open-node-devtools';
const DEBUG_OPEN_RECORD_DEBUG_CHANNEL = 'desktop-debug:open-record-debug';
const DEBUG_OPEN_RECORDINGS_DIRECTORY_CHANNEL = 'desktop-debug:open-recordings-directory';
const DEBUG_OPEN_RPC_DEBUG_CHANNEL = 'desktop-debug:open-rpc-debug';
const DEBUG_OPEN_TOOLS_DEBUG_CHANNEL = 'desktop-debug:open-tools-debug';
const DEBUG_OPEN_SOCKET_DEBUG_CHANNEL = 'desktop-debug:open-socket-debug';
const DEBUG_RELOAD_MAIN_WINDOW_CHANNEL = 'desktop-debug:reload-main-window';
const DEBUG_SET_ENVIRONMENT_CHANNEL = 'desktop-debug:set-environment';
const DEBUG_SET_NODE_NETWORK_INSPECTION_CHANNEL = 'desktop-debug:set-node-network-inspection';
const DEBUG_SET_FEATURE_OVERRIDE_CHANNEL = 'desktop-debug:set-feature-override';
const DEBUG_RESET_FEATURE_OVERRIDES_CHANNEL = 'desktop-debug:reset-feature-overrides';
const DEBUG_SET_TRAFFIC_LANE_CHANNEL = 'desktop-debug:set-traffic-lane';
const DEBUG_TRIGGER_REQUIRED_UPDATE_CHANNEL = 'desktop-debug:trigger-required-update';

;// CONCATENATED MODULE: ./preload.ts


const debugAPI = {
    clearAllData: ()=>external_electron_namespaceObject.ipcRenderer.invoke(DEBUG_CLEAR_ALL_DATA_CHANNEL),
    getState: ()=>external_electron_namespaceObject.ipcRenderer.invoke(DEBUG_GET_STATE_CHANNEL),
    openToolPermissions: ()=>external_electron_namespaceObject.ipcRenderer.invoke(DEBUG_OPEN_TOOL_PERMISSIONS_CHANNEL),
    openDeepLinkDebug: ()=>external_electron_namespaceObject.ipcRenderer.invoke(DEBUG_OPEN_DEEP_LINK_DEBUG_CHANNEL),
    openDevTools: ()=>external_electron_namespaceObject.ipcRenderer.invoke(DEBUG_OPEN_DEVTOOLS_CHANNEL),
    openLogsDebug: ()=>external_electron_namespaceObject.ipcRenderer.invoke(DEBUG_OPEN_LOGS_DEBUG_CHANNEL),
    openLogsDirectory: ()=>external_electron_namespaceObject.ipcRenderer.invoke(DEBUG_OPEN_LOGS_DIRECTORY_CHANNEL),
    uploadLocalLogs: ()=>external_electron_namespaceObject.ipcRenderer.invoke(DEBUG_UPLOAD_LOCAL_LOGS_CHANNEL),
    openNodeDevTools: ()=>external_electron_namespaceObject.ipcRenderer.invoke(DEBUG_OPEN_NODE_DEVTOOLS_CHANNEL),
    openToolsDebug: ()=>external_electron_namespaceObject.ipcRenderer.invoke(DEBUG_OPEN_TOOLS_DEBUG_CHANNEL),
    openRecordDebug: ()=>external_electron_namespaceObject.ipcRenderer.invoke(DEBUG_OPEN_RECORD_DEBUG_CHANNEL),
    openRecordingsDirectory: ()=>external_electron_namespaceObject.ipcRenderer.invoke(DEBUG_OPEN_RECORDINGS_DIRECTORY_CHANNEL),
    openRpcDebug: ()=>external_electron_namespaceObject.ipcRenderer.invoke(DEBUG_OPEN_RPC_DEBUG_CHANNEL),
    openSocketDebug: ()=>external_electron_namespaceObject.ipcRenderer.invoke(DEBUG_OPEN_SOCKET_DEBUG_CHANNEL),
    reloadMainWindow: ()=>external_electron_namespaceObject.ipcRenderer.invoke(DEBUG_RELOAD_MAIN_WINDOW_CHANNEL),
    setEnvironment: (environment)=>external_electron_namespaceObject.ipcRenderer.invoke(DEBUG_SET_ENVIRONMENT_CHANNEL, environment),
    setNodeNetworkInspectionEnabled: (enabled)=>external_electron_namespaceObject.ipcRenderer.invoke(DEBUG_SET_NODE_NETWORK_INSPECTION_CHANNEL, enabled),
    setFeatureOverride: (params)=>external_electron_namespaceObject.ipcRenderer.invoke(DEBUG_SET_FEATURE_OVERRIDE_CHANNEL, params),
    resetFeatureOverrides: ()=>external_electron_namespaceObject.ipcRenderer.invoke(DEBUG_RESET_FEATURE_OVERRIDES_CHANNEL),
    setTrafficLane: (trafficLane)=>external_electron_namespaceObject.ipcRenderer.invoke(DEBUG_SET_TRAFFIC_LANE_CHANNEL, trafficLane),
    triggerRequiredUpdate: ()=>external_electron_namespaceObject.ipcRenderer.invoke(DEBUG_TRIGGER_REQUIRED_UPDATE_CHANNEL)
};
external_electron_namespaceObject.contextBridge.exposeInMainWorld('ClientDebugAPI', Object.freeze(debugAPI));

module.exports = __webpack_exports__;
})()
;