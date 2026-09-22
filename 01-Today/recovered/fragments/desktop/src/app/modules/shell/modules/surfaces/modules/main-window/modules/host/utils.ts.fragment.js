// Compiled fragment from ./src/app/modules/shell/modules/surfaces/modules/main-window/modules/host/utils.ts.
// The original TypeScript and import graph are not restored.


const contentSizeMatches = (requested, expected)=>requested.width === expected.width && requested.height === expected.height;
/** Resolves the integer-DIP origin that keeps inverse main-window resizes drift-free. */ const resolveCenteredMainWindowPosition = (previousBounds, resizedBounds)=>({
        x: previousBounds.x + Math.trunc((previousBounds.width - resizedBounds.width) / 2),
        y: previousBounds.y + Math.trunc((previousBounds.height - resizedBounds.height) / 2)
    });
const resolveMacOSMainWindowProfile = (requested, workArea)=>{
    if (contentSizeMatches(requested, MAIN_WINDOW_FIXED_CONTENT_SIZE)) {
        return {
            contentSize: MAIN_WINDOW_FIXED_CONTENT_SIZE,
            fixed: true
        };
    }
    if (!contentSizeMatches(requested, MAIN_WINDOW_RESIZABLE_CONTENT_SIZE)) {
        return null;
    }
    return {
        contentSize: {
            height: Math.max(MAIN_WINDOW_RESIZABLE_MINIMUM_SIZE.height, Math.min(MAIN_WINDOW_RESIZABLE_CONTENT_SIZE.height, workArea.height - (/* inlined export .MAIN_WINDOW_WORK_AREA_INSET */40))),
            width: Math.max(MAIN_WINDOW_RESIZABLE_MINIMUM_SIZE.width, Math.min(MAIN_WINDOW_RESIZABLE_CONTENT_SIZE.width, workArea.width - (/* inlined export .MAIN_WINDOW_WORK_AREA_INSET */40)))
        },
        fixed: false
    };
};
const resolveMainWindowChromeOptions = (platform)=>{
    if (platform === 'darwin') {
        return {
            frame: true,
            hasShadow: true,
            titleBarStyle: 'hiddenInset',
            transparent: false
        };
    }
    return {
        titleBarOverlay: {
            color: '#00000000',
            height: 32,
            ...platform === 'linux' ? {
                symbolColor: '#000000'
            } : {}
        },
        titleBarStyle: 'hidden'
    };
};
const resolveWindowTitle = (application, platform)=>{
    if (application.isPackaged) {
        return application.getName();
    }
    const platformName = {
        darwin: 'macOS',
        linux: 'Linux',
        win32: 'Windows'
    }[platform];
    return `Today · ${platformName} Dev`;
};
