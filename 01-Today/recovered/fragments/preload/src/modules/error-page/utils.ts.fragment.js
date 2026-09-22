// Compiled fragment from ./src/modules/error-page/utils.ts.
// The original TypeScript and import graph are not restored.


const describeStartupError = (error)=>{
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }
    if (typeof error === 'string' && error.trim()) {
        return error;
    }
    return UNKNOWN_STARTUP_ERROR;
};
const readErrorPageDescription = (search)=>{
    const description = new URLSearchParams(search).get('desc')?.trim();
    return description || UNKNOWN_STARTUP_ERROR;
};
const isDesktopErrorPageUrl = (value, expectedFileUrl)=>{
    try {
        const url = new URL(value);
        if (url.protocol !== 'file:') {
            return false;
        }
        url.hash = '';
        url.search = '';
        if (expectedFileUrl) {
            const expectedUrl = new URL(expectedFileUrl);
            expectedUrl.hash = '';
            expectedUrl.search = '';
            return url.href === expectedUrl.href;
        }
        const normalizedPath = decodeURIComponent(url.pathname).replaceAll('\\', '/');
        return normalizedPath.endsWith(ERROR_PAGE_PATH_SUFFIX);
    } catch  {
        return false;
    }
};
