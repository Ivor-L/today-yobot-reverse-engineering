// Compiled fragment from ./src/app/modules/shell/modules/recording-capsule/modules/window/consts.ts.
// The original TypeScript and import graph are not restored.

const RECORDING_CAPSULE_SESSION_PARTITION = 'today-desktop-recording-capsule';
// The visible 40 x 68 capsule has an 8px transparent margin for its CSS shadow.
const RECORDING_CAPSULE_WINDOW_HEIGHT = 84;
const RECORDING_CAPSULE_WINDOW_LEFT_INSET = 12;
const RECORDING_CAPSULE_WINDOW_WIDTH = 56;
const RECORDING_CAPSULE_BACKDROP_BOUNDS = {
    x: 8,
    y: 8,
    width: 40,
    height: 68
};
const RECORDING_CAPSULE_BACKDROP_CORNER_RADIUS = 32;
const RECORDING_CAPSULE_WINDOW_OPTIONS = {
    acceptFirstMouse: true,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    backgroundColor: '#00000000',
    frame: false,
    fullscreenable: false,
    hasShadow: false,
    height: RECORDING_CAPSULE_WINDOW_HEIGHT,
    maximizable: false,
    minimizable: false,
    resizable: false,
    show: false,
    skipTaskbar: true,
    transparent: true,
    type: 'panel',
    useContentSize: true,
    width: RECORDING_CAPSULE_WINDOW_WIDTH
};
