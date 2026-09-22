// Compiled fragment from ./src/app/modules/linux-desktop-integration/utils.ts.
// The original TypeScript and import graph are not restored.


const escapeDesktopEntryValue = (value)=>{
    return value.replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll('\r', '\\r').replaceAll('\t', '\\t');
};
const quoteExecArgument = (value)=>{
    const escaped = value.replace(/(["`$\\])/gu, '\\$1').replaceAll('%', '%%');
    return `"${escaped}"`;
};
const resolveLaunchArguments = (options)=>{
    const arguments_ = [];
    if (options.isDevelopment) {
        arguments_.push('--development');
        if (options.localProfileId) {
            arguments_.push(`--local-profile-id=${options.localProfileId}`);
        }
        if (options.localWebOrigin) {
            arguments_.push(`--local-web-origin=${options.localWebOrigin}`);
        }
    }
    if (options.environmentOverride) {
        arguments_.push(`--environment=${options.environmentOverride}`);
    }
    return arguments_;
};
const createDesktopEntry = (options)=>{
    const arguments_ = [
        options.appImagePath,
        ...resolveLaunchArguments(options.launchOptions)
    ];
    if (options.launchOptions.isDevelopment) {
        arguments_.push(`${LINUX_DEV_INSTANCE_ARGUMENT}=${options.appImagePath}`);
    }
    if (options.sandboxDisabled) {
        arguments_.push('--no-sandbox');
    }
    // Desktop values are unescaped before Exec quoting and literal-percent expansion.
    const command = `${arguments_.map(quoteExecArgument).join(' ')} %U`;
    return [
        '[Desktop Entry]',
        'Type=Application',
        `Name=${escapeDesktopEntryValue(options.appName)}`,
        `Exec=${escapeDesktopEntryValue(command)}`,
        `Icon=${escapeDesktopEntryValue(options.iconPath)}`,
        `StartupWMClass=${options.appId}`,
        'Terminal=false',
        'Categories=Utility;',
        `MimeType=x-scheme-handler/${options.scheme};`,
        ''
    ].join('\n');
};
