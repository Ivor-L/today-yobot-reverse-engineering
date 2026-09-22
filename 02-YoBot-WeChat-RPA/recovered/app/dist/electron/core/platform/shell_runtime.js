import * as os from 'node:os';
const MACOS_GUI_PATH_SUFFIXES = [
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    '/usr/local/bin',
    '/usr/local/sbin',
];
/**
 * Resolve the interpreter used for a model-issued shell command.
 *
 * Do not use the user's login shell on macOS: shell startup files are mutable,
 * may be interactive, and can have side effects. The Agent contract is the
 * stable POSIX `/bin/sh` language. Windows preserves its existing cmd.exe
 * contract and honours the OS-provided ComSpec path.
 */
export function resolveCommandShell(platform = process.platform, environment = process.env) {
    if (platform === 'win32') {
        return environment.ComSpec?.trim()
            || environment.COMSPEC?.trim()
            || 'cmd.exe';
    }
    return '/bin/sh';
}
/**
 * Finder/LaunchServices apps do not inherit a user's interactive terminal PATH.
 * Append deterministic system and conventional macOS CLI locations so optional
 * tools can be discovered without executing a login shell or sourcing user
 * dotfiles. Existing entries stay first to avoid changing command precedence.
 */
export function normalizeDesktopExecutablePath(currentPath, platform = process.platform, homeDirectory = os.homedir()) {
    if (platform !== 'darwin')
        return currentPath;
    const candidates = [
        ...(currentPath || '').split(':').filter(Boolean),
        ...MACOS_GUI_PATH_SUFFIXES,
        `${homeDirectory.replace(/\/$/, '')}/.local/bin`,
        `${homeDirectory.replace(/\/$/, '')}/.cargo/bin`,
    ];
    return [...new Set(candidates)].join(':');
}
