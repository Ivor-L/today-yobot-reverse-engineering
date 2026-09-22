// Compiled fragment from ../../packages/client-node-adapter/src/aspects/wei/modules/runtime/utils.ts.
// The original TypeScript and import graph are not restored.


const toClientRuntimePlatform = (platform)=>{
    switch(platform){
        case cpi_SystemPlatform.MacOS:
            return base_ClientRuntimePlatform.MacOS;
        case cpi_SystemPlatform.Windows:
            return base_ClientRuntimePlatform.Windows;
        case cpi_SystemPlatform.Linux:
            return base_ClientRuntimePlatform.Linux;
    }
};
