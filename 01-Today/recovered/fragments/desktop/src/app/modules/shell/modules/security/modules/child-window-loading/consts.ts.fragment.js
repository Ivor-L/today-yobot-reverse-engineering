// Compiled fragment from ./src/app/modules/shell/modules/security/modules/child-window-loading/consts.ts.
// The original TypeScript and import graph are not restored.

const CHILD_WINDOW_LOADING_BACKGROUND_COLOR = '#ffffff';
const CHILD_WINDOW_LOADING_PARTITION = 'today-shell-loading';
const CHILD_WINDOW_DRAG_TRANSPARENT_COLOR = '#00000000';
const CHILD_WINDOW_FRAME_INSET = 48;
const CHILD_WINDOW_ARTIFACT_LEFT_CONTROL_INSET = 80;
const CHILD_WINDOW_ARTIFACT_TOOLBAR_INSET = 224;
const CHILD_WINDOW_PAYWALL_INSET_STYLES = `
  html {
    background: ${CHILD_WINDOW_LOADING_BACKGROUND_COLOR} !important;
  }

  body {
    box-sizing: border-box !important;
    margin: 0 !important;
    min-height: 100vh !important;
    padding: ${CHILD_WINDOW_FRAME_INSET}px !important;
  }
`;
const CHILD_WINDOW_LOADING_READY_SCRIPT = `
  new Promise((resolve, reject) => {
    const selector = '[data-child-window-loading-ready]'
    if (document.querySelector(selector)) {
      resolve()

      return
    }

    const observer = new MutationObserver(() => {
      if (!document.querySelector(selector)) {
        return
      }

      clearTimeout(timeout)
      observer.disconnect()
      resolve()
    })
    const timeout = setTimeout(() => {
      observer.disconnect()
      reject(new Error('Child window loading document did not become ready'))
    }, 5000)

    observer.observe(document.documentElement, { childList: true, subtree: true })
  })
`;
const CHILD_WINDOW_PAINT_BARRIER_SCRIPT = 'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))';
