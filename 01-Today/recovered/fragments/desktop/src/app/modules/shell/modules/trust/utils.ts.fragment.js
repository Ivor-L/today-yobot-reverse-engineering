// Compiled fragment from ./src/app/modules/shell/modules/trust/utils.ts.
// The original TypeScript and import graph are not restored.


const matchesHttpAccountSurface = (value, webOrigin, surface)=>{
    if (!hasExactOrigin(value, webOrigin)) {
        return false;
    }
    if (surface === 'artifact') {
        return isArtifactPreviewWindowUrl(value, webOrigin);
    }
    const { pathname } = new URL(value);
    return pathname === '/feed' || pathname.startsWith('/feed/');
};
