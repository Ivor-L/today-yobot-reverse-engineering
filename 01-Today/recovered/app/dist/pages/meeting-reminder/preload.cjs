(() => {
"use strict";
var __webpack_exports__ = {};

;// CONCATENATED MODULE: external "electron"
const external_electron_namespaceObject = require("electron");
;// CONCATENATED MODULE: ../../modules/meeting-reminder-api/index.ts
const MEETING_REMINDER_CHANNEL = 'desktop-meeting-reminder:action';
const MEETING_REMINDER_CHANGED_CHANNEL = 'desktop-meeting-reminder:changed';

;// CONCATENATED MODULE: ./preload.ts


const api = {
    getState: ()=>external_electron_namespaceObject.ipcRenderer.invoke(MEETING_REMINDER_CHANNEL, 'get'),
    ready: (presentationId)=>external_electron_namespaceObject.ipcRenderer.invoke(MEETING_REMINDER_CHANNEL, 'ready', presentationId),
    finishExit: async (presentationId)=>{
        await external_electron_namespaceObject.ipcRenderer.invoke(MEETING_REMINDER_CHANNEL, 'finish-exit', presentationId);
    },
    start: async (id)=>{
        await external_electron_namespaceObject.ipcRenderer.invoke(MEETING_REMINDER_CHANNEL, 'start', id);
    },
    dismiss: async (id)=>{
        await external_electron_namespaceObject.ipcRenderer.invoke(MEETING_REMINDER_CHANNEL, 'dismiss', id);
    },
    openSettings: async (id)=>{
        await external_electron_namespaceObject.ipcRenderer.invoke(MEETING_REMINDER_CHANNEL, 'open-settings', id);
    },
    setExpanded: async (id, expanded, menuOpen)=>{
        await external_electron_namespaceObject.ipcRenderer.invoke(MEETING_REMINDER_CHANNEL, 'set-expanded', id, expanded, menuOpen);
    },
    subscribe: async (listener)=>{
        if (typeof listener !== 'function') {
            throw new TypeError('Meeting reminder listener must be a function');
        }
        const deliver = async (_event, state)=>{
            try {
                await listener(state);
            } catch  {
            // An observer cannot interrupt the isolated preload bridge.
            }
        };
        external_electron_namespaceObject.ipcRenderer.on(MEETING_REMINDER_CHANGED_CHANNEL, deliver);
        return {
            unsubscribe: async ()=>{
                external_electron_namespaceObject.ipcRenderer.removeListener(MEETING_REMINDER_CHANGED_CHANNEL, deliver);
            }
        };
    }
};
external_electron_namespaceObject.contextBridge.exposeInMainWorld('ClientMeetingReminderAPI', api);

module.exports = __webpack_exports__;
})()
;