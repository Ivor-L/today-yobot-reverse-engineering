// Compiled fragment from ./src/preload/desktop.ts.
// The original TypeScript and import graph are not restored.





WebPeerManager.create(external_electron_namespaceObject.contextBridge, external_electron_namespaceObject.ipcRenderer).expose();
if (isDesktopErrorPageUrl(globalThis.location.href)) {
    const errorPageAPI = {
        restart: ()=>external_electron_namespaceObject.ipcRenderer.invoke(ERROR_PAGE_RESTART_CHANNEL)
    };
    external_electron_namespaceObject.contextBridge.exposeInMainWorld('ClientErrorPageAPI', Object.freeze(errorPageAPI));
}

})();

module.exports = __webpack_exports__;
})()
;
