(() => {
"use strict";
var __webpack_exports__ = {};

;// CONCATENATED MODULE: external "electron"
const external_electron_namespaceObject = require("electron");
;// CONCATENATED MODULE: ../../modules/recording-capsule-api.ts
const RECORDING_CAPSULE_DISMISS_CHANNEL = 'desktop-recording-capsule:dismiss';
const RECORDING_CAPSULE_CANCEL_CHANNEL = 'desktop-recording-capsule:cancel';
const RECORDING_CAPSULE_OPEN_NOTES_CHANNEL = 'desktop-recording-capsule:open-notes';
const RECORDING_CAPSULE_OPEN_APP_CHANNEL = 'desktop-recording-capsule:open-app';
const RECORDING_CAPSULE_POINTER_CHANNEL = 'desktop-recording-capsule:pointer';
const RECORDING_CAPSULE_WARNING_SIZE_CHANNEL = 'desktop-recording-capsule:warning-size';
const RECORDING_CAPSULE_DRAG_THRESHOLD = 4;
const RECORDING_CAPSULE_CLICK_DURATION_MS = 500;
const RECORDING_CAPSULE_GET_STATE_CHANNEL = 'desktop-recording-capsule:get-state';
const RECORDING_CAPSULE_RETRY_CHANNEL = 'desktop-recording-capsule:retry';
const RECORDING_CAPSULE_SET_PAUSED_CHANNEL = 'desktop-recording-capsule:set-paused';
const RECORDING_CAPSULE_STATE_CHANGED_CHANNEL = 'desktop-recording-capsule:state-changed';
const RECORDING_CAPSULE_STOP_CHANNEL = 'desktop-recording-capsule:stop';
const RECORDING_CAPSULE_SUBSCRIBE_CHANNEL = 'desktop-recording-capsule:subscribe';
const RECORDING_CAPSULE_UNSUBSCRIBE_CHANNEL = 'desktop-recording-capsule:unsubscribe';

;// CONCATENATED MODULE: ./preload.ts


const deliverState = async (listener, state)=>{
    try {
        await listener(state);
    } catch  {
    // A renderer observer must not break the isolated preload event bridge.
    }
};
const recordingCapsuleAPI = {
    openApp: async ()=>{
        await external_electron_namespaceObject.ipcRenderer.invoke(RECORDING_CAPSULE_OPEN_APP_CHANNEL);
    },
    pointerInteraction: (phase)=>external_electron_namespaceObject.ipcRenderer.invoke(RECORDING_CAPSULE_POINTER_CHANNEL, phase),
    setWarningSize: async (size)=>{
        await external_electron_namespaceObject.ipcRenderer.invoke(RECORDING_CAPSULE_WARNING_SIZE_CHANNEL, size);
    },
    cancel: async ()=>{
        await external_electron_namespaceObject.ipcRenderer.invoke(RECORDING_CAPSULE_CANCEL_CHANNEL);
    },
    openAudioNotes: async (recordingId)=>{
        await external_electron_namespaceObject.ipcRenderer.invoke(RECORDING_CAPSULE_OPEN_NOTES_CHANNEL, recordingId);
    },
    dismiss: async ()=>{
        await external_electron_namespaceObject.ipcRenderer.invoke(RECORDING_CAPSULE_DISMISS_CHANNEL);
    },
    getState: ()=>external_electron_namespaceObject.ipcRenderer.invoke(RECORDING_CAPSULE_GET_STATE_CHANNEL),
    retry: async ()=>{
        await external_electron_namespaceObject.ipcRenderer.invoke(RECORDING_CAPSULE_RETRY_CHANNEL);
    },
    setPaused: async (paused)=>{
        await external_electron_namespaceObject.ipcRenderer.invoke(RECORDING_CAPSULE_SET_PAUSED_CHANNEL, paused);
    },
    stop: async ()=>{
        await external_electron_namespaceObject.ipcRenderer.invoke(RECORDING_CAPSULE_STOP_CHANNEL);
    },
    subscribe: async (listener)=>{
        if (typeof listener !== 'function') {
            throw new TypeError('Recording capsule listener must be a function');
        }
        const ipcListener = (_event, state)=>{
            deliverState(listener, state);
        };
        external_electron_namespaceObject.ipcRenderer.on(RECORDING_CAPSULE_STATE_CHANGED_CHANNEL, ipcListener);
        try {
            await external_electron_namespaceObject.ipcRenderer.invoke(RECORDING_CAPSULE_SUBSCRIBE_CHANNEL);
        } catch (error) {
            external_electron_namespaceObject.ipcRenderer.removeListener(RECORDING_CAPSULE_STATE_CHANGED_CHANNEL, ipcListener);
            throw error;
        }
        let subscribed = true;
        return {
            unsubscribe: async ()=>{
                if (!subscribed) {
                    return;
                }
                subscribed = false;
                external_electron_namespaceObject.ipcRenderer.removeListener(RECORDING_CAPSULE_STATE_CHANGED_CHANNEL, ipcListener);
                await external_electron_namespaceObject.ipcRenderer.invoke(RECORDING_CAPSULE_UNSUBSCRIBE_CHANNEL);
            }
        };
    }
};
external_electron_namespaceObject.contextBridge.exposeInMainWorld('ClientRecordingCapsuleAPI', recordingCapsuleAPI);

module.exports = __webpack_exports__;
})()
;