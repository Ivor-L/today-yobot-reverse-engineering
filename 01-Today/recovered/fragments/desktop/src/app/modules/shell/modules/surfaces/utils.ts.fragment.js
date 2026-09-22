// Compiled fragment from ./src/app/modules/shell/modules/surfaces/utils.ts.
// The original TypeScript and import graph are not restored.


const clampSurfaceDimension = (requested, workArea, configuredMinimum, configuredMaximum, frameSize)=>{
    const minimum = Math.max(1, configuredMinimum - frameSize);
    const workAreaMaximum = Math.max(minimum, Math.floor(workArea - (/* inlined export .SURFACE_WORK_AREA_MARGIN */40) - frameSize));
    const maximum = configuredMaximum > 0 ? Math.min(workAreaMaximum, Math.max(minimum, configuredMaximum - frameSize)) : workAreaMaximum;
    return Math.min(maximum, Math.max(minimum, requested));
};
/** Resolves the non-content width and height around a window's client area. */ const resolveSurfaceFrameSize = (windowSize, contentSize)=>[
        Math.max(0, (windowSize[0] ?? 0) - (contentSize[0] ?? 0)),
        Math.max(0, (windowSize[1] ?? 0) - (contentSize[1] ?? 0))
    ];
/** Clamps a requested content size to the window's constraints and current display. */ const clampSurfaceContentSize = (params, workAreaSize, minimumSize, maximumSize, frameSize)=>({
        height: clampSurfaceDimension(params.height, workAreaSize.height, minimumSize[1] ?? 0, maximumSize[1] ?? 0, frameSize[1] ?? 0),
        width: clampSurfaceDimension(params.width, workAreaSize.width, minimumSize[0] ?? 0, maximumSize[0] ?? 0, frameSize[0] ?? 0)
    });
/** Checks whether a window reports the requested content dimensions. */ const surfaceContentSizeMatches = (actualSize, expectedSize)=>actualSize[0] === expectedSize.width && actualSize[1] === expectedSize.height;
