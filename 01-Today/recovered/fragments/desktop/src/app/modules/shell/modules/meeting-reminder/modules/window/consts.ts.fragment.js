// Compiled fragment from ./src/app/modules/shell/modules/meeting-reminder/modules/window/consts.ts.
// The original TypeScript and import graph are not restored.

// Figma 7970:7717 places the 420 × 75 card 42px from the desktop top.
// Menu Bar I7970:7718;121:13309 is 34px tall, leaving 8px above the card in the work area.
// Its remaining margins are 10px right and 24px left/bottom.
const MEETING_REMINDER_WIDTH = 454;
const MEETING_REMINDER_HEIGHT = 107;
const MEETING_REMINDER_EXPANDED_HEIGHT = 163;
const MEETING_REMINDER_EXIT_TIMEOUT_MS = 1000;
const MEETING_REMINDER_FADE_DURATION_MS = 180;
// Match the card inside the transparent window, leaving its shadow margins clear.
const MEETING_REMINDER_BACKDROP_BOUNDS = {
    x: 24,
    y: 8,
    width: 420,
    height: 75
};
const MEETING_REMINDER_BACKDROP_CORNER_RADIUS = 20;
// Match the menu's 204 × 48 layout, inset 12px inside the card's 1px border.
const MEETING_REMINDER_MENU_BACKDROP_WIDTH = 204;
const MEETING_REMINDER_MENU_BACKDROP_HEIGHT = 48;
const MEETING_REMINDER_MENU_BACKDROP_RIGHT = 13;
const MEETING_REMINDER_MENU_BACKDROP_TOP = 30;
const MEETING_REMINDER_WINDOW_OPTIONS = {
    acceptFirstMouse: true,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    backgroundColor: '#00000000',
    frame: false,
    fullscreenable: false,
    hasShadow: false,
    maximizable: false,
    minimizable: false,
    movable: false,
    resizable: false,
    show: false,
    skipTaskbar: true,
    transparent: true,
    type: 'panel',
    useContentSize: true,
    width: MEETING_REMINDER_WIDTH,
    height: MEETING_REMINDER_HEIGHT
};
