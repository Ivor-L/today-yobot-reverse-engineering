// Compiled fragment from ./src/app/modules/shell/modules/user-agent/utils.ts.
// The original TypeScript and import graph are not restored.

const createDesktopUserAgent = (applicationVersion, chromeVersion, platform)=>{
    const platformToken = {
        darwin: 'Macintosh; Intel Mac OS X 10_15_7',
        linux: 'X11; Linux x86_64',
        win32: 'Windows NT 10.0; Win64; x64'
    }[platform];
    const todayPlatformToken = {
        darwin: 'macOS',
        linux: 'Linux',
        win32: 'Windows'
    }[platform];
    return [
        `Mozilla/5.0 (${platformToken})`,
        'AppleWebKit/537.36 (KHTML, like Gecko)',
        `Chrome/${chromeVersion}`,
        'Safari/537.36',
        `TodayDesktop/${applicationVersion}`,
        `TodayPlatform/${todayPlatformToken}`
    ].join(' ');
};
