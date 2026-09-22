// Compiled fragment from ../../packages/utils/src/desktop-connectors.ts.
// The original TypeScript and import graph are not restored.

/** Shared desktop connector identities and tool ownership; no UI or Native dependencies. */ const DESKTOP_CONNECTOR_CAPABILITIES = {
    linux_desktop: {
        platform: 'linux',
        capabilityIds: [
            'fs.read',
            'fs.list',
            'fs.stat'
        ]
    },
    linux_documents: {
        platform: 'linux',
        capabilityIds: [
            'fs.read',
            'fs.list',
            'fs.stat'
        ]
    },
    linux_downloads: {
        platform: 'linux',
        capabilityIds: [
            'fs.read',
            'fs.list',
            'fs.stat'
        ]
    },
    linux_other_files: {
        platform: 'linux',
        capabilityIds: [
            'fs.read',
            'fs.list',
            'fs.stat'
        ]
    },
    linux_clipboard: {
        platform: 'linux',
        capabilityIds: [
            'clipboard.read',
            'clipboard.write'
        ]
    },
    linux_screen: {
        platform: 'linux',
        capabilityIds: [
            'screen.capture'
        ]
    },
    linux_battery: {
        platform: 'linux',
        capabilityIds: [
            'battery.get'
        ]
    },
    linux_shell: {
        platform: 'linux',
        capabilityIds: [
            'script.shell'
        ]
    },
    linux_system: {
        platform: 'linux',
        capabilityIds: [
            'system.get',
            'system.apps.list',
            'system.shell.get',
            'system.user.get',
            'system.users.list'
        ]
    },
    linux_device: {
        platform: 'linux',
        capabilityIds: [
            'battery.get',
            'system.get'
        ]
    },
    windows_desktop: {
        platform: 'windows',
        capabilityIds: [
            'fs.read',
            'fs.list',
            'fs.stat'
        ]
    },
    windows_documents: {
        platform: 'windows',
        capabilityIds: [
            'fs.read',
            'fs.list',
            'fs.stat'
        ]
    },
    windows_downloads: {
        platform: 'windows',
        capabilityIds: [
            'fs.read',
            'fs.list',
            'fs.stat'
        ]
    },
    windows_other_files: {
        platform: 'windows',
        capabilityIds: [
            'fs.read',
            'fs.list',
            'fs.stat'
        ]
    },
    windows_clipboard: {
        platform: 'windows',
        capabilityIds: [
            'clipboard.read',
            'clipboard.write'
        ]
    },
    windows_screen: {
        platform: 'windows',
        capabilityIds: [
            'screen.capture',
            'screen.get',
            'screen.elements.find'
        ]
    },
    windows_battery: {
        platform: 'windows',
        capabilityIds: [
            'battery.get'
        ]
    },
    windows_calendar: {
        platform: 'windows',
        capabilityIds: [
            'calendar.list',
            'calendar.events.list'
        ]
    },
    windows_contacts: {
        platform: 'windows',
        capabilityIds: [
            'contacts.list',
            'contacts.get'
        ]
    },
    windows_reminders: {
        platform: 'windows',
        capabilityIds: [
            'reminders.list',
            'reminders.create'
        ]
    },
    windows_notes: {
        platform: 'windows',
        capabilityIds: [
            'notes.list',
            'notes.get'
        ]
    },
    windows_mail: {
        platform: 'windows',
        capabilityIds: [
            'mail.accounts.list',
            'mail.messages.list'
        ]
    },
    windows_outlook: {
        platform: 'windows',
        capabilityIds: [
            'calendar.events.list',
            'contacts.list',
            'mail.messages.list',
            'notes.list',
            'reminders.list'
        ]
    },
    windows_location: {
        platform: 'windows',
        capabilityIds: [
            'location.get'
        ]
    },
    windows_ghost: {
        platform: 'windows',
        capabilityIds: [
            'ghost.context',
            'ghost.click'
        ]
    },
    windows_shell: {
        platform: 'windows',
        capabilityIds: [
            'script.shell'
        ]
    },
    windows_system: {
        platform: 'windows',
        capabilityIds: [
            'system.get',
            'system.apps.list'
        ]
    },
    windows_device: {
        platform: 'windows',
        capabilityIds: [
            'battery.get',
            'system.get'
        ]
    },
    macos_desktop: {
        platform: 'macos',
        capabilityIds: [
            'fs.read',
            'fs.list',
            'fs.stat'
        ]
    },
    macos_documents: {
        platform: 'macos',
        capabilityIds: [
            'fs.read',
            'fs.list',
            'fs.stat'
        ]
    },
    macos_downloads: {
        platform: 'macos',
        capabilityIds: [
            'fs.read',
            'fs.list',
            'fs.stat'
        ]
    },
    macos_other_files: {
        platform: 'macos',
        capabilityIds: [
            'fs.read',
            'fs.list',
            'fs.stat'
        ]
    },
    apple_calendar: {
        platform: 'macos',
        capabilityIds: [
            'calendar.list',
            'calendar.events.list'
        ]
    },
    apple_contacts: {
        platform: 'macos',
        capabilityIds: [
            'contacts.list',
            'contacts.get'
        ]
    },
    apple_mail: {
        platform: 'macos',
        capabilityIds: [
            'mail.accounts.list',
            'mail.messages.list'
        ]
    },
    apple_messages: {
        platform: 'macos',
        capabilityIds: [
            'imessage.search',
            'imessage.send'
        ]
    },
    apple_music: {
        platform: 'macos',
        capabilityIds: []
    },
    apple_notes: {
        platform: 'macos',
        capabilityIds: [
            'notes.list',
            'notes.get'
        ]
    },
    apple_reminders: {
        platform: 'macos',
        capabilityIds: [
            'reminders.list',
            'reminders.create'
        ]
    },
    mac_clipboard: {
        platform: 'macos',
        capabilityIds: [
            'clipboard.read',
            'clipboard.write'
        ]
    },
    mac_location: {
        platform: 'macos',
        capabilityIds: [
            'location.get',
            'location.geocode'
        ]
    },
    mac_device: {
        platform: 'macos',
        capabilityIds: [
            'battery.get'
        ]
    },
    macos_system: {
        platform: 'macos',
        capabilityIds: [
            'system.get',
            'system.apps.list'
        ]
    },
    macos_accessibility: {
        platform: 'macos',
        capabilityIds: [
            'screen.elements.find',
            'ghost.click'
        ]
    },
    macos_ghost: {
        platform: 'macos',
        capabilityIds: [
            'ghost.context',
            'ghost.click'
        ]
    },
    macos_screen: {
        platform: 'macos',
        capabilityIds: [
            'screen.capture'
        ]
    },
    macos_shell: {
        platform: 'macos',
        capabilityIds: [
            'script.shell',
            'script.jxa',
            'sdef.get'
        ]
    }
};
const AUTOMATIC_DEVICE_TOOL_IDS = new Set([
    'battery.get',
    'clipboard.read',
    'clipboard.write',
    'location.get',
    'location.geocode',
    'screen.get',
    'screen.elements.find',
    'script.jxa',
    'script.shell',
    'sdef.get',
    'system.apps.list',
    'system.get',
    'system.shell.get',
    'system.user.get',
    'system.users.list'
]);
const isDesktopConnectorId = (id)=>Object.hasOwn(DESKTOP_CONNECTOR_CAPABILITIES, id);
const connectorOwnsTool = (connectorId, toolId)=>{
    if (!isDesktopConnectorId(connectorId)) {
        return false;
    }
    return DESKTOP_CONNECTOR_CAPABILITIES[connectorId].capabilityIds.some((id)=>toolId.startsWith(`${id.split('.')[0]}.`));
};
const desktopConnectorIds = (platform)=>Object.keys(DESKTOP_CONNECTOR_CAPABILITIES).filter((id)=>DESKTOP_CONNECTOR_CAPABILITIES[id].platform === platform);
