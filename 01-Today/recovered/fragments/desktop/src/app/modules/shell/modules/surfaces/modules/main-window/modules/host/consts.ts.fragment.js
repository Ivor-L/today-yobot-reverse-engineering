// Compiled fragment from ./src/app/modules/shell/modules/surfaces/modules/main-window/modules/host/consts.ts.
// The original TypeScript and import graph are not restored.

const MAIN_WINDOW_INITIAL_LAYOUT = {
    height: 700,
    minHeight: 600,
    minWidth: 900,
    width: 900
};
const MACOS_MAIN_WINDOW_INITIAL_LAYOUT = {
    ...MAIN_WINDOW_INITIAL_LAYOUT,
    maximizable: false,
    maxHeight: 700,
    maxWidth: 900,
    minHeight: 700,
    resizable: false
};
const MAIN_WINDOW_FIXED_CONTENT_SIZE = {
    height: 700,
    width: 900
};
const MAIN_WINDOW_RESIZABLE_CONTENT_SIZE = {
    height: 800,
    width: 1200
};
/**
 * 「视作无上限」的显式最大尺寸。
 *
 * 不能用 `setMaximumSize(0, 0)` 表达"清除上限"：macOS + `useContentSize: true`
 * 下它不会清掉 AppKit 的 `contentMaxSize`，旧上限（登录窗的 900x700）残留。
 * 程序性 `setContentSize` 绕过约束检查，所以登录后一切正常；用户**首次拖拽**
 * 时 AppKit 实时钳制生效，窗口瞬间被压回旧上限且再也拖不大（实测：Electron 43
 * 最小复现，构造期锁与 setter 锁两种来源的旧上限都清不掉，显式大值则正常）。
 * Electron 自身账本会把 (0, 0) 记成"无上限"，与 AppKit 真实状态脱钩，
 * `getMaximumSize()` 因此说谎——诊断时不要信它。
 */ const MAIN_WINDOW_UNBOUNDED_MAXIMUM_SIZE = {
    height: 100000,
    width: 100000
};
const MAIN_WINDOW_RESIZABLE_MINIMUM_SIZE = {
    height: 600,
    width: 900
};
const MAIN_WINDOW_WORK_AREA_INSET = 40;
