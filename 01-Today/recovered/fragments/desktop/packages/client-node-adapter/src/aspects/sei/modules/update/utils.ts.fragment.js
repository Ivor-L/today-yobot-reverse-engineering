// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/update/utils.ts.
// The original TypeScript and import graph are not restored.



const utils_initialUpdateState = (currentVersion, supported)=>{
    if (!supported) {
        return {
            currentVersion,
            requirement: (/* inlined export .UpdateRequirement.Optional */"optional"),
            status: (/* inlined export .UpdateStatus.Unsupported */"unsupported"),
            supportedActions: []
        };
    }
    return {
        currentVersion,
        requirement: (/* inlined export .UpdateRequirement.Optional */"optional"),
        status: (/* inlined export .UpdateStatus.Idle */"idle"),
        supportedActions: []
    };
};
const activeUpdateActions = (status)=>{
    if (canStartUpdateCheck(status)) {
        return [
            (/* inlined export .UpdateAction.Check */"check")
        ];
    }
    if (status === (/* inlined export .UpdateStatus.Ready */"ready")) {
        return [
            (/* inlined export .UpdateAction.Restart */"restart")
        ];
    }
    if (status === (/* inlined export .UpdateStatus.Available */"available")) {
        return [
            (/* inlined export .UpdateAction.Download */"download")
        ];
    }
    return [];
};
const applyUpdateStateChange = (state, change)=>{
    const nextState = {
        ...state,
        ...change
    };
    if (change.availableUpdate === undefined && 'availableUpdate' in change) {
        delete nextState.availableUpdate;
    }
    if (change.error === undefined && 'error' in change) {
        delete nextState.error;
    }
    if (change.downloadProgress === undefined && 'downloadProgress' in change) {
        delete nextState.downloadProgress;
    }
    return nextState;
};
const canStartUpdateCheck = (status)=>{
    return status === (/* inlined export .UpdateStatus.Idle */"idle") || status === (/* inlined export .UpdateStatus.Checking */"checking") || status === (/* inlined export .UpdateStatus.UpToDate */"up-to-date") || status === (/* inlined export .UpdateStatus.Failed */"failed");
};
const isInstallPending = (status)=>{
    return status === (/* inlined export .UpdateStatus.Ready */"ready") || status === (/* inlined export .UpdateStatus.Applying */"applying") || status === (/* inlined export .UpdateStatus.RestartRequired */"restart-required") || status === (/* inlined export .UpdateStatus.ExternalHandoff */"external-handoff");
};
const updateCheckError = ()=>({
        code: base_InterfaceErrorCode.NetworkError,
        message: UPDATE_CHECK_ERROR_MESSAGE
    });
const updateCancelledError = ()=>({
        code: base_InterfaceErrorCode.Cancelled,
        message: UPDATE_CANCELLED_MESSAGE
    });
const updateInstallError = ()=>({
        code: base_InterfaceErrorCode.Internal,
        message: UPDATE_INSTALL_ERROR_MESSAGE
    });
