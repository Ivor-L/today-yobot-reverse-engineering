// Compiled fragment from ./src/app/modules/shell/modules/shortcuts/modules/gnome-global/consts.ts.
// The original TypeScript and import graph are not restored.

const SHORTCUT_ACTIVATION_ARGUMENT = '--shortcut-activation';
const MEDIA_KEYS_SCHEMA = 'org.gnome.settings-daemon.plugins.media-keys';
const CUSTOM_SHORTCUT_SCHEMA = `${MEDIA_KEYS_SCHEMA}.custom-keybinding`;
const CUSTOM_SHORTCUT_ROOT = '/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/';
const GNOME_SHORTCUT_SCHEMAS = [
    MEDIA_KEYS_SCHEMA,
    'org.gnome.desktop.wm.keybindings',
    'org.gnome.shell.keybindings',
    'org.gnome.mutter.keybindings',
    'org.gnome.mutter.wayland.keybindings'
];
