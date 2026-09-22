// Compiled fragment from ./src/app/modules/shell/modules/security/modules/child-window-loading/utils.ts.
// The original TypeScript and import graph are not restored.


const isPendingChildWindowUrl = (url, { initialUrl, waitForNonBlank })=>{
    if (url === '') {
        return true;
    }
    return url === 'about:blank' && (initialUrl !== 'about:blank' || waitForNonBlank);
};
const toChildWindowLoadingBounds = ({ height, width })=>({
        height,
        width,
        x: 0,
        y: 0
    });
const hasPersistentChildWindowDragRegion = (presentation)=>presentation !== 'default';
const toChildWindowDragBounds = ({ height, width }, presentation)=>{
    if (presentation !== 'artifact') {
        return {
            height: Math.min(height, (/* inlined export .CHILD_WINDOW_FRAME_INSET */48)),
            width,
            x: 0,
            y: 0
        };
    }
    return {
        height: Math.min(height, (/* inlined export .CHILD_WINDOW_FRAME_INSET */48)),
        width: Math.max(0, width - (/* inlined export .CHILD_WINDOW_ARTIFACT_LEFT_CONTROL_INSET */80) - (/* inlined export .CHILD_WINDOW_ARTIFACT_TOOLBAR_INSET */224)),
        x: (/* inlined export .CHILD_WINDOW_ARTIFACT_LEFT_CONTROL_INSET */80),
        y: 0
    };
};
const toChildWindowDragReadyScript = ()=>`
  (() => {
    const root = document.querySelector('[data-child-window-loading-ready]')
    const dragRegion = document.querySelector('[data-desktop-window-drag-region]')
    const spinner = document.querySelector('[data-child-window-loading-spinner]')

    if (!(root instanceof HTMLElement) || !(dragRegion instanceof HTMLElement)) {
      throw new Error('Child window drag document did not become ready')
    }

    const backgroundColor = ${JSON.stringify(CHILD_WINDOW_DRAG_TRANSPARENT_COLOR)}

    document.documentElement.style.background = backgroundColor
    document.body.style.background = backgroundColor
    root.style.background = backgroundColor
    root.dataset.childWindowLoadingComplete = 'true'
    root.setAttribute('aria-busy', 'false')
    root.setAttribute('aria-hidden', 'true')
    dragRegion.style.left = '0'
    dragRegion.style.width = '100%'

    if (spinner instanceof HTMLElement) {
      spinner.hidden = true
    }
  })()
`;
